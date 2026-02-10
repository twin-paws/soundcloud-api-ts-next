"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { SoundCloudTrack, HookResult } from "../../types.js";

/**
 * Fetch tracks belonging to a SoundCloud playlist.
 *
 * @param playlistId - The playlist ID. Pass `undefined` to skip the request.
 * @returns Hook result with `data` as an array of `SoundCloudTrack`.
 *
 * @example
 * ```tsx
 * import { usePlaylistTracks } from "soundcloud-api-ts-next";
 *
 * function PlaylistTracks({ id }: { id: number }) {
 *   const { data: tracks, loading } = usePlaylistTracks(id);
 *   if (loading) return <p>Loading tracks...</p>;
 *   return <ul>{tracks?.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useInfinitePlaylistTracks} for paginated results
 * @see {@link usePlaylist} for playlist metadata
 */
export function usePlaylistTracks(
  playlistId: string | number | undefined,
): HookResult<SoundCloudTrack[]> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<SoundCloudTrack[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (playlistId == null) {
      setData(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    fetch(`${apiPrefix}/playlists/${playlistId}/tracks`, { signal: controller.signal })
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
  }, [playlistId, apiPrefix]);

  return { data, loading, error };
}
