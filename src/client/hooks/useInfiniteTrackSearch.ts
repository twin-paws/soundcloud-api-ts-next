"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudTrack } from "../../types.js";
import type { InfiniteResult } from "../../types.js";

export function useInfiniteTrackSearch(
  query: string,
  options?: { limit?: number },
): InfiniteResult<SoundCloudTrack> {
  const url = useMemo(() => {
    if (!query) return null;
    const params = new URLSearchParams({ q: query });
    if (options?.limit) params.set("limit", String(options.limit));
    return `/search/tracks?${params}`;
  }, [query, options?.limit]);

  return useInfinite<SoundCloudTrack>(url, !!query);
}
