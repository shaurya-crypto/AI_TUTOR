"use client";

import React, { useEffect, useRef } from "react";
import { TranscriptItem } from "@/types/liveSession";

interface LiveTranscriptProps {
  transcripts: TranscriptItem[];
}

const cleanTranscriptText = (text: string) => {
  const stripCall = (name: string) => new RegExp(`${name}\\s*\\((?:'[^']*'|"[^"]*"|[^()]*|\\([^()]*\\))*\\)`, 'gi')
  return text
    .replace(stripCall('write_chalkboard'), '')
    .replace(stripCall('execute_visual_action'), '')
    .replace(stripCall('plot_mathematical_graph'), '')
    .replace(stripCall('open_interactive_simulation'), '')
    .replace(stripCall('update_interactive_simulation'), '')
    .replace(stripCall('draw_shape'), '')
    .replace(stripCall('solve_step_by_step_numerical'), '')
    .replace(stripCall('conclude_and_open_quiz'), '')
    .replace(stripCall('render_svg_diagram'), '')
    .replace(/render_svg_diagram\s*\([\s\S]*?\)/gi, '')
    .replace(/\[[A-Z_]+(?::\s*[^\]]*)?\]/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export const LiveTranscript: React.FC<LiveTranscriptProps> = ({ transcripts }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcripts]);

  if (transcripts.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-ink-muted text-sm italic">
        The transcript will appear here once the class begins...
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-3xl shadow-sm border border-border overflow-hidden">
      <div className="p-4 border-b border-border bg-canvas/50">
        <h3 className="text-sm font-semibold text-ink-primary uppercase tracking-wider">Live Transcript</h3>
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 scroll-smooth"
      >
        {transcripts.map((item) => {
          const isTeacher = item.sender === "teacher";
          return (
            <div 
              key={item.id} 
              className={`flex flex-col max-w-[85%] animate-fade-in ${
                isTeacher ? "self-start" : "self-end"
              }`}
            >
              <span
                className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${
                  isTeacher ? "text-accent-warm" : "text-botanical text-right"
                }`}
              >
                {isTeacher ? "AI Tutor" : "You"}
              </span>
              <div 
                className={`px-5 py-3 rounded-2xl text-sm md:text-base leading-relaxed ${
                  isTeacher 
                    ? "bg-canvas text-ink-primary rounded-tl-none border border-border" 
                    : "bg-botanical-soft text-ink-primary rounded-tr-none border border-botanical/20"
                }`}
              >
                {cleanTranscriptText(item.text)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
