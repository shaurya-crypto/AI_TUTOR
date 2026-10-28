'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Flame, Sparkles, Settings, LogOut, User, ChevronDown, Check } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { signOutAction, updatePreferencesAction } from '@/app/dashboard/actions'
import { VOICE_OPTIONS } from '@/lib/voiceAndLanguageConfig'

interface DashboardHeaderProps {
  user: {
    id: string
    email?: string
  }
  profile: {
    full_name?: string | null
    avatar_url?: string | null
    current_streak?: number | null
    learning_style?: string | null
    preferred_pacing?: string | null
    preferred_teacher_voice?: string | null
  }
}



const LEARNING_STYLES = [
  { id: 'socratic', name: 'Socratic', desc: 'Guides with probing questions' },
  { id: 'visual', name: 'Visual', desc: 'Uses vivid analogies and diagrams' },
  { id: 'direct', name: 'Direct', desc: 'Concise and bottom-line focused' },
  { id: 'storytelling', name: 'Storytelling', desc: 'Anchored in narrative arcs' },
]

const PACING_OPTIONS = [
  { id: 'slow_and_thorough', name: 'Deep & Thorough', desc: 'Unpacks every nuance' },
  { id: 'standard', name: 'Balanced', desc: 'Standard conversational tempo' },
  { id: 'fast_and_high_level', name: 'Accelerated', desc: 'High-speed conceptual mastery' },
]

export function DashboardHeader({ user, profile }: DashboardHeaderProps) {
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState(profile.preferred_teacher_voice || 'Leda')
  const [selectedStyle, setSelectedStyle] = useState(profile.learning_style || 'socratic')
  const [selectedPacing, setSelectedPacing] = useState(profile.preferred_pacing || 'standard')
  const [saving, setSaving] = useState(false)

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const formData = new FormData()
    formData.append('learning_style', selectedStyle)
    formData.append('preferred_pacing', selectedPacing)
    formData.append('preferred_teacher_voice', selectedVoice)
    await updatePreferencesAction(formData)
    setSaving(false)
    setPreferencesOpen(false)
  }

  const initials = (profile.full_name || user.email || 'S')
    .slice(0, 2)
    .toUpperCase()

  return (
    <header className="sticky top-4 z-40 w-full mb-10">
      {/* Outer Shell for Apple-translucent Island Navbar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="relative backdrop-blur-xl bg-white/85 border border-[var(--border-subtle)]/80 shadow-[0_8px_30px_rgb(23,24,23,0.04)] rounded-[1.75rem] px-4 py-3 md:px-6 md:py-3.5 flex items-center justify-between transition-all">
          
          {/* Left: Brand & Live Indicator */}
          <div className="flex items-center gap-4">
            <Link href={`/dashboard/${user.id}`} className="flex items-center gap-2.5 group">
              {/* Botanical Leaf Mark */}
              <div className="w-9 h-9 rounded-xl bg-botanical-soft border border-botanical/20 flex items-center justify-center text-botanical transition-transform duration-300 group-hover:scale-105">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.5 2 2 6.5 2 12c0 5 3.5 9 8.5 9.8" />
                  <path d="M12 2c5.5 0 10 4.5 10 10 0 5.5-4.5 10-10 10-1.5 0-3-.5-4-1" />
                  <path d="M12 2v20" />
                  <path d="M8 8c2.5 1.5 4 4 4 7" />
                  <path d="M16 6c-2 2-3.5 4.5-4 7" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-xl tracking-tight text-ink-primary font-medium leading-none">
                  Anaxly
                </span>
                <span className="text-[10px] tracking-wider uppercase text-ink-muted mt-0.5 font-medium">
                  Classical Intelligence
                </span>
              </div>
            </Link>

            {/* Live State Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-botanical-soft/80 border border-botanical/20 text-botanical-dark text-xs font-medium">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-botanical opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-botanical"></span>
              </span>
              <span>Live Tutor Ready</span>
            </div>
          </div>

          {/* Right: Streak & User Dropdown */}
          <div className="flex items-center gap-3">
            
            {/* Streak Counter Pill */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-canvas border border-[var(--border-subtle)] shadow-sm">
              <Flame className="w-4 h-4 text-accent-ochre animate-pulse" fill="currentColor" />
              <span className="text-xs font-medium text-ink-secondary">
                <strong className="text-ink-primary font-semibold">{profile.current_streak || 0}</strong> Day Streak
              </span>
            </div>

            {/* Preferences Modal Trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full w-9 h-9 text-ink-secondary hover:text-ink-primary hover:bg-canvas transition-colors"
              onClick={() => setPreferencesOpen(true)}
              aria-label="Tutor Preferences"
            >
              <Settings className="w-4 h-4" />
            </Button>

            {/* User Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-full hover:bg-canvas transition-all border border-transparent hover:border-[var(--border-subtle)] focus:outline-none">
                  <Avatar className="w-8 h-8 border border-botanical/20">
                    <AvatarImage src={profile.avatar_url || ''} alt={profile.full_name || 'Student'} />
                    <AvatarFallback className="bg-botanical-soft text-botanical-dark text-xs font-medium">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-ink-primary hidden md:inline-block max-w-[100px] truncate">
                    {profile.full_name || user.email?.split('@')[0]}
                  </span>
                  <ChevronDown className="w-3 h-3 text-ink-muted" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 bg-white/95 backdrop-blur-md border-[var(--border-subtle)] shadow-lg">
                <DropdownMenuLabel className="px-3 py-2">
                  <p className="text-xs text-ink-muted uppercase tracking-wider font-semibold">Signed in as</p>
                  <p className="text-sm font-medium text-ink-primary truncate mt-0.5">{user.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[var(--border-subtle)]" />
                <DropdownMenuItem 
                  onClick={() => setPreferencesOpen(true)}
                  className="rounded-xl px-3 py-2 cursor-pointer text-ink-secondary hover:text-ink-primary focus:bg-canvas"
                >
                  <Settings className="w-4 h-4 mr-2.5 text-ink-muted" />
                  <span>Tutor Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  asChild
                  className="rounded-xl px-3 py-2 cursor-pointer text-ink-secondary hover:text-ink-primary focus:bg-canvas"
                >
                  <Link href={`/dashboard/${user.id}/class`}>
                    <Sparkles className="w-4 h-4 mr-2.5 text-accent-warm" />
                    <span>Enter Live Classroom</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-[var(--border-subtle)]" />
                <DropdownMenuItem
                  onClick={() => signOutAction()}
                  className="rounded-xl px-3 py-2 cursor-pointer text-red-600 hover:text-red-700 focus:bg-red-50"
                >
                  <LogOut className="w-4 h-4 mr-2.5" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

          </div>
        </div>
      </div>

      {/* Tutor Preferences Dialog */}
      <Dialog open={preferencesOpen} onOpenChange={setPreferencesOpen}>
        <DialogContent className="max-w-lg bg-white rounded-[2rem] border-[var(--border-subtle)] p-6 md:p-8 shadow-xl">
          <DialogHeader className="text-left mb-4">
            <div className="w-10 h-10 rounded-2xl bg-accent-warm-soft flex items-center justify-center text-accent-warm mb-2 border border-accent-warm/20">
              <Settings className="w-5 h-5" />
            </div>
            <DialogTitle className="font-serif text-2xl tracking-tight text-ink-primary">
              Anaxly Intelligence Settings
            </DialogTitle>
            <DialogDescription className="text-sm text-ink-secondary">
              Tune how your AI teacher reasons, structures lessons, and converses in real time.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePreferences} className="space-y-6">
            
            {/* Preferred Voice Selection */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-ink-muted font-semibold">
                Teacher Voice persona
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {VOICE_OPTIONS.map((v) => (
                  <button
                    type="button"
                    key={v.id}
                    onClick={() => setSelectedVoice(v.id)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      selectedVoice === v.id
                        ? 'border-coral bg-accent-warm-soft/40 text-ink-primary shadow-xs'
                        : 'border-[var(--border-subtle)] hover:border-ink-muted/50 bg-white text-ink-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-sm text-ink-primary">{v.name}</span>
                      {selectedVoice === v.id && <Check className="w-4 h-4 text-accent-warm" />}
                    </div>
                    <span className="text-[11px] text-ink-muted mt-1 leading-snug">{v.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Learning Style */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-ink-muted font-semibold">
                Pedagogical Style
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {LEARNING_STYLES.map((s) => (
                  <button
                    type="button"
                    key={s.id}
                    onClick={() => setSelectedStyle(s.id)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                      selectedStyle === s.id
                        ? 'border-botanical bg-botanical-soft/50 text-ink-primary'
                        : 'border-[var(--border-subtle)] hover:border-ink-muted/50 bg-white text-ink-secondary'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium text-sm text-ink-primary">{s.name}</span>
                      {selectedStyle === s.id && <Check className="w-4 h-4 text-botanical-dark" />}
                    </div>
                    <span className="text-[11px] text-ink-muted mt-1 leading-snug">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Pacing */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-ink-muted font-semibold">
                Instruction Pacing
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {PACING_OPTIONS.map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setSelectedPacing(p.id)}
                    className={`flex flex-col text-left p-2.5 rounded-xl border transition-all ${
                      selectedPacing === p.id
                        ? 'border-ink-primary bg-ink-primary text-white'
                        : 'border-[var(--border-subtle)] hover:border-ink-muted/50 bg-white text-ink-secondary'
                    }`}
                  >
                    <span className={`font-medium text-xs ${selectedPacing === p.id ? 'text-white' : 'text-ink-primary'}`}>
                      {p.name}
                    </span>
                    <span className={`text-[10px] mt-1 line-clamp-2 leading-tight ${selectedPacing === p.id ? 'text-white/80' : 'text-ink-muted'}`}>
                      {p.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl border-[var(--border-subtle)]"
                onClick={() => setPreferencesOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-coral hover:bg-coral-dark text-white font-medium px-6"
              >
                {saving ? 'Updating...' : 'Save Preferences'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </header>
  )
}
