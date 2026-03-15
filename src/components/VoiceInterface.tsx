"use client";

import {
  LiveKitRoom,
  useVoiceAssistant,
  DisconnectButton,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useCallback, useEffect, useState, useRef } from "react";
import type { ConnectionDetails } from "@/lib/types";

function VoiceAgent({ onTimeout }: { onTimeout: () => void }) {
  const { state } = useVoiceAssistant();
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // If stuck in connecting/initializing for 15s, surface an error
  useEffect(() => {
    if (state === "connecting" || state === "initializing") {
      timeoutRef.current = setTimeout(onTimeout, 15000);
    } else {
      clearTimeout(timeoutRef.current);
    }
    return () => clearTimeout(timeoutRef.current);
  }, [state, onTimeout]);

  const isActive = state === "listening" || state === "speaking";
  const isConnecting = state === "connecting" || state === "initializing";

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Orb visualization */}
      <div className="relative w-24 h-24 flex items-center justify-center">
        {/* Outer ring */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-700 ${
            state === "speaking"
              ? "border-2 border-primary/60 scale-110 animate-pulse"
              : state === "listening"
                ? "border-2 border-primary/40 scale-105"
                : isConnecting
                  ? "border border-slate-200 animate-spin-slow"
                  : "border border-slate-200"
          }`}
        />
        {/* Inner glow */}
        {isActive && (
          <div className="absolute inset-2 rounded-full bg-primary/10 animate-pulse" />
        )}
        {/* Core dot */}
        <div
          className={`relative z-10 rounded-full transition-all duration-500 ${
            state === "speaking"
              ? "w-5 h-5 bg-primary shadow-lg shadow-primary/50"
              : state === "listening"
                ? "w-4 h-4 bg-primary/80 shadow-md shadow-primary/30"
                : isConnecting
                  ? "w-3 h-3 bg-slate-300 animate-pulse"
                  : "w-3 h-3 bg-slate-300"
          }`}
        />
      </div>

      {/* State label */}
      <div className="text-center space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
          {isActive ? (state === "speaking" ? "Speaking" : "Listening") : isConnecting ? "Connecting..." : state === "thinking" ? "Thinking..." : "Ready"}
        </p>
      </div>

      {/* Disconnect */}
      <DisconnectButton className="text-[10px] tracking-widest uppercase text-muted hover:text-red-500 transition-colors font-bold">
        End
      </DisconnectButton>
    </div>
  );
}

interface VoiceInterfaceProps {
  onWorldGenerated?: (worldUrl: string, splatUrl?: string) => void;
}

export function VoiceInterface({ onWorldGenerated: _onWorldGenerated }: VoiceInterfaceProps) {
  const [connectionDetails, setConnectionDetails] = useState<ConnectionDetails | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/connection-details");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to connect");
      setConnectionDetails(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnectionDetails(null);
    setError(null);
  }, []);

  const handleTimeout = useCallback(() => {
    setError("Agent not responding. Make sure `pnpm agent:dev` is running.");
    setConnectionDetails(null);
  }, []);

  // Open panel and auto-connect
  const handleOrbClick = useCallback(() => {
    if (!isOpen) {
      setIsOpen(true);
      if (!connectionDetails && !isConnecting) {
        connect();
      }
    } else if (!connectionDetails) {
      setIsOpen(false);
    }
  }, [isOpen, connectionDetails, isConnecting, connect]);

  useEffect(() => {
    // Data channel listener for world generation events
  }, [_onWorldGenerated]);

  return (
    <>
      {/* Floating orb button — fixed bottom-right */}
      <div className="fixed bottom-8 right-8 z-50">
        {/* Expanded panel */}
        {isOpen && (
          <div className="absolute bottom-20 right-0 w-72 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl shadow-black/10 p-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {/* Close button */}
            <button
              onClick={() => { setIsOpen(false); }}
              className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-muted hover:text-main transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <p className="text-[10px] uppercase tracking-widest text-primary font-bold mb-6 text-center">
              Memory Assistant
            </p>

            {error ? (
              <div className="text-center space-y-4">
                <p className="text-[10px] uppercase tracking-widest text-red-500 font-bold leading-relaxed">
                  {error}
                </p>
                <button
                  onClick={() => { setError(null); connect(); }}
                  className="text-[10px] uppercase tracking-widest text-primary font-bold hover:underline underline-offset-4"
                >
                  Retry
                </button>
              </div>
            ) : !connectionDetails ? (
              <div className="text-center space-y-4">
                <div className="w-6 h-6 border-2 border-slate-200 border-t-primary rounded-full animate-spin mx-auto" />
                <p className="text-[10px] uppercase tracking-widest text-muted font-bold">
                  {isConnecting ? "Waking up..." : "Ready"}
                </p>
                {!isConnecting && (
                  <button
                    onClick={connect}
                    className="text-[10px] uppercase tracking-widest text-primary font-bold hover:underline underline-offset-4"
                  >
                    Connect
                  </button>
                )}
              </div>
            ) : (
              <LiveKitRoom
                serverUrl={connectionDetails.serverUrl}
                token={connectionDetails.participantToken}
                connect={true}
                audio={true}
                video={false}
                onDisconnected={disconnect}
                className="flex flex-col items-center"
              >
                <VoiceAgent onTimeout={handleTimeout} />
              </LiveKitRoom>
            )}
          </div>
        )}

        {/* The orb */}
        <button
          onClick={handleOrbClick}
          className={`group relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-500 shadow-lg ${
            connectionDetails
              ? "bg-primary shadow-primary/30 hover:shadow-primary/50 hover:scale-105"
              : isOpen
                ? "bg-white border border-slate-200 shadow-black/10 hover:shadow-black/20"
                : "bg-white border border-slate-200 shadow-black/10 hover:border-primary/40 hover:shadow-primary/20 hover:scale-105"
          }`}
        >
          {/* Pulse ring when connected */}
          {connectionDetails && (
            <span className="absolute inset-0 rounded-full bg-primary/30 animate-ping" />
          )}

          {/* Mic icon */}
          <svg
            className={`w-5 h-5 relative z-10 transition-colors duration-300 ${
              connectionDetails ? "text-white" : "text-slate-400 group-hover:text-primary"
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 10v2a7 7 0 01-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </svg>
        </button>
      </div>
    </>
  );
}
