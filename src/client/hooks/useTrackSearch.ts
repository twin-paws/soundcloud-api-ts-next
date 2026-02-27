"use client";

import { useSoundCloudContext } from "../provider.js";
import { useSCFetch } from "./_useSCFetch.js";
import type { SCFetchOptions } from "./_useSCFetch.js";
import type { SoundCloudTrack, HookResult } from "../../types.js";

/**
 * Options for {@link useTrackSearch}.
 */
export interface UseTrackSearchOptions extends SCFetchOptions {
  /** Maximum number of results to return. */
  limit?: number;
}

const extractCollection = (json: unknown): SoundCloudTrack[] => {
  const j = json as { collection?: SoundCloudTrack[] };
  return j.collection ?? (json as SoundCloudTrack[]);
};

/**
 * Search SoundCloud tracks by query string.
 *
 * @param query - The search query. Pass an empty string to skip the request.
 * @param options - Optional search options (e.g. `limit`, `enabled`, `refreshInterval`, `retry`).
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
  const params = new URLSearchParams({ q: query });
  if (options?.limit) params.set("limit", String(options.limit));
  const url = query ? `${apiPrefix}/search/tracks?${params}` : null;
  return useSCFetch<SoundCloudTrack[]>(url, {
    ...options,
    transform: extractCollection,
  });
}
