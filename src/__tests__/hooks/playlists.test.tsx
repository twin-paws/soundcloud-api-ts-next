import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { SoundCloudProvider } from '../../client/provider.js';
import { usePlaylist } from '../../client/hooks/usePlaylist.js';
import { usePlaylistSearch } from '../../client/hooks/usePlaylistSearch.js';
import { usePlaylistTracks } from '../../client/hooks/usePlaylistTracks.js';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
);

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => { fetchMock = vi.fn(); globalThis.fetch = fetchMock as unknown as typeof fetch; });
afterEach(() => { vi.restoreAllMocks(); });

function mockAbortable() {
  fetchMock.mockImplementationOnce((_url: string, opts: any) =>
    new Promise((_resolve, reject) => {
      opts.signal.addEventListener('abort', () =>
        reject(new DOMException('The operation was aborted', 'AbortError'))
      );
    })
  );
}

function mockOk(data: unknown) {
  fetchMock.mockResolvedValueOnce({ ok: true, json: async () => data });
}
function mockFail(s: number) {
  fetchMock.mockResolvedValueOnce({ ok: false, status: s, json: async () => ({}) });
}

describe('usePlaylist', () => {
  it('ignores AbortError on unmount', async () => {
    mockAbortable();
    const { unmount } = renderHook(() => usePlaylist(1), { wrapper });
    unmount();
    await new Promise((r) => setTimeout(r, 10));
  });

  it('fetches playlist', async () => {
    mockOk({ id: 1, title: 'P' });
    const { result } = renderHook(() => usePlaylist(1), { wrapper });
    await waitFor(() => expect(result.current.data?.title).toBe('P'));
  });
  it('skips when undefined', () => {
    const { result } = renderHook(() => usePlaylist(undefined), { wrapper });
    expect(result.current.data).toBeNull();
  });
  it('handles error', async () => {
    mockFail(500);
    const { result } = renderHook(() => usePlaylist(1), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
  it('resets on undefined', async () => {
    mockOk({ id: 1, title: 'P' });
    const { result, rerender } = renderHook(({ id }) => usePlaylist(id), {
      wrapper, initialProps: { id: 1 as number | undefined },
    });
    await waitFor(() => expect(result.current.data).toBeTruthy());
    rerender({ id: undefined });
    await waitFor(() => expect(result.current.data).toBeNull());
  });
});

describe('usePlaylistSearch', () => {
  it('ignores AbortError on unmount', async () => {
    mockAbortable();
    const { unmount } = renderHook(() => usePlaylistSearch('q'), { wrapper });
    unmount();
    await new Promise((r) => setTimeout(r, 10));
  });

  it('fetches results', async () => {
    mockOk({ collection: [{ id: 1 }] });
    const { result } = renderHook(() => usePlaylistSearch('q'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });
  it('skips empty query', () => {
    const { result } = renderHook(() => usePlaylistSearch(''), { wrapper });
    expect(result.current.data).toBeNull();
  });
  it('handles error', async () => {
    mockFail(500);
    const { result } = renderHook(() => usePlaylistSearch('q'), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
  it('handles array response', async () => {
    mockOk([{ id: 1 }]);
    const { result } = renderHook(() => usePlaylistSearch('q'), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });
  it('resets when empty', async () => {
    mockOk({ collection: [{ id: 1 }] });
    const { result, rerender } = renderHook(({ q }) => usePlaylistSearch(q), {
      wrapper, initialProps: { q: 'test' },
    });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    rerender({ q: '' });
    await waitFor(() => expect(result.current.data).toBeNull());
  });
});

describe('usePlaylistTracks', () => {
  it('ignores AbortError on unmount', async () => {
    mockAbortable();
    const { unmount } = renderHook(() => usePlaylistTracks(1), { wrapper });
    unmount();
    await new Promise((r) => setTimeout(r, 10));
  });

  it('fetches tracks', async () => {
    mockOk({ collection: [{ id: 1 }] });
    const { result } = renderHook(() => usePlaylistTracks(1), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });
  it('skips when undefined', () => {
    const { result } = renderHook(() => usePlaylistTracks(undefined), { wrapper });
    expect(result.current.data).toBeNull();
  });
  it('handles error', async () => {
    mockFail(500);
    const { result } = renderHook(() => usePlaylistTracks(1), { wrapper });
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });
  it('handles array response', async () => {
    mockOk([{ id: 1 }]);
    const { result } = renderHook(() => usePlaylistTracks(1), { wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
  });
});
