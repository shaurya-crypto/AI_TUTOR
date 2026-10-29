import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyAdminToken } from '@/lib/adminAuth'
import { createAdminClient } from '@/utils/supabase/admin'

export const dynamic = 'force-dynamic'

// GET /api/admin/users: Fetch all student accounts with usage quotas & avatar settings
export async function GET() {
  try {
    const cookieStore = await cookies()
    const adminSession = cookieStore.get('admin_session')

    if (!adminSession?.value || !verifyAdminToken(adminSession.value)) {
      return NextResponse.json({ error: 'Unauthorized admin session' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        full_name,
        class_level,
        target_board,
        is_avatar_enabled,
        limit_type,
        max_requests,
        used_requests,
        max_modules,
        used_modules,
        total_classes_taken,
        created_at,
        last_active_date
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Admin Users API] Error fetching profiles:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      users: users || [],
    })
  } catch (err: any) {
    console.error('[Admin Users API] Unexpected error in GET:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/admin/users: Update quota limits and avatar preferences for a specific student
export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies()
    const adminSession = cookieStore.get('admin_session')

    if (!adminSession?.value || !verifyAdminToken(adminSession.value)) {
      return NextResponse.json({ error: 'Unauthorized admin session' }, { status: 401 })
    }

    const body = await req.json()
    const {
      userId,
      is_avatar_enabled,
      limit_type,
      max_requests,
      used_requests,
      max_modules,
      used_modules,
    } = body

    if (!userId) {
      return NextResponse.json({ error: 'Missing required field: userId' }, { status: 400 })
    }

    const updates: Record<string, any> = {}

    if (typeof is_avatar_enabled === 'boolean') {
      updates.is_avatar_enabled = is_avatar_enabled
    }

    if (limit_type && ['requests', 'modules', 'unlimited'].includes(limit_type)) {
      updates.limit_type = limit_type
    }

    if (typeof max_requests === 'number' && !isNaN(max_requests)) {
      updates.max_requests = Math.max(1, Math.floor(max_requests))
    }

    if (typeof used_requests === 'number' && !isNaN(used_requests)) {
      updates.used_requests = Math.max(0, Math.floor(used_requests))
    }

    if (typeof max_modules === 'number' && !isNaN(max_modules)) {
      updates.max_modules = Math.max(1, Math.floor(max_modules))
    }

    if (typeof used_modules === 'number' && !isNaN(used_modules)) {
      updates.used_modules = Math.max(0, Math.floor(used_modules))
    }

    const supabase = createAdminClient()

    const { data: updatedProfile, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select(`
        id,
        email,
        full_name,
        class_level,
        target_board,
        is_avatar_enabled,
        limit_type,
        max_requests,
        used_requests,
        max_modules,
        used_modules,
        total_classes_taken,
        created_at,
        last_active_date
      `)
      .single()

    if (error) {
      console.error('[Admin Users API] Error updating profile:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      user: updatedProfile,
    })
  } catch (err: any) {
    console.error('[Admin Users API] Unexpected error in PATCH:', err)
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 })
  }
}
