'use client'

import React, { useState, useEffect } from 'react'
import { DiagramContent, DiagramLabel } from '@/types/lessonManifest'
import { Layers, Info, CheckCircle2 } from 'lucide-react'

interface EducationalDiagramPlayerProps {
  content: DiagramContent
  activeStep?: number
  onStepChange?: (step: number) => void
}

export function EducationalDiagramPlayer({
  content,
  activeStep = 0,
  onStepChange,
}: EducationalDiagramPlayerProps) {
  const [currentStep, setCurrentStep] = useState<number>(activeStep)
  const [selectedLabel, setSelectedLabel] = useState<DiagramLabel | null>(null)

  useEffect(() => {
    setCurrentStep(activeStep)
  }, [activeStep])

  const handleStepSelect = (step: number) => {
    setCurrentStep(step)
    onStepChange?.(step)
  }

  const progressiveSteps = content.progressiveSteps || []
  const currentStepInfo = progressiveSteps[currentStep] || null

  const isLabelVisible = (label: DiagramLabel) => {
    if (label.revealStep === undefined) return true
    return currentStep >= label.revealStep
  }

  const isLabelActive = (label: DiagramLabel) => {
    if (!currentStepInfo) return false
    return currentStepInfo.activeLabelIds.includes(label.id)
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#0b140f] rounded-2xl overflow-hidden border border-emerald-900/60 shadow-xl text-emerald-100">
      {/* Header bar */}
      <div className="px-4 py-2.5 bg-[#122419] border-b border-emerald-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h4 className="text-xs font-semibold tracking-wide text-white uppercase font-mono">
            {content.title || 'Structured Educational Diagram'}
          </h4>
        </div>

        {progressiveSteps.length > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 font-mono">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>Step {currentStep + 1} of {progressiveSteps.length}</span>
          </div>
        )}
      </div>

      {/* SVG Canvas Area */}
      <div className="flex-1 relative w-full h-full min-h-[220px] flex items-center justify-center p-3 bg-[#0a120e]">
        <svg
          viewBox="0 0 500 320"
          className="w-full h-full max-h-[360px] select-none"
        >
          {/* 1. Free Body Diagram */}
          {content.diagramType === 'forces_fbd' && (
            <g>
              {/* Floor Surface */}
              <line x1="60" y1="240" x2="440" y2="240" stroke="#475569" strokeWidth="3" />
              {/* Surface hatch */}
              {[80, 120, 160, 200, 240, 280, 320, 360, 400].map((x) => (
                <line key={x} x1={x} y1="240" x2={x - 12} y2="252" stroke="#334155" strokeWidth="1.5" />
              ))}

              {/* Block Mass m */}
              <rect x="200" y="140" width="100" height="100" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" rx="4" />
              <text x="250" y="195" fill="#f8fafc" fontSize="16" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                m = 5 kg
              </text>

              {/* Normal Force N (upward) */}
              <g opacity={currentStep >= 1 ? 1 : 0.25} className="transition-opacity duration-300">
                <line x1="250" y1="140" x2="250" y2="50" stroke="#38bdf8" strokeWidth="3.5" />
                <polygon points="250,40 244,55 256,55" fill="#38bdf8" />
                <text x="262" y="65" fill="#38bdf8" fontSize="13" fontFamily="monospace" fontWeight="bold">
                  N (Normal Force)
                </text>
              </g>

              {/* Gravity Force W = mg (downward) */}
              <g opacity={currentStep >= 0 ? 1 : 0.25} className="transition-opacity duration-300">
                <line x1="250" y1="240" x2="250" y2="310" stroke="#f43f5e" strokeWidth="3.5" />
                <polygon points="250,318 244,305 256,305" fill="#f43f5e" />
                <text x="262" y="305" fill="#f43f5e" fontSize="13" fontFamily="monospace" fontWeight="bold">
                  W = mg (49 N)
                </text>
              </g>

              {/* Applied Force F_a (right) */}
              <g opacity={currentStep >= 2 ? 1 : 0.25} className="transition-opacity duration-300">
                <line x1="300" y1="190" x2="410" y2="190" stroke="#4ade80" strokeWidth="3.5" />
                <polygon points="418,190 405,184 405,196" fill="#4ade80" />
                <text x="350" y="178" fill="#4ade80" fontSize="13" fontFamily="monospace" fontWeight="bold">
                  F_app (25 N)
                </text>
              </g>

              {/* Friction Force f_k (left) */}
              <g opacity={currentStep >= 3 ? 1 : 0.25} className="transition-opacity duration-300">
                <line x1="200" y1="235" x2="110" y2="235" stroke="#fbbf24" strokeWidth="3.5" />
                <polygon points="102,235 115,229 115,241" fill="#fbbf24" />
                <text x="110" y="222" fill="#fbbf24" fontSize="13" fontFamily="monospace" fontWeight="bold">
                  f_k = mu*N
                </text>
              </g>
            </g>
          )}

          {/* 2. Ray Optics Diagram */}
          {content.diagramType === 'ray_optics' && (
            <g>
              {/* Principal Optical Axis */}
              <line x1="40" y1="160" x2="460" y2="160" stroke="#64748b" strokeWidth="1.5" strokeDasharray="5,4" />

              {/* Convex Lens */}
              <path d="M 250 50 Q 275 160 250 270 Q 225 160 250 50" fill="#38bdf8" fillOpacity="0.2" stroke="#38bdf8" strokeWidth="2.5" />
              <line x1="250" y1="40" x2="250" y2="280" stroke="#38bdf8" strokeWidth="1" strokeDasharray="3,3" />

              {/* Focal Points */}
              <circle cx="170" cy="160" r="3.5" fill="#facc15" />
              <text x="170" y="180" fill="#facc15" fontSize="12" fontFamily="monospace" textAnchor="middle">F1</text>
              <circle cx="330" cy="160" r="3.5" fill="#facc15" />
              <text x="330" y="180" fill="#facc15" fontSize="12" fontFamily="monospace" textAnchor="middle">F2</text>
              <circle cx="90" cy="160" r="3.5" fill="#facc15" />
              <text x="90" y="180" fill="#facc15" fontSize="12" fontFamily="monospace" textAnchor="middle">2F1</text>
              <circle cx="410" cy="160" r="3.5" fill="#facc15" />
              <text x="410" y="180" fill="#facc15" fontSize="12" fontFamily="monospace" textAnchor="middle">2F2</text>

              {/* Object Arrow Beyond 2F1 */}
              <g opacity={currentStep >= 0 ? 1 : 0.25}>
                <line x1="60" y1="160" x2="60" y2="90" stroke="#4ade80" strokeWidth="3.5" />
                <polygon points="60,82 54,95 66,95" fill="#4ade80" />
                <text x="60" y="75" fill="#4ade80" fontSize="11" fontFamily="monospace" textAnchor="middle">Object AB</text>
              </g>

              {/* Ray 1: Parallel to axis then through F2 */}
              <g opacity={currentStep >= 1 ? 1 : 0.1}>
                <line x1="60" y1="90" x2="250" y2="90" stroke="#ef4444" strokeWidth="2" />
                <line x1="250" y1="90" x2="410" y2="210" stroke="#ef4444" strokeWidth="2" />
                <polygon points="160,90 150,86 150,94" fill="#ef4444" />
                <polygon points="340,157 332,151 338,161" fill="#ef4444" />
              </g>

              {/* Ray 2: Through optical center O without deviation */}
              <g opacity={currentStep >= 2 ? 1 : 0.1}>
                <line x1="60" y1="90" x2="410" y2="210" stroke="#a855f7" strokeWidth="2" />
                <polygon points="150,121 140,116 144,125" fill="#a855f7" />
              </g>

              {/* Real Inverted Image A'B' */}
              <g opacity={currentStep >= 3 ? 1 : 0.1}>
                <line x1="375" y1="160" x2="375" y2="195" stroke="#f472b6" strokeWidth="3" />
                <polygon points="375,202 369,190 381,190" fill="#f472b6" />
                <text x="375" y="222" fill="#f472b6" fontSize="11" fontFamily="monospace" textAnchor="middle">
                  Real Image (Inverted)
                </text>
              </g>
            </g>
          )}

          {/* 3. Electric Circuit Diagram */}
          {content.diagramType === 'electric_circuit' && (
            <g>
              <rect x="70" y="60" width="360" height="200" fill="none" stroke="#38bdf8" strokeWidth="3" rx="8" />

              {/* Battery at top */}
              <line x1="230" y1="50" x2="230" y2="70" stroke="#ef4444" strokeWidth="3.5" />
              <line x1="245" y1="55" x2="245" y2="65" stroke="#ef4444" strokeWidth="2" />
              <line x1="255" y1="50" x2="255" y2="70" stroke="#ef4444" strokeWidth="3.5" />
              <line x1="270" y1="55" x2="270" y2="65" stroke="#ef4444" strokeWidth="2" />
              <text x="250" y="40" fill="#ef4444" fontSize="12" fontFamily="monospace" textAnchor="middle">Battery V (12V)</text>

              {/* Resistor R1 */}
              <g opacity={currentStep >= 1 ? 1 : 0.3}>
                <path d="M 120 260 L 130 250 L 145 270 L 160 250 L 175 270 L 190 250 L 200 260" stroke="#fbbf24" strokeWidth="3" fill="none" />
                <text x="160" y="290" fill="#fbbf24" fontSize="12" fontFamily="monospace" textAnchor="middle">R1 = 4 Ohm</text>
              </g>

              {/* Resistor R2 */}
              <g opacity={currentStep >= 2 ? 1 : 0.3}>
                <path d="M 300 260 L 310 250 L 325 270 L 340 250 L 355 270 L 370 250 L 380 260" stroke="#a78bfa" strokeWidth="3" fill="none" />
                <text x="340" y="290" fill="#a78bfa" fontSize="12" fontFamily="monospace" textAnchor="middle">R2 = 2 Ohm</text>
              </g>

              {/* Ammeter */}
              <circle cx="70" cy="160" r="18" fill="#1e293b" stroke="#4ade80" strokeWidth="2" />
              <text x="70" y="165" fill="#4ade80" fontSize="13" fontFamily="monospace" fontWeight="bold" textAnchor="middle">A</text>
              <text x="35" y="165" fill="#4ade80" fontSize="11" fontFamily="monospace">I = 2A</text>

              {/* Current flow arrows */}
              <polygon points="120,60 110,56 110,64" fill="#38bdf8" />
              <polygon points="430,170 426,180 434,180" fill="#38bdf8" />
            </g>
          )}

          {/* 4. Default / Bohr Atom / Biological Diagram */}
          {content.diagramType !== 'forces_fbd' &&
            content.diagramType !== 'ray_optics' &&
            content.diagramType !== 'electric_circuit' && (
              <g>
                <circle cx="250" cy="160" r="28" fill="#ef4444" stroke="#f87171" strokeWidth="3" />
                <text x="250" y="165" fill="#ffffff" fontSize="12" fontFamily="monospace" fontWeight="bold" textAnchor="middle">Nucleus</text>

                {/* Shell 1 (K) */}
                <ellipse cx="250" cy="160" rx="75" ry="50" fill="none" stroke="#38bdf8" strokeWidth="2" strokeDasharray="4,3" />
                <circle cx="175" cy="160" r="5" fill="#38bdf8" />
                <circle cx="325" cy="160" r="5" fill="#38bdf8" />

                {/* Shell 2 (L) */}
                <ellipse cx="250" cy="160" rx="140" ry="90" fill="none" stroke="#4ade80" strokeWidth="2" strokeDasharray="4,3" />
                <circle cx="250" cy="70" r="5" fill="#4ade80" />
                <circle cx="250" cy="250" r="5" fill="#4ade80" />
                <circle cx="110" cy="160" r="5" fill="#4ade80" />
                <circle cx="390" cy="160" r="5" fill="#4ade80" />
              </g>
            )}

          {/* Dynamic Labels Overlay */}
          {content.labels.map((label) => {
            if (!isLabelVisible(label)) return null
            const isActive = isLabelActive(label)
            const cx = (label.x / 100) * 500
            const cy = (label.y / 100) * 320

            return (
              <g
                key={label.id}
                className="cursor-pointer"
                onClick={() => setSelectedLabel(label)}
              >
                <circle
                  cx={cx}
                  cy={cy}
                  r={isActive ? 7 : 5}
                  fill={isActive ? '#38bdf8' : '#10b981'}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                />
                <text
                  x={cx + 9}
                  y={cy + 4}
                  fill={isActive ? '#38bdf8' : '#e2e8f0'}
                  fontSize={11}
                  fontFamily="monospace"
                  fontWeight={isActive ? 'bold' : 'normal'}
                >
                  {label.text}
                </text>
              </g>
            )
          })}
        </svg>
      </div>

      {/* Progressive Step Explanation & Stepper */}
      {progressiveSteps.length > 0 && (
        <div className="p-3 bg-[#0d1c13] border-t border-emerald-900/60 space-y-2">
          {/* Step Pill Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {progressiveSteps.map((step, idx) => (
              <button
                key={step.step}
                onClick={() => handleStepSelect(idx)}
                className={`px-3 py-1 text-[11px] rounded-lg font-mono transition-all shrink-0 cursor-pointer ${
                  currentStep === idx
                    ? 'bg-emerald-600 text-white font-semibold shadow-xs'
                    : 'bg-emerald-950/70 text-emerald-300 hover:bg-emerald-900/60'
                }`}
              >
                {step.title}
              </button>
            ))}
          </div>

          {/* Step Narrative */}
          {currentStepInfo && (
            <div className="p-2 rounded-xl bg-black/40 border border-emerald-900/40 text-xs text-emerald-200/90 font-mono leading-relaxed">
              <span className="text-cyan-300 font-bold mr-1.5">{currentStepInfo.title}:</span>
              <span>{currentStepInfo.description}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
