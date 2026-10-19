'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, XCircle, Sparkles, ArrowRight, ArrowLeft, Loader2, Award, BookOpen } from 'lucide-react'
import { completeCapsuleAction } from '@/app/dashboard/actions'
import { triggerCompanionGuidance } from '@/components/mascot/Mascot'

interface QuizQuestion {
  id: number
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  conceptTested: string
}

interface MasteryQuizModalProps {
  isOpen: boolean
  onClose: () => void
  moduleId: string
  moduleTitle: string
  onCompleteSuccess?: (nextModuleId?: string | null) => void
}

export function MasteryQuizModal({
  isOpen,
  onClose,
  moduleId,
  moduleTitle,
  onCompleteSuccess,
}: MasteryQuizModalProps) {
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [scoreResult, setScoreResult] = useState<{ correct: number; total: number; percent: number } | null>(null)
  const [isCached, setIsCached] = useState(false)
  const [freshSetCount, setFreshSetCount] = useState(1)

  const fetchQuiz = async (forceRefresh = false) => {
    if (forceRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    setIsSubmitted(false)
    setSelectedAnswers({})
    setCurrentIndex(0)
    setScoreResult(null)

    try {
      const res = await fetch('/api/class/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, forceRefresh }),
      })

      const data = await res.json()
      if (!res.ok || !data.questions) {
        throw new Error(data.error || 'Failed to generate quiz questions.')
      }

      setQuestions(data.questions)
      setIsCached(Boolean(data.cached))
      if (forceRefresh) {
        setFreshSetCount((prev) => prev + 1)
      }
    } catch (err: any) {
      setError(err.message || 'Unable to load quiz.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // Fetch MCQs when modal opens (uses cached DB questions if available)
  useEffect(() => {
    if (!isOpen || !moduleId) return
    fetchQuiz(false)
  }, [isOpen, moduleId])

  const handleSelectOption = (questionIdx: number, optionIdx: number) => {
    if (isSubmitted) return
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIdx]: optionIdx,
    }))
  }

  const handleSubmitQuiz = async () => {
    if (questions.length === 0 || submitting) return

    let correctCount = 0
    questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctIndex) {
        correctCount++
      }
    })

    const percent = Math.round((correctCount / questions.length) * 100)
    setScoreResult({ correct: correctCount, total: questions.length, percent })
    setIsSubmitted(true)
    setSubmitting(true)

    try {
      // Record completion and advance progress in Supabase
      const result = await completeCapsuleAction({
        moduleId,
        score: percent,
        durationMinutes: 15,
      })

      // Trigger celebratory companion
      triggerCompanionGuidance({
        animation: percent >= 70 ? 'excited' : 'listening',
        expression: percent >= 70 ? 'joyful-wide' : 'attentive-left',
        message:
          percent >= 70
            ? `Mastery verified! You scored ${percent}% (${correctCount}/10). Your syllabus progress has increased!`
            : `Good effort! You scored ${percent}%. Review the feedback below to strengthen your understanding.`,
      })

      if (onCompleteSuccess) {
        onCompleteSuccess(result.nextModuleId)
      }
    } catch (err) {
      console.error('Failed to submit quiz results:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const currentQ = questions[currentIndex]
  const answeredCount = Object.keys(selectedAnswers).length
  const allAnswered = answeredCount === questions.length

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[95vw] bg-[#FDFCF7] border border-[#E5E3DB] rounded-[2rem] p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
        <DialogHeader className="border-b border-[#E5E3DB] pb-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge className="bg-[#52715D]/15 text-[#52715D] border-0 text-xs px-3 py-1 font-semibold uppercase tracking-wider">
                <Award className="w-3.5 h-3.5 mr-1.5 inline" />
                10-Question Mastery Evaluation
              </Badge>
              {isCached && !refreshing && (
                <span className="text-[11px] font-mono text-[#52715D] bg-[#E8F0EA] px-2 py-0.5 rounded-md border border-[#C8EBD2]">
                  Instant Load
                </span>
              )}
              {freshSetCount > 1 && (
                <span className="text-[11px] font-mono text-[#C85A43] bg-[#FFF8F6] px-2 py-0.5 rounded-md border border-[#F5C2B8]">
                  Set #{freshSetCount}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchQuiz(true)}
                disabled={refreshing || loading || submitting}
                className="h-8 px-3 rounded-xl border-[#E5E3DB] hover:bg-[#F0F6F2] hover:border-[#C8EBD2] text-xs font-medium text-[#52715D] transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Ask Gemini Examiner to craft 10 completely fresh questions based on the textbook syllabus"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#52715D]" />
                    <span>Crafting Questions...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#52715D]" />
                    <span>Generate More Questions</span>
                  </>
                )}
              </Button>

              {questions.length > 0 && (
                <span className="text-xs font-semibold text-[#7A7C75]">
                  Answered: {answeredCount} / {questions.length}
                </span>
              )}
            </div>
          </div>
          <DialogTitle className="font-serif text-2xl text-[#171817] mt-2">
            {moduleTitle || 'Topic Capsule Evaluation'}
          </DialogTitle>
          <DialogDescription className="text-xs text-[#7A7C75]">
            Answer all 10 questions to test deep intuition, formulas, and verify syllabus completion.
          </DialogDescription>
        </DialogHeader>

        {loading || refreshing ? (
          <div className="py-20 flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-10 h-10 text-[#52715D] animate-spin" />
            <p className="font-serif text-base text-[#171817]">
              {refreshing
                ? 'Gemini Examiner is crafting 10 fresh syllabus questions...'
                : 'Gemini is loading tailored mastery questions...'}
            </p>
            <p className="text-xs text-[#7A7C75] max-w-sm text-center">
              Calibrating questions against official textbook principles, formulas, and syllabus depth.
            </p>
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-4">
            <p className="text-sm text-rose-600 font-medium">{error}</p>
            <Button
              onClick={() => {
                setError(null)
                setLoading(true)
              }}
              className="bg-[#C85A43] text-white rounded-xl"
            >
              Retry
            </Button>
          </div>
        ) : isSubmitted && scoreResult ? (
          /* ========================================================================= */
          /* SCORE & RESULTS SUMMARY VIEW                                             */
          /* ========================================================================= */
          <div className="py-6 space-y-6 animate-in fade-in duration-300">
            <div className="p-6 rounded-2xl bg-white border border-[#E5E3DB] text-center space-y-3 shadow-xs">
              <div
                className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                  scoreResult.percent >= 70
                    ? 'bg-[#52715D]/15 text-[#52715D]'
                    : 'bg-[#C85A43]/15 text-[#C85A43]'
                }`}
              >
                <Award className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-3xl font-bold text-[#171817]">
                {scoreResult.percent}% Score
              </h3>
              <p className="text-sm text-[#7A7C75]">
                You answered {scoreResult.correct} of {scoreResult.total} questions correctly.
                {scoreResult.percent >= 70
                  ? ' Topic Capsule Mastered! Syllabus progress updated.'
                  : ' Review the explanations below to solidify key principles.'}
              </p>
            </div>

            {/* Questions Review Breakdown */}
            <div className="space-y-4">
              <h4 className="font-serif text-lg font-semibold text-[#171817]">
                Answer Review &amp; Explanations
              </h4>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {questions.map((q, idx) => {
                  const userAns = selectedAnswers[idx]
                  const isCorrect = userAns === q.correctIndex
                  return (
                    <div
                      key={q.id || idx}
                      className={`p-4 rounded-xl border text-sm space-y-2 ${
                        isCorrect
                          ? 'border-emerald-200 bg-emerald-50/40'
                          : 'border-rose-200 bg-rose-50/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-[#171817]">
                          Q{idx + 1}. {q.question}
                        </span>
                        {isCorrect ? (
                          <span className="inline-flex items-center text-xs font-bold text-emerald-700 shrink-0">
                            <CheckCircle2 className="w-4 h-4 mr-1" /> Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-bold text-rose-700 shrink-0">
                            <XCircle className="w-4 h-4 mr-1" /> Incorrect
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#7A7C75]">
                        <strong className="text-[#171817]">Correct Answer:</strong>{' '}
                        {q.options[q.correctIndex]}
                      </p>
                      <p className="text-xs text-[#52715D] bg-white/70 p-2.5 rounded-lg border border-black/5 flex items-start gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Concept &amp; Explanation:</strong> {q.explanation}</span>
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5E3DB] flex items-center justify-between gap-3 flex-wrap">
              <Button
                variant="outline"
                onClick={() => fetchQuiz(true)}
                disabled={refreshing}
                className="border-[#52715D]/40 text-[#52715D] hover:bg-[#F0F6F2] hover:border-[#52715D] px-5 py-2.5 rounded-xl font-medium shadow-xs flex items-center gap-2 cursor-pointer text-xs transition-all"
              >
                {refreshing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#52715D]" />
                    <span>Crafting Questions...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-[#52715D]" />
                    <span>Generate More Questions</span>
                  </>
                )}
              </Button>

              <Button
                onClick={onClose}
                className="bg-[#C85A43] hover:bg-[#a84530] text-white px-7 py-3 rounded-xl font-medium shadow-xs cursor-pointer"
              >
                Back to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* ACTIVE 10-QUESTION CAROUSEL / NAVIGATION                                 */
          /* ========================================================================= */
          currentQ && (
            <div className="py-4 space-y-6">
              {/* Question Progress Tracker Pills */}
              <div className="flex items-center justify-between gap-1 overflow-x-auto py-1">
                {questions.map((_, idx) => {
                  const isAnswered = selectedAnswers[idx] !== undefined
                  const isCurrent = idx === currentIndex
                  return (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-[#C85A43] text-white shadow-xs scale-105'
                          : isAnswered
                          ? 'bg-[#52715D] text-white'
                          : 'bg-[#E5E3DB]/60 text-[#7A7C75] hover:bg-[#E5E3DB]'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>

              {/* Current Question Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-white border border-[#E5E3DB] space-y-4 shadow-xs">
                <div className="flex items-center justify-between text-xs text-[#7A7C75]">
                  <span className="font-semibold uppercase tracking-wider text-[#C85A43]">
                    Question {currentIndex + 1} of {questions.length}
                  </span>
                  <span className="italic">{currentQ.conceptTested}</span>
                </div>

                <h3 className="font-serif text-lg sm:text-xl font-semibold text-[#171817] leading-relaxed">
                  {currentQ.question}
                </h3>

                {/* 4 Choices */}
                <div className="grid grid-cols-1 gap-2.5 pt-2">
                  {currentQ.options.map((opt, optIdx) => {
                    const isSelected = selectedAnswers[currentIndex] === optIdx
                    const optionLetter = String.fromCharCode(65 + optIdx)
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(currentIndex, optIdx)}
                        className={`w-full p-4 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? 'border-[#C85A43] bg-[#F6E5DF]/40 text-[#171817] ring-2 ring-[#C85A43]/20 shadow-xs'
                            : 'border-[#E5E3DB] bg-[#FDFCF7] text-[#171817] hover:border-[#C85A43]/40 hover:bg-white'
                        }`}
                      >
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected
                              ? 'bg-[#C85A43] text-white'
                              : 'bg-[#E5E3DB] text-[#7A7C75]'
                          }`}
                        >
                          {optionLetter}
                        </span>
                        <span className="font-medium text-sm flex-1">{opt}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Footer Controls: Prev, Next, Submit */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded-xl border-[#E5E3DB] text-[#171817]"
                >
                  <ArrowLeft className="w-4 h-4 mr-1.5" />
                  Previous
                </Button>

                <div className="flex gap-2">
                  {currentIndex < questions.length - 1 ? (
                    <Button
                      onClick={() => setCurrentIndex((prev) => prev + 1)}
                      className="bg-[#52715D] hover:bg-[#435e4d] text-white rounded-xl px-5"
                    >
                      Next Question
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </Button>
                  ) : (
                    <Button
                      disabled={!allAnswered || submitting}
                      onClick={handleSubmitQuiz}
                      className="bg-[#C85A43] hover:bg-[#a84530] text-white rounded-xl px-6 font-medium shadow-xs"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Evaluating Mastery...
                        </>
                      ) : (
                        <>
                          Submit 10 MCQs
                          <Sparkles className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )
        )}
      </DialogContent>
    </Dialog>
  )
}
