"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { SoundCloudUser, HookResult } from "../../types.js";

/**
 * Fetch users that a SoundCloud user is following.
 *
 * @param userId - The user ID. Pass `undefined` to skip the request.
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
): HookResult<SoundCloudUser[]> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<SoundCloudUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (userId == null) {
      setData(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`${apiPrefix}/users/${userId}/followings`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setData(json.collection ?? json))
      .catch((err) => {
        if (err.name !== "AbortError") setError(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [userId, apiPrefix]);

  return { data, loading, error };
}
