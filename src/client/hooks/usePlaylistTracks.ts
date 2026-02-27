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
 * Fetch tracks belonging to a SoundCloud playlist.
 *
 * @param playlistId - The playlist ID. Pass `undefined` to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 * @returns Hook result with `data` as an array of `SoundCloudTrack`.
 *
 * @example
 * ```tsx
 * import { usePlaylistTracks } from "soundcloud-api-ts-next";
 *
 * function PlaylistTracks({ id }: { id: number }) {
 *   const { data: tracks, loading } = usePlaylistTracks(id);
 *   if (loading) return <p>Loading tracks...</p>;
 *   return <ul>{tracks?.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useInfinitePlaylistTracks} for paginated results
 * @see {@link usePlaylist} for playlist metadata
 */
export function usePlaylistTracks(
  playlistId: string | number | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudTrack[]> {
  const { apiPrefix } = useSoundCloudContext();
  const url =
    playlistId != null ? `${apiPrefix}/playlists/${playlistId}/tracks` : null;
  return useSCFetch<SoundCloudTrack[]>(url, {
    ...options,
    transform: extractCollection,
  });
}
