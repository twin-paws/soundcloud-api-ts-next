"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudPlaylist, InfiniteResult } from "../../types.js";

export function useInfiniteUserPlaylists(
  userId: string | number | null,
): InfiniteResult<SoundCloudPlaylist> {
  const url = useMemo(() => (userId ? `/users/${userId}/playlists` : null), [userId]);
  return useInfinite<SoundCloudPlaylist>(url, !!userId);
}
