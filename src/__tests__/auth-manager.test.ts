import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockClient = {
  auth: {
    getUserToken: vi.fn().mockResolvedValue({ access_token: 'user_tok', refresh_token: 'ref', expires_in: 3600 }),
    refreshUserToken: vi.fn().mockResolvedValue({ access_token: 'new_tok' }),
    getClientToken: vi.fn().mockResolvedValue({ access_token: 'cc_tok', refresh_token: 'cc_ref', expires_in: 3600 }),
    refreshToken: vi.fn(),
  },
  tracks: {
    getRelated: vi.fn().mockResolvedValue([{ id: 9 }]),
  },
  users: {
    getRelated: vi.fn().mockResolvedValue({ collection: [{ id: 8 }], next_href: null }),
  },
  me: {
    getFeed: vi.fn().mockResolvedValue({ collection: [] }),
    getRecentlyPlayedTracks: vi.fn().mockResolvedValue([{ id: 1 }]),
  },
};

vi.mock('soundcloud-api-ts', () => ({
  SoundCloudClient: function () { return mockClient; },
  getAuthorizationUrl: vi.fn(
    (clientId: string, redirectUri: string, opts: { state: string; codeChallenge: string }) =>
      `https://soundcloud.com/connect?client_id=${clientId}&redirect_uri=${redirectUri}&state=${opts.state}&cc=${opts.codeChallenge}`,
  ),
  generateCodeVerifier: vi.fn().mockReturnValue('verifier123'),
  generateCodeChallenge: vi.fn().mockResolvedValue('challenge123'),
  SoundCloudError: class SoundCloudError extends Error {
    isInvalidGrant = false;
  },
}));

import { SCAuthManager, createSCAuthManager } from '../server/auth.js';
import { MemoryPkceStore } from '../auth/stores/index.js';
import { scKeys } from '../query-keys.js';

const config = { clientId: 'id', clientSecret: 'secret', redirectUri: 'http://localhost/cb' };

beforeEach(() => vi.clearAllMocks());

describe('SCAuthManager', () => {
  it('createSCAuthManager returns a manager with the default state cookie name', () => {
    const manager = createSCAuthManager(config);
    expect(manager).toBeInstanceOf(SCAuthManager);
    expect(manager.stateCookieName).toBe('sc_oauth_state');
    expect(createSCAuthManager({ ...config, stateCookieName: 'custom' }).stateCookieName).toBe('custom');
  });

  it('initLogin generates a random state and a PKCE authorization URL', async () => {
    const manager = createSCAuthManager(config);
    const { url, state } = await manager.initLogin();
    expect(state).toMatch(/^[0-9a-f-]{36}$/);
    expect(url).toContain(`state=${state}`);
    expect(url).toContain('cc=challenge123');
  });

  it('initLogin prefixes the state with a sessionId when given', async () => {
    const { state } = await createSCAuthManager(config).initLogin({ sessionId: 'sess1' });
    expect(state).toMatch(/^sess1:[0-9a-f-]{36}$/);
  });

  it('pendingLogins counts entries in the default store and drops them once exchanged', async () => {
    const manager = createSCAuthManager(config);
    expect(manager.pendingLogins).toBe(0);
    const { state } = await manager.initLogin();
    await manager.initLogin();
    expect(manager.pendingLogins).toBe(2);
    const tokens = await manager.exchangeCode('code', state);
    expect(tokens.access_token).toBe('user_tok');
    expect(mockClient.auth.getUserToken).toHaveBeenCalledWith('code', 'verifier123');
    expect(manager.pendingLogins).toBe(1);
  });

  it('pendingLogins is -1 with an external store', async () => {
    const manager = createSCAuthManager({ ...config, pkceStore: new MemoryPkceStore() });
    await manager.initLogin();
    expect(manager.pendingLogins).toBe(-1);
  });

  it('exchangeCode rejects an unknown or already-used state', async () => {
    const manager = createSCAuthManager(config);
    await expect(manager.exchangeCode('code', 'nope')).rejects.toThrow(/Invalid or expired OAuth state/);
    const { state } = await manager.initLogin();
    await manager.exchangeCode('code', state);
    await expect(manager.exchangeCode('code', state)).rejects.toThrow(/Invalid or expired OAuth state/);
  });

  it('expires pending logins after the TTL', async () => {
    vi.useFakeTimers();
    try {
      const manager = new SCAuthManager(config, 1000);
      const { state } = await manager.initLogin();
      vi.advanceTimersByTime(1001);
      expect(manager.pendingLogins).toBe(0);
      await expect(manager.exchangeCode('code', state)).rejects.toThrow(/Invalid or expired OAuth state/);
    } finally {
      vi.useRealTimers();
    }
  });

  it('refreshToken delegates to the client', async () => {
    const tokens = await createSCAuthManager(config).refreshToken('ref');
    expect(tokens.access_token).toBe('new_tok');
    expect(mockClient.auth.refreshUserToken).toHaveBeenCalledWith('ref');
  });
});

describe('scFetchers (related, feed, recently played)', () => {
  it('throws a clear error when used before configureFetchers', async () => {
    vi.resetModules();
    const { scFetchers } = await import('../fetchers.js');
    await expect(scFetchers.relatedTracks(1)).rejects.toThrow(/call configureFetchers/);
  });

  it('uses the client-credentials token by default and a user token when given', async () => {
    vi.resetModules();
    const { configureFetchers, scFetchers } = await import('../fetchers.js');
    configureFetchers({ clientId: 'id', clientSecret: 'secret' });

    expect(await scFetchers.relatedTracks(1)).toEqual([{ id: 9 }]);
    expect(mockClient.tracks.getRelated).toHaveBeenLastCalledWith(1, undefined, { token: 'cc_tok' });
    await scFetchers.relatedTracks(1, 'user_tok');
    expect(mockClient.tracks.getRelated).toHaveBeenLastCalledWith(1, undefined, { token: 'user_tok' });

    expect((await scFetchers.relatedUsers(2)).collection).toEqual([{ id: 8 }]);
    expect(mockClient.users.getRelated).toHaveBeenLastCalledWith(2, undefined, { token: 'cc_tok' });
    await scFetchers.relatedUsers(2, 'user_tok');
    expect(mockClient.users.getRelated).toHaveBeenLastCalledWith(2, undefined, { token: 'user_tok' });
  });

  it('meFeed and meRecentlyPlayed pass the user token', async () => {
    vi.resetModules();
    const { configureFetchers, scFetchers } = await import('../fetchers.js');
    configureFetchers({ clientId: 'id', clientSecret: 'secret' });
    await scFetchers.meFeed('user_tok', 5);
    expect(mockClient.me.getFeed).toHaveBeenCalledWith(5, { token: 'user_tok' });
    expect(await scFetchers.meRecentlyPlayed('user_tok')).toEqual([{ id: 1 }]);
    expect(mockClient.me.getRecentlyPlayedTracks).toHaveBeenCalledWith({ token: 'user_tok' });
  });
});

describe('scKeys (related users, recently played)', () => {
  it('builds the remaining keys', () => {
    expect(scKeys.relatedUsers(2)).toEqual(['sc', 'user', '2', 'related']);
    expect(scKeys.meRecentlyPlayed()).toEqual(['sc', 'me', 'recently-played']);
  });
});
