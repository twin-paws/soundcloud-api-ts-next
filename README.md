# soundcloud-api-ts-next

React hooks and Next.js API route handlers for the SoundCloud API. Client secrets stay on the server.

Built on top of [`soundcloud-api-ts`](https://github.com/twin-paws/soundcloud-api-ts).

## Install

```bash
pnpm add soundcloud-api-ts-next soundcloud-api-ts
```

## Quick Start

### 1. Set up the API route (App Router)

```ts
// app/api/soundcloud/[...route]/route.ts
import { createSoundCloudRoutes } from "soundcloud-api-ts-next/server";

const sc = createSoundCloudRoutes({
  clientId: process.env.SC_CLIENT_ID!,
  clientSecret: process.env.SC_CLIENT_SECRET!,
});

export const GET = sc.handler();
```

### 2. Wrap your app with the provider

```tsx
// app/layout.tsx
import { SoundCloudProvider } from "soundcloud-api-ts-next";

export default function RootLayout({ children }) {
  return (
    <SoundCloudProvider apiPrefix="/api/soundcloud">
      {children}
    </SoundCloudProvider>
  );
}
```

### 3. Use hooks in your components

```tsx
"use client";
import { useTrackSearch } from "soundcloud-api-ts-next";

export function Search() {
  const { data, loading, error } = useTrackSearch("lofi beats", { limit: 10 });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <ul>
      {data?.map((track) => (
        <li key={track.id}>{track.title}</li>
      ))}
    </ul>
  );
}
```

## Pages Router Setup

```ts
// pages/api/soundcloud/[...route].ts
import { createSoundCloudRoutes } from "soundcloud-api-ts-next/server";

const sc = createSoundCloudRoutes({
  clientId: process.env.SC_CLIENT_ID!,
  clientSecret: process.env.SC_CLIENT_SECRET!,
});

export default sc.pagesHandler();
```

## Hooks

### `useTrackSearch(query: string, options?: { limit?: number })`

Search for tracks. Returns `{ data: SoundCloudTrack[] | null, loading, error }`.

### `useTrack(trackId: string | number)`

Fetch a single track by ID. Returns `{ data: SoundCloudTrack | null, loading, error }`.

### `useUser(userId: string | number)`

Fetch a single user by ID. Returns `{ data: SoundCloudUser | null, loading, error }`.

### `usePlayer(trackId: string | number)`

Manages an HTML5 Audio element for streaming. Returns:

```ts
{
  playing: boolean;
  progress: number;  // current time in seconds
  duration: number;  // total duration in seconds
  play(): void;
  pause(): void;
  toggle(): void;
  seek(time: number): void;
}
```

## API Routes

The server handler supports these routes:

| Route | Description |
|---|---|
| `/search/tracks?q=...&page=...` | Search tracks |
| `/tracks/:id` | Get track by ID |
| `/tracks/:id/stream` | Get stream URLs for a track |
| `/users/:id` | Get user by ID |
| `/users/:id/tracks` | Get user's tracks |

## Provider

```tsx
<SoundCloudProvider apiPrefix="/api/soundcloud">
  {children}
</SoundCloudProvider>
```

The `apiPrefix` prop configures where the hooks send requests. Default: `"/api/soundcloud"`.

## License

MIT
