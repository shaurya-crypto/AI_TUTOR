'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  BookOpen,
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  Clock,
  ArrowLeft,
  RefreshCw,
  Sliders,
  Check,
  X,
  ExternalLink,
  Lock,
  KeyRound,
  ShieldCheck,
  LogOut,
  Plus,
  FileCode,
  Database,
  ArrowRight,
} from 'lucide-react'

export type EducationalBoard = 'CBSE' | 'ICSE' | 'IB'

interface WorkedExample {
  problem: string
  given: string
  formula: string
  substitution: string
  calculation: string
  finalAnswer: string
  unit: string
}

interface ConceptVisual {
  concept_title: string
  diagram_title: string
  diagram_type: string
  what_to_make: string
  svg?: string
  diagram_svg?: string
  timing_and_cue?: string
}

interface TextbookQuestion {
  q_num: string
  question: string
  question_type?: string
  solution_method?: string
}

interface TextbookExercise {
  exercise_number: string
  questions: TextbookQuestion[]
}

interface GeneratedModule {
  order_index: number
  title: string
  description: string
  subtopics: string[]
  key_concepts: string[]
  success_criteria: string
  chapter_notes?: string
  worked_examples?: WorkedExample[]
  common_misconceptions?: string[]
  ai_system_prompt_context: string
  visual_ideas?: string
  diagram_type?: string
  what_to_make?: string
  diagram_svg?: string
  chapter_flowchart?: string
  concept_visuals?: ConceptVisual[]
  textbook_definitions?: Array<{ concept: string; definition: string; si_units?: string }>
  textbook_examples?: Array<{ title: string; scenario: string }>
  textbook_exercises?: TextbookExercise[]
}

interface GeneratedCurriculum {
  title: string
  category: string
  board?: string
  description: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  order_index?: number
  modules: GeneratedModule[]
}

interface PublishedCurriculum {
  id: string
  title: string
  description?: string
  board: EducationalBoard
  category: string
  class_level: string
  order_index: number
  difficulty_level: string
  estimated_duration_minutes: number
  is_published: boolean
  created_at: string
  hasNotes?: boolean
  notesSummary?: string | null
  notesSourceFilename?: string | null
  geminiCacheName?: string | null
  modulesCount: number
  modules: Array<{
    id: string
    title: string
    order_index: number
    estimated_minutes: number
    chapter_notes?: string
    worked_examples?: any[]
    common_misconceptions?: string[]
    visual_ideas?: string
    diagram_type?: string
    what_to_make?: string
    diagram_svg?: string
  }>
}

const BOARDS: {
  id: EducationalBoard
  name: string
  subtitle: string
  status: 'active' | 'queued'
}[] = [
  {
    id: 'CBSE',
    name: 'CBSE',
    subtitle: 'Central Board of Secondary Education (NCERT Standards)',
    status: 'active',
  },
  {
    id: 'ICSE',
    name: 'ICSE',
    subtitle: 'CISCE / ISC Curriculum Standards',
    status: 'queued',
  },
  {
    id: 'IB',
    name: 'IB',
    subtitle: 'International Baccalaureate (DP / MYP)',
    status: 'queued',
  },
]

// Scope Invariant 1: Strictly Classes 6 to 12 only
const PRESET_CLASSES = [
  'Class 6',
  'Class 7',
  'Class 8',
  'Class 9',
  'Class 10',
  'Class 11',
  'Class 12',
]

const PRESET_SUBJECTS = [
  'Mathematics',
  'Science',
  'Physics',
  'Chemistry',
  'Biology',
]

function formatChapterTitleDisplay(curr: { title: string; order_index?: number }): string {
  const trimmed = (curr.title || '').trim()
  if (/^chapter\s*\d+/i.test(trimmed) || /^ch\.?\s*\d+/i.test(trimmed)) {
    return trimmed
  }
  return `Chapter ${curr.order_index ?? 1}: ${trimmed}`
}

export default function AdminPortalPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Security Gate State
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(false)
  const [adminPasswordInput, setAdminPasswordInput] = useState('')
  const [gateError, setGateError] = useState<string | null>(null)
  const [gateLoading, setGateLoading] = useState(false)

  // Active Studio Mode: 'notes' | 'syllabus' | 'pyq'
  const [activeStudioTab, setActiveStudioTab] = useState<'notes' | 'syllabus' | 'pyq'>('notes')

  // Ingestion Form State (Syllabus Mode)
  const [selectedBoard, setSelectedBoard] = useState<EducationalBoard>('CBSE')
  const [selectedClass, setSelectedClass] = useState<string>('Class 10')
  const [selectedSubject, setSelectedSubject] = useState<string>('Science')
  const [replaceExisting, setReplaceExisting] = useState<boolean>(false)

  // Input source for Syllabus: 'pdf' | 'text'
  const [inputTab, setInputTab] = useState<'pdf' | 'text'>('pdf')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [rawText, setRawText] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Past Year Questions (PYQ) Studio State
  const [pyqBoard, setPyqBoard] = useState<EducationalBoard>('CBSE')
  const [pyqClass, setPyqClass] = useState<string>('Class 10')
  const [pyqSubject, setPyqSubject] = useState<string>('Science')
  const [pyqTargetChapterId, setPyqTargetChapterId] = useState<string>('')
  const [pyqFiles, setPyqFiles] = useState<File[]>([])
  const [pyqRawText, setPyqRawText] = useState<string>('')
  const [isProcessingPyq, setIsProcessingPyq] = useState<boolean>(false)
  const [pyqProcessingStep, setPyqProcessingStep] = useState<string>('')
  const [chapterPyqs, setChapterPyqs] = useState<any | null>(null)
  const [isLoadingPyqs, setIsLoadingPyqs] = useState<boolean>(false)
  const pyqFileInputRef = useRef<HTMLInputElement | null>(null)

  // Chapter Notes Studio State
  const [notesBoard, setNotesBoard] = useState<EducationalBoard>('CBSE')
  const [notesClass, setNotesClass] = useState<string>('Class 10')
  const [notesSubject, setNotesSubject] = useState<string>('Science')
  const [notesTargetChapterId, setNotesTargetChapterId] = useState<string>('new')
  const [notesNewChapterNumber, setNotesNewChapterNumber] = useState<number>(1)
  const [notesNewChapterTitle, setNotesNewChapterTitle] = useState<string>('')
  const [notesFile, setNotesFile] = useState<File | null>(null)
  const [notesRawText, setNotesRawText] = useState<string>('')
  const [notesStrategy, setNotesStrategy] = useState<'synthesize_capsules' | 'map_existing'>('synthesize_capsules')
  const [isProcessingNotes, setIsProcessingNotes] = useState(false)
  const [notesProcessingStep, setNotesProcessingStep] = useState<string>('')
  const notesFileInputRef = useRef<HTMLInputElement | null>(null)

  // Modal Slide-Over State for Attaching Notes to Existing Chapter in Library
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedChapterForNotes, setSelectedChapterForNotes] = useState<PublishedCurriculum | null>(null)
  const [modalFile, setModalFile] = useState<File | null>(null)
  const [modalRawText, setModalRawText] = useState<string>('')
  const [modalStrategy, setModalStrategy] = useState<'synthesize_capsules' | 'map_existing'>('synthesize_capsules')
  const [isProcessingModal, setIsProcessingModal] = useState(false)
  const [modalProcessingStep, setModalProcessingStep] = useState<string>('')
  const modalFileInputRef = useRef<HTMLInputElement | null>(null)

  // AI Pipeline General State
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisStep, setAnalysisStep] = useState<string>('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Preview & Confirmation State for Syllabus
  const [previewData, setPreviewData] = useState<{
    board: EducationalBoard
    classLevel: string
    category: string
    curriculums: GeneratedCurriculum[]
  } | null>(null)
  const [isCommitting, setIsCommitting] = useState(false)
  const [expandedChapterIdx, setExpandedChapterIdx] = useState<number | null>(0)

  // Published Curriculums Library State
  const [publishedCurriculums, setPublishedCurriculums] = useState<PublishedCurriculum[]>([])
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(true)
  const [libraryBoardFilter, setLibraryBoardFilter] = useState<string>('all')
  const [libraryClassFilter, setLibraryClassFilter] = useState<string>('all')
  const [librarySubjectFilter, setLibrarySubjectFilter] = useState<string>('all')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [expandedLibraryCurrId, setExpandedLibraryCurrId] = useState<string | null>(null)

  // 1. Check user login and check admin session cookie
  useEffect(() => {
    const supabase = createClient()
    async function checkAuth() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (currentUser) {
        setUser(currentUser)
      }

      // Check server admin session
      try {
        const res = await fetch('/api/admin/auth')
        const data = await res.json()
        if (data.authenticated) {
          setIsAdminUnlocked(true)
        }
      } catch (e) {
        console.warn('Admin check error:', e)
      } finally {
        setAuthLoading(false)
      }
    }
    checkAuth()
  }, [router])

  // 2. Fetch existing published curriculums
  const fetchCurriculumsLibrary = async () => {
    setIsLoadingLibrary(true)
    try {
      const res = await fetch('/api/curriculum/ingest')
      const json = await res.json()
      if (json.success && Array.isArray(json.curriculums)) {
        setPublishedCurriculums(json.curriculums)
      }
    } catch (err) {
      console.error('Failed to load published curriculums library:', err)
    } finally {
      setIsLoadingLibrary(false)
    }
  }

  useEffect(() => {
    if (isAdminUnlocked) {
      fetchCurriculumsLibrary()
    }
  }, [isAdminUnlocked])

  // Handle Admin Security Gate Unlock
  const handleUnlockAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    setGateError(null)
    setGateLoading(true)

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPasswordInput }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        setGateError(data.error || 'Incorrect administrator password.')
        return
      }

      setIsAdminUnlocked(true)
      setAdminPasswordInput('')
    } catch (err: any) {
      setGateError('Connection error. Please try again.')
    } finally {
      setGateLoading(false)
    }
  }

  // Handle Lock / Logout Admin
  const handleLockAdmin = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' })
    setIsAdminUnlocked(false)
    setPreviewData(null)
  }

  // Handle Drag & Drop for Syllabus
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      setSelectedFile(file)
    }
  }

  // Handle Drag & Drop for Chapter Notes Studio
  const handleNotesDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      setNotesFile(file)
      // Read text if .md or .txt
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const reader = new FileReader()
        reader.onload = (re) => {
          if (typeof re.target?.result === 'string') {
            setNotesRawText(re.target.result)
          }
        }
        reader.readAsText(file)
      }
    }
  }

  // Handle Drag & Drop for Modal
  const handleModalNotesDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      setModalFile(file)
      if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const reader = new FileReader()
        reader.onload = (re) => {
          if (typeof re.target?.result === 'string') {
            setModalRawText(re.target.result)
          }
        }
        reader.readAsText(file)
      }
    }
  }

  // Handle Syllabus Analyze & Preview
  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (!selectedBoard) {
      setErrorMsg('Please select an Educational Board (CBSE, ICSE, or IB).')
      return
    }
    if (!selectedClass) {
      setErrorMsg('Please specify the Target Class Level.')
      return
    }
    if (!selectedSubject) {
      setErrorMsg('Please specify the Subject or Discipline.')
      return
    }

    if (inputTab === 'pdf' && !selectedFile) {
      setErrorMsg('Please upload a syllabus PDF or document.')
      return
    }
    if (inputTab === 'text' && rawText.trim().length < 10) {
      setErrorMsg('Please paste a detailed syllabus outline or chapter list (at least 10 characters).')
      return
    }

    setIsAnalyzing(true)
    const stages = [
      `Connecting to AI engine for ${selectedBoard} ${selectedClass} ${selectedSubject}...`,
      'Decomposing curriculum into 15-minute bite-sized capsules...',
      'Structuring chapters, key concepts, and exam success criteria...',
      'Synthesizing pedagogical cues with instant high-demand failover...',
      'Validating JSON schema and generating curriculum preview...',
    ]
    let stageIdx = 0
    setAnalysisStep(stages[0])
    const ticker = setInterval(() => {
      stageIdx = (stageIdx + 1) % stages.length
      setAnalysisStep(stages[stageIdx])
    }, 3500)

    try {
      const formData = new FormData()
      formData.append('board', selectedBoard)
      formData.append('classLevel', selectedClass)
      formData.append('category', selectedSubject)
      formData.append('mode', 'preview')
      formData.append('replaceExisting', replaceExisting ? 'true' : 'false')

      if (inputTab === 'pdf' && selectedFile) {
        formData.append('file', selectedFile)
      } else {
        formData.append('rawSyllabusText', rawText.trim())
      }

      const res = await fetch('/api/curriculum/ingest', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to analyze syllabus.')
      }

      setPreviewData({
        board: json.board,
        classLevel: json.classLevel,
        category: json.category,
        curriculums: json.curriculums,
      })
      setSuccessMsg(
        `Successfully extracted ${json.curriculumsCount} chapters and ${json.totalCapsulesCount} teachable capsules for ${json.board} ${json.classLevel}.`
      )
    } catch (err: any) {
      console.error('Analyze error:', err)
      setErrorMsg(err?.message || 'Error occurred while communicating with Gemini API.')
    } finally {
      clearInterval(ticker)
      setIsAnalyzing(false)
      setAnalysisStep('')
    }
  }

  // Commit Approved Syllabus Preview to Database
  const handleCommitToDatabase = async () => {
    if (!previewData) return

    setIsCommitting(true)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const payload = {
        board: previewData.board,
        classLevel: previewData.classLevel,
        category: previewData.category,
        mode: 'commit',
        replaceExisting,
        curriculumsToCommit: previewData.curriculums,
      }

      const res = await fetch('/api/curriculum/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to commit curriculums to database.')
      }

      setSuccessMsg(
        `Successfully persisted ${json.insertedCurriculumsCount} chapters and ${json.insertedModulesCount} capsules to Supabase database.`
      )
      setPreviewData(null)
      setSelectedFile(null)
      setRawText('')
      await fetchCurriculumsLibrary()
    } catch (err: any) {
      console.error('Commit error:', err)
      setErrorMsg(err?.message || 'Failed to save chapters to database.')
    } finally {
      setIsCommitting(false)
    }
  }

  // Handle Chapter Notes Submission (Studio Tab)
  const handleProcessChapterNotes = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    const activeText = notesRawText.trim()
    if (!activeText && !notesFile) {
      setErrorMsg('Please upload a chapter notes file (.pdf, .md, .txt) or paste markdown notes.')
      return
    }

    let targetChapterTitle = notesNewChapterTitle.trim()
    let targetCurriculumId: string | undefined = undefined

    if (notesTargetChapterId !== 'new') {
      const match = publishedCurriculums.find((c) => c.id === notesTargetChapterId)
      if (match) {
        targetCurriculumId = match.id
        targetChapterTitle = match.title
      }
    }

    if (!targetChapterTitle) {
      setErrorMsg('Please select an existing chapter or provide a title for the new chapter.')
      return
    }

    setIsProcessingNotes(true)
    const noteStages = [
      'Uploading book chapter document and calculating token footprint...',
      'Decomposing into 4 to 8 granular 15-minute capsules (scaled to chapter length)...',
      'Synthesizing authentic definitions, verbatim laws, and SI units from textbook...',
      'Formulating worked board numericals with Given, Formula, and Steps...',
      'Compiling common board misconceptions and AI teaching prompts...',
      'Writing structured capsules and updating Supabase database...',
    ]
    let noteStageIdx = 0
    setNotesProcessingStep(noteStages[0])
    const ticker = setInterval(() => {
      noteStageIdx = (noteStageIdx + 1) % noteStages.length
      setNotesProcessingStep(noteStages[noteStageIdx])
    }, 3500)

    try {
      const formData = new FormData()
      formData.append('action', 'attach_chapter_notes')
      if (targetCurriculumId) {
        formData.append('curriculumId', targetCurriculumId)
      }
      formData.append('board', notesBoard)
      formData.append('classLevel', notesClass)
      formData.append('category', notesSubject)
      formData.append('chapterNumber', String(notesNewChapterNumber))
      formData.append('chapterTitle', targetChapterTitle)
      formData.append('notesText', activeText)
      formData.append('strategy', notesStrategy)

      if (notesFile) {
        formData.append('file', notesFile)
        formData.append('notesSourceFilename', notesFile.name)
      }

      const res = await fetch('/api/curriculum/ingest', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to synthesize chapter notes.')
      }

      setSuccessMsg(
        `Successfully ingested book chapter and synthesized ${json.capsulesCount} capsules for "${json.chapterTitle}". ${
          json.geminiCacheName ? 'Gemini Context Cache enabled.' : ''
        }`
      )
      setNotesRawText('')
      setNotesFile(null)
      setNotesNewChapterTitle('')
      await fetchCurriculumsLibrary()
    } catch (err: any) {
      console.error('Chapter notes error:', err)
      setErrorMsg(err?.message || 'An error occurred while processing chapter notes.')
    } finally {
      clearInterval(ticker)
      setIsProcessingNotes(false)
      setNotesProcessingStep('')
    }
  }

  // Open modal to attach notes to a specific chapter in the library
  const handleOpenAttachNotesModal = (curr: PublishedCurriculum) => {
    setSelectedChapterForNotes(curr)
    setModalRawText('')
    setModalFile(null)
    setModalStrategy('synthesize_capsules')
    setModalOpen(true)
  }

  // Submit notes from the slide-over modal
  const handleModalSubmitNotes = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedChapterForNotes) return

    const activeText = modalRawText.trim()
    if (!activeText && !modalFile) {
      setErrorMsg('Please upload a textbook chapter file (.pdf, .md, .txt) or paste markdown notes.')
      return
    }

    setIsProcessingModal(true)
    const modalStages = [
      'Uploading book chapter document and calculating token footprint...',
      'Decomposing into 4 to 8 granular capsules scaled to chapter length...',
      'Extracting verbatim definitions, derivations, and board numericals...',
      'Writing updated capsules to Supabase database...',
    ]
    let modalIdx = 0
    setModalProcessingStep(modalStages[0])
    const ticker = setInterval(() => {
      modalIdx = (modalIdx + 1) % modalStages.length
      setModalProcessingStep(modalStages[modalIdx])
    }, 3500)

    try {
      const formData = new FormData()
      formData.append('action', 'attach_chapter_notes')
      formData.append('curriculumId', selectedChapterForNotes.id)
      formData.append('board', selectedChapterForNotes.board)
      formData.append('classLevel', selectedChapterForNotes.class_level)
      formData.append('category', selectedChapterForNotes.category)
      formData.append('chapterNumber', String(selectedChapterForNotes.order_index))
      formData.append('chapterTitle', selectedChapterForNotes.title)
      formData.append('notesText', activeText)
      formData.append('strategy', modalStrategy)

      if (modalFile) {
        formData.append('file', modalFile)
        formData.append('notesSourceFilename', modalFile.name)
      }

      const res = await fetch('/api/curriculum/ingest', {
        method: 'POST',
        body: formData,
      })

      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to attach notes.')
      }

      setSuccessMsg(
        `Successfully ingested book chapter and synthesized ${json.capsulesCount} capsules for "${selectedChapterForNotes.title}".`
      )
      setModalOpen(false)
      setSelectedChapterForNotes(null)
      await fetchCurriculumsLibrary()
    } catch (err: any) {
      console.error('Modal attach notes error:', err)
      setErrorMsg(err?.message || 'Failed to attach notes to chapter.')
    } finally {
      clearInterval(ticker)
      setIsProcessingModal(false)
      setModalProcessingStep('')
    }
  }

  // Delete a Published Curriculum Chapter
  const handleDeleteCurriculum = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"? This will delete all child topic capsules.`)) {
      return
    }

    setDeletingId(id)
    setErrorMsg(null)
    setSuccessMsg(null)

    try {
      const res = await fetch(`/api/curriculum/ingest?id=${id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to delete curriculum.')
      }

      setPublishedCurriculums((prev) => prev.filter((c) => c.id !== id))
      setSuccessMsg(`Chapter "${title}" has been deleted from the database.`)
    } catch (err: any) {
      console.error('Delete error:', err)
      setErrorMsg(err?.message || 'Failed to delete curriculum.')
    } finally {
      setDeletingId(null)
    }
  }

  // Existing chapters available for chapter notes dropdown matching current selection
  const matchingChaptersForNotes = publishedCurriculums.filter(
    (c) =>
      c.board === notesBoard &&
      c.class_level === notesClass &&
      c.category.toLowerCase() === notesSubject.toLowerCase()
  )

  // Matching chapters for PYQ Studio
  const matchingChaptersForPyq = publishedCurriculums.filter(
    (c) =>
      c.board === pyqBoard &&
      c.class_level === pyqClass &&
      c.category.toLowerCase() === pyqSubject.toLowerCase()
  )

  // Fetch PYQ Practice Set for selected chapter
  const fetchChapterPyqs = async (curriculumId: string) => {
    if (!curriculumId) {
      setChapterPyqs(null)
      return
    }
    setIsLoadingPyqs(true)
    try {
      const res = await fetch(`/api/curriculum/pyq?curriculumId=${curriculumId}`)
      const json = await res.json()
      if (json.success && Array.isArray(json.pyqs) && json.pyqs.length > 0) {
        setChapterPyqs(json.pyqs[0])
      } else {
        setChapterPyqs(null)
      }
    } catch (err) {
      console.error('Failed to fetch PYQs:', err)
      setChapterPyqs(null)
    } finally {
      setIsLoadingPyqs(false)
    }
  }

  // Handle PYQ File Selection
  const handlePyqFilesChange = (files: FileList | null) => {
    if (!files) return
    const newFiles = Array.from(files)
    setPyqFiles((prev) => [...prev, ...newFiles])
  }

  const handleRemovePyqFile = (index: number) => {
    setPyqFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handlePyqDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files)
      setPyqFiles((prev) => [...prev, ...newFiles])
    }
  }

  // Process & Synthesize PYQs
  const handleSynthesizePyqs = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pyqTargetChapterId) {
      setErrorMsg('Please select a target chapter to associate past year questions with.')
      return
    }
    if (pyqFiles.length === 0 && (!pyqRawText || pyqRawText.trim().length < 10)) {
      setErrorMsg('Please upload at least one past year question paper or paste the questions.')
      return
    }

    const targetChapter = publishedCurriculums.find((c) => c.id === pyqTargetChapterId)
    if (!targetChapter) {
      setErrorMsg('Selected chapter not found in library.')
      return
    }

    setIsProcessingPyq(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    setPyqProcessingStep('Reading and parsing past year exam papers...')

    const ticker = setInterval(() => {
      setPyqProcessingStep((prev) => {
        if (prev.includes('Reading')) return 'Classifying board questions by chapter...'
        if (prev.includes('Classifying')) return 'Synthesizing authentic step-by-step marking schemes...'
        if (prev.includes('Synthesizing')) return 'Compiling high-yield Chapter PYQ Practice Set...'
        return 'Finalizing and indexing into database...'
      })
    }, 3200)

    try {
      const formData = new FormData()
      formData.append('curriculumId', pyqTargetChapterId)
      formData.append('board', pyqBoard)
      formData.append('classLevel', pyqClass)
      formData.append('category', pyqSubject)
      formData.append('chapterTitle', targetChapter.title)
      formData.append('rawText', pyqRawText)

      for (const file of pyqFiles) {
        formData.append('files', file)
      }

      const res = await fetch('/api/curriculum/pyq', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to synthesize PYQ practice set.')
      }

      setSuccessMsg(`Successfully compiled ${json.practiceSetCount} past year questions for "${targetChapter.title}"!`)
      setPyqFiles([])
      setPyqRawText('')
      await fetchChapterPyqs(pyqTargetChapterId)
    } catch (err: any) {
      console.error('PYQ synthesis error:', err)
      setErrorMsg(err?.message || 'An error occurred while compiling the PYQ practice set.')
    } finally {
      clearInterval(ticker)
      setIsProcessingPyq(false)
      setPyqProcessingStep('')
    }
  }

  // Delete PYQ Practice Set
  const handleDeletePyqSet = async (pyqId: string) => {
    if (!window.confirm('Are you sure you want to delete this Chapter PYQ Practice Set?')) return
    try {
      const res = await fetch(`/api/curriculum/pyq?id=${pyqId}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        setChapterPyqs(null)
        setSuccessMsg('PYQ Practice Set deleted.')
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete PYQ set.')
    }
  }

  // Filter Published Curriculums for Library
  const filteredLibrary = publishedCurriculums.filter((c) => {
    if (libraryBoardFilter !== 'all' && c.board !== libraryBoardFilter) return false
    if (libraryClassFilter !== 'all' && c.class_level !== libraryClassFilter) return false
    if (librarySubjectFilter !== 'all' && c.category.toLowerCase() !== librarySubjectFilter.toLowerCase())
      return false
    return true
  })

  const libraryClasses = Array.from(new Set(publishedCurriculums.map((c) => c.class_level).filter(Boolean)))
  const librarySubjects = Array.from(new Set(publishedCurriculums.map((c) => c.category).filter(Boolean)))

  // -------------------------------------------------------------------------
  // RENDER: Loading State
  // -------------------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0a120c] flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
          <span className="text-emerald-300 font-mono text-xs tracking-wider">
            Verifying administrative session...
          </span>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // RENDER: Security Gate (Locked State)
  // -------------------------------------------------------------------------
  if (!isAdminUnlocked) {
    return (
      <div className="min-h-screen bg-[#0a120c] text-emerald-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md p-8 rounded-3xl bg-[#0f1d14] border border-emerald-900/80 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-950 border border-emerald-700/60 flex items-center justify-center text-emerald-300 shadow-md">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">
              Admin Curriculum Studio
            </h1>
            <p className="text-xs text-emerald-300/80 font-mono">
              Academic administrative security gate
            </p>
          </div>

          {gateError && (
            <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{gateError}</span>
            </div>
          )}

          <form onSubmit={handleUnlockAdmin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-mono font-medium text-emerald-300 uppercase tracking-wider">
                Administrator Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter administrator password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full h-11 px-4 pl-10 rounded-xl bg-[#08100a] border border-emerald-800/80 text-sm text-emerald-100 placeholder:text-emerald-700/60 focus:outline-none focus:border-emerald-500 font-mono tracking-widest"
                  required
                />
                <KeyRound className="w-4 h-4 text-emerald-500/70 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <Button
              type="submit"
              disabled={gateLoading}
              className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {gateLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating Credentials...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Authorize Administrator</span>
                </>
              )}
            </Button>
          </form>

          <div className="pt-2 text-center">
            <Link
              href={user ? `/dashboard/${user.id}` : '/login'}
              className="text-[11px] text-emerald-400/70 hover:text-emerald-300 flex items-center justify-center gap-1 font-mono transition-colors"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Return to Student Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // UNLOCKED: Admin Curriculum Studio with Chapter Notes & Multi-Stage Ingestion
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#0a120c] text-emerald-100 flex flex-col font-sans">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 w-full px-6 py-4 bg-[#0f1d14]/90 backdrop-blur-md border-b border-emerald-900/60 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <Link
            href={user ? `/dashboard/${user.id}` : '/dashboard'}
            className="p-2 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 transition-colors"
            title="Return to Student Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base text-white tracking-tight">
                Curriculum & Chapter Notes Studio
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                Admin Zone
              </span>
            </div>
            <p className="text-xs text-emerald-300/70 font-mono">
              CBSE Class 6 to 12 Academic Notes Ingestion and 15-Minute Socratic Capsule Synthesis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={user ? `/dashboard/${user.id}` : '/dashboard'}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-800/60 hover:bg-emerald-700/80 text-white text-xs font-semibold border border-emerald-600/40 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            <span>Student Dashboard</span>
            <ExternalLink className="w-3.5 h-3.5 text-emerald-300" />
          </Link>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleLockAdmin}
            className="px-3 py-1.5 rounded-xl text-xs text-rose-300 hover:text-white hover:bg-rose-950/60 border border-rose-900/50 flex items-center gap-1.5 cursor-pointer"
            title="Lock administrative session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock Admin</span>
          </Button>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-10">
        {/* Alerts */}
        {errorMsg && (
          <div className="p-4 rounded-2xl bg-rose-950/70 border border-rose-800/80 text-rose-200 text-sm flex items-start gap-3 shadow-md animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold block">Notice:</strong>
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-600/80 text-emerald-200 text-sm flex items-start gap-3 shadow-md animate-in fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-semibold block">Success:</strong>
              <span>{successMsg}</span>
            </div>
            <button
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* WORKFLOW TABS: Chapter-Wise Book Ingestion vs Whole Book / Syllabus Outline */}
        <div className="flex items-center justify-between border-b border-emerald-900/60 pb-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveStudioTab('notes')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeStudioTab === 'notes'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-[#0c1610] text-emerald-400 hover:bg-emerald-950/80 border border-emerald-900/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Upload Book Chapter (PDF / Document)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStudioTab('syllabus')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeStudioTab === 'syllabus'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-[#0c1610] text-emerald-400 hover:bg-emerald-950/80 border border-emerald-900/60'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Full Syllabus Outline Ingestion</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveStudioTab('pyq')}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeStudioTab === 'pyq'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-[#0c1610] text-emerald-400 hover:bg-emerald-950/80 border border-emerald-900/60'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Past Year Papers (PYQ) Studio</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-emerald-400/80 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800/60 hidden sm:inline-block">
            Strictly Classes 6-12 (CBSE Active)
          </span>
        </div>

        {/* ------------------------------------------------------------------- */}
        {/* WORKFLOW 1: CHAPTER-WISE BOOK & NOTES INGESTION STUDIO */}
        {/* ------------------------------------------------------------------- */}
        {activeStudioTab === 'notes' && (
          <section className="p-6 md:p-8 rounded-3xl bg-[#112017] border border-emerald-900/80 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-emerald-900/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-800/80 border border-emerald-600/40 flex items-center justify-center text-white shadow-xs">
                  <FileText className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white tracking-tight">
                    Upload Book Chapter & Dynamic 4-8 Capsule Synthesis
                  </h2>
                  <p className="text-xs text-emerald-300/70 font-mono">
                    Upload authentic textbook chapter (.pdf, .md, .txt) with Chapter Number & Name. AI synthesizes 4 to 8 detailed, topper-ready capsules scaled to chapter length.
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800/60">
                Implicit & Context Caching Enabled
              </span>
            </div>

            <form onSubmit={handleProcessChapterNotes} className="space-y-6">
              {/* BOARD SELECTION */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-emerald-200 uppercase font-mono tracking-wider">
                  Select Educational Board <span className="text-emerald-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {BOARDS.map((board) => {
                    const isSelected = notesBoard === board.id
                    const isQueued = board.status === 'queued'
                    return (
                      <button
                        key={board.id}
                        type="button"
                        onClick={() => setNotesBoard(board.id)}
                        className={`p-4 rounded-2xl text-left border transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-emerald-800/90 border-emerald-400 text-white shadow-md ring-2 ring-emerald-500/40'
                            : 'bg-[#0c1610] border-emerald-900/80 text-emerald-300 hover:border-emerald-700/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold tracking-tight font-mono">
                            {board.name}
                          </span>
                          {isQueued ? (
                            <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                              In Ingestion Queue (Coming Soon)
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Active Pipeline
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-emerald-200/80 mt-1 line-clamp-1">
                          {board.subtitle}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* CLASS AND SUBJECT SELECTION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-emerald-200 uppercase font-mono tracking-wider">
                    Target Class (School Scope: Classes 6-12) <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={notesClass}
                    onChange={(e) => setNotesClass(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0c1610] border border-emerald-800/70 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
                  >
                    {PRESET_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-emerald-200 uppercase font-mono tracking-wider">
                    Subject / Discipline <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={notesSubject}
                    onChange={(e) => setNotesSubject(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0c1610] border border-emerald-800/70 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
                  >
                    {PRESET_SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* TARGET CHAPTER SELECTION (EXISTING OR CREATE NEW) */}
              <div className="p-4 rounded-2xl bg-[#0c1711] border border-emerald-900/70 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-emerald-200 uppercase font-mono tracking-wider">
                      Select Target Chapter OR Ingest New Chapter:
                    </label>
                    <span className="text-[11px] font-mono text-emerald-400/80">
                      {matchingChaptersForNotes.length} Chapters in Library
                    </span>
                  </div>
                  <select
                    value={notesTargetChapterId}
                    onChange={(e) => setNotesTargetChapterId(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#08110a] border border-emerald-800/70 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
                  >
                    <option value="new">+ Ingest New Book Chapter (Specify Number & Name below)</option>
                    {matchingChaptersForNotes.map((curr) => {
                      const displayTitle = formatChapterTitleDisplay(curr)
                      return (
                        <option key={curr.id} value={curr.id}>
                          {displayTitle} ({curr.modulesCount} capsules)
                          {curr.hasNotes ? ' - Book Attached' : ' - Needs Book Ingestion'}
                        </option>
                      )
                    })}
                  </select>
                </div>

                {notesTargetChapterId !== 'new' && (() => {
                  const selectedCurr = matchingChaptersForNotes.find((c) => c.id === notesTargetChapterId)
                  if (!selectedCurr) return null
                  return (
                    <div className="p-3.5 rounded-xl bg-[#08110a] border border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5">
                        <div className="font-semibold text-white">
                          {formatChapterTitleDisplay(selectedCurr)}
                        </div>
                        <div className="text-[11px] font-mono text-emerald-300/80">
                          {selectedCurr.modulesCount} Current Capsules • {selectedCurr.board} {selectedCurr.class_level} {selectedCurr.category}
                        </div>
                      </div>
                      <div>
                        {selectedCurr.hasNotes ? (
                          <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Book Attached {selectedCurr.notesSourceFilename ? `(${selectedCurr.notesSourceFilename})` : ''}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-semibold px-2.5 py-1 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-sky-400" />
                            <span>Needs Book Ingestion (Upload PDF below)</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })()}

                {notesTargetChapterId === 'new' && (
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2 border-t border-emerald-900/50">
                    <div className="space-y-1 sm:col-span-1">
                      <label className="block text-[11px] font-mono text-emerald-300">
                        Chapter Number <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={notesNewChapterNumber}
                        onChange={(e) => setNotesNewChapterNumber(parseInt(e.target.value, 10) || 1)}
                        className="w-full h-10 px-3 rounded-xl bg-[#08110a] border border-emerald-800/70 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-3">
                      <label className="block text-[11px] font-mono text-emerald-300">
                        Chapter Name / Title <span className="text-emerald-400">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Chemical Reactions and Equations, Real Numbers, Force and Laws of Motion"
                        value={notesNewChapterTitle}
                        onChange={(e) => setNotesNewChapterTitle(e.target.value)}
                        className="w-full h-10 px-3.5 rounded-xl bg-[#08110a] border border-emerald-800/70 text-xs text-white focus:outline-none focus:border-emerald-500"
                        required={notesTargetChapterId === 'new'}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* BOOK CHAPTER INPUT DROPZONE & MARKDOWN PASTE */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-200 uppercase font-mono tracking-wider">
                      Upload Book Chapter (PDF / Document) <span className="text-emerald-400">*</span>
                    </label>
                    <p className="text-[11px] text-emerald-300/70 font-mono mt-0.5">
                      Upload authentic textbook chapter PDF (NCERT, Selina, IB) or paste markdown notes. AI decomposes into 4 to 8 granular capsules dynamically scaled to chapter length.
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400/80">
                    {notesFile
                      ? `${(notesFile.size / (1024 * 1024)).toFixed(2)} MB`
                      : notesRawText
                      ? `${notesRawText.split(/\s+/).filter(Boolean).length} words`
                      : 'No file selected'}
                  </span>
                </div>

                {/* Dropzone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleNotesDrop}
                  onClick={() => notesFileInputRef.current?.click()}
                  className={`p-6 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                    notesFile
                      ? 'border-emerald-500 bg-emerald-950/40 shadow-inner'
                      : 'border-emerald-800/80 hover:border-emerald-500/80 bg-[#0c1610]'
                  }`}
                >
                  <input
                    ref={notesFileInputRef}
                    type="file"
                    accept=".pdf,.md,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        const file = e.target.files[0]
                        setNotesFile(file)
                        if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
                          const reader = new FileReader()
                          reader.onload = (re) => {
                            if (typeof re.target?.result === 'string') {
                              setNotesRawText(re.target.result)
                            }
                          }
                          reader.readAsText(file)
                        }
                      }
                    }}
                    className="hidden"
                  />
                  {notesFile ? (
                    <div className="flex items-center justify-between w-full max-w-md p-3 rounded-xl bg-emerald-950/60 border border-emerald-600/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-700/30 border border-emerald-500 flex items-center justify-center text-emerald-300">
                          <FileText className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-semibold text-white flex items-center gap-2">
                            <span className="truncate max-w-[200px]">{notesFile.name}</span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                              {(notesFile.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                          <span className="text-[11px] text-emerald-300/80 font-mono">
                            Ready for ingestion. Click to replace file.
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation()
                          setNotesFile(null)
                        }}
                        className="text-emerald-400/80 hover:text-white p-1 rounded-lg hover:bg-emerald-900/60"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div className="text-center">
                        <span className="text-xs font-semibold text-emerald-200 block">
                          Drag and drop Chapter PDF (.pdf, .md, .txt) or click to browse
                        </span>
                        <span className="text-[10px] text-emerald-400/70 font-mono">
                          Upload authentic textbook chapter PDF (NCERT / ICSE / IB)
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Markdown Paste Area */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono text-emerald-300">
                      Or Paste Chapter Notes / Content (Markdown or Plain Text):
                    </span>
                    {notesRawText && (
                      <button
                        type="button"
                        onClick={() => setNotesRawText('')}
                        className="text-[10px] font-mono text-emerald-400 hover:text-white"
                      >
                        Clear Text
                      </button>
                    )}
                  </div>
                  <textarea
                    rows={6}
                    placeholder={`# Chapter 1: Real Numbers\n\n## 1. Fundamental Theorem of Arithmetic\nEvery composite number can be expressed (factorised) as a product of primes...\n\n## 2. Worked Numericals\nProve that √5 is irrational...`}
                    value={notesRawText}
                    onChange={(e) => setNotesRawText(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-[#08110a] border border-emerald-800/80 text-xs text-emerald-100 placeholder:text-emerald-700/60 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                  />
                </div>
              </div>

              {/* PROCESSING STRATEGY */}
              <div className="p-4 rounded-2xl bg-[#0c1711] border border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-white uppercase font-mono tracking-wider">
                    Capsule Decomposition Strategy
                  </h4>
                  <p className="text-[11px] text-emerald-300/70">
                    {notesStrategy === 'synthesize_capsules'
                      ? 'Synthesize 4 to 8 granular 15-minute teachable capsules dynamically scaled to chapter length & depth.'
                      : 'Map synthesized textbook definitions, graphs, and exemplars onto the existing capsules of this chapter.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setNotesStrategy('synthesize_capsules')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      notesStrategy === 'synthesize_capsules'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
                    }`}
                  >
                    Synthesize 4-8 Capsules (Scaled to Length)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotesStrategy('map_existing')}
                    disabled={notesTargetChapterId === 'new'}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      notesStrategy === 'map_existing'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60 disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    Map to Existing Capsules
                  </button>
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <Button
                type="submit"
                disabled={isProcessingNotes}
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isProcessingNotes ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{notesProcessingStep || 'Synthesizing 4-8 Capsules with Gemini...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Synthesize Teachable Capsules & Save to Database</span>
                  </>
                )}
              </Button>
            </form>
          </section>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* WORKFLOW 2: SYLLABUS OUTLINE INGESTION */}
        {/* ------------------------------------------------------------------- */}
        {activeStudioTab === 'syllabus' && (
          <section className="p-6 md:p-8 rounded-3xl bg-[#112017] border border-emerald-900/80 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-emerald-900/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-800/80 border border-emerald-600/40 flex items-center justify-center text-white shadow-xs">
                  <BookOpen className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white tracking-tight">
                    Syllabus Ingestion & Outline Decomposition
                  </h2>
                  <p className="text-xs text-emerald-300/70 font-mono">
                    Select Board (CBSE / ICSE / IB), Class Level, Subject, and decompose complete syllabus
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-mono text-emerald-400/80 bg-emerald-950 px-3 py-1 rounded-full border border-emerald-800/60">
                CBSE • ICSE • IB Engine
              </span>
            </div>

            <form onSubmit={handleAnalyze} className="space-y-6">
              {/* BOARD SELECTION */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-emerald-200 uppercase font-mono tracking-wider">
                  Select Educational Board <span className="text-emerald-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {BOARDS.map((board) => {
                    const isSelected = selectedBoard === board.id
                    return (
                      <button
                        key={board.id}
                        type="button"
                        onClick={() => setSelectedBoard(board.id)}
                        className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-800/90 border-emerald-400 text-white shadow-md ring-2 ring-emerald-500/40'
                            : 'bg-[#0c1610] border-emerald-900/80 text-emerald-300 hover:border-emerald-700/80'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold tracking-tight font-mono">
                            {board.name}
                          </span>
                          {board.status === 'queued' ? (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40">
                              In Ingestion Queue (Coming Soon)
                            </span>
                          ) : (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Active Pipeline
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-emerald-200/80 mt-1 line-clamp-1">
                          {board.subtitle}
                        </p>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* CLASS AND SUBJECT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-emerald-200 uppercase font-mono tracking-wider">
                    Target Class / Grade <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0c1610] border border-emerald-800/70 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
                  >
                    {PRESET_CLASSES.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-emerald-200 uppercase font-mono tracking-wider">
                    Subject / Discipline <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0c1610] border border-emerald-800/70 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
                  >
                    {PRESET_SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SEQUENCING STRATEGY */}
              <div className="p-4 rounded-2xl bg-[#0c1711] border border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Sliders className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-semibold text-white uppercase font-mono tracking-wider">
                      Chapter Sequencing for {selectedBoard}
                    </h4>
                    <p className="text-[11px] text-emerald-300/70">
                      {replaceExisting
                        ? `Replace mode: Existing chapters for ${selectedBoard} (${selectedClass} - ${selectedSubject}) will be replaced.`
                        : `Append mode: New chapters will be sequenced sequentially after existing ${selectedBoard} chapters.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setReplaceExisting(false)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      !replaceExisting
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
                    }`}
                  >
                    Append (Recommended)
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplaceExisting(true)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                      replaceExisting
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900/60'
                    }`}
                  >
                    Replace All
                  </button>
                </div>
              </div>

              {/* INPUT TABS: PDF OR TEXT */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-emerald-900/60 pb-2">
                  <button
                    type="button"
                    onClick={() => setInputTab('pdf')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                      inputTab === 'pdf'
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-400 hover:text-white'
                    }`}
                  >
                    Upload Syllabus Document (.pdf)
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputTab('text')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono uppercase tracking-wider transition-colors cursor-pointer ${
                      inputTab === 'text'
                        ? 'bg-emerald-600 text-white'
                        : 'text-emerald-400 hover:text-white'
                    }`}
                  >
                    Paste Syllabus Text / Chapters
                  </button>
                </div>

                {inputTab === 'pdf' ? (
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className="p-8 rounded-2xl border-2 border-dashed border-emerald-800/80 hover:border-emerald-500/80 bg-[#0c1610] flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={(e) => {
                        if (e.target.files && e.target.files.length > 0) {
                          setSelectedFile(e.target.files[0])
                        }
                      }}
                      className="hidden"
                    />
                    <UploadCloud className="w-10 h-10 text-emerald-400" />
                    <span className="text-xs font-semibold text-emerald-200">
                      {selectedFile ? selectedFile.name : `Drop official ${selectedBoard} syllabus PDF or click to browse`}
                    </span>
                    <span className="text-[11px] text-emerald-400/70 font-mono">
                      PDF format, up to 20MB
                    </span>
                  </div>
                ) : (
                  <textarea
                    rows={6}
                    placeholder={`Paste ${selectedBoard} syllabus outline with chapters and topics...`}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    className="w-full p-4 rounded-2xl bg-[#08110a] border border-emerald-800/80 text-xs text-emerald-100 placeholder:text-emerald-700/60 focus:outline-none focus:border-emerald-500 font-mono"
                  />
                )}
              </div>

              <Button
                type="submit"
                disabled={isAnalyzing}
                className="w-full h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{analysisStep || 'Analyzing Syllabus with Gemini...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze & Preview 15-Minute Topic Capsules</span>
                  </>
                )}
              </Button>
            </form>
          </section>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* SECTION 2: AI DECOMPOSITION PREVIEW & CONFIRMATION PANEL */}
        {/* ------------------------------------------------------------------- */}
        {previewData && (
          <section className="p-6 md:p-8 rounded-3xl bg-[#112318] border-2 border-emerald-500/70 shadow-2xl space-y-6 animate-in fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900/80 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-white tracking-tight">
                    Review {previewData.board} Chapters & 15-Minute Capsules
                  </h3>
                </div>
                <p className="text-xs text-emerald-300/80 font-mono mt-1">
                  Board: {previewData.board} • Level: {previewData.classLevel} • Subject: {previewData.category} •{' '}
                  {previewData.curriculums.length} Chapters identified
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewData(null)}
                  disabled={isCommitting}
                  className="bg-[#0c1610] hover:bg-emerald-950 border-emerald-800 text-emerald-300 rounded-xl text-xs h-10 px-4 cursor-pointer"
                >
                  Discard Preview
                </Button>
                <Button
                  type="button"
                  onClick={handleCommitToDatabase}
                  disabled={isCommitting}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold h-10 px-5 shadow-lg flex items-center gap-2 cursor-pointer active:scale-95 transition-transform"
                >
                  {isCommitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Approve & Save to Database</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {previewData.curriculums.map((curr, cIdx) => {
                const isExpanded = expandedChapterIdx === cIdx
                const totalMinutes = (curr.modules?.length || 1) * 15

                return (
                  <div
                    key={cIdx}
                    className="rounded-2xl bg-[#0d1a12] border border-emerald-800/70 overflow-hidden shadow-md"
                  >
                    <div
                      onClick={() => setExpandedChapterIdx(isExpanded ? null : cIdx)}
                      className="p-4 px-5 flex items-center justify-between cursor-pointer hover:bg-emerald-900/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-lg bg-emerald-800/80 border border-emerald-600/40 text-xs font-bold font-mono text-emerald-200 flex items-center justify-center shrink-0">
                          {cIdx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-white tracking-tight">
                            {curr.title}
                          </h4>
                          <p className="text-[11px] text-emerald-300/70 line-clamp-1">
                            {curr.description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950 px-2.5 py-1 rounded-full border border-emerald-800/60 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>{curr.modules?.length || 0} Capsules ({totalMinutes} mins)</span>
                        </span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-emerald-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-5 pt-2 border-t border-emerald-900/60 bg-[#0a150e]/60 space-y-3">
                        <div className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider mb-2">
                          15-Minute Teachable Topic Capsules:
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                          {(curr.modules || []).map((mod, mIdx) => (
                            <div
                              key={mIdx}
                              className="p-4 rounded-xl bg-[#112317] border border-emerald-800/60 space-y-2.5 shadow-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/50">
                                    Capsule #{mod.order_index || mIdx + 1}
                                  </span>
                                  <h5 className="text-xs font-semibold text-white tracking-tight">
                                    {mod.title}
                                  </h5>
                                </div>
                                <span className="text-[10px] font-mono text-emerald-400 shrink-0">
                                  15 mins
                                </span>
                              </div>

                              <p className="text-[11px] text-emerald-200/80 leading-relaxed">
                                {mod.description}
                              </p>

                              {mod.subtopics && mod.subtopics.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-[10px] font-mono text-emerald-400/70 uppercase">
                                    Subtopics:
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {mod.subtopics.map((st, i) => (
                                      <span
                                        key={i}
                                        className="text-[10px] bg-emerald-950 px-2 py-0.5 rounded text-emerald-300 border border-emerald-800/60"
                                      >
                                        {st}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Diagram & Visual Generation Blueprint */}
                              {(mod.visual_ideas || mod.what_to_make || mod.diagram_type) && (
                                <div className="p-3 rounded-xl bg-[#09150d] border border-emerald-700/60 space-y-2">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="text-[10.5px] font-mono font-bold text-sky-300 flex items-center gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                                      <span>Diagram & Visual Blueprint</span>
                                    </span>
                                    {mod.diagram_type && (
                                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/80">
                                        {mod.diagram_type}
                                      </span>
                                    )}
                                  </div>

                                  {mod.visual_ideas && (
                                    <p className="text-[11px] text-emerald-200/90 leading-snug">
                                      <strong className="text-emerald-400 font-mono">Idea:</strong> {mod.visual_ideas}
                                    </p>
                                  )}

                                  {mod.what_to_make && (
                                    <p className="text-[10.5px] text-emerald-300/80 leading-relaxed font-mono">
                                      <strong className="text-emerald-400">What to make in this:</strong> {mod.what_to_make}
                                    </p>
                                  )}

                                  {mod.diagram_svg && mod.diagram_svg.includes('<svg') && (
                                    <div className="mt-1 p-2 rounded-lg bg-[#040805] border border-emerald-900/90 overflow-hidden flex items-center justify-center max-h-[140px]">
                                      <div
                                        className="w-full h-full flex items-center justify-center [&>svg]:max-h-[120px] [&>svg]:w-auto"
                                        dangerouslySetInnerHTML={{ __html: mod.diagram_svg }}
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* WORKFLOW 3: PAST YEAR QUESTIONS (PYQ) BOARD STUDIO */}
        {/* ------------------------------------------------------------------- */}
        {activeStudioTab === 'pyq' && (
          <section className="p-6 md:p-8 rounded-3xl bg-[#112017] border border-emerald-900/80 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-emerald-900/60 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-800/80 border border-emerald-600/40 flex items-center justify-center text-white shadow-xs">
                  <Sparkles className="w-5 h-5 text-emerald-200" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white tracking-tight">
                    Past Year Questions (PYQ) Board Studio
                  </h2>
                  <p className="text-xs text-emerald-300/70 font-mono">
                    Upload multiple past papers (.pdf) or paste questions. AI analyzes, classifies by chapter, and compiles authentic practice sets with marks and marking schemes.
                  </p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSynthesizePyqs} className="space-y-6">
              {/* Selectors Grid: Board, Class, Subject, Chapter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Board */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-emerald-300 uppercase tracking-wider font-mono">
                    Board Curriculum
                  </label>
                  <select
                    value={pyqBoard}
                    onChange={(e) => {
                      setPyqBoard(e.target.value as EducationalBoard)
                      setPyqTargetChapterId('')
                      setChapterPyqs(null)
                    }}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0c1610] border border-emerald-800/70 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
                  >
                    <option value="CBSE">CBSE (NCERT Standard)</option>
                    <option value="ICSE">ICSE / ISC (Selina Standard)</option>
                    <option value="IB">IB (MYP / DP Standards)</option>
                  </select>
                </div>

                {/* Class */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-emerald-300 uppercase tracking-wider font-mono">
                    Class Level (6 to 12)
                  </label>
                  <select
                    value={pyqClass}
                    onChange={(e) => {
                      setPyqClass(e.target.value)
                      setPyqTargetChapterId('')
                      setChapterPyqs(null)
                    }}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0c1610] border border-emerald-800/70 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
                  >
                    {['Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'].map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-emerald-300 uppercase tracking-wider font-mono">
                    Subject / Discipline
                  </label>
                  <select
                    value={pyqSubject}
                    onChange={(e) => {
                      setPyqSubject(e.target.value)
                      setPyqTargetChapterId('')
                      setChapterPyqs(null)
                    }}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0c1610] border border-emerald-800/70 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
                  >
                    {PRESET_SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>
                        {sub}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target Chapter */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-emerald-300 uppercase tracking-wider font-mono">
                    Target Chapter ({matchingChaptersForPyq.length} available)
                  </label>
                  <select
                    value={pyqTargetChapterId}
                    onChange={(e) => {
                      const id = e.target.value
                      setPyqTargetChapterId(id)
                      fetchChapterPyqs(id)
                    }}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0c1610] border border-emerald-800/70 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
                  >
                    <option value="">-- Select Chapter --</option>
                    {matchingChaptersForPyq.map((c) => (
                      <option key={c.id} value={c.id}>
                        {formatChapterTitleDisplay(c)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Multi-File Upload Dropzone */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-emerald-300 uppercase tracking-wider font-mono flex items-center justify-between">
                  <span>Upload Past Year Papers (.pdf, .txt, .docx) - Multiples Allowed</span>
                  <span className="text-[11px] text-emerald-400/80 font-normal">
                    {pyqFiles.length} file(s) selected
                  </span>
                </label>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handlePyqDrop}
                  onClick={() => pyqFileInputRef.current?.click()}
                  className="border-2 border-dashed border-emerald-800/80 hover:border-emerald-500/80 bg-[#0c1610]/80 rounded-2xl p-6 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                >
                  <UploadCloud className="w-8 h-8 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <p className="text-sm font-medium text-emerald-200">
                    Click or drag & drop past exam papers here (select multiple files)
                  </p>
                  <p className="text-xs text-emerald-400/70 font-mono">
                    CBSE 2024, 2023, 2022 Question Papers, Marking Schemes, or Topic Question Sets (.pdf)
                  </p>
                  <input
                    ref={pyqFileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.txt,.md"
                    className="hidden"
                    onChange={(e) => handlePyqFilesChange(e.target.files)}
                  />
                </div>

                {/* Selected Files List */}
                {pyqFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {pyqFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-xs text-emerald-200 flex items-center gap-2"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="font-mono truncate max-w-[220px]">{file.name}</span>
                        <span className="text-[10px] text-emerald-400/70 font-mono">
                          ({(file.size / 1024).toFixed(0)} KB)
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemovePyqFile(idx)
                          }}
                          className="text-emerald-400 hover:text-rose-400 transition-colors p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Alternative: Raw Question Text */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-emerald-300 uppercase tracking-wider font-mono">
                  Or Paste Question Paper Content (Optional)
                </label>
                <textarea
                  value={pyqRawText}
                  onChange={(e) => setPyqRawText(e.target.value)}
                  placeholder="Paste past board exam questions with years and marks here..."
                  rows={4}
                  className="w-full p-3.5 rounded-xl bg-[#0c1610] border border-emerald-800/70 text-xs text-emerald-100 placeholder-emerald-800 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isProcessingPyq || !pyqTargetChapterId}
                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isProcessingPyq ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>{pyqProcessingStep || 'Synthesizing PYQ Board Practice Set...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Synthesize Chapter PYQ Practice Set & Save to Database</span>
                  </>
                )}
              </Button>
            </form>

            {/* Existing PYQ Practice Set Inspection Panel */}
            {pyqTargetChapterId && (
              <div className="mt-8 pt-6 border-t border-emerald-900/60 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-white tracking-tight">
                      Current Chapter PYQ Set:{' '}
                      <span className="text-emerald-300">
                        {matchingChaptersForPyq.find((c) => c.id === pyqTargetChapterId)?.title}
                      </span>
                    </h3>
                  </div>

                  {chapterPyqs && (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-emerald-900/80 text-emerald-200 border-emerald-700/60 font-mono text-xs">
                        {chapterPyqs.practice_set?.length || 0} Questions
                      </Badge>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeletePyqSet(chapterPyqs.id)}
                        className="text-rose-400 hover:text-white hover:bg-rose-950/60 h-8 px-2 text-xs"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Delete Set
                      </Button>
                    </div>
                  )}
                </div>

                {isLoadingPyqs ? (
                  <div className="p-6 text-center text-xs font-mono text-emerald-400/70">
                    Loading chapter PYQs from database...
                  </div>
                ) : chapterPyqs && chapterPyqs.practice_set?.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-emerald-300/80 font-mono">
                      Source: {chapterPyqs.source_filename || 'Uploaded papers'} | Indexed on:{' '}
                      {new Date(chapterPyqs.created_at).toLocaleDateString()}
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-1">
                      {chapterPyqs.practice_set.map((q: any, i: number) => (
                        <div
                          key={q.id || i}
                          className="p-4 rounded-xl bg-[#0c1610] border border-emerald-900/70 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-800/80 font-bold">
                              {q.year || 'Board Exam'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-200 text-[10px] font-mono">
                                {q.marks || 1} Mark{(q.marks || 1) > 1 ? 's' : ''}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 text-[10px] font-mono border border-blue-800/60">
                                {q.type || 'SA'}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-white font-medium leading-relaxed">
                            {q.question}
                          </p>

                          {q.formula && (
                            <p className="text-[11px] font-mono text-emerald-400/90 bg-[#112017] p-1.5 rounded">
                              Formula: {q.formula}
                            </p>
                          )}

                          <div className="pt-2 border-t border-emerald-950 text-[11px] text-emerald-300/80 space-y-1 font-sans">
                            <strong className="text-[10px] font-mono text-emerald-400 uppercase">
                              Marking Scheme:
                            </strong>
                            <p className="text-xs text-emerald-200/90 whitespace-pre-line">
                              {q.solution}
                            </p>
                            {q.final_answer && (
                              <p className="text-xs font-semibold text-emerald-300 pt-1">
                                Boxed Answer: {q.final_answer}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center rounded-xl bg-[#0c1610] border border-emerald-900/60 text-xs font-mono text-emerald-400/70">
                    No past year questions synthesized for this chapter yet. Upload past year papers above to generate the Practice Set!
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* SECTION 3: PUBLISHED CURRICULUMS & CHAPTERS LIBRARY */}
        {/* ------------------------------------------------------------------- */}
        <section className="p-6 md:p-8 rounded-3xl bg-[#112017] border border-emerald-900/80 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-900/60 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-800/80 border border-emerald-600/40 flex items-center justify-center text-white shadow-xs">
                <Layers className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Published Database Curriculums Library
                </h3>
                <p className="text-xs text-emerald-300/70 font-mono">
                  Active chapters and topic capsules served to students across CBSE, ICSE, and IB
                </p>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={libraryBoardFilter}
                onChange={(e) => setLibraryBoardFilter(e.target.value)}
                className="h-9 px-3 rounded-xl bg-[#0c1610] border border-emerald-800/70 text-xs text-emerald-200 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer font-semibold"
              >
                <option value="all">All Boards</option>
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
                <option value="IB">IB</option>
              </select>

              <select
                value={libraryClassFilter}
                onChange={(e) => setLibraryClassFilter(e.target.value)}
                className="h-9 px-3 rounded-xl bg-[#0c1610] border border-emerald-800/70 text-xs text-emerald-200 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
              >
                <option value="all">All Class Levels</option>
                {libraryClasses.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>

              <select
                value={librarySubjectFilter}
                onChange={(e) => setLibrarySubjectFilter(e.target.value)}
                className="h-9 px-3 rounded-xl bg-[#0c1610] border border-emerald-800/70 text-xs text-emerald-200 focus:outline-none focus:border-emerald-500 font-sans cursor-pointer"
              >
                <option value="all">All Subjects</option>
                {librarySubjects.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={fetchCurriculumsLibrary}
                className="h-9 w-9 rounded-xl text-emerald-400 hover:text-white hover:bg-emerald-900/60 cursor-pointer"
                title="Refresh library"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isLoadingLibrary ? 'animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>

          {/* Cards Grid */}
          {isLoadingLibrary ? (
            <div className="p-8 text-center text-emerald-400/70 font-mono text-xs">
              Loading published chapters from Supabase database...
            </div>
          ) : filteredLibrary.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#0c1610] border border-emerald-900/60 text-emerald-400/70 font-mono text-xs">
              No curriculums found matching the selected filters. Use the Chapter Notes Studio or Syllabus Ingestion above to add chapters.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredLibrary.map((curr) => {
                const isDeleting = deletingId === curr.id
                const firstModule = curr.modules && curr.modules.length > 0 ? curr.modules[0] : null

                return (
                  <div
                    key={curr.id}
                    className="p-5 rounded-2xl bg-[#0d1a12] border border-emerald-800/60 flex flex-col justify-between gap-4 shadow-sm hover:border-emerald-600 transition-colors"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-emerald-300 bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-800/60">
                          {curr.board || 'CBSE'} • {curr.class_level} • Ch #{curr.order_index}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400/80 bg-emerald-950/70 px-2 py-0.5 rounded">
                          {curr.category}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-white leading-snug line-clamp-2">
                        {formatChapterTitleDisplay(curr)}
                      </h4>

                      <p className="text-xs text-emerald-200/70 line-clamp-2">
                        {curr.notesSummary || curr.description || 'Full curriculum chapter with structured topic capsules.'}
                      </p>

                      {/* Notes Status Pill */}
                      <div className="pt-1 flex items-center gap-2">
                        {curr.hasNotes ? (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Book Attached {curr.notesSourceFilename ? `(${curr.notesSourceFilename})` : ''}</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3 text-sky-400" />
                            <span>Needs Book Ingestion</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-emerald-900/60 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setExpandedLibraryCurrId(expandedLibraryCurrId === curr.id ? null : curr.id)}
                        className="text-[11px] font-mono text-emerald-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="View synthesized capsules and diagram ideas for this chapter"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{curr.modulesCount} Capsules</span>
                        {expandedLibraryCurrId === curr.id ? (
                          <ChevronUp className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>

                      <div className="flex items-center gap-1.5">
                        {/* Upload Book Chapter Button (opens slide-over modal) */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenAttachNotesModal(curr)}
                          className="h-7 px-2.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800/70 text-emerald-300 hover:text-white text-[11px] font-mono cursor-pointer flex items-center gap-1.5"
                          title="Upload textbook chapter PDF or notes for this chapter"
                        >
                          <UploadCloud className="w-3 h-3 text-emerald-400" />
                          <span>Upload Book</span>
                        </Button>

                        {/* Open in Classroom Button */}
                        {firstModule && user && (
                          <Link
                            href={`/dashboard/${user.id}/class/${firstModule.id}`}
                            className="h-7 px-2 rounded-lg bg-emerald-800/70 hover:bg-emerald-700 text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-colors"
                            title="Launch this chapter in AI spoken classroom"
                          >
                            <span>Open</span>
                            <ExternalLink className="w-3 h-3 text-emerald-300" />
                          </Link>
                        )}

                        {/* Delete Chapter Button */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={isDeleting}
                          onClick={() => handleDeleteCurriculum(curr.id, curr.title)}
                          className="h-7 w-7 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-950/60 cursor-pointer"
                          title="Delete chapter from database"
                        >
                          {isDeleting ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {expandedLibraryCurrId === curr.id && (
                      <div className="pt-3 border-t border-emerald-900/60 space-y-2.5">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                          Synthesized Capsules & Visual Blueprints:
                        </span>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                          {(curr.modules || []).map((m, mIdx) => (
                            <div key={m.id || mIdx} className="p-2.5 rounded-xl bg-[#09150d] border border-emerald-800/60 space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[10px] font-mono font-bold text-emerald-300">
                                  #{m.order_index || mIdx + 1} {m.title}
                                </span>
                                {m.diagram_type && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-700/60">
                                    {m.diagram_type}
                                  </span>
                                )}
                              </div>
                              {m.visual_ideas && (
                                <p className="text-[10.5px] text-emerald-200/90 leading-tight">
                                  <strong className="text-emerald-400 font-mono">Visual Idea:</strong> {m.visual_ideas}
                                </p>
                              )}
                              {m.what_to_make && (
                                <p className="text-[10px] text-emerald-300/80 leading-relaxed font-mono">
                                  <strong className="text-emerald-400">What to make:</strong> {m.what_to_make}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {/* ------------------------------------------------------------------- */}
      {/* SLIDE-OVER MODAL: ATTACH / UPDATE NOTES FOR EXISTING CHAPTER */}
      {/* ------------------------------------------------------------------- */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl bg-[#0f1d14] border border-emerald-800/90 text-emerald-100 p-6 rounded-3xl shadow-2xl">
          <DialogHeader className="border-b border-emerald-900/60 pb-3">
            <DialogTitle className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-emerald-400" />
              <span>Upload Book Chapter for "{selectedChapterForNotes ? formatChapterTitleDisplay(selectedChapterForNotes) : ''}"</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-emerald-300/80 font-mono">
              {selectedChapterForNotes?.board} • {selectedChapterForNotes?.class_level} • {selectedChapterForNotes?.category} • Upload textbook chapter (.pdf, .md, .txt) to synthesize 4 to 8 granular capsules.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleModalSubmitNotes} className="space-y-4 pt-2">
            {/* File Dropzone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleModalNotesDrop}
              onClick={() => modalFileInputRef.current?.click()}
              className={`p-5 rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                modalFile
                  ? 'border-emerald-500 bg-emerald-950/40 shadow-inner'
                  : 'border-emerald-800/80 hover:border-emerald-500/80 bg-[#08110a]'
              }`}
            >
              <input
                ref={modalFileInputRef}
                type="file"
                accept=".pdf,.md,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    const file = e.target.files[0]
                    setModalFile(file)
                    if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
                      const reader = new FileReader()
                      reader.onload = (re) => {
                        if (typeof re.target?.result === 'string') {
                          setModalRawText(re.target.result)
                        }
                      }
                      reader.readAsText(file)
                    }
                  }
                }}
                className="hidden"
              />
              {modalFile ? (
                <div className="flex items-center justify-between w-full p-2.5 rounded-xl bg-emerald-950/60 border border-emerald-600/50">
                  <div className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-semibold text-white truncate max-w-[220px]">
                      {modalFile.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      {(modalFile.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(ev) => {
                      ev.stopPropagation()
                      setModalFile(null)
                    }}
                    className="text-emerald-400/80 hover:text-white p-1 rounded-lg hover:bg-emerald-900/60"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <UploadCloud className="w-7 h-7 text-emerald-400" />
                  <span className="text-xs font-semibold text-emerald-200">
                    Upload chapter PDF (.pdf, .md, .txt) or drag & drop
                  </span>
                  <span className="text-[10px] text-emerald-400/70 font-mono">
                    Textbook chapter PDF for {selectedChapterForNotes ? formatChapterTitleDisplay(selectedChapterForNotes) : ''}
                  </span>
                </>
              )}
            </div>

            {/* Markdown Text Area */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-emerald-300">
                  Or Paste Chapter Notes (Markdown / Plain Text):
                </span>
                <span className="text-[10px] font-mono text-emerald-400/80">
                  {modalRawText ? `${modalRawText.split(/\s+/).filter(Boolean).length} words` : '0 words'}
                </span>
              </div>
              <textarea
                rows={6}
                placeholder="Paste detailed NCERT chapter notes, proofs, and definitions here..."
                value={modalRawText}
                onChange={(e) => setModalRawText(e.target.value)}
                className="w-full p-3.5 rounded-xl bg-[#08110a] border border-emerald-800/80 text-xs text-emerald-100 placeholder:text-emerald-700/60 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
              />
            </div>

            {/* Strategy Options */}
            <div className="p-3.5 rounded-xl bg-[#08110a] border border-emerald-900/60 space-y-2">
              <span className="text-[11px] font-mono text-emerald-300 uppercase tracking-wider block">
                Decomposition Strategy
              </span>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-200">
                  <input
                    type="radio"
                    name="modalStrategy"
                    value="synthesize_capsules"
                    checked={modalStrategy === 'synthesize_capsules'}
                    onChange={() => setModalStrategy('synthesize_capsules')}
                    className="accent-emerald-500"
                  />
                  <span>Re-synthesize 4-8 Capsules (Scaled to Length)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-emerald-200">
                  <input
                    type="radio"
                    name="modalStrategy"
                    value="map_existing"
                    checked={modalStrategy === 'map_existing'}
                    onChange={() => setModalStrategy('map_existing')}
                    className="accent-emerald-500"
                  />
                  <span>Map to Existing ({selectedChapterForNotes?.modulesCount || 0} capsules)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                disabled={isProcessingModal}
                className="bg-[#0c1610] hover:bg-emerald-950 border-emerald-800 text-emerald-300 rounded-xl text-xs h-9 px-4 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isProcessingModal}
                className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold h-9 px-4 shadow-lg flex items-center gap-2 cursor-pointer"
              >
                {isProcessingModal ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>{modalProcessingStep || 'Processing...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Ingest Book & Synthesize</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
