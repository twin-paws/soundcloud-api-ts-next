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
 * Fetch playlists created by a SoundCloud user.
 *
 * @param userId - The user ID. Pass `undefined` to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 * @returns Hook result with `data` as an array of `SoundCloudPlaylist`.
 *
 * @example
 * ```tsx
 * import { useUserPlaylists } from "soundcloud-api-ts-next";
 *
 * function Playlists({ userId }: { userId: number }) {
 *   const { data: playlists, loading } = useUserPlaylists(userId);
 *   if (loading) return <p>Loading...</p>;
 *   return <ul>{playlists?.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useInfiniteUserPlaylists} for paginated results
 * @see {@link useUser} for the user profile
 */
export function useUserPlaylists(
  userId: string | number | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudPlaylist[]> {
  const { apiPrefix } = useSoundCloudContext();
  const url = userId != null ? `${apiPrefix}/users/${userId}/playlists` : null;
  return useSCFetch<SoundCloudPlaylist[]>(url, {
    ...options,
    transform: extractCollection,
  });
}
