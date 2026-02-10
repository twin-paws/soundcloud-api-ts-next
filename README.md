# soundcloud-api-ts-next

Next.js integration for [soundcloud-api-ts](https://github.com/twin-paws/soundcloud-api-ts) — React hooks + secure API route handlers.

## Installation

```bash
npm install soundcloud-api-ts-next
# or
pnpm add soundcloud-api-ts-next
```

## Setup

### 1. Server Routes

Create an API route handler that proxies SoundCloud requests (keeps your credentials server-side).

**App Router** (`app/api/soundcloud/[...route]/route.ts`):

```ts
import { createSoundCloudRoutes } from "soundcloud-api-ts-next/server";

const sc = createSoundCloudRoutes({
  clientId: process.env.SOUNDCLOUD_CLIENT_ID!,
  clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET!,
});

const handler = sc.handler();
export const GET = handler;
```

**Pages Router** (`pages/api/soundcloud/[...route].ts`):

```ts
import { createSoundCloudRoutes } from "soundcloud-api-ts-next/server";

const sc = createSoundCloudRoutes({
  clientId: process.env.SOUNDCLOUD_CLIENT_ID!,
  clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET!,
});

export default sc.pagesHandler();
```

### 2. Client Provider

Wrap your app with the `SoundCloudProvider`:

```tsx
import { SoundCloudProvider } from "soundcloud-api-ts-next";

export default function Layout({ children }) {
  return (
    <SoundCloudProvider apiPrefix="/api/soundcloud">
      {children}
    </SoundCloudProvider>
  );
}
```

## Hooks

All hooks return `{ data, loading, error }`.

### Tracks

| Hook | Arguments | Description |
|------|-----------|-------------|
| `useTrack(trackId)` | `string \| number \| undefined` | Fetch a single track |
| `useTrackSearch(query, options?)` | `string`, `{ limit? }` | Search tracks |
| `useTrackComments(trackId)` | `string \| number \| undefined` | Get track comments |
| `useTrackLikes(trackId)` | `string \| number \| undefined` | Get users who liked a track |
| `useRelatedTracks(trackId)` | `string \| number \| undefined` | Get related tracks |

### Users

| Hook | Arguments | Description |
|------|-----------|-------------|
| `useUser(userId)` | `string \| number \| undefined` | Fetch a single user |
| `useUserSearch(query)` | `string` | Search users |
| `useUserTracks(userId)` | `string \| number \| undefined` | Get a user's tracks |
| `useUserPlaylists(userId)` | `string \| number \| undefined` | Get a user's playlists |
| `useUserLikes(userId)` | `string \| number \| undefined` | Get a user's liked tracks |
| `useUserFollowers(userId)` | `string \| number \| undefined` | Get a user's followers |
| `useUserFollowings(userId)` | `string \| number \| undefined` | Get a user's followings |

### Playlists

| Hook | Arguments | Description |
|------|-----------|-------------|
| `usePlaylist(playlistId)` | `string \| number \| undefined` | Fetch a single playlist |
| `usePlaylistTracks(playlistId)` | `string \| number \| undefined` | Get tracks in a playlist |
| `usePlaylistSearch(query)` | `string` | Search playlists |

### Player

| Hook | Arguments | Description |
|------|-----------|-------------|
| `usePlayer(streamUrl)` | `string \| undefined` | Audio player with play/pause/seek |

## Server Routes

All routes are available via the catch-all handler and as individual methods on the routes object.

### Search

| Route | Method | Description |
|-------|--------|-------------|
| `GET /search/tracks?q=...` | `searchTracks(q, page?)` | Search tracks |
| `GET /search/users?q=...` | `searchUsers(q)` | Search users |
| `GET /search/playlists?q=...` | `searchPlaylists(q)` | Search playlists |

### Tracks

| Route | Method | Description |
|-------|--------|-------------|
| `GET /tracks/:id` | `getTrack(id)` | Get track details |
| `GET /tracks/:id/stream` | `getTrackStreams(id)` | Get stream URLs |
| `GET /tracks/:id/comments` | `getTrackComments(id)` | Get track comments |
| `GET /tracks/:id/likes` | `getTrackLikes(id)` | Get track likes |
| `GET /tracks/:id/related` | `getRelatedTracks(id)` | Get related tracks |

### Users

| Route | Method | Description |
|-------|--------|-------------|
| `GET /users/:id` | `getUser(id)` | Get user details |
| `GET /users/:id/tracks` | `getUserTracks(id, limit?)` | Get user's tracks |
| `GET /users/:id/playlists` | `getUserPlaylists(id)` | Get user's playlists |
| `GET /users/:id/likes/tracks` | `getUserLikesTracks(id)` | Get user's liked tracks |
| `GET /users/:id/followers` | `getFollowers(id)` | Get user's followers |
| `GET /users/:id/followings` | `getFollowings(id)` | Get user's followings |

### Playlists

| Route | Method | Description |
|-------|--------|-------------|
| `GET /playlists/:id` | `getPlaylist(id)` | Get playlist details |
| `GET /playlists/:id/tracks` | `getPlaylistTracks(id)` | Get playlist tracks |

## Pagination / Infinite Scroll

All paginated endpoints have `useInfinite*` hooks that handle cursor-based pagination automatically:

```tsx
import { useInfiniteTrackSearch } from "soundcloud-api-ts-next";

function TrackList() {
  const { data, loading, error, hasMore, loadMore } = useInfiniteTrackSearch("lofi");

  return (
    <div>
      {data.map((track) => (
        <div key={track.id}>{track.title}</div>
      ))}
      {loading && <p>Loading...</p>}
      {error && <p>Error: {error.message}</p>}
      {hasMore && <button onClick={loadMore}>Load More</button>}
    </div>
  );
}
```

### Available infinite hooks

| Hook | Description |
| ---- | ----------- |
| `useInfiniteTrackSearch(query, options?)` | Paginated track search |
| `useInfiniteUserSearch(query, options?)` | Paginated user search |
| `useInfinitePlaylistSearch(query, options?)` | Paginated playlist search |
| `useInfiniteUserTracks(userId)` | User's tracks |
| `useInfiniteUserPlaylists(userId)` | User's playlists |
| `useInfiniteUserLikes(userId)` | User's liked tracks |
| `useInfiniteUserFollowers(userId)` | User's followers |
| `useInfiniteUserFollowings(userId)` | User's followings |
| `useInfiniteTrackComments(trackId)` | Track comments |
| `useInfinitePlaylistTracks(playlistId)` | Playlist tracks |

All hooks return `InfiniteResult<T>`:

```ts
interface InfiniteResult<T> {
  data: T[];        // accumulated items across all pages
  loading: boolean;
  error: Error | null;
  hasMore: boolean;  // true if more pages exist
  loadMore: () => void;
  reset: () => void; // clear and refetch from page 1
}
```

## Types

All SoundCloud types are re-exported from `soundcloud-api-ts`:

```ts
import type {
  SoundCloudTrack,
  SoundCloudUser,
  SoundCloudPlaylist,
  SoundCloudComment,
  SoundCloudStreams,
} from "soundcloud-api-ts-next";
```

## License

MIT
