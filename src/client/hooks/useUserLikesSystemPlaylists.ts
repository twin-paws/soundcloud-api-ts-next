"use client";

import { useSoundCloudContext } from "../provider.js";
import { useSCFetch } from "./_useSCFetch.js";
import type { SCFetchOptions } from "./_useSCFetch.js";
import type { SoundCloudSystemPlaylist, HookResult } from "../../types.js";

const extractCollection = (json: unknown): SoundCloudSystemPlaylist[] => {
  const j = json as { collection?: SoundCloudSystemPlaylist[] };
  return j.collection ?? (json as SoundCloudSystemPlaylist[]);
};

/**
 * System playlists (stations) liked by a user
 * (`GET /users/{id}/likes/system-playlists`).
 *
 * @param userId - The user ID. Pass `undefined` to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 */
export function useUserLikesSystemPlaylists(
  userId: string | number | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudSystemPlaylist[]> {
  const { apiPrefix } = useSoundCloudContext();
  const url = userId != null ? `${apiPrefix}/users/${userId}/likes/system-playlists` : null;
  return useSCFetch<SoundCloudSystemPlaylist[]>(url, {
    ...options,
    transform: extractCollection,
  });
}
