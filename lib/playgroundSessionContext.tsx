"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import type { Message } from "@/components/playground/useChat";

interface PlaygroundSessionContextType {
  playgroundMessages: Message[];
  setPlaygroundMessages: (msgs: Message[]) => void;
}

const PlaygroundSessionContext = createContext<PlaygroundSessionContextType>({
  playgroundMessages: [],
  setPlaygroundMessages: () => {},
});

export function PlaygroundSessionProvider({ children }: { children: ReactNode }) {
  const [playgroundMessages, setPlaygroundMessages] = useState<Message[]>([]);
  return (
    <PlaygroundSessionContext.Provider value={{ playgroundMessages, setPlaygroundMessages }}>
      {children}
    </PlaygroundSessionContext.Provider>
  );
}

export const usePlaygroundSession = () => useContext(PlaygroundSessionContext);
