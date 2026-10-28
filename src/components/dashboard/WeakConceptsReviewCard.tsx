'use client'

import React from 'react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, BookOpen, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react'

interface Module {
  id: string
  curriculum_id: string
  order_index: number
  title: string
  description?: string | null
  key_concepts?: string[] | null
  estimated_minutes?: number | null
}

interface ProgressRecord {
  id: string
  syllabus_module_id: string
  status: 'not_started' | 'in_progress' | 'completed' | 'needs_review'
  score?: number | null
  completed_at?: string | null
}

interface WeakConceptsReviewCardProps {
  userId: string
  modules: Module[]
  progressRecords: ProgressRecord[]
}

export function WeakConceptsReviewCard({
  userId,
  modules,
  progressRecords,
}: WeakConceptsReviewCardProps) {
  const progressMap = new Map<string, ProgressRecord>()
  progressRecords.forEach((p) => progressMap.set(p.syllabus_module_id, p))

  // 1. Identify modules needing review: status is 'needs_review' or score < 70
  const reviewNeededModules = modules.filter((m) => {
    const p = progressMap.get(m.id)
    if (!p) return false
    if (p.status === 'needs_review') return true
    if (typeof p.score === 'number' && p.score < 70) return true
    return false
  })

  // 2. Fallback: completed modules for spaced repetition if no explicitly flagged weak modules
  const candidateModules =
    reviewNeededModules.length > 0
      ? reviewNeededModules
      : modules.filter((m) => progressMap.get(m.id)?.status === 'completed').slice(0, 3)

  if (candidateModules.length === 0) {
    return null
  }

  const isExplicitWeakness = reviewNeededModules.length > 0

  return (
    <section className="bg-surface rounded-3xl border border-border-subtle p-7 md:p-8 diffused-card-shadow space-y-5 w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border-subtle/80 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
              isExplicitWeakness
                ? 'bg-sky-500/15 border-sky-400/30 text-sky-300'
                : 'bg-secondary/10 border-secondary/20 text-secondary'
            }`}
          >
            {isExplicitWeakness ? (
              <AlertCircle className="w-4 h-4 text-sky-300" />
            ) : (
              <RotateCcw className="w-4 h-4 text-secondary" />
            )}
          </div>
          <div>
            <h3 className="font-headline-md text-headline-md text-ink-primary font-serif leading-tight">
              {isExplicitWeakness ? 'Weak-Concept Revision Spotlight' : 'Spaced Retention Reinforcement'}
            </h3>
            <p className="font-body-md text-body-md text-ink-secondary text-xs mt-0.5">
              {isExplicitWeakness
                ? 'Targeted drills derived from diagnostic quiz performance to reinforce high-yield concepts.'
                : 'Cyclic revision to ensure long-term retention of completed syllabus capsules.'}
            </p>
          </div>
        </div>

        <span
          className={`self-start sm:self-center px-2.5 py-0.5 rounded-full text-label-micro font-semibold border ${
            isExplicitWeakness
              ? 'bg-amber-500/10 text-sky-300 border-sky-400/30'
              : 'bg-secondary/10 text-secondary border-secondary/20'
          }`}
        >
          {candidateModules.length} Capsule{candidateModules.length > 1 ? 's' : ''} Recommended
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {candidateModules.slice(0, 3).map((mod) => {
          const prog = progressMap.get(mod.id)
          const score = prog?.score
          const keyConcepts = mod.key_concepts || []

          return (
            <div
              key={mod.id}
              className="bg-canvas rounded-2xl border border-border-subtle p-4 flex flex-col justify-between space-y-3 hover:border-ink-muted transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-micro text-label-micro text-ink-muted uppercase tracking-wider">
                    Capsule #{mod.order_index}
                  </span>
                  {typeof score === 'number' ? (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
                        score < 70
                          ? 'bg-amber-500/15 text-sky-300'
                          : 'bg-emerald-500/15 text-emerald-700'
                      }`}
                    >
                      {score}% Quiz
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-ink-muted">
                      Review Drill
                    </span>
                  )}
                </div>

                <h4 className="font-headline-sm text-sm text-ink-primary font-semibold line-clamp-1">
                  {mod.title}
                </h4>

                {keyConcepts.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {keyConcepts.slice(0, 2).map((kc, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-surface border border-border-subtle text-[11px] text-ink-secondary truncate max-w-[180px]"
                      >
                        {kc}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <Link
                href={`/dashboard/${userId}/class/${mod.id}`}
                className="w-full inline-flex items-center justify-center gap-1.5 bg-surface hover:bg-canvas text-ink-primary border border-border-subtle text-xs font-label-md py-2 rounded-xl transition-all shadow-2xs hover:border-ink-muted cursor-pointer"
              >
                <span>Start Targeted Drill</span>
                <ArrowRight className="w-3.5 h-3.5 text-primary" />
              </Link>
            </div>
          )
        })}
      </div>
    </section>
  )
}
