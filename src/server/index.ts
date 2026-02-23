/**
 * Server-side entry point for `soundcloud-api-ts-next/server`.
 *
 * Exports {@link createSoundCloudRoutes} for setting up API route handlers
 * in Next.js App Router or Pages Router.
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
export type { SCAuthManagerConfig, SCLoginResult } from "./auth.js";
export type { SoundCloudRoutesConfig, SCRouteTelemetry, SoundCloudToken } from "../types.js";
export type { SCRequestTelemetry } from "soundcloud-api-ts";
