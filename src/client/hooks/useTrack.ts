"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { SoundCloudTrack, HookResult } from "../../types.js";

/**
 * Fetch a single SoundCloud track by ID.
 *
 * @param trackId - The SoundCloud track ID. Pass `undefined` to skip the request.
 * @returns Hook result with `data` as a `SoundCloudTrack`, plus `loading` and `error` states.
 *
 * @example
 * ```tsx
 * import { useTrack } from "soundcloud-api-ts-next";
 *
 * function TrackInfo({ id }: { id: number }) {
 *   const { data: track, loading, error } = useTrack(id);
 *   if (loading) return <p>Loading...</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 *   return <h1>{track?.title}</h1>;
 * }
 * ```
 *
 * @see {@link useTrackSearch} for searching tracks
 * @see {@link useRelatedTracks} for discovery
 * @see {@link usePlayer} for playing a track
 */
export function useTrack(
  trackId: string | number | undefined,
): HookResult<SoundCloudTrack> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<SoundCloudTrack | null>(null);
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

    fetch(`${apiPrefix}/tracks/${trackId}`, { signal: controller.signal })
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
  }, [trackId, apiPrefix]);

  return { data, loading, error };
}
