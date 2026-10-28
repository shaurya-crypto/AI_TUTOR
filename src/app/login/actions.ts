'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { 
  checkRateLimit, 
  isLockedOut, 
  recordFailedAttempt, 
  clearFailedAttempts 
} from '@/lib/rateLimit'

// Extended disposable email domain blocklist to preserve academic integrity
const DISPOSABLE_DOMAINS = new Set([
  'yopmail.com', 'guerrillamail.com', 'mailinator.com', '10minutemail.com', 
  'tempmail.com', 'dropmail.me', 'dispostable.com', 'throwawaymail.com',
  'fakemailgenerator.com', 'trashmail.com', 'sharklasers.com', 'getairmail.com',
  'mohmal.com', 'crazymailing.com', 'generator.email', 'inboxkitten.com',
  'burnermail.io', 'temp-mail.org', 'nada.ltd', 'emailondeck.com',
  'maildrop.cc', 'getnada.com', 'trashmail.net', 'mytemp.email',
  'disposablemail.com', 'tempmailaddress.com', 'armyspy.com', 'cuvox.de',
  'dayrep.com', 'einrot.com', 'fleckens.hu', 'gustr.com', 'jourrapide.com',
  'rhyta.com', 'superrito.com', 'teleworm.us', 'tinypm.com', 'zoho.com' // temporary sub-burner patterns
])

// RFC 5322 compliant regex for robust email validation
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/

async function getClientIpAddress(): Promise<string> {
  try {
    const headerList = await headers()
    const forwarded = headerList.get('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0].trim()
    const realIp = headerList.get('x-real-ip')
    if (realIp) return realIp.trim()
    const cfIp = headerList.get('cf-connecting-ip')
    if (cfIp) return cfIp.trim()
  } catch {}
  return '127.0.0.1'
}

function isDisposableEmail(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase().trim()
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false
}

function isValidEmailFormat(email: string): boolean {
  if (!email || email.length > 254) return false
  return EMAIL_REGEX.test(email)
}

function formatAuthError(error: any): string {
  const msg = error?.message || ''
  const lower = msg.toLowerCase()

  // Authentication failed: format standard credential errors
  if (lower.includes('invalid login credentials') || lower.includes('invalid_grant')) {
    return 'Authentication failed: The credentials provided do not match our records. Please verify or request a sign-in code.'
  }
  // Verification pending: handle unconfirmed email status
  if (lower.includes('email not confirmed')) {
    return 'Verification pending: Your email address has not been confirmed yet. Please inspect your inbox for the activation link or code.'
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
    return 'The sign-in code is invalid or has expired. Please enter the current code or request a fresh one.'
  }
  if (lower.includes('invalid email') || lower.includes('unable to validate email')) {
    return 'Please enter a valid school or personal email address.'
  }
  return msg || 'An unexpected authentication error occurred. Please try again.'
}

/**
 * 1. Send OTP / Sign-in Code to Email (Unified Sign-in & Sign-up)
 * Hardened with IP & Email sliding window rate limits, throttle guard, and disposable domain filtering.
 * Dispatches via Supabase Auth / Brevo SMTP mailer integration.
 */
export async function sendEmailCode(email: string) {
  const trimmed = email?.trim().toLowerCase()
  if (!isValidEmailFormat(trimmed)) {
    return { error: 'Please enter a valid school or personal email address.' }
  }

  if (isDisposableEmail(trimmed)) {
    return { error: 'Temporary or disposable email addresses are not permitted to ensure academic integrity.' }
  }

  const clientIp = await getClientIpAddress()

  // 1. IP rate limiting: max 6 OTP requests per 10 minutes per IP
  const ipCheck = checkRateLimit({
    key: `otp-send-ip:${clientIp}`,
    maxRequests: 6,
    windowMs: 10 * 60 * 1000,
  })
  if (!ipCheck.success) {
    const waitSec = Math.ceil(ipCheck.resetMs / 1000)
    return { error: `Security rate limit reached. Please wait ${waitSec} seconds before requesting another code.` }
  }

  // 2. Email rate limiting: max 3 OTP requests per 5 minutes per email
  const emailCheck = checkRateLimit({
    key: `otp-send-email:${trimmed}`,
    maxRequests: 3,
    windowMs: 5 * 60 * 1000,
  })
  if (!emailCheck.success) {
    const waitSec = Math.ceil(emailCheck.resetMs / 1000)
    return { error: `Too many codes requested for this email. Please wait ${waitSec} seconds or inspect your inbox.` }
  }

  // 3. Short cooldown throttle: minimum 30 seconds between requests for same email
  const throttleCheck = checkRateLimit({
    key: `otp-throttle-email:${trimmed}`,
    maxRequests: 1,
    windowMs: 30 * 1000,
  })
  if (!throttleCheck.success) {
    const waitSec = Math.ceil(throttleCheck.resetMs / 1000)
    return { error: `A code was just dispatched. Please wait ${waitSec} seconds before requesting a new one.` }
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
 * Hardened with brute-force lockout protection (5 failed attempts locks verification for 10 minutes).
 */
export async function verifyEmailCode(email: string, code: string) {
  const trimmedEmail = email?.trim().toLowerCase()
  const sanitizedCode = code?.replace(/\D/g, '')

  if (!isValidEmailFormat(trimmedEmail)) {
    return { error: 'Please provide a valid email address.' }
  }

  if (!sanitizedCode || sanitizedCode.length !== 6) {
    return { error: 'Please enter the complete 6-digit verification code.' }
  }

  const clientIp = await getClientIpAddress()
  const emailLockoutKey = `otp-verify-fail:${trimmedEmail}`
  const ipLockoutKey = `otp-verify-fail-ip:${clientIp}`

  // Check email lockout
  const emailLock = isLockedOut({ key: emailLockoutKey, maxAttempts: 5, windowMs: 10 * 60 * 1000 })
  if (emailLock.locked) {
    const waitMin = Math.ceil(emailLock.resetMs / 60000)
    return {
      error: `Too many incorrect attempts. For your security, verification is locked for ${waitMin} minute${waitMin > 1 ? 's' : ''}. Please request a fresh code later.`,
    }
  }

  // Check IP lockout
  const ipLock = isLockedOut({ key: ipLockoutKey, maxAttempts: 10, windowMs: 10 * 60 * 1000 })
  if (ipLock.locked) {
    const waitMin = Math.ceil(ipLock.resetMs / 60000)
    return {
      error: `Access temporarily suspended due to repeated failed attempts. Please retry in ${waitMin} minute${waitMin > 1 ? 's' : ''}.`,
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.verifyOtp({
    email: trimmedEmail,
    token: sanitizedCode,
    type: 'email',
  })

  if (error || !data.user) {
    // Record failed attempt for brute-force tracking
    const failedCount = recordFailedAttempt({ key: emailLockoutKey, windowMs: 10 * 60 * 1000 })
    recordFailedAttempt({ key: ipLockoutKey, windowMs: 10 * 60 * 1000 })

    const remainingAttempts = Math.max(0, 5 - failedCount)
    if (remainingAttempts === 0) {
      return {
        error: 'Too many incorrect attempts. For your security, this account is temporarily locked for 10 minutes.',
      }
    }

    return {
      error: `Invalid verification code. ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining before temporary lockout.`,
    }
  }

  // Clear failed attempt tracking on successful verification
  clearFailedAttempts(emailLockoutKey)
  clearFailedAttempts(ipLockoutKey)

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
  const clientIp = await getClientIpAddress()

  // Rate limit password login attempts per IP
  const ipCheck = checkRateLimit({
    key: `pwd-login-ip:${clientIp}`,
    maxRequests: 10,
    windowMs: 5 * 60 * 1000,
  })
  if (!ipCheck.success) {
    return { error: 'Too many sign-in attempts. Please wait a few minutes before trying again.' }
  }

  const supabase = await createClient()

  const email = (formData.get('email') as string)?.trim().toLowerCase()
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
  const clientIp = await getClientIpAddress()
  const ipCheck = checkRateLimit({
    key: `pwd-reset-ip:${clientIp}`,
    maxRequests: 4,
    windowMs: 15 * 60 * 1000,
  })
  if (!ipCheck.success) {
    return { error: 'Too many password reset requests. Please wait a few minutes.' }
  }

  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!isValidEmailFormat(email)) {
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
  const clientIp = await getClientIpAddress()
  const ipCheck = checkRateLimit({
    key: `resend-verify-ip:${clientIp}`,
    maxRequests: 4,
    windowMs: 10 * 60 * 1000,
  })
  if (!ipCheck.success) {
    return { error: 'Too many email requests. Please wait a few minutes before retrying.' }
  }

  const supabase = await createClient()
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!isValidEmailFormat(email)) {
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
