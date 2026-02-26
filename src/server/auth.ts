import {
  SoundCloudClient,
  generateCodeVerifier,
  generateCodeChallenge,
  getAuthorizationUrl,
} from "soundcloud-api-ts";
import type { SoundCloudToken } from "../types.js";

// ── PkceStore interface ────────────────────────────────────────────────────

/**
 * Pluggable storage backend for PKCE verifiers.
 *
 * The default implementation keeps verifiers in-process memory, which is
 * fine for single-instance Node.js deployments but will break on
 * serverless/multi-instance setups (Vercel, edge, etc.) due to cold-starts
 * and instance hopping.
 *
 * Supply a custom store via {@link SCAuthManagerConfig.pkceStore} to use an
 * external store (Redis, signed cookies, etc.) that survives across instances.
 *
 * @example
 * ```ts
 * // Redis adapter example
 * const redisStore: PkceStore = {
 *   async set(state, verifier, ttlMs) {
 *     await redis.set(`pkce:${state}`, verifier, { px: ttlMs });
 *   },
 *   async get(state) {
 *     return (await redis.get(`pkce:${state}`)) ?? undefined;
 *   },
 *   async delete(state) {
 *     await redis.del(`pkce:${state}`);
 *   },
 * };
 * ```
 */
export interface PkceStore {
  /** Store a verifier keyed by state, expiring after `ttlMs` milliseconds. */
  set(state: string, verifier: string, ttlMs: number): Promise<void> | void;
  /** Retrieve the verifier for `state`, or `undefined` if absent/expired. */
  get(state: string): Promise<string | undefined> | string | undefined;
  /** Remove the entry for `state` (one-time-use enforcement). */
  delete(state: string): Promise<void> | void;
}

// ── Types ─────────────────────────────────────────────────────────────────

/**
 * Configuration for {@link SCAuthManager}.
 */
export interface SCAuthManagerConfig {
  /** SoundCloud OAuth client ID from your app registration. */
  clientId: string;
  /** SoundCloud OAuth client secret from your app registration. */
  clientSecret: string;
  /**
   * OAuth redirect URI — must match the value registered in your SoundCloud app
   * and used in the initial authorization request.
   */
  redirectUri: string;
  /**
   * Optional custom PKCE store. Defaults to the built-in in-memory store.
   *
   * Use {@link CookiePkceStore} for serverless/Vercel deployments, or supply a
   * Redis-backed adapter for multi-region Node.js deployments.
   *
   * @see {@link PkceStore} for the interface contract
   * @see {@link MemoryPkceStore} for the default in-memory implementation
   * @see {@link CookiePkceStore} for a signed-cookie-based implementation
   */
  pkceStore?: PkceStore;
  /**
   * Name for the OAuth state cookie.
   *
   * Useful when you need to scope the cookie name per application or to avoid
   * conflicts with other OAuth flows on the same domain.
   *
   * @default "sc_oauth_state"
   *
   * @example
   * ```ts
   * // In your route handler, read from request cookies:
   * const state = req.cookies[scAuth.stateCookieName];
   * ```
   */
  stateCookieName?: string;
}

/**
 * Options for {@link SCAuthManager.initLogin}.
 */
export interface SCLoginOptions {
  /**
   * Optional session identifier to incorporate into the OAuth state string.
   *
   * When provided, the state becomes `<sessionId>:<random-uuid>`, preventing
   * parallel login flows from different browser tabs or user-agents from
   * overwriting each other's PKCE state.
   *
   * @example
   * ```ts
   * // Scope login to the current user session
   * const sessionId = req.cookies["session_id"];
   * const { url, state } = await scAuth.initLogin({ sessionId });
   * ```
   */
  sessionId?: string;
}

/**
 * Result from {@link SCAuthManager.initLogin} — redirect the user to `url`,
 * then persist `state` (e.g. in a short-lived httpOnly cookie) so you can
 * verify it in the OAuth callback.
 */
export interface SCLoginResult {
  /** The full SoundCloud authorize URL to redirect the user to. */
  url: string;
  /**
   * Random CSRF state token. Store this securely (httpOnly cookie) and
   * compare it against the `state` param in the OAuth callback.
   */
  state: string;
}

// ── SCAuthManager ─────────────────────────────────────────────────────────

/**
 * Server-side SoundCloud OAuth 2.1 + PKCE auth manager.
 *
 * Handles the full authorization code + PKCE flow:
 *   1. `initLogin()` — generates a PKCE verifier/challenge + CSRF state,
 *      returns the SoundCloud authorize URL.
 *   2. `exchangeCode(code, state)` — verifies the CSRF state, exchanges the
 *      authorization code + PKCE verifier for access/refresh tokens.
 *   3. `refreshToken(refreshToken)` — refreshes an expired access token.
 *
 * **In-memory store (default):** The PKCE verifier is stored in-process memory
 * (tied to the process). In a typical Next.js deployment the module is a
 * long-lived singleton — verifiers survive across requests for up to 10 minutes
 * before being evicted. This breaks on serverless / multi-instance deployments.
 *
 * **Distributed deployments:** Pass a custom {@link PkceStore} via
 * {@link SCAuthManagerConfig.pkceStore}. See {@link CookiePkceStore} for a
 * zero-infrastructure option that stores the verifier in a signed HTTP cookie,
 * or build a Redis adapter for multi-region Node deployments.
 *
 * **Cookie security options for production:**
 * When setting state or verifier cookies in your route handler, always use:
 * ```
 * Set-Cookie: sc_oauth_state=<value>;
 *   HttpOnly;
 *   Secure (when NODE_ENV === "production");
 *   SameSite=Lax;
 *   Max-Age=600 (10 minutes — matches PKCE TTL)
 *   Path=/
 * ```
 * Never expose auth cookies to JavaScript (`HttpOnly`). Always require HTTPS
 * in production (`Secure`). Use `SameSite=Lax` to protect against CSRF.
 *
 * @example
 * ```ts
 * // lib/sc-auth.ts (module-level singleton)
 * import { createSCAuthManager } from "soundcloud-api-ts-next/server";
 *
 * export const scAuth = createSCAuthManager({
 *   clientId: process.env.SC_CLIENT_ID!,
 *   clientSecret: process.env.SC_CLIENT_SECRET!,
 *   redirectUri: process.env.SC_REDIRECT_URI!,
 * });
 *
 * // api/auth/login/route.ts
 * const { url, state } = await scAuth.initLogin();
 * // Set httpOnly cookie with state, then redirect to url
 *
 * // api/auth/callback/route.ts
 * const tokens = await scAuth.exchangeCode(code, state);
 * // Use tokens.access_token for authenticated SC API calls
 * ```
 */
export class SCAuthManager {
  private readonly config: SCAuthManagerConfig;
  private readonly scClient: SoundCloudClient;
  private readonly store: PkceStore;
  /** TTL for PKCE entries in ms (default: 10 minutes) */
  private readonly ttlMs: number;

  /**
   * The name of the cookie to use for storing the OAuth state token.
   * Configured via {@link SCAuthManagerConfig.stateCookieName}.
   */
  readonly stateCookieName: string;

  constructor(config: SCAuthManagerConfig, ttlMs = 600_000) {
    this.config = config;
    this.ttlMs = ttlMs;
    this.stateCookieName = config.stateCookieName ?? "sc_oauth_state";
    this.scClient = new SoundCloudClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    });
    // Default to in-memory store; consumer can override via pkceStore option
    this.store = config.pkceStore ?? new DefaultMemoryStore();
  }

  /**
   * Start the SoundCloud OAuth 2.1 + PKCE login flow.
   *
   * Generates a PKCE code_verifier + code_challenge and a random CSRF state
   * token, stores the verifier server-side via the configured {@link PkceStore},
   * and returns the SoundCloud authorize URL to redirect the user to.
   *
   * **You must persist `state`** (e.g. httpOnly cookie) and verify it in
   * the callback — otherwise CSRF protection is bypassed.
   *
   * @param options - Optional login options (e.g. `sessionId` for multi-tenant).
   * @returns `{ url, state }` — redirect to `url`, persist `state`.
   */
  async initLogin(options?: SCLoginOptions): Promise<SCLoginResult> {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);

    // Incorporate optional sessionId to prevent parallel-login collisions
    const randomPart = globalThis.crypto.randomUUID();
    const state = options?.sessionId
      ? `${options.sessionId}:${randomPart}`
      : randomPart;

    await this.store.set(state, verifier, this.ttlMs);
    const url = getAuthorizationUrl(this.config.clientId, this.config.redirectUri, {
      state,
      codeChallenge: challenge,
    });
    return { url, state };
  }

  /**
   * Exchange an authorization code for access + refresh tokens.
   *
   * Verifies `state` against the stored PKCE entry (CSRF check), then
   * exchanges the code + PKCE verifier with SoundCloud's token endpoint.
   * The PKCE entry is consumed (one-time use).
   *
   * @param code  The `code` query param from SoundCloud's OAuth redirect.
   * @param state The `state` query param — must match what was returned by `initLogin`.
   * @throws If `state` is invalid/expired or the token exchange fails.
   */
  async exchangeCode(code: string, state: string): Promise<SoundCloudToken> {
    const verifier = await this.store.get(state);
    if (!verifier) {
      throw new Error(
        "Invalid or expired OAuth state — the login session may have timed out. Please try again."
      );
    }
    await this.store.delete(state); // one-time use
    const tokens = await this.scClient.auth.getUserToken(code, verifier);
    return tokens as SoundCloudToken;
  }

  /**
   * Refresh an expired access token using a refresh token.
   *
   * @param refreshToken The refresh token obtained from a previous token exchange.
   * @throws If the refresh token is expired or invalid.
   */
  async refreshToken(refreshToken: string): Promise<SoundCloudToken> {
    const tokens = await this.scClient.auth.refreshUserToken(refreshToken);
    return tokens as SoundCloudToken;
  }

  /**
   * Returns the number of active (non-expired) PKCE entries.
   * Useful for observability / health checks.
   * Only meaningful when using the default in-memory store.
   */
  get pendingLogins(): number {
    if (this.store instanceof DefaultMemoryStore) {
      return this.store.size;
    }
    // External stores don't expose a count
    return -1;
  }
}

// ── Internal default in-memory store ──────────────────────────────────────

/**
 * Default in-memory PKCE store used when no `pkceStore` is provided.
 * @internal
 */
class DefaultMemoryStore implements PkceStore {
  private readonly map = new Map<string, { verifier: string; createdAt: number }>();
  private ttlMs = 600_000;

  set(state: string, verifier: string, ttlMs: number): void {
    this.ttlMs = ttlMs;
    this._evictExpired();
    this.map.set(state, { verifier, createdAt: Date.now() });
  }

  get(state: string): string | undefined {
    this._evictExpired();
    return this.map.get(state)?.verifier;
  }

  delete(state: string): void {
    this.map.delete(state);
  }

  get size(): number {
    this._evictExpired();
    return this.map.size;
  }

  private _evictExpired(): void {
    const now = Date.now();
    for (const [key, val] of this.map) {
      if (now - val.createdAt > this.ttlMs) this.map.delete(key);
    }
  }
}

// ── Factory ───────────────────────────────────────────────────────────────

/**
 * Create a new {@link SCAuthManager} instance.
 *
 * Call this once at the module level to create a singleton — the PKCE
 * store is shared across requests within the same process (or across instances
 * if you supply an external store).
 *
 * @example
 * ```ts
 * // lib/sc-auth.ts
 * import { createSCAuthManager } from "soundcloud-api-ts-next/server";
 *
 * export const scAuth = createSCAuthManager({
 *   clientId: process.env.SC_CLIENT_ID!,
 *   clientSecret: process.env.SC_CLIENT_SECRET!,
 *   redirectUri: process.env.SC_REDIRECT_URI!,
 * });
 * ```
 */
export function createSCAuthManager(config: SCAuthManagerConfig): SCAuthManager {
  return new SCAuthManager(config);
}
