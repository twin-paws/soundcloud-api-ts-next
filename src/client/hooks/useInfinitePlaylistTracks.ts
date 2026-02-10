"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudTrack, InfiniteResult } from "../../types.js";

/**
 * Fetch tracks in a playlist with infinite/paginated loading.
 *
 * @param playlistId - The playlist ID. Pass `null` to skip.
 * @returns An {@link InfiniteResult} of `SoundCloudTrack`.
 *
 * @example
 * ```tsx
 * import { useInfinitePlaylistTracks } from "soundcloud-api-ts-next";
 *
 * function AllPlaylistTracks({ id }: { id: number }) {
 *   const { data, loadMore, hasMore } = useInfinitePlaylistTracks(id);
 *   return <div>{data.map(t => <p key={t.id}>{t.title}</p>)}</div>;
 * }
 * ```
 *
 * @see {@link usePlaylistTracks} for single-page fetch
 * @see {@link usePlaylist} for playlist metadata
 */
export function useInfinitePlaylistTracks(
  playlistId: string | number | null,
): InfiniteResult<SoundCloudTrack> {
  const url = useMemo(() => (playlistId ? `/playlists/${playlistId}/tracks` : null), [playlistId]);
  return useInfinite<SoundCloudTrack>(url, !!playlistId);
}
