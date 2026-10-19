'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// Disposable email domain blocklist
const DISPOSABLE_DOMAINS = [
  'yopmail.com', 'guerrillamail.com', 'mailinator.com', '10minutemail.com', 
  'tempmail.com', 'dropmail.me', 'dispostable.com', 'throwawaymail.com'
]

function isDisposableEmail(email: string) {
  const domain = email.split('@')[1]?.toLowerCase()
  return DISPOSABLE_DOMAINS.includes(domain)
}

function formatAuthError(error: any): string {
  const msg = error?.message || ''
  if (msg.includes('Invalid login credentials')) {
    return 'Incorrect email address or password. Please verify your credentials and try again.'
  }
  if (msg.includes('Email not confirmed')) {
    return 'Your email address has not been confirmed yet. Please check your inbox for the confirmation link.'
  }
  if (msg.includes('User already registered')) {
    return 'An account with this email address already exists. Please sign in instead.'
  }
  if (msg.includes('Password should be at least')) {
    return 'Password must be at least 6 characters long.'
  }
  if (msg.includes('rate limit')) {
    return 'Too many attempts. Please wait a few moments before trying again.'
  }
  return msg || 'An unexpected error occurred. Please try again.'
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
  const classLevel = (formData.get('class_level') as string) || null
  
  if (!email || !password) {
    return { error: 'Please fill in all required fields.' }
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' }
  }

  if (isDisposableEmail(email)) {
    return { error: 'Disposable or temporary email addresses are not permitted.' }
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

  // If session created automatically (e.g. email confirmation disabled in Supabase)
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
    }
  }

  return { 
    success: 'Account created. Please check your email inbox to confirm your registration and begin learning.' 
  }
}
