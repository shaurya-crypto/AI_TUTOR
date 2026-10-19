'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useGeminiLive } from '@/hooks/useGeminiLive'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { ClassroomAvatar } from '@/components/classroom/ClassroomAvatar'
import { WhiteboardWorkspace } from '@/components/whiteboard/WhiteboardWorkspace'
import { GreenChalkboardRef } from '@/components/whiteboard/GreenChalkboard'
import { VisualizationSceneType } from '@/components/whiteboard/scenes/sceneTypes'
import { resolveSceneType, parseSceneParams } from '@/components/whiteboard/scenes/sceneRegistry'
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
  Zap,
  Play,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Award,
  GraduationCap,
  Layers,
  Sparkles,
  FileText,
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
  } = useGeminiLive()

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
  const autoVisualTimerRef = useRef<NodeJS.Timeout | null>(null)

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
          .select('class_level, preferred_teacher_voice')
          .eq('id', userId)
          .single()

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
            setCompletedConcepts(parseKeyConcepts(progress.completed_concepts))
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

      // Check for [CONCEPT_DONE: ...] or [CONCEPT_DONE]
      const doneMatches = Array.from(latest.text.matchAll(/\[(?:CONCEPT_DONE|CONCEPT_MASTERED|MASTERED)(?::\s*([^\]]*))?\]/gi))
      for (const dm of doneMatches) {
        const tag = dm[0]
        const key = `${transcriptId}:${tag}`
        if (!executedSceneDirectivesRef.current.has(key)) {
          executedSceneDirectivesRef.current.add(key)
          handleConceptDone(dm[1] || '')
        }
      }

      // Check for [CONCEPT_FOCUS: ...] or [FOCUS: ...]
      const focusMatches = Array.from(latest.text.matchAll(/\[(?:CONCEPT_FOCUS|FOCUS):\s*([^\]]+)\]/gi))
      for (const fm of focusMatches) {
        const tag = fm[0]
        const key = `${transcriptId}:${tag}`
        if (!executedSceneDirectivesRef.current.has(key)) {
          executedSceneDirectivesRef.current.add(key)
          handleConceptFocus(fm[1] || '')
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
        if (step.type === 'IMAGE' && step.content.image) {
          chalkboardRef.current?.drawImageCard?.(step.title, step.content.image.caption, step.content.image.attribution)
        } else if (step.type === 'VIDEO' && step.content.video) {
          chalkboardRef.current?.drawVideoCard?.(step.title, step.content.video.description)
        } else if (step.type === 'GRAPH') {
          chalkboardRef.current?.drawGraph(step.content.graph?.title || 'linear')
        } else if (step.type === 'DIAGRAM') {
          chalkboardRef.current?.handleAiDirective(`[DIAGRAM: ${step.title}]`)
        }
      } else if (params.title) {
        chalkboardRef.current?.drawImageCard?.(params.title, params.caption, params.attribution)
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
      } else if (directive.chalkboardAction === 'draw_image' && directive.chalkboardContent) {
        const parts = directive.chalkboardContent.split('|').map((s) => s.trim())
        chalkboardRef.current.drawImageCard?.(
          parts[0] || 'Textbook Diagram',
          parts[1] || '',
          parts[2] || 'NCERT Standard'
        )
      } else if (directive.chalkboardAction === 'draw_video' && directive.chalkboardContent) {
        const parts = directive.chalkboardContent.split('|').map((s) => s.trim())
        chalkboardRef.current.drawVideoCard?.(
          parts[0] || 'Demonstration',
          parts[1] || ''
        )
      } else if (directive.chalkboardAction === 'draw_table' && directive.chalkboardContent) {
        chalkboardRef.current.drawTable?.(directive.chalkboardContent)
      } else if (directive.chalkboardAction === 'draw_flowchart' && directive.chalkboardContent) {
        chalkboardRef.current.drawFlowchart(directive.chalkboardContent)
      } else if (
        (directive.chalkboardAction === 'draw_numerical' || directive.chalkboardAction === 'numerical') &&
        directive.chalkboardContent
      ) {
        chalkboardRef.current.handleAiDirective(`[NUMERICAL: ${directive.chalkboardContent}]`)
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

  // 6. Concept Tracking Callbacks: auto-save progress and resume state
  const handleConceptFocus = (conceptName: string) => {
    const keyConcepts: string[] = parseKeyConcepts(activeModule?.key_concepts)
    if (keyConcepts.length === 0) return

    const norm = (s: string) =>
      String(s || '')
        .toLowerCase()
        .replace(/^[\s\(\[\{\"\']+|[\s\)\]\}\"\']+$/g, '')
        .replace(/^concept\s*\d*[:\-\s]*/i, '')
        .replace(/^\d+[\.\:\)\-]\s*/, '')
        .replace(/[^a-z0-9]/g, '')

    const targetNorm = norm(conceptName)

    let targetIdx = -1
    const numMatch = String(conceptName || '').match(/\b(\d+)\b/)
    if (numMatch) {
      const parsedNum = parseInt(numMatch[1], 10)
      if (parsedNum >= 1 && parsedNum <= keyConcepts.length) {
        targetIdx = parsedNum - 1
      }
    }

    if (targetIdx === -1 && targetNorm) {
      targetIdx = keyConcepts.findIndex((c) => {
        const cNorm = norm(c)
        return (
          cNorm === targetNorm ||
          cNorm.includes(targetNorm) ||
          targetNorm.includes(cNorm)
        )
      })
    }

    if (targetIdx === -1) {
      targetIdx = currentConceptIndex
    }

    const canonicalConcept = keyConcepts[targetIdx] || conceptName

    // If tutor advances to concept N (e.g. Concept 2), all prior concepts (0..N-1) are completed
    let updatedCompleted: string[] = []
    setCompletedConcepts((prev) => {
      let updated = [...prev]
      for (let i = 0; i < targetIdx; i++) {
        const prevConcept = keyConcepts[i]
        if (prevConcept && !updated.some((u) => norm(u) === norm(prevConcept))) {
          updated.push(prevConcept)
        }
      }
      updatedCompleted = updated
      return updated
    })

    currentConceptIndexRef.current = targetIdx
    setCurrentConceptIndex(targetIdx)
    setLastCoveredConcept(canonicalConcept)

    // Whiteboard 1-Concept-Per-Page: Dedicated page per concept (0 -> Page 1, 1 -> Page 2...)
    chalkboardRef.current?.goToPage?.(targetIdx)

    autoTriggerVisualForConcept(targetIdx)

    const supabase = createClient()
    supabase
      .from('user_progress')
      .upsert(
        {
          user_id: userId,
          syllabus_module_id: moduleId,
          current_concept_index: targetIdx,
          completed_concepts: updatedCompleted,
          last_covered_concept: canonicalConcept,
          status: isCompletedBefore || moduleCompletedSuccess ? 'completed' : 'in_progress',
        },
        { onConflict: 'user_id,syllabus_module_id' }
      )
      .then(({ error }) => {
        if (error) console.error('Failed to persist concept focus:', error)
      })
  }

  const handleConceptDone = (conceptName: string) => {
    const keyConcepts: string[] = parseKeyConcepts(activeModule?.key_concepts)
    if (keyConcepts.length === 0) return

    const norm = (s: string) =>
      String(s || '')
        .toLowerCase()
        .replace(/^[\s\(\[\{\"\']+|[\s\)\]\}\"\']+$/g, '')
        .replace(/^concept\s*\d*[:\-\s]*/i, '')
        .replace(/^\d+[\.\:\)\-]\s*/, '')
        .replace(/[^a-z0-9]/g, '')

    const targetNorm = norm(conceptName)

    let matchedIdx = -1
    const numMatch = String(conceptName || '').match(/\b(\d+)\b/)
    if (numMatch) {
      const parsedNum = parseInt(numMatch[1], 10)
      if (parsedNum >= 1 && parsedNum <= keyConcepts.length) {
        matchedIdx = parsedNum - 1
      }
    }

    if (matchedIdx === -1 && targetNorm) {
      matchedIdx = keyConcepts.findIndex((c) => {
        const cNorm = norm(c)
        return (
          cNorm === targetNorm ||
          cNorm.includes(targetNorm) ||
          targetNorm.includes(cNorm)
        )
      })
    }

    if (matchedIdx === -1) {
      matchedIdx = currentConceptIndex
    }

    const canonicalConcept = keyConcepts[matchedIdx] || keyConcepts[currentConceptIndex]
    if (!canonicalConcept) return

    setCompletedConcepts((prev) => {
      const alreadyDone = prev.some((p) => norm(p) === norm(canonicalConcept))
      const updated = alreadyDone ? prev : [...prev, canonicalConcept]

      const nextIdx = Math.min(
        matchedIdx + 1,
        Math.max(0, keyConcepts.length - 1)
      )
      currentConceptIndexRef.current = nextIdx
      setCurrentConceptIndex(nextIdx)
      setLastCoveredConcept(canonicalConcept)

      if (nextIdx > matchedIdx && nextIdx < keyConcepts.length) {
        // Whiteboard 1-Concept-Per-Page: Advance to next concept's page
        chalkboardRef.current?.goToPage?.(nextIdx)
        setTimeout(() => {
          autoTriggerVisualForConcept(nextIdx)
        }, 800)
      }

      const isAllDone = keyConcepts.length > 0 && updated.length >= keyConcepts.length

      const supabase = createClient()
      supabase
        .from('user_progress')
        .upsert(
          {
            user_id: userId,
            syllabus_module_id: moduleId,
            current_concept_index: nextIdx,
            completed_concepts: updated,
            last_covered_concept: canonicalConcept,
            status: isCompletedBefore || isAllDone ? 'completed' : 'in_progress',
            ...(isAllDone ? { completed_at: new Date().toISOString() } : {}),
          },
          { onConflict: 'user_id,syllabus_module_id' }
        )
        .then(({ error }) => {
          if (error) console.error('Failed to persist completed concept:', error)
        })

      if (isAllDone && !isCompletedBefore && !isMarkingCompleteRef.current) {
        markModuleAsCompleted()
      }

      return updated
    })
  }

  // 7. Rewind / Concept Jump Navigation (Bidirectional sync with Supabase and UI)
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

    currentConceptIndexRef.current = targetIdx
    setCurrentConceptIndex(targetIdx)
    setCompletedConcepts(newCompleted)
    setLastCoveredConcept(targetConceptName)
    setIsCompletedBefore(false)
    setModuleCompletedSuccess(false)

    // Whiteboard 1-Concept-Per-Page: Switch to concept's dedicated page
    chalkboardRef.current?.goToPage?.(targetIdx)

    // Trigger visual for target concept only if not already rendered to prevent overlapping
    if (!renderedVisualConceptsRef.current.has(targetIdx)) {
      autoTriggerVisualForConcept(targetIdx)
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
        handleOpenQuiz()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isCallActive, toggleMute])

  // Automatic visual guarantee: ensures the active concept always displays its rich visual without waiting for student prompt
  useEffect(() => {
    if (isCallActive && (connectionState === 'TEACHER_SPEAKING' || connectionState === 'LISTENING')) {
      if (!renderedVisualConceptsRef.current.has(currentConceptIndex)) {
        if (autoVisualTimerRef.current) clearTimeout(autoVisualTimerRef.current)
        autoVisualTimerRef.current = setTimeout(() => {
          autoTriggerVisualForConcept(currentConceptIndex)
        }, 1200)
      }
    }
    return () => {
      if (autoVisualTimerRef.current) clearTimeout(autoVisualTimerRef.current)
    }
  }, [isCallActive, connectionState, currentConceptIndex, activeModule, resolvedSubject, resolvedTitle])

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

    const kickoffPrompt = isCompletedModule
      ? `Hello Teacher! I have completed this capsule. Please review the key takeaways on the whiteboard, and ask if I have any questions before the quiz.`
      : isResumed
      ? `Hello Teacher! I am back. Please teach Concept ${currentConceptIndex + 1}: "${currentConcept}". Greet me in 4-6 words, explain the everyday intuition in 3-4 sentences, write key notes on the whiteboard, show the visual diagram, and ask me a checkpoint question.`
      : `Hello Teacher! Please start our class now on Concept 1: "${firstConcept}". Greet me in 4-6 words, explain the everyday intuition in 3-4 sentences, write key notes on the whiteboard, show the visual diagram, and ask me a checkpoint question.`

    const lessonPrompt = `ROLE: Senior Academic Topper Tutor (1-on-1 spoken class with live whiteboard).
STUDENT: ${resolvedClassLevel || 'Class 10'} (${resolvedBoard || 'CBSE'}) | Subject: ${resolvedSubject} (${subjectDirective}) | Capsule: "${resolvedTitle}"${
  isLastCapsuleOfChapter && nextChapterInfo
    ? ` | Final Capsule (Next: #${nextChapterInfo.orderIndex} "${nextChapterInfo.chapterTitle}")`
    : ''
}

CADENCE & TURN PROTOCOL (STRICT):
1. Socratic Turn Length: Speak 3 to 4 sentences per turn explaining the concept with tangible real-world intuition.
2. MANDATORY DUAL-OUTPUT (NOTES + VISUALIZATION): In EVERY turn introducing or explaining a concept, you MUST execute BOTH:
   a) Multi-Color Notes: write_chalkboard(action="draw_note", content="...", color="botanical"|"coral"|"blue"|"amber"|"purple"|"primary"), action="draw_step", or action="draw_highlight_box".
   AND
   b) VISUALIZATION (MANDATORY ON EVERY CONCEPT): In Turn 1 of introducing each concept, you MUST immediately call its mapped visual tool from the VISUAL ROADMAP below (image, video, graph, flowchart, 3D simulation, diagram, geometry, table, or numerical). The student must SEE the visual representation while you speak! DO NOT wait for the student to ask.
3. Whiteboard 1-Concept-Per-Page: Each concept has its dedicated whiteboard page (Page 1 = Concept 1, Page 2 = Concept 2...). The concept title is automatically placed at the top of that page. DO NOT write the concept title, "Key Concept:", or "Focus:" on the board.
4. MULTI-COLOR CHALK PALETTE (COLOR-CODED WHITEBOARD NOTES):
   - color="botanical": Core definitions, biological organs/structures, fundamental scientific principles.
   - color="coral": Key laws, equations, mathematical formulas, critical exam pitfalls.
   - color="blue": Numbered derivation steps, calculation steps, procedural mechanisms.
   - color="amber": SI units, key highlights, constants, exam cautions.
   - color="purple": Scientific terminology, chemical names, organelle vocabulary.
   - color="primary": General explanations, bullet points, standard observations.
   Use different colors for different notes and steps on each page!
5. SPEECH PURITY & SILENT EXECUTION (DO NOT SPEAK CODE):
   - You MUST call write_chalkboard, execute_visual_action, and other tools as silent function calls.
   - NEVER speak code, function names, action names, or syntax (e.g. NEVER utter "write_chalkboard", "draw_note", "action=", "color=", or "concept_done").
   - Spoken audio must ONLY contain natural, warm human explanations and questions directed to the student.
6. Turn-Ending Question (Hard Stop): End EVERY turn with a general question about the topic to check understanding. STOP speaking immediately at the question mark ('?'). You MUST pause and wait for the student.
7. CONCEPT MASTERY VERIFICATION & ADVANCEMENT (CRITICAL FOR CONCEPT LEDGER):
   - At the end of explaining a concept, ask a verification checkpoint question to check understanding.
   - WHEN THE STUDENT REPLIES OR ANSWERS:
     a) If their answer is correct or shows understanding: Praise them briefly (3-5 words, e.g. "Spot on!", "Exactly right!"), and IMMEDIATELY execute:
        1. write_chalkboard(action="concept_done", content="<Current Concept Name>") -> Marks concept Mastered in the Capsule Concept Ledger. DO NOT write "Mastered" or "Concept Done" on the whiteboard.
        2. write_chalkboard(action="concept_focus", content="<Next Concept Name>") -> Advances whiteboard page and ledger focus to the next concept.
     b) Then immediately teach the next concept (3-4 sentences + write notes + execute mapped visual tool from the roadmap)!
     c) If their answer is hesitant or wrong: Gently guide them with a simple analogy, clarify their doubt, and ask a simpler follow-up question.
     d) If all concepts in the CURRICULUM are completed, call: conclude_and_open_quiz(summary="...")

TOOL PROTOCOL (ACTIVE SUITE OF SEMANTIC TOOLS - INVOKE DIRECTLY):
1. plot_mathematical_graph(formula, domain?, range?, title?, callout?, points?)
   - Plots function curves directly on the whiteboard canvas.
   - Examples: formula="2x + 1", formula="x^2 - 4", formula="sin(x)", formula="velocity-time"
2. open_interactive_simulation(sceneType, parameters?)
   - Summons 3D WebGL physics, chemistry, or math simulation container directly on the whiteboard.
   - Scenes: circuits | forces | optics | matter | waves | geometry | linear_graph | 3d_vectors | bohr_atom
   - Parameters: { voltage: 12, circuitType: "parallel", shape: "cylinder", radius: 3, height: 6, ... }
3. show_educational_media(mediaType, title, caption, attribution?)
   - Renders authentic textbook illustration cards or practical lab video cards.
   - mediaType: "image" | "video"
4. solve_step_by_step_numerical(problem?, given?, formula?, substitution?, calculation?, answer, unit?)
   - Renders complete board exam numerical solution with scratchpad rough work and boxed final answer.
5. conclude_and_open_quiz(summary)
   - Writes chapter synthesis summary on chalkboard and transitions to 10-MCQ evaluation.
6. write_chalkboard(action, content, color?)
   - Comprehensive whiteboard control:
     * action="draw_note", content="Core rule or definition", color="botanical"|"coral"|"amber"|"blue"|"purple"|"white"
     * action="draw_highlight_box", content="Formula or Law", color="coral"|"amber"|"botanical"
     * action="draw_step", content="Derivation step", color="white"|"blue"|"amber"
     * action="set_color", color="botanical"|"coral"|"amber"|"blue"|"purple"|"white"
     * action="draw_diagram", content="forces | pressure | magnet | cell | optics | atom | matter | photosynthesis | series | parallel"
     * action="draw_geometry", content="triangle right | circle | cylinder | cone | sphere | polygon"
     * action="draw_table", content="Header 1 | Header 2 || Row 1A | Row 1B || Row 2A | Row 2B"
     * action="draw_flowchart", content="Step 1 -> Step 2 -> Step 3", color="botanical"|"blue"
     * action="draw_image", content="Title | Caption | NCERT Standard"
     * action="draw_video", content="Title | Description"
     * action="draw_graph", content="formula=... | domain=... | title=..."
     * action="draw_rough_work", content="scratch calculation", color="white"|"amber"|"blue"
     * action="clear_rough" -> Erase scratch calculations
     * action="clear_notes" -> Clear notes column
     * action="new_page" -> Add a new whiteboard page when current page fills
     * action="draw_question", content="Question text", color="coral"|"amber"
     * action="concept_focus", content="Concept Name" -> Switch current active concept focus and advance page
     * action="concept_done", content="Concept Name" -> Mark mastered in ledger (do not write on board)
7. execute_visual_action(action, parameters):
   * action="SHOW_SCENE", parameters={ sceneType: "...", ...params }
   * action="UPDATE_SCENE", parameters={ ...params }
   * action="CLOSE_SCENE"
   * action="SHOW_MEDIA", parameters={ stepIndex: 0 }

STATUS: ${
  isCompletedModule
    ? `Review Mode. Greet in 4-6 words, write key points on the board in varied colors, and ask if doubts exist or proceed to 10-MCQ eval.`
    : isResumed
    ? `Resume Concept #${currentConceptIndex + 1}: "${currentConcept}". Greet in 4-6 words, explain intuition in 3-4 sentences, write structured notes on the board using varied colors, show the visual diagram, and end with a question. When student answers correctly, silently call write_chalkboard with action="concept_done" and content="${currentConcept}" then action="concept_focus" and content="${nextConcept}" to advance.`
    : `Start Concept #1: "${firstConcept}". Greet in 4-6 words, explain intuition in 3-4 sentences, write structured notes on the board using varied colors, show the visual diagram, and end with a question. When student answers correctly, silently call write_chalkboard with action="concept_done" and content="${firstConcept}" then action="concept_focus" and content="${nextConcept}" to advance.`
}

CURRICULUM:
- Concepts: ${keyConcepts.map((c: string, i: number) => `${i + 1}. ${c.replace(/^[\s\(\[\{]+|[\s\)\]\}]+$/g, '').trim()}`).join(' | ')}
${visualRoadmap ? `VISUAL ROADMAP (EXECUTE VISUAL TOOL AUTOMATICALLY IN TURN 1 FOR EACH CONCEPT):\n${visualRoadmap}\n` : ''}${mathProgressionText ? `- ${mathProgressionText}\n` : ''}${workedExamplesText ? `WORKED EXEMPLARS:\n${workedExamplesText}\n` : ''}${misconceptionsText ? `MISCONCEPTIONS: ${misconceptionsText}\n` : ''}${aiContextText ? `PEDAGOGICAL CUES: ${aiContextText}\n` : ''}
RULES: Strictly ZERO emojis. Board is single source of truth for notes. Warm, intellectually rigorous topper tone.`

    // Whiteboard 1-Concept-Per-Page: Ensure active concept page is active
    chalkboardRef.current?.goToPage?.(currentConceptIndex)

    startClass(
      preferredVoice as any,
      lessonPrompt,
      kickoffPrompt,
      (action, content, color) => {
        const isVisualAction = [
          'draw_image', 'image', 'draw_video', 'video',
          'draw_diagram', 'diagram', 'draw_graph', 'graph',
          'draw_geometry', 'geometry', 'draw_table', 'table',
          'draw_flowchart', 'draw_numerical', 'numerical', 'solve', 'worked_example',
          'draw_cell', 'draw_atom', 'draw_optics', 'draw_forces', 'draw_magnet',
          'draw_pressure', 'draw_matter', 'draw_photosynthesis', 'draw_circuit',
          'draw_circuit_series', 'draw_circuit_parallel'
        ].includes(action)
        if (isVisualAction) {
          renderedVisualConceptsRef.current.add(currentConceptIndexRef.current)
        }
        if (chalkboardRef.current) {
          // Whiteboard 1-Concept-Per-Page: Only switch page when concept explicitly changes
          if (['concept_focus', 'concept_goto', 'goto_concept'].includes(action)) {
            chalkboardRef.current.goToPage?.(currentConceptIndexRef.current)
          }

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
          else if (action === 'draw_question') chalkboardRef.current.drawQuestion(content, color)
          else if (action === 'draw_flowchart') chalkboardRef.current.drawFlowchart(content, color)
          else if (action === 'draw_table' || action === 'table') chalkboardRef.current.drawTable?.(content)
          else if (action === 'draw_geometry' || action === 'geometry') chalkboardRef.current.drawGeometry?.(content)
          else if (action === 'draw_graph' || action === 'graph') chalkboardRef.current.drawGraph(content)
          else if (action === 'draw_numerical' || action === 'numerical' || action === 'worked_example' || action === 'solve') {
            if (typeof content === 'object') chalkboardRef.current.drawNumericalSolution?.(content)
            else chalkboardRef.current.handleAiDirective(`[NUMERICAL: ${content}]`)
          }
          else if (action === 'draw_image' || action === 'image') {
            const parts = (content || '').split('|').map((s: string) => s.trim())
            chalkboardRef.current.drawImageCard?.(parts[0] || 'Diagram', parts[1] || '', parts[2] || 'NCERT / Board Standard')
          }
          else if (action === 'draw_video' || action === 'video') {
            const parts = (content || '').split('|').map((s: string) => s.trim())
            chalkboardRef.current.drawVideoCard?.(parts[0] || 'Demonstration', parts[1] || '')
          }
          else if (action === 'draw_cell') chalkboardRef.current.drawCellDiagram()
          else if (action === 'draw_atom') chalkboardRef.current.drawAtomDiagram()
          else if (action === 'draw_optics') chalkboardRef.current.drawOpticsDiagram()
          else if (action === 'draw_forces') chalkboardRef.current.drawForcesDiagram()
          else if (action === 'draw_magnet') chalkboardRef.current.drawMagnetDiagram()
          else if (action === 'draw_pressure') chalkboardRef.current.drawPressureDiagram()
          else if (action === 'draw_matter') chalkboardRef.current.drawStatesOfMatterDiagram()
          else if (action === 'draw_photosynthesis') chalkboardRef.current.drawPhotosynthesisDiagram()
          else if (action === 'draw_circuit' || action === 'draw_circuit_series') chalkboardRef.current.drawCircuitSeries()
          else if (action === 'draw_circuit_parallel') chalkboardRef.current.drawCircuitParallel()
          else if (action === 'new_page') chalkboardRef.current.addNewPage?.()
          else if (action === 'clear_board' || action === 'erase_board') chalkboardRef.current.clearBoard()
          else if (action === 'start_quiz' || action === 'open_quiz') {
            handleOpenQuiz()
          }
          else if (action === 'chapter_summary') {
            chalkboardRef.current.drawTitle('Chapter Synthesis Summary', color)
            chalkboardRef.current.drawNote(content, color)
            handleNoteRecorded(`#### Chapter Summary:\n${content}`)
            markModuleAsCompleted(content)
          }
          else if (action === 'concept_focus') {
            const cleanContent = content.replace(/^[\s\(\[\{]+|[\s\)\]\}]+$/g, '').trim()
            if (cleanContent) {
              handleConceptFocus(cleanContent)
            }
          } else if (action === 'concept_done') {
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

    // Guarantee that visual is triggered on class kickoff without waiting for student to request
    setTimeout(() => {
      autoTriggerVisualForConcept(currentConceptIndex)
    }, 1200)
  }

  const handleOpenQuiz = () => {
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
      {/* Top Classroom Bar */}
      <header className="relative z-30 w-full px-5 py-3 bg-white/95 backdrop-blur-md border-b border-[#E5E3DB] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToDashboard}
            className="rounded-full hover:bg-stone-100 text-[#171817] cursor-pointer active:scale-95 transition-transform"
            title="Return to Student Portal"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </Button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#E8F0EA] border border-[#C8EBD2] flex items-center justify-center text-[#52715D] shadow-xs">
              <GraduationCap className="w-4 h-4 text-[#52715D]" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-[#171817] tracking-tight">
                  {resolvedTitle || 'Spoken Classroom'}
                </span>
                {isCompletedBefore ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#E8F0EA] text-[#52715D] border border-[#C8EBD2] flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3" strokeWidth={2} />
                    <span>Mastered</span>
                  </span>
                ) : currentConceptIndex > 0 ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFF8F6] text-[#C85A43] border border-[#F5C2B8] flex items-center gap-1 font-mono">
                    <Sparkles className="w-3 h-3" />
                    <span>Concept {currentConceptIndex + 1} of {keyConceptsList.length || 1}</span>
                  </span>
                ) : null}
              </div>
              <p className="text-[11px] text-[#7A7C75] font-mono">
                {[resolvedSubject, resolvedClassLevel, `Voice: ${preferredVoice}`]
                  .filter(Boolean)
                  .join(' • ')}
              </p>
            </div>
          </div>
        </div>

        {/* Right Header: Next Capsule / Next Chapter Quick Button, Chapter Notes, Take 10 MCQs, & Connection Status */}
        <div className="flex items-center gap-2.5">
          {(isCompletedBefore || moduleCompletedSuccess) && nextSiblingModule && (
            <Button
              id="header-next-capsule-btn"
              onClick={() => {
                endCall()
                router.push(`/dashboard/${userId}/class/${nextSiblingModule.id}`)
              }}
              className="bg-[#52715D] hover:bg-[#3E5D4B] text-white rounded-xl px-3 py-1.5 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
              title={`Advance to ${nextSiblingModule.title}`}
            >
              <span>Next Capsule</span>
              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </Button>
          )}

          {(isCompletedBefore || moduleCompletedSuccess) && !nextSiblingModule && nextChapterInfo && (
            <Button
              id="header-next-chapter-btn"
              onClick={() => {
                endCall()
                router.push(`/dashboard/${userId}/class/${nextChapterInfo.firstModuleId}`)
              }}
              className="bg-[#52715D] hover:bg-[#3E5D4B] text-white rounded-xl px-3 py-1.5 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
              title={`Advance to Chapter ${nextChapterInfo.orderIndex}: ${nextChapterInfo.chapterTitle}`}
            >
              <span>Next Chapter</span>
              <ArrowLeft className="w-3.5 h-3.5 rotate-180" />
            </Button>
          )}

          {/* Chapter Notes Button */}
          <Button
            id="view-chapter-notes-btn"
            variant="outline"
            size="sm"
            onClick={() => setNotesModalOpen(true)}
            className="bg-white hover:bg-[#F8F6F0] border-[#E5E3DB] text-[#171817] rounded-xl px-3 py-1.5 text-xs font-semibold shadow-xs flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95"
            title="View Compiled Chapter Notes"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#52715D]" strokeWidth={1.5} />
            <span>Chapter Notes</span>
            {chapterNotes.trim().length > 0 && (
              <span className="w-2 h-2 rounded-full bg-[#52715D] animate-pulse" />
            )}
          </Button>

          {/* Direct 10-MCQ Mastery Button */}
          <Button
            id="open-mastery-quiz-btn"
            onClick={handleOpenQuiz}
            className="bg-[#C85A43] hover:bg-[#A94734] text-white rounded-xl px-3.5 py-1.5 text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
            title="Take 10 MCQs to test mastery anytime"
          >
            <Award className="w-4 h-4 text-white" strokeWidth={1.5} />
            <span>Take 10 MCQs</span>
          </Button>

          <ConnectionStatus state={connectionState} />
        </div>
      </header>

      {/* Main Classroom Stage: 2-Column Split */}
      <div className="relative z-10 w-full flex-1 flex flex-col md:flex-row p-4 gap-4 overflow-hidden">
        {/* Left Column: Avatar, Live Captions, Controls & Module Capsule */}
        <div className="w-full md:w-[380px] lg:w-[420px] flex flex-col justify-between gap-3 h-full overflow-y-auto pr-1">
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
                onEndCall={handleOpenQuiz}
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

          {/* Interactive Chapter End Confirmation Banner */}
          {endChapterConfirmPrompt && (
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

            {/* Concept Sequence in Order */}
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

          {/* Live Chapter Notes Ledger Preview */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#E5E3DB] text-[#171817] text-xs space-y-2 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#52715D]" />
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#52715D] font-bold">
                  Exam-Ready Notes Ledger
                </span>
              </div>
              <span className="text-[10px] font-mono text-[#7A7C75]">
                {notesSaveStatus === 'saving' ? (
                  <span className="text-[#C85A43]">Saving...</span>
                ) : chapterNotes.trim() ? (
                  <span className="text-[#52715D]">Auto-Saved</span>
                ) : (
                  'Live Sync'
                )}
              </span>
            </div>

            {chapterNotes.trim() ? (
              <div className="space-y-2">
                <div className="p-2.5 rounded-xl bg-[#F8F6F0] border border-[#E5E3DB] text-[11px] text-[#171817] max-h-24 overflow-hidden font-mono line-clamp-3 whitespace-pre-line">
                  {chapterNotes.split('\n').filter(Boolean).slice(-3).join('\n')}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setNotesModalOpen(true)}
                  className="w-full text-[#52715D] hover:text-[#3E5D4B] hover:bg-[#E8F0EA] text-xs flex items-center justify-center gap-1.5 py-1 h-7.5 cursor-pointer rounded-lg border border-[#E5E3DB]"
                >
                  <BookOpen className="w-3 h-3" />
                  <span>Open Full Exam Notes</span>
                </Button>
              </div>
            ) : (
              <p className="text-[11px] text-[#7A7C75] italic leading-relaxed py-1">
                Teacher notes, formulas, and derivations auto-save here in real time.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Classroom Dual Stage (AI Green Chalkboard + 3D Simulation) */}
        <div className="flex-1 h-full min-h-[400px] flex flex-col">
          <WhiteboardWorkspace
            ref={chalkboardRef}
            moduleId={moduleId}
            moduleTitle={resolvedTitle}
            classLevel={resolvedClassLevel}
            subject={resolvedSubject}
            keyConcepts={keyConceptsList}
            activeConceptIndex={currentConceptIndex}
            onPageChange={(pageIdx) => {
              currentConceptIndexRef.current = pageIdx
              setCurrentConceptIndex(pageIdx)
            }}
            activeSceneType={activeSceneType}
            activeSceneParams={activeSceneParams}
            activeSceneTitle={activeSceneTitle}
            onCloseScene={() => setActiveSceneType(null)}
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
