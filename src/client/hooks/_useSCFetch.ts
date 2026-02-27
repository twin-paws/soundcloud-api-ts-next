"use client";

import { useState, useEffect, useRef } from "react";
import type { HookResult } from "../../types.js";

// ── Dedup map ────────────────────────────────────────────────────────────────
// Module-level map keyed by `url::authHeader-prefix`.
// When two hook instances request the same URL at the same time, they share the
// in-flight promise instead of issuing duplicate requests.
const inflightMap = new Map<string, Promise<unknown>>();

function buildDedupKey(url: string, authHeader: string | undefined): string {
  // Use first 20 chars of authHeader to differentiate users without storing full tokens.
  return `${url}::${authHeader?.slice(0, 20) ?? ""}`;
}

function dedupFetch(
  key: string,
  url: string,
  init: RequestInit,
): Promise<unknown> {
  if (inflightMap.has(key)) return inflightMap.get(key)!;
  const p = fetch(url, init)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<unknown>;
    })
    .finally(() => inflightMap.delete(key));
  inflightMap.set(key, p);
  return p;
}

async function fetchWithRetry(
  key: string,
  url: string,
  init: RequestInit,
  retries: number,
  attempt = 0,
): Promise<unknown> {
  try {
    return await dedupFetch(key, url, init);
  } catch (err: unknown) {
    const e = err as { name?: string } | null;
    if (e?.name === "AbortError") throw err;
    if (attempt < retries) {
      const signal = (init as { signal?: AbortSignal }).signal;
      await new Promise<void>((resolve, reject) => {
        const delay = Math.pow(2, attempt) * 100;
        const t = setTimeout(resolve, delay);
        signal?.addEventListener(
          "abort",
          () => {
            clearTimeout(t);
            reject(new DOMException("Aborted", "AbortError"));
          },
          { once: true },
        );
      });
      return fetchWithRetry(key, url, init, retries, attempt + 1);
    }
    throw err;
  }
}

// ── Options ──────────────────────────────────────────────────────────────────

/**
 * Options supported by all data-fetching hooks.
 */
export interface SCFetchOptions {
  /**
   * Set to `false` to skip the request entirely.
   * Useful for conditional fetching (e.g. when an ID is not yet known).
   * Defaults to `true`.
   */
  enabled?: boolean;
  /**
   * Re-fetch on this interval in milliseconds.
   * The interval is cleared on unmount or when deps change.
   */
  refreshInterval?: number;
  /**
   * Number of times to retry on error, with exponential backoff (100ms base).
   * Defaults to `0` (no retries). `AbortError` is never retried.
   */
  retry?: number;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Internal base hook for data-fetching in soundcloud-api-ts-next.
 *
 * Wraps fetch with:
 * - `enabled` skip support
 * - `refreshInterval` polling
 * - `retry` with exponential backoff
 * - Module-level deduplication of concurrent identical requests
 *
 * @internal
 */
export function useSCFetch<T>(
  urlOrNull: string | null,
  options?: SCFetchOptions & {
    authHeader?: string;
    /** Transform the raw JSON response before storing in state. */
    transform?: (json: unknown) => T;
  },
): HookResult<T> {
  const {
    enabled = true,
    refreshInterval,
    retry = 0,
    authHeader,
    transform,
  } = options ?? {};

  // Keep transform stable via ref so it doesn't need to be a dep.
  const transformRef = useRef(transform);
  transformRef.current = transform;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const url = urlOrNull;
    if (!url || !enabled) {
      setData(null);
      return;
    }

    let controller = new AbortController();
    let timerId: ReturnType<typeof setInterval> | undefined;

    const dedupKey = buildDedupKey(url, authHeader);

    const doFetch = (isRefresh: boolean) => {
      if (isRefresh) {
        // Force a fresh request for interval-triggered re-fetches.
        inflightMap.delete(dedupKey);
        controller.abort();
        controller = new AbortController();
      }

      setLoading(true);
      setError(null);

      const init: RequestInit = { signal: controller.signal };
      if (authHeader) {
        init.headers = { authorization: authHeader };
      }

      fetchWithRetry(dedupKey, url, init, retry)
        .then((json) => {
          const xform = transformRef.current;
          setData(xform ? xform(json) : (json as T));
        })
        .catch((err: unknown) => {
          const e = err as { name?: string; message?: string } | null;
          if (e?.name !== "AbortError") {
            setError(
              err instanceof Error
                ? err
                : new Error(String(e?.message ?? String(err))),
            );
          }
        })
        .finally(() => setLoading(false));
    };

    doFetch(false);

    if (refreshInterval != null && refreshInterval > 0) {
      timerId = setInterval(() => doFetch(true), refreshInterval);
    }

    return () => {
      controller.abort();
      if (timerId != null) clearInterval(timerId);
    };
    // transform is intentionally excluded — it's read via ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlOrNull, enabled, retry, refreshInterval, authHeader]);

  return { data, loading, error };
}
