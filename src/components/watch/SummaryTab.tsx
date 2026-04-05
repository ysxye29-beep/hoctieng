import { useState, useEffect } from 'react';
import { 
  FileText, Sparkles, RefreshCw, Bookmark, BookmarkCheck, 
  CheckCircle2, BookOpen, GraduationCap, MessageSquare, ListTodo,
  ChevronDown, ChevronUp, ExternalLink, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { VideoItem } from '../../lib/storage';
import { useVideoSummary, VideoSummary, SummaryVocabulary } from '../../hooks/useVideoSummary';
import { saveVocabularyItem, saveMultipleVocabularyItems, getVocabulary } from '../../lib/vocabularyStorage';

interface SummaryTabProps {
  video: VideoItem;
  transcript: string;
}

export default function SummaryTab({ video, transcript }: SummaryTabProps) {
  const { summary, isLoading, error, refresh } = useVideoSummary(video.youtubeId, video.language, transcript);
  const [savedWords, setSavedWords] = useState<Set<string>>(new Set());
  const [showToast, setShowToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Load saved words to show bookmark state
    const vocab = getVocabulary();
    const saved = new Set(vocab.filter(v => v.source_video_id === video.youtubeId).map(v => v.word));
    setSavedWords(saved);
  }, [video.youtubeId]);

  const handleSaveWord = (word: SummaryVocabulary) => {
    if (savedWords.has(word.word)) return;

    saveVocabularyItem({
      word: word.word,
      pinyin: word.pinyin,
      phonetic: word.phonetic,
      type: word.type,
      meaning_vi: word.meaning_vi,
      example: word.example,
      example_vi: word.example_vi,
      source_video_id: video.youtubeId,
      source_video_title: video.title,
      source_timestamp: null,
    });

    setSavedWords(prev => new Set([...prev, word.word]));
    showToastMsg(`Đã lưu "${word.word}" vào từ vựng`);
  };

  const handleSaveAll = () => {
    if (!summary?.vocabulary) return;

    const itemsToSave = summary.vocabulary.map(word => ({
      word: word.word,
      pinyin: word.pinyin,
      phonetic: word.phonetic,
      type: word.type,
      meaning_vi: word.meaning_vi,
      example: word.example,
      example_vi: word.example_vi,
      source_video_id: video.youtubeId,
      source_video_title: video.title,
      source_timestamp: null,
    }));

    const addedCount = saveMultipleVocabularyItems(itemsToSave);
    
    if (addedCount > 0) {
      const newSaved = new Set([...savedWords, ...summary.vocabulary.map(v => v.word)]);
      setSavedWords(newSaved);
      showToastMsg(`Đã lưu ${addedCount} từ vào từ vựng`);
    } else {
      showToastMsg("Tất cả từ đã được lưu trước đó");
    }
  };

  const showToastMsg = (message: string, type: 'success' | 'error' = 'success') => {
    setShowToast({ message, type });
    setTimeout(() => setShowToast(null), 3000);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
          <Info className="text-red-500" size={32} />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Phân tích thất bại</h3>
        <p className="text-zinc-400 text-sm mb-6 max-w-xs">{error}</p>
        <button 
          onClick={refresh}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-medium transition-colors"
        >
          <RefreshCw size={16} /> Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Header with Manual Trigger */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sparkles className="text-emerald-400" size={20} />
          Tóm tắt AI
        </h2>
        {summary && (
          <button 
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            Phân tích lại
          </button>
        )}
      </div>

      {/* Video Info Card */}
      <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col gap-3">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-zinc-200 text-sm line-clamp-2 flex-1">{video.title}</h3>
          {summary?.level && (
            <span className="ml-3 px-2 py-0.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold rounded uppercase">
              {summary.level}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 gap-y-2 text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ExternalLink size={12} />
            <span className="truncate">{video.channel}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen size={12} />
            <span>{video.language === 'zh-CN' ? 'Tiếng Trung' : 'Tiếng Anh'}</span>
          </div>
        </div>
      </div>

      {/* Manual Trigger if no summary */}
      {!summary && !isLoading && (
        <div className="py-10 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-emerald-500/5 rounded-full flex items-center justify-center mb-4">
            <Sparkles className="text-emerald-500/40" size={40} />
          </div>
          <p className="text-zinc-500 text-sm mb-6">Video này chưa được phân tích nội dung.</p>
          <button 
            onClick={refresh}
            className="flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-sm font-bold transition-all shadow-lg shadow-emerald-900/20"
          >
            <Sparkles size={18} /> ✨ Phân tích bằng AI
          </button>
        </div>
      )}

      {/* Content Sections */}
      <div className="space-y-8">
        {/* Summary Section */}
        <Section title="Tóm tắt nội dung" icon={<FileText size={18} className="text-blue-400" />} isLoading={isLoading && !summary}>
          <p className="text-zinc-300 text-sm leading-relaxed italic">
            {summary?.summary}
          </p>
        </Section>

        {/* Vocabulary Section */}
        <Section 
          title="Từ vựng quan trọng" 
          icon={<BookOpen size={18} className="text-emerald-400" />} 
          isLoading={isLoading && !summary}
          action={summary && (
            <button 
              onClick={handleSaveAll}
              className="text-[10px] font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Lưu tất cả
            </button>
          )}
        >
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Từ / Cụm</th>
                  <th className="py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Loại</th>
                  <th className="py-2 text-[10px] font-bold text-zinc-500 uppercase tracking-wider text-right">Lưu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/50">
                {summary?.vocabulary.map((v, i) => (
                  <tr key={i} className="group">
                    <td className="py-3 pr-2">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-zinc-200">{v.word}</span>
                        {(v.pinyin || v.phonetic) && (
                          <span className="text-[10px] text-zinc-500 font-mono">{v.pinyin || v.phonetic}</span>
                        )}
                        <span className="text-xs text-zinc-400 mt-1">{v.meaning_vi}</span>
                      </div>
                    </td>
                    <td className="py-3 text-[10px] text-zinc-500 align-top pt-4">
                      <span className="px-1.5 py-0.5 bg-zinc-800 rounded">{v.type}</span>
                    </td>
                    <td className="py-3 text-right align-top pt-3">
                      <button 
                        onClick={() => handleSaveWord(v)}
                        className={`p-2 rounded-lg transition-colors ${savedWords.has(v.word) ? 'text-emerald-500' : 'text-zinc-600 hover:text-zinc-400'}`}
                      >
                        {savedWords.has(v.word) ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* Grammar Section */}
        <Section title="Ngữ pháp nổi bật" icon={<GraduationCap size={18} className="text-purple-400" />} isLoading={isLoading && !summary}>
          <div className="space-y-4">
            {summary?.grammar.map((g, i) => (
              <div key={i} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                <div className="font-bold text-emerald-400 text-sm mb-1">{g.pattern}</div>
                <div className="text-xs text-zinc-400 mb-2">{g.explanation_vi}</div>
                <div className="text-[11px] text-zinc-500 bg-black/30 p-2 rounded border border-zinc-800">
                  <div className="italic">"{g.example}"</div>
                  <div className="text-zinc-600 mt-1">→ {g.example_vi}</div>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Useful Phrases Section */}
        <Section title="Cụm câu hữu ích" icon={<MessageSquare size={18} className="text-orange-400" />} isLoading={isLoading && !summary}>
          <div className="space-y-4">
            {summary?.useful_phrases.map((p, i) => (
              <div key={i} className="p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-bold text-zinc-200 text-sm">{p.phrase}</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-orange-500/10 text-orange-400 rounded border border-orange-500/20">{p.function}</span>
                </div>
                <div className="text-[10px] text-zinc-500 mb-2">Ngữ cảnh: {p.context}</div>
                <div className="text-[11px] text-zinc-400 italic">Ví dụ: {p.example}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Exercises Section */}
        <Section title="Bài tập thực hành" icon={<ListTodo size={18} className="text-pink-400" />} isLoading={isLoading && !summary}>
          <ul className="space-y-2">
            {summary?.exercises.map((ex, i) => (
              <li key={i} className="flex gap-3 text-sm text-zinc-400">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{ex}</span>
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-full shadow-xl flex items-center gap-2"
          >
            <CheckCircle2 size={16} />
            {showToast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Section({ title, icon, children, isLoading, action }: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode; 
  isLoading?: boolean;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">{title}</h3>
        </div>
        {action}
      </div>
      
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-4 bg-zinc-800 rounded w-full animate-pulse" />
          <div className="h-4 bg-zinc-800 rounded w-5/6 animate-pulse" />
          <div className="h-4 bg-zinc-800 rounded w-4/6 animate-pulse" />
        </div>
      ) : (
        <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
          {children}
        </div>
      )}
    </div>
  );
}
