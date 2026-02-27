"use client";

import { useSoundCloudContext } from "../provider.js";
import { useSCFetch } from "./_useSCFetch.js";
import type { SCFetchOptions } from "./_useSCFetch.js";
import type { SoundCloudComment, HookResult } from "../../types.js";

const extractCollection = (json: unknown): SoundCloudComment[] => {
  const j = json as { collection?: SoundCloudComment[] };
  return j.collection ?? (json as SoundCloudComment[]);
};

/**
 * Fetch comments on a SoundCloud track.
 *
 * @param trackId - The track ID. Pass `undefined` to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 * @returns Hook result with `data` as an array of `SoundCloudComment`.
 *
 * @example
 * ```tsx
 * import { useTrackComments } from "soundcloud-api-ts-next";
 *
 * function Comments({ trackId }: { trackId: number }) {
 *   const { data: comments, loading } = useTrackComments(trackId);
 *   if (loading) return <p>Loading comments...</p>;
 *   return <ul>{comments?.map(c => <li key={c.id}>{c.body}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useInfiniteTrackComments} for paginated comments
 * @see {@link useTrack} for the track itself
 */
export function useTrackComments(
  trackId: string | number | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudComment[]> {
  const { apiPrefix } = useSoundCloudContext();
  const url =
    trackId != null ? `${apiPrefix}/tracks/${trackId}/comments` : null;
  return useSCFetch<SoundCloudComment[]>(url, {
    ...options,
    transform: extractCollection,
  });
}
