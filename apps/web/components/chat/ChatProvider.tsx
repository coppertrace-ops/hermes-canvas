"use client";

/**
 * Chat React seam (OWNER: COURIER).
 *
 * `ChatProvider` puts a `ChatBackend` in context; `useChat()` subscribes to it and
 * returns the live snapshot plus the action methods. Every chat component reads the
 * backend ONLY through this hook — they never import `mockBackend` or a Convex
 * client. Swapping `<ChatProvider backend={...}>` from the mock to a Convex adapter
 * is the entire integration surface; no component changes.
 */

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { ChatBackend, SendDraft, UploadCallbacks, UploadFile, UploadHandle } from "./backend";
import type { ChatSnapshot } from "./types";

const ChatBackendContext = createContext<ChatBackend | null>(null);

export interface ChatProviderProps {
  backend: ChatBackend;
  children: ReactNode;
}

export function ChatProvider({ backend, children }: ChatProviderProps) {
  return <ChatBackendContext.Provider value={backend}>{children}</ChatBackendContext.Provider>;
}

/** The raw backend (for the composer's upload flow). Throws if no provider. */
export function useChatBackend(): ChatBackend {
  const backend = useContext(ChatBackendContext);
  if (!backend) {
    throw new Error("useChatBackend must be used within a <ChatProvider>.");
  }
  return backend;
}

const EMPTY_SNAPSHOT: ChatSnapshot = { items: [], connection: "connecting" };

export interface UseChat {
  snapshot: ChatSnapshot;
  send(draft: SendDraft): Promise<void>;
  retry(messageId: string): Promise<void>;
  upload(file: UploadFile, callbacks?: UploadCallbacks): UploadHandle;
  /** Request older history (scroll-up). No-op when the backend has no paging. */
  loadOlder(): Promise<boolean>;
}

/**
 * Subscribe to the live chat snapshot and expose the action methods.
 *
 * The subscription delivers the current snapshot synchronously on subscribe and
 * again on every change (mirroring a Convex live query), so there is at most one
 * "connecting" frame before the first real snapshot lands.
 */
export function useChat(): UseChat {
  const backend = useChatBackend();
  const [snapshot, setSnapshot] = useState<ChatSnapshot>(EMPTY_SNAPSHOT);

  // Keep a stable ref so the action closures never go stale across re-renders.
  const backendRef = useRef(backend);
  backendRef.current = backend;

  useEffect(() => {
    const unsubscribe = backend.subscribe(setSnapshot);
    return unsubscribe;
  }, [backend]);

  return useMemo<UseChat>(
    () => ({
      snapshot,
      send: (draft) => backendRef.current.send(draft),
      retry: (messageId) => backendRef.current.retry(messageId),
      upload: (file, callbacks) => backendRef.current.upload(file, callbacks),
      loadOlder: () => backendRef.current.loadOlder?.() ?? Promise.resolve(false),
    }),
    [snapshot],
  );
}
