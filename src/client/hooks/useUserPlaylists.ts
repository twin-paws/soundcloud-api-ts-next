"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { SoundCloudPlaylist, HookResult } from "../../types.js";

/**
 * Fetch playlists created by a SoundCloud user.
 *
 * @param userId - The user ID. Pass `undefined` to skip the request.
 * @returns Hook result with `data` as an array of `SoundCloudPlaylist`.
 *
 * @example
 * ```tsx
 * import { useUserPlaylists } from "soundcloud-api-ts-next";
 *
 * function Playlists({ userId }: { userId: number }) {
 *   const { data: playlists, loading } = useUserPlaylists(userId);
 *   if (loading) return <p>Loading...</p>;
 *   return <ul>{playlists?.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useInfiniteUserPlaylists} for paginated results
 * @see {@link useUser} for the user profile
 */
export function useUserPlaylists(
  userId: string | number | undefined,
): HookResult<SoundCloudPlaylist[]> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<SoundCloudPlaylist[] | null>(null);
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

    fetch(`${apiPrefix}/users/${userId}/playlists`, { signal: controller.signal })
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
