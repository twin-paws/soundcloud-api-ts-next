"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudUser, HookResult } from "../../types.js";

/**
 * Fetch users that the current authenticated user follows.
 *
 * @returns Hook result with `data` as an array of followed `SoundCloudUser`.
 *
 * @example
 * ```tsx
 * import { useMeFollowings } from "soundcloud-api-ts-next";
 *
 * function MyFollowings() {
 *   const { data: followings, loading } = useMeFollowings();
 *   if (loading) return <p>Loading...</p>;
 *   return <p>Following {followings?.length} users</p>;
 * }
 * ```
 *
 * @see {@link useMeFollowers} for the current user's followers
 * @see {@link useFollow} for follow/unfollow actions
 */
export function useMeFollowings(): HookResult<SoundCloudUser[]> {
  return useAuthFetch<SoundCloudUser[]>("/me/followings");
}
