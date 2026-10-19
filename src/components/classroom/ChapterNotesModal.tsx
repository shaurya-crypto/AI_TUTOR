'use client'

import React, { useState } from 'react'
import {
  BookOpen,
  Download,
  Copy,
  Check,
  X,
  FileText,
  CloudCheck,
  RefreshCw,
  Sparkles,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChapterNotesModalProps {
  isOpen: boolean
  onClose: () => void
  moduleTitle: string
  classLevel?: string
  subject?: string
  chapterNotes: string
  notesSaveStatus?: 'saved' | 'saving' | 'idle'
  onOptimizeNotes?: () => Promise<void>
  isOptimizing?: boolean
}

export const ChapterNotesModal: React.FC<ChapterNotesModalProps> = ({
  isOpen,
  onClose,
  moduleTitle,
  classLevel = '',
  subject = '',
  chapterNotes,
  notesSaveStatus = 'idle',
  onOptimizeNotes,
  isOptimizing = false,
}) => {
  const [copied, setCopied] = useState(false)
  const [viewMode, setViewMode] = useState<'formatted' | 'raw'>('formatted')

  if (!isOpen) return null

  const handleCopy = async () => {
    if (!chapterNotes) return
    try {
      await navigator.clipboard.writeText(chapterNotes)
      setCopied(true)
      setTimeout(() => setCopied(false), 2200)
    } catch (err) {
      console.error('Failed to copy notes:', err)
    }
  }

  const handleDownload = () => {
    if (!chapterNotes) return
    const sanitizedTitle = moduleTitle.replace(/[\s/\\?%*:|"<>]/g, '_')
    const fileName = `${sanitizedTitle}_Chalkboard_Notes.md`
    const fileHeader = `# ${moduleTitle}\n**Subject**: ${subject} | **Level**: ${classLevel}\n**Generated**: ${new Date().toLocaleDateString()}\n\n---\n\n`
    const blob = new Blob([fileHeader + chapterNotes], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Parse notes into structured blocks for formatted view
  const renderFormattedNotes = () => {
    if (!chapterNotes || !chapterNotes.trim()) {
      return (
        <div className="py-16 px-6 flex flex-col items-center justify-center text-center text-emerald-200/70 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shadow-inner">
            <BookOpen className="w-7 h-7" strokeWidth={1.5} />
          </div>
          <div className="space-y-1 max-w-md">
            <h4 className="text-base font-semibold text-emerald-100">
              Chalkboard Notes Under Construction
            </h4>
            <p className="text-xs text-emerald-300/60 leading-relaxed font-sans">
              As the AI teacher writes definitions, formulas, flowcharts, and steps on the green chalkboard, your structured study notes will appear here automatically and persist to your student profile.
            </p>
          </div>
        </div>
      )
    }

    const lines = chapterNotes.split('\n')

    return (
      <div className="space-y-3 font-sans text-sm">
        {lines.map((line, idx) => {
          const trimmed = line.trim()
          if (!trimmed) return <div key={idx} className="h-1" />

          // Title / Section Header (### or ####)
          if (trimmed.startsWith('#### Chapter Summary')) {
            return (
              <div
                key={idx}
                className="mt-4 p-4 rounded-xl bg-amber-950/40 border border-amber-600/40 text-amber-200"
              >
                <div className="flex items-center gap-2 mb-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 font-mono">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Chapter Synthesis &amp; Key Takeaways</span>
                </div>
                <div className="text-xs md:text-sm leading-relaxed text-amber-100/90 whitespace-pre-wrap">
                  {trimmed.replace(/^#### Chapter Summary:?\s*/i, '')}
                </div>
              </div>
            )
          }

          if (trimmed.startsWith('### ')) {
            return (
              <div
                key={idx}
                className="pt-3 pb-1 border-b border-emerald-900/60 flex items-center gap-2"
              >
                <div className="w-2 h-2 rounded-full bg-amber-400" />
                <h3 className="text-base font-bold text-amber-200 font-serif tracking-wide">
                  {trimmed.replace(/^###\s*/, '')}
                </h3>
              </div>
            )
          }

          // Law / Formula Callout Box
          if (trimmed.startsWith('> **Law/Formula**:') || trimmed.startsWith('>')) {
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#142d20] border-l-4 border-amber-400 border border-emerald-800/60 shadow-xs"
              >
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300 font-bold block mb-1">
                  Scientific Law / Core Formula
                </span>
                <p className="text-sm font-semibold text-emerald-100 font-mono tracking-tight">
                  {trimmed.replace(/^>\s*(\*\*Law\/Formula\*\*:\s*)?/, '')}
                </p>
              </div>
            )
          }

          // Concept Flowchart
          if (trimmed.startsWith('**Concept Flow**:') || trimmed.startsWith('Flowchart:')) {
            const rawFlow = trimmed.replace(/^(\*\*Concept Flow\*\*:\s*|Flowchart:\s*)/, '')
            const steps = rawFlow.split(/\s*->\s*|\s*>\s*/).filter(Boolean)
            return (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#112318] border border-emerald-800/50"
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold block mb-2">
                  Conceptual Flowchart
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {steps.map((st, stepIdx) => (
                    <React.Fragment key={stepIdx}>
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-900/80 border border-emerald-700/60 text-emerald-200 text-xs font-mono font-medium">
                        {st.trim()}
                      </span>
                      {stepIdx < steps.length - 1 && (
                        <span className="text-emerald-500 font-bold text-xs">→</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )
          }

          // Step
          if (trimmed.startsWith('Step:')) {
            return (
              <div
                key={idx}
                className="pl-3 py-1 border-l-2 border-cyan-400 text-cyan-200/90 text-xs md:text-sm font-mono"
              >
                {trimmed}
              </div>
            )
          }

          // Standard Bullet Point Note
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-2.5 text-xs md:text-sm text-emerald-100/90 leading-relaxed">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0" />
                <span>{trimmed.replace(/^[-*]\s*/, '')}</span>
              </div>
            )
          }

          // Fallback line
          return (
            <p key={idx} className="text-xs md:text-sm text-emerald-200/80 leading-relaxed">
              {trimmed}
            </p>
          )
        })}
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl bg-[#0f1f15] border border-emerald-900/80 shadow-2xl overflow-hidden">
        {/* Header Strip */}
        <div className="px-6 py-4 bg-[#14281c] border-b border-emerald-900/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-800/80 border border-emerald-600/50 flex items-center justify-center text-emerald-100 shadow-xs">
              <BookOpen className="w-5 h-5" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Chapter Notes
                </h2>
                {classLevel && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    {classLevel}
                  </span>
                )}
              </div>
              <p className="text-xs text-emerald-300/70 font-mono">
                {[subject, moduleTitle].filter(Boolean).join(' • ')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Save Status Badge */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono border bg-emerald-950/60 border-emerald-800/60 text-emerald-300">
              {notesSaveStatus === 'saving' ? (
                <>
                  <RefreshCw className="w-3 h-3 text-amber-400 animate-spin" />
                  <span className="text-amber-300">Auto-Saving...</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>Cloud Synced</span>
                </>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="rounded-full text-emerald-200 hover:text-white hover:bg-emerald-900/60 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* View Switcher Sub-header */}
        <div className="px-6 py-2.5 bg-[#122419] border-b border-emerald-950 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 bg-[#0b170f] p-1 rounded-xl border border-emerald-900/60">
            <button
              onClick={() => setViewMode('formatted')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'formatted'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-300/70 hover:text-emerald-200'
              }`}
            >
              Structured View
            </button>
            <button
              onClick={() => setViewMode('raw')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                viewMode === 'raw'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'text-emerald-300/70 hover:text-emerald-200'
              }`}
            >
              Raw Markdown
            </button>
          </div>

          <span className="text-[11px] text-emerald-300/60 font-mono">
            Recorded from Live Chalkboard
          </span>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 p-6 overflow-y-auto bg-[#0d1b13]">
          {viewMode === 'formatted' ? (
            renderFormattedNotes()
          ) : (
            <textarea
              readOnly
              value={chapterNotes || '# No notes recorded yet.'}
              className="w-full h-80 p-4 rounded-xl bg-black/40 border border-emerald-950 font-mono text-xs text-emerald-200 resize-none focus:outline-none"
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-[#14281c] border-t border-emerald-900/70 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[11px] text-emerald-300/60 font-mono">
            Auto-saved to your personal syllabus ledger
          </span>

          <div className="flex items-center gap-2">
            {onOptimizeNotes && (
              <Button
                variant="outline"
                size="sm"
                onClick={onOptimizeNotes}
                disabled={isOptimizing}
                className="bg-amber-950/60 hover:bg-amber-900 text-amber-200 border-amber-800/70 rounded-xl px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
                title="Synthesize clean, optimized master notes with AI"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isOptimizing ? 'Optimizing...' : 'AI Optimize'}</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              disabled={!chapterNotes || !chapterNotes.trim()}
              className="bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 border-emerald-800/70 rounded-xl px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-transform active:scale-95 disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copy Notes</span>
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={!chapterNotes || !chapterNotes.trim()}
              className="bg-emerald-700 hover:bg-emerald-600 text-white border-transparent rounded-xl px-4 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md transition-transform active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-emerald-300/80 hover:text-white rounded-xl px-3 text-xs cursor-pointer"
            >
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
