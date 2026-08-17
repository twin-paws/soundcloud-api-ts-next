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
 * Related artist recommendations for a user (`GET /users/{id}/related`).
 */
export function useRelatedUsers(
  userId: string | number | undefined,
  options?: SCFetchOptions,
): HookResult<SoundCloudUser[]> {
  const { apiPrefix } = useSoundCloudContext();
  const url = userId != null ? `${apiPrefix}/users/${userId}/related` : null;
  return useSCFetch<SoundCloudUser[]>(url, {
    ...options,
    transform: extractCollection,
  });
}
