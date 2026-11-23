import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryPkceStore, CookiePkceStore } from '../auth/stores/index.js';

const NOW = new Date('2026-01-01T00:00:00Z').getTime();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe('MemoryPkceStore', () => {
  it('stores, returns and deletes a verifier', () => {
    const store = new MemoryPkceStore();
    store.set('s1', 'v1', 1000);
    expect(store.get('s1')).toBe('v1');
    expect(store.size).toBe(1);
    store.delete('s1');
    expect(store.get('s1')).toBeUndefined();
    expect(store.size).toBe(0);
  });

  it('returns undefined for an unknown state', () => {
    expect(new MemoryPkceStore().get('missing')).toBeUndefined();
  });

  it('expires an entry on read', () => {
    const store = new MemoryPkceStore();
    store.set('s1', 'v1', 1000);
    vi.setSystemTime(NOW + 1001);
    expect(store.get('s1')).toBeUndefined();
  });

  it('evicts expired entries on set and when reading size, keeping live ones', () => {
    const store = new MemoryPkceStore();
    store.set('old', 'v', 1000);
    store.set('live', 'v', 10_000);
    vi.setSystemTime(NOW + 2000);
    expect(store.size).toBe(1);
    store.set('new', 'v', 1000);
    expect(store.get('old')).toBeUndefined();
    expect(store.get('live')).toBe('v');
    expect(store.size).toBe(2);
  });
});

// ── CookiePkceStore ──────────────────────────────────────────────────────

const SECRET = 'test-secret';

function b64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Build a correctly signed cookie value around an arbitrary payload string. */
async function signedCookie(payloadText: string, secret = SECRET): Promise<string> {
  const enc = new TextEncoder();
  const payload = b64url(enc.encode(payloadText));
  const key = await globalThis.crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await globalThis.crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return `${payload}.${b64url(new Uint8Array(sig))}`;
}

function cookieValue(setCookie: string): string {
  return setCookie.split('; ')[0];
}

describe('CookiePkceStore', () => {
  it('uses the default cookie name, or a custom one', () => {
    expect(new CookiePkceStore(SECRET).cookieName).toBe('sc_pkce');
    expect(new CookiePkceStore(SECRET, 'custom').cookieName).toBe('custom');
  });

  it('implements the in-memory PkceStore interface', () => {
    const store = new CookiePkceStore(SECRET);
    expect(store.get('missing')).toBeUndefined();
    store.set('s1', 'v1', 1000);
    expect(store.get('s1')).toBe('v1');
    store.delete('s1');
    expect(store.get('s1')).toBeUndefined();
    store.set('s2', 'v2', 1000);
    vi.setSystemTime(NOW + 1001);
    expect(store.get('s2')).toBeUndefined();
  });

  it('setCookieHeader throws when the state was never stored', async () => {
    await expect(new CookiePkceStore(SECRET).setCookieHeader('nope', 1000)).rejects.toThrow(/no PKCE entry/);
  });

  it('setCookieHeader builds a signed HttpOnly cookie, with Secure only when asked', async () => {
    const store = new CookiePkceStore(SECRET);
    store.set('s1', 'v1', 600_000);
    const insecure = await store.setCookieHeader('s1', 600_000, false);
    expect(insecure).toMatch(/^sc_pkce=[\w-]+\.[\w-]+; HttpOnly; Path=\/; Max-Age=600; SameSite=Lax$/);
    const secure = await store.setCookieHeader('s1', 600_000, true);
    expect(secure.endsWith('; Secure')).toBe(true);
  });

  it('setCookieHeader defaults Secure from NODE_ENV', async () => {
    const store = new CookiePkceStore(SECRET);
    store.set('s1', 'v1', 1000);
    vi.stubEnv('NODE_ENV', 'production');
    expect(await store.setCookieHeader('s1', 1000)).toContain('Secure');
    vi.stubEnv('NODE_ENV', 'development');
    expect(await store.setCookieHeader('s1', 1000)).not.toContain('Secure');
  });

  it('round-trips through a cookie into a fresh store instance', async () => {
    const issuing = new CookiePkceStore(SECRET);
    issuing.set('s1', 'v1', 600_000);
    const cookie = cookieValue(await issuing.setCookieHeader('s1', 600_000, false));

    const receiving = new CookiePkceStore(SECRET);
    const req = new Request('http://localhost/cb', { headers: { cookie: `other=1; ${cookie}; flag` } });
    expect(await receiving.getFromRequest(req)).toBe('v1');
    // Loaded into the in-process map, so the sync interface now works
    expect(receiving.get('s1')).toBe('v1');
    // Second read reuses the imported key
    expect(await receiving.getFromCookieHeader(cookie)).toBe('v1');
  });

  it('returns undefined when the request has no cookie header or no matching cookie', async () => {
    const store = new CookiePkceStore(SECRET);
    expect(await store.getFromRequest(new Request('http://localhost/cb'))).toBeUndefined();
    expect(await store.getFromCookieHeader('other=1; novalue')).toBeUndefined();
  });

  it('rejects a cookie with no signature separator', async () => {
    expect(await new CookiePkceStore(SECRET).getFromCookieHeader('sc_pkce=nodothere')).toBeUndefined();
  });

  it('rejects a cookie signed with a different secret', async () => {
    const cookie = await signedCookie(JSON.stringify({ state: 's', verifier: 'v', exp: NOW + 1000 }), 'other-secret');
    expect(await new CookiePkceStore(SECRET).getFromCookieHeader(`sc_pkce=${cookie}`)).toBeUndefined();
  });

  it('rejects a cookie whose signature is not valid base64', async () => {
    expect(await new CookiePkceStore(SECRET).getFromCookieHeader('sc_pkce=abc.!!!')).toBeUndefined();
  });

  it('rejects a correctly signed payload that is not JSON', async () => {
    const cookie = await signedCookie('not json');
    expect(await new CookiePkceStore(SECRET).getFromCookieHeader(`sc_pkce=${cookie}`)).toBeUndefined();
  });

  it.each([
    ['a non-object', '5'],
    ['null', 'null'],
    ['a non-string state', JSON.stringify({ state: 1, verifier: 'v', exp: 1 })],
    ['a non-string verifier', JSON.stringify({ state: 's', verifier: 1, exp: 1 })],
    ['a non-numeric exp', JSON.stringify({ state: 's', verifier: 'v', exp: 'x' })],
  ])('rejects a correctly signed payload that is %s', async (_label, payload) => {
    const cookie = await signedCookie(payload);
    expect(await new CookiePkceStore(SECRET).getFromCookieHeader(`sc_pkce=${cookie}`)).toBeUndefined();
  });

  it('rejects an expired cookie', async () => {
    const cookie = await signedCookie(JSON.stringify({ state: 's', verifier: 'v', exp: NOW - 1 }));
    expect(await new CookiePkceStore(SECRET).getFromCookieHeader(`sc_pkce=${cookie}`)).toBeUndefined();
  });
});
