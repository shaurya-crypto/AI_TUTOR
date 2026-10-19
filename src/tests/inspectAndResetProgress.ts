import fs from 'fs'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local')
  const env: Record<string, string> = {}
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim()
        let val = trimmed.substring(eqIdx + 1).trim()
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.substring(1, val.length - 1)
        }
        env[key] = val
      }
    }
  }
  return env
}

const env = loadEnvLocal()
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectAndReset() {
  console.log('--- Supabase Progress Inspection & Cleanup ---')
  const { data: profiles, error: profErr } = await supabase
    .from('profiles')
    .select('id, full_name, class_level')
  if (profErr) {
    console.error('Error fetching profiles:', profErr)
  } else {
    console.log('Profiles found:', profiles)
  }

  const { data: progress, error: progErr } = await supabase
    .from('user_progress')
    .select('*')
  if (progErr) {
    console.error('Error fetching user_progress:', progErr)
  } else {
    console.log('Progress records found:', progress?.length || 0)
    if (progress && progress.length > 0) {
      for (const p of progress) {
        const { data: mod } = await supabase
          .from('syllabus_modules')
          .select('title')
          .eq('id', p.syllabus_module_id)
          .single()
        console.log('Record:', {
          id: p.id,
          user_id: p.user_id,
          module_id: p.syllabus_module_id,
          module_title: mod?.title,
          concept_idx: p.current_concept_index,
          completed_concepts: p.completed_concepts,
          status: p.status,
          notes_length: p.chapter_notes?.length || 0,
        })
      }
    }
  }

  // Check if reset flag is passed
  const doReset = process.argv.includes('--reset')
  if (doReset) {
    console.log('\n--- Resetting user_progress for Shaurya ---')
    const { error: resetErr } = await supabase
      .from('user_progress')
      .update({
        chapter_notes: null,
        completed_concepts: [],
        current_concept_index: 0,
        last_covered_concept: null,
        status: 'in_progress',
        completed_at: null,
        visual_progress: {},
      })
      .eq('user_id', 'ab87e125-a6b2-4c76-adac-bc9f1fcedf07')

    if (resetErr) {
      console.error('Reset error:', resetErr)
    } else {
      console.log('Successfully reset all progress and notes for Shaurya!')
    }
  }
}

inspectAndReset()
