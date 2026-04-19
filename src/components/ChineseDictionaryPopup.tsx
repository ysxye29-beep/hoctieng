import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Volume2, Bookmark, BookmarkCheck, Minus, Plus, GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { lookupChinese, lookupEnglish, DictResult } from '../lib/dictionary';
import { useVocabularyStore } from '../store/vocabularyStore';
import { useFontSizeStore } from '../store/fontSizeStore';

interface DictionaryPopupProps {
  isOpen: boolean;
  word: string;
  x: number;
  y: number;
  onClose: () => void;
  source?: 'shadowing' | 'dictation' | 'pronunciation' | 'summary' | 'manual';
  videoInfo?: {
    id: string;
    title: string;
    thumbnail: string;
    timestamp: number;
  };
}

// Hàm hỗ trợ lấy màu sắc cho từ loại
const getPosColor = (pos: string) => {
  const lower = pos.toLowerCase();
  if (lower.includes('danh')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (lower.includes('động')) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (lower.includes('tính')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (lower.includes('phó')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  if (lower.includes('lượng')) return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
  if (lower.includes('đại')) return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30';
  if (lower.includes('noun')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  if (lower.includes('verb')) return 'bg-red-500/20 text-red-400 border-red-500/30';
  if (lower.includes('adj')) return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
  if (lower.includes('adv')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
  return 'bg-zinc-700 text-zinc-300 border-zinc-600';
};

export default function ChineseDictionaryPopup({
  isOpen, word, x, y, onClose, source = 'manual', videoInfo
}: DictionaryPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<DictResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const { zhWords, addWord, removeWord } = useVocabularyStore();
  const { settings, updateSettings } = useFontSizeStore();
  
  // Safe defaults to avoid NaN from legacy storage
  const dictSize = settings.dictSize ?? 100;
  const dictWidth = settings.dictWidth ?? 340;
  const dictHeight = settings.dictHeight ?? 500;
  
  const isSaved = result ? zhWords.some(w => w.word === result.word) : false;

  const handleSaveToggle = () => {
    if (!result) return;
    if (isSaved) {
      const savedWord = zhWords.find(w => w.word === result.word);
      if (savedWord) removeWord(savedWord.id, 'zh');
    } else {
      addWord({
        language: 'zh',
        word: result.word,
        traditional: result.traditional,
        pinyin: result.phonetic,
        phonetic: result.phonetic,
        meaning: result.definitions.join('; '),
        partOfSpeech: result.partOfSpeech,
        examples: result.examples,
        source: source,
        source_video_id: videoInfo?.id,
        source_video_title: videoInfo?.title,
        source_video_thumbnail: videoInfo?.thumbnail,
        source_timestamp: videoInfo?.timestamp
      });
    }
  };

  const handleZoom = (delta: number) => {
    const newSize = Math.max(70, Math.min(150, dictSize + delta));
    updateSettings({ dictSize: newSize });
  };

  const startResizing = (e: React.MouseEvent, direction: 'w' | 'h' | 'both') => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    
    const startX = e.pageX;
    const startY = e.pageY;
    const startWidth = dictWidth;
    const startHeight = dictHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.pageX - startX;
      const deltaY = moveEvent.pageY - startY;
      
      const newSettings: any = {};
      if (direction === 'w' || direction === 'both') {
        newSettings.dictWidth = Math.max(300, Math.min(800, startWidth + deltaX));
      }
      if (direction === 'h' || direction === 'both') {
        newSettings.dictHeight = Math.max(300, Math.min(1000, startHeight + deltaY));
      }
      
      updateSettings(newSettings);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    const lookup = async (searchWord: string) => {
      if (!searchWord.trim()) return;
      setLoading(true);
      setError(false);
      setResult(null);

      const isChinese = /[\u4e00-\u9fff]/.test(searchWord);
      const res = isChinese 
        ? await lookupChinese(searchWord)
        : await lookupEnglish(searchWord);

      if (res) {
        setResult(res);
      } else {
        setError(true);
      }
      setLoading(false);
    };

    if (isOpen && word) {
      lookup(word);
    }
  }, [isOpen, word]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node) && !isResizing) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose, isResizing]);

  if (!isOpen) return null;

  const initialLeft = Math.min(x + 12, window.innerWidth - dictWidth - 12);
  const initialTop = y + dictHeight > window.innerHeight ? Math.max(y - dictHeight - 8, 8) : y + 20;

  const scaling = dictSize / 100;

  return (
    <AnimatePresence>
      <motion.div
        ref={popupRef}
        drag={!isResizing} // Disable drag while resizing
        dragMomentum={false}
        initial={{ top: initialTop, left: initialLeft, opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed z-[100] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{ 
          fontSize: `${scaling}rem`,
          width: dictWidth,
          height: dictHeight,
        }}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md cursor-grab active:cursor-grabbing group shrink-0">
          <div className="flex items-center gap-2">
            <GripVertical size={14} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Từ điển</span>
          </div>
          
          <div className="flex items-center gap-1">
            {/* Zoom Controls */}
            <div className="flex items-center bg-zinc-800 rounded-lg mr-2 p-0.5 border border-zinc-700/50">
              <button 
                onClick={(e) => { e.stopPropagation(); handleZoom(-10); }}
                className="p-1 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded transition-colors"
                title="Phóng nhỏ"
              >
                <Minus size={12} />
              </button>
              <span className="text-[10px] font-mono w-8 text-center text-zinc-500 select-none">
                {dictSize}%
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); handleZoom(10); }}
                className="p-1 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded transition-colors"
                title="Phóng to"
              >
                <Plus size={12} />
              </button>
            </div>

            {result && !loading && !error && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleSaveToggle(); }}
                className={`p-1.5 rounded-lg transition-colors active:scale-95 ${
                  isSaved ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
                title={isSaved ? "Bỏ lưu từ" : "Lưu từ"}
              >
                {isSaved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
              </button>
            )}
            <button 
              onClick={(e) => { e.stopPropagation(); onClose(); }} 
              className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors active:scale-95"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div 
          className="flex flex-col flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 p-5 select-text"
          onMouseDown={(e) => e.stopPropagation()} // Prevent drag while scrolling
        >
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 h-full">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"/>
              <span className="text-sm text-zinc-400 animate-pulse">Đang tra từ...</span>
            </div>
          )}

          {result && !loading && (
            <div className="flex flex-col gap-4">
              {/* Header: Word + Pinyin + Audio */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-white tracking-tight" style={{ fontSize: `${2.25 * scaling}rem` }}>
                      {result.word}
                    </span>
                    {result.traditional && result.traditional !== result.word && (
                      <span className="text-xl text-zinc-500 font-medium" style={{ fontSize: `${1.25 * scaling}rem` }}>
                        {result.traditional}
                      </span>
                    )}
                  </div>
                  {result.phonetic && (
                    <span className="text-lg text-emerald-400 font-medium mt-1" style={{ fontSize: `${1.125 * scaling}rem` }}>
                      {result.phonetic}
                    </span>
                  )}
                </div>
                
                <button onClick={() => {
                  const u = new SpeechSynthesisUtterance(result.word)
                  u.lang = /[\u4e00-\u9fff]/.test(result.word) ? 'zh-CN' : 'en-US'
                  window.speechSynthesis.speak(u)
                }} className="p-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-all active:scale-95 shadow-sm border border-zinc-700/50">
                  <Volume2 size={18} />
                </button>
              </div>
              
              {/* Divider */}
              <div className="h-px w-full bg-gradient-to-r from-zinc-800 via-zinc-700 to-zinc-800" />
              
              {/* Meanings */}
              <div className="flex flex-col gap-3">
                {result.partOfSpeech && (
                  <div className="flex">
                    <span 
                      className={`text-xs font-medium px-2 py-0.5 rounded-md border ${getPosColor(result.partOfSpeech)}`}
                      style={{ fontSize: `${0.75 * scaling}rem` }}
                    >
                      {result.partOfSpeech}
                    </span>
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  {result.definitions && result.definitions.length > 0 ? (
                    result.definitions.map((m, i) => (
                      <div key={i} className="flex gap-2 text-sm" style={{ fontSize: `${0.875 * scaling}rem` }}>
                        <span className="text-zinc-500 font-medium select-none">{i + 1}.</span>
                        <span className="text-zinc-200 font-semibold leading-relaxed">{m}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-zinc-200 text-sm font-semibold leading-relaxed" style={{ fontSize: `${0.875 * scaling}rem` }}>
                      Chưa có nghĩa.
                    </p>
                  )}
                </div>
              </div>
              
              {/* Examples */}
              {result.examples && result.examples.length > 0 && (
                <div className="flex flex-col gap-2.5 mt-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-800">
                  <p 
                    className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5"
                    style={{ fontSize: `${0.6875 * scaling}rem` }}
                  >
                    <span className="w-1 h-1 rounded-full bg-zinc-500"></span>
                    Ví dụ
                  </p>
                  <div className="flex flex-col gap-3">
                    {result.examples.map((ex, i) => (
                      <div key={i} className="flex flex-col gap-1 text-sm" style={{ fontSize: `${0.875 * scaling}rem` }}>
                        <p className="text-zinc-300">{ex.original}</p>
                        {ex.vi && <p className="text-zinc-500 italic" style={{ fontSize: `${0.8125 * scaling}rem` }}>{ex.vi}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center h-full">
              <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center mb-2">
                <span className="text-2xl">🔍</span>
              </div>
              <p className="text-sm text-zinc-400">
                Không tìm thấy "<span className="text-white font-medium">{word}</span>"
              </p>
              <p className="text-xs text-zinc-600">
                Thử chọn ít chữ hơn hoặc kiểm tra lại kết nối
              </p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        {result && !loading && !error && (
          <div className="p-3 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex flex-col gap-2 shrink-0">
            <button className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-[13px] font-medium transition-all border border-zinc-700/50 group">
              <Sparkles size={14} className="text-purple-400 group-hover:text-purple-300 transition-colors" />
              Xem giải thích chi tiết
            </button>
            <button 
              onClick={handleSaveToggle}
              className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-semibold transition-all border active:scale-[0.98] ${
                isSaved 
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20' 
                  : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'
              }`}
            >
              {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
              {isSaved ? 'Đã lưu vào từ vựng' : 'Lưu vào từ vựng'}
            </button>
          </div>
        )}

        {/* RELATIVE WRAPPER FOR EDGES */}
        <div className="absolute inset-0 pointer-events-none border border-transparent rounded-2xl overflow-hidden">
          {/* RIGHT EDGE */}
          <div 
            className="absolute top-0 right-0 w-1 h-full cursor-e-resize pointer-events-auto hover:bg-emerald-500/20 active:bg-emerald-500/40 transition-colors z-[110]"
            onMouseDown={(e) => startResizing(e, 'w')}
            title="Kéo để thay đổi chiều rộng"
          />
          {/* BOTTOM EDGE */}
          <div 
            className="absolute bottom-0 left-0 w-full h-1 cursor-s-resize pointer-events-auto hover:bg-emerald-500/20 active:bg-emerald-500/40 transition-colors z-[110]"
            onMouseDown={(e) => startResizing(e, 'h')}
            title="Kéo để thay đổi chiều cao"
          />
          {/* CORNER */}
          <div 
            className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize pointer-events-auto z-[111] flex items-end justify-end p-0.5 group"
            onMouseDown={(e) => startResizing(e, 'both')}
            title="Kéo để thay đổi cả hai"
          >
            <div className="w-2 h-2 border-r-2 border-b-2 border-zinc-700 rounded-br group-hover:border-emerald-500 transition-colors" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
