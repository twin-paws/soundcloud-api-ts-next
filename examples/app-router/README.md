# App Router Example

Full-featured example showing `soundcloud-api-ts-next` with Next.js App Router.

## Files

| File | Purpose |
|---|---|
| `route.ts` | Catch-all API route with allowlist, cache headers, CORS, CSRF protection |
| `TrackPage.tsx` | RSC using `createSoundCloudServerClient` + `next/cache` revalidation |
| `TrackClient.tsx` | Client component using `useTrack` + `usePlayer` with `enabled` / `refreshInterval` |
| `LoginButton.tsx` | Client component using `useSCAuth` for OAuth login/logout |
| `auth/callback/route.ts` | OAuth callback handler using `SCAuthManager` |

## Quick start

```bash
cp .env.example .env.local
# fill in SC_CLIENT_ID, SC_CLIENT_SECRET, NEXT_PUBLIC_BASE_URL
pnpm dev
```

## Environment variables

```bash
SC_CLIENT_ID=your_soundcloud_client_id
SC_CLIENT_SECRET=your_soundcloud_client_secret
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## Token persistence strategy

This example uses the built-in `SCAuthManager` which stores the PKCE verifier
in-memory. For **serverless or edge deployments** (Vercel, Cloudflare Workers)
where in-memory state doesn't persist across function invocations, use
`CookiePkceStore` instead:

```ts
import { createSCAuthManager, CookiePkceStore } from "soundcloud-api-ts-next/server";

const store = new CookiePkceStore(process.env.COOKIE_SECRET!);
const scAuth = createSCAuthManager({
  clientId: process.env.SC_CLIENT_ID!,
  clientSecret: process.env.SC_CLIENT_SECRET!,
  redirectUri: process.env.SC_REDIRECT_URI!,
  pkceStore: store,
});
```

See [`docs/auth-distributed.md`](../../docs/auth-distributed.md) for the full guide.

## Route hardening

The `route.ts` example demonstrates all WS-D features:

```ts
const sc = createSoundCloudRoutes({
  // ...credentials...

  routes: {
    allowlist: ["tracks", "search", "resolve", "auth", "me"],
  },

  cacheHeaders: {
    tracks: "public, max-age=60, stale-while-revalidate=300",
    me: "no-store",
    default: "public, max-age=30",
  },

  cors: {
    origin: "https://myapp.com",
    methods: ["GET", "POST", "DELETE"],
  },

  csrfProtection: true,
});
```

Error responses from all routes now use a consistent JSON envelope:

```json
{
  "code": "NOT_FOUND",
  "message": "Not found",
  "status": 404,
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

## Using scFetchers with TanStack Query

```tsx
import { useQuery } from "@tanstack/react-query";
import { scFetchers, scKeys } from "soundcloud-api-ts-next";

function TrackCard({ id }: { id: number }) {
  const { data } = useQuery({
    queryKey: scKeys.track(id),
    queryFn: () => scFetchers.track(id),
  });
  return <h1>{data?.title}</h1>;
}
```

See [`docs/tanstack-query.md`](../../docs/tanstack-query.md) for full TanStack Query and SWR examples.
