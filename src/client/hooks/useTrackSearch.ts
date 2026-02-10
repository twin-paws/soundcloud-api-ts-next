"use client";

import { useState, useEffect } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { SoundCloudTrack, HookResult } from "../../types.js";

/**
 * Options for {@link useTrackSearch}.
 */
export interface UseTrackSearchOptions {
  /** Maximum number of results to return. */
  limit?: number;
}

/**
 * Search SoundCloud tracks by query string.
 *
 * @param query - The search query. Pass an empty string to skip the request.
 * @param options - Optional search options (e.g. `limit`).
 * @returns Hook result with `data` as an array of `SoundCloudTrack`.
 *
 * @example
 * ```tsx
 * import { useTrackSearch } from "soundcloud-api-ts-next";
 *
 * function SearchResults({ q }: { q: string }) {
 *   const { data: tracks, loading } = useTrackSearch(q, { limit: 10 });
 *   if (loading) return <p>Searching...</p>;
 *   return <ul>{tracks?.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useInfiniteTrackSearch} for paginated search
 * @see {@link useTrack} for fetching a single track
 */
export function useTrackSearch(
  query: string,
  options?: UseTrackSearchOptions,
): HookResult<SoundCloudTrack[]> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<SoundCloudTrack[] | null>(null);
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
    if (options?.limit) params.set("limit", String(options.limit));

    fetch(`${apiPrefix}/search/tracks?${params}`, {
      signal: controller.signal,
    })
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
  }, [query, options?.limit, apiPrefix]);

  return { data, loading, error };
}
