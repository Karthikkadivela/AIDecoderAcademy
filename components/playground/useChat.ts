"use client";
import { useState, useCallback, useRef } from "react";
import type { Profile, PlaygroundMode, OutputType } from "@/types";

export interface Attachment {
  name: string; mimeType: string; data: string; size: number;
}

export interface Message {
  id:           string;
  role:         "user" | "assistant";
  content:      string;
  outputType?:  OutputType;
  attachments?: Attachment[];
  isLoading?:   boolean;   // true while a generation is in progress
  createdAt:    Date;
}

export function useChat(profile: Profile | null, mode: PlaygroundMode) {
  const [messages,    setMessages]    = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId,   setSessionId]  = useState<string | null>(null);
  const abortRef                     = useRef<AbortController | null>(null);
  const pendingSessionRef            = useRef<Promise<string> | null>(null);

  const createSession = useCallback(async (m: PlaygroundMode): Promise<string> => {
    if (pendingSessionRef.current) return pendingSessionRef.current;
    const promise = fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: m }),
    })
      .then(r => r.json())
      .then(({ session }) => {
        setSessionId(session.id);
        pendingSessionRef.current = null;
        return session.id as string;
      });
    pendingSessionRef.current = promise;
    return promise;
  }, []);

  const startSession = useCallback(async (_m: PlaygroundMode) => {
    setMessages([]);
    setSessionId(null);
    pendingSessionRef.current = null;
    return null as unknown as string;
  }, []);

  const loadSession = useCallback(async (sid: string) => {
    setSessionId(sid);
    setMessages([]);
    const res = await fetch(`/api/sessions/${sid}/messages`);
    if (!res.ok) return;
    const { messages: dbMessages } = await res.json();
    const loaded: Message[] = (dbMessages ?? []).map((m: {
      id: string; role: "user" | "assistant"; content: string;
      created_at: string; output_type?: string;
    }) => ({
      id:         m.id,
      role:       m.role,
      content:    m.content,
      createdAt:  new Date(m.created_at),
      outputType: (m.output_type ?? "text") as OutputType,
      isLoading:  false,
    }));
    setMessages(loaded);
  }, []);

  const sendMessage = useCallback(
    async (
      text:        string,
      outputType:  OutputType    = "text",
      attachments: Attachment[]  = [],
      forceSid?:   string
    ) => {
      if (!profile || isStreaming) return;
      const isInit = text === "__init__";

      const historySnapshot = messages
        .filter(m => m.content.trim() !== "" && m.content !== "__init__")
        .filter(m => { const ot = m.outputType ?? "text"; return ot === "text" || ot === "json"; })
        .slice(-20)
        .map(m => ({ role: m.role, content: m.content }));

      if (!isInit) {
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(), role: "user", content: text,
          outputType, attachments, createdAt: new Date(),
        }]);
      }

      setIsStreaming(true);
      const assistantId = crypto.randomUUID();
      setMessages(prev => [...prev, {
        id: assistantId, role: "assistant", content: "",
        outputType, createdAt: new Date(),
      }]);

      let activeSid = forceSid ?? sessionId;
      if (!activeSid && !isInit) activeSid = await createSession(mode);
      else if (!activeSid && isInit) {
        setIsStreaming(false);
        setMessages(prev => prev.filter(m => m.id !== assistantId));
        return;
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            message: text, sessionId: activeSid, mode, outputType,
            profile: {
              display_name: profile.display_name,
              age_group:    profile.age_group,
              interests:    profile.interests,
            },
            history:     historySnapshot,
            attachments: attachments.map(a => ({ data: a.data, mimeType: a.mimeType, name: a.name })),
          }),
        });

        if (!res.ok || !res.body) throw new Error("Stream failed");
        const reader  = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data: "));
          for (const line of lines) {
            const raw = line.slice(6);
            if (raw === "[DONE]") break;
            try {
              const { text: chunk } = JSON.parse(raw);
              setMessages(prev =>
                prev.map(m => m.id === assistantId ? { ...m, content: m.content + chunk } : m)
              );
            } catch { /* partial */ }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId
                ? { ...m, content: "Oops! Something went wrong. Try again? 🙈" }
                : m
            )
          );
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [profile, isStreaming, sessionId, messages, mode, createSession]
  );

  // ─── Image generation ─────────────────────────────────────────────────────

  const sendImage = useCallback(async (prompt: string) => {
    if (!profile || isStreaming) return;

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(), role: "user", content: prompt,
      outputType: "image", createdAt: new Date(),
    }]);

    const asstId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: asstId, role: "assistant",
      content:   "Generating your image...",
      outputType: "image",
      isLoading:  true,         // ← flag, not string matching
      createdAt: new Date(),
    }]);
    setIsStreaming(true);

    let activeSid = sessionId;
    if (!activeSid) activeSid = await createSession(mode);

    try {
      const res  = await fetch("/api/generate-image", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();

      if (data.url) {
        setMessages(prev => prev.map(m =>
          m.id === asstId
            ? { ...m, content: data.url, isLoading: false }   // ← clear flag
            : m
        ));
        fetch("/api/sessions/messages-save", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: activeSid, user_content: prompt,
            assistant_content: data.url, output_type: "image",
          }),
        }).catch(() => {});
      } else {
        setMessages(prev => prev.map(m =>
          m.id === asstId
            ? { ...m, content: `Oops! ${data?.error ?? "Could not generate image"} — try a different prompt? 🙈`, isLoading: false }
            : m
        ));
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === asstId
          ? { ...m, content: "Oops! Could not generate image. Try again? 🙈", isLoading: false }
          : m
      ));
    } finally {
      setIsStreaming(false);
    }
  }, [profile, isStreaming, sessionId, mode, createSession]);

  // ─── Audio generation ─────────────────────────────────────────────────────

  const sendAudio = useCallback(async (prompt: string, ageGroup: string) => {
    if (!profile || isStreaming) return;

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(), role: "user", content: prompt,
      outputType: "audio", createdAt: new Date(),
    }]);

    const asstId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: asstId, role: "assistant",
      content:    "Writing the scene script and generating voices...",
      outputType: "audio",
      isLoading:  true,         // ← flag
      createdAt:  new Date(),
    }]);
    setIsStreaming(true);

    let activeSid = sessionId;
    if (!activeSid) activeSid = await createSession(mode);

    try {
      const res  = await fetch("/api/generate-audio", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ageGroup }),
      });
      const data = await res.json();

      if (data.url) {
        const audioPayload = JSON.stringify({ url: data.url, script: data.script });
        setMessages(prev => prev.map(m =>
          m.id === asstId
            ? { ...m, content: audioPayload, isLoading: false }   // ← clear flag
            : m
        ));
        fetch("/api/sessions/messages-save", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: activeSid, user_content: prompt,
            assistant_content: audioPayload, output_type: "audio",
          }),
        }).catch(() => {});
      } else {
        setMessages(prev => prev.map(m =>
          m.id === asstId
            ? { ...m, content: `Oops! ${data?.error ?? "Could not generate audio"} — try again? 🙈`, isLoading: false }
            : m
        ));
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === asstId
          ? { ...m, content: "Oops! Could not generate audio. Try again? 🙈", isLoading: false }
          : m
      ));
    } finally {
      setIsStreaming(false);
    }
  }, [profile, isStreaming, sessionId, mode, createSession]);

  // ─── Slides generation ────────────────────────────────────────────────────

  const sendSlides = useCallback(async (prompt: string, ageGroup: string) => {
    if (!profile || isStreaming) return;

    setMessages(prev => [...prev, {
      id: crypto.randomUUID(), role: "user", content: prompt,
      outputType: "slides", createdAt: new Date(),
    }]);

    const asstId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: asstId, role: "assistant",
      content:    "Building your slides...",
      outputType: "slides",
      isLoading:  true,         // ← flag
      createdAt:  new Date(),
    }]);
    setIsStreaming(true);

    let activeSid = sessionId;
    if (!activeSid) activeSid = await createSession(mode);

    try {
      const res  = await fetch("/api/generate-ppt", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, ageGroup }),
      });
      const data = await res.json();

      if (data.pptBase64) {
        const slidesPayload = JSON.stringify(data);
        setMessages(prev => prev.map(m =>
          m.id === asstId
            ? { ...m, content: slidesPayload, isLoading: false }  // ← clear flag
            : m
        ));
        fetch("/api/sessions/messages-save", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: activeSid, user_content: prompt,
            assistant_content: slidesPayload, output_type: "slides",
          }),
        }).catch(() => {});
      } else {
        setMessages(prev => prev.map(m =>
          m.id === asstId
            ? { ...m, content: `Oops! ${data?.error ?? "Could not build slides"} — try again? 🙈`, isLoading: false }
            : m
        ));
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === asstId
          ? { ...m, content: "Oops! Could not build slides. Try again? 🙈", isLoading: false }
          : m
      ));
    } finally {
      setIsStreaming(false);
    }
  }, [profile, isStreaming, sessionId, mode, createSession]);

  // ─── Static message (no API) ──────────────────────────────────────────────

  const sendStaticMessage = useCallback((
    text:       string,
    role:       "user" | "assistant" = "assistant",
    outputType: OutputType           = "text"
  ) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(), role, content: text,
      outputType, createdAt: new Date(),
    }]);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setSessionId(null);
    setIsStreaming(false);
    pendingSessionRef.current = null;
  }, []);

  return {
    messages, isStreaming, sessionId,
    startSession, loadSession,
    sendMessage, sendImage, sendAudio, sendSlides, sendStaticMessage,
    reset,
  };
}