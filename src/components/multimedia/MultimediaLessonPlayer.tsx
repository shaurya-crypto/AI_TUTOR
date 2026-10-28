'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  VisualLessonManifest,
  LessonStep,
  LessonContentType,
  VisualEvent,
} from '@/types/lessonManifest'
import { MathGraphPlayer } from './MathGraphPlayer'
import { EducationalDiagramPlayer } from './EducationalDiagramPlayer'
import { ProceduralAnimationPlayer } from './ProceduralAnimationPlayer'
import { QuickCheckCard } from './QuickCheckCard'
import { LessonSummaryCard } from './LessonSummaryCard'
import { VisualizationViewport } from '@/components/whiteboard/VisualizationViewport'
import { MediaAssetService } from '@/services/mediaAssetService'
import { VisualEventQueue } from '@/services/visualEventProtocol'
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  RotateCcw,
  Layers,
  Compass,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Activity,
  Box,
  HelpCircle,
  Award,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from 'lucide-react'

interface MultimediaLessonPlayerProps {
  manifest: VisualLessonManifest
  initialStepIndex?: number
  onStepChange?: (stepIndex: number, step: LessonStep) => void
  onBoardDirective?: (action: string, content: string) => void
  onSaveProgress?: (stepIndex: number, completedStepIds: string[]) => void
  onClose?: () => void
}

export function MultimediaLessonPlayer({
  manifest,
  initialStepIndex = 0,
  onStepChange,
  onBoardDirective,
  onSaveProgress,
  onClose,
}: MultimediaLessonPlayerProps) {
  const steps = manifest.steps || []

  const [currentStepIndex, setCurrentStepIndex] = useState<number>(
    Math.min(initialStepIndex, Math.max(0, steps.length - 1))
  )
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([])
  const [isPaused, setIsPaused] = useState<boolean>(false)
  const [mediaLoadError, setMediaLoadError] = useState<boolean>(false)
  const [graphStepOverride, setGraphStepOverride] = useState<number | undefined>(undefined)
  const [graphVariableOverrides, setGraphVariableOverrides] = useState<Record<string, number> | undefined>(undefined)
  const [diagramStepOverride, setDiagramStepOverride] = useState<number | undefined>(undefined)

  const currentStep: LessonStep | undefined = steps[currentStepIndex]

  // Track completed steps and sync board directive
  useEffect(() => {
    if (!currentStep) return

    setMediaLoadError(false)
    setGraphStepOverride(undefined)
    setGraphVariableOverrides(undefined)
    setDiagramStepOverride(undefined)

    // Mark current step as completed in local list
    setCompletedStepIds((prev) => {
      if (!prev.includes(currentStep.id)) {
        const next = [...prev, currentStep.id]
        onSaveProgress?.(currentStepIndex, next)
        return next
      }
      return prev
    })

    // Execute associated board directive if present
    if (currentStep.boardDirective && onBoardDirective) {
      onBoardDirective(
        currentStep.boardDirective.action,
        currentStep.boardDirective.content
      )
    }

    onStepChange?.(currentStepIndex, currentStep)
  }, [currentStepIndex, currentStep, onBoardDirective, onStepChange, onSaveProgress])

  // Preload upcoming media assets in background
  useEffect(() => {
    const nextStep = steps[currentStepIndex + 1]
    if (nextStep && nextStep.type === 'IMAGE' && nextStep.content.image?.url) {
      VisualEventQueue.getInstance().preloadAsset(nextStep.content.image.url, 'image')
    }
  }, [currentStepIndex, steps])

  // Synchronize with VisualEventQueue for Gemini Live tool calls and directives
  useEffect(() => {
    const queue = VisualEventQueue.getInstance()
    const unsubscribe = queue.subscribe((event: VisualEvent) => {
      if (event.action === 'SHOW_MEDIA') {
        const targetIdx = event.stepIndex !== undefined ? event.stepIndex : event.parameters.stepIndex
        if (typeof targetIdx === 'number' && targetIdx >= 0 && targetIdx < steps.length) {
          setCurrentStepIndex(targetIdx)
        }
      } else if (event.action === 'SHOW_SCENE') {
        const sceneType = event.parameters.sceneType || event.parameters.scene
        if (sceneType) {
          const matchIdx = steps.findIndex(
            (s) => s.type === 'SCENE_3D' && s.content.scene3D?.sceneType === sceneType
          )
          if (matchIdx !== -1) {
            setCurrentStepIndex(matchIdx)
          }
        }
      } else if (event.action === 'UPDATE_GRAPH') {
        if (typeof event.parameters.stepIndex === 'number' || typeof event.parameters.step === 'number') {
          const stepVal = event.parameters.stepIndex !== undefined ? event.parameters.stepIndex : event.parameters.step
          setGraphStepOverride(stepVal)
        }
        const varParams: Record<string, number> = {}
        Object.entries(event.parameters).forEach(([k, v]) => {
          if (k !== 'stepIndex' && k !== 'step' && typeof v === 'number') {
            varParams[k] = v
          }
        })
        if (Object.keys(varParams).length > 0) {
          setGraphVariableOverrides(varParams)
        }
      } else if (event.action === 'REVEAL_DIAGRAM_STEP') {
        const stepVal = event.parameters.step !== undefined ? event.parameters.step : event.parameters.stepIndex
        if (typeof stepVal === 'number') {
          setDiagramStepOverride(stepVal)
        }
      } else if (event.action === 'PLAY_ANIMATION') {
        setIsPaused(false)
      } else if (event.action === 'PAUSE_MEDIA') {
        setIsPaused(true)
      } else if (event.action === 'ASK_CHECK') {
        const checkIdx = steps.findIndex((s) => s.type === 'QUICK_CHECK')
        if (checkIdx !== -1) {
          setCurrentStepIndex(checkIdx)
        }
      } else if (event.action === 'SAVE_LESSON_POSITION') {
        const idx = event.stepIndex !== undefined ? event.stepIndex : event.parameters.stepIndex
        if (typeof idx === 'number' && idx >= 0 && idx < steps.length) {
          setCurrentStepIndex(idx)
          onSaveProgress?.(idx, completedStepIds)
        }
      } else if (event.action === 'HIGHLIGHT_BOARD') {
        if (event.parameters.text && onBoardDirective) {
          onBoardDirective('draw_highlight_box', event.parameters.text)
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [steps, completedStepIds, onSaveProgress, onBoardDirective])

  // Navigation handlers
  const handlePrev = useCallback(() => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }, [currentStepIndex])

  const handleNext = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1)
    }
  }, [currentStepIndex, steps.length])

  const handleGotoStep = useCallback((idx: number) => {
    if (idx >= 0 && idx < steps.length) {
      setCurrentStepIndex(idx)
    }
  }, [steps.length])

  // Pause / Resume handler
  const handleTogglePause = useCallback(() => {
    setIsPaused((prev) => !prev)
  }, [])

  // Replay current step handler
  const handleReplay = useCallback(() => {
    setMediaLoadError(false)
    setIsPaused(false)
    setGraphStepOverride(undefined)
    setGraphVariableOverrides(undefined)
    setDiagramStepOverride(0)

    // Re-execute associated board directive so notes re-render
    if (currentStep?.boardDirective && onBoardDirective) {
      onBoardDirective(
        currentStep.boardDirective.action,
        currentStep.boardDirective.content
      )
    }
  }, [currentStep, onBoardDirective])

  // Step Type Icon Helper
  const getStepIcon = (type: LessonContentType) => {
    switch (type) {
      case 'TEXT_STEP':
        return <FileText className="w-3.5 h-3.5 text-[var(--accent-sage)]" />
      case 'BOARD_STEP':
        return <Compass className="w-3.5 h-3.5 text-[var(--accent-sage)]" />
      case 'IMAGE':
        return <ImageIcon className="w-3.5 h-3.5 text-[var(--accent-sage)]" />
      case 'VIDEO':
        return <VideoIcon className="w-3.5 h-3.5 text-[var(--accent-warm)]" />
      case 'ANIMATION':
        return <Activity className="w-3.5 h-3.5 text-[var(--accent-sage)]" />
      case 'GRAPH':
        return <Activity className="w-3.5 h-3.5 text-[var(--accent-sage)]" />
      case 'DIAGRAM':
        return <Layers className="w-3.5 h-3.5 text-[var(--accent-sage)]" />
      case 'SCENE_3D':
        return <Box className="w-3.5 h-3.5 text-[var(--accent-warm)]" />
      case 'QUICK_CHECK':
        return <HelpCircle className="w-3.5 h-3.5 text-[var(--accent-warm)]" />
      case 'SUMMARY':
        return <Award className="w-3.5 h-3.5 text-[var(--accent-sage)]" />
      default:
        return <Layers className="w-3.5 h-3.5 text-[var(--accent-sage)]" />
    }
  }

  if (!currentStep) {
    return (
      <div className="w-full h-full flex items-center justify-center p-6 bg-[var(--canvas-base)] text-[var(--ink-secondary)]">
        <p className="text-xs font-mono">No steps available in this lesson plan.</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full flex flex-col bg-[var(--canvas-base)] text-[var(--ink-primary)] rounded-2xl overflow-hidden border border-[var(--border-subtle)] shadow-sm">
      {/* Top Header & Navigation Ribbon */}
      <div className="z-20 px-3 sm:px-4 py-2 bg-white/95 backdrop-blur-md border-b border-[var(--border-subtle)] flex items-center justify-between gap-2 shadow-xs">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1 rounded-md bg-[var(--accent-sage-soft)] border border-[var(--accent-sage-border)] text-[var(--accent-sage)] shrink-0">
            {getStepIcon(currentStep.type)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--accent-sage)] font-bold">
                Step {currentStepIndex + 1} of {steps.length} - {currentStep.type.replace('_', ' ')}
              </span>
              {currentStep.sourceCitation && (
                <span className="hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.2 rounded bg-[var(--canvas-base)] border border-[var(--border-subtle)] text-[var(--ink-muted)] truncate">
                  {currentStep.sourceCitation.textbookName || 'NCERT Standard'}
                </span>
              )}
            </div>
            <h3 className="text-xs sm:text-sm font-semibold text-[var(--ink-primary)] truncate">
              {currentStep.title}
            </h3>
          </div>
        </div>

        {/* Player Action Controls: Prev, Pause/Resume, Replay, Next */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="p-1.5 rounded-lg bg-white hover:bg-[var(--canvas-base)] text-[var(--ink-primary)] border border-[var(--border-subtle)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
            title="Previous Step"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={handleTogglePause}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer shadow-xs ${
              isPaused
                ? 'bg-[var(--accent-warm-soft)] text-[var(--accent-warm)] border-[var(--accent-warm-border)] hover:bg-[#faeae6]'
                : 'bg-white text-[var(--accent-sage)] border-[var(--border-subtle)] hover:bg-[var(--canvas-base)]'
            }`}
            title={isPaused ? 'Resume Lesson' : 'Pause Lesson'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            onClick={handleReplay}
            className="p-1.5 rounded-lg bg-white hover:bg-[var(--canvas-base)] text-[var(--ink-secondary)] border border-[var(--border-subtle)] cursor-pointer transition-colors shadow-xs"
            title="Replay Current Step"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <span className="text-xs font-mono text-[var(--ink-secondary)] font-semibold px-1">
            {currentStepIndex + 1} / {steps.length}
          </span>

          <button
            onClick={handleNext}
            disabled={currentStepIndex === steps.length - 1}
            className="p-1.5 rounded-lg bg-white hover:bg-[var(--canvas-base)] text-[var(--ink-primary)] border border-[var(--border-subtle)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
            title="Next Step"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Visual Presentation Stage */}
      <div className="relative flex-1 w-full h-full min-h-0 overflow-hidden bg-[var(--canvas-base)] flex flex-col">
        {/* 1. TEXT_STEP */}
        {currentStep.type === 'TEXT_STEP' && currentStep.content.text && (
          <div className="w-full h-full p-5 sm:p-6 overflow-y-auto space-y-4 flex flex-col justify-center">
            <div className="p-4 rounded-2xl bg-white border border-[var(--border-subtle)] space-y-3 shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-sage)] font-bold">
                Teacher Explanation
              </span>
              <p className="text-sm sm:text-base text-[var(--ink-primary)] leading-relaxed font-sans">
                {currentStep.content.text.explanation}
              </p>
            </div>
            {currentStep.content.text.keyTakeaway && (
              <div className="p-3.5 rounded-xl bg-[var(--accent-sage-soft)] border border-[var(--accent-sage-border)] text-xs text-[var(--ink-primary)] font-mono">
                <span className="font-bold text-[var(--accent-sage)] block mb-1">Core Takeaway:</span>
                {currentStep.content.text.keyTakeaway}
              </div>
            )}
          </div>
        )}

        {/* 2. BOARD_STEP */}
        {currentStep.type === 'BOARD_STEP' && currentStep.content.board && (
          <div className="w-full h-full p-5 sm:p-6 overflow-y-auto space-y-4 flex flex-col justify-center">
            <div className="p-4 rounded-2xl bg-white border border-[var(--border-subtle)] space-y-3 shadow-xs">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--accent-warm)] font-bold">
                {currentStep.content.board.title || 'Mathematical Derivation & Board Notes'}
              </span>
              <div className="space-y-2">
                {currentStep.content.board.equations.map((eq, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-stone-50 border border-[var(--border-subtle)] text-xs sm:text-sm font-mono text-[var(--ink-primary)]"
                  >
                    {eq}
                  </div>
                ))}
              </div>
            </div>
            {currentStep.content.board.derivationSteps && (
              <div className="space-y-1.5 pl-2">
                {currentStep.content.board.derivationSteps.map((stepText, idx) => (
                  <p key={idx} className="text-xs text-[var(--ink-secondary)] font-mono">
                    {idx + 1}. {stepText}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. IMAGE */}
        {currentStep.type === 'IMAGE' && currentStep.content.image && (
          <div className="w-full h-full p-3 sm:p-4 flex flex-col items-center justify-between bg-white overflow-hidden">
            <div className="relative flex-1 w-full flex items-center justify-center rounded-xl overflow-hidden bg-stone-50 border border-[var(--border-subtle)] p-2">
              {!mediaLoadError && currentStep.content.image.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentStep.content.image.url}
                  alt={currentStep.content.image.alt || currentStep.title}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-xs"
                  onError={() => setMediaLoadError(true)}
                />
              ) : (
                // Graceful Fallback SVG Rendering
                <div
                  className="w-full h-full flex items-center justify-center p-2"
                  dangerouslySetInnerHTML={{
                    __html:
                      currentStep.content.image.fallbackSvg ||
                      MediaAssetService.generateFallbackSvg(currentStep.title),
                  }}
                />
              )}
            </div>

            {/* Caption & Provenance */}
            <div className="w-full pt-2 flex items-center justify-between text-[11px] font-mono text-[var(--ink-secondary)]">
              <span className="truncate max-w-[70%]">
                {currentStep.content.image.caption || currentStep.content.image.alt}
              </span>
              <span className="text-[10px] text-[var(--ink-muted)] shrink-0">
                {currentStep.content.image.attribution || 'Verified NCERT Provenance'}
              </span>
            </div>
          </div>
        )}

        {/* 4. VIDEO */}
        {currentStep.type === 'VIDEO' && currentStep.content.video && (
          <div className="w-full h-full p-3 sm:p-4 flex flex-col items-center justify-center bg-white">
            {/* If video provider is unverified or external URL is unavailable, render smooth procedural animation fallback */}
            {mediaLoadError || !MediaAssetService.isAuthorizedDomain(currentStep.content.video.url) ? (
              <div className="w-full h-full flex flex-col">
                <div className="px-3 py-1.5 mb-2 rounded-lg bg-[var(--accent-warm-soft)] border border-[var(--accent-warm-border)] text-[11px] font-mono text-[var(--accent-warm)] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>External video provider unconfigured - Running local interactive procedural animation</span>
                </div>
                <div className="flex-1 w-full min-h-0">
                  <ProceduralAnimationPlayer
                    content={{
                      animationType: (currentStep.content.video.fallbackAnimationType as any) || 'circuit_flow',
                      durationSeconds: currentStep.content.video.durationSeconds || 8,
                    }}
                    isPlaying={!isPaused}
                  />
                </div>
              </div>
            ) : (
              <video
                src={currentStep.content.video.url}
                controls
                className="w-full max-h-full rounded-xl border border-[var(--border-subtle)] shadow-sm"
                onError={() => setMediaLoadError(true)}
              />
            )}
          </div>
        )}

        {/* 5. ANIMATION */}
        {currentStep.type === 'ANIMATION' && currentStep.content.animation && (
          <ProceduralAnimationPlayer
            content={currentStep.content.animation}
            isPlaying={!isPaused}
          />
        )}

        {/* 6. GRAPH */}
        {currentStep.type === 'GRAPH' && currentStep.content.graph && (
          <MathGraphPlayer
            content={currentStep.content.graph}
            activeProgressiveStep={graphStepOverride}
            variableOverrides={graphVariableOverrides}
          />
        )}

        {/* 7. DIAGRAM */}
        {currentStep.type === 'DIAGRAM' && currentStep.content.diagram && (
          <EducationalDiagramPlayer
            content={currentStep.content.diagram}
            activeStep={diagramStepOverride}
          />
        )}

        {/* 8. SCENE_3D */}
        {currentStep.type === 'SCENE_3D' && currentStep.content.scene3D && (
          <VisualizationViewport
            sceneType={currentStep.content.scene3D.sceneType}
            initialParams={currentStep.content.scene3D.initialParams || {}}
            title={currentStep.content.scene3D.title}
          />
        )}

        {/* 9. QUICK_CHECK */}
        {currentStep.type === 'QUICK_CHECK' && currentStep.content.quickCheck && (
          <QuickCheckCard content={currentStep.content.quickCheck} />
        )}

        {/* 10. SUMMARY */}
        {currentStep.type === 'SUMMARY' && currentStep.content.summary && (
          <LessonSummaryCard
            content={currentStep.content.summary}
            moduleTitle={manifest.title}
          />
        )}
      </div>
    </div>
  )
}
