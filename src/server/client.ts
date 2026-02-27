import { SoundCloudClient } from "soundcloud-api-ts";

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Configuration for {@link createSoundCloudServerClient}.
 */
export interface SoundCloudServerClientConfig {
  /** SoundCloud OAuth client ID from your app registration. */
  clientId: string;
  /** SoundCloud OAuth client secret from your app registration. */
  clientSecret: string;
  /**
   * Optional function that returns the current user's access token.
   *
   * When provided, the returned client automatically passes the token to
   * authenticated API calls (e.g. `/me`, `/me/likes`). Return `undefined` to
   * fall back to client-credentials (public API calls only).
   *
   * Can be async — useful when reading from cookies, headers, or a session store.
   *
   * @example
   * ```ts
   * const sc = createSoundCloudServerClient({
   *   clientId: process.env.SC_CLIENT_ID!,
   *   clientSecret: process.env.SC_CLIENT_SECRET!,
   *   getToken: () => cookies().get("sc_access_token")?.value,
   * });
   * ```
   */
  getToken?: () => string | undefined | Promise<string | undefined>;
}

/**
 * A thin wrapper around `SoundCloudClient` with an optional pre-resolved
 * user access token. Returned by {@link createSoundCloudServerClient}.
 */
export interface SoundCloudServerClient {
  /** The underlying `SoundCloudClient` instance from `soundcloud-api-ts`. */
  readonly client: SoundCloudClient;
  /**
   * The resolved user access token (if `getToken` was provided and returned
   * a value), or `undefined` for public/client-credentials-only usage.
   */
  readonly userToken: string | undefined;
  /**
   * Convenience: returns the resolved token for passing to authenticated
   * API calls, e.g. `sc.client.me.getMe({ token: sc.token() })`.
   */
  token(): string | undefined;
}

// ── Factory ────────────────────────────────────────────────────────────────

/**
 * Create a server-side SoundCloud API client for use in React Server
 * Components, Route Handlers, and Server Actions.
 *
 * This is a thin factory around `SoundCloudClient` from `soundcloud-api-ts`.
 * It optionally resolves a user access token via `getToken` so you can call
 * authenticated endpoints (e.g. `/me`) from server-rendered code without
 * waterfalling through client-side hooks.
 *
 * The returned object exposes the raw `SoundCloudClient` as `.client` for
 * full API access, plus `.token()` for passing the resolved user token to
 * authenticated calls.
 *
 * For common single-call patterns, prefer the standalone server helpers
 * ({@link getTrack}, {@link searchTracks}, etc.) — they handle client
 * credential token management and optional `next/cache` integration
 * automatically.
 *
 * @example
 * ```ts
 * // app/artist/[id]/page.tsx  (React Server Component)
 * import { createSoundCloudServerClient } from "soundcloud-api-ts-next/server";
 * import { cookies } from "next/headers";
 *
 * export default async function ArtistPage({ params }: { params: { id: string } }) {
 *   const sc = await createSoundCloudServerClient({
 *     clientId: process.env.SC_CLIENT_ID!,
 *     clientSecret: process.env.SC_CLIENT_SECRET!,
 *     getToken: () => cookies().get("sc_access_token")?.value,
 *   });
 *
 *   const [user, tracks] = await Promise.all([
 *     sc.client.users.getUser(params.id, { token: sc.token() }),
 *     sc.client.users.getTracks(params.id, 10, { token: sc.token() }),
 *   ]);
 *
 *   return <ArtistView user={user} tracks={tracks} />;
 * }
 * ```
 */
export async function createSoundCloudServerClient(
  config: SoundCloudServerClientConfig,
): Promise<SoundCloudServerClient> {
  const client = new SoundCloudClient({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
  });

  const userToken = config.getToken ? await config.getToken() : undefined;

  return {
    client,
    userToken,
    token() {
      return userToken;
    },
  };
}
