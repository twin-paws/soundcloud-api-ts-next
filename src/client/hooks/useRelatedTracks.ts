"use client";

import { useSoundCloudContext } from "../provider.js";
import { useSCFetch } from "./_useSCFetch.js";
import type { SCFetchOptions } from "./_useSCFetch.js";
import type { SoundCloudTrack, HookResult } from "../../types.js";

const extractCollection = (json: unknown): SoundCloudTrack[] => {
  const j = json as { collection?: SoundCloudTrack[] };
  return j.collection ?? (json as SoundCloudTrack[]);
};

/**
 * Fetch tracks related to a given SoundCloud track (recommendations).
 *
 * @param trackId - The track ID to find related tracks for. Pass `undefined` to skip.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 * @returns Hook result with `data` as an array of related `SoundCloudTrack`.
 *
 * @example
 * ```tsx
 * import { useRelatedTracks } from "soundcloud-api-ts-next";
 *
 * function Related({ trackId }: { trackId: number }) {
 *   const { data: tracks } = useRelatedTracks(trackId);
 *   return <ul>{tracks?.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useTrack} for fetching the source track
 * @see {@link useTrackSearch} for search-based discovery
 */
export function useRelatedTracks(
  trackId: string | number | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudTrack[]> {
  const { apiPrefix } = useSoundCloudContext();
  const url =
    trackId != null ? `${apiPrefix}/tracks/${trackId}/related` : null;
  return useSCFetch<SoundCloudTrack[]>(url, {
    ...options,
    transform: extractCollection,
  });
}
