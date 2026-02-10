"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { SoundCloudUser, HookResult } from "../../types.js";

/**
 * Fetch followers of a SoundCloud user.
 *
 * @param userId - The user ID. Pass `undefined` to skip the request.
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

    fetch(`${apiPrefix}/users/${userId}/followers`, { signal: controller.signal })
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
