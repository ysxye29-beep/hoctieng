import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Mic, MicOff } from 'lucide-react'
import debounce from 'lodash/debounce'
import type { TranscriptLine } from '../../lib/transcriptExtractor'
import { useDictionaryContext } from '../../hooks/useDictionary'

// Mỗi token trong câu
interface WordToken {
  word: string        // từ gốc: "大家", "hello"
  phonetic?: string   // phiên âm: "dà jiā", "heh-loh"
  startTime?: number  // giây bắt đầu trong audio
  endTime?: number    // giây kết thúc
}

interface ShadowingSentence {
  id: string
  text: string
  tokens: WordToken[]
  translation: string  // bản dịch tiếng Việt
  startTime: number
  endTime: number
}

// Tạm thời fallback: tách text thành WordToken[]
function textToTokens(text: string): WordToken[] {
  // Tách theo từng từ (English) hoặc từng ký tự (Chinese)
  const isChinese = /[\u4e00-\u9fa5]/.test(text);
  
  if (isChinese) {
    return text.split('').filter(c => c.trim()).map(word => ({
      word,
      phonetic: undefined,
      startTime: undefined,
      endTime: undefined,
    }))
  }

  return (text.match(/\S+/g) ?? []).map(word => ({
    word,
    phonetic: undefined,
    startTime: undefined,
    endTime: undefined,
  }))
}

function WordCard({
  token,
  index,
  isActive,
  isPast,
  showPhonetic,
  onClick,
}: {
  token: WordToken
  index: number
  isActive: boolean
  isPast: boolean
  showPhonetic: boolean
  onClick?: (e: React.MouseEvent, index: number) => void
}) {
  return (
    <div 
      className={`flex flex-col items-center px-1.5 transition-all duration-150 cursor-pointer hover:bg-zinc-800/50 rounded-lg py-1
                     ${isActive ? 'scale-105' : ''}`}
      onClick={(e) => onClick && onClick(e, index)}
    >
      {/* Phiên âm */}
      {showPhonetic && (
        <span className={`text-xs mb-0.5 h-4 tracking-wide leading-none
                          ${isActive ? 'text-emerald-400 font-medium'
                            : isPast ? 'text-zinc-500' : 'text-zinc-600'}`}>
          {token.phonetic ?? ''}
        </span>
      )}

      {/* Từ gốc */}
      <span className={`font-bold leading-none transition-colors duration-150
                        ${isActive ? 'text-white'
                          : isPast ? 'text-zinc-400' : 'text-zinc-300'}`}
            style={{ fontSize: 'var(--font-size-main)' }}>
        {token.word}
      </span>

      {/* Gạch dưới active */}
      <div className={`mt-1 h-0.5 rounded-full transition-all duration-150
                       ${isActive ? 'bg-emerald-400 w-full' : 'bg-transparent w-0'}`} />
    </div>
  )
}

function findActiveIndex(subs: ShadowingSentence[], time: number, language: string): number {
  if (!subs.length) return 0
  
  const BUFFER = language.startsWith('zh') ? 0.5 : 0.3
  
  // Tìm câu đang trong range
  const activeIdx = subs.findIndex(l => 
    (l.startTime - BUFFER) <= time && time < (l.endTime + BUFFER)
  )
  if (activeIdx !== -1) return activeIdx
  
  // Nếu không tìm thấy: trả về câu gần nhất đã qua (không reset về 0)
  for (let i = subs.length - 1; i >= 0; i--) {
    if (subs[i].endTime <= time) return i
  }
  
  return 0
}

export default function ShadowingTab({ 
  youtubeId, language, videoTitle, channelName, ytCommand, subtitles,
  showPhonetic, showTranslation, currentTime, currentIndex, onIndexChange
}: { 
  youtubeId: string, language: string, videoTitle: string, channelName: string, ytCommand: (f: string, a?: unknown[]) => void,
  subtitles: TranscriptLine[],
  showPhonetic: boolean,
  showTranslation: boolean,
  currentTime: number,
  currentIndex: number,
  onIndexChange: (i: number) => void
}) {
  const [isRecording, setIsRecording] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  // ── Refs ──────────────────────────────────────────────
  const scrollTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const sentenceRefs    = useRef<(HTMLDivElement | null)[]>([])
  const subPanelRef = useRef<HTMLDivElement>(null)

  const { openDict } = useDictionaryContext()

  const sentences: ShadowingSentence[] = useMemo(() => subtitles.map(line => {
    let tokens = (line as any).tokens?.length ? (line as any).tokens : textToTokens(line.text)
    
    // Nếu có pinyin cho cả câu, thử gán vào tokens
    if (line.pinyin) {
      const pinyinParts = line.pinyin.split(/\s+/)
      if (pinyinParts.length === tokens.length) {
        tokens = tokens.map((t: WordToken, i: number) => ({ ...t, phonetic: pinyinParts[i] }))
      }
    }
    
    return {
      id: line.id.toString(),
      text: line.text,
      translation: line.translation,
      startTime: line.startTime ?? (line as any).start ?? 0,
      endTime: line.endTime ?? ((line as any).start + (line as any).duration) ?? 0,
      tokens
    }
  }), [subtitles, language])

  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleWordClick = (e: React.MouseEvent, index: number) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isChinese = language.startsWith('zh');
    const dictLang = isChinese ? 'zh' : 'en';
    
    clickCountRef.current = e.detail;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = setTimeout(() => {
      const count = clickCountRef.current;
      clickCountRef.current = 0;
      
      if (!activeSentence) return;
      const tokens = activeSentence.tokens;
      const takeCount = count; // 1 click -> 1 word, 2 clicks -> 2 words, etc.
      
      const phraseTokens = tokens.slice(index, index + takeCount);
      const phrase = phraseTokens.map(t => t.word).join(isChinese ? '' : ' ');
      
      if (phrase) {
        const videoInfo = {
          id: youtubeId,
          title: videoTitle,
          thumbnail: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
          timestamp: Math.floor(currentTime)
        };
        openDict(phrase, rect.left, rect.bottom, dictLang, 'shadowing', videoInfo);
      }
    }, 250);
  };

  const handleRightPanelWordClick = (e: React.MouseEvent, sentenceIndex: number, tokenIndex: number, tokens: string[]) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const isChinese = language.startsWith('zh');
    const dictLang = isChinese ? 'zh' : 'en';
    
    clickCountRef.current = e.detail;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    clickTimerRef.current = setTimeout(() => {
      const count = clickCountRef.current;
      clickCountRef.current = 0;
      
      const takeCount = count;
      const phraseTokens = tokens.slice(tokenIndex, tokenIndex + takeCount);
      const phrase = phraseTokens.join(isChinese ? '' : ' ');
      
      if (phrase) {
        const videoInfo = {
          id: youtubeId,
          title: videoTitle,
          thumbnail: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
          timestamp: Math.floor(currentTime)
        };
        openDict(phrase, rect.left, rect.bottom, dictLang, 'shadowing', videoInfo);
      }
    }, 250);
  };

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 0) {
        // Kiểm tra xem vùng chọn có nằm trong panel phụ đề không
        const isInsideSubPanel = subPanelRef.current?.contains(selection.anchorNode);
        if (!isInsideSubPanel) return;

        const isChinese = /[\u4e00-\u9fa5]/.test(text);
        const wordCount = isChinese ? text.length : text.split(/\s+/).length;
        
        // Chỉ tra nếu từ 1-5 từ/ký tự
        if (wordCount >= 1 && wordCount <= 5) {
          const dictLang = language.startsWith('zh') ? 'zh' : 'en';
          const videoInfo = {
            id: youtubeId,
            title: videoTitle,
            thumbnail: `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`,
            timestamp: Math.floor(currentTime)
          };
          openDict(text, e.clientX, e.clientY, dictLang, 'shadowing', videoInfo);
        }
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, [language, youtubeId, videoTitle, openDict]);

  // ── Scroll mượt ───────────────────────
  function scrollToIndex(index: number, instant = false) {
    if (scrollTimerRef.current) return
    scrollTimerRef.current = setTimeout(() => {
      sentenceRefs.current[index]?.scrollIntoView({
        behavior: instant ? 'instant' : 'smooth',
        block: 'center'
      })
      scrollTimerRef.current = null
    }, instant ? 0 : 100)
  }

  // Tự động cuộn khi currentIndex thay đổi từ bên ngoài
  useEffect(() => {
    scrollToIndex(currentIndex)
  }, [currentIndex])

  // ── Karaoke highlight từng từ ─────────────────────────
  // Tính progress trong câu hiện tại:
  function getWordProgress(sub: ShadowingSentence, time: number): number {
    if (!sub || sub.endTime <= sub.startTime) return 0
    
    const BUFFER = language.startsWith('zh') ? 0.5 : 0.3
    
    // Nếu time nằm trong khoảng buffer trước khi bắt đầu câu, progress = 0
    if (time < sub.startTime) return 0
    // Nếu time nằm trong khoảng buffer sau khi kết thúc câu, progress = 1
    if (time > sub.endTime) return 1
    
    const elapsed  = time - sub.startTime
    const duration = sub.endTime - sub.startTime
    return Math.max(0, Math.min(1, elapsed / duration))
  }

  const activeSentence = sentences[currentIndex] ?? null

  const startRecord = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mr = new MediaRecorder(stream)
    chunksRef.current = []
    mr.ondataavailable = e => chunksRef.current.push(e.data)
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      setAudioUrl(URL.createObjectURL(blob))
    }
    mr.start()
    mediaRef.current = mr
    setIsRecording(true)
  }

  const stopRecord = () => {
    mediaRef.current?.stop()
    setIsRecording(false)
  }

  if (subtitles.length === 0) {
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

  const underVideoContent = (
    <div className="bg-zinc-950 rounded-xl px-4 py-4 min-h-[120px] flex flex-col gap-3 mt-4">
      {activeSentence ? (
        <>
          {/* Hàng từng từ */}
          <div className="flex flex-wrap gap-x-3 gap-y-4 items-end">
            {(() => {
              const words = activeSentence.tokens;
              let activeWord = -1;
              if (currentTime < activeSentence.startTime) {
                activeWord = -1;
              } else if (currentTime > activeSentence.endTime) {
                activeWord = words.length;
              } else {
                const progress = getWordProgress(activeSentence, currentTime);
                activeWord = Math.min(Math.floor(progress * words.length), words.length - 1);
              }

              return words.map((token, i) => (
                <WordCard
                  key={`${activeSentence.id}-${i}`}
                  token={token}
                  index={i}
                  isActive={i === activeWord}
                  isPast={i < activeWord}
                  showPhonetic={showPhonetic}
                  onClick={handleWordClick}
                />
              ))
            })()}
          </div>

          {/* Bản dịch */}
          {showTranslation && (
            <p className="text-cyan-400 font-medium leading-relaxed border-t border-zinc-800 pt-3"
               style={{ fontSize: 'var(--font-size-trans)' }}>
              {activeSentence.translation}
            </p>
          )}
        </>
      ) : (
        <p className="text-sm text-zinc-600 text-center py-6">
          Nhấn play để bắt đầu...
        </p>
      )}
    </div>
  )

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Portal content under video */}
      {typeof document !== 'undefined' && document.getElementById('portal-under-video') && 
        createPortal(underVideoContent, document.getElementById('portal-under-video')!)
      }

      {/* ── PANEL PHỤ ĐỀ BÊN PHẢI ── */}
      <div
        ref={subPanelRef}
        className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-700 scroll-smooth"
        style={{ maxHeight: 'calc(100vh - 300px)' }}>
        <div className="flex flex-col gap-2 pb-20">
          {sentences.map((sub, i) => (
            <div
              key={sub.id}
              ref={el => { sentenceRefs.current[i] = el }}
              onClick={() => {
                // Click câu → seek video đến đúng vị trí:
                ytCommand('seekTo', [sub.startTime, true])
                ytCommand('playVideo')
                onIndexChange(i)
              }}
              className={`
                px-4 py-3 rounded-xl cursor-pointer
                transition-all duration-200 select-none
                ${i === currentIndex
                  ? 'bg-emerald-500/20 border-l-4 border-emerald-500'
                  : 'hover:bg-zinc-800/50 border-l-4 border-transparent'}
              `}>
              <div className={`font-medium leading-relaxed flex flex-wrap gap-x-1
                ${i === currentIndex ? 'text-white' : 'text-zinc-300'}`}
                style={{ fontSize: 'var(--font-size-main)' }}>
                {(() => {
                  const isChinese = language.startsWith('zh');
                  const tokens = isChinese ? sub.text.split('') : sub.text.split(' ');
                  return tokens.map((token, tokenIndex) => (
                    <span key={tokenIndex}>
                      <span
                        onClick={(e) => handleRightPanelWordClick(e, i, tokenIndex, tokens)}
                        className="cursor-pointer hover:text-emerald-400 hover:bg-emerald-500/10 rounded px-0.5 transition-colors"
                      >
                        {token}
                      </span>
                      {!isChinese && ' '}
                    </span>
                  ))
                })()}
              </div>
              {showTranslation && (
                <p className={`mt-0.5
                  ${i === currentIndex
                    ? 'text-emerald-300'
                    : 'text-zinc-500'}`}
                  style={{ fontSize: 'var(--font-size-trans)' }}>
                  {sub.translation}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── RECORDING CONTROLS ── */}
      <div className="flex flex-col items-center gap-3 py-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
        <button
          onClick={isRecording ? stopRecord : startRecord}
          className={`w-14 h-14 rounded-full flex items-center justify-center text-white font-bold transition-all
            ${isRecording 
              ? 'bg-red-500 animate-pulse shadow-lg shadow-red-500/30' 
              : 'bg-emerald-600 hover:bg-emerald-500'}`}>
          {isRecording ? <MicOff size={24}/> : <Mic size={24}/>}
        </button>
        <p className="text-[10px] text-zinc-500">
          {isRecording ? '🔴 Đang ghi âm... (click để dừng)' : 'Click để bắt đầu ghi âm'}
        </p>
        
        {audioUrl && (
          <div className="w-full px-4 flex flex-col gap-2">
            <audio controls src={audioUrl} className="w-full h-8" />
            <button onClick={() => setAudioUrl(null)}
              className="text-[10px] text-red-400 hover:text-red-300 self-center">
              🗑️ Xóa & ghi lại
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
