import type { PkceStore } from "../../server/auth.js";

// ── Base64url helpers (Web Crypto / DOM APIs only) ────────────────────────

function toBase64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function fromBase64url(str: string): Uint8Array {
  const padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const padLength = (4 - (padded.length % 4)) % 4;
  const b64 = padded + "=".repeat(padLength);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

const enc = new TextEncoder();

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return globalThis.crypto.subtle.importKey(
    "raw",
    new Uint8Array(enc.encode(secret)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function hmacSign(key: CryptoKey, data: string): Promise<string> {
  const encoded = enc.encode(data);
  const sig = await globalThis.crypto.subtle.sign("HMAC", key, new Uint8Array(encoded));
  return toBase64url(sig);
}

async function hmacVerify(key: CryptoKey, sig: string, data: string): Promise<boolean> {
  try {
    const encoded = enc.encode(data);
    return await globalThis.crypto.subtle.verify(
      "HMAC",
      key,
      new Uint8Array(fromBase64url(sig)),
      new Uint8Array(encoded),
    );
  } catch {
    return false;
  }
}

// ── CookiePkceStore ───────────────────────────────────────────────────────

/**
 * Cookie-based {@link PkceStore} implementation.
 *
 * Encodes the PKCE verifier into a signed HTTP cookie so it survives across
 * serverless cold starts and multiple server instances without needing an
 * external store (Redis, database, etc.).
 *
 * **How it works:**
 * 1. On login — call `initLogin()`, then `setCookieHeader(state, ttlMs)` to
 *    get the `Set-Cookie` header value. Include this in the login response so
 *    the browser stores the signed verifier.
 * 2. On callback — call `getFromRequest(req)` to read, verify, and load the
 *    verifier from the cookie into the in-process map. Then `exchangeCode()`
 *    will find it via `get(state)`.
 *
 * **Security:** The cookie value is HMAC-SHA256 signed with `secret` (via Web
 * Crypto `SubtleCrypto`). Always use a strong random secret (≥ 32 bytes) from
 * an environment variable. The cookie must be set `HttpOnly`, `Secure` (in
 * production), and `SameSite=Lax`.
 *
 * **Suitable for:** Vercel, AWS Lambda, edge runtimes, and any deployment
 * where you cannot share process memory across instances.
 *
 * @example
 * ```ts
 * // lib/sc-auth.ts
 * import { createSCAuthManager, CookiePkceStore } from "soundcloud-api-ts-next/server";
 *
 * export const cookieStore = new CookiePkceStore(process.env.PKCE_SECRET!);
 * export const scAuth = createSCAuthManager({
 *   clientId: process.env.SC_CLIENT_ID!,
 *   clientSecret: process.env.SC_CLIENT_SECRET!,
 *   redirectUri: process.env.SC_REDIRECT_URI!,
 *   pkceStore: cookieStore,
 * });
 *
 * // app/api/soundcloud/auth/login/route.ts
 * import { scAuth, cookieStore } from "@/lib/sc-auth";
 *
 * export async function GET() {
 *   const { url, state } = await scAuth.initLogin();
 *   const cookieHeader = await cookieStore.setCookieHeader(state, 600_000);
 *   return new Response(null, {
 *     status: 302,
 *     headers: { Location: url, "Set-Cookie": cookieHeader },
 *   });
 * }
 *
 * // app/api/soundcloud/auth/callback/route.ts
 * import { scAuth, cookieStore } from "@/lib/sc-auth";
 *
 * export async function GET(req: Request) {
 *   await cookieStore.getFromRequest(req); // load verifier from cookie
 *   const { searchParams } = new URL(req.url);
 *   const tokens = await scAuth.exchangeCode(
 *     searchParams.get("code")!,
 *     searchParams.get("state")!,
 *   );
 *   // Store tokens securely and redirect
 * }
 * ```
 */
export class CookiePkceStore implements PkceStore {
  /** In-process backing map, populated from the cookie on each callback request. */
  private readonly map = new Map<string, { verifier: string; exp: number }>();
  /** Cached CryptoKey derived from `secret` (lazy, per instance). */
  private _key: CryptoKey | undefined;

  /**
   * @param secret     HMAC-SHA256 signing secret. Use a strong random string
   *                   from an environment variable (≥ 32 bytes recommended).
   * @param cookieName Name of the HTTP cookie. Defaults to `"sc_pkce"`.
   */
  constructor(
    private readonly secret: string,
    readonly cookieName: string = "sc_pkce",
  ) {}

  // ── PkceStore interface ──────────────────────────────────────────────────

  /**
   * Store a verifier in the in-process map.
   * The verifier is embedded into the cookie via {@link setCookieHeader}.
   */
  set(state: string, verifier: string, ttlMs: number): void {
    this.map.set(state, { verifier, exp: Date.now() + ttlMs });
  }

  /**
   * Retrieve a verifier by state from the in-process map.
   * Returns `undefined` if absent or expired.
   */
  get(state: string): string | undefined {
    const entry = this.map.get(state);
    if (!entry) return undefined;
    if (Date.now() > entry.exp) {
      this.map.delete(state);
      return undefined;
    }
    return entry.verifier;
  }

  /** Remove a verifier entry (one-time-use enforcement). */
  delete(state: string): void {
    this.map.delete(state);
  }

  // ── Cookie helpers ───────────────────────────────────────────────────────

  /**
   * Generate the `Set-Cookie` header value for the PKCE verifier cookie.
   *
   * Call this **after** `initLogin()` (which calls `set()` internally) to get
   * the header string to set in your login response. The cookie embeds the
   * state → verifier mapping signed with HMAC-SHA256 so the server can verify
   * integrity on callback.
   *
   * @param state   The state token returned by `initLogin()`.
   * @param ttlMs   Cookie lifetime in milliseconds (should match the PKCE TTL).
   * @param secure  Whether to add the `Secure` cookie flag.
   *                Defaults to `true` when `NODE_ENV === "production"`.
   *
   * @example
   * ```ts
   * const { url, state } = await scAuth.initLogin();
   * const cookieHeader = await cookieStore.setCookieHeader(state, 600_000);
   * return new Response(null, {
   *   status: 302,
   *   headers: { Location: url, "Set-Cookie": cookieHeader },
   * });
   * ```
   */
  async setCookieHeader(
    state: string,
    ttlMs: number,
    secure = (globalThis as { process?: { env?: { NODE_ENV?: string } } })
      .process?.env?.NODE_ENV === "production",
  ): Promise<string> {
    const entry = this.map.get(state);
    if (!entry) {
      throw new Error(
        `CookiePkceStore: no PKCE entry for state "${state}". Call initLogin() before setCookieHeader().`,
      );
    }

    const payloadJson = JSON.stringify({ state, verifier: entry.verifier, exp: entry.exp });
    const payloadBytes = enc.encode(payloadJson);
    const payload = toBase64url(new Uint8Array(payloadBytes).buffer as ArrayBuffer);

    const key = await this._getKey();
    const sig = await hmacSign(key, payload);
    const value = `${payload}.${sig}`;
    const maxAge = Math.floor(ttlMs / 1000);

    const flags = [
      `${this.cookieName}=${value}`,
      "HttpOnly",
      "Path=/",
      `Max-Age=${maxAge}`,
      "SameSite=Lax",
    ];
    if (secure) flags.push("Secure");

    return flags.join("; ");
  }

  /**
   * Read the PKCE cookie from an incoming request, verify its HMAC signature,
   * and load the state → verifier mapping into the in-process map.
   *
   * Call this at the **start** of your OAuth callback handler so that
   * `exchangeCode()` can find the verifier via `get(state)`.
   *
   * Returns the verifier string if the cookie is valid, `undefined` otherwise
   * (missing, tampered, or expired cookie).
   *
   * @param req  The incoming `Request` object (Web API / Next.js App Router).
   *
   * @example
   * ```ts
   * export async function GET(req: Request) {
   *   const verifier = await cookieStore.getFromRequest(req);
   *   if (!verifier) return new Response("Bad request", { status: 400 });
   *   const tokens = await scAuth.exchangeCode(code, state);
   * }
   * ```
   */
  async getFromRequest(req: Request): Promise<string | undefined> {
    const cookieHeader = req.headers.get("cookie") ?? "";
    return this.getFromCookieHeader(cookieHeader);
  }

  /**
   * Read the PKCE cookie from a raw `Cookie` header string.
   * Useful when working with Node.js `IncomingMessage` (Pages Router).
   *
   * @param cookieHeader The raw `Cookie` header value from the request.
   *
   * @example
   * ```ts
   * // Pages Router handler
   * export default async function handler(req, res) {
   *   await cookieStore.getFromCookieHeader(req.headers.cookie ?? "");
   *   const tokens = await scAuth.exchangeCode(code, state);
   * }
   * ```
   */
  async getFromCookieHeader(cookieHeader: string): Promise<string | undefined> {
    const raw = this._parseCookieValue(cookieHeader, this.cookieName);
    if (!raw) return undefined;
    return this._verifyCookieAndLoad(raw);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async _getKey(): Promise<CryptoKey> {
    if (!this._key) {
      this._key = await importHmacKey(this.secret);
    }
    return this._key;
  }

  private async _verifyCookieAndLoad(raw: string): Promise<string | undefined> {
    const dotIdx = raw.lastIndexOf(".");
    if (dotIdx === -1) return undefined;

    const payload = raw.slice(0, dotIdx);
    const receivedSig = raw.slice(dotIdx + 1);

    const key = await this._getKey();
    const valid = await hmacVerify(key, receivedSig, payload);
    if (!valid) return undefined;

    let parsed: unknown;
    try {
      const dec = new TextDecoder();
      parsed = JSON.parse(dec.decode(fromBase64url(payload)));
    } catch {
      return undefined;
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as Record<string, unknown>)["state"] !== "string" ||
      typeof (parsed as Record<string, unknown>)["verifier"] !== "string" ||
      typeof (parsed as Record<string, unknown>)["exp"] !== "number"
    ) {
      return undefined;
    }

    const { state, verifier, exp } = parsed as {
      state: string;
      verifier: string;
      exp: number;
    };

    if (Date.now() > exp) return undefined;

    // Populate in-process map so get(state) works for the current request
    this.map.set(state, { verifier, exp });
    return verifier;
  }

  private _parseCookieValue(header: string, name: string): string | undefined {
    for (const part of header.split(";")) {
      const eqIdx = part.indexOf("=");
      if (eqIdx === -1) continue;
      const k = part.slice(0, eqIdx).trim();
      if (k === name) return part.slice(eqIdx + 1).trim();
    }
    return undefined;
  }
}
