export type {
  SoundCloudTrack,
  SoundCloudUser,
  SoundCloudPlaylist,
  SoundCloudComment,
  SoundCloudStreams,
  SoundCloudPaginatedResponse,
  SoundCloudMe,
  SoundCloudWebProfile,
  SoundCloudActivity,
  SoundCloudActivitiesResponse,
} from "soundcloud-api-ts";

/** Configuration for server-side route handlers. */
export interface SoundCloudRoutesConfig {
  /** OAuth client ID */
  clientId: string;
  /** OAuth client secret */
  clientSecret: string;
}

/** Standard hook return shape. */
export interface HookResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/** Infinite/paginated hook return shape. */
export interface InfiniteResult<T> {
  /** Accumulated items across all fetched pages. */
  data: T[];
  /** True while any page is being fetched. */
  loading: boolean;
  /** The last fetch error, if any. */
  error: Error | null;
  /** True if a next page is available. */
  hasMore: boolean;
  /** Fetch the next page. No-op if loading or no more pages. */
  loadMore: () => void;
  /** Clear all data and refetch from the first page. */
  reset: () => void;
}

/** Player hook return shape. */
export interface PlayerState {
  playing: boolean;
  progress: number;
  duration: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
}
