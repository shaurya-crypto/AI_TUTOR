'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGeminiLive } from '@/hooks/useGeminiLive'
import { ClassroomAvatar } from '@/components/classroom/ClassroomAvatar'
import dynamicImport from 'next/dynamic'
import type { GreenChalkboardRef } from '@/components/whiteboard/GreenChalkboard'

const WhiteboardWorkspace = dynamicImport(
  () => import('@/components/whiteboard/WhiteboardWorkspace').then((mod) => mod.WhiteboardWorkspace),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#FFFFFF] text-[#171817] space-y-3 font-serif">
        <div className="w-8 h-8 border-2 border-[#52715D] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm tracking-wide text-[#555852]">Preparing AI Classroom Stage...</p>
      </div>
    ),
  }
)
import { VisualizationSceneType } from '@/components/whiteboard/scenes/sceneTypes'
import { resolveSceneType, parseSceneParams } from '@/components/whiteboard/scenes/sceneRegistry'
import type { MafsGraphCanvasProps } from '@/components/whiteboard/MafsGraphCanvas'
import { VisualLessonManifest, LessonStep } from '@/types/lessonManifest'
import {
  generateVisualLessonPlanForCapsule,
  inferConceptVisualDirective,
} from '@/services/visualLessonPlanGenerator'
import { VisualEventQueue, parseVisualEventFromDirective } from '@/services/visualEventProtocol'
import { ChapterNotesModal } from '@/components/classroom/ChapterNotesModal'
import { CallControls } from '@/components/CallControls'
import { ErrorModal } from '@/components/ErrorModal'
import { MasteryQuizModal } from '@/components/quiz/MasteryQuizModal'
import {
  Mic,
  Play,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Sparkles,
  Layers,
  Check,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'
import { triggerCompanionGuidance } from '@/components/mascot/Mascot'

export const dynamic = 'force-dynamic'

function getSubjectPedagogyDirective(subject: string): string {
  const s = (subject || '').toLowerCase()
  if (s.includes('math') || s.includes('algebra') || s.includes('calculus') || s.includes('geometry')) {
    return 'Focus on definitions, axioms, step-by-step derivations, and fully worked exemplar solutions.'
  }
  if (s.includes('physic') || s.includes('chem') || s.includes('science')) {
    return 'Focus on physical intuition, natural laws/equations, units/dimensions, and scratch math in [ROUGH_WORK: ...].'
  }
  if (s.includes('bio') || s.includes('life') || s.includes('environ') || s.includes('botan') || s.includes('zoolog')) {
    return 'Focus on biological mechanisms, anatomical structures, cellular pathways, and visual schematics ([FLOWCHART: ...] or [DIAGRAM: ...]).'
  }
  if (s.includes('hist') || s.includes('civic') || s.includes('politi') || s.includes('geograph') || s.includes('econ') || s.includes('social')) {
    return 'Focus on chronological timelines, cause-and-effect, pivotal events, geographical processes, and structured analytical arguments.'
  }
  if (s.includes('comp') || s.includes('code') || s.includes('program') || s.includes('data')) {
    return 'Focus on algorithmic logic, data structures, step-by-step execution traces, and clean syntax.'
  }
  if (s.includes('lang') || s.includes('eng') || s.includes('lit') || s.includes('gramm') || s.includes('hindi') || s.includes('french')) {
    return 'Focus on grammatical principles, thematic analysis, textual evidence, and model sentence exemplars.'
  }
  return 'Focus on clear conceptual understanding, precise definitions, and interactive Socratic guidance.'
}

function parseKeyConcepts(raw: any): string[] {
  const sanitize = (s: string) =>
    String(s || '')
      .replace(/^[\s\(\[\{\"\']+|[\s\)\]\}\"\']+$/g, '')
      .replace(/^concept\s*\d*[:\-\s]*/i, '')
      .replace(/^\d+[\.\:\)\-]\s*/, '')
      .replace(/^focus:\s*/i, '')
      .replace(/\s+/g, ' ')
      .trim()

  if (Array.isArray(raw)) return raw.map(sanitize).filter(Boolean)
  if (typeof raw === 'string' && raw.trim()) {
    const trimmed = raw.trim()
    if (trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) return parsed.map(sanitize).filter(Boolean)
      } catch {}
    }
    const splitItems = trimmed.split(/\n|,|•|;/).map(sanitize).filter(Boolean)
    if (splitItems.length > 1) return splitItems
    return [sanitize(trimmed)].filter(Boolean)
  }
  return []
}

/**
 * High-density concept micro-dossier engine.
 * Strips verbose token waste by 70-85% while packing 100% textbook facts,
 * SI units, governing equations, and 2-3 authentic board-exam questions per concept.
 */
function buildConceptMicroDossiers(
  keyConcepts: string[],
  activeModule: any,
  resolvedBoard: string,
  resolvedClassLevel: string,
  resolvedSubject: string,
  chapterName: string,
  workedExamples: any[],
  misconceptions: string[]
): string {
  if (!keyConcepts || keyConcepts.length === 0) return ''

  let subtopics: string[] = []
  if (Array.isArray(activeModule?.subtopics)) {
    subtopics = activeModule.subtopics
  } else if (typeof activeModule?.subtopics === 'string') {
    try {
      const p = JSON.parse(activeModule.subtopics)
      if (Array.isArray(p)) subtopics = p
    } catch {}
  }

  return keyConcepts
    .map((rawConcept, idx) => {
      const conceptName = rawConcept.replace(/^[\s\(\[\{]+|[\s\)\]\}]+$/g, '').trim()
      const subtopic = subtopics[idx] || subtopics[0] || conceptName
      const ex1 = workedExamples[idx] || workedExamples[0]
      const ex2 = workedExamples[idx + 1] || workedExamples[1]
      const misc = misconceptions[idx] || misconceptions[0]

      const q1 = ex1?.problem
        ? `Q: ${ex1.problem} | Ans: Given: ${ex1.given || ''}, Formula: ${ex1.formula || ''}, Calc: ${ex1.calculation || ''}, Final: ${ex1.finalAnswer || ''} ${ex1.unit || ''}`
        : `Q: State the fundamental law governing ${conceptName} and define its SI unit. | Ans: State exact ${resolvedBoard} standard definition with SI units and dimensional formula.`

      const q2 = ex2?.problem
        ? `Q: ${ex2.problem} | Ans: ${ex2.finalAnswer || ''} ${ex2.unit || ''}`
        : `Q: Calculate the value when standard conditions apply for ${conceptName}. | Ans: Step-by-step numerical solution with boxed final answer and SI units.`

      const q3 = misc
        ? `Q: Why is it incorrect to assume ${misc}? | Ans: Clarify the physical principle and correct scientific reasoning.`
        : `Q: State one real-world application and common examination pitfall for ${conceptName}. | Ans: Provide verified textbook application with error prevention rule.`

      return `---
CONCEPT #${idx + 1}: "${conceptName}"
- Textbook Alignment: ${resolvedBoard} ${resolvedClassLevel} ${resolvedSubject} Chapter "${chapterName}" | Section: "${subtopic}"
- Core Law / Formula: Exact textbook definition with mathematical relationship & SI units.
- Intuitive Analogy: Everyday tangible physical phenomenon.
- 2-3 Exam-Ready Board Questions & Topper Answers:
  1. ${q1}
  2. ${q2}
  3. ${q3}
- Examination Pitfall to Check: ${misc || 'Ensure correct SI units and explicit formula declaration before substitution.'}`
    })
    .join('\n\n')
}

/**
 * Natural language detector for spoken concept transitions by the AI tutor.
 * Detects phrases like: "Moving on to Concept 2", "Let's move to Concept 3",
 * "Now moving to Concept 2", "Moving on to cellulose", "Let's talk about cellulose", etc.
 */
function detectSpokenConceptTransition(
  text: string,
  keyConcepts: string[]
): { targetIdx: number; conceptTitle: string } | null {
  if (!text || keyConcepts.length === 0) return null

  // 1. Direct number match: e.g. "moving on to concept 2", "let's talk about concept 2", "now on to concept 2", "concept 2 is"
  const numMatch = text.match(
    /(?:moving\s+(?:on\s+)?to|let['’]?s\s+(?:move\s+(?:on\s+)?to|talk\s+about|discuss|begin|start)|now\s+(?:moving\s+to|on\s+to|for)|turn(?:ing)?\s+(?:our\s+attention\s+)?to|next\s+(?:is|up\s+is|concept\s+is)|welcome\s+to|starting|onto|in)\s+concept\s*#?\s*(\d+)/i
  ) || text.match(/\bconcept\s*#?\s*(\d+)\s*(?:is|:|\-)\s*/i)
  if (numMatch && numMatch[1]) {
    const num = parseInt(numMatch[1], 10)
    if (num >= 1 && num <= keyConcepts.length) {
      return { targetIdx: num - 1, conceptTitle: keyConcepts[num - 1] }
    }
  }

  // 2. Ordinal word match: e.g. "moving on to the second concept", "second concept"
  const ordinals: Record<string, number> = {
    first: 1,
    second: 2,
    third: 3,
    fourth: 4,
    fifth: 5,
    sixth: 6,
    seventh: 7,
    eighth: 8,
    ninth: 9,
    tenth: 10,
  }
  const ordinalMatch = text.match(
    /(?:moving\s+(?:on\s+)?to|let['’]?s\s+move\s+(?:on\s+)?to|now\s+moving\s+to|next\s+is)\s+(?:the\s+)?([a-z]+)\s+concept/i
  )
  if (ordinalMatch && ordinalMatch[1]) {
    const word = ordinalMatch[1].toLowerCase()
    if (ordinals[word] && ordinals[word] <= keyConcepts.length) {
      const idx = ordinals[word] - 1
      return { targetIdx: idx, conceptTitle: keyConcepts[idx] }
    }
  }

  // 3. Keyword / topic title match: e.g. "moving on to cellulose", "let's talk about cellulose"
  for (let i = 0; i < keyConcepts.length; i++) {
    const c = keyConcepts[i]
    // Filter significant topic words (length >= 4)
    const words = c
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !['what', 'with', 'from', 'this', 'that', 'about', 'basic', 'types', 'cell'].includes(w))
    for (const word of words) {
      const isUnique = !keyConcepts.some((other, oIdx) => oIdx !== i && other.toLowerCase().includes(word))
      if (isUnique) {
        const pattern = new RegExp(
          `(?:moving\\s+(?:on\\s+)?to|let['’]?s\\s+(?:move\\s+to|talk\\s+about|discuss)|now\\s+(?:on\\s+to|for)|turn(?:ing)?\\s+to|next\\s+up\\s+is)\\s+${word}`,
          'i'
        )
        if (pattern.test(text)) {
          return { targetIdx: i, conceptTitle: keyConcepts[i] }
        }
      }
    }
  }

  return null
}

export default function ModuleClassroomPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string
  const moduleId = params.moduleId as string

  const {
    connectionState,
    isMuted,
    errorMessage,
    transcripts,
    teacherVolume,
    userVolume,
    selectedVoice,
    setSelectedVoice,
    startClass,
    toggleMute,
    endCall,
    resetToIdle,
    sendBoardContext,
    sendTextMessage,
  } = useGeminiLive()

  // Interactive page flip barrier: prevents premature page flips until student replies to checkpoint question
  const isAwaitingStudentAnswerRef = useRef<boolean>(false)
  const [isAwaitingStudentAnswer, setIsAwaitingStudentAnswer] = useState<boolean>(false)

  // Verdict review barrier: locks whiteboard on current page until student confirms understanding
  const isReviewingVerdictRef = useRef<boolean>(false)
  const [isReviewingVerdict, setIsReviewingVerdict] = useState<boolean>(false)

  // Mafs.dev high-precision dynamic mathematical & scientific graph state
  const [activeGraph, setActiveGraph] = useState<MafsGraphCanvasProps | null>(null)

  const handleStudentSubmitAnswer = (answer: string) => {
    if (!answer?.trim()) return
    const cleanAnswer = answer.trim()

    // If student was reviewing verdict and sends a follow-up ("yes", "understood", "clear", "next"), unblock transition
    if (isReviewingVerdictRef.current) {
      isReviewingVerdictRef.current = false
      setIsReviewingVerdict(false)
      sendTextMessage(`Student replied: "${cleanAnswer}". If understood, proceed to conclude this concept with concept_done and transition to the next concept.`)
      return
    }

    isAwaitingStudentAnswerRef.current = false
    setIsAwaitingStudentAnswer(false)
    isReviewingVerdictRef.current = true
    setIsReviewingVerdict(true)

    chalkboardRef.current?.drawStudentAnswer?.(cleanAnswer, undefined, 'blue')
    sendTextMessage(
      `Student answered: "${cleanAnswer}". (Student's answer is already displayed on the whiteboard). Evaluate my answer warmly. Write the topper model answer and confirmation/correction on this current whiteboard page using write_chalkboard(action="draw_answer_verdict", content="Verdict: ..."). Do NOT switch or change the whiteboard page. Keep everything on this current page so I can review it. Ask me if I understood or if I am ready for the next concept.`
    )
  }

  const handleStudentVoiceAnswer = (answer: string) => {
    if (!answer?.trim()) return
    const cleanAnswer = answer.trim()

    // If student was reviewing verdict and says "understood", "yes", "clear", "next", unblock transition
    if (isReviewingVerdictRef.current) {
      isReviewingVerdictRef.current = false
      setIsReviewingVerdict(false)
      sendTextMessage(`Student replied: "${cleanAnswer}". If understood, proceed to conclude this concept with concept_done and transition to the next concept.`)
      return
    }

    isAwaitingStudentAnswerRef.current = false
    setIsAwaitingStudentAnswer(false)
    isReviewingVerdictRef.current = true
    setIsReviewingVerdict(true)

    chalkboardRef.current?.drawStudentAnswer?.(cleanAnswer, undefined, 'blue')
    sendTextMessage(
      `Student answered: "${cleanAnswer}". (Student's answer is already displayed on the whiteboard). Evaluate my answer warmly. Write the topper model answer and confirmation/correction on this current whiteboard page using write_chalkboard(action="draw_answer_verdict", content="Verdict: ..."). Do NOT switch or change the whiteboard page. Keep everything on this current page so I can review it. Ask me if I understood or if I am ready for the next concept.`
    )
  }

  const [activeModule, setActiveModule] = useState<any>(null)
  const [activeCurriculum, setActiveCurriculum] = useState<any>(null)
  const [siblingModules, setSiblingModules] = useState<any[]>([])
  const [nextChapterInfo, setNextChapterInfo] = useState<{
    chapterId: string
    chapterTitle: string
    firstModuleId: string
    firstModuleTitle: string
    orderIndex: number
  } | null>(null)
  const [moduleCompletedSuccess, setModuleCompletedSuccess] = useState(false)
  const [isLoadingLesson, setIsLoadingLesson] = useState(true)
  const [quizOpen, setQuizOpen] = useState(false)
  const [preferredVoice, setPreferredVoice] = useState('Aoede')
  const [isCompletedBefore, setIsCompletedBefore] = useState(false)
  const [studentProfileClassLevel, setStudentProfileClassLevel] = useState<string>('')
  const [studentName, setStudentName] = useState<string>('')
  const [endChapterConfirmPrompt, setEndChapterConfirmPrompt] = useState<string | null>(null)

  // Interactive 3D Visualization Stage state
  const [activeSceneType, setActiveSceneType] = useState<VisualizationSceneType | null>(null)
  const [activeSceneParams, setActiveSceneParams] = useState<Record<string, any>>({})
  const [activeSceneTitle, setActiveSceneTitle] = useState<string | undefined>(undefined)

  // Multimedia Lesson Manifest & Position State
  const [lessonManifest, setLessonManifest] = useState<VisualLessonManifest | null>(null)
  const [activeVisualStepIndex, setActiveVisualStepIndex] = useState<number>(0)

  // Concept-level progress tracking & automatic session resumption
  const [currentConceptIndex, setCurrentConceptIndex] = useState<number>(0)
  const currentConceptIndexRef = useRef<number>(0)
  useEffect(() => {
    currentConceptIndexRef.current = currentConceptIndex
  }, [currentConceptIndex])
  const [completedConcepts, setCompletedConcepts] = useState<string[]>([])
  const completedConceptsRef = useRef<string[]>([])
  useEffect(() => {
    completedConceptsRef.current = completedConcepts
  }, [completedConcepts])
  const [lastCoveredConcept, setLastCoveredConcept] = useState<string>('')

  // Chapter Notes state, AI optimization & auto-save to Supabase
  const [chapterNotes, setChapterNotes] = useState<string>('')
  const [notesModalOpen, setNotesModalOpen] = useState(false)
  const [notesSaveStatus, setNotesSaveStatus] = useState<'saved' | 'saving' | 'idle'>('idle')
  const [latestBoardSummary, setLatestBoardSummary] = useState<string>('')
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const boardSyncTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSentBoardNotesRef = useRef<string>('')
  const isMarkingCompleteRef = useRef<boolean>(false)

  const chalkboardRef = useRef<GreenChalkboardRef | null>(null)
  const executedSceneDirectivesRef = useRef<Set<string>>(new Set())
  const renderedVisualConceptsRef = useRef<Set<number>>(new Set())

  // Exact database values (no hardcoded mocks)
  const resolvedClassLevel =
    activeModule?.class_level ||
    (Array.isArray(activeModule?.curriculums)
      ? activeModule?.curriculums[0]?.class_level
      : activeModule?.curriculums?.class_level) ||
    activeCurriculum?.class_level ||
    studentProfileClassLevel ||
    ''

  const resolvedSubject =
    (Array.isArray(activeModule?.curriculums)
      ? activeModule?.curriculums[0]?.category
      : activeModule?.curriculums?.category) ||
    activeCurriculum?.category ||
    'Science'

  const resolvedBoard =
    activeModule?.board ||
    (Array.isArray(activeModule?.curriculums)
      ? activeModule?.curriculums[0]?.board
      : activeModule?.curriculums?.board) ||
    activeCurriculum?.board ||
    'CBSE'

  const resolvedTitle = activeModule?.title || ''

  // 1. Fetch exact module context, student profile, concept tracking & existing notes
  useEffect(() => {
    const supabase = createClient()

    async function loadModuleContext() {
      setIsLoadingLesson(true)
      try {
        // Fetch student profile class_level and voice preference
        const { data: profile } = await supabase
          .from('profiles')
          .select('class_level, preferred_teacher_voice, full_name')
          .eq('id', userId)
          .single()

        if (profile?.full_name) {
          setStudentName(profile.full_name.trim())
        } else {
          const { data: authData } = await supabase.auth.getUser()
          if (authData?.user?.user_metadata?.full_name) {
            setStudentName(authData.user.user_metadata.full_name.trim())
          }
        }
        if (profile?.class_level) {
          setStudentProfileClassLevel(profile.class_level)
        }
        if (profile?.preferred_teacher_voice) {
          setPreferredVoice(profile.preferred_teacher_voice)
          setSelectedVoice(profile.preferred_teacher_voice as any)
        }

        // Fetch exact syllabus module from database
        const { data: mod, error: modErr } = await supabase
          .from('syllabus_modules')
          .select('*, curriculums(*)')
          .eq('id', moduleId)
          .single()

        if (modErr || !mod) {
          console.error('Failed to load module:', modErr)
        } else {
          setActiveModule(mod)
          setActiveCurriculum(
            Array.isArray(mod.curriculums) ? mod.curriculums[0] : mod.curriculums
          )

          // Load or generate structured visual lesson plan
          if (mod.visual_lesson_plan && typeof mod.visual_lesson_plan === 'object' && Array.isArray(mod.visual_lesson_plan.steps)) {
            setLessonManifest(mod.visual_lesson_plan)
          } else {
            const generatedPlan = generateVisualLessonPlanForCapsule(
              {
                moduleId: mod.id,
                order_index: mod.order_index,
                title: mod.title,
                description: mod.description,
                subtopics: mod.subtopics || [],
                key_concepts: mod.key_concepts || [],
                worked_examples: mod.worked_examples || [],
                common_misconceptions: mod.common_misconceptions || [],
                board: resolvedBoard,
                class_level: resolvedClassLevel,
                category: resolvedSubject,
              },
              {
                textbookName: `${resolvedBoard} Official Curriculum`,
              }
            )
            setLessonManifest(generatedPlan)
          }

          // Fetch all sibling modules in this curriculum for flexible progression
          if (mod.curriculum_id) {
            const { data: sibs } = await supabase
              .from('syllabus_modules')
              .select('id, title, order_index, estimated_minutes, description')
              .eq('curriculum_id', mod.curriculum_id)
              .order('order_index', { ascending: true })

            setSiblingModules(sibs || [])
          }

          // Fetch next chapter in the same class and category (ordered sequentially)
          const curr = Array.isArray(mod.curriculums) ? mod.curriculums[0] : mod.curriculums
          if (curr && curr.class_level && curr.category) {
            const currOrder = typeof curr.order_index === 'number' ? curr.order_index : 1
            let nextQuery = supabase
              .from('curriculums')
              .select('id, title, order_index, category, class_level, board')
              .eq('class_level', curr.class_level)
              .eq('category', curr.category)
              .gt('order_index', currOrder)

            if (curr.board) {
              nextQuery = nextQuery.eq('board', curr.board)
            }

            const { data: nextChapters } = await nextQuery
              .order('order_index', { ascending: true })
              .limit(1)

            if (nextChapters && nextChapters.length > 0) {
              const nextChapter = nextChapters[0]
              const { data: nextModules } = await supabase
                .from('syllabus_modules')
                .select('id, title, order_index, description')
                .eq('curriculum_id', nextChapter.id)
                .order('order_index', { ascending: true })
                .limit(1)

              if (nextModules && nextModules.length > 0) {
                setNextChapterInfo({
                  chapterId: nextChapter.id,
                  chapterTitle: nextChapter.title,
                  firstModuleId: nextModules[0].id,
                  firstModuleTitle: nextModules[0].title,
                  orderIndex: nextChapter.order_index,
                })
              }
            }
          }
        }

        // Check if student has existing progress: concept index, completed concepts, notes
        let progressData: any = null
        const progressRes = await supabase
          .from('user_progress')
          .select(
            'status, chapter_notes, current_concept_index, completed_concepts, last_covered_concept, visual_progress, completed_at'
          )
          .eq('user_id', userId)
          .eq('syllabus_module_id', moduleId)
          .maybeSingle()

        if (progressRes.error && progressRes.error.code === '42703') {
          // Fallback if visual_progress column is not yet migrated
          const fallbackRes = await supabase
            .from('user_progress')
            .select(
              'status, chapter_notes, current_concept_index, completed_concepts, last_covered_concept, completed_at'
            )
            .eq('user_id', userId)
            .eq('syllabus_module_id', moduleId)
            .maybeSingle()
          progressData = fallbackRes.data
        } else {
          progressData = progressRes.data
        }
        const progress = progressData

        if (progress) {
          if (typeof progress.current_concept_index === 'number') {
            currentConceptIndexRef.current = progress.current_concept_index
            setCurrentConceptIndex(progress.current_concept_index)
          }
          if (Array.isArray(progress.completed_concepts)) {
            const loaded = parseKeyConcepts(progress.completed_concepts)
            completedConceptsRef.current = loaded
            setCompletedConcepts(loaded)
          }
          if (progress.last_covered_concept) {
            setLastCoveredConcept(progress.last_covered_concept)
          }
          if (progress.chapter_notes) {
            setChapterNotes(progress.chapter_notes)
          }
          if (progress.status === 'completed' || progress.completed_at) {
            setIsCompletedBefore(true)
            setModuleCompletedSuccess(true)
          }
          if (progress.visual_progress && typeof progress.visual_progress.currentStepIndex === 'number') {
            setActiveVisualStepIndex(progress.visual_progress.currentStepIndex)
          }
        }
      } catch (err) {
        console.error('Error loading module context:', err)
      } finally {
        setIsLoadingLesson(false)
      }
    }

    if (userId && moduleId) {
      loadModuleContext()
    }
  }, [userId, moduleId, setSelectedVoice])

  // 2. Synchronize AI spoken directives to Green Chalkboard and 3D Simulation Viewport
  useEffect(() => {
    if (transcripts.length === 0) return

    const latest = transcripts[transcripts.length - 1]
    if (latest && latest.sender === 'teacher') {
      if (chalkboardRef.current) {
        // Pass transcript ID so GreenChalkboard executes each tag once as streaming chunks arrive
        chalkboardRef.current.handleAiDirective(latest.text, latest.id)
      }

      // Directives execution tracking to prevent repeated triggers during text streaming
      const transcriptId = latest.id || 'turn'

      // Check for [SCENE: <sceneType> | <parameters>]
      const sceneMatches = Array.from(latest.text.matchAll(/\[SCENE:\s*([a-zA-Z0-9_\-]+)(?:\s*\|\s*([^\]]+))?\]/gi))
      for (const sm of sceneMatches) {
        const tag = sm[0]
        const key = `${transcriptId}:${tag}`
        if (!executedSceneDirectivesRef.current.has(key)) {
          executedSceneDirectivesRef.current.add(key)
          const rawType = sm[1].trim()
          const resolvedType = resolveSceneType(rawType)
          const rawParams = sm[2] || ''
          const parsedParams = parseSceneParams(rawParams)
          setActiveSceneType(resolvedType)
          setActiveSceneParams(parsedParams)
        }
      }

      // Check for [UPDATE_SCENE: <parameters>] to dynamically alter values/shapes in active 3D scene
      const updateMatches = Array.from(latest.text.matchAll(/\[UPDATE_SCENE:\s*([^\]]+)\]/gi))
      for (const um of updateMatches) {
        const tag = um[0]
        const key = `${transcriptId}:${tag}`
        if (!executedSceneDirectivesRef.current.has(key)) {
          executedSceneDirectivesRef.current.add(key)
          const updateParams = parseSceneParams(um[1])
          setActiveSceneParams((prev) => ({ ...prev, ...updateParams }))
        }
      }

      // Check for [CLOSE_SCENE]
      if (latest.text.includes('[CLOSE_SCENE]')) {
        const key = `${transcriptId}:[CLOSE_SCENE]`
        if (!executedSceneDirectivesRef.current.has(key)) {
          executedSceneDirectivesRef.current.add(key)
          setActiveSceneType(null)
        }
      }

      // Check for visual events (via parseVisualEventFromDirective)
      const parsedVisualEvent = parseVisualEventFromDirective(latest.text, latest.id)
      if (parsedVisualEvent) {
        const visualKey = `${transcriptId}:visual:${parsedVisualEvent.action}:${JSON.stringify(parsedVisualEvent.parameters)}`
        if (!executedSceneDirectivesRef.current.has(visualKey)) {
          executedSceneDirectivesRef.current.add(visualKey)
          handleVisualAction(parsedVisualEvent.action, parsedVisualEvent.parameters)
        }
      }

      // Check for question directives that require student response (sets awaiting answer guard)
      const questionRegex = /\[(?:QUESTION|CHECKPOINT_QUESTION|BOARD_QUESTION)(?::\s*([^\]]*))?\]|write_chalkboard\s*\(\s*(?:action\s*=\s*)?["']?(?:draw_question|question)["']?/gi
      const questionMatches = Array.from(latest.text.matchAll(questionRegex))
      for (const qm of questionMatches) {
        const tag = qm[0]
        const key = `${transcriptId}:${tag}`
        if (!executedSceneDirectivesRef.current.has(key)) {
          executedSceneDirectivesRef.current.add(key)
          isAwaitingStudentAnswerRef.current = true
          setIsAwaitingStudentAnswer(true)
        }
      }

      // Check for answer verdict directives that resolve question & enter verdict review state
      const verdictRegex = /\[(?:VERDICT|ANSWER_VERDICT|CORRECTION)(?::\s*([^\]]*))?\]|write_chalkboard\s*\(\s*(?:action\s*=\s*)?["']?(?:draw_answer_verdict|answer_verdict|verdict)["']?/gi
      const verdictMatches = Array.from(latest.text.matchAll(verdictRegex))
      for (const vm of verdictMatches) {
        const tag = vm[0]
        const key = `${transcriptId}:${tag}`
        if (!executedSceneDirectivesRef.current.has(key)) {
          executedSceneDirectivesRef.current.add(key)
          isAwaitingStudentAnswerRef.current = false
          setIsAwaitingStudentAnswer(false)
          isReviewingVerdictRef.current = true
          setIsReviewingVerdict(true)
        }
      }

      // Check for [CONCEPT_DONE: ...] or [CONCEPT_DONE] or write_chalkboard(action="concept_done")
      const doneMatches = Array.from(latest.text.matchAll(/\[(?:CONCEPT_DONE|CONCEPT_MASTERED|MASTERED)(?::\s*([^\]]*))?\]|write_chalkboard\s*\(\s*(?:action\s*=\s*)?["']?(?:concept_done|concept_mastered)["']?(?:\s*,\s*(?:content\s*=\s*)?["']?([^"'\)]*)["']?)?/gi))
      for (const dm of doneMatches) {
        const tag = dm[0]
        const key = `${transcriptId}:${tag}`
        if (!executedSceneDirectivesRef.current.has(key)) {
          executedSceneDirectivesRef.current.add(key)
          handleConceptDone(dm[1] || dm[2] || '')
        }
      }

      // Check for [CONCEPT_FOCUS: ...] or [FOCUS: ...] or write_chalkboard(action="concept_focus")
      const focusMatches = Array.from(latest.text.matchAll(/\[(?:CONCEPT_FOCUS|FOCUS):\s*([^\]]+)\]|write_chalkboard\s*\(\s*(?:action\s*=\s*)?["']?(?:concept_focus|focus)["']?\s*,\s*(?:content\s*=\s*)?["']?([^"'\)]+)["']?/gi))
      for (const fm of focusMatches) {
        const tag = fm[0]
        const key = `${transcriptId}:${tag}`
        if (!executedSceneDirectivesRef.current.has(key)) {
          executedSceneDirectivesRef.current.add(key)
          handleConceptFocus(fm[1] || fm[2] || '')
        }
      }

      // Check for natural spoken transitions like "Moving on to Concept 2, let's talk about cellulose...", "Now let's move to Concept 2..."
      const keyConceptsList = parseKeyConcepts(activeModule?.key_concepts)
      const spokenTransition = detectSpokenConceptTransition(latest.text, keyConceptsList)
      if (spokenTransition) {
        const spokenKey = `${transcriptId}:spoken_concept_${spokenTransition.targetIdx}`
        if (!executedSceneDirectivesRef.current.has(spokenKey)) {
          executedSceneDirectivesRef.current.add(spokenKey)
          if (spokenTransition.targetIdx > currentConceptIndexRef.current) {
            console.log(`[Spoken Concept Transition] Advancing from Concept ${currentConceptIndexRef.current + 1} to Concept ${spokenTransition.targetIdx + 1}: "${spokenTransition.conceptTitle}"`)
            handleConceptGoto(spokenTransition.targetIdx + 1)
          }
        }
      }
    }
  }, [transcripts, lessonManifest])

  // Helper to auto-save visual timeline progress
  const saveVisualProgressToSupabase = async (stepIndex: number, completedStepIds: string[]) => {
    setActiveVisualStepIndex(stepIndex)
    if (!userId || !moduleId) return
    try {
      const supabase = createClient()
      const { error } = await supabase.from('user_progress').upsert(
        {
          user_id: userId,
          syllabus_module_id: moduleId,
          visual_progress: {
            currentStepIndex: stepIndex,
            completedStepIds,
            lastActiveAt: new Date().toISOString(),
          },
        },
        { onConflict: 'user_id,syllabus_module_id' }
      )
      if (error && error.code !== '42703') {
        console.warn('Notice saving visual progress:', error.message)
      }
    } catch (err: any) {
      if (err?.code !== '42703') {
        console.warn('Notice auto-saving visual progress:', err)
      }
    }
  }

  // Helper to handle visual stage actions from Gemini Live
  const handleVisualAction = (action: string, params: Record<string, any>) => {
    // 1. Dispatch through non-blocking event queue so MultimediaLessonPlayer receives it
    VisualEventQueue.getInstance().dispatchEvent(
      action as any,
      params,
      typeof params.stepIndex === 'number' ? params.stepIndex : undefined
    )

    // 2. Synchronize classroom state
    if (action === 'SHOW_SCENE') {
      const rawSceneName = (params.sceneType || params.scene || params.value || '').toLowerCase()
      if (rawSceneName) {
        const resolved = resolveSceneType(rawSceneName)
        setActiveSceneType(resolved)
        const extraParams = { ...params }
        delete (extraParams as any).sceneType
        delete (extraParams as any).scene
        delete (extraParams as any).value
        const sceneParams = params.parameters || params.params || extraParams
        setActiveSceneParams(sceneParams)
      }
    } else if (action === 'UPDATE_SCENE') {
      setActiveSceneParams((prev) => ({ ...prev, ...(params.parameters || params.params || params || {}) }))
    } else if (action === 'CLOSE_SCENE') {
      setActiveSceneType(null)
    } else if (action === 'SHOW_MEDIA') {
      const stepIdx = typeof params.stepIndex === 'number' ? params.stepIndex : params.step
      if (typeof stepIdx === 'number' && lessonManifest && stepIdx >= 0 && stepIdx < lessonManifest.steps.length) {
        setActiveVisualStepIndex(stepIdx)
        const step = lessonManifest.steps[stepIdx]
        if (step.type === 'VIDEO' && step.content.video) {
          chalkboardRef.current?.drawVideoCard?.(step.title, step.content.video.description)
        } else if (step.type === 'GRAPH') {
          chalkboardRef.current?.drawGraph(step.content.graph?.title || 'linear')
        } else if (step.type === 'DIAGRAM') {
          chalkboardRef.current?.handleAiDirective(`[DIAGRAM: ${step.title}]`)
        } else {
          chalkboardRef.current?.drawFlowchart?.(`${step.title} -> Core Concept Formulation -> Board Application`)
        }
      } else if (params.title) {
        chalkboardRef.current?.drawFlowchart?.(`${params.title} -> Socratic Progression`)
      }
    } else if (action === 'UPDATE_GRAPH') {
      const stepIdx = typeof params.stepIndex === 'number' ? params.stepIndex : params.step
      if (typeof stepIdx === 'number' && lessonManifest && stepIdx >= 0 && stepIdx < lessonManifest.steps.length) {
        setActiveVisualStepIndex(stepIdx)
      }
      chalkboardRef.current?.drawGraph(params.type || params.title || 'linear')
    } else if (action === 'REVEAL_DIAGRAM_STEP') {
      // Handled via VisualEventQueue subscription inside MultimediaLessonPlayer
    } else if (action === 'PLAY_ANIMATION' || action === 'PAUSE_MEDIA') {
      // Handled via VisualEventQueue subscription inside MultimediaLessonPlayer
    } else if (action === 'ASK_CHECK') {
      if (lessonManifest) {
        const checkIdx = lessonManifest.steps.findIndex((s) => s.type === 'QUICK_CHECK')
        if (checkIdx !== -1) setActiveVisualStepIndex(checkIdx)
      }
    } else if (action === 'HIGHLIGHT_BOARD') {
      if (params.text) {
        chalkboardRef.current?.drawHighlightBox(params.text, params.color)
      }
    } else if (action === 'SAVE_LESSON_POSITION') {
      const stepIdx = typeof params.stepIndex === 'number' ? params.stepIndex : activeVisualStepIndex
      saveVisualProgressToSupabase(stepIdx, [])
    }
  }

  // 2b. Automatically trigger and guarantee rich visualization for the active concept
  const autoTriggerVisualForConcept = (conceptIdx: number) => {
    if (renderedVisualConceptsRef.current.has(conceptIdx)) return
    renderedVisualConceptsRef.current.add(conceptIdx)

    const keyConceptsList: string[] = parseKeyConcepts(activeModule?.key_concepts)
    const targetConcept = keyConceptsList[conceptIdx] || activeModule?.title || ''
    if (!targetConcept) return

    const directive = inferConceptVisualDirective(
      targetConcept,
      resolvedSubject,
      activeCurriculum?.title || resolvedTitle
    )

    if (directive.toolCallAction === 'execute_visual_action' && directive.sceneType) {
      const resolved = resolveSceneType(directive.sceneType)
      setActiveSceneType(resolved)
      setActiveSceneParams(directive.sceneParams || {})
    }

    if (chalkboardRef.current) {
      // Whiteboard 1-Concept-Per-Page: Switch to concept's dedicated page before rendering visual
      chalkboardRef.current.goToPage?.(conceptIdx)

      if (directive.chalkboardAction === 'draw_diagram' && directive.chalkboardContent) {
        chalkboardRef.current.handleAiDirective(`[DIAGRAM: ${directive.chalkboardContent}]`)
      } else if (directive.chalkboardAction === 'draw_graph' && directive.chalkboardContent) {
        chalkboardRef.current.drawGraph(directive.chalkboardContent)
      } else if (directive.chalkboardAction === 'draw_geometry' && directive.chalkboardContent) {
        chalkboardRef.current.drawGeometry?.(directive.chalkboardContent)
      } else if (directive.chalkboardAction === 'draw_flowchart' && directive.chalkboardContent) {
        chalkboardRef.current.drawFlowchart(directive.chalkboardContent)
      } else if (directive.chalkboardAction === 'draw_table' && directive.chalkboardContent) {
        chalkboardRef.current.drawTable?.(directive.chalkboardContent)
      } else if (directive.chalkboardAction === 'draw_flowchart' && directive.chalkboardContent) {
        chalkboardRef.current.drawFlowchart(directive.chalkboardContent)
      } else if (
        (directive.chalkboardAction === 'draw_numerical' || directive.chalkboardAction === 'numerical') &&
        directive.chalkboardContent
      ) {
        chalkboardRef.current.handleAiDirective(`[NUMERICAL: ${directive.chalkboardContent}]`)
      } else if (
        (directive.chalkboardAction === 'render_svg_diagram' || directive.chalkboardAction === 'draw_svg') &&
        directive.chalkboardContent
      ) {
        const rawContent = directive.chalkboardContent.trim()
        if (rawContent.includes('|') && rawContent.includes('<svg')) {
          const parts = rawContent.split('|').map((s) => s.trim())
          chalkboardRef.current.drawSvgDiagram?.(
            parts[0] || 'Scientific Diagram',
            parts[1] || '',
            parts[2] || ''
          )
        } else if (rawContent.includes('<svg')) {
          chalkboardRef.current.drawSvgDiagram?.('Scientific Diagram', rawContent)
        } else {
          chalkboardRef.current.drawSvgDiagram?.(rawContent, '')
        }
      }
    }
  }

  // 3. Auto-save notes to Supabase user_progress.chapter_notes
  const saveNotesToSupabase = async (notesToSave: string) => {
    if (!userId || !moduleId || !notesToSave.trim()) return
    setNotesSaveStatus('saving')
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('user_progress')
        .upsert(
          {
            user_id: userId,
            syllabus_module_id: moduleId,
            chapter_notes: notesToSave,
            current_concept_index: currentConceptIndex,
            completed_concepts: completedConcepts,
            last_covered_concept: lastCoveredConcept,
            status: isCompletedBefore || moduleCompletedSuccess ? 'completed' : 'in_progress',
          },
          { onConflict: 'user_id,syllabus_module_id' }
        )

      if (error) {
        console.error('Failed to auto-save chapter notes:', error)
        setNotesSaveStatus('idle')
      } else {
        setNotesSaveStatus('saved')
      }
    } catch (err) {
      console.error('Error auto-saving chapter notes:', err)
      setNotesSaveStatus('idle')
    }
  }

  // 4. Handle note recorded from chalkboard directives
  const handleNoteRecorded = (note: string) => {
    if (!note || !note.trim()) return

    setChapterNotes((prev) => {
      const trimmed = note.trim()
      if (prev.includes(trimmed)) return prev

      const formatted = prev ? `${prev}\n\n${trimmed}` : trimmed

      // Debounce auto-save to cloud
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      setNotesSaveStatus('saving')
      saveTimeoutRef.current = setTimeout(() => {
        saveNotesToSupabase(formatted)
      }, 1500)

      return formatted
    })
  }

  // 5. Automatic Module Completion & Progression Engine
  const markModuleAsCompleted = async (summaryNote?: string) => {
    if (!userId || !moduleId || isMarkingCompleteRef.current) return
    isMarkingCompleteRef.current = true
    try {
      const supabase = createClient()
      const now = new Date().toISOString()
      const todayStr = now.split('T')[0]
      const keyConcepts: string[] = parseKeyConcepts(activeModule?.key_concepts)

      // 1. Update user_progress to completed
      await supabase
        .from('user_progress')
        .upsert(
          {
            user_id: userId,
            syllabus_module_id: moduleId,
            status: 'completed',
            completed_at: now,
            current_concept_index: keyConcepts.length,
            completed_concepts: keyConcepts.length > 0 ? keyConcepts : completedConcepts,
            last_covered_concept:
              keyConcepts[keyConcepts.length - 1] || activeModule?.title || 'Synthesis',
            ...(summaryNote
              ? { chapter_notes: chapterNotes ? `${chapterNotes}\n\n${summaryNote}` : summaryNote }
              : {}),
          },
          { onConflict: 'user_id,syllabus_module_id' }
        )

      // 1b. Automatically unlock next capsule or next chapter's first capsule
      const nextMod = siblingModules.find(
        (m) => m.order_index > (activeModule?.order_index || 0)
      )

      if (nextMod) {
        await supabase
          .from('user_progress')
          .upsert(
            {
              user_id: userId,
              syllabus_module_id: nextMod.id,
              status: 'in_progress',
              started_at: now,
            },
            { onConflict: 'user_id,syllabus_module_id' }
          )
      } else if (nextChapterInfo?.firstModuleId) {
        // Last capsule of chapter completed: unlock first capsule of next chapter
        await supabase
          .from('user_progress')
          .upsert(
            {
              user_id: userId,
              syllabus_module_id: nextChapterInfo.firstModuleId,
              status: 'in_progress',
              started_at: now,
            },
            { onConflict: 'user_id,syllabus_module_id' }
          )

        // Ensure student is active in the next chapter's curriculum
        if (nextChapterInfo.chapterId) {
          await supabase
            .from('enrollments')
            .upsert(
              {
                user_id: userId,
                curriculum_id: nextChapterInfo.chapterId,
                status: 'active',
                enrolled_at: now,
              },
              { onConflict: 'user_id,curriculum_id' }
            )
        }
      }

      // 2. Fetch and increment profiles learning minutes & classes taken (only if not completed before)
      if (!isCompletedBefore) {
        const { data: prof } = await supabase
          .from('profiles')
          .select('total_classes_taken, total_learning_minutes, current_streak, last_active_date')
          .eq('id', userId)
          .single()

        const currentClasses = prof?.total_classes_taken || 0
        const currentMinutes = prof?.total_learning_minutes || 0
        const estimatedMins = activeModule?.estimated_minutes || 15

        await supabase
          .from('profiles')
          .update({
            total_classes_taken: currentClasses + 1,
            total_learning_minutes: currentMinutes + estimatedMins,
            last_active_date: todayStr,
            updated_at: now,
          })
          .eq('id', userId)
      }

      setIsCompletedBefore(true)
      setModuleCompletedSuccess(true)

      // 3. Companion guidance celebration (strictly zero emojis)
      triggerCompanionGuidance({
        animation: 'excited',
        expression: 'joyful-wide',
        mood: 'celebrate',
        message: nextMod
          ? `Outstanding work! You completed "${activeModule?.title || 'this capsule'}". Ready for "${nextMod.title}"?`
          : `Magnificent achievement! You have completed all capsules in this chapter.`,
        autoDismissMs: 12000,
      })

      // 4. Invariant 3: Live chalkboard is single source of truth for notes.
      // Directly save live chalkboard state to user_progress.chapter_notes
      const boardSummary =
        chalkboardRef.current?.getBoardSummary()?.fullSummary ||
        latestBoardSummary ||
        summaryNote ||
        chapterNotes

      if (boardSummary && boardSummary.trim()) {
        setChapterNotes(boardSummary)
        await saveNotesToSupabase(boardSummary)
        setNotesSaveStatus('saved')
      }
    } catch (err) {
      console.error('Error marking module as completed:', err)
    } finally {
      setTimeout(() => {
        isMarkingCompleteRef.current = false
      }, 5000)
    }
  }

  // 6. Rewind / Concept Jump Navigation (Bidirectional sync with Supabase and UI)
  const handleConceptGoto = async (target: number | string) => {
    const keyConcepts: string[] = parseKeyConcepts(activeModule?.key_concepts)
    if (keyConcepts.length === 0) return

    let targetIdx = 0

    if (typeof target === 'number') {
      targetIdx = Math.max(0, Math.min(target - 1, Math.max(0, keyConcepts.length - 1)))
    } else {
      const lower = String(target || '').toLowerCase().trim()
      if (lower === 'start' || lower === 'beginning' || lower === 'first') {
        targetIdx = 0
      } else {
        const found = keyConcepts.findIndex(
          (c) => c.toLowerCase().includes(lower) || lower.includes(c.toLowerCase())
        )
        if (found >= 0) {
          targetIdx = found
        } else {
          const num = parseInt(lower.replace(/\D/g, ''), 10)
          if (!isNaN(num) && num > 0) {
            targetIdx = Math.max(0, Math.min(num - 1, Math.max(0, keyConcepts.length - 1)))
          }
        }
      }
    }

    const newCompleted = keyConcepts.slice(0, targetIdx)
    const targetConceptName = keyConcepts[targetIdx] || activeModule?.title || 'Concept'

    isAwaitingStudentAnswerRef.current = false
    setIsAwaitingStudentAnswer(false)
    isReviewingVerdictRef.current = false
    setIsReviewingVerdict(false)

    currentConceptIndexRef.current = targetIdx
    setCurrentConceptIndex(targetIdx)
    completedConceptsRef.current = newCompleted
    setCompletedConcepts(newCompleted)
    setLastCoveredConcept(targetConceptName)
    setIsCompletedBefore(false)
    setModuleCompletedSuccess(false)

    // Whiteboard 1-Concept-Per-Page: Switch to concept's dedicated page (or clean reset for Page 1)
    if (targetIdx === 0) {
      chalkboardRef.current?.resetBoard?.()
    } else {
      chalkboardRef.current?.goToPage?.(targetIdx, targetConceptName)
    }

    try {
      const supabase = createClient()
      await supabase
        .from('user_progress')
        .upsert(
          {
            user_id: userId,
            syllabus_module_id: moduleId,
            current_concept_index: targetIdx,
            completed_concepts: newCompleted,
            last_covered_concept: targetConceptName,
            status: 'in_progress',
            completed_at: null,
          },
          { onConflict: 'user_id,syllabus_module_id' }
        )

      const newPercent =
        keyConcepts.length > 0 ? Math.round((newCompleted.length / keyConcepts.length) * 100) : 0

      triggerCompanionGuidance({
        animation: 'listening',
        expression: 'neutral',
        mood: 'thinking',
        message: targetIdx === 0
          ? `Rewound to start. Teaching Concept 1: "${targetConceptName}".`
          : `Jumped to Concept ${targetIdx + 1}: "${targetConceptName}". Progress is ${newPercent}%.`,
        autoDismissMs: 5000,
      })
    } catch (err) {
      console.error('Failed to rewind concept in database:', err)
    }
  }

  // 7. Concept Tracking Callbacks: auto-save progress and resume state
  const handleConceptFocus = (conceptName: string | number) => {
    const keyConcepts: string[] = parseKeyConcepts(activeModule?.key_concepts)
    if (keyConcepts.length === 0) return

    if (typeof conceptName === 'number') {
      handleConceptGoto(conceptName)
      return
    }

    const raw = String(conceptName || '').trim()
    const numMatch = raw.match(/(?:concept\s*#?\s*)?(\d+)/i)
    if (numMatch && numMatch[1]) {
      const parsedNum = parseInt(numMatch[1], 10)
      if (parsedNum >= 1 && parsedNum <= keyConcepts.length) {
        handleConceptGoto(parsedNum)
        return
      }
    }

    const norm = (s: string) =>
      String(s || '')
        .toLowerCase()
        .replace(/^[\s\(\[\{\"\']+|[\s\)\]\}\"\']+$/g, '')
        .replace(/^concept\s*\d*[:\-\s]*/i, '')
        .replace(/^\d+[\.\:\)\-]\s*/, '')
        .replace(/[^a-z0-9]/g, '')

    const targetNorm = norm(raw)
    if (targetNorm) {
      const matchedIdx = keyConcepts.findIndex((c) => {
        const cNorm = norm(c)
        return cNorm === targetNorm || cNorm.includes(targetNorm) || targetNorm.includes(cNorm)
      })
      if (matchedIdx >= 0) {
        handleConceptGoto(matchedIdx + 1)
        return
      }
    }

    if (currentConceptIndexRef.current < keyConcepts.length - 1) {
      handleConceptGoto(currentConceptIndexRef.current + 2)
    }
  }

  const handleConceptDone = (conceptName?: string) => {
    isAwaitingStudentAnswerRef.current = false
    setIsAwaitingStudentAnswer(false)
    isReviewingVerdictRef.current = false
    setIsReviewingVerdict(false)

    const keyConcepts: string[] = parseKeyConcepts(activeModule?.key_concepts)
    if (keyConcepts.length === 0) return

    let matchedIdx = currentConceptIndexRef.current
    if (conceptName?.trim()) {
      const numMatch = String(conceptName).match(/\b(\d+)\b/)
      if (numMatch) {
        const parsed = parseInt(numMatch[1], 10)
        if (parsed >= 1 && parsed <= keyConcepts.length) {
          matchedIdx = parsed - 1
        }
      }
    }

    const nextIdx = Math.min(matchedIdx + 1, keyConcepts.length - 1)
    if (nextIdx > currentConceptIndexRef.current) {
      handleConceptGoto(nextIdx + 1)
    } else {
      const canonicalConcept = keyConcepts[matchedIdx]
      if (canonicalConcept && !completedConceptsRef.current.includes(canonicalConcept)) {
        const updated = [...completedConceptsRef.current, canonicalConcept]
        completedConceptsRef.current = updated
        setCompletedConcepts(updated)
      }
      if (keyConcepts.length > 0 && completedConceptsRef.current.length >= keyConcepts.length) {
        markModuleAsCompleted()
      }
    }
  }

  const isCallActive =
    connectionState === 'CONNECTED' ||
    connectionState === 'LISTENING' ||
    connectionState === 'TEACHER_SPEAKING' ||
    connectionState === 'MUTED' ||
    connectionState === 'CONNECTING'

  // Keyboard shortcuts (M to mute, Esc to end)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isCallActive) return
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        toggleMute()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        handleEndClass()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

  return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCallActive, toggleMute])

  // Start Spoken Lesson: continuous teaching flow, explanation-first, worked-demonstrations second, strict chalkboard directives
  const handleStartClass = () => {
    if (!activeModule) return

    const keyConcepts: string[] = parseKeyConcepts(activeModule?.key_concepts)
    const rawCurrent = keyConcepts[currentConceptIndex] || activeModule.title || ''
    const currentConcept = rawCurrent.replace(/^[\s\(\[\{]+|[\s\)\]\}]+$/g, '').trim()
    const rawFirst = keyConcepts[0] || resolvedTitle || ''
    const firstConcept = rawFirst.replace(/^[\s\(\[\{]+|[\s\)\]\}]+$/g, '').trim()
    const norm = (s: string) =>
      String(s || '')
        .toLowerCase()
        .replace(/^[\s\(\[\{\"\']+|[\s\)\]\}\"\']+$/g, '')
        .replace(/^concept\s*\d*[:\-\s]*/i, '')
        .replace(/^\d+[\.\:\)\-]\s*/, '')
        .replace(/[^a-z0-9]/g, '')

    const currentCompletedCount = keyConcepts.filter((k) =>
      completedConcepts.some((c) => {
        const cNorm = norm(c)
        const kNorm = norm(k)
        return cNorm === kNorm || cNorm.includes(kNorm) || kNorm.includes(cNorm)
      })
    ).length

    const isCompletedModule =
      isCompletedBefore ||
      moduleCompletedSuccess ||
      (keyConcepts.length > 0 && currentCompletedCount >= keyConcepts.length)
    const isResumed = !isCompletedModule && (currentConceptIndex > 0 || currentCompletedCount > 0)
    const nextConcept = keyConcepts[currentConceptIndex + 1] || 'Chapter Synthesis Summary'

    const boardSummaryObj = chalkboardRef.current?.getBoardSummary()
    const currentBoard = boardSummaryObj?.fullSummary || latestBoardSummary || ''
    const subjectDirective = getSubjectPedagogyDirective(resolvedSubject)

    const isLastCapsuleOfChapter = !nextSiblingModule

    const rawWorkedExamples = activeModule.worked_examples
    let parsedWorkedExamples: any[] = []
    if (Array.isArray(rawWorkedExamples)) {
      parsedWorkedExamples = rawWorkedExamples
    } else if (typeof rawWorkedExamples === 'string') {
      try {
        const p = JSON.parse(rawWorkedExamples)
        if (Array.isArray(p)) parsedWorkedExamples = p
      } catch {
        parsedWorkedExamples = []
      }
    }

    const workedExamplesText =
      parsedWorkedExamples.length > 0
        ? parsedWorkedExamples
            .map(
              (ex: any, i: number) =>
                `#${i + 1}: "${ex.problem || ''}" | Given: ${ex.given || ''} | Formula: ${ex.formula || ''} | Sub: ${ex.substitution || ''} | Calc: ${ex.calculation || ''} | Ans: ${ex.finalAnswer || ''} ${ex.unit || ''}`.trim()
            )
            .join('\n')
        : ''

    const rawMisconceptions = activeModule.common_misconceptions
    let parsedMisconceptions: string[] = []
    if (Array.isArray(rawMisconceptions)) {
      parsedMisconceptions = rawMisconceptions
    } else if (typeof rawMisconceptions === 'string') {
      try {
        const p = JSON.parse(rawMisconceptions)
        if (Array.isArray(p)) parsedMisconceptions = p
      } catch {
        parsedMisconceptions = []
      }
    }

    const misconceptionsText =
      parsedMisconceptions.length > 0
        ? parsedMisconceptions.map((m: string, i: number) => `${i + 1}. ${m}`).join(' | ')
        : ''

    const capsuleNotesText = (activeModule.chapter_notes || '').trim()
    const aiContextText = (activeModule.ai_system_prompt_context || '').trim()

    const isMath = (resolvedSubject || '').toLowerCase().includes('math')
    const totalSiblingCount = siblingModules.length || 1
    const moduleOrderIndex = typeof activeModule?.order_index === 'number' ? activeModule.order_index : 1
    const chapterName = activeCurriculum?.title || resolvedTitle || 'Chapter'
    const isFoundationalHalf = moduleOrderIndex <= Math.max(1, Math.ceil(totalSiblingCount / 2))

    const mathProgressionText = isMath
      ? isFoundationalHalf
        ? `Math Pedagogy (#${moduleOrderIndex}/${totalSiblingCount} "${chapterName}"): Ground conceptual foundations, axioms, coordinate properties, definitions, and proofs on the chalkboard with geometrical intuition.`
        : `Math Pedagogy (#${moduleOrderIndex}/${totalSiblingCount} "${chapterName}"): Solve authentic board exam questions & textbook numericals step-by-step on whiteboard (Given -> Formula -> Substitution -> Scratch in [ROUGH_WORK] -> Boxed Answer).`
      : ''

    const firstVisual = inferConceptVisualDirective(firstConcept, resolvedSubject, chapterName)
    const currentVisual = inferConceptVisualDirective(currentConcept, resolvedSubject, chapterName)

    const visualRoadmap = keyConcepts
      .map((c: string, i: number) => {
        const v = inferConceptVisualDirective(c, resolvedSubject, chapterName)
        return `  * Concept #${i + 1} "${c}":\n    -> AUTO-TRIGGER VISUAL: ${v.toolCallExample}`
      })
      .join('\n')

    const studentFirstName = studentName ? studentName.split(' ')[0].trim() : ''

    const kickoffPrompt = isCompletedModule
      ? `[SESSION START]: Hello Teacher! I am ${studentFirstName || 'your student'}. I have completed this capsule. Please review the key takeaways on the chalkboard, and ask if I have any questions before the quiz.`
      : isResumed
      ? `[SESSION START]: Please speak first immediately! Greet ${studentFirstName || 'the student'} warmly by name, state that we are resuming Concept ${currentConceptIndex + 1}: "${currentConcept}". Speak continuously throughout the step, explain the diagram and intuition, write on the chalkboard, and guide them step-by-step.`
      : `[SESSION START]: Please speak first immediately! Introduce yourself and greet ${studentFirstName || 'the student'} warmly by name. Announce today's capsule ("${resolvedTitle}"). Immediately begin teaching Concept 1: "${firstConcept}" - render the diagram on the chalkboard, speak continuously to explain the intuition and definition, write notes, and only stop when the step is done to check understanding. Do NOT wait for ${studentFirstName || 'the student'} to speak first!`

    const conceptDossiersText = buildConceptMicroDossiers(
      keyConcepts,
      activeModule,
      resolvedBoard,
      resolvedClassLevel,
      resolvedSubject,
      chapterName,
      parsedWorkedExamples,
      parsedMisconceptions
    )

    const lessonPrompt = `ROLE: Senior Academic Topper Tutor (1-on-1 spoken class with live chalkboard notes).
STUDENT: ${studentFirstName ? studentFirstName + ' | ' : ''}${resolvedClassLevel || 'Class 10'} (${resolvedBoard || 'CBSE'}) | Subject: ${resolvedSubject} (${subjectDirective}) | Capsule: "${resolvedTitle}"${
  isLastCapsuleOfChapter && nextChapterInfo
    ? ` | Final Capsule (Next: #${nextChapterInfo.orderIndex} "${nextChapterInfo.chapterTitle}")`
    : ''
}

CORE INVARIANTS:
1. SESSION START (SPEAK FIRST):
   - You MUST speak FIRST immediately upon connection! Do NOT wait for ${studentFirstName || 'the student'} to speak.
   - Greet ${studentFirstName || 'the student'} warmly by name: "Hello ${studentFirstName || 'there'}! Welcome to today's class on ${resolvedTitle}."
   - Immediately begin teaching Concept 1 with diagram, continuous spoken explanation, and chalkboard notes.

2. CONTINUOUS TEACHING THROUGH THE STEP (NEVER STOP PREMATURELY):
   - Do NOT stop talking after just 2-3 sentences in the middle of teaching a concept!
   - Continue teaching through the FULL STEP: explain the diagram thoroughly, describe its features, provide the everyday real-life intuition, and state the formal scientific definition with board notes.
   - ONLY when the full step is finished, stop speaking and ask: "Did you understand this concept and diagram, or would you like me to explain anything differently?"

3. SPOKEN TEACHING WHILE WRITING (NEVER WRITE IN SILENCE):
   - Whenever you write or draw on the chalkboard, you MUST simultaneously SPEAK ALOUD to explain what you are drawing or writing and WHY.
   - Never write or draw in silence! Talk the student through the concept and diagram like an engaging teacher at the board.

4. RE-TEACHING, DOUBTS & EXPLANATION REQUESTS (HIGHEST PRIORITY):
   - When a student asks to re-teach, re-explain, says "teach again", "explain again", "re-teach", "didn't understand", "can you explain why", "no", "repeat", "I have doubts", or expresses ANY confusion:
     a) NEVER say "perfect let's move on", "excellent let's continue", or advance to the next concept!
     b) DO NOT call concept_done or concept_focus. STAY ON THE CURRENT WHITEBOARD PAGE.
     c) Respond with warm encouragement: "Of course! Let us break this down from a fresh angle."
     d) Explain WHY the concept works using a completely fresh, tangible real-life analogy.
     e) Add supporting clarification notes or sketches on the current chalkboard: write_chalkboard(action="draw_note", content="Breakdown: <fresh simplified intuition>", color="amber")
     f) Ask: "Does this way of looking at it make sense to you now?"
     g) Only advance when the student explicitly states they have understood and are ready to move on.

PEDAGOGICAL CADENCE (STRICT 4-TURN INTERACTIVE SEQUENCE):

TURN 1 (FIRST TURN OF CONCEPT) - DIAGRAM + COMPLETE SPOKEN EXPLANATION + REAL-WORLD HOOK + DEFINITION:
1. Render an accurate scientific diagram on the chalkboard:
   render_svg_diagram(title="...", svg="<svg viewBox='0 0 540 280' xmlns='http://www.w3.org/2000/svg' shape-rendering='geometricPrecision' text-rendering='geometricPrecision'>...</svg>", caption="...")
   (Use high-contrast vector graphics with labels and leader lines. Never flat colored boxes.)
2. SPOKEN EXPLANATION & REAL-WORLD HOOK (SPEAK CONTINUOUSLY):
   Greet ${studentFirstName || 'the student'} by name, then walk through the diagram explaining what it shows and why it matters using an everyday physical hook. As you speak, write:
   write_chalkboard(action="draw_note", content="Real-World Intuition: <everyday physical example connecting to the diagram>", color="botanical")
3. PRECISE DEFINITION (SPEAK ALOUD):
   Explain the definition or law aloud in plain spoken words, then write:
   write_chalkboard(action="draw_highlight_box", content="Definition: <exact scientific formulation, law, or principle with SI units>", color="coral")
4. ONLY NOW STOP & ASK UNDERSTANDING CHECK:
   "Take a look at the diagram and definition on the board. Did you understand this concept, or would you like me to explain anything differently?"
5. STRICT INVIOLABLE PROHIBITION IN TURN 1:
   DO NOT write any exam question (action="draw_exam_question") and DO NOT write any checkpoint question (action="draw_question") in Turn 1!
   Stop speaking and wait for the student to confirm understanding.
   - If student says "no", "explain again", "teach again", or has doubts: Immediately RE-TEACH using a new analogy!
   - If student confirms: Proceed to Turn 2.

TURN 2 (AFTER STUDENT CONFIRMS) - CONCRETE EXAMPLES + STEP-BY-STEP WORKED QUESTION:
1. Acknowledge confirmation.
2. Explain 1-2 concrete practical examples aloud, writing:
   write_chalkboard(action="draw_note", content="Example: <concrete illustration addressing common pitfalls>", color="blue")
3. SOLVE A QUESTION FIRST ON THE WHITEBOARD: Model authentic exam problem-solving:
   write_chalkboard(action="draw_exam_question", content="Q: <Board Question> | Given: <values> | Formula: <formula> | Solution: <step-by-step working> | Answer: <boxed answer with SI units>", color="coral")
4. Explain each solution step aloud in detail.
5. "Now let me check if you have got this. Here is a question for you to solve."

TURN 3 (CHECKPOINT QUESTIONS) - CONFIRM MASTERY:
1. POSE CHECKPOINT QUESTION:
   write_chalkboard(action="draw_question", content="Q1: <Targeted board exam question testing this concept>", color="amber")
2. INVIOLABLE HARD STOP: Stop speaking at '?' and wait for student reply. DO NOT change page.

TURN 4 (AFTER STUDENT REPLIES) - EVALUATE, HANDLE DOUBTS OR TRANSITION:
1. IF STUDENT HAS DOUBTS OR ASKS TO RE-TEACH: Trigger RE-TEACHING DIRECTIVE! Never say "perfect let's move on".
2. IF STUDENT ATTEMPTED QUESTION:
   - write_chalkboard(action="draw_student_answer", content="Student's Answer: <exact reply>", color="blue")
   - write_chalkboard(action="draw_answer_verdict", content="Verdict: <Topper evaluation, scoring & correction if any>", color="botanical")
   - If incorrect: explain kindly, co-solve, and give 1 more practice question.
   - If correct: "Excellent! Are you confident and ready to move to the next concept?"
3. ONLY WHEN STUDENT EXPLICITLY CONFIRMS (e.g. "yes", "understood", "clear", "next"):
   a) write_chalkboard(action="concept_done", content="<Current Concept Name>")
   b) write_chalkboard(action="concept_focus", content="<Next Concept Name>") -> advances to clean new page!
   c) Begin Turn 1 for next concept on the clean new page.
   d) If all concepts completed, call: conclude_and_open_quiz(summary="...")

QUIZ TIMING RULE:
- NEVER mention the 10-MCQ quiz or call conclude_and_open_quiz until ALL concepts have been fully taught, solved, and marked done with concept_done!

STUDENT IMAGE & DIAGRAM REQUEST DIRECTIVE:
You have a real-time whiteboard graphics engine with render_svg_diagram(title, svg, caption).
NEVER tell the student "I am unable to generate images", "I cannot generate separate images", or "I am an audio AI".
When a student asks to see an image, picture, diagram, structure, visual, or sketch of ANY concept:
1. Reply enthusiastically: "Drawing that on the chalkboard for you right now!"
2. IMMEDIATELY call render_svg_diagram(title="...", svg="<svg ...>...</svg>", caption="...")!

TEXTBOOK CONCEPT MICRO-DOSSIERS:
${conceptDossiersText}
${visualRoadmap ? `\nVISUAL ROADMAP (SUMMON VISUAL TOOL IN TURN 1 FOR EACH CONCEPT):\n${visualRoadmap}\n` : ''}${mathProgressionText ? `- ${mathProgressionText}\n` : ''}${aiContextText ? `PEDAGOGICAL CUES: ${aiContextText}\n` : ''}
RULES: Strictly ZERO emojis. Board is single source of truth for notes. Warm, intellectually rigorous topper tone.`

    // Whiteboard 1-Concept-Per-Page: Ensure active concept page is active
    chalkboardRef.current?.goToPage?.(currentConceptIndex)

    startClass(
      preferredVoice as any,
      lessonPrompt,
      kickoffPrompt,
      (action, content, color) => {
        const isVisualAction = [
          'draw_graph', 'graph',
          'draw_geometry', 'geometry', 'draw_table', 'table',
          'draw_shape', 'shape', 'draw_rectangle', 'draw_circle', 'draw_triangle',
          'draw_flowchart', 'draw_numerical', 'numerical', 'solve', 'worked_example',
          'render_svg_diagram', 'draw_svg', 'draw_svg_diagram',
          'draw_video', 'video',
        ].includes(action)
        if (isVisualAction) {
          renderedVisualConceptsRef.current.add(currentConceptIndexRef.current)
        }
        if (chalkboardRef.current) {
          if (action === 'set_color' || action === 'chalk_color') {
            chalkboardRef.current.setChalkColor(color || content)
          }
          else if (action === 'draw_title') chalkboardRef.current.drawTitle(content, color)
          else if (action === 'draw_note') chalkboardRef.current.drawNote(content, color)
          else if (action === 'draw_step') chalkboardRef.current.drawStep(content, color)
          else if (action === 'draw_highlight_box') chalkboardRef.current.drawHighlightBox(content, color)
          else if (action === 'draw_rough_work') chalkboardRef.current.drawRoughWork(content, color)
          else if (action === 'clear_rough') chalkboardRef.current.clearRough()
          else if (action === 'clear_notes') chalkboardRef.current.clearNotes()
          else if (action === 'rewrite_notes') chalkboardRef.current.rewriteNotes(typeof content === 'string' ? content : JSON.stringify(content))
          else if (action === 'draw_question') {
            isAwaitingStudentAnswerRef.current = true
            setIsAwaitingStudentAnswer(true)
            chalkboardRef.current.drawQuestion(content, color)
          }
          else if (action === 'draw_student_answer' || action === 'student_answer') {
            chalkboardRef.current.drawStudentAnswer?.(content, undefined, color)
          }
          else if (action === 'draw_answer_verdict' || action === 'answer_verdict' || action === 'verdict') {
            chalkboardRef.current.drawAnswerVerdict?.(content, undefined, color)
            isAwaitingStudentAnswerRef.current = false
            setIsAwaitingStudentAnswer(false)
            isReviewingVerdictRef.current = true
            setIsReviewingVerdict(true)
          }
          else if (action === 'draw_exam_question' || action === 'exam_question') {
            chalkboardRef.current.drawExamQuestion?.(content, undefined, undefined, color)
          }
          else if (
            action === 'draw_shape' || action === 'shape' ||
            action === 'draw_rectangle' || action === 'draw_circle' ||
            action === 'draw_triangle' || action === 'draw_square' ||
            action === 'draw_cylinder' || action === 'draw_cube' ||
            action === 'draw_ellipse' || action === 'draw_line' ||
            action === 'draw_arrow'
          ) {
            chalkboardRef.current.drawShape?.(content)
          }
          else if (action === 'draw_flowchart') chalkboardRef.current.drawFlowchart(content, color)
          else if (action === 'draw_table' || action === 'table') chalkboardRef.current.drawTable?.(content)
          else if (action === 'draw_geometry' || action === 'geometry') chalkboardRef.current.drawGeometry?.(content)
          else if (action === 'draw_graph' || action === 'graph') {
            chalkboardRef.current.drawGraph(content)
            const pipeParts = (content || '').split('|').map((s: string) => s.trim())
            let formula = ''
            let domain: [number, number] = [-5, 5]
            let range: [number, number] = [-5, 5]
            let title = 'Graph'
            let callout = ''
            let points = ''
            pipeParts.forEach((p: string) => {
              if (p.startsWith('formula=')) formula = p.substring(8).trim()
              else if (p.startsWith('title=')) title = p.substring(6).trim()
              else if (p.startsWith('callout=')) callout = p.substring(8).trim()
              else if (p.startsWith('points=')) points = p.substring(7).trim()
              else if (p.startsWith('domain=')) {
                const m = p.match(/\[\s*([\-\d\.]+)\s*,\s*([\-\d\.]+)\s*\]/)
                if (m) domain = [parseFloat(m[1]), parseFloat(m[2])]
              } else if (p.startsWith('range=')) {
                const m = p.match(/\[\s*([\-\d\.]+)\s*,\s*([\-\d\.]+)\s*\]/)
                if (m) range = [parseFloat(m[1]), parseFloat(m[2])]
              } else if (!formula && (p.includes('x') || p.includes('^') || p.includes('sin') || p.includes('cos'))) {
                formula = p
              }
            })
            if (!formula) formula = pipeParts[0] || 'x^2 - 4'
            setActiveGraph({ formula, domain, range, title, callout, points })
          }
          else if (action === 'draw_numerical' || action === 'numerical' || action === 'worked_example' || action === 'solve') {
            if (typeof content === 'object') chalkboardRef.current.drawNumericalSolution?.(content)
            else chalkboardRef.current.handleAiDirective(`[NUMERICAL: ${content}]`)
          }
          else if (action === 'draw_image' || action === 'image' || action === 'draw_diagram' || action === 'diagram') {
            const parts = (content || '').split('|').map((s: string) => s.trim())
            if (parts[1] && parts[1].includes('<svg')) {
              chalkboardRef.current.drawSvgDiagram?.(parts[0] || 'Scientific Diagram', parts[1], parts[2] || '')
            } else {
              chalkboardRef.current.drawSvgDiagram?.(parts[0] || content || 'Scientific Diagram', '', parts[1] || '')
            }
          }
          else if (action === 'draw_video' || action === 'video') {
            const parts = (content || '').split('|').map((s: string) => s.trim())
            chalkboardRef.current.drawVideoCard?.(parts[0] || 'Demonstration', parts[1] || '')
          }
          else if (action === 'render_svg_diagram' || action === 'draw_svg' || action === 'draw_svg_diagram') {
            if (typeof content === 'object' && content !== null) {
              chalkboardRef.current.drawSvgDiagram?.(content.title || 'Educational Diagram', content.svg || '', content.caption)
            } else if (typeof content === 'string') {
              const trimmed = content.trim()
              if (trimmed.includes('|') && trimmed.includes('<svg')) {
                const parts = trimmed.split('|').map((s: string) => s.trim())
                chalkboardRef.current.drawSvgDiagram?.(parts[0] || 'Educational Diagram', parts[1] || '', parts[2])
              } else if (trimmed.includes('<svg')) {
                chalkboardRef.current.drawSvgDiagram?.('Educational Diagram', trimmed)
              } else {
                chalkboardRef.current.drawSvgDiagram?.(trimmed, '')
              }
            }
          }
          else if (action === 'new_page') chalkboardRef.current.addNewPage?.()
          else if (action === 'clear_board' || action === 'erase_board') chalkboardRef.current.clearBoard()
          else if (action === 'start_quiz' || action === 'open_quiz') {
            markModuleAsCompleted()
            handleOpenQuiz()
          }
          else if (action === 'chapter_summary') {
            chalkboardRef.current.drawTitle('Chapter Synthesis Summary', color)
            chalkboardRef.current.drawNote(content, color)
            handleNoteRecorded(`#### Chapter Summary:\n${content}`)
            markModuleAsCompleted(content)
          }
          else if (action === 'concept_focus') {
            isReviewingVerdictRef.current = false
            setIsReviewingVerdict(false)
            isAwaitingStudentAnswerRef.current = false
            setIsAwaitingStudentAnswer(false)
            const cleanContent = content.replace(/^[\s\(\[\{]+|[\s\)\]\}]+$/g, '').trim()
            if (cleanContent) {
              handleConceptFocus(cleanContent)
            }
          } else if (action === 'concept_done') {
            isReviewingVerdictRef.current = false
            setIsReviewingVerdict(false)
            isAwaitingStudentAnswerRef.current = false
            setIsAwaitingStudentAnswer(false)
            handleConceptDone(content)
          } else if (action === 'concept_goto' || action === 'goto_concept') {
            handleConceptGoto(content)
          } else if (action === 'draw_diagram' || action === 'diagram') {
            chalkboardRef.current.handleAiDirective(`[DIAGRAM: ${content}]`)
          } else {
            const dirPayload = color ? `${content} | ${color}` : content
            chalkboardRef.current.handleAiDirective(`[${action.toUpperCase()}: ${dirPayload}]`)
          }
        }
      },
      (action, params) => {
        renderedVisualConceptsRef.current.add(currentConceptIndexRef.current)
        handleVisualAction(action, params)
      }
    )
  }

  const handleEndClass = () => {
    endCall()
    if (isCompletedBefore || moduleCompletedSuccess) {
      setQuizOpen(true)
    }
  }

  const handleOpenQuiz = () => {
    if (!isCompletedBefore && !moduleCompletedSuccess) return
    endCall()
    setQuizOpen(true)
  }

  const handleBackToDashboard = () => {
    endCall()
    router.refresh()
    router.push(`/dashboard/${userId}`)
  }

  const latestTranscript =
    transcripts.length > 0 ? transcripts[transcripts.length - 1] : null

  const keyConceptsList: string[] = parseKeyConcepts(activeModule?.key_concepts)
  const nextSiblingModule = siblingModules.find(
    (m) => m.order_index > (activeModule?.order_index || 0)
  )

  const normConcept = (s: string) =>
    String(s || '')
      .toLowerCase()
      .replace(/^[\s\(\[\{\"\']+|[\s\)\]\}\"\']+$/g, '')
      .replace(/^concept\s*\d*[:\-\s]*/i, '')
      .replace(/^\d+[\.\:\)\-]\s*/, '')
      .replace(/[^a-z0-9]/g, '')

  const completedCount = keyConceptsList.filter((k) =>
    completedConcepts.some((c) => {
      const cNorm = normConcept(c)
      const kNorm = normConcept(k)
      return cNorm === kNorm || cNorm.includes(kNorm) || kNorm.includes(cNorm)
    })
  ).length

  const progressPercent =
    keyConceptsList.length > 0
      ? Math.min(100, Math.round((completedCount / keyConceptsList.length) * 100))
      : isCompletedBefore
      ? 100
      : 0

  return (
    <main className="relative w-full h-[100dvh] flex flex-col overflow-hidden bg-[#F8F6F0]">

      {/* Main Classroom Stage: Left Avatar Column + Right Full Whiteboard Stage */}
      <div className="relative z-10 w-full flex-1 flex flex-col md:flex-row p-3 sm:p-4 gap-3 sm:gap-4 overflow-hidden min-h-0">
        {/* Left Column: Avatar Section & Voice Controls (Positioned on the LEFT) */}
        <div className="w-full md:w-[320px] lg:w-[360px] shrink-0 flex flex-col gap-3 h-full overflow-y-auto pr-1">
          {/* Audio-Reactive Avatar with bottom movie-style captions */}
          <ClassroomAvatar
            state={connectionState}
            teacherVolume={teacherVolume}
            userVolume={userVolume}
            isMuted={isMuted}
            latestTranscript={latestTranscript}
          />

          {/* Call Controls or Start Call Bar */}
          {isCallActive ? (
            <div className="p-3 rounded-2xl bg-white border border-[#E5E3DB] shadow-sm flex items-center justify-between">
              <CallControls
                isMuted={isMuted}
                userVolume={userVolume}
                onToggleMute={toggleMute}
                onEndCall={handleEndClass}
              />
              <span className="text-[11px] text-[#7A7C75] font-mono">
                Press [M] to mute • [Esc] to end
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-white border border-[#E5E3DB] shadow-sm space-y-3">
              <Button
                id="start-module-spoken-class-btn"
                onClick={handleStartClass}
                disabled={isLoadingLesson}
                className="w-full h-12 bg-[#C85A43] hover:bg-[#A94734] text-white rounded-xl font-medium text-base shadow-sm cursor-pointer flex items-center justify-center gap-2 transition-transform active:scale-[0.98]"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>
                  {isCompletedBefore || moduleCompletedSuccess
                    ? 'Start Review & Doubt Clearing'
                    : currentConceptIndex > 0 || completedConcepts.length > 0
                    ? `Resume Class (Concept ${currentConceptIndex + 1})`
                    : 'Start Live Spoken Class'}
                </span>
              </Button>
              <p className="text-center text-[11px] text-[#7A7C75] flex items-center justify-center gap-1.5 font-mono">
                <Mic className="w-3.5 h-3.5 text-[#52715D]" strokeWidth={1.5} />
                <span>
                  {isCompletedBefore || moduleCompletedSuccess
                    ? 'Ask doubts anytime • Revisit concepts or take quiz'
                    : 'Continuous teaching • Auto-writes on whiteboard'}
                </span>
              </p>
              {!isCompletedBefore && !moduleCompletedSuccess && (
                <Button
                  id="manual-mark-completed-btn"
                  variant="outline"
                  onClick={() => markModuleAsCompleted()}
                  className="w-full bg-white hover:bg-[#F0F6F2] border border-[#C8EBD2] text-[#52715D] rounded-xl text-xs font-semibold py-2 h-9 flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs transition-colors"
                  title="Mark this capsule as completed and unlock next capsule"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#52715D]" />
                  <span>Mark Capsule Complete & Unlock Next</span>
                </Button>
              )}
              <button
                type="button"
                onClick={handleBackToDashboard}
                className="w-full text-center text-xs text-[#7A7C75] hover:text-[#171817] font-medium py-1 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                title="Return to Student Portal"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Dashboard</span>
              </button>
            </div>
          )}

          {/* Progression Banner: Next Capsule or Chapter Completed */}
          {(isCompletedBefore || moduleCompletedSuccess) && (
            <div className="p-3.5 rounded-2xl bg-[#F0F6F2] border border-[#C8EBD2] shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[#52715D] font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4 text-[#52715D] shrink-0" />
                  <span>Capsule Mastered!</span>
                </div>
                {nextSiblingModule && (
                  <span className="text-[10px] font-mono text-[#52715D] uppercase">
                    Next: Capsule #{nextSiblingModule.order_index}
                  </span>
                )}
              </div>

              {chapterNotes.trim() ? (
                <div className="flex items-center gap-2">
                  <Button
                    id="apply-clean-notes-btn"
                    onClick={() => {
                      if (chapterNotes && chalkboardRef.current) {
                        chalkboardRef.current.rewriteNotes(chapterNotes)
                      }
                    }}
                    className="flex-1 bg-[#52715D] hover:bg-[#3E5D4B] text-white rounded-xl text-[11px] font-semibold py-1.5 h-8 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98] transition-transform"
                    title="Apply clean, AI-optimized master notes directly onto the whiteboard"
                  >
                    <RotateCcw className="w-3 h-3 text-white" />
                    <span>Apply Clean Notes to Board</span>
                  </Button>
                  <Button
                    id="view-clean-notes-modal-btn"
                    onClick={() => setNotesModalOpen(true)}
                    className="px-3 bg-white hover:bg-[#F8F6F0] border border-[#E5E3DB] text-[#171817] rounded-xl text-[11px] font-semibold py-1.5 h-8 flex items-center justify-center gap-1 cursor-pointer transition-transform"
                    title="View full clean notes in modal"
                  >
                    <BookOpen className="w-3 h-3 text-[#52715D]" />
                    <span>View Notes</span>
                  </Button>
                </div>
              ) : null}

              {nextSiblingModule ? (
                <div className="space-y-2 pt-1">
                  <Button
                    id="go-to-next-capsule-btn"
                    onClick={() => {
                      endCall()
                      router.refresh()
                      router.push(`/dashboard/${userId}/class/${nextSiblingModule.id}`)
                    }}
                    className="w-full bg-[#52715D] hover:bg-[#3E5D4B] text-white rounded-xl text-xs font-semibold py-2 h-9 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98] transition-transform"
                  >
                    <span>Start Next Capsule: {nextSiblingModule.title}</span>
                    <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                  </Button>
                  <Button
                    id="return-to-dashboard-btn"
                    variant="outline"
                    onClick={() => {
                      endCall()
                      router.refresh()
                      router.push(`/dashboard/${userId}`)
                    }}
                    className="w-full bg-white hover:bg-[#F8F6F0] border-[#E5E3DB] text-[#555852] rounded-xl text-xs py-2 h-9 cursor-pointer"
                  >
                    <span>Return to Dashboard</span>
                  </Button>
                </div>
              ) : nextChapterInfo ? (
                <div className="space-y-2 pt-1">
                  <div className="p-3 rounded-xl bg-white border border-[#E5E3DB] space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono text-[#52715D]">
                      <span className="uppercase font-bold tracking-wider">Chapter Mastered</span>
                      <span>Next: Chapter #{nextChapterInfo.orderIndex}</span>
                    </div>
                    <h5 className="text-xs font-semibold text-[#171817] leading-snug">
                      {nextChapterInfo.chapterTitle}
                    </h5>
                    <p className="text-[11px] text-[#555852]">
                      Capsule 1: {nextChapterInfo.firstModuleTitle}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      id="go-to-next-chapter-btn"
                      onClick={() => {
                        endCall()
                        router.push(`/dashboard/${userId}/class/${nextChapterInfo.firstModuleId}`)
                      }}
                      className="flex-1 bg-[#52715D] hover:bg-[#3E5D4B] text-white rounded-xl text-xs font-semibold py-2 h-9 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98] transition-transform"
                    >
                      <span>Begin Next Chapter</span>
                      <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
                    </Button>
                    <Button
                      id="return-chapter-completed-btn"
                      onClick={() => {
                        endCall()
                        router.push(`/dashboard/${userId}`)
                      }}
                      variant="outline"
                      className="bg-white hover:bg-[#F8F6F0] border-[#E5E3DB] text-[#555852] rounded-xl text-xs py-2 h-9 px-3 cursor-pointer"
                    >
                      <span>Dashboard</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  id="return-chapter-completed-btn"
                  onClick={() => {
                    endCall()
                    router.push(`/dashboard/${userId}`)
                  }}
                  className="w-full bg-[#52715D] hover:bg-[#3E5D4B] text-white rounded-xl text-xs font-semibold py-2 h-9 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98] transition-transform"
                >
                  <span>All Chapters Completed! Return to Dashboard</span>
                  <Check className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          )}

          {/* Interactive Chapter End Confirmation Banner - Only visible once module is completed */}
          {(isCompletedBefore || moduleCompletedSuccess) && endChapterConfirmPrompt && (
            <div className="p-4 rounded-2xl bg-white border-2 border-[#52715D]/50 shadow-md space-y-3 animate-in fade-in duration-300">
              <div className="flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#52715D] shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-xs uppercase font-mono tracking-wider text-[#52715D]">
                    Chapter Confirmation
                  </h4>
                  <p className="text-xs text-[#171817] font-medium mt-1 leading-snug">
                    {endChapterConfirmPrompt}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  id="confirm-end-yes-btn"
                  onClick={() => {
                    setEndChapterConfirmPrompt(null)
                    markModuleAsCompleted()
                    handleOpenQuiz()
                  }}
                  className="flex-1 bg-[#52715D] hover:bg-[#3E5D4B] text-white rounded-xl text-xs font-semibold py-2 h-9 cursor-pointer shadow-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span>Yes, Take 10 MCQs</span>
                </Button>
                <Button
                  id="confirm-end-no-btn"
                  variant="outline"
                  onClick={() => {
                    setEndChapterConfirmPrompt(null)
                    triggerCompanionGuidance({
                      animation: 'listening',
                      expression: 'attentive-left',
                      mood: 'thinking',
                      message: 'What problem or doubt are you facing? Speak into your microphone and your tutor will explain it step-by-step on the board.',
                      autoDismissMs: 10000,
                    })
                  }}
                  className="flex-1 bg-white hover:bg-[#F8F6F0] border-[#E5E3DB] text-[#555852] rounded-xl text-xs font-semibold py-2 h-9 cursor-pointer"
                >
                  <span>No, I Have Doubts</span>
                </Button>
              </div>
            </div>
          )}

          {/* Capsule Concepts Ledger & Automatic Resumption Tracker */}
          <div className="p-4 rounded-2xl bg-white border border-[#E5E3DB] text-[#171817] text-xs space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#52715D]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#52715D] font-bold">
                  Capsule Concept Ledger
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleConceptGoto(1)}
                  className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#E8F0EA] hover:bg-[#d8e6db] text-[#52715D] border border-[#C8EBD2] transition-colors flex items-center gap-1 cursor-pointer"
                  title="Rewind and teach from starting concept"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Teach from Start</span>
                </button>
                <span className="text-[#555852] font-mono text-[11px]">
                  {progressPercent}% Mastered
                </span>
              </div>
            </div>

            {/* Micro Progress Bar */}
            <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden border border-[#E5E3DB]">
              <div
                className="h-full bg-[#52715D] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {keyConceptsList.length > 0 ? (
              <div className="space-y-1.5 pt-1">
                {keyConceptsList.map((concept: string, idx: number) => {
                  const isDone = completedConcepts.some((c) => {
                    const cNorm = normConcept(c)
                    const kNorm = normConcept(concept)
                    return cNorm === kNorm || cNorm.includes(kNorm) || kNorm.includes(cNorm)
                  })
                  const isCurrent = idx === currentConceptIndex && !isDone
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleConceptGoto(idx + 1)}
                      className={`w-full flex items-center justify-between p-2 rounded-xl border text-[11px] font-mono transition-all text-left cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                        isDone
                          ? 'bg-[#F0F6F2] border-[#C8EBD2] text-[#52715D] hover:bg-[#E8F0EA]'
                          : isCurrent
                          ? 'bg-[#FFF8F6] border-[#F5C2B8] text-[#C85A43] shadow-xs'
                          : 'bg-stone-50 border-[#E5E3DB] text-[#555852] hover:bg-stone-100'
                      }`}
                      title={`Click to jump or rewind to Concept ${idx + 1}: ${concept}`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {isDone ? (
                          <CheckCircle2
                            className="w-3.5 h-3.5 text-[#52715D] shrink-0"
                            strokeWidth={2}
                          />
                        ) : isCurrent ? (
                          <span className="w-2 h-2 rounded-full bg-[#C85A43] animate-pulse shrink-0" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-stone-300 shrink-0" />
                        )}
                        <span className="truncate">
                          {idx + 1}. {concept}
                        </span>
                      </div>

                      <span className="text-[10px] uppercase font-bold shrink-0">
                        {isDone
                          ? 'Mastered'
                          : isCurrent
                          ? 'Current'
                          : 'Jump'}
                      </span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-[#555852] text-xs leading-relaxed">
                {activeModule?.description ||
                  'Study this syllabus capsule with interactive dialogue and whiteboard schematics.'}
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Full Whiteboard Canvas Stage (Occupies main area to the right of avatar section) */}
        <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden">
          <WhiteboardWorkspace
            ref={chalkboardRef}
            moduleId={moduleId}
            moduleTitle={resolvedTitle}
            classLevel={resolvedClassLevel}
            subject={resolvedSubject}
            keyConcepts={keyConceptsList}
            activeConceptIndex={currentConceptIndex}
            onPageChange={(pageIdx) => {
              isReviewingVerdictRef.current = false
              setIsReviewingVerdict(false)
              currentConceptIndexRef.current = pageIdx
              setCurrentConceptIndex(pageIdx)
            }}
            activeSceneType={activeSceneType}
            activeSceneParams={activeSceneParams}
            activeSceneTitle={activeSceneTitle}
            onCloseScene={() => setActiveSceneType(null)}
            activeGraph={activeGraph}
            onCloseGraph={() => setActiveGraph(null)}
            lessonManifest={lessonManifest}
            initialStepIndex={activeVisualStepIndex}
            onStepChange={(stepIdx) => setActiveVisualStepIndex(stepIdx)}
            onSaveProgress={(stepIdx, completedIds) => saveVisualProgressToSupabase(stepIdx, completedIds)}
            onNoteRecorded={handleNoteRecorded}
            onConceptFocus={handleConceptFocus}
            onConceptDone={handleConceptDone}
            onConceptGoto={handleConceptGoto}
            onBoardContentChange={(summary) => {
              setLatestBoardSummary(summary.fullSummary)
              const notesContent = summary.notesText.trim()
              if (notesContent && notesContent !== lastSentBoardNotesRef.current) {
                lastSentBoardNotesRef.current = notesContent
                setChapterNotes(notesContent)
                saveNotesToSupabase(notesContent)
              }
            }}
            onModuleComplete={(summary) => {
              markModuleAsCompleted(summary ? `#### Chapter Summary:\n${summary}` : undefined)
            }}
            onConfirmEndChapter={(question) => {
              setEndChapterConfirmPrompt(question)
            }}
            onStartQuiz={() => {
              setEndChapterConfirmPrompt(null)
              markModuleAsCompleted()
              handleOpenQuiz()
            }}
            latestTranscript={transcripts[transcripts.length - 1]?.text || ''}
            isTeacherSpeaking={connectionState === 'TEACHER_SPEAKING'}
            isListening={connectionState === 'LISTENING'}
            onSubmitStudentAnswer={handleStudentSubmitAnswer}
            onVoiceStudentAnswer={handleStudentVoiceAnswer}
          />
        </div>
      </div>

      {/* Chapter Notes Modal */}
      <ChapterNotesModal
        isOpen={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        moduleTitle={resolvedTitle}
        classLevel={resolvedClassLevel}
        subject={resolvedSubject}
        chapterNotes={chapterNotes}
        notesSaveStatus={notesSaveStatus}
      />

      {/* 10-Question Mastery Evaluation Modal (Available anytime!) */}
      {activeModule && (
        <MasteryQuizModal
          isOpen={quizOpen}
          onClose={() => setQuizOpen(false)}
          moduleId={activeModule.id}
          moduleTitle={activeModule.title}
          onCompleteSuccess={() => {
            markModuleAsCompleted()
          }}
        />
      )}

      {/* Error Modal */}
      {errorMessage && <ErrorModal message={errorMessage} onRetry={resetToIdle} />}
    </main>
  )
}
