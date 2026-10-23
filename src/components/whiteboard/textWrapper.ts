/**
 * textWrapper.ts - Whitespace and hyphenation wrapping engine for whiteboard cards
 * Guarantees zero text spillage outside card boundaries (CBSE/ICSE/IB layouts)
 */

export function wrapText(text: string, maxCharsPerLine = 70): string[] {
  if (!text || !text.trim()) return []
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const paragraphs = normalized.split('\n')
  const result: string[] = []

  for (const para of paragraphs) {
    const trimmedPara = para.trim()
    if (!trimmedPara) {
      result.push('')
      continue
    }

    const words = trimmedPara.split(/\s+/)
    let currentLine = ''

    for (let rawWord of words) {
      // Hyphenate oversized tokens
      while (rawWord.length > maxCharsPerLine) {
        const splitIndex = Math.max(1, maxCharsPerLine - 1)
        const chunk = rawWord.slice(0, splitIndex) + '-'
        if (currentLine) {
          result.push(currentLine)
          currentLine = ''
        }
        result.push(chunk)
        rawWord = rawWord.slice(splitIndex)
      }

      if (!currentLine) {
        currentLine = rawWord
      } else if (currentLine.length + 1 + rawWord.length <= maxCharsPerLine) {
        currentLine += ' ' + rawWord
      } else {
        result.push(currentLine)
        currentLine = rawWord
      }
    }

    if (currentLine) {
      result.push(currentLine)
    }
  }

  while (result.length > 0 && result[result.length - 1] === '') {
    result.pop()
  }

  return result
}
