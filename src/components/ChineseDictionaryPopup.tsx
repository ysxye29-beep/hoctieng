import { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Volume2, Bookmark, BookmarkCheck } from 'lucide-react';
import { lookupChinese, lookupEnglish, DictResult } from '../lib/dictionary';
import { useVocabularyStore } from '../store/vocabularyStore';

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
  
  const { zhWords, addWord, removeWord } = useVocabularyStore();
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
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
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
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const W = 340;
  const H = 460;
  const left = Math.min(x + 12, window.innerWidth - W - 12);
  const top = y + H > window.innerHeight ? Math.max(y - H - 8, 8) : y + 20;

  return (
    <div
      ref={popupRef}
      className="fixed z-[100] w-[340px] bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150"
      style={{ top, left }}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
        <span className="text-sm font-medium text-zinc-400">Từ điển</span>
        <div className="flex items-center gap-1">
          {result && !loading && !error && (
            <button 
              onClick={handleSaveToggle}
              className={`p-1.5 rounded-lg transition-colors active:scale-95 ${
                isSaved ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
              title={isSaved ? "Bỏ lưu từ" : "Lưu từ"}
            >
              {isSaved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors active:scale-95">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* CONTENT */}
      <div className="flex flex-col flex-1 min-h-[200px] max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 p-5">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
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
                  <span className="text-4xl font-bold text-white tracking-tight">
                    {result.word}
                  </span>
                  {result.traditional && result.traditional !== result.word && (
                    <span className="text-xl text-zinc-500 font-medium">
                      {result.traditional}
                    </span>
                  )}
                </div>
                {result.phonetic && (
                  <span className="text-lg text-emerald-400 font-medium mt-1">
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
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-md border ${getPosColor(result.partOfSpeech)}`}>
                    {result.partOfSpeech}
                  </span>
                </div>
              )}
              
              <div className="flex flex-col gap-2">
                {result.definitions && result.definitions.length > 0 ? (
                  result.definitions.map((m, i) => (
                    <div key={i} className="flex gap-2 text-sm">
                      <span className="text-zinc-500 font-medium select-none">{i + 1}.</span>
                      <span className="text-zinc-200 font-semibold leading-relaxed">{m}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-zinc-200 text-sm font-semibold leading-relaxed">
                    Chưa có nghĩa.
                  </p>
                )}
              </div>
            </div>
            
            {/* Examples */}
            {result.examples && result.examples.length > 0 && (
              <div className="flex flex-col gap-2.5 mt-2 p-3 rounded-xl bg-zinc-800/50 border border-zinc-800">
                <p className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-zinc-500"></span>
                  Ví dụ
                </p>
                <div className="flex flex-col gap-3">
                  {result.examples.map((ex, i) => (
                    <div key={i} className="flex flex-col gap-1 text-sm">
                      <p className="text-zinc-300">{ex.original}</p>
                      {ex.vi && <p className="text-zinc-500 italic">{ex.vi}</p>}
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
        <div className="p-3 border-t border-zinc-800 bg-zinc-900/80 backdrop-blur-md flex flex-col gap-2">
          <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-sm font-medium transition-all border border-zinc-700/50 group">
            <Sparkles size={16} className="text-purple-400 group-hover:text-purple-300 transition-colors" />
            Xem giải thích chi tiết
          </button>
          <button 
            onClick={handleSaveToggle}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all border active:scale-[0.98] ${
              isSaved 
                ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-emerald-600 border-emerald-500 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-900/20'
            }`}
          >
            {isSaved ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
            {isSaved ? 'Đã lưu vào từ vựng' : 'Lưu vào từ vựng'}
          </button>
        </div>
      )}
    </div>
  );
}
