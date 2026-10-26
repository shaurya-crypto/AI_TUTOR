'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

// Strictly Classes 6 to 12 only (CBSE, ICSE, IB)
const VALID_CLASSES = [
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 
  'Class 10', 'Class 11', 'Class 12'
]
const VALID_BOARDS = ['CBSE', 'ICSE', 'IB']
const VALID_PACING = ['fast_and_curious', 'steady_and_balanced', 'slow_deep_intuitive']
const VALID_STYLES = ['socratic', 'visual', 'board_numerical', 'storytelling']
const VALID_VOICES = ['Aoede', 'Charon', 'Kore', 'Fenrir', 'Puck']

export interface Phase4OnboardingData {
  fullName: string
  age: number | null
  classLevel: string
  targetBoard: string
  careerAspiration: string
  learningPace: string
  favoriteSubject: string
  weakArea: string
  learningStyle: string
  preferredVoice: string
}

export async function completeOnboardingAction(data: Phase4OnboardingData) {
  const supabase = await createClient()

  // 1. Authentication Check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Authentication required. Please sign in again.' }
  }

  // 2. Validate and Sanitize Inputs
  const fullName = typeof data.fullName === 'string' && data.fullName.trim().length > 0
    ? data.fullName.trim().slice(0, 80)
    : user.user_metadata?.full_name || 'Student'

  const age = typeof data.age === 'number' && Number.isInteger(data.age) && data.age >= 9 && data.age <= 22
    ? data.age
    : null

  const classLevel = VALID_CLASSES.includes(data.classLevel) ? data.classLevel : 'Class 10'
  const targetBoard = VALID_BOARDS.includes(data.targetBoard) ? data.targetBoard : 'CBSE'
  
  const careerAspiration = typeof data.careerAspiration === 'string'
    ? data.careerAspiration.trim().slice(0, 100)
    : ''

  const learningPace = VALID_PACING.includes(data.learningPace) ? data.learningPace : 'steady_and_balanced'
  const favoriteSubject = typeof data.favoriteSubject === 'string' && data.favoriteSubject.trim().length > 0
    ? data.favoriteSubject.trim().slice(0, 50)
    : 'Physics'

  const weakArea = typeof data.weakArea === 'string' && data.weakArea.trim().length > 0
    ? data.weakArea.trim().slice(0, 60)
    : 'Derivations'

  const learningStyle = VALID_STYLES.includes(data.learningStyle) ? data.learningStyle : 'socratic'
  const preferredVoice = VALID_VOICES.includes(data.preferredVoice) ? data.preferredVoice : 'Aoede'

  // 3. Persist to Supabase Profiles
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      age: age,
      class_level: classLevel,
      target_board: targetBoard,
      career_aspiration: careerAspiration,
      learning_pace: learningPace,
      favorite_subject: favoriteSubject,
      strong_subjects: [favoriteSubject],
      weak_subjects: [weakArea],
      learning_style: learningStyle,
      preferred_teacher_voice: preferredVoice,
      onboarding_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (updateError) {
    console.error('[completeOnboardingAction] Database error:', updateError)
    return { error: 'Unable to save your learning profile. Please try again.' }
  }

  // 4. Auto-enroll student into the first chapter capsule for their class and board
  try {
    let query = supabase
      .from('curriculums')
      .select('id, title')
      .eq('class_level', classLevel)
      .eq('is_published', true)

    // Try matching board first
    const { data: boardCurriculums } = await query.eq('board', targetBoard).limit(1)

    let matchedCurriculum = boardCurriculums && boardCurriculums.length > 0 ? boardCurriculums[0] : null

    // Fallback to any published curriculum for this class level
    if (!matchedCurriculum) {
      const { data: fallbackCurriculums } = await supabase
        .from('curriculums')
        .select('id, title')
        .eq('class_level', classLevel)
        .eq('is_published', true)
        .limit(1)
      if (fallbackCurriculums && fallbackCurriculums.length > 0) {
        matchedCurriculum = fallbackCurriculums[0]
      }
    }

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
