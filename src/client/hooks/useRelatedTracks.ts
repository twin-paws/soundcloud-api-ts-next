"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { SoundCloudTrack, HookResult } from "../../types.js";

/**
 * Fetch tracks related to a given SoundCloud track (recommendations).
 *
 * @param trackId - The track ID to find related tracks for. Pass `undefined` to skip.
 * @returns Hook result with `data` as an array of related `SoundCloudTrack`.
 *
 * @example
 * ```tsx
 * import { useRelatedTracks } from "soundcloud-api-ts-next";
 *
 * function Related({ trackId }: { trackId: number }) {
 *   const { data: tracks } = useRelatedTracks(trackId);
 *   return <ul>{tracks?.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useTrack} for fetching the source track
 * @see {@link useTrackSearch} for search-based discovery
 */
export function useRelatedTracks(
  trackId: string | number | undefined,
): HookResult<SoundCloudTrack[]> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<SoundCloudTrack[] | null>(null);
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

    fetch(`${apiPrefix}/tracks/${trackId}/related`, { signal: controller.signal })
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
