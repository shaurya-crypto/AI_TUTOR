'use client'

import React, { useMemo, useState } from 'react'
import {
  Mafs,
  Coordinates,
  Plot,
  Line,
  Point,
  Text,
  Theme,
} from 'mafs'
import 'mafs/core.css'
import 'mafs/font.css'
import { compile } from 'mathjs'
import { 
  Activity, 
  X, 
  Maximize2, 
  Minimize2, 
  Move, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut,
  PanelRight,
  GripHorizontal
} from 'lucide-react'

export type GraphDisplayMode = 'docked' | 'floating' | 'maximized' | 'minimized'

export interface MafsGraphCanvasProps {
  formula?: string
  domain?: [number, number]
  range?: [number, number]
  title?: string
  callout?: string
  points?: Array<[number, number]> | string
  width?: number | 'auto'
  height?: number
  displayMode?: GraphDisplayMode
  onModeChange?: (mode: GraphDisplayMode) => void
  onClose?: () => void
}

/**
 * Normalizes user / LLM mathematical formula string into a mathjs-evaluable expression.
 * Handles implicit multiplication (2x -> 2*x), trigonometric notation, powers (^ -> **), and constants.
 */
function normalizeMathFormula(raw: string): string {
  if (!raw) return 'x'
  let clean = raw.trim()
  // Strip "y =" or "f(x) =" prefix
  clean = clean.replace(/^(?:y|f\(x\))\s*=\s*/i, '')
  // Replace implicit multiplication like 2x with 2*x
  clean = clean.replace(/(\d+)([a-zA-Z])/g, '$1 * $2')
  // Replace brackets if any
  clean = clean.replace(/\[/g, '(').replace(/\]/g, ')')
  return clean
}

export function MafsGraphCanvas({
  formula = 'x^2 - 4',
  domain = [-5, 5],
  range = [-5, 5],
  title,
  callout,
  points,
  width = 'auto',
  height,
  displayMode = 'docked',
  onModeChange,
  onClose,
}: MafsGraphCanvasProps) {
  // Interactive view bounds with local zoom & pan state
  const [viewDomain, setViewDomain] = useState<[number, number]>(domain)
  const [viewRange, setViewRange] = useState<[number, number]>(range)
  const [showDerivative, setShowDerivative] = useState(false)

  // Reset to initial bounds if incoming props change significantly
  React.useEffect(() => {
    setViewDomain(domain)
    setViewRange(range)
  }, [domain[0], domain[1], range[0], range[1], formula])

  // Parse discrete points if string or array was provided
  const parsedPoints: [number, number][] = useMemo(() => {
    if (!points) return []
    if (Array.isArray(points)) return points
    const pts: [number, number][] = []
    const matches = points.matchAll(/\(\s*([\-\d\.]+)\s*,\s*([\-\d\.]+)\s*\)/g)
    for (const m of matches) {
      const px = parseFloat(m[1])
      const py = parseFloat(m[2])
      if (!isNaN(px) && !isNaN(py)) {
        pts.push([px, py])
      }
    }
    return pts
  }, [points])

  // Clean and compile primary function formula
  const normalizedFormula = useMemo(() => normalizeMathFormula(formula), [formula])
  const compiledFn = useMemo(() => {
    try {
      const expr = compile(normalizedFormula)
      return (x: number): number => {
        try {
          const res = expr.evaluate({ x, e: Math.E, pi: Math.PI })
          return typeof res === 'number' && isFinite(res) ? res : NaN
        } catch {
          return NaN
        }
      }
    } catch {
      return (x: number) => x
    }
  }, [normalizedFormula])

  // Numerical derivative function: f'(x) ≈ (f(x+h) - f(x-h)) / 2h
  const derivativeFn = useMemo(() => {
    const h = 0.0001
    return (x: number): number => {
      const y2 = compiledFn(x + h)
      const y1 = compiledFn(x - h)
      if (isNaN(y1) || isNaN(y2)) return NaN
      return (y2 - y1) / (2 * h)
    }
  }, [compiledFn])

  const handleZoom = (factor: number) => {
    setViewDomain(([min, max]) => {
      const span = (max - min) * factor
      const mid = (min + max) / 2
      return [mid - span / 2, mid + span / 2]
    })
    setViewRange(([min, max]) => {
      const span = (max - min) * factor
      const mid = (min + max) / 2
      return [mid - span / 2, mid + span / 2]
    })
  }

  const handleReset = () => {
    setViewDomain(domain)
    setViewRange(range)
  }

  const displayTitle = title || `Graph: y = ${formula}`
  const resolvedHeight = height || (displayMode === 'maximized' ? 620 : displayMode === 'docked' ? 480 : 380)

  return (
    <div className="w-full h-full relative flex flex-col bg-[#111C16] border-2 border-[#233930] rounded-2xl overflow-hidden shadow-2xl text-emerald-100 font-sans select-none">
      {/* Top Header & Move Handle Toolbar */}
      <div className="px-3.5 py-2.5 bg-[#0D1712] border-b border-[#233930] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="drag-handle-graph cursor-grab active:cursor-grabbing p-1 rounded hover:bg-emerald-950/60 text-emerald-400/80 hover:text-emerald-300 transition-colors" title="Drag to move graph box">
            <GripHorizontal className="w-4 h-4" />
          </div>
          <Activity className="w-4 h-4 text-sky-400 animate-pulse shrink-0" />
          <h4 className="text-xs font-semibold tracking-wide text-white uppercase font-mono truncate">
            {displayTitle}
          </h4>
        </div>

        {/* Action Controls & Mode Switcher */}
        <div className="flex items-center gap-1.5 shrink-0">
          {callout && (
            <span className="hidden sm:inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-[#172B20] text-emerald-300 border border-[#233930] truncate max-w-[140px]">
              {callout}
            </span>
          )}

          {/* Toggle Derivative Curve */}
          <button
            onClick={() => setShowDerivative((prev) => !prev)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
              showDerivative
                ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                : 'bg-emerald-950/40 text-emerald-400/80 border-[#233930] hover:text-emerald-200'
            }`}
            title="Toggle first derivative f'(x)"
          >
            dy/dx
          </button>

          {/* Zoom In */}
          <button
            onClick={() => handleZoom(0.8)}
            className="p-1 rounded text-emerald-300 hover:text-white hover:bg-emerald-950/80 transition-colors"
            title="Zoom in graph"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          {/* Zoom Out */}
          <button
            onClick={() => handleZoom(1.25)}
            className="p-1 rounded text-emerald-300 hover:text-white hover:bg-emerald-950/80 transition-colors"
            title="Zoom out graph"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>

          {/* Reset Zoom */}
          <button
            onClick={handleReset}
            className="p-1 rounded text-emerald-300 hover:text-white hover:bg-emerald-950/80 transition-colors"
            title="Reset coordinate axes"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Dock vs Floating toggle */}
          {onModeChange && (
            <>
              {displayMode !== 'docked' && (
                <button
                  onClick={() => onModeChange('docked')}
                  className="p-1 rounded text-emerald-300 hover:text-white hover:bg-emerald-950/80 transition-colors"
                  title="Dock graph to right side of chalkboard"
                >
                  <PanelRight className="w-3.5 h-3.5" />
                </button>
              )}
              {displayMode !== 'floating' && (
                <button
                  onClick={() => onModeChange('floating')}
                  className="p-1 rounded text-emerald-300 hover:text-white hover:bg-emerald-950/80 transition-colors"
                  title="Float graph as moveable box"
                >
                  <Move className="w-3.5 h-3.5" />
                </button>
              )}
              {displayMode !== 'maximized' ? (
                <button
                  onClick={() => onModeChange('maximized')}
                  className="p-1 rounded text-emerald-300 hover:text-white hover:bg-emerald-950/80 transition-colors"
                  title="Maximize graph full board"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={() => onModeChange('docked')}
                  className="p-1 rounded text-emerald-300 hover:text-white hover:bg-emerald-950/80 transition-colors"
                  title="Restore dock view"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onModeChange('minimized')}
                className="p-1 rounded text-emerald-300 hover:text-white hover:bg-emerald-950/80 transition-colors"
                title="Minimize graph to pill"
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Close button */}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded text-emerald-400 hover:text-rose-400 hover:bg-rose-950/40 transition-colors ml-1"
              title="Close graph view"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* High-Precision Interactive Vector Graph Viewport */}
      <div className="flex-1 w-full bg-[#13211B] relative flex justify-center items-center overflow-hidden">
        <Mafs
          viewBox={{ x: viewDomain, y: viewRange }}
          preserveAspectRatio={false}
          height={resolvedHeight}
          pan={true}
          zoom={{ min: 0.1, max: 10 }}
        >
          {/* High-Resolution Chalkboard Cartesian Grid */}
          <Coordinates.Cartesian
            subdivisions={2}
            xAxis={{ lines: 1, labels: (x) => (x !== 0 ? `${x}` : '') }}
            yAxis={{ lines: 1, labels: (y) => (y !== 0 ? `${y}` : '') }}
          />

          {/* Primary Function Curve (Terracotta Amber Chalk) */}
          <Plot.OfX
            y={compiledFn}
            color="#E87D65"
            weight={3}
          />

          {/* Derivative Curve if toggled (Botanical Sage Chalk) */}
          {showDerivative && (
            <Plot.OfX
              y={derivativeFn}
              color="#68B084"
              weight={2}
              style="dashed"
            />
          )}

          {/* Critical / Intersect Points with Coordinates */}
          {parsedPoints.map(([px, py], idx) => (
            <React.Fragment key={idx}>
              <Point x={px} y={py} color="#F3B455" />
              <Text
                x={px}
                y={py + 0.35}
                color="#FFFFFF"
                size={13}
              >
                {`(${px}, ${py})`}
              </Text>
            </React.Fragment>
          ))}
        </Mafs>
      </div>

      {/* Coordinate Status Footer Bar */}
      <div className="px-3.5 py-2 bg-[#0D1712] border-t border-[#233930] flex items-center justify-between text-[11px] text-emerald-300 font-mono shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-white font-semibold">y = {formula}</span>
          {showDerivative && (
            <span className="text-emerald-400 text-[10px] hidden sm:inline">(dashed: dy/dx)</span>
          )}
        </div>
        <div className="text-[10px] text-emerald-400/80">
          x: [{viewDomain[0].toFixed(1)}, {viewDomain[1].toFixed(1)}] | y: [{viewRange[0].toFixed(1)}, {viewRange[1].toFixed(1)}]
        </div>
      </div>
    </div>
  )
}
