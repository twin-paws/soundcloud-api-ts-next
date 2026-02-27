import type { PkceStore } from "../../server/auth.js";

/**
 * In-memory {@link PkceStore} implementation.
 *
 * Stores PKCE verifiers in a `Map` keyed by OAuth state token, with TTL-based
 * eviction. This is the default behavior of {@link SCAuthManager} when no
 * custom `pkceStore` is provided.
 *
 * **Suitable for:** Single-instance Node.js servers with long-lived processes.
 *
 * **Not suitable for:** Serverless (Vercel, AWS Lambda), edge runtimes, or
 * any deployment with multiple server instances — verifiers are not shared
 * across processes. Use {@link CookiePkceStore} or a Redis adapter instead.
 *
 * @example
 * ```ts
 * import { createSCAuthManager, MemoryPkceStore } from "soundcloud-api-ts-next/server";
 *
 * const scAuth = createSCAuthManager({
 *   clientId: process.env.SC_CLIENT_ID!,
 *   clientSecret: process.env.SC_CLIENT_SECRET!,
 *   redirectUri: process.env.SC_REDIRECT_URI!,
 *   pkceStore: new MemoryPkceStore(),
 * });
 * ```
 */
export class MemoryPkceStore implements PkceStore {
  private readonly map = new Map<string, { verifier: string; exp: number }>();

  /**
   * Store a PKCE verifier for `state`, expiring after `ttlMs` milliseconds.
   * Evicts any previously-expired entries before storing.
   */
  set(state: string, verifier: string, ttlMs: number): void {
    this._evictExpired();
    this.map.set(state, { verifier, exp: Date.now() + ttlMs });
  }

  /**
   * Retrieve the verifier for `state`.
   * Returns `undefined` if the entry doesn't exist or has expired.
   */
  get(state: string): string | undefined {
    const entry = this.map.get(state);
    if (!entry) return undefined;
    if (Date.now() > entry.exp) {
      this.map.delete(state);
      return undefined;
    }
    return entry.verifier;
  }

  /** Remove the verifier for `state` (one-time-use enforcement). */
  delete(state: string): void {
    this.map.delete(state);
  }

  /**
   * Number of active (non-expired) PKCE entries.
   * Useful for observability / health checks.
   */
  get size(): number {
    this._evictExpired();
    return this.map.size;
  }

  private _evictExpired(): void {
    const now = Date.now();
    for (const [key, val] of this.map) {
      if (now > val.exp) this.map.delete(key);
    }
  }
}
