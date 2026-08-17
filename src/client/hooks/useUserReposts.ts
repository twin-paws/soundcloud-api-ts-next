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
 * A user's track reposts (`GET /users/{id}/reposts/tracks`).
 */
export function useUserReposts(
  userId: string | number | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudTrack[]> {
  const { apiPrefix } = useSoundCloudContext();
  const url = userId != null ? `${apiPrefix}/users/${userId}/reposts/tracks` : null;
  return useSCFetch<SoundCloudTrack[]>(url, {
    ...options,
    transform: extractCollection,
  });
}
