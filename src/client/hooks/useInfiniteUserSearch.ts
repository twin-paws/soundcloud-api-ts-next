"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudUser, InfiniteResult } from "../../types.js";

export function useInfiniteUserSearch(
  query: string,
  options?: { limit?: number },
): InfiniteResult<SoundCloudUser> {
  const url = useMemo(() => {
    if (!query) return null;
    const params = new URLSearchParams({ q: query });
    if (options?.limit) params.set("limit", String(options.limit));
    return `/search/users?${params}`;
  }, [query, options?.limit]);

  return useInfinite<SoundCloudUser>(url, !!query);
}
