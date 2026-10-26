'use client'

import React, { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'motion/react'
import { login, signup, requestPasswordReset } from './actions'
import { createClient } from '@/utils/supabase/client'
import {
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { triggerCompanionGuidance } from '@/components/mascot/Mascot'
import { MailSentCard } from '@/components/auth/MailSentCard'

function LoginFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'notice'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorCount, setErrorCount] = useState(0)

  // Mail Sent screen state
  const [mailSentState, setMailSentState] = useState<{
    isOpen: boolean
    email: string
    purpose: 'signup' | 'reset'
  } | null>(null)

  // Forgot password dialog
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetFeedback, setResetFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

  const formRef = useRef<HTMLFormElement | null>(null)
  const supabase = createClient()

  // Handle URL query notices (e.g. redirected from /auth/callback after dual-clicks or expired links)
  useEffect(() => {
    const notice = searchParams.get('notice')
    const error = searchParams.get('error')
    const reason = searchParams.get('reason')

    if (notice === 'already_verified') {
      setMessage({
        type: 'notice',
        text: 'Your email verification link has already been confirmed. Please sign in below to enter your classroom.',
      })
    } else if (notice === 'link_expired') {
      setMessage({
        type: 'error',
        text: reason
          ? `Authentication notice: ${decodeURIComponent(reason)}`
          : 'Verification link has expired or has already been used. Please sign in or request a fresh link below.',
      })
    } else if (error === 'auth-link-invalid') {
      setMessage({
        type: 'error',
        text: 'The verification link was invalid or already consumed. Please sign in directly or request a new link.',
      })
    }
  }, [searchParams])

  // Redirect if already authenticated
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.push(`/dashboard/${user.id}`)
      }
    })
  }, [router, supabase])

  const handleGoogleLogin = async () => {
    if (isLoading || isSubmitting) return
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${location.origin}/auth/callback`,
        },
      })
      if (error) {
        setMessage({ type: 'error', text: error.message })
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to initialize Google authentication.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isSubmitting || isLoading) return

    setIsSubmitting(true)
    setIsLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)

    try {
      if (isLogin) {
        const res = await login(formData)
        if (res?.error) {
          setMessage({ type: 'error', text: res.error })
          const newCount = errorCount + 1
          setErrorCount(newCount)

          if (newCount === 1) {
            triggerCompanionGuidance({
              targetSelector: '#password',
              animation: 'suspicious',
              expression: 'suspicious-right',
              mood: 'suspicious',
              message: 'Double-check your credentials to make sure your email and password are exact.',
              autoDismissMs: 10000,
            })
          } else {
            triggerCompanionGuidance({
              targetSelector: '#forgot-pass-btn',
              animation: 'suspicious',
              expression: 'skeptical-left',
              mood: 'warning',
              message: "Trouble signing in? Click 'Forgot Password?' right above to receive a reset link.",
              autoDismissMs: 12000,
            })
          }
        } else if (res?.success && res.userId) {
          const target = res.onboardingCompleted ? `/dashboard/${res.userId}` : '/onboarding'
          router.push(target)
          return
        }
      } else {
        const res = await signup(formData)
        if (res?.error) {
          const isExisting =
            res.error.toLowerCase().includes('already registered') ||
            res.error.toLowerCase().includes('already exists') ||
            res.error.toLowerCase().includes('account exists')

          if (isExisting) {
            setMessage({ type: 'error', text: res.error })
            triggerCompanionGuidance({
              targetSelector: '#toggle-auth-mode-btn',
              animation: 'suspicious',
              expression: 'skeptical-left',
              mood: 'warning',
              message: 'An account already exists with this email address. Switch to Sign In to continue.',
              autoDismissMs: 12000,
            })
          } else {
            setMessage({ type: 'error', text: res.error })
            triggerCompanionGuidance({
              targetSelector: '#email',
              animation: 'suspicious',
              expression: 'skeptical-right',
              mood: 'suspicious',
              message: res.error,
              autoDismissMs: 9000,
            })
          }
        } else if (res?.autoConfirmed && res?.userId) {
          setMessage({ type: 'success', text: res.success || 'Account verified. Redirecting...' })
          router.push('/onboarding')
          return
        } else if (res?.email) {
          setMailSentState({
            isOpen: true,
            email: res.email,
            purpose: 'signup',
          })
          triggerCompanionGuidance({
            animation: 'excited',
            expression: 'joyful-wide',
            mood: 'celebrate',
            message: 'Verification email dispatched. Tap the link in your inbox to unlock your classroom.',
            autoDismissMs: 10000,
          })
        }
      }
    } catch (err: any) {
      if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) {
        throw err
      }
      setMessage({
        type: 'error',
        text: 'Unable to connect to the authentication server. Please check your internet connection.',
      })
    } finally {
      setIsLoading(false)
      setIsSubmitting(false)
    }
  }

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resetEmail || isResetting) return

    setIsResetting(true)
    setResetFeedback(null)

    try {
      const formData = new FormData()
      formData.append('email', resetEmail)
      const res = await requestPasswordReset(formData)

      if (res?.error) {
        setResetFeedback({ type: 'error', text: res.error })
      } else {
        setResetDialogOpen(false)
        setMailSentState({
          isOpen: true,
          email: resetEmail,
          purpose: 'reset',
        })
      }
    } catch {
      setResetFeedback({
        type: 'error',
        text: 'Failed to dispatch reset email. Please try again in a moment.',
      })
    } finally {
      setIsResetting(false)
    }
  }

  return (
    <main className="min-h-[100dvh] w-full flex flex-col md:flex-row bg-[#F8F6F0] relative overflow-hidden font-sans text-[#171817] selection:bg-[#52715D]/20 selection:text-[#171817]">
      {/* Editorial Left Side: Atmospheric Clouds Artwork */}
      <section className="relative hidden md:flex md:w-1/2 lg:w-7/12 flex-col justify-between p-10 lg:p-16 xl:p-20 overflow-hidden bg-stone-900 border-r border-stone-200/40">
        {/* Background Artwork */}
        <div className="absolute inset-0 z-0 select-none pointer-events-none">
          <Image
            src="/landing_images/hero-clouds.jpg"
            alt="Atmospheric clouds"
            fill
            priority
            className="object-cover object-center brightness-90 contrast-[1.05]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-900/40 to-stone-900/30" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(82,113,93,0.3)_0%,transparent_60%)]" />
        </div>

        {/* Top Header: Brand Crest */}
        <header className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-lg">
            <Sparkles className="w-5 h-5 text-amber-300" strokeWidth={1.75} />
          </div>
          <div>
            <span className="font-serif text-2xl text-white font-normal tracking-tight block leading-none">
              AI Tutor
            </span>
          </div>
        </header>

        {/* Central Core: Clean Editorial Statement */}
        <div className="relative z-10 my-auto py-12 max-w-lg">
          <h1 className="font-serif text-4xl lg:text-5xl xl:text-6xl text-white font-normal tracking-tight leading-[1.1] mb-6 drop-shadow-sm">
            The Living Chalkboard for Inquiring Minds.
          </h1>
          <p className="text-base lg:text-lg text-white/80 leading-relaxed font-normal">
            Real-time voice tutoring, dynamic whiteboard derivations, and interactive guidance calibrated to your cognitive pace.
          </p>
        </div>

        {/* Bottom Editorial Quote */}
        <footer className="relative z-10 pt-6 border-t border-white/10 text-xs text-white/60 font-serif italic">
          <span>"Education is not the learning of facts, but the training of the mind to think."</span>
        </footer>
      </section>

      {/* Interactive Right Side: Authentication Stage */}
      <section className="w-full md:w-1/2 lg:w-5/12 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 relative z-10 min-h-[100dvh]">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Top Brand Header */}
          <div className="md:hidden flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-xl bg-[#52715D] text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-amber-200" strokeWidth={1.75} />
            </div>
            <span className="font-serif text-xl text-[#171817]">AI Tutor</span>
          </div>

          <AnimatePresence mode="wait">
            {mailSentState?.isOpen ? (
              <MailSentCard
                key="mail-sent-card"
                email={mailSentState.email}
                purpose={mailSentState.purpose}
                onBackToForm={() => setMailSentState(null)}
                onSwitchToLogin={() => {
                  setMailSentState(null)
                  setIsLogin(true)
                  setMessage({
                    type: 'notice',
                    text: 'Verification link sent. Enter your email and password below once confirmed.',
                  })
                }}
              />
            ) : (
              <motion.div
                key="auth-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                {/* Double-Bezel Hardware Architecture */}
                <div className="p-1.5 md:p-2 bg-black/[0.04] ring-1 ring-black/[0.06] rounded-[2rem] shadow-card">
                  <div className="bg-white rounded-[calc(2rem-0.375rem)] p-6 sm:p-8 md:p-9 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)]">
                    {/* Mode Toggle Switcher Pill */}
                    <div className="p-1 bg-stone-100 rounded-full flex items-center mb-6">
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(true)
                          setMessage(null)
                        }}
                        className={`flex-1 py-2 text-xs font-medium rounded-full transition-all duration-200 cursor-pointer ${
                          isLogin
                            ? 'bg-white text-[#171817] shadow-sm font-semibold'
                            : 'text-stone-500 hover:text-[#171817]'
                        }`}
                      >
                        Sign In
                      </button>
                      <button
                        id="toggle-auth-mode-btn"
                        type="button"
                        onClick={() => {
                          setIsLogin(false)
                          setMessage(null)
                        }}
                        className={`flex-1 py-2 text-xs font-medium rounded-full transition-all duration-200 cursor-pointer ${
                          !isLogin
                            ? 'bg-white text-[#171817] shadow-sm font-semibold'
                            : 'text-stone-500 hover:text-[#171817]'
                        }`}
                      >
                        Create Account
                      </button>
                    </div>

                    {/* Section Title */}
                    <div className="mb-6">
                      <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#171817] tracking-tight">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                      </h2>
                      <p className="text-xs sm:text-sm text-[#555852] mt-1">
                        {isLogin
                          ? 'Sign in to resume your active classroom session.'
                          : 'Sign up to start interactive 1-on-1 tutoring.'}
                      </p>
                    </div>

                    {/* Feedback Banners */}
                    {message && (
                      <div
                        className={`mb-5 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs font-medium border leading-relaxed transition-all ${
                          message.type === 'error'
                            ? 'bg-[#FDF2F0] text-[#9F3C27] border-[#F5C2B8]'
                            : message.type === 'success'
                            ? 'bg-[#F0F6F2] text-[#3D5A47] border-[#C8EBD2]'
                            : 'bg-amber-50 text-amber-900 border-amber-200/80'
                        }`}
                      >
                        {message.type === 'error' ? (
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#9F3C27]" />
                        ) : message.type === 'success' ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#3D5A47]" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                        )}
                        <span className="flex-1">{message.text}</span>
                      </div>
                    )}

                    {/* Form Component */}
                    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                      {/* Name for Signup */}
                      {!isLogin && (
                        <div className="space-y-1.5">
                          <Label
                            htmlFor="fullName"
                            className="text-[11px] font-mono uppercase tracking-wider text-stone-600 block"
                          >
                            Full Name
                          </Label>
                          <div className="relative">
                            <User
                              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
                              strokeWidth={1.5}
                            />
                            <Input
                              id="fullName"
                              name="fullName"
                              type="text"
                              required
                              placeholder="Your full name"
                              className="pl-10 h-11 bg-stone-50/70 border-stone-200 text-[#171817] placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-[#52715D]/20 focus-visible:border-[#52715D] rounded-xl text-sm transition-all"
                            />
                          </div>
                        </div>
                      )}

                      {/* Email Address */}
                      <div className="space-y-1.5">
                        <Label
                          htmlFor="email"
                          className="text-[11px] font-mono uppercase tracking-wider text-stone-600 block"
                        >
                          Email Address
                        </Label>
                        <div className="relative">
                          <Mail
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
                            strokeWidth={1.5}
                          />
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            required
                            placeholder="name@example.com"
                            className="pl-10 h-11 bg-stone-50/70 border-stone-200 text-[#171817] placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-[#52715D]/20 focus-visible:border-[#52715D] rounded-xl text-sm transition-all"
                          />
                        </div>
                      </div>

                      {/* Password Field */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label
                            htmlFor="password"
                            className="text-[11px] font-mono uppercase tracking-wider text-stone-600"
                          >
                            Password
                          </Label>
                          {isLogin && (
                            <button
                              id="forgot-pass-btn"
                              type="button"
                              onClick={() => {
                                setResetDialogOpen(true)
                                setResetFeedback(null)
                              }}
                              className="text-xs text-[#52715D] hover:text-[#3D5A47] font-medium transition-colors cursor-pointer"
                            >
                              Forgot Password?
                            </button>
                          )}
                        </div>
                        <div className="relative">
                          <Lock
                            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400"
                            strokeWidth={1.5}
                          />
                          <Input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            required
                            placeholder={isLogin ? 'Enter your password' : 'Create password (min. 6 characters)'}
                            minLength={6}
                            className="pl-10 pr-11 h-11 bg-stone-50/70 border-stone-200 text-[#171817] placeholder:text-stone-400 focus-visible:ring-2 focus-visible:ring-[#52715D]/20 focus-visible:border-[#52715D] rounded-xl text-sm transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-stone-400 hover:text-stone-700 transition-colors cursor-pointer"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" strokeWidth={1.75} />
                            ) : (
                              <Eye className="w-4 h-4" strokeWidth={1.75} />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Primary Button */}
                      <Button
                        type="submit"
                        disabled={isLoading || isSubmitting}
                        className="group w-full h-12 bg-[#52715D] hover:bg-[#3D5A47] text-white font-medium rounded-full shadow-md transition-all active:scale-[0.98] mt-4 cursor-pointer flex items-center justify-between px-6 disabled:opacity-60"
                      >
                        <span className="text-sm">
                          {isLoading ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Please wait...</span>
                            </span>
                          ) : isLogin ? (
                            'Sign In'
                          ) : (
                            'Create Account'
                          )}
                        </span>
                        <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center transition-transform group-hover:translate-x-1 duration-200">
                          <ArrowRight className="w-4 h-4 text-white" />
                        </div>
                      </Button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-4 my-6">
                      <div className="flex-1 h-px bg-stone-200" />
                      <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">
                        Or Continue With
                      </span>
                      <div className="flex-1 h-px bg-stone-200" />
                    </div>

                    {/* Google OAuth Button */}
                    <Button
                      onClick={handleGoogleLogin}
                      disabled={isLoading || isSubmitting}
                      type="button"
                      variant="outline"
                      className="w-full h-11 bg-white text-[#171817] border-stone-200 hover:bg-stone-50 rounded-full transition-colors font-medium text-xs cursor-pointer shadow-xs flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span>Google Account</span>
                    </Button>

                    {/* Footer switch prompt */}
                    <div className="mt-6 text-center text-xs text-stone-500">
                      <span>{isLogin ? "Don't have an account? " : 'Already registered? '}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsLogin(!isLogin)
                          setMessage(null)
                        }}
                        className="text-[#52715D] hover:text-[#3D5A47] font-semibold transition-colors cursor-pointer"
                      >
                        {isLogin ? 'Create Account' : 'Sign In'}
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Forgot Password Modal (shadcn Dialog) */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="font-serif text-2xl text-[#171817] font-normal tracking-tight">
              Reset Your Password
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500 mt-1 leading-relaxed">
              Enter your email address and we will send you instructions to reset your password.
            </DialogDescription>
          </DialogHeader>

          {resetFeedback && (
            <div
              className={`p-3 rounded-xl text-xs font-medium border leading-relaxed ${
                resetFeedback.type === 'error'
                  ? 'bg-[#FDF2F0] text-[#9F3C27] border-[#F5C2B8]'
                  : 'bg-[#F0F6F2] text-[#3D5A47] border-[#C8EBD2]'
              }`}
            >
              {resetFeedback.text}
            </div>
          )}

          <form onSubmit={handlePasswordResetRequest} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email" className="text-[11px] font-mono uppercase tracking-wider text-stone-600">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <Input
                  id="reset-email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="pl-10 h-11 bg-stone-50/70 border-stone-200 rounded-xl text-sm"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isResetting || !resetEmail}
              className="w-full h-11 bg-[#52715D] hover:bg-[#3D5A47] text-white font-medium rounded-full shadow-sm cursor-pointer transition-all active:scale-[0.98] disabled:opacity-60"
            >
              {isResetting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending Link...</span>
                </span>
              ) : (
                <span>Send Password Reset Link</span>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  )
}

function LoginLoadingSkeleton() {
  return (
    <div className="min-h-[100dvh] w-full flex items-center justify-center bg-[#F8F6F0]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-[#52715D]/20 animate-pulse flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-[#52715D]" />
        </div>
        <span className="font-serif text-lg text-stone-600">Loading AI Tutor...</span>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoadingSkeleton />}>
      <LoginFormContent />
    </Suspense>
  )
}
