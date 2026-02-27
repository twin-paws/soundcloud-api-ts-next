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
 * Search SoundCloud users by query string.
 *
 * @param query - The search query. Pass an empty string to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 * @returns Hook result with `data` as an array of `SoundCloudUser`.
 *
 * @example
 * ```tsx
 * import { useUserSearch } from "soundcloud-api-ts-next";
 *
 * function UserResults({ q }: { q: string }) {
 *   const { data: users, loading } = useUserSearch(q);
 *   if (loading) return <p>Searching...</p>;
 *   return <ul>{users?.map(u => <li key={u.id}>{u.username}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link useInfiniteUserSearch} for paginated search
 * @see {@link useUser} for fetching a single user
 */
export function useUserSearch(
  query: string,
  options?: SCFetchOptions,
): HookResult<SoundCloudUser[]> {
  const { apiPrefix } = useSoundCloudContext();
  const params = new URLSearchParams({ q: query });
  const url = query ? `${apiPrefix}/search/users?${params}` : null;
  return useSCFetch<SoundCloudUser[]>(url, {
    ...options,
    transform: extractCollection,
  });
}
