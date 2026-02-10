"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudUser, InfiniteResult } from "../../types.js";

export function useInfiniteUserFollowers(
  userId: string | number | null,
): InfiniteResult<SoundCloudUser> {
  const url = useMemo(() => (userId ? `/users/${userId}/followers` : null), [userId]);
  return useInfinite<SoundCloudUser>(url, !!userId);
}
