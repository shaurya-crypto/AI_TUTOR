'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Mail, ArrowRight, BookOpen, Check, Copy } from 'lucide-react'

interface PricingNoticeModalProps {
  isOpen: boolean
  onClose: () => void
  userId?: string
  completedModuleName?: string
}

export function PricingNoticeModal({
  isOpen,
  onClose,
  userId,
  completedModuleName,
}: PricingNoticeModalProps) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const contactEmail = 'shauryaprabhakar097@gmail.com'

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(contactEmail)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
    }
  }

  const handleReturnToDashboard = () => {
    onClose()
    if (userId) {
      router.push(`/dashboard/${userId}`)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg w-[94vw] bg-[#FDFCF7] border border-[#E5E2D9] rounded-3xl p-6 sm:p-8 shadow-2xl text-[#1F1C18]">
        <DialogHeader className="space-y-3 text-center pb-2">
          {/* Subtle Classical Tag */}
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-[#D5D0C2] bg-[#F4F1E8] px-3.5 py-1 text-xs font-semibold uppercase tracking-wider text-[#52715D]">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Complimentary Session Completed</span>
          </div>

          <DialogTitle className="font-serif text-2xl sm:text-3xl font-normal tracking-tight text-[#1F1C18]">
            Early Access Quota Reached
          </DialogTitle>

          <DialogDescription className="text-sm leading-relaxed text-[#57534E] max-w-md mx-auto pt-1">
            {completedModuleName ? (
              <>
                You have successfully completed{' '}
                <strong className="text-[#1F1C18] font-medium">"{completedModuleName}"</strong>.
              </>
            ) : (
              'You have completed your complimentary full learning capsule.'
            )}{' '}
            Full curriculum access, personalized learning roadmaps, and pricing plans are currently in active development.
          </DialogDescription>
        </DialogHeader>

        <div className="my-2 space-y-4">
          {/* Development Status Card */}
          <div className="rounded-2xl border border-[#E8E5DC] bg-white p-4.5 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#78716C]">
              <span>Next Steps & Extended Access</span>
            </div>
            <p className="text-xs leading-relaxed text-[#57534E]">
              We are releasing new chapters and flexible subscription tiers soon. If you would like immediate early access to further chapters or have feedback on your session, reach out directly:
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1.5 border-t border-[#F0ECE1]">
              <span className="font-mono text-xs text-[#2D2A26] font-semibold break-all">
                {contactEmail}
              </span>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#D5D0C2] bg-[#FAF8F3] hover:bg-[#F0ECE1] text-xs font-medium text-[#2D2A26] transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-[#78716C]" />
                    <span>Copy Email</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <a
            href={`mailto:${contactEmail}?subject=Anaxly%20Platform%20Access%20Inquiry&body=Hi%20Shaurya%2C%0A%0AI%20completed%20my%20complimentary%20session%20and%20would%20like%20to%20request%20extended%20access%20to%20further%20chapters.`}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-[#2D2A26] hover:bg-[#1A1816] text-[#FDFCF7] text-sm font-semibold py-3 px-4 rounded-xl transition-all shadow-xs"
          >
            <Mail className="w-4 h-4" />
            <span>Contact via Email</span>
          </a>

          <button
            type="button"
            onClick={handleReturnToDashboard}
            className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 border border-[#D5D0C2] bg-white hover:bg-[#FAF8F3] text-[#2D2A26] text-sm font-semibold py-3 px-4 rounded-xl transition-all"
          >
            <span>Return to Dashboard</span>
            <ArrowRight className="w-4 h-4 text-[#78716C]" />
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
