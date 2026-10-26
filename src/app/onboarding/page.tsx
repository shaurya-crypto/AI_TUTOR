'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/utils/supabase/client'
import { SobiVectorBot } from '@/components/mascot/SobiVectorBot'
import { completeOnboardingAction, Phase4OnboardingData } from './actions'
import { getLanguageVoiceConfig } from '@/lib/voiceAndLanguageConfig'
import { ArrowLeft, ArrowRight, Volume2, VolumeX, Loader2 } from 'lucide-react'

// Sparkle Icon matching Aristotle's selection option styling
function SparkleStar({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="sparkle-grad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="60%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EA580C" />
        </linearGradient>
      </defs>
      <path
        d="M12 2C12 7.5 16.5 12 22 12C16.5 12 12 16.5 12 22C12 16.5 7.5 12 2 12C7.5 12 12 7.5 12 2Z"
        fill="url(#sparkle-grad)"
      />
      <circle cx="18" cy="6" r="1.5" fill="#FBBF24" />
      <circle cx="6" cy="18" r="1.2" fill="#F97316" />
    </svg>
  )
}

interface QuestionConfig {
  id: string
  title: string
  subtitle?: string
  sobiExpression: string
  type: 'text' | 'number' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
  audioFile: string
}

const QUESTIONS: QuestionConfig[] = [
  {
    id: 'preferredLanguage',
    title: 'Which language do you prefer for your AI tutor?',
    subtitle: 'Language of talking & spoken conversation during class',
    sobiExpression: 'attentive-left',
    type: 'select',
    audioFile: '/audio/onboarding/q0_language.mp3',
    options: [
      { value: 'English', label: 'English (Academic & Conversational English)' },
      { value: 'Hinglish', label: 'Hinglish (Conversational English + Hindi)' },
      { value: 'Hindi', label: 'Hindi (हिंदी — Conversational Hindi)' },
      { value: 'Spanish', label: 'Spanish (Español)' },
      { value: 'French', label: 'French (Français)' },
      { value: 'German', label: 'German (Deutsch)' },
    ],
  },
  {
    id: 'studyMedium',
    title: 'Which medium of study do you follow for notes & teaching?',
    subtitle: 'Language for whiteboard chalkboard notes and formal teaching',
    sobiExpression: 'curious-left',
    type: 'select',
    audioFile: '/audio/onboarding/q0_medium.mp3',
    options: [
      { value: 'English', label: 'English Medium (Notes & whiteboard in English)' },
      { value: 'Hindi', label: 'Hindi Medium (हिंदी माध्यम — Notes & whiteboard in Hindi)' },
      { value: 'Hinglish', label: 'Bilingual / Hinglish (English chalkboard notes with Hindi explanation)' },
      { value: 'Other', label: 'Other Language Medium (Regional / International Medium)' },
    ],
  },
  {
    id: 'fullName',
    title: "What's your name?",
    subtitle: 'Let Sobi know who they are pair-learning with',
    sobiExpression: 'joyful-wide',
    type: 'text',
    placeholder: 'Type your name...',
    audioFile: '/audio/onboarding/q1_name.mp3',
  },
  {
    id: 'age',
    title: 'How old are you?',
    subtitle: 'Calibrates problem depth and foundational analogies',
    sobiExpression: 'curious-left',
    type: 'number',
    placeholder: 'Type your age (e.g. 15)...',
    audioFile: '/audio/onboarding/q2_age.mp3',
  },
  {
    id: 'classLevel',
    title: 'What grade are you in?',
    subtitle: 'Loads your authentic board syllabus from Classes 6 to 12',
    sobiExpression: 'small-attentive',
    type: 'select',
    audioFile: '/audio/onboarding/q3_grade.mp3',
    options: [
      { value: 'Class 6', label: '6th grade' },
      { value: 'Class 7', label: '7th grade' },
      { value: 'Class 8', label: '8th grade' },
      { value: 'Class 9', label: '9th grade' },
      { value: 'Class 10', label: '10th grade' },
      { value: 'Class 11', label: '11th grade' },
      { value: 'Class 12', label: '12th grade' },
    ],
  },
  {
    id: 'targetBoard',
    title: 'Which educational board are you studying under?',
    subtitle: 'Selects authentic curriculum format, definitions, and grading rubrics',
    sobiExpression: 'attentive-left',
    type: 'select',
    audioFile: '/audio/onboarding/q4_board.mp3',
    options: [
      { value: 'CBSE', label: 'CBSE (NCERT & Competency-Based Application)' },
      { value: 'ICSE', label: 'ICSE / ISC (Concise Formulations & Deep Precision)' },
      { value: 'IB', label: 'IB (MYP & DP Inquiry & Real-world Analysis)' },
    ],
  },
  {
    id: 'careerAspiration',
    title: 'What do you want to pursue or become in the future?',
    subtitle: 'Sobi connects abstract physics and math concepts to your real-world dream',
    sobiExpression: 'upward-side-glance',
    type: 'text',
    placeholder: 'e.g. Aerospace Engineer, Doctor, AI Researcher, Astrophysicist...',
    audioFile: '/audio/onboarding/q5_aspiration.mp3',
  },
  {
    id: 'learningPace',
    title: 'How fast do you usually understand new concepts?',
    subtitle: 'Determines pause frequencies and question checkpoints',
    sobiExpression: 'curious-left',
    type: 'select',
    audioFile: '/audio/onboarding/q6_pacing.mp3',
    options: [
      { value: 'fast_and_curious', label: 'Fast & curious — give me challenging problems quickly' },
      { value: 'steady_and_balanced', label: 'Steady & balanced — balance concepts with step-by-step examples' },
      { value: 'slow_deep_intuitive', label: 'Deep & intuitive — slow down with real-world analogies first' },
    ],
  },
  {
    id: 'favoriteSubject',
    title: 'Which subject do you enjoy or find easiest?',
    subtitle: 'Highlights your strongest academic foundation',
    sobiExpression: 'joyful-wide',
    type: 'select',
    audioFile: '/audio/onboarding/q7_strong_subject.mp3',
    options: [
      { value: 'Physics', label: 'Physics — motion, forces, electricity, and the universe' },
      { value: 'Chemistry', label: 'Chemistry — elements, reactions, and molecular structures' },
      { value: 'Biology', label: 'Biology — life systems, cellular biology, and ecosystems' },
      { value: 'Mathematics', label: 'Mathematics — algebra, geometry, calculus, and proofs' },
    ],
  },
  {
    id: 'weakArea',
    title: 'Where do you encounter the most friction or struggle?',
    subtitle: 'Sobi provides extra patience and visual co-solving here',
    sobiExpression: 'gentle-downward-gaze',
    type: 'select',
    audioFile: '/audio/onboarding/q8_weak_area.mp3',
    options: [
      { value: 'formula_derivations', label: 'Deriving complex formulas and mathematical proofs' },
      { value: 'numerical_application', label: 'Solving numerical problems under time pressure' },
      { value: 'textbook_definitions', label: 'Memorizing exact textbook definitions and terms' },
      { value: 'spatial_visualizations', label: 'Visualizing 3D diagrams, mechanisms, and rays' },
      { value: 'foundational_intuition', label: 'Understanding deep physical intuition behind concepts' },
    ],
  },
  {
    id: 'learningStyle',
    title: 'How would you like your AI tutor to teach you?',
    subtitle: 'Shapes the chalkboard style and dialogue structure',
    sobiExpression: 'attentive-left',
    type: 'select',
    audioFile: '/audio/onboarding/q9_learning_style.mp3',
    options: [
      { value: 'socratic', label: 'Socratic Guidance — prompt me with questions so I deduce answers' },
      { value: 'visual', label: 'Visual & Intuitive — explain with live dynamic diagrams and sketches' },
      { value: 'board_numerical', label: 'Step-by-Step Derivations — write out clean chalk equations on board' },
      { value: 'storytelling', label: 'Real-Life Analogies — ground concepts in daily physical objects' },
    ],
  },
  {
    id: 'preferredVoice',
    title: "Pick your personal AI tutor's voice persona",
    subtitle: 'Select the voice tone that best motivates your daily study sessions',
    sobiExpression: 'attentive-left',
    type: 'select',
    audioFile: '/audio/onboarding/q10_voice.mp3',
    options: [
      { value: 'Leda', label: 'Leda — Warm, youthful, natural Indian inflection (Recommended)' },
      { value: 'Puck', label: 'Puck — Upbeat, lively, energetic Indian inflection (Recommended)' },
      { value: 'Aoede', label: 'Aoede — Breezy, relaxed, and methodical mentor' },
      { value: 'Charon', label: 'Charon — Calm, deep, and patient guide' },
      { value: 'Kore', label: 'Kore — Crisp, attentive, and academically clear' },
      { value: 'Fenrir', label: 'Fenrir — Confident, energetic, and engaging' },
    ],
  },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  // Form State
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({
    preferredLanguage: 'English',
    studyMedium: 'English',
    fullName: '',
    age: '',
    classLevel: 'Class 10',
    targetBoard: 'CBSE',
    careerAspiration: '',
    learningPace: 'steady_and_balanced',
    favoriteSubject: 'Physics',
    weakArea: 'formula_derivations',
    learningStyle: 'socratic',
    preferredVoice: 'Leda',
  })

  const [reactionExpression, setReactionExpression] = useState<string | undefined>(undefined)
  const [hoverExpression, setHoverExpression] = useState<string | undefined>(undefined)
  const [textInputValue, setTextInputValue] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const textInputRef = useRef<HTMLInputElement | null>(null)

  const currentQ = QUESTIONS[currentStep]
  const progressPercent = Math.round(((currentStep + 1) / QUESTIONS.length) * 100)

  // Pre-populate name if user metadata exists
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.full_name && !answers.fullName) {
        setAnswers((prev) => ({
          ...prev,
          fullName: user.user_metadata.full_name,
        }))
        setTextInputValue(user.user_metadata.full_name)
      }
    })
  }, [supabase])

  // Sync text input value on step change
  useEffect(() => {
    if (currentQ.type === 'text' || currentQ.type === 'number') {
      setTextInputValue(answers[currentQ.id] !== undefined ? String(answers[currentQ.id]) : '')
      setTimeout(() => {
        textInputRef.current?.focus()
      }, 150)
    }
  }, [currentStep, currentQ])

  // Advance to next question or submit with visible celebration reaction
  const handleNext = async (customValue?: any) => {
    // Sobi joyful celebration reaction on answer confirmation
    setReactionExpression('joyful-wide')
    setTimeout(() => {
      setReactionExpression(undefined)
    }, 700)

    const valueToSave = customValue !== undefined ? customValue : textInputValue
    const updatedAnswers = {
      ...answers,
      [currentQ.id]: currentQ.type === 'number' && valueToSave ? parseInt(valueToSave, 10) : valueToSave,
    }

    // Auto-align recommended voice persona when preferredLanguage is chosen
    if (currentQ.id === 'preferredLanguage' && typeof valueToSave === 'string') {
      const langConfig = getLanguageVoiceConfig(valueToSave)
      updatedAnswers.preferredVoice = langConfig.defaultVoice
    }

    setAnswers(updatedAnswers)

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      // Final submission
      await submitOnboarding(updatedAnswers)
    }
  }

  // Back to previous question
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  // Skip current question
  const handleSkip = () => {
    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep((prev) => prev + 1)
    } else {
      submitOnboarding(answers)
    }
  }

  // Final submission action
  const submitOnboarding = async (dataToSubmit: Record<string, any>) => {
    setIsSubmitting(true)
    const payload: Phase4OnboardingData = {
      preferredLanguage: dataToSubmit.preferredLanguage || 'English',
      studyMedium: dataToSubmit.studyMedium || 'English',
      fullName: dataToSubmit.fullName || 'Student',
      age: typeof dataToSubmit.age === 'number' ? dataToSubmit.age : parseInt(dataToSubmit.age, 10) || null,
      classLevel: dataToSubmit.classLevel || 'Class 10',
      targetBoard: dataToSubmit.targetBoard || 'CBSE',
      careerAspiration: dataToSubmit.careerAspiration || '',
      learningPace: dataToSubmit.learningPace || 'steady_and_balanced',
      favoriteSubject: dataToSubmit.favoriteSubject || 'Physics',
      weakArea: dataToSubmit.weakArea || 'Derivations',
      learningStyle: dataToSubmit.learningStyle || 'socratic',
      preferredVoice: dataToSubmit.preferredVoice || 'Leda',
    }

    const res = await completeOnboardingAction(payload)
    if (res?.error) {
      if (res.error.includes('Authentication required')) {
        if (typeof window !== 'undefined') {
          localStorage.setItem('pending_onboarding', JSON.stringify(payload))
        }
        router.push('/login')
        return
      }
      alert(res.error)
      setIsSubmitting(false)
    }
  }

  const handleTextFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!textInputValue.trim() || isSubmitting) return
    handleNext(textInputValue.trim())
  }

  // Active expression resolution: priority reaction > hover > typing > question resting expression
  const activeSobiExpression =
    reactionExpression ||
    hoverExpression ||
    (textInputValue.trim().length > 0 ? 'downward-gaze' : currentQ.sobiExpression)

  return (
    <div className="relative min-h-screen w-full bg-[#FAF8F5] text-[#2A231C] overflow-hidden flex flex-col font-sans select-none">
      {/* Aristotle Fine Paper Grid Canvas Background */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-40"
        style={{
          backgroundImage: `
            linear-gradient(to right, #E7E5E0 1px, transparent 1px),
            linear-gradient(to bottom, #E7E5E0 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />

      {/* 1. Header Toolbar */}
      <header className="relative z-20 flex h-16 w-full items-center justify-between px-6 sm:px-10">
        <div className="flex items-center gap-3">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white/80 text-neutral-600 shadow-sm transition-all hover:bg-white hover:text-neutral-900 active:scale-95 disabled:opacity-50"
              aria-label="Previous question"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Minimal Progress Bar (Top Center) */}
        <div className="w-48 sm:w-64">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200/80">
            <motion.div
              className="h-full bg-[#8F847D] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsMuted(!isMuted)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-neutral-200 bg-white/80 text-neutral-600 shadow-sm transition-all hover:bg-white hover:text-neutral-900 active:scale-95"
            title={isMuted ? 'Unmute voice questions' : 'Mute voice questions'}
            aria-label="Toggle voice"
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleSkip}
            disabled={isSubmitting}
            className="text-sm font-medium text-neutral-500 transition-colors hover:text-neutral-800"
          >
            Skip
          </button>
        </div>
      </header>

      {/* 2. Main Question Area */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-28 pt-2">
        <AnimatePresence mode="wait">
          {/* A. TEXT / NUMBER INPUT MODE */}
          {(currentQ.type === 'text' || currentQ.type === 'number') && (
            <motion.div
              key={`q-text-${currentQ.id}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center justify-center"
            >
              {/* Centered Sobi Bot with Speech Bubble directly above */}
              <SobiVectorBot
                message={currentQ.title}
                subtitle={currentQ.subtitle}
                bubblePosition="top"
                audioSrc={currentQ.audioFile}
                isMuted={isMuted}
                onToggleMute={() => setIsMuted(!isMuted)}
                size={140}
                lookAt="input"
                expression={activeSobiExpression}
                isTyping={textInputValue.trim().length > 0}
              />
            </motion.div>
          )}

          {/* B. OPTION SELECTION MODE */}
          {currentQ.type === 'select' && (
            <motion.div
              key={`q-select-${currentQ.id}`}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25 }}
              className="flex w-full max-w-[560px] flex-col items-center"
            >
              {/* Sobi Bot on left with Speech Bubble on right */}
              <div className="mb-6 flex w-full items-center justify-start pl-2">
                <SobiVectorBot
                  message={currentQ.title}
                  subtitle={currentQ.subtitle}
                  bubblePosition="right"
                  audioSrc={currentQ.audioFile}
                  isMuted={isMuted}
                  onToggleMute={() => setIsMuted(!isMuted)}
                  size={105}
                  lookAt="cursor"
                  expression={activeSobiExpression}
                />
              </div>

              {/* Options Card Container */}
              <div className="w-full rounded-2xl border border-neutral-200/80 bg-white/95 p-3.5 shadow-[0_4px_24px_rgba(0,0,0,0.04)] backdrop-blur-sm max-h-[58vh] overflow-y-auto">
                <div className="flex flex-col gap-2.5">
                  {currentQ.options?.map((opt) => {
                    const isSelected = answers[currentQ.id] === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleNext(opt.value)}
                        onMouseEnter={() => setHoverExpression('attentive-left')}
                        onMouseLeave={() => setHoverExpression(undefined)}
                        className={`group flex w-full items-center gap-3.5 rounded-xl border px-4 py-3.5 text-left transition-all active:scale-[0.99] ${
                          isSelected
                            ? 'border-neutral-800 bg-neutral-50 shadow-sm'
                            : 'border-neutral-200/90 bg-white hover:border-neutral-400 hover:bg-neutral-50/60'
                        }`}
                      >
                        <SparkleStar className="h-5 w-5 shrink-0 transition-transform group-hover:scale-110" />
                        <span className="text-[15px] font-medium text-neutral-800">
                          {opt.label}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* 3. Bottom Pill Input (For Text/Number Questions) */}
      {(currentQ.type === 'text' || currentQ.type === 'number') && (
        <footer className="fixed bottom-10 left-1/2 z-30 w-full max-w-[480px] -translate-x-1/2 px-4">
          <form
            onSubmit={handleTextFormSubmit}
            className="flex items-center rounded-2xl border-2 border-[#45382F] bg-white px-4 py-2.5 shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all focus-within:ring-2 focus-within:ring-neutral-800"
          >
            <input
              ref={textInputRef}
              type={currentQ.type === 'number' ? 'number' : 'text'}
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              placeholder={currentQ.placeholder}
              min={currentQ.type === 'number' ? 9 : undefined}
              max={currentQ.type === 'number' ? 22 : undefined}
              className="flex-1 bg-transparent text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!textInputValue.trim() || isSubmitting}
              className="ml-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#8F847D] text-white transition-all hover:bg-[#6E635C] active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
              aria-label="Submit answer"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin text-white" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
            </button>
          </form>
        </footer>
      )}

      {/* Global submission overlay if submitting */}
      {isSubmitting && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/70 backdrop-blur-sm">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-800 mb-3" />
          <p className="text-sm font-medium text-neutral-700">Setting up your personalized classroom...</p>
        </div>
      )}
    </div>
  )
}
