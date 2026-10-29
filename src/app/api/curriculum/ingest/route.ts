export const maxDuration = 300;
import { NextResponse } from 'next/server'
import { GoogleGenAI, Part } from '@google/genai'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isRequestAuthorizedAdmin } from '@/lib/adminAuth'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { resilientGenerateContent, resilientJsonParse } from '@/lib/geminiResilientGenerate'
import { generateVisualLessonPlanForCapsule } from '@/services/visualLessonPlanGenerator'

interface WorkedExample {
  problem: string
  given: string
  formula: string
  substitution: string
  calculation: string
  finalAnswer: string
  unit: string
}

interface ConceptVisual {
  concept_title: string
  diagram_title: string
  diagram_type: string
  what_to_make: string
  svg?: string
  diagram_svg?: string
  timing_and_cue?: string
}

interface TextbookQuestion {
  q_num: string
  question: string
  question_type?: 'conceptual' | 'numerical' | 'proof' | 'construction'
  solution_method?: string
}

interface TextbookExercise {
  exercise_number: string
  questions: TextbookQuestion[]
}

interface GeneratedModule {
  order_index: number
  title: string
  description: string
  subtopics: string[]
  key_concepts: string[]
  success_criteria: string
  chapter_notes?: string
  worked_examples?: WorkedExample[]
  common_misconceptions?: string[]
  ai_system_prompt_context: string
  visual_ideas?: string
  diagram_type?: string
  what_to_make?: string
  diagram_svg?: string
  chapter_flowchart?: string
  concept_visuals?: ConceptVisual[]
  textbook_definitions?: Array<{ concept: string; definition: string; si_units?: string }>
  textbook_examples?: Array<{ title: string; scenario: string }>
  textbook_exercises?: TextbookExercise[]
  visual_lesson_plan?: any
}

interface GeneratedCurriculum {
  title: string
  category: string
  board?: string
  description: string
  difficulty_level: 'beginner' | 'intermediate' | 'advanced'
  order_index?: number
  modules: GeneratedModule[]
}

export type EducationalBoard = 'CBSE' | 'ICSE' | 'IB'

function cleanJsonString(raw: string): string {
  let s = raw.trim()
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i
  const match = s.match(codeBlockRegex)
  if (match && match[1]) {
    s = match[1].trim()
  } else {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '')
    const firstBrace = s.indexOf('{')
    const firstBracket = s.indexOf('[')
    let startIdx = 0
    if (firstBrace !== -1 && firstBracket !== -1) startIdx = Math.min(firstBrace, firstBracket)
    else if (firstBrace !== -1) startIdx = firstBrace
    else if (firstBracket !== -1) startIdx = firstBracket
    if (startIdx > 0) s = s.substring(startIdx)
  }
  return s
}

function toSafeStringArray(val: any): string[] {
  if (Array.isArray(val)) {
    return val.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).filter(Boolean)
  }
  if (typeof val === 'string' && val.trim().length > 0) {
    return val.split(/\r?\n|,/).map((s) => s.trim()).filter(Boolean)
  }
  return []
}

function toSafeJsonbArray(val: any): any[] {
  if (Array.isArray(val)) return val
  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val)
      if (Array.isArray(parsed)) return parsed
      return [parsed]
    } catch {
      return [{ text: val }]
    }
  }
  if (val && typeof val === 'object') return [val]
  return []
}

function buildEnhancedVisualPlanAndDirective(cap: any, visualPlan: any) {
  const conceptVisualsList = (Array.isArray(cap.concept_visuals) ? cap.concept_visuals : []).map((cv: any) => ({
    ...cv,
    diagram_svg: cv.diagram_svg || cv.svg || '',
    svg: cv.diagram_svg || cv.svg || '',
  }))

  const exercisesList = Array.isArray(cap.textbook_exercises) ? cap.textbook_exercises : []

  const enhancedVisualPlan = {
    ...visualPlan,
    diagram_idea: cap.visual_ideas || cap.diagram_idea || '',
    diagram_type: cap.diagram_type || 'vector_svg_diagram',
    what_to_make: cap.what_to_make || cap.diagram_description || '',
    diagram_svg: cap.diagram_svg || '',
    chapter_flowchart: cap.chapter_flowchart || '',
    textbook_definitions: cap.textbook_definitions || [],
    textbook_examples: cap.textbook_examples || [],
    textbook_exercises: exercisesList,
    concept_visuals: conceptVisualsList,
  }

  const defsList = Array.isArray(cap.textbook_definitions) ? cap.textbook_definitions : []
  const defsText = defsList
    .map((d: any) => `- ${d.concept || ''}: "${d.definition || ''}" ${d.si_units ? `[SI Unit: ${d.si_units}]` : ''}`)
    .filter(Boolean)
    .join('\n')

  const examplesList = Array.isArray(cap.textbook_examples) ? cap.textbook_examples : []
  const examplesText = examplesList
    .map((e: any) => `- ${e.title || ''}: ${e.scenario || ''}`)
    .filter(Boolean)
    .join('\n')

  const exercisesText = exercisesList
    .map((ex: any) => {
      const qText = (ex.questions || [])
        .map((q: any) => `    * [${q.q_num || 'Q'}] (${q.question_type || 'numerical'}): ${q.question || ''}\n      Method: ${q.solution_method || ''}`)
        .join('\n')
      return `  - ${ex.exercise_number || 'Textbook Exercise'}:\n${qText}`
    })
    .filter(Boolean)
    .join('\n')

  const visualPlaybook = conceptVisualsList
    .map((cv: any, idx: number) => {
      return `  * Concept #${idx + 1} "${cv.concept_title}":
    - Visual Title: "${cv.diagram_title || cv.concept_title}" (${cv.diagram_type || 'vector_svg_diagram'})
    - What to Draw: ${cv.what_to_make || ''}
    - Timing & Directive: ${cv.timing_and_cue || 'Call render_svg_diagram during Step 2.'}`
    })
    .join('\n')

  const diagramDirective = `
TEXTBOOK GROUNDING & MANDATORY TEACHING DIRECTIVES:
- Capsule Overview Diagram: ${cap.what_to_make || cap.visual_ideas || 'Scientific Vector Diagram'}
- Diagram Type: ${cap.diagram_type || 'vector_svg_diagram'}
${cap.chapter_flowchart ? `- Chapter Multi-Level Flowchart: ${cap.chapter_flowchart}\n- FLOWCHART DIRECTIVE: Call write_chalkboard(action="draw_flowchart", content="${cap.chapter_flowchart}") to visually organize the concepts on the board!\n` : ''}
${defsText ? `- Verbatim Textbook Definitions:\n${defsText}\n` : ''}
${examplesText ? `- Textbook Concrete Examples:\n${examplesText}\n` : ''}
${exercisesText ? `- AUTHENTIC TEXTBOOK EXERCISES & QUESTIONS:\n${exercisesText}\n` : ''}
${visualPlaybook ? `- CONCEPT-BY-CONCEPT VISUAL PLAYBOOK (MANDATORY UNIQUE DRAWINGS):\n${visualPlaybook}\n` : ''}
- MANDATORY WHITEBOARD INSTRUCTION: Each concept in this capsule has a DISTINCT, dedicated visual. You MUST call render_svg_diagram or draw_graph with that concept's UNIQUE diagram when teaching it! NEVER duplicate or reuse the same diagram across different concepts!
- EXPLANATION MANDATE: When explaining definitions, formulas, and algebraic transitions, unpack the physical meaning and the "why" behind each line out loud. Never merely recite the text!
`

  return { enhancedVisualPlan, diagramDirective }
}

// ---------------------------------------------------------------------------
// GET: Fetch all published curriculums, boards, classes, subjects & module counts
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: curriculums, error: currErr } = await supabase
      .from('curriculums')
      .select(`
        id,
        title,
        description,
        board,
        category,
        class_level,
        order_index,
        difficulty_level,
        estimated_duration_minutes,
        is_published,
        created_at,
        raw_chapter_notes,
        notes_summary,
        notes_source_filename,
        gemini_cache_name,
        syllabus_modules (
          id,
          title,
          order_index,
          estimated_minutes,
          chapter_notes,
          worked_examples,
          common_misconceptions,
          subtopics,
          key_concepts,
          visual_lesson_plan
        )
      `)
      .order('board', { ascending: true })
      .order('class_level', { ascending: true })
      .order('category', { ascending: true })
      .order('order_index', { ascending: true })

    if (currErr) {
      console.error('[Curriculum Ingest API] GET error:', currErr)
      return NextResponse.json({ error: currErr.message }, { status: 500 })
    }

    const formatted = (curriculums || []).map((c: any) => {
      const modules = (c.syllabus_modules || []).sort(
        (a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0)
      ).map((m: any) => {
        const vPlan = m.visual_lesson_plan || {}
        return {
          ...m,
          visual_ideas: vPlan.diagram_idea || vPlan.visual_ideas || '',
          diagram_type: vPlan.diagram_type || '',
          what_to_make: vPlan.what_to_make || vPlan.diagram_description || '',
          diagram_svg: vPlan.diagram_svg || '',
          visual_lesson_plan: vPlan,
        }
      })
      const hasNotes = Boolean(
        (c.raw_chapter_notes && c.raw_chapter_notes.trim().length > 0) ||
        c.notes_source_filename
      )

      return {
        id: c.id,
        title: c.title,
        description: c.description,
        board: (c.board as EducationalBoard) || 'CBSE',
        category: c.category || 'General',
        class_level: c.class_level || 'Class 10',
        order_index: c.order_index ?? 1,
        difficulty_level: c.difficulty_level || 'intermediate',
        estimated_duration_minutes: c.estimated_duration_minutes || 60,
        is_published: c.is_published ?? true,
        created_at: c.created_at,
        hasNotes,
        notesSummary: c.notes_summary || null,
        notesSourceFilename: c.notes_source_filename || null,
        geminiCacheName: c.gemini_cache_name || null,
        modulesCount: modules.length,
        modules,
      }
    })

    const uniqueClasses = Array.from(
      new Set(formatted.map((c) => c.class_level).filter(Boolean))
    )
    const uniqueSubjects = Array.from(
      new Set(formatted.map((c) => c.category).filter(Boolean))
    )
    const uniqueBoards: EducationalBoard[] = ['CBSE', 'ICSE', 'IB']

    return NextResponse.json({
      success: true,
      curriculums: formatted,
      classes: uniqueClasses,
      subjects: uniqueSubjects,
      boards: uniqueBoards,
    })
  } catch (err: any) {
    console.error('[Curriculum Ingest API] GET unhandled error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch curriculums.' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// DELETE: Delete a curriculum chapter (cascading child modules and progress)
// ---------------------------------------------------------------------------
export async function DELETE(req: Request) {
  try {
    const isAuthorized = await isRequestAuthorizedAdmin(req)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 401 })
    }

    const ip = getClientIp(req)
    const rateLimit = checkRateLimit({
      key: `ingest_del:${ip}`,
      maxRequests: 20,
      windowMs: 60 * 1000,
    })
    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait a moment.' }, { status: 429 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Curriculum ID is required.' }, { status: 400 })
    }

    const adminSupabase = createAdminClient()

    // 1. Delete associated syllabus modules first to prevent foreign key cascade locking
    await adminSupabase
      .from('syllabus_modules')
      .delete()
      .eq('curriculum_id', id)

    // 2. Delete the curriculum record
    const { error: delErr } = await adminSupabase
      .from('curriculums')
      .delete()
      .eq('id', id)

    if (delErr) {
      console.error('[Curriculum Ingest API] DELETE error:', delErr)
      return NextResponse.json({ error: delErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, deletedId: id })
  } catch (err: any) {
    console.error('[Curriculum Ingest API] DELETE unhandled error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to delete curriculum.' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// POST: Preview, Commit, or Attach Chapter Notes via Multi-Stage Pipeline
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    const isAuthorized = await isRequestAuthorizedAdmin(req)
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized: Admin privileges required.' }, { status: 401 })
    }

    const ip = getClientIp(req)
    const rateLimit = checkRateLimit({
      key: `ingest_post:${ip}`,
      maxRequests: 10,
      windowMs: 10 * 60 * 1000,
    })
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Ingestion is limited to 10 requests per 10 minutes.' },
        { status: 429 }
      )
    }

    const adminSupabase = createAdminClient()
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured in the server environment.' },
        { status: 500 }
      )
    }

    const ai = new GoogleGenAI({ apiKey })

    const contentType = req.headers.get('content-type') || ''
    let bodyData: any = {}
    let filePart: Part | null = null

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      bodyData.action = formData.get('action') as string || ''
      bodyData.curriculumId = formData.get('curriculumId') as string || ''
      bodyData.board = (formData.get('board') as string) || 'CBSE'
      bodyData.classLevel = (formData.get('classLevel') as string) || ''
      bodyData.category = (formData.get('category') as string) || 'Science'
      bodyData.chapterNumber = Number(formData.get('chapterNumber')) || 1
      bodyData.chapterTitle = (formData.get('chapterTitle') as string) || ''
      bodyData.rawSyllabusText = (formData.get('rawSyllabusText') as string) || ''
      bodyData.notesText = (formData.get('notesText') as string) || ''
      bodyData.notesSourceFilename = (formData.get('notesSourceFilename') as string) || ''
      bodyData.strategy = (formData.get('strategy') as string) || 'synthesize_capsules'
      bodyData.mode = ((formData.get('mode') as string) || 'preview') as 'preview' | 'commit'
      bodyData.replaceExisting = formData.get('replaceExisting') === 'true'

      const file = formData.get('file') as File | null
      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer()
        const base64Data = Buffer.from(arrayBuffer).toString('base64')
        const mimeType = file.type || 'application/pdf'
        filePart = {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        }
        if (!bodyData.notesSourceFilename) {
          bodyData.notesSourceFilename = file.name
        }
      }

      const rawPreviewData = formData.get('previewData') as string | null
      if (rawPreviewData) {
        try {
          bodyData.curriculumsToCommit = resilientJsonParse(rawPreviewData, "Preview Data")
        } catch (e) {
          console.warn('[Ingest API] Failed to parse previewData JSON:', e)
        }
      }
    } else {
      bodyData = await req.json()
    }

    const {
      action,
      curriculumId,
      board = 'CBSE',
      classLevel = '',
      category = 'Science',
      chapterNumber = 1,
      chapterTitle = '',
      notesText = '',
      notesSourceFilename = '',
      strategy = 'synthesize_capsules',
      mode = 'preview',
      replaceExisting = false,
      curriculumsToCommit = null,
      rawSyllabusText = '',
    } = bodyData

    // Invariant 1: School students Class 6 to 12 only
    const validClasses = [
      'Class 6',
      'Class 7',
      'Class 8',
      'Class 9',
      'Class 10',
      'Class 11',
      'Class 12',
    ]
    if (classLevel && !validClasses.includes(classLevel.trim())) {
      return NextResponse.json(
        { error: 'Platform scope is strictly Classes 6 through 12. College and entrance curricula are excluded.' },
        { status: 400 }
      )
    }

    // -----------------------------------------------------------------------
    // WORKFLOW 2: Attach / Synthesize Chapter Notes
    // -----------------------------------------------------------------------
    if (action === 'attach_chapter_notes') {
      const activeNotes = notesText.trim()
      if (!activeNotes && !filePart) {
        return NextResponse.json(
          { error: 'Please provide chapter notes text or upload a notes file (.pdf, .md, .txt).' },
          { status: 400 }
        )
      }

      let targetChapterTitle = chapterTitle.trim()
      let targetOrderIndex = Number(chapterNumber) || 1
      let existingCurriculum: any = null

      if (curriculumId) {
        const { data: currRecord, error: currFetchErr } = await adminSupabase
          .from('curriculums')
          .select('*, syllabus_modules(*)')
          .eq('id', curriculumId)
          .single()

        if (currFetchErr || !currRecord) {
          return NextResponse.json({ error: 'Curriculum chapter not found.' }, { status: 404 })
        }
        existingCurriculum = currRecord
        targetChapterTitle = currRecord.title
        targetOrderIndex = currRecord.order_index
      }

      if (!targetChapterTitle) {
        return NextResponse.json({ error: 'Chapter title is required.' }, { status: 400 })
      }

      // Check token count & manage Gemini Explicit Context Cache if >= 32,768 tokens (works for uploaded PDFs and text notes)
      let geminiCacheName: string | null = null
      try {
        const cacheParts: any[] = []
        if (filePart) cacheParts.push(filePart)
        if (activeNotes) cacheParts.push({ text: activeNotes })

        if (cacheParts.length > 0) {
          const tokenResp = await ai.models.countTokens({
            model: 'gemini-3.8-flash',
            contents: [{ role: 'user', parts: cacheParts }],
          })
          const totalTokens = tokenResp?.totalTokens || 0

          if (totalTokens >= 32768) {
            const cache = await ai.caches.create({
              model: 'gemini-3.8-flash',
              config: {
                contents: [{ role: 'user', parts: cacheParts }],
                displayName: `cache_${targetChapterTitle.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}`,
                ttl: '7200s', // 2 hours
              },
            })
            geminiCacheName = cache.name || null
          }
        }
      } catch (cacheErr: any) {
        console.warn('[Ingest API] Token check / Context caching notice:', cacheErr?.message)
      }

      // Synthesize ultra-detailed, comprehensive topic capsules with NCERT-standard notes, worked numericals, and misconceptions
      const isMath = category?.toLowerCase().includes('math') || existingCurriculum?.category?.toLowerCase().includes('math')
      const isMathCategory = isMath
      const synthesisPrompt = `You are a Principal Academic Curriculum Architect and Master Teacher for ${board}.
Your task is to exhaustively analyze the provided Textbook Chapter document for "${targetChapterTitle}" (${classLevel}, ${category}) and decompose it into an EXHAUSTIVE, topper-ready series of 4 to 8 granular 15-minute teachable units called "Topic Capsules" (NEVER fewer than 4 capsules). Do NOT summarize or condense; provide zero-omission, authentic textbook depth for each capsule covering the entire chapter.

TARGET ACADEMIC SPECIFICATION:
- Educational Board: "${board}" (NCERT standard structure, zero calculators for Class 10/CBSE, 50% NEP 2020 competency questions)
- Target Class: "${classLevel || existingCurriculum?.class_level || 'Class 10'}" (Strictly school level 6-12)
- Subject / Discipline: "${category || existingCurriculum?.category || 'General'}"
- Chapter: "${targetChapterTitle}"
- TEXTBOOK FIDELITY INVARIANT: Wherever images, graphs, diagrams, and exact verbatim definitions appear in the book on a concept, capture them accurately so the AI tutor presents those exact illustrations, graphs, diagrams, and definitions on the whiteboard.
- ZERO OMISSION OF EXERCISES & EXAMPLES: You must catalog every exercise (Exercise 1.1, 1.2, 1.3...) and every single question, along with all worked examples from the book.
- DYNAMIC CAPSULE SCALING BY CHAPTER LENGTH & DEPTH:
  * Standard length chapter (~8 to 15 pages): Decompose into 4 to 5 granular capsules.
  * Medium-to-long chapter (~15 to 25 pages): Decompose into 6 to 7 granular capsules.
  * Deep, dense, or multi-topic chapter (25+ pages, e.g. Number System, Polynomials, Triangles, Electricity): Decompose into 7 to 8 granular capsules.
  * Strictly maintain between 4 and 8 capsules (never fewer than 4). Each capsule represents a complete, self-contained 15-minute teachable unit.

${isMathCategory ? `
MATHEMATICS SPECIALIZATION & GAUTH-LEVEL RIGOR:
1. EXHAUSTIVE EXERCISE EXTRACTION:
   - Identify every exercise in this chapter (e.g. Exercise 1.1, Exercise 1.2, Exercise 1.3, Exercise 1.4, Exercise 1.5, Exercise 1.6).
   - Enumerate all questions in "textbook_exercises" with question number (Q1, Q2...), full problem statement, question type, and step-by-step solving approach like Gauth.
2. ALL TEXTBOOK WORKED EXAMPLES:
   - Extract and solve all textbook examples (Example 1, Example 2, Example 3...) in "worked_examples":
     * Given, Formula / Identity applied, Substitution, Step-by-step line-by-line scratchpad calculation, Boxed final answer.
3. ALL BOOK DIAGRAMS & THEOREM CONSTRUCTIONS:
   - Generate production-ready SVG diagrams for:
     * Square root spiral (Theodorus) with origin O, unit base, perpendiculars, hypotenuses (√2, √3, √4, √5), right-angle markers, colored radical labels.
     * Number lines with interval subdivisions and magnified zoom callouts showing density of rational fractions.
     * Real numbers classification Euler/Venn diagram (N ⊂ W ⊂ Z ⊂ Q ⊂ R).
     * Geometric construction of √x using semi-circle of diameter (x+1) and perpendicular chord.
     * Coordinate plots and radical identities geometry.
   - In "concept_visuals", provide 2 to 4 DISTINCT visual diagrams per capsule with complete <svg viewBox="0 0 540 280" ...>...</svg> code!
4. RIGOROUS THEOREM PROOFS:
   - State theorems verbatim with Given, To Prove, Construction, and complete step-by-step contradiction proofs (e.g. proof of irrationality of √2 and √3).
` : ''}

${activeNotes && !geminiCacheName ? `CHAPTER NOTES TEXT:\n"""\n${activeNotes.substring(0, 100000)}\n"""` : 'Analyze the attached detailed chapter notes document thoroughly.'}

REQUIREMENTS FOR EACH TOPIC CAPSULE (4 to 8 capsules total):
1. "order_index": Sequential number (1, 2, 3...)
2. "title": Specific, descriptive topic capsule name
3. "description": 1 concise sentence describing the capsule learning objective.
4. "subtopics": Array of 4-6 specific examination subtopics tested in board exams.
5. "key_concepts": Array of 4-6 core laws, definitions, or formulas with standard mathematical/scientific notation and SI units.
6. "success_criteria": 1 clear measurable verification problem or proof question.
7. "chapter_notes": 1200-2000 words of thorough, structured NCERT-standard notes including definitions, verbatim laws, derivations, and step-by-step proofs.
8. "textbook_definitions": Array of exact textbook definitions with formal laws and SI units.
9. "textbook_examples": Array of 2 to 3 concrete illustrative real-life scenarios from the syllabus.
10. "textbook_exercises": Array of authentic exercises and practice questions from the book:
    [
      {
        "exercise_number": "Exercise 1.1",
        "questions": [
          {
            "q_num": "Q1",
            "question": "Full problem statement from the textbook",
            "question_type": "conceptual" | "numerical" | "proof" | "construction",
            "solution_method": "Step-by-step solving approach like Gauth / Photomath"
          }
        ]
      }
    ]
11. "worked_examples": Array of 2 to 4 fully solved textbook examples formatted as:
    [
      {
        "problem": "Authentic textbook example problem",
        "given": "Extracted given values with notation",
        "formula": "Governing mathematical identity or theorem",
        "substitution": "Exact values substituted",
        "calculation": "Line-by-line mathematical scratchpad calculation",
        "finalAnswer": "Final boxed solution",
        "unit": "Mathematical conclusion or SI unit"
      }
    ]
12. "chapter_flowchart": Multi-level hierarchical flowchart or branch tree ("Root -> Branch A | Branch B; Branch A -> Sub 1 | Sub 2").
13. "common_misconceptions": Array of 3-5 specific mistakes students frequently make in board exams.
14. "ai_system_prompt_context": Step-by-step Socratic teaching directives for the live tutor: when to draw diagrams, check questions, and explanation cues.
15. "visual_ideas": Comprehensive visual and image generation ideas.
16. "diagram_type": The exact type of diagram (vector_svg_diagram | mafs_graph | flowchart | circuit_schematic | ray_optics | anatomy_structure).
17. "what_to_make": Detailed blueprint of components, geometric shapes, axes, labels, and numerical values to draw.
18. "diagram_svg": Complete, production-ready, clean vector SVG markup (<svg viewBox="0 0 540 280" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" xmlns="http://www.w3.org/2000/svg">...</svg>) with contrasting stroke colors, dark background #13211B, and clear text labels.
19. "concept_visuals": Array of 2 to 4 UNIQUE, DISTINCT visual diagram blueprints—one crafted for key concepts. Each item MUST be:
    {
      "concept_title": "Exact title matching key_concepts[i]",
      "diagram_title": "Short descriptive title for chalkboard header",
      "diagram_type": "vector_svg_diagram" | "mafs_graph" | "flowchart" | "circuit_schematic" | "ray_optics" | "geometry_construction",
      "what_to_make": "Specific description of what to draw (axes, vectors, formula boxes, SI units)",
      "svg": "Complete, production-ready vector SVG (<svg viewBox=\"0 0 540 280\" ...>...</svg>) with dark background #13211B",
      "timing_and_cue": "Pedagogical directive: When to draw this visual and what check question to ask"
    }

OUTPUT FORMAT:
Respond with ONLY a valid JSON object matching this schema (do NOT include conversational prose outside JSON):
{
  "summary": "1-2 sentence chapter summary",
  "capsules": [
    {
      "order_index": 1,
      "title": "string",
      "description": "string",
      "subtopics": ["string"],
      "key_concepts": ["string"],
      "success_criteria": "string",
      "chapter_notes": "string",
      "textbook_definitions": [
        {
          "concept": "string",
          "definition": "string",
          "si_units": "string"
        }
      ],
      "textbook_examples": [
        {
          "title": "string",
          "scenario": "string"
        }
      ],
      "textbook_exercises": [
        {
          "exercise_number": "string",
          "questions": [
            {
              "q_num": "string",
              "question": "string",
              "question_type": "string",
              "solution_method": "string"
            }
          ]
        }
      ],
      "chapter_flowchart": "string (Root -> Branch A | Branch B)",
      "worked_examples": [
        {
          "problem": "string",
          "given": "string",
          "formula": "string",
          "substitution": "string",
          "calculation": "string",
          "finalAnswer": "string",
          "unit": "string"
        }
      ],
      "common_misconceptions": ["string"],
      "ai_system_prompt_context": "string",
      "visual_ideas": "string",
      "diagram_type": "string",
      "what_to_make": "string",
      "diagram_svg": "string (<svg viewBox='0 0 540 280' ...>...</svg>)",
      "concept_visuals": [
        {
          "concept_title": "string",
          "diagram_title": "string",
          "diagram_type": "string",
          "what_to_make": "string",
          "svg": "string (<svg viewBox='0 0 540 280' ...>...</svg>)",
          "timing_and_cue": "string"
        }
      ]
    }
  ]
}`

      const noteContents: any[] = []
      // When context caching is active on Gemini, the full chapter text is already loaded into cache
      if (!geminiCacheName && filePart) {
        noteContents.push(filePart)
      }
      noteContents.push(synthesisPrompt)

      const { text: rawResponseText } = await resilientGenerateContent(ai, {
        contents: noteContents,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          maxOutputTokens: 65536,
          ...(geminiCacheName ? { cachedContent: geminiCacheName } : {}),
        },
        label: 'Chapter Notes Synthesis',
      })

      const parsedData = resilientJsonParse<any>(rawResponseText, 'Chapter Notes Synthesis')
      const capsules: GeneratedModule[] = parsedData.capsules || []
      const chapterSummary = parsedData.summary || ''

      if (capsules.length === 0) {
        return NextResponse.json(
          { error: 'No teachable capsules could be synthesized from the provided chapter notes.' },
          { status: 422 }
        )
      }

      // Persist to database using admin client
      let targetCurrId = curriculumId

      if (targetCurrId) {
        // Update existing chapter metadata
        await adminSupabase
          .from('curriculums')
          .update({
            raw_chapter_notes: activeNotes || `[Document Ingested: ${notesSourceFilename || 'chapter_notes.pdf'}]`,
            notes_summary: chapterSummary,
            notes_source_filename: notesSourceFilename || 'chapter_notes.pdf',
            gemini_cache_name: geminiCacheName,
            notes_updated_at: new Date().toISOString(),
          })
          .eq('id', targetCurrId)

        if (strategy === 'synthesize_capsules') {
          // Delete old modules and insert newly synthesized capsules
          await adminSupabase.from('syllabus_modules').delete().eq('curriculum_id', targetCurrId)

          for (const cap of capsules) {
            const visualPlan = generateVisualLessonPlanForCapsule(
              {
                order_index: cap.order_index,
                title: cap.title,
                description: cap.description,
                subtopics: cap.subtopics,
                key_concepts: cap.key_concepts,
                worked_examples: cap.worked_examples,
                common_misconceptions: cap.common_misconceptions,
                board: existingCurriculum?.board || board,
                class_level: existingCurriculum?.class_level || classLevel,
                category: existingCurriculum?.category || category,
              },
              {
                textbookName: notesSourceFilename || `${board} Standard Textbook`,
              }
            )

            const { enhancedVisualPlan, diagramDirective } = buildEnhancedVisualPlanAndDirective(cap, visualPlan)

            await adminSupabase.from('syllabus_modules').insert({
              curriculum_id: targetCurrId,
              order_index: cap.order_index,
              title: cap.title,
              description: cap.description || '',
              board: existingCurriculum?.board || board,
              class_level: existingCurriculum?.class_level || classLevel,
              subtopics: cap.subtopics || [],
              key_concepts: cap.key_concepts || [],
              success_criteria: cap.success_criteria || '',
              chapter_notes: cap.chapter_notes || '',
              worked_examples: cap.worked_examples || [],
              common_misconceptions: cap.common_misconceptions || [],
              ai_system_prompt_context: `${cap.ai_system_prompt_context || ''}${diagramDirective}`,
              visual_lesson_plan: enhancedVisualPlan,
              estimated_minutes: 15,
            })
          }
        } else {
          // Strategy: map_existing
          const existingModules = existingCurriculum?.syllabus_modules || []
          for (let idx = 0; idx < existingModules.length; idx++) {
            const exMod = existingModules[idx]
            const matchingCap = capsules[idx] || capsules[0]
            const { enhancedVisualPlan, diagramDirective } = buildEnhancedVisualPlanAndDirective(
              matchingCap,
              exMod.visual_lesson_plan || {}
            )
            await adminSupabase
              .from('syllabus_modules')
              .update({
                chapter_notes: typeof matchingCap.chapter_notes === 'string' ? matchingCap.chapter_notes : JSON.stringify(matchingCap.chapter_notes || ''),
                worked_examples: toSafeJsonbArray(matchingCap.worked_examples),
                common_misconceptions: toSafeStringArray(matchingCap.common_misconceptions),
                ai_system_prompt_context: `${matchingCap.ai_system_prompt_context || exMod.ai_system_prompt_context || ''}${diagramDirective}`,
                visual_lesson_plan: enhancedVisualPlan,
              })
              .eq('id', exMod.id)
          }
        }
      } else {
        // Create new chapter from scratch with attached notes
        const { data: newCurr, error: newCurrErr } = await adminSupabase
          .from('curriculums')
          .insert({
            title: targetChapterTitle,
            board,
            category,
            description: chapterSummary,
            class_level: classLevel,
            difficulty_level: 'intermediate',
            estimated_duration_minutes: capsules.length * 15,
            is_published: true,
            order_index: targetOrderIndex,
            raw_chapter_notes: activeNotes || `[Document Ingested: ${notesSourceFilename || 'chapter_notes.pdf'}]`,
            notes_summary: chapterSummary,
            notes_source_filename: notesSourceFilename || 'chapter_notes.pdf',
            gemini_cache_name: geminiCacheName,
          })
          .select()
          .single()

        if (newCurrErr || !newCurr) {
          throw new Error(`Failed to create curriculum chapter: ${newCurrErr?.message}`)
        }

        targetCurrId = newCurr.id

        for (const cap of capsules) {
          const visualPlan = generateVisualLessonPlanForCapsule(
            {
              order_index: cap.order_index,
              title: cap.title,
              description: cap.description,
              subtopics: cap.subtopics,
              key_concepts: cap.key_concepts,
              worked_examples: cap.worked_examples,
              common_misconceptions: cap.common_misconceptions,
              board,
              class_level: classLevel,
              category,
            },
            {
              textbookName: notesSourceFilename || `${board} Standard Textbook`,
            }
          )

          const { enhancedVisualPlan, diagramDirective } = buildEnhancedVisualPlanAndDirective(cap, visualPlan)

          await adminSupabase.from('syllabus_modules').insert({
            curriculum_id: targetCurrId,
            order_index: cap.order_index,
            title: cap.title,
            description: cap.description || '',
            board,
            class_level: classLevel,
            subtopics: toSafeStringArray(cap.subtopics),
            key_concepts: toSafeStringArray(cap.key_concepts),
            success_criteria: typeof cap.success_criteria === 'string' ? cap.success_criteria : JSON.stringify(cap.success_criteria || ''),
            chapter_notes: typeof cap.chapter_notes === 'string' ? cap.chapter_notes : JSON.stringify(cap.chapter_notes || ''),
            worked_examples: toSafeJsonbArray(cap.worked_examples),
            common_misconceptions: toSafeStringArray(cap.common_misconceptions),
            ai_system_prompt_context: `${cap.ai_system_prompt_context || ''}${diagramDirective}`,
            visual_lesson_plan: enhancedVisualPlan,
            estimated_minutes: 15,
          })
        }
      }

      return NextResponse.json({
        success: true,
        action: 'attach_chapter_notes',
        curriculumId: targetCurrId,
        chapterTitle: targetChapterTitle,
        capsulesCount: capsules.length,
        notesSummary: chapterSummary,
        geminiCacheName,
        capsules,
      })
    }

    // -----------------------------------------------------------------------
    // WORKFLOW 1: Direct commit with pre-approved preview data
    // -----------------------------------------------------------------------
    if (mode === 'commit' && curriculumsToCommit && curriculumsToCommit.length > 0) {
      const commitResult = await commitCurriculumsToDatabase({
        adminSupabase,
        curriculumsList: curriculumsToCommit,
        board,
        classLevel,
        category,
        replaceExisting,
      })
      return NextResponse.json(commitResult)
    }

    // Check syllabus input presence
    if (!filePart && (!rawSyllabusText || rawSyllabusText.trim().length < 5)) {
      return NextResponse.json(
        {
          error:
            'Please provide either a syllabus PDF document or text outline of the syllabus chapters.',
        },
        { status: 400 }
      )
    }

    const boardDescription =
      board === 'IB'
        ? 'International Baccalaureate (IB DP / MYP) official syllabus and assessment objectives'
        : board === 'ICSE'
        ? 'Council for the Indian School Certificate Examinations (ICSE / ISC) official curriculum'
        : 'Central Board of Secondary Education (CBSE / NCERT) official syllabus and learning standards'

    const isMathCategory = category?.toLowerCase().includes('math')
    const prompt = `You are a Principal Curriculum Architect and Academic Subject Expert for ${board}.
Your task is to analyze the provided syllabus (document or text), identify the official curriculum chapters, and decompose EACH chapter into optimal, fully-detailed 15-minute teachable units called "Topic Capsules".

TARGET ACADEMIC CONTEXT:
- Educational Board: "${board}" (${boardDescription})
- Target Class / Level: "${classLevel}" (Strictly Class 6 through Class 12)
- Discipline / Subject: "${category}"

${
  rawSyllabusText
    ? `SYLLABUS OUTLINE / TOPIC TEXT:
"""
${rawSyllabusText}
"""`
    : `Analyze the attached syllabus document to extract all chapters and topic contents aligned with ${board} standards.`
}

REQUIREMENTS FOR ULTRA-DETAILED CURRICULUM DECOMPOSITION:
1. Decompose the syllabus into distinct, sequentially ordered Chapters conforming strictly to ${board} official textbooks.
   - Chapter order_index: (1, 2, 3...)
   - Chapter title: Official, complete chapter name (e.g., "Chapter 1: Number System", "Chapter 2: Polynomials")
   - Chapter difficulty_level: "beginner" | "intermediate" | "advanced"
2. For EACH Chapter, break it down comprehensively into 4 to 8 granular, ultra-detailed 15-minute teachable units called "Topic Capsules" (modules).
   - STRICT CAPSULE GRANULARITY: Never compress an entire chapter into 1 or 2 capsules! Each major law, theorem group, or syllabus unit MUST be its own dedicated capsule.
   - Standard chapter: 4 to 6 granular capsules.
   - Deep/Dense chapter: 6 to 8 granular capsules.

${isMathCategory ? `
SPECIAL MATHEMATICS PROTOCOL (CLASSES 6-12) - GAUTH-LEVEL RIGOR & ZERO OMISSION:
1. MANDATORY MATHEMATICS DECOMPOSITION:
   - For any Mathematics chapter (e.g. Number System, Polynomials, Coordinate Geometry, Triangles, Linear Equations, Real Numbers, Quadratic Equations, Trigonometry):
     You MUST generate between 4 and 7 granular, deep Topic Capsules (NEVER 1 or 2).
   - Example breakdown for Class 9 "Chapter 1: Number System":
     * Capsule 1: Natural, Whole, Integers, Rational Numbers & Decimal Expansions (Terminating vs Non-Terminating Recurring)
     * Capsule 2: Irrational Numbers, Density Property, and Contradiction Proofs of Irrationality (√2, √3)
     * Capsule 3: Real Numbers on the Number Line, Successive Magnification & Square Root Spiral Construction (Theodorus)
     * Capsule 4: Operations on Real Numbers, Radical Algebraic Identities & Rationalising the Denominator
     * Capsule 5: Laws of Exponents for Real Numbers (Negative & Fractional Indices, Exponential Simplification)
     * Capsule 6: Board Exam HOTS, Competency Numericals & Applied Problem Sets
2. MULTIPLE HIGH-QUALITY DIAGRAMS PER CAPSULE (MANDATORY):
   - Provide the primary capsule diagram in "diagram_svg", "what_to_make", and "visual_ideas".
   - PLUS in "concept_visuals", provide 2 to 4 DISTINCT visual diagrams tailored specifically to EACH key concept with production-ready vector SVG markup:
     * Square Root Spiral of Theodorus with origin O(0,0), unit steps, hypotenuses, right-angle markers, colored radical labels.
     * Horizontal number lines with interval subdivisions and zoom callouts showing density of rational fractions.
     * Real numbers classification Euler/Venn diagram (N ⊂ W ⊂ Z ⊂ Q ⊂ R).
     * Geometric representation of √x with diameter (x+1), perpendicular chord of length √x, and radius arc.
3. GAUTH-STYLE STEP-BY-STEP WORKED NUMERICALS:
   - For every capsule, provide 2 to 4 fully solved textbook/board problems in "worked_examples":
     * Given, Formula / Identity, Substitution, Complete line-by-line scratchpad calculation, Boxed final answer.
4. TEXTBOOK EXERCISE CATALOGING:
   - In "textbook_exercises", list the authentic exercises (e.g. Exercise 1.1, Exercise 1.2, Exercise 1.3) with question numbers (Q1, Q2, Q3...), problem text, and step-by-step solving methods.
` : ''}

3. For EACH Topic Capsule, provide exhaustive, topper-ready depth:
   - order_index: Sequential number within the chapter (1, 2, 3...)
   - title: Specific, precise topic name
   - description: 1-sentence learning objective of the capsule
   - subtopics: Array of 4-6 specific examination subtopics aligned with ${board} board exam question papers
   - key_concepts: Array of 4-6 core mathematical formulas, principles, definitions with SI units, or scientific laws
   - success_criteria: A verifiable test problem or numerical the student must solve to demonstrate board mastery
   - chapter_notes: Structured conceptual summary notes (150-300 words) covering key definitions, formulas, and essential properties
   - chapter_flowchart: Multi-level hierarchical flowchart or branch tree ("Root -> Branch A | Branch B; Branch A -> Sub 1 | Sub 2")
   - textbook_definitions: Array of verbatim textbook definitions with formal laws and SI units
   - textbook_examples: Array of concrete illustrative real-life examples from the syllabus
   - textbook_exercises: Array of authentic textbook exercises and question breakdowns with solving methods
   - worked_examples: Array of 2 to 4 fully solved textbook & board numerical exemplars (especially for Maths) with Given, Formula, Substitution, Line-by-line scratchpad calculations, and Boxed answer
   - ai_system_prompt_context: Concise pedagogical teaching context, whiteboard layout, and Socratic voice-teaching cues for the AI tutor (2-4 sentences).
   - visual_ideas: Focused visual description of the core concept.
   - diagram_type: The exact diagram type (vector_svg_diagram | mafs_graph | flowchart | circuit_schematic | ray_optics | anatomy_structure)
   - what_to_make: Detailed blueprint of components, geometric shapes, coordinate axes, labeled arrows, numerical values, and pedagogical highlights to draw.
   - diagram_svg: Complete, production-ready, clean vector SVG markup (<svg viewBox="0 0 540 280" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" xmlns="http://www.w3.org/2000/svg">...</svg>)
   - concept_visuals: Array of 2 to 3 distinct visual diagram blueprints for key concepts in the capsule with clean, valid vector SVG markup (<svg viewBox="0 0 540 280" ...>...</svg>)!

OUTPUT FORMAT:
Respond with ONLY a valid JSON object matching this schema (do NOT include conversational prose outside the JSON):
{
  "curriculums": [
    {
      "order_index": 1,
      "title": "string (Chapter title)",
      "board": "${board}",
      "category": "${category}",
      "description": "string",
      "difficulty_level": "beginner" | "intermediate" | "advanced",
      "modules": [
        {
          "order_index": 1,
          "title": "string",
          "description": "string",
          "subtopics": ["string"],
          "key_concepts": ["string"],
          "success_criteria": "string",
          "chapter_notes": "string",
          "chapter_flowchart": "string (Root -> Branch A | Branch B)",
          "textbook_definitions": [
            {
              "concept": "string",
              "definition": "string",
              "si_units": "string"
            }
          ],
          "textbook_examples": [
            {
              "title": "string",
              "scenario": "string"
            }
          ],
          "textbook_exercises": [
            {
              "exercise_number": "string (e.g. Exercise 1.1)",
              "questions": [
                {
                  "q_num": "string (e.g. Q1)",
                  "question": "string",
                  "question_type": "string (conceptual | numerical | proof | construction)",
                  "solution_method": "string (step-by-step solving approach like Gauth)"
                }
              ]
            }
          ],
          "worked_examples": [
            {
              "problem": "string",
              "given": "string",
              "formula": "string",
              "substitution": "string",
              "calculation": "string",
              "finalAnswer": "string",
              "unit": "string"
            }
          ],
          "ai_system_prompt_context": "string",
          "visual_ideas": "string (visual and image generation idea)",
          "diagram_type": "string (vector_svg_diagram | mafs_graph | flowchart | circuit_schematic | ray_optics | anatomy_structure)",
          "what_to_make": "string (detailed breakdown of what to make and draw in this diagram)",
          "diagram_svg": "string (<svg viewBox='0 0 540 280' ...>...</svg>)",
          "concept_visuals": [
            {
              "concept_title": "string",
              "diagram_title": "string",
              "diagram_type": "string",
              "what_to_make": "string",
              "diagram_svg": "string (<svg viewBox='0 0 540 280' ...>...</svg>)",
              "timing_and_cue": "string"
            }
          ]
        }
      ]
    }
  ]
}`

    const contents: any[] = []
    if (filePart) {
      contents.push(filePart)
    }
    contents.push(prompt)

    const { text: rawResponseText } = await resilientGenerateContent(ai, {
      contents,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 65536,
      },
      label: 'Syllabus Decomposition',
    })

    const parsedData = resilientJsonParse<any>(rawResponseText, 'Syllabus Decomposition')
    const curriculumsList: GeneratedCurriculum[] = parsedData.curriculums || []

    if (curriculumsList.length === 0) {
      return NextResponse.json(
        { error: 'No chapters could be identified from the provided syllabus.' },
        { status: 422 }
      )
    }

    // Preview mode
    if (mode === 'preview') {
      return NextResponse.json({
        success: true,
        mode: 'preview',
        board,
        classLevel,
        category,
        curriculumsCount: curriculumsList.length,
        totalCapsulesCount: curriculumsList.reduce(
          (acc, c) => acc + (c.modules?.length || 0),
          0
        ),
        curriculums: curriculumsList,
      })
    }

    // Direct commit mode
    const commitResult = await commitCurriculumsToDatabase({
      adminSupabase,
      curriculumsList,
      board,
      classLevel,
      category,
      replaceExisting,
    })

    return NextResponse.json(commitResult)
  } catch (err: any) {
    console.error('[Ingest API] Unhandled error:', err)
    return NextResponse.json(
      { error: err?.message || 'An error occurred while processing the syllabus.' },
      { status: 500 }
    )
  }
}

// ---------------------------------------------------------------------------
// Helper: Commit reviewed curriculums and capsules into Supabase via Admin Client
// ---------------------------------------------------------------------------
async function commitCurriculumsToDatabase({
  adminSupabase,
  curriculumsList,
  board,
  classLevel,
  category,
  replaceExisting,
}: {
  adminSupabase: any
  curriculumsList: GeneratedCurriculum[]
  board: EducationalBoard
  classLevel: string
  category: string
  replaceExisting: boolean
}) {
  if (replaceExisting) {
    const { data: existing } = await adminSupabase
      .from('curriculums')
      .select('id')
      .eq('board', board)
      .eq('class_level', classLevel)
      .eq('category', category)

    if (existing && existing.length > 0) {
      const existingIds = existing.map((e: any) => e.id)
      await adminSupabase.from('curriculums').delete().in('id', existingIds)
    }
  }

  let startOrderIndex = 1
  if (!replaceExisting) {
    const { data: maxOrderData } = await adminSupabase
      .from('curriculums')
      .select('order_index')
      .eq('board', board)
      .eq('class_level', classLevel)
      .eq('category', category)
      .order('order_index', { ascending: false })
      .limit(1)

    if (maxOrderData && maxOrderData.length > 0 && typeof maxOrderData[0].order_index === 'number') {
      startOrderIndex = maxOrderData[0].order_index + 1
    }
  }

  let insertedCurriculumsCount = 0
  let insertedModulesCount = 0
  const insertedChapterSummaries = []

  for (let i = 0; i < curriculumsList.length; i++) {
    const curr = curriculumsList[i]
    const chapterOrder = curr.order_index || startOrderIndex + i

    const { data: insertedCurr, error: currErr } = await adminSupabase
      .from('curriculums')
      .insert({
        title: curr.title,
        board: curr.board || board,
        category: curr.category || category,
        description: curr.description || '',
        class_level: classLevel,
        difficulty_level: curr.difficulty_level || 'intermediate',
        estimated_duration_minutes: (curr.modules?.length || 1) * 15,
        is_published: true,
        order_index: chapterOrder,
      })
      .select()
      .single()

    if (currErr || !insertedCurr) {
      console.error('[Ingest API] Error inserting curriculum:', currErr)
      continue
    }

    insertedCurriculumsCount++
    const moduleTitles: string[] = []

    for (let j = 0; j < (curr.modules || []).length; j++) {
      const mod = curr.modules[j]
      const modOrder = mod.order_index || j + 1

      const visualPlan = generateVisualLessonPlanForCapsule(
        {
          order_index: modOrder,
          title: mod.title,
          description: mod.description,
          subtopics: mod.subtopics,
          key_concepts: mod.key_concepts,
          worked_examples: mod.worked_examples,
          common_misconceptions: mod.common_misconceptions,
          board: curr.board || board,
          class_level: classLevel,
          category: curr.category || category,
        },
        {
          textbookName: `${board} Official Curriculum`,
        }
      )

      const { enhancedVisualPlan, diagramDirective } = buildEnhancedVisualPlanAndDirective(mod, visualPlan)

      const { error: modErr } = await adminSupabase.from('syllabus_modules').insert({
        curriculum_id: insertedCurr.id,
        order_index: modOrder,
        title: mod.title,
        description: mod.description || '',
        board: curr.board || board,
        class_level: classLevel,
        subtopics: toSafeStringArray(mod.subtopics),
        key_concepts: toSafeStringArray(mod.key_concepts),
        success_criteria: typeof mod.success_criteria === 'string' ? mod.success_criteria : JSON.stringify(mod.success_criteria || ''),
        chapter_notes: typeof mod.chapter_notes === 'string' ? mod.chapter_notes : JSON.stringify(mod.chapter_notes || ''),
        worked_examples: toSafeJsonbArray(mod.worked_examples),
        common_misconceptions: toSafeStringArray(mod.common_misconceptions),
        ai_system_prompt_context: `${mod.ai_system_prompt_context || ''}${diagramDirective}`,
        visual_lesson_plan: enhancedVisualPlan,
        estimated_minutes: 15,
      })

      if (!modErr) {
        insertedModulesCount++
        moduleTitles.push(mod.title)
      } else {
        console.error('[Ingest API] Error inserting syllabus module:', modErr)
      }
    }

    insertedChapterSummaries.push({
      id: insertedCurr.id,
      board: curr.board || board,
      order_index: chapterOrder,
      title: insertedCurr.title,
      capsules: moduleTitles,
    })
  }

  return {
    success: true,
    mode: 'commit',
    board,
    classLevel,
    category,
    insertedCurriculumsCount,
    insertedModulesCount,
    chapters: insertedChapterSummaries,
  }
}
