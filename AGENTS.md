# AGENTS.md — soundcloud-api-ts-next

Instructions for AI coding agents working with this package.

## Overview

React hooks and Next.js API route handlers for the SoundCloud API. Client secrets stay on the server. Built on `soundcloud-api-ts`.

## Setup

```bash
npm install soundcloud-api-ts-next
```

Requires: React 18+/19+, Next.js 13+/14+/15+

### 1. Create API Routes (App Router)

```ts
// app/api/soundcloud/[...soundcloud]/route.ts
import { createSoundCloudRoutes } from "soundcloud-api-ts-next/server";

const routes = createSoundCloudRoutes({
  clientId: process.env.SOUNDCLOUD_CLIENT_ID!,
  clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET!,
  redirectUri: process.env.SOUNDCLOUD_REDIRECT_URI,
});

export const { GET, POST, DELETE } = routes.handler();
```

### 2. Wrap App with Provider

```tsx
import { SoundCloudProvider } from "soundcloud-api-ts-next";

export default function Layout({ children }) {
  return <SoundCloudProvider apiPrefix="/api/soundcloud">{children}</SoundCloudProvider>;
}
```

### 3. Use Hooks

```tsx
import { useTrack, useTrackSearch, usePlayer } from "soundcloud-api-ts-next";

const { data: track } = useTrack(123456);
const { data: results } = useTrackSearch("lofi");
const player = usePlayer(trackId);
```

## Key Concepts

1. **All SoundCloud API calls go through your Next.js API routes** — client secrets never reach the browser
2. **Hooks return `{ data, loading, error }`** — standard pattern for all data hooks
3. **Infinite hooks return `{ data, loading, error, hasMore, loadMore, reset }`** — for scroll pagination
4. **Action hooks return mutation functions** — `useLike().likeTrack(id)`, `useFollow().follow(id)`
5. **Auth is managed via `useSCAuth()`** — handles OAuth redirect flow with PKCE

## Project Structure

```
src/
  index.ts           — Client-side exports (hooks, provider, types)
  server.ts          — Server-side exports (createSoundCloudRoutes)
  client/            — React hooks and provider implementation
  server/            — API route handler implementation
  types.ts           — Shared type definitions
```

## Build

```bash
pnpm build       # tsup → dist/ (ESM + CJS + .d.ts)
pnpm typecheck   # tsc --noEmit
pnpm docs        # TypeDoc → API docs site
```

## Publishing

Uses **Trusted Publishing** via GitHub Releases (same as soundcloud-api-ts).

## Gotchas

1. **Two entry points** — `soundcloud-api-ts-next` (client hooks) and `soundcloud-api-ts-next/server` (route handlers). Don't import server code in client components.
2. **Provider required** — all hooks need `<SoundCloudProvider>` in the component tree.
3. **API prefix must match** — the `apiPrefix` in the provider must match your route file path.
4. **Auth hooks need redirectUri** — set `redirectUri` in `createSoundCloudRoutes` config for OAuth flow.
5. **Route telemetry** — pass `onRouteComplete` in config to get `SCRouteTelemetry` after every API route (route, method, durationMs, status, error?). Works with both App Router and Pages Router handlers.

## Underlying Client (soundcloud-api-ts v1.13.0+)

This package requires `soundcloud-api-ts ^1.13.0`. Key additions available to this package:

- **`sc.tracks.getTracks(ids[])`** — batch fetch multiple tracks by ID
- **`sc.me.getConnections()`** — list linked social accounts
- **`sc.raw`** — escape hatch: `sc.raw.get('/any/endpoint/{id}', params)` returns `RawResponse<unknown>`
- **Fetch injection** — pass `fetch`/`AbortController` in config for Workers/Bun/Deno portability
- **In-flight deduplication** — `dedupe: true` (default) — concurrent identical GETs share one promise
- **Cache interface** — pass `cache: SoundCloudCache` to plug in any backend
- **`onRetry` hook** — `(info: RetryInfo) => void` fires on every retry
- **`Retry-After` on 429** — honored automatically (capped 60s)
- **Auth guide** — `node_modules/soundcloud-api-ts/docs/auth-guide.md` covers all flows + 401 troubleshooting
- **`TokenProvider` / `TokenStore`** — interfaces for pluggable token lifecycle management

All config options are passed through `createSoundCloudRoutes(config)` → forwarded to the underlying `SoundCloudClient`.

## Auth Stores (v1.11.0+)

`PkceStore` interface (`src/auth/stores/`) — pluggable PKCE verifier store:
- `MemoryPkceStore` — default, in-process (breaks on serverless/multi-instance)
- `CookiePkceStore` — signed HMAC-SHA256 cookie store. Best for Vercel. Accepts `{ secret: string, cookieName?: string }`. Use `setCookieHeader()` + `getFromRequest(req)` helpers.
- Custom: implement `{ set(state, verifier, ttlMs), get(state), delete(state) }`

Pass to `createSCAuthManager({ pkceStore: new CookiePkceStore({ secret: process.env.COOKIE_SECRET }) })`

See `docs/auth-distributed.md` for deployment guidance.

## Server Helpers / RSC (v1.11.0+)

Import from `soundcloud-api-ts-next/server`:
- `createSoundCloudServerClient({ clientId, clientSecret, getToken? })` — returns a configured `SoundCloudClient`
- `getTrack(id, config, cacheOptions?)` / `searchTracks` / `getUser` / `getPlaylist` / `getMe`
- `scCacheKeys` — `{ track(id), user(id), playlist(id), searchTracks(q), me() }`
- `cacheOptions`: `{ revalidate?: number | false, tags?: string[] }` — passed to Next.js `unstable_cache` when available

See `docs/rsc-guide.md`.

## Headless Fetchers + Query Keys (v1.12.0+)

```ts
import { configureFetchers, scFetchers, scKeys } from 'soundcloud-api-ts-next';

// One-time setup (e.g. in lib/soundcloud.ts)
configureFetchers({ clientId: process.env.SC_CLIENT_ID, clientSecret: process.env.SC_CLIENT_SECRET });

// With TanStack Query
useQuery({ queryKey: scKeys.track(id), queryFn: () => scFetchers.track(id) });

// With SWR
useSWR(scKeys.track(id), () => scFetchers.track(id));
```

No TanStack Query or SWR dependency. See `docs/tanstack-query.md`.

## Route Config (v1.12.0+)

```ts
createSoundCloudRouteHandler({
  clientId, clientSecret,
  routes: { allowlist: ['tracks', 'search', 'resolve'] },
  cacheHeaders: { tracks: 'public, max-age=60', me: 'no-store', default: 'public, max-age=30' },
  cors: { origin: 'https://myapp.com' },
  csrfProtection: true,  // verifies Origin on mutations
})
```

Error envelope: `{ code: string, message: string, status: number, requestId: string }`

## App Router Example

See `examples/app-router/` for a complete reference implementation:
- `route.ts` — catch-all handler with allowlist + cache headers
- `TrackPage.tsx` — RSC using `getTrack()` server helper
- `TrackClient.tsx` — client component using `useTrack()` hook
- `auth/callback/route.ts` — OAuth callback with `CookiePkceStore`

## Related Packages

- [soundcloud-api-ts](https://github.com/twin-paws/soundcloud-api-ts) — The underlying API client (dependency)

## Full Documentation

https://twin-paws.github.io/soundcloud-api-ts-next/
