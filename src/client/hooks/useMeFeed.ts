"use client";

import { useAuthFetch } from "./useAuthFetch.js";
import type { SoundCloudActivitiesResponse, HookResult } from "../../types.js";

/**
 * Fetch the authenticated user's current activity feed (`GET /me/feed`).
 * Prefer this over the deprecated `/me/activities` endpoints.
 */
export function useMeFeed(): HookResult<SoundCloudActivitiesResponse> {
  return useAuthFetch<SoundCloudActivitiesResponse>("/me/feed");
}
