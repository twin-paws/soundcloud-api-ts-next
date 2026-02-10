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
