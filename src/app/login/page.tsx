'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'motion/react'
import { createClient } from '@/utils/supabase/client'
import { sendEmailCode, verifyEmailCode, loginWithPassword } from './actions'
import { completeOnboardingAction } from '@/app/onboarding/actions'
import { Loader2, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'

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
  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
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
      setResendCooldown(60)
      setInfoMsg(`We sent a 6-digit sign-in code to ${email}.`)
    }
  }

  // Handle Verify OTP
  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!code || code.trim().length < 6) {
      setErrorMsg('Please enter the full 6-digit code.')
      return
    }

    setIsLoading(true)
    setErrorMsg(null)

    const res = await verifyEmailCode(email, code)
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
            AI Tutor
          </Link>
        </div>

        {/* Central Content Box */}
        <div className="mx-auto my-auto w-full max-w-[380px] py-8">
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
                    disabled={isLoading}
                    className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#2C241E] py-3.5 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#1E1712] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isLoading ? (
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

                <form onSubmit={handleVerifyCode} className="mt-6">
                  <div>
                    <label
                      htmlFor="code"
                      className="block text-xs font-medium text-neutral-600 mb-1.5"
                    >
                      6-digit code
                    </label>
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      autoFocus
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="123456"
                      className="w-full rounded-2xl border border-neutral-200/90 bg-white px-4 py-3.5 text-center text-xl tracking-[0.35em] font-medium text-neutral-900 placeholder:tracking-normal placeholder:text-sm placeholder:text-neutral-400 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-colors focus:border-neutral-900 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || code.length < 6}
                    className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#2C241E] py-3.5 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#1E1712] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isLoading ? (
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
                      onClick={handleSendCode}
                      disabled={isLoading}
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
                    disabled={isLoading}
                    className="mt-4 flex w-full items-center justify-center rounded-2xl bg-[#2C241E] py-3.5 px-4 text-sm font-medium text-white shadow-sm transition-all hover:bg-[#1E1712] active:scale-[0.99] disabled:opacity-50"
                  >
                    {isLoading ? (
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
