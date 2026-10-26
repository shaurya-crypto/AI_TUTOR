'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  BrainCircuit,
  Flame,
  Clock,
  BookOpen,
  ArrowRight,
  Sparkles,
  BookMarked,
  CheckCircle2,
  Calendar,
  Compass,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { DashboardHeader } from './DashboardHeader'
import { CurriculumRoadmap } from './CurriculumRoadmap'
import { CognitiveProfileCard } from './CognitiveProfileCard'

interface StudentDashboardViewProps {
  user: {
    id: string
    email?: string
  }
  profile: {
    id: string
    full_name?: string | null
    avatar_url?: string | null
    current_streak?: number | null
    longest_streak?: number | null
    total_classes_taken?: number | null
    total_learning_minutes?: number | null
    learning_style?: string | null
    preferred_pacing?: string | null
    preferred_teacher_voice?: string | null
    weak_subjects?: string[] | null
    strong_subjects?: string[] | null
    learning_level?: string | null
  }
  curriculum: {
    id: string
    title: string
    description?: string | null
    category?: string | null
    difficulty_level?: string | null
    estimated_duration_minutes?: number | null
  } | null
  modules: any[]
  progressRecords: any[]
  memories: any[]
}

export function StudentDashboardView({
  user,
  profile,
  curriculum,
  modules,
  progressRecords,
  memories,
}: StudentDashboardViewProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const firstName = profile.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Student'
  
  // Calculate progress
  const progressMap = new Map<string, string>()
  progressRecords.forEach((p) => progressMap.set(p.syllabus_module_id, p.status))
  const completedCount = progressRecords.filter((p) => p.status === 'completed').length
  const totalCount = modules.length
  const percentComplete = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  // Find next module
  const nextModule = modules.find((m) => {
    const status = progressMap.get(m.id)
    return !status || status === 'in_progress' || status === 'not_started'
  }) || (modules.length > 0 ? modules[0] : null)

  return (
    <div className="min-h-[100dvh] bg-canvas text-ink-primary font-sans selection:bg-coral-soft selection:text-coral-dark pb-24">
      
      {/* Background Decorative Botanical Linework (Subtle 2% opacity) */}
      <div className="absolute top-0 left-0 w-full h-[600px] overflow-hidden pointer-events-none opacity-[0.035] mix-blend-multiply">
        <svg viewBox="0 0 1440 800" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
          <path d="M120 100C300 250 400 600 200 800" stroke="#171817" strokeWidth="2.5" />
          <path d="M250 200C400 320 480 500 350 700" stroke="#171817" strokeWidth="1.5" />
          <path d="M1300 80C1100 240 1050 550 1250 750" stroke="#171817" strokeWidth="2" />
          <path d="M1150 180C1000 300 980 480 1100 680" stroke="#171817" strokeWidth="1.2" />
        </svg>
      </div>

      {/* Floating Translucent Header */}
      <DashboardHeader user={user} profile={profile} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 space-y-10">
        
        {/* Editorial Greeting Header */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-2">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-botanical-soft border border-botanical/20 text-botanical-dark text-xs font-semibold uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Adaptive Neural Classroom</span>
            </div>
            
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl tracking-tight text-ink-primary leading-[1.08] font-normal">
              Welcome back,{' '}
              <span className="italic text-coral font-medium">{firstName}</span>.
            </h1>
            
            <p className="text-ink-secondary text-base md:text-lg mt-3 max-w-xl leading-relaxed">
              {curriculum 
                ? `You're currently mastering ${curriculum.title}. Your AI tutor is primed with your cognitive profile.`
                : 'Select a curriculum to launch your live conversational tutoring sessions.'}
            </p>
          </div>

          {/* Quick Streak Highlight Card */}
          <div className="shrink-0 p-1.5 rounded-[2rem] bg-black/2 border border-[#E5E3DB]/80 shadow-xs">
            <div className="rounded-[calc(2rem-0.375rem)] bg-white px-6 py-4 border border-[#E5E3DB]/40 flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-coral-soft flex items-center justify-center text-coral border border-coral/20">
                <Flame className="w-7 h-7" fill="currentColor" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
                  Learning Rhythm
                </span>
                <span className="font-serif text-2xl text-ink-primary font-medium">
                  {profile.current_streak || 0} Days Continuous
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Primary Hero Card: Next Class Launchpad (Double-Bezel Architecture) */}
        <section className="p-2 rounded-[2.5rem] bg-black/2 border border-[#E5E3DB]/80 shadow-sm transition-all duration-300">
          <div className="relative overflow-hidden rounded-[calc(2.5rem-0.5rem)] bg-white p-8 md:p-12 border border-[#E5E3DB]/50">
            
            {/* Subtle Gradient Glow Overlay */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-botanical-soft/40 via-coral-soft/20 to-transparent rounded-full blur-3xl pointer-events-none transform translate-x-1/3 -translate-y-1/3" />

            <div className="relative z-10 max-w-2xl">
              
              <div className="flex items-center gap-2.5 mb-3">
                <Badge className="bg-coral-soft text-coral-dark font-medium border border-coral/20 px-3 py-0.5 text-xs rounded-full uppercase tracking-wider">
                  Next Up In Syllabus
                </Badge>
                {nextModule?.estimated_minutes && (
                  <span className="text-xs text-ink-muted font-medium flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {nextModule.estimated_minutes} min estimated session
                  </span>
                )}
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl tracking-tight text-ink-primary font-medium leading-[1.15] mb-3">
                {nextModule ? nextModule.title : 'Ready to start your first session?'}
              </h2>

              <p className="text-ink-secondary text-base leading-relaxed mb-6 max-w-xl">
                {nextModule?.description 
                  ? nextModule.description 
                  : 'Your AI tutor adapts to your pace, challenges assumptions, and explains difficult concepts with real-time audio interaction.'}
              </p>

              {/* Key Concept Pills */}
              {nextModule?.key_concepts && nextModule.key_concepts.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-8">
                  <span className="text-xs uppercase tracking-wider font-semibold text-ink-muted mr-1">
                    Key Topics:
                  </span>
                  {nextModule.key_concepts.map((concept: string) => (
                    <span
                      key={concept}
                      className="text-xs font-medium text-ink-primary px-3 py-1 rounded-lg bg-canvas border border-[#E5E3DB]"
                    >
                      {concept}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Buttons: Island Button Architecture (Button-in-Button) */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                
                {/* Primary CTA with Nested Trailing Icon */}
                <Link href={`/dashboard/${user.id}/class`} className="inline-block">
                  <Button className="w-full sm:w-auto h-14 pl-8 pr-4 rounded-full bg-coral hover:bg-coral-dark text-white font-medium text-base shadow-[0_4px_20px_rgba(200,90,67,0.25)] active:scale-[0.98] transition-all duration-300 group flex items-center justify-between gap-6">
                    <span className="tracking-tight">Enter Live Classroom</span>
                    <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center transition-transform group-hover:translate-x-1 group-hover:-translate-y-0.5">
                      <ArrowRight className="w-4 h-4 text-white" />
                    </div>
                  </Button>
                </Link>

                {/* Secondary CTA */}
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('roadmap')}
                  className="h-14 px-8 rounded-full border-[#E5E3DB] hover:bg-canvas text-ink-primary font-medium text-sm transition-all"
                >
                  <BookMarked className="w-4 h-4 mr-2.5 text-ink-muted" />
                  View Full Syllabus
                </Button>

              </div>

            </div>
          </div>
        </section>

        {/* 4-Stat Momentum Metrics Row (Double-Bezel Architecture) */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-5">
          
          {/* Card 1: Total Learning Minutes */}
          <div className="p-1.5 rounded-[2rem] bg-black/2 border border-[#E5E3DB]/80 shadow-xs">
            <div className="rounded-[calc(2rem-0.375rem)] bg-white p-5 border border-[#E5E3DB]/40 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                  Total Learned
                </span>
                <Clock className="w-4 h-4 text-ink-muted" />
              </div>
              <div>
                <span className="font-serif text-3xl md:text-4xl text-ink-primary font-medium block">
                  {profile.total_learning_minutes || 0}
                </span>
                <span className="text-xs text-ink-secondary mt-1 block">Minutes in Live Dialogue</span>
              </div>
            </div>
          </div>

          {/* Card 2: Classes Completed */}
          <div className="p-1.5 rounded-[2rem] bg-black/2 border border-[#E5E3DB]/80 shadow-xs">
            <div className="rounded-[calc(2rem-0.375rem)] bg-white p-5 border border-[#E5E3DB]/40 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                  Sessions Completed
                </span>
                <BookOpen className="w-4 h-4 text-ink-muted" />
              </div>
              <div>
                <span className="font-serif text-3xl md:text-4xl text-ink-primary font-medium block">
                  {profile.total_classes_taken || 0}
                </span>
                <span className="text-xs text-ink-secondary mt-1 block">Classes Mastered</span>
              </div>
            </div>
          </div>

          {/* Card 3: Curriculum Progress */}
          <div className="p-1.5 rounded-[2rem] bg-black/2 border border-[#E5E3DB]/80 shadow-xs">
            <div className="rounded-[calc(2rem-0.375rem)] bg-white p-5 border border-[#E5E3DB]/40 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                  Syllabus Mastery
                </span>
                <TrendingUp className="w-4 h-4 text-botanical" />
              </div>
              <div>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="font-serif text-3xl md:text-4xl text-ink-primary font-medium">
                    {percentComplete}%
                  </span>
                  <span className="text-xs text-ink-muted">({completedCount}/{totalCount})</span>
                </div>
                <Progress value={percentComplete} className="h-1.5 bg-botanical-soft" indicatorClassName="bg-botanical" />
              </div>
            </div>
          </div>

          {/* Card 4: Longest Streak */}
          <div className="p-1.5 rounded-[2rem] bg-black/2 border border-[#E5E3DB]/80 shadow-xs">
            <div className="rounded-[calc(2rem-0.375rem)] bg-white p-5 border border-[#E5E3DB]/40 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                  Peak Streak
                </span>
                <Flame className="w-4 h-4 text-coral" />
              </div>
              <div>
                <span className="font-serif text-3xl md:text-4xl text-ink-primary font-medium block">
                  {Math.max(profile.longest_streak || 0, profile.current_streak || 0)}
                </span>
                <span className="text-xs text-ink-secondary mt-1 block">Day Record</span>
              </div>
            </div>
          </div>

        </section>

        {/* Dynamic Section Tabs (Overview, Roadmap, Cognitive DNA) */}
        <section>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            
            <div className="flex items-center justify-between border-b border-[#E5E3DB] pb-3">
              <TabsList className="bg-canvas border border-[#E5E3DB] p-1 rounded-2xl h-auto">
                <TabsTrigger
                  value="overview"
                  className="rounded-xl px-5 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-ink-primary data-[state=active]:shadow-xs"
                >
                  <Layers className="w-3.5 h-3.5 mr-2" />
                  Learning Overview
                </TabsTrigger>
                <TabsTrigger
                  value="roadmap"
                  className="rounded-xl px-5 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-ink-primary data-[state=active]:shadow-xs"
                >
                  <BookMarked className="w-3.5 h-3.5 mr-2" />
                  Syllabus Roadmap ({modules.length})
                </TabsTrigger>
                <TabsTrigger
                  value="cognitive"
                  className="rounded-xl px-5 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-ink-primary data-[state=active]:shadow-xs"
                >
                  <BrainCircuit className="w-3.5 h-3.5 mr-2" />
                  Cognitive Profile & Memory
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: OVERVIEW */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Left: Syllabus Snapshot (7 cols) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="p-2 rounded-[2.5rem] bg-black/2 border border-[#E5E3DB]/80 shadow-xs">
                    <div className="rounded-[calc(2.5rem-0.5rem)] bg-white p-6 md:p-8 border border-[#E5E3DB]/40">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="font-serif text-2xl tracking-tight font-medium text-ink-primary">
                            Course Roadmap
                          </h3>
                          <p className="text-xs text-ink-secondary mt-0.5">
                            {curriculum ? curriculum.title : 'No curriculum selected'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          onClick={() => setActiveTab('roadmap')}
                          className="text-xs text-coral font-semibold hover:text-coral-dark"
                        >
                          View Full Roadmap →
                        </Button>
                      </div>

                      {/* Display first 3 modules */}
                      <div className="space-y-3">
                        {modules.slice(0, 3).map((mod, i) => {
                          const status = progressMap.get(mod.id) || (i === 0 && completedCount === 0 ? 'in_progress' : 'not_started')
                          const isDone = status === 'completed'
                          const isCurrent = status === 'in_progress'

                          return (
                            <div
                              key={mod.id}
                              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                                isCurrent
                                  ? 'bg-canvas/80 border-coral/30 shadow-xs'
                                  : isDone
                                  ? 'bg-white border-[#E5E3DB]'
                                  : 'bg-white/40 border-[#E5E3DB]/60 opacity-75'
                              }`}
                            >
                              <div className="flex items-center gap-3.5">
                                <div className="shrink-0">
                                  {isDone ? (
                                    <CheckCircle2 className="w-5 h-5 text-botanical" />
                                  ) : isCurrent ? (
                                    <div className="w-3 h-3 rounded-full bg-coral animate-ping" />
                                  ) : (
                                    <span className="font-serif text-sm text-ink-muted w-5 text-center block">
                                      {mod.order_index}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-medium text-sm text-ink-primary">{mod.title}</h4>
                                  <span className="text-[11px] text-ink-muted">{mod.estimated_minutes || 20} mins</span>
                                </div>
                              </div>

                              {isCurrent && (
                                <Link href={`/dashboard/${user.id}/class`}>
                                  <Button size="sm" className="rounded-full bg-coral hover:bg-coral-dark text-white text-xs px-4 h-8">
                                    Resume
                                  </Button>
                                </Link>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right: Tutor Persona & Focus Areas (5 cols) */}
                <div className="lg:col-span-5 space-y-6">
                  
                  {/* Tutor Persona Snapshot */}
                  <div className="p-2 rounded-[2.5rem] bg-black/2 border border-[#E5E3DB]/80 shadow-xs">
                    <div className="rounded-[calc(2.5rem-0.5rem)] bg-white p-6 border border-[#E5E3DB]/40 space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-botanical-soft flex items-center justify-center text-botanical-dark border border-botanical/20">
                          <Compass className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-serif text-lg tracking-tight font-medium text-ink-primary">
                            Tutor Persona
                          </h4>
                          <span className="text-xs text-ink-muted capitalize">
                            Voice: {profile.preferred_teacher_voice || 'Leda'}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex justify-between text-xs py-1.5 border-b border-[#E5E3DB]/60">
                          <span className="text-ink-muted">Instruction Style</span>
                          <span className="font-medium text-ink-primary capitalize">{profile.learning_style || 'Socratic'}</span>
                        </div>
                        <div className="flex justify-between text-xs py-1.5 border-b border-[#E5E3DB]/60">
                          <span className="text-ink-muted">Pacing</span>
                          <span className="font-medium text-ink-primary capitalize">{(profile.preferred_pacing || 'Standard').replace(/_/g, ' ')}</span>
                        </div>
                        <div className="flex justify-between text-xs py-1.5">
                          <span className="text-ink-muted">Learning Tier</span>
                          <span className="font-medium text-ink-primary capitalize">{profile.learning_level || 'Intermediate'}</span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        onClick={() => setActiveTab('cognitive')}
                        className="w-full rounded-xl border-[#E5E3DB] hover:bg-canvas text-xs font-semibold"
                      >
                        Adjust Persona Settings
                      </Button>
                    </div>
                  </div>

                  {/* Focus Areas Card */}
                  <div className="p-2 rounded-[2.5rem] bg-black/2 border border-[#E5E3DB]/80 shadow-xs">
                    <div className="rounded-[calc(2.5rem-0.5rem)] bg-white p-6 border border-[#E5E3DB]/40 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                          Focus Concepts
                        </span>
                        <BrainCircuit className="w-4 h-4 text-coral" />
                      </div>

                      {profile.weak_subjects && profile.weak_subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {profile.weak_subjects.map((sub: string) => (
                            <Badge key={sub} variant="secondary" className="bg-coral-soft text-coral-dark capitalize text-xs px-3 py-1 rounded-lg">
                              {sub}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-ink-secondary py-2">
                          Your tutor has not detected any critical learning roadblocks yet.
                        </p>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            </TabsContent>

            {/* TAB 2: FULL SYLLABUS ROADMAP */}
            <TabsContent value="roadmap">
              <CurriculumRoadmap
                userId={user.id}
                curriculum={curriculum}
                modules={modules}
                progressRecords={progressRecords}
              />
            </TabsContent>

            {/* TAB 3: COGNITIVE DNA & MEMORY */}
            <TabsContent value="cognitive">
              <CognitiveProfileCard
                profile={profile}
                memories={memories}
              />
            </TabsContent>

          </Tabs>
        </section>

      </main>
    </div>
  )
}
