export { createSoundCloudRoutes } from "./routes.js";

/**
 * App Router usage:
 *
 * ```ts
 * // app/api/soundcloud/[...route]/route.ts
 * import { createSoundCloudRoutes } from 'soundcloud-api-ts-next/server';
 *
 * const sc = createSoundCloudRoutes({
 *   clientId: process.env.SC_CLIENT_ID!,
 *   clientSecret: process.env.SC_CLIENT_SECRET!,
 * });
 *
 * export const GET = sc.handler();
 * ```
 */
