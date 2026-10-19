# Phase 1 Architecture, Retrospective & Handover Specification

> **Status**: Completed (Phase 1 Final Sign-off)  
> **Target Audience**: Autonomous AI Agents, Lead Engineers, and System Architects continuing into Phase 2.  
> **Platform**: AI Spoken Tutor Platform (Next.js 15, React 19, TypeScript, Supabase, Google Gemini Live 3.8 / 2.5 Flash, Excalidraw, Three.js).

---

## Executive Summary

Phase 1 established the foundation for an authentic, Socratic, spoken AI Tutor for secondary school students in **Classes 6 to 12** across **CBSE, ICSE, and IB** boards. The platform is inspired by Gauth's visual teaching paradigm: real-time spoken teaching synchronized with a live whiteboard and an interactive 3D WebGL simulation stage, backed by an adaptive student dashboard and textbook-aligned curriculum decomposition.

---

## 1. Architectural Invariants (Non-Negotiable)

Any agent working on this codebase must strictly uphold these six core invariants:

1. **Target Audience Scope (Classes 6–12 Only)**
   - Exclusively secondary school students in Classes 6 to 12 under CBSE, ICSE, and IB boards.
   - Never introduce competitive entrance exams (JEE, NEET, CUET) or undergraduate college material unless explicitly instructed by the user.
2. **Socratic Exam-Topper Teaching Cadence**
   - **Never lecture continuously**: The tutor must never speak more than 2–3 sentences without engaging the student or checking understanding.
   - **Strict 6-Stage Cadence**:
     1. *Real-Life Intuition*: Everyday physical hook/analogy (no meta-labels like "for example").
     2. *Concept Formulation*: Precise scientific law, definition, and SI units.
     3. *Concrete Illustration*: Addresses common pitfalls.
     4. *Board Numerical*: Layout on whiteboard (Given $\to$ Formula $\to$ Substitution $\to$ Calculation $\to$ Boxed Answer with Units).
     5. *Check for Understanding*: Checkpoint question ending with a question mark (`?`).
     6. *Board-Exam Numerical*: Authentic board-exam question matching student's syllabus.
   - **Stopping Condition**: Every spoken turn MUST end with a clear checkpoint question for the student. The question mark (`?`) is the ONLY point where the AI stops speaking.
3. **Whiteboard is Single Source of Truth for Notes**
   - No separate post-class LLM optimization endpoint (`/api/class/optimize-notes` is purged).
   - The tutor writes notes directly onto the live whiteboard during class via inline directives.
   - These live whiteboard notes are saved directly to `public.user_progress.chapter_notes` as the student's Master Notes.
4. **Pinned Identity Context Guard**
   - In Gemini Live WebSockets, the student's dossier (Name, Class, Board, Pacing, Weak Areas) is permanently pinned in `systemInstruction`.
   - Context compression must NEVER evict or dilute student identity or curriculum metadata.
5. **Zero API Key Leakage Invariant**
   - Master `GEMINI_API_KEY` is NEVER exposed to the client browser in HTML, headers, or JSON responses.
   - All client connections use single-use Google Ephemeral Auth Tokens minted server-side via `/api/session` (`ai.authTokens.create`) with 30-minute lifetimes and 60-second connection windows.
6. **Strictly Zero Emojis**
   - Total ban on emojis across all UI components, toasts, logs, prompts, notes, and code comments. Use Lucide icons or Google Material Symbols only.

---

## 2. Directory Structure & Key Entry Points

```
e:/AI_tutor/
├── .agents/                          # Agent specifications and behavioral rules
├── public/                           # Static assets, fonts, illustrations
├── src/
│   ├── app/
│   │   ├── admin/                    # Admin Panel for Curriculum & Notes Ingestion
│   │   │   └── page.tsx
│   │   ├── api/
│   │   │   ├── admin/auth/           # HMAC-SHA256 authenticated admin sessions
│   │   │   ├── class/quiz/           # 10-MCQ post-capsule evaluation
│   │   │   ├── curriculum/ingest/    # Multimodal syllabus & notes ingestion pipeline
│   │   │   └── session/              # Ephemeral token minting for Gemini Live
│   │   ├── dashboard/
│   │   │   ├── [id]/
│   │   │   │   ├── class/
│   │   │   │   │   └── [moduleId]/   # Interactive Spoken Classroom & Whiteboard
│   │   │   │   │       └── page.tsx
│   │   │   │   └── page.tsx          # Student Dashboard Server Component
│   │   │   └── actions.ts            # Dashboard Server Actions (Study Plan, etc.)
│   │   ├── login/                    # Styled Authentication Page
│   │   │   └── page.tsx
│   │   ├── globals.css               # Design tokens, fonts, Excalidraw UI overrides
│   │   └── layout.tsx                # App root layout
│   ├── components/
│   │   ├── classroom/
│   │   │   └── ClassroomAvatar.tsx   # Companion Avatar with emotion states
│   │   ├── dashboard/
│   │   │   ├── StitchDashboardView.tsx      # Gauth-inspired main dashboard view
│   │   │   ├── StudyPlannerCard.tsx         # Adaptive exam deadline & pacing planner
│   │   │   ├── WeakConceptsReviewCard.tsx   # Targeted diagnostic & weak-area drill
│   │   │   └── CurriculumRoadmap.tsx        # Visual course progression roadmap
│   │   ├── ui/                       # Radix UI + Tailwind design components
│   │   └── whiteboard/
│   │       ├── GreenChalkboard.tsx   # Excalidraw AI Whiteboard (Botanical theme)
│   │       ├── WhiteboardWorkspace.tsx      # Dual Stage (Whiteboard + 3D Simulation)
│   │       ├── VisualizationViewport.tsx    # Native Three.js WebGL viewport
│   │       └── scenes/               # 10 Modular Interactive Three.js Scenes
│   │           ├── BohrAtomScene.ts
│   │           ├── CircuitsInteractiveScene.ts
│   │           ├── CoordinateGeometryScene.ts
│   │           ├── CrossSectionScene.ts
│   │           ├── Geometry3DScene.ts
│   │           ├── LinearGraphScene.ts
│   │           ├── OpticsRefractionScene.ts
│   │           ├── PhysicsForcesScene.ts
│   │           ├── StatesOfMatterScene.ts
│   │           ├── WaveHarmonicsScene.ts
│   │           └── sceneRegistry.ts
│   ├── lib/
│   │   ├── rateLimit.ts              # Sliding-window in-memory rate limiter
│   │   └── visualEventQueue.ts       # Non-blocking event bus for media & 3D
│   ├── services/
│   │   ├── audioStreamer.ts          # PCM audio capture & playback streaming
│   │   ├── geminiWebSocket.ts        # Gemini Live bidirectional WebSocket client
│   │   └── visualLessonPlanGenerator.ts # Structured visual lesson manifest synthesis
│   ├── types/
│   │   └── lessonManifest.ts         # Zod schemas & types for lesson steps
│   └── utils/
│       └── supabase/
│           ├── admin.ts              # Service Role Admin Supabase client
│           ├── client.ts             # Browser-side Supabase client
│           └── server.ts             # Next.js Server Component Supabase client
└── supabase/
    └── migrations/                   # PostgreSQL schema migrations
```

---

## 3. Database Schema Overview

The database is hosted on Supabase PostgreSQL. Key tables and roles:

### `public.profiles`
- `id` (UUID, PK, references `auth.users.id`)
- `full_name` (TEXT)
- `class_level` (TEXT, e.g. `'Class 10'`)
- `target_board` (TEXT, `'CBSE' | 'ICSE' | 'IB'`)
- `current_streak` (INTEGER)
- `total_classes_taken` (INTEGER)
- `total_learning_minutes` (INTEGER)
- `last_active_date` (DATE)
- `preferred_teacher_voice` (TEXT, default `'Aoede'`)

### `public.curriculums`
- `id` (UUID, PK)
- `title` (TEXT, e.g. `'Chapter 2: Cell: The Building Block of Life'`)
- `category` (TEXT, e.g. `'Science'`, `'Mathematics'`)
- `class_level` (TEXT)
- `board` (TEXT)
- `order_index` (INTEGER)
- `is_published` (BOOLEAN)
- `raw_chapter_notes` (TEXT)
- `notes_summary` (TEXT)
- `gemini_cache_name` (TEXT): Google Context Cache ID when uploaded notes exceed 32,768 tokens.

### `public.syllabus_modules` (15-Minute Deliberate Capsules)
- `id` (UUID, PK)
- `curriculum_id` (UUID, references `curriculums.id`)
- `title` (TEXT, e.g. `'Discovery and Structural Features of Cells'`)
- `description` (TEXT)
- `order_index` (INTEGER)
- `estimated_minutes` (INTEGER, default 15)
- `key_concepts` (TEXT[] / JSONB)
- `worked_examples` (JSONB): Array of `{ problem, given, formula, substitution, calculation, finalAnswer, unit }`
- `common_misconceptions` (TEXT[])
- `visual_lesson_plan` (JSONB): Structured `VisualLessonManifest`
- `chapter_notes` (TEXT)

### `public.user_progress`
- `id` (UUID, PK)
- `user_id` (UUID, references `auth.users.id`)
- `syllabus_module_id` (UUID, references `syllabus_modules.id`)
- `status` (TEXT: `'not_started' | 'in_progress' | 'completed' | 'needs_review'`)
- `started_at` (TIMESTAMPTZ)
- `completed_at` (TIMESTAMPTZ)
- `current_concept_index` (INTEGER)
- `completed_concepts` (TEXT[])
- `last_covered_concept` (TEXT)
- `chapter_notes` (TEXT): Live whiteboard notes snapshot
- `score` (INTEGER): Diagnostic quiz score (0–100)
- `visual_progress` (JSONB): Visual step index and timestamps

### `public.student_study_plans`
- `id` (UUID, PK)
- `user_id` (UUID, references `auth.users.id`)
- `target_exam_date` (DATE)
- `daily_study_minutes` (INTEGER, default 45)
- `target_curriculum_ids` (UUID[])
- `plan_metadata` (JSONB)
- `is_active` (BOOLEAN)

---

## 4. Subsystems & Features Built in Phase 1

### 4.1 Whiteboard Transformation & AI Writing Engine
- **White Board Botanical Palette**: Replaced dark chalkboard with pure `#FFFFFF` canvas and Botanical ink tokens (`#171817` ink primary, `#52715D` botanical sage, `#C85A43` coral highlights, `#555852` secondary ink, `#E5E3DB` dividers).
- **Chrome Suppression**: All Excalidraw default menus, library buttons, 3-dots, and hamburger icons are suppressed via CSS in `src/app/globals.css`.
- **Zoom Lock**: Programmatically locked at $0.7$ (`70%`) with wheel and pinch-gesture prevention.
- **Multi-Page Whiteboard**: Automatically paginates (`addNewPage`) when vertical drawing space exceeds $Y > 780\text{px}$. Includes page pill switcher.
- **Direct Board Media**: Diagrams, function graphs, textbook images, and video demonstration cards are drawn directly onto the whiteboard canvas.

### 4.2 Interactive 3D WebGL Simulation Viewport (Three.js)
- Native Three.js WebGL viewport (`src/components/whiteboard/VisualizationViewport.tsx`) supporting React 19.
- 10 interactive scenes with interactive HUD parameter controls and live physics equations:
  1. `geometry`: 3D solids with dimension modifiers.
  2. `cross_section`: Real-time geometric slicing plane.
  3. `linear_graph`: Coordinate plane plotting $y = mx + c$.
  4. `forces`: Inclined plane free-body diagram with real-time vector resolution.
  5. `optics`: Snell's law refraction and total internal reflection ray tracing.
  6. `circuits`: Series and parallel circuits with moving electron particle currents.
  7. `bohr_atom`: Element electron shell configurations (H, He, C, O, Na).
  8. `matter`: Molecular kinetic theory with phase changes based on temperature.
  9. `waves`: Transverse and longitudinal harmonic wave propagation.
  10. `3d_vectors`: 3D coordinate geometry with midpoint and distance vectors.

### 4.3 Gauth-Inspired Dashboard Experience
- **Hero Card**: Surfaces active chapter capsule, progress percentage, time remaining, and primary "Resume / Start Capsule" action.
- **Adaptive Study Planner**: Calculates remaining days to board exam, divides remaining capsules against daily study budgets, and flags pacing deficits with recommended adjustments.
- **Weak Concepts Review**: Surfaces capsules needing review based on quiz performance and spaced repetition.
- **Full Syllabus Drawer**: Filter chapters by subject/class, showing completed checkmarks, capsule breakdowns, and formulas.

### 4.4 Real-Time Gemini Live Audio & Tool Protocol
- Bidirectional WebSockets connecting to `gemini-3.8-live` using ephemeral tokens.
- Non-blocking visual event queue (`VisualEventQueue`) dispatching media and 3D scenes without stalling audio playback.
- Inline directive parser supporting:
  - `[BOARD_TITLE: <text>]`
  - `[BOARD_NOTE: <text>]`
  - `[BOARD_STEP: <text>]`
  - `[HIGHLIGHT_BOX: <text>]`
  - `[ROUGH_WORK: <text>]` / `[CLEAR_ROUGH]`
  - `[DRAW_GRAPH: <type>]`
  - `[DRAW_IMAGE: <title> | <caption>]`
  - `[DRAW_VIDEO: <title> | <description>]`
  - `[NEW_PAGE]`
  - `[DIAGRAM: <type>]`
  - `[SCENE: <type> | <params>]` / `[CLOSE_SCENE]`
  - `[CONCEPT_FOCUS: <name>]`
  - `[CONCEPT_DONE: <name>]`
  - `[BOARD_QUESTION: <text>]`
  - `[CONFIRM_END_CHAPTER: <text>]`
  - `[START_QUIZ]`

---

## 5. Comprehensive Bug Log & Resolution History

Below is the definitive catalog of all bugs identified and resolved during Phase 1:

### Bug 1: Infinite Writing Loop & Repeating Module Title
- **Symptom**: The whiteboard was infinitely rewriting `(Discovery and Structural Features of Cells)` and repeating the title in loops.
- **Root Cause**:
  1. Title strings in database contained dirty formatting (parentheses, brackets, or "Focus:" prefixes).
  2. Streaming audio chunks from Gemini Live arrived in rapid succession; regex matched partial directive fragments across multiple events without checking deduplication against current module title and history.
- **Fix**:
  - Implemented `normalizeTitle` in `GreenChalkboard.tsx` that aggressively strips brackets, parentheses, punctuation, and prefix keywords (`focus:`, `concept:`).
  - Deduplicated against `moduleTitle` and `executedTagsRef` set keyed by `transcriptId + tag` so each directive executes exactly once per streaming turn.
  - Implemented `parseKeyConcepts` in `page.tsx` to sanitize concept arrays.

### Bug 2: Tutor Halting After One Sentence or Asking "Where to Start?"
- **Symptom**: Tutor greeted the student and stopped after a single sentence, or asked "What would you like to learn today?" / "Where should we start?".
- **Root Cause**:
  1. Contradictory instructions in legacy prompts allowed open-ended questioning.
  2. The prompt lacked an explicit stopping invariant, causing the model to pause after short declarative statements.
- **Fix**:
  - Pinned strict authority instructions in `lessonPrompt`: tutor already knows student identity, class, and curriculum; never asks where to start.
  - Enforced the rule that every spoken turn must conclude with an engaging checkpoint question ending with a question mark (`?`). The question mark is the ONLY valid stopping point.
  - Required 2–4 sentences of intuitive real-world explanation before writing on the whiteboard.

### Bug 3: Gemini Live 1011 "Internal Error Encountered" on Interruption
- **Symptom**: WebSocket abruptly closed with code 1011 when the student interrupted the AI or unmuted.
- **Root Cause**: Dropped audio frames or mismatched PCM sample rate buffers during voice activity detection barge-in.
- **Fix**: Refactored `AudioStreamer` to manage smooth mute transitions and keep PCM audio buffers properly aligned without frame drops.

### Bug 4: Module Completed Status Demoted to `in_progress` on Refresh
- **Symptom**: After completing Module 1, refreshing the page caused the tutor to restart Concept #1 from scratch; returning to the dashboard showed Module 1 as pending instead of Module 2.
- **Root Cause**:
  1. `handleConceptFocus` in `page.tsx` had a hardcoded `status: 'in_progress'` in its upsert call, overwriting `status = 'completed'` in Supabase whenever Gemini spoke about a concept.
  2. `loadModuleContext` did not select `completed_at`, so `isCompletedBefore` remained `false` on refresh.
  3. `lessonPrompt` opening turn unconditionally commanded the tutor to teach Concept #1.
  4. Next.js App Router client-side router cache reused stale dashboard state on `router.push()`.
- **Fix**:
  - Protected status across all autosave hooks: `status: isCompletedBefore || moduleCompletedSuccess ? 'completed' : 'in_progress'`.
  - Added `completed_at` to `loadModuleContext` select query and set both `isCompletedBefore = true` and `moduleCompletedSuccess = true`.
  - Pinned opening turn in `lessonPrompt`: launches Review Mode if completed, resumes at current concept if resumed, starts Concept #1 only if new.
  - Added `router.refresh()` to `handleBackToDashboard` and capsule completion buttons.
  - Implemented `isModuleComplete` and `isModuleInProgress` helpers in `StitchDashboardView` and `page.tsx`.

### Bug 5: Zod Schema Validation Failure (`draw_diagram` Invalid Enum)
- **Symptom**: Console crashed with `ZodError: Expected 'draw_title' | ... received 'draw_diagram'` at `validateLessonManifest`.
- **Root Cause**: `src/types/lessonManifest.ts` had `'draw_diagram'`, `'draw_graph'`, `'draw_image'`, `'draw_video'` in TypeScript interfaces, but omitted them from the Zod schema enum `LessonStepSchema.boardDirective.action`.
- **Fix**: Added `'draw_graph'`, `'draw_image'`, `'draw_video'`, and `'draw_diagram'` to `LessonStepSchema.boardDirective.action` in `src/types/lessonManifest.ts`.

### Bug 6: React Warning: "Can't call setState on a component that is not yet mounted"
- **Symptom**: React warning thrown at `GreenChalkboard.tsx` inside `enforceLockedZoom`.
- **Root Cause**: Excalidraw's `excalidrawAPI` ref callback executed `api.updateScene` synchronously before Excalidraw finished its initial mount cycle.
- **Fix**: Wrapped `api.updateScene` in a `setTimeout(..., 50)` window inside `enforceLockedZoom` so that Excalidraw is completely mounted before adjusting the zoom state.

### Bug 7: Login Page Missing Styling & Broken Icon Glyphs
- **Symptom**: `/login` displayed unstyled text with raw font glyph strings (`visibility`, `lock`).
- **Root Cause**: Missing font stylesheet dependency and unbundled icon names.
- **Fix**: Refactored `/login` with clean, self-contained Tailwind classes, Lucide React SVG icons (`Sparkles`, `Lock`, `Mail`), and crisp SVG background linework.

### Bug 8: Dashboard Not Advancing to Next Chapter When All Modules Done
- **Symptom**: When all modules of Chapter 1 were completed, the dashboard looped on Chapter 1 in "Review" mode instead of advancing to Chapter 2.
- **Root Cause**: `activeCourse` in `StitchDashboardView.tsx` only inspected `enrolledCurriculums`, ignoring the rest of the syllabus (`allCurriculums`).
- **Fix**: Added fallback in `activeCourse` to scan `allCurriculums` for the next sequential chapter with uncompleted capsules and auto-enroll the student.

---

## 6. Verification & Health Checklist

Before starting any Phase 2 work, verify that:
- [x] `npx tsc --noEmit` passes with **0 errors**.
- [x] Next.js dev server starts cleanly (`npm run dev`) and serves `/login`, `/dashboard/[id]`, and `/dashboard/[id]/class/[moduleId]`.
- [x] Zero emojis exist in user-facing UI, alerts, logs, prompts, or notes.
- [x] Master `GEMINI_API_KEY` is not present in client bundles or public endpoints.
- [x] Supabase RLS policies are active on all tables.

---

## 7. Handover Notes for Phase 2

When transitioning to Phase 2, prioritize the following queued initiatives:
1. **ICSE and IB Board Activation**: Ingest official ICSE (Selina Concise / Morning Star) and IB (MYP / DP Oxford) syllabuses and activate the queued board badges in `/admin`.
2. **Realistic AI Avatar**: Upgrade `ClassroomAvatar.tsx` to support realistic human audio-driven lip sync / video generation.
3. **Advanced Continuous Whiteboard**: Add multi-board panning and export options (PDF / High-Res PNG notes download).
4. **Adaptive Quiz Engine**: Expand the 10-MCQ post-class quiz to include step-by-step diagnostic breakdown and automatic struggle area tagging in `ai_user_memories`.

---
*Phase 1 officially marked as END and signed off.*
