'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { createAvatar, type AvatarController } from '@bible-strong/avatar-react'
import '@bible-strong/avatar-react/styles.css'
import avatarDefinition from '@/avatar.avatar.json'
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  CornerDownLeft,
  BookOpen,
  HelpCircle,
  Volume2,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react'
import { WritingPositionInfo } from './GreenChalkboard'

const SobiAvatar = createAvatar(avatarDefinition as any)

export interface SobiCompanionProps {
  writingPosition?: WritingPositionInfo | null
  latestTranscript?: string
  isTeacherSpeaking?: boolean
  isListening?: boolean
  activeConceptTitle?: string
  onSubmitAnswer?: (answer: string) => void
  onVoiceAnswer?: (answer: string) => void
}

export function SobiCompanion({
  writingPosition,
  latestTranscript = '',
  isTeacherSpeaking = false,
  isListening = true,
  activeConceptTitle = '',
  onSubmitAnswer,
  onVoiceAnswer,
}: SobiCompanionProps) {
  const avatarRef = useRef<AvatarController>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [typedAnswer, setTypedAnswer] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDictating, setIsDictating] = useState(false)
  const [lastSpeechBubble, setLastSpeechBubble] = useState<string>('')
  const [speechBubbleOpen, setSpeechBubbleOpen] = useState(true)
  const [isGiggling, setIsGiggling] = useState(false)
  const [containerWidth, setContainerWidth] = useState<number>(1000)
  const [containerHeight, setContainerHeight] = useState<number>(700)

  const activeQuestion = writingPosition?.activeQuestion
  const isQuestionActive = Boolean(
    activeQuestion?.text &&
    (activeQuestion.pageIndex === undefined || activeQuestion.pageIndex === writingPosition?.pageIndex)
  )

  // Track parent container dimensions for pixel-perfect docking & overflow protection
  useEffect(() => {
    const updateDimensions = () => {
      const parent = containerRef.current?.parentElement
      if (parent) {
        if (parent.clientWidth) setContainerWidth(parent.clientWidth)
        if (parent.clientHeight) setContainerHeight(parent.clientHeight)
      }
    }
    updateDimensions()
    window.addEventListener('resize', updateDimensions)
    return () => window.removeEventListener('resize', updateDimensions)
  }, [])

  // 1. Accessibility: Detect prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)
    const handleChange = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // 2. Play animation safely
  const safePlay = useCallback(
    (anim: string) => {
      if (prefersReducedMotion) return
      try {
        avatarRef.current?.play(anim as any)
      } catch (e) {
        console.warn('[SobiCompanion] play error:', e)
      }
    },
    [prefersReducedMotion]
  )

  const safeExpression = useCallback(
    (expr: string) => {
      if (prefersReducedMotion) return
      try {
        avatarRef.current?.setExpression(expr as any)
      } catch (e) {
        console.warn('[SobiCompanion] setExpression error:', e)
      }
    },
    [prefersReducedMotion]
  )

  // 3. React to teacher speaking & live transcript updates
  useEffect(() => {
    if (isTeacherSpeaking) {
      safePlay('listening')
      safeExpression('attentive-left')
      if (latestTranscript) {
        // Strip tags and trim
        const clean = latestTranscript.replace(/\[[^\]]+\]/g, '').trim()
        if (clean) {
          setLastSpeechBubble(clean.length > 120 ? clean.slice(-120) + '...' : clean)
          setSpeechBubbleOpen(true)
        }
      }
    } else if (isQuestionActive) {
      safePlay('excited')
      safeExpression('curious-left')
      setSpeechBubbleOpen(true)
    } else {
      safePlay('idle')
      safeExpression('neutral')
    }
  }, [isTeacherSpeaking, latestTranscript, isQuestionActive, safePlay, safeExpression])

  // 4. Interactive giggle on click
  const handleSobiClick = () => {
    setIsGiggling(true)
    safePlay('laughing')
    safeExpression('joyful-wide')
    const cheerfulTips = [
      'Focus on the whiteboard notes - you are mastering this!',
      'Got a question? Speak anytime or write your thoughts.',
      'Toppers always write their given data, formula, and units!',
      'Take your time - learning deeply is what matters.',
    ]
    const randomTip = cheerfulTips[Math.floor(Math.random() * cheerfulTips.length)]
    setLastSpeechBubble(randomTip)
    setSpeechBubbleOpen(true)

    setTimeout(() => {
      setIsGiggling(false)
      if (isQuestionActive) {
        safePlay('excited')
        safeExpression('curious-left')
      } else {
        safePlay('idle')
        safeExpression('neutral')
      }
    }, 2800)
  }

  // 5. Handle answer submission (typed)
  const handleAnswerSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!typedAnswer.trim() || isSubmitting) return

    const answer = typedAnswer.trim()
    setIsSubmitting(true)
    safePlay('working')
    safeExpression('attentive-left')
    setLastSpeechBubble(`Recorded answer: "${answer}". Sending to tutor...`)
    setTypedAnswer('')

    try {
      onSubmitAnswer?.(answer)
    } catch (err) {
      console.error('[SobiCompanion] submit error:', err)
    } finally {
      setTimeout(() => {
        setIsSubmitting(false)
      }, 2000)
    }
  }

  // 6. Speech recognition fallback for dictating in pod
  const handleToggleDictation = () => {
    if (typeof window === 'undefined') return
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setLastSpeechBubble('Microphone active - speak naturally into your mic!')
      return
    }

    if (isDictating) {
      setIsDictating(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = false
      recognition.lang = 'en-IN'

      recognition.onstart = () => {
        setIsDictating(true)
        safePlay('listening')
        safeExpression('attentive-left')
      }

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript || ''
        if (transcript.trim()) {
          setTypedAnswer('')
          setIsSubmitting(true)
          setLastSpeechBubble(`Spoken answer: "${transcript.trim()}". Evaluating...`)
          safePlay('working')
          safeExpression('attentive-left')
          onVoiceAnswer?.(transcript.trim())
          setTimeout(() => setIsSubmitting(false), 2000)
        }
      }

      recognition.onerror = () => {
        setIsDictating(false)
      }

      recognition.onend = () => {
        setIsDictating(false)
      }

      recognition.start()
    } catch (err) {
      console.warn('[SobiCompanion] recognition start error:', err)
      setIsDictating(false)
    }
  }

  // 7. Calculate dynamic glide coordinates on the chalkboard
  // Excalidraw default zoom in GreenChalkboard is 0.7
  const zoomFactor = 0.7
  const topOffset = 48 // Header offset
  const maxSafeTop = Math.max(60, containerHeight - (isQuestionActive ? 280 : 160))
  const scrollY = writingPosition?.scrollY || 0
  const rawTargetY = isQuestionActive && activeQuestion?.y
    ? (activeQuestion.y + scrollY) * zoomFactor + topOffset - 15
    : ((writingPosition?.nextY || 140) + scrollY) * zoomFactor + topOffset - 30
  const computedY = Math.min(Math.max(rawTargetY, 50), maxSafeTop)

  // When question is active and screen is wide enough, dock Sobi directly to the right of the question box (560px)
  const isDockedToQuestion = isQuestionActive && containerWidth >= 920

  return (
    <aside
      ref={containerRef}
      style={{
        position: 'absolute',
        top: `${computedY}px`,
        left: isDockedToQuestion ? '575px' : 'auto',
        right: isDockedToQuestion ? 'auto' : '18px',
        zIndex: 25,
        transition: 'top 0.75s cubic-bezier(0.32, 0.72, 0, 1), left 0.75s cubic-bezier(0.32, 0.72, 0, 1), right 0.75s cubic-bezier(0.32, 0.72, 0, 1)',
      }}
      aria-label="Sobi Intelligent Whiteboard Companion"
      className="select-none pointer-events-none flex flex-col items-end max-w-[340px] sm:max-w-[400px]"
    >
      {/* Speech Transcription & Thought Bubble */}
      {speechBubbleOpen && (lastSpeechBubble || activeConceptTitle || isQuestionActive) && (
        <div
          className={`pointer-events-auto mb-2 p-3 rounded-2xl backdrop-blur-xl border transition-all duration-300 shadow-[0_12px_32px_rgba(23,24,23,0.08)] text-xs text-[#171817] relative animate-in fade-in slide-in-from-right-4 ${
            isQuestionActive
              ? 'bg-[#EEF5FA] border-[#255D88]/40 ring-2 ring-[#255D88]/15'
              : 'bg-[#F8F6F0]/95 border-[#E5E3DB]'
          }`}
        >
          <div className="flex items-start gap-2">
            <span
              className={`p-1 rounded-lg shrink-0 mt-0.5 ${
                isQuestionActive ? 'bg-[#255D88]/10 text-[#255D88]' : 'bg-[#52715D]/10 text-[#52715D]'
              }`}
            >
              {isQuestionActive ? (
                <HelpCircle className="w-3.5 h-3.5 animate-pulse" />
              ) : isTeacherSpeaking ? (
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
            </span>
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-[11px] font-bold tracking-tight text-[#171817] mb-0.5 flex items-center gap-1.5">
                <span>{isQuestionActive ? 'Checkpoint Question' : 'Sobi Companion'}</span>
                {activeConceptTitle && !isQuestionActive && (
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-white/80 border border-[#E5E3DB] text-[#555852] truncate max-w-[120px]">
                    {activeConceptTitle}
                  </span>
                )}
              </p>
              <p className="text-[11px] text-[#555852] leading-relaxed line-clamp-3">
                {isQuestionActive
                  ? activeQuestion?.text || lastSpeechBubble
                  : lastSpeechBubble || `Listening and taking structured notes on "${activeConceptTitle || 'current topic'}"`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Avatar & Interactive Pod Area */}
      <div className="flex items-start gap-3 justify-end pointer-events-auto">
        {/* Interactive Response Pod (Glides with Sobi and opens when question is active) */}
        {isQuestionActive && (
          <div className="p-3 rounded-2xl bg-white/95 backdrop-blur-xl border border-[#255D88]/30 shadow-[0_16px_40px_rgba(37,93,136,0.15)] w-[260px] sm:w-[290px] animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#E5E3DB]">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#255D88] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#255D88] animate-ping" />
                <span>Your Answer</span>
              </span>
              <span className="text-[10px] text-[#7A7C75] font-mono flex items-center gap-1">
                <span>Speak or Type</span>
                <ArrowRight className="w-3 h-3 text-[#255D88]" />
              </span>
            </div>

            <form onSubmit={handleAnswerSubmit} className="space-y-2">
              <div className="relative">
                <input
                  type="text"
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  placeholder="Type answer or speak..."
                  disabled={isSubmitting}
                  className="w-full pl-3 pr-8 py-2 text-xs rounded-xl bg-[#F8F6F0] border border-[#E5E3DB] text-[#171817] placeholder-[#7A7C75] focus:outline-none focus:ring-2 focus:ring-[#255D88]/40 focus:border-[#255D88] transition-all font-sans"
                />
                <button
                  type="button"
                  onClick={handleToggleDictation}
                  className={`absolute right-1.5 top-1.5 p-1 rounded-lg transition-colors cursor-pointer ${
                    isDictating
                      ? 'bg-rose-100 text-rose-600 animate-pulse'
                      : 'text-[#7A7C75] hover:text-[#171817] hover:bg-black/5'
                  }`}
                  title={isDictating ? 'Stop microphone dictation' : 'Click to speak answer'}
                >
                  {isDictating ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="text-[10px] text-[#7A7C75] leading-tight">
                  {isSubmitting ? 'Writing to board...' : 'Press Enter to submit'}
                </span>
                <button
                  type="submit"
                  disabled={!typedAnswer.trim() || isSubmitting}
                  className="px-3 py-1.5 rounded-xl bg-[#255D88] text-white text-xs font-semibold hover:bg-[#1C486B] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <span>Submit</span>
                  <CornerDownLeft className="w-3 h-3" />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Sobi Avatar Sphere (Cute procedural 3D mascot with blush glow) */}
        <div
          onClick={handleSobiClick}
          className={`cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center relative w-[75px] h-[75px] sm:w-[88px] sm:h-[88px] rounded-full shrink-0 ${
            isQuestionActive
              ? 'ring-4 ring-[#255D88]/30 shadow-[0_0_24px_rgba(37,93,136,0.35)]'
              : 'ring-2 ring-[#52715D]/20 shadow-[0_10px_25px_rgba(23,24,23,0.1)]'
          } ${isGiggling ? 'animate-bounce' : ''}`}
          title="Sobi - Interactive Classroom Companion"
        >
          {/* Pointer Cue from Sobi to response pod */}
          {isQuestionActive && (
            <div
              className="absolute -left-2 top-1/2 -translate-y-1/2 w-0 h-0 border-y-[6px] border-y-transparent border-r-[8px] border-r-[#255D88] drop-shadow-xs animate-pulse"
              title="Sobi pointing to input pod"
            />
          )}

          {prefersReducedMotion ? (
            <SobiAvatar
              ref={avatarRef}
              size="100%"
              defaultExpression="neutral"
              ariaLabel="Sobi Companion"
              onAnimationEnd={(anim) => {
                if (anim === 'laughing' || anim === 'excited') {
                  if (isQuestionActive) {
                    safePlay('excited')
                  } else {
                    safePlay('idle')
                  }
                }
              }}
            />
          ) : (
            <SobiAvatar
              ref={avatarRef}
              size="100%"
              defaultAnimation="idle"
              ariaLabel="Sobi Companion"
              onAnimationEnd={(anim) => {
                if (anim === 'laughing' || anim === 'excited') {
                  if (isQuestionActive) {
                    safePlay('excited')
                  } else {
                    safePlay('idle')
                  }
                }
              }}
            />
          )}

          {/* Question Active Alert Badge */}
          {isQuestionActive && (
            <span className="absolute -top-1 -left-1 bg-[#255D88] text-white p-1 rounded-full shadow-xs animate-bounce">
              <HelpCircle className="w-3.5 h-3.5" />
            </span>
          )}

          {/* Teacher Speaking Live Waveform Badge */}
          {isTeacherSpeaking && !isQuestionActive && (
            <span className="absolute -top-1 -right-1 bg-[#52715D] text-white px-1.5 py-0.5 rounded-full text-[9px] font-mono shadow-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
              <span>LIVE</span>
            </span>
          )}
        </div>
      </div>
    </aside>
  )
}
