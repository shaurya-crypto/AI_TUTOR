import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data?.user) {
      // Ensure profile exists in public.profiles (self-healing)
      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', data.user.id)
        .single()

      if (!profile) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email!,
          full_name: (data.user.user_metadata?.full_name as string) || null,
          class_level: (data.user.user_metadata?.class_level as string) || null,
          onboarding_completed: false,
        })
      }

      const destination = next
        ? next
        : profile?.onboarding_completed
        ? `/dashboard/${data.user.id}`
        : '/onboarding'

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
  }

  // If code is invalid or missing, redirect to login with a friendly message
  return NextResponse.redirect(`${origin}/login?error=auth-link-invalid`)
}
