'use client'

import React from 'react'
import { SmoothScroll } from '@/components/landing/SmoothScroll'
import { LandingNav } from '@/components/landing/LandingNav'
import { EditorialHero } from '@/components/landing/EditorialHero'
import { ProductExperience } from '@/components/landing/ProductExperience'
import { LearningFlow } from '@/components/landing/LearningFlow'
import { ClosingSection } from '@/components/landing/ClosingSection'
import { LandingFooter } from '@/components/landing/LandingFooter'
import { SectionDivider } from '@/components/landing/SectionDivider'

export default function LandingPage() {
  return (
    <SmoothScroll>
      <div className="landing-paper-bg min-h-screen flex flex-col font-sans selection:bg-coral-soft selection:text-ink-primary">
        {/* SECTION A — Minimal Floating Pill Navigation */}
        <LandingNav />

        {/* Main Content: Sections B through E */}
        <main className="flex-1">
          {/* SECTION B — Editorial Hero (Aristotle-style Sticky Scroll with Word Blur Animation) */}
          <EditorialHero />

          {/* SECTION C — Product Experience: What It Is, Why It Works, Why Best */}
          <ProductExperience />

          <SectionDivider />

          {/* SECTION D — Three Stages of Genuine Understanding */}
          <LearningFlow />

          <SectionDivider />

          {/* SECTION E — Pre-Footer Big Box Call to Action */}
          <ClosingSection />
        </main>

        {/* FOOTER — Cloud-Blended Archival Footer */}
        <LandingFooter />
      </div>
    </SmoothScroll>
  )
}
