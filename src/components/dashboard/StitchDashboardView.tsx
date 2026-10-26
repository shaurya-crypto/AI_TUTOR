'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { signOutAction, updatePreferencesAction, enrollCurriculumAction } from '@/app/dashboard/actions'
import { triggerCompanionGuidance } from '@/components/mascot/Mascot'
import { MasteryQuizModal } from '@/components/quiz/MasteryQuizModal'
import { StudyPlannerCard, StudyPlanData } from './StudyPlannerCard'
import { WeakConceptsReviewCard } from './WeakConceptsReviewCard'
import { VOICE_OPTIONS } from '@/lib/voiceAndLanguageConfig'

interface Module {
  id: string
  curriculum_id: string
  order_index: number
  title: string
  description?: string | null
  ai_system_prompt_context?: string | null
  key_concepts?: string[] | null
  success_criteria?: string | null
  estimated_minutes?: number | null
  subtopics?: string[] | Array<{ title?: string; duration?: string; key_formula?: string }> | null
  board?: string | null
  class_level?: string | null
  chapter_notes?: string | null
}

interface ProgressRecord {
  id: string
  syllabus_module_id: string
  user_id: string
  status: 'not_started' | 'in_progress' | 'completed' | 'needs_review'
  score?: number | null
  started_at?: string | null
  completed_at?: string | null
}

interface Curriculum {
  id: string
  title: string
  description?: string | null
  category?: string | null
  difficulty_level?: string | null
  estimated_duration_minutes?: number | null
  is_published?: boolean
  class_level?: string | null
  board?: string | null
  order_index?: number | null
}

interface MemoryItem {
  id: string
  memory_text: string
  importance_score?: number | null
  created_at: string
}

interface Profile {
  id: string
  full_name?: string | null
  avatar_url?: string | null
  current_streak?: number | null
  longest_streak?: number | null
  total_classes_taken?: number | null
  total_learning_minutes?: number | null
  learning_style?: string | null
  preferred_pacing?: string | null
  preferred_teacher_voice?: string | null
  weak_subjects?: string[] | null
  strong_subjects?: string[] | null
  learning_level?: string | null
  class_level?: string | null
  last_class_date?: string | null
}

interface StitchDashboardViewProps {
  user: {
    id: string
    email?: string
  }
  profile: Profile
  primaryCurriculum: Curriculum | null
  enrolledCurriculums: Curriculum[]
  allCurriculums?: Curriculum[]
  modules: Module[]
  progressRecords: ProgressRecord[]
  memories: MemoryItem[]
  studyPlan?: StudyPlanData | null
}



export function StitchDashboardView({
  user,
  profile,
  primaryCurriculum,
  enrolledCurriculums = [],
  allCurriculums = [],
  modules = [],
  progressRecords = [],
  memories = [],
  studyPlan = null,
}: StitchDashboardViewProps) {
  const router = useRouter()
  const [activeNav, setActiveNav] = useState('home')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [liveModalOpen, setLiveModalOpen] = useState(false)
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [notesDialogOpen, setNotesDialogOpen] = useState(false)
  const [coursesDialogOpen, setCoursesDialogOpen] = useState(false)
  const [isStartingSession, setIsStartingSession] = useState(false)
  const [quizModalOpen, setQuizModalOpen] = useState(false)
  const [syllabusModalOpen, setSyllabusModalOpen] = useState(false)
  const [selectedSyllabusCurriculumId, setSelectedSyllabusCurriculumId] = useState<string | null>(null)
  const [selectedSyllabusCategory, setSelectedSyllabusCategory] = useState<string | null>(null)

  // Discipline chips derived from actual enrolled curriculums (or all published)
  const availableDisciplines = enrolledCurriculums.length > 0 
    ? enrolledCurriculums.map((c) => c.title)
    : allCurriculums.length > 0
    ? allCurriculums.map((c) => c.title)
    : ['General Studies']

  const [selectedDiscipline, setSelectedDiscipline] = useState(availableDisciplines[0] || 'General Studies')

  // Preferences form state
  const [selectedVoice, setSelectedVoice] = useState(profile.preferred_teacher_voice || 'Leda')
  const [selectedStyle, setSelectedStyle] = useState(profile.learning_style || 'socratic')
  const [selectedPacing, setSelectedPacing] = useState(profile.preferred_pacing || 'standard')
  const [selectedClass, setSelectedClass] = useState(profile.class_level || 'Class 10')
  const [savingPrefs, setSavingPrefs] = useState(false)

  // Student Identity: Strictly from DB, no fake constants
  const studentName = profile.full_name || user.email?.split('@')[0] || 'Student'
  const studentAvatar = profile.avatar_url || null
  const studentTrack = profile.class_level || (profile.learning_level 
    ? `${profile.learning_level.charAt(0).toUpperCase() + profile.learning_level.slice(1)} Track`
    : 'Scholar')

  // Dynamic Date
  const todayFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  // Quick dates for 14-day chart
  const now = new Date()
  const date7DaysAgo = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))
  const date14DaysAgo = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000))
  const todayShort = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(now)

  // Live Progress Map
  const progressMap = new Map<string, ProgressRecord>()
  progressRecords.forEach((p) => progressMap.set(p.syllabus_module_id, p))

  // Helper to reliably check module completion (respects status === 'completed' or completed_at != null)
  const isModuleComplete = (modId: string) => {
    const p = progressMap.get(modId)
    return p?.status === 'completed' || !!p?.completed_at
  }

  const isModuleInProgress = (modId: string) => {
    const p = progressMap.get(modId)
    return p?.status === 'in_progress' && !p?.completed_at
  }

  // Find Primary Active Course & Active Module
  // Dynamic resolution:
  // 1. If primaryCurriculum has unfinished modules, keep it active
  // 2. If primaryCurriculum is 100% completed, check other enrolled curriculums for pending modules
  // 3. If all enrolled are completed, advance to next chapter in allCurriculums
  // 4. Fallback to primaryCurriculum or first enrolled curriculum
  const activeCourse = (() => {
    if (primaryCurriculum) {
      const pMods = modules.filter((m) => m.curriculum_id === primaryCurriculum.id)
      const allDone = pMods.length > 0 && pMods.every((m) => isModuleComplete(m.id))
      if (!allDone) return primaryCurriculum
    }
    for (const curr of enrolledCurriculums) {
      const cMods = modules.filter((m) => m.curriculum_id === curr.id)
      const allDone = cMods.length > 0 && cMods.every((m) => isModuleComplete(m.id))
      if (!allDone) return curr
    }
    for (const curr of allCurriculums) {
      const cMods = modules.filter((m) => m.curriculum_id === curr.id)
      const allDone = cMods.length > 0 && cMods.every((m) => isModuleComplete(m.id))
      if (!allDone && cMods.length > 0) return curr
    }
    return primaryCurriculum || enrolledCurriculums[0] || allCurriculums[0] || null
  })()

  const activeCourseModules = activeCourse
    ? modules.filter((m) => m.curriculum_id === activeCourse.id).sort((a, b) => a.order_index - b.order_index)
    : []

  const inProgressModule = activeCourseModules.find((m) => isModuleInProgress(m.id))
  const nextUncompletedModule = activeCourseModules.find((m) => !isModuleComplete(m.id) && !isModuleInProgress(m.id))

  // If all completed, activeModule is the last module (for review), otherwise the next module
  const activeModule =
    inProgressModule ||
    nextUncompletedModule ||
    activeCourseModules[activeCourseModules.length - 1] ||
    null

  const activeModuleIndex = activeModule ? activeCourseModules.findIndex((m) => m.id === activeModule.id) + 1 : 0
  const activeModuleTotal = activeCourseModules.length

  // Universe of curriculums available to the student (deduplicated by id)
  const allAvailableCurriculums = (() => {
    const map = new Map<string, Curriculum>()
    allCurriculums.forEach((c) => map.set(c.id, c))
    enrolledCurriculums.forEach((c) => map.set(c.id, c))
    return Array.from(map.values()).sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  })()

  // Distinct subjects / disciplines
  const syllabusSubjects = Array.from(
    new Set(allAvailableCurriculums.map((c) => c.category || 'General').filter(Boolean))
  )

  // Current active subject in syllabus modal
  const activeSyllabusCategory = selectedSyllabusCategory 
    || (activeCourse?.category || syllabusSubjects[0] || 'General')

  // Chapters in the active subject
  const currentSubjectChapters = allAvailableCurriculums
    .filter((c) => (c.category || 'General') === activeSyllabusCategory)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  // Current active chapter in syllabus modal
  const activeSyllabusChapter = (selectedSyllabusCurriculumId
    ? currentSubjectChapters.find((c) => c.id === selectedSyllabusCurriculumId)
    : null) || currentSubjectChapters[0] || activeCourse || allAvailableCurriculums[0] || null

  // Divided capsules for the active chapter
  const activeChapterCapsules = activeSyllabusChapter
    ? modules
        .filter((m) => m.curriculum_id === activeSyllabusChapter.id)
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
    : []

  // Calculations for Active Course
  const activeCompletedCount = activeCourseModules.filter((m) => isModuleComplete(m.id)).length
  const isAllCourseCompleted = activeCourseModules.length > 0 && activeCompletedCount === activeCourseModules.length
  const activePercentComplete = activeCourseModules.length > 0 
    ? Math.round((activeCompletedCount / activeCourseModules.length) * 100) 
    : 0

  // Overall Stats across all courses: strictly live DB numbers
  const totalCompletedModules = progressRecords.filter((p) => p.status === 'completed' || !!p.completed_at).length
  const overallPercentComplete = modules.length > 0
    ? Math.round((totalCompletedModules / modules.length) * 100)
    : 0

  const studyHours = profile.total_learning_minutes && profile.total_learning_minutes > 0
    ? (profile.total_learning_minutes / 60).toFixed(1)
    : '0'

  const currentStreak = profile.current_streak || 0
  const totalMasteryLessons = profile.total_classes_taken ?? totalCompletedModules ?? 0

  // Weekly Cadence (Mon = 0, Sun = 6)
  const currentDayIndex = (new Date().getDay() + 6) % 7
  const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

  // Auto-guide companion to primary resume action on dashboard mount (strictly zero emojis)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeCourse && activeModule) {
        const actionLabel = isModuleInProgress(activeModule.id) ? 'resume' : 'start'
        triggerCompanionGuidance({
          targetElementId: 'primary-resume-btn',
          expression: 'attentive-left',
          animation: 'listening',
          message: `Ready, ${studentName}? Let's ${actionLabel} "${activeModule.title}"! Tap here to begin our live session.`,
        })
      } else {
        triggerCompanionGuidance({
          targetElementId: 'browse-curriculums-btn',
          expression: 'curious-left',
          animation: 'listening',
          message: `Welcome, ${studentName}! Choose a chapter from your class syllabus to start learning.`,
        })
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [activeCourse?.id, activeModule?.id, studentName])

  // Pre-calculate enrolled subject card stats from real database records
  const subjectCards = enrolledCurriculums.map((curr, idx) => {
    const cModules = modules.filter((m) => m.curriculum_id === curr.id).sort((a, b) => a.order_index - b.order_index)
    const cCompleted = cModules.filter((m) => isModuleComplete(m.id)).length
    const cTotal = cModules.length
    const cPercent = cTotal > 0 ? Math.round((cCompleted / cTotal) * 100) : 0

    const inProgModule = cModules.find((m) => isModuleInProgress(m.id))
    const nextMod = inProgModule || cModules.find((m) => !isModuleComplete(m.id)) || cModules[0]

    let iconName = 'biotech'
    let statusLabel = cPercent === 100 ? 'Completed' : cPercent > 0 ? 'In Progress' : 'Not Started'
    let statusColor = cPercent > 0 ? 'text-secondary' : 'text-ink-muted'
    let progressBg = 'bg-secondary'
    let unitLabel = nextMod ? `Unit ${nextMod.order_index}: ${nextMod.title.split(':')[0]}` : (curr.category || 'Academic Track')

    if (curr.title.toLowerCase().includes('chem')) {
      iconName = 'science'
      progressBg = 'bg-primary'
    } else if (curr.title.toLowerCase().includes('calc') || curr.title.toLowerCase().includes('math')) {
      iconName = 'functions'
      progressBg = 'bg-ink-primary'
    }

    return {
      curriculum: curr,
      iconName,
      statusLabel,
      statusColor,
      progressBg,
      completedCount: cCompleted,
      totalCount: cTotal,
      percent: cPercent,
      activeTopicTitle: nextMod ? nextMod.title : 'Overview & Fundamentals',
      nextModuleId: nextMod ? nextMod.id : null,
      unitLabel,
    }
  })

  // Handlers
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingPrefs(true)
    const formData = new FormData()
    formData.append('learning_style', selectedStyle)
    formData.append('preferred_pacing', selectedPacing)
    formData.append('preferred_teacher_voice', selectedVoice)
    formData.append('class_level', selectedClass)
    await updatePreferencesAction(formData)
    setSavingPrefs(false)
    setPreferencesOpen(false)
  }

  const handleStartSession = () => {
    setIsStartingSession(true)
    setTimeout(() => {
      setLiveModalOpen(false)
      if (activeModule?.id) {
        router.push(`/dashboard/${user.id}/class/${activeModule.id}`)
      } else {
        router.push(`/dashboard/${user.id}/class`)
      }
    }, 800)
  }

  return (
    <div className="min-h-full font-body-md text-body-md text-ink-primary bg-canvas botanical-pattern antialiased selection:bg-primary-fixed selection:text-ink-primary">
      
      {/* ========================================================================= */}
      {/* 1. SIDE NAVIGATION (Desktop Fixed Shell: w-64)                           */}
      {/* ========================================================================= */}
      <aside className="fixed left-0 top-0 h-screen w-64 p-6 z-40 bg-canvas border-r border-border-subtle flex flex-col justify-between hidden md:flex">
        {/* Top Area: Crest Logo & Section Links */}
        <div className="space-y-8">
          {/* Crest Motif & Brand Header */}
          <Link href={`/dashboard/${user.id}`} className="flex items-start gap-3.5 px-1 pt-1 group">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border-subtle flex items-center justify-center text-secondary shadow-xs transition-transform group-hover:scale-105">
              <span className="material-symbols-outlined text-2xl text-secondary">eco</span>
            </div>
            <div>
              <h1 className="font-headline-md text-headline-md text-ink-primary tracking-tight leading-none">
                AI Tutor
              </h1>
              <p className="font-label-micro text-label-micro text-ink-muted mt-1 uppercase tracking-wider">
                Scholar's Edition
              </p>
            </div>
          </Link>

          {/* Main Navigation Menu */}
          <nav className="space-y-1" aria-label="Main Navigation">
            {/* Item: Home */}
            <button
              onClick={() => setActiveNav('home')}
              className={`w-full flex items-center gap-3 font-label-md text-label-md pl-3 py-2.5 transition-colors text-left cursor-pointer ${
                activeNav === 'home'
                  ? 'text-primary border-r-2 border-primary bg-surface-container-low/50 scale-[0.98]'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container-low/40'
              }`}
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: activeNav === 'home' ? '"FILL" 1' : '"FILL" 0' }}>
                home
              </span>
              <span>Home</span>
            </button>

            {/* Item: Syllabus */}
            <button
              onClick={() => {
                setActiveNav('syllabus')
                setSyllabusModalOpen(true)
              }}
              className={`w-full flex items-center gap-3 font-label-md text-label-md pl-3 py-2.5 transition-colors text-left cursor-pointer ${
                activeNav === 'syllabus'
                  ? 'text-primary border-r-2 border-primary bg-surface-container-low/50'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container-low/40'
              }`}
            >
              <span className="material-symbols-outlined text-xl">menu_book</span>
              <span>Syllabus</span>
            </button>

            {/* Item: Learn */}
            <button
              onClick={() => {
                setActiveNav('learn')
                const el = document.getElementById('enrolled-subjects-section')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className={`w-full flex items-center gap-3 font-label-md text-label-md pl-3 py-2.5 transition-colors text-left cursor-pointer ${
                activeNav === 'learn'
                  ? 'text-primary border-r-2 border-primary bg-surface-container-low/50'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container-low/40'
              }`}
            >
              <span className="material-symbols-outlined text-xl">auto_stories</span>
              <span>Learn</span>
            </button>

            {/* Item: Practice */}
            <button
              onClick={() => {
                setActiveNav('practice')
                const el = document.getElementById('deliberate-practice-section')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className={`w-full flex items-center gap-3 font-label-md text-label-md pl-3 py-2.5 transition-colors text-left cursor-pointer ${
                activeNav === 'practice'
                  ? 'text-primary border-r-2 border-primary bg-surface-container-low/50'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container-low/40'
              }`}
            >
              <span className="material-symbols-outlined text-xl">edit_note</span>
              <span>Practice</span>
            </button>

            {/* Item: Live Tutor */}
            <button
              onClick={() => setLiveModalOpen(true)}
              className="w-full flex items-center justify-between text-ink-secondary font-label-md text-label-md pl-3 pr-2 py-2.5 transition-colors hover:text-ink-primary hover:bg-surface-container-low/40 text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-xl">psychology</span>
                <span>Live Tutor</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" title="Tutor Active" />
            </button>

            {/* Item: Progress */}
            <button
              onClick={() => {
                setActiveNav('progress')
                const el = document.getElementById('consistency-section')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className={`w-full flex items-center gap-3 font-label-md text-label-md pl-3 py-2.5 transition-colors text-left cursor-pointer ${
                activeNav === 'progress'
                  ? 'text-primary border-r-2 border-primary bg-surface-container-low/50'
                  : 'text-ink-secondary hover:text-ink-primary hover:bg-surface-container-low/40'
              }`}
            >
              <span className="material-symbols-outlined text-xl">insights</span>
              <span>Progress</span>
            </button>

            {/* Item: History */}
            <button
              onClick={() => setLiveModalOpen(true)}
              className="w-full flex items-center gap-3 text-ink-secondary font-label-md text-label-md pl-3 py-2.5 transition-colors hover:text-ink-primary hover:bg-surface-container-low/40 text-left cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">schedule</span>
              <span>History</span>
            </button>
          </nav>

          {/* Side CTA Action */}
          <div className="pt-2 px-1">
            <button
              onClick={() => setLiveModalOpen(true)}
              className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-accent-hover text-on-primary py-2.5 px-4 rounded-xl font-label-md text-label-md transition-all scale-[0.98] active:scale-95 shadow-xs cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">mic</span>
              <span>Start Session</span>
            </button>
          </div>
        </div>

        {/* Bottom Dock: Student Profile Card & Settings */}
        <div className="space-y-3 pt-6 border-t border-border-subtle">
          <div className="p-2.5 bg-surface rounded-xl border border-border-subtle flex items-center gap-3">
            <div className="relative w-9 h-9 rounded-full bg-surface-container-high border border-border-subtle overflow-hidden flex-shrink-0 flex items-center justify-center">
              {studentAvatar ? (
                <img
                  className="w-full h-full object-cover"
                  alt={studentName}
                  src={studentAvatar}
                />
              ) : (
                <span className="font-semibold text-ink-primary text-sm font-label-md">
                  {studentName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-label-md text-label-md text-ink-primary truncate font-semibold">
                {studentName}
              </p>
              <p className="font-label-micro text-label-micro text-ink-muted truncate">
                {studentTrack}
              </p>
            </div>
          </div>

          <nav className="space-y-0.5">
            <Link
              href={`/dashboard/${user.id}/settings?tab=account`}
              className="w-full flex items-center gap-3 text-ink-secondary font-label-md text-label-md pl-3 py-2 rounded-lg hover:text-ink-primary hover:bg-surface-container-low/40 transition-colors text-left cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">person</span>
              <span>Profile</span>
            </Link>
            <Link
              href={`/dashboard/${user.id}/settings?tab=avatars`}
              className="w-full flex items-center gap-3 text-ink-secondary font-label-md text-label-md pl-3 py-2 rounded-lg hover:text-ink-primary hover:bg-surface-container-low/40 transition-colors text-left cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">settings</span>
              <span>Settings</span>
            </Link>
          </nav>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE & TOP BAR                                               */}
      {/* ========================================================================= */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        
        {/* Top Sticky Bar */}
        <header className="sticky top-0 z-30 w-full pl-6 md:pl-8 pr-6 md:pr-8 py-4 flex items-center justify-between bg-canvas/90 backdrop-blur-md border-b border-border-subtle">
          <div className="flex items-center gap-4">
            <button
              className="md:hidden p-2 text-ink-secondary hover:text-ink-primary cursor-pointer"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Toggle navigation drawer"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div>
              <span className="font-label-micro text-label-micro text-ink-muted uppercase tracking-wider block">
                {todayFormatted}
              </span>
              <h2 className="font-headline-sm text-headline-sm text-ink-primary tracking-tight">
                Academic Overview
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Upload Chapter / Notes Action */}
            <Link
              href="/admin"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-container-low text-ink-primary font-label-md text-xs sm:text-sm transition-colors scale-[0.98]"
              title="Upload Textbook Chapter Notes and Ingest Syllabus"
            >
              <span className="material-symbols-outlined text-sm text-primary">upload_file</span>
              <span>Upload Notes / Syllabus</span>
            </Link>

            {/* Open Syllabus Button Action */}
            <button
              id="top-open-syllabus-btn"
              onClick={() => setSyllabusModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-container-low text-ink-primary font-label-md text-xs sm:text-sm transition-colors scale-[0.98] cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm text-secondary">menu_book</span>
              <span>Open Syllabus</span>
            </button>

            {/* Quick Focus Button Action */}
            <Link
              href={`/dashboard/${user.id}/class?mode=focus`}
              className="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-border-subtle bg-surface hover:bg-surface-container-low text-ink-primary font-label-md text-label-md transition-colors scale-[0.98]"
            >
              <span className="material-symbols-outlined text-sm text-primary">timer</span>
              <span>Quick Focus</span>
            </Link>


            {/* Calendar Today Action */}
            <button
              onClick={() => {
                const el = document.getElementById('consistency-section')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="p-2 text-ink-secondary hover:text-ink-primary hover:bg-surface rounded-lg border border-border-subtle transition-colors cursor-pointer"
              title="Academic Calendar"
            >
              <span className="material-symbols-outlined text-xl">calendar_today</span>
            </button>

            {/* Notifications Action */}
            <div className="relative">
              <button
                onClick={() => setLiveModalOpen(true)}
                className="p-2 text-ink-secondary hover:text-ink-primary hover:bg-surface rounded-lg border border-border-subtle transition-colors cursor-pointer"
                title="Notifications"
              >
                <span className="material-symbols-outlined text-xl">notifications</span>
              </button>
              {memories.length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary ring-2 ring-canvas" />
              )}
            </div>

            <div className="h-6 w-px bg-border-subtle mx-1 hidden sm:block" />

            {/* Student Micro Profile Preview */}
            <button
              onClick={() => setPreferencesOpen(true)}
              className="flex items-center gap-2.5 pl-1 hover:opacity-80 transition-opacity text-left cursor-pointer"
            >
              <div className="w-8 h-8 rounded-full bg-surface border border-border-subtle overflow-hidden flex items-center justify-center">
                {studentAvatar ? (
                  <img
                    className="w-full h-full object-cover"
                    alt={studentName}
                    src={studentAvatar}
                  />
                ) : (
                  <span className="font-semibold text-ink-primary text-xs font-label-md">
                    {studentName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <span className="hidden lg:inline-block font-label-md text-label-md text-ink-primary font-medium">
                {studentName}
              </span>
            </button>
          </div>
        </header>

        {/* ======================================================================= */}
        {/* DASHBOARD CORE CANVAS (DISCOVER → LEARN → PRACTICE → REVIEW LOOP)       */}
        {/* ======================================================================= */}
        <main className="flex-1 px-6 sm:px-10 lg:px-12 py-8 max-w-[1536px] w-full mx-auto space-y-10">
          
          {/* SECTION 1: HERO "CONSISTENCY & STUDY CADENCE" */}
          <section
            id="consistency-section"
            className="bg-surface rounded-3xl border border-border-subtle p-7 md:p-8 diffused-card-shadow space-y-6 w-full"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border-subtle/80 pb-5">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center text-secondary flex-shrink-0">
                  <span className="material-symbols-outlined text-2xl">calendar_month</span>
                </div>
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-headline-md text-headline-md text-ink-primary font-serif leading-none tracking-tight">
                      Consistency &amp; Study Cadence
                    </h3>
                  </div>
                  <p className="font-body-md text-body-md text-ink-secondary text-sm mt-1">
                    Deliberate practice retention and cumulative cognitive velocity across 14-day study cycles.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* 14-Day Study Velocity SVG Card */}
              <div className="lg:col-span-4 bg-canvas/70 rounded-2xl border border-border-subtle p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-label-micro text-label-micro text-ink-muted uppercase tracking-wider">
                    14-Day Study Velocity
                  </span>
                  <span className="text-xs font-semibold text-secondary font-label-micro">
                    {studyHours} hrs log
                  </span>
                </div>

                <div className="w-full h-20">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 280 60" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="cadenceGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#466552" stopOpacity="0.25" />
                        <stop offset="100%" stopColor="#466552" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="55" x2="280" y2="55" stroke="#E5E3DB" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="0" y1="30" x2="280" y2="30" stroke="#E5E3DB" strokeWidth="1" strokeDasharray="3 3" />
                    
                    {Number(studyHours) > 0 ? (
                      <>
                        <path
                          d="M 0,50 Q 25,48 45,38 T 90,32 T 135,42 T 180,22 T 225,16 T 260,10 L 280,8 L 280,58 L 0,58 Z"
                          fill="url(#cadenceGrad)"
                        />
                        <path
                          d="M 0,50 Q 25,48 45,38 T 90,32 T 135,42 T 180,22 T 225,16 T 260,10 L 280,8"
                          fill="none"
                          stroke="#466552"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />
                        <circle cx="225" cy="16" r="3.5" fill="#FFFFFF" stroke="#466552" strokeWidth="2" />
                        <circle cx="260" cy="10" r="3.5" fill="#FFFFFF" stroke="#9f3c27" strokeWidth="2" />
                        <circle cx="280" cy="8" r="4" fill="#9f3c27" />
                      </>
                    ) : (
                      <>
                        <line x1="0" y1="54" x2="280" y2="54" stroke="#466552" strokeWidth="2" strokeDasharray="4 4" />
                        <circle cx="280" cy="54" r="3.5" fill="#466552" />
                      </>
                    )}
                  </svg>
                </div>

                <div className="flex justify-between font-label-micro text-label-micro text-ink-muted text-xs pt-1">
                  <span>{date14DaysAgo}</span>
                  <span>{date7DaysAgo}</span>
                  <span>Today ({todayShort})</span>
                </div>
              </div>

              {/* 4 Stats Cards */}
              <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* 1. Current Streak */}
                <div className="p-4 bg-canvas rounded-2xl border border-border-subtle flex flex-col justify-between">
                  <span className="font-label-micro text-label-micro text-ink-muted uppercase tracking-wider block">
                    Current Streak
                  </span>
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-semibold text-ink-primary tracking-tight font-label-md leading-none">
                        {currentStreak}
                      </span>
                      <span className="text-xs text-secondary font-semibold font-label-micro">
                        Days
                      </span>
                    </div>
                    <p className="font-label-micro text-label-micro text-ink-secondary text-xs mt-1.5 leading-tight">
                      {currentStreak > 0 ? 'Active deliberate block' : 'Start streak today'}
                    </p>
                  </div>
                </div>

                {/* 2. Study Velocity */}
                <div className="p-4 bg-canvas rounded-2xl border border-border-subtle flex flex-col justify-between">
                  <span className="font-label-micro text-label-micro text-ink-muted uppercase tracking-wider block">
                    Study Velocity
                  </span>
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-semibold text-ink-primary tracking-tight font-label-md leading-none">
                        {studyHours}
                      </span>
                      <span className="text-xs text-ink-muted font-medium font-label-micro">
                        hrs
                      </span>
                    </div>
                    <p className="font-label-micro text-label-micro text-secondary text-xs mt-1.5 leading-tight font-medium">
                      {Number(studyHours) > 0 ? '+2.5 hrs vs last cycle' : 'No recorded hours yet'}
                    </p>
                  </div>
                </div>

                {/* 3. Syllabus Covered */}
                <div
                  onClick={() => setSyllabusModalOpen(true)}
                  className="p-4 bg-canvas rounded-2xl border border-border-subtle flex flex-col justify-between hover:border-ink-muted transition-colors cursor-pointer group"
                  title="Click to view full syllabus breakdown"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-label-micro text-label-micro text-ink-muted uppercase tracking-wider block">
                      Syllabus Covered
                    </span>
                    <span className="material-symbols-outlined text-xs text-ink-muted group-hover:text-primary transition-colors">
                      menu_book
                    </span>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-semibold text-ink-primary tracking-tight font-label-md leading-none">
                        {overallPercentComplete}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden mt-2.5">
                      <div
                        className="h-full bg-secondary rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${overallPercentComplete}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Lessons & Mastery */}
                <div className="p-4 bg-canvas rounded-2xl border border-border-subtle flex flex-col justify-between">
                  <span className="font-label-micro text-label-micro text-ink-muted uppercase tracking-wider block">
                    Lessons &amp; Mastery
                  </span>
                  <div className="mt-3">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-semibold text-ink-primary tracking-tight font-label-md leading-none">
                        {totalMasteryLessons}
                      </span>
                      <span className="text-xs text-ink-muted font-medium font-label-micro">
                        done
                      </span>
                    </div>
                    <p className="font-label-micro text-label-micro text-ink-secondary text-xs mt-1.5 leading-tight">
                      {totalMasteryLessons > 0 ? 'Verified mastery' : 'Zero lessons completed'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Weekly Cadence Row: Dynamically rendered from currentStreak and today's day */}
            <div className="pt-2 border-t border-border-subtle/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-label-micro text-label-micro text-ink-muted uppercase tracking-wider">
                  Weekly Cadence:
                </span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {weekDays.map((day, idx) => {
                    const isChecked = currentStreak > 0 && idx < currentStreak && idx <= currentDayIndex
                    const isToday = idx === currentDayIndex

                    if (isToday) {
                      if (currentStreak > 0) {
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg border border-primary/20"
                          >
                            <span className="font-label-micro text-primary font-bold text-xs">{day}</span>
                            <div className="w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center text-[10px]">
                              <span className="material-symbols-outlined text-xs leading-none">check</span>
                            </div>
                          </div>
                        )
                      } else {
                        return (
                          <div
                            key={idx}
                            className="flex items-center gap-1 bg-canvas px-2 py-1 rounded-lg border border-primary/40"
                          >
                            <span className="font-label-micro text-primary font-bold text-xs">{day}</span>
                            <div className="w-4 h-4 rounded-full border border-dashed border-primary/40 bg-surface text-ink-muted flex items-center justify-center text-[10px]">
                              ·
                            </div>
                          </div>
                        )
                      }
                    }

                    if (isChecked) {
                      return (
                        <div
                          key={idx}
                          className="flex items-center gap-1 bg-canvas px-2 py-1 rounded-lg border border-border-subtle"
                        >
                          <span className="font-label-micro text-ink-muted text-xs">{day}</span>
                          <div className="w-4 h-4 rounded-full bg-secondary text-white flex items-center justify-center text-[10px]">
                            <span className="material-symbols-outlined text-xs leading-none">check</span>
                          </div>
                        </div>
                      )
                    }

                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-1 bg-canvas px-2 py-1 rounded-lg border border-dashed border-border-subtle"
                      >
                        <span className="font-label-micro text-ink-muted text-xs">{day}</span>
                        <div className="w-4 h-4 rounded-full border border-dashed border-border-subtle bg-surface text-ink-muted flex items-center justify-center text-[10px]">
                          ·
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs font-label-micro text-ink-muted">
                <span className="material-symbols-outlined text-sm text-secondary">verified</span>
                <span>
                  {currentStreak > 0
                    ? 'Academic cadence on track for examinations'
                    : 'Complete a study session to initialize cadence'}
                </span>
              </div>
            </div>
          </section>

          {/* SECTION 2: HERO "CONTINUE LEARNING" */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {activeCourse ? (
              <div className="lg:col-span-12 bg-surface rounded-3xl border border-border-subtle p-8 md:p-10 diffused-card-shadow flex flex-col justify-between relative overflow-hidden">
                {/* Subtle watermark icon in background */}
                <div className="absolute -right-8 -bottom-8 pointer-events-none opacity-[0.03] text-ink-primary">
                  <span className="material-symbols-outlined text-[180px]">biotech</span>
                </div>

                <div className="space-y-6 relative z-10">
                  {/* Time Remaining Pill */}
                  <div className="flex items-center justify-end">
                    <span className="font-label-micro text-label-micro text-ink-muted flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-ink-muted">schedule</span>
                      {activeModule?.estimated_minutes ? `${activeModule.estimated_minutes} mins remaining` : '15 mins remaining'}
                    </span>
                  </div>

                  {/* Title & Context and Progress layout */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
                    <div className="lg:col-span-8">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-full text-label-micro bg-secondary/10 text-secondary font-semibold border border-secondary/20">
                          {activeCourse.title}
                        </span>
                        {isAllCourseCompleted && (
                          <span className="px-2.5 py-0.5 rounded-full text-label-micro bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                            Chapter Completed
                          </span>
                        )}
                      </div>
                      <h2 className="font-headline-lg text-headline-lg text-ink-primary leading-tight">
                        {activeModule?.title || activeCourse.title}
                      </h2>
                      <p className="font-body-md text-body-md text-ink-secondary mt-3 max-w-3xl">
                        {activeModule?.description ? (
                          <>
                            Current Capsule: <strong className="text-ink-primary font-medium">{activeModule.title}</strong>. {activeModule.description}
                          </>
                        ) : (
                          <>
                            Active Course: <strong className="text-ink-primary font-medium">{activeCourse.title}</strong>. {activeCourse.description || 'Deliberate study unit.'}
                          </>
                        )}
                      </p>
                    </div>

                    {/* Progress Track */}
                    <div className="lg:col-span-4 space-y-2.5 bg-canvas/70 p-4 rounded-2xl border border-border-subtle">
                      <div className="flex justify-between items-center font-label-micro text-label-micro">
                        <span className="text-ink-muted">
                          {activeModuleIndex > 0 ? `Capsule ${activeModuleIndex} of ${activeModuleTotal}` : activeCourse.title}
                        </span>
                        <span className="text-ink-primary font-semibold font-mono">{activePercentComplete}% Complete</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${activePercentComplete}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-8 flex flex-wrap items-center gap-4 relative z-10 border-t border-border-subtle/60 mt-6">
                  <Link
                    id="primary-resume-btn"
                    className="inline-flex items-center gap-2.5 bg-primary hover:bg-accent-hover text-on-primary font-label-md text-label-md px-7 py-3.5 rounded-xl transition-all scale-[0.98] active:scale-95 shadow-xs"
                    href={activeModule?.id ? `/dashboard/${user.id}/class/${activeModule.id}` : `/dashboard/${user.id}/class`}
                  >
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: '"FILL" 1' }}>
                      play_arrow
                    </span>
                    <span>
                      {isAllCourseCompleted
                        ? 'Review Chapter'
                        : isModuleInProgress(activeModule?.id || '')
                        ? 'Resume Capsule'
                        : 'Start Capsule'}
                    </span>
                  </Link>

                  <button
                    id="hero-open-syllabus-btn"
                    onClick={() => {
                      if (activeCourse) {
                        setSelectedSyllabusCategory(activeCourse.category || 'General')
                        setSelectedSyllabusCurriculumId(activeCourse.id)
                      }
                      setSyllabusModalOpen(true)
                    }}
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl border border-border-subtle bg-surface hover:bg-canvas text-ink-primary font-label-md text-label-md transition-all cursor-pointer shadow-2xs hover:border-ink-muted"
                  >
                    <span className="material-symbols-outlined text-lg text-secondary">
                      menu_book
                    </span>
                    <span>Open Syllabus</span>
                  </button>

                  <button
                    onClick={() => setNotesDialogOpen(true)}
                    className="inline-flex items-center gap-1.5 px-4 py-3.5 rounded-xl border border-border-subtle bg-transparent hover:bg-canvas text-ink-primary font-label-md text-label-md transition-colors cursor-pointer"
                  >
                    <span>Review Chapter Notes</span>
                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="lg:col-span-12 bg-surface rounded-3xl border border-border-subtle p-8 md:p-10 diffused-card-shadow flex flex-col justify-between relative overflow-hidden">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-surface-container-low border border-border-subtle flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined text-2xl">school</span>
                  </div>
                  <h2 className="font-headline-lg text-headline-lg text-ink-primary leading-tight">
                    No Active Course Enrolled
                  </h2>
                  <p className="font-body-md text-body-md text-ink-secondary max-w-2xl">
                    You have not enrolled in an active curriculum yet. Select an enrolled subject below or browse published curriculums to begin.
                  </p>
                </div>
                <div className="pt-6 mt-4 border-t border-border-subtle/60 flex flex-wrap items-center gap-3">
                  <button
                    id="browse-curriculums-btn"
                    onClick={() => setCoursesDialogOpen(true)}
                    className="inline-flex items-center gap-2 bg-primary hover:bg-accent-hover text-on-primary font-label-md px-6 py-3 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg">add</span>
                    <span>Browse Curriculums</span>
                  </button>
                  <button
                    onClick={() => setSyllabusModalOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-border-subtle text-ink-primary font-label-md text-sm hover:bg-canvas cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-lg text-secondary">menu_book</span>
                    <span>Open Syllabus</span>
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2B: DYNAMIC ADAPTIVE EXAM STUDY PLANNER */}
          <StudyPlannerCard
            userId={user.id}
            studyPlan={studyPlan}
            totalModulesCount={modules.length}
            completedModulesCount={totalCompletedModules}
            nextModuleId={activeModule?.id || null}
          />

          {/* SECTION 3: TODAY'S STRUCTURED LEARNING PLAN */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-12 space-y-4">
              <div className="flex items-baseline justify-between">
                <div>
                  <h3 className="font-headline-md text-headline-md text-ink-primary">
                    Today's Learning Plan
                  </h3>
                  <p className="font-body-md text-body-md text-ink-secondary">
                    Prioritized tasks to maintain academic cadence.
                  </p>
                </div>
                <span className="font-label-micro text-label-micro text-ink-muted uppercase">
                  {activeModule ? '3 of 3 Pending' : '0 Pending'}
                </span>
              </div>

              {activeModule ? (
                <div className="space-y-3.5">
                  {/* Task 1: Lesson */}
                  <div className="group bg-surface rounded-2xl border border-border-subtle p-5 md:p-6 transition-all hover:border-ink-muted flex flex-col sm:flex-row sm:items-center justify-between gap-4 diffused-card-shadow">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-low border border-border-subtle flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-xl">menu_book</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-label-micro text-label-micro text-primary uppercase font-bold tracking-wider">
                            Lesson
                          </span>
                          <span className="text-ink-muted text-xs">
                            • Est. {activeModule.estimated_minutes || 20} min
                          </span>
                        </div>
                        <h4 className="font-headline-sm text-headline-sm text-ink-primary mt-0.5 group-hover:text-primary transition-colors">
                          Complete {activeModule.title}
                        </h4>
                        <p className="font-body-md text-body-md text-ink-secondary text-sm mt-0.5">
                          {activeModule.description || 'Core instructional module review with your AI tutor.'}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={activeModule?.id ? `/dashboard/${user.id}/class/${activeModule.id}` : `/dashboard/${user.id}/class`}
                      className="sm:self-center flex-shrink-0 px-5 py-2.5 rounded-xl bg-primary hover:bg-accent-hover text-on-primary font-label-md text-label-md transition-colors scale-[0.98] text-center"
                    >
                      Continue
                    </Link>
                  </div>

                  {/* Task 2: Practice & 10 MCQs Mastery */}
                  <div className="group bg-surface rounded-2xl border border-border-subtle p-5 md:p-6 transition-all hover:border-ink-muted flex flex-col sm:flex-row sm:items-center justify-between gap-4 diffused-card-shadow">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-low border border-border-subtle flex items-center justify-center text-secondary flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-xl">psychology_alt</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-label-micro text-label-micro text-secondary uppercase font-bold tracking-wider">
                            Mastery Evaluation
                          </span>
                          <span className="text-ink-muted text-xs">• 10 Gemini MCQs • Advances Syllabus Progress</span>
                        </div>
                        <h4 className="font-headline-sm text-headline-sm text-ink-primary mt-0.5 group-hover:text-secondary transition-colors">
                          10 Mastery Questions: {activeModule.title}
                        </h4>
                        <p className="font-body-md text-body-md text-ink-secondary text-sm mt-0.5">
                          Direct test on core textbook formulas and principles. Scoring 70%+ completes this capsule and unlocks the next section.
                        </p>
                      </div>
                    </div>
                    <button
                      id="open-quiz-btn"
                      onClick={() => setQuizModalOpen(true)}
                      className="sm:self-center flex-shrink-0 px-6 py-2.5 rounded-xl bg-secondary/15 hover:bg-secondary/25 text-secondary font-label-md text-label-md font-semibold transition-colors text-center cursor-pointer border border-secondary/20 shadow-xs active:scale-95"
                    >
                      Take 10 MCQs
                    </button>
                  </div>

                  {/* Task 3: Review */}
                  <div className="group bg-surface rounded-2xl border border-border-subtle p-5 md:p-6 transition-all hover:border-ink-muted flex flex-col sm:flex-row sm:items-center justify-between gap-4 diffused-card-shadow">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-surface-container-low border border-border-subtle flex items-center justify-center text-ink-secondary flex-shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-xl">history_edu</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-label-micro text-label-micro text-ink-muted uppercase font-bold tracking-wider">
                            Review
                          </span>
                          <span className="text-ink-muted text-xs">• 5 min flash review</span>
                        </div>
                        <h4 className="font-headline-sm text-headline-sm text-ink-primary mt-0.5">
                          {memories.length > 0
                            ? `Spaced Repetition: ${memories[0].memory_text.slice(0, 42)}...`
                            : `Spaced Repetition: ${activeCourse.title} Concepts`}
                        </h4>
                        <p className="font-body-md text-body-md text-ink-secondary text-sm mt-0.5">
                          Keep key photochemical and molecular concepts warm across decay intervals.
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/${user.id}/class?mode=review`}
                      className="sm:self-center flex-shrink-0 px-5 py-2.5 rounded-xl border border-border-subtle bg-surface hover:bg-canvas text-ink-primary font-label-md text-label-md transition-colors text-center"
                    >
                      Quick Review
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-surface rounded-2xl border border-border-subtle space-y-3">
                  <span className="material-symbols-outlined text-3xl text-ink-muted">playlist_add_check</span>
                  <p className="font-headline-sm text-ink-primary">No Pending Tasks</p>
                  <p className="font-body-md text-ink-secondary text-sm max-w-sm mx-auto">
                    Enroll in a curriculum to generate a personalized daily deliberate practice plan.
                  </p>
                  <button
                    onClick={() => setCoursesDialogOpen(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-sm hover:bg-accent-hover cursor-pointer"
                  >
                    <span>Browse Courses</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 3B: WEAK-CONCEPT REVISION SPOTLIGHT */}
          <WeakConceptsReviewCard
            userId={user.id}
            modules={modules}
            progressRecords={progressRecords}
          />

          {/* SECTION 4: ENROLLED SUBJECTS & SCHOLAR TRACKS */}
          <section id="enrolled-subjects-section" className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline-md text-headline-md text-ink-primary">
                  Enrolled Subjects
                </h3>
                <p className="font-body-md text-body-md text-ink-secondary">
                  Curriculum status across your active academic courses.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSyllabusModalOpen(true)}
                  className="font-label-md text-label-md text-ink-secondary hover:text-ink-primary font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-base text-secondary">menu_book</span>
                  <span>Open Syllabus</span>
                </button>
                <button
                  onClick={() => setCoursesDialogOpen(true)}
                  className="font-label-md text-label-md text-primary hover:text-accent-hover font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Manage Courses</span>
                  <span className="material-symbols-outlined text-base">chevron_right</span>
                </button>
              </div>
            </div>

            {subjectCards.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {subjectCards.map((card, idx) => (
                  <div
                    key={card.curriculum.id || idx}
                    className="bg-surface rounded-2xl border border-border-subtle p-6 diffused-card-shadow flex flex-col justify-between hover:border-ink-muted transition-colors"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="w-9 h-9 rounded-xl bg-surface-container-low border border-border-subtle flex items-center justify-center text-secondary">
                          <span className="material-symbols-outlined text-xl">{card.iconName}</span>
                        </span>
                        <span className={`font-label-micro text-label-micro ${card.statusColor} font-bold uppercase`}>
                          {card.statusLabel}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-headline-sm text-headline-sm text-ink-primary">
                          {card.curriculum.title}
                        </h4>
                        <p className="font-body-md text-body-md text-ink-secondary text-sm mt-1">
                          {card.completedCount} of {card.totalCount} chapters completed · Active topic: {card.activeTopicTitle.split(':')[0]}.
                        </p>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1.5 pt-2">
                        <div className="flex justify-between font-label-micro text-label-micro text-ink-muted">
                          <span>Syllabus Completed</span>
                          <span className="text-ink-primary font-medium">{card.percent}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                          <div
                            className={`h-full ${card.progressBg} rounded-full transition-all duration-500`}
                            style={{ width: `${card.percent}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 mt-4 border-t border-border-subtle flex items-center justify-between">
                      <button
                        onClick={() => {
                          setSelectedSyllabusCategory(card.curriculum.category || 'General')
                          setSelectedSyllabusCurriculumId(card.curriculum.id)
                          setSyllabusModalOpen(true)
                        }}
                        className="font-label-md text-label-md text-ink-secondary hover:text-ink-primary font-medium inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <span className="material-symbols-outlined text-base text-secondary">menu_book</span>
                        <span>Open Syllabus</span>
                      </button>
                      <Link
                        className="font-label-md text-label-md text-ink-primary hover:text-primary font-medium inline-flex items-center gap-1"
                        href={card.nextModuleId ? `/dashboard/${user.id}/class/${card.nextModuleId}` : `/dashboard/${user.id}/class`}
                      >
                        <span>Enter Subject</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-surface rounded-2xl border border-border-subtle space-y-3">
                <span className="material-symbols-outlined text-3xl text-ink-muted">menu_book</span>
                <p className="font-headline-sm text-ink-primary">No Enrolled Subjects</p>
                <p className="font-body-md text-ink-secondary text-sm max-w-sm mx-auto">
                  You are not currently enrolled in any subjects. Enroll now to track syllabus mastery and deliberate practice blocks.
                </p>
                <button
                  onClick={() => setCoursesDialogOpen(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-sm hover:bg-accent-hover cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Browse Available Subjects</span>
                </button>
              </div>
            )}
          </section>

          {/* SECTION 5: DELIBERATE PRACTICE QUICK LAUNCHER */}
          <section id="deliberate-practice-section" className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12">
            <div className="lg:col-span-5 bg-surface rounded-3xl border border-border-subtle p-7 md:p-8 diffused-card-shadow flex flex-col justify-between">
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="font-label-micro text-label-micro text-ink-muted uppercase tracking-wider">
                    Practice Diagnostic
                  </span>
                  <span className="material-symbols-outlined text-ink-muted text-xl">tune</span>
                </div>
                <div>
                  <h4 className="font-headline-md text-headline-md text-ink-primary leading-tight">
                    Deliberate Question Bank
                  </h4>
                  <p className="font-body-md text-body-md text-ink-secondary text-sm mt-1.5">
                    Target high-yield exam question types calibrated dynamically to your weaker diagnostic areas.
                  </p>
                </div>

                {/* Subject Toggle Chips */}
                <div className="space-y-2 pt-1">
                  <span className="font-label-micro text-label-micro text-ink-muted uppercase">
                    Select Discipline
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {availableDisciplines.map((discipline) => {
                      const isSelected = selectedDiscipline === discipline
                      return (
                        <button
                          key={discipline}
                          onClick={() => setSelectedDiscipline(discipline)}
                          className={`px-3 py-1.5 rounded-lg font-label-micro text-label-micro transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-ink-primary text-white'
                              : 'border border-border-subtle bg-canvas hover:bg-surface text-ink-secondary'
                          }`}
                        >
                          {discipline}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-border-subtle">
                <Link
                  href={`/dashboard/${user.id}/class?mode=diagnostic&discipline=${encodeURIComponent(selectedDiscipline)}`}
                  className="w-full flex items-center justify-center gap-2 border border-border-subtle bg-surface hover:bg-canvas text-ink-primary py-3 rounded-xl font-label-md text-label-md transition-all text-center"
                >
                  <span className="material-symbols-outlined text-lg">edit_document</span>
                  <span>Launch Custom 15-Question Set</span>
                </Link>
              </div>
            </div>
          </section>
        </main>

        {/* Quiet Editorial Footer */}
        <footer className="border-t border-border-subtle bg-canvas px-6 md:px-10 py-8 text-center text-ink-muted font-label-micro text-label-micro max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-lg">eco</span>
            <span>AI Tutor Scholar's Edition · Botanical Intelligence Design System</span>
          </div>
          <div>
            <span>Curriculum aligned with College Board AP® standards</span>
          </div>
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* 3. MODAL: LIVE AI TUTOR SOCRATIC DIALOGUE PREVIEW                         */}
      {/* ========================================================================= */}
      {liveModalOpen && (
        <div className="fixed inset-0 z-50 bg-ink-primary/30 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface rounded-3xl border border-border-subtle max-w-lg w-full p-8 diffused-card-shadow relative">
            {/* Close button */}
            <button
              className="absolute top-6 right-6 p-2 rounded-full text-ink-muted hover:text-ink-primary hover:bg-canvas transition-colors cursor-pointer"
              onClick={() => setLiveModalOpen(false)}
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>

            {/* Modal Header */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/10 border border-secondary/20 text-secondary font-label-micro text-label-micro">
                <span className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                <span>Connecting to Neural Tutor Core</span>
              </div>
              <h3 className="font-headline-md text-headline-md text-ink-primary leading-tight">
                {activeCourse ? `Ready to explore ${activeModule?.title || activeCourse.title}?` : 'Ready to begin your study session?'}
              </h3>
              <p className="font-body-md text-body-md text-ink-secondary text-sm">
                {memories.length > 0
                  ? `Your AI tutor has synthesized your recent sessions: "${memories[0].memory_text.slice(0, 110)}..."`
                  : activeModule?.description
                  ? `Beginning with ${activeModule.title}. Reviewing foundational concepts and interactive socratic problems.`
                  : 'Your AI tutor is ready for interactive dialogue, concept clarification, and deliberate practice.'}
              </p>
            </div>

            {/* Audio wave animation placeholder simulation */}
            <div className="my-6 p-6 rounded-2xl bg-canvas border border-border-subtle flex flex-col items-center justify-center space-y-3 text-center">
              <div className="flex items-center justify-center gap-1.5 h-10">
                <span className="w-1.5 h-4 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <span className="w-1.5 h-8 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                <span className="w-1.5 h-10 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
                <span className="w-1.5 h-6 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                <span className="w-1.5 h-3 bg-secondary rounded-full animate-bounce" style={{ animationDelay: '0.5s' }} />
              </div>
              <span className="font-label-micro text-label-micro text-ink-muted uppercase">
                Microphone calibrated &amp; clear
              </span>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                className="flex-1 py-3 px-4 rounded-xl border border-border-subtle text-ink-primary font-label-md text-label-md hover:bg-canvas transition-colors cursor-pointer"
                onClick={() => setLiveModalOpen(false)}
              >
                Cancel
              </button>
              <button
                disabled={isStartingSession}
                onClick={handleStartSession}
                className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-accent-hover text-on-primary font-label-md text-label-md transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <span className="material-symbols-outlined text-lg">mic</span>
                <span>{isStartingSession ? 'Connecting...' : 'Begin Conversation'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL: CHAPTER NOTES DIALOG                                            */}
      {/* ========================================================================= */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent className="max-w-xl bg-surface border-border-subtle rounded-3xl p-7">
          <DialogHeader>
            <DialogTitle className="font-headline-md text-2xl text-ink-primary">
              {activeModule?.title || 'Chapter Notes'}
            </DialogTitle>
            <DialogDescription className="font-body-md text-ink-secondary">
              Summary and foundational concepts for the current module.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 my-2">
            <div className="p-4 rounded-2xl bg-canvas border border-border-subtle space-y-2">
              <span className="font-label-micro text-xs uppercase tracking-wider text-ink-muted">
                Core Topic Overview
              </span>
              <p className="font-body-md text-ink-primary text-sm">
                {activeModule?.description || 'Foundational concepts and principles for this chapter.'}
              </p>
            </div>

            {activeModule?.key_concepts && activeModule.key_concepts.length > 0 && (
              <div className="space-y-2">
                <span className="font-label-micro text-xs uppercase tracking-wider text-ink-muted">
                  Key Concepts
                </span>
                <div className="flex flex-wrap gap-2">
                  {activeModule.key_concepts.map((concept, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg bg-surface-container-low border border-border-subtle text-xs font-label-md text-ink-primary"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <button
              onClick={() => setNotesDialogOpen(false)}
              className="px-4 py-2 rounded-xl border border-border-subtle text-ink-primary font-label-md hover:bg-canvas cursor-pointer"
            >
              Close
            </button>
            <Link
              href={activeModule?.id ? `/dashboard/${user.id}/class/${activeModule.id}` : `/dashboard/${user.id}/class`}
              className="px-5 py-2 rounded-xl bg-primary text-on-primary font-label-md hover:bg-accent-hover text-center"
            >
              Open Live Session
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 5. MODAL: SETTINGS & PREFERENCES DIALOG                                  */}
      {/* ========================================================================= */}
      <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <DialogContent className="max-w-md bg-surface border-border-subtle rounded-3xl p-7">
          <DialogHeader>
            <DialogTitle className="font-headline-md text-2xl text-ink-primary">
              Student Preferences
            </DialogTitle>
            <DialogDescription className="font-body-md text-ink-secondary text-sm">
              Tune your AI tutor voice, pedagogical model, and pacing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePreferences} className="space-y-4 my-2">
            {/* Preferred Voice */}
            <div className="space-y-1.5">
              <Label className="font-label-micro text-xs uppercase text-ink-muted">
                Tutor Voice
              </Label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border-subtle bg-surface text-ink-primary text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                {VOICE_OPTIONS.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} — {v.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Learning Style */}
            <div className="space-y-1.5">
              <Label className="font-label-micro text-xs uppercase text-ink-muted">
                Pedagogical Style
              </Label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border-subtle bg-surface text-ink-primary text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="socratic">Socratic (Questions &amp; Guided Discovery)</option>
                <option value="direct">Direct (Concise &amp; Factual)</option>
                <option value="visual">Visual (Diagrams &amp; Analogies)</option>
                <option value="storytelling">Storytelling (Contextual Narrative)</option>
              </select>
            </div>

            {/* Pacing */}
            <div className="space-y-1.5">
              <Label className="font-label-micro text-xs uppercase text-ink-muted">
                Instruction Pacing
              </Label>
              <select
                value={selectedPacing}
                onChange={(e) => setSelectedPacing(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border-subtle bg-surface text-ink-primary text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="slow_and_thorough">Slow &amp; Thorough</option>
                <option value="standard">Standard</option>
                <option value="fast_and_high_level">Fast &amp; High-Level</option>
              </select>
            </div>

            {/* Class / Grade Level */}
            <div className="space-y-1.5">
              <Label className="font-label-micro text-xs uppercase text-ink-muted">
                Class / Academic Grade
              </Label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-border-subtle bg-surface text-ink-primary text-sm focus:outline-hidden focus:ring-2 focus:ring-primary/20"
              >
                <option value="Class 8">Class 8</option>
                <option value="Class 9">Class 9</option>
                <option value="Class 10">Class 10</option>
                <option value="Class 11">Class 11</option>
                <option value="Class 12">Class 12</option>
                <option value="Undergraduate">Undergraduate / College</option>
              </select>
            </div>

            <div className="pt-3 border-t border-border-subtle flex items-center justify-between">
              <button
                type="button"
                onClick={() => signOutAction()}
                className="text-xs font-label-micro text-primary hover:underline cursor-pointer"
              >
                Sign Out
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPreferencesOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border-subtle text-ink-primary font-label-md text-sm hover:bg-canvas cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPrefs}
                  className="px-5 py-2 rounded-xl bg-primary text-on-primary font-label-md text-sm hover:bg-accent-hover cursor-pointer"
                >
                  {savingPrefs ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6. MODAL: MANAGE COURSES DIALOG                                           */}
      {/* ========================================================================= */}
      <Dialog open={coursesDialogOpen} onOpenChange={setCoursesDialogOpen}>
        <DialogContent className="max-w-lg bg-surface border-border-subtle rounded-3xl p-7">
          <DialogHeader>
            <DialogTitle className="font-headline-md text-2xl text-ink-primary">
              All Available Curriculums
            </DialogTitle>
            <DialogDescription className="font-body-md text-ink-secondary text-sm">
              Enroll in syllabus courses and rigorous academic tracks.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-3 max-h-80 overflow-y-auto pr-1">
            {allCurriculums.map((curr) => {
              const isEnrolled = enrolledCurriculums.some((e) => e.id === curr.id)
              return (
                <div
                  key={curr.id}
                  className="p-4 rounded-2xl bg-canvas border border-border-subtle flex items-center justify-between gap-3"
                >
                  <div>
                    <h5 className="font-label-md font-semibold text-ink-primary">
                      {curr.title}
                    </h5>
                    <p className="font-label-micro text-ink-muted text-xs mt-0.5">
                      {curr.category} • {curr.difficulty_level || 'advanced'}
                    </p>
                  </div>
                  {isEnrolled ? (
                    <span className="px-3 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-semibold">
                      Enrolled
                    </span>
                  ) : (
                    <button
                      onClick={async () => {
                        await enrollCurriculumAction(curr.id)
                        setCoursesDialogOpen(false)
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-medium hover:bg-accent-hover cursor-pointer"
                    >
                      Enroll
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          <DialogFooter>
            <button
              onClick={() => setCoursesDialogOpen(false)}
              className="px-4 py-2 rounded-xl border border-border-subtle text-ink-primary font-label-md text-sm hover:bg-canvas cursor-pointer"
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 6B. MODAL: SYLLABUS & DIVIDED CAPSULES DIALOG                             */}
      {/* ========================================================================= */}
      <Dialog open={syllabusModalOpen} onOpenChange={setSyllabusModalOpen}>
        <DialogContent className="max-w-4xl w-[95vw] md:w-full bg-surface border border-border-subtle rounded-3xl p-0 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
          {/* Modal Header */}
          <div className="p-6 md:p-7 border-b border-border-subtle bg-surface/95 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-2 mb-2.5">
              <span className="px-2.5 py-0.5 rounded-md bg-secondary/10 border border-secondary/20 text-secondary font-label-micro text-xs font-bold uppercase tracking-wider">
                {activeSyllabusChapter?.board || 'CBSE'} Board
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-surface-container-low border border-border-subtle text-ink-primary font-label-micro text-xs font-semibold">
                {activeSyllabusChapter?.class_level || profile.class_level || 'Class 9'}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-primary/10 border border-primary/20 text-primary font-label-micro text-xs font-semibold">
                {activeSyllabusCategory}
              </span>
            </div>

            <DialogTitle className="font-headline-md text-2xl md:text-3xl text-ink-primary tracking-tight">
              Official Syllabus &amp; Divided Capsules
            </DialogTitle>
            <DialogDescription className="font-body-md text-ink-secondary text-sm mt-1">
              Hierarchical curriculum mapped from class &amp; subject to sequential chapters and divided 15-minute concept capsules.
            </DialogDescription>

            {/* Subject Selector Tabs */}
            {syllabusSubjects.length > 1 && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border-subtle/60 overflow-x-auto no-scrollbar">
                <span className="font-label-micro text-xs uppercase text-ink-muted shrink-0 mr-1">
                  Subject:
                </span>
                {syllabusSubjects.map((sub) => {
                  const isSelected = activeSyllabusCategory === sub
                  return (
                    <button
                      key={sub}
                      onClick={() => {
                        setSelectedSyllabusCategory(sub)
                        const firstCh = allAvailableCurriculums.find((c) => (c.category || 'General') === sub)
                        if (firstCh) setSelectedSyllabusCurriculumId(firstCh.id)
                      }}
                      className={`px-3.5 py-1.5 rounded-xl font-label-micro text-xs font-medium transition-all shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-ink-primary text-white shadow-xs'
                          : 'border border-border-subtle bg-canvas hover:bg-surface-container-low text-ink-secondary'
                      }`}
                    >
                      {sub}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Modal Body: Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 md:p-7 space-y-6">
            {/* Chapters Navigator */}
            {currentSubjectChapters.length > 0 ? (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-label-micro text-xs uppercase tracking-wider text-ink-muted">
                    Syllabus Chapters ({currentSubjectChapters.length})
                  </span>
                  <span className="font-label-micro text-xs text-ink-muted">
                    Select chapter to view divided capsules
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentSubjectChapters.map((ch, idx) => {
                    const isSelected = activeSyllabusChapter?.id === ch.id
                    const chModules = modules.filter((m) => m.curriculum_id === ch.id)
                    const chDone = chModules.filter((m) => isModuleComplete(m.id)).length
                    const chPercent = chModules.length > 0 ? Math.round((chDone / chModules.length) * 100) : 0

                    return (
                      <button
                        key={ch.id}
                        onClick={() => setSelectedSyllabusCurriculumId(ch.id)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-xs'
                            : 'border-border-subtle bg-canvas hover:bg-surface-container-low'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-label-micro text-xs text-primary font-bold">
                              Chapter {ch.order_index ?? idx + 1}
                            </span>
                            <span className="font-label-micro text-[11px] text-ink-muted">
                              {chModules.length} Capsules
                            </span>
                          </div>
                          <p className="font-label-md text-sm font-semibold text-ink-primary line-clamp-1">
                            {ch.title.replace(/^Class\s+\d+\s+[^:]+:\s*/i, '')}
                          </p>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-border-subtle/50 flex items-center justify-between">
                          <span className="font-label-micro text-[11px] text-ink-muted">
                            {chPercent}% Complete
                          </span>
                          <span className={`w-2 h-2 rounded-full ${chPercent === 100 ? 'bg-secondary' : chPercent > 0 ? 'bg-primary' : 'bg-surface-container-high'}`} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center rounded-2xl bg-canvas border border-border-subtle">
                <p className="font-body-md text-sm text-ink-secondary">
                  No chapters available for this subject yet.
                </p>
              </div>
            )}

            {/* Active Chapter Written Syllabus Summary Card */}
            {activeSyllabusChapter && (
              <div className="p-5 md:p-6 rounded-2xl bg-canvas border border-border-subtle space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className="font-label-micro text-xs text-primary uppercase tracking-wider font-semibold">
                      Chapter {activeSyllabusChapter.order_index ?? 1} Syllabus
                    </span>
                    <h3 className="font-headline-md text-xl font-bold text-ink-primary mt-0.5">
                      {activeSyllabusChapter.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-lg bg-surface border border-border-subtle text-ink-primary font-label-micro text-xs">
                      {activeChapterCapsules.length} Capsules
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-surface border border-border-subtle text-ink-primary font-label-micro text-xs">
                      {activeSyllabusChapter.estimated_duration_minutes || activeChapterCapsules.length * 15} mins
                    </span>
                    <span className="px-3 py-1 rounded-lg bg-surface border border-border-subtle text-secondary font-label-micro text-xs font-semibold capitalize">
                      {activeSyllabusChapter.difficulty_level || 'Intermediate'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-border-subtle/60">
                  <span className="font-label-micro text-xs text-ink-muted uppercase block mb-1">
                    Written Syllabus Scope
                  </span>
                  <p className="font-body-md text-sm text-ink-primary leading-relaxed">
                    {activeSyllabusChapter.description || 'Comprehensive conceptual and practical study module calibrated to curriculum specifications.'}
                  </p>
                </div>
              </div>
            )}

            {/* Divided Capsules List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-headline-sm text-lg text-ink-primary">
                    Divided Capsules ({activeChapterCapsules.length})
                  </h4>
                  <p className="font-body-md text-xs text-ink-secondary">
                    Sequential 15-minute deliberate learning units with subtopics and key formulas.
                  </p>
                </div>
              </div>

              {activeChapterCapsules.length > 0 ? (
                <div className="space-y-3.5">
                  {activeChapterCapsules.map((mod, modIdx) => {
                    const prog = progressMap.get(mod.id)
                    const isDone = isModuleComplete(mod.id)
                    const isInProg = isModuleInProgress(mod.id)
                    const status = isDone ? 'completed' : isInProg ? 'in_progress' : (prog?.status || 'not_started')

                    // Safely extract subtopics array
                    const rawSubtopics = mod.subtopics
                    let subtopicsList: Array<{ title: string; formula?: string }> = []
                    if (Array.isArray(rawSubtopics)) {
                      subtopicsList = rawSubtopics.map((item: any) => {
                        if (typeof item === 'string') {
                          return { title: item }
                        } else if (item && typeof item === 'object') {
                          return {
                            title: item.title || item.name || String(item),
                            formula: item.key_formula || item.formula || undefined,
                          }
                        }
                        return { title: String(item) }
                      })
                    } else if (typeof rawSubtopics === 'string') {
                      try {
                        const parsed = JSON.parse(rawSubtopics)
                        if (Array.isArray(parsed)) {
                          subtopicsList = parsed.map((item: any) =>
                            typeof item === 'string' ? { title: item } : { title: item.title || String(item), formula: item.key_formula }
                          )
                        }
                      } catch {
                        subtopicsList = [{ title: rawSubtopics }]
                      }
                    }

                    return (
                      <div
                        key={mod.id}
                        className={`p-5 rounded-2xl border transition-all ${
                          isInProg
                            ? 'bg-surface border-primary/40 ring-1 ring-primary/20 shadow-xs'
                            : isDone
                            ? 'bg-surface/90 border-border-subtle'
                            : 'bg-surface border-border-subtle hover:border-ink-muted'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-border-subtle/50">
                          <div className="flex items-center gap-2.5">
                            <span className="px-2.5 py-1 rounded-lg bg-surface-container-low border border-border-subtle font-label-micro text-xs font-bold text-ink-primary">
                              Capsule {mod.order_index ?? modIdx + 1}
                            </span>
                            <span className="flex items-center gap-1 font-label-micro text-xs text-ink-muted">
                              <span className="material-symbols-outlined text-sm">timer</span>
                              <span>{mod.estimated_minutes || 15} mins</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {isDone ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-xs font-semibold">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                <span>Completed</span>
                              </span>
                            ) : isInProg ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                <span className="material-symbols-outlined text-xs">play_circle</span>
                                <span>In Progress</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-surface-container-low text-ink-muted text-xs font-medium">
                                <span className="material-symbols-outlined text-xs">radio_button_unchecked</span>
                                <span>Ready to Start</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div className="mt-3 space-y-1.5">
                          <h5 className="font-headline-sm text-base md:text-lg font-semibold text-ink-primary">
                            {mod.title}
                          </h5>
                          {mod.description && (
                            <p className="font-body-md text-xs md:text-sm text-ink-secondary">
                              {mod.description}
                            </p>
                          )}
                        </div>

                        {/* Subtopics breakdown */}
                        {subtopicsList.length > 0 && (
                          <div className="mt-3.5 pt-3 border-t border-border-subtle/40 space-y-2">
                            <span className="font-label-micro text-[11px] uppercase tracking-wider text-ink-muted block">
                              Capsule Subtopics &amp; Problem Areas:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {subtopicsList.map((sub, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="flex items-start gap-2 p-2 rounded-xl bg-canvas border border-border-subtle/60 text-xs"
                                >
                                  <span className="material-symbols-outlined text-sm text-secondary shrink-0 mt-0.5">
                                    arrow_right
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <span className="font-body-md text-ink-primary font-medium">
                                      {sub.title}
                                    </span>
                                    {sub.formula && (
                                      <span className="block font-mono text-[11px] text-primary font-semibold mt-0.5">
                                        Formula: {sub.formula}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Key Concepts */}
                        {mod.key_concepts && mod.key_concepts.length > 0 && (
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <span className="font-label-micro text-[11px] text-ink-muted mr-1">
                              Key Concepts:
                            </span>
                            {mod.key_concepts.map((concept, cIdx) => (
                              <span
                                key={cIdx}
                                className="px-2 py-0.5 rounded-md bg-surface-container-low border border-border-subtle text-[11px] font-label-micro text-ink-primary"
                              >
                                {concept}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Launch Action */}
                        <div className="mt-4 pt-3 border-t border-border-subtle/50 flex justify-end">
                          <Link
                            href={`/dashboard/${user.id}/class/${mod.id}`}
                            onClick={() => setSyllabusModalOpen(false)}
                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-label-md text-xs font-semibold transition-all ${
                              isInProg
                                ? 'bg-primary hover:bg-accent-hover text-on-primary shadow-xs'
                                : isDone
                                ? 'border border-border-subtle hover:bg-canvas text-ink-primary'
                                : 'bg-primary hover:bg-accent-hover text-on-primary shadow-xs'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isDone ? 'replay' : 'play_arrow'}
                            </span>
                            <span>
                              {isInProg ? 'Resume Capsule' : isDone ? 'Review in Spoken Class' : 'Start Capsule (15m)'}
                            </span>
                          </Link>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-6 text-center rounded-2xl bg-canvas border border-border-subtle">
                  <p className="font-body-md text-sm text-ink-secondary">
                    No divided capsules found for this chapter.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="p-4 md:p-5 border-t border-border-subtle bg-surface flex items-center justify-between">
            <span className="font-label-micro text-xs text-ink-muted hidden sm:inline-block">
              {activeSyllabusChapter?.board || 'CBSE'} • {activeSyllabusChapter?.class_level || profile.class_level || 'Class 9'} • {activeSyllabusCategory}
            </span>
            <button
              onClick={() => setSyllabusModalOpen(false)}
              className="px-5 py-2 rounded-xl border border-border-subtle text-ink-primary font-label-md text-sm hover:bg-canvas cursor-pointer ml-auto"
            >
              Close Syllabus
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 7. MOBILE DRAWER                                                          */}
      {/* ========================================================================= */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-ink-primary/20 backdrop-blur-xs z-50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed left-0 top-0 bottom-0 w-72 bg-canvas z-50 border-r border-border-subtle p-6 flex flex-col justify-between transform transition-transform duration-300 md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary text-2xl">eco</span>
              <span className="font-headline-md text-headline-md text-ink-primary">AI Tutor</span>
            </div>
            <button
              className="p-1 text-ink-muted hover:text-ink-primary cursor-pointer"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Close menu"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => {
                setActiveNav('home')
                setMobileMenuOpen(false)
              }}
              className="w-full flex items-center gap-3 text-primary font-label-md text-label-md bg-surface-container-low/50 pl-3 py-2.5 rounded-lg border-l-2 border-primary text-left cursor-pointer"
            >
              <span className="material-symbols-outlined" style={{ fontVariationSettings: '"FILL" 1' }}>
                home
              </span>
              <span>Home</span>
            </button>

            <button
              onClick={() => {
                setActiveNav('syllabus')
                setMobileMenuOpen(false)
                setSyllabusModalOpen(true)
              }}
              className="w-full flex items-center gap-3 text-ink-secondary font-label-md text-label-md pl-3 py-2.5 rounded-lg hover:text-ink-primary text-left cursor-pointer"
            >
              <span className="material-symbols-outlined">menu_book</span>
              <span>Syllabus</span>
            </button>

            <button
              onClick={() => {
                setActiveNav('learn')
                setMobileMenuOpen(false)
                const el = document.getElementById('enrolled-subjects-section')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="w-full flex items-center gap-3 text-ink-secondary font-label-md text-label-md pl-3 py-2.5 rounded-lg hover:text-ink-primary text-left cursor-pointer"
            >
              <span className="material-symbols-outlined">auto_stories</span>
              <span>Learn</span>
            </button>

            <button
              onClick={() => {
                setActiveNav('practice')
                setMobileMenuOpen(false)
                const el = document.getElementById('deliberate-practice-section')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="w-full flex items-center gap-3 text-ink-secondary font-label-md text-label-md pl-3 py-2.5 rounded-lg hover:text-ink-primary text-left cursor-pointer"
            >
              <span className="material-symbols-outlined">edit_note</span>
              <span>Practice</span>
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false)
                setLiveModalOpen(true)
              }}
              className="w-full flex items-center gap-3 text-ink-secondary font-label-md text-label-md pl-3 py-2.5 rounded-lg hover:text-ink-primary text-left cursor-pointer"
            >
              <span className="material-symbols-outlined">psychology</span>
              <span>Live Tutor</span>
            </button>

            <button
              onClick={() => {
                setActiveNav('progress')
                setMobileMenuOpen(false)
                const el = document.getElementById('consistency-section')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
              className="w-full flex items-center gap-3 text-ink-secondary font-label-md text-label-md pl-3 py-2.5 rounded-lg hover:text-ink-primary text-left cursor-pointer"
            >
              <span className="material-symbols-outlined">insights</span>
              <span>Progress</span>
            </button>

            <Link
              href={`/dashboard/${user.id}/settings?tab=avatars`}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full flex items-center gap-3 text-ink-secondary font-label-md text-label-md pl-3 py-2.5 rounded-lg hover:text-ink-primary text-left cursor-pointer"
            >
              <span className="material-symbols-outlined">settings</span>
              <span>Settings & Avatars</span>
            </Link>
          </nav>
        </div>

        <div className="border-t border-border-subtle pt-4">
          <div className="flex items-center gap-3 p-2 bg-surface rounded-xl border border-border-subtle">
            <div className="w-8 h-8 rounded-full bg-surface-container-high overflow-hidden flex items-center justify-center">
              {studentAvatar ? (
                <img
                  className="w-full h-full object-cover"
                  alt={studentName}
                  src={studentAvatar}
                />
              ) : (
                <span className="font-semibold text-ink-primary text-xs font-label-md">
                  {studentName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="font-label-md text-label-md text-ink-primary font-medium">
                {studentName}
              </p>
              <p className="font-label-micro text-label-micro text-ink-muted">
                {studentTrack}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* 10-Question Mastery Evaluation Modal */}
      {activeModule && (
        <MasteryQuizModal
          isOpen={quizModalOpen}
          onClose={() => setQuizModalOpen(false)}
          moduleId={activeModule.id}
          moduleTitle={activeModule.title}
          onCompleteSuccess={() => {
            router.refresh()
          }}
        />
      )}

    </div>
  )
}
