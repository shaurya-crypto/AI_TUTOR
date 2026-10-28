'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { createAvatar, type AvatarController } from '@bible-strong/avatar-react'
import '@bible-strong/avatar-react/styles.css'
import avatarDefinition from '@/cloudee.avatar.json'

const SobiAvatar = createAvatar(avatarDefinition as any)

export interface SobiVectorBotProps {
  message?: string
  subtitle?: string
  bubblePosition?: 'top' | 'right'
  audioSrc?: string
  isMuted?: boolean
  onToggleMute?: () => void
  size?: number
  className?: string
  lookAt?: { x: number; y: number } | 'cursor' | 'input' | 'center'
  expression?: string
  animation?: string
  isTyping?: boolean
  onClick?: () => void
}

export function SobiVectorBot({
  message = "What's your name?",
  subtitle,
  bubblePosition = 'top',
  audioSrc,
  isMuted = false,
  onToggleMute,
  size = 140,
  className = '',
  lookAt = 'cursor',
  expression,
  animation,
  isTyping = false,
  onClick,
}: SobiVectorBotProps) {
  const avatarRef = useRef<AvatarController>(null)
  const botContainerRef = useRef<HTMLDivElement>(null)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioAvailable, setAudioAvailable] = useState(true)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const clickReactionTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [isClickReacting, setIsClickReacting] = useState(false)
  const latestExpressionRef = useRef(expression)

  useEffect(() => {
    latestExpressionRef.current = expression
  }, [expression])

  // Safe expression and animation triggers
  const triggerExpression = useCallback((expr: string) => {
    try {
      avatarRef.current?.setExpression(expr as any)
    } catch {
      // Degrade gracefully if key is unknown
    }
  }, [])

  const triggerAnimation = useCallback((anim: string) => {
    try {
      avatarRef.current?.play(anim as any)
    } catch {
      // Degrade gracefully if key is unknown
    }
  }, [])

  // 1. Audio Question Pronunciation Playback
  useEffect(() => {
    if (!audioSrc) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setIsPlayingAudio(false)
      return
    }

    setAudioAvailable(true)

    if (isMuted) {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
      setIsPlayingAudio(false)
      return
    }

    const audio = new Audio(audioSrc)
    audioRef.current = audio

    audio.onplay = () => {
      setIsPlayingAudio(true)
      triggerAnimation('listening')
      triggerExpression('attentive-left')
    }
    audio.onended = () => {
      setIsPlayingAudio(false)
      triggerExpression(latestExpressionRef.current || 'neutral')
    }
    audio.onerror = (e) => {
      console.warn('Audio resource could not be played:', audioSrc, e)
      setIsPlayingAudio(false)
    }

    const playPromise = audio.play()
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay policy deferred until user interaction
        setIsPlayingAudio(false)
      })
    }

    return () => {
      audio.pause()
      audio.currentTime = 0
    }
  }, [audioSrc, isMuted, triggerAnimation, triggerExpression])

  // 2. React to expression & animation props
  useEffect(() => {
    if (isClickReacting || isPlayingAudio) return

    if (animation) {
      triggerAnimation(animation)
      return
    }

    if (expression) {
      triggerExpression(expression)
      return
    }

    // Default resting states when no override prop is provided
    if (isTyping) {
      triggerExpression('downward-gaze')
      return
    }

    if (lookAt === 'input') {
      triggerExpression('downward-gaze')
      return
    }

    if (lookAt === 'center') {
      triggerExpression('neutral')
      return
    }

    // If lookAt === 'cursor', mouse movement will govern or default to neutral
    triggerExpression('neutral')
  }, [expression, animation, isTyping, lookAt, isClickReacting, isPlayingAudio, triggerAnimation, triggerExpression])

  // 3. Natural gaze tracking when lookAt === 'cursor' and not in active reaction
  useEffect(() => {
    if (lookAt !== 'cursor' || expression || animation || isPlayingAudio || isClickReacting || isTyping) {
      return
    }

    let throttleTimer: NodeJS.Timeout | null = null

    const handleMouseMove = (e: MouseEvent) => {
      if (throttleTimer) return
      throttleTimer = setTimeout(() => {
        throttleTimer = null
      }, 120)

      if (!botContainerRef.current) return
      const rect = botContainerRef.current.getBoundingClientRect()
      const botCenterX = rect.left + rect.width / 2
      const botCenterY = rect.top + rect.height / 2

      const dx = e.clientX - botCenterX
      const dy = e.clientY - botCenterY
      const dist = Math.hypot(dx, dy)

      if (dist < 50) {
        triggerExpression('neutral')
        return
      }

      // Responsive gaze direction based on mouse position relative to Sobi
      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx < -50) {
          triggerExpression('attentive-left')
        } else if (dx > 50) {
          triggerExpression('playful-right')
        }
      } else {
        if (dy > 50) {
          triggerExpression('downward-gaze')
        } else if (dy < -50) {
          triggerExpression('upward-side-glance')
        }
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (throttleTimer) clearTimeout(throttleTimer)
    }
  }, [lookAt, expression, animation, isPlayingAudio, isClickReacting, isTyping, triggerExpression])

  // 4. Click reaction on Sobi
  const handleSobiClick = () => {
    setIsClickReacting(true)
    triggerAnimation('celebrate')
    triggerExpression('joyful-wide')

    if (clickReactionTimerRef.current) clearTimeout(clickReactionTimerRef.current)
    clickReactionTimerRef.current = setTimeout(() => {
      setIsClickReacting(false)
      if (expression) {
        triggerExpression(expression)
      } else if (lookAt === 'input' || isTyping) {
        triggerExpression('downward-gaze')
      } else {
        triggerExpression('neutral')
      }
    }, 1200)

    if (onClick) onClick()
  }

  const toggleManualAudio = () => {
    if (!audioSrc) return

    if (!audioRef.current) {
      const audio = new Audio(audioSrc)
      audioRef.current = audio
      audio.onplay = () => {
        setIsPlayingAudio(true)
        triggerAnimation('listening')
        triggerExpression('attentive-left')
      }
      audio.onended = () => {
        setIsPlayingAudio(false)
        triggerExpression(latestExpressionRef.current || 'neutral')
      }
    }

    if (isPlayingAudio) {
      audioRef.current.pause()
      setIsPlayingAudio(false)
      triggerExpression(latestExpressionRef.current || 'neutral')
    } else {
      audioRef.current.currentTime = 0
      audioRef.current
        .play()
        .then(() => {
          setIsPlayingAudio(true)
          if (isMuted && onToggleMute) {
            onToggleMute()
          }
        })
        .catch((e) => console.warn('Manual audio play blocked:', e))
    }
  }

  const initialDefaultExpr = lookAt === 'input' ? 'downward-gaze' : 'neutral'

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
            <div className="flex flex-col">
              <span className="text-[17px] font-medium tracking-tight text-[#2A231C]">
                {message}
              </span>
              {subtitle && (
                <span className="text-[13px] text-neutral-500 font-normal mt-0.5">
                  {subtitle}
                </span>
              )}
            </div>
            {audioSrc && (
              <button
                type="button"
                onClick={toggleManualAudio}
                className="ml-1 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none"
                title={isPlayingAudio ? 'Pause voice' : 'Play voice question'}
                aria-label="Voice question"
              >
                {isPlayingAudio ? (
                  <Volume2 className="h-4 w-4 text-emerald-600 animate-pulse" />
                ) : isMuted ? (
                  <VolumeX className="h-4 w-4 text-neutral-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-neutral-500 hover:text-neutral-800" />
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

      {/* Sobi Avatar Mascot with physical grounding shadow and atmospheric depth */}
      <div
        ref={botContainerRef}
        onClick={handleSobiClick}
        className="relative flex items-center justify-center cursor-pointer transition-transform duration-300 hover:scale-105 active:scale-95 group"
        style={{
          width: size,
          height: size,
          filter: 'drop-shadow(0 10px 22px rgba(42, 35, 28, 0.12))',
        }}
        title="Sobi, your learning companion"
      >
        <SobiAvatar
          ref={avatarRef}
          size={size}
          defaultExpression={initialDefaultExpr}
          className="select-none pointer-events-none"
        />
        {/* Soft ambient ground shadow beneath Sobi cloud */}
        <div className="absolute -bottom-2 w-3/5 h-2 bg-[#2A231C]/10 rounded-full blur-[3px] pointer-events-none transition-transform duration-300 group-hover:scale-90" />
      </div>

      {/* Speech Bubble on the Right (for Option Selection mode) */}
      {bubblePosition === 'right' && message && (
        <div className="relative animate-in fade-in slide-in-from-left-2 duration-200">
          <div className="relative z-10 flex items-center gap-2 rounded-2xl border border-neutral-200/80 bg-white px-5 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)]">
            <div className="flex flex-col">
              <span className="text-[17px] font-medium tracking-tight text-[#2A231C]">
                {message}
              </span>
              {subtitle && (
                <span className="text-[13px] text-neutral-500 font-normal mt-0.5">
                  {subtitle}
                </span>
              )}
            </div>
            {audioSrc && (
              <button
                type="button"
                onClick={toggleManualAudio}
                className="ml-1 rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none"
                title={isPlayingAudio ? 'Pause voice' : 'Play voice question'}
                aria-label="Voice question"
              >
                {isPlayingAudio ? (
                  <Volume2 className="h-4 w-4 text-emerald-600 animate-pulse" />
                ) : isMuted ? (
                  <VolumeX className="h-4 w-4 text-neutral-400" />
                ) : (
                  <Volume2 className="h-4 w-4 text-neutral-500 hover:text-neutral-800" />
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
