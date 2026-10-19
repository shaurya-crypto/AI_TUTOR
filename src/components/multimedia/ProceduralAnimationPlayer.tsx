'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import { ProceduralAnimationContent } from '@/types/lessonManifest'
import { Play, Pause, RotateCcw, Sparkles } from 'lucide-react'

interface ProceduralAnimationPlayerProps {
  content: ProceduralAnimationContent
  autoPlay?: boolean
  isPlaying?: boolean
  onTogglePlay?: (playing: boolean) => void
  onComplete?: () => void
}

export function ProceduralAnimationPlayer({
  content,
  autoPlay = true,
  isPlaying: externalIsPlaying,
  onTogglePlay,
  onComplete,
}: ProceduralAnimationPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [isPlaying, setIsPlaying] = useState<boolean>(
    externalIsPlaying !== undefined ? externalIsPlaying : autoPlay
  )
  const [progress, setProgress] = useState<number>(0)
  const animationFrameRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(Date.now())
  const pausedTimeRef = useRef<number>(0)

  const durationMs = (content.durationSeconds || 8) * 1000

  // Sync external isPlaying state if provided
  useEffect(() => {
    if (externalIsPlaying !== undefined) {
      if (externalIsPlaying && !isPlaying) {
        startTimeRef.current = Date.now() - pausedTimeRef.current
        setIsPlaying(true)
      } else if (!externalIsPlaying && isPlaying) {
        pausedTimeRef.current = (Date.now() - startTimeRef.current) % durationMs
        setIsPlaying(false)
      }
    }
  }, [externalIsPlaying, isPlaying, durationMs])

  // 1. Projectile Motion Renderer
  const renderProjectile = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, tNorm: number) => {
      ctx.clearRect(0, 0, width, height)

      // Background ground
      ctx.fillStyle = '#1e293b'
      ctx.fillRect(0, height - 40, width, 40)
      ctx.strokeStyle = '#475569'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(0, height - 40)
      ctx.lineTo(width, height - 40)
      ctx.stroke()

      const originX = 60
      const originY = height - 40
      const v0 = 85
      const angleDeg = 45
      const angleRad = (angleDeg * Math.PI) / 180
      const g = 9.8

      const totalFlightTime = (2 * v0 * Math.sin(angleRad)) / g
      const t = tNorm * totalFlightTime

      // Draw trajectory parabola
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 2
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      for (let s = 0; s <= totalFlightTime; s += 0.2) {
        const px = originX + v0 * Math.cos(angleRad) * s * 2.2
        const py = originY - (v0 * Math.sin(angleRad) * s - 0.5 * g * s * s) * 2.2
        if (s === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
      ctx.setLineDash([])

      // Current ball position
      const curX = originX + v0 * Math.cos(angleRad) * t * 2.2
      const curY = originY - (v0 * Math.sin(angleRad) * t - 0.5 * g * t * t) * 2.2

      // Ball
      ctx.fillStyle = '#f59e0b'
      ctx.beginPath()
      ctx.arc(curX, curY, 8, 0, Math.PI * 2)
      ctx.fill()

      // Velocity vectors (vx, vy)
      const curVx = v0 * Math.cos(angleRad)
      const curVy = v0 * Math.sin(angleRad) - g * t

      ctx.strokeStyle = '#10b981'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(curX, curY)
      ctx.lineTo(curX + curVx * 0.5, curY)
      ctx.stroke()

      ctx.strokeStyle = '#ef4444'
      ctx.beginPath()
      ctx.moveTo(curX, curY)
      ctx.lineTo(curX, curY - curVy * 0.5)
      ctx.stroke()

      // Annotation text
      ctx.fillStyle = '#f8fafc'
      ctx.font = '12px monospace'
      ctx.fillText(`Trajectory: y = x*tan(theta) - (g*x^2)/(2*v0^2*cos^2(theta))`, 40, 30)
      ctx.fillStyle = '#10b981'
      ctx.fillText(`vx = ${(curVx).toFixed(1)} m/s (Constant)`, 40, 52)
      ctx.fillStyle = '#ef4444'
      ctx.fillText(`vy = ${(curVy).toFixed(1)} m/s`, 40, 72)
    },
    []
  )

  // 2. Wave Propagation Renderer
  const renderWave = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, tNorm: number) => {
      ctx.clearRect(0, 0, width, height)

      const midY = height / 2
      const amplitude = 50
      const wavelength = 140
      const k = (2 * Math.PI) / wavelength
      const omega = 4 * Math.PI
      const phase = omega * tNorm

      // Center reference line
      ctx.strokeStyle = '#334155'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(30, midY)
      ctx.lineTo(width - 30, midY)
      ctx.stroke()

      // Traveling Wave: y(x, t) = A sin(kx - omega*t)
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let x = 30; x <= width - 30; x += 3) {
        const y = midY - amplitude * Math.sin(k * (x - 30) - phase)
        if (x === 30) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()

      // Particle oscillation markers
      const samplePoints = [80, 160, 240, 320, 400]
      samplePoints.forEach((px) => {
        const py = midY - amplitude * Math.sin(k * (px - 30) - phase)
        ctx.fillStyle = '#f43f5e'
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fill()
      })

      // Formula annotation
      ctx.fillStyle = '#6ee7b7'
      ctx.font = '13px monospace'
      ctx.fillText('Transverse Traveling Wave: y(x, t) = A * sin(kx - omega*t)', 30, 32)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '11px monospace'
      ctx.fillText('Red points oscillate perpendicularly; energy propagates forward ->', 30, 52)
    },
    []
  )

  // 3. Circuit Flow Renderer
  const renderCircuit = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, tNorm: number) => {
      ctx.clearRect(0, 0, width, height)

      const left = 60
      const top = 50
      const rectW = width - 120
      const rectH = height - 100

      // Wire loop
      ctx.strokeStyle = '#38bdf8'
      ctx.lineWidth = 4
      ctx.strokeRect(left, top, rectW, rectH)

      // Battery on top wire
      ctx.fillStyle = '#0b140f'
      ctx.fillRect(width / 2 - 30, top - 15, 60, 30)
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 4
      ctx.beginPath()
      ctx.moveTo(width / 2 - 10, top - 15)
      ctx.lineTo(width / 2 - 10, top + 15)
      ctx.stroke()
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(width / 2 + 10, top - 8)
      ctx.lineTo(width / 2 + 10, top + 8)
      ctx.stroke()

      // Resistor on bottom wire
      ctx.fillRect(width / 2 - 40, top + rectH - 15, 80, 30)
      ctx.strokeStyle = '#fbbf24'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(width / 2 - 35, top + rectH)
      ctx.lineTo(width / 2 - 25, top + rectH - 10)
      ctx.lineTo(width / 2 - 10, top + rectH + 10)
      ctx.lineTo(width / 2 + 10, top + rectH - 10)
      ctx.lineTo(width / 2 + 25, top + rectH + 10)
      ctx.lineTo(width / 2 + 35, top + rectH)
      ctx.stroke()

      // Drifting electrons (animated counter-clockwise)
      const perimeter = 2 * (rectW + rectH)
      const numElectrons = 16
      ctx.fillStyle = '#facc15'

      for (let i = 0; i < numElectrons; i++) {
        const offset = ((tNorm + i / numElectrons) % 1) * perimeter
        let ex = left
        let ey = top

        if (offset < rectW) {
          ex = left + offset
          ey = top
        } else if (offset < rectW + rectH) {
          ex = left + rectW
          ey = top + (offset - rectW)
        } else if (offset < 2 * rectW + rectH) {
          ex = left + rectW - (offset - (rectW + rectH))
          ey = top + rectH
        } else {
          ex = left
          ey = top + rectH - (offset - (2 * rectW + rectH))
        }

        ctx.beginPath()
        ctx.arc(ex, ey, 4, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = '#6ee7b7'
      ctx.font = '13px monospace'
      ctx.fillText('Electric Current: Continuous Charge Drift (I = Q / t)', 40, 28)
      ctx.fillStyle = '#fbbf24'
      ctx.fillText('Resistor R = 6 Ohm | Battery V = 12 V | I = 2 A', 40, height - 15)
    },
    []
  )

  // 4. Pendulum Renderer
  const renderPendulum = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, tNorm: number) => {
      ctx.clearRect(0, 0, width, height)

      const pivotX = width / 2
      const pivotY = 50
      const length = 180
      const thetaMax = (30 * Math.PI) / 180
      const omega = 2 * Math.PI * 2 // 2 cycles
      const theta = thetaMax * Math.cos(omega * tNorm)

      const bobX = pivotX + length * Math.sin(theta)
      const bobY = pivotY + length * Math.cos(theta)

      // Pivot
      ctx.fillStyle = '#64748b'
      ctx.fillRect(pivotX - 30, pivotY - 8, 60, 8)
      ctx.beginPath()
      ctx.arc(pivotX, pivotY, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#cbd5e1'
      ctx.fill()

      // String
      ctx.strokeStyle = '#94a3b8'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(pivotX, pivotY)
      ctx.lineTo(bobX, bobY)
      ctx.stroke()

      // Bob
      ctx.fillStyle = '#38bdf8'
      ctx.beginPath()
      ctx.arc(bobX, bobY, 14, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Annotation
      ctx.fillStyle = '#6ee7b7'
      ctx.font = '13px monospace'
      ctx.fillText('Simple Harmonic Motion: T = 2 * pi * sqrt(L / g)', 40, 28)
      ctx.fillStyle = '#94a3b8'
      ctx.font = '11px monospace'
      ctx.fillText(`Displacement theta = ${(theta * 180 / Math.PI).toFixed(1)} deg`, 40, height - 15)
    },
    []
  )

  // 5. Optics Ray Trace Renderer
  const renderOptics = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number, tNorm: number) => {
      ctx.clearRect(0, 0, width, height)

      const midY = height / 2

      // Interface
      ctx.strokeStyle = '#64748b'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(40, midY)
      ctx.lineTo(width - 40, midY)
      ctx.stroke()

      // Normal
      ctx.strokeStyle = '#facc15'
      ctx.lineWidth = 1.5
      ctx.setLineDash([4, 4])
      ctx.beginPath()
      ctx.moveTo(width / 2, 40)
      ctx.lineTo(width / 2, height - 40)
      ctx.stroke()
      ctx.setLineDash([])

      // Incident ray animating down to interface
      const incidentProgress = Math.min(1, tNorm * 2)
      const incStartX = width / 2 - 120
      const incStartY = midY - 90
      const hitX = width / 2
      const hitY = midY

      ctx.strokeStyle = '#f43f5e'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(incStartX, incStartY)
      ctx.lineTo(
        incStartX + (hitX - incStartX) * incidentProgress,
        incStartY + (hitY - incStartY) * incidentProgress
      )
      ctx.stroke()

      // Refracted ray animating from interface down into denser medium
      if (tNorm > 0.5) {
        const refrProgress = (tNorm - 0.5) * 2
        const refrEndX = width / 2 + 70
        const refrEndY = midY + 100

        ctx.strokeStyle = '#38bdf8'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(hitX, hitY)
        ctx.lineTo(
          hitX + (refrEndX - hitX) * refrProgress,
          hitY + (refrEndY - hitY) * refrProgress
        )
        ctx.stroke()
      }

      ctx.fillStyle = '#93c5fd'
      ctx.font = '13px monospace'
      ctx.fillText('Snell Law: n1 * sin(i) = n2 * sin(r)', 40, 28)
      ctx.fillStyle = '#bae6fd'
      ctx.font = '11px monospace'
      ctx.fillText('Medium 1: Air (n1 = 1.0) | Medium 2: Glass (n2 = 1.5)', 40, height - 15)
    },
    []
  )

  // Main animation frame loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let isMounted = true

    const loop = () => {
      if (!isMounted) return

      const now = Date.now()
      const elapsed = isPlaying
        ? (now - startTimeRef.current) % durationMs
        : pausedTimeRef.current

      const tNorm = elapsed / durationMs
      setProgress(tNorm)

      const w = canvas.width
      const h = canvas.height

      if (content.animationType === 'projectile_motion') {
        renderProjectile(ctx, w, h, tNorm)
      } else if (content.animationType === 'wave_propagation') {
        renderWave(ctx, w, h, tNorm)
      } else if (content.animationType === 'pendulum') {
        renderPendulum(ctx, w, h, tNorm)
      } else if (content.animationType === 'optics_ray_trace') {
        renderOptics(ctx, w, h, tNorm)
      } else {
        renderCircuit(ctx, w, h, tNorm)
      }

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(loop)
      }
    }

    loop()

    return () => {
      isMounted = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isPlaying, durationMs, content.animationType, renderProjectile, renderWave, renderCircuit, renderPendulum, renderOptics])

  const togglePlay = () => {
    if (isPlaying) {
      pausedTimeRef.current = (Date.now() - startTimeRef.current) % durationMs
      setIsPlaying(false)
      onTogglePlay?.(false)
    } else {
      startTimeRef.current = Date.now() - pausedTimeRef.current
      setIsPlaying(true)
      onTogglePlay?.(true)
    }
  }

  const handleReset = () => {
    startTimeRef.current = Date.now()
    pausedTimeRef.current = 0
    setProgress(0)
    setIsPlaying(true)
    onTogglePlay?.(true)
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#0b140f] rounded-2xl overflow-hidden border border-emerald-900/60 shadow-xl text-emerald-100">
      {/* Top Header */}
      <div className="px-4 py-2.5 bg-[#122419] border-b border-emerald-900/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <h4 className="text-xs font-semibold tracking-wide text-white uppercase font-mono">
            {content.animationType.replace(/_/g, ' ')} Animation
          </h4>
        </div>
        <span className="text-[11px] font-mono text-emerald-400">
          {(progress * (content.durationSeconds || 8)).toFixed(1)}s / {(content.durationSeconds || 8)}s
        </span>
      </div>

      {/* Canvas Element */}
      <div className="flex-1 relative w-full h-full min-h-[220px] flex items-center justify-center bg-[#09110c] p-2">
        <canvas
          ref={canvasRef}
          width={520}
          height={300}
          className="w-full h-full max-h-[340px] rounded-lg"
        />
      </div>

      {/* Controls Bar */}
      <div className="px-4 py-2.5 bg-[#0d1c13] border-t border-emerald-900/60 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlay}
            className="p-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer transition-colors shadow-xs"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/60 cursor-pointer transition-colors"
            title="Replay Animation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Scrub progress bar */}
        <div className="flex-1 h-1.5 bg-emerald-950 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-400 transition-all duration-75"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
