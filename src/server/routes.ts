import {
  SoundCloudClient,
  signOut,
} from "soundcloud-api-ts";
import type { SoundCloudRoutesConfig, SCRouteTelemetry } from "../types.js";
import { SCAuthManager } from "./auth.js";

interface RouteContext {
  config: SoundCloudRoutesConfig;
  client: SoundCloudClient | null;
  token: string | undefined;
  tokenExpiry: number;
}

const ctx: RouteContext = {
  config: { clientId: "", clientSecret: "" },
  client: null,
  token: undefined,
  tokenExpiry: 0,
};

function getClient(): SoundCloudClient {
  if (!ctx.client) {
    ctx.client = new SoundCloudClient({
      clientId: ctx.config.clientId,
      clientSecret: ctx.config.clientSecret,
      redirectUri: ctx.config.redirectUri,
      onRequest: ctx.config.onRequest,
    });
  }
  return ctx.client;
}

// PKCE auth manager — initialized lazily when redirectUri is configured
let authManager: SCAuthManager | null = null;

function getAuthManager(): SCAuthManager {
  if (!authManager) {
    if (!ctx.config.redirectUri) throw new Error("redirectUri not configured");
    authManager = new SCAuthManager({
      clientId: ctx.config.clientId,
      clientSecret: ctx.config.clientSecret,
      redirectUri: ctx.config.redirectUri,
    });
  }
  return authManager;
}

async function ensureToken(): Promise<string> {
  // Use custom token provider if configured
  if (ctx.config.getToken) {
    return ctx.config.getToken();
  }
  if (ctx.token && Date.now() < ctx.tokenExpiry) return ctx.token;
  const result = await getClient().auth.getClientToken();
  ctx.token = result.access_token;
  // Expire 5 minutes before actual expiry
  ctx.tokenExpiry = Date.now() + (result.expires_in - 300) * 1000;
  return ctx.token;
}

function jsonResponse(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function routeError(
  code: string,
  message: string,
  status: number,
  requestId: string,
): Response {
  return jsonResponse({ code, message, status, requestId }, status);
}

function getUserTokenFromHeaders(headers: Headers): string | null {
  const auth = headers.get("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

/** Extract the first path segment (e.g. "/tracks/123" → "tracks") */
function routePrefix(pathname: string): string {
  return pathname.replace(/^\//, "").split("/")[0] ?? "";
}

/** Apply CORS headers to a response (returns new Response). */
function applyCors(
  response: Response,
  cors: SoundCloudRoutesConfig["cors"],
): Response {
  if (!cors || (!cors.origin && !cors.methods)) return response;
  const headers = new Headers(response.headers);
  if (cors.origin) {
    const origin = Array.isArray(cors.origin) ? cors.origin[0] : cors.origin;
    headers.set("Access-Control-Allow-Origin", origin);
  }
  if (cors.methods) {
    headers.set("Access-Control-Allow-Methods", cors.methods.join(", "));
  }
  return new Response(response.body, { status: response.status, headers });
}

/** Apply Cache-Control header for GET responses. */
function applyCacheControl(
  response: Response,
  prefix: string,
  method: string,
  cacheHeaders: SoundCloudRoutesConfig["cacheHeaders"],
): Response {
  if (!cacheHeaders || method !== "GET") return response;
  const value = cacheHeaders[prefix] ?? cacheHeaders["default"];
  if (!value) return response;
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", value);
  return new Response(response.body, { status: response.status, headers });
}

async function handleRoute(
  pathname: string,
  url: URL,
  method: string = "GET",
  headers: Headers = new Headers(),
  body?: any,
  requestId: string = globalThis.crypto.randomUUID(),
): Promise<Response> {
  // ── Route filtering (allowlist / denylist) ─────────────────────────────
  const prefix = routePrefix(pathname);
  const routesCfg = ctx.config.routes;
  if (routesCfg) {
    if (routesCfg.allowlist && !routesCfg.allowlist.includes(prefix)) {
      return routeError("FORBIDDEN", "Route not enabled", 403, requestId);
    }
    if (routesCfg.denylist && routesCfg.denylist.includes(prefix)) {
      return routeError("FORBIDDEN", "Route not enabled", 403, requestId);
    }
  }

  // ── Auth routes ────────────────────────────────────────────────────────

  // GET /auth/login
  if (pathname === "/auth/login" && method === "GET") {
    if (!ctx.config.redirectUri) {
      return routeError("INTERNAL_ERROR", "redirectUri not configured", 500, requestId);
    }
    const { url: authUrl, state } = await getAuthManager().initLogin();
    return jsonResponse({ url: authUrl, state });
  }

  // GET /auth/callback?code=...&state=...
  if (pathname === "/auth/callback" && method === "GET") {
    if (!ctx.config.redirectUri) {
      return routeError("INTERNAL_ERROR", "redirectUri not configured", 500, requestId);
    }
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !state) {
      return routeError("BAD_REQUEST", "Missing code or state parameter", 400, requestId);
    }
    try {
      const tokens = await getAuthManager().exchangeCode(code, state);
      return jsonResponse(tokens);
    } catch {
      return routeError("BAD_REQUEST", "Invalid or expired state", 400, requestId);
    }
  }

  // POST /auth/refresh
  if (pathname === "/auth/refresh" && method === "POST") {
    if (!ctx.config.redirectUri) {
      return routeError("INTERNAL_ERROR", "redirectUri not configured", 500, requestId);
    }
    const refreshTokenValue = body?.refresh_token;
    if (!refreshTokenValue) {
      return routeError("BAD_REQUEST", "Missing refresh_token", 400, requestId);
    }
    try {
      const tokens = await getAuthManager().refreshToken(refreshTokenValue);
      return jsonResponse(tokens);
    } catch {
      return routeError("BAD_REQUEST", "Failed to refresh token", 400, requestId);
    }
  }

  // POST /auth/logout
  if (pathname === "/auth/logout" && method === "POST") {
    const accessTokenValue = body?.access_token;
    if (accessTokenValue) {
      try {
        await signOut(accessTokenValue);
      } catch {
        // best effort
      }
    }
    return jsonResponse({ success: true });
  }

  // ── CSRF protection for mutation action routes ─────────────────────────
  if (ctx.config.csrfProtection && (method === "POST" || method === "DELETE")) {
    const isActionPath =
      /^\/me\/follow\//.test(pathname) ||
      /^\/tracks\/[^/]+\/(like|repost)$/.test(pathname) ||
      /^\/playlists\/[^/]+\/(like|repost)$/.test(pathname);
    if (isActionPath) {
      const origin = headers.get("origin");
      if (!origin) {
        return routeError(
          "FORBIDDEN",
          "CSRF protection: missing Origin header",
          403,
          requestId,
        );
      }
      const corsOrigin = ctx.config.cors?.origin;
      if (corsOrigin) {
        const allowed = Array.isArray(corsOrigin) ? corsOrigin : [corsOrigin];
        if (!allowed.includes(origin)) {
          return routeError(
            "FORBIDDEN",
            "CSRF protection: Origin not allowed",
            403,
            requestId,
          );
        }
      }
    }
  }

  // ── Authenticated "me" routes ──────────────────────────────────────────
  const userToken = getUserTokenFromHeaders(headers);

  // GET /me
  if (pathname === "/me" && method === "GET") {
    if (!userToken) return routeError("UNAUTHORIZED", "Authorization required", 401, requestId);
    const result = await getClient().me.getMe({ token: userToken });
    return jsonResponse(result);
  }

  // GET /me/tracks
  if (pathname === "/me/tracks" && method === "GET") {
    if (!userToken) return routeError("UNAUTHORIZED", "Authorization required", 401, requestId);
    const result = await getClient().me.getTracks(undefined, { token: userToken });
    return jsonResponse(result);
  }

  // GET /me/likes
  if (pathname === "/me/likes" && method === "GET") {
    if (!userToken) return routeError("UNAUTHORIZED", "Authorization required", 401, requestId);
    const result = await getClient().me.getLikesTracks(undefined, { token: userToken });
    return jsonResponse(result);
  }

  // GET /me/playlists
  if (pathname === "/me/playlists" && method === "GET") {
    if (!userToken) return routeError("UNAUTHORIZED", "Authorization required", 401, requestId);
    const result = await getClient().me.getPlaylists(undefined, { token: userToken });
    return jsonResponse(result);
  }

  // GET /me/followings
  if (pathname === "/me/followings" && method === "GET") {
    if (!userToken) return routeError("UNAUTHORIZED", "Authorization required", 401, requestId);
    const result = await getClient().me.getFollowings(undefined, { token: userToken });
    return jsonResponse(result);
  }

  // GET /me/followers
  if (pathname === "/me/followers" && method === "GET") {
    if (!userToken) return routeError("UNAUTHORIZED", "Authorization required", 401, requestId);
    const result = await getClient().me.getFollowers(undefined, { token: userToken });
    return jsonResponse(result);
  }

  // ── Action routes (POST/DELETE) ────────────────────────────────────────

  // POST|DELETE /me/follow/:userId
  const followMatch = pathname.match(/^\/me\/follow\/([^/]+)$/);
  if (followMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return routeError("UNAUTHORIZED", "Authorization required", 401, requestId);
    const userId = followMatch[1];
    if (method === "POST") {
      await getClient().me.follow(userId, { token: userToken });
    } else {
      await getClient().me.unfollow(userId, { token: userToken });
    }
    return jsonResponse({ success: true });
  }

  // POST|DELETE /tracks/:id/like
  const trackLikeActionMatch = pathname.match(/^\/tracks\/([^/]+)\/like$/);
  if (trackLikeActionMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return routeError("UNAUTHORIZED", "Authorization required", 401, requestId);
    const trackId = trackLikeActionMatch[1];
    if (method === "POST") {
      await getClient().likes.likeTrack(trackId, { token: userToken });
    } else {
      await getClient().likes.unlikeTrack(trackId, { token: userToken });
    }
    return jsonResponse({ success: true });
  }

  // POST|DELETE /tracks/:id/repost
  const trackRepostMatch = pathname.match(/^\/tracks\/([^/]+)\/repost$/);
  if (trackRepostMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return routeError("UNAUTHORIZED", "Authorization required", 401, requestId);
    const trackId = trackRepostMatch[1];
    if (method === "POST") {
      await getClient().reposts.repostTrack(trackId, { token: userToken });
    } else {
      await getClient().reposts.unrepostTrack(trackId, { token: userToken });
    }
    return jsonResponse({ success: true });
  }

  // POST|DELETE /playlists/:id/like
  const playlistLikeMatch = pathname.match(/^\/playlists\/([^/]+)\/like$/);
  if (playlistLikeMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return routeError("UNAUTHORIZED", "Authorization required", 401, requestId);
    const playlistId = playlistLikeMatch[1];
    if (method === "POST") {
      await getClient().likes.likePlaylist(playlistId, { token: userToken });
    } else {
      await getClient().likes.unlikePlaylist(playlistId, { token: userToken });
    }
    return jsonResponse({ success: true });
  }

  // POST|DELETE /playlists/:id/repost
  const playlistRepostMatch = pathname.match(/^\/playlists\/([^/]+)\/repost$/);
  if (playlistRepostMatch && (method === "POST" || method === "DELETE")) {
    if (!userToken) return routeError("UNAUTHORIZED", "Authorization required", 401, requestId);
    const playlistId = playlistRepostMatch[1];
    if (method === "POST") {
      await getClient().reposts.repostPlaylist(playlistId, { token: userToken });
    } else {
      await getClient().reposts.unrepostPlaylist(playlistId, { token: userToken });
    }
    return jsonResponse({ success: true });
  }

  // ── Public routes (use client credentials token) ───────────────────────
  const token = await ensureToken();

  // /resolve?url=<soundcloud_url>
  if (pathname === "/resolve") {
    const scUrl = url.searchParams.get("url");
    if (!scUrl) return routeError("BAD_REQUEST", "Missing 'url' parameter", 400, requestId);
    const result = await getClient().resolve.resolveUrl(scUrl, { token });
    return jsonResponse(result);
  }

  // /next?url=<encoded_next_href>
  if (pathname === "/next") {
    const nextUrl = url.searchParams.get("url");
    if (!nextUrl) return routeError("BAD_REQUEST", "Missing 'url' parameter", 400, requestId);
    const { scFetchUrl } = await import("soundcloud-api-ts");
    const result = await scFetchUrl(nextUrl, token);
    return jsonResponse(result);
  }

  // /search/playlists?q=...
  if (pathname === "/search/playlists") {
    const q = url.searchParams.get("q");
    if (!q) return routeError("BAD_REQUEST", "Missing query parameter 'q'", 400, requestId);
    const result = await getClient().search.playlists(q, undefined, { token });
    return jsonResponse(result);
  }

  // /search/users?q=...
  if (pathname === "/search/users") {
    const q = url.searchParams.get("q");
    if (!q) return routeError("BAD_REQUEST", "Missing query parameter 'q'", 400, requestId);
    const result = await getClient().search.users(q, undefined, { token });
    return jsonResponse(result);
  }

  // /search/tracks?q=...&limit=...
  if (pathname === "/search/tracks") {
    const q = url.searchParams.get("q");
    if (!q) return routeError("BAD_REQUEST", "Missing query parameter 'q'", 400, requestId);
    const page = url.searchParams.get("page");
    const result = await getClient().search.tracks(q, page ? parseInt(page, 10) : undefined, { token });
    return jsonResponse(result);
  }

  // /tracks/:id/stream
  const streamMatch = pathname.match(/^\/tracks\/([^/]+)\/stream$/);
  if (streamMatch) {
    const streams = await getClient().tracks.getStreams(streamMatch[1], { token });
    return jsonResponse(streams);
  }

  // /tracks/:id/comments
  const trackCommentsMatch = pathname.match(/^\/tracks\/([^/]+)\/comments$/);
  if (trackCommentsMatch) {
    const result = await getClient().tracks.getComments(trackCommentsMatch[1], undefined, { token });
    return jsonResponse(result);
  }

  // /tracks/:id/likes
  const trackLikesMatch = pathname.match(/^\/tracks\/([^/]+)\/likes$/);
  if (trackLikesMatch) {
    const result = await getClient().tracks.getLikes(trackLikesMatch[1], undefined, { token });
    return jsonResponse(result);
  }

  // /tracks/:id/related
  const trackRelatedMatch = pathname.match(/^\/tracks\/([^/]+)\/related$/);
  if (trackRelatedMatch) {
    const result = await getClient().tracks.getRelated(trackRelatedMatch[1], undefined, { token });
    return jsonResponse(result);
  }

  // /tracks/:id
  const trackMatch = pathname.match(/^\/tracks\/([^/]+)$/);
  if (trackMatch) {
    const track = await getClient().tracks.getTrack(trackMatch[1], { token });
    return jsonResponse(track);
  }

  // /playlists/:id/tracks
  const playlistTracksMatch = pathname.match(/^\/playlists\/([^/]+)\/tracks$/);
  if (playlistTracksMatch) {
    const result = await getClient().playlists.getTracks(playlistTracksMatch[1], undefined, undefined, { token });
    return jsonResponse(result);
  }

  // /playlists/:id
  const playlistMatch = pathname.match(/^\/playlists\/([^/]+)$/);
  if (playlistMatch) {
    const result = await getClient().playlists.getPlaylist(playlistMatch[1], { token });
    return jsonResponse(result);
  }

  // /users/:id/tracks
  const userTracksMatch = pathname.match(/^\/users\/([^/]+)\/tracks$/);
  if (userTracksMatch) {
    const limit = url.searchParams.get("limit");
    const result = await getClient().users.getTracks(
      userTracksMatch[1],
      limit ? parseInt(limit, 10) : undefined,
      { token },
    );
    return jsonResponse(result);
  }

  // /users/:id/playlists
  const userPlaylistsMatch = pathname.match(/^\/users\/([^/]+)\/playlists$/);
  if (userPlaylistsMatch) {
    const result = await getClient().users.getPlaylists(userPlaylistsMatch[1], undefined, { token });
    return jsonResponse(result);
  }

  // /users/:id/likes/tracks
  const userLikesMatch = pathname.match(/^\/users\/([^/]+)\/likes\/tracks$/);
  if (userLikesMatch) {
    const result = await getClient().users.getLikesTracks(userLikesMatch[1], undefined, undefined, { token });
    return jsonResponse(result);
  }

  // /users/:id/followers
  const userFollowersMatch = pathname.match(/^\/users\/([^/]+)\/followers$/);
  if (userFollowersMatch) {
    const result = await getClient().users.getFollowers(userFollowersMatch[1], undefined, { token });
    return jsonResponse(result);
  }

  // /users/:id/followings
  const userFollowingsMatch = pathname.match(/^\/users\/([^/]+)\/followings$/);
  if (userFollowingsMatch) {
    const result = await getClient().users.getFollowings(userFollowingsMatch[1], undefined, { token });
    return jsonResponse(result);
  }

  // /users/:id
  const userMatch = pathname.match(/^\/users\/([^/]+)$/);
  if (userMatch) {
    const user = await getClient().users.getUser(userMatch[1], { token });
    return jsonResponse(user);
  }

  return routeError("NOT_FOUND", "Not found", 404, requestId);
}

/**
 * Create SoundCloud API route handlers for Next.js.
 *
 * Returns an object with individual data-fetching methods (e.g. `searchTracks`, `getTrack`)
 * and catch-all handlers for App Router (`handler()`) and Pages Router (`pagesHandler()`).
 * Manages client credential tokens automatically.
 *
 * @param config - SoundCloud API credentials and optional configuration.
 * @returns An object with route handlers and direct API methods.
 *
 * @example
 * ```ts
 * // app/api/soundcloud/[...route]/route.ts
 * import { createSoundCloudRoutes } from "soundcloud-api-ts-next/server";
 *
 * const sc = createSoundCloudRoutes({
 *   clientId: process.env.SC_CLIENT_ID!,
 *   clientSecret: process.env.SC_CLIENT_SECRET!,
 *   redirectUri: "http://localhost:3000/api/soundcloud/auth/callback",
 * });
 *
 * const handle = sc.handler();
 * export const GET = handle;
 * export const POST = handle;
 * export const DELETE = handle;
 * ```
 *
 * @see {@link SoundCloudRoutesConfig} for configuration options
 * @see {@link SoundCloudProvider} for the client-side provider
 */
export function createSoundCloudRoutes(config: SoundCloudRoutesConfig) {
  ctx.config = config;
  // Reset client, token, and auth manager when config changes
  ctx.client = null;
  ctx.token = undefined;
  ctx.tokenExpiry = 0;
  authManager = null;

  return {
    /** Individual route handlers */
    async resolveUrl(url: string) {
      const token = await ensureToken();
      return getClient().resolve.resolveUrl(url, { token });
    },
    async searchTracks(q: string, page?: number) {
      const token = await ensureToken();
      return getClient().search.tracks(q, page, { token });
    },
    async searchUsers(q: string) {
      const token = await ensureToken();
      return getClient().search.users(q, undefined, { token });
    },
    async searchPlaylists(q: string) {
      const token = await ensureToken();
      return getClient().search.playlists(q, undefined, { token });
    },
    async getTrack(trackId: string | number) {
      const token = await ensureToken();
      return getClient().tracks.getTrack(trackId, { token });
    },
    async getTrackComments(trackId: string | number) {
      const token = await ensureToken();
      return getClient().tracks.getComments(trackId, undefined, { token });
    },
    async getTrackLikes(trackId: string | number) {
      const token = await ensureToken();
      return getClient().tracks.getLikes(trackId, undefined, { token });
    },
    async getRelatedTracks(trackId: string | number) {
      const token = await ensureToken();
      return getClient().tracks.getRelated(trackId, undefined, { token });
    },
    async getUser(userId: string | number) {
      const token = await ensureToken();
      return getClient().users.getUser(userId, { token });
    },
    async getUserTracks(userId: string | number, limit?: number) {
      const token = await ensureToken();
      return getClient().users.getTracks(userId, limit, { token });
    },
    async getUserPlaylists(userId: string | number) {
      const token = await ensureToken();
      return getClient().users.getPlaylists(userId, undefined, { token });
    },
    async getUserLikesTracks(userId: string | number) {
      const token = await ensureToken();
      return getClient().users.getLikesTracks(userId, undefined, undefined, { token });
    },
    async getFollowers(userId: string | number) {
      const token = await ensureToken();
      return getClient().users.getFollowers(userId, undefined, { token });
    },
    async getFollowings(userId: string | number) {
      const token = await ensureToken();
      return getClient().users.getFollowings(userId, undefined, { token });
    },
    async getTrackStreams(trackId: string | number) {
      const token = await ensureToken();
      return getClient().tracks.getStreams(trackId, { token });
    },
    async getPlaylist(playlistId: string | number) {
      const token = await ensureToken();
      return getClient().playlists.getPlaylist(playlistId, { token });
    },
    async getPlaylistTracks(playlistId: string | number) {
      const token = await ensureToken();
      return getClient().playlists.getTracks(playlistId, undefined, undefined, { token });
    },

    /**
     * App Router catch-all handler.
     * Mount at `app/api/soundcloud/[...route]/route.ts`
     */
    handler() {
      const handle = async (request: Request): Promise<Response> => {
        const startTime = Date.now();
        const requestId = globalThis.crypto.randomUUID();
        let routePath = "";
        let prefix = "";
        try {
          const url = new URL(request.url);
          // Extract the route portion after /api/soundcloud
          const match = url.pathname.match(/\/api\/soundcloud(\/.*)/);
          routePath = match ? match[1] : url.pathname;
          prefix = routePrefix(routePath);

          let body: any = undefined;
          if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
            try {
              body = await request.json();
            } catch {
              body = undefined;
            }
          }

          let response = await handleRoute(routePath, url, request.method, request.headers, body, requestId);
          response = applyCacheControl(response, prefix, request.method, ctx.config.cacheHeaders);
          response = applyCors(response, ctx.config.cors);
          ctx.config.onRouteComplete?.({
            route: routePath,
            method: request.method,
            durationMs: Date.now() - startTime,
            status: response.status,
          });
          return response;
        } catch (err: any) {
          const status = err?.statusCode ?? 500;
          const code = status === 404 ? "NOT_FOUND" : "UPSTREAM_ERROR";
          ctx.config.onRouteComplete?.({
            route: routePath,
            method: request.method,
            durationMs: Date.now() - startTime,
            status,
            error: err?.message,
          });
          let errResp = jsonResponse(
            { code, message: err?.message ?? "Internal server error", status, requestId },
            status,
          );
          errResp = applyCors(errResp, ctx.config.cors);
          return errResp;
        }
      };
      return handle;
    },

    /**
     * Pages Router catch-all handler.
     * Mount at `pages/api/soundcloud/[...route].ts`
     */
    pagesHandler() {
      return async (req: any, res: any): Promise<void> => {
        const startTime = Date.now();
        const requestId = globalThis.crypto.randomUUID();
        let routePath = "";
        let prefix = "";
        try {
          routePath = Array.isArray(req.query.route)
            ? "/" + req.query.route.join("/")
            : req.url?.replace(/^\/api\/soundcloud/, "") ?? "/";
          prefix = routePrefix(routePath);

          const protocol = req.headers["x-forwarded-proto"] || "http";
          const host = req.headers.host || "localhost";
          const url = new URL(`${protocol}://${host}${req.url}`);

          const headers = new Headers();
          if (req.headers.authorization) {
            headers.set("authorization", req.headers.authorization);
          }

          let response = await handleRoute(routePath, url, req.method || "GET", headers, req.body, requestId);
          response = applyCacheControl(response, prefix, req.method || "GET", ctx.config.cacheHeaders);
          const body = await response.json();
          ctx.config.onRouteComplete?.({
            route: routePath,
            method: req.method || "GET",
            durationMs: Date.now() - startTime,
            status: response.status,
          });
          // Apply CORS headers to pages router res
          if (ctx.config.cors?.origin) {
            const origin = Array.isArray(ctx.config.cors.origin)
              ? ctx.config.cors.origin[0]
              : ctx.config.cors.origin;
            res.setHeader("Access-Control-Allow-Origin", origin);
          }
          if (ctx.config.cors?.methods) {
            res.setHeader("Access-Control-Allow-Methods", ctx.config.cors.methods.join(", "));
          }
          res.status(response.status).json(body);
        } catch (err: any) {
          const status = err?.statusCode ?? 500;
          const code = status === 404 ? "NOT_FOUND" : "UPSTREAM_ERROR";
          ctx.config.onRouteComplete?.({
            route: routePath,
            method: req.method || "GET",
            durationMs: Date.now() - startTime,
            status,
            error: err?.message,
          });
          res.status(status).json({
            code,
            message: err?.message ?? "Internal server error",
            status,
            requestId,
          });
        }
      };
    },
  };
}
