"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudUser, HookResult } from "../../types.js";

/**
 * Fetch the current authenticated user's followers.
 *
 * @returns Hook result with `data` as an array of `SoundCloudUser` followers.
 *
 * @example
 * ```tsx
 * import { useMeFollowers } from "soundcloud-api-ts-next";
 *
 * function MyFollowers() {
 *   const { data: followers, loading } = useMeFollowers();
 *   if (loading) return <p>Loading...</p>;
 *   return <p>{followers?.length} followers</p>;
 * }
 * ```
 *
 * @see {@link useMeFollowings} for who the current user follows
 * @see {@link useFollow} for follow/unfollow actions
 */
export function useMeFollowers(): HookResult<SoundCloudUser[]> {
  return useAuthFetch<SoundCloudUser[]>("/me/followers");
}
