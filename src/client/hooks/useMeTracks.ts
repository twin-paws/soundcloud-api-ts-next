"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudTrack, HookResult } from "../../types.js";

/**
 * Fetch the current authenticated user's uploaded tracks.
 *
 * @returns Hook result with `data` as an array of `SoundCloudTrack`.
 *
 * @example
 * ```tsx
 * import { useMeTracks } from "soundcloud-api-ts-next";
 *
 * function MyTracks() {
 *   const { data: tracks, loading } = useMeTracks();
 *   if (loading) return <p>Loading...</p>;
 *   return <ul>{tracks?.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useMe} for the current user's profile
 * @see {@link useMeLikes} for liked tracks
 */
export function useMeTracks(): HookResult<SoundCloudTrack[]> {
  return useAuthFetch<SoundCloudTrack[]>("/me/tracks");
}
