import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

// POST /api/user/quota
// Body: { action: 'check' | 'record_request' | 'record_module', moduleId?: string }
export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const { action = 'check', moduleId } = body

    const adminClient = createAdminClient()

    // Fetch user profile quota fields
    const { data: profile, error: profileErr } = await adminClient
      .from('profiles')
      .select('id, limit_type, max_requests, used_requests, max_modules, used_modules, is_avatar_enabled')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const limitType = profile.limit_type || 'unlimited'
    const maxRequests = profile.max_requests || 100
    const usedRequests = profile.used_requests || 0
    const maxModules = profile.max_modules || 5
    const usedModules = profile.used_modules || 0
    const isAvatarEnabled = profile.is_avatar_enabled !== false

    // 1. Action: RECORD REQUEST (Increment used_requests)
    if (action === 'record_request') {
      if (limitType === 'requests' && usedRequests >= maxRequests) {
        return NextResponse.json({
          allowed: false,
          reason: 'REQUEST_LIMIT_REACHED',
          message: 'We are still building this is just a prototype, for more limits contact shauryaprabhakar097@gmail.com',
          limit_type: limitType,
          max_requests: maxRequests,
          used_requests: usedRequests,
          is_avatar_enabled: isAvatarEnabled,
        })
      }

      const nextUsed = usedRequests + 1
      await adminClient
        .from('profiles')
        .update({ used_requests: nextUsed })
        .eq('id', user.id)

      return NextResponse.json({
        allowed: true,
        limit_type: limitType,
        max_requests: maxRequests,
        used_requests: nextUsed,
        is_avatar_enabled: isAvatarEnabled,
      })
    }

    // 2. Action: RECORD MODULE (Check or count module taken)
    if (action === 'record_module' && moduleId) {
      // Check if user has already accessed this module previously in user_progress
      const { data: existingProgress } = await adminClient
        .from('user_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('syllabus_module_id', moduleId)
        .maybeSingle()

      if (existingProgress) {
        // Module already unlocked previously, access is granted
        return NextResponse.json({
          allowed: true,
          is_existing_module: true,
          limit_type: limitType,
          max_modules: maxModules,
          used_modules: usedModules,
          is_avatar_enabled: isAvatarEnabled,
        })
      }

      // If new module and user is on module limit
      if (limitType === 'modules' && usedModules >= maxModules) {
        return NextResponse.json({
          allowed: false,
          reason: 'MODULE_LIMIT_REACHED',
          message: 'We are still building this is just a prototype, for more limits contact shauryaprabhakar097@gmail.com',
          limit_type: limitType,
          max_modules: maxModules,
          used_modules: usedModules,
          is_avatar_enabled: isAvatarEnabled,
        })
      }

      // Increment used_modules
      const nextUsedModules = usedModules + 1
      await adminClient
        .from('profiles')
        .update({ used_modules: nextUsedModules })
        .eq('id', user.id)

      return NextResponse.json({
        allowed: true,
        is_existing_module: false,
        limit_type: limitType,
        max_modules: maxModules,
        used_modules: nextUsedModules,
        is_avatar_enabled: isAvatarEnabled,
      })
    }

    // 3. Action: CHECK (General Status)
    const isRequestLimitReached = limitType === 'requests' && usedRequests >= maxRequests
    const isModuleLimitReached = limitType === 'modules' && usedModules >= maxModules

    return NextResponse.json({
      allowed: !isRequestLimitReached && !isModuleLimitReached,
      limit_type: limitType,
      max_requests: maxRequests,
      used_requests: usedRequests,
      max_modules: maxModules,
      used_modules: usedModules,
      is_avatar_enabled: isAvatarEnabled,
      isRequestLimitReached,
      isModuleLimitReached,
    })
  } catch (err: any) {
    console.error('[User Quota API] Error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
