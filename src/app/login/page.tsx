'use client'

import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/utils/supabase/client'
import { sendEmailCode, verifyEmailCode, loginWithPassword } from './actions'
import { completeOnboardingAction } from '@/app/onboarding/actions'
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react'

interface SixDigitOtpInputProps {
  value: string
  onChange: (val: string) => void
  onComplete?: (val: string) => void
  disabled?: boolean
  autoFocus?: boolean
  hasError?: boolean
}

/**
 * Classical 6-Digit Discrete OTP Input Group
 * Supports auto-advance, backspace backward navigation, full paste distribution, and mobile autofill.
 */
function SixDigitOtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  hasError = false,
}: SixDigitOtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const digits = useMemo(() => {
    const cleaned = value.replace(/\D/g, '').slice(0, 6)
    return Array.from({ length: 6 }, (_, i) => cleaned[i] || '')
  }, [value])

  useEffect(() => {
    if (autoFocus && inputRefs.current[0]) {
      inputRefs.current[0]?.focus()
    }
  }, [autoFocus])

  const handlePastedString = (pasted: string, startIndex: number = 0) => {
    const cleaned = pasted.replace(/\D/g, '').slice(0, 6)
    if (!cleaned) return

    const newDigits = [...digits]
    for (let i = 0; i < cleaned.length && startIndex + i < 6; i++) {
      newDigits[startIndex + i] = cleaned[i]
    }
    const updated = newDigits.join('')
    onChange(updated)

    const nextIndex = Math.min(5, startIndex + cleaned.length)
    inputRefs.current[nextIndex]?.focus()

    if (updated.length === 6 && onComplete) {
      onComplete(updated)
    }
  }

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '')

    // Handle full paste or multi-char autofill
    if (rawVal.length > 1) {
      handlePastedString(rawVal, index)
      return
    }

    if (!rawVal) {
      // Cleared current box
      const newDigits = [...digits]
      newDigits[index] = ''
      onChange(newDigits.join(''))
      return
    }

    const digit = rawVal[rawVal.length - 1]
    const newDigits = [...digits]
    newDigits[index] = digit
    const updated = newDigits.join('')
    onChange(updated)

    // Advance focus to next cell
    if (index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    if (updated.length === 6 && onComplete) {
      onComplete(updated)
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Backspace on empty cell moves to previous and clears it
        const newDigits = [...digits]
        newDigits[index - 1] = ''
        onChange(newDigits.join(''))
        inputRefs.current[index - 1]?.focus()
        e.preventDefault()
      } else if (digits[index]) {
        const newDigits = [...digits]
        newDigits[index] = ''
        onChange(newDigits.join(''))
        e.preventDefault()
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
      e.preventDefault()
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus()
      e.preventDefault()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text')
    handlePastedString(pasted, 0)
  }

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-2.5 my-3">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputRefs.current[idx] = el
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={idx === 0 ? 6 : 1}
          autoComplete={idx === 0 ? 'one-time-code' : 'off'}
          value={digit}
          disabled={disabled}
          onChange={(e) => handleInputChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={`w-11 h-14 sm:w-12 sm:h-14 rounded-xl border text-center font-mono text-2xl font-bold transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] outline-none ${
            hasError
              ? 'border-rose-300 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20'
              : digit
              ? 'border-[#52715D] bg-white text-[#1F1C18] focus:border-[#52715D] focus:ring-2 focus:ring-[#52715D]/20'
              : 'border-[#E5E3DB] bg-white text-[#1F1C18] focus:border-[#1F1C18] focus:ring-2 focus:ring-neutral-900/10'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      ))}
    </div>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  // State
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [step, setStep] = useState<'email' | 'otp' | 'password'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const isSubmitting = isLoading // Alias for submission guard assertions
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [infoMsg, setInfoMsg] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Cooldown timer for resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  // Inspect query params for callback notices
  useEffect(() => {
    const error = searchParams.get('error')
    const notice = searchParams.get('notice')
    if (error === 'auth-link-invalid') {
      setErrorMsg('The sign-in link was invalid or already used. Please request a fresh code.')
    } else if (notice === 'already_verified') {
      setInfoMsg('Your email has been verified. Please sign in below.')
    }
  }, [searchParams])

  // Redirect if already authenticated
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase
          .from('profiles')
          .select('onboarding_completed')
          .eq('id', user.id)
          .single()
          .then(async ({ data }) => {
            const pending = typeof window !== 'undefined' ? localStorage.getItem('pending_onboarding') : null
            if (pending) {
              try {
                const parsed = JSON.parse(pending)
                localStorage.removeItem('pending_onboarding')
                await completeOnboardingAction(parsed)
                router.push(`/dashboard/${user.id}`)
                return
              } catch {}
            }
            if (data?.onboarding_completed) {
              router.push(`/dashboard/${user.id}`)
            } else {
              router.push('/onboarding')
            }
          })
      }
    })
  }, [router, supabase])

  // Handle Google OAuth
  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true)
      setErrorMsg(null)
      const siteUrl = window.location.origin
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${siteUrl}/auth/callback`,
        },
      })
      if (error) {
        setErrorMsg(error.message)
      }
    } catch {
      setErrorMsg('Unable to connect to Google authentication. Please try email sign-in.')
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Send Sign-in Code
  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)
    setInfoMsg(null)

    const res = await sendEmailCode(email)
    setIsLoading(false)

    if (res.error) {
      setErrorMsg(res.error)
    } else {
      setStep('otp')
      setCode('')
      setResendCooldown(60)
      setInfoMsg(`We sent a 6-digit sign-in code to ${email}.`)
    }
  }

  // Handle Verify OTP
  const triggerVerifyCode = async (verificationCode: string) => {
    const cleanCode = verificationCode.replace(/\D/g, '')
    if (cleanCode.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit verification code.')
      return
    }

    if (isLoading) return
    setIsLoading(true)
    setErrorMsg(null)

    const res = await verifyEmailCode(email, cleanCode)
    setIsLoading(false)

    if (res.error) {
      setErrorMsg(res.error)
    } else {
      if (res.onboardingCompleted) {
        router.push(`/dashboard/${res.userId}`)
      } else {
        router.push('/onboarding')
      }
    }
  }

  const handleVerifyCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    triggerVerifyCode(code)
  }

  // Handle Password Sign-in fallback
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMsg('Please enter your email and password.')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)

    const formData = new FormData()
    formData.append('email', email)
    formData.append('password', password)

    const res = await loginWithPassword(formData)
    setIsLoading(false)

    if (res.error) {
      setErrorMsg(res.error)
    } else {
      if (res.onboardingCompleted) {
        router.push(`/dashboard/${res.userId}`)
      } else {
        router.push('/onboarding')
      }
    }
  }

  return (
    <div className="flex min-h-screen w-full bg-[#FAF9F5] text-[#1F1C18]">
      {/* Left Column: Form (45% - 50%) */}
      <div className="flex w-full flex-col justify-between p-8 md:w-1/2 md:p-12 lg:w-[46%] lg:p-16">
        {/* Brand Header */}
        <div className="flex items-center justify-between">
          <Link href="/" className="font-serif text-2xl font-normal tracking-tight text-[#1F1C18]">
            Anaxly
          </Link>
        </div>

        {/* Central Content Box */}
        <div className="mx-auto my-auto w-full max-w-[390px] py-8">
          <AnimatePresence mode="wait">
            {step === 'email' && (
              <motion.div
                key="email-step"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <h1 className="font-serif text-4xl font-normal tracking-tight text-[#1F1C18]">
                  Come on in.
                </h1>
                <p className="mt-2 text-sm text-neutral-500">
                  Sign in or create an account.
                </p>

                {/* Google Sign-in Pill Button */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                  className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl border border-neutral-200/90 bg-white py-3.5 px-4 text-sm font-medium text-neutral-800 shadow-[0_2px_8px_rgba(0,0,0,0.03)] transition-all hover:bg-neutral-50 active:scale-[0.99] disabled:opacity-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Classical Subtle Divider */}
                <div className="relative my-7 flex items-center justify-center">
                  <div className="w-full border-t border-neutral-200/90" />
                  <span className="absolute bg-[#FAF9F5] px-3 text-xs font-normal text-neutral-400">
                    or
                  </span>
                </div>

                {/* Email Form */}
                <form onSubmit={handleSendCode}>
                  <div className="relative">
                    <label
                      htmlFor="email"
                      className="block text-xs font-medium text-neutral-600 mb-1.5"
                    >
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-2xl border border-neutral-200/90 bg-white px-4 py-3.5 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-colors focus:border-neutral-900 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#2C241E] py-3.5 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#1E1712] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Continue with email'
                    )}
                  </button>
                </form>

                <p className="mt-4 text-center text-xs text-neutral-400">
                  We&apos;ll send you a sign-in code.
                </p>

                {/* Optional toggle for password users */}
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMsg(null)
                      setStep('password')
                    }}
                    className="text-xs text-neutral-500 hover:text-neutral-800 underline decoration-neutral-300 underline-offset-4 transition-colors"
                  >
                    Sign in with password instead
                  </button>
                </div>
              </motion.div>
            )}

            {step === 'otp' && (
              <motion.div
                key="otp-step"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null)
                    setStep('email')
                  }}
                  className="mb-4 inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Use different email</span>
                </button>

                <h1 className="font-serif text-3xl font-normal tracking-tight text-[#1F1C18]">
                  Check your inbox.
                </h1>
                <p className="mt-2 text-sm text-neutral-500">
                  We sent a 6-digit code to{' '}
                  <span className="font-medium text-neutral-800">{email}</span>.
                </p>

                <form onSubmit={handleVerifyCodeSubmit} className="mt-6">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="six-digit-otp"
                        className="block text-xs font-medium text-neutral-600"
                      >
                        6-digit verification code
                      </label>
                      <span className="text-[11px] text-neutral-400">
                        Auto-submits on entry
                      </span>
                    </div>

                    <SixDigitOtpInput
                      value={code}
                      onChange={(newCode) => {
                        setCode(newCode)
                        setErrorMsg(null)
                      }}
                      onComplete={(completeCode) => {
                        triggerVerifyCode(completeCode)
                      }}
                      disabled={isSubmitting}
                      hasError={Boolean(errorMsg)}
                    />
                  </div>

                  {/* Security Validity Badge */}
                  <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-neutral-500">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#52715D]" />
                    <span>Valid for 10 minutes &bull; Single-use only</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || code.length < 6}
                    className="mt-5 flex w-full items-center justify-center rounded-2xl bg-[#2C241E] py-3.5 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#1E1712] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Verify and continue'
                    )}
                  </button>
                </form>

                <div className="mt-5 text-center">
                  {resendCooldown > 0 ? (
                    <span className="text-xs text-neutral-400">
                      Resend code in {resendCooldown}s
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendCode()}
                      disabled={isSubmitting}
                      className="text-xs text-neutral-600 hover:text-neutral-900 underline decoration-neutral-300 underline-offset-4 transition-colors"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {step === 'password' && (
              <motion.div
                key="password-step"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg(null)
                    setStep('email')
                  }}
                  className="mb-4 inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-800 transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Back to email code</span>
                </button>

                <h1 className="font-serif text-3xl font-normal tracking-tight text-[#1F1C18]">
                  Sign in.
                </h1>
                <p className="mt-2 text-sm text-neutral-500">
                  Enter your email and password.
                </p>

                <form onSubmit={handlePasswordSignIn} className="mt-6 space-y-4">
                  <div>
                    <label
                      htmlFor="pwd-email"
                      className="block text-xs font-medium text-neutral-600 mb-1.5"
                    >
                      Email address
                    </label>
                    <input
                      id="pwd-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full rounded-2xl border border-neutral-200/90 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-sm transition-colors focus:border-neutral-900 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="password"
                      className="block text-xs font-medium text-neutral-600 mb-1.5"
                    >
                      Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-2xl border border-neutral-200/90 bg-white px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-sm transition-colors focus:border-neutral-900 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#2C241E] py-3.5 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#1E1712] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Sign in'
                    )}
                  </button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedback Messages */}
          {errorMsg && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-rose-200/80 bg-rose-50/70 p-3 text-xs text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {infoMsg && (
            <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3 text-xs text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{infoMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Links */}
        <div className="flex justify-end gap-6 text-xs text-neutral-400">
          <Link href="/terms" className="hover:text-neutral-700 transition-colors">
            Terms
          </Link>
          <Link href="/privacy" className="hover:text-neutral-700 transition-colors">
            Privacy
          </Link>
        </div>
      </div>

      {/* Right Column: Classical Arch Artwork (Desktop Only, 50% - 54%) */}
      <div className="relative hidden md:block md:w-1/2 lg:w-[54%] overflow-hidden border-l border-neutral-200/60 bg-[#EFECE6]">
        <Image
          src="/landing_images/classical-arch.jpg"
          alt="Classical Italian arch overlooking golden sunlit hills"
          fill
          priority
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover object-center select-none pointer-events-none"
        />
        {/* Soft vignette gradient on edge */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FAF9F5]/20 via-transparent to-transparent pointer-events-none" />
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#FAF9F5]">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
