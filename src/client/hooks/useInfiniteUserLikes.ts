"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudTrack, InfiniteResult } from "../../types.js";

export function useInfiniteUserLikes(
  userId: string | number | null,
): InfiniteResult<SoundCloudTrack> {
  const url = useMemo(() => (userId ? `/users/${userId}/likes/tracks` : null), [userId]);
  return useInfinite<SoundCloudTrack>(url, !!userId);
}
