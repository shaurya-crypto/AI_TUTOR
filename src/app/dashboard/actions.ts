'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signOutAction() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

export async function updatePreferencesAction(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const learning_style = formData.get('learning_style') as string
  const preferred_pacing = formData.get('preferred_pacing') as string
  const preferred_teacher_voice = formData.get('preferred_teacher_voice') as string
  const class_level = formData.get('class_level') as string

  const updatePayload: Record<string, any> = {
    learning_style,
    preferred_pacing,
    preferred_teacher_voice,
    updated_at: new Date().toISOString()
  }

  if (class_level) {
    updatePayload.class_level = class_level
  }

  const { error } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${user.id}`)
  return { success: true }
}

export async function enrollCurriculumAction(curriculumId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { error } = await supabase
    .from('enrollments')
    .upsert({
      user_id: user.id,
      curriculum_id: curriculumId,
      status: 'active',
      enrolled_at: new Date().toISOString()
    }, { onConflict: 'user_id,curriculum_id' })

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/${user.id}`)
  return { success: true }
}

export async function completeCapsuleAction(payload: {
  moduleId: string
  score: number
  durationMinutes?: number
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { moduleId, score, durationMinutes = 15 } = payload

  // 1. Mark current module as completed
  const { error: progressError } = await supabase
    .from('user_progress')
    .upsert(
      {
        user_id: user.id,
        syllabus_module_id: moduleId,
        status: 'completed',
        score: Math.round(score),
        completed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,syllabus_module_id' }
    )

  if (progressError) {
    console.error('[Actions] Error completing module:', progressError)
    return { error: progressError.message }
  }

  // 2. Unlock & set the NEXT module in this curriculum to 'in_progress'
  const { data: currentMod } = await supabase
    .from('syllabus_modules')
    .select('curriculum_id, order_index')
    .eq('id', moduleId)
    .single()

  let nextModuleId: string | null = null

  if (currentMod) {
    const { data: nextMod } = await supabase
      .from('syllabus_modules')
      .select('id')
      .eq('curriculum_id', currentMod.curriculum_id)
      .gt('order_index', currentMod.order_index)
      .order('order_index', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (nextMod) {
      nextModuleId = nextMod.id
      await supabase
        .from('user_progress')
        .upsert(
          {
            user_id: user.id,
            syllabus_module_id: nextMod.id,
            status: 'in_progress',
            started_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,syllabus_module_id' }
        )
    }
  }

  // 3. Update student stats (minutes, lessons, streak)
  const { data: profile } = await supabase
    .from('profiles')
    .select('total_learning_minutes, total_classes_taken, current_streak, last_active_date')
    .eq('id', user.id)
    .single()

  const todayStr = new Date().toISOString().split('T')[0]
  const currentStreak = Math.max(1, profile?.current_streak || 1)

  await supabase
    .from('profiles')
    .update({
      total_learning_minutes: (profile?.total_learning_minutes || 0) + durationMinutes,
      total_classes_taken: (profile?.total_classes_taken || 0) + 1,
      current_streak: currentStreak,
      last_active_date: todayStr,
      last_class_date: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  revalidatePath(`/dashboard/${user.id}`)
  return { success: true, nextModuleId }
}

export async function updateStudyPlanAction(payload: {
  targetExamDate: string
  dailyStudyMinutes: number
  targetCurriculumIds?: string[]
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { targetExamDate, dailyStudyMinutes, targetCurriculumIds = [] } = payload

  // Check if an active plan exists
  const { data: existingPlan } = await supabase
    .from('student_study_plans')
    .select('id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (existingPlan) {
    const { error } = await supabase
      .from('student_study_plans')
      .update({
        target_exam_date: targetExamDate,
        daily_study_minutes: dailyStudyMinutes,
        target_curriculum_ids: targetCurriculumIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingPlan.id)

    if (error) return { error: error.message }
  } else {
    const { error } = await supabase
      .from('student_study_plans')
      .insert({
        user_id: user.id,
        target_exam_date: targetExamDate,
        daily_study_minutes: dailyStudyMinutes,
        target_curriculum_ids: targetCurriculumIds,
        is_active: true,
      })

    if (error) return { error: error.message }
  }

  revalidatePath(`/dashboard/${user.id}`)
  return { success: true }
}

