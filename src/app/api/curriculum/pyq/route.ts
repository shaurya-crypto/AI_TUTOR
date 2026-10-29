import { NextResponse } from 'next/server'
import { GoogleGenAI, Part } from '@google/genai'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isRequestAuthorizedAdmin } from '@/lib/adminAuth'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { resilientGenerateContent, resilientJsonParse } from '@/lib/geminiResilientGenerate'

export interface PyqQuestion {
  id: string
  year: string
  marks: number
  type: 'MCQ' | 'VSA' | 'SA' | 'LA' | 'CASE_STUDY' | 'NUMERICAL'
  question: string
  given?: string
  formula?: string
  solution: string
  final_answer: string
  topic?: string
  difficulty: 'easy' | 'medium' | 'hard'
}

function cleanJsonString(raw: string): string {
  let s = raw.trim()
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i
  const match = s.match(codeBlockRegex)
  if (match && match[1]) {
    s = match[1].trim()
  } else {
    const firstBrace = s.indexOf('{')
    const lastBrace = s.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      s = s.substring(firstBrace, lastBrace + 1)
    }
  }
  return s
}

// ---------------------------------------------------------------------------
// GET: Fetch Previous Year Questions (PYQs) for a chapter or class/subject
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const curriculumId = searchParams.get('curriculumId')
    const board = searchParams.get('board')
    const classLevel = searchParams.get('classLevel')
    const category = searchParams.get('category')

    const supabase = await createClient()
    let query = supabase.from('chapter_pyqs').select('*')

    if (curriculumId) {
      query = query.eq('curriculum_id', curriculumId)
    }
    if (board) {
      query = query.eq('board', board)
    }
    if (classLevel) {
      query = query.eq('class_level', classLevel)
    }
    if (category) {
      query = query.eq('category', category)
    }

    const { data: pyqRecords, error: pyqErr } = await query.order('created_at', { ascending: false })

    if (pyqErr) {
      console.error('[PYQ API] GET error:', pyqErr)
      return NextResponse.json({ error: pyqErr.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      pyqs: pyqRecords || [],
    })
  } catch (err: any) {
    console.error('[PYQ API] GET unhandled error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch PYQ practice sets.' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Upload Multiple PYQ Papers / Text and Synthesize Chapter Practice Set
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const isAuthorized = await isRequestAuthorizedAdmin(req)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 401 })
    }

    const ip = getClientIp(req)
    const rateLimit = checkRateLimit({
      key: `pyq_post:${ip}`,
      maxRequests: 15,
      windowMs: 10 * 60 * 1000,
    })
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Ingestion is limited to 15 requests per 10 minutes.' },
        { status: 429 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in the server environment.' },
        { status: 500 }
      )
    }

    const adminSupabase = createAdminClient()
    const ai = new GoogleGenAI({ apiKey })

    const contentType = req.headers.get('content-type') || ''
    let curriculumId = ''
    let board = 'CBSE'
    let classLevel = 'Class 10'
    let category = 'Science'
    let chapterTitle = ''
    let rawText = ''
    let filenames: string[] = []
    const fileParts: Part[] = []

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      curriculumId = (formData.get('curriculumId') as string) || ''
      board = (formData.get('board') as string) || 'CBSE'
      classLevel = (formData.get('classLevel') as string) || 'Class 10'
      category = (formData.get('category') as string) || 'Science'
      chapterTitle = (formData.get('chapterTitle') as string) || ''
      rawText = (formData.get('rawText') as string) || ''

      const files = formData.getAll('files') as File[]
      for (const file of files) {
        if (file && file.size > 0) {
          const arrayBuffer = await file.arrayBuffer()
          const base64Data = Buffer.from(arrayBuffer).toString('base64')
          const mimeType = file.type || 'application/pdf'
          fileParts.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          })
          filenames.push(file.name)
        }
      }
    } else {
      const body = await req.json()
      curriculumId = body.curriculumId || ''
      board = body.board || 'CBSE'
      classLevel = body.classLevel || 'Class 10'
      category = body.category || 'Science'
      chapterTitle = body.chapterTitle || ''
      rawText = body.rawText || ''
    }

    if (!curriculumId) {
      return NextResponse.json({ error: 'Curriculum ID is required.' }, { status: 400 })
    }

    // Fetch curriculum details if chapter title not passed
    if (!chapterTitle) {
      const { data: currRecord } = await adminSupabase
        .from('curriculums')
        .select('title, board, class_level, category')
        .eq('id', curriculumId)
        .single()
      if (currRecord) {
        chapterTitle = currRecord.title
        board = currRecord.board || board
        classLevel = currRecord.class_level || classLevel
        category = currRecord.category || category
      }
    }

    if (fileParts.length === 0 && (!rawText || rawText.trim().length < 10)) {
      return NextResponse.json(
        { error: 'Please provide at least one past year question paper (PDF) or paste the questions text.' },
        { status: 400 }
      )
    }

    const pyqSynthesisPrompt = `You are a Senior Board Examination Officer and Academic Topper Evaluator for ${board}.
Your task is to analyze the provided past year question papers / questions and compile an authentic, high-yield "Chapter PYQ Board Practice Set" specifically for the chapter:
CHAPTER: "${chapterTitle}"
CURRICULUM: ${board} | ${classLevel} | ${category}

EXTRACTION & COMPILATION INSTRUCTIONS:
1. Filter & extract ONLY questions that directly belong to "${chapterTitle}".
2. Capture authentic examination details for each question:
   - "year": The exact examination year and paper variant (e.g. "${board} 2024 (Set 1)", "${board} 2023", "${board} 2020 Compartment", "${board} 2019 Outside Delhi"). If unspecified in the text, attribute to an authentic recent ${board} exam year between 2018 and 2024.
   - "marks": Exact mark allocation matching the board marking pattern (1, 2, 3, 4, or 5 marks).
   - "type": "MCQ" (1 mark), "VSA" (1 mark short), "SA" (2-3 marks short answer/derivation), "LA" (5 marks long answer/full derivation), "CASE_STUDY" (4-5 marks competency NEP 2020), or "NUMERICAL" (calculation with Given -> Formula -> Substitution -> Boxed Answer).
   - "question": Complete, unabridged question text with all figures/variables stated in text.
   - "given": For numericals/math, clear Given data with SI units.
   - "formula": For numericals/math, governing scientific equation or theorem.
   - "solution": Step-by-step model topper answer conforming strictly to the official ${board} marking scheme breakdown.
   - "final_answer": The concise, boxed conclusion or evaluated value with correct SI units.
   - "topic": The specific subtopic within the chapter.
   - "difficulty": "easy" | "medium" | "hard"
3. Organize the Practice Set to provide comprehensive board preparation:
   - Include 6 to 15 authentic past year questions covering all major subtopics and mark weights.
   - Prioritize high-frequency board questions, frequent student pitfall questions, and NEP 2020 competency-based numericals.
4. STRICT INVARIANT: Classes 6-12 school curriculum only. Strictly zero competitive exams (JEE/NEET) or college curriculum. Strictly zero emojis.

${rawText ? `PAST PAPERS / QUESTIONS TEXT:\n"""\n${rawText.substring(0, 100000)}\n"""` : 'Analyze the attached past year question papers thoroughly.'}

OUTPUT FORMAT:
Respond with ONLY a valid JSON object matching this schema (do NOT include conversational prose outside JSON):
{
  "chapter_title": "${chapterTitle}",
  "board": "${board}",
  "class_level": "${classLevel}",
  "total_questions": 10,
  "practice_set": [
    {
      "id": "pyq_1",
      "year": "CBSE 2023 (Set 2)",
      "marks": 3,
      "type": "SA",
      "question": "string",
      "given": "string",
      "formula": "string",
      "solution": "string (step-by-step marking scheme breakdown)",
      "final_answer": "string",
      "topic": "string",
      "difficulty": "medium"
    }
  ]
}`

    const contents: any[] = []
    for (const part of fileParts) {
      contents.push(part)
    }
    contents.push(pyqSynthesisPrompt)

    const { text: rawResponseText } = await resilientGenerateContent(ai, {
      contents,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
      label: 'PYQ Practice Set Synthesis',
    })

    const parsedData = resilientJsonParse<any>(rawResponseText, 'PYQ Practice Set Synthesis')
    const practiceSet: PyqQuestion[] = parsedData.practice_set || []

    if (practiceSet.length === 0) {
      return NextResponse.json(
        { error: 'No chapter-relevant past year questions could be extracted from the provided files.' },
        { status: 422 }
      )
    }

    const sourceFilename = filenames.join(', ') || 'past_year_questions.pdf'

    // Upsert or insert into chapter_pyqs table
    const { data: existingPyq } = await adminSupabase
      .from('chapter_pyqs')
      .select('id, practice_set')
      .eq('curriculum_id', curriculumId)
      .maybeSingle()

    let savedPyqRecord: any = null

    if (existingPyq) {
      // Merge practice sets if existing, avoiding duplicates by question text
      const existingQuestions: PyqQuestion[] = existingPyq.practice_set || []
      const mergedQuestions = [...existingQuestions]

      for (const newQ of practiceSet) {
        const isDup = mergedQuestions.some(
          (eq) => eq.question.trim().toLowerCase() === newQ.question.trim().toLowerCase()
        )
        if (!isDup) {
          mergedQuestions.push({
            ...newQ,
            id: `pyq_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          })
        }
      }

      const { data: updated, error: updateErr } = await adminSupabase
        .from('chapter_pyqs')
        .update({
          practice_set: mergedQuestions,
          source_filename: sourceFilename,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPyq.id)
        .select()
        .single()

      if (updateErr) throw new Error(updateErr.message)
      savedPyqRecord = updated
    } else {
      const indexedQuestions = practiceSet.map((q, idx) => ({
        ...q,
        id: `pyq_${idx + 1}_${Date.now()}`,
      }))

      const { data: inserted, error: insertErr } = await adminSupabase
        .from('chapter_pyqs')
        .insert({
          curriculum_id: curriculumId,
          board,
          class_level: classLevel,
          category,
          chapter_title: chapterTitle,
          source_filename: sourceFilename,
          practice_set: indexedQuestions,
          raw_content: rawText || `[Attached Papers: ${sourceFilename}]`,
        })
        .select()
        .single()

      if (insertErr) throw new Error(insertErr.message)
      savedPyqRecord = inserted
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synthesized ${practiceSet.length} past year questions for "${chapterTitle}".`,
      pyqRecord: savedPyqRecord,
      practiceSetCount: savedPyqRecord?.practice_set?.length || practiceSet.length,
    })
  } catch (err: any) {
    console.error('[PYQ API] POST unhandled error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to synthesize PYQ practice set.' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE: Delete a chapter PYQ record
// ---------------------------------------------------------------------------
export async function DELETE(req: Request) {
  try {
    const isAuthorized = await isRequestAuthorizedAdmin(req)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'PYQ Record ID is required.' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    const { error: delErr } = await adminSupabase.from('chapter_pyqs').delete().eq('id', id)

    if (delErr) {
      console.error('[PYQ API] DELETE error:', delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deletedId: id })
  } catch (err: any) {
    console.error('[PYQ API] DELETE unhandled error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to delete PYQ record.' },
      { status: 500 }
    )
  }
}
