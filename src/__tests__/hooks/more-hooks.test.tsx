import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { SoundCloudProvider } from '../../client/provider.js';
import { useSCAuth } from '../../client/hooks/useSCAuth.js';
import { useSCFetch } from '../../client/hooks/_useSCFetch.js';
import { useMeFeed } from '../../client/hooks/useMeFeed.js';
import { useMeRecentlyPlayed } from '../../client/hooks/useMeRecentlyPlayed.js';
import { useMeLikesSystemPlaylists } from '../../client/hooks/useMeLikesSystemPlaylists.js';
import { useRelatedUsers } from '../../client/hooks/useRelatedUsers.js';
import { useUserReposts } from '../../client/hooks/useUserReposts.js';
import { useResolve } from '../../client/hooks/useResolve.js';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
);

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn(); globalThis.fetch = fetchMock as unknown as typeof fetch; });
afterEach(() => { vi.restoreAllMocks(); });

function mockOk(data: unknown) {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => data });
}

/** Render an authenticated-only hook, sign in via the callback flow, and return its result. */
async function renderAuthed<T>(hook: () => { data: T | null }, response: unknown) {
  mockOk({ access_token: 'tok', refresh_token: 'ref', expires_in: 3600 }); // /auth/callback
  mockOk({ id: 1, username: 'u' }); // /me after sign-in
  mockOk(response); // the hook under test
  const rendered = renderHook(() => ({ auth: useSCAuth(), hook: hook() }), { wrapper });
  await act(async () => {
    await rendered.result.current.auth.handleCallback('code', 'state');
  });
  return rendered;
}

describe('public collection hooks', () => {
  it.each([
    ['useRelatedUsers', useRelatedUsers, '/api/sc/users/42/related'],
    ['useUserReposts', useUserReposts, '/api/sc/users/42/reposts/tracks'],
  ] as const)('%s unwraps a paginated collection', async (_name, hook, url) => {
    mockOk({ collection: [{ id: 7 }], next_href: null });
    const { result } = renderHook(() => hook(42), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 7 }]));
    expect(fetchMock.mock.calls[0][0]).toBe(url);
  });

  it.each([
    ['useRelatedUsers', useRelatedUsers],
    ['useUserReposts', useUserReposts],
  ] as const)('%s accepts a bare array and skips when the id is undefined', async (_name, hook) => {
    mockOk([{ id: 8 }]);
    const { result } = renderHook(() => hook(42), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual([{ id: 8 }]));

    const skipped = renderHook(() => hook(undefined), { wrapper });
    expect(skipped.result.current.data).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('useResolve', () => {
  it('resolves an encoded URL', async () => {
    mockOk({ kind: 'track', id: 1 });
    const { result } = renderHook(() => useResolve('https://soundcloud.com/a/b'), { wrapper });
    await waitFor(() => expect(result.current.data).toEqual({ kind: 'track', id: 1 }));
    expect(fetchMock.mock.calls[0][0]).toBe('/api/sc/resolve?url=https%3A%2F%2Fsoundcloud.com%2Fa%2Fb');
  });

  it('skips when the URL is undefined', () => {
    const { result } = renderHook(() => useResolve(undefined), { wrapper });
    expect(result.current.data).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('authenticated hooks', () => {
  it('useMeFeed does not fetch when signed out', () => {
    const { result } = renderHook(() => useMeFeed(), { wrapper });
    expect(result.current.data).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('useMeFeed returns the activity feed when signed in', async () => {
    const { result } = await renderAuthed(() => useMeFeed(), { collection: [{ type: 'track' }] });
    await waitFor(() => expect(result.current.hook.data).toEqual({ collection: [{ type: 'track' }] }));
    expect(fetchMock.mock.calls[2][0]).toBe('/api/sc/me/feed');
    expect(fetchMock.mock.calls[2][1].headers).toMatchObject({ authorization: 'Bearer tok' });
  });

  it.each([
    ['a bare array', [{ id: 1 }], [{ id: 1 }]],
    ['a paginated collection', { collection: [{ id: 2 }] }, [{ id: 2 }]],
    ['an object with no collection', {}, []],
  ])('useMeRecentlyPlayed handles %s', async (_label, response, expected) => {
    const { result } = await renderAuthed(() => useMeRecentlyPlayed(), response);
    await waitFor(() => expect(result.current.hook.data).toEqual(expected));
    expect(fetchMock.mock.calls[2][0]).toBe('/api/sc/me/recently-played');
  });

  it.each([
    ['a paginated collection', { collection: [{ urn: 'a' }] }, [{ urn: 'a' }]],
    ['a bare array', [{ urn: 'b' }], [{ urn: 'b' }]],
  ])('useMeLikesSystemPlaylists handles %s', async (_label, response, expected) => {
    const { result } = await renderAuthed(() => useMeLikesSystemPlaylists(), response);
    await waitFor(() => expect(result.current.hook.data).toEqual(expected));
    expect(fetchMock.mock.calls[2][0]).toBe('/api/sc/me/likes/system-playlists');
  });
});

describe('useSCFetch internals', () => {
  it('shares one in-flight request between two hooks asking for the same URL', async () => {
    let resolve!: (v: unknown) => void;
    fetchMock.mockImplementationOnce(() => new Promise((r) => { resolve = r; }));
    const a = renderHook(() => useSCFetch<{ id: number }>('/api/sc/dedupe-me'), { wrapper });
    const b = renderHook(() => useSCFetch<{ id: number }>('/api/sc/dedupe-me'), { wrapper });
    await act(async () => {
      resolve({ ok: true, json: async () => ({ id: 5 }) });
    });
    await waitFor(() => expect(a.result.current.data).toEqual({ id: 5 }));
    await waitFor(() => expect(b.result.current.data).toEqual({ id: 5 }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('wraps a rejected non-Error object using its message', async () => {
    fetchMock.mockRejectedValueOnce({ message: 'boom' });
    const { result } = renderHook(() => useSCFetch('/api/sc/reject-object'), { wrapper });
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.error?.message).toBe('boom');
  });

  it('wraps a rejected primitive by stringifying it', async () => {
    fetchMock.mockRejectedValueOnce('plain failure');
    const { result } = renderHook(() => useSCFetch('/api/sc/reject-string'), { wrapper });
    await waitFor(() => expect(result.current.error).toBeInstanceOf(Error));
    expect(result.current.error?.message).toBe('plain failure');
  });
});
