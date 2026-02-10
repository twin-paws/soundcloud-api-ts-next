"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudUser, HookResult } from "../../types.js";

/**
 * Fetch the current authenticated user's profile.
 *
 * Requires the user to be authenticated via {@link SoundCloudProvider}.
 * Returns `null` data if not authenticated.
 *
 * @returns Hook result with `data` as a `SoundCloudUser`.
 *
 * @example
 * ```tsx
 * import { useMe } from "soundcloud-api-ts-next";
 *
 * function Profile() {
 *   const { data: me, loading } = useMe();
 *   if (loading) return <p>Loading...</p>;
 *   return <p>Logged in as {me?.username}</p>;
 * }
 * ```
 *
 * @see {@link useSCAuth} for login/logout actions
 * @see {@link useMeTracks} for the current user's tracks
 */
export function useMe(): HookResult<SoundCloudUser> {
  return useAuthFetch<SoundCloudUser>("/me");
}
