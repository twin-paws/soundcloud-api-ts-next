"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { SoundCloudComment, HookResult } from "../../types.js";

/**
 * Fetch comments on a SoundCloud track.
 *
 * @param trackId - The track ID. Pass `undefined` to skip the request.
 * @returns Hook result with `data` as an array of `SoundCloudComment`.
 *
 * @example
 * ```tsx
 * import { useTrackComments } from "soundcloud-api-ts-next";
 *
 * function Comments({ trackId }: { trackId: number }) {
 *   const { data: comments, loading } = useTrackComments(trackId);
 *   if (loading) return <p>Loading comments...</p>;
 *   return <ul>{comments?.map(c => <li key={c.id}>{c.body}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useInfiniteTrackComments} for paginated comments
 * @see {@link useTrack} for the track itself
 */
export function useTrackComments(
  trackId: string | number | undefined,
): HookResult<SoundCloudComment[]> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<SoundCloudComment[] | null>(null);
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

    fetch(`${apiPrefix}/tracks/${trackId}/comments`, { signal: controller.signal })
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
