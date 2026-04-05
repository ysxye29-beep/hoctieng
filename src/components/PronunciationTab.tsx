import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Mic, ChevronLeft, ChevronRight, Play, RotateCcw, Pause, Volume2 } from 'lucide-react'
import { useEnPronunciation, type EnScore } from '../hooks/useEnPronunciation'
import { useZhPronunciation, type ZhScore } from '../hooks/useZhPronunciation'
import type { TranscriptLine } from '../lib/transcriptExtractor'
import { useDictionaryContext } from '../hooks/useDictionary'

interface PronunciationTabProps {
  subtitles: TranscriptLine[]
  language: string
  youtubeId: string
  videoTitle: string
  channelName: string
  currentIndex: number
  onIndexChange: (i: number) => void
  scores: Record<number, any>
  onScoresChange: (s: Record<number, any>) => void
  ytCommand: (func: string, args?: unknown[]) => void
  currentTime: number
}

export default function PronunciationTab({
  subtitles,
  language,
  youtubeId,
  videoTitle,
  channelName,
  currentIndex,
  onIndexChange,
  scores,
  onScoresChange,
  ytCommand,
  currentTime
}: PronunciationTabProps) {
  const en = useEnPronunciation()
  const zh = useZhPronunciation()

  const [autoPause, setAutoPause] = useState(() => {
    const saved = localStorage.getItem('pronunciation_auto_pause')
    return saved === null ? true : saved === 'true'
  })
  const [showPrompt, setShowPrompt] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentSentence = subtitles[currentIndex]
  const isZh = language?.startsWith('zh') || language === 'cn'
  const isEn = language?.startsWith('en') || language === 'us'

  const { openDict } = useDictionaryContext()
  const clickCountRef = useRef(0)
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const subPanelRef = useRef<HTMLDivElement>(null)

  const handleWordClick = (e: React.MouseEvent, index: number, tokens: string[]) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const dictLang = isZh ? 'zh' : 'en'
    
    clickCountRef.current = e.detail;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = setTimeout(() => {
      const count = clickCountRef.current;
      clickCountRef.current = 0;
      
      const takeCount = count;
      const phraseTokens = tokens.slice(index, index + takeCount)
      const phrase = phraseTokens.join(isZh ? '' : ' ')
      
      if (phrase) {
        const videoInfo = {
          id: youtubeId,
          title: videoTitle,
          thumbnail: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
          timestamp: Math.floor(currentSentence?.startTime || 0)
        };
        openDict(phrase, rect.left, rect.bottom, dictLang, 'pronunciation', videoInfo)
      }
    }, 250)
  }

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 0) {
        // Kiểm tra xem vùng chọn có nằm trong vùng phụ đề không
        const isInsideSubPanel = subPanelRef.current?.contains(selection.anchorNode);
        if (!isInsideSubPanel) return;

        const isChinese = /[\u4e00-\u9fa5]/.test(text);
        const wordCount = isChinese ? text.length : text.split(/\s+/).length;
        const dictLang = language?.startsWith('zh') || language === 'cn' ? 'zh' : 'en';
        
        if (wordCount >= 1 && wordCount <= 5) {
          const videoInfo = {
            id: youtubeId,
            title: videoTitle,
            thumbnail: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
            timestamp: Math.floor(currentSentence?.startTime || 0)
          };
          openDict(text, e.clientX, e.clientY, dictLang, 'pronunciation', videoInfo);
        }
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [language, youtubeId, videoTitle, currentSentence, openDict]);

  // EN Effect
  useEffect(() => {
    if (!currentSentence || !isEn) return
    
    en.getIpa(currentSentence.text)
    en.reset()
    
    const saved = scores[currentIndex]
    if (saved && en.setScore) {
      en.setScore(saved)
    }
  }, [currentIndex, currentSentence, isEn])

  // ZH Effect
  useEffect(() => {
    if (!currentSentence || !isZh) return
    
    zh.getPinyin(currentSentence.text)
    zh.reset()

    const saved = scores[currentIndex]
    if (saved && zh.setScore) {
      zh.setScore(saved)
    }
  }, [currentIndex, currentSentence, isZh])

  const handleMicClickEn = () => {
    if (!currentSentence) return
    
    if (en.isRecording) {
      en.stopAndScore(currentSentence.text).then(() => {
        if (en.score) {
          onScoresChange({ ...scores, [currentIndex]: en.score })
        }
      })
    } else {
      en.reset()
      en.startRecording(currentSentence.text)
    }
  }

  const handleMicClickZh = async () => {
    if (!currentSentence) return

    if (zh.isRecording) {
      await zh.stopAndScore(currentSentence.text)
      if (zh.score) {
        onScoresChange({ ...scores, [currentIndex]: zh.score })
      }
    } else {
      zh.reset()
      zh.startRecording()
    }
  }

  useEffect(() => {
    localStorage.setItem('pronunciation_auto_pause', String(autoPause))
  }, [autoPause])

  // Ẩn gợi ý khi video phát lại (dựa trên currentTime thay đổi hoặc isPlaying)
  useEffect(() => {
    if (currentTime > (currentSentence?.startTime || 0) + 0.1 && currentTime < (currentSentence?.endTime || 0)) {
      setShowPrompt(false)
    }
  }, [currentTime, currentSentence])

  const goNext = useCallback(() => {
    if (isEn) en.reset()
    if (isZh) zh.reset()
    setShowPrompt(false)
    onIndexChange(Math.min(currentIndex + 1, subtitles.length - 1))
  }, [currentIndex, subtitles.length, isEn, isZh, en, zh, onIndexChange])
  
  const goPrev = useCallback(() => {
    if (isEn) en.reset()
    if (isZh) zh.reset()
    setShowPrompt(false)
    onIndexChange(Math.max(currentIndex - 1, 0))
  }, [currentIndex, isEn, isZh, en, zh, onIndexChange])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      if (e.code === 'Space') {
        e.preventDefault()
        if (showPrompt) {
          goNext()
        } else {
          // Toggle play/pause đơn giản qua ytCommand
          // Vì player state được quản lý bởi YouTube, ta gửi lệnh toggle
          // Tuy nhiên ytCommand hiện tại chỉ nhận func và args cụ thể
          // Ta có thể dùng 'pauseVideo' hoặc 'playVideo'
          // Để biết trạng thái hiện tại, ta dựa vào isPlaying (local state)
          if (isPlaying) {
            ytCommand('pauseVideo')
            setIsPlaying(false)
          } else {
            ytCommand('playVideo')
            setIsPlaying(true)
          }
        }
      } else if (e.code === 'ArrowRight') {
        goNext()
      } else if (e.code === 'ArrowLeft') {
        goPrev()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [showPrompt, goNext, goPrev, isPlaying, ytCommand])

  const playLine = useCallback(() => {
    if (!currentSentence) return
    if (timerRef.current) clearTimeout(timerRef.current)

    const duration = (currentSentence.endTime - currentSentence.startTime) * 1000
    const pauseBuffer = 800 // Tăng buffer để tránh bị cắt câu
    
    ytCommand('seekTo', [currentSentence.startTime, true])
    
    setIsPlaying(true)

    // Chờ seek xong mới play
    setTimeout(() => {
      ytCommand('playVideo')
      
      timerRef.current = setTimeout(() => {
        ytCommand('pauseVideo')
        setIsPlaying(false)
      }, duration + pauseBuffer)
    }, 300)

  }, [currentSentence, ytCommand])

  // Tự động dừng khi đạt đến endTime + buffer
  useEffect(() => {
    if (autoPause && currentSentence && currentTime >= currentSentence.endTime + 0.3) {
      if (!showPrompt) {
        ytCommand('pauseVideo')
        setIsPlaying(false)
        setShowPrompt(true)
        if (timerRef.current) clearTimeout(timerRef.current)
      }
    }
  }, [autoPause, currentSentence, currentTime, ytCommand, showPrompt])

  // Tự động cuộn khi currentIndex thay đổi
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([])
  useEffect(() => {
    sentenceRefs.current[currentIndex]?.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    })
  }, [currentIndex])

  if (!isEn && !isZh) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-zinc-500">
        <Mic size={40} className="text-zinc-700"/>
        <p className="text-sm">Tính năng Phát âm AI</p>
        <p className="text-xs text-center text-zinc-600">
          Hiện tại chỉ hỗ trợ chấm điểm phát âm cho tiếng Anh và tiếng Trung.
        </p>
      </div>
    )
  }

  if (!currentSentence) return null

  const displayScore = isZh 
    ? (zh.score ?? scores[currentIndex] ?? null)
    : (en.score ?? scores[currentIndex] ?? null)

  const scoreColor = (v: number) =>
    v === 0       ? 'text-red-500'
    : v >= 85     ? 'text-emerald-400'
    : v >= 70     ? 'text-yellow-400'
    :               'text-red-400'

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 text-sm text-zinc-400">
        <div className="flex items-center gap-3">
          <span>Câu {currentIndex + 1} / {subtitles.length}</span>
          <button 
            onClick={() => setAutoPause(!autoPause)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-colors
              ${autoPause 
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
                : 'bg-zinc-800 border-zinc-700 text-zinc-500'}`}
          >
            {autoPause ? <Pause size={12} /> : <Play size={12} />}
            <span className="text-[10px] font-bold uppercase tracking-wider">
              Tự dừng: {autoPause ? 'BẬT' : 'TẮT'}
            </span>
          </button>
        </div>
        <div className="flex gap-2">
          <button onClick={goPrev} disabled={currentIndex === 0}
            className="p-1 hover:text-white disabled:opacity-30">
            <ChevronLeft size={20} />
          </button>
          <button onClick={goNext} disabled={currentIndex === subtitles.length - 1}
            className="p-1 hover:text-white disabled:opacity-30">
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div ref={subPanelRef} className="flex-1 overflow-y-auto">
        <div 
          ref={el => { sentenceRefs.current[currentIndex] = el }}
          className="p-4 bg-zinc-900 rounded-xl border border-zinc-800 mb-6"
        >
          <div className="flex justify-between items-start mb-2">
            <div className="text-zinc-200 leading-relaxed font-medium flex flex-wrap gap-x-1"
                 style={{ fontSize: 'var(--font-size-main)' }}>
              {(() => {
                const tokens = isZh ? currentSentence.text.split('') : currentSentence.text.split(' ')
                return tokens.map((token, i) => (
                  <span
                    key={i}
                    onClick={(e) => handleWordClick(e, i, tokens)}
                    className="cursor-pointer hover:text-emerald-400 hover:bg-emerald-500/10 rounded px-0.5 transition-colors"
                  >
                    {token}
                  </span>
                ))
              })()}
            </div>
            <button 
              onClick={playLine}
              className={`p-2 rounded-full transition-colors ${isPlaying ? 'bg-emerald-500 text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white'}`}
            >
              <Play size={16} fill={isPlaying ? "currentColor" : "none"} />
            </button>
          </div>
          
          {/* EN IPA */}
          {isEn && en.ipa && (
            <p className="text-sm text-zinc-400 font-mono mt-1 tracking-wide">
              {en.ipa}
            </p>
          )}

          {/* ZH Pinyin */}
          {isZh && (
            <div className="mt-1 min-h-[24px]">
              {zh.isPinyinLoading
                ? <div className="w-4 h-4 border-2 border-zinc-700
                                  border-t-red-400 rounded-full animate-spin"/>
                : zh.pinyin
                  ? <p className="text-base text-zinc-300 font-mono tracking-widest">
                      {zh.pinyin}
                    </p>
                  : null
              }
            </div>
          )}

          <p className="text-zinc-500 mt-2"
             style={{ fontSize: 'var(--font-size-trans)' }}>
            {currentSentence.translation}
          </p>

          {/* Practice Prompt */}
          <AnimatePresence>
            {showPrompt && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-4 pt-4 border-t border-zinc-800 flex flex-col items-center text-center gap-3"
              >
                <div className="flex flex-col items-center gap-1">
                  <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center animate-pulse mb-1">
                    <Mic className="text-emerald-400" size={24} />
                  </div>
                  <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">Hãy thử đọc lại câu này</p>
                </div>

                <div className="bg-black/40 p-3 rounded-xl border border-zinc-800 w-full">
                  {isZh && zh.pinyin && (
                    <p className="text-zinc-300 font-mono text-sm mb-1 tracking-widest">{zh.pinyin}</p>
                  )}
                  <p className="text-zinc-400 text-xs italic">"{currentSentence.translation}"</p>
                </div>

                <div className="flex gap-2 w-full">
                  <button 
                    onClick={playLine}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    <RotateCcw size={14} /> Nghe lại
                  </button>
                  <button 
                    onClick={goNext}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Câu tiếp <ChevronRight size={14} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center mb-6">
          {isEn && (
            <button
              onClick={handleMicClickEn}
              className={`flex flex-col items-center gap-1 transition-colors
                ${en.isRecording
                  ? 'text-red-400 animate-pulse'
                  : en.isScoring
                    ? 'text-yellow-400'
                    : 'text-zinc-400 hover:text-white'
                }`}>
              <span className="text-4xl mb-2">🎙</span>
              <span className="text-sm font-medium">
                {en.isRecording
                  ? 'Đang ghi... (nhấn để dừng)'
                  : en.isScoring
                    ? 'Đang chấm...'
                    : 'Kiểm tra phát âm'}
              </span>
            </button>
          )}

          {isZh && (
            <button
              onClick={handleMicClickZh}
              className={`flex flex-col items-center gap-1 transition-colors
                ${zh.isRecording
                  ? 'text-red-400 animate-pulse'
                  : zh.isScoring
                    ? 'text-yellow-400'
                    : 'text-zinc-400 hover:text-white'
                }`}>
              <span className="text-4xl mb-2">🎙</span>
              <span className="text-sm font-medium">
                {zh.isRecording
                  ? 'Đang ghi... (nhấn dừng)'
                  : zh.isScoring
                    ? 'Gemini đang chấm...'
                    : 'Kiểm tra phát âm'}
              </span>
            </button>
          )}
          
          {isEn && en.error && (
            <p className="text-xs text-red-400 text-center mt-2">⚠️ {en.error}</p>
          )}
          {isZh && zh.error && (
            <p className="text-xs text-red-400 text-center mt-2 whitespace-pre-line">⚠️ {zh.error}</p>
          )}
        </div>

        {displayScore && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">Tổng điểm</div>
                <div className={`text-xl font-bold ${scoreColor(displayScore.pronunciationScore)}`}>
                  {displayScore.pronunciationScore}
                </div>
              </div>
              <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">Độ chính xác</div>
                <div className={`text-xl font-bold ${scoreColor(displayScore.accuracy)}`}>
                  {displayScore.accuracy}
                </div>
              </div>
              <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">Độ trôi chảy</div>
                <div className={`text-xl font-bold ${scoreColor(displayScore.fluency)}`}>
                  {displayScore.fluency}
                </div>
              </div>
              <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                <div className="text-xs text-zinc-500 mb-1">Hoàn thành</div>
                <div className={`text-xl font-bold ${scoreColor(displayScore.completeness)}`}>
                  {displayScore.completeness}
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-900 rounded-xl border border-zinc-800">
              <h4 className="text-sm font-medium text-zinc-400 mb-2">Chi tiết từng từ</h4>
              
              {/* EN Word Results */}
              {isEn && displayScore.wordResults && (
                <div className="flex flex-wrap gap-1.5">
                  {displayScore.wordResults.map((w: any, i: number) => (
                    <span key={i}
                      className={`px-2 py-0.5 rounded-lg text-sm font-medium
                        ${w.correct
                          ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700'
                          : 'bg-red-900/50 text-red-300 border border-red-700'
                        }`}>
                      {w.word}
                    </span>
                  ))}
                </div>
              )}

              {/* ZH Char Results */}
              {isZh && displayScore.charResults && displayScore.charResults.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {displayScore.charResults.map((c: any, i: number) => (
                    <div key={i}
                      className={`flex flex-col items-center px-2 py-1.5
                        rounded-xl border text-center min-w-[44px]
                        ${c.correct
                          ? 'bg-emerald-900/50 border-emerald-700'
                          : 'bg-red-900/50 border-red-700'
                        }`}>
                      <span className={`text-xl font-bold
                        ${c.correct ? 'text-emerald-300' : 'text-red-300'}`}>
                        {c.char}
                      </span>
                      {c.pinyin && (
                        <span className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                          {c.pinyin}
                        </span>
                      )}
                      {!c.correct && c.spokenPinyin && (
                        <span className="text-[10px] text-red-500 line-through">
                          {c.spokenPinyin}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              
              {displayScore.transcript && (
                <p className="text-xs text-zinc-500 mt-4 italic leading-relaxed border-t border-zinc-800 pt-3">
                  Bạn nói: "{displayScore.transcript}"
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
