"use client";

import React from "react";
import { ConnectionState } from "@/types/liveSession";
import { Sparkles, Mic, Volume2 } from "lucide-react";

interface TeacherAvatarProps {
  state: ConnectionState;
  volume: number; // Teacher output audio volume [0.0 - 1.0]
  userVolume?: number; // Student input mic volume [0.0 - 1.0]
  isMuted: boolean;
}

export const TeacherAvatar: React.FC<TeacherAvatarProps> = ({
  state,
  volume,
  userVolume = 0,
  isMuted,
}) => {
  const isSpeaking = state === "TEACHER_SPEAKING";
  const isListening = state === "LISTENING";
  const isConnecting = state === "CONNECTING";
  const isUserTalking = !isSpeaking && !isMuted && userVolume > 0.04;

  // Dynamic scale multiplier based on live audio RMS volume
  const reactiveScale = isSpeaking ? 1 + volume * 0.18 : isUserTalking ? 1 + userVolume * 0.06 : 1;
  const ringScale1 = isSpeaking ? 1 + volume * 0.45 : isUserTalking ? 1 + userVolume * 0.35 : isListening ? 1.03 : 1;
  const ringScale2 = isSpeaking ? 1 + volume * 0.85 : isUserTalking ? 1 + userVolume * 0.6 : 1;
  const glowOpacity = isSpeaking ? 0.35 + volume * 0.45 : isUserTalking ? 0.3 : isListening ? 0.15 : 0.08;

  return (
    <div className="relative flex flex-col items-center justify-center">
      {/* Outer Audio-Reactive Ambient Glow Field */}
      <div
        className="absolute w-72 h-72 md:w-96 md:h-96 rounded-full pointer-events-none transition-all duration-200 ease-out"
        style={{
          background: isSpeaking
            ? "radial-gradient(circle, rgba(200, 90, 67, 0.25) 0%, rgba(200, 90, 67, 0.1) 50%, rgba(0, 0, 0, 0) 75%)" // Coral
            : isUserTalking
            ? "radial-gradient(circle, rgba(82, 113, 93, 0.25) 0%, rgba(82, 113, 93, 0.1) 50%, rgba(0, 0, 0, 0) 75%)" // Botanical Green
            : isConnecting
            ? "radial-gradient(circle, rgba(230, 180, 100, 0.2) 0%, rgba(0, 0, 0, 0) 70%)"
            : "radial-gradient(circle, rgba(200, 90, 67, 0.05) 0%, rgba(0, 0, 0, 0) 70%)",
          opacity: glowOpacity,
          transform: `scale(${ringScale2})`,
        }}
      />

      {/* Reactive Outer Ring */}
      <div
        className={`absolute w-60 h-60 md:w-72 md:h-72 rounded-full border transition-transform duration-150 ease-out ${
          isSpeaking
            ? "border-coral/40"
            : isUserTalking
            ? "border-botanical/40"
            : isConnecting
            ? "animate-pulse border-amber-400/30"
            : "border-border/60"
        }`}
        style={{
          transform: `scale(${ringScale1})`,
        }}
      />

      {/* Double-Bezel Hardware Enclosure */}
      <div
        className="relative z-10 w-48 h-48 md:w-60 md:h-60 rounded-full p-2 bg-white/40 border border-border/80 shadow-[0_20px_40px_-15px_rgba(23,24,23,0.08)] backdrop-blur-md transition-transform duration-200 ease-out"
        style={{
          transform: `scale(${reactiveScale})`,
        }}
      >
        {/* Inner Core */}
        <div className="w-full h-full rounded-full bg-white flex flex-col items-center justify-center border border-border shadow-sm relative overflow-hidden">

          {/* Teacher Icon Graphic */}
          <div className="relative z-10 flex flex-col items-center justify-center">
            <div
              className={`w-20 h-20 md:w-24 md:h-24 rounded-full border flex items-center justify-center shadow-sm transition-all duration-200 ${
                isSpeaking
                  ? "bg-accent-warm-soft/50 border-accent-warm/30"
                  : isUserTalking
                  ? "bg-botanical-soft/60 border-botanical/30"
                  : "bg-canvas border-border"
              }`}
            >
              {isSpeaking ? (
                <Volume2 className="w-10 h-10 md:w-12 md:h-12 text-accent-warm animate-pulse" strokeWidth={1.5} />
              ) : isUserTalking ? (
                <Mic className="w-10 h-10 md:w-12 md:h-12 text-botanical animate-pulse" strokeWidth={1.5} />
              ) : isConnecting ? (
                <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-accent-ochre animate-spin" strokeWidth={1.5} />
              ) : (
                <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-ink-primary" strokeWidth={1.5} />
              )}
            </div>
          </div>

          {/* Live Micro-Badge inside core */}
          <div className="absolute bottom-6 flex items-center gap-1.5 px-3 py-1 rounded-full bg-canvas border border-border">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isSpeaking
                  ? "bg-coral animate-ping"
                  : isUserTalking
                  ? "bg-botanical animate-pulse"
                  : isListening
                  ? "bg-botanical"
                  : isConnecting
                  ? "bg-amber-500 animate-pulse"
                  : "bg-ink-muted"
              }`}
            />
            <span className="text-[10px] font-medium tracking-wider text-ink-secondary uppercase">
              {isSpeaking
                ? "Speaking"
                : isUserTalking
                ? "Hearing You"
                : isListening
                ? isMuted
                  ? "Muted"
                  : "Listening"
                : isConnecting
                ? "Connecting"
                : "Ready"}
            </span>
          </div>
        </div>
      </div>

      {/* Teacher Title & Role */}
      <div className="mt-8 text-center relative z-10">
        <h2 className="text-xl md:text-2xl font-serif text-ink-primary tracking-tight">AI Tutor</h2>
        <p className="text-sm text-ink-secondary mt-1 font-normal">
          {isSpeaking ? "Speaking..." : isUserTalking ? "Listening to your thought..." : "Ready for your question"}
        </p>
      </div>
    </div>
  );
};
