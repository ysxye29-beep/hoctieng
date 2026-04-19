import { useState, useEffect } from 'react'
import { extractTranscript } from '../lib/transcriptExtractor'
import type { TranscriptLine, TranscriptSource } from '../lib/transcriptExtractor'

export function useVideoAnalysis(videoId: string, language: string) {

  const [lines, setLines]     = useState<TranscriptLine[]>([])
  const [source, setSource]   = useState<TranscriptSource>('error')
  const [status, setStatus]   = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [step, setStep]       = useState('')

  useEffect(() => {
    if (!videoId) return

    // Đổi cache key version để invalidate cache cũ có timestamp sai
    const cacheKey = `transcript-v4-${videoId}-${language}`
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const data = JSON.parse(cached)
        const TTL  = 7 * 24 * 60 * 60 * 1000
        if (Date.now() - data.savedAt < TTL) {
          setLines(data.lines)
          setSource(data.source)
          setStatus('done')
          return
        }
      }
    } catch { /* bỏ qua */ }

    // Fetch mới
    let isMounted = true;
    setStatus('loading')
    extractTranscript(videoId, language, setStep)
      .then(result => {
        if (!isMounted) return
        if (result.source === 'error' || result.lines.length === 0) {
          setStatus('error')
          return
        }

        // Chuẩn hóa lines: giữ nguyên startTime/endTime từ extractor
        // KHÔNG tính lại endTime từ duration để tránh sai timestamp tiếng Trung
        const normalizedLines: TranscriptLine[] = result.lines
          .map((item: any) => {
            const startTime = Number(item.startTime ?? item.start ?? 0)
            const endTime   = Number(item.endTime   ?? (startTime + Number(item.duration ?? item.dur ?? 2)))
            return {
              ...item,
              id:          item.id,
              text:        (item.text ?? '').replace(/\n/g, ' ').trim(),
              startTime,
              endTime,
              // Giữ start/duration để tương thích ngược
              start:       startTime,
              duration:    endTime - startTime,
              translation: item.translation ?? item.trans ?? '',
              pinyin:      item.pinyin,
            } as TranscriptLine
          })
          .filter((item: any) => item.text.length > 0 && item.startTime >= 0)
          .sort((a: any, b: any) => a.startTime - b.startTime)
          // Đảm bảo không có câu nào có endTime <= startTime
          .map((item: any, idx: number, arr: any[]) => {
            const next = arr[idx + 1]
            let endTime = item.endTime
            if (endTime <= item.startTime) {
              endTime = next ? Math.min(next.startTime, item.startTime + 3) : item.startTime + 2
            }
            // Không để endTime vượt quá startTime của câu tiếp theo
            if (next && endTime > next.startTime) {
              endTime = next.startTime - 0.05
            }
            return { ...item, endTime, duration: endTime - item.startTime }
          })

        setLines(normalizedLines)
        setSource(result.source)
        setStatus('done')

        // Cache với key mới
        localStorage.setItem(cacheKey, JSON.stringify({
          lines: normalizedLines,
          source: result.source,
          savedAt: Date.now()
        }))
      })
      .catch(() => {
        if (isMounted) setStatus('error')
      })

    return () => {
      isMounted = false
    }
  }, [videoId, language])

  return {
    lines,
    source,
    status,
    step,
    isLoading: status === 'loading',
    isError:   status === 'error',
    isDone:    status === 'done',
  }
}