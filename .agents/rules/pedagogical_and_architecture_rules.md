# AI Tutor Pedagogical, Scope & Security Invariants

## 1. Target Audience Scope (Classes 6–12 Only)
- The platform is strictly for school students in **Classes 6 to 12** under **CBSE, ICSE, and IB** boards.
- Do NOT include competitive entrance exams (JEE, NEET, CUET) or Undergraduate college curriculum in platform copy, curriculum generation, or pricing tiers unless explicitly instructed.

## 2. Socratic Exam-Topper Teaching Cadence
Whenever designing, prompting, or updating the AI tutor voice instruction:
- **Never lecture continuously**: The tutor must never speak more than 2–3 sentences without engaging the student or checking understanding.
- **Strict 6-Stage Cadence**:
  1. *Real-Life Intuition*: Everyday physical hook/analogy.
  2. *Concept Formulation*: Precise scientific law, definition, and SI units.
  3. *Precise Example*: Concrete illustration addressing common pitfalls.
  4. *Board Numerical*: Step-by-step layout on the whiteboard (Given -> Formula -> Substitution -> Calculation -> Boxed Answer with Units).
  5. *Check for Understanding*: Ask if the student understood.
     - If NO / hesitant: Break down with visual analogy and co-solve on board.
     - If YES: Advance to Stage 6.
  6. *Board-Exam Numerical*: Poses an authentic board-exam level question matching the student's exact board pattern (CBSE/ICSE/IB).

## 3. Whiteboard is Single Source of Truth for Notes
- Do NOT call a separate post-class note optimization LLM API (`/api/class/optimize-notes`).
- The AI Tutor writes topper-ready, structured notes directly to the chalkboard during class via tool calls.
- These live chalkboard notes are directly saved as the final Master Notes for the student.

## 4. Pinned Identity Context Guard
- When applying `contextWindowCompression` in Gemini Live WebSockets, the student's identity dossier (Name, Class, Board, Pacing, Weak Areas) must be permanently pinned in `systemInstruction`.
- Sliding window context compression must NEVER evict or dilute the student's identity or curriculum context.

## 5. Security & Zero Key Leakage Invariant
- NEVER return raw API keys (such as `process.env.GEMINI_API_KEY`) to the client browser in plaintext JSON or HTML.
- All Gemini Live WebSocket connections and external LLM calls must be proxied or brokered through authenticated server-side endpoints.

## 6. Multi-Board Classroom & Ingestion Standards
- **CBSE**: Follows NCERT standard structure, derivation-centric, 50% NEP 2020 Competency-Based Questions, zero calculators.
- **ICSE**: Exact verbatim definitions (penalize missing clauses), dual-column chalkboard with `[ROUGH_WORK]` margin on the right, Selina Concise / Morning Star publisher alignment, no calculators in Class 10.
- **IB (MYP & DP)**: Statement of Inquiry (SOI), official IB command terms, measurement uncertainty ($\pm \Delta x$), GDC keystroke notes, and toggleable Formula Booklet HUD.
