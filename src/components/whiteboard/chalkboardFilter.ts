// Botanical Chalkboard Concept & Redundancy Filter

export const normalizeTitle = (t: string): string =>
  (t || '')
    .replace(/^focus:\s*/i, '')
    .replace(/^concept\s*\d*:\s*/i, '')
    .replace(/[\(\)\[\]\{\}\"\']/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

export const isRedundantConceptOrMasteredText = (
  text: string,
  moduleTitle = '',
  keyConcepts: string[] = []
): boolean => {
  if (!text) return true
  const trimmed = text.trim()

  // 1. Invariant: Never write Mastered or Concept Done on chalkboard
  if (/^(concept\s*\d*\s*)?(done|mastered|completed)\b/i.test(trimmed)) return true
  if (/\b(mastered|completed\s+successfully)\b/i.test(trimmed)) return true

  // 2. Invariant: Never write repeated Concept Title / Focus / Key Concept
  if (/^(key\s+concepts?|focus)\b[:\-]?/i.test(trimmed)) return true
  if (/^concept\s*\d+\b[:\-]?$/i.test(trimmed)) return true
  if (/^(key\s+concepts?|concept\s*\d*|focus|topic)\s*[:\-]\s*(.*)$/i.test(trimmed)) {
    return true
  }

  // 3. Exact match with any key concept or module title
  const norm = normalizeTitle(trimmed)
  if (moduleTitle && norm === normalizeTitle(moduleTitle)) return true
  if (keyConcepts && keyConcepts.some((c) => normalizeTitle(c) === norm)) return true

  return false
}
