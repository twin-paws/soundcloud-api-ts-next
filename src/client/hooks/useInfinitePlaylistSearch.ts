"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudPlaylist, InfiniteResult } from "../../types.js";

/**
 * Search SoundCloud playlists with infinite/paginated loading.
 *
 * @param query - The search query. Pass an empty string to skip.
 * @param options - Optional settings. `limit` controls results per page.
 * @returns An {@link InfiniteResult} of `SoundCloudPlaylist` with `loadMore` and `hasMore`.
 *
 * @example
 * ```tsx
 * import { useInfinitePlaylistSearch } from "soundcloud-api-ts-next";
 *
 * function PlaylistSearch({ q }: { q: string }) {
 *   const { data: playlists, loadMore, hasMore } = useInfinitePlaylistSearch(q);
 *   return (
 *     <div>
 *       {playlists.map(p => <p key={p.id}>{p.title}</p>)}
 *       {hasMore && <button onClick={loadMore}>More</button>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @see {@link usePlaylistSearch} for single-page search
 * @see {@link useInfinite} for the base infinite hook
 */
export function useInfinitePlaylistSearch(
  query: string,
  options?: { limit?: number },
): InfiniteResult<SoundCloudPlaylist> {
  const url = useMemo(() => {
    if (!query) return null;
    const params = new URLSearchParams({ q: query });
    if (options?.limit) params.set("limit", String(options.limit));
    return `/search/playlists?${params}`;
  }, [query, options?.limit]);

  return useInfinite<SoundCloudPlaylist>(url, !!query);
}
