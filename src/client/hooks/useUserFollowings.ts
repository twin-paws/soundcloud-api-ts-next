"use client";

import { useSoundCloudContext } from "../provider.js";
import { useSCFetch } from "./_useSCFetch.js";
import type { SCFetchOptions } from "./_useSCFetch.js";
import type { SoundCloudUser, HookResult } from "../../types.js";

const extractCollection = (json: unknown): SoundCloudUser[] => {
  const j = json as { collection?: SoundCloudUser[] };
  return j.collection ?? (json as SoundCloudUser[]);
};

/**
 * Fetch users that a SoundCloud user is following.
 *
 * @param userId - The user ID. Pass `undefined` to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 * @returns Hook result with `data` as an array of followed `SoundCloudUser`.
 *
 * @example
 * ```tsx
 * import { useUserFollowings } from "soundcloud-api-ts-next";
 *
 * function Following({ userId }: { userId: number }) {
 *   const { data: followings, loading } = useUserFollowings(userId);
 *   if (loading) return <p>Loading...</p>;
 *   return <p>Following {followings?.length} users</p>;
 * }
 * ```
 *
 * @see {@link useInfiniteUserFollowings} for paginated results
 * @see {@link useUserFollowers} for the user's followers
 * @see {@link useFollow} for follow/unfollow actions
 */
export function useUserFollowings(
  userId: string | number | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudUser[]> {
  const { apiPrefix } = useSoundCloudContext();
  const url =
    userId != null ? `${apiPrefix}/users/${userId}/followings` : null;
  return useSCFetch<SoundCloudUser[]>(url, {
    ...options,
    transform: extractCollection,
  });
}
