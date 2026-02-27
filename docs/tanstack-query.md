# Using scFetchers with TanStack Query or SWR

`soundcloud-api-ts-next` ships **headless fetchers** and **query key factories** that let you
drop SoundCloud data fetching into any caching library — no dependency on TanStack Query or SWR
needed in this package.

## Setup

Configure the fetchers once, server-side:

```ts
// lib/sc.ts
import { configureFetchers } from "soundcloud-api-ts-next";

configureFetchers({
  clientId: process.env.SC_CLIENT_ID!,
  clientSecret: process.env.SC_CLIENT_SECRET!,
});
```

## TanStack Query

```tsx
import { useQuery, queryOptions } from "@tanstack/react-query";
import { scFetchers, scKeys } from "soundcloud-api-ts-next";

// Single track
function TrackCard({ id }: { id: number }) {
  const { data: track } = useQuery({
    queryKey: scKeys.track(id),
    queryFn: () => scFetchers.track(id),
  });
  return <h1>{track?.title}</h1>;
}

// Search
function SearchResults({ q }: { q: string }) {
  const { data } = useQuery({
    queryKey: scKeys.searchTracks(q, 20),
    queryFn: () => scFetchers.searchTracks(q, 20),
    enabled: q.length > 0,
  });
  return <ul>{data?.collection.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
}

// Authenticated — current user profile
function MyProfile({ token }: { token: string }) {
  const { data: me } = useQuery({
    queryKey: scKeys.me(),
    queryFn: () => scFetchers.me(token),
  });
  return <p>{me?.username}</p>;
}
```

### Server-side prefetch (App Router RSC)

```tsx
// app/tracks/[id]/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { scFetchers, scKeys } from "soundcloud-api-ts-next";

export default async function TrackPage({ params }: { params: { id: string } }) {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: scKeys.track(params.id),
    queryFn: () => scFetchers.track(params.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TrackClient id={params.id} />
    </HydrationBoundary>
  );
}
```

## SWR

```tsx
import useSWR from "swr";
import { scFetchers, scKeys } from "soundcloud-api-ts-next";

// Single track
function TrackCard({ id }: { id: number }) {
  const key = scKeys.track(id);
  const { data: track } = useSWR(key, () => scFetchers.track(id));
  return <h1>{track?.title}</h1>;
}

// Search (skip when empty)
function SearchResults({ q }: { q: string }) {
  const key = q ? scKeys.searchTracks(q) : null; // null skips the fetch
  const { data } = useSWR(key, () => scFetchers.searchTracks(q));
  return <ul>{data?.collection.map(t => <li key={t.id}>{t.title}</li>)}</ul>;
}
```

## Query key structure

All keys start with `["sc"]` so you can invalidate the entire SoundCloud cache at once:

```ts
// Invalidate everything SoundCloud-related
queryClient.invalidateQueries({ queryKey: scKeys.all() });
// ["sc"]

// Individual key shapes:
scKeys.track(123)             // ["sc", "track", "123"]
scKeys.tracks([1, 2, 3])      // ["sc", "tracks", "1,2,3"]
scKeys.user(456)              // ["sc", "user", "456"]
scKeys.playlist(789)          // ["sc", "playlist", "789"]
scKeys.searchTracks("lofi")   // ["sc", "search", "tracks", "lofi", "default"]
scKeys.searchTracks("lofi", 20) // ["sc", "search", "tracks", "lofi", 20]
scKeys.searchUsers("dj")      // ["sc", "search", "users", "dj", "default"]
scKeys.me()                   // ["sc", "me"]
scKeys.meConnections()        // ["sc", "me", "connections"]
```

## Per-call token override

All `scFetchers` accept an optional `token` argument for user-scoped calls:

```ts
// Public call — uses client credentials automatically
const track = await scFetchers.track(123);

// User-scoped — override with OAuth token
const me = await scFetchers.me(userAccessToken);
const track = await scFetchers.track(123, userAccessToken);
```
