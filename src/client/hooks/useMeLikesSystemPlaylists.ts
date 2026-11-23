"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudSystemPlaylist, HookResult } from "../../types.js";

const extractCollection = (json: unknown): SoundCloudSystemPlaylist[] => {
  const j = json as { collection?: SoundCloudSystemPlaylist[] };
  return j.collection ?? (json as SoundCloudSystemPlaylist[]);
};

/**
 * System playlists (stations) liked by the authenticated user
 * (`GET /me/likes/system-playlists`). Only fetches when authenticated.
 */
export function useMeLikesSystemPlaylists(): HookResult<SoundCloudSystemPlaylist[]> {
  return useAuthFetch<SoundCloudSystemPlaylist[]>("/me/likes/system-playlists", {
    transform: extractCollection,
  });
}
