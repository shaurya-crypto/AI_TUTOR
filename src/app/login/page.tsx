'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { login, signup } from './actions'
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
import { triggerCompanionGuidance } from '@/components/mascot/Mascot'

export default function LoginPage() {
  const router = useRouter()
  const [isLogin, setIsLogin] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorCount, setErrorCount] = useState(0)

  const supabase = createClient()

  // Redirect if already authenticated
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.push(`/dashboard/${user.id}`)
      }
    })
  }, [router, supabase])

  const handleGoogleLogin = async () => {
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
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Failed to initialize Google authentication.' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
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
              message: "Wait a moment... please double-check your credentials and enter your registered email and password.",
              autoDismissMs: 11000,
            })
          } else {
            triggerCompanionGuidance({
              targetSelector: '#password',
              animation: 'suspicious',
              expression: 'skeptical-left',
              mood: 'warning',
              message: "Still having trouble? If you forgot your password, click 'Forgot Password?' right above to get a reset link.",
              autoDismissMs: 14000,
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
            res.error.toLowerCase().includes('already in use')

          if (isExisting) {
            setMessage({ type: 'error', text: 'An account with this email address already exists.' })
            triggerCompanionGuidance({
              targetSelector: '#toggle-auth-mode-btn',
              animation: 'suspicious',
              expression: 'skeptical-left',
              mood: 'warning',
              message: "An account already exists with this email. Tap here to go to the Sign In page and enter your credentials.",
              autoDismissMs: 14000,
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
          setMessage({ type: 'success', text: res.success || 'Welcome! Redirecting to setup...' })
          router.push('/onboarding')
          return
        } else if (res?.success) {
          setMessage({ type: 'success', text: res.success })
          triggerCompanionGuidance({
            animation: 'excited',
            expression: 'joyful-wide',
            mood: 'celebrate',
            message: "Account created successfully. Check your email to confirm and unlock your AI classroom.",
          })
        }
      }
    } catch (err: any) {
      if (err?.message === 'NEXT_REDIRECT' || err?.digest?.startsWith('NEXT_REDIRECT')) {
        throw err
      }
      setMessage({
        type: 'error',
        text: 'Unable to connect to the authentication server. Please check your network.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] w-full flex flex-col md:flex-row bg-[#F8F6F0] bg-canvas relative overflow-hidden text-[#171817]">
      {/* Botanical Linework Pattern Overlay */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03] text-[#171817]">
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" className="absolute top-0 left-0 w-full h-full">
          <path d="M-100,200 C150,250 200,500 -50,600" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M-50,300 C100,320 120,400 -20,480" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M800,-50 C750,200 900,400 1100,500" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M900,100 C880,180 950,250 1050,300" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>

      {/* Left Column: Brand & Editorial */}
      <div className="w-full md:w-1/2 p-8 md:p-16 lg:p-24 flex flex-col justify-center relative z-10">
        <div className="max-w-md">
          {/* Brand Crest */}
          <div className="flex items-center gap-3.5 mb-10">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#E5E3DB] flex items-center justify-center text-[#52715D] shadow-sm">
              <Sparkles className="w-5 h-5 text-[#52715D]" />
            </div>
            <div>
              <span className="font-serif text-2xl text-[#171817] font-normal leading-none block">
                AI Tutor
              </span>
              <span className="text-xs text-[#7A7C75] uppercase tracking-wider block mt-0.5">
                Scholar's Edition
              </span>
            </div>
          </div>

          <h1 className="font-serif text-5xl md:text-6xl tracking-tight leading-[1.1] text-[#171817] mb-6">
            Botanical Intelligence for Scholars
          </h1>
          <p className="text-base md:text-lg text-[#555852] leading-relaxed max-w-[36ch]">
            Real-time, bidirectional voice tutoring calibrated to your class syllabus and cognitive pace.
          </p>
        </div>
      </div>

      {/* Right Column: Authentication Panel */}
      <div className="w-full md:w-1/2 p-4 md:p-8 flex items-center justify-center relative z-10">
        <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-3xl shadow-[0_20px_40px_-15px_rgba(23,24,23,0.05)] border border-[#E5E3DB]">
          <div className="text-center mb-8">
            <h2 className="font-serif text-3xl font-normal tracking-tight text-[#171817] mb-2">
              {isLogin ? 'Welcome Back' : 'Create an Account'}
            </h2>
            <p className="text-sm text-[#555852]">
              {isLogin
                ? 'Sign in to resume your active learning cadence.'
                : 'Join your class curriculum for personalized AI tutoring.'}
            </p>
          </div>

          {/* Error / Success Feedback Banner */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-2xl flex items-start gap-3 transition-all ${
                message.type === 'error'
                  ? 'bg-[#FDF2F0] text-[#9F3C27] border border-[#F5C2B8]'
                  : 'bg-[#F0F6F2] text-[#466552] border border-[#C8EBD2]'
              }`}
            >
              {message.type === 'error' ? (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-[#9F3C27]" />
              ) : (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-[#466552]" />
              )}
              <div className="text-sm font-medium leading-relaxed">{message.text}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                {/* Full Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs uppercase tracking-wider text-[#7A7C75]">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7C75]" strokeWidth={1.5} />
                    <Input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      placeholder="e.g. Jane Doe"
                      onFocus={() => {
                        triggerCompanionGuidance({
                          targetSelector: '#fullName',
                          animation: 'excited',
                          expression: 'joyful-wide',
                          message: 'Welcome new scholar. What should your AI tutor call you?',
                          autoDismissMs: 6000,
                        })
                      }}
                      className="pl-10 h-11 bg-white border-[#E5E3DB] text-[#171817] placeholder:text-stone-400 placeholder:font-normal focus-visible:ring-2 focus-visible:ring-[#C85A43]/20 rounded-xl"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-[#7A7C75]">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7C75]" strokeWidth={1.5} />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  onFocus={() => {
                    triggerCompanionGuidance({
                      targetSelector: '#email',
                      animation: 'listening',
                      expression: 'attentive-left',
                      message: 'Enter your email address here. We keep your study notes and streak linked to it.',
                      autoDismissMs: 6000,
                    })
                  }}
                  className="pl-10 h-11 bg-white border-[#E5E3DB] text-[#171817] placeholder:text-stone-400 placeholder:font-normal focus-visible:ring-2 focus-visible:ring-[#C85A43]/20 rounded-xl"
                />
              </div>
            </div>

            {/* Password with View / Hide Toggle */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs uppercase tracking-wider text-[#7A7C75]">
                  Password
                </Label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setMessage({ type: 'error', text: 'Password reset link will be sent to your email.' })}
                    className="text-xs text-[#C85A43] hover:text-[#A94734] font-medium transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7A7C75]" strokeWidth={1.5} />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Enter your password"
                  minLength={6}
                  onFocus={() => {
                    triggerCompanionGuidance({
                      targetSelector: '#password',
                      animation: 'listening',
                      expression: 'curious-left',
                      message: 'Enter at least 6 characters. You can toggle the eye icon to verify spelling.',
                      autoDismissMs: 6000,
                    })
                  }}
                  className="pl-10 pr-11 h-11 bg-white border-[#E5E3DB] text-[#171817] placeholder:text-stone-400 placeholder:font-normal focus-visible:ring-2 focus-visible:ring-[#C85A43]/20 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-[#7A7C75] hover:text-[#171817] transition-colors cursor-pointer"
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

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-11 bg-[#C85A43] hover:bg-[#A94734] text-white font-medium rounded-xl transition-all active:scale-[0.98] mt-3 cursor-pointer shadow-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait...
                </>
              ) : (
                <>{isLogin ? 'Sign In' : 'Create Account'}</>
              )}
            </Button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-[#E5E3DB]" />
            <span className="text-xs font-medium text-[#7A7C75] uppercase tracking-wider">Or</span>
            <div className="flex-1 h-px bg-[#E5E3DB]" />
          </div>

          <Button
            onClick={handleGoogleLogin}
            type="button"
            variant="outline"
            className="w-full h-11 bg-white text-[#171817] border-[#E5E3DB] hover:bg-[#F8F6F0] rounded-xl transition-colors font-medium cursor-pointer"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
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
            Continue with Google
          </Button>

          <div className="mt-7 text-center">
            <p className="text-sm text-[#555852]">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <button
                id="toggle-auth-mode-btn"
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin)
                  setMessage(null)
                }}
                className="text-[#C85A43] hover:text-[#A94734] font-medium transition-colors cursor-pointer"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
