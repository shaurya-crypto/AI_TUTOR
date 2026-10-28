'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  CheckCircle2, 
  Circle, 
  PlayCircle, 
  Lock, 
  Clock, 
  Sparkles, 
  ChevronRight, 
  BookMarked,
  ArrowRight
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'

interface Module {
  id: string
  order_index: number
  title: string
  description?: string | null
  key_concepts?: string[] | null
  success_criteria?: string | null
  estimated_minutes?: number | null
}

interface ProgressRecord {
  syllabus_module_id: string
  status: 'not_started' | 'in_progress' | 'completed' | 'needs_review'
  score?: number | null
}

interface CurriculumRoadmapProps {
  userId: string
  curriculum: {
    id: string
    title: string
    description?: string | null
    category?: string | null
    difficulty_level?: string | null
    estimated_duration_minutes?: number | null
  } | null
  modules: Module[]
  progressRecords: ProgressRecord[]
}

export function CurriculumRoadmap({
  userId,
  curriculum,
  modules,
  progressRecords,
}: CurriculumRoadmapProps) {
  const [selectedModule, setSelectedModule] = useState<Module | null>(null)

  if (!curriculum) {
    return (
      <div className="p-10 rounded-[2.5rem] bg-white border border-[#E5E3DB] text-center flex flex-col items-center justify-center shadow-xs">
        <div className="w-14 h-14 rounded-2xl bg-canvas border border-[#E5E3DB] flex items-center justify-center text-ink-muted mb-4">
          <BookMarked className="w-6 h-6 opacity-60" />
        </div>
        <h3 className="font-serif text-2xl tracking-tight text-ink-primary mb-2">
          No Active Curriculum
        </h3>
        <p className="text-sm text-ink-secondary max-w-md mb-6 leading-relaxed">
          Select or enroll in a syllabus to unlock your personalized real-time learning path with Anaxly.
        </p>
        <Button className="rounded-full bg-primary hover:bg-primary/90 text-white px-7 py-3 font-medium text-sm">
          Browse Learning Paths
        </Button>
      </div>
    )
  }

  const progressMap = new Map<string, string>()
  progressRecords.forEach((p) => progressMap.set(p.syllabus_module_id, p.status))

  const completedCount = progressRecords.filter((p) => p.status === 'completed').length
  const totalCount = modules.length
  const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <div className="space-y-6">
      
      {/* Roadmap Header & Progress Card (Double-Bezel) */}
      <div className="p-2 rounded-[2.5rem] bg-black/2 border border-[#E5E3DB]/80 shadow-xs">
        <div className="rounded-[calc(2.5rem-0.5rem)] bg-white p-6 md:p-8 border border-[#E5E3DB]/40">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-botanical-soft border-botanical/20 text-botanical-dark font-medium text-xs rounded-md uppercase tracking-wider">
                  {curriculum.category || 'Computer Science'}
                </Badge>
                <span className="text-xs text-ink-muted font-medium capitalize">
                  {curriculum.difficulty_level || 'Intermediate'} Track
                </span>
              </div>
              <h2 className="font-serif text-2xl md:text-3xl tracking-tight text-ink-primary font-medium">
                {curriculum.title}
              </h2>
              {curriculum.description && (
                <p className="text-sm text-ink-secondary mt-1.5 max-w-2xl leading-relaxed">
                  {curriculum.description}
                </p>
              )}
            </div>

            <div className="flex flex-col items-start md:items-end shrink-0">
              <span className="text-xs text-ink-muted font-semibold uppercase tracking-wider mb-1">
                Progress
              </span>
              <div className="flex items-baseline gap-2">
                <span className="font-serif text-3xl text-ink-primary font-semibold">{percent}%</span>
                <span className="text-xs text-ink-muted">({completedCount}/{totalCount} Completed)</span>
              </div>
            </div>
          </div>

          <Progress value={percent} className="h-2.5 bg-botanical-soft/80" indicatorClassName="bg-botanical" />
        </div>
      </div>

      {/* Module List Timeline */}
      <div className="space-y-3">
        {modules.map((mod, index) => {
          const status = progressMap.get(mod.id) || (index === 0 && completedCount === 0 ? 'in_progress' : 'not_started')
          const isCompleted = status === 'completed'
          const isInProgress = status === 'in_progress'

          return (
            <div
              key={mod.id}
              onClick={() => setSelectedModule(mod)}
              className={`group p-4 md:p-5 rounded-[1.75rem] border transition-all duration-200 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isInProgress
                  ? 'bg-white border-coral/40 shadow-sm ring-2 ring-coral/10 hover:border-coral'
                  : isCompleted
                  ? 'bg-white/70 border-[#E5E3DB] hover:bg-white hover:border-botanical/40'
                  : 'bg-white/40 border-[#E5E3DB]/60 opacity-80 hover:opacity-100 hover:bg-white'
              }`}
            >
              <div className="flex items-start sm:items-center gap-4">
                
                {/* Status Icon */}
                <div className="mt-0.5 sm:mt-0 shrink-0">
                  {isCompleted ? (
                    <div className="w-10 h-10 rounded-full bg-botanical-soft text-botanical-dark flex items-center justify-center border border-botanical/20">
                      <CheckCircle2 className="w-5 h-5 text-botanical" />
                    </div>
                  ) : isInProgress ? (
                    <div className="w-10 h-10 rounded-full bg-accent-warm-soft text-accent-warm flex items-center justify-center border border-accent-warm/20">
                      <PlayCircle className="w-5 h-5 text-accent-warm animate-pulse" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-canvas text-ink-muted flex items-center justify-center border border-[#E5E3DB]">
                      <span className="font-serif text-sm font-medium">{mod.order_index}</span>
                    </div>
                  )}
                </div>

                {/* Module Details */}
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-ink-muted">
                      Module {mod.order_index}
                    </span>
                    {isInProgress && (
                      <Badge className="bg-primary text-white font-medium text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                        Current Focus
                      </Badge>
                    )}
                    {isCompleted && (
                      <Badge className="bg-botanical-soft text-botanical-dark font-medium text-[10px] px-2 py-0.5 rounded-full border border-botanical/20">
                        Mastered
                      </Badge>
                    )}
                  </div>

                  <h3 className="font-sans font-semibold text-base text-ink-primary group-hover:text-primary transition-colors">
                    {mod.title}
                  </h3>
                  
                  {mod.description && (
                    <p className="text-xs text-ink-secondary mt-0.5 line-clamp-1 max-w-xl">
                      {mod.description}
                    </p>
                  )}

                  {/* Key Concept Badges */}
                  {mod.key_concepts && mod.key_concepts.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {mod.key_concepts.map((concept) => (
                        <span
                          key={concept}
                          className="text-[10px] font-medium text-ink-secondary px-2 py-0.5 rounded-md bg-canvas border border-[#E5E3DB]"
                        >
                          {concept}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Duration & Action Preview */}
              <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                {mod.estimated_minutes && (
                  <span className="text-xs text-ink-muted flex items-center gap-1.5 font-medium">
                    <Clock className="w-3.5 h-3.5" />
                    {mod.estimated_minutes} min
                  </span>
                )}
                <div className="w-8 h-8 rounded-full bg-canvas border border-[#E5E3DB] flex items-center justify-center text-ink-muted group-hover:border-primary group-hover:text-primary transition-all">
                  <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Module Detail Dialog */}
      <Dialog open={!!selectedModule} onOpenChange={(open) => !open && setSelectedModule(null)}>
        {selectedModule && (
          <DialogContent className="max-w-xl bg-white rounded-[2rem] border-[#E5E3DB] p-6 md:p-8 shadow-2xl">
            <DialogHeader className="text-left">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="bg-botanical-soft border-botanical/20 text-botanical-dark font-medium text-xs rounded-full uppercase tracking-wider">
                  Module {selectedModule.order_index}
                </Badge>
                {selectedModule.estimated_minutes && (
                  <span className="text-xs text-ink-muted font-medium">
                    {selectedModule.estimated_minutes} Minutes Estimated
                  </span>
                )}
              </div>
              <DialogTitle className="font-serif text-3xl tracking-tight text-ink-primary">
                {selectedModule.title}
              </DialogTitle>
              {selectedModule.description && (
                <DialogDescription className="text-sm text-ink-secondary mt-2 leading-relaxed">
                  {selectedModule.description}
                </DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-5 my-6">
              
              {/* Key Concepts Required */}
              {selectedModule.key_concepts && selectedModule.key_concepts.length > 0 && (
                <div>
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-ink-muted mb-2.5">
                    Core Concepts Discussed
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedModule.key_concepts.map((concept) => (
                      <Badge
                        key={concept}
                        variant="secondary"
                        className="bg-canvas border border-[#E5E3DB] text-ink-primary font-medium text-xs px-3 py-1 rounded-lg"
                      >
                        {concept}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Pass Criteria / Objectives */}
              {selectedModule.success_criteria && (
                <div className="p-4 rounded-2xl bg-canvas/80 border border-[#E5E3DB] space-y-1.5">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-botanical-dark flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-botanical" />
                    Mastery Criteria
                  </span>
                  <p className="text-xs text-ink-secondary leading-relaxed">
                    {selectedModule.success_criteria}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                variant="outline"
                className="w-full sm:w-auto rounded-xl border-[#E5E3DB]"
                onClick={() => setSelectedModule(null)}
              >
                Close
              </Button>
              <Link href={`/dashboard/${userId}/class`} className="w-full sm:w-auto">
                <Button className="w-full rounded-xl bg-primary hover:bg-primary/90 text-white font-medium px-6 gap-2">
                  Launch Lesson with Anaxly
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
