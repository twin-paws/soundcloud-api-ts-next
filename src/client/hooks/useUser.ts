"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { SoundCloudUser, HookResult } from "../../types.js";

/**
 * Fetch a single SoundCloud user profile by ID.
 *
 * @param userId - The SoundCloud user ID. Pass `undefined` to skip the request.
 * @returns Hook result with `data` as a `SoundCloudUser`, plus `loading` and `error` states.
 *
 * @example
 * ```tsx
 * import { useUser } from "soundcloud-api-ts-next";
 *
 * function UserProfile({ id }: { id: number }) {
 *   const { data: user, loading } = useUser(id);
 *   if (loading) return <p>Loading...</p>;
 *   return <h1>{user?.username}</h1>;
 * }
 * ```
 *
 * @see {@link useUserSearch} for searching users
 * @see {@link useUserTracks} for a user's tracks
 * @see {@link useFollow} for following a user
 */
export function useUser(
  userId: string | number | undefined,
): HookResult<SoundCloudUser> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<SoundCloudUser | null>(null);
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

    fetch(`${apiPrefix}/users/${userId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setData)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [userId, apiPrefix]);

  return { data, loading, error };
}
