import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const pathname = request.nextUrl.pathname

  // 1. Static media & asset bypass: Never run auth or session checks on audio, video, images, or assets
  const isStaticAsset =
    pathname.startsWith('/_next') ||
    pathname.startsWith('/landing_images') ||
    pathname.startsWith('/audio') ||
    pathname.startsWith('/avatars') ||
    pathname.startsWith('/templates') ||
    pathname.startsWith('/worklets') ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|wav|mp3|ogg|m4a|mp4|webm|woff|woff2|ttf|eot|json|css|js)$/i.test(pathname)

  if (isStaticAsset) {
    return supabaseResponse
  }

  // 2. Bypass API, Auth callbacks, and Admin routes
  if (
    pathname.startsWith('/api') || 
    pathname.startsWith('/auth') || 
    pathname.startsWith('/admin')
  ) {
    return supabaseResponse
  }

  // 3. E2E test bypass for automated Playwright verification (strictly disabled in production)
  const isE2ETest =
    process.env.NODE_ENV !== 'production' &&
    (request.cookies.get('playwright_e2e')?.value === 'true' ||
      request.headers.get('x-playwright-test') === 'true')

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isLoginPage = pathname === '/login'
  const isOnboardingPage = pathname.startsWith('/onboarding')
  const isDashboardPage = pathname.startsWith('/dashboard')

  // CASE A: User is NOT authenticated (Not logged in / hasn't signed up)
  if (!user) {
    if (isE2ETest && isOnboardingPage) {
      return supabaseResponse
    }

    // Block /onboarding and /dashboard for unauthenticated users -> redirect to /login
    if (isOnboardingPage || isDashboardPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Public pages (landing, login, legal) are allowed
    return supabaseResponse
  }

  // CASE B: User IS authenticated -> Check onboarding completion status
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .maybeSingle()

  const isOnboarded = Boolean(profile?.onboarding_completed)

  if (isOnboarded) {
    // If sign in is done & already completed onboarding:
    // Block /onboarding and /login -> redirect to student dashboard
    if (isOnboardingPage || isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = `/dashboard/${user.id}`
      return NextResponse.redirect(url)
    }
  } else {
    // User is logged in but hasn't completed onboarding yet:
    // Block /dashboard and /login -> redirect to /onboarding to finish setup
    if (isDashboardPage || isLoginPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/onboarding'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
