'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createAvatar, type AvatarController } from '@bible-strong/avatar-react'
import '@bible-strong/avatar-react/styles.css'
import avatarDefinition from '@/avatar.avatar.json'
import { X, Sparkles, AlertCircle, HelpCircle, Key, ArrowRight } from 'lucide-react'

// Available animations in strobi.avatar.json:
// ['idle', 'listening', 'working', 'excited', 'suspicious', 'laughing']
// Available expressions in strobi.avatar.json:
// ['neutral', 'sleepy-squint', 'drowsy-closed', 'surprised-left', 'joyful-wide', 'curious-left', 'suspicious-right', 'skeptical-left', 'skeptical-right', 'attentive-left', ...]

const StrobiAvatar = createAvatar(avatarDefinition as any)

export interface CompanionGuideDetail {
  targetSelector?: string
  targetElementId?: string
  message: string
  animation?: 'idle' | 'listening' | 'working' | 'excited' | 'suspicious' | 'laughing'
  expression?: string
  mood?: 'normal' | 'suspicious' | 'warning' | 'celebrate' | 'thinking'
  autoDismissMs?: number
}

// Global helper to guide the mascot to any element on any page
export function triggerCompanionGuidance(detail: CompanionGuideDetail) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('companion-guide', { detail }))
  }
}

const DEFAULT_TIPS = [
  "Hi! I'm your AI learning companion. Click me anytime for study tips!",
  "Tip: You can launch a live voice session anytime with Gemini 3.8 Live!",
  "Keep your streak alive by reviewing one syllabus topic capsule today!",
  "Stuck on a problem? Your tutor adapts to Socratic, direct, or visual explanations.",
]

export function Mascot() {
  const avatarRef = useRef<AvatarController>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [speechBubbleOpen, setSpeechBubbleOpen] = useState(false)
  const [currentMessage, setCurrentMessage] = useState(DEFAULT_TIPS[0])
  const [currentMood, setCurrentMood] = useState<'normal' | 'suspicious' | 'warning' | 'celebrate' | 'thinking'>('normal')
  const [tipIndex, setTipIndex] = useState(0)
  const [isSleeping, setIsSleeping] = useState(false)

  // Floating coordinates when anchored next to a field or button
  const [anchorCoords, setAnchorCoords] = useState<{ x: number; y: number; side: 'right' | 'left' | 'top' } | null>(null)

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const returnToIdleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const autoDismissTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // 2. Play animation safely
  const safePlay = useCallback((anim: 'idle' | 'listening' | 'working' | 'excited' | 'suspicious' | 'laughing') => {
    if (prefersReducedMotion) return
    try {
      avatarRef.current?.play(anim)
    } catch (e) {
      console.warn('[Mascot] play error:', e)
    }
  }, [prefersReducedMotion])

  const safeExpression = useCallback((expr: string) => {
    if (prefersReducedMotion) return
    try {
      avatarRef.current?.setExpression(expr as any)
    } catch (e) {
      console.warn('[Mascot] setExpression error:', e)
    }
  }, [prefersReducedMotion])

  // 3. Reset to idle after reaction
  const resetToIdle = useCallback((delayMs = 3000) => {
    if (returnToIdleTimerRef.current) clearTimeout(returnToIdleTimerRef.current)
    returnToIdleTimerRef.current = setTimeout(() => {
      safePlay('idle')
      setIsSleeping(false)
      setCurrentMood('normal')
    }, delayMs)
  }, [safePlay])

  // Return to bottom-right resting dock
  const returnToDock = useCallback(() => {
    setAnchorCoords(null)
    setCurrentMood('normal')
    safePlay('idle')
    safeExpression('neutral')
    if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current)
  }, [safePlay, safeExpression])

  // 4. Inactivity watchdog: 35s no movement -> drowsy/sleeping
  const handleUserActivity = useCallback(() => {
    if (isSleeping) {
      setIsSleeping(false)
      safePlay('idle')
    }

    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)

    if (!prefersReducedMotion) {
      inactivityTimerRef.current = setTimeout(() => {
        setIsSleeping(true)
        safeExpression('drowsy-closed')
      }, 35000)
    }
  }, [isSleeping, prefersReducedMotion, safeExpression, safePlay])

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'scroll', 'touchstart']
    events.forEach((ev) => window.addEventListener(ev, handleUserActivity, { passive: true }))
    handleUserActivity()

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, handleUserActivity))
      if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
      if (returnToIdleTimerRef.current) clearTimeout(returnToIdleTimerRef.current)
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current)
    }
  }, [handleUserActivity])

  // 5. Intelligent Guidance Event Listener (moves ball to anchor & delivers dialogue)
  useEffect(() => {
    const handleCompanionGuide = (e: Event) => {
      const customEvent = e as CustomEvent<CompanionGuideDetail>
      const { targetSelector, targetElementId, message, animation, expression, mood = 'normal', autoDismissMs } = customEvent.detail

      setIsSleeping(false)
      setCurrentMessage(message)
      setCurrentMood(mood)
      setSpeechBubbleOpen(true)

      // Calculate anchor coordinates next to target element
      const selector = targetSelector || (targetElementId ? `#${targetElementId}` : undefined)
      if (selector) {
        const targetEl = document.querySelector(selector)
        if (targetEl) {
          const rect = targetEl.getBoundingClientRect()
          const viewportWidth = window.innerWidth

          if (viewportWidth >= 768) {
            // Desktop: Place to the right of element if room permits, otherwise left
            if (rect.right + 240 < viewportWidth) {
              setAnchorCoords({
                x: rect.right + 16,
                y: Math.max(16, rect.top - 20),
                side: 'right',
              })
            } else {
              setAnchorCoords({
                x: Math.max(16, rect.left - 230),
                y: Math.max(16, rect.top - 20),
                side: 'left',
              })
            }
          } else {
            // Mobile: Place above or floating near the top of the element
            setAnchorCoords({
              x: Math.min(viewportWidth - 110, Math.max(16, rect.left + rect.width / 2 - 45)),
              y: Math.max(16, rect.top - 100),
              side: 'top',
            })
          }
        }
      }

      // Execute requested animation and facial expression
      if (animation) {
        safePlay(animation)
      } else if (mood === 'suspicious' || mood === 'warning') {
        safePlay('suspicious')
      } else if (mood === 'celebrate') {
        safePlay('excited')
      } else {
        safePlay('listening')
      }

      if (expression) {
        safeExpression(expression)
      } else if (mood === 'suspicious') {
        safeExpression('suspicious-right')
      } else if (mood === 'warning') {
        safeExpression('skeptical-left')
      } else if (mood === 'celebrate') {
        safeExpression('joyful-wide')
      }

      // Optional auto-dismiss back to dock
      if (autoDismissTimerRef.current) clearTimeout(autoDismissTimerRef.current)
      if (autoDismissMs) {
        autoDismissTimerRef.current = setTimeout(() => {
          returnToDock()
        }, autoDismissMs)
      } else if (mood !== 'suspicious' && mood !== 'warning') {
        // Normal tips dismiss after 8 seconds
        autoDismissTimerRef.current = setTimeout(() => {
          setSpeechBubbleOpen(false)
          returnToDock()
        }, 9000)
      }
    }

    window.addEventListener('companion-guide', handleCompanionGuide)
    return () => window.removeEventListener('companion-guide', handleCompanionGuide)
  }, [safePlay, safeExpression, returnToDock])

  // 6. Global Reaction Listener (backward compatibility)
  useEffect(() => {
    const handleGlobalReaction = (e: Event) => {
      const customEvent = e as CustomEvent<string>
      const reaction = customEvent.detail
      if (['idle', 'listening', 'working', 'excited', 'suspicious', 'laughing'].includes(reaction)) {
        safePlay(reaction as any)
        resetToIdle(3000)
      } else if (reaction === 'celebrate') {
        safePlay('excited')
        setSpeechBubbleOpen(true)
        resetToIdle(3000)
      } else if (reaction === 'confused' || reaction === 'error') {
        safeExpression('surprised-left')
        safePlay('suspicious')
        resetToIdle(3000)
      }
    }

    window.addEventListener('mascot-react', handleGlobalReaction)
    return () => window.removeEventListener('mascot-react', handleGlobalReaction)
  }, [safePlay, safeExpression, resetToIdle])

  // Click on mascot -> laughing + cycle speech tip
  const handleMascotClick = () => {
    safePlay('laughing')
    setTipIndex((prev) => (prev + 1) % DEFAULT_TIPS.length)
    setCurrentMessage(DEFAULT_TIPS[(tipIndex + 1) % DEFAULT_TIPS.length])
    setSpeechBubbleOpen(true)
    resetToIdle(2500)
  }

  // Hover on mascot -> excited
  const handleMascotMouseEnter = () => {
    if (!isSleeping && currentMood === 'normal') {
      safePlay('excited')
    }
  }

  const handleMascotMouseLeave = () => {
    if (!isSleeping && currentMood === 'normal') {
      safePlay('idle')
    }
  }

  // Positioning style: Docked at bottom-right or floating anchored near an element
  const containerStyle: React.CSSProperties = anchorCoords
    ? {
        position: 'fixed',
        left: `${anchorCoords.x}px`,
        top: `${anchorCoords.y}px`,
        zIndex: 50,
        transition: 'left 0.6s cubic-bezier(0.32, 0.72, 0, 1), top 0.6s cubic-bezier(0.32, 0.72, 0, 1)',
      }
    : {
        position: 'fixed',
        bottom: '1.25rem',
        right: '1.25rem',
        zIndex: 40,
        transition: 'all 0.6s cubic-bezier(0.32, 0.72, 0, 1)',
      }

  // Mood-based halos and themes
  const isSuspicious = currentMood === 'suspicious' || currentMood === 'warning'
  const isCelebrate = currentMood === 'celebrate'

  return (
    <aside
      ref={containerRef}
      style={containerStyle}
      aria-label="AI Tutor Intelligent Companion"
      className="flex flex-col items-center md:items-start select-none pointer-events-none group"
    >
      {/* Interactive Floating Speech Bubble with Apple-tier springs */}
      {speechBubbleOpen && (
        <div
          className={`pointer-events-auto mb-2 max-w-[240px] sm:max-w-[280px] p-3.5 rounded-2xl backdrop-blur-xl border shadow-[0_16px_36px_rgba(23,24,23,0.12)] text-xs text-[#171817] animate-in fade-in zoom-in-95 duration-300 relative ${
            isSuspicious
              ? 'bg-amber-50/95 border-amber-300 ring-2 ring-amber-400/20'
              : isCelebrate
              ? 'bg-emerald-50/95 border-emerald-300 ring-2 ring-emerald-400/20'
              : 'bg-white/95 border-[#E5E3DB]'
          }`}
        >
          {/* Dismiss button to dock mascot */}
          <button
            onClick={() => {
              setSpeechBubbleOpen(false)
              returnToDock()
            }}
            className="absolute top-2 right-2 text-[#7A7C75] hover:text-[#171817] p-1 rounded-full hover:bg-black/5 transition-colors cursor-pointer"
            aria-label="Close message"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-start gap-2.5 pr-4">
            {isSuspicious ? (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            ) : isCelebrate ? (
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <Sparkles className="w-4 h-4 text-[#C85A43] shrink-0 mt-0.5" />
            )}
            <p className="leading-relaxed font-medium text-[11px] sm:text-xs text-[#171817]">
              {currentMessage}
            </p>
          </div>

          {/* Action pills for forgot password / assistance */}
          {currentMood === 'warning' && (
            <div className="mt-2.5 pt-2 border-t border-amber-200 flex justify-end">
              <span className="text-[10px] text-amber-800 font-bold flex items-center gap-1">
                <Key className="w-3 h-3" /> Tap 'Forgot Password' above
              </span>
            </div>
          )}

          {/* Pointer tail */}
          <div
            className={`w-3 h-3 border-r border-b transform rotate-45 absolute -bottom-1.5 ${
              anchorCoords?.side === 'left' ? 'right-6' : 'left-6'
            } ${
              isSuspicious
                ? 'bg-amber-50 border-amber-300'
                : isCelebrate
                ? 'bg-emerald-50 border-emerald-300'
                : 'bg-white border-[#E5E3DB]'
            }`}
          />
        </div>
      )}

      {/* Procedural Avatar Ball Container */}
      <div
        onClick={handleMascotClick}
        onMouseEnter={handleMascotMouseEnter}
        onMouseLeave={handleMascotMouseLeave}
        className={`pointer-events-auto cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center relative w-[85px] h-[85px] sm:w-[110px] sm:h-[110px] rounded-full ${
          isSuspicious
            ? 'ring-4 ring-amber-400/70 shadow-[0_0_30px_rgba(245,158,11,0.45)] animate-pulse'
            : isCelebrate
            ? 'ring-4 ring-emerald-400/70 shadow-[0_0_30px_rgba(16,185,129,0.45)]'
            : 'filter drop-shadow-[0_10px_25px_rgba(23,24,23,0.1)]'
        }`}
        title="Strobi - Interactive AI Companion"
      >
        <StrobiAvatar
          ref={avatarRef}
          size="100%"
          defaultAnimation={prefersReducedMotion ? undefined : 'idle'}
          defaultExpression={prefersReducedMotion ? 'neutral' : undefined}
          ariaLabel="Strobi Animated Companion"
          onAnimationEnd={(anim) => {
            if (anim === 'laughing' || anim === 'excited') {
              safePlay('idle')
            }
          }}
        />

        {/* Suspicious Warning Icon Badge */}
        {isSuspicious && (
          <span className="absolute -top-1 -right-1 bg-amber-500 text-white p-1 rounded-full shadow-sm animate-bounce">
            <AlertCircle className="w-3.5 h-3.5" />
          </span>
        )}

        {/* Sleeping Status Badge */}
        {isSleeping && (
          <span className="absolute top-1 right-2 bg-white/90 border border-[#E5E3DB] text-[10px] font-bold px-1.5 py-0.5 rounded-full text-[#7A7C75] shadow-xs animate-bounce">
            zZz
          </span>
        )}
      </div>
    </aside>
  )
}
