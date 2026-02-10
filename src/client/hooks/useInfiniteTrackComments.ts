"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudComment, InfiniteResult } from "../../types.js";

/**
 * Fetch comments on a track with infinite/paginated loading.
 *
 * @param trackId - The track ID. Pass `null` to skip.
 * @returns An {@link InfiniteResult} of `SoundCloudComment`.
 *
 * @example
 * ```tsx
 * import { useInfiniteTrackComments } from "soundcloud-api-ts-next";
 *
 * function AllComments({ trackId }: { trackId: number }) {
 *   const { data, loadMore, hasMore } = useInfiniteTrackComments(trackId);
 *   return <div>{data.map(c => <p key={c.id}>{c.body}</p>)}</div>;
 * }
 * ```
 *
 * @see {@link useTrackComments} for single-page fetch
 */
export function useInfiniteTrackComments(
  trackId: string | number | null,
): InfiniteResult<SoundCloudComment> {
  const url = useMemo(() => (trackId ? `/tracks/${trackId}/comments` : null), [trackId]);
  return useInfinite<SoundCloudComment>(url, !!trackId);
}
