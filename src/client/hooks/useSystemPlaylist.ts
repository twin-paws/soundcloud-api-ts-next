"use client";

import { useSoundCloudContext } from "../provider.js";
import { useSCFetch } from "./_useSCFetch.js";
import type { SCFetchOptions } from "./_useSCFetch.js";
import type { SoundCloudSystemPlaylist, HookResult } from "../../types.js";

/**
 * Fetch a SoundCloud system playlist (track station or artist station).
 *
 * @param id - Full URN (`soundcloud:system-playlists:track-stations:123`) or the
 *   identifier portion (`track-stations:123`). Tracks and users expose it as
 *   `station_urn`. Pass `undefined` or `null` to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 * @returns Hook result with `data` as a `SoundCloudSystemPlaylist`.
 *
 * @example
 * ```tsx
 * import { useTrack, useSystemPlaylist } from "soundcloud-api-ts-next";
 *
 * function Station({ trackId }: { trackId: number }) {
 *   const { data: track } = useTrack(trackId);
 *   const { data: station } = useSystemPlaylist(track?.station_urn);
 *   return <ul>{station?.tracks.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
 * }
 * ```
 *
 * @see {@link usePlaylist} for user-created playlists
 */
export function useSystemPlaylist(
  id: string | null | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudSystemPlaylist> {
  const { apiPrefix } = useSoundCloudContext();
  const url = id ? `${apiPrefix}/system-playlists/${id}` : null;
  return useSCFetch<SoundCloudSystemPlaylist>(url, options);
}
