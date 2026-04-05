import { useState, useMemo } from 'react';
import { useVocabularyStore } from '../store/vocabularyStore';
import { useLanguageStore } from '../store/languageStore';
import { 
  Gamepad2, 
  Layers, 
  CheckSquare, 
  Link2, 
  PenTool, 
  Keyboard, 
  Headphones, 
  Sparkles,
  Globe,
  BookOpen,
  Mic,
  FileText,
  Edit3
} from 'lucide-react';
import Sidebar from '../components/Sidebar';

const GAMES = [
  {
    id: 'flashcard',
    title: 'Flashcard',
    description: 'Lật thẻ ghi nhớ từ vựng',
    icon: <Layers size={24} />,
    color: 'from-blue-500 to-cyan-400',
    shadow: 'shadow-blue-500/20'
  },
  {
    id: 'quiz',
    title: 'Trắc nghiệm',
    description: 'Chọn đáp án đúng',
    icon: <CheckSquare size={24} />,
    color: 'from-emerald-500 to-teal-400',
    shadow: 'shadow-emerald-500/20'
  },
  {
    id: 'match',
    title: 'Nối từ',
    description: 'Ghép từ và nghĩa',
    icon: <Link2 size={24} />,
    color: 'from-purple-500 to-pink-400',
    shadow: 'shadow-purple-500/20'
  },
  {
    id: 'write',
    title: 'Viết chữ',
    description: 'Luyện viết từng nét',
    icon: <PenTool size={24} />,
    color: 'from-amber-500 to-orange-400',
    shadow: 'shadow-amber-500/20'
  },
  {
    id: 'type',
    title: 'Gõ từ',
    description: 'Luyện gõ pinyin/từ',
    icon: <Keyboard size={24} />,
    color: 'from-rose-500 to-red-400',
    shadow: 'shadow-rose-500/20'
  },
  {
    id: 'dictation',
    title: 'Nghe viết',
    description: 'Nghe audio và gõ lại',
    icon: <Headphones size={24} />,
    color: 'from-indigo-500 to-blue-400',
    shadow: 'shadow-indigo-500/20'
  },
  {
    id: 'comprehensive',
    title: 'Tổng hợp',
    description: 'Ôn tập toàn diện',
    icon: <Sparkles size={24} />,
    color: 'from-fuchsia-500 to-purple-400',
    shadow: 'shadow-fuchsia-500/20'
  }
];

export default function GameReactionPage() {
  const { language } = useLanguageStore();
  const { getWords } = useVocabularyStore();
  const words = getWords(language === 'zh-CN' ? 'zh' : 'en');
  const [filterSource, setFilterSource] = useState<string>('all');

  // Lọc từ vựng
  const filteredWords = useMemo(() => {
    return words.filter(w => {
      const matchSource = filterSource === 'all' || w.source === filterSource;
      return matchSource;
    });
  }, [words, filterSource]);

  // Thống kê
  const stats = useMemo(() => {
    return {
      total: words.length,
      shadowing: words.filter(w => w.source === 'shadowing').length,
      dictation: words.filter(w => w.source === 'dictation').length,
      manual: words.filter(w => w.source === 'manual').length,
    };
  }, [words]);

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-zinc-200 font-sans overflow-hidden">
      <Sidebar />
      
      <main className="flex-1 ml-20 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
        <div className="max-w-6xl mx-auto p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Gamepad2 className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Game Phản Xạ</h1>
              <p className="text-zinc-400 mt-1">Ôn tập {filteredWords.length} từ vựng đã lưu qua các mini-game</p>
            </div>
          </div>

          {/* Chọn bộ từ */}
          <div className="mb-10">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Globe size={18} className="text-zinc-400" />
              Chọn bộ từ vựng ({language === 'zh-CN' ? 'Tiếng Trung' : 'Tiếng Anh'})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <FilterCard 
                title="Tất cả từ" 
                count={stats.total} 
                active={filterSource === 'all'} 
                onClick={() => setFilterSource('all')} 
                icon={<BookOpen size={20} />}
                color="from-zinc-500 to-zinc-400"
              />
              <FilterCard 
                title="Shadowing" 
                count={stats.shadowing} 
                active={filterSource === 'shadowing'} 
                onClick={() => setFilterSource('shadowing')} 
                icon={<Mic size={20} />}
                color="from-emerald-600 to-teal-500"
              />
              <FilterCard 
                title="Ghi chép" 
                count={stats.dictation} 
                active={filterSource === 'dictation'} 
                onClick={() => setFilterSource('dictation')} 
                icon={<Edit3 size={20} />}
                color="from-amber-600 to-orange-500"
              />
              <FilterCard 
                title="Lưu thủ công" 
                count={stats.manual} 
                active={filterSource === 'manual'} 
                onClick={() => setFilterSource('manual')} 
                icon={<FileText size={20} />}
                color="from-purple-600 to-fuchsia-500"
              />
            </div>
          </div>

          {/* Danh sách Game */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Gamepad2 size={18} className="text-zinc-400" />
                Chọn chế độ chơi
              </h2>
              <span className="text-sm text-zinc-500 bg-zinc-900 px-3 py-1 rounded-full border border-zinc-800">
                Sẵn sàng: <strong className="text-emerald-400">{filteredWords.length}</strong> từ
              </span>
            </div>
            
            {filteredWords.length === 0 ? (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
                  <BookOpen size={24} className="text-zinc-500" />
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Không có từ vựng nào</h3>
                <p className="text-zinc-400 max-w-md">
                  Bộ lọc hiện tại không có từ vựng nào. Hãy chọn bộ lọc khác hoặc lưu thêm từ vựng trong quá trình học.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {GAMES.map(game => (
                  <div 
                    key={game.id}
                    className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl p-5 cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-xl"
                  >
                    {/* Background Gradient Hover Effect */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
                    
                    <div className="relative z-10 flex flex-col h-full">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${game.color} flex items-center justify-center text-white mb-4 shadow-lg ${game.shadow} group-hover:scale-110 transition-transform duration-300`}>
                        {game.icon}
                      </div>
                      <h3 className="text-lg font-bold text-white mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-zinc-400 transition-all">
                        {game.title}
                      </h3>
                      <p className="text-sm text-zinc-400 flex-1">
                        {game.description}
                      </p>
                      
                      <div className="mt-4 pt-4 border-t border-zinc-800/50 flex items-center justify-between">
                        <span className="text-xs font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">
                          Bắt đầu chơi
                        </span>
                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-colors">
                          <span className="text-xs">→</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function FilterCard({ 
  title, count, active, onClick, icon, color 
}: { 
  title: string; count: number; active: boolean; onClick: () => void; icon: React.ReactNode; color: string;
}) {
  return (
    <div 
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-4 cursor-pointer transition-all duration-300 border
        ${active 
          ? 'bg-zinc-800/80 border-zinc-600 shadow-lg' 
          : 'bg-zinc-900/50 border-zinc-800/50 hover:bg-zinc-800 hover:border-zinc-700'
        }`}
    >
      {active && (
        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${color}`} />
      )}
      <div className="flex items-start justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center
          ${active ? `bg-gradient-to-br ${color} text-white shadow-md` : 'bg-zinc-800 text-zinc-400'}`}>
          {icon}
        </div>
        <span className={`text-xl font-bold ${active ? 'text-white' : 'text-zinc-500'}`}>
          {count}
        </span>
      </div>
      <p className={`text-sm font-medium ${active ? 'text-zinc-200' : 'text-zinc-400'}`}>
        {title}
      </p>
    </div>
  );
}
