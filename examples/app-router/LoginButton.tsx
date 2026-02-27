"use client";
/**
 * Example: Login button that kicks off the SoundCloud OAuth PKCE flow.
 *
 * Calls your Next.js `/api/soundcloud/auth/login` route, then redirects
 * the user to SoundCloud's authorization page.
 */

import { useSCAuth } from "soundcloud-api-ts-next";

export function LoginButton() {
  const { isAuthenticated, user, login, logout, loading } = useSCAuth();

  if (loading) return <p>Loading…</p>;

  if (isAuthenticated && user) {
    return (
      <div>
        <p>Logged in as {user.username}</p>
        <button onClick={logout}>Log out</button>
      </div>
    );
  }

  return (
    <button onClick={login} disabled={loading}>
      Connect SoundCloud
    </button>
  );
}
