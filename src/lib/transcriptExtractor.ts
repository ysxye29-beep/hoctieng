import { GoogleGenAI } from "@google/genai";

export interface TranscriptLine {
  id:          number
  startTime:   number   // giây, ví dụ: 12.5
  endTime:     number   // giây, ví dụ: 15.8
  text:        string   // câu gốc tiếng Anh/Trung
  translation: string   // dịch tiếng Việt
  pinyin?:     string   // chỉ có khi là tiếng Trung
  start?:      number
  duration?:   number
}

export type TranscriptSource =
  | 'youtube-cc'     // từ YouTube CC
  | 'gemini-video'   // Gemini đọc video
  | 'error'          // không lấy được

export interface TranscriptResult {
  lines:    TranscriptLine[]
  source:   TranscriptSource
  language: string
  videoId:  string
}

export interface SentenceResult {
  sentenceId: number
  attempts: number        // số lần thử
  bestAccuracy: number    // % đúng tốt nhất (0–100)
  status: 'untouched' | 'in-progress' | 'done-good' | 'done-bad' | 'skipped'
  // done-good: accuracy >= 80% | done-bad: accuracy < 80%
}

export interface DictationSession {
  results: Record<number, SentenceResult>  // key = sentenceId
  currentIndex: number
  rangeMode: { from: number; to: number } | null
}

interface YouTubeEvent {
  segs?: { utf8?: string }[]
  tStartMs?: number
  dDurationMs?: number
}

interface YouTubeCCResponse {
  events?: YouTubeEvent[]
}

export async function fetchYouTubeCC(
  videoId: string,
  language: string
): Promise<TranscriptLine[]> {

  // Thử lấy CC qua YouTube transcript API
  const langCode =
    language === 'zh' || language === 'zh-CN' ? 'zh-Hans' :
    language === 'ja' ? 'ja' :
    language === 'ko' ? 'ko' : 'en'

  const url = `https://www.youtube.com/api/timedtext` +
    `?v=${videoId}&lang=${langCode}&fmt=json3`

  const res = await fetch(url)
  if (!res.ok) throw new Error('No CC')

  const data = await res.json() as YouTubeCCResponse

  // Parse YouTube CC format
  const events = data.events ?? []
  const lines: TranscriptLine[] = []
  let id = 1

  for (const event of events) {
    if (!event.segs) continue

    const text = event.segs
      .map((s) => s.utf8 ?? '')
      .join('')
      .replace(/\n/g, ' ')
      .trim()

    if (!text || text === ' ') continue

    const startTime = (event.tStartMs ?? 0) / 1000
    const duration  = (event.dDurationMs ?? 2000) / 1000

    lines.push({
      id:          id++,
      startTime:   startTime,
      endTime:     startTime + duration,
      text,
      translation: '',  // dịch sau
      pinyin:      undefined,
    })
  }

  if (lines.length < 3) throw new Error('CC too short')

  // FIX 1: Ensure endTime is valid (not 0 or missing)
  // If endTime is missing or same as startTime, use next subtitle's startTime
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLine = lines[i + 1];
    
    if (!line.endTime || line.endTime <= line.startTime) {
      if (nextLine) {
        line.endTime = nextLine.startTime;
      } else {
        line.endTime = line.startTime + 5.0; // Last line fallback
      }
    }
  }

  // Log 5 câu đầu và 5 câu ở phút thứ 1, 2 để debug drift
  console.log('--- DEBUG SUBTITLE TIMESTAMPS ---')
  console.log('First 5 lines:', lines.slice(0, 5).map(l => `[${l.startTime}s - ${l.endTime}s] ${l.text.substring(0, 20)}...`))
  
  const oneMinLines = lines.filter(l => l.startTime >= 60 && l.startTime < 70).slice(0, 5)
  console.log('Lines at ~1min:', oneMinLines.map(l => `[${l.startTime}s - ${l.endTime}s] ${l.text.substring(0, 20)}...`))
  
  const twoMinLines = lines.filter(l => l.startTime >= 120 && l.startTime < 130).slice(0, 5)
  console.log('Lines at ~2min:', twoMinLines.map(l => `[${l.startTime}s - ${l.endTime}s] ${l.text.substring(0, 20)}...`))

  return mergeShortLines(lines)
}

// Gộp các dòng quá ngắn (<3 từ) vào dòng trước:
function mergeShortLines(lines: TranscriptLine[]): TranscriptLine[] {
  const result: TranscriptLine[] = []
  let buffer = ''
  let bufferStart = 0

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const wordCount = line.text.split(' ').length

    if (buffer) {
      buffer += ' ' + line.text
      if (wordCount >= 3 || i === lines.length - 1) {
        result.push({
          ...line,
          id:        result.length + 1,
          startTime: bufferStart,
          text:      buffer.trim(),
        })
        buffer = ''
      }
    } else if (wordCount < 3 && i < lines.length - 1) {
      buffer = line.text
      bufferStart = line.startTime
    } else {
      result.push({ ...line, id: result.length + 1 })
    }
  }
  return result // Không gọi validateTimestamps ở đây cho YouTube CC
}

/**
 * FIX 2: Validate timestamps to prevent Gemini from hallucinating long durations.
 * Especially for longer sentences that might exceed the video's actual duration.
 */
export function validateTimestamps(lines: TranscriptLine[], language: string = 'en'): TranscriptLine[] {
  if (!lines.length) return lines;

  return lines.map((line, index) => {
    const nextLine = lines[index + 1];
    
    // Calculate max allowed duration based on content length
    // English: ~15-20 chars/sec, Chinese: ~3-5 chars/sec
    const isChinese = /[\u4e00-\u9fa5]/.test(line.text);
    const charCount = line.text.length;
    const wordCount = line.text.split(/\s+/).length;
    
    // Heuristic: 0.4s per word (EN) or 0.6s per char (ZH) + 1s base
    const estimatedDuration = isChinese 
      ? (charCount * 0.6) + 1.5 
      : (wordCount * 0.5) + 1.5;
    
    // Cap duration to a reasonable max (e.g., 15s)
    const maxDuration = Math.min(estimatedDuration, 15);
    
    let validatedEnd = line.endTime;
    
    // 1. If endTime is missing or too far, cap it
    if (!validatedEnd || validatedEnd <= line.startTime || (validatedEnd - line.startTime) > maxDuration) {
      validatedEnd = line.startTime + maxDuration;
    }
    
    // 2. Prevent overlap with next sentence
    if (nextLine && validatedEnd > nextLine.startTime) {
      validatedEnd = Math.max(line.startTime + 0.5, nextLine.startTime);
    }
    
    return {
      ...line,
      endTime: Math.round(validatedEnd * 10) / 10
    };
  });
}

export async function transcribeWithGemini(
  videoId: string,
  language: string,
  onStep?: (step: string) => void
): Promise<TranscriptLine[]> {
  const apiKey = process.env.GEMINI_API_KEY ?? ''
  if (!apiKey) throw new Error('No API key')

  const ai = new GoogleGenAI({ apiKey })

  const langName =
    language === 'zh' || language === 'zh-CN'
      ? 'Mandarin Chinese'
      : language === 'ja' ? 'Japanese'
      : language === 'ko' ? 'Korean'
      : 'English'

  onStep?.('Gemini AI đang đọc video...')

  // PROMPT TRANSCRIBE CHÍNH XÁC
  const PROMPT = `
You are a professional transcriptionist for ${langName}.

Listen to this YouTube video and transcribe EVERY sentence 
that is spoken — EXACTLY as heard, word for word.

STRICT RULES:
❌ DO NOT create, invent, or paraphrase any sentences
❌ DO NOT summarize or skip any part
❌ DO NOT add example sentences not in the video
✅ ONLY write what you actually hear
✅ Include accurate timestamps
✅ Split at natural sentence breaks (. ? ! pause)
✅ Each entry: 5-20 words ideally
✅ Translate each line to Vietnamese

Return ONLY a JSON array. No markdown. No explanation:
[
  {
    "id": 1,
    "startTime": 0.0,
    "endTime": 4.2,
    "text": "exact words from video",
    "translation": "dịch tiếng Việt chính xác"
  }
]

${language === 'zh' || language === 'zh-CN' ? `
Also add pinyin for each entry:
    "pinyin": "pīnyīn with tones"
` : ''}

IMPORTANT: 
- startTime/endTime must match actual audio timing
- Cover the ENTIRE video from start to finish
- If unclear, write [unclear] not invented words`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [{
        parts: [
          {
            fileData: {
              mimeType: 'video/youtube',
              fileUri:  `https://www.youtube.com/watch?v=${videoId}`
            }
          },
          { text: PROMPT }
        ]
      }]
    })

    onStep?.('Đang xử lý kết quả...')

    const raw   = response.text ?? ''
    const clean = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()

    const match = clean.match(/\[[\s\S]*\]/)
    if (!match) throw new Error('Invalid Gemini response')

    const data = JSON.parse(match[0])

    if (!Array.isArray(data) || data.length < 3) {
      throw new Error('Transcript too short — likely not real content')
    }

    const lines = data.map((item: { id?: number; startTime?: number; endTime?: number; text?: string; translation?: string; pinyin?: string }, i: number): TranscriptLine => ({
      id:          Number(item.id)          || i + 1,
      startTime:   Number(item.startTime)   || 0,
      endTime:     Number(item.endTime)     || 0,
      text:        String(item.text         || '').trim(),
      translation: String(item.translation  || '').trim(),
      pinyin:      item.pinyin
                     ? String(item.pinyin).trim()
                     : undefined,
    })).filter(line =>
      line.text.length > 0 &&
      line.text !== '[unclear]' &&
      line.endTime > line.startTime
    )

    return validateTimestamps(lines, language)
  } catch (e) {
    console.error('Gemini transcription error:', e)
    throw e
  }
}

export async function extractTranscript(
  videoId:  string,
  language: string,
  onStep?:  (step: string) => void
): Promise<TranscriptResult> {

  // Cấp 1: YouTube CC
  onStep?.('Tìm phụ đề YouTube CC...')
  try {
    const lines = await fetchYouTubeCC(videoId, language)
    console.log(`✅ CC: ${lines.length} dòng`)

    // Dịch sang tiếng Việt nếu chưa có
    const translated = await translateLines(lines, language, onStep)

    return {
      lines:    translated,
      source:   'youtube-cc',
      language,
      videoId,
    }
  } catch (e) {
    console.log('❌ CC không có, thử Gemini:', e)
  }

  // Cấp 2: Gemini đọc video
  onStep?.('Gemini AI đang đọc video...')
  try {
    const lines = await transcribeWithGemini(videoId, language, onStep)
    console.log(`✅ Gemini: ${lines.length} dòng`)

    return {
      lines,
      source:   'gemini-video',
      language,
      videoId,
    }
  } catch (e) {
    console.error('❌ Gemini cũng thất bại:', e)
  }

  // Cấp 3: Lỗi — không trả dữ liệu giả
  return {
    lines:    [],
    source:   'error',
    language,
    videoId,
  }
}

async function translateLines(
  lines:    TranscriptLine[],
  language: string,
  onStep?:  (step: string) => void
): Promise<TranscriptLine[]> {

  // Nếu đã có translation (Gemini đã dịch) → bỏ qua
  if (lines.every(l => l.translation)) return lines

  onStep?.('Dịch sang tiếng Việt...')

  const apiKey = process.env.GEMINI_API_KEY ?? ''
  if (!apiKey) return lines

  const ai = new GoogleGenAI({ apiKey })

  // Gửi tất cả cùng lúc để tiết kiệm API calls
  const texts = lines.map(l => l.text)

  const prompt = `
Dịch các câu sau sang tiếng Việt tự nhiên.
Trả về JSON array đúng thứ tự, KHÔNG markdown:
${JSON.stringify(texts)}`

  try {
    const res   = await ai.models.generateContent({
      model:    'gemini-3-flash-preview',
      contents: [{ parts: [{ text: prompt }] }]
    })
    const raw   = res.text ?? ''
    const clean = raw.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim()
    const match = clean.match(/\[[\s\S]*\]/)
    if (!match) return lines

    const translations: string[] = JSON.parse(match[0])
    return lines.map((l, i) => ({
      ...l,
      translation: translations[i] ?? l.translation
    }))
  } catch {
    return lines  // trả về nguyên bản nếu dịch lỗi
  }
}
