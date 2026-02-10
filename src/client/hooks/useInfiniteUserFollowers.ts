"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudUser, InfiniteResult } from "../../types.js";

/**
 * Fetch a user's followers with infinite/paginated loading.
 *
 * @param userId - The user ID. Pass `null` to skip.
 * @returns An {@link InfiniteResult} of `SoundCloudUser` followers.
 *
 * @example
 * ```tsx
 * import { useInfiniteUserFollowers } from "soundcloud-api-ts-next";
 *
 * function AllFollowers({ userId }: { userId: number }) {
 *   const { data, loadMore, hasMore } = useInfiniteUserFollowers(userId);
 *   return <div>{data.map(u => <p key={u.id}>{u.username}</p>)}</div>;
 * }
 * ```
 *
 * @see {@link useUserFollowers} for single-page fetch
 * @see {@link useInfiniteUserFollowings} for who the user follows
 */
export function useInfiniteUserFollowers(
  userId: string | number | null,
): InfiniteResult<SoundCloudUser> {
  const url = useMemo(() => (userId ? `/users/${userId}/followers` : null), [userId]);
  return useInfinite<SoundCloudUser>(url, !!userId);
}
