/**
 * Cache key factory helpers for use with `next/cache` `revalidateTag` and
 * `unstable_cache`.
 *
 * Using consistent, predictable cache keys lets you granularly invalidate
 * cached SoundCloud data with `revalidateTag` — for example, after a track
 * is updated or a user profile changes.
 *
 * @example
 * ```ts
 * import { scCacheKeys } from "soundcloud-api-ts-next/server";
 * import { revalidateTag } from "next/cache";
 *
 * // Invalidate a single track after an update
 * revalidateTag(scCacheKeys.track(123).join(":"));
 *
 * // Or use the keys as the `tags` array for unstable_cache:
 * const cachedGetTrack = unstable_cache(
 *   (id: number) => sc.client.tracks.getTrack(id),
 *   scCacheKeys.track(123),   // keyParts
 *   { tags: scCacheKeys.track(123) },
 * );
 * ```
 */
export const scCacheKeys = {
  /**
   * Cache key parts for a single track.
   * @param id Track ID (number or string).
   * @returns `["sc", "track", "<id>"]`
   */
  track: (id: string | number): string[] => ["sc", "track", String(id)],

  /**
   * Cache key parts for a single user profile.
   * @param id User ID (number or string).
   * @returns `["sc", "user", "<id>"]`
   */
  user: (id: string | number): string[] => ["sc", "user", String(id)],

  /**
   * Cache key parts for a single playlist.
   * @param id Playlist ID (number or string).
   * @returns `["sc", "playlist", "<id>"]`
   */
  playlist: (id: string | number): string[] => ["sc", "playlist", String(id)],

  /**
   * Cache key parts for a track search query.
   * @param q Search query string.
   * @returns `["sc", "search", "tracks", "<q>"]`
   */
  searchTracks: (q: string): string[] => ["sc", "search", "tracks", q],

  /**
   * Cache key parts for the authenticated user's profile (`/me`).
   * @returns `["sc", "me"]`
   */
  me: (): string[] => ["sc", "me"],
} as const;
