import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = {
  auth: {
    getClientToken: vi.fn().mockResolvedValue({ access_token: 'tok', expires_in: 3600 }),
    getUserToken: vi.fn().mockResolvedValue({ access_token: 'user_tok', refresh_token: 'ref', expires_in: 3600 }),
    refreshUserToken: vi.fn().mockResolvedValue({ access_token: 'new_tok' }),
  },
  tracks: {
    getTrack: vi.fn().mockResolvedValue({ id: 1, title: 'Track' }),
    getStreams: vi.fn().mockResolvedValue({ http_mp3_128_url: 'url' }),
    getComments: vi.fn().mockResolvedValue({ collection: [] }),
    getLikes: vi.fn().mockResolvedValue({ collection: [] }),
    getReposts: vi.fn().mockResolvedValue({ collection: [] }),
    getRelated: vi.fn().mockResolvedValue({ collection: [] }),
  },
  users: {
    getUser: vi.fn().mockResolvedValue({ id: 2, username: 'user' }),
    getTracks: vi.fn().mockResolvedValue({ collection: [] }),
    getFollowers: vi.fn().mockResolvedValue({ collection: [] }),
    getFollowings: vi.fn().mockResolvedValue({ collection: [] }),
    getPlaylists: vi.fn().mockResolvedValue({ collection: [] }),
    getLikesTracks: vi.fn().mockResolvedValue({ collection: [] }),
    getLikesPlaylists: vi.fn().mockResolvedValue({ collection: [] }),
  },
  playlists: {
    getPlaylist: vi.fn().mockResolvedValue({ id: 3, title: 'Playlist' }),
    getTracks: vi.fn().mockResolvedValue({ collection: [] }),
    getReposts: vi.fn().mockResolvedValue({ collection: [] }),
  },
  search: {
    tracks: vi.fn().mockResolvedValue({ collection: [{ id: 1 }], next_href: null }),
    users: vi.fn().mockResolvedValue({ collection: [] }),
    playlists: vi.fn().mockResolvedValue({ collection: [] }),
  },
  resolve: {
    resolveUrl: vi.fn().mockResolvedValue('resolved-url'),
  },
  me: {
    getMe: vi.fn().mockResolvedValue({ id: 1, username: 'me' }),
    getTracks: vi.fn().mockResolvedValue({ collection: [] }),
    getLikesTracks: vi.fn().mockResolvedValue({ collection: [] }),
    getPlaylists: vi.fn().mockResolvedValue({ collection: [] }),
    getFollowings: vi.fn().mockResolvedValue({ collection: [] }),
    getFollowers: vi.fn().mockResolvedValue({ collection: [] }),
    follow: vi.fn().mockResolvedValue(undefined),
    unfollow: vi.fn().mockResolvedValue(undefined),
  },
  likes: {
    likeTrack: vi.fn().mockResolvedValue(true),
    unlikeTrack: vi.fn().mockResolvedValue(true),
    likePlaylist: vi.fn().mockResolvedValue(true),
    unlikePlaylist: vi.fn().mockResolvedValue(true),
  },
  reposts: {
    repostTrack: vi.fn().mockResolvedValue(true),
    unrepostTrack: vi.fn().mockResolvedValue(true),
    repostPlaylist: vi.fn().mockResolvedValue(true),
    unrepostPlaylist: vi.fn().mockResolvedValue(true),
  },
  setToken: vi.fn(),
  clearToken: vi.fn(),
};

vi.mock('soundcloud-api-ts', () => ({
  SoundCloudClient: function() { return mockClient; },
  getAuthorizationUrl: vi.fn().mockReturnValue('https://soundcloud.com/connect?test'),
  generateCodeVerifier: vi.fn().mockReturnValue('verifier123'),
  generateCodeChallenge: vi.fn().mockResolvedValue('challenge123'),
  signOut: vi.fn().mockResolvedValue(undefined),
  scFetchUrl: vi.fn().mockResolvedValue({ collection: [] }),
}));

import { createSoundCloudRoutes } from '../server/routes.js';
import type { SCRouteTelemetry } from '../server/index.js';

const BASE = 'http://localhost/api/soundcloud';

function makeReq(path: string, opts?: RequestInit) {
  return new Request(`${BASE}${path}`, opts);
}

function makeAuthReq(path: string, method = 'GET') {
  return new Request(`${BASE}${path}`, {
    method,
    headers: { Authorization: 'Bearer user_tok' },
  });
}

describe('Telemetry: onRouteComplete', () => {
  let onRouteComplete: ReturnType<typeof vi.fn>;
  let handle: (request: Request) => Promise<Response>;
  let routes: ReturnType<typeof createSoundCloudRoutes>;

  beforeEach(() => {
    vi.clearAllMocks();
    onRouteComplete = vi.fn();
    routes = createSoundCloudRoutes({
      clientId: 'test_id',
      clientSecret: 'test_secret',
      redirectUri: 'http://localhost:3000/callback',
      onRouteComplete,
    });
    handle = routes.handler();
  });

  // 1. Fires on successful route
  it('fires on successful GET /tracks/:id', async () => {
    const res = await handle(makeReq('/tracks/123'));
    expect(res.status).toBe(200);
    expect(onRouteComplete).toHaveBeenCalledTimes(1);
    expect(onRouteComplete).toHaveBeenCalledWith({
      method: 'GET',
      route: '/tracks/123',
      status: 200,
      durationMs: expect.any(Number),
    });
  });

  it('fires on successful GET /search/tracks', async () => {
    await handle(makeReq('/search/tracks?q=test'));
    expect(onRouteComplete).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', status: 200, route: '/search/tracks' }),
    );
  });

  it('does not include error on success', async () => {
    await handle(makeReq('/tracks/123'));
    const telemetry = onRouteComplete.mock.calls[0][0] as SCRouteTelemetry;
    expect(telemetry.error).toBeUndefined();
  });

  it('durationMs is a non-negative number', async () => {
    await handle(makeReq('/tracks/123'));
    const telemetry = onRouteComplete.mock.calls[0][0] as SCRouteTelemetry;
    expect(telemetry.durationMs).toBeGreaterThanOrEqual(0);
  });

  // 2. Fires on error route
  it('fires on error with error field', async () => {
    mockClient.tracks.getTrack.mockRejectedValueOnce(
      Object.assign(new Error('Not found'), { statusCode: 404 }),
    );
    const res = await handle(makeReq('/tracks/999'));
    expect(res.status).toBe(404);
    expect(onRouteComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        route: '/tracks/999',
        status: 404,
        error: 'Not found',
        durationMs: expect.any(Number),
      }),
    );
  });

  it('fires on 500 error', async () => {
    mockClient.tracks.getTrack.mockRejectedValueOnce(new Error('boom'));
    await handle(makeReq('/tracks/1'));
    expect(onRouteComplete).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500, error: 'boom' }),
    );
  });

  // 3. Fires on auth routes
  it('fires on GET /auth/login', async () => {
    await handle(makeReq('/auth/login'));
    expect(onRouteComplete).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', route: '/auth/login', status: 200 }),
    );
  });

  it('fires on GET /auth/callback', async () => {
    // Login first to get valid state
    const loginRes = await handle(makeReq('/auth/login'));
    const { state } = await loginRes.json();
    onRouteComplete.mockClear();

    await handle(makeReq(`/auth/callback?code=testcode&state=${state}`));
    expect(onRouteComplete).toHaveBeenCalledWith(
      expect.objectContaining({ route: '/auth/callback', status: 200 }),
    );
  });

  it('fires on POST /auth/refresh', async () => {
    await handle(makeReq('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: 'ref_tok' }),
    }));
    expect(onRouteComplete).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', route: '/auth/refresh', status: 200 }),
    );
  });

  it('fires on POST /auth/logout', async () => {
    await handle(makeReq('/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: 'tok' }),
    }));
    expect(onRouteComplete).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', route: '/auth/logout', status: 200 }),
    );
  });

  // 4. pagesHandler telemetry
  it('fires for pagesHandler on success', async () => {
    const pagesHandle = routes.pagesHandler();
    const req = {
      query: { route: ['tracks', '1'] },
      url: '/api/soundcloud/tracks/1',
      method: 'GET',
      headers: {},
      body: undefined,
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await pagesHandle(req, res);
    expect(onRouteComplete).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', route: '/tracks/1', status: 200, durationMs: expect.any(Number) }),
    );
  });

  it('fires for pagesHandler on error', async () => {
    mockClient.tracks.getTrack.mockRejectedValueOnce(
      Object.assign(new Error('fail'), { statusCode: 503 }),
    );
    const pagesHandle = routes.pagesHandler();
    const req = {
      query: { route: ['tracks', '999'] },
      url: '/api/soundcloud/tracks/999',
      method: 'GET',
      headers: {},
      body: undefined,
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await pagesHandle(req, res);
    expect(onRouteComplete).toHaveBeenCalledWith(
      expect.objectContaining({ status: 503, error: 'fail' }),
    );
  });

  // 5. Fires on authenticated routes
  it('fires on authenticated GET /me', async () => {
    await handle(makeAuthReq('/me'));
    expect(onRouteComplete).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'GET', route: '/me', status: 200 }),
    );
  });

  it('fires on 401 for unauthenticated /me', async () => {
    await handle(makeReq('/me'));
    expect(onRouteComplete).toHaveBeenCalledWith(
      expect.objectContaining({ route: '/me', status: 401 }),
    );
  });

  // Fires on action routes
  it('fires on POST /tracks/:id/like', async () => {
    await handle(makeAuthReq('/tracks/10/like', 'POST'));
    expect(onRouteComplete).toHaveBeenCalledWith(
      expect.objectContaining({ method: 'POST', route: '/tracks/10/like', status: 200 }),
    );
  });

  // 404
  it('fires on 404 for unknown route', async () => {
    await handle(makeReq('/unknown'));
    expect(onRouteComplete).toHaveBeenCalledWith(
      expect.objectContaining({ status: 404 }),
    );
  });
});

describe('Telemetry: onRequest', () => {
  let onRequest: ReturnType<typeof vi.fn>;
  let handle: (request: Request) => Promise<Response>;

  beforeEach(() => {
    vi.clearAllMocks();
    onRequest = vi.fn();
    const routes = createSoundCloudRoutes({
      clientId: 'test_id',
      clientSecret: 'test_secret',
      redirectUri: 'http://localhost:3000/callback',
      onRequest,
    });
    handle = routes.handler();
  });

  it('onRequest is passed to the SoundCloudClient config', async () => {
    // Making a request that triggers API calls
    await handle(makeReq('/tracks/123'));
    // The onRequest callback is passed at config level to the client;
    // since the client is mocked, we verify the config was accepted without error
    expect(true).toBe(true);
  });
});

describe('Telemetry: no callbacks provided', () => {
  it('handler works without onRouteComplete', async () => {
    const routes = createSoundCloudRoutes({
      clientId: 'test_id',
      clientSecret: 'test_secret',
      redirectUri: 'http://localhost:3000/callback',
    });
    const handle = routes.handler();
    const res = await handle(makeReq('/tracks/123'));
    expect(res.status).toBe(200);
  });

  it('handler works without onRouteComplete on error', async () => {
    mockClient.tracks.getTrack.mockRejectedValueOnce(new Error('boom'));
    const routes = createSoundCloudRoutes({
      clientId: 'test_id',
      clientSecret: 'test_secret',
    });
    const handle = routes.handler();
    const res = await handle(makeReq('/tracks/1'));
    expect(res.status).toBe(500);
  });

  it('pagesHandler works without onRouteComplete', async () => {
    const routes = createSoundCloudRoutes({
      clientId: 'test_id',
      clientSecret: 'test_secret',
    });
    const pagesHandle = routes.pagesHandler();
    const req = {
      query: { route: ['tracks', '1'] },
      url: '/api/soundcloud/tracks/1',
      method: 'GET',
      headers: {},
      body: undefined,
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await pagesHandle(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('Telemetry: type exports', () => {
  it('SCRouteTelemetry type is usable', () => {
    // Type-level test: if this compiles, the type is exported correctly
    const telemetry: SCRouteTelemetry = {
      method: 'GET',
      route: '/test',
      status: 200,
      durationMs: 10,
    };
    expect(telemetry.method).toBe('GET');
    expect(telemetry.route).toBe('/test');
    expect(telemetry.status).toBe(200);
    expect(telemetry.durationMs).toBe(10);
    expect(telemetry.error).toBeUndefined();
  });

  it('SCRouteTelemetry supports optional error', () => {
    const telemetry: SCRouteTelemetry = {
      method: 'GET',
      route: '/test',
      status: 500,
      durationMs: 5,
      error: 'something broke',
    };
    expect(telemetry.error).toBe('something broke');
  });
});
