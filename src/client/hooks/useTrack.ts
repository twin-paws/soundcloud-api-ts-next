"use client";

import { useSoundCloudContext } from "../provider.js";
import { useSCFetch } from "./_useSCFetch.js";
import type { SCFetchOptions } from "./_useSCFetch.js";
import type { SoundCloudTrack, HookResult } from "../../types.js";

/**
 * Fetch a single SoundCloud track by ID.
 *
 * @param trackId - The SoundCloud track ID. Pass `undefined` to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 * @returns Hook result with `data` as a `SoundCloudTrack`, plus `loading` and `error` states.
 *
 * @example
 * ```tsx
 * import { useTrack } from "soundcloud-api-ts-next";
 *
 * function TrackInfo({ id }: { id: number }) {
 *   const { data: track, loading, error } = useTrack(id);
 *   if (loading) return <p>Loading...</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 *   return <h1>{track?.title}</h1>;
 * }
 * ```
 *
 * @see {@link useTrackSearch} for searching tracks
 * @see {@link useRelatedTracks} for discovery
 * @see {@link usePlayer} for playing a track
 */
export function useTrack(
  trackId: string | number | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudTrack> {
  const { apiPrefix } = useSoundCloudContext();
  const url = trackId != null ? `${apiPrefix}/tracks/${trackId}` : null;
  return useSCFetch<SoundCloudTrack>(url, options);
}
