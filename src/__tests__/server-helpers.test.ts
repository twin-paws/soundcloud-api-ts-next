import { describe, it, expect, vi, beforeEach } from 'vitest';
import { scCacheKeys } from '../cache-keys.js';

const mockClient = {
  auth: {
    getClientToken: vi.fn().mockResolvedValue({ access_token: 'cc_tok', refresh_token: 'cc_ref', expires_in: 3600 }),
    refreshToken: vi.fn(),
  },
  tracks: { getTrack: vi.fn().mockResolvedValue({ id: 1, title: 'Track' }) },
  users: { getUser: vi.fn().mockResolvedValue({ id: 2, username: 'user' }) },
  playlists: { getPlaylist: vi.fn().mockResolvedValue({ id: 3, title: 'Playlist' }) },
  search: { tracks: vi.fn().mockResolvedValue({ collection: [{ id: 1 }], next_href: null }) },
  me: { getMe: vi.fn().mockResolvedValue({ id: 10, username: 'me' }) },
};

const ctorConfigs: unknown[] = [];

vi.mock('soundcloud-api-ts', () => ({
  SoundCloudClient: function (config: unknown) {
    ctorConfigs.push(config);
    return mockClient;
  },
  SoundCloudError: class SoundCloudError extends Error {
    isInvalidGrant = false;
  },
}));

const config = { clientId: 'id', clientSecret: 'secret' };

/** Fresh module instance per test so the per-credential client/token maps start empty. */
async function loadHelpers() {
  vi.resetModules();
  return import('../server-helpers.js');
}

beforeEach(() => {
  vi.clearAllMocks();
  ctorConfigs.length = 0;
  vi.doUnmock('next/cache');
});

describe('scCacheKeys', () => {
  it('builds key parts for every resource', () => {
    expect(scCacheKeys.track(1)).toEqual(['sc', 'track', '1']);
    expect(scCacheKeys.user('2')).toEqual(['sc', 'user', '2']);
    expect(scCacheKeys.playlist(3)).toEqual(['sc', 'playlist', '3']);
    expect(scCacheKeys.searchTracks('lofi')).toEqual(['sc', 'search', 'tracks', 'lofi']);
    expect(scCacheKeys.me()).toEqual(['sc', 'me']);
  });
});

describe('server helpers with next/cache available', () => {
  const unstable_cache = vi.fn((fn: () => Promise<unknown>) => fn);

  beforeEach(() => {
    unstable_cache.mockClear();
    vi.doMock('next/cache', () => ({ unstable_cache }));
  });

  it('getTrack wraps the fetch in unstable_cache with key parts and cache options', async () => {
    const { getTrack } = await loadHelpers();
    const track = await getTrack(1, config, { revalidate: 60, tags: ['t'] });
    expect(track).toEqual({ id: 1, title: 'Track' });
    expect(unstable_cache).toHaveBeenCalledWith(expect.any(Function), ['sc', 'track', '1'], { revalidate: 60, tags: ['t'] });
    expect(mockClient.tracks.getTrack).toHaveBeenCalledWith(1, { token: 'cc_tok' });
  });

  it('passes undefined cache options through when none are given', async () => {
    const { getUser } = await loadHelpers();
    await getUser(2, config);
    expect(unstable_cache).toHaveBeenCalledWith(expect.any(Function), ['sc', 'user', '2'], { revalidate: undefined, tags: undefined });
    expect(mockClient.users.getUser).toHaveBeenCalledWith(2, { token: 'cc_tok' });
  });

  it('searchTracks and getPlaylist use the client-credentials token', async () => {
    const { searchTracks, getPlaylist } = await loadHelpers();
    expect((await searchTracks('lofi', config)).collection).toHaveLength(1);
    expect(mockClient.search.tracks).toHaveBeenCalledWith('lofi', undefined, { token: 'cc_tok' });
    expect(await getPlaylist(3, config)).toEqual({ id: 3, title: 'Playlist' });
    expect(mockClient.playlists.getPlaylist).toHaveBeenCalledWith(3, { token: 'cc_tok' });
  });

  it('reuses one client and one client-credentials token per credential pair', async () => {
    const { getTrack, getUser } = await loadHelpers();
    await getTrack(1, config);
    await getUser(2, config);
    await getTrack(1, { clientId: 'other', clientSecret: 'secret' });
    expect(ctorConfigs).toHaveLength(2);
    expect(mockClient.auth.getClientToken).toHaveBeenCalledTimes(2);
  });

  it('forwards onRequest and onRetry to the client', async () => {
    const onRequest = vi.fn();
    const onRetry = vi.fn();
    const { getTrack } = await loadHelpers();
    await getTrack(1, { ...config, onRequest, onRetry });
    expect(ctorConfigs[0]).toEqual({ clientId: 'id', clientSecret: 'secret', onRequest, onRetry });
  });

  it('uses a supplied token instead of minting a client-credentials token', async () => {
    const { getTrack } = await loadHelpers();
    await getTrack(1, { ...config, token: 'user_tok' });
    expect(mockClient.tracks.getTrack).toHaveBeenCalledWith(1, { token: 'user_tok' });
    expect(mockClient.auth.getClientToken).not.toHaveBeenCalled();
  });

  it('getMe requires a user token', async () => {
    const { getMe } = await loadHelpers();
    await expect(getMe(config)).rejects.toThrow(/requires a user access token/);
  });

  it('getMe fetches the profile with the user token', async () => {
    const { getMe } = await loadHelpers();
    expect(await getMe({ ...config, token: 'user_tok' })).toEqual({ id: 10, username: 'me' });
    expect(mockClient.me.getMe).toHaveBeenCalledWith({ token: 'user_tok' });
    expect(unstable_cache).toHaveBeenCalledWith(expect.any(Function), ['sc', 'me'], expect.any(Object));
  });
});

describe('server helpers outside a Next.js runtime', () => {
  it('calls the fetcher directly when next/cache cannot be imported', async () => {
    vi.doMock('next/cache', () => {
      throw new Error('Cannot find module next/cache');
    });
    const { getTrack } = await loadHelpers();
    expect(await getTrack(1, config)).toEqual({ id: 1, title: 'Track' });
  });

  it('calls the fetcher directly when next/cache has no unstable_cache', async () => {
    vi.doMock('next/cache', () => ({ unstable_cache: undefined }));
    const { getPlaylist } = await loadHelpers();
    expect(await getPlaylist(3, config)).toEqual({ id: 3, title: 'Playlist' });
  });
});

describe('createSoundCloudServerClient', () => {
  it('resolves the user token from getToken', async () => {
    vi.resetModules();
    const { createSoundCloudServerClient } = await import('../server/client.js');
    const onRequest = vi.fn();
    const sc = await createSoundCloudServerClient({ ...config, onRequest, getToken: async () => 'user_tok' });
    expect(sc.client).toBe(mockClient);
    expect(sc.userToken).toBe('user_tok');
    expect(sc.token()).toBe('user_tok');
    expect(ctorConfigs[ctorConfigs.length - 1]).toMatchObject({ clientId: 'id', clientSecret: 'secret', onRequest });
  });

  it('leaves the user token undefined without getToken', async () => {
    vi.resetModules();
    const { createSoundCloudServerClient } = await import('../server/client.js');
    const sc = await createSoundCloudServerClient(config);
    expect(sc.userToken).toBeUndefined();
    expect(sc.token()).toBeUndefined();
  });
});
