# Auth in Distributed Deployments

SoundCloud OAuth 2.1 + PKCE requires the server to hold a **PKCE verifier** (a random string) between two requests: the `/auth/login` request that starts the flow, and the `/auth/callback` request that finishes it. By default, `SCAuthManager` stores verifiers in-process memory — which works fine for long-lived Node.js servers, but **breaks on serverless and multi-instance deployments** where each invocation may run on a different process.

This guide explains the problem, the available store implementations, and the recommended solution per deployment type.

---

## The Problem: In-Memory Store on Serverless

On **Vercel**, **AWS Lambda**, **Cloudflare Workers**, and similar serverless/edge platforms:

- Each function invocation may start a **cold process** with a fresh in-memory store.
- Two consecutive requests (login → callback) may land on **different instances**.
- The PKCE verifier stored during `/auth/login` **does not survive** to `/auth/callback` → `exchangeCode()` throws "Invalid or expired OAuth state".

On **multi-region Node.js** (e.g. multiple PM2 workers, Kubernetes pods):

- Requests are load-balanced across instances.
- The in-memory store is **not shared** between instances.
- Same failure mode: login and callback hit different workers.

---

## Single Instance vs. Distributed

| Deployment type | Store to use |
|---|---|
| Single Node.js process (local dev, single PM2 worker) | `MemoryPkceStore` (default) |
| Vercel / AWS Lambda / serverless functions | `CookiePkceStore` |
| Multi-instance Node.js (multiple workers / pods) | Redis adapter (custom `PkceStore`) |
| Edge runtime (Cloudflare Workers, Vercel Edge) | `CookiePkceStore` (no `node:crypto`? use Web Crypto API) |

---

## Option 1: Default In-Memory Store (Single Instance)

No configuration needed — the default behavior:

```ts
// lib/sc-auth.ts
import { createSCAuthManager } from "soundcloud-api-ts-next/server";

export const scAuth = createSCAuthManager({
  clientId: process.env.SC_CLIENT_ID!,
  clientSecret: process.env.SC_CLIENT_SECRET!,
  redirectUri: process.env.SC_REDIRECT_URI!,
  // pkceStore omitted → uses MemoryPkceStore internally
});
```

You can also pass `MemoryPkceStore` explicitly for clarity:

```ts
import { createSCAuthManager, MemoryPkceStore } from "soundcloud-api-ts-next/server";

export const scAuth = createSCAuthManager({
  clientId: process.env.SC_CLIENT_ID!,
  clientSecret: process.env.SC_CLIENT_SECRET!,
  redirectUri: process.env.SC_REDIRECT_URI!,
  pkceStore: new MemoryPkceStore(),
});
```

---

## Option 2: Cookie Store (Vercel / Serverless)

`CookiePkceStore` encodes the PKCE verifier into a **signed HTTP cookie** (`sc_pkce` by default). The verifier travels with the browser — so it's available on any instance that receives the callback, with no external storage required.

**Security:** The cookie is HMAC-SHA256 signed with a secret you control. It is never readable by JavaScript (set `HttpOnly`), only sent over HTTPS (set `Secure` in production), and scoped to the auth callback path.

### Setup

```ts
// lib/sc-auth.ts
import { createSCAuthManager, CookiePkceStore } from "soundcloud-api-ts-next/server";

export const cookieStore = new CookiePkceStore(
  process.env.PKCE_SECRET!,  // Strong random secret (≥ 32 bytes)
  "sc_pkce",                  // Optional: custom cookie name
);

export const scAuth = createSCAuthManager({
  clientId: process.env.SC_CLIENT_ID!,
  clientSecret: process.env.SC_CLIENT_SECRET!,
  redirectUri: process.env.SC_REDIRECT_URI!,
  pkceStore: cookieStore,
});
```

### Login Route

```ts
// app/api/soundcloud/auth/login/route.ts
import { scAuth, cookieStore } from "@/lib/sc-auth";

export async function GET() {
  const { url, state } = await scAuth.initLogin();

  // Get the Set-Cookie header that embeds the signed verifier
  const cookieHeader = cookieStore.setCookieHeader(state, 600_000); // 10 min TTL

  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Set-Cookie": cookieHeader,
    },
  });
}
```

### Callback Route

```ts
// app/api/soundcloud/auth/callback/route.ts
import { scAuth, cookieStore } from "@/lib/sc-auth";

export async function GET(req: Request) {
  // Load verifier from cookie into in-process map
  const verifier = cookieStore.getFromRequest(req);
  if (!verifier) {
    return new Response("Invalid or missing PKCE cookie", { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  if (!code || !state) {
    return new Response("Missing code or state", { status: 400 });
  }

  try {
    const tokens = await scAuth.exchangeCode(code, state);
    // Store tokens securely (httpOnly cookie, session store, etc.)
    // Clear the PKCE cookie (it's been consumed)
    return new Response(JSON.stringify(tokens), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        // Clear the PKCE cookie
        "Set-Cookie": `sc_pkce=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`,
      },
    });
  } catch (err) {
    return new Response("Auth failed", { status: 400 });
  }
}
```

---

## Option 3: Redis Adapter (Multi-Region Node.js)

For multi-instance Node.js deployments, implement the `PkceStore` interface with Redis (or any shared store):

```ts
import { createSCAuthManager } from "soundcloud-api-ts-next/server";
import type { PkceStore } from "soundcloud-api-ts-next/server";
import { Redis } from "ioredis"; // or your Redis client of choice

const redis = new Redis(process.env.REDIS_URL!);

const redisPkceStore: PkceStore = {
  async set(state, verifier, ttlMs) {
    await redis.set(`sc:pkce:${state}`, verifier, "PX", ttlMs);
  },
  async get(state) {
    const val = await redis.get(`sc:pkce:${state}`);
    return val ?? undefined;
  },
  async delete(state) {
    await redis.del(`sc:pkce:${state}`);
  },
};

export const scAuth = createSCAuthManager({
  clientId: process.env.SC_CLIENT_ID!,
  clientSecret: process.env.SC_CLIENT_SECRET!,
  redirectUri: process.env.SC_REDIRECT_URI!,
  pkceStore: redisPkceStore,
});
```

No new dependencies are required by `soundcloud-api-ts-next` — the Redis client is your own choice.

---

## Multi-Tenant / Parallel Logins

If your app supports multiple simultaneous OAuth flows (e.g. multiple browser tabs, or user-agent parallel logins), pass a `sessionId` to `initLogin()` to scope the state token:

```ts
// Include the current session ID to prevent login collisions
const sessionId = req.cookies["session_id"] ?? crypto.randomUUID();
const { url, state } = await scAuth.initLogin({ sessionId });
```

This makes the OAuth state `<sessionId>:<random-uuid>` instead of just `<random-uuid>`, so two concurrent flows from the same user-agent use distinct state keys.

---

## Cookie Options for Production

When setting any auth-related cookie in your route handlers, always use:

| Flag | Value | Reason |
|---|---|---|
| `HttpOnly` | (always) | Prevents JavaScript access — XSS can't steal the cookie |
| `Secure` | `process.env.NODE_ENV === "production"` | HTTPS only in production |
| `SameSite` | `Lax` | Protects against CSRF while allowing top-level navigations |
| `Max-Age` | `600` (10 minutes) | Matches the PKCE TTL; don't leave it longer than necessary |
| `Path` | `/` (or `/api/soundcloud/auth`) | Scope to the minimum necessary path |

`CookiePkceStore.setCookieHeader()` sets `HttpOnly`, `Path=/`, `SameSite=Lax`, and `Max-Age` automatically. Pass `secure: true` (or leave it to auto-detect from `NODE_ENV`) for the `Secure` flag.

For the OAuth state cookie (if you set one separately to verify CSRF):

```ts
const isProduction = process.env.NODE_ENV === "production";
const stateCookie = [
  `${scAuth.stateCookieName}=${state}`,
  "HttpOnly",
  "Path=/",
  "Max-Age=600",
  "SameSite=Lax",
  isProduction ? "Secure" : "",
].filter(Boolean).join("; ");
```

---

## Summary

| Scenario | Recommended store | External infra needed? |
|---|---|---|
| Local dev / single worker | `MemoryPkceStore` (default) | No |
| Vercel (serverless) | `CookiePkceStore` | No — verifier in cookie |
| Vercel Edge / Cloudflare | `CookiePkceStore` (Web Crypto) | No |
| Multi-region Node.js | Redis `PkceStore` adapter | Yes — Redis |
| Custom KV / DB | Implement `PkceStore` | Depends on store |
