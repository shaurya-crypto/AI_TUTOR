import { NextResponse } from 'next/server'
import { GoogleGenAI } from '@google/genai'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { checkRateLimit } from '@/lib/rateLimit'
import { resilientGenerateContent } from '@/lib/geminiResilientGenerate'

export interface QuizQuestion {
  id: number
  question: string
  options: string[]
  correctIndex: number
  explanation: string
  conceptTested: string
}

function cleanJsonString(raw: string): string {
  let cleaned = raw.trim()
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim()
  } else {
    const firstBrace = cleaned.indexOf('{')
    const lastBrace = cleaned.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1)
    }
  }

  let result = ''
  let inString = false
  let escaped = false

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]

    if (inString) {
      if (escaped) {
        escaped = false
        result += char
      } else if (char === '\\') {
        const nextChar = cleaned[i + 1]
        // If not followed by standard JSON escape, escape the backslash itself (e.g. LaTeX \Omega, \alpha)
        if (!nextChar || !/["\\\/bfnrtu]/.test(nextChar)) {
          result += '\\\\'
        } else {
          result += '\\'
          escaped = true
        }
      } else if (char === '"') {
        inString = false
        result += '"'
      } else if (char === '\n') {
        result += '\\n'
      } else if (char === '\r') {
        if (cleaned[i + 1] !== '\n') {
          result += '\\n'
        }
      } else if (char === '\t') {
        result += '\\t'
      } else {
        const code = char.charCodeAt(0)
        if (code < 32) {
          result += ' '
        } else {
          result += char
        }
      }
    } else {
      if (char === '"') {
        inString = true
        result += '"'
      } else {
        result += char
      }
    }
  }

  return result
}

function parseQuizJson(raw: string): QuizQuestion[] {
  const cleaned = cleanJsonString(raw)

  // 1. Try standard JSON parse
  try {
    const parsed = JSON.parse(cleaned)
    if (Array.isArray(parsed.questions) && parsed.questions.length > 0) {
      return parsed.questions
    }
  } catch (parseErr) {
    console.warn('[Quiz API] Standard parse failed, attempting auto-repair...')
  }

  // 2. Attempt auto-repair on truncated arrays (missing closing ]})
  try {
    const lastCloseObj = cleaned.lastIndexOf('}')
    if (lastCloseObj !== -1) {
      const qIndex = cleaned.indexOf('"questions"')
      if (qIndex !== -1) {
        const bracketIndex = cleaned.indexOf('[', qIndex)
        if (bracketIndex !== -1 && lastCloseObj > bracketIndex) {
          const repaired = cleaned.substring(0, lastCloseObj + 1) + ']}'
          const parsedRepaired = JSON.parse(repaired)
          if (Array.isArray(parsedRepaired.questions) && parsedRepaired.questions.length > 0) {
            return parsedRepaired.questions
          }
        }
      }
    }
  } catch {}

  // 3. Fallback: extract individual question objects using regex
  const questions: QuizQuestion[] = []
  const qMatches = raw.match(/\{[^{}]*"question"\s*:\s*"[\s\S]*?"options"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/g) || []
  for (const qStr of qMatches) {
    try {
      const q = JSON.parse(cleanJsonString(qStr))
      if (q.question && Array.isArray(q.options) && q.options.length >= 2) {
        questions.push(q)
      }
    } catch {}
  }

  if (questions.length > 0) {
    return questions
  }

  throw new Error('Failed to parse quiz questions from AI response.')
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rateLimit = checkRateLimit({
      key: `quiz:${user.id}`,
      maxRequests: 6,
      windowMs: 60 * 1000,
    })
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Quiz generation limit exceeded. Please wait a minute before requesting another quiz.' },
        { status: 429 }
      )
    }

    const body = await req.json()
    const moduleId = body.moduleId
    const forceRefresh = Boolean(body.forceRefresh)

    if (!moduleId) {
      return NextResponse.json({ error: 'Missing moduleId' }, { status: 400 })
    }

    // 2. Fetch module context from database
    const { data: moduleData, error: modError } = await supabase
      .from('syllabus_modules')
      .select('*, curriculums(title, category, board, class_level, description)')
      .eq('id', moduleId)
      .single()

    if (modError || !moduleData) {
      return NextResponse.json({ error: 'Syllabus module not found' }, { status: 404 })
    }

    // Fast-path: Return cached questions immediately if not forced to regenerate
    if (!forceRefresh && Array.isArray(moduleData.quiz_questions) && moduleData.quiz_questions.length >= 5) {
      return NextResponse.json({
        success: true,
        moduleId,
        topicTitle: moduleData.title,
        questions: moduleData.quiz_questions,
        cached: true,
      })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY is not configured' }, { status: 500 })
    }

    const ai = new GoogleGenAI({ apiKey })

    const curriculumTitle = Array.isArray(moduleData.curriculums)
      ? moduleData.curriculums[0]?.title
      : (moduleData.curriculums as any)?.title || 'Science'

    const boardName = moduleData.board || (moduleData.curriculums as any)?.board || 'CBSE'
    const classLevel = moduleData.class_level || (moduleData.curriculums as any)?.class_level || 'Class 10'

    const existingQuestions: QuizQuestion[] = Array.isArray(moduleData.quiz_questions) ? moduleData.quiz_questions : []
    const existingStems = existingQuestions
      .map((q) => `- ${q.question}`)
      .filter(Boolean)
      .slice(0, 15)
      .join('\n')

    const chapterNotes = (moduleData.chapter_notes || '').trim()
    const contextNotes = (moduleData.ai_system_prompt_context || moduleData.description || '').trim()

    const prompt = `You are a Senior Academic Board Examiner for ${boardName} (${classLevel}).
Generate exactly 10 rigorous, high-quality multiple choice questions (MCQs) for the syllabus capsule:
COURSE: ${curriculumTitle} | CAPSULE: "${moduleData.title}" | LEVEL: ${classLevel} | BOARD: ${boardName}

BOOK CONCEPTS & OFFICIAL SYLLABUS:
- Key Concepts: ${(moduleData.key_concepts || []).join(', ')}
${moduleData.subtopics?.length ? `- Subtopics: ${JSON.stringify(moduleData.subtopics)}` : ''}
${moduleData.common_misconceptions?.length ? `- Common Misconceptions to address: ${(moduleData.common_misconceptions || []).join('; ')}` : ''}
${chapterNotes ? `\nOFFICIAL CHAPTER NOTES & CORE LAWS:\n"""\n${chapterNotes.substring(0, 2000)}\n"""` : ''}
${contextNotes ? `\nPEDAGOGICAL TEXTBOOK CONTEXT:\n"""\n${contextNotes.substring(0, 1500)}\n"""` : ''}

${existingStems ? `CRITICAL - AVOID REPEATING PREVIOUS QUESTIONS:
The student has already practiced these questions. You MUST generate 10 completely fresh, novel questions exploring DIFFERENT aspects, deeper intuition, numerical values, or real-life applications:
${existingStems}
` : ''}

REQUIREMENTS:
1. Exactly 10 questions covering principles, applications, and authentic board-exam patterns.
2. 4 options per question.
3. Zero-indexed 'correctIndex' (0..3).
4. Clear educational 'explanation' (concise, 1-2 sentences).
5. Exact 'conceptTested' corresponding to one of the capsule's key concepts.
6. Strictly ZERO emojis.

OUTPUT FORMAT:
JSON object only:
{
  "questions": [
    {
      "id": 1,
      "question": "string",
      "options": ["A", "B", "C", "D"],
      "correctIndex": 0,
      "explanation": "string",
      "conceptTested": "string"
    }
  ]
}`

    const { text: rawText } = await resilientGenerateContent(ai, {
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        maxOutputTokens: 4096,
        temperature: forceRefresh ? 0.75 : 0.4,
      },
      label: forceRefresh ? 'Quiz Refresh Generation' : 'Quiz Initial Generation',
    })

    // Resilient JSON extraction
    const questions = parseQuizJson(rawText)

    // Persist questions in database cache for instant future loads
    try {
      const adminClient = createAdminClient()
      await adminClient
        .from('syllabus_modules')
        .update({ quiz_questions: questions })
        .eq('id', moduleId)
    } catch (saveErr) {
      console.warn('[Quiz API] Failed to cache quiz questions to database:', saveErr)
    }

    return NextResponse.json({
      success: true,
      moduleId,
      topicTitle: moduleData.title,
      questions,
      cached: false,
    })
  } catch (err: any) {
    if (err?.code === 'ECONNRESET' || err?.name === 'AbortError' || err?.message?.includes('aborted')) {
      console.warn('[Quiz API] Request aborted by client')
      return new Response(null, { status: 499 })
    }
    console.error('[Quiz API] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to generate quiz questions' },
      { status: 500 }
    )
  }
}
