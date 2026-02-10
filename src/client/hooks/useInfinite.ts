"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { InfiniteResult } from "../../types.js";

/**
 * Generic base hook for infinite/paginated fetching.
 * Fetches the first page on mount, accumulates results, and exposes loadMore/reset.
 *
 * @param initialUrl - The initial API path (relative to apiPrefix), e.g. "/search/tracks?q=lofi"
 * @param enabled - Whether to fetch (false = skip). Defaults to true.
 */
export function useInfinite<T>(
  initialUrl: string | null,
  enabled = true,
): InfiniteResult<T> {
  const { apiPrefix } = useSoundCloudContext();
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const nextHrefRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const fetchPage = useCallback(
    async (url: string, append: boolean) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      if (!append) setError(null);

      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        if (!mountedRef.current) return;

        const collection: T[] = json.collection ?? json;
        const nextHref: string | null = json.next_href ?? null;

        nextHrefRef.current = nextHref;
        setHasMore(!!nextHref);
        setData((prev) => (append ? [...prev, ...collection] : collection));
      } catch (err: any) {
        if (err.name === "AbortError") return;
        if (mountedRef.current) setError(err);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    },
    [apiPrefix],
  );

  // Fetch first page on mount or when initialUrl changes
  useEffect(() => {
    mountedRef.current = true;
    if (!initialUrl || !enabled) {
      setData([]);
      setHasMore(false);
      nextHrefRef.current = null;
      return;
    }

    fetchPage(`${apiPrefix}${initialUrl}`, false);

    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [initialUrl, enabled, apiPrefix, fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || !nextHrefRef.current) return;
    const encodedUrl = encodeURIComponent(nextHrefRef.current);
    fetchPage(`${apiPrefix}/next?url=${encodedUrl}`, true);
  }, [loading, apiPrefix, fetchPage]);

  const reset = useCallback(() => {
    nextHrefRef.current = null;
    setData([]);
    setHasMore(false);
    setError(null);
    if (initialUrl && enabled) {
      fetchPage(`${apiPrefix}${initialUrl}`, false);
    }
  }, [initialUrl, enabled, apiPrefix, fetchPage]);

  return { data, loading, error, hasMore, loadMore, reset };
}
