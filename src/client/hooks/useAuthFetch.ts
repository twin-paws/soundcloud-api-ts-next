"use client";

import { useSoundCloudContext } from "../provider.js";
import { useSCFetch } from "./_useSCFetch.js";
import type { SCFetchOptions } from "./_useSCFetch.js";
import type { HookResult } from "../../types.js";

/**
 * Internal hook for fetching authenticated endpoints.
 * Only fetches when user is authenticated.
 */
export function useAuthFetch<T>(
  path: string,
  options?: SCFetchOptions,
): HookResult<T> {
  const { apiPrefix, accessToken, isAuthenticated } = useSoundCloudContext();
  const url =
    isAuthenticated && accessToken ? `${apiPrefix}${path}` : null;
  return useSCFetch<T>(url, {
    ...options,
    authHeader: accessToken ? `Bearer ${accessToken}` : undefined,
  });
}
