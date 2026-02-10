"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudTrack, InfiniteResult } from "../../types.js";

export function useInfinitePlaylistTracks(
  playlistId: string | number | null,
): InfiniteResult<SoundCloudTrack> {
  const url = useMemo(() => (playlistId ? `/playlists/${playlistId}/tracks` : null), [playlistId]);
  return useInfinite<SoundCloudTrack>(url, !!playlistId);
}
