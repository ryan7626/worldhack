"use client";

import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  DisconnectButton,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { useCallback, useEffect, useState } from "react";
import type { ConnectionDetails } from "@/lib/types";

function VoiceAgent() {
  const { state, audioTrack } = useVoiceAssistant();

  const stateLabels: Record<string, string> = {
    disconnected: "Ready to connect",
    connecting: "Connecting...",
    initializing: "Waking up...",
    listening: "Listening...",
    thinking: "Thinking...",
    speaking: "Speaking...",
  };

  const stateColors: Record<string, string> = {
    disconnected: "text-white/40",
    connecting: "text-amber-400",
    initializing: "text-amber-400",
    listening: "text-green-400",
    thinking: "text-primary",
    speaking: "text-accent",
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Voice visualizer */}
      <div className="relative w-48 h-48 flex items-center justify-center">
        {/* Outer glow ring */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 ${
            state === "speaking" || state === "listening"
              ? "bg-primary/10 animate-pulse-glow"
              : "bg-surface-lighter/50"
          }`}
        />

        {/* Visualizer or static orb */}
        <div className="relative w-32 h-32 flex items-center justify-center">
          {audioTrack ? (
            <BarVisualizer
              state={state}
              barCount={5}
              trackRef={audioTrack}
              className="w-full h-full"
              options={{ minHeight: 10 }}
            />
          ) : (
            <div
              className={`w-20 h-20 rounded-full transition-all duration-500 ${
                state === "listening"
                  ? "bg-gradient-to-br from-green-400 to-emerald-600 animate-float"
                  : state === "speaking"
                  ? "bg-gradient-to-br from-primary to-accent animate-float"
                  : "bg-gradient-to-br from-surface-lighter to-surface-light"
              }`}
            />
          )}
        </div>
      </div>

      {/* State label */}
      <p className={`text-sm font-medium ${stateColors[state] || "text-white/40"}`}>
        {stateLabels[state] || state}
      </p>

      {/* Disconnect button */}
      {state !== "disconnected" && (
        <DisconnectButton className="px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-sm">
          End Conversation
        </DisconnectButton>
      )}
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

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/connection-details");
      if (!res.ok) throw new Error("Failed to get connection details");
      const details = await res.json();
      setConnectionDetails(details);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setConnectionDetails(null);
  }, []);

  // Listen for data messages from the agent (world URLs, etc.)
  useEffect(() => {
    // Data channel listener would go here for receiving world generation updates
  }, [_onWorldGenerated]);

  if (error) {
    return (
      <div className="text-center space-y-4">
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={() => setError(null)}
          className="px-4 py-2 rounded-xl bg-surface-lighter text-white/70 hover:text-white transition-colors text-sm"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!connectionDetails) {
    return (
      <div className="text-center space-y-6">
        <button
          onClick={connect}
          disabled={isConnecting}
          className={`relative w-32 h-32 rounded-full transition-all duration-300 ${
            isConnecting
              ? "bg-surface-lighter cursor-wait"
              : "bg-gradient-to-br from-primary to-accent hover:scale-110 animate-pulse-glow cursor-pointer"
          }`}
        >
          {isConnecting ? (
            <div className="w-8 h-8 mx-auto border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <svg
              className="w-12 h-12 mx-auto text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
              />
            </svg>
          )}
        </button>
        <div>
          <p className="text-lg font-medium text-white/90">
            {isConnecting ? "Connecting..." : "Start Talking"}
          </p>
          <p className="text-sm text-white/50 mt-1">
            Click to start a voice conversation about your memories
          </p>
        </div>
      </div>
    );
  }

  return (
    <LiveKitRoom
      serverUrl={connectionDetails.serverUrl}
      token={connectionDetails.participantToken}
      connect={true}
      audio={true}
      video={false}
      onDisconnected={disconnect}
      className="flex flex-col items-center"
    >
      <VoiceAgent />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
