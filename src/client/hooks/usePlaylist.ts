"use client";

import { useSoundCloudContext } from "../provider.js";
import { useSCFetch } from "./_useSCFetch.js";
import type { SCFetchOptions } from "./_useSCFetch.js";
import type { SoundCloudPlaylist, HookResult } from "../../types.js";

/**
 * Fetch a single SoundCloud playlist by ID.
 *
 * @param playlistId - The playlist ID. Pass `undefined` to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 * @returns Hook result with `data` as a `SoundCloudPlaylist`.
 *
 * @example
 * ```tsx
 * import { usePlaylist } from "soundcloud-api-ts-next";
 *
 * function PlaylistInfo({ id }: { id: number }) {
 *   const { data: playlist, loading } = usePlaylist(id);
 *   if (loading) return <p>Loading...</p>;
 *   return <h1>{playlist?.title}</h1>;
 * }
 * ```
 *
 * @see {@link usePlaylistTracks} for the tracks in a playlist
 * @see {@link usePlaylistSearch} for searching playlists
 */
export function usePlaylist(
  playlistId: string | number | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudPlaylist> {
  const { apiPrefix } = useSoundCloudContext();
  const url = playlistId != null ? `${apiPrefix}/playlists/${playlistId}` : null;
  return useSCFetch<SoundCloudPlaylist>(url, options);
}
