export interface HighlightChar {
  char: string
  highlighted: boolean
  isSpace: boolean
}

// Tiếng ANH: tách theo từ, highlight theo index từ
export function highlightEnWords(
  text: string,
  currentTime: number,
  lineStart: number,
  lineDuration: number
): HighlightChar[] {
  const words = text.split(' ').filter(Boolean)
  if (!words.length || lineDuration <= 0) {
    return text.split('').map(char => ({
      char,
      highlighted: false,
      isSpace: char === ' ',
    }))
  }

  const elapsed  = Math.max(0, currentTime - lineStart)
  const progress = Math.min(1, elapsed / lineDuration)
  // Từ đang được nói
  const wordIndex = Math.floor(progress * words.length)

  let result: HighlightChar[] = []
  words.forEach((word, i) => {
    word.split('').forEach(char => {
      result.push({
        char,
        highlighted: i <= wordIndex,
        isSpace: false,
      })
    })
    if (i < words.length - 1) {
      result.push({ char: ' ', highlighted: false, isSpace: true })
    }
  })
  return result
}

// Tiếng TRUNG: tách theo từng ký tự Hán, highlight theo index chữ
export function highlightZhChars(
  text: string,
  currentTime: number,
  lineStart: number,
  lineDuration: number
): HighlightChar[] {
  // Lọc chỉ ký tự Hán + dấu câu
  const chars = text.split('')
  if (!chars.length || lineDuration <= 0) {
    return chars.map(char => ({
      char,
      highlighted: false,
      isSpace: false,
    }))
  }

  const elapsed   = Math.max(0, currentTime - lineStart)
  const progress  = Math.min(1, elapsed / lineDuration)
  // Chữ đang được đọc đến
  const charIndex = Math.floor(progress * chars.length)

  return chars.map((char, i) => ({
    char,
    highlighted: i <= charIndex,
    isSpace: char === ' ',
  }))
}
