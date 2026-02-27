"use client";

import { useSoundCloudContext } from "../provider.js";
import { useSCFetch } from "./_useSCFetch.js";
import type { SCFetchOptions } from "./_useSCFetch.js";
import type { HookResult } from "../../types.js";

/**
 * Resolve a SoundCloud URL to an API resource.
 *
 * Pass a full SoundCloud URL (e.g. `https://soundcloud.com/deadmau5/strobe`)
 * and get back the resolved API resource (track, user, or playlist object).
 *
 * @param url - A SoundCloud URL to resolve. Pass `undefined` to skip the request.
 * @param options - Optional fetch options (`enabled`, `refreshInterval`, `retry`).
 * @returns Hook result with the resolved resource as `data`, plus `loading` and `error` states.
 *
 * @example
 * ```tsx
 * import { useResolve } from "soundcloud-api-ts-next";
 *
 * function ResolvedResource({ scUrl }: { scUrl: string }) {
 *   const { data, loading, error } = useResolve(scUrl);
 *   if (loading) return <p>Resolving...</p>;
 *   if (error) return <p>Error: {error.message}</p>;
 *   return <pre>{JSON.stringify(data, null, 2)}</pre>;
 * }
 * ```
 */
export function useResolve(
  url: string | undefined,
  options?: SCFetchOptions,
): HookResult<unknown> {
  const { apiPrefix } = useSoundCloudContext();
  const fetchUrl =
    url != null ? `${apiPrefix}/resolve?url=${encodeURIComponent(url)}` : null;
  return useSCFetch<unknown>(fetchUrl, options);
}
