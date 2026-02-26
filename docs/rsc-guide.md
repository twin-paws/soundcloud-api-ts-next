# React Server Components (RSC) Guide

`soundcloud-api-ts-next` provides two ways to fetch SoundCloud data in Next.js App Router:

1. **Client hooks** (`useTrack`, `useUser`, etc.) — run in Client Components, show loading states, work great for interactive UIs.
2. **Server helpers** (`getTrack`, `getUser`, etc.) — run in React Server Components, zero client JS, support `next/cache` for ISR and on-demand revalidation.

---

## When to use what

| | Server helpers (RSC) | Client hooks |
|---|---|---|
| **Runs in** | Server (no client JS shipped) | Client browser |
| **Loading state** | No — data is ready on render | Yes — `loading: boolean` |
| **next/cache support** | Yes — `revalidate`, `tags` | No |
| **SEO / initial HTML** | Yes — data in first HTML | No — requires hydration |
| **Best for** | Static/ISR pages, SEO content, heavy data | Interactive filters, pagination, auth-gated UIs |
| **Auth (user token)** | Via `getToken` / `config.token` | Via `useSCAuth` hook |

---

## createSoundCloudServerClient

`createSoundCloudServerClient` is a thin factory that creates a typed `SoundCloudClient` instance for use in Server Components, Route Handlers, and Server Actions. It optionally resolves a user access token via `getToken`.

### Basic usage (public data)

```ts
// app/artist/[id]/page.tsx
import { createSoundCloudServerClient } from "soundcloud-api-ts-next/server";

export default async function ArtistPage({ params }: { params: { id: string } }) {
  const sc = await createSoundCloudServerClient({
    clientId: process.env.SC_CLIENT_ID!,
    clientSecret: process.env.SC_CLIENT_SECRET!,
  });

  // Get a client credentials token for public endpoints
  const tokenResult = await sc.client.auth.getClientToken();
  const token = tokenResult.access_token;

  const user = await sc.client.users.getUser(params.id, { token });
  return <ArtistView user={user} />;
}
```

### With user token injection (authenticated data)

```ts
// app/dashboard/page.tsx
import { createSoundCloudServerClient } from "soundcloud-api-ts-next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const sc = await createSoundCloudServerClient({
    clientId: process.env.SC_CLIENT_ID!,
    clientSecret: process.env.SC_CLIENT_SECRET!,
    getToken: () => cookies().get("sc_access_token")?.value,
  });

  if (!sc.token()) redirect("/login");

  // sc.token() is pre-resolved and ready to pass directly
  const me = await sc.client.me.getMe({ token: sc.token()! });
  return <Dashboard user={me} />;
}
```

---

## Server helper functions

Server helpers are standalone functions that handle client-credential token management and optional `next/cache` integration for you. Use them for the most common patterns.

### getTrack

```ts
// app/tracks/[id]/page.tsx
import { getTrack, scCacheKeys } from "soundcloud-api-ts-next/server";

const config = {
  clientId: process.env.SC_CLIENT_ID!,
  clientSecret: process.env.SC_CLIENT_SECRET!,
};

export default async function TrackPage({ params }: { params: { id: string } }) {
  const track = await getTrack(params.id, config, {
    revalidate: 3600,                        // Revalidate every hour
    tags: scCacheKeys.track(params.id),      // Tag for on-demand revalidation
  });

  return (
    <article>
      <h1>{track.title}</h1>
      <p>by {track.user?.username}</p>
    </article>
  );
}
```

### searchTracks

```ts
// app/search/page.tsx
import { searchTracks, scCacheKeys } from "soundcloud-api-ts-next/server";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q ?? "";
  const results = await searchTracks(q, config, {
    revalidate: 300,                          // Cache for 5 minutes
    tags: scCacheKeys.searchTracks(q),
  });

  return (
    <ul>
      {results.collection.map((track) => (
        <li key={track.id}>{track.title}</li>
      ))}
    </ul>
  );
}
```

### getUser

```ts
// app/users/[id]/page.tsx
import { getUser, scCacheKeys } from "soundcloud-api-ts-next/server";

export default async function UserPage({ params }: { params: { id: string } }) {
  const user = await getUser(params.id, config, {
    revalidate: 3600,
    tags: scCacheKeys.user(params.id),
  });

  return <UserProfile user={user} />;
}
```

### getPlaylist

```ts
// app/playlists/[id]/page.tsx
import { getPlaylist, scCacheKeys } from "soundcloud-api-ts-next/server";

export default async function PlaylistPage({ params }: { params: { id: string } }) {
  const playlist = await getPlaylist(params.id, config, {
    revalidate: 1800,
    tags: scCacheKeys.playlist(params.id),
  });

  return <PlaylistView playlist={playlist} />;
}
```

### getMe (authenticated)

```ts
// app/profile/page.tsx
import { getMe, scCacheKeys } from "soundcloud-api-ts-next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function ProfilePage() {
  const token = cookies().get("sc_access_token")?.value;
  if (!token) redirect("/login");

  const me = await getMe(
    { clientId: process.env.SC_CLIENT_ID!, clientSecret: process.env.SC_CLIENT_SECRET!, token },
    { revalidate: 300, tags: scCacheKeys.me() },
  );

  return <ProfileView user={me} />;
}
```

---

## scCacheKeys

`scCacheKeys` provides consistent cache key arrays for `unstable_cache` and `revalidateTag`. Each helper returns a `string[]` that you can pass directly as `tags`.

```ts
import { scCacheKeys } from "soundcloud-api-ts-next/server";

scCacheKeys.track(123)          // ["sc", "track", "123"]
scCacheKeys.user(456)           // ["sc", "user", "456"]
scCacheKeys.playlist(789)       // ["sc", "playlist", "789"]
scCacheKeys.searchTracks("lo-fi") // ["sc", "search", "tracks", "lo-fi"]
scCacheKeys.me()                // ["sc", "me"]
```

### Using with revalidateTag

`revalidateTag` matches a tag string against any cached entry that includes that tag. Because `scCacheKeys` returns arrays, join them with a separator (e.g. `":"`) or pass individual elements as separate tags:

```ts
// app/api/revalidate/route.ts
import { revalidateTag } from "next/cache";
import { scCacheKeys } from "soundcloud-api-ts-next/server";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  const { type, id } = await req.json();

  if (type === "track") {
    // Invalidate all caches tagged with any element of scCacheKeys.track(id)
    for (const tag of scCacheKeys.track(id)) {
      revalidateTag(tag);
    }
  }
  if (type === "all") {
    revalidateTag("sc"); // Invalidates everything tagged with "sc"
  }

  return new Response("Revalidated", { status: 200 });
}
```

---

## Cache patterns

### force-cache (default)

Omit `revalidate` to use Next.js default caching (indefinite, until the cache is cleared or revalidated):

```ts
const track = await getTrack(123, config);
// Cached indefinitely — good for stable data like archived tracks
```

### Time-based revalidation (ISR)

```ts
const track = await getTrack(123, config, { revalidate: 3600 });
// Cached for 1 hour, then stale-while-revalidate
```

### no-store (always fresh)

```ts
const me = await getMe(config, { revalidate: false });
// Never cached — always fetches fresh data
```

### On-demand revalidation with revalidateTag

```ts
// 1. Fetch with tags
const track = await getTrack(123, config, {
  revalidate: 3600,
  tags: scCacheKeys.track(123),
});

// 2. Trigger revalidation from a Route Handler or Server Action
import { revalidateTag } from "next/cache";
revalidateTag("sc"); // Bust all sc:* caches
// or fine-grained:
revalidateTag(scCacheKeys.track(123).join(":")); // Only bust this track
```

---

## Side-by-side: RSC server helper vs. client hook

```tsx
// ── RSC (Server Component) ─────────────────────────────────────────────────
// app/tracks/[id]/page.tsx
import { getTrack, scCacheKeys } from "soundcloud-api-ts-next/server";

export default async function TrackPage({ params }: { params: { id: string } }) {
  // Data fetched on the server; no loading state; no client JS
  const track = await getTrack(params.id, config, {
    revalidate: 3600,
    tags: scCacheKeys.track(params.id),
  });
  return <TrackView track={track} />;
}


// ── Client hook (Client Component) ────────────────────────────────────────
// components/TrackCard.tsx
"use client";
import { useTrack } from "soundcloud-api-ts-next";

export function TrackCard({ id }: { id: number }) {
  // Data fetched in the browser; has loading/error state; interactive
  const { data: track, loading, error } = useTrack(id);

  if (loading) return <Skeleton />;
  if (error) return <ErrorView error={error} />;
  if (!track) return null;
  return <TrackView track={track} />;
}
```

**Rule of thumb:**
- Start with the RSC helper for any data needed at render time (SEO, initial content).
- Use the client hook when you need real-time updates, interactive filtering, or the data depends on client-side state (e.g. user input).
