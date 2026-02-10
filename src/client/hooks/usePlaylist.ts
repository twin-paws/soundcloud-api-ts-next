"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { SoundCloudPlaylist, HookResult } from "../../types.js";

/**
 * Fetch a single SoundCloud playlist by ID.
 *
 * @param playlistId - The playlist ID. Pass `undefined` to skip the request.
 * @returns Hook result with `data` as a `SoundCloudPlaylist`.
 *
 * @example
 * ```tsx
 * import { usePlaylist } from "soundcloud-api-ts-next";
 *
 * function PlaylistInfo({ id }: { id: number }) {
 *   const { data: playlist, loading } = usePlaylist(id);
 *   if (loading) return <p>Loading...</p>;
 *   return <h1>{playlist?.title}</h1>;
 * }
 * ```
 *
 * @see {@link usePlaylistTracks} for the tracks in a playlist
 * @see {@link usePlaylistSearch} for searching playlists
 */
export function usePlaylist(
  playlistId: string | number | undefined,
): HookResult<SoundCloudPlaylist> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<SoundCloudPlaylist | null>(null);
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

    fetch(`${apiPrefix}/playlists/${playlistId}`, { signal: controller.signal })
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
  }, [playlistId, apiPrefix]);

  return { data, loading, error };
}
