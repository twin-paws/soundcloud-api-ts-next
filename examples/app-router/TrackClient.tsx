"use client";
/**
 * Example: Client Component using the useTrack hook.
 *
 * Demonstrates `enabled`, `refreshInterval`, and the hook's standard
 * { data, loading, error } shape.
 */

import { useTrack, usePlayer } from "soundcloud-api-ts-next";

interface Props {
  trackId: number;
  /** Only fetch when the user has scrolled the component into view */
  visible?: boolean;
}

export function TrackClient({ trackId, visible = true }: Props) {
  const { data: track, loading, error } = useTrack(trackId, {
    enabled: visible,          // skip fetch until visible
    refreshInterval: 30_000,   // re-fetch every 30 s (for live play counts)
  });

  const player = usePlayer(visible ? trackId : undefined);

  if (loading) return <p>Loading track…</p>;
  if (error) return <p>Error: {error.message}</p>;
  if (!track) return null;

  return (
    <div>
      <h2>{track.title}</h2>
      <p>{track.user.username}</p>

      <button onClick={player.toggle}>
        {player.playing ? "⏸ Pause" : "▶ Play"}
      </button>

      <progress value={player.progress} max={player.duration} style={{ width: "100%" }} />
    </div>
  );
}
