/**
 * Server-side entry point for `soundcloud-api-ts-next/server`.
 *
 * Exports:
 * - {@link createSoundCloudRoutes} — catch-all API route handler for App Router / Pages Router
 * - {@link createSCAuthManager} / {@link SCAuthManager} — OAuth 2.1 + PKCE auth manager
 * - {@link PkceStore} — pluggable PKCE verifier storage interface
 * - {@link MemoryPkceStore} — default in-memory PKCE store
 * - {@link CookiePkceStore} — signed-cookie PKCE store for serverless deployments
 * - {@link createSoundCloudServerClient} — factory for RSC / Server Action API clients
 * - {@link getTrack}, {@link searchTracks}, {@link getUser}, {@link getPlaylist}, {@link getMe} — server helper functions with `next/cache` integration
 * - {@link scCacheKeys} — cache key factories for `revalidateTag`
 *
 * @example
 * ```ts
 * // app/api/soundcloud/[...route]/route.ts
 * import { createSoundCloudRoutes } from "soundcloud-api-ts-next/server";
 *
 * const sc = createSoundCloudRoutes({
 *   clientId: process.env.SC_CLIENT_ID!,
 *   clientSecret: process.env.SC_CLIENT_SECRET!,
 * });
 *
 * export const GET = sc.handler();
 * export const POST = sc.handler();
 * ```
 *
 * @module
 */

export { createSoundCloudRoutes } from "./routes.js";
export { SCAuthManager, createSCAuthManager } from "./auth.js";
export type {
  SCAuthManagerConfig,
  SCLoginResult,
  SCLoginOptions,
  PkceStore,
} from "./auth.js";

export { MemoryPkceStore } from "../auth/stores/memory-pkce-store.js";
export { CookiePkceStore } from "../auth/stores/cookie-pkce-store.js";

export { createSoundCloudServerClient } from "./client.js";
export type {
  SoundCloudServerClientConfig,
  SoundCloudServerClient,
} from "./client.js";

export {
  getTrack,
  searchTracks,
  getUser,
  getPlaylist,
  getMe,
} from "../server-helpers.js";
export type { ServerHelperConfig, CacheOptions } from "../server-helpers.js";

export { scCacheKeys } from "../cache-keys.js";

export type { SoundCloudRoutesConfig, SCRouteTelemetry, SoundCloudToken } from "../types.js";
export type { SCRequestTelemetry } from "soundcloud-api-ts";
