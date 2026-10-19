'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { GraphContent, GraphVariable } from '@/types/lessonManifest'
import { Sliders, RefreshCw, ChevronRight, Layers } from 'lucide-react'

interface MathGraphPlayerProps {
  content: GraphContent
  onParameterChange?: (variableName: string, value: number) => void
  activeProgressiveStep?: number
  variableOverrides?: Record<string, number>
}

export function MathGraphPlayer({
  content,
  onParameterChange,
  activeProgressiveStep,
  variableOverrides,
}: MathGraphPlayerProps) {
  // Manage internal variable states (initialized from content.variables)
  const [variables, setVariables] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {}
    if (content.variables) {
      content.variables.forEach((v) => {
        initial[v.name] = v.current
      })
    }
    if (variableOverrides) {
      Object.assign(initial, variableOverrides)
    }
    return initial
  })

  // Progressive step: 0 = axes, 1 = points, 2 = line, 3 = intercept, 4 = slope_triangle
  const [internalStep, setInternalStep] = useState<number>(
    activeProgressiveStep !== undefined ? activeProgressiveStep : 4
  )

  useEffect(() => {
    if (activeProgressiveStep !== undefined) {
      setInternalStep(activeProgressiveStep)
    }
  }, [activeProgressiveStep])

  // Synchronize external variable overrides and updated content variables
  useEffect(() => {
    setVariables((prev) => {
      const next = { ...prev }
      if (content.variables) {
        content.variables.forEach((v) => {
          if (next[v.name] === undefined) next[v.name] = v.current
        })
      }
      if (variableOverrides) {
        Object.assign(next, variableOverrides)
      }
      return next
    })
  }, [content.variables, variableOverrides])

  const handleSliderChange = (name: string, val: number) => {
    setVariables((prev) => ({ ...prev, [name]: val }))
    onParameterChange?.(name, val)
  }

  // Coordinate Space Mapping
  const width = 560
  const height = 360
  const padding = 50

  const [xMin, xMax] = content.domain || [-5, 10]
  const [yMin, yMax] = content.range || [-5, 20]

  const toSvgX = (x: number) => {
    return padding + ((x - xMin) / (xMax - xMin)) * (width - 2 * padding)
  }

  const toSvgY = (y: number) => {
    return height - padding - ((y - yMin) / (yMax - yMin)) * (height - 2 * padding)
  }

  // Calculate curve points based on expression or linear formula
  const curvePoints = useMemo(() => {
    const pts: { x: number; y: number }[] = []
    const m = variables['m'] !== undefined ? variables['m'] : 2
    const c = variables['c'] !== undefined ? variables['c'] : 1

    const numSamples = 60
    const stepSize = (xMax - xMin) / numSamples

    for (let i = 0; i <= numSamples; i++) {
      const x = xMin + i * stepSize
      let y = m * x + c

      // If custom expression like quadratic or sine is provided
      if (content.expression && content.expression.includes('x^2')) {
        const a = variables['a'] !== undefined ? variables['a'] : 1
        const b = variables['b'] !== undefined ? variables['b'] : 0
        y = a * x * x + b * x + c
      }

      if (y >= yMin - 10 && y <= yMax + 10) {
        pts.push({ x, y })
      }
    }
    return pts
  }, [variables, xMin, xMax, yMin, yMax, content.expression])

  // Path SVG string
  const pathD = useMemo(() => {
    if (curvePoints.length === 0) return ''
    return curvePoints.reduce((acc, pt, idx) => {
      const sx = toSvgX(pt.x)
      const sy = toSvgY(pt.y)
      return idx === 0 ? `M ${sx} ${sy}` : `${acc} L ${sx} ${sy}`
    }, '')
  }, [curvePoints])

  // Current slope and intercept values
  const currentM = variables['m'] !== undefined ? variables['m'] : 2
  const currentC = variables['c'] !== undefined ? variables['c'] : 1

  // Slope triangle points: safely bounded within domain
  const spanX = xMax - xMin
  const triX1 = Math.max(xMin, xMin + spanX * 0.25)
  const triX2 = Math.min(xMax, xMin + spanX * 0.65)
  const triY1 = currentM * triX1 + currentC
  const triY2 = currentM * triX2 + currentC

  // Grid tick lines
  const xTicks = useMemo(() => {
    const ticks: number[] = []
    const range = xMax - xMin
    const step = range <= 15 ? 2 : range <= 40 ? 5 : 10
    const start = Math.ceil(xMin / step) * step
    for (let x = start; x <= xMax; x += step) {
      ticks.push(x)
    }
    return ticks
  }, [xMin, xMax])

  const yTicks = useMemo(() => {
    const ticks: number[] = []
    const range = yMax - yMin
    const step = range <= 15 ? 2 : range <= 40 ? 5 : 10
    const start = Math.ceil(yMin / step) * step
    for (let y = start; y <= yMax; y += step) {
      ticks.push(y)
    }
    return ticks
  }, [yMin, yMax])

  // Origin coords
  const originX = toSvgX(0)
  const originY = toSvgY(0)

  return (
    <div className="w-full h-full flex flex-col bg-[#0b140f] rounded-2xl overflow-hidden border border-emerald-900/60 shadow-xl text-emerald-100">
      {/* Header bar */}
      <div className="px-4 py-2.5 bg-[#122419] border-b border-emerald-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h4 className="text-xs font-semibold tracking-wide text-white uppercase font-mono">
            {content.title || 'Dynamic Mathematical Graph'}
          </h4>
          {content.expression && (
            <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-[11px] font-mono text-emerald-300">
              {content.expression}
            </span>
          )}
        </div>

        {/* Step Badge */}
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-mono">
          <Layers className="w-3.5 h-3.5 text-emerald-400" />
          <span>Stage {internalStep + 1} of 5</span>
        </div>
      </div>

      {/* SVG Canvas Stage */}
      <div className="flex-1 relative w-full h-full min-h-[220px] flex items-center justify-center p-2 bg-[#09110c]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full max-h-[360px] select-none"
        >
          {/* Background Grid */}
          <g opacity={0.15}>
            {xTicks.map((x) => (
              <line
                key={`gx-${x}`}
                x1={toSvgX(x)}
                y1={padding}
                x2={toSvgX(x)}
                y2={height - padding}
                stroke="#6ee7b7"
                strokeWidth={1}
              />
            ))}
            {yTicks.map((y) => (
              <line
                key={`gy-${y}`}
                x1={padding}
                y1={toSvgY(y)}
                x2={width - padding}
                y2={toSvgY(y)}
                stroke="#6ee7b7"
                strokeWidth={1}
              />
            ))}
          </g>

          {/* Coordinate Axes (Stage 0+) */}
          <g>
            {/* X-Axis */}
            <line
              x1={padding}
              y1={originY}
              x2={width - padding}
              y2={originY}
              stroke="#94a3b8"
              strokeWidth={2}
            />
            {/* Y-Axis */}
            <line
              x1={originX}
              y1={height - padding}
              x2={originX}
              y2={padding}
              stroke="#94a3b8"
              strokeWidth={2}
            />

            {/* Axis Labels */}
            <text
              x={width - padding + 12}
              y={originY + 4}
              fill="#cbd5e1"
              fontSize={12}
              fontFamily="monospace"
              fontWeight="bold"
            >
              {content.xLabel || 'X'}
            </text>
            <text
              x={originX - 6}
              y={padding - 10}
              fill="#cbd5e1"
              fontSize={12}
              fontFamily="monospace"
              fontWeight="bold"
              textAnchor="middle"
            >
              {content.yLabel || 'Y'}
            </text>

            {/* Numerical Ticks */}
            {xTicks.map((x) => (
              <g key={`tx-${x}`}>
                <line
                  x1={toSvgX(x)}
                  y1={originY - 3}
                  x2={toSvgX(x)}
                  y2={originY + 3}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                />
                <text
                  x={toSvgX(x)}
                  y={originY + 16}
                  fill="#94a3b8"
                  fontSize={10}
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {x}
                </text>
              </g>
            ))}

            {yTicks.map((y) => (
              <g key={`ty-${y}`}>
                <line
                  x1={originX - 3}
                  y1={toSvgY(y)}
                  x2={originX + 3}
                  y2={toSvgY(y)}
                  stroke="#94a3b8"
                  strokeWidth={1.5}
                />
                {y !== 0 && (
                  <text
                    x={originX - 8}
                    y={toSvgY(y) + 4}
                    fill="#94a3b8"
                    fontSize={10}
                    fontFamily="monospace"
                    textAnchor="end"
                  >
                    {y}
                  </text>
                )}
              </g>
            ))}
          </g>

          {/* Points Revelation (Stage 1+) */}
          {internalStep >= 1 && (
            <g>
              {(content.dataPoints || [
                { x: 0, y: currentC, label: `(0, ${currentC})` },
                { x: 2, y: currentM * 2 + currentC, label: `(2, ${currentM * 2 + currentC})` },
                { x: 4, y: currentM * 4 + currentC, label: `(4, ${currentM * 4 + currentC})` },
              ]).map((pt, i) => (
                <g key={`dp-${i}`}>
                  <circle
                    cx={toSvgX(pt.x)}
                    cy={toSvgY(pt.y)}
                    r={5}
                    fill="#f59e0b"
                    stroke="#ffffff"
                    strokeWidth={1.5}
                  />
                  {pt.label && (
                    <text
                      x={toSvgX(pt.x) + 8}
                      y={toSvgY(pt.y) - 6}
                      fill="#fde68a"
                      fontSize={11}
                      fontFamily="monospace"
                    >
                      {pt.label}
                    </text>
                  )}
                </g>
              ))}
            </g>
          )}

          {/* Continuous Line Plot (Stage 2+) */}
          {internalStep >= 2 && pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#10b981"
              strokeWidth={3.5}
              strokeLinecap="round"
            />
          )}

          {/* Intercept Highlight (Stage 3+) */}
          {internalStep >= 3 && (
            <g>
              <circle
                cx={toSvgX(0)}
                cy={toSvgY(currentC)}
                r={7}
                fill="#ec4899"
                stroke="#ffffff"
                strokeWidth={2}
              />
              <text
                x={toSvgX(0) + 12}
                y={toSvgY(currentC) + 4}
                fill="#f472b6"
                fontSize={12}
                fontFamily="monospace"
                fontWeight="bold"
              >
                y-intercept c = {currentC}
              </text>
            </g>
          )}

          {/* Slope Triangle Revelation (Stage 4+) */}
          {internalStep >= 4 && (
            <g>
              <line
                x1={toSvgX(triX1)}
                y1={toSvgY(triY1)}
                x2={toSvgX(triX2)}
                y2={toSvgY(triY1)}
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="4,3"
              />
              <line
                x1={toSvgX(triX2)}
                y1={toSvgY(triY1)}
                x2={toSvgX(triX2)}
                y2={toSvgY(triY2)}
                stroke="#38bdf8"
                strokeWidth={2}
                strokeDasharray="4,3"
              />
              <text
                x={(toSvgX(triX1) + toSvgX(triX2)) / 2}
                y={toSvgY(triY1) + 14}
                fill="#38bdf8"
                fontSize={11}
                fontFamily="monospace"
                textAnchor="middle"
              >
                Delta x = {(triX2 - triX1).toFixed(1)}
              </text>
              <text
                x={toSvgX(triX2) + 8}
                y={(toSvgY(triY1) + toSvgY(triY2)) / 2 + 4}
                fill="#38bdf8"
                fontSize={11}
                fontFamily="monospace"
              >
                Delta y = {(triY2 - triY1).toFixed(1)}
              </text>
              <text
                x={toSvgX(triX1) - 10}
                y={toSvgY(triY2) - 12}
                fill="#4ade80"
                fontSize={12}
                fontFamily="monospace"
                fontWeight="bold"
              >
                Slope m = Delta y / Delta x = {currentM}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Interactive Controls & Progressive Step Toolbar */}
      <div className="p-3 bg-[#0d1c13] border-t border-emerald-900/60 space-y-2.5">
        {/* Step Buttons */}
        <div className="flex items-center justify-between gap-1 overflow-x-auto pb-1">
          {[
            { idx: 0, label: '1. Axes' },
            { idx: 1, label: '2. Points' },
            { idx: 2, label: '3. Line' },
            { idx: 3, label: '4. Intercept' },
            { idx: 4, label: '5. Slope Triangle' },
          ].map((step) => (
            <button
              key={step.idx}
              onClick={() => setInternalStep(step.idx)}
              className={`px-2.5 py-1 text-[11px] rounded-lg font-mono transition-all shrink-0 cursor-pointer ${
                internalStep === step.idx
                  ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                  : 'bg-emerald-950/70 text-emerald-300 hover:bg-emerald-900/60'
              }`}
            >
              {step.label}
            </button>
          ))}
        </div>

        {/* Live Variable Sliders */}
        {content.variables && content.variables.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-emerald-950">
            {content.variables.map((variable) => (
              <div key={variable.name} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs font-mono">
                  <span className="text-emerald-300">{variable.label || variable.name}:</span>
                  <span className="font-bold text-cyan-300">
                    {variables[variable.name] ?? variable.current} {variable.unit || ''}
                  </span>
                </div>
                <input
                  type="range"
                  min={variable.min}
                  max={variable.max}
                  step={variable.step || 0.5}
                  value={variables[variable.name] ?? variable.current}
                  onChange={(e) => handleSliderChange(variable.name, parseFloat(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-emerald-950 rounded-lg cursor-pointer"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
