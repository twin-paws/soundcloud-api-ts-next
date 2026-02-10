"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudTrack, InfiniteResult } from "../../types.js";

/**
 * Fetch a user's tracks with infinite/paginated loading.
 *
 * @param userId - The user ID. Pass `null` to skip.
 * @returns An {@link InfiniteResult} of `SoundCloudTrack`.
 *
 * @example
 * ```tsx
 * import { useInfiniteUserTracks } from "soundcloud-api-ts-next";
 *
 * function AllTracks({ userId }: { userId: number }) {
 *   const { data, loadMore, hasMore } = useInfiniteUserTracks(userId);
 *   return <div>{data.map(t => <p key={t.id}>{t.title}</p>)}</div>;
 * }
 * ```
 *
 * @see {@link useUserTracks} for single-page fetch
 */
export function useInfiniteUserTracks(
  userId: string | number | null,
): InfiniteResult<SoundCloudTrack> {
  const url = useMemo(() => (userId ? `/users/${userId}/tracks` : null), [userId]);
  return useInfinite<SoundCloudTrack>(url, !!userId);
}
