'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ConnectionState, TranscriptItem } from '@/types/liveSession'
import { Sparkles, Settings, Volume2, Video, VideoOff } from 'lucide-react'
import { LiveAvatarConfig } from '@/services/geminiWebSocket'
import { SimliAvatarController, SimliStatus } from '@/services/simliAvatarService'

export type AvatarProvider = 'simli' | 'google'

interface ClassroomAvatarProps {
  state: ConnectionState
  teacherVolume: number
  userVolume?: number
  isMuted: boolean
  latestTranscript?: TranscriptItem | null
  latestVideoFrame?: string | null
  videoMimeType?: string
  onCustomAvatarChange?: (avatarConfig: LiveAvatarConfig | null) => void
  onSimliControllerReady?: (controller: SimliAvatarController | null) => void
  onSimliActiveChange?: (isActive: boolean) => void
  preferredProvider?: AvatarProvider
  isAvatarEnabled?: boolean
}

export const ClassroomAvatar: React.FC<ClassroomAvatarProps> = ({
  state,
  teacherVolume,
  userVolume = 0,
  isMuted,
  latestTranscript,
  onSimliControllerReady,
  onSimliActiveChange,
  isAvatarEnabled = true,
}) => {
  const params = useParams()
  const studentId = (params?.id as string) || ''

  // Selected Face ID: default to 80459b57-2d66-4ca7-8682-59e1c649bc53
  const [selectedFaceId, setSelectedFaceId] = useState<string>('80459b57-2d66-4ca7-8682-59e1c649bc53')
  const [simliStatus, setSimliStatus] = useState<SimliStatus>('idle')
  const [isMounted, setIsMounted] = useState(false)

  const simliVideoRef = useRef<HTMLVideoElement | null>(null)
  const simliAudioRef = useRef<HTMLAudioElement | null>(null)
  const simliControllerRef = useRef<SimliAvatarController | null>(null)

  const isSpeaking = state === 'TEACHER_SPEAKING'
  const isListening = state === 'LISTENING'
  const isConnecting = state === 'CONNECTING'
  const isCallActive = state !== 'IDLE' && state !== 'DISCONNECTED' && state !== 'ERROR'
  const isUserTalking = !isSpeaking && !isMuted && userVolume > 0.04
  const isSimliActive = simliStatus === 'connected'

  const onSimliActiveChangeRef = useRef(onSimliActiveChange)
  onSimliActiveChangeRef.current = onSimliActiveChange

  const onSimliControllerReadyRef = useRef(onSimliControllerReady)
  onSimliControllerReadyRef.current = onSimliControllerReady

  const prevSimliActiveRef = useRef<boolean | null>(null)

  // Notify parent of Simli active status to manage audio routing and eliminate echo
  useEffect(() => {
    if (prevSimliActiveRef.current !== isSimliActive) {
      prevSimliActiveRef.current = isSimliActive
      onSimliActiveChangeRef.current?.(isSimliActive)
    }
  }, [isSimliActive])

  // Restore saved faceId from localStorage on mount and sync on storage events
  useEffect(() => {
    setIsMounted(true)
    if (typeof window !== 'undefined') {
      try {
        const storedFaceId = localStorage.getItem('ai_tutor_selected_face_id')
        if (storedFaceId && storedFaceId.length > 5) {
          setSelectedFaceId(storedFaceId)
        }
      } catch {}
    }

    const handleStorageUpdate = () => {
      try {
        const storedFaceId = localStorage.getItem('ai_tutor_selected_face_id')
        if (storedFaceId && storedFaceId.length > 5) {
          setSelectedFaceId(storedFaceId)
        }
      } catch {}
    }
    window.addEventListener('storage', handleStorageUpdate)
    return () => window.removeEventListener('storage', handleStorageUpdate)
  }, [])

  // Initialize controller once
  useEffect(() => {
    const controller = new SimliAvatarController((status) => {
      setSimliStatus(status)
    })

    simliControllerRef.current = controller
    onSimliControllerReadyRef.current?.(controller)

    return () => {
      controller.stop()
      simliControllerRef.current = null
      onSimliControllerReadyRef.current?.(null)
      onSimliActiveChangeRef.current?.(false)
    }
  }, [])

  // Manage Simli WebRTC connection lifecycle based on classroom call state
  useEffect(() => {
    if (!isMounted) return

    if (!isAvatarEnabled || !isCallActive) {
      simliControllerRef.current?.stop()
      return
    }

    if (!simliVideoRef.current || !simliAudioRef.current) return

    const controller = simliControllerRef.current
    if (!controller) return

    controller.start({
      videoElement: simliVideoRef.current,
      audioElement: simliAudioRef.current,
      faceId: selectedFaceId,
    })
  }, [isMounted, isCallActive, isAvatarEnabled, selectedFaceId])

  // Audio-reactive visual dynamics for ambient stage
  const reactiveScale = isSpeaking ? 1 + teacherVolume * 0.04 : isUserTalking ? 1 + userVolume * 0.03 : 1
  const ringScale1 = isSpeaking ? 1 + teacherVolume * 0.35 : isUserTalking ? 1 + userVolume * 0.25 : 1.02
  const ringScale2 = isSpeaking ? 1 + teacherVolume * 0.65 : isUserTalking ? 1 + userVolume * 0.45 : 1.04

  // Subtle natural breathing motion
  const breathingOffset = isMounted ? Math.sin(Date.now() / 1400) * 1.2 : 0

  // Filter out internal directives from caption display
  const rawCaption = latestTranscript?.text || ''
  const displayCaption = rawCaption.replace(/\[[A-Z_]+(?::\s*[^\]]+)?\]/gi, '').trim()

  const avatarImageUrl = `/avatars/${selectedFaceId}.jpg`

  return (
    <div className="relative w-full flex flex-col items-center justify-between p-4 bg-white/70 backdrop-blur-md rounded-3xl border border-stone-200/60 shadow-xs min-h-[380px] overflow-hidden select-none">
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
              ? 'Anaxly Speaking'
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

        {/* Settings Link */}
        <div className="flex items-center gap-1.5">
          {isAvatarEnabled ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>{isSimliActive ? 'Live Avatar Active' : 'Avatar Ready'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
              <Volume2 className="w-3 h-3 text-stone-500" />
              <span>Audio Only</span>
            </span>
          )}
          {studentId && (
            <Link
              href={`/dashboard/${studentId}/settings?tab=avatars`}
              className="text-[10px] text-ink-muted hover:text-ink-primary flex items-center gap-1 px-2.5 py-1 rounded-md hover:bg-stone-100 border border-stone-200/80 transition-colors cursor-pointer"
              title="Configure Classroom Avatars & Settings"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Avatars</span>
            </Link>
          )}
        </div>
      </div>

      {/* Center: Live Avatar Stage */}
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

        {/* Avatar Stage Outer Bezel */}
        <div
          className="relative z-10 w-44 h-44 md:w-52 md:h-52 rounded-full p-1.5 bg-white/90 border-2 border-stone-200/80 shadow-lg backdrop-blur-md transition-transform duration-150 ease-out flex items-center justify-center overflow-hidden"
          style={{
            transform: `scale(${reactiveScale}) translateY(${breathingOffset}px)`,
          }}
        >
          {isAvatarEnabled ? (
            <>
              {/* Primary: Video element for Simli Live WebRTC Avatar */}
          <video
            ref={simliVideoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover rounded-full bg-stone-900 transition-opacity duration-300 ${
              isSimliActive ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
          />
          {/* Audio element bound to Simli WebRTC stream */}
          <audio ref={simliAudioRef} autoPlay />

          {/* Real Face ID avatar image when stream is in standby / connecting */}
          <div
            className={`absolute inset-0 w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-stone-100 transition-opacity duration-300 ${
              !isSimliActive ? 'opacity-100 z-5' : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            <img
              src={avatarImageUrl}
              alt="Avatar Portrait"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                // Fallback to CDN portrait if local asset is loading
                (e.currentTarget as HTMLImageElement).src = `https://app.simli.com/characters/trinity2/${selectedFaceId}.jpg`
              }}
            />

            {/* Natural studio lighting vignette */}
            <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-t from-black/35 via-transparent to-white/10" />

            {/* ZERO TEXT ON AVATAR: As per user instruction, no badges or labels are overlaid on the portrait */}
          </div>
        </>
      ) : (
        <div className="absolute inset-0 w-full h-full rounded-full flex flex-col items-center justify-center bg-stone-100 text-[#78716C] p-3 text-center">
          <div className="w-12 h-12 rounded-full bg-stone-200/80 flex items-center justify-center mb-1.5 shadow-inner">
            <Volume2 className="w-6 h-6 text-[#57534E]" />
          </div>
          <span className="text-[11px] font-semibold text-[#2D2A26]">Audio Classroom</span>
          <span className="text-[9px] text-[#A8A29E] mt-0.5">Avatar Disabled</span>
        </div>
      )}
        </div>
      </div>

      {/* Dynamic Subtitle / Live Closed Captions */}
      <div className="w-full flex flex-col items-center mt-2 px-2 z-20">
        <div className="min-h-[44px] w-full flex items-center justify-center text-center">
          {displayCaption ? (
            <p className="text-xs sm:text-sm font-medium text-stone-700 bg-stone-100/80 px-3 py-1.5 rounded-xl border border-stone-200/50 backdrop-blur-xs max-w-full truncate animate-in fade-in slide-in-from-bottom-1 duration-200">
              {displayCaption}
            </p>
          ) : isSpeaking ? (
            <div className="flex items-center gap-1.5 text-stone-400 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-sky-400 animate-spin" />
              <span>Anaxly speaking...</span>
            </div>
          ) : isUserTalking ? (
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Listening to student answer...</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
