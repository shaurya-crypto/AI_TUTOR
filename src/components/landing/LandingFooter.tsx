'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { BookOpen } from 'lucide-react'

export function LandingFooter() {
  return (
    <footer className="relative overflow-hidden py-16 sm:py-20">
      {/* Background Cloud Layer Merging All Page Content */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Image
          src="/landing_images/hero-clouds.jpg"
          alt="Atmospheric clouds softly merging footer content"
          fill
          sizes="100vw"
          className="object-cover object-bottom opacity-35 mix-blend-multiply"
        />
      </div>

      {/* Atmospheric Shadow Shade and Soft Ivory Gradient Veils for Seamless Merge */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none shadow-[inset_0_50px_60px_-20px_rgba(23,24,23,0.15),inset_0_-40px_50px_rgba(23,24,23,0.1)]"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 z-[1] pointer-events-none bg-gradient-to-b from-canvas-ivory via-canvas-ivory/75 to-canvas-ivory/95"
        aria-hidden="true"
      />

      {/* Footer Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-12 items-start">
          {/* Brand & Editorial Ethos */}
          <div className="sm:col-span-2 lg:col-span-6 flex flex-col items-start">
            <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-85">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border-strong bg-surface-white text-coral-primary shadow-xs">
                <BookOpen className="h-4 w-4" />
              </div>
              <span className="font-serif text-2xl tracking-tight text-ink-primary">
                AI Tutor
              </span>
            </Link>

            <p className="mt-3.5 max-w-md text-sm leading-relaxed text-ink-secondary">
              Classical Intelligence &times; Modern Learning. A dedicated Socratic voice tutor with a live
              mathematical chalkboard, designed for genuine conceptual understanding from first principles.
            </p>

            <p className="mt-4 font-mono text-xs text-ink-muted tracking-wide">
              Dialogue &bull; Live Derivations &bull; Spatial Clarity
            </p>
          </div>

          {/* Platform Architecture */}
          <div className="sm:col-span-1 lg:col-span-3 flex flex-col">
            <span className="font-mono text-xs uppercase tracking-wider text-ink-primary">
              Platform Architecture
            </span>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-secondary">
              <li>
                <a href="#what-it-is" className="transition-colors hover:text-ink-primary">
                  The Socratic Engine
                </a>
              </li>
              <li>
                <a href="#experience" className="transition-colors hover:text-ink-primary">
                  Live Mathematical Chalkboard
                </a>
              </li>
              <li>
                <a href="#experience" className="transition-colors hover:text-ink-primary">
                  Interactive 3D Physical Models
                </a>
              </li>
              <li>
                <a href="#flow" className="transition-colors hover:text-ink-primary">
                  Three Stages of Mastery
                </a>
              </li>
            </ul>
          </div>

          {/* Classroom Access */}
          <div className="sm:col-span-1 lg:col-span-3 flex flex-col">
            <span className="font-mono text-xs uppercase tracking-wider text-ink-primary">
              Classroom Access
            </span>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-secondary">
              <li>
                <Link href="/onboarding" className="transition-colors hover:text-ink-primary">
                  Start Learning (Sign Up)
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-ink-primary">
                  Student Sign In
                </Link>
              </li>
              <li>
                <Link href="/login" className="transition-colors hover:text-ink-primary">
                  Google Account Sign In
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Rule & Copyright */}
        <div className="mt-14 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border-strong/40 pt-7 text-xs text-ink-muted">
          <p>
            &copy; {new Date().getFullYear()} AI Tutor. Built with Classical Intelligence &times; Modern Learning.
          </p>
          <p className="font-mono text-[11px] text-ink-muted">
            First-Principles Socratic Education &bull; Zero Lecture Monotony
          </p>
        </div>
      </div>
    </footer>
  )
}
