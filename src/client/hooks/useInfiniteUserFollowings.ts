"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudUser, InfiniteResult } from "../../types.js";

/**
 * Fetch users that a user follows with infinite/paginated loading.
 *
 * @param userId - The user ID. Pass `null` to skip.
 * @returns An {@link InfiniteResult} of followed `SoundCloudUser`.
 *
 * @example
 * ```tsx
 * import { useInfiniteUserFollowings } from "soundcloud-api-ts-next";
 *
 * function AllFollowings({ userId }: { userId: number }) {
 *   const { data, loadMore, hasMore } = useInfiniteUserFollowings(userId);
 *   return <div>{data.map(u => <p key={u.id}>{u.username}</p>)}</div>;
 * }
 * ```
 *
 * @see {@link useUserFollowings} for single-page fetch
 * @see {@link useInfiniteUserFollowers} for the user's followers
 */
export function useInfiniteUserFollowings(
  userId: string | number | null,
): InfiniteResult<SoundCloudUser> {
  const url = useMemo(() => (userId ? `/users/${userId}/followings` : null), [userId]);
  return useInfinite<SoundCloudUser>(url, !!userId);
}
