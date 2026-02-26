import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { SoundCloudProvider } from '../../client/provider.js';
import { useInfinite } from '../../client/hooks/useInfinite.js';
import { useInfiniteTrackSearch } from '../../client/hooks/useInfiniteTrackSearch.js';
import { useInfiniteUserSearch } from '../../client/hooks/useInfiniteUserSearch.js';
import { useInfinitePlaylistSearch } from '../../client/hooks/useInfinitePlaylistSearch.js';
import { useInfiniteUserTracks } from '../../client/hooks/useInfiniteUserTracks.js';
import { useInfiniteUserPlaylists } from '../../client/hooks/useInfiniteUserPlaylists.js';
import { useInfiniteUserLikes } from '../../client/hooks/useInfiniteUserLikes.js';
import { useInfiniteUserFollowers } from '../../client/hooks/useInfiniteUserFollowers.js';
import { useInfiniteUserFollowings } from '../../client/hooks/useInfiniteUserFollowings.js';
import { useInfiniteTrackComments } from '../../client/hooks/useInfiniteTrackComments.js';
import { useInfinitePlaylistTracks } from '../../client/hooks/useInfinitePlaylistTracks.js';
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
function mockFail(s: number) {
  fetchMock.mockResolvedValueOnce({ ok: false, status: s, json: async () => ({}) });
}
function mockAbortable() {
  fetchMock.mockImplementationOnce((_url: string, opts: any) =>
    new Promise((_resolve, reject) => {
      opts.signal.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted', 'AbortError'))
      );
    })
  );
}

// ── useInfinite base ──
describe('useInfinite', () => {
  it('fetches initial page', async () => {
    mockOk({ collection: [{ id: 1 }, { id: 2 }], next_href: 'http://next' });
    const { result } = renderHook(() => useInfinite('/test'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.hasMore).toBe(true);
  });

  it('loadMore fetches next page', async () => {
    mockOk({ collection: [{ id: 1 }], next_href: 'http://next' });
    const { result } = renderHook(() => useInfinite('/test'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    mockOk({ collection: [{ id: 2 }], next_href: null });
    await act(async () => { result.current.loadMore(); });
    await waitFor(() => expect(result.current.data).toHaveLength(2));
    expect(result.current.hasMore).toBe(false);
  });

  it('reset clears and re-fetches', async () => {
    mockOk({ collection: [{ id: 1 }], next_href: null });
    const { result } = renderHook(() => useInfinite('/test'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    mockOk({ collection: [{ id: 2 }], next_href: null });
    await act(async () => { result.current.reset(); });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect((result.current.data[0] as any).id).toBe(2);
  });

  it('skips when null url', () => {
    const { result } = renderHook(() => useInfinite(null), { wrapper });
    expect(result.current.data).toEqual([]);
    expect(result.current.hasMore).toBe(false);
  });

  it('skips when not enabled', () => {
    const { result } = renderHook(() => useInfinite('/test', false), { wrapper });
    expect(result.current.data).toEqual([]);
  });

  it('handles fetch error', async () => {
    mockFail(500);
    const { result } = renderHook(() => useInfinite('/test'), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it('handles array response (no collection)', async () => {
    mockOk([{ id: 1 }]);
    const { result } = renderHook(() => useInfinite('/test'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(result.current.hasMore).toBe(false);
  });

  it('ignores AbortError on unmount', async () => {
    mockAbortable();
    const { unmount } = renderHook(() => useInfinite('/test'), { wrapper });
    unmount();
    await new Promise((r) => setTimeout(r, 10));
  });

  it('unmount during loadMore fetch — mountedRef false path', async () => {
    mockOk({ collection: [{ id: 1 }], next_href: 'http://next' });
    const { result, unmount } = renderHook(() => useInfinite('/test'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    // loadMore fetch that resolves successfully AFTER unmount
    let resolveFn: (val: any) => void;
    fetchMock.mockImplementationOnce((_url: string, _opts: any) =>
      new Promise((resolve) => { resolveFn = resolve; })
    );
    act(() => { result.current.loadMore(); });
    unmount(); // mountedRef.current = false

    // Resolve the fetch — should hit `if (!mountedRef.current) return`
    await act(async () => {
      resolveFn!({ ok: true, json: async () => ({ collection: [{ id: 2 }], next_href: null }) });
    });
    await new Promise((r) => setTimeout(r, 10));
  });

  it('unmount during fetch error — mountedRef false in catch', async () => {
    mockOk({ collection: [{ id: 1 }], next_href: 'http://next' });
    const { result, unmount } = renderHook(() => useInfinite('/test'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));

    let rejectFn: (err: Error) => void;
    fetchMock.mockImplementationOnce((_url: string, _opts: any) =>
      new Promise((_, reject) => { rejectFn = reject; })
    );
    act(() => { result.current.loadMore(); });
    unmount(); // mountedRef.current = false

    // Reject the fetch — should hit `if (mountedRef.current) setError(err)` with false
    await act(async () => {
      rejectFn!(new Error('fail'));
    });
    await new Promise((r) => setTimeout(r, 10));
  });

  it('loadMore is no-op when no nextHref', async () => {
    mockOk({ collection: [{ id: 1 }], next_href: null });
    const { result } = renderHook(() => useInfinite('/test'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    act(() => { result.current.loadMore(); });
    // Should still have same data
    expect(result.current.data).toHaveLength(1);
  });

  it('clears data when url changes to null', async () => {
    mockOk({ collection: [{ id: 1 }], next_href: null });
    const { result, rerender } = renderHook(
      ({ url }) => useInfinite(url),
      { wrapper, initialProps: { url: '/test' as string | null } },
    );
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    rerender({ url: null });
    await waitFor(() => expect(result.current.data).toEqual([]));
  });

  it('reset with null url does not fetch', () => {
    const { result } = renderHook(() => useInfinite(null), { wrapper });
    act(() => { result.current.reset(); });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

// ── Typed infinite hooks ──
function testInfiniteSearchHook(name: string, hook: (q: string, opts?: any) => any) {
  describe(name, () => {
    it('fetches with query', async () => {
      mockOk({ collection: [{ id: 1 }], next_href: null });
      const { result } = renderHook(() => hook('test'), { wrapper });
      await waitFor(() => expect(result.current.data).toHaveLength(1));
    });
    it('skips empty query', () => {
      const { result } = renderHook(() => hook(''), { wrapper });
      expect(result.current.data).toEqual([]);
    });
    it('passes limit option', async () => {
      mockOk({ collection: [], next_href: null });
      renderHook(() => hook('q', { limit: 5 }), { wrapper });
      await waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(fetchMock.mock.calls[0][0]).toContain('limit=5');
    });
  });
}

testInfiniteSearchHook('useInfiniteTrackSearch', useInfiniteTrackSearch);
testInfiniteSearchHook('useInfiniteUserSearch', useInfiniteUserSearch);
testInfiniteSearchHook('useInfinitePlaylistSearch', useInfinitePlaylistSearch);

function testInfiniteIdHook(name: string, hook: (id: any) => any) {
  describe(name, () => {
    it('fetches with id', async () => {
      mockOk({ collection: [{ id: 1 }], next_href: null });
      const { result } = renderHook(() => hook(1), { wrapper });
      await waitFor(() => expect(result.current.data).toHaveLength(1));
    });
    it('skips when null', () => {
      const { result } = renderHook(() => hook(null), { wrapper });
      expect(result.current.data).toEqual([]);
    });
  });
}

testInfiniteIdHook('useInfiniteUserTracks', useInfiniteUserTracks);
testInfiniteIdHook('useInfiniteUserPlaylists', useInfiniteUserPlaylists);
testInfiniteIdHook('useInfiniteUserLikes', useInfiniteUserLikes);
testInfiniteIdHook('useInfiniteUserFollowers', useInfiniteUserFollowers);
testInfiniteIdHook('useInfiniteUserFollowings', useInfiniteUserFollowings);
testInfiniteIdHook('useInfiniteTrackComments', useInfiniteTrackComments);
testInfiniteIdHook('useInfinitePlaylistTracks', useInfinitePlaylistTracks);
