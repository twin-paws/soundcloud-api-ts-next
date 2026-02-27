/**
 * Example: Server Component that fetches a SoundCloud track server-side.
 *
 * Uses the `getTrack` server helper with Next.js `unstable_cache` revalidation.
 * Credentials never leave the server.
 */

import { createSoundCloudServerClient } from "soundcloud-api-ts-next/server";

// Shared server client — configured once per module
const sc = createSoundCloudServerClient({
  clientId: process.env.SC_CLIENT_ID!,
  clientSecret: process.env.SC_CLIENT_SECRET!,
});

interface Props {
  params: { id: string };
}

export default async function TrackPage({ params }: Props) {
  // Fetch with ISR: cache for 60 seconds, tag for on-demand revalidation
  const track = await sc.getTrack(parseInt(params.id, 10), {
    revalidate: 60,
    tags: [`track-${params.id}`],
  });

  if (!track) {
    return <p>Track not found.</p>;
  }

  return (
    <main>
      <img src={track.artwork_url ?? undefined} alt={track.title} width={300} />
      <h1>{track.title}</h1>
      <p>by {track.user.username}</p>
      <p>{track.playback_count?.toLocaleString()} plays</p>
    </main>
  );
}
