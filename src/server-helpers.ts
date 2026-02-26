import { SoundCloudClient } from "soundcloud-api-ts";
import type {
  SoundCloudTrack,
  SoundCloudUser,
  SoundCloudPlaylist,
  SoundCloudMe,
  SoundCloudPaginatedResponse,
} from "./types.js";
import { scCacheKeys } from "./cache-keys.js";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Configuration passed to each server helper function.
 */
export interface ServerHelperConfig {
  /** SoundCloud OAuth client ID from your app registration. */
  clientId: string;
  /** SoundCloud OAuth client secret from your app registration. */
  clientSecret: string;
  /**
   * Optional user access token for authenticated endpoints (e.g. `getMe`).
   * When omitted, the helper uses client credentials (public data only).
   */
  token?: string;
}

/**
 * `next/cache` caching options for server helpers.
 *
 * When `next/cache` is available (i.e. inside a Next.js runtime), helpers
 * wrap the underlying fetch with `unstable_cache` using these options.
 * Outside of Next.js (e.g. in tests or plain Node), the options are ignored
 * and the raw API call is made directly.
 *
 * @example
 * ```ts
 * // Cache for 60 seconds, tagged for on-demand invalidation
 * const track = await getTrack(123, config, { revalidate: 60, tags: ["track-123"] });
 *
 * // Never cache (always fresh)
 * const me = await getMe(config, { revalidate: false });
 * ```
 */
export interface CacheOptions {
  /**
   * Time-to-live in seconds for the cached result.
   * - A positive number: cache for that many seconds.
   * - `false`: opt out of caching (equivalent to `no-store`).
   * - Omitted: use Next.js default (typically `force-cache` / indefinitely).
   */
  revalidate?: number | false;
  /**
   * Cache tags for on-demand invalidation via `revalidateTag`.
   * Use {@link scCacheKeys} to generate consistent tag arrays.
   *
   * @example
   * ```ts
   * import { scCacheKeys } from "soundcloud-api-ts-next/server";
   * await getTrack(123, config, { tags: scCacheKeys.track(123) });
   * // Later: revalidateTag("sc"); // or "track" / "123"
   * ```
   */
  tags?: string[];
}

// ── Internals ──────────────────────────────────────────────────────────────

function makeClient(config: ServerHelperConfig): SoundCloudClient {
  return new SoundCloudClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });
}

async function getClientToken(config: ServerHelperConfig): Promise<string> {
  if (config.token) return config.token;
  const sc = makeClient(config);
  const result = await sc.auth.getClientToken();
  return result.access_token;
}

/**
 * Wrap `fn` with `unstable_cache` when inside a Next.js runtime.
 * Gracefully falls back to calling `fn()` directly when Next.js cache is
 * unavailable (e.g. in tests, plain Node scripts, or other runtimes).
 *
 * @internal
 */
async function withCache<T>(
  fn: () => Promise<T>,
  keyParts: string[],
  cacheOptions?: CacheOptions,
): Promise<T> {
  // Try to import next/cache; fail silently outside Next.js
  let unstable_cache: typeof import("next/cache").unstable_cache | undefined;
  try {
    const mod = await import("next/cache");
    unstable_cache = mod.unstable_cache;
  } catch {
    // Not in a Next.js runtime — call directly
    return fn();
  }

  if (!unstable_cache) return fn();

  const cached = unstable_cache(fn, keyParts, {
    revalidate: cacheOptions?.revalidate,
    tags: cacheOptions?.tags,
  });
  return cached();
}

// ── Server helpers ─────────────────────────────────────────────────────────

/**
 * Fetch a single SoundCloud track by ID.
 *
 * Uses client credentials (public endpoint — no user token required).
 * Wrap with `next/cache` options for ISR / on-demand revalidation.
 *
 * @param id           Track ID (number or string).
 * @param config       SoundCloud client credentials.
 * @param cacheOptions Optional `next/cache` caching options.
 *
 * @example
 * ```ts
 * // app/tracks/[id]/page.tsx
 * import { getTrack, scCacheKeys } from "soundcloud-api-ts-next/server";
 *
 * export default async function TrackPage({ params }: { params: { id: string } }) {
 *   const track = await getTrack(params.id, {
 *     clientId: process.env.SC_CLIENT_ID!,
 *     clientSecret: process.env.SC_CLIENT_SECRET!,
 *   }, { revalidate: 3600, tags: scCacheKeys.track(params.id) });
 *
 *   return <TrackView track={track} />;
 * }
 * ```
 */
export async function getTrack(
  id: string | number,
  config: ServerHelperConfig,
  cacheOptions?: CacheOptions,
): Promise<SoundCloudTrack> {
  const keyParts = scCacheKeys.track(id);
  return withCache(
    async () => {
      const token = await getClientToken(config);
      const sc = makeClient(config);
      return sc.tracks.getTrack(id, { token }) as Promise<SoundCloudTrack>;
    },
    keyParts,
    cacheOptions,
  );
}

/**
 * Search for SoundCloud tracks by query string.
 *
 * Uses client credentials (public endpoint — no user token required).
 *
 * @param query        Search query string.
 * @param config       SoundCloud client credentials.
 * @param cacheOptions Optional `next/cache` caching options.
 *
 * @example
 * ```ts
 * // app/search/page.tsx
 * import { searchTracks, scCacheKeys } from "soundcloud-api-ts-next/server";
 *
 * export default async function SearchPage({ searchParams }: { searchParams: { q: string } }) {
 *   const results = await searchTracks(searchParams.q, {
 *     clientId: process.env.SC_CLIENT_ID!,
 *     clientSecret: process.env.SC_CLIENT_SECRET!,
 *   }, { revalidate: 300, tags: scCacheKeys.searchTracks(searchParams.q) });
 *
 *   return <TrackList tracks={results.collection} />;
 * }
 * ```
 */
export async function searchTracks(
  query: string,
  config: ServerHelperConfig,
  cacheOptions?: CacheOptions,
): Promise<SoundCloudPaginatedResponse<SoundCloudTrack>> {
  const keyParts = scCacheKeys.searchTracks(query);
  return withCache(
    async () => {
      const token = await getClientToken(config);
      const sc = makeClient(config);
      return sc.search.tracks(
        query,
        undefined,
        { token },
      ) as Promise<SoundCloudPaginatedResponse<SoundCloudTrack>>;
    },
    keyParts,
    cacheOptions,
  );
}

/**
 * Fetch a SoundCloud user profile by ID.
 *
 * Uses client credentials (public endpoint — no user token required).
 *
 * @param id           User ID (number or string).
 * @param config       SoundCloud client credentials.
 * @param cacheOptions Optional `next/cache` caching options.
 *
 * @example
 * ```ts
 * // app/users/[id]/page.tsx
 * import { getUser, scCacheKeys } from "soundcloud-api-ts-next/server";
 *
 * export default async function UserPage({ params }: { params: { id: string } }) {
 *   const user = await getUser(params.id, {
 *     clientId: process.env.SC_CLIENT_ID!,
 *     clientSecret: process.env.SC_CLIENT_SECRET!,
 *   }, { revalidate: 3600, tags: scCacheKeys.user(params.id) });
 *
 *   return <UserProfile user={user} />;
 * }
 * ```
 */
export async function getUser(
  id: string | number,
  config: ServerHelperConfig,
  cacheOptions?: CacheOptions,
): Promise<SoundCloudUser> {
  const keyParts = scCacheKeys.user(id);
  return withCache(
    async () => {
      const token = await getClientToken(config);
      const sc = makeClient(config);
      return sc.users.getUser(id, { token }) as Promise<SoundCloudUser>;
    },
    keyParts,
    cacheOptions,
  );
}

/**
 * Fetch a SoundCloud playlist by ID.
 *
 * Uses client credentials (public endpoint — no user token required).
 *
 * @param id           Playlist ID (number or string).
 * @param config       SoundCloud client credentials.
 * @param cacheOptions Optional `next/cache` caching options.
 *
 * @example
 * ```ts
 * // app/playlists/[id]/page.tsx
 * import { getPlaylist, scCacheKeys } from "soundcloud-api-ts-next/server";
 *
 * export default async function PlaylistPage({ params }: { params: { id: string } }) {
 *   const playlist = await getPlaylist(params.id, {
 *     clientId: process.env.SC_CLIENT_ID!,
 *     clientSecret: process.env.SC_CLIENT_SECRET!,
 *   }, { revalidate: 1800, tags: scCacheKeys.playlist(params.id) });
 *
 *   return <PlaylistView playlist={playlist} />;
 * }
 * ```
 */
export async function getPlaylist(
  id: string | number,
  config: ServerHelperConfig,
  cacheOptions?: CacheOptions,
): Promise<SoundCloudPlaylist> {
  const keyParts = scCacheKeys.playlist(id);
  return withCache(
    async () => {
      const token = await getClientToken(config);
      const sc = makeClient(config);
      return sc.playlists.getPlaylist(id, { token }) as Promise<SoundCloudPlaylist>;
    },
    keyParts,
    cacheOptions,
  );
}

/**
 * Fetch the authenticated user's own profile (`/me`).
 *
 * Requires a valid user access token in `config.token`. This is an
 * authenticated endpoint — it will fail without a user token.
 *
 * @param config       SoundCloud client credentials + required `token`.
 * @param cacheOptions Optional `next/cache` caching options.
 *
 * @example
 * ```ts
 * // app/dashboard/page.tsx
 * import { getMe, scCacheKeys } from "soundcloud-api-ts-next/server";
 * import { cookies } from "next/headers";
 *
 * export default async function DashboardPage() {
 *   const token = cookies().get("sc_access_token")?.value;
 *   if (!token) redirect("/login");
 *
 *   const me = await getMe({
 *     clientId: process.env.SC_CLIENT_ID!,
 *     clientSecret: process.env.SC_CLIENT_SECRET!,
 *     token,
 *   }, { revalidate: 300, tags: scCacheKeys.me() });
 *
 *   return <Dashboard user={me} />;
 * }
 * ```
 */
export async function getMe(
  config: ServerHelperConfig,
  cacheOptions?: CacheOptions,
): Promise<SoundCloudMe> {
  if (!config.token) {
    throw new Error(
      "getMe() requires a user access token. Provide `config.token` with a valid SoundCloud OAuth access token.",
    );
  }
  const keyParts = scCacheKeys.me();
  return withCache(
    async () => {
      const sc = makeClient(config);
      return sc.me.getMe({ token: config.token! }) as Promise<SoundCloudMe>;
    },
    keyParts,
    cacheOptions,
  );
}
