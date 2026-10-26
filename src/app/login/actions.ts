'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

// Disposable email domain blocklist to preserve academic integrity
const DISPOSABLE_DOMAINS = [
  'yopmail.com', 'guerrillamail.com', 'mailinator.com', '10minutemail.com', 
  'tempmail.com', 'dropmail.me', 'dispostable.com', 'throwawaymail.com',
  'fakemailgenerator.com', 'trashmail.com', 'sharklasers.com', 'getairmail.com'
]

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim()
  return domain ? DISPOSABLE_DOMAINS.includes(domain) : false
}

function formatAuthError(error: any): string {
  const msg = error?.message || ''
  const lower = msg.toLowerCase()

  if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
    return 'The credentials provided do not match our records. Please verify or request a sign-in code.'
  }
  if (lower.includes('email not confirmed')) {
    return 'Your email address has not been confirmed yet. Please inspect your inbox for the activation link or code.'
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'An account with this email address already exists. Please continue to sign in.'
  }
  if (lower.includes('password should be at least') || lower.includes('password is too short')) {
    return 'Password must be at least 6 characters in length.'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('over_email_send_rate_limit')) {
    return 'Too many attempts detected. Please wait 60 seconds before requesting another sign-in code.'
  }
  if (lower.includes('token has expired') || lower.includes('otp expired') || lower.includes('invalid token')) {
    return 'The sign-in code is invalid or has expired. Please request a fresh code.'
  }
  if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
    return 'Please enter a valid school or personal email address.'
  }
  return msg || 'An unexpected authentication error occurred. Please try again.'
}

/**
 * 1. Send OTP / Sign-in Code to Email (Unified Sign-in & Sign-up)
 */
export async function sendEmailCode(email: string) {
  const trimmed = email?.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) {
    return { error: 'Please enter a valid email address.' }
  }

  if (isDisposableEmail(trimmed)) {
    return { error: 'Temporary or disposable email addresses are not permitted.' }
  }

  const supabase = await createClient()
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.signInWithOtp({
    email: trimmed,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { error: formatAuthError(error) }
  }

  return { success: true, email: trimmed }
}

/**
 * 2. Verify 6-digit OTP Code
 */
export async function verifyEmailCode(email: string, code: string) {
  const trimmedEmail = email?.trim().toLowerCase()
  const trimmedCode = code?.trim()

  if (!trimmedEmail || !trimmedCode) {
    return { error: 'Please provide both your email and the 6-digit code.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    email: trimmedEmail,
    token: trimmedCode,
    type: 'email',
  })

  if (error || !data.user) {
    return { error: formatAuthError(error || new Error('Invalid verification code')) }
  }

  // Ensure student profile row exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, onboarding_completed')
    .eq('id', data.user.id)
    .single()

  if (!profile) {
    await supabase.from('profiles').upsert({
      id: data.user.id,
      email: data.user.email!,
      onboarding_completed: false,
    })
  }

  revalidatePath('/', 'layout')
  return {
    success: true,
    userId: data.user.id,
    onboardingCompleted: profile ? profile.onboarding_completed : false,
  }
}

/**
 * 3. Direct Password Login (Backward compatibility for existing credentials)
 */
export async function loginWithPassword(formData: FormData) {
  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Please enter both your email address and password.' }
  }

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: formatAuthError(error) }
  }

  if (!authData?.user) {
    return { error: 'Unable to authenticate. Please verify your account.' }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, onboarding_completed')
    .eq('id', authData.user.id)
    .single()

  if (!profile) {
    await supabase.from('profiles').upsert({
      id: authData.user.id,
      email: authData.user.email!,
      onboarding_completed: false,
    })
  }

  revalidatePath('/', 'layout')
  return {
    success: true,
    userId: authData.user.id,
    onboardingCompleted: profile ? profile.onboarding_completed : false,
  }
}

/**
 * 4. Password Reset Request
 */
export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim()

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
  })

  if (error) {
    return { error: formatAuthError(error) }
  }

  return {
    success: `Password reset instructions have been dispatched to ${email}.`,
    email,
  }
}

/**
 * 5. Resend Verification Email (Backward compatibility for MailSentCard)
 */
export async function resendVerificationEmail(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim()

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
    },
  })

  if (error) {
    return { error: formatAuthError(error) }
  }

  return {
    success: `A fresh verification link has been dispatched to ${email}.`,
  }
}

