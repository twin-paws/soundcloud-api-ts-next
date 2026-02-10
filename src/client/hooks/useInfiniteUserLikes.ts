"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudTrack, InfiniteResult } from "../../types.js";

/**
 * Fetch a user's liked tracks with infinite/paginated loading.
 *
 * @param userId - The user ID. Pass `null` to skip.
 * @returns An {@link InfiniteResult} of liked `SoundCloudTrack`.
 *
 * @example
 * ```tsx
 * import { useInfiniteUserLikes } from "soundcloud-api-ts-next";
 *
 * function AllLikes({ userId }: { userId: number }) {
 *   const { data, loadMore, hasMore } = useInfiniteUserLikes(userId);
 *   return <div>{data.map(t => <p key={t.id}>{t.title}</p>)}</div>;
 * }
 * ```
 *
 * @see {@link useUserLikes} for single-page fetch
 */
export function useInfiniteUserLikes(
  userId: string | number | null,
): InfiniteResult<SoundCloudTrack> {
  const url = useMemo(() => (userId ? `/users/${userId}/likes/tracks` : null), [userId]);
  return useInfinite<SoundCloudTrack>(url, !!userId);
}
