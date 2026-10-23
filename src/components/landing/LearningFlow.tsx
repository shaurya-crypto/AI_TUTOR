'use client'

import React from 'react'
import { ArtworkFrame } from './ArtworkFrame'
import { getArtwork } from '@/lib/landing-artwork'

export function LearningFlow() {
  const learningArtwork = getArtwork('learningArtwork')

  const steps = [
    {
      num: '01',
      title: 'Ground in everyday physical intuition',
      description:
        'Every concept begins with a tangible, real-world hook. Before looking at equations, you explore the underlying intuition through guided questions.',
      tag: 'Intuitive Foundation',
    },
    {
      num: '02',
      title: 'Reason & derive in active voice dialogue',
      description:
        'Engage in natural conversation. The tutor writes derivations live on the chalkboard, checking your comprehension every two to three sentences.',
      tag: 'Continuous Reasoning',
    },
    {
      num: '03',
      title: 'Preserve topper-ready master notes',
      description:
        'Tackle rigorous numerical problems formatted with clear steps: Given, Formula, Substitution, and Boxed Answers. All chalkboard work becomes your permanent Master Notes.',
      tag: 'Lifelong Rigor',
    },
  ]

  return (
    <section id="flow" className="relative scroll-mt-20 py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 lg:px-12">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16 lg:items-center">
          {/* Left Column: The 3 Steps with JetBrains Mono Numbers */}
          <div className="lg:col-span-6 flex flex-col">
            <p className="font-mono text-xs uppercase tracking-widest text-ink-muted">
              The Three Stages of Mastery
            </p>

            <h2 className="mt-4 font-serif font-normal text-[clamp(2.2rem,4vw,3.5rem)] leading-[1.12] tracking-tight text-ink-primary">
              From initial intuition to genuine mastery.
            </h2>

            {/* Cursive Handwriting Marginalia */}
            <p className="font-cursive text-coral-primary text-xl sm:text-2xl mt-2 tracking-wide">
              Mastery is not memorization — it is the dialogue between intuition and rigor.
            </p>

            <p className="mt-4 text-base text-ink-secondary leading-relaxed">
              Learning is not a sprint through pre-recorded video lectures. It is a disciplined,
              dialogue-driven progression that builds lifelong conceptual clarity from first principles.
            </p>

            {/* Disciplined Step List */}
            <div className="mt-10 space-y-8">
              {steps.map((step) => (
                <div key={step.num} className="group relative flex gap-6">
                  {/* Numeral Marker */}
                  <div className="flex flex-col items-center">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border-strong bg-surface-white font-mono text-sm font-semibold text-ink-primary shadow-xs group-hover:border-coral-primary group-hover:text-coral-primary transition-colors">
                      {step.num}
                    </span>
                    {step.num !== '03' && (
                      <div className="my-2 h-full w-[1px] bg-border-subtle" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="pb-4">
                    <span className="font-mono text-[11px] uppercase tracking-wider text-botanical-primary">
                      {step.tag}
                    </span>
                    <h3 className="mt-1 font-serif text-xl sm:text-2xl text-ink-primary">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm sm:text-base leading-relaxed text-ink-secondary">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column: Classical Ascending Staircase Artwork */}
          <div className="lg:col-span-6 flex flex-col">
            <div className="relative">
              {/* Decorative Archival Corner accents */}
              <div className="absolute -top-2.5 -left-2.5 h-4 w-4 border-t border-l border-border-strong pointer-events-none" />
              <div className="absolute -bottom-2.5 -right-2.5 h-4 w-4 border-b border-r border-border-strong pointer-events-none" />

              <ArtworkFrame
                artwork={learningArtwork}
                aspectRatioClass="aspect-[16/9] sm:aspect-[16/8.5]"
                showCaption={true}
                className="w-full"
              />

              {/* Editorial Quote Card */}
              <div className="mt-6 rounded-2xl sm:rounded-3xl border border-border-strong/70 bg-surface-white/95 p-6 sm:p-7 shadow-[0_16px_40px_-10px_rgba(23,24,23,0.08)]">
                <p className="font-serif text-base sm:text-lg italic text-ink-primary leading-relaxed">
                  &ldquo;He who learns must suffer. And even in our sleep pain that cannot forget,
                  falls drop by drop upon the heart, and in our own despite, against our will, comes
                  wisdom to us by the awful grace of God.&rdquo;
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-ink-muted border-t border-border-subtle pt-3">
                  <span className="font-mono uppercase tracking-wider text-ink-secondary">
                    Aeschylus &bull; Agamemnon
                  </span>
                  <span className="font-sans italic text-ink-muted">Classical Foundation of Rigor</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
