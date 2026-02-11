import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('soundcloud-api-ts', () => ({
  getClientToken: vi.fn().mockResolvedValue({ access_token: 'tok', expires_in: 3600 }),
  searchTracks: vi.fn().mockResolvedValue({ collection: [{ id: 1 }], next_href: null }),
  getTrack: vi.fn().mockResolvedValue({ id: 1, title: 'Track' }),
  getUser: vi.fn().mockResolvedValue({ id: 2, username: 'user' }),
  getUserTracks: vi.fn().mockResolvedValue({ collection: [] }),
  getTrackStreams: vi.fn().mockResolvedValue({ http_mp3_128_url: 'url' }),
  getFollowers: vi.fn().mockResolvedValue({ collection: [] }),
  getFollowings: vi.fn().mockResolvedValue({ collection: [] }),
  getUserPlaylists: vi.fn().mockResolvedValue({ collection: [] }),
  getUserLikesTracks: vi.fn().mockResolvedValue({ collection: [] }),
  getTrackComments: vi.fn().mockResolvedValue({ collection: [] }),
  getTrackLikes: vi.fn().mockResolvedValue({ collection: [] }),
  getRelatedTracks: vi.fn().mockResolvedValue({ collection: [] }),
  getPlaylist: vi.fn().mockResolvedValue({ id: 3, title: 'Playlist' }),
  getPlaylistTracks: vi.fn().mockResolvedValue({ collection: [] }),
  searchUsers: vi.fn().mockResolvedValue({ collection: [] }),
  searchPlaylists: vi.fn().mockResolvedValue({ collection: [] }),
  scFetchUrl: vi.fn().mockResolvedValue({ collection: [] }),
  getAuthorizationUrl: vi.fn().mockReturnValue('https://soundcloud.com/connect?test'),
  generateCodeVerifier: vi.fn().mockReturnValue('verifier123'),
  generateCodeChallenge: vi.fn().mockResolvedValue('challenge123'),
  getUserToken: vi.fn().mockResolvedValue({ access_token: 'user_tok', refresh_token: 'ref', expires_in: 3600 }),
  refreshUserToken: vi.fn().mockResolvedValue({ access_token: 'new_tok' }),
  signOut: vi.fn().mockResolvedValue(undefined),
  SoundCloudClient: vi.fn(),
  getMe: vi.fn().mockResolvedValue({ id: 1, username: 'me' }),
  getMeTracks: vi.fn().mockResolvedValue({ collection: [] }),
  getMeLikesTracks: vi.fn().mockResolvedValue({ collection: [] }),
  getMePlaylists: vi.fn().mockResolvedValue({ collection: [] }),
  getMeFollowings: vi.fn().mockResolvedValue({ collection: [] }),
  getMeFollowers: vi.fn().mockResolvedValue({ collection: [] }),
  followUser: vi.fn().mockResolvedValue(undefined),
  unfollowUser: vi.fn().mockResolvedValue(undefined),
  likeTrack: vi.fn().mockResolvedValue(undefined),
  unlikeTrack: vi.fn().mockResolvedValue(undefined),
  likePlaylist: vi.fn().mockResolvedValue(undefined),
  unlikePlaylist: vi.fn().mockResolvedValue(undefined),
  repostTrack: vi.fn().mockResolvedValue(undefined),
  unrepostTrack: vi.fn().mockResolvedValue(undefined),
  repostPlaylist: vi.fn().mockResolvedValue(undefined),
  unrepostPlaylist: vi.fn().mockResolvedValue(undefined),
}));

import * as scApi from 'soundcloud-api-ts';
const mocks = scApi as any;

import { createSoundCloudRoutes } from '../server/routes.js';

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

describe('createSoundCloudRoutes', () => {
  let handle: (request: Request) => Promise<Response>;
  let routes: ReturnType<typeof createSoundCloudRoutes>;

  beforeEach(() => {
    vi.clearAllMocks();
    routes = createSoundCloudRoutes({
      clientId: 'test_id',
      clientSecret: 'test_secret',
      redirectUri: 'http://localhost:3000/callback',
    });
    handle = routes.handler();
  });

  // ── Direct methods ──
  it('has all direct methods', () => {
    expect(routes.searchTracks).toBeTypeOf('function');
    expect(routes.searchUsers).toBeTypeOf('function');
    expect(routes.searchPlaylists).toBeTypeOf('function');
    expect(routes.getTrack).toBeTypeOf('function');
    expect(routes.getUser).toBeTypeOf('function');
    expect(routes.getUserTracks).toBeTypeOf('function');
    expect(routes.getUserPlaylists).toBeTypeOf('function');
    expect(routes.getUserLikesTracks).toBeTypeOf('function');
    expect(routes.getFollowers).toBeTypeOf('function');
    expect(routes.getFollowings).toBeTypeOf('function');
    expect(routes.getTrackStreams).toBeTypeOf('function');
    expect(routes.getTrackComments).toBeTypeOf('function');
    expect(routes.getTrackLikes).toBeTypeOf('function');
    expect(routes.getRelatedTracks).toBeTypeOf('function');
    expect(routes.getPlaylist).toBeTypeOf('function');
    expect(routes.getPlaylistTracks).toBeTypeOf('function');
    expect(routes.handler).toBeTypeOf('function');
    expect(routes.pagesHandler).toBeTypeOf('function');
  });

  // Direct method calls
  it('direct searchTracks', async () => {
    await routes.searchTracks('q', 1);
    expect(mocks.searchTracks).toHaveBeenCalled();
  });
  it('direct searchUsers', async () => {
    await routes.searchUsers('q');
    expect(mocks.searchUsers).toHaveBeenCalled();
  });
  it('direct searchPlaylists', async () => {
    await routes.searchPlaylists('q');
    expect(mocks.searchPlaylists).toHaveBeenCalled();
  });
  it('direct getTrack', async () => {
    await routes.getTrack(1);
    expect(mocks.getTrack).toHaveBeenCalled();
  });
  it('direct getUser', async () => {
    await routes.getUser(1);
    expect(mocks.getUser).toHaveBeenCalled();
  });
  it('direct getUserTracks', async () => {
    await routes.getUserTracks(1, 10);
    expect(mocks.getUserTracks).toHaveBeenCalled();
  });
  it('direct getUserPlaylists', async () => {
    await routes.getUserPlaylists(1);
    expect(mocks.getUserPlaylists).toHaveBeenCalled();
  });
  it('direct getUserLikesTracks', async () => {
    await routes.getUserLikesTracks(1);
    expect(mocks.getUserLikesTracks).toHaveBeenCalled();
  });
  it('direct getFollowers', async () => {
    await routes.getFollowers(1);
    expect(mocks.getFollowers).toHaveBeenCalled();
  });
  it('direct getFollowings', async () => {
    await routes.getFollowings(1);
    expect(mocks.getFollowings).toHaveBeenCalled();
  });
  it('direct getTrackStreams', async () => {
    await routes.getTrackStreams(1);
    expect(mocks.getTrackStreams).toHaveBeenCalled();
  });
  it('direct getTrackComments', async () => {
    await routes.getTrackComments(1);
    expect(mocks.getTrackComments).toHaveBeenCalled();
  });
  it('direct getTrackLikes', async () => {
    await routes.getTrackLikes(1);
    expect(mocks.getTrackLikes).toHaveBeenCalled();
  });
  it('direct getRelatedTracks', async () => {
    await routes.getRelatedTracks(1);
    expect(mocks.getRelatedTracks).toHaveBeenCalled();
  });
  it('direct getPlaylist', async () => {
    await routes.getPlaylist(1);
    expect(mocks.getPlaylist).toHaveBeenCalled();
  });
  it('direct getPlaylistTracks', async () => {
    await routes.getPlaylistTracks(1);
    expect(mocks.getPlaylistTracks).toHaveBeenCalled();
  });

  // ── Search routes ──
  it('GET /search/tracks', async () => {
    const res = await handle(makeReq('/search/tracks?q=test'));
    expect(res.status).toBe(200);
    expect(mocks.searchTracks).toHaveBeenCalledWith('tok', 'test', undefined);
  });

  it('GET /search/tracks with page', async () => {
    const res = await handle(makeReq('/search/tracks?q=test&page=2'));
    expect(res.status).toBe(200);
    expect(mocks.searchTracks).toHaveBeenCalledWith('tok', 'test', 2);
  });

  it('GET /search/tracks without q returns 400', async () => {
    const res = await handle(makeReq('/search/tracks'));
    expect(res.status).toBe(400);
  });

  it('GET /search/users', async () => {
    const res = await handle(makeReq('/search/users?q=test'));
    expect(res.status).toBe(200);
  });

  it('GET /search/users without q returns 400', async () => {
    const res = await handle(makeReq('/search/users'));
    expect(res.status).toBe(400);
  });

  it('GET /search/playlists', async () => {
    const res = await handle(makeReq('/search/playlists?q=test'));
    expect(res.status).toBe(200);
  });

  it('GET /search/playlists without q returns 400', async () => {
    const res = await handle(makeReq('/search/playlists'));
    expect(res.status).toBe(400);
  });

  // ── Track routes ──
  it('GET /tracks/:id', async () => {
    const res = await handle(makeReq('/tracks/123'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.title).toBe('Track');
  });

  it('GET /tracks/:id/stream', async () => {
    const res = await handle(makeReq('/tracks/123/stream'));
    expect(res.status).toBe(200);
  });

  it('GET /tracks/:id/comments', async () => {
    const res = await handle(makeReq('/tracks/123/comments'));
    expect(res.status).toBe(200);
  });

  it('GET /tracks/:id/likes', async () => {
    const res = await handle(makeReq('/tracks/123/likes'));
    expect(res.status).toBe(200);
  });

  it('GET /tracks/:id/related', async () => {
    const res = await handle(makeReq('/tracks/123/related'));
    expect(res.status).toBe(200);
  });

  // ── User routes ──
  it('GET /users/:id', async () => {
    const res = await handle(makeReq('/users/42'));
    expect(res.status).toBe(200);
  });

  it('GET /users/:id/tracks', async () => {
    const res = await handle(makeReq('/users/42/tracks'));
    expect(res.status).toBe(200);
  });

  it('GET /users/:id/tracks with limit', async () => {
    const res = await handle(makeReq('/users/42/tracks?limit=10'));
    expect(res.status).toBe(200);
    expect(mocks.getUserTracks).toHaveBeenCalledWith('tok', '42', 10);
  });

  it('GET /users/:id/playlists', async () => {
    const res = await handle(makeReq('/users/42/playlists'));
    expect(res.status).toBe(200);
  });

  it('GET /users/:id/likes/tracks', async () => {
    const res = await handle(makeReq('/users/42/likes/tracks'));
    expect(res.status).toBe(200);
  });

  it('GET /users/:id/followers', async () => {
    const res = await handle(makeReq('/users/42/followers'));
    expect(res.status).toBe(200);
  });

  it('GET /users/:id/followings', async () => {
    const res = await handle(makeReq('/users/42/followings'));
    expect(res.status).toBe(200);
  });

  // ── Playlist routes ──
  it('GET /playlists/:id', async () => {
    const res = await handle(makeReq('/playlists/99'));
    expect(res.status).toBe(200);
  });

  it('GET /playlists/:id/tracks', async () => {
    const res = await handle(makeReq('/playlists/99/tracks'));
    expect(res.status).toBe(200);
  });

  // ── Next page ──
  it('GET /next with url param', async () => {
    const res = await handle(makeReq('/next?url=http%3A%2F%2Fnext'));
    expect(res.status).toBe(200);
  });

  it('GET /next without url returns 400', async () => {
    const res = await handle(makeReq('/next'));
    expect(res.status).toBe(400);
  });

  // ── 404 ──
  it('returns 404 for unknown route', async () => {
    const res = await handle(makeReq('/unknown'));
    expect(res.status).toBe(404);
  });

  // ── Auth routes ──
  it('GET /auth/login', async () => {
    const res = await handle(makeReq('/auth/login'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toContain('soundcloud.com');
  });

  it('GET /auth/callback with valid state', async () => {
    // First login to get state
    const loginRes = await handle(makeReq('/auth/login'));
    const { state } = await loginRes.json();

    const res = await handle(makeReq(`/auth/callback?code=testcode&state=${state}`));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.access_token).toBe('user_tok');
  });

  it('GET /auth/callback missing params returns 400', async () => {
    const res = await handle(makeReq('/auth/callback'));
    expect(res.status).toBe(400);
  });

  it('GET /auth/callback invalid state returns 400', async () => {
    const res = await handle(makeReq('/auth/callback?code=x&state=invalid'));
    expect(res.status).toBe(400);
  });

  it('POST /auth/refresh', async () => {
    const res = await handle(makeReq('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: 'ref_tok' }),
    }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.access_token).toBe('new_tok');
  });

  it('POST /auth/refresh without refresh_token returns 400', async () => {
    const res = await handle(makeReq('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(400);
  });

  it('POST /auth/logout', async () => {
    const res = await handle(makeReq('/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: 'tok' }),
    }));
    expect(res.status).toBe(200);
  });

  it('POST /auth/logout without token', async () => {
    const res = await handle(makeReq('/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }));
    expect(res.status).toBe(200);
  });

  it('POST /auth/logout with signOut error', async () => {
    mocks.signOut.mockRejectedValueOnce(new Error('fail'));
    const res = await handle(makeReq('/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ access_token: 'tok' }),
    }));
    expect(res.status).toBe(200); // best effort
  });

  // ── Me routes ──
  it('GET /me requires auth', async () => {
    const res = await handle(makeReq('/me'));
    expect(res.status).toBe(401);
  });

  it('GET /me with auth', async () => {
    const res = await handle(makeAuthReq('/me'));
    expect(res.status).toBe(200);
  });

  it('GET /me/tracks requires auth', async () => {
    const res = await handle(makeReq('/me/tracks'));
    expect(res.status).toBe(401);
  });

  it('GET /me/tracks with auth', async () => {
    const res = await handle(makeAuthReq('/me/tracks'));
    expect(res.status).toBe(200);
  });

  it('GET /me/likes with auth', async () => {
    const res = await handle(makeAuthReq('/me/likes'));
    expect(res.status).toBe(200);
  });

  it('GET /me/likes requires auth', async () => {
    const res = await handle(makeReq('/me/likes'));
    expect(res.status).toBe(401);
  });

  it('GET /me/playlists with auth', async () => {
    const res = await handle(makeAuthReq('/me/playlists'));
    expect(res.status).toBe(200);
  });

  it('GET /me/playlists requires auth', async () => {
    const res = await handle(makeReq('/me/playlists'));
    expect(res.status).toBe(401);
  });

  it('GET /me/followings with auth', async () => {
    const res = await handle(makeAuthReq('/me/followings'));
    expect(res.status).toBe(200);
  });

  it('GET /me/followings requires auth', async () => {
    const res = await handle(makeReq('/me/followings'));
    expect(res.status).toBe(401);
  });

  it('GET /me/followers with auth', async () => {
    const res = await handle(makeAuthReq('/me/followers'));
    expect(res.status).toBe(200);
  });

  it('GET /me/followers requires auth', async () => {
    const res = await handle(makeReq('/me/followers'));
    expect(res.status).toBe(401);
  });

  // ── Action routes ──
  it('POST /me/follow/:userId', async () => {
    const res = await handle(makeAuthReq('/me/follow/42', 'POST'));
    expect(res.status).toBe(200);
    expect(mocks.followUser).toHaveBeenCalledWith('user_tok', '42');
  });

  it('DELETE /me/follow/:userId', async () => {
    const res = await handle(makeAuthReq('/me/follow/42', 'DELETE'));
    expect(res.status).toBe(200);
    expect(mocks.unfollowUser).toHaveBeenCalledWith('user_tok', '42');
  });

  it('POST /me/follow requires auth', async () => {
    const res = await handle(makeReq('/me/follow/42', { method: 'POST' }));
    expect(res.status).toBe(401);
  });

  it('POST /tracks/:id/like', async () => {
    const res = await handle(makeAuthReq('/tracks/10/like', 'POST'));
    expect(res.status).toBe(200);
    expect(mocks.likeTrack).toHaveBeenCalledWith('user_tok', '10');
  });

  it('DELETE /tracks/:id/like', async () => {
    const res = await handle(makeAuthReq('/tracks/10/like', 'DELETE'));
    expect(res.status).toBe(200);
    expect(mocks.unlikeTrack).toHaveBeenCalledWith('user_tok', '10');
  });

  it('POST /tracks/:id/like requires auth', async () => {
    const res = await handle(makeReq('/tracks/10/like', { method: 'POST' }));
    expect(res.status).toBe(401);
  });

  it('POST /tracks/:id/repost', async () => {
    const res = await handle(makeAuthReq('/tracks/10/repost', 'POST'));
    expect(res.status).toBe(200);
    expect(mocks.repostTrack).toHaveBeenCalledWith('user_tok', '10');
  });

  it('DELETE /tracks/:id/repost', async () => {
    const res = await handle(makeAuthReq('/tracks/10/repost', 'DELETE'));
    expect(res.status).toBe(200);
    expect(mocks.unrepostTrack).toHaveBeenCalledWith('user_tok', '10');
  });

  it('POST /tracks/:id/repost requires auth', async () => {
    const res = await handle(makeReq('/tracks/10/repost', { method: 'POST' }));
    expect(res.status).toBe(401);
  });

  it('POST /playlists/:id/like', async () => {
    const res = await handle(makeAuthReq('/playlists/5/like', 'POST'));
    expect(res.status).toBe(200);
    expect(mocks.likePlaylist).toHaveBeenCalledWith('user_tok', '5');
  });

  it('DELETE /playlists/:id/like', async () => {
    const res = await handle(makeAuthReq('/playlists/5/like', 'DELETE'));
    expect(res.status).toBe(200);
    expect(mocks.unlikePlaylist).toHaveBeenCalledWith('user_tok', '5');
  });

  it('POST /playlists/:id/like requires auth', async () => {
    const res = await handle(makeReq('/playlists/5/like', { method: 'POST' }));
    expect(res.status).toBe(401);
  });

  it('POST /playlists/:id/repost', async () => {
    const res = await handle(makeAuthReq('/playlists/5/repost', 'POST'));
    expect(res.status).toBe(200);
    expect(mocks.repostPlaylist).toHaveBeenCalledWith('user_tok', '5');
  });

  it('DELETE /playlists/:id/repost', async () => {
    const res = await handle(makeAuthReq('/playlists/5/repost', 'DELETE'));
    expect(res.status).toBe(200);
    expect(mocks.unrepostPlaylist).toHaveBeenCalledWith('user_tok', '5');
  });

  it('POST /playlists/:id/repost requires auth', async () => {
    const res = await handle(makeReq('/playlists/5/repost', { method: 'POST' }));
    expect(res.status).toBe(401);
  });

  // ── Token caching ──
  it('reuses cached token', async () => {
    await handle(makeReq('/tracks/1'));
    await handle(makeReq('/tracks/2'));
    // getClientToken should only be called once (cached)
    expect(mocks.getClientToken).toHaveBeenCalledTimes(1);
  });

  // ── Error handling ──
  it('handles thrown errors with statusCode', async () => {
    mocks.getTrack.mockRejectedValueOnce(Object.assign(new Error('Not found'), { statusCode: 404 }));
    const res = await handle(makeReq('/tracks/999'));
    expect(res.status).toBe(404);
  });

  it('handles thrown errors without statusCode', async () => {
    mocks.getTrack.mockRejectedValueOnce(new Error('boom'));
    const res = await handle(makeReq('/tracks/999'));
    expect(res.status).toBe(500);
  });

  // ── Auth without redirectUri ──
  it('auth/login without redirectUri returns 500', async () => {
    const r2 = createSoundCloudRoutes({ clientId: 'id', clientSecret: 'secret' });
    const h2 = r2.handler();
    const res = await h2(makeReq('/auth/login'));
    expect(res.status).toBe(500);
  });

  it('auth/callback without redirectUri returns 500', async () => {
    const r2 = createSoundCloudRoutes({ clientId: 'id', clientSecret: 'secret' });
    const h2 = r2.handler();
    const res = await h2(makeReq('/auth/callback?code=x&state=y'));
    expect(res.status).toBe(500);
  });

  it('auth/refresh without redirectUri returns 500', async () => {
    const r2 = createSoundCloudRoutes({ clientId: 'id', clientSecret: 'secret' });
    const h2 = r2.handler();
    const res = await h2(makeReq('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: 'x' }),
    }));
    expect(res.status).toBe(500);
  });

  // ── POST with invalid JSON ──
  it('handles POST with invalid JSON body', async () => {
    const req = new Request(`${BASE}/auth/logout`, {
      method: 'POST',
      body: 'not json',
    });
    const res = await handle(req);
    expect(res.status).toBe(200); // body is undefined, no access_token
  });

  // ── pagesHandler ──
  it('pagesHandler routes correctly', async () => {
    const pagesHandle = routes.pagesHandler();
    const req = {
      query: { route: ['tracks', '1'] },
      url: '/api/soundcloud/tracks/1',
      method: 'GET',
      headers: {},
      body: undefined,
    };
    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    };
    await pagesHandle(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ title: 'Track' }));
  });

  it('pagesHandler handles errors', async () => {
    mocks.getTrack.mockRejectedValueOnce(Object.assign(new Error('fail'), { statusCode: 503 }));
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
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('pagesHandler with string route query', async () => {
    const pagesHandle = routes.pagesHandler();
    const req = {
      query: { route: 'tracks/1' },
      url: '/api/soundcloud/tracks/1',
      method: 'GET',
      headers: {},
      body: undefined,
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await pagesHandle(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('pagesHandler forwards authorization header', async () => {
    const pagesHandle = routes.pagesHandler();
    const req = {
      query: { route: ['me'] },
      url: '/api/soundcloud/me',
      method: 'GET',
      headers: { authorization: 'Bearer tok123' },
      body: undefined,
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await pagesHandle(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('pagesHandler with missing url falls back', async () => {
    const pagesHandle = routes.pagesHandler();
    const req = {
      query: { route: 'something' },
      url: undefined,
      method: 'GET',
      headers: {},
      body: undefined,
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await pagesHandle(req, res);
    // Should handle it (likely 404 or route from url)
    expect(res.status).toHaveBeenCalled();
  });

  // ── Handler with non-standard URL path ──
  it('handler handles URL without /api/soundcloud prefix', async () => {
    const req = new Request('http://localhost/tracks/1');
    const res = await handle(req);
    expect(res.status).toBe(200);
  });

  // ── cleanPkceStore deletes old entries (line 68) ──
  it('cleanPkceStore removes expired entries on login', async () => {
    const now = Date.now();
    // First login: creates a PKCE entry
    const res1 = await handle(makeReq('/auth/login'));
    expect(res1.status).toBe(200);

    // Advance time by 11 minutes so the entry is expired
    const spy = vi.spyOn(Date, 'now').mockReturnValue(now + 700_000);

    // Second login: triggers cleanPkceStore which should delete the old entry
    const res2 = await handle(makeReq('/auth/login'));
    expect(res2.status).toBe(200);

    spy.mockRestore();
  });

  // ── handler() outer catch with error without message (line 548) ──
  it('handler catches error without message', async () => {
    // Make handleRoute throw something without .message
    mocks.getTrack.mockRejectedValueOnce(null);
    const res = await handle(makeReq('/tracks/1'));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe('Internal server error');
  });

  // ── pagesHandler outer catch (lines 574-579) ──
  it('pagesHandler with undefined method defaults to GET', async () => {
    const pagesHandle = routes.pagesHandler();
    const req = {
      query: { route: ['tracks', '1'] },
      url: '/api/soundcloud/tracks/1',
      method: undefined,
      headers: { host: 'localhost' },
      body: undefined,
    };
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await pagesHandle(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('pagesHandler catches errors in URL construction', async () => {
    const pagesHandle = routes.pagesHandler();
    const req = {
      query: { route: ['tracks', '1'] },
      url: '/api/soundcloud/tracks/1',
      method: 'GET',
      headers: { host: '' },
      body: undefined,
    };
    // Override to make new URL() throw
    Object.defineProperty(req, 'url', { get() { throw new Error('bad url'); } });
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await pagesHandle(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'bad url' }));
  });

  it('pagesHandler catches error without message', async () => {
    const pagesHandle = routes.pagesHandler();
    const req = {
      query: { route: ['tracks', '1'] },
      url: '/api/soundcloud/tracks/1',
      method: 'GET',
      headers: { host: '' },
      body: undefined,
    };
    Object.defineProperty(req, 'url', { get() { throw null; } });
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
    await pagesHandle(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Internal server error' }));
  });
});
