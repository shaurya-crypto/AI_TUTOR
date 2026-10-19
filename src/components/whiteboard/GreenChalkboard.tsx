'use client'

import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import dynamic from 'next/dynamic'
import '@excalidraw/excalidraw/index.css'
import {
  FileText,
  Plus,
  Trash2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  BookOpen,
} from 'lucide-react'
import { evaluateMathExpression } from '@/lib/mathEvaluator'

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
  setChalkColor: (colorNameOrHex: string) => void
  setBoardColor: (theme: 'green' | 'blackboard' | 'slate' | 'white') => void
  drawForcesDiagram: () => void
  drawPressureDiagram: () => void
  drawMagnetDiagram: () => void
  drawCellDiagram: () => void
  drawOpticsDiagram: () => void
  drawAtomDiagram: () => void
  drawStatesOfMatterDiagram: () => void
  drawPhotosynthesisDiagram: () => void
  drawCircuitSeries: () => void
  drawCircuitParallel: () => void
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
  drawImageCard?: (title: string, caption?: string, attribution?: string) => void
  drawVideoCard?: (title: string, description?: string) => void
  drawTable?: (tableStr: string) => void
  drawGeometry?: (geomStr: string) => void
  addNewPage?: () => void
  goToPage: (pageIndex: number, title?: string) => void
  clearNotes: () => void
  rewriteNotes: (newNotes: string) => Promise<void>
  getBoardSummary: () => { notesText: string; roughText: string; fullSummary: string }
  handleAiDirective: (directive: string, transcriptId?: string) => void
}

interface WhiteboardPage {
  id: number
  elements: any[]
  nextY: number
  roughY: number
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
    const convertElementsRef = useRef<any>(null)
    const executedDirectivesRef = useRef<Set<string>>(new Set())
    const executedTextHistoryRef = useRef<Set<string>>(new Set())
    const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const operationQueueRef = useRef<Promise<any>>(Promise.resolve())
    const [activeChalkColor, setActiveChalkColor] = useState<string>(INK_PRIMARY)
    const activeChalkColorRef = useRef<string>(INK_PRIMARY)

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
          width: 420,
          height: 0,
          points: [[0, 0], [420, 0]],
          strokeColor: BORDER_SUBTLE,
          strokeStyle: 'dashed',
          customData: { isHeader: true },
        },
        {
          id: `header_divider_v_p${pageNum}`,
          type: 'line',
          x: 500,
          y: 35,
          points: [[0, 0], [0, 850]],
          strokeColor: BORDER_SUBTLE,
          strokeWidth: 1.5,
          strokeStyle: 'dashed',
          customData: { isHeader: true },
        },
        {
          id: `header_rough_label_p${pageNum}`,
          type: 'text',
          x: 520,
          y: 95,
          text: 'ROUGH / WORKING SCRATCHPAD',
          fontSize: 11,
          fontFamily: 1,
          strokeColor: INK_MUTED,
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
      const allRough: string[] = []

      pagesRef.current.forEach((page, pIdx) => {
        const pageElements = page.elements || []
        const textElements = pageElements.filter(
          (el: any) => el.type === 'text' && !el.id?.startsWith('header_') && el.text
        )

        const pageNotes: string[] = []
        for (const el of textElements) {
          const text = (el.text || '').trim()
          if (!text) continue
          const isRough = el.customData?.isRough === true || el.id?.startsWith('rough_') || (el.x || 0) >= 500
          if (isRough) {
            allRough.push(text.replace(/^\[Scratch\]\s*/, ''))
          } else {
            pageNotes.push(text)
          }
        }

        if (pageNotes.length > 0) {
          allNotes.push(`--- PAGE ${pIdx + 1} ---`)
          allNotes.push(...pageNotes)
        }
      })

      const notesText = allNotes.join('\n')
      const roughText = allRough.join('\n')

      const fullSummary = [
        allNotes.length > 0
          ? `MASTER NOTES ON BOARD:\n${allNotes.map((n) => (n.startsWith('---') ? n : `• ${n}`)).join('\n')}`
          : 'MASTER NOTES: (Module header initialized)',
        allRough.length > 0
          ? `SCRATCHPAD WORK:\n${allRough.map((r) => `[Scratch] ${r}`).join('\n')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n\n')

      return { notesText, roughText, fullSummary }
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
    }

    // Switch between pages and notify parent to update concept tracking
    const switchPage = (targetIdx: number) => {
      goToPage(targetIdx)
      onPageChange?.(targetIdx)
      onConceptGoto?.(targetIdx + 1)
    }

    // Check if vertical space is filled; if so, automatically advance to next page
    const checkAutoPageOverflow = async (requiredHeight = 60) => {
      if (nextYRef.current + requiredHeight > 780) {
        await addNewPage()
      }
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

      await checkAutoPageOverflow(50)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const y = customY !== undefined ? customY : getDynamicNextY(15)
        const chosenColor = resolveChalkColor(color, activeChalkColorRef.current)

        const newElements = convertToExcalidrawElements([
          {
            type: 'text',
            x,
            y,
            text: clean,
            fontSize: 18,
            fontFamily: 1,
            strokeColor: chosenColor,
            customData: { isRough: false },
          },
        ])

        const currentElements = getCurrentElements()
        const merged = [...currentElements, ...newElements]
        updateCurrentPageElements(merged, y + 45)
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
      if (executedTextHistoryRef.current.has(clean.toLowerCase())) return
      executedTextHistoryRef.current.add(clean.toLowerCase())

      await checkAutoPageOverflow(46)
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
            text: clean,
            fontSize: 16,
            fontFamily: 1,
            strokeColor: noteColor,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 38)
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
      await checkAutoPageOverflow(44)
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
            text: `->  ${clean}`,
            fontSize: 15,
            fontFamily: 1,
            strokeColor: stepColor,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 36)
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
      await checkAutoPageOverflow(68)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 60
        const startY = getDynamicNextY(16)
        const boxWidth = Math.min(Math.max(clean.length * 11 + 36, 260), 400)
        const boxHeight = 44
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
            y: startY + 12,
            text: clean,
            fontSize: 16,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + boxHeight + 14)
        onNoteRecorded?.(`**[Key Principle]**: ${clean}`)
      } catch (err) {
        console.error('drawHighlightBox error:', err)
      }
    }

    // Draw Exam Question Callout
    const drawQuestion = async (questionText: string, color?: string) => {
      if (!excalidrawAPI || !questionText?.trim()) return
      const clean = questionText.trim()
      await checkAutoPageOverflow(70)
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
            width: 400,
            height: 52,
            strokeColor: qStroke,
            backgroundColor: '#FFF8F6',
            fillStyle: 'solid',
            strokeWidth: 1.5,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 12,
            y: startY + 6,
            text: 'CHECKPOINT QUESTION:',
            fontSize: 11,
            fontFamily: 1,
            strokeColor: qStroke,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 12,
            y: startY + 24,
            text: clean,
            fontSize: 14,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 66)
        onNoteRecorded?.(`? **Question**: ${clean}`)
      } catch (err) {
        console.error('drawQuestion error:', err)
      }
    }

    // Draw Flowchart on Board
    const drawFlowchart = async (flowText: string, color?: string) => {
      if (!excalidrawAPI || !flowText?.trim()) return
      const steps = flowText.split(/->|>|\|/).map((s) => s.trim()).filter(Boolean)
      if (steps.length === 0) return

      await checkAutoPageOverflow(65)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startY = getDynamicNextY(16)
        let currentX = 60
        const flowColor = resolveChalkColor(color, INK_BOTANICAL)
        const skeletons: any[] = []

        steps.forEach((st, i) => {
          const w = Math.max(st.length * 9 + 20, 75)
          skeletons.push(
            {
              type: 'rectangle',
              x: currentX,
              y: startY,
              width: w,
              height: 34,
              strokeColor: flowColor,
              backgroundColor: '#F0F6F2',
              fillStyle: 'solid',
              strokeWidth: 1.5,
              roundness: { type: 3 },
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: currentX + 8,
              y: startY + 8,
              text: st,
              fontSize: 13,
              fontFamily: 1,
              strokeColor: INK_PRIMARY,
              customData: { isRough: false },
            }
          )
          currentX += w + 8

          if (i < steps.length - 1 && currentX < 440) {
            skeletons.push({
              type: 'arrow',
              x: currentX,
              y: startY + 17,
              points: [[0, 0], [20, 0]],
              strokeColor: flowColor,
              strokeWidth: 2,
              customData: { isRough: false },
            })
            currentX += 28
          }
        })

        const elements = convertToExcalidrawElements(skeletons)
        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 48)
        onNoteRecorded?.(`[Flow]: ${steps.join(' -> ')}`)
      } catch (err) {
        console.error('drawFlowchart error:', err)
      }
    }

    // Universal Comparison / Data Table on Whiteboard (Any Subject)
    const drawTable = async (tableStr: string) => {
      if (!excalidrawAPI || !tableStr?.trim()) return
      await checkAutoPageOverflow(180)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 70
        const startY = getDynamicNextY(18)

        // Parse: "Header 1 | Header 2 || Row1A | Row1B || Row2A | Row2B"
        const rows = tableStr.split('||').map((r) => r.split('|').map((c) => c.trim()))
        if (rows.length === 0) return

        const numCols = Math.max(...rows.map((r) => r.length), 1)
        const colWidth = Math.min(180, Math.floor(400 / numCols))
        const rowHeight = 32

        const skeletons: any[] = []

        rows.forEach((row, rowIdx) => {
          const y = startY + rowIdx * rowHeight
          const isHeader = rowIdx === 0

          row.forEach((cell, colIdx) => {
            const x = startX + colIdx * colWidth

            skeletons.push({
              type: 'rectangle',
              x,
              y,
              width: colWidth,
              height: rowHeight,
              strokeColor: isHeader ? INK_BOTANICAL : '#E5E3DB',
              backgroundColor: isHeader ? '#E8F0EA' : rowIdx % 2 === 1 ? '#FFFFFF' : '#F9F8F5',
              fillStyle: 'solid',
              strokeWidth: 1,
              customData: { isRough: false },
            })

            skeletons.push({
              type: 'text',
              x: x + 8,
              y: y + 8,
              text: cell || '-',
              fontSize: isHeader ? 12 : 11,
              fontFamily: 1,
              strokeColor: isHeader ? INK_PRIMARY : '#2E302D',
              customData: { isRough: false },
            })
          })
        })

        const elements = convertToExcalidrawElements(skeletons)
        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + rows.length * rowHeight + 20)
        onNoteRecorded?.(`[Table]: ${rows[0]?.join(' | ')}`)
      } catch (err) {
        console.error('drawTable error:', err)
      }
    }

    // Universal 2D Geometry & Shapes on Whiteboard (Mathematics, Physics, Engineering)
    const drawGeometry = async (geomStr: string) => {
      if (!excalidrawAPI || !geomStr?.trim()) return
      await checkAutoPageOverflow(190)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 75
        const startY = getDynamicNextY(18)
        const lower = geomStr.toLowerCase()

        const skeletons: any[] = []

        if (lower.includes('triangle')) {
          const isRight = lower.includes('right')
          skeletons.push(
            {
              type: 'text',
              x: startX,
              y: startY,
              text: isRight ? 'Right-Angled Triangle (Pythagoras: a^2 + b^2 = c^2)' : 'Geometric Triangle (Angles Sum = 180°)',
              fontSize: 14,
              fontFamily: 1,
              strokeColor: INK_PRIMARY,
              customData: { isRough: false },
            },
            {
              type: 'line',
              x: startX + 30,
              y: startY + 120,
              points: [[0, 0], [160, 0], [isRight ? 0 : 80, -90], [0, 0]],
              strokeColor: INK_BOTANICAL,
              strokeWidth: 2,
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: startX + 20,
              y: startY + 125,
              text: 'A',
              fontSize: 13,
              fontFamily: 1,
              strokeColor: INK_CORAL,
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: startX + 195,
              y: startY + 125,
              text: 'B',
              fontSize: 13,
              fontFamily: 1,
              strokeColor: INK_CORAL,
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: startX + (isRight ? 20 : 105),
              y: startY + 18,
              text: 'C',
              fontSize: 13,
              fontFamily: 1,
              strokeColor: INK_CORAL,
              customData: { isRough: false },
            }
          )
        } else if (lower.includes('circle')) {
          skeletons.push(
            {
              type: 'text',
              x: startX,
              y: startY,
              text: 'Circle: Area = pi * r^2 | Circumference = 2 * pi * r',
              fontSize: 14,
              fontFamily: 1,
              strokeColor: INK_PRIMARY,
              customData: { isRough: false },
            },
            {
              type: 'ellipse',
              x: startX + 40,
              y: startY + 25,
              width: 110,
              height: 110,
              strokeColor: INK_BOTANICAL,
              backgroundColor: '#F0F6F2',
              fillStyle: 'solid',
              strokeWidth: 2,
              customData: { isRough: false },
            },
            {
              type: 'line',
              x: startX + 95,
              y: startY + 80,
              points: [[0, 0], [55, 0]],
              strokeColor: INK_CORAL,
              strokeWidth: 2,
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: startX + 115,
              y: startY + 62,
              text: 'r',
              fontSize: 13,
              fontFamily: 1,
              strokeColor: INK_CORAL,
              customData: { isRough: false },
            },
            {
              type: 'text',
              x: startX + 85,
              y: startY + 82,
              text: 'O',
              fontSize: 11,
              fontFamily: 1,
              strokeColor: INK_PRIMARY,
              customData: { isRough: false },
            }
          )
        } else {
          skeletons.push(
            {
              type: 'text',
              x: startX,
              y: startY,
              text: `Geometric Figure: ${geomStr}`,
              fontSize: 14,
              fontFamily: 1,
              strokeColor: INK_PRIMARY,
              customData: { isRough: false },
            },
            {
              type: 'rectangle',
              x: startX + 30,
              y: startY + 30,
              width: 150,
              height: 85,
              strokeColor: INK_BOTANICAL,
              backgroundColor: '#F0F6F2',
              fillStyle: 'solid',
              strokeWidth: 2,
              customData: { isRough: false },
            }
          )
        }

        const elements = convertToExcalidrawElements(skeletons)
        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 150)
        onNoteRecorded?.(`[Geometry]: ${geomStr}`)
      } catch (err) {
        console.error('drawGeometry error:', err)
      }
    }

    // Draw Rough Work in the Right Scratchpad Column
    const drawRoughWork = async (workText: string, color?: string) => {
      if (!excalidrawAPI || !workText?.trim()) return
      const clean = workText.trim()
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 520
        const startY = roughYRef.current
        const roughColor = resolveChalkColor(color, INK_SECONDARY)

        const elements = convertToExcalidrawElements([
          {
            id: `rough_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            type: 'text',
            x: startX,
            y: startY,
            text: `[Scratch] ${clean}`,
            fontSize: 14,
            fontFamily: 1,
            strokeColor: roughColor,
            customData: { isRough: true },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        boardElementsRef.current = merged
        roughYRef.current = Math.min(startY + 30, 800)
        const pageIdx = currentPageIndexRef.current
        if (pagesRef.current[pageIdx]) {
          pagesRef.current[pageIdx].elements = merged
          pagesRef.current[pageIdx].roughY = roughYRef.current
        }
        setPages([...pagesRef.current])
        excalidrawAPI.updateScene({ elements: merged })
        persistScene(merged)
        enforceLockedZoom(excalidrawAPI)
      } catch (err) {
        console.error('drawRoughWork error:', err)
      }
    }

    // Clear Rough Working Scratchpad only
    const clearRough = async () => {
      if (!excalidrawAPI) return
      try {
        const current = getCurrentElements()
        const filtered = current.filter(
          (el: any) =>
            el.customData?.isHeader === true ||
            (el.customData?.isRough !== true && !el.id?.startsWith('rough_') && (el.x || 0) < 500)
        )
        boardElementsRef.current = filtered
        roughYRef.current = 140
        const pageIdx = currentPageIndexRef.current
        if (pagesRef.current[pageIdx]) {
          pagesRef.current[pageIdx].elements = filtered
          pagesRef.current[pageIdx].roughY = 140
        }
        setPages([...pagesRef.current])
        excalidrawAPI.updateScene({ elements: filtered })
        persistScene(filtered)
        enforceLockedZoom(excalidrawAPI)
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
          (el: any) => el.customData?.isHeader === true || (el.x || 0) >= 500
        )
        updateCurrentPageElements(filtered, 140)
      } catch (err) {
        console.error('clearNotes error:', err)
      }
    }

    // Clear entire board (or advance to fresh page to preserve notes)
    const clearBoard = async () => {
      await addNewPage()
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

    // Draw Plant vs Animal Cell Diagram (NCERT Verified)
    const drawCellDiagram = async () => {
      if (!excalidrawAPI) return
      await checkAutoPageOverflow(210)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 70
        const startY = getDynamicNextY(16)

        const cellSkeleton: any[] = [
          {
            type: 'text',
            x: startX,
            y: startY,
            text: 'Plant & Animal Cell Structural Organization (NCERT Class 9)',
            fontSize: 17,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          // Outer Cell Wall
          {
            type: 'rectangle',
            x: startX + 10,
            y: startY + 30,
            width: 170,
            height: 120,
            strokeColor: INK_BOTANICAL,
            strokeWidth: 2,
            backgroundColor: '#F0F6F2',
            fillStyle: 'solid',
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          // Inner Cell Membrane
          {
            type: 'rectangle',
            x: startX + 18,
            y: startY + 38,
            width: 154,
            height: 104,
            strokeColor: INK_SECONDARY,
            strokeWidth: 1.5,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          // Nucleus
          {
            type: 'ellipse',
            x: startX + 80,
            y: startY + 70,
            width: 38,
            height: 38,
            strokeColor: INK_CORAL,
            backgroundColor: INK_CORAL_SOFT,
            fillStyle: 'solid',
            strokeWidth: 2,
            customData: { isRough: false },
          },
          // Mitochondrion
          {
            type: 'ellipse',
            x: startX + 35,
            y: startY + 55,
            width: 26,
            height: 14,
            strokeColor: INK_AMBER,
            backgroundColor: '#FEF3C7',
            fillStyle: 'solid',
            customData: { isRough: false },
          },
          // Large Central Vacuole
          {
            type: 'ellipse',
            x: startX + 35,
            y: startY + 90,
            width: 32,
            height: 24,
            strokeColor: INK_BLUE,
            backgroundColor: '#E0F2FE',
            fillStyle: 'solid',
            customData: { isRough: false },
          },
          // Labels
          {
            type: 'text',
            x: startX + 195,
            y: startY + 35,
            text: '• Cell Wall (Rigid cellulose support)',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_BOTANICAL,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 195,
            y: startY + 60,
            text: '• Plasma Membrane (Selectively permeable)',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_SECONDARY,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 195,
            y: startY + 85,
            text: '• Nucleus (DNA & cellular regulation)',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_CORAL,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 195,
            y: startY + 110,
            text: '• Mitochondria (ATP energy generator)',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_AMBER,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 195,
            y: startY + 135,
            text: '• Vacuole (Turgidity and storage)',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_BLUE,
            customData: { isRough: false },
          },
        ]

        const elements = convertToExcalidrawElements(cellSkeleton)
        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 175)
        onNoteRecorded?.('**Diagram**: Plant and Animal Cell Organelles')
      } catch (err) {
        console.error('drawCellDiagram error:', err)
      }
    }

    // Draw Optics Light Ray Diagram (Snell's Law)
    const drawOpticsDiagram = async () => {
      if (!excalidrawAPI) return
      await checkAutoPageOverflow(190)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 70
        const startY = getDynamicNextY(16)

        const opticsSkeleton: any[] = [
          {
            type: 'text',
            x: startX,
            y: startY,
            text: "Refraction of Light: Snell's Law (n1 * sin(i) = n2 * sin(r))",
            fontSize: 17,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          // Boundary line
          {
            type: 'line',
            x: startX + 20,
            y: startY + 80,
            points: [[0, 0], [220, 0]],
            strokeColor: INK_SECONDARY,
            strokeWidth: 2,
            customData: { isRough: false },
          },
          // Normal line
          {
            type: 'line',
            x: startX + 130,
            y: startY + 20,
            points: [[0, 0], [0, 120]],
            strokeColor: INK_MUTED,
            strokeStyle: 'dashed',
            strokeWidth: 1.5,
            customData: { isRough: false },
          },
          // Incident Ray
          {
            type: 'arrow',
            x: startX + 50,
            y: startY + 30,
            points: [[0, 0], [80, 50]],
            strokeColor: INK_CORAL,
            strokeWidth: 2.5,
            customData: { isRough: false },
          },
          // Refracted Ray
          {
            type: 'arrow',
            x: startX + 130,
            y: startY + 80,
            points: [[0, 0], [55, 60]],
            strokeColor: INK_BOTANICAL,
            strokeWidth: 2.5,
            customData: { isRough: false },
          },
          // Medium Labels
          {
            type: 'text',
            x: startX + 30,
            y: startY + 50,
            text: 'Air (n1 = 1.0)',
            fontSize: 12,
            fontFamily: 1,
            strokeColor: INK_SECONDARY,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 30,
            y: startY + 95,
            text: 'Glass (n2 = 1.5)',
            fontSize: 12,
            fontFamily: 1,
            strokeColor: INK_SECONDARY,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 255,
            y: startY + 70,
            text: 'Ray bends TOWARD normal\nas speed slows down in denser medium.',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_BOTANICAL,
            customData: { isRough: false },
          },
        ]

        const elements = convertToExcalidrawElements(opticsSkeleton)
        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 165)
        onNoteRecorded?.("Optics: Snell's Law Refraction Ray Diagram")
      } catch (err) {
        console.error('drawOpticsDiagram error:', err)
      }
    }

    // Draw Bohr Atomic Model Diagram
    const drawAtomDiagram = async () => {
      if (!excalidrawAPI) return
      await checkAutoPageOverflow(190)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 70
        const startY = getDynamicNextY(16)

        const atomSkeleton: any[] = [
          {
            type: 'text',
            x: startX,
            y: startY,
            text: "Bohr Model of Atom: Nucleus (p+n) & Discrete Shells (2n^2)",
            fontSize: 17,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          // M Shell
          {
            type: 'ellipse',
            x: startX + 30,
            y: startY + 25,
            width: 140,
            height: 140,
            strokeColor: BORDER_SUBTLE,
            strokeStyle: 'dashed',
            strokeWidth: 1.5,
            customData: { isRough: false },
          },
          // L Shell
          {
            type: 'ellipse',
            x: startX + 50,
            y: startY + 45,
            width: 100,
            height: 100,
            strokeColor: BORDER_SUBTLE,
            strokeStyle: 'dashed',
            strokeWidth: 1.5,
            customData: { isRough: false },
          },
          // K Shell
          {
            type: 'ellipse',
            x: startX + 70,
            y: startY + 65,
            width: 60,
            height: 60,
            strokeColor: BORDER_SUBTLE,
            strokeStyle: 'dashed',
            strokeWidth: 1.5,
            customData: { isRough: false },
          },
          // Nucleus
          {
            type: 'ellipse',
            x: startX + 88,
            y: startY + 83,
            width: 24,
            height: 24,
            strokeColor: INK_CORAL,
            backgroundColor: INK_CORAL,
            fillStyle: 'solid',
            customData: { isRough: false },
          },
          // Electrons
          {
            type: 'ellipse',
            x: startX + 96,
            y: startY + 61,
            width: 8,
            height: 8,
            strokeColor: INK_BLUE,
            backgroundColor: INK_BLUE,
            fillStyle: 'solid',
            customData: { isRough: false },
          },
          {
            type: 'ellipse',
            x: startX + 96,
            y: startY + 121,
            width: 8,
            height: 8,
            strokeColor: INK_BLUE,
            backgroundColor: INK_BLUE,
            fillStyle: 'solid',
            customData: { isRough: false },
          },
          // Callout labels
          {
            type: 'text',
            x: startX + 190,
            y: startY + 45,
            text: '• Shell K (n=1): max 2 electrons',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_SECONDARY,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 190,
            y: startY + 70,
            text: '• Shell L (n=2): max 8 electrons',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_SECONDARY,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 190,
            y: startY + 95,
            text: '• Nucleus: Protons (+e) & Neutrons',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_CORAL,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 190,
            y: startY + 120,
            text: 'Electrons orbit in non-radiating states.',
            fontSize: 12,
            fontFamily: 1,
            strokeColor: INK_BOTANICAL,
            customData: { isRough: false },
          },
        ]

        const elements = convertToExcalidrawElements(atomSkeleton)
        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 175)
        onNoteRecorded?.('Chemistry: Bohr Atomic Model Structure')
      } catch (err) {
        console.error('drawAtomDiagram error:', err)
      }
    }

    // Draw Forces & Free Body Diagram
    const drawForcesDiagram = async () => {
      if (!excalidrawAPI) return
      await checkAutoPageOverflow(180)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 70
        const startY = getDynamicNextY(16)

        const forceSkeleton: any[] = [
          {
            type: 'text',
            x: startX,
            y: startY,
            text: 'Newtonian Forces & Free Body Diagram: F_net = m * a',
            fontSize: 17,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          // Ground Plane
          {
            type: 'line',
            x: startX + 10,
            y: startY + 120,
            points: [[0, 0], [180, 0]],
            strokeColor: INK_SECONDARY,
            strokeWidth: 2,
            customData: { isRough: false },
          },
          // Mass Block
          {
            type: 'rectangle',
            x: startX + 60,
            y: startY + 60,
            width: 70,
            height: 60,
            strokeColor: INK_PRIMARY,
            backgroundColor: '#F8F6F0',
            fillStyle: 'solid',
            strokeWidth: 2,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 78,
            y: startY + 80,
            text: 'm = 5kg',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          // Normal Force (Up)
          {
            type: 'arrow',
            x: startX + 95,
            y: startY + 60,
            points: [[0, 0], [0, -40]],
            strokeColor: INK_BOTANICAL,
            strokeWidth: 2.5,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 102,
            y: startY + 22,
            text: 'F_N (Normal)',
            fontSize: 12,
            fontFamily: 1,
            strokeColor: INK_BOTANICAL,
            customData: { isRough: false },
          },
          // Gravity (Down)
          {
            type: 'arrow',
            x: startX + 95,
            y: startY + 120,
            points: [[0, 0], [0, 40]],
            strokeColor: INK_CORAL,
            strokeWidth: 2.5,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 102,
            y: startY + 150,
            text: 'F_g = m*g',
            fontSize: 12,
            fontFamily: 1,
            strokeColor: INK_CORAL,
            customData: { isRough: false },
          },
          // Applied Force (Right)
          {
            type: 'arrow',
            x: startX + 130,
            y: startY + 90,
            points: [[0, 0], [50, 0]],
            strokeColor: INK_BLUE,
            strokeWidth: 2.5,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 185,
            y: startY + 82,
            text: 'F_applied (20N)',
            fontSize: 12,
            fontFamily: 1,
            strokeColor: INK_BLUE,
            customData: { isRough: false },
          },
          // Friction (Left)
          {
            type: 'arrow',
            x: startX + 60,
            y: startY + 115,
            points: [[0, 0], [-35, 0]],
            strokeColor: INK_AMBER,
            strokeWidth: 2,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 5,
            y: startY + 100,
            text: 'f_k (Friction)',
            fontSize: 11,
            fontFamily: 1,
            strokeColor: INK_AMBER,
            customData: { isRough: false },
          },
        ]

        const elements = convertToExcalidrawElements(forceSkeleton)
        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 185)
        onNoteRecorded?.('Physics: Free Body Diagram & Forces')
      } catch (err) {
        console.error('drawForcesDiagram error:', err)
      }
    }

    // Draw Pressure in Fluids
    const drawPressureDiagram = async () => {
      if (!excalidrawAPI) return
      await checkAutoPageOverflow(175)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 70
        const startY = getDynamicNextY(16)

        const elements = convertToExcalidrawElements([
          {
            type: 'text',
            x: startX,
            y: startY,
            text: 'Hydrostatic Fluid Pressure: P = rho * g * h',
            fontSize: 17,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          // Beaker
          {
            type: 'line',
            x: startX + 20,
            y: startY + 30,
            points: [[0, 0], [0, 95], [120, 95], [120, 0]],
            strokeColor: INK_PRIMARY,
            strokeWidth: 2,
            customData: { isRough: false },
          },
          // Fluid level
          {
            type: 'line',
            x: startX + 20,
            y: startY + 45,
            points: [[0, 0], [120, 0]],
            strokeColor: INK_BLUE,
            strokeWidth: 2,
            strokeStyle: 'dashed',
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 160,
            y: startY + 40,
            text: '• Pressure increases linearly with depth (h)',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_SECONDARY,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 160,
            y: startY + 65,
            text: '• Acts equally in all directions at given depth',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_BOTANICAL,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 160,
            y: startY + 90,
            text: '• Independent of container shape',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_CORAL,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 145)
        onNoteRecorded?.('Physics: Hydrostatic Pressure Principles')
      } catch (err) {
        console.error('drawPressureDiagram error:', err)
      }
    }

    // Draw Magnetic Field Lines
    const drawMagnetDiagram = async () => {
      if (!excalidrawAPI) return
      await checkAutoPageOverflow(175)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 70
        const startY = getDynamicNextY(16)

        const elements = convertToExcalidrawElements([
          {
            type: 'text',
            x: startX,
            y: startY,
            text: 'Bar Magnet: Continuous Closed Magnetic Field Lines (N -> S)',
            fontSize: 17,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          // North Pole
          {
            type: 'rectangle',
            x: startX + 40,
            y: startY + 50,
            width: 60,
            height: 35,
            strokeColor: INK_CORAL,
            backgroundColor: INK_CORAL,
            fillStyle: 'solid',
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 62,
            y: startY + 58,
            text: 'N',
            fontSize: 16,
            fontFamily: 1,
            strokeColor: '#FFFFFF',
            customData: { isRough: false },
          },
          // South Pole
          {
            type: 'rectangle',
            x: startX + 100,
            y: startY + 50,
            width: 60,
            height: 35,
            strokeColor: INK_BLUE,
            backgroundColor: INK_BLUE,
            fillStyle: 'solid',
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 122,
            y: startY + 58,
            text: 'S',
            fontSize: 16,
            fontFamily: 1,
            strokeColor: '#FFFFFF',
            customData: { isRough: false },
          },
          // Field Lines
          {
            type: 'line',
            x: startX + 70,
            y: startY + 50,
            points: [[0, 0], [10, -25], [50, -25], [60, 0]],
            strokeColor: INK_BOTANICAL,
            strokeWidth: 2,
            customData: { isRough: false },
          },
          {
            type: 'line',
            x: startX + 70,
            y: startY + 85,
            points: [[0, 0], [10, 25], [50, 25], [60, 0]],
            strokeColor: INK_BOTANICAL,
            strokeWidth: 2,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 190,
            y: startY + 45,
            text: '• Outside magnet: North -> South',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 190,
            y: startY + 70,
            text: '• Inside magnet: South -> North',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 190,
            y: startY + 95,
            text: '• Lines NEVER intersect each other.',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_CORAL,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 145)
        onNoteRecorded?.('Physics: Magnetic Field Lines Characteristics')
      } catch (err) {
        console.error('drawMagnetDiagram error:', err)
      }
    }

    // Draw States of Matter
    const drawStatesOfMatterDiagram = async () => {
      if (!excalidrawAPI) return
      await checkAutoPageOverflow(170)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 70
        const startY = getDynamicNextY(16)

        const elements = convertToExcalidrawElements([
          {
            type: 'text',
            x: startX,
            y: startY,
            text: 'States of Matter: Solid, Liquid, Gas Particle Arrangement',
            fontSize: 17,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          // Solid Box
          {
            type: 'rectangle',
            x: startX,
            y: startY + 30,
            width: 75,
            height: 75,
            strokeColor: INK_BOTANICAL,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 16,
            y: startY + 110,
            text: 'Solid\nFixed vol & shape',
            fontSize: 11,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          // Liquid Box
          {
            type: 'rectangle',
            x: startX + 105,
            y: startY + 30,
            width: 75,
            height: 75,
            strokeColor: INK_BLUE,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 115,
            y: startY + 110,
            text: 'Liquid\nFixed vol, flows',
            fontSize: 11,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          // Gas Box
          {
            type: 'rectangle',
            x: startX + 210,
            y: startY + 30,
            width: 75,
            height: 75,
            strokeColor: INK_CORAL,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 215,
            y: startY + 110,
            text: 'Gas\nHigh kinetic energy',
            fontSize: 11,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 155)
        onNoteRecorded?.('Chemistry: States of Matter Particle Models')
      } catch (err) {
        console.error('drawStatesOfMatterDiagram error:', err)
      }
    }

    // Draw Photosynthesis Reaction
    const drawPhotosynthesisDiagram = async () => {
      if (!excalidrawAPI) return
      await checkAutoPageOverflow(165)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 70
        const startY = getDynamicNextY(16)

        const elements = convertToExcalidrawElements([
          {
            type: 'text',
            x: startX,
            y: startY,
            text: 'Photosynthesis: 6CO2 + 6H2O + Sunlight -> C6H12O6 + 6O2',
            fontSize: 16,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX,
            y: startY + 35,
            text: 'Reactants: Carbon Dioxide (from air) + Water (from soil via xylem)',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_BOTANICAL,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX,
            y: startY + 60,
            text: 'Catalysts: Chlorophyll in chloroplasts absorbs solar photons',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_SECONDARY,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX,
            y: startY + 85,
            text: 'Products: Glucose (food) + Oxygen (byproduct released via stomata)',
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_CORAL,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 125)
        onNoteRecorded?.('Biology: Photosynthesis Chemical Equation')
      } catch (err) {
        console.error('drawPhotosynthesisDiagram error:', err)
      }
    }

    // Draw Circuit (Series)
    const drawCircuitSeries = async () => {
      if (!excalidrawAPI) return
      await checkAutoPageOverflow(175)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 70
        const startY = getDynamicNextY(16)

        const elements = convertToExcalidrawElements([
          {
            type: 'text',
            x: startX,
            y: startY,
            text: 'Series Circuit: R_eq = R1 + R2 (Current I identical everywhere)',
            fontSize: 16,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          {
            type: 'rectangle',
            x: startX + 60,
            y: startY + 40,
            width: 70,
            height: 28,
            strokeColor: INK_CORAL,
            backgroundColor: INK_CORAL_SOFT,
            fillStyle: 'solid',
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 75,
            y: startY + 47,
            text: 'R1 (4 Ohm)',
            fontSize: 12,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          {
            type: 'rectangle',
            x: startX + 160,
            y: startY + 40,
            width: 70,
            height: 28,
            strokeColor: INK_BOTANICAL,
            backgroundColor: '#F0F6F2',
            fillStyle: 'solid',
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 175,
            y: startY + 47,
            text: 'R2 (6 Ohm)',
            fontSize: 12,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 260,
            y: startY + 47,
            text: 'R_eq = 4 + 6 = 10 Ohm',
            fontSize: 14,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 115)
        onNoteRecorded?.('Physics: Series Circuit Equivalent Resistance')
      } catch (err) {
        console.error('drawCircuitSeries error:', err)
      }
    }

    // Draw Circuit (Parallel)
    const drawCircuitParallel = async () => {
      if (!excalidrawAPI) return
      await checkAutoPageOverflow(175)
      try {
        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw')
        const startX = 70
        const startY = getDynamicNextY(16)

        const elements = convertToExcalidrawElements([
          {
            type: 'text',
            x: startX,
            y: startY,
            text: 'Parallel Circuit: 1/R_p = 1/R1 + 1/R2 (Voltage V identical)',
            fontSize: 16,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          {
            type: 'rectangle',
            x: startX + 60,
            y: startY + 35,
            width: 70,
            height: 26,
            strokeColor: INK_CORAL,
            backgroundColor: INK_CORAL_SOFT,
            fillStyle: 'solid',
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 75,
            y: startY + 41,
            text: 'R1 (6 Ohm)',
            fontSize: 12,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          {
            type: 'rectangle',
            x: startX + 60,
            y: startY + 75,
            width: 70,
            height: 26,
            strokeColor: INK_BOTANICAL,
            backgroundColor: '#F0F6F2',
            fillStyle: 'solid',
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 75,
            y: startY + 81,
            text: 'R2 (3 Ohm)',
            fontSize: 12,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 160,
            y: startY + 58,
            text: '1/R_p = 1/6 + 1/3 = 3/6 -> R_p = 2 Ohm',
            fontSize: 14,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 125)
        onNoteRecorded?.('Physics: Parallel Circuit Equivalent Resistance')
      } catch (err) {
        console.error('drawCircuitParallel error:', err)
      }
    }

    // Draw Board Book Illustration Frame directly on Whiteboard
    const drawImageCard = async (title: string, caption = '', attribution = 'NCERT / Board Standard') => {
      if (!excalidrawAPI || !title?.trim()) return
      await checkAutoPageOverflow(165)
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
            height: 110,
            strokeColor: INK_BOTANICAL,
            backgroundColor: '#FBF9F7',
            fillStyle: 'solid',
            strokeWidth: 1.5,
            roundness: { type: 3 },
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 14,
            y: startY + 10,
            text: `[BOARD BOOK FIGURE]: ${title.toUpperCase()}`,
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_BOTANICAL,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 14,
            y: startY + 38,
            text: caption || `Authentic textbook schematic illustration for ${title}.`,
            fontSize: 13,
            fontFamily: 1,
            strokeColor: INK_PRIMARY,
            customData: { isRough: false },
          },
          {
            type: 'text',
            x: startX + 14,
            y: startY + 82,
            text: `Source: ${attribution}`,
            fontSize: 11,
            fontFamily: 1,
            strokeColor: INK_MUTED,
            customData: { isRough: false },
          },
        ])

        const current = getCurrentElements()
        const merged = [...current, ...elements]
        updateCurrentPageElements(merged, startY + 130)
        onNoteRecorded?.(`[Figure]: ${title} (${attribution})`)
      } catch (err) {
        console.error('drawImageCard error:', err)
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
          } else if (tagType === 'GEOMETRY' || tagType === 'SHAPE' || tagType === 'POLYGON') {
            if (payload) await drawGeometry(payload)
          } else if (tagType === 'TIMELINE') {
            if (payload) await drawFlowchart(payload)
          }
          // 3. Universal Diagrams & Graphs (Any Subject)
          else if (tagType === 'GRAPH' || tagType === 'DRAW_GRAPH') {
            await drawGraph(payload)
          } else if (tagType === 'DIAGRAM' || tagType === 'DRAW_DIAGRAM') {
            const diag = payload.toLowerCase()
            if (diag.includes('triangle') || diag.includes('circle') || diag.includes('geometry') || diag.includes('polygon') || diag.includes('angle')) {
              await drawGeometry(payload)
            } else if (diag.includes('table') || diag.includes('compare') || diag.includes('vs')) {
              if (payload.includes('|')) await drawTable(payload)
              else await drawImageCard(payload, 'Comparison Matrix', 'Board Standard')
            } else if (diag.includes('timeline') || diag.includes('flow')) {
              await drawFlowchart(payload)
            } else if (diag.includes('graph') || diag.includes('ohm') || diag.includes('linear') || diag.includes('velocity') || diag.includes('speed') || diag.includes('distance') || diag.includes('wave') || diag.includes('parabola') || diag.includes('quad') || diag.includes('boyle') || diag.includes('curve') || diag.includes('plot') || diag.includes('=')) {
              await drawGraph(diag)
            } else if (diag.includes('force') || diag.includes('newton') || diag.includes('fbd')) {
              await drawForcesDiagram()
            } else if (diag.includes('pressure') || diag.includes('fluid')) {
              await drawPressureDiagram()
            } else if (diag.includes('magnet')) {
              await drawMagnetDiagram()
            } else if (
              diag.includes('plant cell') ||
              diag.includes('animal cell') ||
              diag.includes('cell organelle') ||
              diag.includes('cell structure') ||
              (/\bcell\b/i.test(diag) && !diag.includes('electric') && !diag.includes('battery') && !diag.includes('dry cell') && !diag.includes('galvanic') && !diag.includes('electrolytic'))
            ) {
              await drawCellDiagram()
            } else if (diag.includes('optic') || diag.includes('reflect') || diag.includes('light') || diag.includes('snell') || diag.includes('refract') || diag.includes('lens')) {
              await drawOpticsDiagram()
            } else if (diag.includes('atom') || diag.includes('bohr')) {
              await drawAtomDiagram()
            } else if (diag.includes('matter') || diag.includes('state')) {
              await drawStatesOfMatterDiagram()
            } else if (diag.includes('photo') || diag.includes('photosynthesis')) {
              await drawPhotosynthesisDiagram()
            } else if (diag.includes('series')) {
              await drawCircuitSeries()
            } else if (diag.includes('parallel')) {
              await drawCircuitParallel()
            } else {
              // Universal for ANY syllabus subject (History, Geography, Economics, Mathematics, Chemistry, Biology, Social Science, English)
              await drawImageCard(payload || 'Curriculum Schematic', `Authentic textbook illustration and conceptual schematic for ${payload}.`, 'NCERT / Board Standard')
            }
          }
          // 4. Board Book Illustrations & Videos
          else if (tagType === 'IMAGE' || tagType === 'DRAW_IMAGE') {
            const [imgTitle, imgCaption] = payload.split('|').map((s) => s.trim())
            await drawImageCard(imgTitle || 'Textbook Diagram', imgCaption || '')
          } else if (tagType === 'VIDEO' || tagType === 'DRAW_VIDEO') {
            const [vidTitle, vidDesc] = payload.split('|').map((s) => s.trim())
            await drawVideoCard(vidTitle || 'Visual Demonstration', vidDesc || '')
          }
          // 5. Questions and Progress
          else if (tagType === 'BOARD_QUESTION' || tagType === 'QUESTION') {
            if (payload) {
              await drawQuestion(payload)
              if (
                payload.toLowerCase().includes('conclude') ||
                payload.toLowerCase().includes('end chapter') ||
                payload.toLowerCase().includes('10-mcq') ||
                payload.toLowerCase().includes('10 mcq') ||
                payload.toLowerCase().includes('quiz')
              ) {
                onConfirmEndChapter?.(payload)
              }
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
      setChalkColor: (colorNameOrHex: string) => setChalkColor(colorNameOrHex),
      setBoardColor: () => {},
      drawForcesDiagram,
      drawPressureDiagram,
      drawMagnetDiagram,
      drawCellDiagram,
      drawOpticsDiagram,
      drawAtomDiagram,
      drawStatesOfMatterDiagram,
      drawPhotosynthesisDiagram,
      drawCircuitSeries,
      drawCircuitParallel,
      drawGraph,
      drawNumericalSolution,
      drawImageCard,
      drawVideoCard,
      drawTable,
      drawGeometry,
      addNewPage,
      goToPage,
      getBoardSummary,
      handleAiDirective,
    }))

    return (
      <div className="whiteboard-container relative w-full h-full flex flex-col rounded-2xl overflow-hidden bg-white border border-[#E5E3DB] shadow-[0_10px_30px_-10px_rgba(23,24,23,0.06)]">
        {/* Top Minimalist Whiteboard Header & Multi-Page Bar */}
        <div className="relative z-20 px-4 py-2.5 bg-[#F8F6F0]/95 border-b border-[#E5E3DB] flex flex-wrap items-center justify-between gap-2 select-none">
          <div className="flex items-center gap-2.5">
            {subject && (
              <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-[#E8F0EA] text-[#52715D] border border-[#C8EBD2] uppercase tracking-wider font-mono">
                {subject}
              </span>
            )}
            <span className="text-xs font-semibold text-[#171817] truncate max-w-[200px] sm:max-w-[280px]">
              {moduleTitle}
            </span>
          </div>

          {/* Multi-Page Navigation Bar */}
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-[#E5E3DB] shadow-xs">
            <span className="text-[11px] text-[#7A7C75] font-mono mr-1">Pages:</span>
            <div className="flex items-center gap-1">
              {pages.map((p, idx) => (
                <button
                  key={p.id}
                  onClick={() => switchPage(idx)}
                  className={`px-2.5 py-0.5 text-[11px] font-mono rounded-lg transition-all cursor-pointer ${
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
              className="p-1 rounded-md text-[#52715D] hover:bg-[#E8F0EA] transition-colors cursor-pointer ml-1"
              title="Add New Whiteboard Page"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Multi-Color Chalk Palette */}
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-xl border border-[#E5E3DB] shadow-xs">
            <span className="text-[11px] text-[#7A7C75] font-mono mr-0.5">Chalk:</span>
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
                className={`w-3.5 h-3.5 rounded-full transition-all cursor-pointer border ${
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

          {/* Quick Actions & Live Indicator */}
          <div className="flex items-center gap-2">
            <button
              onClick={clearRough}
              className="px-2.5 py-1 text-[11px] font-medium rounded-lg text-[#555852] hover:text-[#171817] hover:bg-[#E5E3DB]/50 border border-transparent hover:border-[#E5E3DB] transition-all cursor-pointer flex items-center gap-1"
              title="Erase Scratchpad Calculations"
            >
              <Trash2 className="w-3 h-3 text-[#7A7C75]" />
              <span className="hidden sm:inline">Clear Scratchpad</span>
            </button>

            <span className="px-2.5 py-1 text-[11px] rounded-lg bg-[#E8F0EA] text-[#52715D] border border-[#C8EBD2] font-mono flex items-center gap-1.5 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-[#52715D] animate-pulse" />
              <span>AI Whiteboard Live</span>
            </span>
          </div>
        </div>

        {/* Excalidraw Light Engine */}
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
                zenModeEnabled: true,
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

        {/* Minimal Bottom Bar */}
        <div className="relative z-20 h-6 bg-[#F8F6F0] border-t border-[#E5E3DB] px-4 flex items-center justify-between text-[11px] font-mono text-[#7A7C75]">
          <span>Single Source of Truth Notes • Zoom Locked 70%</span>
          <span className="text-[#52715D]">Page {currentPageIndex + 1} of {pages.length}</span>
        </div>
      </div>
    )
  }
)

GreenChalkboard.displayName = 'GreenChalkboard'
