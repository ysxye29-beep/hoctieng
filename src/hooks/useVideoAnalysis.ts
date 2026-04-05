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

    // Check cache localStorage
    const cacheKey = `transcript-${videoId}`
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
    setStatus('loading')
    extractTranscript(videoId, language, setStep)
      .then(result => {
        if (result.source === 'error' || result.lines.length === 0) {
          setStatus('error')
          return
        }

        const sortedLines = result.lines.map((item: any) => ({
          ...item,
          text:        (item.text ?? '').replace(/\n/g, ' ').trim(),
          start:       parseFloat(item.start ?? item.startTime ?? 0),
          duration:    parseFloat(item.duration ?? item.dur ?? item.endTime - item.startTime ?? 2),
          translation: item.translation ?? item.trans ?? '',
        })).filter((item: any) => item.text.length > 0 && item.start >= 0)
        .sort((a: any, b: any) => (a.start ?? 0) - (b.start ?? 0))

        setLines(sortedLines)
        setSource(result.source)
        setStatus('done')

        // Cache localStorage
        localStorage.setItem(cacheKey, JSON.stringify({
          lines: sortedLines,
          source: result.source,
          savedAt: Date.now()
        }))
      })
      .catch(() => setStatus('error'))

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
