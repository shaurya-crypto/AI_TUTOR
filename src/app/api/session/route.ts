import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/utils/supabase/server'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { getLanguageVoiceConfig } from '@/lib/voiceAndLanguageConfig'

export async function GET(req: Request) {
  try {
    // 1. IP rate check
    const ip = getClientIp(req)
    const ipLimit = checkRateLimit({
      key: `session_ip:${ip}`,
      maxRequests: 30,
      windowMs: 60 * 1000,
    })
    if (!ipLimit.success) {
      return NextResponse.json(
        { error: 'Too many session requests from this IP. Please wait a moment.' },
        { status: 429 }
      )
    }

    // 2. Authenticate the student
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized: Student login required' },
        { status: 401 }
      )
    }

    // 3. Per-student rate limiter: max 10 mints per minute
    const userLimit = checkRateLimit({
      key: `session_user:${user.id}`,
      maxRequests: 10,
      windowMs: 60 * 1000,
    })
    if (!userLimit.success) {
      return NextResponse.json(
        { error: 'Session request limit exceeded. Please wait a minute.' },
        { status: 429 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in server environment.' },
        { status: 500 }
      )
    }

    // 4. Fetch student's preferred teacher voice & language from profile
    let voiceName = 'Leda'
    let preferredLanguage = 'English'
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_teacher_voice, preferred_language')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.preferred_teacher_voice) {
      voiceName = profile.preferred_teacher_voice
    }
    if (profile?.preferred_language) {
      preferredLanguage = profile.preferred_language
    }

    const langVoiceConfig = getLanguageVoiceConfig(preferredLanguage)
    const supportedLanguages = langVoiceConfig.supportedLanguageCodes || ['en-IN', 'hi-IN']
    const languageCode = langVoiceConfig.primaryLanguageCode || 'en-IN'

    // 5. Mint single-use ephemeral auth token for live classroom session
    const ai = new GoogleGenAI({ apiKey })
    const token = await ai.authTokens.create({
      config: {
        uses: 1, // Single-use session token
        expireTime: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30-min lifespan
        newSessionExpireTime: new Date(Date.now() + 60 * 1000).toISOString(), // 60s connection window
      },
    })

    if (!token?.name) {
      throw new Error('Failed to mint valid ephemeral token name from Google API.')
    }

    // ZERO API KEY EXPOSURE: Return only the temporary ephemeral token
    return NextResponse.json({
      token: token.name,
      model: 'gemini-3.8-live',
      voiceName,
      preferredLanguage,
      supportedLanguages,
      languageCode,
    })
  } catch (err: any) {
    console.error('[Session API] Error minting ephemeral token:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to initialize secure tutoring session.' },
      { status: 500 }
    )
  }
}
