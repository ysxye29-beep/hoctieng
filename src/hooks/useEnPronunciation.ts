import { useState, useRef, useCallback } from 'react'

export interface EnScore {
  pronunciationScore: number
  accuracy: number
  fluency: number
  completeness: number
  transcript: string
  wordResults: {
    word: string
    correct: boolean
  }[]
}

export function useEnPronunciation() {
  const [isRecording, setIsRecording] = useState(false)
  const [isScoring,   setIsScoring]   = useState(false)
  const [score,       setScore]       = useState<EnScore | null>(null)
  const [ipa,         setIpa]         = useState('')
  const [error,       setError]       = useState<string | null>(null)

  const streamRef      = useRef<MediaStream | null>(null)
  const recognitionRef = useRef<any>(null)
  const transcriptRef  = useRef('')
  const timeoutRef     = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Get IPA phiên âm từ Free Dictionary (không cần key)
  const getIpa = useCallback(async (sentence: string) => {
    setIpa('')
    const firstWord = sentence.split(' ')[0]
      .replace(/[^a-zA-Z]/g, '').toLowerCase()
    if (!firstWord) return
    try {
      const res  = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${firstWord}`
      )
      if (!res.ok) return
      const data = await res.json()
      const text = data[0]?.phonetic
        ?? data[0]?.phonetics?.find((p: any) => p.text)?.text
        ?? ''
      setIpa(text)
    } catch {}
  }, [])

  const startRecording = useCallback(async (expectedText: string) => {
    setError(null)
    setScore(null)
    transcriptRef.current = ''

    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Trình duyệt không hỗ trợ ghi âm')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      })
      streamRef.current = stream

      // Web Speech API nhận dạng tiếng Anh
      const SR = (window as any).SpeechRecognition
             || (window as any).webkitSpeechRecognition
      if (SR) {
        const rec       = new SR()
        rec.lang        = 'en-US'
        rec.continuous  = true
        rec.interimResults = false
        rec.onresult    = (e: any) => {
          transcriptRef.current = Array.from(e.results)
            .map((r: any) => r[0].transcript).join(' ')
        }
        rec.start()
        recognitionRef.current = rec
      }

      setIsRecording(true)

      // Tự dừng sau 12 giây
      timeoutRef.current = setTimeout(() => {
        stopAndScore(expectedText)
      }, 12000)

    } catch (err: any) {
      setError(
        err.message?.includes('NotAllowed')
          ? 'Chưa cấp quyền microphone. Nhấn 🔒 trên thanh địa chỉ.'
          : 'Không thể khởi động mic: ' + err.message
      )
    }
  }, [])

  const stopAndScore = useCallback(async (expectedText: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    recognitionRef.current?.stop()
    streamRef.current?.getTracks().forEach((t: MediaStreamTrack) => t.stop())
    setIsRecording(false)
    setIsScoring(true)

    // Đợi recognition flush kết quả
    await new Promise(r => setTimeout(r, 400))

    const spoken   = transcriptRef.current.toLowerCase().trim()
    const expected = expectedText.toLowerCase().trim()

    if (!spoken) {
      setError('Không nhận được giọng nói. Hãy nói to hơn và thử lại.')
      setIsScoring(false)
      return
    }

    const expectedWords = expected.replace(/[^a-z ]/g, '').split(' ').filter(Boolean)
    const spokenWords   = spoken.replace(/[^a-z ]/g, '').split(' ').filter(Boolean)

    // Tính accuracy: % từ đúng
    const correctWords = expectedWords.filter(w =>
      spokenWords.some(s => s === w)
    )
    const accuracy = Math.round(
      (correctWords.length / expectedWords.length) * 100
    )

    // Tính fluency: tốc độ nói (chuẩn 2.5 từ/giây, ghi 12s)
    const fluency = Math.min(
      100,
      Math.round((spokenWords.length / 12) / 2.5 * 100)
    )

    // Tính completeness: % câu nói được
    const completeness = Math.min(
      100,
      Math.round((spokenWords.length / expectedWords.length) * 100)
    )

    // Điểm tổng có trọng số
    const pronunciationScore = Math.round(
      accuracy * 0.5 + fluency * 0.25 + completeness * 0.25
    )

    // Word-level để highlight
    const wordResults = expectedWords.map(word => ({
      word,
      correct: spokenWords.includes(word),
    }))

    setScore({
      pronunciationScore,
      accuracy,
      fluency,
      completeness,
      transcript: transcriptRef.current,
      wordResults,
    })
    setIsScoring(false)
  }, [])

  const reset = useCallback(() => {
    setScore(null)
    setError(null)
    setIpa('')
    transcriptRef.current = ''
  }, [])

  return {
    isRecording, isScoring, score, ipa, error,
    getIpa, startRecording, stopAndScore, reset, setScore
  }
}
