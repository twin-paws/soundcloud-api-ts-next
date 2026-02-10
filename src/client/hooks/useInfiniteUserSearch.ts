"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudUser, InfiniteResult } from "../../types.js";

/**
 * Search SoundCloud users with infinite/paginated loading.
 *
 * @param query - The search query. Pass an empty string to skip.
 * @param options - Optional settings. `limit` controls results per page.
 * @returns An {@link InfiniteResult} of `SoundCloudUser` with `loadMore` and `hasMore`.
 *
 * @example
 * ```tsx
 * import { useInfiniteUserSearch } from "soundcloud-api-ts-next";
 *
 * function UserSearch({ q }: { q: string }) {
 *   const { data: users, loadMore, hasMore } = useInfiniteUserSearch(q);
 *   return (
 *     <div>
 *       {users.map(u => <p key={u.id}>{u.username}</p>)}
 *       {hasMore && <button onClick={loadMore}>More</button>}
 *     </div>
 *   );
 * }
 * ```
 *
 * @see {@link useUserSearch} for single-page search
 * @see {@link useInfinite} for the base infinite hook
 */
export function useInfiniteUserSearch(
  query: string,
  options?: { limit?: number },
): InfiniteResult<SoundCloudUser> {
  const url = useMemo(() => {
    if (!query) return null;
    const params = new URLSearchParams({ q: query });
    if (options?.limit) params.set("limit", String(options.limit));
    return `/search/users?${params}`;
  }, [query, options?.limit]);

  return useInfinite<SoundCloudUser>(url, !!query);
}
