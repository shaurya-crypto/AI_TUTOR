import { NextResponse } from 'next/server'
import { generateSimliSessionToken, generateIceServers } from 'simli-client'
import { createClient } from '@/utils/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    // 1. IP rate check
    const ip = getClientIp(req)
    const ipLimit = checkRateLimit({
      key: `simli_ip:${ip}`,
      maxRequests: 30,
      windowMs: 60 * 1000,
    })
    if (!ipLimit.success) {
      return NextResponse.json(
        { success: false, error: 'Too many session requests from this IP. Please wait a moment.' },
        { status: 429 }
      )
    }

    // 2. Authenticate the student session
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Student login required' },
        { status: 401 }
      )
    }

    // 3. Check server-side SIMLI_API_KEY
    const apiKey = process.env.SIMLI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'SIMLI_API_KEY is not configured on server environment.' },
        { status: 503 }
      )
    }

    // Parse requested faceId or use default configured face ID
    let body: any = {}
    try {
      body = await req.json()
    } catch {
      // Empty body is acceptable
    }

    const faceId = body.faceId || process.env.SIMLI_FACE_ID || '80459b57-2d66-4ca7-8682-59e1c649bc53'

    // 4. Generate Simli session token
    const tokenResult = await generateSimliSessionToken({
      apiKey,
      config: {
        faceId,
        handleSilence: true,
        maxSessionLength: 3600,
        maxIdleTime: 600,
      },
    })

    if (!tokenResult?.session_token) {
      throw new Error('Simli server returned an empty session token')
    }

    // 5. Generate WebRTC ICE servers for robust P2P / TURN connectivity
    let iceServers: RTCIceServer[] = []
    try {
      iceServers = await generateIceServers(apiKey)
    } catch (iceError) {
      console.warn('[SimliAPI] ICE server generation warning, proceeding with defaults:', iceError)
    }

    // ZERO API KEY LEAKAGE: Return only temporary session token and ICE configs
    return NextResponse.json({
      success: true,
      sessionToken: tokenResult.session_token,
      iceServers,
      faceId,
    })
  } catch (err: any) {
    console.error('[SimliAPI] Error generating session credentials:', err)
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to mint Simli avatar session.' },
      { status: 500 }
    )
  }
}
