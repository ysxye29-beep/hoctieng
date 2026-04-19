import { useParams, useLocation, useNavigate } from 'react-router-dom'
import { useRef, useState, useEffect } from 'react'
import { ArrowLeft, Volume2, VolumeX, Mic, MicOff, 
         Pencil, HelpCircle, FileText, Settings, Eye, EyeOff } from 'lucide-react'
import { getVideos } from '../lib/storage'
import type { VideoItem } from '../lib/storage'
import DictationTab from '../components/watch/DictationTab'
import ShadowingTab from '../components/tabs/ShadowingTab'
import PronunciationTab from '../components/PronunciationTab'
import { useVideoAnalysis } from '../hooks/useVideoAnalysis'
import type { TranscriptLine, TranscriptSource, DictationSession } from '../lib/transcriptExtractor'

import { useFontSizeStore } from '../store/fontSizeStore'

// ─── TYPES ───────────────────────────────────────────
type TabId = 'shadowing' | 'pronunciation' | 'dictation' | 'quiz' | 'summary'

function LoadingScreen({ step }: { step: string }) {
  const steps = [
    'Tìm phụ đề YouTube CC...',
    'Gemini AI đang đọc video...',
    'Đang xử lý kết quả...',
    'Dịch sang tiếng Việt...',
  ]

  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-3xl animate-bounce">📄</div>
      <p className="text-sm font-medium text-zinc-200">
        Đang trích xuất nội dung video...
      </p>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {steps.map(s => (
          <div key={s} className="flex items-center gap-2">
            <span className="text-sm">
              {s === step ? '⏳' :
               steps.indexOf(s) < steps.indexOf(step)
                 ? '✅' : '⬜'}
            </span>
            <span className={`text-xs ${
              s === step
                ? 'text-white font-medium'
                : steps.indexOf(s) < steps.indexOf(step)
                  ? 'text-zinc-600 line-through'
                  : 'text-zinc-600'
            }`}>{s}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-zinc-600 text-center mt-2">
        Chỉ phân tích 1 lần · lần sau tải ngay ⚡
      </p>
    </div>
  )
}

// ─── COMPONENT ───────────────────────────────────────
export default function WatchPage() {
  const { youtubeId } = useParams<{ youtubeId: string }>()
  const { state } = useLocation()
  const navigate = useNavigate()
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Tìm video data
  const video: VideoItem | undefined = 
    state?.video ?? getVideos().find(v => v.youtubeId === youtubeId)

  const [activeTab, setActiveTab] = useState<TabId>('shadowing')
  const [speed, setSpeed] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [hideVideo, setHideVideo] = useState(false)

  const [showPhonetic, setShowPhonetic] = useState(true)
  const [showTranslation, setShowTranslation] = useState(true)

  const [currentTime, setCurrentTime] = useState(0)
  const isPlayingRef = useRef(false)
  const speedRef = useRef(1)

  // Tiến độ chung cho các tab (dùng chung index)
  const [currentIndex, setCurrentIndex] = useState(0)

  // Tiến độ Dictation (vẫn giữ riêng vì có logic session)
  const [dictationSession, setDictationSession] = useState<DictationSession>({
    results: {},
    currentIndex: 0,
    rangeMode: null,
  })
  const [dictationScores, setDictationScores] = useState<number[]>([])
  const [dictationFinished, setDictationFinished] = useState(false)
  const [dictationInput, setDictationInput] = useState('')

  // Tiến độ Pronunciation scores (giữ riêng scores nhưng dùng chung currentIndex)
  const [pronScores, setPronScores] = useState<Record<number, any>>({})
  
  const videoLanguage = video?.language ?? 'en'

  const { 
    lines: subtitles, 
    source: transcriptSource, 
    isLoading: isAnalyzing, 
    step 
  } = useVideoAnalysis(youtubeId ?? '', videoLanguage)

  // ── Refs cho time tracking ──
  const lastKnownTimeRef = useRef(0)
  const lastKnownWallRef = useRef(0)   // performance.now() khi lần cuối biết currentTime
  const rafRef = useRef<number | null>(null)

  const isMountedRef = useRef(true)

  // ── Lắng nghe YouTube postMessage ──
  useEffect(() => {
    isMountedRef.current = true
    const onMessage = (e: MessageEvent) => {
      try {
        const raw = e.data
        const data = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!data || typeof data !== 'object') return

        // Nhận currentTime từ YouTube (bất kỳ event nào có info.currentTime)
        const info = data.info ?? {}
        
        if (data.event === 'infoDelivery') {
          if (typeof info.playerState === 'number') {
            const playing = info.playerState === 1
            isPlayingRef.current = playing
            if (!playing) lastKnownWallRef.current = 0
          }
          if (typeof info.currentTime === 'number' && info.currentTime > 0) {
            lastKnownTimeRef.current = info.currentTime
            lastKnownWallRef.current = performance.now()
            if (isMountedRef.current) setCurrentTime(info.currentTime)
          }
        }

        if (data.event === 'onStateChange') {
          const state = typeof data.info === 'number' ? data.info : info?.playerState
          if (typeof state === 'number') {
            const playing = state === 1
            isPlayingRef.current = playing
            if (!playing) {
              lastKnownWallRef.current = 0
            } else {
              // Khi bắt đầu play: đánh dấu wall clock để RAF bắt đầu nội suy
              lastKnownWallRef.current = performance.now()
            }
          }
        }
      } catch { /* ignore */ }
    }

    window.addEventListener('message', onMessage)

    // Detect play/pause qua window blur/focus:
    // Khi user click vào iframe → window blur → có thể đang play
    // Khi click ra ngoài iframe → window focus lại
    let blurTimeout: any = null
    const onWindowBlur = () => {
      if (document.activeElement?.tagName === 'IFRAME') {
        // User click vào iframe - toggle play state sau 300ms
        blurTimeout = setTimeout(() => {
          if (document.activeElement?.tagName === 'IFRAME') {
            // Nếu chưa nhận được onStateChange, tự toggle
            const wasPlaying = isPlayingRef.current
            isPlayingRef.current = !wasPlaying
            if (!wasPlaying) {
              // Bắt đầu play
              lastKnownWallRef.current = performance.now()
            } else {
              // Pause
              // Lưu lại thời gian hiện tại
              if (lastKnownWallRef.current > 0) {
                const elapsed = (performance.now() - lastKnownWallRef.current) / 1000
                lastKnownTimeRef.current = lastKnownTimeRef.current + elapsed * speedRef.current
              }
              lastKnownWallRef.current = 0
            }
          }
        }, 300)
      }
    }
    window.addEventListener('blur', onWindowBlur)
    const subscribe = () => {
      iframeRef.current?.contentWindow?.postMessage(
        JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'
      )
    }
    subscribe()
    const t1 = setTimeout(subscribe, 1000)
    const t2 = setTimeout(subscribe, 2000)
    const t3 = setTimeout(subscribe, 4000)
    const keepAlive = setInterval(subscribe, 5000)

    return () => {
      isMountedRef.current = false
      window.removeEventListener('message', onMessage)
      window.removeEventListener('blur', onWindowBlur)
      if (blurTimeout) clearTimeout(blurTimeout)
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3)
      clearInterval(keepAlive)
    }
  }, [youtubeId])

  // ── RAF: nội suy currentTime 60fps ──
  // Khi YouTube gửi currentTime (vài giây/lần), RAF tự nội suy ở giữa
  // Khi YouTube KHÔNG gửi gì (trường hợp phổ biến), RAF tự đếm từ lastKnownTime
  useEffect(() => {
    const tick = () => {
      if (!isMountedRef.current) return
      if (isPlayingRef.current && lastKnownWallRef.current > 0) {
        const elapsedSec = (performance.now() - lastKnownWallRef.current) / 1000
        const interpolated = lastKnownTimeRef.current + elapsedSec * speed
        setCurrentTime(interpolated)
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [speed])

  // Tự động cập nhật currentIndex dựa trên currentTime khi đang phát
  useEffect(() => {
    if (!isPlayingRef.current || subtitles.length === 0) return

    let newIndex = subtitles.findIndex(s => {
      const start = s.startTime ?? (s as any).start ?? 0;
      const end = s.endTime ?? (start + ((s as any).duration ?? 0));
      return currentTime >= start - 0.5 && currentTime < end + 0.5;
    })

    if (newIndex === -1) {
      for (let i = subtitles.length - 1; i >= 0; i--) {
        const s = subtitles[i];
        const start = s.startTime ?? (s as any).start ?? 0;
        if (start <= currentTime) {
          newIndex = i;
          break;
        }
      }
    }

    if (newIndex === -1 && subtitles.length > 0) {
      newIndex = 0;
    }
    
    if (newIndex !== -1 && newIndex !== currentIndex) {
      setCurrentIndex(newIndex)
    }
  }, [currentTime, subtitles, currentIndex])

  const { settings, updateSettings } = useFontSizeStore()
  const isChinese = videoLanguage?.startsWith('zh') || videoLanguage === 'cn'

  const mainSize = isChinese ? settings.zhMain : settings.enMain
  const transSize = isChinese ? settings.zhTrans : settings.enTrans

  const handleMainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value)
    if (isChinese) updateSettings({ zhMain: val })
    else updateSettings({ enMain: val })
  }

  const handleTransChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value)
    if (isChinese) updateSettings({ zhTrans: val })
    else updateSettings({ enTrans: val })
  }

  useEffect(() => {
    if (!youtubeId) return

    // Reset tiến độ khi đổi video mới
    setCurrentTime(0)
    setCurrentIndex(0)
    setDictationSession({ results: {}, currentIndex: 0, rangeMode: null })
    setDictationScores([])
    setDictationFinished(false)
    setDictationInput('')
    setPronScores({})
  }, [youtubeId])

  useEffect(() => {
    if (activeTab === 'dictation') {
      setTimeout(() => ytCommand('pauseVideo'), 300)
    }
  }, [activeTab])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && activeTab === 'dictation') {
        setHideVideo(h => !h)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [activeTab])

  // Nếu không tìm thấy video
  if (!video || !youtubeId) {
    return (
      <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center gap-4 text-zinc-400">
        <p className="text-xl">Không tìm thấy video</p>
        <button onClick={() => navigate('/')}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500">
          ← Quay lại
        </button>
      </div>
    )
  }

  // YouTube postMessage helpers
  const ytCommand = (func: string, args?: unknown[]) => {
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args: args ?? [] }), '*'
    )
  }

  const handleSpeed = (rate: number) => {
    setSpeed(rate)
    speedRef.current = rate
    ytCommand('setPlaybackRate', [rate])
  }

  const handleMute = () => {
    setIsMuted(m => !m)
    ytCommand(isMuted ? 'unMute' : 'mute')
  }

  // Tabs config
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'shadowing',    label: 'Shadowing',      icon: <Volume2 size={15}/> },
    { id: 'pronunciation',label: 'Phát âm',         icon: <Mic size={15}/> },
    { id: 'dictation',    label: 'Chép chính tả',  icon: <Pencil size={15}/> },
    { id: 'quiz',         label: 'Bài tập',         icon: <HelpCircle size={15}/> },
    { id: 'summary',      label: 'Tóm tắt',         icon: <FileText size={15}/> },
  ]

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-200 flex flex-col"
         style={{
           '--font-size-main': `${mainSize}px`,
           '--font-size-trans': `${transSize}px`,
         } as React.CSSProperties}>
      
      {/* ── HEADER ── */}
      <header className="h-14 border-b border-zinc-800 flex items-center px-4 gap-3 sticky top-0 bg-[#121212]/95 backdrop-blur z-10">
        <button onClick={() => navigate('/')}
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <span className="flex-1 font-medium truncate text-sm">{video.title}</span>
        <button onClick={handleMute}
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors">
          {isMuted ? <VolumeX size={18}/> : <Volume2 size={18}/>}
        </button>
      </header>

      {/* ── MAIN: 2 cột ── */}
      <div className="flex flex-1 flex-col lg:flex-row overflow-hidden">

        {/* ── CỘT TRÁI: Player ── */}
        <div className="lg:w-[58%] flex flex-col gap-3 p-4 border-r border-zinc-800">
          
          {/* YouTube iframe */}
          <div
            className={`rounded-xl overflow-hidden bg-black transition-all duration-300
              ${hideVideo && activeTab === 'dictation' ? 'h-0 opacity-0' : 'h-auto opacity-100'}`}
            onClick={() => {
              // Khi user click vào vùng video → toggle isPlayingRef
              // vì sau khi click vào iframe, window mất focus → dùng để detect
              setTimeout(() => {
                if (document.activeElement?.tagName !== 'IFRAME') return
                // Nếu đang focus vào iframe = user vừa click play
                isPlayingRef.current = !isPlayingRef.current
                if (isPlayingRef.current) {
                  lastKnownWallRef.current = performance.now()
                } else {
                  lastKnownWallRef.current = 0
                }
              }, 200)
            }}
          >
            <iframe
              ref={iframeRef}
              src={`https://www.youtube.com/embed/${youtubeId}?enablejsapi=1&rel=0&modestbranding=1&origin=${window.location.origin}`}
              className="w-full aspect-video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
              allowFullScreen
              onLoad={() => {
                const sub = () => iframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*'
                )
                sub(); setTimeout(sub, 500); setTimeout(sub, 1500); setTimeout(sub, 3000)
              }}
            />
          </div>

          {/* Portal target for tab-specific content under video */}
          <div id="portal-under-video" />

          {/* Speed controls */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Tốc độ:</span>
            {[0.5, 0.75, 1, 1.25, 1.5].map(r => (
              <button key={r}
                onClick={() => handleSpeed(r)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors
                  ${speed === r 
                    ? 'bg-emerald-600 text-white' 
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                {r}x
              </button>
            ))}
            
            {activeTab === 'dictation' && (
              <button onClick={() => setHideVideo(h => !h)}
                className="ml-auto flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                {hideVideo ? <Eye size={14}/> : <EyeOff size={14}/>}
                {hideVideo ? 'Hiện video' : 'Ẩn video'}
                <kbd className="text-[10px] bg-zinc-800 px-1 rounded ml-1">Esc</kbd>
              </button>
            )}
          </div>

          {/* Video info */}
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <span className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
              {video.channel?.[0] ?? 'C'}
            </span>
            <span>{video.channel}</span>
            <span className="ml-auto px-2 py-0.5 bg-zinc-800 rounded text-xs">
              {video.language === 'zh-CN' ? '🇨🇳 Giản thể' : 
               video.language === 'zh-TW' ? '🇹🇼 Phồn thể' :
               video.language === 'ja' ? '🇯🇵 Tiếng Nhật' :
               video.language === 'ko' ? '🇰🇷 Tiếng Hàn' : '🇺🇸 Tiếng Anh'}
            </span>
          </div>
        </div>

        {/* ── CỘT PHẢI: Panel học ── */}
        <div className="lg:w-[42%] flex flex-col">
          
          {/* Tab bar */}
          <div className="flex border-b border-zinc-800 overflow-x-auto">
            {tabs.map(tab => (
              <button key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2
                  ${activeTab === tab.id
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'shadowing' && (
              isAnalyzing ? <LoadingScreen step={step} /> :
              <ShadowingTab 
                youtubeId={youtubeId}
                language={videoLanguage}
                videoTitle={video?.title ?? ''}
                channelName={video?.channel ?? ''}
                ytCommand={ytCommand} 
                subtitles={subtitles}
                showPhonetic={showPhonetic}
                showTranslation={showTranslation}
                currentTime={currentTime}
                currentIndex={currentIndex}
                onIndexChange={setCurrentIndex}
              />
            )}
            
            <div className={activeTab === 'pronunciation' ? 'block' : 'hidden'}>
              {!isAnalyzing && subtitles.length > 0
                ? <PronunciationTab 
                    isActive={activeTab === 'pronunciation'}
                    subtitles={subtitles}
                    currentIndex={currentIndex}
                    onIndexChange={(idx) => {
                      setCurrentIndex(idx)
                      const sub = subtitles[idx]
                      if (sub) {
                        ytCommand('seekTo', [sub.startTime, true])
                        ytCommand('playVideo')
                      }
                    }}
                    scores={pronScores}
                    onScoresChange={setPronScores}
                    youtubeId={youtubeId}
                    videoTitle={video?.title ?? ''}
                    channelName={video?.channel ?? ''}
                    language={videoLanguage}
                    ytCommand={ytCommand}
                    currentTime={currentTime}
                  />
                : activeTab === 'pronunciation' && isAnalyzing
                  ? <LoadingScreen step={step} />
                  : null
              }
            </div>

            <div className={activeTab === 'dictation' ? 'block' : 'hidden'}>
              {isAnalyzing ? <LoadingScreen step={step} /> :
              <DictationTab 
                isActive={activeTab === 'dictation'}
                youtubeId={youtubeId}
                language={videoLanguage}
                videoTitle={video?.title ?? ''}
                channelName={video?.channel ?? ''}
                ytCommand={ytCommand}
                subtitles={subtitles}
                transcriptSource={transcriptSource}
                session={dictationSession}
                setSession={setDictationSession}
                scores={dictationScores}
                setScores={setDictationScores}
                finished={dictationFinished}
                setFinished={setDictationFinished}
                inputValue={dictationInput}
                onInputChange={setDictationInput}
                currentIndex={dictationSession.currentIndex}
                onIndexChange={(idx) => setDictationSession(prev => ({ ...prev, currentIndex: idx }))}
                playbackRate={speed}
                currentTime={currentTime}
              />}
            </div>
            {activeTab === 'quiz' && <QuizTab />}
          </div>

          {/* ── BOTTOM CONTROLS (Toggles & Font Size) ── */}
          <div className="flex flex-col gap-3 px-4 py-3 border-t border-zinc-800 bg-[#121212]">
            <div className="flex items-center gap-4">
              {[
                { label: 'Phụ đề',    state: showPhonetic,    setter: setShowPhonetic },
                { label: 'Bản dịch',  state: showTranslation, setter: setShowTranslation },
              ].map(({ label, state, setter }) => (
                <button
                  key={label}
                  onClick={() => setter(v => !v)}
                  className={`flex items-center gap-1.5 text-xs px-3 py-1.5
                              rounded-full transition-colors border
                              ${state
                                ? 'bg-zinc-700 border-zinc-600 text-zinc-200'
                                : 'bg-transparent border-zinc-800 text-zinc-600'}`}>
                  {label}
                </button>
              ))}
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-4 text-center">{isChinese ? '中' : 'A'}</span>
                <input 
                  type="range" 
                  min="12" max="48" step="1" 
                  value={mainSize} 
                  onChange={handleMainChange}
                  className="flex-1 accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-lg text-zinc-400 w-6 text-center">{isChinese ? '中' : 'A'}</span>
                <span className="text-xs text-zinc-500 w-8 text-right">{mainSize}px</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 w-4 text-center">V</span>
                <input 
                  type="range" 
                  min="12" max="48" step="1" 
                  value={transSize} 
                  onChange={handleTransChange}
                  className="flex-1 accent-emerald-500 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-lg text-zinc-400 w-6 text-center">V</span>
                <span className="text-xs text-zinc-500 w-8 text-right">{transSize}px</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TAB COMPONENTS (placeholder, sẽ implement chi tiết sau) ─────

function QuizTab() {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [submitted, setSubmitted] = useState(false)

  const questions = [
    { q: "Video này thuộc thể loại gì?", options: ["Podcast", "Phim", "Tin tức", "Vlog"], correct: "Podcast" },
    { q: "Nội dung chính của video là gì?", options: ["Học tiếng Trung", "Du lịch", "Nấu ăn", "Thể thao"], correct: "Học tiếng Trung" },
    { q: "Bạn đã hiểu bao nhiêu % nội dung?", options: ["25%", "50%", "75%", "100%"], correct: "" },
  ]

  const score = submitted 
    ? questions.filter((q, i) => q.correct && answers[i] === q.correct).length
    : 0

  return (
    <div className="flex flex-col gap-5">
      {questions.map((q, i) => (
        <div key={`section-${i}`} className="flex flex-col gap-2">
          <p className="font-medium text-zinc-300"
             style={{ fontSize: 'var(--font-size-main)' }}>
            {i + 1}. {q.q}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {q.options.map(opt => {
              const isSelected = answers[i] === opt
              const isCorrect = submitted && opt === q.correct
              const isWrong = submitted && isSelected && opt !== q.correct
              return (
                <button key={opt}
                  disabled={submitted}
                  onClick={() => setAnswers(a => ({ ...a, [i]: opt }))}
                  className={`px-3 py-2 rounded-lg text-sm text-left transition-colors border
                    ${isCorrect ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300' :
                      isWrong ? 'bg-red-500/20 border-red-500 text-red-300' :
                      isSelected ? 'bg-zinc-700 border-zinc-500 text-white' :
                      'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}>
                  {opt}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      {!submitted ? (
        <button
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length < questions.length}
          className="mt-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40
                     disabled:cursor-not-allowed text-white rounded-xl text-sm font-medium transition-colors">
          Nộp bài
        </button>
      ) : (
        <div className="text-center py-4 flex flex-col gap-2">
          <p className="text-2xl">🎉</p>
          <p className="font-medium text-emerald-400">
            Điểm: {score}/{questions.filter(q => q.correct).length}
          </p>
          <button onClick={() => { setAnswers({}); setSubmitted(false) }}
            className="text-sm text-zinc-500 hover:text-zinc-300 underline">
            Làm lại
          </button>
        </div>
      )}
    </div>
  )
}
