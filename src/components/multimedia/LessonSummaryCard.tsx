'use client'

import React from 'react'
import { SummaryContent } from '@/types/lessonManifest'
import { Award, BookOpen, Sparkles, CheckCircle2, Bookmark } from 'lucide-react'

interface LessonSummaryCardProps {
  content: SummaryContent
  moduleTitle?: string
}

export function LessonSummaryCard({ content, moduleTitle }: LessonSummaryCardProps) {
  return (
    <div className="w-full h-full flex flex-col bg-[#0b140f] rounded-2xl overflow-y-auto border border-emerald-900/60 shadow-xl text-emerald-100 p-4 sm:p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-emerald-900/50 pb-3">
        <div className="flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wide">
            Capsule Synthesis &amp; Recap
          </h3>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300">
          Exam-Topper Summary
        </span>
      </div>

      {moduleTitle && (
        <p className="text-xs text-amber-200/90 font-mono font-medium">
          Topic: {moduleTitle}
        </p>
      )}

      {/* Recap Points */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-emerald-300">
          <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
          <span>Key Concepts Mastered</span>
        </div>
        <div className="space-y-1.5">
          {content.recapPoints.map((pt, i) => (
            <div
              key={i}
              className="p-2.5 rounded-xl bg-[#122319] border border-emerald-900/50 text-xs text-emerald-100/90 flex items-start gap-2"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{pt}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Formulas To Remember */}
      {content.formulasToRemember && content.formulasToRemember.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-emerald-950">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-cyan-300">
            <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
            <span>Essential Formulas &amp; Laws</span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {content.formulasToRemember.map((form, i) => (
              <div
                key={i}
                className="p-2 rounded-lg bg-[#0d1e16] border border-cyan-900/50 text-xs font-mono text-cyan-200"
              >
                {form}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exam Tips */}
      {content.examTips && content.examTips.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-emerald-950">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Board Examination Strategy</span>
          </div>
          <div className="space-y-1">
            {content.examTips.map((tip, i) => (
              <p
                key={i}
                className="text-[11px] text-amber-200/80 leading-relaxed pl-3 border-l-2 border-amber-500/60"
              >
                {tip}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
