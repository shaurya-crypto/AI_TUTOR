'use client'

import React from 'react'
import { BrainCircuit, Target, Sparkles, BookOpen, Mic, Compass } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MemoryItem {
  id: string
  memory_text: string
  importance_score?: number | null
  created_at: string
}

interface CognitiveProfileCardProps {
  profile: {
    learning_style?: string | null
    preferred_pacing?: string | null
    preferred_teacher_voice?: string | null
    weak_subjects?: string[] | null
    strong_subjects?: string[] | null
    learning_level?: string | null
  }
  memories: MemoryItem[]
}

export function CognitiveProfileCard({ profile, memories }: CognitiveProfileCardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* Left: Pedagogical Model (Double-Bezel Architecture) */}
      <div className="p-2 rounded-[2.5rem] bg-black/2 border border-[#E5E3DB]/80 shadow-xs">
        <div className="rounded-[calc(2.5rem-0.5rem)] bg-white p-6 md:p-8 border border-[#E5E3DB]/40 h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-botanical-soft flex items-center justify-center border border-botanical/20 text-botanical-dark">
                <Target className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl tracking-tight font-medium text-ink-primary">
                  Pedagogical DNA
                </h3>
                <p className="text-xs text-ink-muted">AI dynamic instructional parameters</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-canvas border border-[#E5E3DB]">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block mb-1">
                  Reasoning Style
                </span>
                <span className="font-medium text-sm text-ink-primary capitalize flex items-center gap-2">
                  <Compass className="w-4 h-4 text-botanical" />
                  {profile.learning_style || 'Socratic'}
                </span>
                <span className="text-[11px] text-ink-muted mt-1 block">
                  Prompts reasoning through targeted inquiry
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-canvas border border-[#E5E3DB]">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block mb-1">
                  Conversation Pacing
                </span>
                <span className="font-medium text-sm text-ink-primary capitalize flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-coral" />
                  {(profile.preferred_pacing || 'Standard').replace(/_/g, ' ')}
                </span>
                <span className="text-[11px] text-ink-muted mt-1 block">
                  Calibrated to your comprehension feedback
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-canvas border border-[#E5E3DB]">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block mb-1">
                  Teacher Voice
                </span>
                <span className="font-medium text-sm text-ink-primary capitalize flex items-center gap-2">
                  <Mic className="w-4 h-4 text-botanical-dark" />
                  {profile.preferred_teacher_voice || 'Aoede'}
                </span>
                <span className="text-[11px] text-ink-muted mt-1 block">
                  Gemini 3.8 Live neural synthesis
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-canvas border border-[#E5E3DB]">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block mb-1">
                  Curriculum Level
                </span>
                <span className="font-medium text-sm text-ink-primary capitalize flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-ink-primary" />
                  {profile.learning_level || 'Intermediate'}
                </span>
                <span className="text-[11px] text-ink-muted mt-1 block">
                  Adaptive conceptual depth
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Cognitive Memory & Focus Areas (Double-Bezel Architecture) */}
      <div className="p-2 rounded-[2.5rem] bg-black/2 border border-[#E5E3DB]/80 shadow-xs">
        <div className="rounded-[calc(2.5rem-0.5rem)] bg-white p-6 md:p-8 border border-[#E5E3DB]/40 h-full flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl bg-coral-soft flex items-center justify-center border border-coral/20 text-coral-dark">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif text-xl tracking-tight font-medium text-ink-primary">
                  Long-Term Cognitive Memory
                </h3>
                <p className="text-xs text-ink-muted">Vectorized memory nodes across sessions</p>
              </div>
            </div>

            {/* Focus Areas / Weak Subjects */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-ink-muted">
                  Identified Focus Areas
                </span>
                <span className="text-[11px] text-ink-muted italic">Auto-detected by AI</span>
              </div>
              
              {profile.weak_subjects && profile.weak_subjects.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.weak_subjects.map((sub) => (
                    <Badge
                      key={sub}
                      variant="secondary"
                      className="bg-coral-soft/60 hover:bg-coral-soft text-coral-dark font-medium capitalize px-3 py-1 rounded-xl border border-coral/20 text-xs"
                    >
                      {sub}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-canvas border border-[#E5E3DB] text-xs text-ink-secondary">
                  No critical knowledge gaps recorded yet. Your tutor monitors your explanations during voice sessions to pinpoint areas for deeper review.
                </div>
              )}
            </div>

            {/* AI Vector Memory Stream */}
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-ink-muted block mb-2">
                Episodic Memory Nodes
              </span>

              {memories && memories.length > 0 ? (
                <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                  {memories.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-xl bg-canvas border border-[#E5E3DB] text-xs text-ink-primary flex items-start gap-2.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-botanical mt-1.5 shrink-0" />
                      <div className="flex-1">
                        <p className="leading-relaxed">{m.memory_text}</p>
                        <span className="text-[10px] text-ink-muted mt-1 block">
                          {new Date(m.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-canvas/60 border border-[#E5E3DB] text-center py-6">
                  <p className="text-xs text-ink-secondary">
                    Your memory stream is clear. As you converse with your tutor in live audio sessions, key insights and breakthroughs will automatically persist here.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}
