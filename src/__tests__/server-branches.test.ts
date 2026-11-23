import { describe, it, expect, vi, beforeEach } from 'vitest';

const ok = (value: unknown = { collection: [] }) => vi.fn().mockResolvedValue(value);

const mockClient = {
  auth: {
    getClientToken: ok({ access_token: 'tok', refresh_token: 'cc_ref', expires_in: 3600 }),
    getUserToken: ok({ access_token: 'user_tok' }),
    refreshUserToken: ok({ access_token: 'new_tok' }),
    refreshToken: ok({ access_token: 'tok2', expires_in: 3600 }),
  },
  tracks: {
    getTrack: ok({ id: 1, title: 'Track' }),
    getPreviewUrl: ok('https://cf.example/preview'),
  },
  users: {
    getRepostsTracks: ok(),
    getRepostsPlaylists: ok(),
  },
  search: { tracks: ok({ collection: [{ id: 1 }], next_href: null }) },
  resolve: { resolveUrl: ok('resolved-url') },
  me: {
    getFeed: ok(),
    getFeedTracks: ok(),
    getRecentlyPlayedTracks: ok([{ id: 1 }]),
    getRepostsTracks: ok(),
    getRepostsPlaylists: ok(),
  },
  likes: {
    likeTrack: ok(true),
    unlikeTrack: ok(true),
    likePlaylist: ok(true),
  },
};

vi.mock('soundcloud-api-ts', () => ({
  SoundCloudClient: function () { return mockClient; },
  getAuthorizationUrl: vi.fn().mockReturnValue('https://soundcloud.com/connect?test'),
  generateCodeVerifier: vi.fn().mockReturnValue('verifier123'),
  generateCodeChallenge: vi.fn().mockResolvedValue('challenge123'),
  signOut: vi.fn().mockResolvedValue(undefined),
  scFetchUrl: vi.fn().mockResolvedValue({ collection: [] }),
  SoundCloudError: class SoundCloudError extends Error {
    status = 400;
    isInvalidGrant = false;
  },
}));

import { createSoundCloudRoutes } from '../server/routes.js';
import type { SoundCloudRoutesConfig } from '../types.js';

const BASE = 'http://localhost/api/soundcloud';
const baseConfig = { clientId: 'id', clientSecret: 'secret', redirectUri: 'http://localhost/cb' };

function setup(extra: Partial<SoundCloudRoutesConfig> = {}) {
  const routes = createSoundCloudRoutes({ ...baseConfig, ...extra });
  return { routes, handle: routes.handler() };
}

const get = (path: string, headers?: Record<string, string>) => new Request(`${BASE}${path}`, { headers });
const authed = (path: string, method = 'GET', headers: Record<string, string> = {}) =>
  new Request(`${BASE}${path}`, { method, headers: { Authorization: 'Bearer user_tok', ...headers } });

function pagesRes() {
  return { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
}
function pagesReq(route: string[], extra: Record<string, unknown> = {}) {
  return { query: { route }, url: `/api/soundcloud/${route.join('/')}`, method: 'GET', headers: {}, body: undefined, ...extra };
}

beforeEach(() => vi.clearAllMocks());

describe('authenticated /me routes', () => {
  it.each([
    ['/me/feed', () => mockClient.me.getFeed, [undefined, { token: 'user_tok' }]],
    ['/me/feed/tracks', () => mockClient.me.getFeedTracks, [undefined, { token: 'user_tok' }]],
    ['/me/recently-played', () => mockClient.me.getRecentlyPlayedTracks, [{ token: 'user_tok' }]],
    ['/me/recently-played/tracks', () => mockClient.me.getRecentlyPlayedTracks, [{ token: 'user_tok' }]],
    ['/me/reposts/tracks', () => mockClient.me.getRepostsTracks, [undefined, { token: 'user_tok' }]],
    ['/me/reposts/playlists', () => mockClient.me.getRepostsPlaylists, [undefined, { token: 'user_tok' }]],
  ] as const)('GET %s uses the user token, and returns 401 without one', async (path, method, args) => {
    const { handle } = setup();
    const res = await handle(authed(path));
    expect(res.status).toBe(200);
    expect(method()).toHaveBeenCalledWith(...args);

    const unauth = await handle(get(path));
    expect(unauth.status).toBe(401);
    expect((await unauth.json()).code).toBe('UNAUTHORIZED');
  });
});

describe('public routes', () => {
  it('GET /resolve resolves a URL and rejects a missing url parameter', async () => {
    const { handle } = setup();
    const res = await handle(get('/resolve?url=https%3A%2F%2Fsoundcloud.com%2Fa%2Fb'));
    expect(await res.json()).toBe('resolved-url');
    expect(mockClient.resolve.resolveUrl).toHaveBeenCalledWith('https://soundcloud.com/a/b', { token: 'tok' });

    const missing = await handle(get('/resolve'));
    expect(missing.status).toBe(400);
  });

  it('GET /tracks/:id/preview returns the preview URL', async () => {
    const { handle } = setup();
    const res = await handle(get('/tracks/1/preview'));
    expect(await res.json()).toEqual({ url: 'https://cf.example/preview' });
  });

  it('GET /users/:id/reposts/tracks and /reposts/playlists', async () => {
    const { handle } = setup();
    expect((await handle(get('/users/42/reposts/tracks'))).status).toBe(200);
    expect(mockClient.users.getRepostsTracks).toHaveBeenCalledWith('42', undefined, { token: 'tok' });
    expect((await handle(get('/users/42/reposts/playlists'))).status).toBe(200);
    expect(mockClient.users.getRepostsPlaylists).toHaveBeenCalledWith('42', undefined, { token: 'tok' });
  });

  it('GET /search/tracks forwards the access filter', async () => {
    const { handle } = setup();
    await handle(get('/search/tracks?q=lofi&access=playable&limit=5'));
    expect(mockClient.search.tracks).toHaveBeenCalledWith('lofi', undefined, { token: 'tok', limit: 5, access: 'playable' });
  });

  it('uses config.getToken instead of minting a client-credentials token', async () => {
    const getToken = vi.fn().mockResolvedValue('custom_tok');
    const { routes, handle } = setup({ getToken });
    await handle(get('/tracks/1'));
    expect(mockClient.tracks.getTrack).toHaveBeenCalledWith('1', { token: 'custom_tok' });
    expect(mockClient.auth.getClientToken).not.toHaveBeenCalled();

    expect(await routes.resolveUrl('https://soundcloud.com/a/b')).toBe('resolved-url');
    expect(mockClient.resolve.resolveUrl).toHaveBeenLastCalledWith('https://soundcloud.com/a/b', { token: 'custom_tok' });
  });
});

describe('auth routes', () => {
  it.each([
    ['GET', '/auth/login'],
    ['GET', '/auth/callback?code=c&state=s'],
    ['POST', '/auth/refresh'],
  ])('%s %s returns 500 when redirectUri is not configured', async (method, path) => {
    const routes = createSoundCloudRoutes({ clientId: 'id', clientSecret: 'secret' });
    const res = await routes.handler()(new Request(`${BASE}${path}`, {
      method,
      ...(method === 'POST' ? { body: JSON.stringify({ refresh_token: 'r' }), headers: { 'Content-Type': 'application/json' } } : {}),
    }));
    expect(res.status).toBe(500);
    expect((await res.json()).message).toBe('redirectUri not configured');
  });

  it('POST /auth/refresh returns 400 when the refresh fails upstream', async () => {
    mockClient.auth.refreshUserToken.mockRejectedValueOnce(new Error('invalid_grant'));
    const { handle } = setup();
    const res = await handle(new Request(`${BASE}/auth/refresh`, {
      method: 'POST',
      body: JSON.stringify({ refresh_token: 'dead' }),
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(res.status).toBe(400);
    expect((await res.json()).message).toBe('Failed to refresh token');
  });
});

describe('CSRF protection', () => {
  it('guards DELETE action routes: missing Origin is rejected, an allowed Origin passes', async () => {
    const { handle } = setup({ csrfProtection: true, cors: { origin: ['https://app.example', 'https://alt.example'] } });
    const blocked = await handle(authed('/tracks/1/like', 'DELETE'));
    expect(blocked.status).toBe(403);

    const allowed = await handle(authed('/tracks/1/like', 'DELETE', { Origin: 'https://alt.example' }));
    expect(allowed.status).toBe(200);
    expect(mockClient.likes.unlikeTrack).toHaveBeenCalled();

    const wrongOrigin = await handle(authed('/tracks/1/like', 'DELETE', { Origin: 'https://evil.example' }));
    expect(wrongOrigin.status).toBe(403);
  });

  it('guards playlist action routes', async () => {
    const { handle } = setup({ csrfProtection: true });
    const blocked = await handle(authed('/playlists/5/like', 'POST'));
    expect(blocked.status).toBe(403);
    const allowed = await handle(authed('/playlists/5/like', 'POST', { Origin: 'https://app.example' }));
    expect(allowed.status).toBe(200);
  });

  it('does not apply to POST requests on non-action paths', async () => {
    const { handle } = setup({ csrfProtection: true });
    const res = await handle(new Request(`${BASE}/tracks/1`, { method: 'POST' }));
    expect(res.status).toBe(200);
  });
});

describe('CORS and Cache-Control', () => {
  it('sets only Allow-Methods when cors has methods but no origin', async () => {
    const { handle } = setup({ cors: { methods: ['GET', 'POST'] } });
    const res = await handle(get('/tracks/1'));
    expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST');
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });

  it('leaves Cache-Control unset when no entry matches and there is no default', async () => {
    const { handle } = setup({ cacheHeaders: { users: 'public, max-age=60' } });
    const res = await handle(get('/tracks/1'));
    expect(res.headers.get('Cache-Control')).toBeNull();
  });
});

describe('App Router error responses', () => {
  it('includes errorCode from the upstream error', async () => {
    mockClient.tracks.getTrack.mockRejectedValueOnce(Object.assign(new Error('gone'), { status: 401, errorCode: 'invalid_token' }));
    const { handle } = setup();
    const res = await handle(get('/tracks/1'));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ code: 'UPSTREAM_ERROR', message: 'gone', errorCode: 'invalid_token' });
  });
});

describe('Pages Router handler', () => {
  it('sets CORS headers from a single origin and methods', async () => {
    const { routes } = setup({ cors: { origin: 'https://app.example', methods: ['GET'] } });
    const res = pagesRes();
    await routes.pagesHandler()(pagesReq(['tracks', '1'], { headers: { host: 'example.com', 'x-forwarded-proto': 'https' } }), res);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://app.example');
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Methods', 'GET');
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('uses the first origin when cors.origin is an array', async () => {
    const { routes } = setup({ cors: { origin: ['https://a.example', 'https://b.example'] } });
    const res = pagesRes();
    await routes.pagesHandler()(pagesReq(['tracks', '1']), res);
    expect(res.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://a.example');
    expect(res.setHeader).toHaveBeenCalledTimes(1);
  });

  it('maps a 404 upstream error to NOT_FOUND', async () => {
    mockClient.tracks.getTrack.mockRejectedValueOnce(Object.assign(new Error('no such track'), { status: 404 }));
    const { routes } = setup();
    const res = pagesRes();
    await routes.pagesHandler()(pagesReq(['tracks', '999']), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NOT_FOUND', message: 'no such track' }));
  });

  it('reports GET to onRouteComplete when the request has no method, on success and on error', async () => {
    const onRouteComplete = vi.fn();
    const { routes } = setup({ onRouteComplete });
    await routes.pagesHandler()(pagesReq(['tracks', '1'], { method: undefined }), pagesRes());
    expect(onRouteComplete).toHaveBeenLastCalledWith(expect.objectContaining({ route: '/tracks/1', method: 'GET', status: 200 }));

    mockClient.tracks.getTrack.mockRejectedValueOnce(Object.assign(new Error('fail'), { statusCode: 503 }));
    await routes.pagesHandler()(pagesReq(['tracks', '1'], { method: undefined }), pagesRes());
    expect(onRouteComplete).toHaveBeenLastCalledWith(expect.objectContaining({ method: 'GET', status: 503, error: 'fail' }));
  });

  it('falls back to a generic message when the thrown value has none', async () => {
    mockClient.tracks.getTrack.mockRejectedValueOnce({});
    const { routes } = setup();
    const res = pagesRes();
    await routes.pagesHandler()(pagesReq(['tracks', '999']), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'UPSTREAM_ERROR', message: 'Internal server error' }));
  });
});
