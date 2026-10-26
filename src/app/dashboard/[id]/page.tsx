import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { StitchDashboardView } from "@/components/dashboard/StitchDashboardView";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const resolvedParams = await params;

  if (!user || user.id !== resolvedParams.id) {
    redirect("/login");
  }

  // 1. Fetch user profile
  let { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Self-heal: auto-create the missing profile row in public.profiles
    const { data: newProfile } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email!,
        full_name: (user.user_metadata?.full_name as string) || null,
        class_level: (user.user_metadata?.class_level as string) || null,
        onboarding_completed: false,
      })
      .select("*")
      .single();

    profile = newProfile;
  }

  // Redirect to onboarding if not yet completed
  if (!profile || !profile.onboarding_completed) {
    redirect("/onboarding");
  }

  // 1b. Daily Active Streak Engine: Automatically increments/maintains active streak on web visit
  const todayStr = new Date().toISOString().split("T")[0];
  let currentStreak = profile.current_streak || 0;
  let streakUpdated = false;

  if (!profile.last_active_date) {
    currentStreak = Math.max(1, currentStreak);
    streakUpdated = true;
  } else if (profile.last_active_date !== todayStr) {
    const lastActive = new Date(profile.last_active_date);
    const today = new Date(todayStr);
    const diffDays = Math.round((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Visited on consecutive day: increment streak!
      currentStreak += 1;
      streakUpdated = true;
    } else if (diffDays > 1) {
      // Streak reset to 1
      currentStreak = 1;
      streakUpdated = true;
    }
  } else if (currentStreak === 0) {
    currentStreak = 1;
    streakUpdated = true;
  }

  if (streakUpdated) {
    profile.current_streak = currentStreak;
    profile.last_active_date = todayStr;
    await supabase
      .from("profiles")
      .update({
        current_streak: currentStreak,
        last_active_date: todayStr,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  }

  // 2. Fetch all user enrollments with joined curriculum details
  const { data: enrollmentsData } = await supabase
    .from("enrollments")
    .select(`
      id,
      status,
      enrolled_at,
      curriculum_id,
      curriculums (*)
    `)
    .eq("user_id", user.id)
    .eq("status", "active")
    .order("enrolled_at", { ascending: true });

  const enrollments = enrollmentsData || [];

  // Extract enrolled curriculums
  const enrolledCurriculums = enrollments
    .map((e) => (Array.isArray(e.curriculums) ? e.curriculums[0] : e.curriculums))
    .filter(Boolean);

  // 3. Fetch published curriculums (filtered by student's class_level if set, or all published)
  let curriculumsQuery = supabase
    .from("curriculums")
    .select("*")
    .eq("is_published", true);

  if (profile?.class_level) {
    curriculumsQuery = curriculumsQuery.or(`class_level.eq.${profile.class_level},class_level.is.null`);
  }

  const { data: allCurriculumsData } = await curriculumsQuery
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  const allCurriculums = allCurriculumsData || [];

  // 4. Fetch syllabus modules (guaranteeing all modules of enrolled & available curriculums are included)
  const enrolledCurriculumIds = enrolledCurriculums.map((c: any) => c.id).filter(Boolean);
  const allCurriculumIds = allCurriculums.map((c: any) => c.id).filter(Boolean);
  const targetCurriculumIds = Array.from(new Set([...enrolledCurriculumIds, ...allCurriculumIds]));

  let modulesQuery = supabase
    .from("syllabus_modules")
    .select("id, curriculum_id, order_index, title, description, estimated_minutes, key_concepts, success_criteria, class_level, board, curriculums(*)")
    .order("order_index", { ascending: true });

  if (targetCurriculumIds.length > 0) {
    modulesQuery = modulesQuery.in("curriculum_id", targetCurriculumIds);
  } else if (profile?.class_level) {
    modulesQuery = modulesQuery.or(`class_level.eq.${profile.class_level},class_level.is.null`);
  }

  const { data: modulesData } = await modulesQuery;
  const allModules = modulesData || [];

  // 5. Parallelized Read Execution: progress, memories, and active study plan
  const [
    { data: progressData },
    { data: memoriesData },
    { data: studyPlan }
  ] = await Promise.all([
    supabase.from("user_progress").select("*").eq("user_id", user.id),
    supabase.from("ai_user_memories").select("*").eq("user_id", user.id).order("importance_score", { ascending: false }).limit(10),
    supabase.from("student_study_plans").select("*").eq("user_id", user.id).eq("is_active", true).maybeSingle(),
  ]);

  const userProgress = progressData || [];
  const userMemories = memoriesData || [];

  // 7. Dynamic Active Curriculum Resolution:
  // Strictly database-driven:
  // 1. Pick first enrolled curriculum that has an 'in_progress' module
  // 2. Or pick first enrolled curriculum with uncompleted modules
  // 3. If all enrolled are 100% completed, pick first enrolled curriculum or first available
  const progressMap = new Map<string, any>();
  userProgress.forEach((p: any) => progressMap.set(p.syllabus_module_id, p));

  const isModuleDone = (mId: string) => {
    const p = progressMap.get(mId);
    return p?.status === 'completed' || !!p?.completed_at;
  };
  const isModuleInProgress = (mId: string) => {
    const p = progressMap.get(mId);
    return p?.status === 'in_progress' && !p?.completed_at;
  };

  let primaryCurriculum = null;

  // 1. Check for in-progress module across enrolled curriculums
  for (const curr of enrolledCurriculums) {
    const cMods = allModules.filter((m: any) => m.curriculum_id === curr.id);
    const hasInProgress = cMods.some((m: any) => isModuleInProgress(m.id));
    if (hasInProgress) {
      primaryCurriculum = curr;
      break;
    }
  }

  // 2. Check for curriculum with unfinished modules across enrolled curriculums
  if (!primaryCurriculum) {
    for (const curr of enrolledCurriculums) {
      const cMods = allModules.filter((m: any) => m.curriculum_id === curr.id);
      const isUnfinished = cMods.length > 0 && cMods.some((m: any) => !isModuleDone(m.id));
      if (isUnfinished) {
        primaryCurriculum = curr;
        break;
      }
    }
  }

  // 3. If all enrolled curriculums are 100% completed, pick next syllabus chapter in allCurriculums!
  if (!primaryCurriculum) {
    for (const curr of allCurriculums) {
      const cMods = allModules.filter((m: any) => m.curriculum_id === curr.id);
      const isUnfinished = cMods.length > 0 && cMods.some((m: any) => !isModuleDone(m.id));
      if (isUnfinished) {
        primaryCurriculum = curr;
        // Auto-enroll student into this next chapter
        await supabase
          .from('enrollments')
          .upsert({
            user_id: user.id,
            curriculum_id: curr.id,
            status: 'active',
            enrolled_at: new Date().toISOString()
          }, { onConflict: 'user_id,curriculum_id' });
        break;
      }
    }
  }

  // 4. Fallback to first enrolled or first published curriculum
  if (!primaryCurriculum) {
    primaryCurriculum = enrolledCurriculums[0] || allCurriculums[0] || null;
  }

  return (
    <StitchDashboardView
      user={{ id: user.id, email: user.email }}
      profile={profile}
      primaryCurriculum={primaryCurriculum}
      enrolledCurriculums={enrolledCurriculums}
      allCurriculums={allCurriculums}
      modules={allModules}
      progressRecords={userProgress}
      memories={userMemories}
      studyPlan={studyPlan}
    />
  );
}
