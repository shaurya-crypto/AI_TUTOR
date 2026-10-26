import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

// In-memory sliding cache to deduplicate rapid dual clicks from email scanners or double-clicks (TTL: 60s)
const processedExchangeCache = new Map<string, { destination: string; timestamp: number }>()

function cleanupOldCacheEntries() {
  const now = Date.now()
  for (const [key, value] of processedExchangeCache.entries()) {
    if (now - value.timestamp > 60_000) {
      processedExchangeCache.delete(key)
    }
  }
}

async function getPostAuthDestination(supabase: any, user: any, nextParam: string | null): Promise<string> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single()

  if (!profile) {
    await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email || '',
      full_name: (user.user_metadata?.full_name as string) || null,
      class_level: (user.user_metadata?.class_level as string) || null,
      onboarding_completed: false,
    })
  }

  if (nextParam) return nextParam
  return profile?.onboarding_completed ? `/dashboard/${user.id}` : '/onboarding'
}

function resolveRedirect(destination: string, request: Request, origin: string): NextResponse {
  const forwardedHost = request.headers.get('x-forwarded-host')
  const isLocalNode = process.env.NODE_ENV === 'development'

  if (isLocalNode) {
    return NextResponse.redirect(`${origin}${destination}`)
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${destination}`)
  } else {
    return NextResponse.redirect(`${origin}${destination}`)
  }
}

export async function GET(request: Request) {
  cleanupOldCacheEntries()

  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next')
  const errorParam = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const cacheKey = code || token_hash || ''

  // 1. Dual-click deduping: Return cached destination if processed recently
  if (cacheKey && processedExchangeCache.has(cacheKey)) {
    const cached = processedExchangeCache.get(cacheKey)!
    return resolveRedirect(cached.destination, request, origin)
  }

  const supabase = await createClient()

  // 2. PKCE code exchange
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.user) {
      const destination = await getPostAuthDestination(supabase, data.user, next)
      processedExchangeCache.set(code, { destination, timestamp: Date.now() })
      return resolveRedirect(destination, request, origin)
    }
  }

  // 3. Email OTP token_hash verification (standard Brevo/custom SMTP template)
  if (token_hash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })
    if (!error && data?.user) {
      const destination = await getPostAuthDestination(supabase, data.user, next)
      processedExchangeCache.set(token_hash, { destination, timestamp: Date.now() })
      return resolveRedirect(destination, request, origin)
    }
  }

  // 4. Critical Dual-Click Fallback:
  // If exchangeCodeForSession failed because the code was already consumed (e.g. by scanner pre-fetch or first click),
  // check if an authenticated session already exists in the request cookie jar.
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const destination = await getPostAuthDestination(supabase, user, next)
    if (cacheKey) {
      processedExchangeCache.set(cacheKey, { destination, timestamp: Date.now() })
    }
    return resolveRedirect(destination, request, origin)
  }

  // 5. If there is an explicit error from the auth provider
  if (errorParam || errorDescription) {
    const reason = encodeURIComponent(errorDescription || errorParam || 'verification_link_expired')
    return NextResponse.redirect(`${origin}/login?notice=link_expired&reason=${reason}`)
  }

  // 6. Graceful fallback for consumed link: notify user and invite direct sign in
  return NextResponse.redirect(`${origin}/login?notice=already_verified`)
}
