import { useRef, useCallback, useState } from "react";
import type { WSClientEvent, WSServerEvent } from "../types";

type ConnectionState = "disconnected" | "connecting" | "connected";

type WSEventHandler = (event: WSServerEvent) => void;

const WS_URL =
  (typeof window !== "undefined" && window.location.hostname)
    ? `ws://${window.location.hostname}:5000/ws`
    : "ws://localhost:5000/ws";

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<WSEventHandler[]>([]);
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");

  const addHandler = useCallback((handler: WSEventHandler) => {
    handlersRef.current.push(handler);
    return () => {
      handlersRef.current = handlersRef.current.filter((h) => h !== handler);
    };
  }, []);

  const connect = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (
        wsRef.current &&
        wsRef.current.readyState === WebSocket.OPEN
      ) {
        resolve();
        return;
      }

      setConnectionState("connecting");
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        setConnectionState("connected");
        wsRef.current = ws;
        resolve();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSServerEvent;
          handlersRef.current.forEach((handler) => handler(data));
        } catch (error) {
          console.error("[WS] Failed to parse message:", error);
        }
      };

      ws.onclose = () => {
        setConnectionState("disconnected");
        wsRef.current = null;
      };

      ws.onerror = (error) => {
        console.error("[WS] WebSocket error:", error);
        setConnectionState("disconnected");
        reject(new Error("WebSocket connection failed"));
      };
    });
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setConnectionState("disconnected");
    }
  }, []);

  const sendEvent = useCallback((event: WSClientEvent) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(event));
    } else {
      console.error("[WS] Cannot send — not connected");
    }
  }, []);

  return {
    connectionState,
    connect,
    disconnect,
    sendEvent,
    addHandler,
  };
}
