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
import { Sparkles, X, HelpCircle, Activity } from 'lucide-react'

export interface MafsGraphCanvasProps {
  formula?: string
  domain?: [number, number]
  range?: [number, number]
  title?: string
  callout?: string
  points?: Array<[number, number]> | string
  width?: number | 'auto'
  height?: number
  onClose?: () => void
}

/**
 * Normalizes user / LLM mathematical formula string into a mathjs-evaluable expression.
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
  height = 360,
  onClose,
}: MafsGraphCanvasProps) {
  // Parse discrete points if string was provided
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

  // Clean and compile formula
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
      // Fallback function
      return (x: number) => x
    }
  }, [normalizedFormula])

  // Display title
  const displayTitle = title || `Graph: y = ${formula}`

  return (
    <div className="w-full relative flex flex-col bg-[#162B23] border border-[#2E5444] rounded-2xl overflow-hidden shadow-2xl text-emerald-100 font-sans">
      {/* Header bar */}
      <div className="px-4 py-2.5 bg-[#12241D] border-b border-[#2E5444] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <h4 className="text-xs font-semibold tracking-wide text-white uppercase font-mono">
            {displayTitle}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {callout && (
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-[#1F3D31] text-emerald-300 border border-[#2E5444]">
              {callout}
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-md text-emerald-400 hover:text-white hover:bg-emerald-950/60 transition-colors"
              title="Close Graph Viewport"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Graph Area */}
      <div className="w-full flex justify-center items-center bg-[#1E3A2F] p-2 overflow-hidden">
        <Mafs
          viewBox={{ x: domain, y: range }}
          preserveAspectRatio={false}
          height={height}
          pan={true}
          zoom={{ min: 0.2, max: 5 }}
        >
          <Coordinates.Cartesian
            subdivisions={2}
            xAxis={{ lines: 1, labels: (x) => (x !== 0 ? `${x}` : '') }}
            yAxis={{ lines: 1, labels: (y) => (y !== 0 ? `${y}` : '') }}
          />

          {/* Plotted Function Curve */}
          <Plot.OfX
            y={compiledFn}
            color="#C85A43"
            weight={3}
          />

          {/* Discrete / Critical Points */}
          {parsedPoints.map(([px, py], idx) => (
            <React.Fragment key={idx}>
              <Point x={px} y={py} color={Theme.yellow} />
              <Text
                x={px}
                y={py + 0.35}
                color="#FFFFFF"
                size={14}
              >
                {`(${px}, ${py})`}
              </Text>
            </React.Fragment>
          ))}
        </Mafs>
      </div>

      {/* Footer info badge */}
      <div className="px-4 py-2 bg-[#12241D] border-t border-[#2E5444] flex items-center justify-between text-[11px] text-emerald-300 font-mono">
        <div>Formula: y = {formula}</div>
        <div>Domain: [{domain[0]}, {domain[1]}] | Range: [{range[0]}, {range[1]}]</div>
      </div>
    </div>
  )
}
