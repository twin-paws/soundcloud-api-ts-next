"use client";

import { useSoundCloudContext } from "../provider.js";
import { useSCFetch } from "./_useSCFetch.js";
import type { SCFetchOptions } from "./_useSCFetch.js";
import type { SoundCloudTrack, HookResult } from "../../types.js";

const extractCollection = (json: unknown): SoundCloudTrack[] => {
  const j = json as { collection?: SoundCloudTrack[] };
  return j.collection ?? (json as SoundCloudTrack[]);
};

/**
 * Fetch tracks uploaded by a SoundCloud user.
 *
 * @param userId - The user ID. Pass `undefined` to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 * @returns Hook result with `data` as an array of `SoundCloudTrack`.
 *
 * @example
 * ```tsx
 * import { useUserTracks } from "soundcloud-api-ts-next";
 *
 * function Tracks({ userId }: { userId: number }) {
 *   const { data: tracks, loading } = useUserTracks(userId);
 *   if (loading) return <p>Loading...</p>;
 *   return <ul>{tracks?.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useInfiniteUserTracks} for paginated results
 * @see {@link useUser} for the user profile
 */
export function useUserTracks(
  userId: string | number | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudTrack[]> {
  const { apiPrefix } = useSoundCloudContext();
  const url = userId != null ? `${apiPrefix}/users/${userId}/tracks` : null;
  return useSCFetch<SoundCloudTrack[]>(url, {
    ...options,
    transform: extractCollection,
  });
}
