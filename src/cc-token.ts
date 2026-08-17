import { SoundCloudError } from "soundcloud-api-ts";
import type { SoundCloudClient, SoundCloudToken } from "soundcloud-api-ts";

/**
 * Cache a client-credentials token and renew it with the official
 * `refresh_token` grant (50 new CC tokens / 12h / app).
 */
export function createCcTokenCache(getClient: () => SoundCloudClient) {
  let access: string | undefined;
  let refresh: string | undefined;
  let expiry = 0;
  let inflight: Promise<string> | null = null;

  async function mint(): Promise<SoundCloudToken> {
    if (refresh) {
      try {
        return await getClient().auth.refreshToken(refresh);
      } catch (err) {
        refresh = undefined;
        if (err instanceof SoundCloudError && err.isInvalidGrant) {
          return getClient().auth.getClientToken();
        }
        throw err;
      }
    }
    return getClient().auth.getClientToken();
  }

  function ensure(): Promise<string> {
    if (access && Date.now() < expiry) return Promise.resolve(access);
    if (inflight) return inflight;
    inflight = (async () => {
      const result = await mint();
      access = result.access_token;
      if (result.refresh_token) refresh = result.refresh_token;
      expiry = Date.now() + (result.expires_in - 300) * 1000;
      return access!;
    })().finally(() => {
      inflight = null;
    });
    return inflight;
  }

  function reset(): void {
    access = undefined;
    refresh = undefined;
    expiry = 0;
    inflight = null;
  }

  return { ensure, reset };
}
