export { createSoundCloudRoutes } from "./routes.js";

/**
 * Pages Router usage:
 *
 * ```ts
 * // pages/api/soundcloud/[...route].ts
 * import { createSoundCloudRoutes } from 'soundcloud-api-ts-next/server';
 *
 * const sc = createSoundCloudRoutes({
 *   clientId: process.env.SC_CLIENT_ID!,
 *   clientSecret: process.env.SC_CLIENT_SECRET!,
 * });
 *
 * export default sc.pagesHandler();
 * ```
 */
