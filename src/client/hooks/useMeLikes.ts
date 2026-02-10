"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudTrack, HookResult } from "../../types.js";

/**
 * Fetch the current authenticated user's liked tracks.
 *
 * @returns Hook result with `data` as an array of liked `SoundCloudTrack`.
 *
 * @example
 * ```tsx
 * import { useMeLikes } from "soundcloud-api-ts-next";
 *
 * function MyLikes() {
 *   const { data: tracks, loading } = useMeLikes();
 *   if (loading) return <p>Loading...</p>;
 *   return <ul>{tracks?.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useMe} for the current user's profile
 * @see {@link useLike} for liking/unliking tracks
 */
export function useMeLikes(): HookResult<SoundCloudTrack[]> {
  return useAuthFetch<SoundCloudTrack[]>("/me/likes");
}
