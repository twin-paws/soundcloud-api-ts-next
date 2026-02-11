import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { SoundCloudProvider } from '../../client/provider.js';
import { useFollow } from '../../client/hooks/useFollow.js';
import { useLike } from '../../client/hooks/useLike.js';
import { useRepost } from '../../client/hooks/useRepost.js';
import { useSCAuth } from '../../client/hooks/useSCAuth.js';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
);

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn(); globalThis.fetch = fetchMock; });
afterEach(() => { vi.restoreAllMocks(); });

async function authenticate(result: any) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ access_token: 'tok', refresh_token: 'ref', expires_in: 3600 }),
  });
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({ id: 1, username: 'u' }),
  });
  await act(async () => {
    await result.current.auth.handleCallback('code', 'state');
  });
  await waitFor(() => expect(result.current.auth.isAuthenticated).toBe(true));
}

// ── useFollow ──
describe('useFollow', () => {
  it('throws when not authenticated', async () => {
    const { result } = renderHook(() => useFollow(), { wrapper });
    await expect(result.current.follow(1)).rejects.toThrow('Not authenticated');
  });

  it('unfollow throws when not authenticated', async () => {
    const { result } = renderHook(() => useFollow(), { wrapper });
    await expect(result.current.unfollow(1)).rejects.toThrow('Not authenticated');
  });

  it('follow makes POST request', async () => {
    const { result } = renderHook(() => ({ auth: useSCAuth(), hook: useFollow() }), { wrapper });
    await authenticate(result);

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await act(async () => { await result.current.hook.follow(42); });
    const call = fetchMock.mock.calls.find((c: any) => c[0].includes('/me/follow/42'));
    expect(call).toBeTruthy();
    expect(call[1].method).toBe('POST');
  });

  it('unfollow makes DELETE request', async () => {
    const { result } = renderHook(() => ({ auth: useSCAuth(), hook: useFollow() }), { wrapper });
    await authenticate(result);

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await act(async () => { await result.current.hook.unfollow(42); });
    const call = fetchMock.mock.calls.find((c: any) => c[0].includes('/me/follow/42') && c[1]?.method === 'DELETE');
    expect(call).toBeTruthy();
  });

  it('follow handles error', async () => {
    const { result } = renderHook(() => ({ auth: useSCAuth(), hook: useFollow() }), { wrapper });
    await authenticate(result);

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    let err: any;
    await act(async () => {
      try { await result.current.hook.follow(1); } catch (e) { err = e; }
    });
    expect(err).toBeTruthy();
    expect(result.current.hook.error).toBeTruthy();
  });

  it('unfollow handles error', async () => {
    const { result } = renderHook(() => ({ auth: useSCAuth(), hook: useFollow() }), { wrapper });
    await authenticate(result);

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    let err: any;
    await act(async () => {
      try { await result.current.hook.unfollow(1); } catch (e) { err = e; }
    });
    expect(err).toBeTruthy();
    expect(result.current.hook.error).toBeTruthy();
  });
});

// ── useLike ──
describe('useLike', () => {
  it('throws when not authenticated', async () => {
    const { result } = renderHook(() => useLike(), { wrapper });
    await expect(result.current.likeTrack(1)).rejects.toThrow('Not authenticated');
  });

  it('unlikeTrack throws when not authenticated', async () => {
    const { result } = renderHook(() => useLike(), { wrapper });
    await expect(result.current.unlikeTrack(1)).rejects.toThrow('Not authenticated');
  });

  it('likeTrack makes POST', async () => {
    const { result } = renderHook(() => ({ auth: useSCAuth(), hook: useLike() }), { wrapper });
    await authenticate(result);

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await act(async () => { await result.current.hook.likeTrack(10); });
    const call = fetchMock.mock.calls.find((c: any) => c[0].includes('/tracks/10/like'));
    expect(call[1].method).toBe('POST');
  });

  it('unlikeTrack makes DELETE', async () => {
    const { result } = renderHook(() => ({ auth: useSCAuth(), hook: useLike() }), { wrapper });
    await authenticate(result);

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await act(async () => { await result.current.hook.unlikeTrack(10); });
    const call = fetchMock.mock.calls.find((c: any) => c[0].includes('/tracks/10/like') && c[1]?.method === 'DELETE');
    expect(call).toBeTruthy();
  });

  it('likeTrack handles error', async () => {
    const { result } = renderHook(() => ({ auth: useSCAuth(), hook: useLike() }), { wrapper });
    await authenticate(result);

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    let err: any;
    await act(async () => {
      try { await result.current.hook.likeTrack(1); } catch (e) { err = e; }
    });
    expect(err).toBeTruthy();
    expect(result.current.hook.error).toBeTruthy();
  });

  it('unlikeTrack handles error', async () => {
    const { result } = renderHook(() => ({ auth: useSCAuth(), hook: useLike() }), { wrapper });
    await authenticate(result);

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    let err: any;
    await act(async () => {
      try { await result.current.hook.unlikeTrack(1); } catch (e) { err = e; }
    });
    expect(err).toBeTruthy();
    expect(result.current.hook.error).toBeTruthy();
  });
});

// ── useRepost ──
describe('useRepost', () => {
  it('throws when not authenticated', async () => {
    const { result } = renderHook(() => useRepost(), { wrapper });
    await expect(result.current.repostTrack(1)).rejects.toThrow('Not authenticated');
  });

  it('unrepostTrack throws when not authenticated', async () => {
    const { result } = renderHook(() => useRepost(), { wrapper });
    await expect(result.current.unrepostTrack(1)).rejects.toThrow('Not authenticated');
  });

  it('repostTrack makes POST', async () => {
    const { result } = renderHook(() => ({ auth: useSCAuth(), hook: useRepost() }), { wrapper });
    await authenticate(result);

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await act(async () => { await result.current.hook.repostTrack(10); });
    const call = fetchMock.mock.calls.find((c: any) => c[0].includes('/tracks/10/repost'));
    expect(call[1].method).toBe('POST');
  });

  it('unrepostTrack makes DELETE', async () => {
    const { result } = renderHook(() => ({ auth: useSCAuth(), hook: useRepost() }), { wrapper });
    await authenticate(result);

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    await act(async () => { await result.current.hook.unrepostTrack(10); });
    const call = fetchMock.mock.calls.find((c: any) => c[0].includes('/tracks/10/repost') && c[1]?.method === 'DELETE');
    expect(call).toBeTruthy();
  });

  it('repostTrack handles error', async () => {
    const { result } = renderHook(() => ({ auth: useSCAuth(), hook: useRepost() }), { wrapper });
    await authenticate(result);

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    let err: any;
    await act(async () => {
      try { await result.current.hook.repostTrack(1); } catch (e) { err = e; }
    });
    expect(err).toBeTruthy();
    expect(result.current.hook.error).toBeTruthy();
  });

  it('unrepostTrack handles error', async () => {
    const { result } = renderHook(() => ({ auth: useSCAuth(), hook: useRepost() }), { wrapper });
    await authenticate(result);

    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    let err: any;
    await act(async () => {
      try { await result.current.hook.unrepostTrack(1); } catch (e) { err = e; }
    });
    expect(err).toBeTruthy();
    expect(result.current.hook.error).toBeTruthy();
  });
});
