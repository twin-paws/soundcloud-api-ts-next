# Changelog

All notable changes to this project will be documented in this file.

## [1.12.3] - 2026-02-26

### Fixed
- **Concurrent token refresh race** — `ensureClientToken` now uses a module-level `_refreshPromise` so that concurrent requests when the token is expired share a single `getClientToken()` call instead of firing duplicate refreshes.

### Changed
- Bumped `soundcloud-api-ts` dependency to `^1.13.1`.

## [1.12.0] - 2026-02-26

### Added
- **`scFetchers`** — headless async fetchers: `track`, `tracks`, `user`, `playlist`, `searchTracks`, `searchUsers`, `me`, `meConnections`, `resolve`. Call `configureFetchers({ clientId, clientSecret })` once at app startup. Exported from main entrypoint.
- **`scKeys`** — TanStack Query / SWR compatible query key factories: `all`, `track`, `tracks`, `user`, `playlist`, `searchTracks`, `searchUsers`, `me`, `meConnections`. Exported from main entrypoint.
- **Hook options** — all hooks now accept `enabled?: boolean`, `refreshInterval?: number`, `retry?: number` (exponential backoff).
- **Client-side hook dedup** — concurrent calls with identical args share a single in-flight promise.
- **Route config** — `createSoundCloudRouteHandler` now accepts `routes.allowlist`, `routes.denylist`, `cacheHeaders`, `cors`, `csrfProtection`.
- **Consistent error envelope** — all routes return `{ code, message, status, requestId }` on error. `requestId` is a `crypto.randomUUID()` per request.
- **`examples/app-router/`** — full App Router example: RSC track page, client hook component, OAuth login flow, `CookiePkceStore` auth callback, route handler with config.
- **`docs/tanstack-query.md`** — drop-in usage with TanStack Query and SWR using `scFetchers` + `scKeys`.

### Changed
- Route handler returns structured error envelope on all error paths (previously inconsistent).

## [1.11.0] - 2026-02-26

### Added
- **`PkceStore` interface** — pluggable PKCE verifier store for `SCAuthManager`. Implement `set/get/delete` to use any backend.
- **`MemoryPkceStore`** — default in-memory implementation (existing behavior, no breaking change). Exported from `soundcloud-api-ts-next`.
- **`CookiePkceStore`** — signed cookie implementation (HMAC-SHA256, no new deps). Recommended for Vercel/serverless. Accepts `{ secret, cookieName? }`.
- **Multi-tenant `initLogin`** — optional `sessionId` param scopes PKCE state to prevent parallel login collisions.
- **Configurable `stateCookieName`** in `SCAuthManagerConfig`.
- **`createSoundCloudServerClient(config)`** — factory for RSC/server-side use. Wraps base `SoundCloudClient` with optional `getToken` for user-scoped calls. Exported from `soundcloud-api-ts-next/server`.
- **Server helpers** (`src/server-helpers.ts`) — `getTrack`, `searchTracks`, `getUser`, `getPlaylist`, `getMe`. Each accepts `cacheOptions: { revalidate?, tags? }` for Next.js `unstable_cache` integration.
- **`scCacheKeys`** — cache key factories for all server helpers. Exported from `soundcloud-api-ts-next/server`.
- **`docs/auth-distributed.md`** — single-instance vs distributed deployment guide, store recommendations, cookie options.
- **`docs/rsc-guide.md`** — App Router RSC patterns, caching, `revalidateTag` usage.

### Changed
- `SCAuthManagerConfig` now accepts optional `pkceStore?: PkceStore` and `stateCookieName?: string`.

## [1.10.0] - 2026-02-26

### Added

- **`useTracks(ids[])`** — batch fetch multiple tracks by ID array. Wraps `sc.tracks.getTracks(ids[])` from soundcloud-api-ts v1.13.0.
- **`useMeConnections()`** — fetch linked social accounts for the authenticated user. Wraps `sc.me.getConnections()`. Requires user token.
- **`GET /api/soundcloud/tracks?ids=id1,id2,...`** — batch tracks route. Returns `SoundCloudTrack[]`.
- **`GET /api/soundcloud/me/connections`** — connections route. Returns `SoundCloudConnection[]`.

### Changed

- Peer dependency: `soundcloud-api-ts` bumped to `^1.13.0`.

### Notes

- `getConnections()` may require elevated SC API access depending on your app permissions.
- Widget cross-reference docs added (`soundcloud-widget-react` integration patterns).

## [1.9.4] - 2026-02-23

### Added

- **`SCAuthManager`** — new server-side class for programmatic SoundCloud OAuth 2.1 + PKCE. Manages the `state → PKCE verifier` mapping across the two HTTP requests that make up the OAuth flow (initiation + callback), so you don't have to.
- **`createSCAuthManager(config)`** — factory function, exported from `soundcloud-api-ts-next/server`. Creates a module-level singleton for use across Next.js API routes.
- **`SCAuthManagerConfig`** type — `{ clientId, clientSecret, redirectUri }`
- **`SCLoginResult`** type — `{ url: string, state: string }` returned by `initLogin()`
- **`SoundCloudToken`** type — now re-exported from `soundcloud-api-ts-next/server` (was previously only available from the base package)

### Changed

- `routes.ts` internally refactored to use `SCAuthManager` — `/auth/login` and `/auth/callback` route handlers no longer maintain their own `pkceStore`. Behavior is identical; the store is now shared via the `SCAuthManager` singleton.

### When to use `SCAuthManager` vs the HTTP routes

Use `SCAuthManager` when your app needs custom logic **after** token exchange — user creation, session minting (e.g. NextAuth JWT), linking accounts to a database. The HTTP routes (`/auth/login`, `/auth/callback`) are still the right choice for simple client-side PKCE flows where you just need the tokens returned as JSON.

## [1.9.3] - 2026-02-16

### Changed

- **Bump soundcloud-api-ts to ^1.11.3** — picks up critical Basic Auth fix for `getClientToken()` class method.

## [1.9.2] - 2026-02-15

### Added

- **Telemetry test coverage**: 22 new tests — `onRouteComplete` on success, errors, all auth routes (login/callback/refresh/logout), App Router + Pages Router, authenticated routes, 401/404, no-callback safety, `onRequest` config passthrough, `SCRouteTelemetry` type export verification.

## [1.9.1] - 2026-02-15

### Fixed

- **Full telemetry coverage**: Refactored `routes.ts` from standalone function imports to internal `SoundCloudClient` — all API calls (auth, data, actions) now emit `onRequest` telemetry
- Previously `onRequest` was declared on config but not wired to anything

### Changed

- Bumped `soundcloud-api-ts` to ^1.11.1 (auth telemetry fix)

## [1.9.0] - 2026-02-15

### Added

- **Route-level telemetry**: New `onRouteComplete` callback on `SoundCloudRoutesConfig` — fires after every API route is handled with `SCRouteTelemetry` (route, method, durationMs, status, error?)
- Covers both App Router (`handler()`) and Pages Router (`pagesHandler()`)
- **SC API telemetry passthrough**: New `onRequest` callback on `SoundCloudRoutesConfig` — re-exports `SCRequestTelemetry` from `soundcloud-api-ts` for per-request observability
- New exported types: `SCRouteTelemetry`, `SCRequestTelemetry`

### Changed

- Bumped `soundcloud-api-ts` to v1.11.0 (adds `onRequest` telemetry hook)

### Example

```ts
const sc = createSoundCloudRoutes({
  clientId: process.env.SC_CLIENT_ID!,
  clientSecret: process.env.SC_CLIENT_SECRET!,
  onRouteComplete: (t) => console.log(`[Route] ${t.method} ${t.route} ${t.status} ${t.durationMs}ms`),
});
```

## [1.8.0] - 2026-02-12

### Changed

- Bumped `soundcloud-api-ts` to v1.10.0 — OAuth 2.1 endpoint migration
  - All auth calls now route to `secure.soundcloud.com` instead of `api.soundcloud.com`
  - Token endpoint: `secure.soundcloud.com/oauth/token`
  - Authorize endpoint: `secure.soundcloud.com/authorize`
- This is a **required upgrade** — SoundCloud is shutting down the old OAuth 2.0 endpoints

## [1.7.5] - 2026-02-10

### Changed
- Publish via npm Trusted Publishing (OIDC provenance)

## [1.7.4] - 2026-02-10

### Fixed
- Fix all ESLint errors (0 errors, 59 warnings remaining — all `no-explicit-any` in tests)
- Replace `@ts-ignore` with `@ts-expect-error` + descriptions
- Remove unused imports (`SoundCloudClient`, `useState`, `act`, `useSoundCloudContext`, `setupAuth`)
- Prefix unused state vars with underscore (`_refreshToken`, `_expiresAt`)

## [1.7.3] - 2026-02-10

### Fixed
- Added `llms.txt`, `llms-full.txt`, and `AGENTS.md` to npm `files` field — these were missing from published packages
- Updated CHANGELOG with v1.7.1 and v1.7.2 entries

## [1.7.2] - 2026-02-10

### Fixed
- Added `typesVersions` to `package.json` for compatibility with `moduleResolution: "node"` — fixes `Cannot find module 'soundcloud-api-ts-next/server'` in older TypeScript/Next.js projects

## [1.7.1] - 2026-02-10

### Changed
- Documentation updates for v1.7.0 features shipped to npm
- CHANGELOG, README, llms.txt, llms-full.txt all updated with getToken, /resolve, useResolve details
- Regenerated TypeDoc API docs

## [1.7.0] - 2026-02-10

### Added
- **Custom token provider** (`getToken`) on `SoundCloudRoutesConfig` — pass an async function that returns a token instead of using client credentials. Enables apps that store OAuth tokens in Redis, databases, or other external stores.
- **`/resolve` server route** — resolve SoundCloud URLs (e.g. `https://soundcloud.com/artist/track`) to API resources via `GET /resolve?url=`
- **`resolveUrl` method** on the object returned by `createSoundCloudRoutes()` for direct server-side URL resolution
- **`useResolve` hook** — client-side SoundCloud URL resolution

## [1.6.0] - 2026-02-10

### Added
- 100% test coverage across all metrics (statements, branches, functions, lines)
- Coverage badge in README
- 273 tests (up from 244)

### Fixed
- AbortError handling coverage for all hooks
- Infinite pagination edge case coverage (unmount during fetch, loadMore with no next_href)
- Provider cancelled-state coverage for auth fetch
- Server routes edge case coverage (PKCE cleanup, pagesHandler error paths)

## [1.5.0] - 2026-02-10

### Added
- Test suite with vitest + React Testing Library
- CI pipeline (lint, build, test on push/PR)
- ESLint configuration with TypeScript + React Hooks rules
- CHANGELOG.md, CONTRIBUTING.md, SECURITY.md
- Examples directory with minimal Next.js app

## [1.4.1] - 2026-02-10

### Added
- `llms.txt` and `llms-full.txt` for LLM/agent discoverability
- TypeDoc documentation site deployed to GitHub Pages
- API docs link in README

## [1.4.0] - 2026-02-10

### Added
- Comprehensive JSDoc on all 35+ exported functions, hooks, types, and interfaces
- Every export includes description, @param, @returns, @example, and @see tags

## [1.3.0] - 2026-02-10

### Added
- Full OAuth 2.1 authentication with PKCE
- `useSCAuth()` hook with login/logout/handleCallback
- Authenticated hooks: `useMe`, `useMeTracks`, `useMeLikes`, `useMePlaylists`, `useMeFollowings`, `useMeFollowers`
- Action hooks: `useLike`, `useFollow`, `useRepost`
- Server auth routes: /auth/login, /auth/callback, /auth/refresh, /auth/logout
- Server me routes: /me, /me/tracks, /me/likes, /me/playlists, /me/followings, /me/followers
- Server action routes: POST/DELETE for like, follow, repost on tracks/playlists/users

## [1.2.0] - 2026-02-10

### Added
- 10 infinite scroll hooks with cursor-based pagination
- Generic `useInfinite<T>` base hook with `loadMore()` and `reset()`
- `/next?url=` server route for cursor forwarding
- `InfiniteResult<T>` type

## [1.1.0] - 2026-02-10

### Added
- Full API coverage: 12 new hooks for users, tracks, playlists
- 11 new server routes
- `useUserSearch`, `usePlaylistSearch`, `usePlaylist`, `usePlaylistTracks`
- `useUserTracks`, `useUserPlaylists`, `useUserLikes`, `useUserFollowers`, `useUserFollowings`
- `useTrackComments`, `useTrackLikes`, `useRelatedTracks`

## [1.0.0] - 2026-02-10

### Added
- Initial release
- Core hooks: `useTrack`, `useTrackSearch`, `useUser`, `usePlayer`
- `SoundCloudProvider` component
- Server route handlers with `createSoundCloudRoutes()`
- Support for Next.js App Router and Pages Router
- Dual CJS/ESM build via tsup
