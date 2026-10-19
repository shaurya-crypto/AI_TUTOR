"use client";

import React from "react";
import { Mic, MicOff, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CallControlsProps {
  isMuted: boolean;
  userVolume: number;
  onToggleMute: () => void;
  onEndCall: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  isMuted,
  userVolume,
  onToggleMute,
  onEndCall,
}) => {
  return (
    <div className="flex items-center gap-4 px-6 py-4 rounded-full bg-white border border-border shadow-[0_20px_40px_-15px_rgba(23,24,23,0.08)]">
      {/* Microphone Toggle Button */}
      <button
        onClick={onToggleMute}
        title={isMuted ? "Unmute microphone (M)" : "Mute microphone (M)"}
        className={`relative group flex items-center justify-center w-14 h-14 rounded-full transition-all duration-200 active:scale-95 ${
          isMuted
            ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20"
            : "bg-canvas text-ink-primary border border-border hover:bg-canvas/80"
        }`}
      >
        {/* Subtle Mic Volume Ripple Ring */}
        {!isMuted && userVolume > 0.05 && (
          <span
            className="absolute inset-0 rounded-full border border-botanical pointer-events-none transition-transform duration-75"
            style={{
              transform: `scale(${1 + userVolume * 0.4})`,
              opacity: Math.min(1, userVolume * 2),
            }}
          />
        )}

        {isMuted ? <MicOff className="w-6 h-6" strokeWidth={1.5} /> : <Mic className="w-6 h-6" strokeWidth={1.5} />}

        {/* Tooltip */}
        <span className="absolute -top-10 px-2.5 py-1 text-xs text-ink-secondary bg-white border border-border rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-sm">
          {isMuted ? "Unmute (M)" : "Mute (M)"}
        </span>
      </button>

      {/* Divider */}
      <div className="w-[1px] h-8 bg-border" />

      {/* End Call Button */}
      <Button
        onClick={onEndCall}
        title="End Live Class"
        className="group flex items-center gap-2.5 px-6 h-14 rounded-full bg-ink-primary hover:bg-ink-secondary text-white font-medium text-sm transition-all duration-200 active:scale-[0.98] shadow-md"
      >
        <PhoneOff className="w-5 h-5 transition-transform group-hover:rotate-12" strokeWidth={1.5} />
        <span>End Class</span>
      </Button>
    </div>
  );
};
