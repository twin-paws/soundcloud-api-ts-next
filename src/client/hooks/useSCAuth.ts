"use client";

import { useSoundCloudContext } from "../provider.js";

/**
 * Access SoundCloud OAuth authentication state and actions.
 *
 * Provides the current user, login/logout functions, and a callback handler
 * for completing the OAuth flow.
 *
 * @returns An object with `user`, `isAuthenticated`, `loading`, `login`, `logout`, and `handleCallback`.
 *
 * @example
 * ```tsx
 * import { useSCAuth } from "soundcloud-api-ts-next";
 *
 * function AuthButton() {
 *   const { isAuthenticated, user, login, logout } = useSCAuth();
 *   if (isAuthenticated) return <button onClick={logout}>Logout {user?.username}</button>;
 *   return <button onClick={login}>Login with SoundCloud</button>;
 * }
 * ```
 *
 * @see {@link SoundCloudProvider} for setting up auth context
 * @see {@link useMe} for fetching the current user's profile
 */
export function useSCAuth() {
  const { user, isAuthenticated, authLoading, login, logout, _setAuth, apiPrefix } =
    useSoundCloudContext();

  return {
    /** The authenticated user profile, or `null`. */
    user,
    /** Whether the user is fully authenticated. */
    isAuthenticated,
    /** `true` while user profile is loading after token exchange. */
    loading: authLoading,
    /** Initiate OAuth login — redirects to SoundCloud. */
    login,
    /** Log out and clear all auth state. */
    logout,
    /**
     * Handle OAuth callback — exchange authorization code for tokens.
     *
     * @param code - The authorization code from the callback URL.
     * @param state - The state parameter from the callback URL.
     * @returns The token response from SoundCloud.
     */
    async handleCallback(code: string, state: string) {
      const res = await fetch(`${apiPrefix}/auth/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
      if (!res.ok) throw new Error(`Auth callback failed: ${res.status}`);
      const tokens = await res.json();
      _setAuth({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresIn: tokens.expires_in,
      });
      return tokens;
    },
  };
}
