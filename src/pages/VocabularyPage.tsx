import { useState, useMemo } from 'react';
import { useVocabularyStore, SavedWord } from '../store/vocabularyStore';
import { useLanguageStore } from '../store/languageStore';
import { Search, Filter, Trash2, Volume2, BookOpen, ChevronDown } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function VocabularyPage() {
  const { language } = useLanguageStore();
  const { getWords, removeWord } = useVocabularyStore();
  const words = getWords(language === 'zh-CN' ? 'zh' : 'en');
  
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('all');

  const filteredWords = useMemo(() => {
    return words
      .filter(w => {
        const matchSearch = w.word.toLowerCase().includes(search.toLowerCase()) || 
                            w.meaning.toLowerCase().includes(search.toLowerCase()) ||
                            (w.pinyin && w.pinyin.toLowerCase().includes(search.toLowerCase())) ||
                            (w.phonetic && w.phonetic.toLowerCase().includes(search.toLowerCase()));
        const matchSource = sourceFilter === 'all' || w.source === sourceFilter;
        return matchSearch && matchSource;
      })
      .sort((a, b) => {
        const dateA = a.savedAt ? new Date(a.savedAt).getTime() : 0;
        const dateB = b.savedAt ? new Date(b.savedAt).getTime() : 0;
        return dateB - dateA;
      });
  }, [words, search, sourceFilter]);

  const handlePlayAudio = (word: string, lang: 'zh' | 'en') => {
    const u = new SpeechSynthesisUtterance(word);
    u.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    window.speechSynthesis.speak(u);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return { date: '-', time: '-' };
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('vi-VN'),
      time: date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const sourceLabels: Record<string, string> = {
    'shadowing': 'Shadowing',
    'dictation': 'Ghi chép',
    'pronunciation': 'Phát âm',
    'summary': 'Tóm tắt',
    'manual': 'Thủ công',
    'all': 'Tất cả nguồn'
  };

  return (
    <div className="min-h-screen bg-[#121212] text-zinc-200 font-sans flex">
      <Sidebar />
      <div className="pl-20 flex-1 flex flex-col min-h-screen">
        <header className="h-16 border-b border-zinc-800 flex items-center px-8 bg-[#121212]/95 backdrop-blur z-10 sticky top-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-500">
              <BookOpen size={18} />
            </div>
            <h1 className="text-lg font-semibold text-white">Từ vựng của tôi</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-xs font-medium text-zinc-400 ml-2">
              {words.length} từ
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-[1600px] mx-auto w-full flex flex-col gap-6">
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
              <input 
                type="text"
                placeholder="Tìm kiếm từ vựng, pinyin, nghĩa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative">
                <select 
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value)}
                  className="appearance-none bg-zinc-900 border border-zinc-700 rounded-xl pl-4 pr-10 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
                >
                  {Object.entries(sourceLabels).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm table-fixed min-w-[800px]">
                <thead className="bg-zinc-800/50 text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-4 font-medium w-[160px]">Từ vựng</th>
                    <th className="px-4 py-4 font-medium min-w-[150px]">Nghĩa</th>
                    <th className="px-4 py-4 font-medium w-[90px] hidden lg:table-cell">Loại từ</th>
                    <th className="px-4 py-4 font-medium min-w-[200px] hidden xl:table-cell">Ví dụ</th>
                    <th className="px-4 py-4 font-medium w-[180px]">Nguồn video</th>
                    <th className="px-4 py-4 font-medium w-[100px]">Ngày lưu</th>
                    <th className="px-4 py-4 font-medium w-[80px] text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {filteredWords.length > 0 ? (
                    filteredWords.map((word) => {
                      const { date, time } = formatDate(word.savedAt);
                      return (
                        <tr key={word.id} className="hover:bg-zinc-800/30 transition-colors group">
                          <td className="px-4 py-4">
                            <div className="flex items-start gap-2">
                              <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="text-xl font-bold text-white whitespace-nowrap">{word.word}</span>
                                  <button 
                                    onClick={() => handlePlayAudio(word.word, word.language)}
                                    className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-700 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                  >
                                    <Volume2 size={14} />
                                  </button>
                                </div>
                                {(word.pinyin || word.phonetic) && (
                                  <span className="text-sm text-emerald-400 font-medium mt-0.5 whitespace-nowrap overflow-hidden text-ellipsis">
                                    {word.pinyin || word.phonetic}
                                  </span>
                                )}
                                {word.traditional && word.traditional !== word.word && (
                                  <span className="text-xs text-zinc-500 whitespace-nowrap overflow-hidden text-ellipsis">
                                    {word.traditional}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-zinc-300 font-medium break-words">
                            {word.meaning}
                          </td>
                          <td className="px-4 py-4 hidden lg:table-cell">
                            {word.partOfSpeech ? (
                              <span className="px-2 py-1 rounded-md bg-zinc-800 text-zinc-400 text-xs border border-zinc-700 whitespace-nowrap">
                                {word.partOfSpeech}
                              </span>
                            ) : (
                              <span className="text-zinc-600">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 hidden xl:table-cell">
                            {word.examples && word.examples.length > 0 ? (
                              <div className="flex flex-col gap-1.5">
                                {word.examples.slice(0, 1).map((ex, i) => (
                                  <div key={i} className="text-xs">
                                    <p className="text-zinc-300 line-clamp-2">{ex.original}</p>
                                    <p className="text-zinc-500 italic line-clamp-1">{ex.vi}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-zinc-600 italic text-xs">Chưa có ví dụ</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            {word.source_video_id ? (
                              <a 
                                href={`https://www.youtube.com/watch?v=${word.source_video_id}&t=${word.source_timestamp || 0}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 group/video hover:bg-zinc-800/50 p-1 rounded-lg transition-colors"
                              >
                                <div className="w-10 h-7 shrink-0 rounded overflow-hidden bg-zinc-800 border border-zinc-700">
                                  <img 
                                    src={word.source_video_thumbnail || `https://img.youtube.com/vi/${word.source_video_id}/mqdefault.jpg`} 
                                    alt="thumbnail"
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] text-zinc-400 line-clamp-2 leading-tight group-hover/video:text-white transition-colors">
                                    {word.source_video_title || 'Video nguồn'}
                                  </p>
                                </div>
                              </a>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-zinc-800 text-zinc-500 text-[10px] font-medium border border-zinc-700 whitespace-nowrap">
                                {sourceLabels[word.source] || word.source}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col text-[11px]">
                              <span className="text-zinc-400">{date}</span>
                              <span className="text-zinc-500">{time}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button 
                              onClick={() => removeWord(word.id, word.language)}
                              className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                              title="Xóa từ"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-zinc-500">
                        <div className="flex flex-col items-center justify-center gap-3">
                          <BookOpen size={32} className="text-zinc-700" />
                          <p>Chưa có từ vựng nào phù hợp với bộ lọc.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
