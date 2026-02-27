import { describe, it, expect } from 'vitest';
import { scKeys } from '../query-keys.js';

describe('scKeys', () => {
  it('all returns root key', () => {
    expect(scKeys.all()).toEqual(['sc']);
  });

  it('track returns correct key', () => {
    expect(scKeys.track(123)).toEqual(['sc', 'track', '123']);
    expect(scKeys.track('456')).toEqual(['sc', 'track', '456']);
  });

  it('tracks returns comma-joined ids', () => {
    expect(scKeys.tracks([1, 2, 3])).toEqual(['sc', 'tracks', '1,2,3']);
    expect(scKeys.tracks([])).toEqual(['sc', 'tracks', '']);
  });

  it('user returns correct key', () => {
    expect(scKeys.user(42)).toEqual(['sc', 'user', '42']);
  });

  it('playlist returns correct key', () => {
    expect(scKeys.playlist(99)).toEqual(['sc', 'playlist', '99']);
  });

  it('searchTracks uses "default" when no limit', () => {
    expect(scKeys.searchTracks('lofi')).toEqual(['sc', 'search', 'tracks', 'lofi', 'default']);
  });

  it('searchTracks includes limit when provided', () => {
    expect(scKeys.searchTracks('lofi', 20)).toEqual(['sc', 'search', 'tracks', 'lofi', 20]);
  });

  it('searchUsers uses "default" when no limit', () => {
    expect(scKeys.searchUsers('dj')).toEqual(['sc', 'search', 'users', 'dj', 'default']);
  });

  it('searchUsers includes limit when provided', () => {
    expect(scKeys.searchUsers('dj', 5)).toEqual(['sc', 'search', 'users', 'dj', 5]);
  });

  it('me returns correct key', () => {
    expect(scKeys.me()).toEqual(['sc', 'me']);
  });

  it('meConnections returns correct key', () => {
    expect(scKeys.meConnections()).toEqual(['sc', 'me', 'connections']);
  });

  it('keys are readonly tuples (as const)', () => {
    const key = scKeys.track(1);
    // TypeScript ensures these are tuples, length check confirms it
    expect(key.length).toBe(3);
  });
});
