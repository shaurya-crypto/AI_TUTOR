'use client'

import React, { useState } from 'react'
import { ConnectionState, TranscriptItem } from '@/types/liveSession'
import { Volume2, Mic, Sparkles, Image as ImageIcon, RotateCcw } from 'lucide-react'

interface ClassroomAvatarProps {
  state: ConnectionState
  teacherVolume: number
  userVolume?: number
  isMuted: boolean
  latestTranscript?: TranscriptItem | null
}

export const ClassroomAvatar: React.FC<ClassroomAvatarProps> = ({
  state,
  teacherVolume,
  userVolume = 0,
  isMuted,
  latestTranscript,
}) => {
  const [customPhoto, setCustomPhoto] = useState<string | null>(null)

  const isSpeaking = state === 'TEACHER_SPEAKING'
  const isListening = state === 'LISTENING'
  const isConnecting = state === 'CONNECTING'
  const isUserTalking = !isSpeaking && !isMuted && userVolume > 0.04

  // Audio-reactive scale multipliers
  const reactiveScale = isSpeaking ? 1 + teacherVolume * 0.12 : isUserTalking ? 1 + userVolume * 0.05 : 1
  const ringScale1 = isSpeaking ? 1 + teacherVolume * 0.45 : isUserTalking ? 1 + userVolume * 0.35 : 1.02
  const ringScale2 = isSpeaking ? 1 + teacherVolume * 0.85 : isUserTalking ? 1 + userVolume * 0.6 : 1.05
  const mouthScaleY = isSpeaking ? 1 + Math.min(teacherVolume * 1.8, 1.4) : 1

  // Handle custom photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const url = URL.createObjectURL(file)
      setCustomPhoto(url)
    }
  }

  // Filter out internal board and diagram directives from caption display
  const cleanCaptionText = (text: string) => {
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

  const rawCaption = latestTranscript?.text || ''
  const displayCaption = cleanCaptionText(rawCaption)

  return (
    <div className="relative w-full flex flex-col items-center justify-between p-4 bg-white/70 backdrop-blur-md rounded-3xl border border-border-subtle shadow-md">
      {/* Top micro status bar */}
      <div className="w-full flex items-center justify-between px-2 mb-3">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isSpeaking
                ? 'bg-amber-500 animate-ping'
                : isUserTalking
                ? 'bg-emerald-500 animate-pulse'
                : isListening
                ? 'bg-emerald-500'
                : isConnecting
                ? 'bg-amber-400 animate-pulse'
                : 'bg-stone-300'
            }`}
          />
          <span className="text-[11px] font-mono uppercase tracking-wider text-ink-secondary">
            {isSpeaking
              ? 'AI Teacher Speaking'
              : isUserTalking
              ? 'Hearing Student'
              : isListening
              ? isMuted
                ? 'Muted'
                : 'Listening'
              : isConnecting
              ? 'Connecting Voice...'
              : 'Standby'}
          </span>
        </div>

        {/* Custom Photo / Puppet Toggle */}
        <div className="flex items-center gap-1.5">
          {customPhoto ? (
            <button
              onClick={() => setCustomPhoto(null)}
              className="text-[10px] text-ink-muted hover:text-ink-primary flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
              title="Reset to default AI scholar avatar"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Default</span>
            </button>
          ) : (
            <label
              className="text-[10px] text-ink-muted hover:text-ink-primary flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
              title="Upload your parent or favorite tutor photo"
            >
              <ImageIcon className="w-3 h-3" />
              <span>Custom Avatar</span>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          )}
        </div>
      </div>

      {/* Center: Audio-Reactive Avatar Stage */}
      <div className="relative w-48 h-48 md:w-56 md:h-56 flex items-center justify-center my-2">
        {/* Ambient reactive glow aura */}
        <div
          className="absolute w-56 h-56 md:w-64 md:h-64 rounded-full pointer-events-none transition-all duration-150 ease-out"
          style={{
            background: isSpeaking
              ? 'radial-gradient(circle, rgba(217, 119, 6, 0.22) 0%, rgba(217, 119, 6, 0.05) 50%, transparent 70%)'
              : isUserTalking
              ? 'radial-gradient(circle, rgba(16, 185, 129, 0.22) 0%, rgba(16, 185, 129, 0.05) 50%, transparent 70%)'
              : 'radial-gradient(circle, rgba(0, 0, 0, 0.03) 0%, transparent 70%)',
            transform: `scale(${ringScale2})`,
          }}
        />

        {/* Audio reactive pulse ring */}
        <div
          className={`absolute w-52 h-52 md:w-60 md:h-60 rounded-full border transition-transform duration-100 ease-out ${
            isSpeaking
              ? 'border-amber-500/40'
              : isUserTalking
              ? 'border-emerald-500/40'
              : 'border-stone-200'
          }`}
          style={{
            transform: `scale(${ringScale1})`,
          }}
        />

        {/* Avatar Outer Bezel */}
        <div
          className="relative z-10 w-44 h-44 md:w-52 md:h-52 rounded-full p-2 bg-white/80 border-2 border-stone-200/80 shadow-lg backdrop-blur-md transition-transform duration-100 ease-out flex items-center justify-center overflow-hidden"
          style={{
            transform: `scale(${reactiveScale})`,
          }}
        >
          {customPhoto ? (
            /* Custom Photo 2D Puppet Lip-Sync Mode */
            <div className="relative w-full h-full rounded-full overflow-hidden flex flex-col items-center justify-center bg-stone-100">
              <img
                src={customPhoto}
                alt="Custom Tutor Avatar"
                className="w-full h-full object-cover"
              />
              {/* Mouth overlay that reacts to Web Audio volume */}
              <div
                className="absolute bottom-11 w-10 h-3 rounded-full bg-[#801313]/90 border border-black/30 transition-transform duration-75 origin-center"
                style={{
                  transform: `scaleY(${mouthScaleY})`,
                }}
              />
            </div>
          ) : (
            /* Default Scholar Botanical Teacher Avatar */
            <div className="relative w-full h-full rounded-full bg-linear-to-b from-[#2e4a3b] to-[#1c3327] flex flex-col items-center justify-center shadow-inner overflow-hidden border border-emerald-900/40">
              {/* Head Silhouette */}
              <div className="relative z-10 flex flex-col items-center">
                {/* Scholar Cap / Crest */}
                <div className="w-12 h-6 bg-amber-400/90 rounded-t-full flex items-center justify-center mb-1 shadow-xs">
                  <span className="text-[10px] font-bold text-[#1c3327]">AI</span>
                </div>

                {/* Face Disc */}
                <div className="w-20 h-20 rounded-full bg-[#fdecd2] border-2 border-amber-900/30 flex flex-col items-center justify-center relative shadow-md">
                  {/* Eyes */}
                  <div className="flex items-center gap-4 mb-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2d1f14]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2d1f14]" />
                  </div>

                  {/* Reactive Mouth Puppet */}
                  <div
                    className="w-6 h-2 rounded-full bg-[#b91c1c] transition-transform duration-75 origin-center"
                    style={{
                      transform: `scaleY(${mouthScaleY})`,
                    }}
                  />

                  {/* Wire Glasses */}
                  <div className="absolute top-6 w-16 h-4 border border-amber-900/40 rounded-full pointer-events-none" />
                </div>

                {/* Academic Collar */}
                <div className="w-24 h-8 bg-emerald-900/90 rounded-t-2xl mt-1 flex items-center justify-center border-t border-amber-400/30">
                  <span className="text-[9px] text-amber-200/80 font-serif tracking-wider uppercase">
                    Scholar Tutor
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast/Movie-Style Captions at Bottom of Avatar */}
      <div className="w-full mt-2">
        <div className="w-full min-h-[64px] max-h-[88px] p-3 rounded-2xl bg-black/85 backdrop-blur-md border border-white/10 text-white shadow-xl flex flex-col justify-center items-center text-center transition-all overflow-hidden">
          {displayCaption ? (
            <div className="w-full animate-fade-in">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${
                    latestTranscript?.sender === 'teacher'
                      ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30'
                      : 'bg-emerald-400/20 text-emerald-300 border border-emerald-400/30'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      latestTranscript?.sender === 'teacher' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
                    }`}
                  />
                  <span>{latestTranscript?.sender === 'teacher' ? 'Instructor' : 'Student'}</span>
                </span>
              </div>
              <p className="text-xs md:text-sm font-medium leading-snug line-clamp-2 text-white/95">
                "{displayCaption}"
              </p>
            </div>
          ) : (
            <p className="text-xs text-white/40 italic flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400/60 animate-pulse" />
              <span>Voice captions will appear here live...</span>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
