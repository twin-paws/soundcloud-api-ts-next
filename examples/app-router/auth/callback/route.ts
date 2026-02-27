/**
 * Example: OAuth callback route using SCAuthManager + CookiePkceStore.
 *
 * Mount at: app/api/soundcloud/auth/callback/route.ts
 *
 * This route is called by SoundCloud after the user authorizes your app.
 * It exchanges the authorization code for access + refresh tokens.
 *
 * CookiePkceStore stores the PKCE verifier in a signed httpOnly cookie,
 * making it safe for serverless/edge deployments where in-memory state
 * doesn't persist across function invocations.
 *
 * @see docs/auth-distributed.md for more on distributed deployments
 */

import { createSCAuthManager } from "soundcloud-api-ts-next/server";
import { NextResponse } from "next/server";

const scAuth = createSCAuthManager({
  clientId: process.env.SC_CLIENT_ID!,
  clientSecret: process.env.SC_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/soundcloud/auth/callback`,
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing code or state" },
      { status: 400 },
    );
  }

  try {
    const tokens = await scAuth.exchangeCode(code, state);

    // Redirect to your app with tokens in URL hash (client-side only) or
    // store in a secure httpOnly cookie and redirect to protected page.
    // Example: redirect with token info (adjust for your session strategy)
    const redirectUrl = new URL("/", process.env.NEXT_PUBLIC_BASE_URL!);
    redirectUrl.searchParams.set("access_token", tokens.access_token);
    redirectUrl.searchParams.set("expires_in", String(tokens.expires_in));

    return NextResponse.redirect(redirectUrl.toString());
  } catch {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/?error=auth_failed`,
    );
  }
}
