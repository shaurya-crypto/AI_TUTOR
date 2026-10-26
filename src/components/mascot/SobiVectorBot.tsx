'use client'

import React, { useState, useEffect, useRef, useId } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

export interface SobiVectorBotProps {
  message?: string
  bubblePosition?: 'top' | 'right'
  audioSrc?: string
  isMuted?: boolean
  onToggleMute?: () => void
  size?: number
  className?: string
  lookAt?: { x: number; y: number } | 'cursor' | 'input' | 'center'
}

export function SobiVectorBot({
  message = "What's your name?",
  bubblePosition = 'top',
  audioSrc,
  isMuted = false,
  onToggleMute,
  size = 120,
  className = '',
  lookAt = 'cursor',
}: SobiVectorBotProps) {
  const gradientId = useId()
  const [pupilOffset, setPupilOffset] = useState({ x: 0, y: 0 })
  const [isBlinking, setIsBlinking] = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioAvailable, setAudioAvailable] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const botRef = useRef<SVGSVGElement | null>(null)

  // 1. Natural Pupil Tracking
  useEffect(() => {
    if (lookAt === 'center') {
      setPupilOffset({ x: 0, y: 0 })
      return
    }

    if (lookAt === 'input') {
      // Look downwards towards the bottom input pill
      setPupilOffset({ x: 0, y: 4.5 })
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!botRef.current) return
      const rect = botRef.current.getBoundingClientRect()
      const botCenterX = rect.left + rect.width / 2
      const botCenterY = rect.top + rect.height / 2

      const dx = e.clientX - botCenterX
      const dy = e.clientY - botCenterY
      const dist = Math.hypot(dx, dy) || 1

      // Hyperbolic tangent clamping: smooth natural gaze
      const maxOrbit = 4.5
      const factor = Math.min(1, Math.tanh(dist / 220))
      const offsetX = (dx / dist) * maxOrbit * factor
      const offsetY = (dy / dist) * maxOrbit * factor

      setPupilOffset({ x: offsetX, y: offsetY })
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [lookAt])

  // 2. Periodic natural eye blinking
  useEffect(() => {
    let blinkTimer: NodeJS.Timeout

    const scheduleBlink = () => {
      const nextInterval = 3200 + Math.random() * 2500
      blinkTimer = setTimeout(() => {
        setIsBlinking(true)
        setTimeout(() => {
          setIsBlinking(false)
          scheduleBlink()
        }, 140)
      }, nextInterval)
    }

    scheduleBlink()
    return () => clearTimeout(blinkTimer)
  }, [])

  // 3. Audio Question Pronunciation Playback
  useEffect(() => {
    if (!audioSrc || isMuted) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setIsPlayingAudio(false)
      return
    }

    const audio = new Audio(audioSrc)
    audioRef.current = audio

    audio.onplay = () => setIsPlayingAudio(true)
    audio.onended = () => setIsPlayingAudio(false)
    audio.onerror = () => {
      // Audio file not yet dropped in public folder - degrade silently without errors
      setAudioAvailable(false)
      setIsPlayingAudio(false)
    }

    // Attempt playback with user gesture handling
    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy prevented playback until user interaction
        setIsPlayingAudio(false)
      })
    }

    return () => {
      audio.pause()
      audio.currentTime = 0
    }
  }, [audioSrc, isMuted])

  const toggleManualAudio = () => {
    if (onToggleMute) {
      onToggleMute()
      return
    }
    if (!audioRef.current) return
    if (isPlayingAudio) {
      audioRef.current.pause()
      setIsPlayingAudio(false)
    } else {
      audioRef.current.play().catch(() => {})
    }
  }

  return (
    <div
      className={`flex select-none ${
        bubblePosition === 'top'
          ? 'flex-col items-center justify-center'
          : 'flex-row items-center gap-4'
      } ${className}`}
    >
      {/* Speech Bubble on Top */}
      {bubblePosition === 'top' && message && (
        <div className="relative mb-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="relative z-10 flex items-center gap-2 rounded-2xl border border-neutral-200/80 bg-white px-5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            <span className="text-[17px] font-medium tracking-tight text-[#2A231C]">
              {message}
            </span>
            {audioSrc && audioAvailable && (
              <button
                type="button"
                onClick={toggleManualAudio}
                className="ml-1 rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none"
                title={isPlayingAudio ? 'Mute voice' : 'Play voice'}
                aria-label="Voice question"
              >
                {isPlayingAudio ? (
                  <Volume2 className="h-4 w-4 text-emerald-600 animate-pulse" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          {/* Downward pointing speech bubble tail */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-0">
            <div className="h-3 w-3 rotate-45 border-b border-r border-neutral-200/80 bg-white" />
          </div>
        </div>
      )}

      {/* Sobi Apple Mascot */}
      <div className="relative flex items-center justify-center">
        <svg
          ref={botRef}
          width={size}
          height={size}
          viewBox="0 0 140 140"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform duration-300 ease-out ${
            isPlayingAudio ? 'animate-[bounce_1.5s_infinite]' : 'animate-[pulse_4s_ease-in-out_infinite]'
          }`}
          style={{
            filter: 'drop-shadow(0 6px 12px rgba(220, 38, 38, 0.14))',
          }}
        >
          <defs>
            <linearGradient id={`${gradientId}-apple`} x1="70" y1="36" x2="70" y2="124" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FF6161" />
              <stop offset="50%" stopColor="#F04242" />
              <stop offset="100%" stopColor="#D92B2B" />
            </linearGradient>
            <linearGradient id={`${gradientId}-leaf`} x1="72" y1="20" x2="98" y2="34" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#A0CE4E" />
              <stop offset="100%" stopColor="#7EAA35" />
            </linearGradient>
          </defs>

          {/* Soft ambient ground shadow */}
          <ellipse cx="70" cy="132" rx="36" ry="6" fill="#1C1917" fillOpacity="0.08" />

          {/* Wooden Stem */}
          <path
            d="M 68 37 C 68 25, 62 16, 58 13 C 62 13, 69 22, 72 37 Z"
            fill="#5D3E24"
            stroke="#4A2F18"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />

          {/* Fresh Botanical Leaf */}
          <path
            d="M 72 27 C 86 16, 99 22, 97 34 C 86 36, 75 32, 72 27 Z"
            fill={`url(#${gradientId}-leaf)`}
            stroke="#65882B"
            strokeWidth="0.8"
          />
          {/* Subtle leaf center vein */}
          <path
            d="M 73 28 C 81 27, 88 29, 93 33"
            stroke="#5D7E26"
            strokeWidth="1.2"
            strokeLinecap="round"
          />

          {/* Apple Plump Body with iconic top dip */}
          <path
            d="M 70 37 C 83 37, 115 42, 115 77 C 115 106, 88 124, 70 122 C 52 124, 25 106, 25 77 C 25 42, 57 37, 70 37 Z"
            fill={`url(#${gradientId}-apple)`}
          />

          {/* Soft organic gloss highlight */}
          <ellipse
            cx="48"
            cy="56"
            rx="12"
            ry="7"
            fill="#FFFFFF"
            fillOpacity="0.22"
            transform="rotate(-26 48 56)"
          />

          {/* Left Eye */}
          <g
            style={{
              transformOrigin: '52px 75px',
              transform: isBlinking ? 'scaleY(0.08)' : 'scaleY(1)',
              transition: 'transform 0.12s ease-in-out',
            }}
          >
            {/* White Sclera */}
            <ellipse cx="52" cy="75" rx="13" ry="17" fill="#FFFFFF" />
            {/* Pupil */}
            <circle
              cx={52 + pupilOffset.x}
              cy={75 + pupilOffset.y}
              r="7.5"
              fill="#1C1917"
            />
            {/* Specular White Highlight */}
            <circle
              cx={54 + pupilOffset.x * 0.8}
              cy={72 + pupilOffset.y * 0.8}
              r="2.8"
              fill="#FFFFFF"
            />
          </g>

          {/* Right Eye */}
          <g
            style={{
              transformOrigin: '82px 75px',
              transform: isBlinking ? 'scaleY(0.08)' : 'scaleY(1)',
              transition: 'transform 0.12s ease-in-out',
            }}
          >
            {/* White Sclera */}
            <ellipse cx="82" cy="75" rx="13" ry="17" fill="#FFFFFF" />
            {/* Pupil */}
            <circle
              cx={82 + pupilOffset.x}
              cy={75 + pupilOffset.y}
              r="7.5"
              fill="#1C1917"
            />
            {/* Specular White Highlight */}
            <circle
              cx={84 + pupilOffset.x * 0.8}
              cy={72 + pupilOffset.y * 0.8}
              r="2.8"
              fill="#FFFFFF"
            />
          </g>
        </svg>
      </div>

      {/* Speech Bubble on the Right (for Option Selection mode) */}
      {bubblePosition === 'right' && message && (
        <div className="relative animate-in fade-in slide-in-from-left-2 duration-200">
          <div className="relative z-10 flex items-center gap-2 rounded-2xl border border-neutral-200/80 bg-white px-5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            <span className="text-[17px] font-medium tracking-tight text-[#2A231C]">
              {message}
            </span>
            {audioSrc && audioAvailable && (
              <button
                type="button"
                onClick={toggleManualAudio}
                className="ml-1 rounded-full p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none"
                title={isPlayingAudio ? 'Mute voice' : 'Play voice'}
                aria-label="Voice question"
              >
                {isPlayingAudio ? (
                  <Volume2 className="h-4 w-4 text-emerald-600 animate-pulse" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>
            )}
          </div>
          {/* Left pointing speech bubble tail */}
          <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 z-0">
            <div className="h-3 w-3 rotate-45 border-b border-l border-neutral-200/80 bg-white" />
          </div>
        </div>
      )}
    </div>
  )
}
