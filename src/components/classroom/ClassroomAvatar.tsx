'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ConnectionState, TranscriptItem } from '@/types/liveSession'
import { Sparkles, Settings } from 'lucide-react'
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
}

export const ClassroomAvatar: React.FC<ClassroomAvatarProps> = ({
  state,
  teacherVolume,
  userVolume = 0,
  isMuted,
  latestTranscript,
  latestVideoFrame,
  videoMimeType = 'image/jpeg',
  onCustomAvatarChange,
  onSimliControllerReady,
  onSimliActiveChange,
  preferredProvider = 'simli',
}) => {
  const params = useParams()
  const studentId = (params?.id as string) || ''

  // Selected Face ID: default to 80459b57-2d66-4ca7-8682-59e1c649bc53
  const [selectedFaceId, setSelectedFaceId] = useState<string>('80459b57-2d66-4ca7-8682-59e1c649bc53')
  const [activeProvider, setActiveProvider] = useState<AvatarProvider>(preferredProvider)
  const [simliStatus, setSimliStatus] = useState<SimliStatus>('idle')
  const [fallbackReason, setFallbackReason] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const simliVideoRef = useRef<HTMLVideoElement | null>(null)
  const simliAudioRef = useRef<HTMLAudioElement | null>(null)
  const simliControllerRef = useRef<SimliAvatarController | null>(null)

  const isSpeaking = state === 'TEACHER_SPEAKING'
  const isListening = state === 'LISTENING'
  const isConnecting = state === 'CONNECTING'
  const isCallActive = state !== 'IDLE' && state !== 'DISCONNECTED' && state !== 'ERROR'
  const isUserTalking = !isSpeaking && !isMuted && userVolume > 0.04
  const hasLiveGoogleVideo = Boolean(latestVideoFrame)
  const isSimliActive = activeProvider === 'simli' && simliStatus === 'connected'

  const onCustomAvatarChangeRef = useRef(onCustomAvatarChange)
  onCustomAvatarChangeRef.current = onCustomAvatarChange

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

  useEffect(() => {
    return () => {
      onSimliActiveChangeRef.current?.(false)
    }
  }, [])

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

  // Initialize Simli controller with auto-fallback to Google Avatar (strictly once on mount)
  useEffect(() => {
    const controller = new SimliAvatarController((status, err) => {
      setSimliStatus(status)
      if (status === 'fallback' || status === 'error') {
        console.warn('[ClassroomAvatar] Simli fallback triggered, switching to Google Avatar:', err)
        setFallbackReason(err || 'Connection interrupted')
        setActiveProvider('google')
      }
    })

    simliControllerRef.current = controller
    onSimliControllerReadyRef.current?.(controller)

    // Intercept benign LiveKit disconnect cancellations and Simli transport shutdown noise
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const isConnectionCancellation =
        (reason?.name === 'ConnectionError' ||
          reason?.constructor?.name === 'ConnectionError' ||
          String(reason).includes('ConnectionError')) &&
        (String(reason?.message || reason).includes('Client initiated disconnect') ||
          String(reason?.message || reason).includes('cancelled'))

      if (isConnectionCancellation) {
        event.preventDefault()
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      controller.stop()
      simliControllerRef.current = null
      onSimliControllerReadyRef.current?.(null)
    }
  }, [])

  // Start or stop Simli based on call active state and preferred provider
  useEffect(() => {
    const controller = simliControllerRef.current
    if (!controller) return

    if (isCallActive && activeProvider === 'simli') {
      if (simliVideoRef.current && simliAudioRef.current && simliStatus === 'idle') {
        const faceIdToStart = selectedFaceId || '80459b57-2d66-4ca7-8682-59e1c649bc53'
        controller
          .start({
            videoElement: simliVideoRef.current,
            audioElement: simliAudioRef.current,
            faceId: faceIdToStart,
          })
          .then((success) => {
            if (!success) {
              setActiveProvider('google')
            }
          })
      }
    } else if (!isCallActive && simliStatus !== 'idle') {
      controller.stop()
    }
  }, [isCallActive, activeProvider, simliStatus, selectedFaceId])

  // Draw incoming native 24 FPS video frames streamed from Google Gemini 3.8 Live Avatar (Fallback)
  useEffect(() => {
    if (activeProvider !== 'google' && isSimliActive) return
    if (!latestVideoFrame || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.onload = () => {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
    img.src = `data:${videoMimeType || 'image/jpeg'};base64,${latestVideoFrame}`
  }, [latestVideoFrame, videoMimeType, activeProvider, isSimliActive])

  // Toggle between Simli (Primary) and Google Avatar (Fallback)
  const toggleProvider = () => {
    if (activeProvider === 'simli') {
      simliControllerRef.current?.stop()
      setActiveProvider('google')
    } else {
      setFallbackReason(null)
      setActiveProvider('simli')
    }
  }

  // Audio-reactive visual dynamics for ambient stage
  const reactiveScale = isSpeaking ? 1 + teacherVolume * 0.04 : isUserTalking ? 1 + userVolume * 0.03 : 1
  const ringScale1 = isSpeaking ? 1 + teacherVolume * 0.35 : isUserTalking ? 1 + userVolume * 0.25 : 1.02
  const ringScale2 = isSpeaking ? 1 + teacherVolume * 0.65 : isUserTalking ? 1 + userVolume * 0.45 : 1.04

  // Subtle natural breathing motion (guarded by isMounted to guarantee identical SSR & client hydration output)
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
              ? isSimliActive
                ? 'Simli Live Avatar Speaking'
                : hasLiveGoogleVideo
                ? 'Gemini Live Avatar Speaking'
                : 'AI Teacher Speaking'
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

        {/* Avatar Provider Mode Badge & Settings Link */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleProvider}
            className="text-[10px] font-mono px-2 py-0.5 rounded-md border flex items-center gap-1 transition-colors cursor-pointer bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100"
            title={
              activeProvider === 'simli'
                ? 'Simli Live is Primary. Click to test Google Avatar fallback.'
                : 'Google Live Avatar is active (Fallback). Click to switch to Simli.'
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                activeProvider === 'simli'
                  ? simliStatus === 'connected'
                    ? 'bg-emerald-500'
                    : 'bg-amber-500 animate-pulse'
                  : 'bg-blue-500'
              }`}
            />
            <span>{activeProvider === 'simli' ? 'Simli (Primary)' : 'Google (Fallback)'}</span>
          </button>

          {studentId && (
            <Link
              href={`/dashboard/${studentId}/settings?tab=avatars`}
              className="text-[10px] text-ink-muted hover:text-ink-primary flex items-center gap-1 px-2 py-0.5 rounded-md hover:bg-stone-100 transition-colors cursor-pointer"
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
          {/* Primary: Video element for Simli Live WebRTC Avatar (No display:none to allow requestVideoFrameCallback) */}
          <video
            ref={simliVideoRef}
            autoPlay
            playsInline
            className={`absolute inset-0 w-full h-full object-cover rounded-full bg-stone-900 transition-opacity duration-200 ${
              isSimliActive ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
          />
          {/* Audio element bound to Simli WebRTC stream */}
          <audio ref={simliAudioRef} autoPlay />

          {/* Fallback: Canvas for native Gemini 3.8 Live Avatar video stream */}
          <canvas
            ref={canvasRef}
            width={480}
            height={480}
            className={`absolute inset-0 w-full h-full object-cover rounded-full bg-stone-900 transition-opacity duration-200 ${
              !isSimliActive && hasLiveGoogleVideo ? 'opacity-100 z-10' : 'opacity-0 pointer-events-none z-0'
            }`}
          />

          {/* Real Face ID avatar image when live video stream is waiting to connect or in standby */}
          <div
            className={`absolute inset-0 w-full h-full rounded-full overflow-hidden flex items-center justify-center bg-stone-100 transition-opacity duration-200 ${
              !isSimliActive && !hasLiveGoogleVideo ? 'opacity-100 z-5' : 'opacity-0 pointer-events-none z-0'
            }`}
          >
            <img
              src={avatarImageUrl}
              alt="Real Face ID Avatar Portrait"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                // Fallback to Simli app CDN directly if local asset is loading
                (e.currentTarget as HTMLImageElement).src = `https://app.simli.com/characters/trinity2/${selectedFaceId}.jpg`
              }}
            />

            {/* Natural studio lighting vignette */}
            <div className="absolute inset-0 rounded-full pointer-events-none bg-gradient-to-t from-black/35 via-transparent to-white/10" />

            {/* Subtle status badge */}
            <div className="absolute bottom-2.5 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-xs text-[9px] font-mono text-white/90 uppercase tracking-widest border border-white/20">
              {activeProvider === 'simli' ? 'Simli Scholar' : 'Google Scholar'}
            </div>
          </div>
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
              <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-spin" />
              <span>Synthesizing voice and speech visemes...</span>
            </div>
          ) : isUserTalking ? (
            <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Listening to student answer...</span>
            </div>
          ) : fallbackReason ? (
            <p className="text-[10px] text-amber-700 font-mono">
              Using Google Live Fallback ({fallbackReason})
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
