"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSoundCloudContext } from "../provider.js";
import type { PlayerState } from "../../types.js";

export function usePlayer(trackId: string | number | undefined): PlayerState {
  const { apiPrefix } = useSoundCloudContext();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  // Fetch stream URL and set up audio element
  useEffect(() => {
    if (trackId == null) return;

    const controller = new AbortController();
    let audio: HTMLAudioElement | null = null;

    fetch(`${apiPrefix}/tracks/${trackId}/stream`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        const url = json.url || json.http_mp3_128_url;
        if (!url) throw new Error("No stream URL returned");

        audio = new Audio(url);
        audioRef.current = audio;

        audio.addEventListener("loadedmetadata", () => {
          setDuration(audio!.duration);
        });

        audio.addEventListener("timeupdate", () => {
          setProgress(audio!.currentTime);
        });

        audio.addEventListener("ended", () => {
          setPlaying(false);
          setProgress(0);
        });
      })
      .catch(() => {
        // Silently handle abort errors
      });

    return () => {
      controller.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
        audioRef.current = null;
      }
      setPlaying(false);
      setProgress(0);
      setDuration(0);
    };
  }, [trackId, apiPrefix]);

  const play = useCallback(() => {
    audioRef.current?.play();
    setPlaying(true);
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => {
    if (audioRef.current?.paused) {
      audioRef.current.play();
      setPlaying(true);
    } else {
      audioRef.current?.pause();
      setPlaying(false);
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setProgress(time);
    }
  }, []);

  return { playing, progress, duration, play, pause, toggle, seek };
}
