import { useState, useRef, useCallback } from 'react'

export interface ZhScore {
  pronunciationScore: number
  accuracy: number
  fluency: number
  completeness: number
  transcript: string
  charResults: {
    char: string
    pinyin: string
    correct: boolean
    spokenPinyin: string
  }[]
}

export function useZhPronunciation() {
  const [isRecording,  setIsRecording]  = useState(false)
  const [isScoring,    setIsScoring]    = useState(false)
  const [score,        setScore]        = useState<ZhScore | null>(null)
  const [pinyin,       setPinyin]       = useState('')
  const [isPinyinLoading, setIsPinyinLoading] = useState(false)
  const [error,        setError]        = useState<string | null>(null)

  const streamRef      = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const transcriptRef  = useRef('')
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ===== HÀM GỌI GEMINI =====
  // Dùng đúng cách đang có trong DictionaryContext.tsx
  const callGemini = async (prompt: string): Promise<string> => {
    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY ?? ''
    })
    const res = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    })
    return res.text || 'null'
  }

  // Get pinyin của toàn bộ câu
  const getPinyin = useCallback(async (sentence: string) => {
    setPinyin('')
    setIsPinyinLoading(true)
    try {
      const raw = await callGemini(
        `Chỉ trả về pinyin có đầy đủ dấu thanh của câu tiếng Trung sau.
Không giải thích, không thêm gì khác, chỉ trả về pinyin:
"${sentence}"
Ví dụ input: "你好吗"
Ví dụ output: nǐ hǎo ma`
      )
      // Strip JSON wrapper nếu có
      const clean = raw.replace(/```json|```|["{}]/g, '').trim()
      setPinyin(clean)
    } catch {
      setPinyin('')
    } finally {
      setIsPinyinLoading(false)
    }
  }, [])

  // Ghi âm + nhận dạng tiếng Trung
  const startRecording = useCallback(async () => {
    setError(null)
    setScore(null)
    transcriptRef.current = ''

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      })
      streamRef.current = stream

      const SR = (window as any).SpeechRecognition
             || (window as any).webkitSpeechRecognition

      if (!SR) {
        setError('Trình duyệt chưa hỗ trợ nhận dạng tiếng Trung.\nDùng Chrome để có kết quả tốt nhất.')
        stream.getTracks().forEach(t => t.stop())
        return
      }

      const rec          = new SR()
      rec.lang           = 'zh-CN'
      rec.continuous     = true
      rec.interimResults = false
      rec.maxAlternatives = 1
      rec.onresult = (e: any) => {
        transcriptRef.current = Array.from(e.results)
          .map((r: any) => r[0].transcript).join('')
      }
      rec.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.error('[ZH Recognition error]', e.error)
        }
      }
      rec.start()
      recognitionRef.current = rec
      setIsRecording(true)

      // Tự dừng sau 10 giây
      timeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) stopAndScore('')
      }, 10000)

    } catch (err: any) {
      setError(
        err.message?.includes('NotAllowed')
          ? 'Chưa cấp quyền microphone. Nhấn 🔒 trên thanh địa chỉ.'
          : 'Không thể khởi động mic'
      )
    }
  }, [])

  // Dừng + chấm điểm bằng Gemini
  const stopAndScore = useCallback(async (expectedText: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    recognitionRef.current?.stop()
    streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop())
    setIsRecording(false)
    setIsScoring(true)

    await new Promise(r => setTimeout(r, 500))

    const spoken   = transcriptRef.current.trim()
    const expected = expectedText.trim()

    if (!spoken) {
      setError('Không nhận được giọng nói. Hãy nói to và rõ hơn.')
      setIsScoring(false)
      return
    }

    try {
      const raw = await callGemini(
        `Bạn là giáo viên tiếng Trung. Chấm điểm phát âm của học viên.

Câu gốc: "${expected}"
Học viên nói: "${spoken}"

Trả về JSON hợp lệ, KHÔNG markdown:
{
  "pronunciationScore": 0-100,
  "accuracy": 0-100,
  "fluency": 0-100,
  "completeness": 0-100,
  "charResults": [
    {
      "char": "từng chữ Hán trong câu gốc",
      "pinyin": "pinyin chuẩn của chữ đó",
      "correct": true hoặc false,
      "spokenPinyin": "pinyin học viên đã phát âm (ước tính)"
    }
  ]
}

Tiêu chí chấm:
- accuracy: so sánh từng chữ đúng/sai thanh điệu
- fluency: tốc độ và nhịp điệu tự nhiên
- completeness: tỉ lệ câu nói được / câu gốc
- pronunciationScore: trung bình có trọng số`
      )

      const clean   = raw.replace(/```json|```/g, '').trim()
      const result  = JSON.parse(clean)

      setScore({
        pronunciationScore: result.pronunciationScore ?? 0,
        accuracy:           result.accuracy           ?? 0,
        fluency:            result.fluency            ?? 0,
        completeness:       result.completeness       ?? 0,
        transcript: spoken,
        charResults: result.charResults ?? [],
      })
    } catch {
      // Fallback nếu Gemini lỗi — tính điểm đơn giản
      const expChars = expected.replace(/[^\u4e00-\u9fff]/g, '').split('')
      const spoChars = spoken.replace(/[^\u4e00-\u9fff]/g, '').split('')
      const correct  = expChars.filter(c => spoChars.includes(c))
      const acc      = expChars.length
        ? Math.round((correct.length / expChars.length) * 100)
        : 0
      setScore({
        pronunciationScore: acc,
        accuracy: acc,
        fluency: Math.min(100, Math.round((spoChars.length / 6) * 100)),
        completeness: expChars.length
          ? Math.min(100, Math.round((spoChars.length / expChars.length) * 100))
          : 0,
        transcript: spoken,
        charResults: expChars.map(char => ({
          char,
          pinyin: '',
          correct: spoChars.includes(char),
          spokenPinyin: '',
        })),
      })
    } finally {
      setIsScoring(false)
    }
  }, [])

  const reset = useCallback(() => {
    setScore(null)
    setError(null)
    setPinyin('')
    transcriptRef.current = ''
  }, [])

  return {
    isRecording, isScoring, score, pinyin,
    isPinyinLoading, error,
    getPinyin, startRecording, stopAndScore, reset, setScore
  }
}
