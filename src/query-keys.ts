/**
 * Query key factories for use with TanStack Query, SWR, or any cache keyed by arrays.
 *
 * Keys are stable, serialisable arrays that describe the resource being fetched.
 * Use these with `scFetchers` to integrate SoundCloud data into your preferred
 * data-fetching library without taking a dependency on it.
 *
 * @example
 * ```ts
 * // TanStack Query
 * useQuery({ queryKey: scKeys.track(123), queryFn: () => scFetchers.track(123) });
 *
 * // SWR
 * useSWR(scKeys.track(123), () => scFetchers.track(123));
 * ```
 *
 * @see {@link scFetchers} for the matching fetcher functions
 */
export const scKeys = {
  /** Root key — matches every SoundCloud query. */
  all: () => ["sc"] as const,

  /** Key for a single track. */
  track: (id: string | number) => ["sc", "track", String(id)] as const,

  /** Key for a batch of tracks by IDs. */
  tracks: (ids: (string | number)[]) =>
    ["sc", "tracks", ids.map(String).join(",")] as const,

  /** Key for a single user. */
  user: (id: string | number) => ["sc", "user", String(id)] as const,

  /** Key for a single playlist. */
  playlist: (id: string | number) => ["sc", "playlist", String(id)] as const,

  /** Key for a track search query. */
  searchTracks: (q: string, limit?: number) =>
    ["sc", "search", "tracks", q, limit ?? "default"] as const,

  /** Key for a user search query. */
  searchUsers: (q: string, limit?: number) =>
    ["sc", "search", "users", q, limit ?? "default"] as const,

  /** Key for the authenticated user's profile. */
  me: () => ["sc", "me"] as const,

  /** Key for the authenticated user's linked service connections. */
  meConnections: () => ["sc", "me", "connections"] as const,
};
