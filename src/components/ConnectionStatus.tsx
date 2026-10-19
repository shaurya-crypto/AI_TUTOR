"use client";

import React from "react";
import { ConnectionState } from "@/types/liveSession";
import { Radio } from "lucide-react";

interface ConnectionStatusProps {
  state: ConnectionState;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ state }) => {
  const getStatusBadge = () => {
    switch (state) {
      case "CONNECTING":
        return {
          text: "Connecting...",
          dotClass: "bg-amber-500 animate-pulse",
          bgClass: "bg-white border-border text-ink-secondary",
        };
      case "CONNECTED":
        return {
          text: "Connected",
          dotClass: "bg-botanical",
          bgClass: "bg-botanical-soft border-botanical/20 text-botanical-dark",
        };
      case "LISTENING":
        return {
          text: "Listening",
          dotClass: "bg-botanical animate-pulse",
          bgClass: "bg-botanical-soft border-botanical/20 text-botanical-dark",
        };
      case "TEACHER_SPEAKING":
        return {
          text: "Teacher speaking",
          dotClass: "bg-coral animate-ping",
          bgClass: "bg-coral-soft border-coral/20 text-coral-dark",
        };
      case "MUTED":
        return {
          text: "Microphone muted",
          dotClass: "bg-amber-500",
          bgClass: "bg-white border-border text-ink-secondary",
        };
      case "ERROR":
        return {
          text: "Connection error",
          dotClass: "bg-destructive",
          bgClass: "bg-destructive/10 border-destructive/20 text-destructive",
        };
      case "DISCONNECTED":
      case "IDLE":
      default:
        return {
          text: "Disconnected",
          dotClass: "bg-ink-muted",
          bgClass: "bg-white border-border text-ink-muted",
        };
    }
  };

  const badge = getStatusBadge();

  return (
    <div className="flex items-center gap-4">
      {/* Center Live Session Label */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-canvas border border-border text-xs text-ink-secondary shadow-sm">
        <Radio className="w-3.5 h-3.5 text-botanical" strokeWidth={2} />
        <span>Live 1-on-1 Class</span>
      </div>

      {/* Connection State Badge */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium shadow-sm transition-all duration-300 ${badge.bgClass}`}
      >
        <span className={`w-2 h-2 rounded-full ${badge.dotClass}`} />
        <span>{badge.text}</span>
      </div>
    </div>
  );
};
