import { NextResponse } from 'next/server'
import { GoogleGenAI, Part } from '@google/genai'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { isRequestAuthorizedAdmin } from '@/lib/adminAuth'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'
import { resilientGenerateContent } from '@/lib/geminiResilientGenerate'
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
  textbook_definitions?: Array<{ concept: string; definition: string; si_units?: string }>
  textbook_examples?: Array<{ title: string; scenario: string }>
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
    const firstBrace = s.indexOf('{')
    const lastBrace = s.lastIndexOf('}')
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      s = s.substring(firstBrace, lastBrace + 1)
    }
  }
  return s
}

function buildEnhancedVisualPlanAndDirective(cap: any, visualPlan: any) {
  const enhancedVisualPlan = {
    ...visualPlan,
    diagram_idea: cap.visual_ideas || cap.diagram_idea || '',
    diagram_type: cap.diagram_type || 'vector_svg_diagram',
    what_to_make: cap.what_to_make || cap.diagram_description || '',
    diagram_svg: cap.diagram_svg || '',
    chapter_flowchart: cap.chapter_flowchart || '',
    textbook_definitions: cap.textbook_definitions || [],
    textbook_examples: cap.textbook_examples || [],
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

  const diagramDirective = `
TEXTBOOK GROUNDING & MANDATORY TEACHING DIRECTIVES:
- Textbook Diagram / Figure: ${cap.what_to_make || cap.visual_ideas || 'Scientific Vector Diagram'}
- Diagram Type: ${cap.diagram_type || 'vector_svg_diagram'}
- What to Draw: ${cap.what_to_make || ''}
${cap.chapter_flowchart ? `- Chapter Multi-Level Flowchart: ${cap.chapter_flowchart}\n- FLOWCHART DIRECTIVE: Call write_chalkboard(action="draw_flowchart", content="${cap.chapter_flowchart}") to visually organize the concepts on the board!\n` : ''}
${defsText ? `- Verbatim Textbook Definitions:\n${defsText}\n` : ''}
${examplesText ? `- Textbook Concrete Examples:\n${examplesText}\n` : ''}
- MANDATORY VISUAL TIMING: On Step 1 (Intuition) or Step 2 (Definition), you MUST immediately dispatch write_chalkboard(action="render_svg_diagram", title="${cap.title}", svg=..., caption="${cap.visual_ideas || ''}") or draw_flowchart! Do NOT wait for student to ask!
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
          bodyData.curriculumsToCommit = JSON.parse(rawPreviewData)
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
            model: 'gemini-2.5-flash',
            contents: [{ role: 'user', parts: cacheParts }],
          })
          const totalTokens = tokenResp?.totalTokens || 0

          if (totalTokens >= 32768) {
            const cache = await ai.caches.create({
              model: 'gemini-2.5-flash',
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
      const synthesisPrompt = `You are a Principal Academic Curriculum Architect and Master Teacher for ${board}.
Your task is to exhaustively analyze the provided Chapter Notes for "${targetChapterTitle}" (${classLevel}, ${category}) and decompose the chapter into an ULTRA-DETAILED, comprehensive series of 4 to 8 granular 15-minute teachable units called "Topic Capsules". Do NOT summarize or condense; provide exhaustive, topper-ready depth for each capsule covering the entire chapter syllabus.

TARGET ACADEMIC SPECIFICATION:
- Educational Board: "${board}" (NCERT standard structure, zero calculators for Class 10/CBSE, 50% NEP 2020 competency questions)
- Target Class: "${classLevel || existingCurriculum?.class_level || 'Class 10'}" (Strictly school level 6-12)
- Subject: "${category || existingCurriculum?.category || 'General'}"
- Chapter: "${targetChapterTitle}"
- TEXTBOOK FIDELITY INVARIANT: Wherever images, graphs, diagrams, and exact verbatim definitions appear in the book on a concept, capture them accurately so the AI tutor presents those exact illustrations, graphs, diagrams, and definitions on the whiteboard.
- TOKEN EFFICIENCY: Maintain maximum conceptual density. Output structured, high-impact definitions, proofs, and numericals without fluff or repetitive prose to keep token usage minimal without losing 0.1% of intelligence.
- DYNAMIC PEDAGOGICAL PROGRESSION: Progression must adapt organically to the specific chapter. Introduce core concepts, intuitions, and formal laws where required, and seamlessly integrate step-by-step problem-solving, derivations, and board-exam questions as appropriate for each capsule's unique topics.
- DYNAMIC CAPSULE SCALING BY CHAPTER LENGTH & DEPTH:
  * Standard length chapter (~8 to 15 pages or 2,500 to 5,000 words): Decompose into 4 to 5 granular capsules.
  * Medium-to-long chapter (~15 to 25 pages or 5,000 to 10,000 words): Decompose into 6 to 7 granular capsules.
  * Deep, dense, or multi-topic chapter (25+ pages or 10,000+ words, e.g. Organic Chemistry, Electricity, Cell Biology): Decompose into 8 granular capsules.
  * Strictly maintain between 4 and 8 capsules (never fewer than 4, never more than 8). Each capsule represents a complete, self-contained 15-minute teachable unit.
${activeNotes && !geminiCacheName ? `CHAPTER NOTES TEXT:\n"""\n${activeNotes.substring(0, 100000)}\n"""` : 'Analyze the attached detailed chapter notes document thoroughly.'}

REQUIREMENTS FOR ULTRA-DETAILED TOPIC CAPSULES (4 to 8 capsules total, covering all concepts thoroughly):
1. "order_index": Sequential number (1, 2, 3...)
2. "title": Specific, descriptive topic capsule name (e.g. "Fundamental Theorem of Arithmetic & Prime Factorization", "Proving Irrationality of √2 and √3 via Contradiction")
3. "description": 1 concise sentence describing the capsule learning objective.
4. "subtopics": Array of 4-6 specific examination subtopics tested in board exams.
5. "key_concepts": Array of 4-6 core laws, definitions, or formulas with standard mathematical/scientific notation and SI units.
6. "success_criteria": 1 clear measurable verification problem or proof question.
7. "chapter_notes": 1200-2000 words of thorough, structured NCERT-standard notes including:
   - Precise scientific definitions and verbatim laws with SI units
   - Complete step-by-step mathematical derivations or proofs with all algebraic transitions
   - Key caveats, real-life intuitive analogies, and physical intuition
8. "textbook_definitions": Array of exact textbook definitions with formal laws, SI units, and key clauses:
   [
     {
       "concept": "Name of concept",
       "definition": "Verbatim textbook definition/law",
       "si_units": "SI unit or formula dimension"
     }
   ]
9. "textbook_examples": Array of 2 to 3 concrete real-life examples and illustrations straight from the textbook syllabus:
   [
     {
       "title": "Example name",
       "scenario": "Concrete physical or mathematical scenario described in the textbook"
     }
   ]
10. "chapter_flowchart": Multi-level hierarchical flowchart or branch tree representing the concept and its place in the chapter. Format with branch syntax:
    "Root Concept -> Branch A | Branch B; Branch A -> Subtopic 1 | Subtopic 2" (or "cycle: Step 1 -> Step 2 -> Step 3" for cycles).
11. "worked_examples": Array of 2 to 4 fully solved textbook & board numerical exemplars (especially for Maths/Physics/Chemistry) formatted as:
   [
     {
       "problem": "Authentic textbook exercise or board exam numerical problem",
       "given": "Extracted given values with SI units",
       "formula": "Governing scientific formula or theorem",
       "substitution": "Exact values substituted into the formula",
       "calculation": "Step-by-step mathematical calculation steps (for scratchpad/rough work)",
       "finalAnswer": "Final boxed solution",
       "unit": "SI unit or mathematical conclusion"
     }
   ]
12. "common_misconceptions": Array of 3-5 specific mistakes students frequently make in board exams on this topic.
13. "ai_system_prompt_context": Step-by-step Socratic teaching directives for the live tutor:
    - Exactly when to draw the diagram on the board: "Call render_svg_diagram during Step 1/Step 2."
    - Exact check question to ask the student.
    - Deep explanation cues: Why each formula/step works, underlying physical mechanisms, and mathematical proofs.
14. "visual_ideas": Comprehensive visual and image generation ideas explaining what visual schematics, apparatus setups, or interactive diagrams best reinforce this specific capsule.
15. "diagram_type": The exact type of diagram to render on the chalkboard (e.g. "vector_svg_diagram", "mafs_kinematics_graph", "flowchart", "circuit_schematic", "ray_optics", "chemical_apparatus", "anatomical_structure").
16. "what_to_make": Detailed blueprint of "what to make in this" diagram: list the exact textbook figure number, components, geometric shapes, coordinate axes, labeled arrows, numerical values, and pedagogical highlights to draw.
17. "diagram_svg": Complete, production-ready, clean vector SVG markup (<svg viewBox="0 0 540 280" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" xmlns="http://www.w3.org/2000/svg">...</svg>) with contrasting stroke colors, dark background compatibility, and clear text labels.

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
      "chapter_flowchart": "string (Root -> Branch A | Branch B; Branch A -> Sub 1 | Sub 2)",
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
      "visual_ideas": "string (visual and image generation idea)",
      "diagram_type": "string (vector_svg_diagram | mafs_graph | flowchart | circuit_schematic | ray_optics | anatomy_structure)",
      "what_to_make": "string (detailed breakdown of what to make and draw in this diagram)",
      "diagram_svg": "string (<svg viewBox='0 0 540 280' ...>...</svg>)"
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
          ...(geminiCacheName ? { cachedContent: geminiCacheName } : {}),
        },
        label: 'Chapter Notes Synthesis',
      })

      const cleanedJson = cleanJsonString(rawResponseText)
      const parsedData = JSON.parse(cleanedJson)
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
                chapter_notes: matchingCap.chapter_notes || '',
                worked_examples: matchingCap.worked_examples || [],
                common_misconceptions: matchingCap.common_misconceptions || [],
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

    const prompt = `You are a Principal Curriculum Architect and Academic Subject Expert.
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
   - Chapter title: Official, complete chapter name (e.g., "Chapter 1: Chemical Reactions and Equations", "Chapter 2: Acids, Bases and Salts")
   - Chapter difficulty_level: "beginner" | "intermediate" | "advanced"
2. For EACH Chapter, break it down comprehensively into 4 to 8 granular, ultra-detailed 15-minute teachable units called "Topic Capsules" (modules). Do NOT compress multiple major concepts into a single capsule; give each core law, proof, and concept its own dedicated capsule.
   - TEXTBOOK FIDELITY: Where images, graphs, diagrams, and exact definitions appear in the book on a concept, capture them so the AI tutor can present them to the class.
   - TOKEN EFFICIENCY: Maintain maximal information density and intelligent conciseness without repetitive fluff.
   - DYNAMIC PROGRESSION: Structure each capsule to balance foundational concept formulation with authentic exam questions and problems as appropriate for that specific chapter's depth and subject.
3. For EACH Topic Capsule, provide exhaustive, topper-ready depth:
   - order_index: Sequential number within the chapter (1, 2, 3...)
   - title: Specific, precise topic name (e.g. "Balancing Chemical Equations & Law of Conservation of Mass", "Types of Chemical Reactions: Combination & Decomposition")
   - description: 1-sentence learning objective of the capsule
   - subtopics: Array of 4-6 specific examination subtopics aligned with ${board} board exam question papers
   - key_concepts: Array of 4-6 core mathematical formulas, principles, definitions with SI units, or scientific laws
   - success_criteria: A verifiable test problem or numerical the student must solve to demonstrate board mastery
   - chapter_notes: Structured, comprehensive notes (800-1400 words) with definitions, formulas, and step-by-step proofs
   - chapter_flowchart: Multi-level hierarchical flowchart or branch tree representing the concept and chapter hierarchy ("Root -> Branch A | Branch B; Branch A -> Sub 1 | Sub 2")
   - textbook_definitions: Array of verbatim textbook definitions with formal laws and SI units
   - textbook_examples: Array of concrete illustrative real-life examples from the syllabus
   - worked_examples: Array of 2 to 4 fully solved textbook & board numerical exemplars (especially for Maths) with Given, Formula, Substitution, Scratchpad calculations, and Boxed answer
   - ai_system_prompt_context: Detailed pedagogical context, everyday physical analogies, step-by-step whiteboard layout, common student pitfalls, and Socratic voice-teaching cues for the AI tutor.
   - visual_ideas: Comprehensive visual and image generation ideas explaining what visual schematics, apparatus setups, or interactive diagrams best reinforce this capsule.
   - diagram_type: The exact diagram type (vector_svg_diagram | mafs_graph | flowchart | circuit_schematic | ray_optics | anatomy_structure)
   - what_to_make: Detailed blueprint of "what to make in this" diagram: list the exact components, geometric shapes, coordinate axes, labeled arrows, numerical values, and pedagogical highlights to draw.
   - diagram_svg: Complete, production-ready, clean vector SVG markup (<svg viewBox="0 0 540 280" shape-rendering="geometricPrecision" text-rendering="geometricPrecision" xmlns="http://www.w3.org/2000/svg">...</svg>)

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
          "diagram_svg": "string (<svg viewBox='0 0 540 280' ...>...</svg>)"
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
      },
      label: 'Syllabus Decomposition',
    })

    const cleanedJson = cleanJsonString(rawResponseText)
    const parsedData = JSON.parse(cleanedJson)
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
        subtopics: mod.subtopics || [],
        key_concepts: mod.key_concepts || [],
        success_criteria: mod.success_criteria || '',
        chapter_notes: mod.chapter_notes || '',
        worked_examples: mod.worked_examples || [],
        common_misconceptions: mod.common_misconceptions || [],
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
