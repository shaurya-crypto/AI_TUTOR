'use client'

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import '@excalidraw/excalidraw/index.css'
import {
  FileText,
  Plus,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  BookOpen,
} from 'lucide-react'
import { evaluateMathExpression } from '@/lib/mathEvaluator'
import { createUniversalScientificSvg } from '@/services/universalScientificSvg'

// Dynamically import Excalidraw with SSR disabled
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#FFFFFF] text-[#171817] space-y-3 font-serif">
        <div className="w-8 h-8 border-2 border-[#52715D] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm tracking-wide text-[#555852]">Preparing AI Whiteboard...</p>
      </div>
    ),
  }
)

export interface GreenChalkboardRef {
  drawText: (text: string, x?: number, y?: number, color?: string) => void
  drawTitle: (title: string, color?: string) => void
  drawStep: (stepText: string, color?: string) => void
  drawNote: (noteText: string, color?: string) => void
  drawQuestion: (questionText: string, color?: string) => void
  drawHighlightBox: (text: string, color?: string) => void
  drawFlowchart: (flowText: string, color?: string) => void
  drawRoughWork: (workText: string, color?: string) => void
  clearRough: () => void
  clearBoard: () => void
  resetBoard?: () => void
  setChalkColor: (colorNameOrHex: string) => void
  setBoardColor: (theme: 'green' | 'blackboard' | 'slate' | 'white') => void
  drawSvgDiagram: (title: string, svgMarkup: string, caption?: string) => void
  drawGraph: (type?: string) => void
  drawNumericalSolution?: (solution: {
    problem?: string
    given?: string
    formula?: string
    substitution?: string
    calculation?: string
    answer: string
    unit?: string
  }) => void
  drawVideoCard?: (title: string, description?: string) => void
  drawTable?: (tableStr: string) => void
  drawGeometry?: (geomStr: string) => void
  drawShape?: (shapeDef: any) => void
  drawStudentAnswer?: (answerText: string, isCorrect?: boolean, color?: string) => void
  drawAnswerVerdict?: (verdictText: string, isCorrect?: boolean, color?: string) => void
  drawExamQuestion?: (questionText: string, modelAnswer?: string, marks?: string, color?: string) => void
  addNewPage?: () => void
  goToPage: (pageIndex: number, title?: string) => void
  clearNotes: () => void
  rewriteNotes: (newNotes: string) => Promise<void>
  getBoardSummary: () => { notesText: string; roughText: string; fullSummary: string }
  handleAiDirective: (directive: string, transcriptId?: string) => void
  getActiveQuestion?: () => { text: string; y: number; height: number; pageIndex: number } | null
  getNextY?: () => number
  getCurrentPageIndex?: () => number
}

interface WhiteboardPage {
  id: number
  elements: any[]
  nextY: number
  roughY: number
}

export interface WritingPositionInfo {
  nextY: number
  pageIndex: number
  lastAction?: string
  lastText?: string
  activeQuestion?: { text: string; y: number; height: number; pageIndex: number } | null
}

interface GreenChalkboardProps {
  moduleId?: string
  moduleTitle: string
  classLevel?: string
  subject?: string
  keyConcepts?: string[]
  activeConceptIndex?: number
  onPageChange?: (pageIndex: number) => void
  onNoteRecorded?: (note: string) => void
  onConceptFocus?: (concept: string) => void
  onConceptDone?: (concept: string) => void
  onConceptGoto?: (target: number | string) => void
  onBoardContentChange?: (summary: { notesText: string; roughText: string; fullSummary: string }) => void
  onModuleComplete?: (summary?: string) => void
  onConfirmEndChapter?: (question: string) => void
  onStartQuiz?: () => void
  onWritingPositionChange?: (pos: WritingPositionInfo) => void
}

import {
  INK_PRIMARY,
  INK_SECONDARY,
  INK_MUTED,
  INK_BOTANICAL,
  INK_CORAL,
  INK_CORAL_SOFT,
  INK_BLUE,
  INK_AMBER,
  INK_PURPLE,
  INK_ROSE,
  INK_CYAN,
  INK_EMERALD,
  BORDER_SUBTLE,
  CANVAS_BG,
  resolveChalkColor,
} from './chalkboardColor'
export {
  INK_PRIMARY,
  INK_SECONDARY,
  INK_MUTED,
  INK_BOTANICAL,
  INK_CORAL,
  INK_CORAL_SOFT,
  INK_BLUE,
  INK_AMBER,
  INK_PURPLE,
  INK_ROSE,
  INK_CYAN,
  INK_EMERALD,
  BORDER_SUBTLE,
  CANVAS_BG,
  resolveChalkColor,
}

import {
  normalizeTitle,
  isRedundantConceptOrMasteredText,
} from './chalkboardFilter'
export { normalizeTitle, isRedundantConceptOrMasteredText }

import { wrapText } from './textWrapper'
export { wrapText }

export const GreenChalkboard = forwardRef<GreenChalkboardRef, GreenChalkboardProps>(
  (
    {
      moduleId,
      moduleTitle,
      classLevel = '',
      subject = '',
      keyConcepts = [],
      activeConceptIndex = 0,
      onPageChange,
      onNoteRecorded,
      onConceptFocus,
      onConceptDone,
      onConceptGoto,
      onBoardContentChange,
      onModuleComplete,
      onConfirmEndChapter,
      onStartQuiz,
      onWritingPositionChange,
    },
    ref
  ) => {
    const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null)
    const storageKey = moduleId ? `whiteboard_pages_${moduleId}` : `whiteboard_pages_${moduleTitle}`

    // Multi-page system state
    const [pages, setPages] = useState<WhiteboardPage[]>([
      { id: 1, elements: [], nextY: 140, roughY: 140 },
    ])
    const [currentPageIndex, setCurrentPageIndex] = useState<number>(0)
    const pagesRef = useRef<WhiteboardPage[]>([
      { id: 1, elements: [], nextY: 140, roughY: 140 },
    ])
    const currentPageIndexRef = useRef<number>(0)

    const boardElementsRef = useRef<any[]>([])
    const nextYRef = useRef(140)
    const roughYRef = useRef(140)
    const activeQuestionRef = useRef<{ text: string; y: number; height: number; pageIndex: number } | null>(null)
    const convertElementsRef = useRef<any>(null)
    const executedDirectivesRef = useRef<Set<string>>(new Set())
    const executedTextHistoryRef = useRef<Set<string>>(new Set())
    const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const operationQueueRef = useRef<Promise<any>>(Promise.resolve())
    const [activeChalkColor, setActiveChalkColor] = useState<string>(INK_PRIMARY)
    const activeChalkColorRef = useRef<string>(INK_PRIMARY)
    const lastDrawnStudentAnswerRef = useRef<{ text: string; time: number } | null>(null)
    const lastExecutedActionTimeRef = useRef<Map<string, number>>(new Map())

    const shouldSkipDuplicate = (action: string, content: string, windowMs = 3500): boolean => {
      if (!content || !content.trim()) return false
      const key = `${action}:${content.toLowerCase().trim()}`
      const now = Date.now()
      const prev = lastExecutedActionTimeRef.current.get(key)
      if (prev && now - prev < windowMs) {
        return true
      }
      lastExecutedActionTimeRef.current.set(key, now)
      if (lastExecutedActionTimeRef.current.size > 200) {
        for (const [k, t] of lastExecutedActionTimeRef.current.entries()) {
          if (now - t > 60000) lastExecutedActionTimeRef.current.delete(k)
        }
      }
      return false
    }

    const notifyPositionChange = (lastAction?: string, lastText?: string) => {
      onWritingPositionChange?.({
        nextY: nextYRef.current,
        pageIndex: currentPageIndexRef.current,
        lastAction,
        lastText,
        activeQuestion: activeQuestionRef.current,
      })
    }

    const setChalkColor = (colorNameOrHex: string) => {
      const resolved = resolveChalkColor(colorNameOrHex, INK_PRIMARY)
      activeChalkColorRef.current = resolved
      setActiveChalkColor(resolved)
    }

    // Serialized execution queue for non-overlapping atomic whiteboard updates
    const enqueueOperation = <T,>(op: () => Promise<T>): Promise<T> => {
      return new Promise<T>((resolve, reject) => {
        operationQueueRef.current = operationQueueRef.current
          .then(async () => {
            try {
              const res = await op()
              resolve(res)
            } catch (err) {
              console.error('Queue op error:', err)
              reject(err)
            }
          })
          .catch((err) => {
            console.error('Operation queue chain error:', err)
          })
      })
    }

    // Synchronous helper to get current active elements without Excalidraw async race condition
    const getCurrentElements = (): any[] => {
      if (boardElementsRef.current && boardElementsRef.current.length > 0) {
        return boardElementsRef.current
      }
      return (excalidrawAPI?.getSceneElements() || []) as any[]
    }

    const isInitializedRef = useRef(false)
    const prevModuleIdRef = useRef(moduleId)

    // Calculate dynamic Y coordinate below existing elements on the left column to prevent collision/overlap
    const getDynamicNextY = (margin = 20): number => {
      const currentEls = getCurrentElements()
      const noteEls = currentEls.filter(
        (el: any) =>
          !el.id?.startsWith('header_') &&
          el.customData?.isRough !== true &&
          (el.x || 0) < 500 &&
          typeof el.y === 'number'
      )
      if (noteEls.length === 0) {
        return Math.max(nextYRef.current, 140)
      }
      const maxY = Math.max(
        ...noteEls.map((el: any) => {
          const h = el.height || (el.type === 'text' ? (el.fontSize || 16) * 1.5 : 30)
          return el.y + h
        }),
        nextYRef.current
      )
      return maxY + margin
    }

    // Centralized helper: synchronously updates page buffer, state, Excalidraw scene, and storage
    const updateCurrentPageElements = (elements: any[], nextY?: number) => {
      boardElementsRef.current = elements
      if (typeof nextY === 'number') {
        nextYRef.current = nextY
      }
      const pageIdx = currentPageIndexRef.current
      if (pagesRef.current[pageIdx]) {
        pagesRef.current[pageIdx].elements = elements
        pagesRef.current[pageIdx].nextY = nextYRef.current
        pagesRef.current[pageIdx].roughY = roughYRef.current
      }
      setPages([...pagesRef.current])
      excalidrawAPI?.updateScene({ elements })
      persistScene(elements)
      notifyPositionChange()
    }

    const checkIsRedundant = (text: string): boolean =>
      isRedundantConceptOrMasteredText(text, moduleTitle, keyConcepts)
    const isRedundant = checkIsRedundant

    useEffect(() => {
      const el = containerRef.current
      if (!el) return
      const preventZoom = (e: WheelEvent) => {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault()
        }
      }
      const preventGesture = (e: Event) => {
        e.preventDefault()
      }
      el.addEventListener('wheel', preventZoom, { passive: false })
      el.addEventListener('gesturestart', preventGesture, { passive: false })
      el.addEventListener('gesturechange', preventGesture, { passive: false })
      return () => {
        el.removeEventListener('wheel', preventZoom)
        el.removeEventListener('gesturestart', preventGesture)
        el.removeEventListener('gesturechange', preventGesture)
      }
    }, [])

    // Helper to build a clean page header with optional single-concept title
    const createHeaderSkeleton = (pageNum = 1, conceptTitle?: string): any[] => {
      const items: any[] = [
        {
          id: `header_topic_p${pageNum}`,
          type: 'text',
          x: 60,
          y: 35,
          text: `TOPIC: ${moduleTitle.toUpperCase()}${pageNum > 1 ? ` (PAGE ${pageNum})` : ''}`,
          fontSize: 20,
          fontFamily: 1,
          strokeColor: INK_PRIMARY,
          customData: { isHeader: true },
        },
        {
          id: `header_meta_p${pageNum}`,
          type: 'text',
          x: 60,
          y: 68,
          text: [subject, classLevel, `Interactive Whiteboard • Page ${pageNum}`].filter(Boolean).join(' • '),
          fontSize: 12,
          fontFamily: 1,
          strokeColor: INK_MUTED,
          customData: { isHeader: true },
        },
        {
          id: `header_sep_h_p${pageNum}`,
          type: 'line',
          x: 60,
          y: 95,
          width: 760,
          height: 0,
          points: [[0, 0], [760, 0]],
          strokeColor: BORDER_SUBTLE,
          strokeStyle: 'dashed',
          customData: { isHeader: true },
        },
      ]

      if (conceptTitle) {
        const clean = conceptTitle
          .replace(/^focus:\s*/i, '')
          .replace(/^concept\s*\d*:\s*/i, '')
          .replace(/[\(\)\[\]\{\}\"]/g, '')
          .replace(/^'+|'+$/g, '')
          .replace(/\s+/g, ' ')
          .trim()
        if (clean && normalizeTitle(clean) !== normalizeTitle(moduleTitle)) {
          const startX = 60
          const startY = 140 + 12
          const titleText = `CONCEPT ${pageNum}: ${clean.toUpperCase()}`
          items.push(
            {
              id: `title_concept_p${pageNum}`,
              type: 'text',
              x: startX,
              y: startY,
              text: titleText,
              fontSize: 19,
              fontFamily: 1,
              strokeColor: INK_PRIMARY,
              customData: { isRough: false, isTitle: true },
            },
            {
              id: `title_underline_p${pageNum}`,
              type: 'line',
              x: startX,
              y: startY + 28,
              points: [[0, 0], [Math.min(titleText.length * 12, 380), 0]],
              strokeColor: INK_BOTANICAL,
              strokeWidth: 2,
              customData: { isRough: false, isTitle: true },
            }
          )
        }
      }

      return items
    }

    // Compile notes across ALL pages for comprehensive Master Notes
    const getBoardSummary = (): { notesText: string; roughText: string; fullSummary: string } => {
      // Sync current scene into current page in memory
      if (excalidrawAPI && pagesRef.current[currentPageIndexRef.current]) {
        pagesRef.current[currentPageIndexRef.current].elements = getCurrentElements()
      }

      const allNotes: string[] = []

      pagesRef.current.forEach((page, pIdx) => {
        const pageElements = page.elements || []
        const textElements = pageElements.filter(
          (el: any) => el.type === 'text' && !el.id?.startsWith('header_') && el.text
        )

        const pageNotes: string[] = []
        for (const el of textElements) {
          const text = (el.text || '').trim()
          if (!text) continue
          pageNotes.push(text)
        }

        if (pageNotes.length > 0) {
          allNotes.push(`--- PAGE ${pIdx + 1} ---`)
          allNotes.push(...pageNotes)
        }
      })

      const notesText = allNotes.join('\n')
      const roughText = ''

      const fullSummary = allNotes.length > 0
        ? `MASTER NOTES ON BOARD:\n${allNotes.map((n) => (n.startsWith('---') ? n : `• ${n}`)).join('\n')}`
        : 'MASTER NOTES: (Module header initialized)'

      return { notesText, roughText, fullSummary }
    }

    // Sanitize raw SVG markup: parse via DOMParser, fix common Gemini output issues, return clean SVG or null
    const sanitizeSvg = (rawSvg: string): string | null => {
      if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return rawSvg
      try {
        // Fix common malformed XML issues from Gemini Live output before parsing
        let fixed = rawSvg
        // Escape unescaped ampersands (not already part of &amp; &lt; &gt; &apos; &quot; &#...)
        fixed = fixed.replace(/&(?!amp;|lt;|gt;|apos;|quot;|#\d+;|#x[\da-fA-F]+;)/g, '&amp;')
        // Self-close unclosed void elements common in SVG (e.g. <path d="..." > -> <path d="..." />)
        fixed = fixed.replace(/<(path|circle|ellipse|rect|line|polygon|polyline|use|image|stop)\b([^>]*?)(?<!\/)>/gi,
          (match, tag, attrs) => {
            if (attrs.trim().endsWith('/')) return match
            return `<${tag}${attrs}/>`
          }
        )
        const parser = new DOMParser()
        const doc = parser.parseFromString(fixed, 'image/svg+xml')
        const parseError = doc.querySelector('parsererror')
        if (parseError) {
          // Last resort: try with text/html parser which is more forgiving
          const htmlDoc = parser.parseFromString(`<body>${fixed}</body>`, 'text/html')
          const svgEl = htmlDoc.querySelector('svg')
          if (svgEl) {
            if (!svgEl.hasAttribute('xmlns')) svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
            return svgEl.outerHTML
          }
          return null
        }
        const svgEl = doc.querySelector('svg')
        if (!svgEl) return null
        if (!svgEl.hasAttribute('xmlns')) svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
        // Ensure width/height are set (Excalidraw requires them)
        const vb = svgEl.getAttribute('viewBox')
        if (vb && (!svgEl.getAttribute('width') || !svgEl.getAttribute('height'))) {
          const parts = vb.trim().split(/[\s,]+/).map(Number)
          if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            if (!svgEl.getAttribute('width')) svgEl.setAttribute('width', String(parts[2]))
            if (!svgEl.getAttribute('height')) svgEl.setAttribute('height', String(parts[3]))
          }
        }
        return svgEl.outerHTML
      } catch {
        return null
      }
    }

    // Rasterize SVG string to PNG data URL via offscreen canvas (bulletproof fallback for Excalidraw)
    const rasterizeSvgToPng = (svgString: string, width: number, height: number): Promise<string> => {
      return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') { reject(new Error('No window')); return }
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const img = new Image()
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = width * 2  // 2x for sharpness
            canvas.height = height * 2
            const ctx = canvas.getContext('2d')
            if (!ctx) { reject(new Error('No canvas context')); URL.revokeObjectURL(url); return }
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            const pngDataUrl = canvas.toDataURL('image/png')
            URL.revokeObjectURL(url)
            resolve(pngDataUrl)
          } catch (err) {
            URL.revokeObjectURL(url)
            reject(err)
          }
        }
        img.onerror = (err) => { URL.revokeObjectURL(url); reject(err) }
        img.src = url
      })
    }

    // Helper to safely encode arbitrary UTF-8 SVG markup to base64 Data URL for Excalidraw
    const svgToBase64DataUrl = (svgString: string): string => {
      try {
        if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
          const bytes = new TextEncoder().encode(svgString)
          let binary = ''
          const len = bytes.byteLength
          for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i])
          }
          return `data:image/svg+xml;base64,${window.btoa(binary)}`
        }
        if (typeof Buffer !== 'undefined') {
          return `data:image/svg+xml;base64,${Buffer.from(svgString, 'utf-8').toString('base64')}`
        }
        return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svgString)))}`
      } catch (err) {
        console.warn('svgToBase64DataUrl conversion error:', err)
        try {
          return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svgString)))}`
        } catch {
          return 'data:image/svg+xml;base64,'
        }
      }
    }

    // Debounced persistence to localStorage
    const persistScene = (elements: readonly any[] | any[]) => {
      if (!storageKey || typeof window === 'undefined') return

      if (pagesRef.current[currentPageIndexRef.current] && elements && elements.length > 0) {
        pagesRef.current[currentPageIndexRef.current].elements = elements as any[]
        pagesRef.current[currentPageIndexRef.current].nextY = nextYRef.current
        pagesRef.current[currentPageIndexRef.current].roughY = roughYRef.current
      }

      if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current)
      persistTimeoutRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(pagesRef.current))
          if (excalidrawAPI?.getFiles) {
            const files = excalidrawAPI.getFiles()
            if (files && Object.keys(files).length > 0) {
              localStorage.setItem(`${storageKey}_files`, JSON.stringify(files))
            }
          }
          if (onBoardContentChange) {
            onBoardContentChange(getBoardSummary())
          }
        } catch (err) {
          console.warn('Failed to save whiteboard pages to localStorage:', err)
        }
      }, 400)
    }

    // Helper to lock zoom to exactly 70% (0.7) and prevent zooming out/in
    const enforceLockedZoom = useCallback((api: any) => {
      if (!api) return
      try {
        const state = api.getAppState()
        if (state && (!state.zoom || Math.abs(state.zoom.value - 0.7) > 0.01)) {
          setTimeout(() => {
            try {
              api.updateScene({
                appState: {
                  zoom: { value: 0.7 },
                },
              })
            } catch (err) {}
          }, 50)
        }
      } catch (err) {}
    }, [])

    // Add new page when board fills or AI requests
    const addNewPage = async () => {
      if (!excalidrawAPI) return
      try {
        const convertFn =
          convertElementsRef.current ||
          (await import('@excalidraw/excalidraw')).convertToExcalidrawElements
        convertElementsRef.current = convertFn

        // 1. Save current page state
        if (pagesRef.current[currentPageIndexRef.current]) {
          pagesRef.current[currentPageIndexRef.current].elements = boardElementsRef.current
          pagesRef.current[currentPageIndexRef.current].nextY = nextYRef.current
          pagesRef.current[currentPageIndexRef.current].roughY = roughYRef.current
        }

        // 2. Create new page
        const newPageNum = pagesRef.current.length + 1
        const newConcept = keyConcepts && keyConcepts[newPageNum - 1] ? keyConcepts[newPageNum - 1] : undefined
        const initialSkeleton = createHeaderSkeleton(newPageNum, newConcept)
        const initialElements = convertFn(initialSkeleton)
        const hasConceptTitle = Boolean(newConcept)

        const newPage: WhiteboardPage = {
          id: newPageNum,
          elements: initialElements,
          nextY: hasConceptTitle ? 200 : 140,
          roughY: 140,
        }

        const updatedPages = [...pagesRef.current, newPage]
        const newIdx = updatedPages.length - 1

        pagesRef.current = updatedPages
        currentPageIndexRef.current = newIdx
        setPages(updatedPages)
        setCurrentPageIndex(newIdx)

        nextYRef.current = hasConceptTitle ? 200 : 140
        roughYRef.current = 140
        boardElementsRef.current = initialElements

        excalidrawAPI.updateScene({
          elements: initialElements,
          appState: {
            viewBackgroundColor: CANVAS_BG,
            currentItemStrokeColor: INK_PRIMARY,
            currentItemFontFamily: 1,
            currentItemRoughness: 0,
            zoom: { value: 0.7 },
            scrollX: 0,
            scrollY: 0,
          },
        })

        persistScene(initialElements)
        notifyPositionChange('add_new_page')
        onNoteRecorded?.(`--- New Whiteboard Page ${newPageNum} Created ---`)
      } catch (err) {
        console.error('addNewPage error:', err)
      }
    }

    // Switch or dynamically create pages up to targetIdx (0-indexed)
    const goToPage = async (targetIdx: number, conceptTitle?: string) => {
      if (!excalidrawAPI || targetIdx < 0) return

      // Save current page state synchronously if elements exist
      if (pagesRef.current[currentPageIndexRef.current] && boardElementsRef.current && boardElementsRef.current.length > 0) {
        pagesRef.current[currentPageIndexRef.current].elements = boardElementsRef.current
        pagesRef.current[currentPageIndexRef.current].nextY = nextYRef.current
        pagesRef.current[currentPageIndexRef.current].roughY = roughYRef.current
      }

      // If targetIdx is beyond existing pages, create missing pages up to targetIdx
      if (targetIdx >= pagesRef.current.length) {
        try {
          const convertFn =
            convertElementsRef.current ||
            (await import('@excalidraw/excalidraw')).convertToExcalidrawElements
          convertElementsRef.current = convertFn

          const updatedPages = [...pagesRef.current]
          while (updatedPages.length <= targetIdx) {
            const newPageNum = updatedPages.length + 1
            const pageConcept =
              keyConcepts && keyConcepts[newPageNum - 1]
                ? keyConcepts[newPageNum - 1]
                : newPageNum - 1 === targetIdx
                ? conceptTitle
                : undefined
            const initialSkeleton = createHeaderSkeleton(newPageNum, pageConcept)
            const initialElements = convertFn(initialSkeleton)
            const hasConceptTitle = Boolean(pageConcept)
            updatedPages.push({
              id: newPageNum,
              elements: initialElements,
              nextY: hasConceptTitle ? 200 : 140,
              roughY: 140,
            })
          }
          pagesRef.current = updatedPages
          setPages(updatedPages)
        } catch (err) {
          console.error('goToPage create pages error:', err)
          return
        }
      }

      const targetPage = pagesRef.current[targetIdx]

      // Safety: If target page has 0 elements, regenerate header skeleton so it is NEVER blank!
      if (!targetPage.elements || targetPage.elements.length === 0) {
        try {
          const convertFn =
            convertElementsRef.current ||
            (await import('@excalidraw/excalidraw')).convertToExcalidrawElements
          convertElementsRef.current = convertFn
          const pageConcept =
            conceptTitle ||
            (keyConcepts && keyConcepts[targetIdx] ? keyConcepts[targetIdx] : undefined)
          const skeleton = createHeaderSkeleton(targetIdx + 1, pageConcept)
          targetPage.elements = convertFn(skeleton)
          targetPage.nextY = pageConcept ? 200 : 140
          targetPage.roughY = 140
        } catch (e) {
          console.error('Regenerate page skeleton error:', e)
        }
      }

      currentPageIndexRef.current = targetIdx
      setCurrentPageIndex(targetIdx)

      nextYRef.current = targetPage.nextY || 140
      roughYRef.current = targetPage.roughY || 140
      boardElementsRef.current = targetPage.elements || []

      excalidrawAPI.updateScene({
        elements: targetPage.elements || [],
        appState: {
          viewBackgroundColor: CANVAS_BG,
          currentItemStrokeColor: INK_PRIMARY,
          currentItemFontFamily: 1,
          currentItemRoughness: 0,
          zoom: { value: 0.7 },
          scrollX: 0,
          scrollY: 0,
        },
      })
      persistScene(targetPage.elements || [])

      // If the target page somehow lacks a title, add it once
      const targetHasTitle = (targetPage.elements || []).some(
        (el: any) =>
          el.customData?.isTitle === true ||
          (el.type === 'text' && !el.id?.startsWith('header_') && el.fontSize >= 18)
      )
      if (!targetHasTitle && (conceptTitle || keyConcepts?.[targetIdx])) {
        await drawTitle(conceptTitle || keyConcepts[targetIdx])
      }
      notifyPositionChange('go_to_page')
    }

    // Switch between pages and notify parent to update concept tracking
    const switchPage = (targetIdx: number) => {
      goToPage(targetIdx)
      onPageChange?.(targetIdx)
      onConceptGoto?.(targetIdx + 1)
    }

    // 1-Concept-Per-Page invariant: The chalkboard canvas scrolls smoothly vertically.
    // We never auto-flip pages mid-concept so questions, student answers, and verdicts
    // remain permanently together on the concept's dedicated page.
    const checkAutoPageOverflow = async (_requiredHeight = 60) => {
      // Intentionally no-op: page flips are governed strictly by concept progression, not arbitrary pixel heights.
      return
    }

    // Initialize board: restore from localStorage or build initial page
    useEffect(() => {
      if (!excalidrawAPI) return

      if (prevModuleIdRef.current !== moduleId) {
        prevModuleIdRef.current = moduleId
        isInitializedRef.current = false
      }

      if (isInitializedRef.current) return
      isInitializedRef.current = true

      const initializeBoard = async () => {
        try {
          const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
          convertElementsRef.current = convertToExcalidrawElements

          // 1. Check if pages were previously saved
          let savedPages: WhiteboardPage[] | null = null
          try {
            if (typeof window !== 'undefined' && storageKey) {
              const raw = localStorage.getItem(storageKey)
              if (raw) {
                const parsed = JSON.parse(raw)
                if (Array.isArray(parsed) && parsed.length > 0) {
                  savedPages = parsed
                }
              }
            }
          } catch (e) {
            console.error('Error reading saved whiteboard pages:', e)
          }

          try {
            if (typeof window !== 'undefined' && storageKey) {
              const rawFiles = localStorage.getItem(`${storageKey}_files`)
              if (rawFiles && excalidrawAPI?.addFiles) {
                const parsedFiles = JSON.parse(rawFiles)
                const filesArr = Object.values(parsedFiles) as any[]
                const updatedFilesStore: Record<string, any> = {}

                for (const file of filesArr) {
                  if (!file || !file.id || !file.dataURL) continue
                  let currentFile = { ...file }
                  const isSvg =
                    currentFile.mimeType === 'image/svg+xml' ||
                    (typeof currentFile.dataURL === 'string' &&
                      currentFile.dataURL.startsWith('data:image/svg+xml'))

                  if (isSvg) {
                    let rawSvg: string | null = null
                    if (currentFile.dataURL.startsWith('data:image/svg+xml;utf8,')) {
                      try {
                        rawSvg = decodeURIComponent(currentFile.dataURL.slice('data:image/svg+xml;utf8,'.length))
                      } catch {}
                    } else if (currentFile.dataURL.startsWith('data:image/svg+xml;base64,')) {
                      try {
                        const b64 = currentFile.dataURL.slice('data:image/svg+xml;base64,'.length)
                        const binary = atob(b64)
                        const bytes = new Uint8Array(binary.length)
                        for (let i = 0; i < binary.length; i++) {
                          bytes[i] = binary.charCodeAt(i)
                        }
                        rawSvg = new TextDecoder().decode(bytes)
                      } catch {}
                    }

                    if (rawSvg) {
                      const clean = sanitizeSvg(rawSvg)
                      if (clean) {
                        currentFile = {
                          ...currentFile,
                          dataURL: svgToBase64DataUrl(clean),
                          mimeType: 'image/svg+xml',
                        }
                      }
                    }
                  }

                  // Add each file individually with try-catch and PNG rasterization fallback
                  try {
                    excalidrawAPI.addFiles([currentFile])
                    updatedFilesStore[currentFile.id] = currentFile
                  } catch (fileErr) {
                    console.warn(`File ${currentFile.id} failed addFiles as SVG, attempting PNG fallback:`, fileErr)
                    if (isSvg) {
                      try {
                        let rawSvg: string | null = null
                        if (typeof currentFile.dataURL === 'string' && currentFile.dataURL.startsWith('data:image/svg+xml;base64,')) {
                          const b64 = currentFile.dataURL.slice('data:image/svg+xml;base64,'.length)
                          const binary = atob(b64)
                          const bytes = new Uint8Array(binary.length)
                          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
                          rawSvg = new TextDecoder().decode(bytes)
                        }
                        if (!rawSvg) {
                          const universal = createUniversalScientificSvg('Scientific Diagram')
                          rawSvg = universal.svg
                        }
                        const pngUrl = await rasterizeSvgToPng(rawSvg, 500, 260)
                        const pngFile = {
                          ...currentFile,
                          dataURL: pngUrl,
                          mimeType: 'image/png',
                        }
                        excalidrawAPI.addFiles([pngFile])
                        updatedFilesStore[currentFile.id] = pngFile
                      } catch (pngErr) {
                        console.warn(`File ${currentFile.id} could not be rasterized:`, pngErr)
                      }
                    }
                  }
                }

                // Resave cleaned files to localStorage so invalid SVGs are pruned
                try {
                  localStorage.setItem(`${storageKey}_files`, JSON.stringify(updatedFilesStore))
                } catch {}
              }
            }
          } catch (e) {
            console.warn('Error reading saved whiteboard files:', e)
          }

          const initialTargetIdx = typeof activeConceptIndex === 'number' && activeConceptIndex > 0 ? activeConceptIndex : 0
          const reachedPagesCount = Math.max(1, initialTargetIdx + 1)
          const hasValidElements =
            savedPages &&
            savedPages.length > 0 &&
            savedPages.some((p) => Array.isArray(p.elements) && p.elements.length > 0)

          if (hasValidElements && savedPages) {
            // Prune any saved pages beyond reached concepts so unreached concepts are not pre-rendered
            const reachedSavedPages = savedPages.slice(0, reachedPagesCount)
            reachedSavedPages.forEach((p, idx) => {
              if (!p.elements || p.elements.length === 0) {
                const pageConcept = keyConcepts && keyConcepts[idx] ? keyConcepts[idx] : undefined
                const skeleton = createHeaderSkeleton(idx + 1, pageConcept)
                p.elements = convertElementsRef.current(skeleton)
                p.nextY = pageConcept ? 200 : 140
                p.roughY = 140
              }
            })
            pagesRef.current = reachedSavedPages
            setPages(reachedSavedPages)
            const targetPage = reachedSavedPages[initialTargetIdx] || reachedSavedPages[0]
            currentPageIndexRef.current = initialTargetIdx < reachedSavedPages.length ? initialTargetIdx : 0
            setCurrentPageIndex(currentPageIndexRef.current)
            boardElementsRef.current = targetPage.elements || []
            nextYRef.current = targetPage.nextY || 140
            roughYRef.current = targetPage.roughY || 140

            excalidrawAPI.updateScene({
              elements: targetPage.elements || [],
              appState: {
                viewBackgroundColor: CANVAS_BG,
                currentItemStrokeColor: INK_PRIMARY,
                currentItemFontFamily: 1,
                currentItemRoughness: 0,
                zoom: { value: 0.7 },
                scrollX: 0,
                scrollY: 0,
              },
            })
            return
          }

          // 2. Otherwise create initial fresh page skeleton only for reached concepts
          const initialPages: WhiteboardPage[] = []
          for (let p = 1; p <= reachedPagesCount; p++) {
            const conceptForPage = keyConcepts && keyConcepts[p - 1] ? keyConcepts[p - 1] : undefined
            const initialSkeleton = createHeaderSkeleton(p, conceptForPage)
            const initialElements = convertToExcalidrawElements(initialSkeleton)
            const hasConceptTitle = Boolean(conceptForPage)
            initialPages.push({
              id: p,
              elements: initialElements,
              nextY: hasConceptTitle ? 200 : 140,
              roughY: 140,
            })
          }

          pagesRef.current = initialPages
          setPages(initialPages)
          const chosenPage = initialPages[initialTargetIdx] || initialPages[0]
          currentPageIndexRef.current = initialTargetIdx < initialPages.length ? initialTargetIdx : 0
          setCurrentPageIndex(currentPageIndexRef.current)
          boardElementsRef.current = chosenPage.elements
          nextYRef.current = chosenPage.nextY
          roughYRef.current = chosenPage.roughY

          excalidrawAPI.updateScene({
            elements: chosenPage.elements,
            appState: {
              viewBackgroundColor: CANVAS_BG,
              currentItemStrokeColor: INK_PRIMARY,
              currentItemFontFamily: 1,
              currentItemRoughness: 0,
              zoom: { value: 0.7 },
              scrollX: 0,
              scrollY: 0,
            },
          })
          persistScene(chosenPage.elements)
        } catch (e) {
          console.error('Failed to initialize whiteboard:', e)
        }
      }

      initializeBoard()
    }, [excalidrawAPI, moduleId, moduleTitle])

    // Draw text in permanent notes column (left side)
    const drawText = async (text: string, x = 60, customY?: number, color?: string) => {
      if (!excalidrawAPI || !text?.trim()) return
      const clean = text.trim()
      if (checkIsRedundant(clean)) return
      if (executedTextHistoryRef.current.has(clean.toLowerCase())) return
      executedTextHistoryRef.current.add(clean.toLowerCase())

      const lines = wrapText(clean, 62)
      const lineHeight = 24
      const totalH = Math.max(30, lines.length * lineHeight)

      await checkAutoPageOverflow(totalH + 16)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const y = customY !== undefined ? customY : getDynamicNextY(15)
        const chosenColor = resolveChalkColor(color, activeChalkColorRef.current)

        const newElements = convertToExcalidrawElements([
          {
            type: 'text',
            x,
            y,
            text: lines.join('\n'),
            fontSize: 18,
            fontFamily: 1,
            strokeColor: chosenColor,
            customData: { isRough: false },
          },
        ])

        const currentElements = getCurrentElements()
        const merged = [...currentElements, ...newElements]
        updateCurrentPageElements(merged, y + totalH + 12)
        notifyPositionChange('draw_text', clean)
        onNoteRecorded?.(clean)
      } catch (err) {
        console.error('drawText error:', err)
      }
    }

    // Draw Section Title with Botanical Accent Underline (rendered once per page)
    const drawTitle = async (title: string, color?: string) => {
      if (!excalidrawAPI || !title?.trim()) return
      const clean = title
        .replace(/^focus:\s*/i, '')
        .replace(/^concept\s*\d*:\s*/i, '')
        .replace(/[\(\)\[\]\{\}\"]/g, '')
        .replace(/^'+|'+$/g, '')
        .replace(/\s+/g, ' ')
        .trim()
      if (!clean) return

      // Invariant: Never write Mastered or Concept Done as a title
      if (checkIsRedundant(clean) || /^(concept\s*\d*\s*)?(done|mastered|completed)\b[:\-]?/i.test(clean) || /\b(mastered)\b/i.test(clean)) {
        return
      }

      // Skip if identical to module title
      if (normalizeTitle(clean) === normalizeTitle(moduleTitle)) {
        return
      }

      // Check if current page already has a concept title or topic headline (synchronous check)
      const currentEls = getCurrentElements()
      const hasTitleOnCurrentPage = currentEls.some(
        (el: any) =>
          el.customData?.isTitle === true ||
          (el.type === 'text' && !el.id?.startsWith('header_') && el.fontSize >= 18)
      )
      if (hasTitleOnCurrentPage) {
        return
      }

      await checkAutoPageOverflow(65)
      try {
        const convertFn =
          convertElementsRef.current ||
          (await import('@excalidraw/excalidraw')).convertToExcalidrawElements
        convertElementsRef.current = convertFn

        const startX = 60
        const startY = getDynamicNextY(16)
        const titleText = `CONCEPT ${currentPageIndexRef.current + 1}: ${clean.toUpperCase()}`
        const titleColor = resolveChalkColor(color, INK_PRIMARY)
        const underlineColor = color ? titleColor : INK_BOTANICAL

        const elements = convertFn([
          {
            type: 'text',
            x: startX,
            y: startY,
            text: titleText,
            fontSize: 19,
            fontFamily: 1,
            strokeColor: titleColor,
            customData: { isRough: false, isTitle: true },
          },
          {
            type: 'line',
            x: startX,
            y: startY + 28,
            points: [[0, 0], [Math.min(titleText.length * 12, 380), 0]],
            strokeColor: underlineColor,
            strokeWidth: 2,
            customData: { isRough: false, isTitle: true },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 48)
        onNoteRecorded?.(`### ${clean}`)
      } catch (err) {
        console.error('drawTitle error:', err)
      }
    }

    // Draw Note with botanical indicator
    const drawNote = async (noteText: string, color?: string) => {
      if (!excalidrawAPI || !noteText?.trim()) return
      const clean = noteText.trim()
      if (checkIsRedundant(clean)) return
      if (shouldSkipDuplicate('draw_note', clean)) return
      if (executedTextHistoryRef.current.has(clean.toLowerCase())) return
      executedTextHistoryRef.current.add(clean.toLowerCase())

      const lines = wrapText(clean, 64)
      const lineHeight = 22
      const totalH = Math.max(28, lines.length * lineHeight)

      await checkAutoPageOverflow(totalH + 16)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 60
        const startY = getDynamicNextY(12)
        const noteColor = resolveChalkColor(color, activeChalkColorRef.current)
        const bulletColor = color ? noteColor : INK_BOTANICAL

        const elements = convertToExcalidrawElements([
          {
            type: 'ellipse',
            x: startX,
            y: startY + 6,
            width: 8,
            height: 8,
            strokeColor: bulletColor,
            backgroundColor: bulletColor,
            fillStyle: 'solid',
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 16,
            y: startY,
            text: lines.join('\n'),
            fontSize: 16,
            fontFamily: 1,
            strokeColor: noteColor,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + totalH + 12)
        notifyPositionChange('draw_note', clean)
        onNoteRecorded?.(`• ${clean}`)
      } catch (err) {
        console.error('drawNote error:', err)
      }
    }

    // Draw Step / Derivation Line
    const drawStep = async (stepText: string, color?: string) => {
      if (!excalidrawAPI || !stepText?.trim()) return
      const clean = stepText.trim()
      if (checkIsRedundant(clean)) return
      if (shouldSkipDuplicate('draw_step', clean)) return
      const lines = wrapText(clean, 60)
      const lineHeight = 21
      const totalH = Math.max(26, lines.length * lineHeight)

      await checkAutoPageOverflow(totalH + 16)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 60
        const startY = getDynamicNextY(12)
        const stepColor = resolveChalkColor(color, INK_SECONDARY)

        const elements = convertToExcalidrawElements([
          {
            type: 'text',
            x: startX,
            y: startY,
            text: lines.map((l, i) => (i === 0 ? `->  ${l}` : `    ${l}`)).join('\n'),
            fontSize: 15,
            fontFamily: 1,
            strokeColor: stepColor,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + totalH + 12)
        notifyPositionChange('draw_step', clean)
        onNoteRecorded?.(`  -> ${clean}`)
      } catch (err) {
        console.error('drawStep error:', err)
      }
    }

    // Draw Highlight Box / Governed Law / Formula in Coral Accent
    const drawHighlightBox = async (text: string, color?: string) => {
      if (!excalidrawAPI || !text?.trim()) return
      const clean = text.trim()
      if (checkIsRedundant(clean)) return
      if (shouldSkipDuplicate('draw_highlight_box', clean)) return
      const lines = wrapText(clean, 60)
      const boxWidth = 740
      const lineHeight = 22
      const textHeight = Math.max(1, lines.length) * lineHeight
      const boxHeight = Math.max(54, 16 + textHeight + 16)

      await checkAutoPageOverflow(boxHeight + 20)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 60
        const startY = getDynamicNextY(16)
        const boxStroke = resolveChalkColor(color, INK_CORAL)
        const boxBg = boxStroke === INK_CORAL ? INK_CORAL_SOFT : '#F8F6F0'

        const elements = convertToExcalidrawElements([
          {
            type: 'rectangle',
            x: startX,
            y: startY,
            width: boxWidth,
            height: boxHeight,
            strokeColor: boxStroke,
            backgroundColor: boxBg,
            fillStyle: 'solid',
            strokeWidth: 1.5,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 16,
            y: startY + 14,
            text: lines.join('\n'),
            fontSize: 16,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + boxHeight + 14)
        notifyPositionChange('draw_highlight_box', clean)
        onNoteRecorded?.(`**[Key Principle]**: ${clean}`)
      } catch (err) {
        console.error('drawHighlightBox error:', err)
      }
    }

    // Draw Exam / Checkpoint Question Callout (Full Width, Crisp Layout)
    const drawQuestion = async (questionText: string, color?: string) => {
      if (!excalidrawAPI || !questionText?.trim()) return
      const clean = questionText.trim()
      if (shouldSkipDuplicate('draw_question', clean)) return
      const lines = wrapText(clean, 64)
      const lineHeight = 22
      const paddingTop = 28
      const textHeight = Math.max(1, lines.length) * lineHeight
      const paddingBottom = 20
      const qHeight = Math.max(68, paddingTop + textHeight + paddingBottom)

      await checkAutoPageOverflow(qHeight + 20)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 60
        const startY = getDynamicNextY(16)
        const qStroke = resolveChalkColor(color, INK_CORAL)

        const elements = convertToExcalidrawElements([
          {
            type: 'rectangle',
            x: startX,
            y: startY,
            width: 740,
            height: qHeight,
            strokeColor: qStroke,
            backgroundColor: '#FFF8F6',
            fillStyle: 'solid',
            strokeWidth: 1.5,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 16,
            y: startY + 8,
            text: 'CHECKPOINT QUESTION:',
            fontSize: 11,
            fontFamily: 1,
            strokeColor: qStroke,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 16,
            y: startY + 28,
            text: lines.join('\n'),
            fontSize: 15,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
        ])

        activeQuestionRef.current = {
          text: clean,
          y: startY,
          height: qHeight,
          pageIndex: currentPageIndexRef.current,
        }

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + qHeight + 14)
        notifyPositionChange('draw_question', clean)
        onNoteRecorded?.(`? **Question**: ${clean}`)
      } catch (err) {
        console.error('drawQuestion error:', err)
      }
    }

    // Draw Student's Spoken Answer on Whiteboard
    const drawStudentAnswer = async (answerText: string, isCorrect?: boolean, color?: string) => {
      if (!excalidrawAPI || !answerText?.trim()) return
      const clean = answerText.trim()

      // Deduplicate recent identical or redundant student responses within 30 seconds
      const cleanLower = clean.toLowerCase().replace(/^(?:student(?:'s)?\s*answer:?\s*)+/i, '').trim()
      if (lastDrawnStudentAnswerRef.current) {
        const prevLower = lastDrawnStudentAnswerRef.current.text.toLowerCase().replace(/^(?:student(?:'s)?\s*answer:?\s*)+/i, '').trim()
        const isRecent = Date.now() - lastDrawnStudentAnswerRef.current.time < 30000
        if (isRecent && (cleanLower === prevLower || cleanLower.includes(prevLower) || prevLower.includes(cleanLower))) {
          console.log('[Chalkboard] Skipping duplicate student answer render:', clean)
          return
        }
      }
      lastDrawnStudentAnswerRef.current = { text: clean, time: Date.now() }

      const lines = wrapText(`"${clean}"`, 64)
      const lineHeight = 20
      const paddingTop = 26
      const textHeight = Math.max(1, lines.length) * lineHeight
      const paddingBottom = 18
      const boxHeight = Math.max(64, paddingTop + textHeight + paddingBottom)

      await checkAutoPageOverflow(boxHeight + 18)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 60
        const startY = getDynamicNextY(14)
        const ansStroke = resolveChalkColor(color, INK_BLUE)

        const elements = convertToExcalidrawElements([
          {
            type: 'rectangle',
            x: startX,
            y: startY,
            width: 740,
            height: boxHeight,
            strokeColor: ansStroke,
            backgroundColor: '#F0F7FF',
            fillStyle: 'solid',
            strokeWidth: 1.5,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 16,
            y: startY + 8,
            text: "STUDENT'S RESPONSE:",
            fontSize: 11,
            fontFamily: 1,
            strokeColor: ansStroke,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 16,
            y: startY + 26,
            text: lines.join('\n'),
            fontSize: 14,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + boxHeight + 14)
        notifyPositionChange('draw_student_answer', clean)
        onNoteRecorded?.(`**Student**: "${clean}"`)
      } catch (err) {
        console.error('drawStudentAnswer error:', err)
      }
    }

    // Draw Answer Verdict / Correction on Whiteboard
    const drawAnswerVerdict = async (verdictText: string, isCorrect?: boolean, color?: string) => {
      if (!excalidrawAPI || !verdictText?.trim()) return
      const clean = verdictText.trim()
      const looksCorrect =
        isCorrect === true ||
        /^(correct|spot on|perfect|exactly|well done|excellent|right|yes)\b/i.test(clean) ||
        /\b(correct|spot on|perfect|well done)\b/i.test(clean)
      const lines = wrapText(clean, 64)
      const lineHeight = 20
      const paddingTop = 26
      const textHeight = Math.max(1, lines.length) * lineHeight
      const paddingBottom = 18
      const boxHeight = Math.max(64, paddingTop + textHeight + paddingBottom)

      await checkAutoPageOverflow(boxHeight + 18)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 60
        const startY = getDynamicNextY(14)
        const vStroke = resolveChalkColor(
          color,
          looksCorrect ? INK_BOTANICAL : INK_CORAL
        )
        const vBg = looksCorrect ? '#F0FDF4' : '#FFF1F2'

        const elements = convertToExcalidrawElements([
          {
            type: 'rectangle',
            x: startX,
            y: startY,
            width: 740,
            height: boxHeight,
            strokeColor: vStroke,
            backgroundColor: vBg,
            fillStyle: 'solid',
            strokeWidth: 1.5,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 16,
            y: startY + 8,
            text: looksCorrect ? 'VERDICT: CORRECT & COMPLETE' : 'MODEL CORRECTION & REFINED ANSWER:',
            fontSize: 11,
            fontFamily: 1,
            strokeColor: vStroke,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 16,
            y: startY + 26,
            text: lines.join('\n'),
            fontSize: 14,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
        ])

        // Question resolved
        activeQuestionRef.current = null

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + boxHeight + 14)
        notifyPositionChange('draw_answer_verdict', clean)
        onNoteRecorded?.(`**Verdict**: ${clean}`)
      } catch (err) {
        console.error('drawAnswerVerdict error:', err)
      }
    }

    // Draw Exam Question & Model Answer on Whiteboard
    const drawExamQuestion = async (
      question: string,
      modelAnswer?: string,
      marks?: string,
      color?: string
    ) => {
      if (!excalidrawAPI || !question?.trim()) return
      if (shouldSkipDuplicate('draw_exam_question', question)) return

      // Support "question | model answer" in single string if modelAnswer omitted
      let qText = question.trim()
      let aText = (modelAnswer || '').trim()
      if (!aText && qText.includes('|')) {
        const parts = qText.split('|').map((s) => s.trim())
        qText = parts[0]
        aText = parts.slice(1).join(' | ').replace(/^answer:\s*/i, '')
      }

      const qLines = wrapText(qText, 60)
      const qLineHeight = 22
      const qTextHeight = qLines.length * qLineHeight
      let aLines: string[] = []
      let aTextHeight = 0
      if (aText) {
        aLines = wrapText(aText, 58)
        aTextHeight = aLines.length * 20
      }

      const cardHeight = 28 + qTextHeight + (aText ? 12 + 24 + aTextHeight : 0) + 24
      await checkAutoPageOverflow(cardHeight + 20)

      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 60
        const startY = getDynamicNextY(16)
        const exStroke = resolveChalkColor(color, INK_AMBER)

        const skeletons: any[] = [
          {
            type: 'rectangle',
            x: startX,
            y: startY,
            width: 740,
            height: cardHeight,
            strokeColor: exStroke,
            backgroundColor: '#FDFCF7',
            fillStyle: 'solid',
            strokeWidth: 2,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 16,
            y: startY + 10,
            text: `BOARD EXAM QUESTION ${marks ? `[${marks}]` : '[Typical Board Pattern]'}:`,
            fontSize: 11,
            fontFamily: 1,
            strokeColor: exStroke,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 16,
            y: startY + 28,
            text: `Q: ${qLines.join('\n   ')}`,
            fontSize: 15,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
        ]

        let curY = startY + 28 + qTextHeight + 12

        if (aText) {
          skeletons.push(
            {
              type: 'line',
              x: startX + 16,
              y: curY,
              points: [[0, 0], [708, 0]],
              strokeColor: BORDER_SUBTLE,
              strokeWidth: 1,
              strokeStyle: 'dashed',
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: startX + 16,
              y: curY + 6,
              text: 'TOPPER MODEL ANSWER:',
              fontSize: 11,
              fontFamily: 1,
              strokeColor: INK_BOTANICAL,
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: startX + 16,
              y: curY + 24,
              text: `Ans: ${aLines.join('\n     ')}`,
              fontSize: 14,
              fontFamily: 1,
              strokeColor: INK_PRIMARY,
              customData: { isRough: false },
            }
          )
        }

        const elements = convertToExcalidrawElements(skeletons)
        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + cardHeight + 16)
        notifyPositionChange('draw_exam_question', qText)
        onNoteRecorded?.(`**Exam Question**: ${qText}\n**Model Answer**: ${aText}`)
      } catch (err) {
        console.error('drawExamQuestion error:', err)
      }
    }

    // Helper parser for custom shapes with dynamic sizing
    const parseShapeInput = (input: any): {
      shape: string
      width: number
      height: number
      radius?: number
      label?: string
      color?: string
      fillColor?: string
    } => {
      if (typeof input === 'object' && input !== null) {
        const shape = String(input.shape || input.type || 'rectangle').toLowerCase().trim()
        const width = Number(input.width || input.w || input.dimension1 || input.length || 260)
        const height = Number(input.height || input.h || input.dimension2 || 140)
        const radius = input.radius !== undefined ? Number(input.radius) : undefined
        return {
          shape,
          width,
          height,
          radius,
          label: input.label || input.title || input.text || '',
          color: input.color,
          fillColor: input.fillColor || input.fill || input.bg,
        }
      }

      const str = String(input || '').trim()
      if (str.startsWith('{') && str.endsWith('}')) {
        try {
          const parsed = JSON.parse(str)
          return parseShapeInput(parsed)
        } catch {}
      }

      let shape = 'rectangle'
      let width = 260
      let height = 140
      let radius: number | undefined
      let label = ''
      let color: string | undefined
      let fillColor: string | undefined

      const lower = str.toLowerCase()
      if (lower.includes('circle')) shape = 'circle'
      else if (lower.includes('right_triangle') || lower.includes('right triangle')) shape = 'right_triangle'
      else if (lower.includes('triangle')) shape = 'triangle'
      else if (lower.includes('ellipse')) shape = 'ellipse'
      else if (lower.includes('cylinder')) shape = 'cylinder'
      else if (lower.includes('cube') || lower.includes('cuboid') || lower.includes('box')) shape = 'cube'
      else if (lower.includes('square')) shape = 'square'
      else if (lower.includes('polygon')) shape = 'polygon'
      else if (lower.includes('arrow') || lower.includes('line')) shape = 'arrow'
      else if (lower.includes('rectangle')) shape = 'rectangle'

      const wMatch = str.match(/\b(?:width|w|length|len)[:=]\s*(\d+(?:\.\d+)?)/i)
      if (wMatch) width = parseFloat(wMatch[1])

      const hMatch = str.match(/\b(?:height|h|breadth|b)[:=]\s*(\d+(?:\.\d+)?)/i)
      if (hMatch) height = parseFloat(hMatch[1])

      const rMatch = str.match(/\b(?:radius|rad|r)[:=]\s*(\d+(?:\.\d+)?)/i)
      if (rMatch) radius = parseFloat(rMatch[1])

      const labelMatch = str.match(/\b(?:label|title|text)[:=]\s*(?:"([^"]+)"|'([^']+)'|([^|;\n]+))/i)
      if (labelMatch) label = (labelMatch[1] || labelMatch[2] || labelMatch[3] || '').trim()

      const colMatch = str.match(/\b(?:color|stroke)[:=]\s*([a-zA-Z#0-9]+)/i)
      if (colMatch) color = colMatch[1].trim()

      const fillMatch = str.match(/\b(?:fill|fillColor|bg)[:=]\s*([a-zA-Z#0-9]+)/i)
      if (fillMatch) fillColor = fillMatch[1].trim()

      if (!label && str.includes('|')) {
        const parts = str.split('|').map((p) => p.trim())
        if (parts.length > 1 && !parts[1].includes(':') && !parts[1].includes('=')) {
          label = parts[1]
        }
      }

      return { shape, width, height, radius, label, color, fillColor }
    }

    // Draw Geometric Shape with Complete Size, Dimension & Label Control
    const drawShape = async (shapeInput: any) => {
      if (!excalidrawAPI) return
      const { shape, width, height, radius, label, color, fillColor } = parseShapeInput(shapeInput)
      const stroke = resolveChalkColor(color, INK_BOTANICAL)
      const bg = fillColor || (stroke === INK_CORAL ? INK_CORAL_SOFT : '#F0F6F2')

      const startX = 70
      let w = Math.min(Math.max(width, 40), 720)
      let h = Math.min(Math.max(height, 30), 450)
      if (shape === 'square') {
        w = Math.min(w, h)
        h = w
      }

      await checkAutoPageOverflow(h + (label ? 60 : 30))

      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startY = getDynamicNextY(16)
        const skeletons: any[] = []

        if (shape === 'rectangle' || shape === 'square' || shape === 'box') {
          skeletons.push({
            type: 'rectangle',
            x: startX,
            y: startY,
            width: w,
            height: h,
            strokeColor: stroke,
            backgroundColor: bg,
            fillStyle: 'solid',
            strokeWidth: 2,
            roundness: { type: 3 },
            customData: { isRough: false },
          })

          skeletons.push({
            type: 'text',
            x: startX + Math.max(Math.floor(w / 2) - 35, 10),
            y: startY - 18,
            text: `w: ${w}px`,
            fontSize: 12,
            fontFamily: 1,
            strokeColor: INK_MUTED,
            customData: { isRough: false },
          })

          skeletons.push({
            type: 'text',
            x: startX + w + 8,
            y: startY + Math.floor(h / 2) - 8,
            text: `h: ${h}px`,
            fontSize: 12,
            fontFamily: 1,
            strokeColor: INK_MUTED,
            customData: { isRough: false },
          })
        } else if (shape === 'circle') {
          const r = radius ? radius : Math.floor(Math.min(w, h) / 2)
          const diam = r * 2
          skeletons.push(
            {
              type: 'ellipse',
              x: startX,
              y: startY,
              width: diam,
              height: diam,
              strokeColor: stroke,
              backgroundColor: bg,
              fillStyle: 'solid',
              strokeWidth: 2,
              customData: { isRough: false },
            },
            {
              type: 'ellipse',
              x: startX + r - 3,
              y: startY + r - 3,
              width: 6,
              height: 6,
              strokeColor: stroke,
              backgroundColor: stroke,
              fillStyle: 'solid',
              customData: { isRough: false },
            },
            {
              type: 'line',
              x: startX + r,
              y: startY + r,
              points: [[0, 0], [r, 0]],
              strokeColor: INK_CORAL,
              strokeWidth: 2,
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: startX + r + Math.floor(r / 2) - 8,
              y: startY + r - 16,
              text: `r: ${r}`,
              fontSize: 12,
              fontFamily: 1,
              strokeColor: INK_CORAL,
              customData: { isRough: false },
            }
          )
          w = diam
          h = diam
        } else if (shape === 'ellipse') {
          skeletons.push({
            type: 'ellipse',
            x: startX,
            y: startY,
            width: w,
            height: h,
            strokeColor: stroke,
            backgroundColor: bg,
            fillStyle: 'solid',
            strokeWidth: 2,
            customData: { isRough: false },
          })
        } else if (shape === 'triangle' || shape === 'right_triangle') {
          const isRight = shape === 'right_triangle'
          const pts = isRight
            ? [[0, 0], [w, 0], [0, -h], [0, 0]]
            : [[0, 0], [w, 0], [Math.floor(w / 2), -h], [0, 0]]

          skeletons.push(
            {
              type: 'line',
              x: startX,
              y: startY + h,
              points: pts,
              strokeColor: stroke,
              strokeWidth: 2,
              backgroundColor: bg,
              fillStyle: 'solid',
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: startX - 14,
              y: startY + h + 2,
              text: 'A',
              fontSize: 13,
              fontFamily: 1,
              strokeColor: INK_CORAL,
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: startX + w + 4,
              y: startY + h + 2,
              text: 'B',
              fontSize: 13,
              fontFamily: 1,
              strokeColor: INK_CORAL,
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: isRight ? startX - 14 : startX + Math.floor(w / 2) - 6,
              y: startY - 14,
              text: 'C',
              fontSize: 13,
              fontFamily: 1,
              strokeColor: INK_CORAL,
              customData: { isRough: false },
            }
          )
        } else if (shape === 'cylinder') {
          const r = radius ? radius : Math.floor(w / 4)
          const cylW = r * 2
          const topH = Math.max(Math.floor(r * 0.6), 18)
          skeletons.push(
            {
              type: 'ellipse',
              x: startX,
              y: startY + h - topH,
              width: cylW,
              height: topH * 2,
              strokeColor: stroke,
              backgroundColor: bg,
              fillStyle: 'solid',
              strokeWidth: 2,
              customData: { isRough: false },
            },
            {
              type: 'line',
              x: startX,
              y: startY + topH,
              points: [[0, 0], [0, h - topH]],
              strokeColor: stroke,
              strokeWidth: 2,
              customData: { isRough: false },
            },
            {
              type: 'line',
              x: startX + cylW,
              y: startY + topH,
              points: [[0, 0], [0, h - topH]],
              strokeColor: stroke,
              strokeWidth: 2,
              customData: { isRough: false },
            },
            {
              type: 'ellipse',
              x: startX,
              y: startY,
              width: cylW,
              height: topH * 2,
              strokeColor: stroke,
              backgroundColor: bg,
              fillStyle: 'solid',
              strokeWidth: 2,
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: startX + cylW + 12,
              y: startY + Math.floor(h / 2),
              text: `Height = ${h}px`,
              fontSize: 12,
              fontFamily: 1,
              strokeColor: INK_MUTED,
              customData: { isRough: false },
            }
          )
          w = cylW
        } else if (shape === 'cube' || shape === 'cuboid') {
          const offset = 24
          skeletons.push(
            {
              type: 'rectangle',
              x: startX + offset,
              y: startY,
              width: w,
              height: h,
              strokeColor: BORDER_SUBTLE,
              strokeWidth: 1.5,
              strokeStyle: 'dashed',
              customData: { isRough: false },
            },
            {
              type: 'rectangle',
              x: startX,
              y: startY + offset,
              width: w,
              height: h,
              strokeColor: stroke,
              backgroundColor: bg,
              fillStyle: 'solid',
              strokeWidth: 2,
              roundness: { type: 3 },
              customData: { isRough: false },
            },
            {
              type: 'line',
              x: startX,
              y: startY + offset,
              points: [[0, 0], [offset, -offset]],
              strokeColor: stroke,
              strokeWidth: 1.5,
              customData: { isRough: false },
            },
            {
              type: 'line',
              x: startX + w,
              y: startY + offset,
              points: [[0, 0], [offset, -offset]],
              strokeColor: stroke,
              strokeWidth: 1.5,
              customData: { isRough: false },
            },
            {
              type: 'line',
              x: startX + w,
              y: startY + offset + h,
              points: [[0, 0], [offset, -offset]],
              strokeColor: stroke,
              strokeWidth: 1.5,
              customData: { isRough: false },
            }
          )
        } else if (shape === 'arrow' || shape === 'line') {
          skeletons.push({
            type: 'arrow',
            x: startX,
            y: startY + 15,
            points: [[0, 0], [w, 0]],
            strokeColor: stroke,
            strokeWidth: 3,
            customData: { isRough: false },
          })
          h = 30
        }

        if (label) {
          skeletons.push({
            type: 'text',
            x: startX,
            y: startY + h + 14,
            text: label,
            fontSize: 15,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          })
        }

        const elements = convertToExcalidrawElements(skeletons)
        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + h + (label ? 42 : 24))
        onNoteRecorded?.(`[Shape: ${shape}] ${label || `${w}x${h}`}`)
      } catch (err) {
        console.error('drawShape error:', err)
      }
    }

    // Universal Topic-Adaptive Flowchart on Board (Multi-Row Wrapping, Decision Trees & Cycles)
    const drawFlowchart = async (flowText: string, color?: string) => {
      if (!excalidrawAPI || !flowText?.trim()) return
      if (shouldSkipDuplicate('draw_flowchart', flowText)) return
      const rawText = flowText.trim()
      const isCycle = rawText.toLowerCase().startsWith('cycle:') || rawText.toLowerCase().includes('[cycle]')
      const cleanText = rawText.replace(/^cycle:\s*/i, '').replace(/\[cycle\]/gi, '').trim()
      const steps = cleanText.split(/->|=>|\|/).map((s) => s.trim()).filter(Boolean)
      if (steps.length === 0) return

      const maxBoxesPerRow = 3
      const numRows = Math.ceil(steps.length / maxBoxesPerRow)
      const estimatedHeight = Math.max(70, numRows * 76 + 20)
      await checkAutoPageOverflow(estimatedHeight)

      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startY = getDynamicNextY(16)
        const flowColor = resolveChalkColor(color, INK_BOTANICAL)
        const skeletons: any[] = []
        const rowPositions: { x: number; y: number; w: number; h: number }[] = []

        steps.forEach((st, i) => {
          const rowIdx = Math.floor(i / maxBoxesPerRow)
          const colIdx = i % maxBoxesPerRow
          const w = Math.min(210, Math.max(120, st.length * 8.5 + 24))
          const h = 36
          const boxX = 60 + colIdx * (210 + 28)
          const boxY = startY + rowIdx * (h + 38)

          rowPositions.push({ x: boxX, y: boxY, w, h })

          skeletons.push(
            {
              type: 'rectangle',
              x: boxX,
              y: boxY,
              width: w,
              height: h,
              strokeColor: flowColor,
              backgroundColor: '#F0F6F2',
              fillStyle: 'solid',
              strokeWidth: 1.5,
              roundness: { type: 3 },
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: boxX + 10,
              y: boxY + 10,
              text: st,
              fontSize: 13,
              fontFamily: 1,
              strokeColor: INK_PRIMARY,
              customData: { isRough: false },
            }
          )

          // Connecting arrow to next step
          if (i < steps.length - 1) {
            const nextRowIdx = Math.floor((i + 1) / maxBoxesPerRow)
            if (nextRowIdx === rowIdx) {
              // Horizontal arrow to next box in same row
              skeletons.push({
                type: 'arrow',
                x: boxX + w,
                y: boxY + Math.floor(h / 2),
                points: [[0, 0], [22, 0]],
                strokeColor: flowColor,
                strokeWidth: 2,
                customData: { isRough: false },
              })
            } else {
              // Row wrap: downward connector arrow to next row
              skeletons.push({
                type: 'arrow',
                x: boxX + Math.floor(w / 2),
                y: boxY + h,
                points: [
                  [0, 0],
                  [0, 20],
                  [-colIdx * (210 + 28), 20],
                  [-colIdx * (210 + 28), 38],
                ],
                strokeColor: flowColor,
                strokeWidth: 2,
                customData: { isRough: false },
              })
            }
          }
        })

        // If cycle, draw curved return arrow from last step back to first step
        if (isCycle && rowPositions.length > 1) {
          const lastPos = rowPositions[rowPositions.length - 1]
          const firstPos = rowPositions[0]
          skeletons.push({
            type: 'arrow',
            x: lastPos.x + Math.floor(lastPos.w / 2),
            y: lastPos.y + lastPos.h,
            points: [
              [0, 0],
              [0, 18],
              [firstPos.x - lastPos.x, 18],
              [firstPos.x - lastPos.x, -(lastPos.y - firstPos.y)],
            ],
            strokeColor: flowColor,
            strokeWidth: 1.5,
            strokeStyle: 'dashed',
            customData: { isRough: false },
          })
        }

        const elements = convertToExcalidrawElements(skeletons)
        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + estimatedHeight)
        onNoteRecorded?.(`[Flow${isCycle ? ' Cycle' : ''}]: ${steps.join(' -> ')}`)
      } catch (err) {
        console.error('drawFlowchart error:', err)
      }
    }

    // Universal Responsive & Auto-Wrapping Whiteboard Table Renderer
    const drawTable = async (tableStr: string) => {
      if (!excalidrawAPI || !tableStr?.trim()) return
      if (shouldSkipDuplicate('draw_table', tableStr)) return
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 60
        const totalTableWidth = 720

        // 1. Robust multiformat row parser: handles '||', '\n', and markdown table syntax
        const rawLines = tableStr.includes('||')
          ? tableStr.split('||')
          : tableStr.split(/\r?\n/)

        const rows: string[][] = []
        for (const line of rawLines) {
          const trimmed = line.trim()
          if (!trimmed) continue
          // Skip markdown divider rows like |---|---| or |:---:|
          if (/^\|?[\s\-:]+(\|[\s\-:]+)+\|?$/.test(trimmed)) continue

          // Remove leading and trailing pipe if present
          const cleanLine = trimmed.replace(/^\|/, '').replace(/\|$/, '')
          const cells = cleanLine.split('|').map((c) => c.trim())
          if (cells.some((c) => c.length > 0)) {
            rows.push(cells)
          }
        }

        if (rows.length === 0) return

        const numCols = Math.max(...rows.map((r) => r.length), 1)
        const colWidth = Math.floor(totalTableWidth / numCols)
        // Approximate chars per line based on column width (average character is ~7.5px in Excalidraw font 1)
        const maxCharsPerCellLine = Math.max(12, Math.floor((colWidth - 20) / 7.8))

        // 2. Measure and pre-wrap all cells, computing dynamic row heights
        const wrappedRows: { cellText: string; lines: string[] }[][] = []
        const rowHeights: number[] = []

        rows.forEach((row, rowIdx) => {
          let maxLinesInRow = 1
          const wrappedCells: { cellText: string; lines: string[] }[] = []

          // Pad row to have numCols
          for (let colIdx = 0; colIdx < numCols; colIdx++) {
            const rawCell = row[colIdx] || ''
            const lines = rawCell ? wrapText(rawCell, maxCharsPerCellLine) : ['-']
            if (lines.length > maxLinesInRow) {
              maxLinesInRow = lines.length
            }
            wrappedCells.push({ cellText: rawCell, lines })
          }

          wrappedRows.push(wrappedCells)
          // Line height: 16px per line + 14px vertical padding
          const dynamicHeight = Math.max(34, 14 + maxLinesInRow * 16)
          rowHeights.push(dynamicHeight)
        })

        const totalTableHeight = rowHeights.reduce((a, b) => a + b, 0)
        await checkAutoPageOverflow(totalTableHeight + 24)
        const startY = getDynamicNextY(16)

        const skeletons: any[] = []
        let currentY = startY

        wrappedRows.forEach((row, rowIdx) => {
          const isHeader = rowIdx === 0
          const currentRowHeight = rowHeights[rowIdx]

          row.forEach((cellData, colIdx) => {
            const x = startX + colIdx * colWidth

            // Cell background box
            skeletons.push({
              type: 'rectangle',
              x,
              y: currentY,
              width: colWidth,
              height: currentRowHeight,
              strokeColor: isHeader ? INK_BOTANICAL : '#D5D2C8',
              backgroundColor: isHeader ? '#EBF2ED' : rowIdx % 2 === 1 ? '#FFFFFF' : '#FAF9F6',
              fillStyle: 'solid',
              strokeWidth: isHeader ? 1.5 : 1,
              customData: { isRough: false },
            })

            // Wrapped cell text
            skeletons.push({
              type: 'text',
              x: x + 10,
              y: currentY + 8,
              text: cellData.lines.join('\n'),
              fontSize: isHeader ? 12 : 11,
              fontFamily: 1,
              strokeColor: isHeader ? INK_PRIMARY : '#2E302D',
              customData: { isRough: false },
            })
          })

          currentY += currentRowHeight
        })

        const elements = convertToExcalidrawElements(skeletons)
        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, currentY + 20)
        onNoteRecorded?.(`[Table]: ${rows[0]?.join(' | ')}`)
      } catch (err) {
        console.error('drawTable error:', err)
      }
    }

    // Universal 2D Geometry & Shapes on Whiteboard (Mathematics, Physics, Engineering)
    const drawGeometry = async (geomStr: string) => {
      if (!excalidrawAPI || !geomStr?.trim()) return
      return drawShape(geomStr)
    }

    // Draw Working Calculations in unified board flow
    const drawRoughWork = async (workText: string, color?: string) => {
      if (!excalidrawAPI || !workText?.trim()) return
      const clean = workText.trim()
      await checkAutoPageOverflow(46)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 60
        const startY = getDynamicNextY(12)
        const roughColor = resolveChalkColor(color, INK_AMBER)

        const elements = convertToExcalidrawElements([
          {
            id: `work_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            type: 'text',
            x: startX,
            y: startY,
            text: `[Working]: ${clean}`,
            fontSize: 14,
            fontFamily: 1,
            strokeColor: roughColor,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 36)
        onNoteRecorded?.(`  [Working]: ${clean}`)
      } catch (err) {
        console.error('drawRoughWork error:', err)
      }
    }

    // Clear Working / Scratch calculations
    const clearRough = async () => {
      if (!excalidrawAPI) return
      try {
        const current = getCurrentElements()
        const filtered = current.filter(
          (el: any) => !el.id?.startsWith('work_') && !el.id?.startsWith('rough_')
        )
        updateCurrentPageElements(filtered, nextYRef.current)
      } catch (err) {
        console.error('clearRough error:', err)
      }
    }

    // Clear Notes on current page
    const clearNotes = async () => {
      if (!excalidrawAPI) return
      try {
        const current = getCurrentElements()
        const filtered = current.filter(
          (el: any) => el.customData?.isHeader === true
        )
        updateCurrentPageElements(filtered, 140)
      } catch (err) {
        console.error('clearNotes error:', err)
      }
    }

    // Reset entire board to clean state (clears localStorage and resets to clean Page 1)
    const resetBoard = async () => {
      if (!excalidrawAPI) return
      try {
        if (typeof window !== 'undefined' && storageKey) {
          localStorage.removeItem(storageKey)
          localStorage.removeItem(`${storageKey}_files`)
        }
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const firstConcept = keyConcepts && keyConcepts[0] ? keyConcepts[0] : undefined
        const initialSkeleton = createHeaderSkeleton(1, firstConcept)
        const initialElements = convertToExcalidrawElements(initialSkeleton)
        const freshPages: WhiteboardPage[] = [
          {
            id: 1,
            elements: initialElements,
            nextY: firstConcept ? 200 : 140,
            roughY: 140,
          },
        ]
        pagesRef.current = freshPages
        setPages(freshPages)
        currentPageIndexRef.current = 0
        setCurrentPageIndex(0)
        boardElementsRef.current = initialElements
        nextYRef.current = firstConcept ? 200 : 140
        roughYRef.current = 140
        executedTextHistoryRef.current.clear()
        lastExecutedActionTimeRef.current.clear()
        activeQuestionRef.current = null

        excalidrawAPI.updateScene({
          elements: initialElements,
          appState: {
            viewBackgroundColor: CANVAS_BG,
            currentItemStrokeColor: INK_PRIMARY,
            currentItemFontFamily: 1,
            currentItemRoughness: 0,
            zoom: { value: 0.7 },
            scrollX: 0,
            scrollY: 0,
          },
        })
      } catch (err) {
        console.error('resetBoard error:', err)
      }
    }

    // Clear entire board (resets to Page 1 clean state)
    const clearBoard = async () => {
      await resetBoard()
    }

    // Rewrite notes cleanly on board
    const rewriteNotes = async (newNotes: string) => {
      if (!excalidrawAPI || !newNotes?.trim()) return
      await clearNotes()
      const lines = newNotes.split('\n').filter((l) => l.trim().length > 0)
      for (const line of lines) {
        const t = line.trim()
        if (t.startsWith('###')) {
          await drawTitle(t.replace(/^###\s*/, ''))
        } else if (t.startsWith('•') || t.startsWith('*') || t.startsWith('-')) {
          await drawNote(t.replace(/^[•*-]\s*/, ''))
        } else if (t.startsWith('->')) {
          await drawStep(t.replace(/^->\s*/, ''))
        } else if (t.startsWith('**[') || t.toLowerCase().includes('formula')) {
          await drawHighlightBox(t)
        } else {
          await drawText(t)
        }
      }
    }

    // -------------------------------------------------------------------------
    // Safe math evaluator for dynamic Cartesian formulas (y = f(x)) is imported from @/lib/mathEvaluator
    // -------------------------------------------------------------------------

    // Dynamic Mathematical & Scientific Graph Plotter (Cartesian Coordinates, Arbitrary Formulas, Custom Domain/Range, Discrete Points)
    const drawGraph = async (query = 'linear') => {
      if (!excalidrawAPI) return
      await checkAutoPageOverflow(230)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 75
        const startY = getDynamicNextY(18)
        const q = (query || '').trim()
        const lowerQ = q.toLowerCase()

        // 1. Parse parameters & options from query
        let formula = ''
        let domain: [number, number] = [-5, 5]
        let range: [number, number] | null = null
        let titleText = 'Cartesian Graph'
        let yLabel = 'Y'
        let xLabel = 'X'
        let calloutText = ''
        const discretePoints: [number, number][] = []
        let hasExplicitDomain = false

        // Extract pipe or comma parameters: domain=[-5,5], points=[(1,2),(3,4)], etc.
        const pipeParts = q.split('|').map((s) => s.trim())
        const mainPart = pipeParts[0] || 'linear'

        pipeParts.forEach((part) => {
          const l = part.toLowerCase()
          if (l.includes('domain=') || l.includes('x=[')) {
            const m = part.match(/\[\s*([\-\d\.]+)\s*,\s*([\-\d\.]+)\s*\]/)
            if (m) {
              domain = [parseFloat(m[1]), parseFloat(m[2])]
              hasExplicitDomain = true
            }
          } else if (l.includes('range=') || l.includes('y=[')) {
            const m = part.match(/\[\s*([\-\d\.]+)\s*,\s*([\-\d\.]+)\s*\]/)
            if (m) range = [parseFloat(m[1]), parseFloat(m[2])]
          } else if (l.includes('points=')) {
            const matches = part.matchAll(/\(\s*([\-\d\.]+)\s*,\s*([\-\d\.]+)\s*\)/g)
            for (const match of matches) {
              discretePoints.push([parseFloat(match[1]), parseFloat(match[2])])
            }
          } else if (l.startsWith('title=')) {
            titleText = part.split('=')[1]?.trim() || titleText
          } else if (l.startsWith('xlabel=')) {
            xLabel = part.split('=')[1]?.trim() || xLabel
          } else if (l.startsWith('ylabel=')) {
            yLabel = part.split('=')[1]?.trim() || yLabel
          } else if (l.startsWith('callout=')) {
            calloutText = part.split('=')[1]?.trim() || calloutText
          } else if (l.startsWith('formula=')) {
            formula = part.split('=')[1]?.trim() || formula
          }
        })

        // Check if mainPart is a mathematical formula or scientific preset
        const isParamDirective = /^(points|domain|range|title|xlabel|ylabel|callout|formula)=/i.test(mainPart)
        const isMathFormula =
          !isParamDirective &&
          (mainPart.includes('=') ||
            mainPart.includes('x') ||
            mainPart.includes('sin') ||
            mainPart.includes('cos') ||
            mainPart.includes('tan') ||
            mainPart.includes('exp') ||
            mainPart.includes('log') ||
            mainPart.includes('ln') ||
            mainPart.includes('^'))

        if (formula) {
          if (titleText === 'Cartesian Graph') titleText = `Function Plot: ${formula}`
        } else if (isMathFormula && !mainPart.includes('v-t') && !mainPart.includes('velocity')) {
          formula = mainPart
          titleText = titleText === 'Cartesian Graph' ? `Function Plot: ${mainPart}` : titleText
        } else if (lowerQ.includes('velocity') || lowerQ.includes('speed') || lowerQ.includes('v-t') || lowerQ.includes('vt')) {
          titleText = 'Velocity-Time Graph (v-t): Slope = Acceleration (a)'
          yLabel = 'v (m/s)'
          xLabel = 't (s)'
          calloutText = 'Slope = a = (v - u)/t | Area = Displacement (s)'
          if (!hasExplicitDomain) domain = [0, 10]
          formula = '1.5x + 2' // Linear acceleration exemplar
        } else if (lowerQ.includes('distance') || lowerQ.includes('displacement') || lowerQ.includes('s-t') || lowerQ.includes('st')) {
          titleText = 'Distance-Time Graph (s-t): Slope = Speed (v)'
          yLabel = 's (m)'
          xLabel = 't (s)'
          calloutText = 'Slope = Speed v = Delta_s / Delta_t'
          if (!hasExplicitDomain) domain = [0, 10]
          formula = '2.5x'
        } else if (lowerQ.includes('ohm') || lowerQ.includes('v-i') || lowerQ.includes('vi') || lowerQ.includes('resistan')) {
          titleText = "Ohm's Law V vs I Characteristic (Slope = Resistance R)"
          yLabel = 'V (Volts)'
          xLabel = 'I (Amperes)'
          calloutText = 'Slope = Delta_V / Delta_I = Resistance R'
          if (!hasExplicitDomain) domain = [0, 5]
          formula = '4x' // R = 4 Ohm exemplar
        } else if (lowerQ.includes('boyle') || lowerQ.includes('p-v') || lowerQ.includes('pv') || lowerQ.includes('isotherm')) {
          titleText = "Boyle's Law Isothermal Curve: P proportional to 1/V"
          yLabel = 'P (Pa)'
          xLabel = 'V (m^3)'
          calloutText = 'P * V = Constant (Isothermal)'
          if (!hasExplicitDomain) domain = [1, 10]
          formula = '20 / x'
        } else if (lowerQ.includes('wave') || lowerQ.includes('sine') || lowerQ.includes('harmonic')) {
          titleText = 'Transverse Harmonic Wave: y = A * sin(kx)'
          yLabel = 'y (m)'
          xLabel = 'x (m)'
          calloutText = 'Wavelength Lambda | Amplitude A'
          if (!hasExplicitDomain) domain = [-3.14, 3.14]
          formula = '2 * sin(x)'
        } else if (lowerQ.includes('decay') || lowerQ.includes('radio') || lowerQ.includes('exponen')) {
          titleText = 'Exponential Decay: N = N0 * e^(-lambda * t)'
          yLabel = 'N'
          xLabel = 't'
          calloutText = 'Half-life t_1/2 = ln(2) / lambda'
          if (!hasExplicitDomain) domain = [0, 5]
          formula = '10 * e^(-0.6x)'
        } else if (lowerQ.includes('quad') || lowerQ.includes('para')) {
          titleText = 'Quadratic Parabola: y = ax^2 + bx + c'
          if (!hasExplicitDomain) domain = [-4, 4]
          formula = 'x^2 - 4'
          calloutText = 'Vertex & Axis of Symmetry'
        } else if (discretePoints.length > 0) {
          if (titleText === 'Cartesian Graph') titleText = 'Discrete Points Plot'
        } else {
          // Standard linear default
          titleText = 'Linear Graph: y = mx + c'
          if (!hasExplicitDomain) domain = [-5, 5]
          formula = 'x + 1'
          calloutText = 'Slope m = Delta_y / Delta_x'
        }

        // Auto-fit domain if discrete points given without explicit domain
        if (!hasExplicitDomain && discretePoints.length > 0 && !formula) {
          const ptXs = discretePoints.map((p) => p[0])
          const minX = Math.min(...ptXs)
          const maxX = Math.max(...ptXs)
          const pad = (maxX - minX) * 0.2 || 1
          domain = [Math.floor(minX - pad), Math.ceil(maxX + pad)]
        }

        // 2. Evaluate formula over domain to compute coordinates
        const graphWidth = 240
        const graphHeight = 130
        const numSamples = 35
        const [xMin, xMax] = domain
        const xStep = (xMax - xMin) / (numSamples - 1)

        const sampled: { x: number; y: number }[] = []
        if (formula) {
          for (let i = 0; i < numSamples; i++) {
            const xVal = xMin + i * xStep
            const yVal = evaluateMathExpression(formula, xVal)
            if (yVal !== null && !isNaN(yVal) && isFinite(yVal)) {
              sampled.push({ x: xVal, y: yVal })
            }
          }
        }

        // Add discrete points if any
        discretePoints.forEach(([px, py]) => {
          sampled.push({ x: px, y: py })
        })

        // Sort sampled points strictly by x to ensure monotonic plotting without zig-zags
        sampled.sort((a, b) => a.x - b.x)

        // Determine range [yMin, yMax]
        let [yMin, yMax] = range || [-10, 10]
        if (!range && sampled.length > 0) {
          const yVals = sampled.map((p) => p.y)
          const minY = Math.min(...yVals)
          const maxY = Math.max(...yVals)
          const padding = (maxY - minY) * 0.15 || 2
          yMin = Math.floor(minY - padding)
          yMax = Math.ceil(maxY + padding)
          if (yMin === yMax) {
            yMin -= 5
            yMax += 5
          }
        }

        // Coordinate projection helper: converts mathematical (x, y) to pixel offset relative to origin box
        const toPixels = (x: number, y: number): [number, number] => {
          const clampedX = Math.max(xMin, Math.min(xMax, x))
          const clampedY = Math.max(yMin, Math.min(yMax, y))
          const px = ((clampedX - xMin) / (xMax - xMin)) * graphWidth
          const py = -((clampedY - yMin) / (yMax - yMin)) * graphHeight
          return [px, py]
        }

        // Calculate origin position on screen
        const originX = startX + 35
        const originY = startY + 155
        const [axisZeroX, axisZeroY] = toPixels(
          xMin <= 0 && xMax >= 0 ? 0 : xMin,
          yMin <= 0 && yMax >= 0 ? 0 : yMin
        )

        // Curve point offsets relative to (originX, originY)
        const curvePoints: [number, number][] = sampled
          .filter((p) => p.y >= yMin && p.y <= yMax)
          .map((p) => toPixels(p.x, p.y))

        const elementsSkeleton: any[] = [
          // Title Banner
          {
            type: 'text',
            x: startX,
            y: startY,
            text: titleText,
            fontSize: 16,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          // Cartesian Y-Axis
          {
            type: 'arrow',
            x: originX + axisZeroX,
            y: originY,
            points: [
              [0, 10],
              [0, -graphHeight - 20],
            ],
            strokeColor: INK_PRIMARY,
            strokeWidth: 2,
            customData: { isRough: false },
          },
          // Cartesian X-Axis
          {
            type: 'arrow',
            x: originX,
            y: originY + axisZeroY,
            points: [
              [-10, 0],
              [graphWidth + 25, 0],
            ],
            strokeColor: INK_PRIMARY,
            strokeWidth: 2,
            customData: { isRough: false },
          },
          // Axis Labels
          {
            type: 'text',
            x: originX + axisZeroX - 12,
            y: originY - graphHeight - 32,
            text: yLabel,
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_BOTANICAL,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: originX + graphWidth + 30,
            y: originY + axisZeroY - 6,
            text: xLabel,
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_BOTANICAL,
            customData: { isRough: false },
          },
        ]

        // Coordinate Origin Marker "0" (only when origin [0, 0] is within viewable domain & range)
        const originInView = xMin <= 0 && xMax >= 0 && yMin <= 0 && yMax >= 0
        if (originInView) {
          elementsSkeleton.push({
            type: 'text',
            x: originX + axisZeroX - 18,
            y: originY + axisZeroY + 6,
            text: '0',
            fontSize: 11,
            fontFamily: 1,
            strokeColor: INK_MUTED,
            customData: { isRough: false },
          })
        }

        // Add domain ticks on X-axis (xmin, xmax)
        const [xMinPx] = toPixels(xMin, yMin <= 0 && yMax >= 0 ? 0 : yMin)
        const [xMaxPx] = toPixels(xMax, yMin <= 0 && yMax >= 0 ? 0 : yMin)
        if (!originInView || Math.abs(xMin) > 0.001) {
          elementsSkeleton.push({
            type: 'text',
            x: originX + xMinPx - 6,
            y: originY + axisZeroY + 6,
            text: `${xMin}`,
            fontSize: 10,
            fontFamily: 1,
            strokeColor: INK_MUTED,
            customData: { isRough: false },
          })
        }
        if (!originInView || Math.abs(xMax) > 0.001) {
          elementsSkeleton.push({
            type: 'text',
            x: originX + xMaxPx - 6,
            y: originY + axisZeroY + 6,
            text: `${xMax}`,
            fontSize: 10,
            fontFamily: 1,
            strokeColor: INK_MUTED,
            customData: { isRough: false },
          })
        }

        // Plotted Function Curve / Line (only if curvePoints has >= 2 points)
        if (curvePoints.length > 1) {
          elementsSkeleton.push({
            type: 'line',
            x: originX,
            y: originY,
            points: curvePoints,
            strokeColor: INK_CORAL,
            strokeWidth: 2.5,
            customData: { isRough: false },
          })
        }

        // Add Discrete Points Markers if provided
        discretePoints.forEach(([dx, dy]) => {
          const [ptX, ptY] = toPixels(dx, dy)
          elementsSkeleton.push(
            {
              type: 'ellipse',
              x: originX + ptX - 4,
              y: originY + ptY - 4,
              width: 8,
              height: 8,
              strokeColor: INK_CORAL,
              backgroundColor: INK_CORAL,
              fillStyle: 'solid',
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: originX + ptX + 6,
              y: originY + ptY - 14,
              text: `(${dx}, ${dy})`,
              fontSize: 11,
              fontFamily: 1,
              strokeColor: INK_PRIMARY,
              customData: { isRough: false },
            }
          )
        })

        // Callout Note / Principle Badge
        if (calloutText) {
          elementsSkeleton.push({
            type: 'text',
            x: originX + graphWidth + 20,
            y: originY - graphHeight / 2 - 15,
            text: calloutText,
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_BOTANICAL,
            customData: { isRough: false },
          })
        }

        const elements = convertToExcalidrawElements(elementsSkeleton)
        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, originY + 35)
        onNoteRecorded?.(`**Graph**: ${titleText} [${xLabel} vs ${yLabel}]`)
      } catch (err) {
        console.error('drawGraph error:', err)
      }
    }

    // Step-by-Step Problem Solving on Whiteboard (Given -> Formula -> Substitution -> Calculation in Rough -> Boxed Answer)
    const drawNumericalSolution = async (solution: {
      problem?: string
      given?: string
      formula?: string
      substitution?: string
      calculation?: string
      answer: string
      unit?: string
    }) => {
      if (!excalidrawAPI) return
      await checkAutoPageOverflow(170)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 60
        const startY = getDynamicNextY(16)
        const elements: any[] = []

        let curY = startY

        // 1. Problem / Numerical Statement
        if (solution.problem) {
          elements.push({
            type: 'text',
            x: startX,
            y: curY,
            text: `Problem: ${solution.problem}`,
            fontSize: 15,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          })
          curY += 28
        }

        // 2. Given Parameters
        if (solution.given) {
          elements.push({
            type: 'text',
            x: startX + 10,
            y: curY,
            text: `• Given: ${solution.given}`,
            fontSize: 14,
            fontFamily: 1,
            strokeColor: INK_SECONDARY,
            customData: { isRough: false },
          })
          curY += 24
        }

        // 3. Formula / Governing Law
        if (solution.formula) {
          elements.push({
            type: 'text',
            x: startX + 10,
            y: curY,
            text: `Formula: ${solution.formula}`,
            fontSize: 15,
            fontFamily: 1,
            strokeColor: INK_BOTANICAL,
            customData: { isRough: false },
          })
          curY += 26
        }

        // 4. Substitution Step
        if (solution.substitution) {
          elements.push({
            type: 'text',
            x: startX + 10,
            y: curY,
            text: `-> Substitution: ${solution.substitution}`,
            fontSize: 14,
            fontFamily: 1,
            strokeColor: INK_SECONDARY,
            customData: { isRough: false },
          })
          curY += 30
        }

        // 5. Boxed Final Answer with SI Units
        const ansText = `Answer: ${solution.answer}${solution.unit ? ' ' + solution.unit : ''}`
        const boxWidth = Math.min(Math.max(ansText.length * 11 + 32, 240), 400)
        elements.push(
          {
            type: 'rectangle',
            x: startX + 10,
            y: curY,
            width: boxWidth,
            height: 40,
            strokeColor: INK_CORAL,
            backgroundColor: INK_CORAL_SOFT,
            fillStyle: 'solid',
            strokeWidth: 2,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 22,
            y: curY + 10,
            text: ansText,
            fontSize: 15,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          }
        )
        curY += 50

        const current = getCurrentElements()
        const converted = convertToExcalidrawElements(elements)
        const merged = [...current, ...converted]
        updateCurrentPageElements(merged, curY + 15)

        // 6. Scratchpad / Calculation in Right Rough Margin
        if (solution.calculation) {
          await drawRoughWork(`Calculation:\n${solution.calculation}`)
        }

        onNoteRecorded?.(`**Solved Numerical**: ${solution.problem || solution.formula || ansText}`)
      } catch (err) {
        console.error('drawNumericalSolution error:', err)
      }
    }

    // Draw Dynamic Vector SVG Diagram Card directly on Whiteboard
    const drawSvgDiagram = async (title: string, svgMarkup: string, caption = '') => {
      if (!excalidrawAPI || (!title?.trim() && !svgMarkup?.trim())) return
      if (shouldSkipDuplicate('draw_svg_diagram', `${title}:${caption || ''}`)) return

      await checkAutoPageOverflow(260)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 60
        const startY = getDynamicNextY(20)

        // Clean markdown code blocks, script tags, and whitespace
        let cleanSvg = (svgMarkup || '').trim().replace(/^```(?:xml|svg|html)?\s*/i, '').replace(/\s*```$/i, '').trim()
        cleanSvg = cleanSvg.replace(/<script[\s\S]*?<\/script>/gi, '')

        let resolvedTitle = (title || '').trim() || 'Scientific Diagram'
        let resolvedCaption = caption

        // If SVG markup is missing or does not contain an <svg tag, dynamically generate an authentic scientific SVG
        if (!cleanSvg.toLowerCase().includes('<svg')) {
          const generated = createUniversalScientificSvg(resolvedTitle || cleanSvg, caption)
          cleanSvg = generated.svg
          resolvedTitle = generated.title
          if (!resolvedCaption) resolvedCaption = generated.caption
        }

        // Sanitize SVG via DOMParser to catch malformed XML from Gemini Live output
        const sanitized = sanitizeSvg(cleanSvg)
        if (sanitized) {
          cleanSvg = sanitized
        } else {
          // SVG is irreparably malformed, fall back to universal generator
          const generated = createUniversalScientificSvg(resolvedTitle, caption)
          cleanSvg = generated.svg
          resolvedTitle = generated.title
          if (!resolvedCaption) resolvedCaption = generated.caption
        }

        // Determine dimensions from viewBox or width/height
        let svgWidth = 500
        let svgHeight = 260
        const viewBoxMatch = cleanSvg.match(/viewBox\s*=\s*["']([^"']+)["']/i)
        if (viewBoxMatch) {
          const parts = viewBoxMatch[1].trim().split(/[\s,]+/).map(Number)
          if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
            const vbW = parts[2]
            const vbH = parts[3]
            const aspect = vbH / vbW
            svgWidth = Math.min(520, Math.max(300, vbW))
            svgHeight = Math.round(svgWidth * aspect)
          }
        } else {
          const wMatch = cleanSvg.match(/width\s*=\s*["']?(\d+)/i)
          const hMatch = cleanSvg.match(/height\s*=\s*["']?(\d+)/i)
          if (wMatch && hMatch) {
            const parsedW = parseInt(wMatch[1], 10)
            const parsedH = parseInt(hMatch[1], 10)
            if (parsedW > 0 && parsedH > 0) {
              const aspect = parsedH / parsedW
              svgWidth = Math.min(520, Math.max(300, parsedW))
              svgHeight = Math.round(svgWidth * aspect)
            }
          }
        }

        // Clamp height for whiteboard balance
        if (svgHeight > 340) {
          const ratio = 340 / svgHeight
          svgHeight = 340
          svgWidth = Math.round(svgWidth * ratio)
        }
        if (svgHeight < 140) svgHeight = 160

        const fileId = `svg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}` as any
        const dataURL = svgToBase64DataUrl(cleanSvg) as any
        let resolvedDataURL = dataURL
        let fileMimeType = 'image/svg+xml'

        // Try adding as SVG first; if Excalidraw rejects it, rasterize to PNG as bulletproof fallback
        let fileObj: any = {
          id: fileId,
          dataURL: resolvedDataURL,
          mimeType: fileMimeType,
          created: Date.now(),
        }

        if (excalidrawAPI.addFiles) {
          try {
            excalidrawAPI.addFiles([fileObj])
          } catch (svgErr) {
            // SVG rejected by Excalidraw's internal parser - rasterize to PNG
            try {
              const pngDataUrl = await rasterizeSvgToPng(cleanSvg, svgWidth, svgHeight)
              fileMimeType = 'image/png'
              resolvedDataURL = pngDataUrl
              fileObj = { id: fileId, dataURL: pngDataUrl, mimeType: 'image/png', created: Date.now() }
              excalidrawAPI.addFiles([fileObj])
            } catch (pngErr) {
              console.warn('Both SVG and PNG fallback failed:', pngErr)
            }
          }
        }

        // Persist SVG file to localStorage so it survives page reload
        if (typeof window !== 'undefined' && storageKey) {
          try {
            const rawFiles = localStorage.getItem(`${storageKey}_files`)
            const existingFiles = rawFiles ? JSON.parse(rawFiles) : {}
            existingFiles[fileId] = fileObj
            localStorage.setItem(`${storageKey}_files`, JSON.stringify(existingFiles))
          } catch (e) {
            console.warn('Error saving whiteboard file to localStorage:', e)
          }
        }

        const cardWidth = Math.max(svgWidth + 32, 440)
        const captionLines = caption?.trim()
          ? wrapText(caption.trim(), 55)
          : resolvedCaption?.trim()
          ? wrapText(resolvedCaption.trim(), 55)
          : []
        const captionHeight = captionLines.length * 18
        const cardHeight = svgHeight + 56 + (captionLines.length > 0 ? captionHeight + 12 : 0) + 16

        const skeletons: any[] = [
          // Background card container
          {
            type: 'rectangle',
            x: startX,
            y: startY,
            width: cardWidth,
            height: cardHeight,
            strokeColor: INK_BOTANICAL,
            backgroundColor: '#FDFBF7',
            fillStyle: 'solid',
            strokeWidth: 1.5,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          // Header / Title
          {
            type: 'text',
            x: startX + 16,
            y: startY + 12,
            text: `[DIAGRAM]: ${resolvedTitle.toUpperCase()}`,
            fontSize: 14,
            fontFamily: 1,
            strokeColor: INK_BOTANICAL,
            customData: { isRough: false },
          },
          // SVG Image Element
          {
            type: 'image',
            x: startX + 16,
            y: startY + 44,
            width: svgWidth,
            height: svgHeight,
            fileId,
            status: 'saved',
            customData: { isRough: false },
          },
        ]

        if (captionLines.length > 0) {
          skeletons.push({
            type: 'text',
            x: startX + 16,
            y: startY + 44 + svgHeight + 12,
            text: captionLines.join('\n'),
            fontSize: 12,
            fontFamily: 1,
            strokeColor: INK_SECONDARY,
            customData: { isRough: false },
          })
        }

        const elements = convertToExcalidrawElements(skeletons)
        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + cardHeight + 20)
        onNoteRecorded?.(`[Diagram]: ${title}${caption ? ` - ${caption}` : ''}`)
      } catch (err) {
        console.error('drawSvgDiagram error:', err)
      }
    }

    // Draw Video Demonstration Card directly on Whiteboard
    const drawVideoCard = async (title: string, description = '') => {
      if (!excalidrawAPI || !title?.trim()) return
      await checkAutoPageOverflow(140)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 70
        const startY = getDynamicNextY(16)

        const elements = convertToExcalidrawElements([
          {
            type: 'rectangle',
            x: startX,
            y: startY,
            width: 390,
            height: 95,
            strokeColor: INK_CORAL,
            backgroundColor: '#FFF8F6',
            fillStyle: 'solid',
            strokeWidth: 1.5,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 14,
            y: startY + 10,
            text: `[DEMONSTRATION VIDEO]: ${title.toUpperCase()}`,
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_CORAL,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 14,
            y: startY + 36,
            text: description || `Visual experimental proof demonstration on ${title}.`,
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 14,
            y: startY + 70,
            text: 'Live Laboratory & Practical Verification',
            fontSize: 11,
            fontFamily: 1,
            strokeColor: INK_MUTED,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 115)
        onNoteRecorded?.(`[Video Demo]: ${title}`)
      } catch (err) {
        console.error('drawVideoCard error:', err)
      }
    }

    // Parse AI Directives like [BOARD_TITLE: ...], [DIAGRAM: ...], [IMAGE: ...], etc.
    const handleAiDirective = (rawText: string, transcriptId = 'global') => {
      if (!rawText) return

      // Match pseudo-code: write_chalkboard(action="...", content="...", color="...")
      const codeRegex = /write_chalkboard\s*\(\s*(?:action\s*=\s*)?["']?([a-zA-Z0-9_\-]+)["']?\s*(?:,\s*(?:content\s*=\s*)?(?:["']([^"']*)["']|([^"',\)]*)))?(?:,\s*(?:color\s*=\s*)?["']?([a-zA-Z0-9_#]+)["']?)?\s*\)/gi;
      const codeMatches = Array.from(rawText.matchAll(codeRegex));
      for (const cm of codeMatches) {
        const action = cm[1]?.toLowerCase();
        const content = (cm[2] ?? cm[3] ?? '').trim();
        const color = cm[4]?.trim();
        if (!action) continue;
        const signature = `CODE:${action}:${normalizeTitle(content)}`;
        if (executedDirectivesRef.current.has(signature)) continue;
        executedDirectivesRef.current.add(signature);

        enqueueOperation(async () => {
          if (action === 'draw_note' || action === 'note') {
            if (content && !checkIsRedundant(content)) await drawNote(content, color);
          } else if (action === 'draw_step' || action === 'step') {
            if (content && !checkIsRedundant(content)) await drawStep(content, color);
          } else if (action === 'draw_highlight_box' || action === 'highlight_box') {
            if (content && !checkIsRedundant(content)) await drawHighlightBox(content, color);
          } else if (action === 'draw_title' || action === 'title') {
            if (content && !checkIsRedundant(content)) await drawTitle(content, color);
          } else if (action === 'set_color' || action === 'color') {
            setChalkColor(content || color || '');
          } else if (action === 'draw_question' || action === 'question') {
            if (content) await drawQuestion(content, color);
          } else if (action === 'draw_student_answer' || action === 'student_answer') {
            if (content) await drawStudentAnswer(content, undefined, color);
          } else if (action === 'draw_answer_verdict' || action === 'answer_verdict') {
            if (content) await drawAnswerVerdict(content, undefined, color);
          } else if (action === 'draw_exam_question' || action === 'exam_question') {
            if (content) await drawExamQuestion(content, undefined, undefined, color);
          } else if (action === 'draw_shape' || action === 'shape' || action === 'draw_rectangle' || action === 'draw_circle' || action === 'draw_triangle') {
            if (content) await drawShape(content);
          } else if (action === 'draw_table' || action === 'table') {
            if (content) await drawTable(content);
          } else if (action === 'draw_graph' || action === 'graph') {
            if (content) await drawGraph(content);
          } else if (action === 'draw_geometry' || action === 'geometry') {
            if (content) await drawGeometry(content);
          } else if (action === 'draw_image' || action === 'image') {
            const parts = (content || '').split('|').map((s) => s.trim());
            await drawFlowchart(`${parts[0] || 'Key Concept'} -> Fundamental Principle -> Board Application`);
          } else if (action === 'draw_video' || action === 'video') {
            const parts = (content || '').split('|').map((s) => s.trim());
            await drawVideoCard(parts[0] || 'Demonstration', parts[1] || '');
          } else if (action === 'draw_numerical' || action === 'numerical' || action === 'worked_example' || action === 'solve') {
            if (typeof content === 'object') await drawNumericalSolution(content);
            else {
              const parts = (content || '').split('|').map((s) => s.trim());
              const solutionData: any = { answer: '' };
              parts.forEach((p) => {
                const lower = p.toLowerCase();
                if (lower.startsWith('problem:')) solutionData.problem = p.substring(8).trim();
                else if (lower.startsWith('given:')) solutionData.given = p.substring(6).trim();
                else if (lower.startsWith('formula:')) solutionData.formula = p.substring(8).trim();
                else if (lower.startsWith('substitution:') || lower.startsWith('sub:')) solutionData.substitution = p.split(':')[1]?.trim();
                else if (lower.startsWith('calculation:') || lower.startsWith('rough:')) solutionData.calculation = p.split(':')[1]?.trim();
                else if (lower.startsWith('answer:') || lower.startsWith('final:')) solutionData.answer = p.split(':')[1]?.trim();
                else if (lower.startsWith('unit:') || lower.startsWith('units:')) solutionData.unit = p.split(':')[1]?.trim();
                else if (!solutionData.problem) solutionData.problem = p;
                else if (!solutionData.answer) solutionData.answer = p;
              });
              await drawNumericalSolution(solutionData);
            }
          } else if (action === 'render_svg_diagram' || action === 'draw_svg' || action === 'draw_svg_diagram') {
            if (content) {
              const trimmed = content.trim();
              if (trimmed.includes('|') && trimmed.includes('<svg')) {
                const parts = trimmed.split('|').map((s) => s.trim());
                await drawSvgDiagram(parts[0] || 'Educational Diagram', parts[1] || '', parts[2]);
              } else if (trimmed.includes('<svg')) {
                await drawSvgDiagram('Educational Diagram', trimmed);
              } else {
                await drawSvgDiagram(trimmed, '');
              }
            }
          } else if (action === 'draw_flowchart' || action === 'flowchart') {
            if (content) await drawFlowchart(content, color);
          } else if (action === 'draw_rough_work' || action === 'rough_work' || action === 'rough') {
            if (content) await drawRoughWork(content, color);
          } else if (action === 'new_page') {
            await addNewPage();
          } else if (action === 'clear_rough') {
            clearRough();
          } else if (action === 'clear_notes') {
            await clearNotes();
          } else if (action === 'concept_done') {
            onConceptDone?.(content);
          } else if (action === 'concept_focus') {
            onConceptFocus?.(content);
          } else if (action === 'concept_goto') {
            onConceptGoto?.(content);
          } else if (action === 'start_quiz' || action === 'open_quiz') {
            onStartQuiz?.();
          } else if (action === 'chapter_summary') {
            await drawTitle('Chapter Synthesis Summary', color);
            await drawNote(content, color);
            onNoteRecorded?.(`#### Chapter Summary:\n${content}`);
            onModuleComplete?.(content);
          }
        });
      }

      // Match pseudo-code: render_svg_diagram(title="...", svg="...", caption="...") or JSON format
      const svgToolRegex = /render_svg_diagram\s*\(([\s\S]*?)\)/gi;
      const svgMatches = Array.from(rawText.matchAll(svgToolRegex));
      for (const sm of svgMatches) {
        const body = sm[1]?.trim();
        if (!body) continue;
        let title = 'Educational Diagram';
        let svg = '';
        let caption = '';
        if (body.startsWith('{')) {
          try {
            const parsed = JSON.parse(body);
            title = parsed.title || title;
            svg = parsed.svg || '';
            caption = parsed.caption || '';
          } catch {}
        } else {
          const explicitTitle = body.match(/\btitle\s*=\s*["']([^"']*)["']/i);
          const explicitSvg = body.match(/\bsvg\s*=\s*["']([\s\S]*?)["'](?:\s*,\s*[a-zA-Z_]+\s*=|\s*$)/i);
          const explicitCaption = body.match(/\bcaption\s*=\s*["']([^"']*)["']/i);
          if (explicitSvg) {
            title = explicitTitle ? explicitTitle[1] : 'Educational Diagram';
            svg = explicitSvg[1];
            caption = explicitCaption ? explicitCaption[1] : '';
          } else {
            const posMatch = body.match(/["']([^"']*)["']\s*,\s*["']([\s\S]*?)["'](?:\s*,\s*["']([^"']*)["'])?/);
            if (posMatch) {
              title = posMatch[1];
              svg = posMatch[2];
              caption = posMatch[3] || '';
            }
          }
        }
        if (svg) {
          const signature = `SVG:${normalizeTitle(title)}:${svg.slice(0, 40)}`;
          if (!executedDirectivesRef.current.has(signature)) {
            executedDirectivesRef.current.add(signature);
            enqueueOperation(async () => {
              await drawSvgDiagram(title, svg, caption);
            });
          }
        }
      }

      const directiveRegex = /\[([A-Z_]+)(?::\s*([^\]]+))?\]/gi;
      const matches = Array.from(rawText.matchAll(directiveRegex))

      for (const match of matches) {
        const fullTag = match[0]
        const tagType = match[1]?.toUpperCase()
        const payload = match[2]?.trim() || ''
        const signature = `${tagType}:${normalizeTitle(payload)}`

        // Prevent repeated execution of the exact same directive
        if (executedDirectivesRef.current.has(signature)) {
          continue
        }
        executedDirectivesRef.current.add(signature)

        enqueueOperation(async () => {
          // 1. Board & Page Operations
          if (tagType === 'NEW_PAGE' || tagType === 'PAGE_NEW' || tagType === 'NEXT_PAGE') {
            await addNewPage()
          } else if (tagType === 'CLEAR_ROUGH') {
            clearRough()
          } else if (tagType === 'CLEAR_NOTES') {
            await clearNotes()
          } else if (tagType === 'REWRITE_NOTES') {
            if (payload) await rewriteNotes(payload)
            else await clearNotes()
          } else if (tagType === 'CLEAR_BOARD' || tagType === 'ERASE_BOARD') {
            await clearBoard()
          }
          // 2. Titles & Notes (Avoid duplicating module title and clean raw parentheses)
          else if (tagType === 'BOARD_TITLE' || tagType === 'TITLE') {
            const cleanPayload = payload.replace(/^[\s\(\[\{]+|[\s\)\]\}]+$/g, '').trim()
            if (cleanPayload && !checkIsRedundant(cleanPayload)) {
              const [titleText, color] = cleanPayload.includes('|') ? cleanPayload.split('|').map((s) => s.trim()) : [cleanPayload, undefined]
              await drawTitle(titleText, color)
            }
          } else if (tagType === 'BOARD_NOTE' || tagType === 'NOTE') {
            if (payload && !checkIsRedundant(payload)) {
              const [noteText, color] = payload.includes('|') ? payload.split('|').map((s) => s.trim()) : [payload, undefined]
              await drawNote(noteText, color)
            }
          } else if (tagType === 'BOARD_STEP' || tagType === 'STEP') {
            if (payload && !checkIsRedundant(payload)) {
              const [stepText, color] = payload.includes('|') ? payload.split('|').map((s) => s.trim()) : [payload, undefined]
              await drawStep(stepText, color)
            }
          } else if (tagType === 'HIGHLIGHT_BOX') {
            if (payload && !checkIsRedundant(payload)) {
              const [boxText, color] = payload.includes('|') ? payload.split('|').map((s) => s.trim()) : [payload, undefined]
              await drawHighlightBox(boxText, color)
            }
          } else if (tagType === 'FLOWCHART') {
            if (payload) {
              const [flowText, color] = payload.includes('|') && !payload.includes('->') ? payload.split('|').map((s) => s.trim()) : [payload, undefined]
              await drawFlowchart(flowText, color)
            }
          } else if (tagType === 'ROUGH_WORK' || tagType === 'ROUGH') {
            if (payload) {
              const [roughText, color] = payload.includes('|') ? payload.split('|').map((s) => s.trim()) : [payload, undefined]
              await drawRoughWork(roughText, color)
            }
          } else if (tagType === 'SET_COLOR' || tagType === 'CHALK_COLOR' || tagType === 'COLOR') {
            if (payload) setChalkColor(payload)
          }
          // 2b. Math & Science Step-by-Step Problem Solving Directives
          else if (
            tagType === 'NUMERICAL' ||
            tagType === 'WORKED_EXAMPLE' ||
            tagType === 'SOLVE' ||
            tagType === 'MATH_SOLVE' ||
            tagType === 'BOARD_NUMERICAL'
          ) {
            if (payload) {
              const parts = payload.split('|').map((s) => s.trim())
              const solutionData: any = { answer: '' }
              parts.forEach((p) => {
                const lower = p.toLowerCase()
                if (lower.startsWith('problem:')) solutionData.problem = p.substring(8).trim()
                else if (lower.startsWith('given:')) solutionData.given = p.substring(6).trim()
                else if (lower.startsWith('formula:')) solutionData.formula = p.substring(8).trim()
                else if (lower.startsWith('substitution:') || lower.startsWith('sub:')) solutionData.substitution = p.split(':')[1]?.trim()
                else if (lower.startsWith('calculation:') || lower.startsWith('rough:')) solutionData.calculation = p.split(':')[1]?.trim()
                else if (lower.startsWith('answer:') || lower.startsWith('final:')) solutionData.answer = p.split(':')[1]?.trim()
                else if (lower.startsWith('unit:') || lower.startsWith('units:')) solutionData.unit = p.split(':')[1]?.trim()
                else if (!solutionData.problem) solutionData.problem = p
                else if (!solutionData.answer) solutionData.answer = p
              })
              await drawNumericalSolution(solutionData)
            }
          } else if (tagType === 'GIVEN' || tagType === 'BOARD_GIVEN') {
            if (payload) await drawStep(`Given: ${payload}`)
          } else if (tagType === 'FORMULA' || tagType === 'BOARD_FORMULA') {
            if (payload) await drawHighlightBox(`Formula: ${payload}`, INK_BOTANICAL)
          } else if (tagType === 'SUBSTITUTION' || tagType === 'SUBSTITUTE') {
            if (payload) await drawStep(`Substitution: ${payload}`)
          } else if (tagType === 'CALCULATION') {
            if (payload) await drawRoughWork(payload)
          } else if (tagType === 'FINAL_ANSWER' || tagType === 'BOXED_ANSWER') {
            if (payload) await drawHighlightBox(`Answer: ${payload}`, INK_CORAL)
          }
          // 2c. Universal Tables & Geometry
          else if (tagType === 'TABLE' || tagType === 'COMPARISON_TABLE') {
            if (payload) await drawTable(payload)
          } else if (tagType === 'GEOMETRY' || tagType === 'SHAPE' || tagType === 'POLYGON' || tagType === 'DRAW_SHAPE') {
            if (payload) await drawShape(payload)
          } else if (tagType === 'QUESTION' || tagType === 'CHECKPOINT_QUESTION') {
            if (payload) await drawQuestion(payload)
          } else if (tagType === 'STUDENT_ANSWER' || tagType === 'STUDENT_RESPONSE') {
            if (payload) await drawStudentAnswer(payload)
          } else if (tagType === 'VERDICT' || tagType === 'ANSWER_VERDICT' || tagType === 'CORRECTION') {
            if (payload) await drawAnswerVerdict(payload)
          } else if (tagType === 'EXAM_QUESTION' || tagType === 'BOARD_QUESTION') {
            if (payload) await drawExamQuestion(payload)
          } else if (tagType === 'TIMELINE') {
            if (payload) await drawFlowchart(payload)
          }
          // 3. Universal Diagrams, SVG & Graphs (Any Subject)
          else if (tagType === 'SVG' || tagType === 'SVG_DIAGRAM' || tagType === 'RENDER_SVG' || tagType === 'RENDER_SVG_DIAGRAM') {
            if (payload.includes('|') && payload.includes('<svg')) {
              const parts = payload.split('|').map((s) => s.trim())
              const title = parts[0] || 'Educational Diagram'
              const svg = parts[1] || ''
              const caption = parts[2] || ''
              if (svg) await drawSvgDiagram(title, svg, caption)
            } else if (payload.includes('<svg')) {
              await drawSvgDiagram('Educational Diagram', payload)
            }
          } else if (tagType === 'GRAPH' || tagType === 'DRAW_GRAPH') {
            await drawGraph(payload)
          } else if (tagType === 'DIAGRAM' || tagType === 'DRAW_DIAGRAM') {
            const diag = payload.toLowerCase()
            if (payload.includes('<svg') && payload.includes('</svg>')) {
              const titleMatch = payload.match(/title\s*=\s*["']([^"']+)["']/i)
              const title = titleMatch ? titleMatch[1] : 'Educational Diagram'
              const svgMatch = payload.match(/<svg[\s\S]*?<\/svg>/i)
              if (svgMatch) await drawSvgDiagram(title, svgMatch[0])
            } else if (diag.includes('triangle') || diag.includes('circle') || diag.includes('geometry') || diag.includes('polygon') || diag.includes('angle')) {
              await drawGeometry(payload)
            } else if (diag.includes('table') || diag.includes('compare') || diag.includes('vs')) {
              if (payload.includes('|')) await drawTable(payload)
              else await drawFlowchart(payload)
            } else if (diag.includes('timeline') || diag.includes('flow')) {
              await drawFlowchart(payload)
            } else if (diag.includes('graph') || diag.includes('ohm') || diag.includes('linear') || diag.includes('velocity') || diag.includes('speed') || diag.includes('distance') || diag.includes('wave') || diag.includes('parabola') || diag.includes('quad') || diag.includes('boyle') || diag.includes('curve') || diag.includes('plot') || diag.includes('=')) {
              await drawGraph(diag)
            } else {
              // Universal dynamic vector SVG diagram for any syllabus subject
              await drawSvgDiagram(payload || 'Scientific Diagram', '', '')
            }
          }
          // 4. Board Videos & Dynamic Vector Diagrams
          else if (tagType === 'IMAGE' || tagType === 'DRAW_IMAGE') {
            const [imgTitle, imgDesc] = payload.split('|').map((s) => s.trim())
            await drawSvgDiagram(imgTitle || 'Scientific Diagram', '', imgDesc || '')
          } else if (tagType === 'VIDEO' || tagType === 'DRAW_VIDEO') {
            const [vidTitle, vidDesc] = payload.split('|').map((s) => s.trim())
            await drawVideoCard(vidTitle || 'Visual Demonstration', vidDesc || '')
          }
          // 5. Questions and Progress
          else if (tagType === 'BOARD_QUESTION' || tagType === 'QUESTION') {
            if (payload) {
              await drawQuestion(payload)
            }
          } else if (tagType === 'CONFIRM_END_CHAPTER') {
            if (payload) {
              await drawQuestion(payload)
              onConfirmEndChapter?.(payload)
            }
          } else if (tagType === 'START_QUIZ' || tagType === 'OPEN_QUIZ') {
            onStartQuiz?.()
          } else if (tagType === 'CHAPTER_SUMMARY') {
            if (payload) {
              await drawTitle('Chapter Synthesis Summary')
              await drawNote(payload)
              onNoteRecorded?.(`#### Chapter Summary:\n${payload}`)
              onModuleComplete?.(payload)
            }
          } else if (tagType === 'MODULE_DONE' || tagType === 'LESSON_COMPLETE') {
            // Invariant: Do NOT write "Capsule Completed Successfully" on the board
            onModuleComplete?.(payload || 'Lesson finished')
          } else if (tagType === 'CONCEPT_FOCUS' || tagType === 'FOCUS') {
            const cleanPayload = (payload || '')
              .replace(/^focus:\s*/i, '')
              .replace(/^concept\s*\d*:\s*/i, '')
              .replace(/^[\s\(\[\{]+|[\s\)\]\}]+$/g, '')
              .trim()
            if (cleanPayload) {
              onConceptFocus?.(cleanPayload)
            }
          } else if (tagType === 'CONCEPT_DONE' || tagType === 'CONCEPT_MASTERED' || tagType === 'MASTERED') {
            const cleanPayload = (payload || '').trim()
            // Invariant: Do NOT write "Mastered: ..." or "Concept Done" on the board.
            onConceptDone?.(cleanPayload)
          } else if (tagType === 'CONCEPT_GOTO' || tagType === 'GOTO_CONCEPT') {
            if (payload) onConceptGoto?.(payload)
          } else if (tagType === 'RESET_MODULE_PROGRESS' || tagType === 'TEACH_FROM_START') {
            onConceptGoto?.(1)
          } else if (tagType === 'BOARD') {
            if (payload) await drawText(payload)
          }
        })
      }
    }

    // Expose imperative API
    useImperativeHandle(ref, () => ({
      drawText,
      drawTitle,
      drawStep,
      drawNote,
      drawQuestion,
      drawHighlightBox,
      drawFlowchart,
      drawRoughWork,
      clearRough,
      clearNotes,
      rewriteNotes,
      clearBoard,
      resetBoard,
      setChalkColor: (colorNameOrHex: string) => setChalkColor(colorNameOrHex),
      setBoardColor: () => {},
      drawSvgDiagram,
      drawGraph,
      drawNumericalSolution,
      drawVideoCard,
      drawTable,
      drawGeometry,
      drawShape,
      drawStudentAnswer,
      drawAnswerVerdict,
      drawExamQuestion,
      addNewPage,
      goToPage,
      getBoardSummary,
      handleAiDirective,
      getActiveQuestion: () => activeQuestionRef.current,
      getNextY: () => nextYRef.current,
      getCurrentPageIndex: () => currentPageIndexRef.current,
    }))

    return (
      <div className="whiteboard-container relative w-full h-full flex flex-col rounded-2xl overflow-hidden bg-white border border-[#E5E3DB] shadow-[0_10px_30px_-10px_rgba(23,24,23,0.06)]">
        {/* Excalidraw Light Engine - 100% Uninterrupted Vertical Height */}
        <div
          ref={containerRef}
          className="relative flex-1 w-full h-full bg-[#FFFFFF]"
          onWheel={(e) => {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault()
            }
          }}
        >
          <Excalidraw
            excalidrawAPI={(api) => {
              setExcalidrawAPI(api)
            }}
            onChange={(elements) => {
              if (elements && elements.length > 0) {
                boardElementsRef.current = elements as any[]
                persistScene(elements)
              }
            }}
            theme="light"
            viewModeEnabled={true}
            initialData={{
              appState: {
                viewBackgroundColor: CANVAS_BG,
                currentItemStrokeColor: INK_PRIMARY,
                currentItemFontFamily: 1,
                currentItemRoughness: 0,
                zenModeEnabled: false,
                viewModeEnabled: true,
                zoom: { value: 0.7 as any },
              },
            }}
            UIOptions={{
              canvasActions: {
                changeViewBackgroundColor: false,
                clearCanvas: false,
                loadScene: false,
                saveToActiveFile: false,
                toggleTheme: false,
                saveAsImage: false,
              },
              tools: {
                image: false,
              },
              welcomeScreen: false,
            }}
          />
        </div>

        {/* Minimalist Bottom Bar: Multi-Page Navigation, Chalk Swatches, and Page Counter */}
        <div className="relative z-20 py-1.5 px-3 bg-[#F8F6F0] border-t border-[#E5E3DB] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#7A7C75] select-none">
          {/* Multi-Page Navigation Bar */}
          <div className="flex items-center gap-1.5 bg-white px-2 py-0.5 rounded-lg border border-[#E5E3DB] shadow-xs">
            <span className="text-[10px] text-[#7A7C75] font-mono mr-0.5">Pages:</span>
            <div className="flex items-center gap-1">
              {pages.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => switchPage(idx)}
                  className={`px-2 py-0.5 text-[10px] font-mono rounded-md transition-all cursor-pointer ${
                    currentPageIndex === idx
                      ? 'bg-[#52715D] text-white font-bold shadow-xs'
                      : 'text-[#555852] hover:bg-[#F8F6F0]'
                  }`}
                  title={`View Page ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            <button
              onClick={addNewPage}
              className="p-0.5 rounded text-[#52715D] hover:bg-[#E8F0EA] transition-colors cursor-pointer ml-0.5"
              title="Add New Whiteboard Page"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Multi-Color Chalk Palette */}
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-[#E5E3DB] shadow-xs">
            <span className="text-[10px] text-[#7A7C75] font-mono mr-0.5">Chalk:</span>
            {[
              { name: 'Charcoal', value: INK_PRIMARY, title: 'Charcoal / Primary Ink' },
              { name: 'Botanical', value: INK_BOTANICAL, title: 'Botanical Green' },
              { name: 'Coral', value: INK_CORAL, title: 'Coral / Red' },
              { name: 'Amber', value: INK_AMBER, title: 'Amber / Gold' },
              { name: 'Blue', value: INK_BLUE, title: 'Ocean Blue' },
              { name: 'Purple', value: INK_PURPLE, title: 'Amethyst Purple' },
            ].map((swatch) => (
              <button
                key={swatch.name}
                type="button"
                onClick={() => setChalkColor(swatch.value)}
                className={`w-3 h-3 rounded-full transition-all cursor-pointer border ${
                  activeChalkColor === swatch.value
                    ? 'scale-125 ring-2 ring-[#52715D] ring-offset-1 border-white shadow-xs'
                    : 'border-black/10 hover:scale-115'
                }`}
                style={{ backgroundColor: swatch.value }}
                title={swatch.title}
                aria-label={swatch.title}
              />
            ))}
          </div>

          {/* Page Counter & Status */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[10px] text-[#7A7C75]">Notes • Zoom Locked 70%</span>
            <span className="text-[#52715D] font-bold text-[11px]">Page {currentPageIndex + 1} of {pages.length}</span>
          </div>
        </div>
      </div>
    )
  }
)

GreenChalkboard.displayName = 'GreenChalkboard'
