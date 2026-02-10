"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { SoundCloudTrack, HookResult } from "../../types.js";

/**
 * Fetch tracks liked by a SoundCloud user.
 *
 * @param userId - The user ID. Pass `undefined` to skip the request.
 * @returns Hook result with `data` as an array of liked `SoundCloudTrack`.
 *
 * @example
 * ```tsx
 * import { useUserLikes } from "soundcloud-api-ts-next";
 *
 * function LikedTracks({ userId }: { userId: number }) {
 *   const { data: tracks, loading } = useUserLikes(userId);
 *   if (loading) return <p>Loading...</p>;
 *   return <ul>{tracks?.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useInfiniteUserLikes} for paginated results
 * @see {@link useUser} for the user profile
 */
export function useUserLikes(
  userId: string | number | undefined,
): HookResult<SoundCloudTrack[]> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<SoundCloudTrack[] | null>(null);
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

    fetch(`${apiPrefix}/users/${userId}/likes/tracks`, { signal: controller.signal })
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
