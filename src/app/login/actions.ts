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
    return 'Authentication failed: The email address or password provided does not match our records. Please verify your credentials or use "Forgot Password".'
  }
  if (lower.includes('email not confirmed')) {
    return 'Verification pending: Your email address has not been confirmed yet. Please inspect your inbox and spam folder for the activation link dispatched via Brevo.'
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'Account exists: An academic profile with this email address already exists. Please switch to Sign In.'
  }
  if (lower.includes('password should be at least') || lower.includes('password is too short')) {
    return 'Security requirement: Passwords must be at least 6 characters in length.'
  }
  if (lower.includes('rate limit') || lower.includes('too many requests') || lower.includes('over_email_send_rate_limit')) {
    return 'Security threshold: Multiple requests detected. To protect your account and deliver messages reliably via Brevo, please wait 60 seconds before retrying.'
  }
  if (lower.includes('signup requires a valid password')) {
    return 'Security requirement: Please enter a valid password containing at least 6 characters.'
  }
  if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
    return 'Invalid email format: Please enter a valid institutional or personal email address.'
  }
  return msg || 'An unexpected authentication error occurred. Please try again.'
}

export async function login(formData: FormData) {
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

  // Ensure profile row exists in public.profiles (self-healing)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, onboarding_completed')
    .eq('id', authData.user.id)
    .single()

  if (!profile) {
    await supabase.from('profiles').upsert({
      id: authData.user.id,
      email: authData.user.email!,
      full_name: (authData.user.user_metadata?.full_name as string) || null,
      class_level: (authData.user.user_metadata?.class_level as string) || null,
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

export async function signup(formData: FormData) {
  const supabase = await createClient()
  
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const fullName = (formData.get('fullName') as string)?.trim()
  const classLevel = (formData.get('class_level') as string) || 'Class 10'
  
  if (!email || !password || !fullName) {
    return { error: 'Please complete all required fields.' }
  }

  if (password.length < 6) {
    return { error: 'Security requirement: Password must be at least 6 characters long.' }
  }

  if (isDisposableEmail(email)) {
    return { error: 'Institutional policy: Temporary or disposable email addresses are not permitted. Please use your standard school or personal email.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { data: authData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${siteUrl}/auth/callback`,
      data: {
        full_name: fullName,
        class_level: classLevel,
      },
    },
  })

  if (error) {
    return { error: formatAuthError(error) }
  }

  // If session created automatically (e.g. email confirmation disabled in Supabase development mode)
  if (authData?.session && authData.user) {
    await supabase.from('profiles').upsert({
      id: authData.user.id,
      email: authData.user.email!,
      full_name: fullName,
      class_level: classLevel,
      onboarding_completed: false,
    })

    revalidatePath('/', 'layout')
    return {
      success: 'Account created and verified.',
      autoConfirmed: true,
      userId: authData.user.id,
      email,
    }
  }

  return { 
    success: 'Verification email dispatched.',
    autoConfirmed: false,
    email,
  }
}

export async function resendVerificationEmail(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim()

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address to resend verification.' }
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
    success: `A fresh verification link has been dispatched to ${email} via Brevo mailer.` 
  }
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim()

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address to receive password reset instructions.' }
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=/onboarding`,
  })

  if (error) {
    return { error: formatAuthError(error) }
  }

  return {
    success: `Password reset instructions have been dispatched to ${email}. Please check your inbox.`,
    email,
  }
}
