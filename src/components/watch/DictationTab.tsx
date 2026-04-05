import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Volume2, Eye, EyeOff, Languages, ChevronLeft, 
         ChevronRight, RotateCcw, Trophy } from 'lucide-react'
import { type TranscriptLine, type TranscriptSource, type DictationSession, type SentenceResult } from '../../lib/transcriptExtractor'
import { useDictionaryContext } from '../../hooks/useDictionary'
import { extractSentences, type Sentence } from '../../lib/extractSentences'
import { SegmentModal } from './SegmentModal'

// ── Types ──────────────────────────────────────────────
interface WordResult {
  original: string
  userWord: string  
  correct: boolean
}

// ── Hàm chấm điểm ──────────────────────────────────────
function gradeAnswer(original: string, input: string): WordResult[] {
  const isChinese = /[\u4e00-\u9fff]/.test(original)
  
  // Lọc dấu câu TRƯỚC KHI tokenize
  const removePunctuation = (s: string) => s
    .replace(/[，。？！、…,.!?""''「」《》【】·—\s]/g, '')
    .trim()
    .toLowerCase()

  const tokenize = (s: string): string[] => {
    const cleaned = removePunctuation(s)
    if (isChinese) {
      // Chỉ giữ ký tự Hán và alphanumeric, bỏ hết dấu câu
      return cleaned.split('').filter(c => /[\u4e00-\u9fff\u3400-\u4dbf\w]/.test(c))
    }
    return s.replace(/[,.!?""'']/g, '').trim().toLowerCase().split(/\s+/).filter(Boolean)
  }

  const origTokens = tokenize(original)
  const userTokens = tokenize(input)

  return origTokens.map((word, i) => ({
    original: word,
    userWord: userTokens[i] ?? '',
    correct: word === (userTokens[i] ?? '').toLowerCase()
  }))
}

// ── Component chính ─────────────────────────────────────
interface DictationTabProps {
  youtubeId: string
  language: string
  videoTitle: string
  channelName: string
  ytCommand: (func: string, args?: unknown[]) => void
  subtitles: TranscriptLine[]
  transcriptSource: TranscriptSource | null
  session: DictationSession
  setSession: React.Dispatch<React.SetStateAction<DictationSession>>
  scores: number[]
  setScores: React.Dispatch<React.SetStateAction<number[]>>
  finished: boolean
  setFinished: React.Dispatch<React.SetStateAction<boolean>>
  inputValue: string
  onInputChange: (val: string) => void
  currentIndex: number
  onIndexChange: (index: number) => void
  playbackRate?: number
  currentTime: number
}

export default function DictationTab({ 
  youtubeId, language, videoTitle, channelName, ytCommand,
  subtitles: rawSubtitles, transcriptSource, session, setSession, scores, setScores, finished, setFinished, inputValue, onInputChange, currentIndex, onIndexChange, playbackRate = 1, currentTime
}: DictationTabProps) {
  // State
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [isSentenceLoading, setIsSentenceLoading] = useState(false)
  const [showSegmentModal, setShowSegmentModal] = useState(false)
  const [segmentFrom, setSegmentFrom] = useState(1)
  const [segmentTo, setSegmentTo] = useState(1)
  const [activeSegment, setActiveSegment] = useState<{ from: number; to: number } | null>(null)

  const transcript = rawSubtitles.map(s => s.text).join(' ')

  async function handleLoadSentences() {
    if (!rawSubtitles || rawSubtitles.length === 0 || isSentenceLoading) return
    setIsSentenceLoading(true)
    const result = await extractSentences(rawSubtitles, youtubeId)
    setSentences(result)
    setSegmentTo(result.length || 1)
    setIsSentenceLoading(false)
  }

  useEffect(() => {
    if (rawSubtitles.length > 0 && sentences.length === 0) {
      handleLoadSentences()
    }
  }, [youtubeId])

  const activeSentences = useMemo(() => activeSegment 
    ? sentences.slice(activeSegment.from - 1, activeSegment.to) 
    : sentences, [sentences, activeSegment])

  const subtitles: TranscriptLine[] = useMemo(() => sentences.length > 0
    ? activeSentences.map(s => ({
        id: s.index,
        text: s.en,
        translation: '',
        startTime: s.startTime,
        endTime: s.endTime
      }))
    : rawSubtitles, [sentences.length, activeSentences, rawSubtitles])
  
  const currentSentence = subtitles[currentIndex]
  
  const [showSentencePicker, setShowSentencePicker] = useState(false)
  const [rangeInput, setRangeInput] = useState<{ from: string; to: string }>({
    from: '',
    to: '',
  })
  const [jumpConfirm, setJumpConfirm] = useState<{
    targetIndex: number
    show: boolean
  }>({ targetIndex: 0, show: false })

  const [submitted, setSubmitted]       = useState(false)
  const [results, setResults]           = useState<WordResult[]>([])
  const [showTrans, setShowTrans]   = useState(false)
  const [showText, setShowText]     = useState(false)
  const [showFullAnswer, setShowFullAnswer] = useState(false)
  const [showAnswerImmediately, setShowAnswerImmediately] = useState(true)
  const [playCount, setPlayCount]   = useState(0)
  const [isPlaying, setIsPlaying]   = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { openDict } = useDictionaryContext()
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleWordClick = (e: React.MouseEvent, index: number, tokens: string[], isChinese: boolean) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const dictLang = isChinese ? 'zh' : 'en'
    
    clickCountRef.current = e.detail;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = setTimeout(() => {
      const count = clickCountRef.current;
      clickCountRef.current = 0;
      
      const takeCount = count;
      const phraseTokens = tokens.slice(index, index + takeCount)
      const phrase = phraseTokens.join(isChinese ? '' : ' ')
      
      if (phrase) {
        const videoInfo = {
          id: youtubeId,
          title: videoTitle,
          thumbnail: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
          timestamp: Math.floor(currentSentence?.startTime || 0)
        };
        openDict(phrase, rect.left, rect.bottom, dictLang, 'dictation', videoInfo)
      }
    }, 250)
  }

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 0) {
        // Kiểm tra xem vùng chọn có nằm trong vùng phụ đề không
        const isInsideSubPanel = scrollRef.current?.contains(selection.anchorNode);
        if (!isInsideSubPanel) return;

        const isChinese = /[\u4e00-\u9fa5]/.test(text);
        const wordCount = isChinese ? text.length : text.split(/\s+/).length;
        
        if (wordCount >= 1 && wordCount <= 5) {
          const videoInfo = {
            id: youtubeId,
            title: videoTitle,
            thumbnail: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
            timestamp: Math.floor(currentSentence?.startTime || 0)
          };
          openDict(text, e.clientX, e.clientY, language, 'dictation', videoInfo);
        }
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [language, youtubeId, videoTitle, currentSentence, openDict]);

  // Đóng picker khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowSentencePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Tự động scroll để câu active luôn visible
  useEffect(() => {
    if (!scrollRef.current) return
    const activeBtn = scrollRef.current.querySelector('[data-active="true"]')
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'center',
      })
    }
  }, [currentIndex])

  // ── Helpers ──
  const getSentenceResult = (id: number): SentenceResult =>
    session.results[id] ?? {
      sentenceId: id,
      attempts: 0,
      bestAccuracy: 0,
      status: 'untouched',
    }

  const updateSentenceResult = (id: number, accuracy: number) => {
    setSession(prev => {
      const old = prev.results[id]
      const attempts = (old?.attempts ?? 0) + 1
      const bestAccuracy = Math.max(old?.bestAccuracy ?? 0, accuracy)
      return {
        ...prev,
        results: {
          ...prev.results,
          [id]: {
            sentenceId: id,
            attempts,
            bestAccuracy,
            status: bestAccuracy >= 80 ? 'done-good' : 'done-bad',
          },
        },
      }
    })
  }

  const jumpToSentence = useCallback((targetIndex: number) => {
    // Reset toàn bộ trạng thái câu hiện tại
    onInputChange('')
    setSubmitted(false)
    setResults([])
    setShowFullAnswer(false)
    
    // Nhảy đến câu được chọn
    onIndexChange(targetIndex)
    setShowSentencePicker(false)
    setJumpConfirm({ targetIndex: 0, show: false })
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const current = subtitles[currentIndex]
  const isLast  = currentIndex === subtitles.length - 1
  const isChinese = language === 'zh-CN' || language === 'zh'

  // ── Play đoạn hiện tại ──────────────────────────────
  const playLine = useCallback(() => {
    if (!current) return
    if (timerRef.current) clearTimeout(timerRef.current)

    const iframe = document.querySelector('iframe[src*="youtube.com"]') as HTMLIFrameElement
    if (!iframe?.contentWindow) return

    const send = (func: string, args: unknown[] = []) => {
      iframe.contentWindow!.postMessage(
        JSON.stringify({ event: 'command', func, args }),
        '*'
      )
    }

    const duration = ((current.endTime - current.startTime) * 1000) / playbackRate;
    
    // Với tiếng Trung: tăng seek delay vì iframe cần thêm thời gian
    const isChinese = language.startsWith('zh')
    const seekDelay = isChinese ? 500 : 300
    const pauseBuffer = isChinese ? 800 : 600 // Tăng buffer để tránh bị cắt câu

    send('seekTo', [current.startTime, true])
    // Không force setPlaybackRate để tôn trọng tốc độ người dùng chọn
    // send('setPlaybackRate', [1])

    setIsPlaying(true)
    setPlayCount(c => c + 1)

    // Chờ seek xong mới play
    setTimeout(() => {
      send('playVideo')
      
      // Dừng đúng lúc = seekDelay + duration + buffer nhỏ
      timerRef.current = setTimeout(() => {
        send('pauseVideo')
        setIsPlaying(false)
      }, duration + pauseBuffer)
      
    }, seekDelay)

  }, [current, language, playbackRate])

  // Lắng nghe message từ YouTube player để detect khi video thực sự bắt đầu play
  useEffect(() => {
    const handleYTMessage = (event: MessageEvent) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        // playerState: 1 = playing, 2 = paused
        const state = data.event === 'onStateChange' ? data.info : (data.info?.playerState)
        
        if (state === 1 && isPlaying && current) {
          // Video bắt đầu play thật sự → set timer dừng từ đây
          if (timerRef.current) clearTimeout(timerRef.current)
          
          const duration = ((current.endTime - current.startTime) * 1000) / playbackRate;
          const pauseBuffer = language.startsWith('zh') ? 800 : 600 // Tăng buffer
          
          const iframe = document.querySelector('iframe[src*="youtube.com"]') as HTMLIFrameElement
          const send = (func: string, args: unknown[] = []) => {
            iframe?.contentWindow?.postMessage(
              JSON.stringify({ event: 'command', func, args }), '*'
            )
          }

          // Lấy tốc độ hiện tại nếu có thể, tạm thời dùng duration gốc
          // Nếu người dùng chọn tốc độ khác, duration thực tế sẽ thay đổi, 
          // nhưng vì không lấy được playbackRate từ event này dễ dàng, ta giữ nguyên logic cũ nhưng bỏ Math.max
          timerRef.current = setTimeout(() => {
            send('pauseVideo')
            setIsPlaying(false)
          }, duration + pauseBuffer)
        }
      } catch {}
    }
    window.addEventListener('message', handleYTMessage)
    return () => window.removeEventListener('message', handleYTMessage)
  }, [current, isPlaying, language, playbackRate])

  // Tự động dừng khi đạt đến endTime + buffer (onTimeUpdate logic)
  useEffect(() => {
    if (isPlaying && current && currentTime >= current.endTime + 0.4) {
      const iframe = document.querySelector('iframe[src*="youtube.com"]') as HTMLIFrameElement
      const send = (func: string, args: unknown[] = []) => {
        iframe?.contentWindow?.postMessage(
          JSON.stringify({ event: 'command', func, args }), '*'
        )
      }
      send('pauseVideo')
      setIsPlaying(false)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [isPlaying, current, currentTime])

  // Cleanup timer khi unmount hoặc đổi câu
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // Auto play + reset khi chuyển câu
  useEffect(() => {
    onInputChange('')
    setSubmitted(false)
    setResults([])
    setPlayCount(0)
    
    // Đợi subtitles sẵn sàng rồi mới play
    if (subtitles.length > 0 && subtitles[currentIndex]) {
      setTimeout(() => playLine(), 100)
    }
    setTimeout(() => inputRef.current?.focus(), 200)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [currentIndex])

  // Bảo vệ currentIndex khi subtitles thay đổi
  useEffect(() => {
    // Khi sentences load xong và subtitles thay đổi
    // KHÔNG reset currentIndex — chỉ clamp nếu index vượt quá
    if (subtitles.length > 0 && currentIndex >= subtitles.length) {
      onIndexChange(subtitles.length - 1)
    }
  }, [subtitles.length])

  function findFirstWrongPosition(
    inputText: string,
    results: WordResult[]
  ): number {
    // Tách từ người dùng gõ, GIỮ NGUYÊN vị trí ký tự thực tế
    // bằng cách dùng regex có index thay vì split
    const wordMatches = [...inputText.matchAll(/\S+/g)]

    for (let i = 0; i < results.length; i++) {
      if (!results[i].correct) {
        const match = wordMatches[i]
        if (!match) return inputText.length

        // Trả về vị trí SAU từ sai trong chuỗi input gốc
        // match.index = vị trí bắt đầu từ
        // match[0].length = độ dài từ người dùng gõ (không phải đáp án)
        return match.index! + match[0].length
      }
    }
    return inputText.length
  }

  function handleSubmit() {
    if (!inputValue.trim() || submitted || !current) return
    
    const res = gradeAnswer(current.text, inputValue)
    setResults(res)
    setSubmitted(true)

    const score = Math.round(
      res.filter(r => r.correct).length / res.length * 100
    )
    setScores(prev => [...prev, score])
    updateSentenceResult(current.id, score)

    if (score === 100) {
      setTimeout(() => handleNext(), 600)
      return
    }

    setTimeout(() => {
      if (!inputRef.current) return
      const cursorPos = findFirstWrongPosition(inputValue, res)
      inputRef.current.focus()
      inputRef.current.setSelectionRange(cursorPos, cursorPos)
    }, 50)
  }

  // ── Tiếp theo ────────────────────────────────────────
  const handleNext = () => {
    if (isLast) setFinished(true)
    else jumpToSentence(currentIndex + 1)
  }

  // ── Keyboard shortcuts ───────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      const isInput = tag === 'INPUT' || tag === 'TEXTAREA'

      if (e.key === ' ' && e.target !== inputRef.current) {
        e.preventDefault()
        playLine()
        return
      }

      // Tab → Câu tiếp (kể cả khi focus input)
      if (e.code === 'Tab' && !e.shiftKey) {
        e.preventDefault()
        if (submitted) handleNext()
        return
      }

      // Shift + Tab → Câu trước
      if (e.code === 'Tab' && e.shiftKey) {
        e.preventDefault()
        if (currentIndex > 0) jumpToSentence(currentIndex - 1)
        return
      }

      // Ctrl + R → Phát lại (preventDefault để không reload trang)
      if (e.code === 'KeyR' && e.ctrlKey) {
        e.preventDefault()
        const s = subtitles[currentIndex]
        if (!s) return
        setSession(prev => ({
          ...prev,
          results: {
            ...prev.results,
            [s.id]: { ...prev.results[s.id], status: 'in-progress' },
          },
        }))
        playLine()
        return
      }

      // Ctrl + ArrowLeft
      if (e.ctrlKey && e.code === 'ArrowLeft') {
        e.preventDefault()
        jumpToSentence(Math.max(0, currentIndex - 1))
        return
      }

      // Ctrl + ArrowRight
      if (e.ctrlKey && e.code === 'ArrowRight') {
        e.preventDefault()
        jumpToSentence(Math.min(subtitles.length - 1, currentIndex + 1))
        return
      }

      // Ctrl + G
      if (e.ctrlKey && e.code === 'KeyG') {
        e.preventDefault()
        setShowSentencePicker(v => !v)
        return
      }

      // Ctrl + H → Gợi ý (hiện translation)
      if (e.code === 'KeyH' && e.ctrlKey) {
        e.preventDefault()
        setShowTrans(s => !s)
        return
      }

      // Esc → Ẩn video (toggle showText)
      if (e.code === 'Escape') {
        setShowText(s => !s)
        return
      }

      // F1 → Hiện/ẩn bảng phím tắt
      if (e.code === 'F1') {
        e.preventDefault()
        setShowShortcuts(s => !s)
        return
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [submitted, currentIndex, playLine, jumpToSentence, subtitles])

  // Score hiện tại (live hoặc sau khi submit)
  const correctCount = results.filter(r => r.correct).length
  const activeScore = results.length > 0 ? Math.round(correctCount / results.length * 100) : 0

  const avgScore = scores.length 
    ? Math.round(scores.reduce((a,b) => a+b,0) / scores.length) 
    : 0

  // ── MÀN HÌNH KẾT QUẢ ────────────────────────────────
  if (finished) {
    const excellent = scores.filter(s => s >= 90).length
    const needWork  = scores.filter(s => s < 60).length
    return (
      <div className="flex flex-col items-center gap-5 py-8 text-center px-4">
        <Trophy size={48} className="text-yellow-400" />
        <h3 className="text-xl font-bold text-white">Hoàn thành!</h3>
        <p className="text-zinc-400 text-sm">
          Đã luyện {subtitles.length} câu
        </p>

        {/* Score circle */}
        <div className={`w-28 h-28 rounded-full border-4 flex flex-col items-center justify-center
          ${avgScore >= 80 ? 'border-emerald-500' : avgScore >= 60 ? 'border-yellow-500' : 'border-red-500'}`}>
          <span className={`text-3xl font-bold
            ${avgScore >= 80 ? 'text-emerald-400' : avgScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
            {avgScore}%
          </span>
          <span className="text-xs text-zinc-500">TB</span>
        </div>

        {/* Stats */}
        <div className="w-full bg-zinc-900 rounded-2xl p-4 flex flex-col gap-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">⭐ Xuất sắc (≥90%)</span>
            <span className="font-bold text-emerald-400">{excellent} câu</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">💪 Cần luyện thêm (&lt;60%)</span>
            <span className="font-bold text-red-400">{needWork} câu</span>
          </div>
          <div className="h-px bg-zinc-800" />
          {/* Điểm từng câu */}
          <div className="flex gap-1 flex-wrap justify-center">
            {scores.map((s, i) => (
              <div key={i} title={`Câu ${i+1}: ${s}%`}
                className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold
                  ${s >= 80 ? 'bg-emerald-500/20 text-emerald-400' : 
                    s >= 60 ? 'bg-yellow-500/20 text-yellow-400' : 
                              'bg-red-500/20 text-red-400'}`}>
                {s}
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={() => {
            jumpToSentence(0); setScores([]); setFinished(false)
          }} className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 
                        hover:bg-zinc-700 rounded-xl text-sm transition-colors">
            <RotateCcw size={15}/> Làm lại
          </button>
          <button onClick={() => {
            localStorage.setItem(`dictation_${youtubeId}`, 
              JSON.stringify({ date: Date.now(), avgScore, scores }))
          }} className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 
                        rounded-xl text-sm text-white transition-colors">
            💾 Lưu kết quả
          </button>
        </div>
      </div>
    )
  }

  // ── GIAO DIỆN CHÍNH ──────────────────────────────────
  if (rawSubtitles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-8 px-4 text-center">
        <p className="text-4xl">🤖</p>
        <h3 className="font-medium text-zinc-300">
          Không thể tạo nội dung
        </h3>
        <p className="text-sm text-zinc-500">
          Gemini API key chưa được cấu hình hoặc có lỗi xảy ra.
        </p>
      </div>
    )
  }

  // ── Components ──────────────────────────────────────────
  const DOT_COLORS: Record<SentenceResult['status'], string> = {
    untouched:      'bg-zinc-600 hover:bg-zinc-500',
    'in-progress':  'bg-yellow-500 hover:bg-yellow-400 animate-pulse',
    'done-good':    'bg-emerald-500 hover:bg-emerald-400',
    'done-bad':     'bg-red-500 hover:bg-red-400',
    skipped:        'bg-blue-500 hover:bg-blue-400',
  }

  function RangeSelector() {
    const [show, setShow] = useState(false)

    const applyRange = () => {
      const from = parseInt(rangeInput.from)
      const to   = parseInt(rangeInput.to)
      if (
        isNaN(from) || isNaN(to) ||
        from < 1 || to > subtitles.length ||
        from > to
      ) return
      setSession(prev => ({ ...prev, rangeMode: { from, to } }))
      jumpToSentence(from - 1)
      setShow(false)
    }

    const clearRange = () =>
      setSession(prev => ({ ...prev, rangeMode: null }))

    return (
      <>
        <div className="flex items-center gap-2">
          {/* Badge range đang active */}
          {session.rangeMode && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full
                             bg-blue-500/20 border border-blue-500/30
                             text-blue-400 text-xs">
              Đoạn {session.rangeMode.from}–{session.rangeMode.to}
              <button
                onClick={clearRange}
                className="hover:text-white ml-0.5 transition-colors"
              >✕</button>
            </span>
          )}

          {/* Nút mở modal */}
          <button
            onClick={() => setShow(true)}
            className="px-2 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700
                       text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Chọn đoạn
          </button>
        </div>

        {/* Modal */}
        {show && (
          <div className="fixed inset-0 z-50 flex items-center justify-center
                          bg-black/60 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl
                            p-5 w-72 shadow-2xl">
              <h3 className="text-white font-semibold mb-1">Chọn đoạn luyện tập</h3>
              <p className="text-zinc-500 text-xs mb-4">
                Tổng {subtitles.length} câu
              </p>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1">
                  <label className="text-xs text-zinc-400 mb-1 block">Từ câu</label>
                  <input
                    type="number"
                    min={1}
                    max={subtitles.length}
                    value={rangeInput.from}
                    onChange={e => setRangeInput(v => ({ ...v, from: e.target.value }))}
                    placeholder="1"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800
                               border border-zinc-700 focus:border-blue-500
                               text-white text-sm outline-none"
                  />
                </div>
                <span className="text-zinc-500 mt-5">—</span>
                <div className="flex-1">
                  <label className="text-xs text-zinc-400 mb-1 block">Đến câu</label>
                  <input
                    type="number"
                    min={1}
                    max={subtitles.length}
                    value={rangeInput.to}
                    onChange={e => setRangeInput(v => ({ ...v, to: e.target.value }))}
                    placeholder={String(subtitles.length)}
                    className="w-full px-3 py-2 rounded-lg bg-zinc-800
                               border border-zinc-700 focus:border-blue-500
                               text-white text-sm outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShow(false)}
                  className="flex-1 py-2 rounded-lg bg-zinc-800
                             hover:bg-zinc-700 text-zinc-300 text-sm"
                >Huỷ</button>
                <button
                  onClick={applyRange}
                  className="flex-1 py-2 rounded-lg bg-blue-600
                             hover:bg-blue-500 text-white text-sm font-medium"
                >Luyện đoạn này</button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  // Banner theo source:
  const sourceBanner: Record<string, { bg: string; icon: string; label: string }> = {
    'youtube-cc': { 
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      icon: '✅', 
      label: 'Transcript thật từ YouTube CC' 
    },
    'gemini-video': { 
      bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      icon: '🎬', 
      label: 'Gemini đọc nội dung video thật' 
    },
    'error': { 
      bg: 'bg-red-500/10 border-red-500/20 text-red-400',
      icon: '❌', 
      label: 'Không thể trích xuất transcript' 
    },
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-hidden">

      {/* Zone A: Header & Controls */}
      <div className="flex-shrink-0 flex flex-col gap-3">
        {transcriptSource && (
          <div className={`flex items-center justify-between px-3 py-1.5 
                           rounded-lg text-xs border
                           ${sourceBanner[transcriptSource].bg}`}>
            <span>
              {sourceBanner[transcriptSource].icon}{' '}
              {sourceBanner[transcriptSource].label}
            </span>
            <span className="opacity-60">{subtitles.length} câu</span>
          </div>
        )}

        {showShortcuts && (
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-3 text-xs flex flex-col gap-2">
            <div className="flex justify-between items-center mb-1">
              <span className="font-medium text-zinc-300">⌨️ Phím tắt bàn phím</span>
              <button onClick={() => setShowShortcuts(false)} 
                      className="text-zinc-600 hover:text-zinc-300">✕</button>
            </div>
            {[
              ['Ctrl/Shift + Space', 'Phát/Tạm dừng'],
              ['Ctrl + R',           'Phát lại'],
              ['Enter',              'Kiểm tra'],
              ['Tab',                'Câu tiếp theo'],
              ['Shift + Tab',        'Câu trước'],
              ['Ctrl + H',           'Gợi ý dịch'],
              ['Esc',                'Ẩn video/chữ'],
              ['F1',                 'Bật/tắt shortcuts'],
            ].map(([key, desc]) => (
              <div key={key} className="flex justify-between items-center 
                                        text-zinc-500 hover:text-zinc-300">
                <span>{desc}</span>
                <kbd className="bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-mono">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
        )}

        {subtitles.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <RangeSelector />
            
            <button
              onClick={() => setShowSegmentModal(true)}
              disabled={sentences.length === 0 || isSentenceLoading}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSentenceLoading ? "Đang xử lý..." : activeSegment ? `Câu ${activeSegment.from}–${activeSegment.to}` : "Chọn đoạn"}
            </button>

            {/* Play button */}
            <button onClick={playLine}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                          text-white transition-all ml-auto
                          ${isPlaying 
                            ? 'bg-emerald-700 animate-pulse' 
                            : 'bg-emerald-600 hover:bg-emerald-500'}`}>
              <Volume2 size={16}/>
              {isPlaying ? 'Đang phát...' : 'Nghe lại'}
              {playCount > 0 && (
                <span className="bg-white/20 rounded-full px-1.5 py-0.5 text-xs">
                  {playCount}
                </span>
              )}
            </button>
            
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setShowShortcuts(s => !s)}
                className={`p-2 rounded-lg text-xs transition-colors flex items-center gap-1
                  ${showShortcuts 
                    ? 'bg-zinc-700 text-zinc-200' 
                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>
                ⌨️ 
                <span className="hidden sm:inline">Phím tắt</span>
                <kbd className="text-[10px] opacity-50">F1</kbd>
              </button>
              {/* Toggle dịch */}
              <button onClick={() => setShowTrans(s => !s)}
                className={`p-2 rounded-lg text-xs transition-colors flex items-center gap-1
                  ${showTrans 
                    ? 'bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/40' 
                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>
                <Languages size={14}/>
                <span className="hidden sm:inline">Dịch</span>
              </button>
              {/* Toggle xem chữ */}
              <button onClick={() => setShowText(s => !s)}
                className={`p-2 rounded-lg text-xs transition-colors flex items-center gap-1
                  ${showText 
                    ? 'bg-purple-600/20 text-purple-400 ring-1 ring-purple-500/40' 
                    : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}>
                {showText ? <Eye size={14}/> : <EyeOff size={14}/>}
                <span className="hidden sm:inline">Xem</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Zone B: Context (Translation, Original, Retry) */}
      <div className="flex-shrink-0 min-h-[2.5rem] flex flex-col gap-2">
        {/* Bản dịch */}
        {showTrans && (
          <div className="px-3 py-2 bg-blue-500/10 border border-blue-500/20 
                          rounded-xl text-blue-300 italic"
               style={{ fontSize: 'var(--font-size-trans)' }}>
            {current.translation}
          </div>
        )}

        {/* Chữ gốc (spoiler) */}
        {showText && current && (
          <div className={`px-4 py-3 rounded-xl border leading-relaxed
            ${isChinese 
              ? 'bg-red-500/10 border-red-500/20 text-red-200 tracking-widest' 
              : 'bg-purple-500/10 border-purple-500/20 text-purple-200'}`}
               style={{ fontSize: 'var(--font-size-main)' }}>
            {isChinese ? (
              (() => {
                const tokens = current.text.split('');
                return tokens.map((char, i) => (
                  <span
                    key={i}
                    onClick={(e) => handleWordClick(e, i, tokens, true)}
                    className="cursor-pointer hover:text-red-400 hover:bg-red-500/20 rounded px-0.5 transition-colors"
                  >
                    {char}
                  </span>
                ));
              })()
            ) : (
              (() => {
                const tokens = current.text.split(' ');
                return tokens.map((word, i) => (
                  <span
                    key={i}
                    onClick={(e) => handleWordClick(e, i, tokens, false)}
                    className="cursor-pointer hover:text-purple-400 hover:bg-purple-500/20 rounded px-1 transition-colors inline-block"
                  >
                    {word}{' '}
                  </span>
                ));
              })()
            )}
            <span className="ml-2 text-[10px] text-zinc-600">
              {Math.floor(current.startTime/60)}:{String(Math.floor(current.startTime%60)).padStart(2,'0')}
              {' → '}
              {Math.floor(current.endTime/60)}:{String(Math.floor(current.endTime%60)).padStart(2,'0')}
            </span>
          </div>
        )}
      </div>

      {/* Zone C: Input Box */}
      <div className="flex-shrink-0 flex flex-col gap-3">
        {/* Horizontal Sentence Picker */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => jumpToSentence(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <div 
            ref={scrollRef}
            className="flex-1 flex gap-2 overflow-x-auto scrollbar-none py-1 px-1"
          >
            {subtitles.map((s, i) => {
              const result = getSentenceResult(s.id)
              const isActive = i === currentIndex
              const score = scores[i] ?? null
              
              // Determine status color
              let statusClass = 'bg-zinc-800 text-zinc-400'
              if (isActive) {
                statusClass = 'bg-emerald-600 text-white'
              } else if (score === 100) {
                statusClass = 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30'
              } else if (score !== null) {
                statusClass = 'bg-yellow-900/40 text-yellow-400 border border-yellow-500/30'
              }

              return (
                <button
                  key={s.id}
                  data-active={isActive}
                  onClick={() => jumpToSentence(i)}
                  className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${statusClass}`}
                >
                  Câu: {i + 1}
                </button>
              )
            })}
          </div>

          <button
            onClick={() => jumpToSentence(Math.min(subtitles.length - 1, currentIndex + 1))}
            disabled={currentIndex === subtitles.length - 1}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-zinc-800 text-zinc-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="relative flex-shrink-0" style={{ height: '56px' }}>
          <input
            ref={inputRef}
            value={inputValue}
            onChange={e => {
              onInputChange(e.target.value)
              if (submitted) {
                setSubmitted(false)
                setResults([])
              }
            }}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (submitted) {
                  handleNext()
                } else {
                  handleSubmit()
                }
              }
            }}
            placeholder="Gõ câu bạn nghe được vào đây..."
            disabled={submitted && activeScore === 100}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            className={`w-full h-full rounded-xl px-4 py-3.5 text-base border
                       focus:outline-none focus:ring-2 transition-all
                       placeholder:text-zinc-600 bg-zinc-900
                       ${submitted && activeScore === 100
                         ? 'border-emerald-500/50 focus:ring-emerald-500 focus:border-emerald-500'
                         : submitted && activeScore < 100
                           ? 'border-yellow-500/50 focus:ring-yellow-500 focus:border-yellow-500'
                           : 'border-zinc-700 focus:ring-emerald-500 focus:border-emerald-500'}`}
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2
                          text-xs text-zinc-600 bg-zinc-800
                          px-1.5 py-0.5 rounded pointer-events-none">
            Enter ↵
          </kbd>
        </div>
      </div>

      {/* Zone D: Feedback Area */}
      <div className="flex-shrink-0" style={{ minHeight: '5rem' }}>
        <div className="flex flex-col gap-2">
          {submitted && results.some(r => !r.correct) && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-amber-400 text-sm flex items-center gap-1.5">
                  ⚠️ Incorrect
                </span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs 
                                     text-zinc-500 cursor-pointer select-none">
                    <input type="checkbox"
                      checked={showAnswerImmediately}
                      onChange={e => setShowAnswerImmediately(e.target.checked)}
                      className="w-3.5 h-3.5 accent-blue-500 rounded border-zinc-700 bg-zinc-800" />
                    Show answer immediately
                  </label>
                  <label className="flex items-center gap-1.5 text-xs 
                                     text-zinc-500 cursor-pointer select-none">
                    <input type="checkbox"
                      checked={showFullAnswer}
                      onChange={e => setShowFullAnswer(e.target.checked)}
                      className="w-3.5 h-3.5 accent-blue-500 rounded border-zinc-700 bg-zinc-800" />
                    Show full answer
                  </label>
                </div>
              </div>

              {showAnswerImmediately && (
                <div className="flex flex-col gap-2 p-3 bg-zinc-900/50 rounded-xl">
                  <div className="flex flex-wrap gap-x-1.5 gap-y-1 items-baseline px-1">
                    {results.filter(r => /[\u4e00-\u9fff\w]/.test(r.original)).map((r, i) => {
                      if (r.correct) {
                        return (
                          <span key={i} className="px-2 py-1 rounded-lg text-sm font-medium border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
                            {r.original}
                          </span>
                        )
                      }
                      return showFullAnswer ? (
                        <span key={i} className="px-2 py-1 rounded-lg text-sm font-medium border border-red-500/30 bg-red-500/15 text-red-400 underline decoration-red-400/50">
                          {r.original}
                        </span>
                      ) : (
                        <span key={i} className="px-2 py-1 rounded-lg text-sm font-medium border border-zinc-700 bg-zinc-800 text-zinc-600 font-mono tracking-widest">
                          {'*'.repeat(r.original.length)}
                        </span>
                      )
                    })}
                  </div>
                  
                  {/* Hint for the first wrong word */}
                  {!showFullAnswer && (() => {
                    const firstWrong = results.find(r => !r.correct)
                    if (firstWrong) {
                      return (
                        <div className="text-sm text-zinc-400 mt-1 px-1">
                          You can type: <span className="text-zinc-200 font-medium">{firstWrong.original}</span>
                        </div>
                      )
                    }
                    return null
                  })()}
                </div>
              )}
            </>
          )}

          {submitted && (
            <div className="flex items-center gap-3 mt-1">
              <span className={`text-2xl font-bold w-16 shrink-0
                ${activeScore >= 80 ? 'text-emerald-400' : 
                  activeScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {activeScore}%
              </span>
              <div className="flex-1 bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700
                  ${activeScore >= 80 ? 'bg-emerald-500' : 
                    activeScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${activeScore}%` }} />
              </div>
              <button 
                onClick={() => {
                  onInputChange('')
                  setResults([])
                  setSubmitted(false)
                  setTimeout(() => inputRef.current?.focus(), 50)
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 
                           underline flex items-center gap-1 shrink-0">
                <RotateCcw size={12}/> Gõ lại
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Zone E: Navigation Buttons */}
      <div className="flex-shrink-0 flex items-center justify-end pt-2 
                      border-t border-zinc-800 mt-auto">
        {submitted ? (
          <button onClick={handleNext}
            className="flex items-center gap-1 px-6 py-2.5 bg-emerald-600 
                       hover:bg-emerald-500 rounded-xl text-sm font-medium
                       text-white transition-colors">
            {isLast ? '🏁 Kết quả' : 'Câu tiếp theo'}
            <ChevronRight size={16}/>
          </button>
        ) : (
          <button onClick={handleSubmit}
            disabled={!inputValue.trim()}
            className="flex items-center gap-1 px-6 py-2.5 bg-zinc-700
                       hover:bg-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed
                       rounded-xl text-sm transition-colors">
            Kiểm tra đáp án <ChevronRight size={16}/>
          </button>
        )}
      </div>

      {/* Phím tắt hint */}
      <p className="text-[11px] text-zinc-700 text-center">
        Space: nghe lại · Enter: kiểm tra / tiếp · ← →: điều hướng
      </p>

      {showSegmentModal && (
        <SegmentModal
          total={sentences.length}
          from={segmentFrom}
          to={segmentTo}
          onFromChange={setSegmentFrom}
          onToChange={setSegmentTo}
          onConfirm={() => {
            setActiveSegment({ from: segmentFrom, to: segmentTo })
            setShowSegmentModal(false)
            onIndexChange(0)
            setSession(prev => ({ ...prev, results: {} }))
          }}
          onCancel={() => setShowSegmentModal(false)}
        />
      )}
    </div>
  )
}
