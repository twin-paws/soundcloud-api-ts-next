"use client";

import { useSoundCloudContext } from "../provider.js";
import { useSCFetch } from "./_useSCFetch.js";
import type { SCFetchOptions } from "./_useSCFetch.js";
import type { SoundCloudUser, HookResult } from "../../types.js";

/**
 * Fetch a single SoundCloud user profile by ID.
 *
 * @param userId - The SoundCloud user ID. Pass `undefined` to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 * @returns Hook result with `data` as a `SoundCloudUser`, plus `loading` and `error` states.
 *
 * @example
 * ```tsx
 * import { useUser } from "soundcloud-api-ts-next";
 *
 * function UserProfile({ id }: { id: number }) {
 *   const { data: user, loading } = useUser(id);
 *   if (loading) return <p>Loading...</p>;
 *   return <h1>{user?.username}</h1>;
 * }
 * ```
 *
 * @see {@link useUserSearch} for searching users
 * @see {@link useUserTracks} for a user's tracks
 * @see {@link useFollow} for following a user
 */
export function useUser(
  userId: string | number | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudUser> {
  const { apiPrefix } = useSoundCloudContext();
  const url = userId != null ? `${apiPrefix}/users/${userId}` : null;
  return useSCFetch<SoundCloudUser>(url, options);
}
