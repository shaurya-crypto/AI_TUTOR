'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  VisualizationSceneType,
  IInteractiveScene,
} from './scenes/sceneTypes'
import {
  SCENE_METADATA_REGISTRY,
  createInteractiveScene,
  resolveSceneType,
} from './scenes/sceneRegistry'
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Sliders,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Eye,
  Maximize2,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VisualizationViewportProps {
  sceneType?: VisualizationSceneType | null
  initialParams?: Record<string, any>
  title?: string
  onClose?: () => void
}

export function VisualizationViewport({
  sceneType = 'geometry_3d',
  initialParams = {},
  title,
  onClose,
}: VisualizationViewportProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sceneInstanceRef = useRef<IInteractiveScene | null>(null)
  const [activeType, setActiveType] = useState<VisualizationSceneType>(sceneType || 'geometry_3d')
  const [params, setParams] = useState<Record<string, any>>(initialParams || {})
  const [isPaused, setIsPaused] = useState(false)
  const [controlsExpanded, setControlsExpanded] = useState(true)
  const [webGLSupported, setWebGLSupported] = useState(true)

  const meta = SCENE_METADATA_REGISTRY[activeType] || SCENE_METADATA_REGISTRY.geometry_3d

  // Detect WebGL capability
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const isSupported = !!(
        window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
      )
      setWebGLSupported(isSupported)
    } catch {
      setWebGLSupported(false)
    }
  }, [])

  // Sync incoming props
  useEffect(() => {
    if (sceneType) {
      const resolved = resolveSceneType(sceneType)
      if (resolved !== activeType) {
        setActiveType(resolved)
      }
    }
  }, [sceneType, activeType])

  // Sync incoming dynamic parameter updates from AI
  useEffect(() => {
    if (initialParams && Object.keys(initialParams).length > 0) {
      setParams((prev) => {
        const next = { ...prev, ...initialParams }
        if (sceneInstanceRef.current) {
          sceneInstanceRef.current.updateParameters(next)
        }
        return next
      })
    }
  }, [initialParams])

  // Initialize and mount Three.js Scene
  useEffect(() => {
    if (!webGLSupported || !containerRef.current) return

    // Clean up previous scene instance
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.dispose()
      sceneInstanceRef.current = null
    }

    try {
      const instance = createInteractiveScene(activeType)
      sceneInstanceRef.current = instance
      instance.init(containerRef.current)

      // Initialize default params from metadata merged with custom initialParams without dropping custom keys
      const defaults: Record<string, any> = { ...initialParams }
      Object.entries(meta.parameters).forEach(([key, def]) => {
        if (defaults[key] === undefined) {
          defaults[key] = def.defaultValue
        }
      })
      setParams(defaults)
      instance.updateParameters(defaults)
    } catch (err) {
      console.error('[VisualizationViewport] Error mounting 3D scene:', err)
      setWebGLSupported(false)
    }

    return () => {
      if (sceneInstanceRef.current) {
        sceneInstanceRef.current.dispose()
        sceneInstanceRef.current = null
      }
    }
  }, [activeType, webGLSupported])

  // Handle parameter changes from student
  const handleParamChange = (name: string, value: any) => {
    const next = { ...params, [name]: value }
    setParams(next)
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.updateParameters(next)
    }
  }

  // Toggle Play / Pause
  const handleTogglePlayPause = () => {
    const nextPaused = !isPaused
    setIsPaused(nextPaused)
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.setPaused(nextPaused)
    }
  }

  // Reset Camera Position
  const handleResetCamera = () => {
    if (sceneInstanceRef.current) {
      sceneInstanceRef.current.resetCamera()
    }
  }

  return (
    <div className="relative w-full h-full flex flex-col rounded-2xl overflow-hidden bg-[#0c1310] border-[6px] border-[#223a2a] shadow-2xl">
      {/* Top Header Bar */}
      <div className="relative z-20 px-4 py-2 bg-[#122319]/90 border-b border-emerald-900/60 backdrop-blur-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <div className="flex flex-col min-w-0">
            <h4 className="text-xs font-semibold text-emerald-100 tracking-wide truncate">
              {title || meta.title}
            </h4>
            <span className="text-[10px] text-cyan-300/80 font-mono truncate">
              {meta.subject} • Interactive 3D Model
            </span>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setControlsExpanded(!controlsExpanded)}
            className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-800/60 transition-colors cursor-pointer flex items-center gap-1 text-[11px]"
            title={controlsExpanded ? 'Collapse Parameters' : 'Expand Parameters'}
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-300" />
            <span className="hidden sm:inline">Controls</span>
            {controlsExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-200 border border-emerald-800/60 transition-colors cursor-pointer"
            title="Reset View"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
          </button>

          <button
            onClick={handleTogglePlayPause}
            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isPaused
                ? 'bg-amber-950/80 text-amber-200 border-amber-800/60'
                : 'bg-emerald-950/80 text-emerald-200 border-emerald-800/60'
            }`}
            title={isPaused ? 'Resume Simulation' : 'Pause Simulation'}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-200 border border-rose-800/60 transition-colors cursor-pointer text-xs font-bold"
              title="Close 3D View"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-gradient-to-b from-[#0b1712] via-[#0d1c15] to-[#08120e]">
        {webGLSupported ? (
          <div
            ref={containerRef}
            className="w-full h-full cursor-grab active:cursor-grabbing select-none"
            title="Drag to rotate, scroll to zoom"
          />
        ) : (
          /* WebGL Fallback Card */
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-emerald-200 space-y-3">
            <HelpCircle className="w-10 h-10 text-amber-400" />
            <h5 className="font-semibold text-sm">3D Graphics Hardware Acceleration Unavailable</h5>
            <p className="text-xs text-emerald-300/80 max-w-sm">
              Your browser or hardware did not report WebGL support. Don't worry! All conceptual explanations and formulas are preserved on your live chalkboard.
            </p>
            {meta.educationalFormula && (
              <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-800 text-cyan-200 text-xs font-mono">
                {meta.educationalFormula}
              </div>
            )}
          </div>
        )}

        {/* Orbit Helper Watermark */}
        <div className="absolute bottom-2 left-3 pointer-events-none z-10 flex items-center gap-1.5 text-[10px] text-emerald-400/50 font-mono">
          <span>Drag to rotate</span>
          <span>•</span>
          <span>Scroll to zoom</span>
        </div>

        {/* Educational Formula Pill */}
        {meta.educationalFormula && (
          <div className="absolute top-3 left-3 z-10 max-w-[85%] px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-cyan-500/30 text-cyan-200 text-[11px] font-mono shadow-lg flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">{meta.educationalFormula}</span>
          </div>
        )}
      </div>

      {/* Floating Collapsible Parameter Controls HUD */}
      {controlsExpanded && Object.keys(meta.parameters).length > 0 && (
        <div className="relative z-20 px-4 py-3 bg-[#0f1d16]/95 border-t border-emerald-950/80 backdrop-blur-md max-h-48 overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(meta.parameters).map(([key, def]) => {
              const val = params[key] !== undefined ? params[key] : def.defaultValue

              if (def.type === 'select') {
                return (
                  <div key={key} className="flex flex-col gap-1">
                    <label className="text-[10px] font-mono text-emerald-300/90 uppercase tracking-wider">
                      {def.label}
                    </label>
                    <select
                      value={val}
                      onChange={(e) => handleParamChange(key, e.target.value)}
                      className="px-2 py-1 text-xs rounded-lg bg-emerald-950 text-emerald-100 border border-emerald-800/80 focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
                    >
                      {def.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              }

              if (def.type === 'boolean') {
                return (
                  <div key={key} className="flex items-center justify-between gap-2 pt-3">
                    <label className="text-[11px] text-emerald-200">{def.label}</label>
                    <input
                      type="checkbox"
                      checked={!!val}
                      onChange={(e) => handleParamChange(key, e.target.checked)}
                      className="w-4 h-4 rounded-sm accent-emerald-500 cursor-pointer"
                    />
                  </div>
                )
              }

              // Default: Number Slider
              return (
                <div key={key} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-emerald-300/90 font-medium">{def.label}:</span>
                    <span className="font-mono text-cyan-300 font-bold">
                      {val} {def.unit || ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={def.min ?? 0}
                    max={def.max ?? 10}
                    step={def.step ?? 1}
                    value={val}
                    onChange={(e) => handleParamChange(key, parseFloat(e.target.value))}
                    className="w-full accent-cyan-400 bg-emerald-950 rounded-lg cursor-pointer h-1.5"
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
