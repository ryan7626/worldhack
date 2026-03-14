"use client";

import { useState, useRef } from "react";
import type { SceneParams } from "@/app/api/scene-edit/route";

interface SceneEditBarProps {
  onSceneEdit: (params: SceneParams) => void;
}

const PRESETS = [
  { label: "Sunset", command: "warm golden sunset lighting" },
  { label: "Night", command: "dark night with moonlight" },
  { label: "Dreamy", command: "soft dreamy haze with pastel colors" },
  { label: "Rain", command: "overcast rainy mood with fog" },
  { label: "Vintage", command: "warm sepia vintage film look" },
  { label: "Reset", command: "reset to default clear day" },
];

export function SceneEditBar({ onSceneEdit }: SceneEditBarProps) {
  const [command, setCommand] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastEdit, setLastEdit] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const processCommand = async (cmd: string) => {
    if (!cmd.trim() || isProcessing) return;

    setIsProcessing(true);
    setLastEdit(null);
    try {
      const res = await fetch("/api/scene-edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd }),
      });
      const data = await res.json();
      console.log("Scene edit API response:", data);
      if (data.params) {
        onSceneEdit(data.params);
        setLastEdit(data.params.description);
        setCommand("");
      } else {
        console.error("No params in response:", data);
      }
    } catch (err) {
      console.error("Scene edit failed:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleVoice = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setCommand(transcript);
      processCommand(transcript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  return (
    <div className="absolute bottom-6 left-6 right-6 z-20">
      {/* Preset buttons */}
      <div className="flex gap-2 mb-3 flex-wrap justify-center">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => processCommand(preset.command)}
            disabled={isProcessing}
            className="px-4 py-2 bg-white/10 backdrop-blur-md border border-primary/20 text-[10px] uppercase tracking-widest font-bold text-white/80 hover:bg-primary hover:text-white transition-all disabled:opacity-50"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Command input */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && processCommand(command)}
            placeholder={isProcessing ? "Applying mood..." : "Describe the mood... (e.g. 'make it a rainy evening')"}
            disabled={isProcessing}
            className="w-full px-5 py-3 bg-white/10 backdrop-blur-md border border-primary/20 text-sm text-white placeholder-white/40 focus:outline-none focus:border-primary/50 disabled:opacity-50"
          />
          {isProcessing && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Voice button */}
        <button
          onClick={toggleVoice}
          className={`w-12 h-12 flex items-center justify-center border transition-all ${
            isListening
              ? "bg-red-500 border-red-400 text-white animate-pulse"
              : "bg-white/10 backdrop-blur-md border-primary/20 text-white/80 hover:bg-primary hover:text-white"
          }`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </button>

        {/* Submit button */}
        <button
          onClick={() => processCommand(command)}
          disabled={isProcessing || !command.trim()}
          className="px-6 py-3 bg-primary text-white text-xs uppercase tracking-widest font-bold hover:bg-primary-dark transition-all disabled:opacity-50 border border-primary/20"
        >
          Apply
        </button>
      </div>

      {/* Status */}
      {lastEdit && (
        <div className="mt-2 text-center">
          <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">
            {lastEdit}
          </p>
        </div>
      )}
    </div>
  );
}
