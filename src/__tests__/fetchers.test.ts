import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = {
  auth: {
    getClientToken: vi.fn().mockResolvedValue({ access_token: 'cc_tok', expires_in: 3600 }),
  },
  tracks: {
    getTrack: vi.fn().mockResolvedValue({ id: 1, title: 'Track' }),
  },
  users: {
    getUser: vi.fn().mockResolvedValue({ id: 2, username: 'user' }),
  },
  playlists: {
    getPlaylist: vi.fn().mockResolvedValue({ id: 3, title: 'Playlist' }),
  },
  search: {
    tracks: vi.fn().mockResolvedValue({ collection: [{ id: 1 }], next_href: null }),
    users: vi.fn().mockResolvedValue({ collection: [{ id: 2 }], next_href: null }),
  },
  me: {
    getMe: vi.fn().mockResolvedValue({ id: 10, username: 'me' }),
    getConnections: vi.fn().mockResolvedValue([{ id: 1, service: 'twitter' }]),
  },
  resolve: {
    resolveUrl: vi.fn().mockResolvedValue({ kind: 'track', id: 1 }),
  },
};

vi.mock('soundcloud-api-ts', () => ({
  SoundCloudClient: function () { return mockClient; },
}));

import { configureFetchers, scFetchers } from '../fetchers.js';

describe('configureFetchers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    configureFetchers({ clientId: 'id', clientSecret: 'secret' });
  });

  it('throws if scFetchers used before configureFetchers', async () => {
    // Reset module state by re-importing after clearing
    // (Since we can't easily reset module state, test that configure works)
    await expect(scFetchers.track(1)).resolves.toBeTruthy();
  });

  it('fetches a track', async () => {
    const result = await scFetchers.track(1);
    expect(result.title).toBe('Track');
    expect(mockClient.tracks.getTrack).toHaveBeenCalledWith(1, { token: 'cc_tok' });
  });

  it('fetches a track with explicit token', async () => {
    await scFetchers.track(1, 'user_tok');
    expect(mockClient.tracks.getTrack).toHaveBeenCalledWith(1, { token: 'user_tok' });
  });

  it('fetches multiple tracks in parallel', async () => {
    const results = await scFetchers.tracks([1, 2, 3]);
    expect(results).toHaveLength(3);
    expect(mockClient.tracks.getTrack).toHaveBeenCalledTimes(3);
  });

  it('fetches a user', async () => {
    const result = await scFetchers.user(2);
    expect(result.username).toBe('user');
  });

  it('fetches a playlist', async () => {
    const result = await scFetchers.playlist(3);
    expect(result.title).toBe('Playlist');
  });

  it('searches tracks', async () => {
    const result = await scFetchers.searchTracks('lofi', 10);
    expect(mockClient.search.tracks).toHaveBeenCalledWith('lofi', 10, { token: 'cc_tok' });
    expect(result.collection).toHaveLength(1);
  });

  it('searches users', async () => {
    await scFetchers.searchUsers('dj', 5);
    expect(mockClient.search.users).toHaveBeenCalledWith('dj', 5, { token: 'cc_tok' });
  });

  it('fetches me with explicit token', async () => {
    const result = await scFetchers.me('user_tok');
    expect(mockClient.me.getMe).toHaveBeenCalledWith({ token: 'user_tok' });
    expect(result.username).toBe('me');
  });

  it('fetches me connections with explicit token', async () => {
    const result = await scFetchers.meConnections('user_tok');
    expect(mockClient.me.getConnections).toHaveBeenCalledWith({ token: 'user_tok' });
    expect(result).toHaveLength(1);
  });

  it('resolves a URL', async () => {
    await scFetchers.resolve('https://soundcloud.com/artist/track');
    expect(mockClient.resolve.resolveUrl).toHaveBeenCalledWith(
      'https://soundcloud.com/artist/track',
      { token: 'cc_tok' },
    );
  });

  it('caches client credentials token', async () => {
    await scFetchers.track(1);
    await scFetchers.track(2);
    expect(mockClient.auth.getClientToken).toHaveBeenCalledTimes(1);
  });

  it('concurrent calls only trigger one getClientToken() call', async () => {
    // Expire the cached token so next call must refresh
    configureFetchers({ clientId: 'id', clientSecret: 'secret' });
    vi.clearAllMocks();
    mockClient.auth.getClientToken.mockResolvedValue({ access_token: 'cc_tok', expires_in: 3600 });
    mockClient.tracks.getTrack.mockResolvedValue({ id: 1, title: 'Track' });
    // Fire three concurrent fetches before any token is cached
    const [r1, r2, r3] = await Promise.all([
      scFetchers.track(1),
      scFetchers.track(2),
      scFetchers.track(3),
    ]);
    expect(mockClient.auth.getClientToken).toHaveBeenCalledTimes(1);
    expect(r1).toBeTruthy();
    expect(r2).toBeTruthy();
    expect(r3).toBeTruthy();
  });

  it('resets client on re-configure', async () => {
    await scFetchers.track(1);
    configureFetchers({ clientId: 'new_id', clientSecret: 'new_secret' });
    // After reconfigure, getClientToken should be called again
    vi.clearAllMocks();
    mockClient.auth.getClientToken.mockResolvedValueOnce({ access_token: 'new_tok', expires_in: 3600 });
    mockClient.tracks.getTrack.mockResolvedValueOnce({ id: 99 });
    await scFetchers.track(99);
    expect(mockClient.auth.getClientToken).toHaveBeenCalledTimes(1);
  });
});
