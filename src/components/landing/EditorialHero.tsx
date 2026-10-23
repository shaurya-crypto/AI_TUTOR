'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { motion, useScroll, useTransform, MotionValue } from 'motion/react'

const TOTAL_FRAMES = 144

/**
 * Individual Word component with scroll-driven blur and illumination transition.
 * Transitions smoothly from soft blur + medium opacity to razor-sharp, glowing pure white.
 */
function BlurWord({
  word,
  progress,
  range,
}: {
  word: string
  progress: MotionValue<number>
  range: [number, number]
}) {
  const [start, end] = range
  // Words start softly visible (0.35 opacity) and bloom into 1.0 brilliant white
  const opacity = useTransform(progress, [start, end], [0.35, 1])
  const blurVal = useTransform(progress, [start, end], [12, 0])
  const filter = useTransform(blurVal, (v) => `blur(${v}px)`)
  const y = useTransform(progress, [start, end], [8, 0])

  return (
    <motion.span
      style={{ opacity, filter, y }}
      className="inline-block mx-1 sm:mx-2 md:mx-2.5 will-change-transform will-change-[filter] select-none text-[#FFFFFF]"
    >
      {word}
    </motion.span>
  )
}

/**
 * Single-Sentence Word Blur Component.
 * Illuminates one word at a time on scroll with a monumental, bright white serif italic glow.
 * Normal, editorial, and perfectly legible with subtle calligraphic elegance.
 */
function WordBlurSentence({
  sentence,
  progress,
  revealRange,
  visibilityRange,
}: {
  sentence: string
  progress: MotionValue<number>
  revealRange: [number, number]
  visibilityRange: [number, number, number, number]
}) {
  const words = useMemo(() => sentence.split(' '), [sentence])
  const [revealStart, revealEnd] = revealRange
  const [visInStart, visInEnd, visOutStart, visOutEnd] = visibilityRange

  const containerOpacity = useTransform(
    progress,
    [visInStart, visInEnd, visOutStart, visOutEnd],
    [0, 1, 1, 0]
  )

  const containerY = useTransform(
    progress,
    [visInStart, visInEnd, visOutStart, visOutEnd],
    [28, 0, 0, -24]
  )

  const containerScale = useTransform(
    progress,
    [visInStart, visInEnd, visOutStart, visOutEnd],
    [0.96, 1, 1, 0.98]
  )

  const step = (revealEnd - revealStart) / words.length

  return (
    <motion.div
      style={{
        opacity: containerOpacity,
        y: containerY,
        scale: containerScale,
      }}
      className="absolute inset-0 flex items-center justify-center pointer-events-none px-6 sm:px-12"
    >
      <div className="relative max-w-3xl lg:max-w-4xl text-center py-6 px-4">
        {/* Subtle localized soft back-glow directly behind text for maximum contrast against bright video */}
        <div
          className="absolute inset-0 -inset-x-8 -z-10 rounded-full bg-black/30 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <h2 className="font-serif font-normal not-italic text-[#FFFFFF] text-glow-cinematic text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-[2.65rem] tracking-[-0.015em] leading-[1.32]">
          {words.map((word, idx) => {
            const wStart = revealStart + idx * step
            const wEnd = Math.min(revealEnd, wStart + step * 0.92)
            return (
              <BlurWord
                key={`${word}-${idx}`}
                word={word}
                progress={progress}
                range={[wStart, wEnd]}
              />
            )
          })}
        </h2>
      </div>
    </motion.div>
  )
}

export function EditorialHero() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const currentFrameRef = useRef<number>(1)
  const targetFrameRef = useRef<number>(1)
  const rafIdRef = useRef<number | null>(null)
  const [firstFrameLoaded, setFirstFrameLoaded] = useState(false)

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })

  // Render a specific frame to canvas preserving cover aspect ratio
  const renderFrame = useCallback((frameIndex: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const safeIndex = Math.min(TOTAL_FRAMES, Math.max(1, frameIndex))
    const img = imagesRef.current[safeIndex - 1]
    if (!img || !img.complete || img.naturalWidth === 0) return

    const width = canvas.width
    const height = canvas.height

    ctx.clearRect(0, 0, width, height)

    const imgRatio = img.naturalWidth / img.naturalHeight
    const canvasRatio = width / height

    let drawWidth = width
    let drawHeight = height
    let offsetX = 0
    let offsetY = 0

    if (canvasRatio > imgRatio) {
      drawHeight = width / imgRatio
      offsetY = (height - drawHeight) / 2
    } else {
      drawWidth = height * imgRatio
      offsetX = (width - drawWidth) / 2
    }

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
  }, [])

  // Resize canvas with devicePixelRatio
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const displayWidth = window.innerWidth
    const displayHeight = window.innerHeight

    canvas.width = displayWidth * dpr
    canvas.height = displayHeight * dpr
    canvas.style.width = `${displayWidth}px`
    canvas.style.height = `${displayHeight}px`

    renderFrame(Math.round(currentFrameRef.current))
  }, [renderFrame])

  // Preload and pre-decode all 144 frames to eliminate stutter and freeze
  useEffect(() => {
    const images: HTMLImageElement[] = new Array(TOTAL_FRAMES)
    imagesRef.current = images

    // Load first frame immediately
    const firstImg = new window.Image()
    firstImg.src = '/hero-frames/frame_001.webp'
    firstImg.onload = () => {
      images[0] = firstImg
      setFirstFrameLoaded(true)
      handleResize()
    }
    if (typeof firstImg.decode === 'function') {
      firstImg.decode().catch(() => {})
    }

    // Pre-decode all remaining frames asynchronously
    for (let i = 2; i <= TOTAL_FRAMES; i++) {
      const img = new window.Image()
      const padded = String(i).padStart(3, '0')
      img.src = `/hero-frames/frame_${padded}.webp`
      const idx = i - 1
      img.onload = () => {
        images[idx] = img
      }
      if (typeof img.decode === 'function') {
        img.decode().catch(() => {})
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [handleResize])

  // Continuous Lerp (linear interpolation) animation loop for silky 60fps/120fps scrubbing
  useEffect(() => {
    let isRunning = true

    const tick = () => {
      if (!isRunning) return

      const target = targetFrameRef.current
      const current = currentFrameRef.current
      const diff = target - current

      if (Math.abs(diff) > 0.01) {
        // Damping factor of 0.12 provides responsive yet buttery smooth gliding
        const next = current + diff * 0.12
        currentFrameRef.current = next
        renderFrame(Math.round(next))
      }

      rafIdRef.current = requestAnimationFrame(tick)
    }

    rafIdRef.current = requestAnimationFrame(tick)

    return () => {
      isRunning = false
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current)
    }
  }, [renderFrame])

  // Update target frame smoothly from Lenis-backed scroll progress
  useEffect(() => {
    const unsubscribe = scrollYProgress.on('change', (progress) => {
      const clamped = Math.max(0, Math.min(1, progress))
      targetFrameRef.current = 1 + clamped * (TOTAL_FRAMES - 1)
    })

    return () => unsubscribe()
  }, [scrollYProgress])

  return (
    <div ref={containerRef} id="what-it-is" className="relative h-[250vh]">
      {/* Sticky Full-Viewport Stage with 100% Raw Video Clarity (No Dark or White Overlays) */}
      <div className="sticky top-0 h-screen w-full overflow-hidden flex items-center justify-center">
        {/* Hardware-Accelerated Canvas for Smooth Scrubbing */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 z-0 pointer-events-none transition-opacity duration-700 ${
            firstFrameLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Fallback Poster before first frame decodes */}
        {!firstFrameLoaded && (
          <div
            className="absolute inset-0 z-0 bg-cover bg-center pointer-events-none"
            style={{ backgroundImage: `url('/hero-frames/frame_001.webp')` }}
          />
        )}

        {/* SCENE 1: Single Sentence Word-by-Word Blur Reveal */}
        <WordBlurSentence
          sentence="The new era of education begins in dialogue, not a lecture."
          progress={scrollYProgress}
          revealRange={[0.05, 0.38]}
          visibilityRange={[0.0, 0.05, 0.42, 0.49]}
        />

        {/* SCENE 2: Single Sentence Word-by-Word Blur Reveal */}
        <WordBlurSentence
          sentence="A personal tutor reasoning alongside you, deriving every law live on your chalkboard."
          progress={scrollYProgress}
          revealRange={[0.52, 0.85]}
          visibilityRange={[0.48, 0.53, 0.90, 0.98]}
        />
      </div>
    </div>
  )
}
