'use client'

import React, { forwardRef, useState, useEffect } from 'react'
import { GreenChalkboard, GreenChalkboardRef, WritingPositionInfo } from './GreenChalkboard'
import { SobiCompanion } from './SobiCompanion'
import { VisualizationViewport } from './VisualizationViewport'
import { MafsGraphCanvas, MafsGraphCanvasProps } from './MafsGraphCanvas'
import { VisualizationSceneType } from './scenes/sceneTypes'
import { resolveSceneType } from './scenes/sceneRegistry'
import { MultimediaLessonPlayer } from '@/components/multimedia/MultimediaLessonPlayer'
import { VisualLessonManifest, LessonStep } from '@/types/lessonManifest'
import {
  Layers,
  Box,
  Columns,
  Maximize2,
  Minimize2,
  Sparkles,
  Activity,
  X,
  Minimize,
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

    // 3D Scene In-Whiteboard Display Mode:
    // 'box_in_board' (embedded container box right on the whiteboard) | 'docked_split' (side-by-side) | 'minimized'
    const [sceneBoxMode, setSceneBoxMode] = useState<'box_in_board' | 'docked_split' | 'minimized'>('box_in_board')

    // Mobile / Responsive tab
    const [mobileTab, setMobileTab] = useState<'board' | 'visual'>('board')
    const [layoutSplit, setLayoutSplit] = useState<'split' | 'full_board' | 'full_visual'>('split')

    // When an active scene is summoned, pop open the in-board box
    useEffect(() => {
      if (activeSceneType) {
        setSceneBoxMode((prev) => (prev === 'minimized' ? 'box_in_board' : prev))
      }
    }, [activeSceneType])

    const hasVisualStage = !!lessonManifest || (!!activeSceneType && sceneBoxMode === 'docked_split')

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
      else if (action === 'draw_image' || action === 'image') {
        const parts = (content || '').split('|').map((s: string) => s.trim())
        board.drawImageCard?.(parts[0] || 'Diagram', parts[1] || '', parts[2] || 'NCERT Standard')
      }
      else if (action === 'draw_video' || action === 'video') {
        const parts = (content || '').split('|').map((s: string) => s.trim())
        board.drawVideoCard?.(parts[0] || 'Demonstration', parts[1] || '')
      }
      else if (action === 'new_page') board.addNewPage?.()
      else if (action === 'draw_diagram' || action === 'diagram') board.handleAiDirective(`[DIAGRAM: ${content}]`)
      else board.handleAiDirective(`[${action.toUpperCase()}: ${content}]`)
    }

    // Format active params summary string for badge
    const paramSummary = Object.entries(activeSceneParams || {})
      .filter(([k]) => !['color', 'wireframe'].includes(k))
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ')

    return (
      <div className="relative w-full h-full flex flex-col overflow-hidden bg-[#F8F6F0]">
        {/* Mobile View Toggle Bar (when multimedia manifest or docked split is active) */}
        {hasVisualStage && (
          <div className="md:hidden z-20 flex items-center justify-center p-1.5 bg-white border-b border-[#E5E3DB] gap-2 shadow-xs">
            <button
              onClick={() => setMobileTab('board')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all ${
                mobileTab === 'board'
                  ? 'bg-[#52715D] text-white shadow-xs'
                  : 'text-[#555852] hover:bg-[#F8F6F0]'
              }`}
            >
              Whiteboard Notes
            </button>
            <button
              onClick={() => setMobileTab('visual')}
              className={`px-3 py-1 text-xs rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                mobileTab === 'visual'
                  ? 'bg-[#C85A43] text-white shadow-xs'
                  : 'text-[#555852] hover:bg-[#F8F6F0]'
              }`}
            >
              {lessonManifest ? <Activity className="w-3.5 h-3.5" /> : <Box className="w-3.5 h-3.5" />}
              <span>{lessonManifest ? 'Multimedia Stage' : '3D Simulation'}</span>
            </button>
          </div>
        )}

        {/* Desktop Layout Toggle (for multimedia lesson stages) */}
        {hasVisualStage && lessonManifest && (
          <div className="hidden md:flex absolute top-3 right-6 z-30 items-center gap-1 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl border border-[#E5E3DB] shadow-sm">
            <button
              onClick={() => setLayoutSplit('split')}
              className={`p-1 rounded-md text-xs transition-colors ${
                layoutSplit === 'split' ? 'bg-[#52715D] text-white' : 'text-[#555852] hover:bg-[#F8F6F0]'
              }`}
              title="Side-by-Side Dual View"
            >
              <Columns className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutSplit('full_board')}
              className={`p-1 rounded-md text-xs transition-colors ${
                layoutSplit === 'full_board' ? 'bg-[#52715D] text-white' : 'text-[#555852] hover:bg-[#F8F6F0]'
              }`}
              title="Full Whiteboard View"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setLayoutSplit('full_visual')}
              className={`p-1 rounded-md text-xs transition-colors ${
                layoutSplit === 'full_visual' ? 'bg-[#C85A43] text-white' : 'text-[#555852] hover:bg-[#F8F6F0]'
              }`}
              title="Full Visual Stage View"
            >
              <Activity className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Workspace Panes */}
        <div className="relative flex-1 w-full h-full flex flex-col md:flex-row overflow-hidden p-2 sm:p-3 gap-2 sm:gap-3">
          {/* Main Whiteboard Canvas */}
          <div
            className={`relative transition-all duration-300 flex-1 h-full ${
              hasVisualStage
                ? layoutSplit === 'full_visual'
                  ? 'hidden'
                  : layoutSplit === 'full_board'
                  ? 'w-full'
                  : 'md:w-1/2 w-full ' + (mobileTab === 'visual' ? 'hidden md:flex' : 'flex')
                : 'w-full'
            }`}
          >
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
              onWritingPositionChange={setWritingPosition}
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
                    {/* Dock to side toggle */}
                    <button
                      onClick={() => setSceneBoxMode('docked_split')}
                      className="p-1 rounded text-emerald-300 hover:text-white hover:bg-emerald-900/50 transition-colors"
                      title="Dock to side (Split view)"
                    >
                      <Columns className="w-3.5 h-3.5" />
                    </button>
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

          {/* Right Pane: Multimedia Lesson Player OR Docked 3D Stage */}
          {hasVisualStage && (
            <div
              className={`relative transition-all duration-300 flex-1 h-full ${
                layoutSplit === 'full_board'
                  ? 'hidden'
                  : layoutSplit === 'full_visual'
                  ? 'w-full'
                  : 'md:w-1/2 w-full ' + (mobileTab === 'board' ? 'hidden md:flex' : 'flex')
              }`}
            >
              {lessonManifest ? (
                <MultimediaLessonPlayer
                  manifest={lessonManifest}
                  initialStepIndex={initialStepIndex}
                  onStepChange={onStepChange}
                  onBoardDirective={handleExecuteBoardDirective}
                  onSaveProgress={onSaveProgress}
                  onClose={onCloseScene}
                />
              ) : (
                <div className="relative w-full h-full flex flex-col">
                  {/* Docked top bar to undock back into in-board box */}
                  <div className="flex items-center justify-between px-3 py-1.5 bg-[#122319] border-b border-emerald-900/60 text-emerald-200">
                    <span className="text-xs font-semibold">Side-by-Side 3D Simulation</span>
                    <button
                      onClick={() => setSceneBoxMode('box_in_board')}
                      className="px-2 py-0.5 text-xs rounded bg-emerald-900/60 hover:bg-emerald-800 text-white flex items-center gap-1"
                    >
                      <Box className="w-3 h-3" />
                      <span>Embed in Whiteboard</span>
                    </button>
                  </div>
                  <div className="flex-1 w-full h-full">
                    <VisualizationViewport
                      sceneType={resolvedScene}
                      initialParams={activeSceneParams}
                      title={activeSceneTitle}
                      onClose={onCloseScene}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)

WhiteboardWorkspace.displayName = 'WhiteboardWorkspace'
