"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudPlaylist, HookResult } from "../../types.js";

/**
 * Fetch the current authenticated user's playlists.
 *
 * @returns Hook result with `data` as an array of `SoundCloudPlaylist`.
 *
 * @example
 * ```tsx
 * import { useMePlaylists } from "soundcloud-api-ts-next";
 *
 * function MyPlaylists() {
 *   const { data: playlists, loading } = useMePlaylists();
 *   if (loading) return <p>Loading...</p>;
 *   return <ul>{playlists?.map(p => <li key={p.id}>{p.title}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useMe} for the current user's profile
 * @see {@link useMeTracks} for uploaded tracks
 */
export function useMePlaylists(): HookResult<SoundCloudPlaylist[]> {
  return useAuthFetch<SoundCloudPlaylist[]>("/me/playlists");
}
