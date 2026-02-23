import {
  SoundCloudClient,
  generateCodeVerifier,
  generateCodeChallenge,
  getAuthorizationUrl,
} from "soundcloud-api-ts";
import type { SoundCloudToken } from "../types.js";

// ── Types ─────────────────────────────────────────────────────────────────

/**
 * Configuration for {@link SCAuthManager}.
 */
export interface SCAuthManagerConfig {
  /** SoundCloud OAuth client ID from your app registration. */
  clientId: string;
  /** SoundCloud OAuth client secret from your app registration. */
  clientSecret: string;
  /**
   * OAuth redirect URI — must match the value registered in your SoundCloud app
   * and used in the initial authorization request.
   */
  redirectUri: string;
}

/**
 * Result from {@link SCAuthManager.initLogin} — redirect the user to `url`,
 * then persist `state` (e.g. in a short-lived httpOnly cookie) so you can
 * verify it in the OAuth callback.
 */
export interface SCLoginResult {
  /** The full SoundCloud authorize URL to redirect the user to. */
  url: string;
  /**
   * Random CSRF state token. Store this securely (httpOnly cookie) and
   * compare it against the `state` param in the OAuth callback.
   */
  state: string;
}

// ── SCAuthManager ─────────────────────────────────────────────────────────

/**
 * Server-side SoundCloud OAuth 2.1 + PKCE auth manager.
 *
 * Handles the full authorization code + PKCE flow:
 *   1. `initLogin()` — generates a PKCE verifier/challenge + CSRF state,
 *      returns the SoundCloud authorize URL.
 *   2. `exchangeCode(code, state)` — verifies the CSRF state, exchanges the
 *      authorization code + PKCE verifier for access/refresh tokens.
 *   3. `refreshToken(refreshToken)` — refreshes an expired access token.
 *
 * The PKCE verifier is stored in-memory (tied to the process). In a typical
 * Next.js deployment the module is a long-lived singleton — verifiers survive
 * across requests for up to 10 minutes before being evicted.
 *
 * @example
 * ```ts
 * // lib/sc-auth.ts (module-level singleton)
 * import { createSCAuthManager } from "soundcloud-api-ts-next/server";
 *
 * export const scAuth = createSCAuthManager({
 *   clientId: process.env.SC_CLIENT_ID!,
 *   clientSecret: process.env.SC_CLIENT_SECRET!,
 *   redirectUri: process.env.SC_REDIRECT_URI!,
 * });
 *
 * // api/auth/login/route.ts
 * const { url, state } = await scAuth.initLogin();
 * // Set httpOnly cookie with state, then redirect to url
 *
 * // api/auth/callback/route.ts
 * const tokens = await scAuth.exchangeCode(code, state);
 * // Use tokens.access_token for authenticated SC API calls
 * ```
 */
export class SCAuthManager {
  private readonly config: SCAuthManagerConfig;
  private readonly client: SoundCloudClient;
  /** state → { verifier, createdAt } */
  private readonly pkceStore = new Map<string, { verifier: string; createdAt: number }>();
  /** TTL for PKCE entries in ms (default: 10 minutes) */
  private readonly ttlMs: number;

  constructor(config: SCAuthManagerConfig, ttlMs = 600_000) {
    this.config = config;
    this.ttlMs = ttlMs;
    this.client = new SoundCloudClient({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: config.redirectUri,
    });
  }

  /** Remove expired PKCE entries. Called automatically on `initLogin`. */
  private evictExpired(): void {
    const now = Date.now();
    for (const [key, val] of this.pkceStore) {
      if (now - val.createdAt > this.ttlMs) this.pkceStore.delete(key);
    }
  }

  /**
   * Start the SoundCloud OAuth 2.1 + PKCE login flow.
   *
   * Generates a PKCE code_verifier + code_challenge and a random CSRF state
   * token, stores the verifier server-side, and returns the SoundCloud
   * authorize URL to redirect the user to.
   *
   * **You must persist `state`** (e.g. httpOnly cookie) and verify it in
   * the callback — otherwise CSRF protection is bypassed.
   *
   * @returns `{ url, state }` — redirect to `url`, persist `state`.
   */
  async initLogin(): Promise<SCLoginResult> {
    this.evictExpired();
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = globalThis.crypto.randomUUID();
    this.pkceStore.set(state, { verifier, createdAt: Date.now() });
    const url = getAuthorizationUrl(this.config.clientId, this.config.redirectUri, {
      state,
      codeChallenge: challenge,
    });
    return { url, state };
  }

  /**
   * Exchange an authorization code for access + refresh tokens.
   *
   * Verifies `state` against the stored PKCE entry (CSRF check), then
   * exchanges the code + PKCE verifier with SoundCloud's token endpoint.
   * The PKCE entry is consumed (one-time use).
   *
   * @param code  The `code` query param from SoundCloud's OAuth redirect.
   * @param state The `state` query param — must match what was returned by `initLogin`.
   * @throws If `state` is invalid/expired or the token exchange fails.
   */
  async exchangeCode(code: string, state: string): Promise<SoundCloudToken> {
    const entry = this.pkceStore.get(state);
    if (!entry) {
      throw new Error(
        "Invalid or expired OAuth state — the login session may have timed out. Please try again."
      );
    }
    this.pkceStore.delete(state); // one-time use
    const tokens = await this.client.auth.getUserToken(code, entry.verifier);
    return tokens as SoundCloudToken;
  }

  /**
   * Refresh an expired access token using a refresh token.
   *
   * @param refreshToken The refresh token obtained from a previous token exchange.
   * @throws If the refresh token is expired or invalid.
   */
  async refreshToken(refreshToken: string): Promise<SoundCloudToken> {
    const tokens = await this.client.auth.refreshUserToken(refreshToken);
    return tokens as SoundCloudToken;
  }

  /**
   * Returns the number of active (non-expired) PKCE entries.
   * Useful for observability / health checks.
   */
  get pendingLogins(): number {
    this.evictExpired();
    return this.pkceStore.size;
  }
}

// ── Factory ───────────────────────────────────────────────────────────────

/**
 * Create a new {@link SCAuthManager} instance.
 *
 * Call this once at the module level to create a singleton — the in-memory
 * PKCE store is shared across requests within the same process.
 *
 * @example
 * ```ts
 * // lib/sc-auth.ts
 * import { createSCAuthManager } from "soundcloud-api-ts-next/server";
 *
 * export const scAuth = createSCAuthManager({
 *   clientId: process.env.SC_CLIENT_ID!,
 *   clientSecret: process.env.SC_CLIENT_SECRET!,
 *   redirectUri: process.env.SC_REDIRECT_URI!,
 * });
 * ```
 */
export function createSCAuthManager(config: SCAuthManagerConfig): SCAuthManager {
  return new SCAuthManager(config);
}
