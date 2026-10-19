'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  GraduationCap,
  Sparkles,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Brain,
  Compass,
  BookOpen,
  Layers,
  Atom,
  FlaskConical,
  Dna,
  Sigma,
  Rocket,
  Gauge,
  Gamepad2,
  Code2,
  Trophy,
  Music2,
  Palette,
  TreePine,
  Play,
  Square,
  School,
  Activity,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { completeOnboardingAction, OnboardingState } from './actions'
import { triggerCompanionGuidance } from '@/components/mascot/Mascot'

// =========================================================================
// DATA CONFIGURATIONS (ZERO EMOJIS - STRICT SVG & TYPOGRAPHY)
// =========================================================================
const CLASS_OPTIONS = [
  { id: 'Class 8', label: 'Class 8', desc: 'Foundational sciences & basic algebra' },
  { id: 'Class 9', label: 'Class 9', desc: 'Pre-boards: Motion, Matter & Polynomials' },
  { id: 'Class 10', label: 'Class 10', desc: 'Secondary Boards: Electricity, Light & Chemical Reactions' },
  { id: 'Class 11', label: 'Class 11', desc: 'Senior Secondary: Mechanics, Thermodynamics & Vectors' },
  { id: 'Class 12', label: 'Class 12', desc: 'Board & Competitive: Electrostatics, Optics & Calculus' },
  { id: 'Undergraduate', label: 'College / Undergrad', desc: 'Engineering, Applied Physics & Higher Mathematics' },
]

const BOARD_OPTIONS = [
  'CBSE',
  'ICSE / ISC',
  'State Board',
  'Cambridge (IGCSE/A-Levels)',
  'IB Curriculum',
  'JEE / NEET Prep',
]

interface SubjectOption {
  id: string
  label: string
  iconName: 'Atom' | 'FlaskConical' | 'Dna' | 'Sigma' | 'Code2' | 'Compass'
  desc: string
}

const CLASS_SUBJECTS_MAP: Record<string, SubjectOption[]> = {
  'Class 8': [
    { id: 'Physics', label: 'Physics (Science)', iconName: 'Atom', desc: 'Force, Pressure & Sound Dynamics' },
    { id: 'Chemistry', label: 'Chemistry (Science)', iconName: 'FlaskConical', desc: 'Combustion, Flame & Materials' },
    { id: 'Biology', label: 'Biology (Science)', iconName: 'Dna', desc: 'Cell Structure & Microorganisms' },
    { id: 'Mathematics', label: 'Mathematics', iconName: 'Sigma', desc: 'Linear Equations & Quadrilaterals' },
  ],
  'Class 9': [
    { id: 'Physics', label: 'Physics (Science)', iconName: 'Atom', desc: 'Motion, Force, Gravitation & Work-Energy' },
    { id: 'Chemistry', label: 'Chemistry (Science)', iconName: 'FlaskConical', desc: 'Matter, Atoms & Molecules' },
    { id: 'Biology', label: 'Biology (Science)', iconName: 'Dna', desc: 'The Fundamental Unit of Life & Tissues' },
    { id: 'Mathematics', label: 'Mathematics', iconName: 'Sigma', desc: 'Polynomials & Coordinate Geometry' },
  ],
  'Class 10': [
    { id: 'Physics', label: 'Physics (Science)', iconName: 'Atom', desc: 'Electricity, Magnetic Effects & Optics' },
    { id: 'Chemistry', label: 'Chemistry (Science)', iconName: 'FlaskConical', desc: 'Reactions, Acids, Bases & Carbon' },
    { id: 'Biology', label: 'Biology (Science)', iconName: 'Dna', desc: 'Life Processes, Control & Reproduction' },
    { id: 'Mathematics', label: 'Mathematics', iconName: 'Sigma', desc: 'Quadratic Equations & Trigonometry' },
  ],
  'Class 11': [
    { id: 'Physics', label: 'Physics', iconName: 'Atom', desc: 'Kinematics, Laws of Motion & Thermodynamics' },
    { id: 'Chemistry', label: 'Chemistry', iconName: 'FlaskConical', desc: 'Atomic Structure & Chemical Bonding' },
    { id: 'Biology', label: 'Biology', iconName: 'Dna', desc: 'Cell Cycle, Plant & Human Physiology' },
    { id: 'Mathematics', label: 'Mathematics', iconName: 'Sigma', desc: 'Calculus, Vectors & Coordinate Geometry' },
  ],
  'Class 12': [
    { id: 'Physics', label: 'Physics', iconName: 'Atom', desc: 'Electrostatics, Current Electricity & AC Circuits' },
    { id: 'Chemistry', label: 'Chemistry', iconName: 'FlaskConical', desc: 'Solutions, Electrochemistry & Coordination' },
    { id: 'Biology', label: 'Biology', iconName: 'Dna', desc: 'Genetics, Evolution & Biotechnology' },
    { id: 'Mathematics', label: 'Mathematics', iconName: 'Sigma', desc: 'Integrals, Differential Equations & Vectors' },
  ],
  'Undergraduate': [
    { id: 'Applied Physics', label: 'Applied Physics & Mechanics', iconName: 'Atom', desc: 'Harmonic Oscillations, Waves & Dynamics' },
    { id: 'Engineering Mathematics', label: 'Engineering Mathematics', iconName: 'Sigma', desc: 'Multivariable Calculus & Linear Algebra' },
    { id: 'Computer Science', label: 'Computer Science & AI', iconName: 'Code2', desc: 'Algorithms, Data Structures & Logic' },
    { id: 'Electrical Engineering', label: 'Electrical & Electronics', iconName: 'Compass', desc: 'Circuits, Signals & Electromagnetism' },
  ],
}

const LEVEL_OPTIONS = [
  {
    id: 'beginner',
    title: 'Foundational Rebuilding',
    badge: 'Step-by-Step',
    desc: 'I often struggle with basic formulas and need concepts explained gently from first principles with zero assumed jargon.',
  },
  {
    id: 'intermediate',
    title: 'Conceptually Solid, Application Focused',
    badge: 'Balanced',
    desc: 'I understand the theory, but I need deliberate practice solving multi-step numericals and examination scenarios.',
  },
  {
    id: 'advanced',
    title: 'Accelerated Mastery & Competition',
    badge: 'Rigorous',
    desc: 'I grasp concepts quickly; I want high-velocity instruction, shortcut derivations, and challenging olympiad sets.',
  },
]

interface InterestOption {
  id: string
  label: string
  iconName: 'Rocket' | 'Gauge' | 'Gamepad2' | 'Code2' | 'Trophy' | 'Music2' | 'Palette' | 'TreePine'
}

const INTEREST_OPTIONS: InterestOption[] = [
  { id: 'space', label: 'Space & Astronomy', iconName: 'Rocket' },
  { id: 'cars', label: 'Formula 1 & Engineering', iconName: 'Gauge' },
  { id: 'gaming', label: 'Gaming & Simulation', iconName: 'Gamepad2' },
  { id: 'coding', label: 'Algorithms & Robotics', iconName: 'Code2' },
  { id: 'sports', label: 'Athletics & Biomechanics', iconName: 'Trophy' },
  { id: 'music', label: 'Acoustics & Rhythm', iconName: 'Music2' },
  { id: 'art', label: 'Geometry & Visual Arts', iconName: 'Palette' },
  { id: 'biology', label: 'Ecosystems & Wildlife', iconName: 'TreePine' },
]

const STYLE_OPTIONS = [
  {
    id: 'socratic',
    title: 'Socratic Method (Recommended)',
    desc: 'The AI guides you with progressive questions so you arrive at the principle independently.',
  },
  {
    id: 'direct',
    title: 'Direct & Concise',
    desc: 'Straightforward formulas, structured problem breakdowns, and concise step-by-step proofs.',
  },
  {
    id: 'visual',
    title: 'Visual & Physical Models',
    desc: 'Intuitive analogies (fluid currents, potential wells, levers) to forge durable mental models.',
  },
  {
    id: 'storytelling',
    title: 'Historical Discovery & Context',
    desc: 'Explores why scientists developed each law, historical paradigms, and technological applications.',
  },
]

const VOICE_OPTIONS = [
  {
    id: 'Aoede',
    name: 'Aoede',
    tag: 'Recommended',
    desc: 'Warm, reassuring, and patient tone',
    previewText: 'Hello. I am Aoede. I will guide you through your science syllabus with patient, methodical explanations.',
  },
  {
    id: 'Puck',
    name: 'Puck',
    tag: 'High Energy',
    desc: 'Curious, upbeat, and engaging tempo',
    previewText: 'Hey there! I am Puck. We are going to explore science actively, breaking down tough questions together.',
  },
  {
    id: 'Charon',
    name: 'Charon',
    tag: 'Calm Guidance',
    desc: 'Deep, deliberate, and thoughtful pace',
    previewText: 'Greetings. I am Charon. Together, we will examine the foundational laws of nature with clarity and focus.',
  },
  {
    id: 'Kore',
    name: 'Kore',
    tag: 'Analytical',
    desc: 'Gentle, structured, and articulated delivery',
    previewText: 'Hello scholar. I am Kore. We will approach each concept through structured reasoning and clear derivations.',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    tag: 'Academic Coach',
    desc: 'Confident, assertive, and direct delivery',
    previewText: 'Welcome. I am Fenrir, your academic coach. We focus on accuracy, problem mastery, and examination readiness.',
  },
]

// =========================================================================
// SYLLABUS DIAGNOSTIC CAPSULES (DB-Synchronized, Zero Emojis)
// =========================================================================
interface DiagnosticCapsule {
  chapter: string
  capsule: string
  textbookExcerpt: string
  question: string
  spokenQuestion: string
  options: { id: string; text: string; isCorrect: boolean }[]
}

const SYLLABUS_DIAGNOSTICS: Record<string, Record<string, DiagnosticCapsule>> = {
  'Class 8': {
    Physics: {
      chapter: 'Force and Pressure',
      capsule: 'Pressure in Fluids & Area Dependence',
      textbookExcerpt: 'Pressure is defined as Force acting perpendicularly per unit area (P = F/A). For a constant force, decreasing area increases pressure proportionally.',
      question: 'Why do school backpacks have broad shoulder straps instead of thin strings?',
      spokenQuestion: 'Why do school backpacks have broad straps instead of thin strings?',
      options: [
        { id: 'A', text: 'Larger area decreases pressure on shoulders (P = F/A)', isCorrect: true },
        { id: 'B', text: 'Larger area increases the downward gravitational pull', isCorrect: false },
        { id: 'C', text: 'To increase frictional resistance against your back', isCorrect: false },
      ],
    },
    Chemistry: {
      chapter: 'Combustion and Flame',
      capsule: 'Ignition Temperature & Fire Triangle',
      textbookExcerpt: 'Combustion requires three essential conditions: combustible substance, supporter of combustion (oxygen), and reaching the ignition temperature.',
      question: 'What happens if a burning candle is covered completely with an inverted glass tumbler?',
      spokenQuestion: 'What happens if a burning candle is covered completely with an inverted glass tumbler?',
      options: [
        { id: 'A', text: 'It extinguishes once oxygen inside is exhausted', isCorrect: true },
        { id: 'B', text: 'It burns indefinitely because heat is trapped inside', isCorrect: false },
        { id: 'C', text: 'The flame turns blue due to trapped nitrogen', isCorrect: false },
      ],
    },
  },
  'Class 9': {
    Physics: {
      chapter: 'Motion & Kinematics',
      capsule: 'Distance vs. Displacement in Closed Paths',
      textbookExcerpt: 'Distance is the actual path length (scalar). Displacement is the shortest straight line between initial and final points (vector). In a closed loop, displacement is identically zero.',
      question: 'If an athlete completes one round of a 400m circular track in 40s, what is their displacement?',
      spokenQuestion: 'If an athlete completes one full round of a circular track and returns to the start, what is their displacement?',
      options: [
        { id: 'A', text: 'Exactly 0 meters (initial and final positions coincide)', isCorrect: true },
        { id: 'B', text: '400 meters (the circular circumference)', isCorrect: false },
        { id: 'C', text: '10 meters per second (average velocity)', isCorrect: false },
      ],
    },
  },
  'Class 10': {
    Physics: {
      chapter: 'Electricity & Circuits',
      capsule: 'Factors Affecting Resistance & Wire Cutting',
      textbookExcerpt: 'Resistance R = rho * (L / A). Resistance is directly proportional to length (L) and inversely proportional to cross-sectional area (A). Cutting a wire in half halves its length while keeping area and resistivity constant.',
      question: 'If you take a uniform resistance wire of resistance R and cut it exactly in half, what is the resistance of each piece?',
      spokenQuestion: 'If you cut a uniform resistance wire of resistance R exactly in half, what is the resistance of each piece?',
      options: [
        { id: 'A', text: 'R / 2 (Halved, because resistance is proportional to length)', isCorrect: true },
        { id: 'B', text: '2R (Doubled, because wire ends are sharper)', isCorrect: false },
        { id: 'C', text: 'R (Unchanged, resistance is independent of length)', isCorrect: false },
      ],
    },
    Chemistry: {
      chapter: 'Chemical Reactions and Equations',
      capsule: 'Balancing Chemical Equations & Mass Conservation',
      textbookExcerpt: 'In a chemical reaction, mass can neither be created nor destroyed (Law of Conservation of Mass). Total mass of reactants must equal total mass of products.',
      question: 'Why must every chemical equation be balanced on both sides?',
      spokenQuestion: 'Why must every chemical equation be balanced on both sides?',
      options: [
        { id: 'A', text: 'To satisfy the Law of Conservation of Mass', isCorrect: true },
        { id: 'B', text: 'To maintain equal volume of gases', isCorrect: false },
        { id: 'C', text: 'To increase the reaction rate', isCorrect: false },
      ],
    },
  },
  'Class 11': {
    Physics: {
      chapter: 'Laws of Motion & Dynamics',
      capsule: 'Impulse and Momentum Conservation',
      textbookExcerpt: 'Impulse J = F_avg * Delta_t = Delta_p. Extending the duration of impact (Delta_t) reduces the peak impact force (F_avg) for a given momentum change.',
      question: 'Why does a cricket fielder pull their hands backward while catching a fast ball?',
      spokenQuestion: 'Why does a cricket fielder pull their hands backward while catching a fast-moving ball?',
      options: [
        { id: 'A', text: 'Increases contact time Delta_t to reduce the impact force F', isCorrect: true },
        { id: 'B', text: 'To impart reverse spin on the ball and stop it from dropping', isCorrect: false },
        { id: 'C', text: 'To decrease the total momentum of the ball to zero faster', isCorrect: false },
      ],
    },
  },
  'Class 12': {
    Physics: {
      chapter: 'Electrostatics & Potential',
      capsule: "Gauss's Law & Electrostatic Shielding",
      textbookExcerpt: 'Inside a hollow charged conductor, the electric field E is identically zero. This phenomenon is known as electrostatic shielding.',
      question: 'Why is it safer to remain inside a closed metal car during a thunderstorm lightning strike?',
      spokenQuestion: 'Why is it safer to remain inside a closed metal car during a thunderstorm lightning strike?',
      options: [
        { id: 'A', text: 'The metal body acts as a Faraday cage with zero internal electric field', isCorrect: true },
        { id: 'B', text: 'The rubber tires completely insulate the car from all electrical potential', isCorrect: false },
        { id: 'C', text: 'Lightning cannot touch conductive metal surfaces', isCorrect: false },
      ],
    },
  },
  'Undergraduate': {
    'Applied Physics': {
      chapter: 'Harmonic Oscillations & Resonance',
      capsule: 'Damped Oscillations & Quality Factor',
      textbookExcerpt: 'In forced harmonic motion, resonance occurs when the driving frequency approaches the natural undamped frequency of the system.',
      question: 'At mechanical resonance, how does the phase of displacement compare to the driving force?',
      spokenQuestion: 'At mechanical resonance in a forced oscillator, what is the phase difference between driving force and displacement?',
      options: [
        { id: 'A', text: 'Displacement lags the driving force by 90 degrees (pi / 2 radians)', isCorrect: true },
        { id: 'B', text: 'Displacement and force are perfectly in phase (0 degrees)', isCorrect: false },
        { id: 'C', text: 'Displacement leads the force by 180 degrees (pi radians)', isCorrect: false },
      ],
    },
  },
}

// Icon helper component
function RenderSubjectIcon({ name, className = 'w-5 h-5' }: { name: string; className?: string }) {
  switch (name) {
    case 'Atom':
      return <Atom className={className} strokeWidth={1.5} />
    case 'FlaskConical':
      return <FlaskConical className={className} strokeWidth={1.5} />
    case 'Dna':
      return <Dna className={className} strokeWidth={1.5} />
    case 'Sigma':
      return <Sigma className={className} strokeWidth={1.5} />
    case 'Code2':
      return <Code2 className={className} strokeWidth={1.5} />
    case 'Compass':
    default:
      return <Compass className={className} strokeWidth={1.5} />
  }
}

function RenderInterestIcon({ name, className = 'w-4 h-4' }: { name: string; className?: string }) {
  switch (name) {
    case 'Rocket':
      return <Rocket className={className} strokeWidth={1.5} />
    case 'Gauge':
      return <Gauge className={className} strokeWidth={1.5} />
    case 'Gamepad2':
      return <Gamepad2 className={className} strokeWidth={1.5} />
    case 'Code2':
      return <Code2 className={className} strokeWidth={1.5} />
    case 'Trophy':
      return <Trophy className={className} strokeWidth={1.5} />
    case 'Music2':
      return <Music2 className={className} strokeWidth={1.5} />
    case 'Palette':
      return <Palette className={className} strokeWidth={1.5} />
    case 'TreePine':
    default:
      return <TreePine className={className} strokeWidth={1.5} />
  }
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Student Identity
  const [studentName, setStudentName] = useState<string>('Scholar')

  // Form State
  const [classLevel, setClassLevel] = useState('Class 10')
  const [targetBoard, setTargetBoard] = useState('CBSE')
  const [favoriteSubject, setFavoriteSubject] = useState('Physics')
  const [learningLevel, setLearningLevel] = useState('intermediate')
  const [selectedInterests, setSelectedInterests] = useState<string[]>(['space', 'coding'])
  const [learningStyle, setLearningStyle] = useState('socratic')
  const [preferredVoice, setPreferredVoice] = useState('Aoede')

  // Step 4: Voice Preview State
  const [playingPreviewVoice, setPlayingPreviewVoice] = useState<string | null>(null)

  // Step 5: Voice Calibration State
  const [isSpeakingTutor, setIsSpeakingTutor] = useState(false)
  const [isListeningMic, setIsListeningMic] = useState(false)
  const [diagnosticSelected, setDiagnosticSelected] = useState<string | null>(null)
  const [diagnosticFeedback, setDiagnosticFeedback] = useState<string | null>(null)

  // Fetch student name on mount
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        const name =
          data.user.user_metadata?.full_name ||
          data.user.email?.split('@')[0] ||
          'Scholar'
        setStudentName(name.charAt(0).toUpperCase() + name.slice(1))
      }
    })
  }, [])

  // Companion Guidance (Zero Emojis)
  useEffect(() => {
    if (step === 1) {
      triggerCompanionGuidance({
        targetSelector: '#onboarding-card',
        animation: 'listening',
        expression: 'curious-left',
        mood: 'normal',
        message: `Welcome ${studentName}. Select your academic grade and target board to calibrate your curriculum.`,
        autoDismissMs: 7000,
      })
    } else if (step === 2) {
      triggerCompanionGuidance({
        targetSelector: '#onboarding-card',
        animation: 'excited',
        expression: 'joyful-wide',
        mood: 'normal',
        message: "Choose your primary subject. We will initialize your first topic capsule around this subject.",
        autoDismissMs: 7000,
      })
    } else if (step === 3) {
      triggerCompanionGuidance({
        targetSelector: '#onboarding-card',
        animation: 'working',
        expression: 'attentive-left',
        mood: 'normal',
        message: "Select your comfort level and real-world interests so your tutor crafts intuitive analogies.",
        autoDismissMs: 7000,
      })
    } else if (step === 4) {
      triggerCompanionGuidance({
        targetSelector: '#onboarding-card',
        animation: 'excited',
        expression: 'playful-right',
        mood: 'normal',
        message: "Test each voice preview and select the delivery style that best suits your study pace.",
        autoDismissMs: 7000,
      })
    } else if (step === 5) {
      triggerCompanionGuidance({
        targetSelector: '#onboarding-card',
        animation: 'listening',
        expression: 'attentive-left',
        mood: 'normal',
        message: "Listen to the calibration greeting, then tap your answer or respond aloud using your microphone.",
        autoDismissMs: 9000,
      })
    }
  }, [step, studentName])

  // Available subjects for the selected class
  const availableSubjects = useMemo(() => {
    return CLASS_SUBJECTS_MAP[classLevel] || CLASS_SUBJECTS_MAP['Class 10']
  }, [classLevel])

  // Ensure favoriteSubject is valid when class changes
  useEffect(() => {
    const exists = availableSubjects.some((s) => s.id === favoriteSubject)
    if (!exists) {
      setFavoriteSubject(availableSubjects[0]?.id || 'Physics')
    }
  }, [classLevel, availableSubjects, favoriteSubject])

  // Resolve active diagnostic capsule
  const activeDiagnostic = useMemo((): DiagnosticCapsule => {
    const classSet = SYLLABUS_DIAGNOSTICS[classLevel] || SYLLABUS_DIAGNOSTICS['Class 10']
    const diagnostic = classSet[favoriteSubject] || Object.values(classSet)[0] || SYLLABUS_DIAGNOSTICS['Class 10']['Physics']
    return diagnostic
  }, [classLevel, favoriteSubject])

  // Toggle interest
  const toggleInterest = (id: string) => {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : prev.length < 4 ? [...prev, id] : prev
    )
  }

  // Preview Voice Persona with SpeechSynthesis
  const previewVoiceAudio = (voiceId: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    if (playingPreviewVoice === voiceId) {
      window.speechSynthesis.cancel()
      setPlayingPreviewVoice(null)
      return
    }

    window.speechSynthesis.cancel()
    const voiceObj = VOICE_OPTIONS.find((v) => v.id === voiceId)
    if (!voiceObj) return

    const utterance = new SpeechSynthesisUtterance(voiceObj.previewText)
    utterance.rate = voiceId === 'Puck' ? 1.05 : voiceId === 'Charon' ? 0.92 : 0.98
    utterance.pitch = voiceId === 'Aoede' ? 1.05 : voiceId === 'Fenrir' ? 0.9 : 1.0

    utterance.onstart = () => setPlayingPreviewVoice(voiceId)
    utterance.onend = () => setPlayingPreviewVoice(null)
    utterance.onerror = () => setPlayingPreviewVoice(null)

    window.speechSynthesis.speak(utterance)
  }

  // Audio greeting script for Step 5
  const spokenGreeting = useMemo(() => {
    return `Hello ${studentName}. I am ${preferredVoice}, your personal tutor. Before we begin our lessons in ${favoriteSubject}, let us do a quick calibration from ${activeDiagnostic.chapter} on ${activeDiagnostic.capsule}: ${activeDiagnostic.spokenQuestion}`
  }, [studentName, preferredVoice, favoriteSubject, activeDiagnostic])

  // Play spoken greeting via browser speech synthesis
  const playTutorGreeting = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(spokenGreeting)
    utterance.rate = preferredVoice === 'Puck' ? 1.05 : preferredVoice === 'Charon' ? 0.92 : 0.98
    utterance.pitch = preferredVoice === 'Aoede' ? 1.05 : preferredVoice === 'Fenrir' ? 0.9 : 1.0

    utterance.onstart = () => setIsSpeakingTutor(true)
    utterance.onend = () => setIsSpeakingTutor(false)
    utterance.onerror = () => setIsSpeakingTutor(false)

    window.speechSynthesis.speak(utterance)
  }

  // Auto-play greeting when entering Step 5
  useEffect(() => {
    if (step === 5) {
      const timer = setTimeout(() => {
        playTutorGreeting()
      }, 500)
      return () => {
        clearTimeout(timer)
        if (typeof window !== 'undefined' && window.speechSynthesis) {
          window.speechSynthesis.cancel()
        }
      }
    } else {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel()
        setPlayingPreviewVoice(null)
      }
    }
  }, [step])

  // Speech Recognition for Step 5
  const toggleSpeechRecognition = () => {
    if (typeof window === 'undefined') return
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please tap an option on the screen.')
      return
    }

    if (isListeningMic) {
      setIsListeningMic(false)
      return
    }

    try {
      const recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.lang = 'en-US'
      recognition.interimResults = false

      recognition.onstart = () => setIsListeningMic(true)
      recognition.onend = () => setIsListeningMic(false)
      recognition.onerror = () => setIsListeningMic(false)

      recognition.onresult = (event: any) => {
        const spoken = event.results[0][0].transcript.toLowerCase()
        setIsListeningMic(false)

        if (
          spoken.includes('a') ||
          spoken.includes('decreases') ||
          spoken.includes('halved') ||
          spoken.includes('zero') ||
          spoken.includes('cage') ||
          spoken.includes('90') ||
          spoken.includes('mass')
        ) {
          handleSelectAnswer('A')
        } else if (
          spoken.includes('b') ||
          spoken.includes('doubled') ||
          spoken.includes('rubber') ||
          spoken.includes('phase')
        ) {
          handleSelectAnswer('B')
        } else {
          handleSelectAnswer('C')
        }
      }

      recognition.start()
    } catch (e) {
      setIsListeningMic(false)
    }
  }

  const handleSelectAnswer = (optionId: string) => {
    setDiagnosticSelected(optionId)
    const option = activeDiagnostic.options.find((o) => o.id === optionId)
    if (option?.isCorrect) {
      setDiagnosticFeedback('Correct. Intuition verified. Calibrating AI tutor to accelerated application pacing.')
      if (learningLevel === 'beginner') setLearningLevel('intermediate')
    } else {
      setDiagnosticFeedback('Concept recorded. We will ensure rigorous first-principles intuition on this topic together.')
      if (learningLevel === 'advanced') setLearningLevel('intermediate')
    }
  }

  // Submit complete onboarding
  const handleComplete = async () => {
    setIsSubmitting(true)
    setErrorMessage(null)

    const payload: OnboardingState = {
      classLevel,
      targetBoard,
      favoriteSubject,
      learningLevel,
      learningStyle,
      preferredVoice,
      interests: selectedInterests,
      preferredPacing: 'standard',
    }

    const res = await completeOnboardingAction(payload)
    if (res?.error) {
      setErrorMessage(res.error)
      setIsSubmitting(false)
    }
  }

  // Step definitions for clean segmented progress
  const stepTitles = [
    'Academic Grade',
    'Subject Focus',
    'Knowledge Baseline',
    'Pedagogy & Voice',
    'Voice Diagnostic',
  ]

  return (
    <div className="min-h-[100dvh] bg-[#F7F5EE] flex flex-col justify-between p-4 md:p-8 antialiased selection:bg-[#52715D]/20 relative overflow-x-hidden">
      {/* Subtle Botanical Linen Background Vector */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.035] text-[#171817]">
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full">
          <path d="M-100,200 C150,250 200,500 -50,600" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M-50,300 C100,320 120,400 -20,480" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M800,-50 C750,200 900,400 1100,500" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M900,100 C880,180 950,250 1050,300" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>

      {/* Top Header / Apple-Style Segmented Breadcrumb */}
      <header className="max-w-4xl w-full mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-2 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white border border-[#E4E0D5] flex items-center justify-center text-[#52715D] shadow-xs">
            <span className="material-symbols-outlined text-2xl">eco</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-lg font-normal text-[#171817] leading-none">Scholar Portal</h1>
              <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-md bg-[#52715D]/10 text-[#52715D] border border-[#52715D]/20">
                Onboarding
              </span>
            </div>
            <p className="text-xs text-[#7A7C75] mt-1 font-mono">
              Calibrating profile for <strong className="text-[#171817] font-semibold">{studentName}</strong>
            </p>
          </div>
        </div>

        {/* 5-Step Segmented Bar */}
        <div className="w-full sm:w-64 space-y-1.5">
          <div className="flex justify-between items-center text-[11px] font-mono text-[#7A7C75]">
            <span className="uppercase tracking-wider">Step {step} of 5</span>
            <span className="text-[#171817] font-medium">{stepTitles[step - 1]}</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s <= step ? 'bg-[#52715D]' : 'bg-[#E4E0D5]'
                }`}
              />
            ))}
          </div>
        </div>
      </header>

      {/* Main Doppelrand Hardware Enclosure */}
      <div className="max-w-4xl w-full mx-auto my-6 rounded-[2.5rem] bg-[#EFECE1] border border-[#E0DBCF] p-2 md:p-3.5 shadow-[0_20px_50px_-20px_rgba(23,24,23,0.08)] relative z-10">
        <Card
          id="onboarding-card"
          className="rounded-[calc(2.5rem-0.875rem)] border border-[#E5E1D7] bg-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] p-6 md:p-10"
        >
          {errorMessage && (
            <div className="mb-6 p-4 rounded-2xl bg-red-50/90 border border-red-200 text-red-800 text-xs md:text-sm flex items-center gap-3">
              <span className="material-symbols-outlined text-lg shrink-0">error</span>
              <span className="font-medium">{errorMessage}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: Academic Standard & Target Board                                  */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="space-y-7 animate-in fade-in duration-300">
              <div>
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-semibold border-[#52715D]/25 bg-[#52715D]/8 text-[#52715D] mb-3"
                >
                  <GraduationCap className="w-3.5 h-3.5 mr-1.5 inline" strokeWidth={1.5} />
                  Academic Standard
                </Badge>
                <h2 className="font-serif text-2xl md:text-3xl font-normal text-[#171817] tracking-tight">
                  Welcome, {studentName}. Which academic grade are you enrolled in?
                </h2>
                <p className="text-sm text-[#7A7C75] mt-1.5 leading-relaxed">
                  We bind your topic capsules and exam benchmarks directly to your selected school syllabus.
                </p>
              </div>

              {/* Class Selection Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {CLASS_OPTIONS.map((opt) => {
                  const isSelected = classLevel === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setClassLevel(opt.id)}
                      className={`p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
                        isSelected
                          ? 'border-[#52715D] bg-[#F2F7F4] ring-2 ring-[#52715D]/25 shadow-xs'
                          : 'border-[#E4E0D5] bg-white hover:border-[#52715D]/40 hover:bg-[#FAF9F5]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-serif font-semibold text-base text-[#171817]">{opt.label}</span>
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                            isSelected ? 'border-[#52715D] bg-[#52715D] text-white' : 'border-[#D5D0C2] bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-xs text-[#7A7C75] leading-relaxed">{opt.desc}</p>
                    </button>
                  )
                })}
              </div>

              {/* Target Board Selection Chips */}
              <div className="pt-5 border-t border-[#EAE6DC] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#7A7C75]">
                    Target Board / Examination Pattern
                  </label>
                  <span className="text-xs text-[#52715D] font-mono">Calibrates syllabus coverage</span>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {BOARD_OPTIONS.map((board) => {
                    const isSelected = targetBoard === board
                    return (
                      <button
                        key={board}
                        type="button"
                        onClick={() => setTargetBoard(board)}
                        className={`px-4 py-2 rounded-xl text-xs font-medium border transition-all duration-150 cursor-pointer active:scale-[0.97] ${
                          isSelected
                            ? 'bg-[#52715D] text-white border-[#52715D] shadow-xs'
                            : 'bg-white text-[#171817] border-[#E4E0D5] hover:border-[#52715D]/40 hover:bg-[#FAF9F5]'
                        }`}
                      >
                        {board}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: Subject Focus & Capsule Preview                                   */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-7 animate-in fade-in duration-300">
              <div>
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-semibold border-[#52715D]/25 bg-[#52715D]/8 text-[#52715D] mb-3"
                >
                  <BookOpen className="w-3.5 h-3.5 mr-1.5 inline" strokeWidth={1.5} />
                  Subject Focus
                </Badge>
                <h2 className="font-serif text-2xl md:text-3xl font-normal text-[#171817] tracking-tight">
                  Which subject will you begin with in {classLevel}?
                </h2>
                <p className="text-sm text-[#7A7C75] mt-1.5 leading-relaxed">
                  We will place this curriculum at the forefront of your portal and open your first spoken class capsule here.
                </p>
              </div>

              {/* Subject Selection Grid with SVG Linear Icons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {availableSubjects.map((sub) => {
                  const isSelected = favoriteSubject === sub.id
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setFavoriteSubject(sub.id)}
                      className={`p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex items-center gap-4 active:scale-[0.98] ${
                        isSelected
                          ? 'border-[#52715D] bg-[#F2F7F4] ring-2 ring-[#52715D]/25 shadow-xs'
                          : 'border-[#E4E0D5] bg-white hover:border-[#52715D]/40 hover:bg-[#FAF9F5]'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected
                            ? 'border-[#52715D]/40 bg-white text-[#52715D]'
                            : 'border-[#E4E0D5] bg-[#FAF9F5] text-[#7A7C75]'
                        }`}
                      >
                        <RenderSubjectIcon name={sub.iconName} className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-serif font-semibold text-sm text-[#171817] truncate">{sub.label}</p>
                        <p className="text-xs text-[#7A7C75] truncate mt-0.5">{sub.desc}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-[#52715D] shrink-0 stroke-[2.5]" />}
                    </button>
                  )
                })}
              </div>

              {/* Initial Chapter & Capsule Preview */}
              <div className="pt-5 border-t border-[#EAE6DC] space-y-2.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#7A7C75]">
                  Initial Chapter &amp; Capsule Blueprint
                </span>
                <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E4E0D5] flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-semibold text-sm text-[#171817]">
                        {activeDiagnostic.chapter}
                      </span>
                      <Badge variant="secondary" className="text-[10px] bg-white border border-[#E4E0D5] text-[#52715D]">
                        Module 1
                      </Badge>
                    </div>
                    <p className="text-xs text-[#7A7C75]">
                      Topic: <strong className="text-[#171817] font-semibold">{activeDiagnostic.capsule}</strong>
                    </p>
                  </div>
                  <div className="w-9 h-9 rounded-xl bg-white border border-[#E4E0D5] flex items-center justify-center text-[#52715D] shrink-0 shadow-xs">
                    <School className="w-4 h-4" strokeWidth={1.5} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 3: Baseline Depth & Analogy Interests                                */}
          {/* ========================================================================= */}
          {step === 3 && (
            <div className="space-y-7 animate-in fade-in duration-300">
              <div>
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-semibold border-[#52715D]/25 bg-[#52715D]/8 text-[#52715D] mb-3"
                >
                  <Brain className="w-3.5 h-3.5 mr-1.5 inline" strokeWidth={1.5} />
                  Knowledge Baseline
                </Badge>
                <h2 className="font-serif text-2xl md:text-3xl font-normal text-[#171817] tracking-tight">
                  How confident do you feel in {favoriteSubject}?
                </h2>
                <p className="text-sm text-[#7A7C75] mt-1.5 leading-relaxed">
                  Your AI tutor calibrates questioning depth and explanation pace to your current confidence.
                </p>
              </div>

              {/* Baseline Level Cards */}
              <div className="space-y-3 pt-1">
                {LEVEL_OPTIONS.map((lvl) => {
                  const isSelected = learningLevel === lvl.id
                  return (
                    <button
                      key={lvl.id}
                      type="button"
                      onClick={() => setLearningLevel(lvl.id)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex items-start gap-4 active:scale-[0.99] ${
                        isSelected
                          ? 'border-[#52715D] bg-[#F2F7F4] ring-2 ring-[#52715D]/25 shadow-xs'
                          : 'border-[#E4E0D5] bg-white hover:border-[#52715D]/40 hover:bg-[#FAF9F5]'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border mt-0.5 shrink-0 flex items-center justify-center transition-colors ${
                          isSelected ? 'border-[#52715D] bg-[#52715D] text-white' : 'border-[#D5D0C2] bg-white'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-semibold text-base text-[#171817]">{lvl.title}</span>
                          <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white border border-[#E4E0D5] text-[#7A7C75]">
                            {lvl.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[#7A7C75] leading-relaxed">{lvl.desc}</p>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Real-World Analogy Interests (SVG linear icons, zero emojis) */}
              <div className="pt-5 border-t border-[#EAE6DC] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#7A7C75]">
                    Select 2 to 4 Domains for Custom Analogies
                  </label>
                  <span className="text-xs text-[#7A7C75] font-mono">{selectedInterests.length}/4 selected</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {INTEREST_OPTIONS.map((item) => {
                    const isSelected = selectedInterests.includes(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => toggleInterest(item.id)}
                        className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2.5 transition-all duration-150 cursor-pointer active:scale-[0.97] ${
                          isSelected
                            ? 'border-[#52715D] bg-[#F2F7F4] text-[#52715D] font-semibold shadow-xs ring-1 ring-[#52715D]/30'
                            : 'border-[#E4E0D5] bg-white text-[#171817] hover:border-[#52715D]/40 hover:bg-[#FAF9F5]'
                        }`}
                      >
                        <RenderInterestIcon name={item.iconName} className="w-4 h-4 shrink-0 text-current" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 4: Pedagogy & Voice Persona with Live Audio Preview                   */}
          {/* ========================================================================= */}
          {step === 4 && (
            <div className="space-y-7 animate-in fade-in duration-300">
              <div>
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-semibold border-[#52715D]/25 bg-[#52715D]/8 text-[#52715D] mb-3"
                >
                  <Compass className="w-3.5 h-3.5 mr-1.5 inline" strokeWidth={1.5} />
                  Pedagogy &amp; Acoustic Tone
                </Badge>
                <h2 className="font-serif text-2xl md:text-3xl font-normal text-[#171817] tracking-tight">
                  How should your AI tutor teach and sound?
                </h2>
                <p className="text-sm text-[#7A7C75] mt-1.5 leading-relaxed">
                  Select your preferred explanation philosophy and test tutor voices aloud before proceeding.
                </p>
              </div>

              {/* Instructional Style Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                {STYLE_OPTIONS.map((style) => {
                  const isSelected = learningStyle === style.id
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setLearningStyle(style.id)}
                      className={`p-4 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between active:scale-[0.98] ${
                        isSelected
                          ? 'border-[#52715D] bg-[#F2F7F4] ring-2 ring-[#52715D]/25 shadow-xs'
                          : 'border-[#E4E0D5] bg-white hover:border-[#52715D]/40 hover:bg-[#FAF9F5]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-serif font-semibold text-sm text-[#171817]">{style.title}</span>
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-[#52715D] bg-[#52715D] text-white' : 'border-[#D5D0C2] bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                      </div>
                      <p className="text-xs text-[#7A7C75] leading-relaxed">{style.desc}</p>
                    </button>
                  )
                })}
              </div>

              {/* Tutor Voice Personas with Inline Audio Preview */}
              <div className="pt-5 border-t border-[#EAE6DC] space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#7A7C75]">
                    Tutor Voice &amp; Auditory Persona
                  </label>
                  <span className="text-xs text-[#52715D] font-mono">Tap play to audition voice</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {VOICE_OPTIONS.map((voice) => {
                    const isSelected = preferredVoice === voice.id
                    const isPlaying = playingPreviewVoice === voice.id
                    return (
                      <div
                        key={voice.id}
                        onClick={() => setPreferredVoice(voice.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all duration-150 cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#52715D] bg-[#F2F7F4] ring-2 ring-[#52715D]/25 shadow-xs'
                            : 'border-[#E4E0D5] bg-white hover:border-[#52715D]/40 hover:bg-[#FAF9F5]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-serif font-semibold text-sm text-[#171817]">{voice.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-white text-[#52715D] font-semibold border border-[#E4E0D5]">
                              {voice.tag}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#7A7C75] leading-relaxed mb-3">{voice.desc}</p>
                        </div>

                        {/* Inline Audio Audition Button */}
                        <div className="pt-2 border-t border-[#EAE6DC]/60 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              previewVoiceAudio(voice.id)
                            }}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                              isPlaying
                                ? 'bg-[#52715D] text-white shadow-xs'
                                : 'bg-[#FAF9F5] hover:bg-[#F2F7F4] text-[#171817] border border-[#E4E0D5]'
                            }`}
                          >
                            {isPlaying ? (
                              <>
                                <Square className="w-3 h-3 fill-current" />
                                <span>Stop</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3 fill-current" />
                                <span>Audition</span>
                              </>
                            )}
                          </button>

                          {/* Soundwave equalizer indicator */}
                          <div className="flex items-center gap-0.5 h-3">
                            {[10, 16, 8, 14].map((h, idx) => (
                              <div
                                key={idx}
                                className={`w-0.5 rounded-full transition-all duration-150 ${
                                  isPlaying ? 'bg-[#52715D] animate-pulse' : 'bg-[#D5D0C2]'
                                }`}
                                style={{
                                  height: isPlaying ? `${h}px` : '4px',
                                  animationDelay: `${idx * 80}ms`,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STEP 5: Live Voice & Diagnostic Calibration                               */}
          {/* ========================================================================= */}
          {step === 5 && (
            <div className="space-y-7 animate-in fade-in duration-300">
              <div>
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em] font-semibold border-[#52715D]/25 bg-[#52715D]/8 text-[#52715D] mb-3"
                >
                  <Activity className="w-3.5 h-3.5 mr-1.5 inline" strokeWidth={1.5} />
                  Acoustic &amp; Diagnostic Check
                </Badge>
                <h2 className="font-serif text-2xl md:text-3xl font-normal text-[#171817] tracking-tight">
                  Tutor {preferredVoice} is standing by, {studentName}
                </h2>
                <p className="text-sm text-[#7A7C75] mt-1.5 leading-relaxed">
                  Listen to the initial voice greeting and either tap an answer or speak aloud to verify your microphone.
                </p>
              </div>

              {/* Textbook Knowledge Capsule Box */}
              <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E4E0D5] space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[#52715D]" strokeWidth={1.5} />
                    <span className="font-serif font-semibold text-xs text-[#171817]">
                      Chapter: {activeDiagnostic.chapter}
                    </span>
                  </div>
                  <Badge variant="secondary" className="text-[10px] bg-white border border-[#E4E0D5] text-[#52715D]">
                    <Layers className="w-3 h-3 mr-1 inline" strokeWidth={1.5} />
                    Capsule: {activeDiagnostic.capsule}
                  </Badge>
                </div>
                <p className="text-xs text-[#7A7C75] leading-relaxed italic bg-white p-3 rounded-xl border border-[#E4E0D5]/70">
                  <strong className="font-semibold text-[#171817] not-italic">Textbook Principle: </strong>
                  {activeDiagnostic.textbookExcerpt}
                </p>
              </div>

              {/* Live Audio Stage: Visualizer Orb & Soundwave */}
              <div className="p-5 rounded-2xl bg-white border border-[#E4E0D5] flex flex-col sm:flex-row items-center gap-5 shadow-xs">
                {/* Visualizer Pulsing Orb */}
                <div className="relative flex items-center justify-center shrink-0">
                  <div
                    className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${
                      isSpeakingTutor
                        ? 'bg-[#52715D] text-white scale-105 ring-6 ring-[#52715D]/20'
                        : 'bg-[#FAF9F5] text-[#52715D] border border-[#E4E0D5]'
                    }`}
                  >
                    <Volume2 className="w-7 h-7" strokeWidth={1.5} />
                  </div>
                  {isSpeakingTutor && (
                    <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-[#171817] text-white text-[9px] font-mono uppercase tracking-wider">
                      Speaking
                    </span>
                  )}
                </div>

                {/* Animated Soundwave & Audio Actions */}
                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="font-serif font-semibold text-base text-[#171817]">
                      Tutor {preferredVoice}
                    </span>
                    <Badge variant="outline" className="text-[10px] text-[#52715D] border-[#52715D]/40">
                      {favoriteSubject} • {classLevel}
                    </Badge>
                  </div>

                  {/* Soundwave bars */}
                  <div className="flex items-center justify-center sm:justify-start gap-1 py-1 h-6">
                    {[16, 24, 12, 28, 18, 22, 14, 26, 20, 15, 24, 12].map((height, i) => (
                      <div
                        key={i}
                        className={`w-1 rounded-full transition-all duration-150 ${
                          isSpeakingTutor ? 'bg-[#52715D] animate-pulse' : 'bg-[#E4E0D5]'
                        }`}
                        style={{
                          height: isSpeakingTutor ? `${height}px` : '4px',
                          animationDelay: `${i * 60}ms`,
                        }}
                      />
                    ))}
                  </div>

                  <div className="pt-1 flex items-center justify-center sm:justify-start gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={playTutorGreeting}
                      className="rounded-xl text-xs h-8 border-[#E4E0D5] hover:bg-[#FAF9F5] cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 mr-1.5 text-[#52715D]" strokeWidth={1.5} />
                      Replay Voice
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={toggleSpeechRecognition}
                      className={`rounded-xl text-xs h-8 cursor-pointer transition-colors ${
                        isListeningMic
                          ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                          : 'bg-[#52715D] hover:bg-[#435D4D] text-white'
                      }`}
                    >
                      {isListeningMic ? (
                        <Mic className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
                      ) : (
                        <MicOff className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
                      )}
                      <span>{isListeningMic ? 'Listening...' : 'Answer Aloud (Mic)'}</span>
                    </Button>
                  </div>
                </div>
              </div>

              {/* Diagnostic Multiple Choice Question */}
              <div className="space-y-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#7A7C75]">
                  Diagnostic Inquiry: {activeDiagnostic.question}
                </label>

                <div className="space-y-2.5">
                  {activeDiagnostic.options.map((opt) => {
                    const isSelected = diagnosticSelected === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectAnswer(opt.id)}
                        className={`w-full p-4 rounded-xl border text-left text-xs font-medium transition-all duration-150 cursor-pointer flex items-center justify-between active:scale-[0.99] ${
                          isSelected
                            ? opt.isCorrect
                              ? 'border-[#52715D] bg-[#F2F7F4] text-[#171817] ring-2 ring-[#52715D]/30 font-semibold'
                              : 'border-rose-400 bg-rose-50/50 text-[#171817] ring-2 ring-rose-400/30 font-semibold'
                            : 'border-[#E4E0D5] bg-white hover:border-[#52715D]/40 hover:bg-[#FAF9F5]'
                        }`}
                      >
                        <span className="leading-relaxed">
                          <strong className="mr-2 font-mono text-sm">{opt.id}.</strong>
                          {opt.text}
                        </span>
                        {isSelected && (
                          <CheckCircle2
                            className={`w-4 h-4 shrink-0 ${opt.isCorrect ? 'text-[#52715D]' : 'text-rose-600'}`}
                            strokeWidth={2}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>

                {diagnosticFeedback && (
                  <div className="p-3.5 rounded-xl bg-white border border-[#E4E0D5] text-xs text-[#171817] flex items-center gap-2.5 mt-2 shadow-xs">
                    <CheckCircle2 className="w-4 h-4 text-[#52715D] shrink-0" strokeWidth={2} />
                    <span>{diagnosticFeedback}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* Apple-Design Button-in-Button Navigation Footer                            */}
          {/* ========================================================================= */}
          <Separator className="my-7 bg-[#EAE6DC]" />

          <div className="flex items-center justify-between">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                className="rounded-full px-5 h-11 border-[#E4E0D5] text-[#171817] hover:bg-[#FAF9F5] active:scale-[0.98] transition-transform cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={() => setStep((s) => s + 1)}
                className="group rounded-full pl-6 pr-2 h-11 bg-[#52715D] hover:bg-[#435D4D] text-white flex items-center gap-3 shadow-xs cursor-pointer active:scale-[0.98] transition-transform"
              >
                <span className="font-medium text-sm">Continue</span>
                <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="w-3.5 h-3.5 text-white" strokeWidth={2} />
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={isSubmitting}
                className="group rounded-full pl-6 pr-3 h-11 bg-[#52715D] hover:bg-[#435D4D] text-white flex items-center gap-3 shadow-xs cursor-pointer active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="font-medium text-sm">Configuring Curriculum...</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-sm">Complete Setup &amp; Enter Dashboard</span>
                    <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-0.5">
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </Card>
      </div>

      {/* Footer Branding (Zero Emojis) */}
      <footer className="text-center text-xs text-[#7A7C75] py-2 font-mono relative z-10">
        Botanical Intelligence Engine • Scholar Edition • Grade-Calibrated AI Tutoring
      </footer>
    </div>
  )
}
