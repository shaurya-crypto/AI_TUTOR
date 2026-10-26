'use client'

import React, { forwardRef, useState, useEffect, useCallback } from 'react'
import { GreenChalkboard, GreenChalkboardRef, WritingPositionInfo } from './GreenChalkboard'
import { SobiCompanion } from './SobiCompanion'
import { VisualizationViewport } from './VisualizationViewport'
import { MafsGraphCanvas, MafsGraphCanvasProps } from './MafsGraphCanvas'
import { VisualizationSceneType } from './scenes/sceneTypes'
import { resolveSceneType } from './scenes/sceneRegistry'
import { VisualLessonManifest, LessonStep } from '@/types/lessonManifest'
import {
  Box,
  Minimize2,
  X,
} from 'lucide-react'

export interface WhiteboardWorkspaceProps {
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
  activeSceneType?: VisualizationSceneType | string | null
  activeSceneParams?: Record<string, any>
  activeSceneTitle?: string
  onCloseScene?: () => void
  lessonManifest?: VisualLessonManifest | null
  initialStepIndex?: number
  onStepChange?: (stepIndex: number, step: LessonStep) => void
  onSaveProgress?: (stepIndex: number, completedStepIds: string[]) => void
  latestTranscript?: string
  isTeacherSpeaking?: boolean
  isListening?: boolean
  onSubmitStudentAnswer?: (answer: string) => void
  onVoiceStudentAnswer?: (answer: string) => void
  activeGraph?: MafsGraphCanvasProps | null
  onCloseGraph?: () => void
}

export const WhiteboardWorkspace = forwardRef<GreenChalkboardRef, WhiteboardWorkspaceProps>(
  (
    {
      moduleId,
      moduleTitle,
      classLevel,
      subject,
      keyConcepts,
      activeConceptIndex,
      onPageChange,
      onNoteRecorded,
      onConceptFocus,
      onConceptDone,
      onConceptGoto,
      onBoardContentChange,
      onModuleComplete,
      onConfirmEndChapter,
      onStartQuiz,
      activeSceneType = null,
      activeSceneParams = {},
      activeSceneTitle,
      onCloseScene,
      lessonManifest = null,
      initialStepIndex = 0,
      onStepChange,
      onSaveProgress,
      latestTranscript = '',
      isTeacherSpeaking = false,
      isListening = true,
      onSubmitStudentAnswer,
      onVoiceStudentAnswer,
      activeGraph = null,
      onCloseGraph,
    },
    ref
  ) => {
    // Resolved canonical scene type via alias resolver
    const resolvedScene = activeSceneType ? resolveSceneType(activeSceneType) : null

    // Sobi Whiteboard Companion writing position tracking
    const [writingPosition, setWritingPosition] = useState<WritingPositionInfo | null>(null)

    const handleWritingPositionChange = useCallback((pos: WritingPositionInfo) => {
      setWritingPosition((prev) => {
        if (
          prev &&
          prev.nextY === pos.nextY &&
          prev.pageIndex === pos.pageIndex &&
          prev.lastAction === pos.lastAction &&
          prev.lastText === pos.lastText
        ) {
          return prev
        }
        return pos
      })
    }, [])

    // 3D Scene In-Whiteboard Display Mode:
    // 'box_in_board' (embedded container box right on the whiteboard) | 'minimized'
    const [sceneBoxMode, setSceneBoxMode] = useState<'box_in_board' | 'minimized'>('box_in_board')

    // When an active scene is summoned, pop open the in-board box
    useEffect(() => {
      if (activeSceneType) {
        setSceneBoxMode((prev) => (prev === 'minimized' ? 'box_in_board' : prev))
      }
    }, [activeSceneType])

    const handleExecuteBoardDirective = (action: string, content: any) => {
      if (!ref || typeof ref === 'function') return
      const board = ref.current
      if (!board) return

      if (action === 'set_color' || action === 'chalk_color') board.setChalkColor(typeof content === 'string' ? content : (content?.color || ''))
      else if (action === 'draw_title') board.drawTitle(content)
      else if (action === 'draw_note') board.drawNote(content)
      else if (action === 'draw_step') board.drawStep(content)
      else if (action === 'draw_highlight_box') board.drawHighlightBox(content)
      else if (action === 'draw_rough_work') board.drawRoughWork(content)
      else if (action === 'clear_rough') board.clearRough()
      else if (action === 'clear_notes') board.clearNotes()
      else if (action === 'draw_question') board.drawQuestion(content)
      else if (action === 'draw_student_answer') board.drawStudentAnswer?.(content)
      else if (action === 'draw_answer_verdict') board.drawAnswerVerdict?.(content)
      else if (action === 'draw_exam_question') board.drawExamQuestion?.(content)
      else if (action === 'draw_shape' || action === 'shape' || action === 'draw_rectangle' || action === 'draw_circle' || action === 'draw_triangle') {
        board.drawShape?.(content)
      }
      else if (action === 'draw_flowchart') board.drawFlowchart(content)
      else if (action === 'draw_table' || action === 'table') board.drawTable?.(content)
      else if (action === 'draw_geometry' || action === 'geometry') board.drawGeometry?.(content)
      else if (action === 'draw_graph' || action === 'graph') board.drawGraph(content)
      else if (action === 'render_svg_diagram' || action === 'draw_svg' || action === 'draw_svg_diagram') {
        if (typeof content === 'object' && content !== null) {
          board.drawSvgDiagram?.(content.title || 'Educational Diagram', content.svg || '', content.caption)
        } else if (typeof content === 'string') {
          const trimmed = content.trim()
          if (trimmed.includes('|') && trimmed.includes('<svg')) {
            const parts = trimmed.split('|').map((s: string) => s.trim())
            board.drawSvgDiagram?.(parts[0] || 'Educational Diagram', parts[1] || '', parts[2])
          } else if (trimmed.includes('<svg')) {
            board.drawSvgDiagram?.('Educational Diagram', trimmed)
          } else {
            board.drawSvgDiagram?.(trimmed, '')
          }
        }
      }
      else if (action === 'draw_numerical' || action === 'numerical' || action === 'worked_example') {
        if (typeof content === 'object') board.drawNumericalSolution?.(content)
        else board.handleAiDirective(`[NUMERICAL: ${content}]`)
      }
      else if (action === 'draw_image' || action === 'image' || action === 'draw_diagram' || action === 'diagram') {
        const parts = (content || '').split('|').map((s: string) => s.trim())
        if (parts[1] && parts[1].includes('<svg')) {
          board.drawSvgDiagram?.(parts[0] || 'Scientific Diagram', parts[1], parts[2] || '')
        } else {
          board.drawSvgDiagram?.(parts[0] || content || 'Scientific Diagram', '', parts[1] || '')
        }
      }
      else if (action === 'draw_video' || action === 'video') {
        const parts = (content || '').split('|').map((s: string) => s.trim())
        board.drawVideoCard?.(parts[0] || 'Demonstration', parts[1] || '')
      }
      else if (action === 'new_page') board.addNewPage?.()
      else board.handleAiDirective(`[${action.toUpperCase()}: ${content}]`)
    }

    // Format active params summary string for badge
    const paramSummary = Object.entries(activeSceneParams || {})
      .filter(([k]) => !['color', 'wireframe'].includes(k))
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ')

    return (
      <div className="relative w-full h-full flex flex-col overflow-hidden">
        {/* Full Whiteboard Canvas Area */}
        <div className="relative flex-1 w-full h-full overflow-hidden">
          <div className="relative w-full h-full overflow-hidden">
            <GreenChalkboard
              ref={ref}
              moduleId={moduleId}
              moduleTitle={moduleTitle}
              classLevel={classLevel}
              subject={subject}
              keyConcepts={keyConcepts}
              activeConceptIndex={activeConceptIndex}
              onPageChange={onPageChange}
              onNoteRecorded={onNoteRecorded}
              onConceptFocus={onConceptFocus}
              onConceptDone={onConceptDone}
              onConceptGoto={onConceptGoto}
              onBoardContentChange={onBoardContentChange}
              onModuleComplete={onModuleComplete}
              onConfirmEndChapter={onConfirmEndChapter}
              onStartQuiz={onStartQuiz}
              onWritingPositionChange={handleWritingPositionChange}
            />

            {/* Sobi Whiteboard Companion: Glides alongside writing and points to questions */}
            <SobiCompanion
              writingPosition={writingPosition}
              latestTranscript={latestTranscript}
              isTeacherSpeaking={isTeacherSpeaking}
              isListening={isListening}
              activeConceptTitle={
                keyConcepts && typeof activeConceptIndex === 'number'
                  ? keyConcepts[activeConceptIndex] || moduleTitle
                  : moduleTitle
              }
              onSubmitAnswer={(ans) => {
                if (onSubmitStudentAnswer) {
                  onSubmitStudentAnswer(ans)
                } else if (ref && typeof ref !== 'function' && ref.current) {
                  ref.current.drawStudentAnswer?.(ans)
                }
              }}
              onVoiceAnswer={(ans) => {
                if (onVoiceStudentAnswer) {
                  onVoiceStudentAnswer(ans)
                } else if (ref && typeof ref !== 'function' && ref.current) {
                  ref.current.drawStudentAnswer?.(ans)
                }
              }}
            />

            {/* In-Whiteboard 3D Simulation Box (Rendered directly inside whiteboard area) */}
            {resolvedScene && sceneBoxMode === 'box_in_board' && (
              <div className="absolute bottom-4 right-4 z-30 w-[92vw] max-w-[480px] h-[370px] sm:h-[410px] rounded-2xl border-2 border-[#52715D]/80 shadow-[0_20px_50px_rgba(0,0,0,0.35)] bg-[#0c1310] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300">
                {/* Embedded Box Top Controls Bar */}
                <div className="px-3.5 py-2 bg-[#122319] border-b border-emerald-900/60 flex items-center justify-between gap-2 select-none">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="text-xs font-semibold text-emerald-100 truncate">
                      {activeSceneTitle || 'In-Board 3D Simulation'}
                    </span>
                    {paramSummary && (
                      <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 truncate max-w-[160px]">
                        {paramSummary}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Minimize toggle */}
                    <button
                      onClick={() => setSceneBoxMode('minimized')}
                      className="p-1 rounded text-emerald-300 hover:text-white hover:bg-emerald-900/50 transition-colors"
                      title="Minimize simulation box"
                    >
                      <Minimize2 className="w-3.5 h-3.5" />
                    </button>
                    {/* Close button */}
                    <button
                      onClick={() => onCloseScene?.()}
                      className="p-1 rounded text-emerald-300 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                      title="Close simulation"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Live 3D WebGL Canvas inside the box */}
                <div className="flex-1 w-full h-full relative overflow-hidden">
                  <VisualizationViewport
                    sceneType={resolvedScene}
                    initialParams={activeSceneParams}
                    title={activeSceneTitle}
                    onClose={onCloseScene}
                  />
                </div>
              </div>
            )}

            {/* In-Whiteboard Dynamic Mafs Vector Graphing Canvas */}
            {activeGraph && (
              <div className="absolute top-14 right-4 z-30 w-[92vw] max-w-[480px] shadow-[0_20px_50px_rgba(0,0,0,0.35)] animate-in fade-in slide-in-from-top-4 duration-300">
                <MafsGraphCanvas
                  formula={activeGraph.formula}
                  domain={activeGraph.domain}
                  range={activeGraph.range}
                  title={activeGraph.title}
                  callout={activeGraph.callout}
                  points={activeGraph.points}
                  onClose={onCloseGraph}
                />
              </div>
            )}

            {/* Minimized Simulation Floating Pill */}
            {resolvedScene && sceneBoxMode === 'minimized' && (
              <button
                onClick={() => setSceneBoxMode('box_in_board')}
                className="absolute bottom-4 right-4 z-30 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#122319] border border-emerald-500/60 shadow-xl text-emerald-100 hover:bg-[#1a3324] transition-all cursor-pointer group animate-in fade-in"
              >
                <Box className="w-4 h-4 text-emerald-400 group-hover:rotate-12 transition-transform" />
                <span className="text-xs font-semibold">
                  3D Simulation Active {paramSummary ? `(${paramSummary})` : ''}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-900 text-emerald-200">Expand</span>
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
)

WhiteboardWorkspace.displayName = 'WhiteboardWorkspace'
