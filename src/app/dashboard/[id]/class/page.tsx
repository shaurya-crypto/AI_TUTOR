'use client'

import React, { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export const dynamic = 'force-dynamic'

export default function ClassRedirectPage() {
  const router = useRouter()
  const params = useParams()
  const userId = params.id as string

  useEffect(() => {
    const supabase = createClient()

    async function routeToActiveModule() {
      try {
        // 1. Fetch completed modules for this user (1 Free Session Quota Check)
        const { data: completedList } = await supabase
          .from('user_progress')
          .select('syllabus_module_id')
          .eq('user_id', userId)
          .eq('status', 'completed')

        if (completedList && completedList.length >= 1) {
          // Free tier completed-module limit reached (1 completed module)
          router.replace(`/dashboard/${userId}?pricing_notice=true`)
          return
        }

        // 2. Fetch user class level
        const { data: profile } = await supabase
          .from('profiles')
          .select('class_level')
          .eq('id', userId)
          .single()

        // 3. Check if there's an in_progress module
        const { data: inProgList } = await supabase
          .from('user_progress')
          .select('syllabus_module_id')
          .eq('user_id', userId)
          .eq('status', 'in_progress')
          .limit(1)

        if (inProgList && inProgList.length > 0 && inProgList[0].syllabus_module_id) {
          router.replace(`/dashboard/${userId}/class/${inProgList[0].syllabus_module_id}`)
          return
        }

        const completedSet = new Set((completedList || []).map((p) => p.syllabus_module_id))

        // 4. Fetch candidate modules from enrolled curriculums or class_level
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('curriculum_id')
          .eq('user_id', userId)
          .eq('status', 'active')

        const enrolledCurriculumIds = (enrollments || []).map((e) => e.curriculum_id).filter(Boolean)

        let query = supabase.from('syllabus_modules').select('id, order_index')
        if (enrolledCurriculumIds.length > 0) {
          query = query.in('curriculum_id', enrolledCurriculumIds)
        } else if (profile?.class_level) {
          query = query.eq('class_level', profile.class_level)
        }

        const { data: candidateMods } = await query.order('order_index', { ascending: true })

        if (candidateMods && candidateMods.length > 0) {
          // Find first uncompleted module
          const nextMod = candidateMods.find((m) => !completedSet.has(m.id))
          const targetModId = nextMod ? nextMod.id : candidateMods[0].id
          router.replace(`/dashboard/${userId}/class/${targetModId}`)
          return
        }

        // 5. Absolute fallback: any module in database
        const { data: anyMod } = await supabase
          .from('syllabus_modules')
          .select('id')
          .order('order_index', { ascending: true })
          .limit(1)

        if (anyMod && anyMod.length > 0) {
          router.replace(`/dashboard/${userId}/class/${anyMod[0].id}`)
        } else {
          router.replace(`/dashboard/${userId}`)
        }
      } catch (err) {
        console.error('Error routing to module class:', err)
        router.replace(`/dashboard/${userId}`)
      }
    }

    if (userId) {
      routeToActiveModule()
    }
  }, [userId, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d1611] text-emerald-200">
      <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="font-serif text-lg text-emerald-100">Entering Spoken Classroom...</p>
      <p className="text-xs text-emerald-400/60 font-mono mt-1">Calibrating Green Chalkboard &amp; Neural Tutor</p>
    </div>
  )
}
