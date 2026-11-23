import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('soundcloud-api-ts', () => ({
  SoundCloudError: class SoundCloudError extends Error {
    isInvalidGrant = false;
    constructor(message: string, invalidGrant = false) {
      super(message);
      this.isInvalidGrant = invalidGrant;
    }
  },
}));

import { SoundCloudError } from 'soundcloud-api-ts';
import { createCcTokenCache } from '../cc-token.js';

const NOW = new Date('2026-01-01T00:00:00Z').getTime();
const HOUR = 3600 * 1000;
const ScError = SoundCloudError as unknown as new (message: string, invalidGrant?: boolean) => Error;

function setup() {
  const auth = {
    getClientToken: vi.fn().mockResolvedValue({ access_token: 'a1', refresh_token: 'r1', expires_in: 3600 }),
    refreshToken: vi.fn().mockResolvedValue({ access_token: 'a2', refresh_token: 'r2', expires_in: 3600 }),
  };
  const cache = createCcTokenCache(() => ({ auth }) as never);
  return { auth, cache };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe('createCcTokenCache', () => {
  it('mints once, caches until near expiry, and shares one in-flight request', async () => {
    const { auth, cache } = setup();
    const [a, b] = await Promise.all([cache.ensure(), cache.ensure()]);
    expect(a).toBe('a1');
    expect(b).toBe('a1');
    expect(await cache.ensure()).toBe('a1');
    expect(auth.getClientToken).toHaveBeenCalledTimes(1);
  });

  it('renews with the stored refresh token after expiry', async () => {
    const { auth, cache } = setup();
    await cache.ensure();
    vi.setSystemTime(NOW + HOUR);
    expect(await cache.ensure()).toBe('a2');
    expect(auth.refreshToken).toHaveBeenCalledWith('r1');
    expect(auth.getClientToken).toHaveBeenCalledTimes(1);
  });

  it('mints a new client token when there is no refresh token to reuse', async () => {
    const { auth, cache } = setup();
    auth.getClientToken.mockResolvedValue({ access_token: 'a1', expires_in: 3600 });
    await cache.ensure();
    vi.setSystemTime(NOW + HOUR);
    await cache.ensure();
    expect(auth.refreshToken).not.toHaveBeenCalled();
    expect(auth.getClientToken).toHaveBeenCalledTimes(2);
  });

  it('falls back to a new client token when the refresh token is rejected as invalid_grant', async () => {
    const { auth, cache } = setup();
    await cache.ensure();
    auth.refreshToken.mockRejectedValueOnce(new ScError('dead', true));
    auth.getClientToken.mockResolvedValueOnce({ access_token: 'a3', refresh_token: 'r3', expires_in: 3600 });
    vi.setSystemTime(NOW + HOUR);
    expect(await cache.ensure()).toBe('a3');
    expect(auth.getClientToken).toHaveBeenCalledTimes(2);
  });

  it('rethrows other SoundCloud errors from refresh and drops the refresh token', async () => {
    const { auth, cache } = setup();
    await cache.ensure();
    auth.refreshToken.mockRejectedValueOnce(new ScError('rate limited', false));
    vi.setSystemTime(NOW + HOUR);
    await expect(cache.ensure()).rejects.toThrow('rate limited');
    // Refresh token was discarded, so the next attempt mints fresh
    expect(await cache.ensure()).toBe('a1');
    expect(auth.refreshToken).toHaveBeenCalledTimes(1);
  });

  it('rethrows non-SoundCloud errors from refresh', async () => {
    const { auth, cache } = setup();
    await cache.ensure();
    auth.refreshToken.mockRejectedValueOnce(new TypeError('network'));
    vi.setSystemTime(NOW + HOUR);
    await expect(cache.ensure()).rejects.toThrow('network');
  });

  it('reset forgets the cached token', async () => {
    const { auth, cache } = setup();
    await cache.ensure();
    cache.reset();
    await cache.ensure();
    expect(auth.getClientToken).toHaveBeenCalledTimes(2);
    expect(auth.refreshToken).not.toHaveBeenCalled();
  });
});
