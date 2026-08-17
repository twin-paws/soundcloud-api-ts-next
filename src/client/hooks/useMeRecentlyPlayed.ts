"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudTrack, HookResult } from "../../types.js";

const extract = (json: unknown): SoundCloudTrack[] => {
  if (Array.isArray(json)) return json;
  return (json as { collection?: SoundCloudTrack[] }).collection ?? [];
};

/**
 * Last 25 recently played tracks for the authenticated user.
 */
export function useMeRecentlyPlayed(): HookResult<SoundCloudTrack[]> {
  return useAuthFetch<SoundCloudTrack[]>("/me/recently-played", { transform: extract });
}
