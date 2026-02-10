"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { SoundCloudUser, HookResult } from "../../types.js";

/**
 * Fetch users who liked a SoundCloud track.
 *
 * @param trackId - The track ID. Pass `undefined` to skip the request.
 * @returns Hook result with `data` as an array of `SoundCloudUser` who liked the track.
 *
 * @example
 * ```tsx
 * import { useTrackLikes } from "soundcloud-api-ts-next";
 *
 * function Likers({ trackId }: { trackId: number }) {
 *   const { data: users, loading } = useTrackLikes(trackId);
 *   if (loading) return <p>Loading...</p>;
 *   return <ul>{users?.map(u => <li key={u.id}>{u.username}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useTrack} for the track itself
 * @see {@link useLike} for liking/unliking a track
 */
export function useTrackLikes(
  trackId: string | number | undefined,
): HookResult<SoundCloudUser[]> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<SoundCloudUser[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (trackId == null) {
      setData(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`${apiPrefix}/tracks/${trackId}/likes`, { signal: controller.signal })
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
  }, [trackId, apiPrefix]);

  return { data, loading, error };
}
