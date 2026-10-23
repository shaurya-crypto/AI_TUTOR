'use client'

import React from 'react'
import { ArtworkFrame } from './ArtworkFrame'
import { getArtwork } from '@/lib/landing-artwork'

export function ProductExperience() {
  const scholarArtwork = getArtwork('featureArtwork')
  const handsArtwork = getArtwork('handsArtwork')
  const libraryArtwork = getArtwork('featureLibraryArtwork')

  return (
    <section id="experience" className="relative scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        {/* Section Header: Universal Product Storytelling */}
        <div className="max-w-3xl">
          <p className="font-mono text-xs uppercase tracking-widest text-coral-primary font-medium">
            The Architecture of Inquiry
          </p>
          <h2 className="mt-4 font-serif font-normal text-[clamp(2.2rem,4vw,3.5rem)] leading-[1.12] tracking-tight text-ink-primary">
            Four principles of genuine understanding.
          </h2>
          <p className="mt-4 text-base sm:text-lg leading-relaxed text-ink-secondary">
            Learning is not a monologue. AI Tutor replaces passive video watching with active voice
            reasoning, live chalkboard derivations, and spatial physical clarity.
          </p>
        </div>

        {/* Master Product Editorial Layout */}
        <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Framed Artworks (Sticky on Desktop for Elegant Editorial Flow) */}
          <div className="lg:col-span-6 flex flex-col space-y-8 lg:sticky lg:top-28 self-start">
            {/* The Scholar at the Desk */}
            <div className="relative">
              {/* Decorative Archival Corner accents */}
              <div className="absolute -top-2.5 -left-2.5 h-4 w-4 border-t border-l border-border-strong pointer-events-none" />
              <div className="absolute -bottom-2.5 -right-2.5 h-4 w-4 border-b border-r border-border-strong pointer-events-none" />

              <ArtworkFrame
                artwork={scholarArtwork}
                aspectRatioClass="aspect-[4/3] sm:aspect-[16/11]"
                showCaption={true}
                className="w-full"
              />
            </div>

            {/* Editorial Caption Note */}
            <div className="border-l-2 border-coral-primary/60 pl-4 py-1">
              <p className="font-serif italic text-base text-ink-primary">
                &ldquo;True learning begins when a student is prompted to articulate why, not merely recite what.&rdquo;
              </p>
              <p className="mt-1.5 font-mono text-[11px] text-ink-muted uppercase tracking-wider">
                The Socratic Principle of Education
              </p>
            </div>

            {/* The Great Reading Hall (Library Image) */}
            <div className="relative pt-4">
              <ArtworkFrame
                artwork={libraryArtwork}
                aspectRatioClass="aspect-[16/9]"
                showCaption={true}
                className="w-full"
              />
            </div>
          </div>

          {/* Right Column: Clear, Deep Description of What It Is & Why It Is Best */}
          <div className="lg:col-span-6 flex flex-col space-y-9">
            {/* Principle 1: The Socratic Voice Cadence */}
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                Principle 01
              </span>
              <h3 className="mt-1 font-serif text-2xl text-ink-primary">
                The Socratic Voice Cadence
              </h3>
              <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-ink-secondary">
                Unlike recorded video courses or generic chat windows, the tutor adheres strictly to a 2–3
                sentence rule: it never speaks continuously without engaging the student or checking understanding.
                Every fundamental law is introduced first through everyday physical intuition before formal
                mathematical statement.
              </p>
            </div>

            {/* Principle 2: Live Chalkboard as Single Source of Truth */}
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                Principle 02
              </span>
              <h3 className="mt-1 font-serif text-2xl text-ink-primary">
                Live Chalkboard as the Single Source of Truth
              </h3>
              <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-ink-secondary">
                As the lesson unfolds, the tutor writes derivations, given parameters, and calculation steps
                live on the green chalkboard. There is no separate post-session notes generation — the live chalkboard
                drawings and handwritten steps themselves are preserved directly as your permanent Master Notes.
              </p>

              {/* Guiding Hand Derivations Artwork Frame */}
              <div className="mt-5 max-w-md">
                <ArtworkFrame
                  artwork={handsArtwork}
                  aspectRatioClass="aspect-[16/10] sm:aspect-[16/9]"
                  showCaption={true}
                  className="w-full"
                />
              </div>
            </div>

            {/* Principle 3: First-Principles Derivations */}
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                Principle 03
              </span>
              <h3 className="mt-1 font-serif text-2xl text-ink-primary">
                First-Principles Derivation Over Rote Memorization
              </h3>
              <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-ink-secondary">
                Formulas are never treated as arbitrary recipes. The tutor co-solves with you step-by-step:
                starting from observed physical constraints, isolating variables with algebraic rigor, and
                verifying the physical units of every final result.
              </p>
            </div>

            {/* Principle 4: 3D Spatial Clarity & Permanent Memory */}
            <div>
              <span className="font-mono text-xs uppercase tracking-wider text-ink-muted">
                Principle 04
              </span>
              <h3 className="mt-1 font-serif text-2xl text-ink-primary">
                3D Spatial Clarity & Permanent Memory
              </h3>
              <p className="mt-2.5 text-sm sm:text-base leading-relaxed text-ink-secondary">
                When abstract formulas need physical clarity, interactive 3D simulations appear alongside the
                chalkboard for optics, mechanics, and geometric reasoning. The tutor retains permanent memory
                of your cognitive strengths and conceptual hurdles, ensuring every session builds seamlessly forward.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
