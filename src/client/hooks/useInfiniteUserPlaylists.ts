"use client";

import { useMemo } from "react";
import { useInfinite } from "./useInfinite.js";
import type { SoundCloudPlaylist, InfiniteResult } from "../../types.js";

/**
 * Fetch a user's playlists with infinite/paginated loading.
 *
 * @param userId - The user ID. Pass `null` to skip.
 * @returns An {@link InfiniteResult} of `SoundCloudPlaylist`.
 *
 * @example
 * ```tsx
 * import { useInfiniteUserPlaylists } from "soundcloud-api-ts-next";
 *
 * function AllPlaylists({ userId }: { userId: number }) {
 *   const { data, loadMore, hasMore } = useInfiniteUserPlaylists(userId);
 *   return <div>{data.map(p => <p key={p.id}>{p.title}</p>)}</div>;
 * }
 * ```
 *
 * @see {@link useUserPlaylists} for single-page fetch
 */
export function useInfiniteUserPlaylists(
  userId: string | number | null,
): InfiniteResult<SoundCloudPlaylist> {
  const url = useMemo(() => (userId ? `/users/${userId}/playlists` : null), [userId]);
  return useInfinite<SoundCloudPlaylist>(url, !!userId);
}
