'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

const VALID_CLASSES = ['Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12', 'Undergraduate']
const VALID_LEVELS = ['beginner', 'intermediate', 'advanced']
const VALID_STYLES = ['socratic', 'direct', 'visual', 'storytelling']
const VALID_VOICES = ['Aoede', 'Puck', 'Charon', 'Kore', 'Fenrir']
const VALID_PACING = ['slow_and_thorough', 'standard', 'fast_and_high_level']

export interface OnboardingState {
  classLevel: string
  targetBoard: string
  favoriteSubject?: string
  learningLevel: string
  learningStyle: string
  preferredVoice: string
  interests: string[]
  preferredPacing?: string
}

export async function completeOnboardingAction(data: OnboardingState) {
  const supabase = await createClient()

  // 1. Authentication check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Authentication required. Please log in again.' }
  }

  // 2. Security validation: Whitelist checks & Sanitization
  const classLevel = VALID_CLASSES.includes(data.classLevel) ? data.classLevel : 'Class 10'
  const learningLevel = VALID_LEVELS.includes(data.learningLevel) ? data.learningLevel : 'intermediate'
  const learningStyle = VALID_STYLES.includes(data.learningStyle) ? data.learningStyle : 'socratic'
  const preferredVoice = VALID_VOICES.includes(data.preferredVoice) ? data.preferredVoice : 'Aoede'
  const preferredPacing = data.preferredPacing && VALID_PACING.includes(data.preferredPacing) 
    ? data.preferredPacing 
    : 'standard'
  const favoriteSubject = typeof data.favoriteSubject === 'string' && data.favoriteSubject.trim().length > 0
    ? data.favoriteSubject.trim().slice(0, 60)
    : 'Physics'

  // Sanitize interests array
  const sanitizedInterests = Array.isArray(data.interests)
    ? data.interests
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
        .slice(0, 10)
        .map((s) => s.trim().slice(0, 50))
    : []

  // Add target board into interests or metadata if present
  if (data.targetBoard && typeof data.targetBoard === 'string') {
    const cleanBoard = data.targetBoard.trim().slice(0, 40)
    if (cleanBoard && !sanitizedInterests.includes(cleanBoard)) {
      sanitizedInterests.push(`Board: ${cleanBoard}`)
    }
  }

  // 3. Persist to Supabase profiles
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      class_level: classLevel,
      learning_level: learningLevel,
      learning_style: learningStyle,
      preferred_teacher_voice: preferredVoice,
      preferred_pacing: preferredPacing,
      interests: sanitizedInterests,
      favorite_subject: favoriteSubject,
      strong_subjects: [favoriteSubject],
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('[completeOnboardingAction] Database error:', updateError)
    return { error: 'Unable to save your learning profile. Please try again.' }
  }

  // 4. Auto-enroll student into the first chapter capsule for their class
  try {
    const { data: matchedCurriculum } = await supabase
      .from('curriculums')
      .select('id, title')
      .eq('class_level', classLevel)
      .limit(1)
      .single()

    if (matchedCurriculum) {
      await supabase
        .from('enrollments')
        .upsert(
          {
            user_id: user.id,
            curriculum_id: matchedCurriculum.id,
            status: 'active',
          },
          { onConflict: 'user_id,curriculum_id' }
        )

      // Find first module for this curriculum
      const { data: firstModule } = await supabase
        .from('syllabus_modules')
        .select('id')
        .eq('curriculum_id', matchedCurriculum.id)
        .order('order_index', { ascending: true })
        .limit(1)
        .single()

      if (firstModule) {
        await supabase
          .from('user_progress')
          .upsert(
            {
              user_id: user.id,
              syllabus_module_id: firstModule.id,
              status: 'in_progress',
            },
            { onConflict: 'user_id,syllabus_module_id' }
          )
      }
    }
  } catch (enrollErr) {
    console.error('[completeOnboardingAction] Auto-enrollment error:', enrollErr)
  }

  revalidatePath('/', 'layout')
  redirect(`/dashboard/${user.id}`)
}
