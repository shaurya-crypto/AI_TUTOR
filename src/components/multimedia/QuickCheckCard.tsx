'use client'

import React, { useState } from 'react'
import { QuickCheckContent } from '@/types/lessonManifest'
import { CheckCircle2, XCircle, HelpCircle, ArrowRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QuickCheckCardProps {
  content: QuickCheckContent
  onCompleted?: (isCorrect: boolean) => void
}

export function QuickCheckCard({ content, onCompleted }: QuickCheckCardProps) {
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false)

  // Reset state when new quick check content is loaded
  React.useEffect(() => {
    setSelectedOptionId(null)
    setIsSubmitted(false)
  }, [content.question, content.correctOptionId])

  const handleSubmit = () => {
    if (!selectedOptionId) return
    setIsSubmitted(true)
    const isCorrect = selectedOptionId === content.correctOptionId
    onCompleted?.(isCorrect)
  }

  const handleRetry = () => {
    setSelectedOptionId(null)
    setIsSubmitted(false)
  }

  const isCorrect = selectedOptionId === content.correctOptionId

  return (
    <div className="w-full h-full flex flex-col bg-[#0b140f] rounded-2xl overflow-hidden border border-emerald-900/60 shadow-xl text-emerald-100 p-4 sm:p-5 justify-between">
      {/* Top Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[11px] font-mono uppercase tracking-widest text-sky-400 font-bold">
              Concept Checkpoint
            </span>
          </div>
          <span className="text-[11px] font-mono text-emerald-400/80">
            Immediate Board Feedback
          </span>
        </div>

        {/* Question Text */}
        <div className="p-3.5 rounded-xl bg-[#122319] border border-emerald-900/60">
          <p className="text-sm font-medium text-white leading-relaxed">
            {content.question}
          </p>
        </div>

        {/* Options */}
        <div className="space-y-2 pt-1">
          {content.options.map((opt, idx) => {
            const letter = String.fromCharCode(65 + idx)
            const isSelected = selectedOptionId === opt.id
            const isThisCorrect = opt.id === content.correctOptionId

            let pillStyle =
              'bg-[#102016] border-emerald-900/60 text-emerald-200 hover:bg-[#14281c]'

            if (isSubmitted) {
              if (isThisCorrect) {
                pillStyle = 'bg-emerald-900/70 border-emerald-500 text-white font-medium'
              } else if (isSelected && !isThisCorrect) {
                pillStyle = 'bg-rose-950/70 border-rose-600 text-rose-200'
              } else {
                pillStyle = 'bg-[#0d1611]/60 border-emerald-950/40 text-emerald-500/50'
              }
            } else if (isSelected) {
              pillStyle = 'bg-emerald-800/80 border-cyan-400 text-white shadow-xs'
            }

            return (
              <button
                key={opt.id}
                type="button"
                disabled={isSubmitted}
                onClick={() => setSelectedOptionId(opt.id)}
                className={`w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer ${pillStyle}`}
              >
                <span
                  className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-cyan-500 text-black' : 'bg-emerald-950 text-emerald-300'
                  }`}
                >
                  {letter}
                </span>
                <span className="text-xs pt-0.5 leading-relaxed">{opt.text}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom Feedback and Actions */}
      <div className="pt-3 border-t border-emerald-900/50 mt-3 space-y-3">
        {isSubmitted ? (
          <div className="space-y-2">
            <div
              className={`p-3 rounded-xl text-xs font-mono flex items-start gap-2.5 ${
                isCorrect
                  ? 'bg-emerald-950/90 border border-emerald-500 text-emerald-200'
                  : 'bg-rose-950/90 border border-rose-700 text-rose-200'
              }`}
            >
              {isCorrect ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold block">
                  {isCorrect ? 'Correct!' : 'Incorrect'}
                </span>
                <p className="text-[11px] leading-relaxed text-emerald-300/90">
                  {content.explanation}
                </p>
              </div>
            </div>

            {!isCorrect && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="w-full text-xs font-mono bg-emerald-950/60 hover:bg-emerald-900 text-emerald-200 border-emerald-800 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                <span>Retry Checkpoint</span>
              </Button>
            )}
          </div>
        ) : (
          <Button
            disabled={!selectedOptionId}
            onClick={handleSubmit}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs py-2.5 cursor-pointer shadow-md disabled:opacity-40"
          >
            <span>Verify Answer</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        )}
      </div>
    </div>
  )
}
