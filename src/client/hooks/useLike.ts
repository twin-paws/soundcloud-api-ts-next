"use client";

import { useState, useCallback } from "react";
import { useSoundCloudContext } from "../provider.js";

/**
 * Like or unlike a SoundCloud track. Requires authentication.
 *
 * @returns An object with `likeTrack`, `unlikeTrack`, `loading`, and `error`.
 *
 * @example
 * ```tsx
 * import { useLike } from "soundcloud-api-ts-next";
 *
 * function LikeButton({ trackId }: { trackId: number }) {
 *   const { likeTrack, unlikeTrack, loading } = useLike();
 *   return (
 *     <button onClick={() => likeTrack(trackId)} disabled={loading}>
 *       ❤️ Like
 *     </button>
 *   );
 * }
 * ```
 *
 * @see {@link useTrackLikes} for viewing who liked a track
 * @see {@link useMeLikes} for the current user's liked tracks
 * @see {@link useRepost} for reposting tracks
 */
export function useLike() {
  const { apiPrefix, accessToken } = useSoundCloudContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const likeTrack = useCallback(
    async (trackId: string | number) => {
      if (!accessToken) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiPrefix}/tracks/${trackId}/like`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiPrefix, accessToken],
  );

  const unlikeTrack = useCallback(
    async (trackId: string | number) => {
      if (!accessToken) throw new Error("Not authenticated");
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiPrefix}/tracks/${trackId}/like`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err: any) {
        setError(err);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [apiPrefix, accessToken],
  );

  return { likeTrack, unlikeTrack, loading, error };
}
