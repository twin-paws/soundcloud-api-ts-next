"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudComment, InfiniteResult } from "../../types.js";

export function useInfiniteTrackComments(
  trackId: string | number | null,
): InfiniteResult<SoundCloudComment> {
  const url = useMemo(() => (trackId ? `/tracks/${trackId}/comments` : null), [trackId]);
  return useInfinite<SoundCloudComment>(url, !!trackId);
}
