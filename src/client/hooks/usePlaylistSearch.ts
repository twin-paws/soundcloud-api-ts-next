"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { SoundCloudPlaylist, HookResult } from "../../types.js";

/**
 * Search SoundCloud playlists by query string.
 *
 * @param query - The search query. Pass an empty string to skip the request.
 * @returns Hook result with `data` as an array of `SoundCloudPlaylist`.
 *
 * @example
 * ```tsx
 * import { usePlaylistSearch } from "soundcloud-api-ts-next";
 *
 * function PlaylistResults({ q }: { q: string }) {
 *   const { data: playlists, loading } = usePlaylistSearch(q);
 *   if (loading) return <p>Searching...</p>;
 *   return <ul>{playlists?.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useInfinitePlaylistSearch} for paginated search
 * @see {@link usePlaylist} for fetching a single playlist
 */
export function usePlaylistSearch(
  query: string,
): HookResult<SoundCloudPlaylist[]> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<SoundCloudPlaylist[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!query) {
      setData(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({ q: query });

    fetch(`${apiPrefix}/search/playlists?${params}`, { signal: controller.signal })
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
  }, [query, apiPrefix]);

  return { data, loading, error };
}
