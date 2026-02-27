import { SoundCloudClient } from "soundcloud-api-ts";
import type { SCRequestTelemetry, RetryInfo } from "soundcloud-api-ts";
import type {
  SoundCloudTrack,
  SoundCloudUser,
  SoundCloudPlaylist,
  SoundCloudPaginatedResponse,
  SoundCloudMe,
  SoundCloudConnection,
} from "soundcloud-api-ts";

// ── Config ──────────────────────────────────────────────────────────────────

/**
 * Configuration for {@link configureFetchers}.
 */
export interface FetchersConfig {
  /** SoundCloud OAuth client ID. */
  clientId: string;
  /** SoundCloud OAuth client secret. */
  clientSecret: string;
  /** Called after every SoundCloud API request with structured telemetry. */
  onRequest?: (telemetry: SCRequestTelemetry) => void;
  /** Called on each retry attempt. */
  onRetry?: (info: RetryInfo) => void;
}

let _config: FetchersConfig | null = null;
let _client: SoundCloudClient | null = null;
let _clientToken: string | undefined;
let _clientTokenExpiry = 0;
let _refreshPromise: Promise<string> | null = null;

/**
 * Configure the global SoundCloud fetcher client.
 *
 * Call once at the module level (e.g. in a server component or `_app.tsx`
 * server action) before using {@link scFetchers}.
 *
 * @example
 * ```ts
 * // lib/sc.ts (server-side module)
 * import { configureFetchers } from "soundcloud-api-ts-next";
 *
 * configureFetchers({
 *   clientId: process.env.SC_CLIENT_ID!,
 *   clientSecret: process.env.SC_CLIENT_SECRET!,
 * });
 * ```
 */
export function configureFetchers(config: FetchersConfig): void {
  _config = config;
  _client = null;
  _clientToken = undefined;
  _clientTokenExpiry = 0;
  _refreshPromise = null;
}

function getClient(): SoundCloudClient {
  if (!_config) {
    throw new Error(
      "soundcloud-api-ts-next: call configureFetchers({ clientId, clientSecret }) before using scFetchers",
    );
  }
  if (!_client) {
    _client = new SoundCloudClient({
      clientId: _config.clientId,
      clientSecret: _config.clientSecret,
      onRequest: _config.onRequest,
      onRetry: _config.onRetry,
    });
  }
  return _client;
}

async function ensureClientToken(): Promise<string> {
  if (_clientToken && Date.now() < _clientTokenExpiry) return _clientToken;
  if (_refreshPromise) return _refreshPromise;
  _refreshPromise = (async () => {
    const result = await getClient().auth.getClientToken();
    _clientToken = result.access_token;
    _clientTokenExpiry = Date.now() + (result.expires_in - 300) * 1000;
    return _clientToken!;
  })().finally(() => { _refreshPromise = null; });
  return _refreshPromise;
}

// ── Fetchers ─────────────────────────────────────────────────────────────────

/**
 * Headless async fetchers for SoundCloud resources.
 *
 * These are plain async functions with no React dependency — designed for use
 * with TanStack Query, SWR, or any other caching/fetching layer.
 *
 * Configure once with {@link configureFetchers}, then use these as `queryFn` /
 * `fetcher` callbacks alongside the matching {@link scKeys} query key factories.
 *
 * @example
 * ```ts
 * // TanStack Query
 * const { data } = useQuery({
 *   queryKey: scKeys.track(id),
 *   queryFn: () => scFetchers.track(id),
 * });
 *
 * // SWR
 * const { data } = useSWR(scKeys.track(id), () => scFetchers.track(id));
 * ```
 *
 * @see {@link configureFetchers} for setup
 * @see {@link scKeys} for matching query key factories
 */
export const scFetchers = {
  /**
   * Fetch a single track by ID.
   * @param id - Track ID.
   * @param token - Optional user OAuth token (overrides client credentials).
   */
  async track(id: string | number, token?: string): Promise<SoundCloudTrack> {
    const t = token ?? (await ensureClientToken());
    return getClient().tracks.getTrack(id, { token: t });
  },

  /**
   * Fetch multiple tracks by ID in parallel.
   * @param ids - Array of track IDs.
   * @param token - Optional user OAuth token.
   */
  async tracks(
    ids: (string | number)[],
    token?: string,
  ): Promise<SoundCloudTrack[]> {
    const t = token ?? (await ensureClientToken());
    return Promise.all(ids.map((id) => getClient().tracks.getTrack(id, { token: t })));
  },

  /**
   * Fetch a single user by ID.
   * @param id - User ID.
   * @param token - Optional user OAuth token.
   */
  async user(id: string | number, token?: string): Promise<SoundCloudUser> {
    const t = token ?? (await ensureClientToken());
    return getClient().users.getUser(id, { token: t });
  },

  /**
   * Fetch a single playlist by ID.
   * @param id - Playlist ID.
   * @param token - Optional user OAuth token.
   */
  async playlist(
    id: string | number,
    token?: string,
  ): Promise<SoundCloudPlaylist> {
    const t = token ?? (await ensureClientToken());
    return getClient().playlists.getPlaylist(id, { token: t });
  },

  /**
   * Search tracks by query string.
   * @param q - Search query.
   * @param limit - Maximum results to return.
   * @param token - Optional user OAuth token.
   */
  async searchTracks(
    q: string,
    limit?: number,
    token?: string,
  ): Promise<SoundCloudPaginatedResponse<SoundCloudTrack>> {
    const t = token ?? (await ensureClientToken());
    return getClient().search.tracks(q, limit, { token: t });
  },

  /**
   * Search users by query string.
   * @param q - Search query.
   * @param limit - Maximum results to return.
   * @param token - Optional user OAuth token.
   */
  async searchUsers(
    q: string,
    limit?: number,
    token?: string,
  ): Promise<SoundCloudPaginatedResponse<SoundCloudUser>> {
    const t = token ?? (await ensureClientToken());
    return getClient().search.users(
      q,
      limit,
      { token: t },
    ) as Promise<SoundCloudPaginatedResponse<SoundCloudUser>>;
  },

  /**
   * Fetch the currently authenticated user's profile.
   * @param token - User OAuth access token (required).
   */
  async me(token: string): Promise<SoundCloudMe> {
    return getClient().me.getMe({ token });
  },

  /**
   * Fetch the authenticated user's linked service connections.
   * @param token - User OAuth access token (required).
   */
  async meConnections(token: string): Promise<SoundCloudConnection[]> {
    return getClient().me.getConnections({ token });
  },

  /**
   * Resolve a SoundCloud URL to its API resource.
   * @param url - A SoundCloud web URL (track, user, playlist, etc.).
   * @param token - Optional user OAuth token.
   */
  async resolve(url: string, token?: string): Promise<unknown> {
    const t = token ?? (await ensureClientToken());
    return getClient().resolve.resolveUrl(url, { token: t });
  },
};
