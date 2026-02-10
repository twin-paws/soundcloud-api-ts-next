"use client";

import { createContext, useContext, type ReactNode } from "react";

interface SoundCloudContextValue {
  apiPrefix: string;
}

const SoundCloudContext = createContext<SoundCloudContextValue>({
  apiPrefix: "/api/soundcloud",
});

export interface SoundCloudProviderProps {
  /** API route prefix (default: "/api/soundcloud") */
  apiPrefix?: string;
  children: ReactNode;
}

export function SoundCloudProvider({
  apiPrefix = "/api/soundcloud",
  children,
}: SoundCloudProviderProps) {
  return (
    <SoundCloudContext.Provider value={{ apiPrefix }}>
      {children}
    </SoundCloudContext.Provider>
  );
}

export function useSoundCloudContext(): SoundCloudContextValue {
  return useContext(SoundCloudContext);
}
