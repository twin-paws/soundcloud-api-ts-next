"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudPlaylist, InfiniteResult } from "../../types.js";

export function useInfinitePlaylistSearch(
  query: string,
  options?: { limit?: number },
): InfiniteResult<SoundCloudPlaylist> {
  const url = useMemo(() => {
    if (!query) return null;
    const params = new URLSearchParams({ q: query });
    if (options?.limit) params.set("limit", String(options.limit));
    return `/search/playlists?${params}`;
  }, [query, options?.limit]);

  return useInfinite<SoundCloudPlaylist>(url, !!query);
}
