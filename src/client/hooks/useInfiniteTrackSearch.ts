"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudTrack } from "../../types.js";
import type { InfiniteResult } from "../../types.js";

/**
 * Search SoundCloud tracks with infinite/paginated loading.
 *
 * @param query - The search query. Pass an empty string to skip.
 * @param options - Optional settings. `limit` controls results per page.
 * @returns An {@link InfiniteResult} of `SoundCloudTrack` with `loadMore` and `hasMore`.
 *
 * @example
 * ```tsx
 * import { useInfiniteTrackSearch } from "soundcloud-api-ts-next";
 *
 * function Search({ q }: { q: string }) {
 *   const { data: tracks, loadMore, hasMore, loading } = useInfiniteTrackSearch(q);
 *   return (
 *     <div>
 *       {tracks.map(t => <p key={t.id}>{t.title}</p>)}
 *       {hasMore && <button onClick={loadMore} disabled={loading}>Load more</button>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @see {@link useTrackSearch} for single-page search
 * @see {@link useInfinite} for the base infinite hook
 */
export function useInfiniteTrackSearch(
  query: string,
  options?: { limit?: number },
): InfiniteResult<SoundCloudTrack> {
  const url = useMemo(() => {
    if (!query) return null;
    const params = new URLSearchParams({ q: query });
    if (options?.limit) params.set("limit", String(options.limit));
    return `/search/tracks?${params}`;
  }, [query, options?.limit]);

  return useInfinite<SoundCloudTrack>(url, !!query);
}
