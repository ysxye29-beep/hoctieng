import { validateTimestamps, type TranscriptLine } from './transcriptExtractor'

export interface Sentence {
  index: number        // 1-based
  en: string           // câu tiếng Anh đầy đủ
  startTime: number
  endTime: number
}

export async function extractSentences(lines: TranscriptLine[], youtubeId: string): Promise<Sentence[]> {
  const cacheKey = `sentences_local_${youtubeId}`
  const cached = localStorage.getItem(cacheKey)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (parsed.timestamp && Date.now() - parsed.timestamp < 7 * 24 * 60 * 60 * 1000) {
        return parsed.data
      }
    } catch (e) {}
  }

  const allSentences: Sentence[] = []
  let globalIndex = 1

  let currentSentenceText = ''
  let currentStartTime = 0
  let currentEndTime = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Nếu là bắt đầu một câu mới
    if (!currentSentenceText) {
      currentStartTime = line.startTime
    }
    
    // Nối text
    const isChinese = /[\u4e00-\u9fa5]/.test(line.text)
    const separator = isChinese ? '' : ' '
    currentSentenceText += (currentSentenceText ? separator : '') + line.text.trim()
    currentEndTime = line.endTime

    // Kiểm tra xem dòng hiện tại có kết thúc bằng dấu câu không
    const endsWithPunctuation = /[.?!。？！]\s*$/.test(line.text.trim())
    
    // Nếu kết thúc bằng dấu câu, hoặc là dòng cuối cùng, hoặc câu đã quá dài (> 150 ký tự)
    if (endsWithPunctuation || i === lines.length - 1 || currentSentenceText.length > 150) {
      allSentences.push({
        index: globalIndex++,
        en: currentSentenceText,
        startTime: currentStartTime,
        endTime: currentEndTime
      })
      currentSentenceText = ''
    }
  }

  const validated = validateTimestamps(allSentences.map(s => ({
    id: s.index,
    text: s.en,
    startTime: s.startTime,
    endTime: s.endTime,
    translation: ''
  })))

  const finalSentences = validated.map((v, i) => ({
    index: i + 1,
    en: v.text,
    startTime: v.startTime,
    endTime: v.endTime
  }))

  localStorage.setItem(cacheKey, JSON.stringify({
    timestamp: Date.now(),
    data: finalSentences
  }))
  
  return finalSentences
}
