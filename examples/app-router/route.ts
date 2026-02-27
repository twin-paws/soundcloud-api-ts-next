/**
 * Example: App Router catch-all route handler.
 *
 * Mount at:  app/api/soundcloud/[...route]/route.ts
 *
 * This example shows:
 * - Route allowlisting (only expose "tracks", "search", "resolve", and "auth")
 * - Per-prefix cache headers
 * - CORS configuration
 * - CSRF protection for mutation routes
 * - OAuth PKCE authentication
 */

import { createSoundCloudRoutes } from "soundcloud-api-ts-next/server";

const sc = createSoundCloudRoutes({
  clientId: process.env.SC_CLIENT_ID!,
  clientSecret: process.env.SC_CLIENT_SECRET!,

  // Required for OAuth login/callback flow
  redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/soundcloud/auth/callback`,

  // Only expose these route prefixes — all others return 403
  routes: {
    allowlist: ["tracks", "search", "resolve", "auth", "me", "playlists", "users", "next"],
    // Or block specific ones:
    // denylist: ["me"],
  },

  // Cache-Control headers applied to GET responses by route prefix
  cacheHeaders: {
    tracks: "public, max-age=60, stale-while-revalidate=300",
    search: "public, max-age=30",
    users: "public, max-age=120",
    playlists: "public, max-age=60",
    me: "no-store",
    auth: "no-store",
    default: "public, max-age=30",
  },

  // CORS — allow your front-end origin
  cors: {
    origin: process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000",
    methods: ["GET", "POST", "DELETE"],
  },

  // Require matching Origin header on mutation routes (like/repost/follow)
  csrfProtection: true,

  // Optional: route-level telemetry
  onRouteComplete: (t) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[SC] ${t.method} ${t.route} → ${t.status} (${t.durationMs}ms)`);
    }
  },
});

const handler = sc.handler();
export const GET = handler;
export const POST = handler;
export const DELETE = handler;
