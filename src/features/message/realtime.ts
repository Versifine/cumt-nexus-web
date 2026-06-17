"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { createMessageRealtimeTicket, getMessageRealtimeUrl } from "./api";
import { messageQueryKeys } from "./queries";
import type { MessageRealtimeEvent, RealtimeHelloResponse } from "./types";

type UseMessageRealtimeOptions = {
  enabled: boolean;
};

export function useMessageRealtime({ enabled }: UseMessageRealtimeOptions) {
  const queryClient = useQueryClient();
  const lastEventIdRef = useRef("");

  useEffect(() => {
    if (!enabled || typeof window === "undefined") {
      return;
    }

    let isDisposed = false;
    let reconnectTimer: number | null = null;
    let socket: WebSocket | null = null;

    async function connect() {
      try {
        const ticket = await createMessageRealtimeTicket(lastEventIdRef.current);

        if (isDisposed) {
          return;
        }

        socket = new WebSocket(getMessageRealtimeUrl(ticket.ticket));

        socket.onmessage = (event) => {
          handleRealtimeMessage(event.data);
        };
        socket.onclose = () => scheduleReconnect();
        socket.onerror = () => {
          socket?.close();
        };
      } catch {
        scheduleReconnect();
      }
    }

    function handleRealtimeMessage(raw: string) {
      const conversationIds = new Set<string>();

      try {
        const payload = JSON.parse(raw) as
          | MessageRealtimeEvent
          | RealtimeHelloResponse;
        const events = "events" in payload ? payload.events : [payload];

        for (const event of events ?? []) {
          if (event.id) {
            lastEventIdRef.current = event.id;
          }

          if (event.conversation_id) {
            conversationIds.add(event.conversation_id);
          }
        }
      } catch {
        // Realtime messages only wake HTTP refetches; malformed frames can be ignored.
      }

      void queryClient.invalidateQueries({
        queryKey: messageQueryKeys.summary(),
      });
      void queryClient.invalidateQueries({
        queryKey: messageQueryKeys.conversations(),
      });

      for (const conversationId of conversationIds) {
        void queryClient.invalidateQueries({
          queryKey: messageQueryKeys.messages(conversationId),
        });
      }
    }

    function scheduleReconnect() {
      if (isDisposed || reconnectTimer) {
        return;
      }

      reconnectTimer = window.setTimeout(() => {
        reconnectTimer = null;
        void connect();
      }, 1800);
    }

    void connect();

    return () => {
      isDisposed = true;
      if (reconnectTimer) {
        window.clearTimeout(reconnectTimer);
      }
      socket?.close();
    };
  }, [enabled, queryClient]);
}
