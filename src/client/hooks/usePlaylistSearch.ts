"use client";

import { useSoundCloudContext } from "../provider.js";
import { useSCFetch } from "./_useSCFetch.js";
import type { SCFetchOptions } from "./_useSCFetch.js";
import type { SoundCloudPlaylist, HookResult } from "../../types.js";

const extractCollection = (json: unknown): SoundCloudPlaylist[] => {
  const j = json as { collection?: SoundCloudPlaylist[] };
  return j.collection ?? (json as SoundCloudPlaylist[]);
};

/**
 * Search SoundCloud playlists by query string.
 *
 * @param query - The search query. Pass an empty string to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
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
  options?: SCFetchOptions,
): HookResult<SoundCloudPlaylist[]> {
  const { apiPrefix } = useSoundCloudContext();
  const params = new URLSearchParams({ q: query });
  const url = query ? `${apiPrefix}/search/playlists?${params}` : null;
  return useSCFetch<SoundCloudPlaylist[]>(url, {
    ...options,
    transform: extractCollection,
  });
}
