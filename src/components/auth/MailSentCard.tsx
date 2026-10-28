'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Mail, CheckCircle2, RefreshCw, ArrowLeft, ExternalLink, ShieldCheck, Clock } from 'lucide-react'
import { resendVerificationEmail } from '@/app/login/actions'

interface MailSentCardProps {
  email: string
  purpose?: 'signup' | 'reset'
  onBackToForm: () => void
  onSwitchToLogin: () => void
}

export const MailSentCard: React.FC<MailSentCardProps> = ({
  email,
  purpose = 'signup',
  onBackToForm,
  onSwitchToLogin,
}) => {
  const [cooldown, setCooldown] = useState(60)
  const [isResending, setIsResending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return
    setIsResending(true)
    setFeedback(null)

    try {
      const formData = new FormData()
      formData.append('email', email)
      const res = await resendVerificationEmail(formData)

      if (res?.error) {
        setFeedback({ type: 'error', message: res.error })
      } else {
        setFeedback({
          type: 'success',
          message: res?.success || 'A fresh verification email has been dispatched via Brevo.',
        })
        setCooldown(60)
      }
    } catch {
      setFeedback({
        type: 'error',
        message: 'Unable to reach the mail server. Please verify your connection and try again.',
      })
    } finally {
      setIsResending(false)
    }
  }

  // Determine provider webmail URL for common student domains
  const getWebmailUrl = (emailAddr: string) => {
    const domain = emailAddr.split('@')[1]?.toLowerCase() || ''
    if (domain.includes('gmail')) return 'https://mail.google.com'
    if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live')) {
      return 'https://outlook.live.com'
    }
    if (domain.includes('yahoo')) return 'https://mail.yahoo.com'
    if (domain.includes('icloud')) return 'https://www.icloud.com/mail'
    return `mailto:${emailAddr}`
  }

  const webmailUrl = getWebmailUrl(email)
  const isWebmailExternal = webmailUrl.startsWith('http')

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -16 }}
      transition={{ type: 'spring', stiffness: 280, damping: 26 }}
      className="w-full max-w-md mx-auto"
    >
      {/* Outer Machined Bezel */}
      <div className="p-1.5 md:p-2 bg-black/[0.04] ring-1 ring-black/[0.06] rounded-[2rem] shadow-card backdrop-blur-xs">
        {/* Inner Core Card */}
        <Card className="bg-white border-0 rounded-[calc(2rem-0.375rem)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] overflow-hidden">
          <CardHeader className="text-center pt-8 pb-4 px-6 md:px-8">
            {/* Animated Floating Envelope Stage */}
            <div className="relative mx-auto w-24 h-24 mb-4 flex items-center justify-center">
              {/* Concentric Ambient Glow Rings */}
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.35, 0.1, 0.35] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-0 rounded-full bg-[var(--accent-sage)]/20 blur-md pointer-events-none"
              />
              <motion.div
                animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0.25, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute inset-2 rounded-full border border-[var(--accent-sage-border)] pointer-events-none"
              />

              {/* Central Machined Icon Orb */}
              <motion.div
                initial={{ rotate: -8, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="relative z-10 w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-sage-soft)] to-[#E0EBE3] border border-[var(--accent-sage-border)] flex items-center justify-center shadow-md text-[var(--accent-sage-hover)]"
              >
                <Mail className="w-8 h-8 text-[var(--accent-sage-hover)]" strokeWidth={1.75} />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 400, damping: 15 }}
                  className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-[var(--accent-sage)] text-white flex items-center justify-center shadow-sm border-2 border-white"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </motion.div>
              </motion.div>
            </div>

            {/* Provider Accreditation Badge */}
            <div className="flex justify-center mb-3">
              <Badge
                variant="outline"
                className="bg-[#F4F7F5] text-[var(--accent-sage-hover)] border-[var(--accent-sage-border)] font-mono text-[10px] tracking-wide uppercase px-2.5 py-0.5 rounded-full flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3 h-3 text-[var(--accent-sage)]" />
                <span>Brevo Certified Dispatch</span>
              </Badge>
            </div>

            <CardTitle className="font-serif text-2xl md:text-3xl font-normal text-[#171817] tracking-tight">
              {purpose === 'reset' ? 'Password Reset Dispatched' : 'Verification Link Sent'}
            </CardTitle>

            <CardDescription className="text-xs md:text-sm text-[#555852] mt-1.5 leading-relaxed">
              We have dispatched a secure authentication email to your scholar address:
            </CardDescription>

            {/* Interactive Email Address Pill */}
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-stone-100/80 border border-stone-200 text-[#171817] font-mono text-xs max-w-full truncate shadow-inner">
              <span className="truncate">{email}</span>
            </div>
          </CardHeader>

          <CardContent className="px-6 md:px-8 pt-2 pb-6 space-y-4">
            {/* Feedback notification banner */}
            <AnimatePresence>
              {feedback && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`p-3 rounded-xl text-xs font-medium border leading-relaxed flex items-start gap-2 ${
                    feedback.type === 'success'
                      ? 'bg-[#F0F6F2] text-[var(--accent-sage-hover)] border-[#C8EBD2]'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  <span className="shrink-0 mt-0.5">•</span>
                  <span>{feedback.message}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Step-by-Step Educational Verification Guidelines */}
            <div className="bg-[#FAF9F5] border border-stone-200/80 rounded-2xl p-4 text-xs text-[#555852] space-y-2.5">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-stone-200/80 text-[#171817] font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span className="leading-snug">
                  Inspect your email inbox for a message from <strong>AI Tutor</strong> via Brevo.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-stone-200/80 text-[#171817] font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span className="leading-snug">
                  Click the <strong>Confirm Registration</strong> button. If you double-click or use link scanners, our dual-click guard will smoothly activate your account.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-stone-200/80 text-[#171817] font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span className="leading-snug text-stone-500">
                  Allow up to 60 seconds. If the mail is not in your primary inbox, please inspect your <em>Spam</em> or <em>Promotions</em> folder.
                </span>
              </div>
            </div>

            {/* Primary Action: Direct Webmail Link */}
            <Button
              asChild
              className="w-full h-11 bg-[var(--accent-sage)] hover:bg-[#3D5A47] text-white font-medium rounded-full shadow-sm transition-all active:scale-[0.98] cursor-pointer"
            >
              <a
                href={webmailUrl}
                target={isWebmailExternal ? '_blank' : undefined}
                rel={isWebmailExternal ? 'noopener noreferrer' : undefined}
                className="flex items-center justify-center gap-2"
              >
                <span>Open Email Inbox</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </Button>

            {/* Secondary Action: Resend with Cooldown */}
            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={cooldown > 0 || isResending}
              className="w-full h-10 border-stone-200 text-[#171817] hover:bg-stone-50 rounded-full font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
              {isResending ? (
                <span>Dispatching via Brevo...</span>
              ) : cooldown > 0 ? (
                <span className="flex items-center gap-1.5 text-stone-500">
                  <Clock className="w-3 h-3" />
                  <span>Resend available in {cooldown}s</span>
                </span>
              ) : (
                <span>Resend Verification Email</span>
              )}
            </Button>
          </CardContent>

          <CardFooter className="px-6 md:px-8 py-4 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={onBackToForm}
              className="text-stone-500 hover:text-[#171817] transition-colors cursor-pointer flex items-center gap-1 font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Correct Email</span>
            </button>

            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-[var(--accent-warm)] hover:text-[var(--accent-warm-hover)] transition-colors cursor-pointer font-medium"
            >
              Sign In Instead
            </button>
          </CardFooter>
        </Card>
      </div>
    </motion.div>
  )
}
