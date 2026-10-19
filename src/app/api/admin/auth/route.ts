import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { signAdminToken, verifyAdminToken } from '@/lib/adminAuth'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const adminSession = cookieStore.get('admin_session')

    if (adminSession?.value && verifyAdminToken(adminSession.value)) {
      return NextResponse.json({ authenticated: true })
    }

    return NextResponse.json({ authenticated: false })
  } catch (err: any) {
    return NextResponse.json({ authenticated: false })
  }
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req)
    const rateLimit = checkRateLimit({
      key: `admin_auth:${ip}`,
      maxRequests: 5,
      windowMs: 15 * 60 * 1000,
    })

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many authentication attempts. Please try again in 15 minutes.',
        },
        { status: 429 }
      )
    }

    const adminPassword = process.env.ADMIN_PORTAL_PASSWORD
    if (!adminPassword) {
      return NextResponse.json(
        {
          success: false,
          error: 'ADMIN_PORTAL_PASSWORD is not configured in server environment.',
        },
        { status: 500 }
      )
    }

    const body = await req.json()
    const { password } = body

    if (!password || password.trim() !== adminPassword.trim()) {
      return NextResponse.json(
        { success: false, error: 'Invalid administrator password.' },
        { status: 401 }
      )
    }

    const signedToken = signAdminToken()
    const cookieStore = await cookies()
    cookieStore.set('admin_session', signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Authentication error.' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('admin_session')
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false }, { status: 500 })
  }
}
