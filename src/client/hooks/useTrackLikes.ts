"use client";

import { useSoundCloudContext } from "../provider.js";
import { useSCFetch } from "./_useSCFetch.js";
import type { SCFetchOptions } from "./_useSCFetch.js";
import type { SoundCloudUser, HookResult } from "../../types.js";

const extractCollection = (json: unknown): SoundCloudUser[] => {
  const j = json as { collection?: SoundCloudUser[] };
  return j.collection ?? (json as SoundCloudUser[]);
};

/**
 * Fetch users who liked a SoundCloud track.
 *
 * @param trackId - The track ID. Pass `undefined` to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 * @returns Hook result with `data` as an array of `SoundCloudUser` who liked the track.
 *
 * @example
 * ```tsx
 * import { useTrackLikes } from "soundcloud-api-ts-next";
 *
 * function Likers({ trackId }: { trackId: number }) {
 *   const { data: users, loading } = useTrackLikes(trackId);
 *   if (loading) return <p>Loading...</p>;
 *   return <ul>{users?.map(u => <li key={u.id}>{u.username}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useTrack} for the track itself
 * @see {@link useLike} for liking/unliking a track
 */
export function useTrackLikes(
  trackId: string | number | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudUser[]> {
  const { apiPrefix } = useSoundCloudContext();
  const url = trackId != null ? `${apiPrefix}/tracks/${trackId}/likes` : null;
  return useSCFetch<SoundCloudUser[]>(url, {
    ...options,
    transform: extractCollection,
  });
}
