import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { SoundCloudProvider } from '../../client/provider.js';
import { usePlayer } from '../../client/hooks/usePlayer.js';
import type { ReactNode } from 'react';

const wrapper = ({ children }: { children: ReactNode }) => (
  <SoundCloudProvider apiPrefix="/api/sc">{children}</SoundCloudProvider>
);

let fetchMock: ReturnType<typeof vi.fn>;
let audioInstances: any[];
let OrigAudio: typeof Audio;

beforeEach(() => {
  fetchMock = vi.fn();
  globalThis.fetch = fetchMock;
  audioInstances = [];
  OrigAudio = globalThis.Audio;

  globalThis.Audio = vi.fn(function(this: any, url?: string) {
    const instance: any = {
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      currentTime: 0,
      duration: 180,
      src: url || '',
      paused: true,
    };
    audioInstances.push(instance);
    return instance;
  }) as any;
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.Audio = OrigAudio;
});

function mockStreamOk(data: any = { url: 'https://example.com/stream.mp3' }) {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => data,
  });
}

function getAudio() { return audioInstances[0]; }

function getListener(evt: string) {
  const audio = getAudio();
  const call = audio.addEventListener.mock.calls.find((c: any) => c[0] === evt);
  return call?.[1];
}

describe('usePlayer', () => {
  it('starts paused with zero progress', () => {
    mockStreamOk();
    const { result } = renderHook(() => usePlayer(1), { wrapper });
    expect(result.current.playing).toBe(false);
    expect(result.current.progress).toBe(0);
    expect(result.current.duration).toBe(0);
  });

  it('creates audio after stream fetch', async () => {
    mockStreamOk();
    renderHook(() => usePlayer(1), { wrapper });
    await waitFor(() => expect(audioInstances.length).toBe(1));
  });

  it('play/pause/toggle/seek work', async () => {
    mockStreamOk();
    const { result } = renderHook(() => usePlayer(1), { wrapper });
    await waitFor(() => expect(audioInstances.length).toBe(1));

    // play
    act(() => { result.current.play(); });
    expect(result.current.playing).toBe(true);
    expect(getAudio().play).toHaveBeenCalled();

    // pause
    act(() => { result.current.pause(); });
    expect(result.current.playing).toBe(false);
    expect(getAudio().pause).toHaveBeenCalled();

    // toggle (currently paused)
    getAudio().paused = true;
    act(() => { result.current.toggle(); });
    expect(result.current.playing).toBe(true);

    // toggle (currently playing)
    getAudio().paused = false;
    act(() => { result.current.toggle(); });
    expect(result.current.playing).toBe(false);

    // seek
    act(() => { result.current.seek(30); });
    expect(getAudio().currentTime).toBe(30);
    expect(result.current.progress).toBe(30);
  });

  it('audio events update state', async () => {
    mockStreamOk();
    const { result } = renderHook(() => usePlayer(1), { wrapper });
    await waitFor(() => expect(audioInstances.length).toBe(1));

    // loadedmetadata
    getAudio().duration = 200;
    act(() => { getListener('loadedmetadata')(); });
    expect(result.current.duration).toBe(200);

    // timeupdate
    getAudio().currentTime = 42;
    act(() => { getListener('timeupdate')(); });
    expect(result.current.progress).toBe(42);

    // ended
    act(() => { result.current.play(); });
    act(() => { getListener('ended')(); });
    expect(result.current.playing).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  it('skips when undefined', () => {
    const { result } = renderHook(() => usePlayer(undefined), { wrapper });
    expect(result.current.playing).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('cleanup on unmount pauses audio', async () => {
    mockStreamOk();
    const { unmount } = renderHook(() => usePlayer(1), { wrapper });
    await waitFor(() => expect(audioInstances.length).toBe(1));
    unmount();
    expect(getAudio().pause).toHaveBeenCalled();
    expect(getAudio().src).toBe('');
  });

  it('handles http_mp3_128_url fallback', async () => {
    mockStreamOk({ http_mp3_128_url: 'https://example.com/mp3' });
    renderHook(() => usePlayer(1), { wrapper });
    await waitFor(() => expect(audioInstances.length).toBe(1));
    expect((globalThis.Audio as any)).toHaveBeenCalledWith('https://example.com/mp3');
  });

  it('handles stream fetch error silently', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({}) });
    const { result } = renderHook(() => usePlayer(1), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 50));
    expect(result.current.playing).toBe(false);
    expect(audioInstances.length).toBe(0);
  });

  it('handles no stream URL in response', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const { result } = renderHook(() => usePlayer(1), { wrapper });
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    await new Promise(r => setTimeout(r, 50));
    expect(result.current.playing).toBe(false);
  });

  it('seek is no-op when no audio', () => {
    const { result } = renderHook(() => usePlayer(undefined), { wrapper });
    act(() => { result.current.seek(10); });
    expect(result.current.progress).toBe(0);
  });

  it('toggle is no-op when no audio (else branch)', () => {
    const { result } = renderHook(() => usePlayer(undefined), { wrapper });
    act(() => { result.current.toggle(); });
    expect(result.current.playing).toBe(false);
  });
});
