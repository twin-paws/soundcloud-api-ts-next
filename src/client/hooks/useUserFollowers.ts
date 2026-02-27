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
 * Fetch followers of a SoundCloud user.
 *
 * @param userId - The user ID. Pass `undefined` to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 * @returns Hook result with `data` as an array of `SoundCloudUser` followers.
 *
 * @example
 * ```tsx
 * import { useUserFollowers } from "soundcloud-api-ts-next";
 *
 * function Followers({ userId }: { userId: number }) {
 *   const { data: followers, loading } = useUserFollowers(userId);
 *   if (loading) return <p>Loading...</p>;
 *   return <p>{followers?.length} followers</p>;
 * }
 * ```
 *
 * @see {@link useInfiniteUserFollowers} for paginated results
 * @see {@link useUserFollowings} for who the user follows
 * @see {@link useFollow} for follow/unfollow actions
 */
export function useUserFollowers(
  userId: string | number | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudUser[]> {
  const { apiPrefix } = useSoundCloudContext();
  const url =
    userId != null ? `${apiPrefix}/users/${userId}/followers` : null;
  return useSCFetch<SoundCloudUser[]>(url, {
    ...options,
    transform: extractCollection,
  });
}
