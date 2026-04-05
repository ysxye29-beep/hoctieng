import { ReactNode } from 'react';
import { Home, Star, Flag, Video, PlaySquare, History, FileText, BookOpen, Gamepad2 } from 'lucide-react';
import { useLanguageStore, LANGUAGES, type Language } from '../store/languageStore';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Sidebar() {
  const { language, setLanguage } = useLanguageStore();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 bg-[#0d0d0d] border-r border-zinc-800 flex flex-col items-center py-6 gap-8 z-50">
      <div 
        onClick={() => navigate('/')}
        className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-2xl cursor-pointer hover:scale-110 transition-transform"
      >
        🐸
      </div>
      
      <nav className="flex flex-col gap-6 w-full">
        {(Object.keys(LANGUAGES) as Language[]).map(lang => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all
              ${language === lang
                ? 'bg-emerald-600/20 ring-2 ring-emerald-500 scale-110'
                : 'hover:bg-zinc-800 opacity-60 hover:opacity-100'
              }`}>
            <span className="text-2xl">{LANGUAGES[lang].flag}</span>
            <span className="text-[10px] font-bold text-zinc-400">
              {LANGUAGES[lang].label}
            </span>
          </button>
        ))}
        <div className="w-full h-px bg-zinc-800 my-2"></div>
        <SidebarItem icon={<Home className="w-6 h-6" />} onClick={() => navigate('/')} active={location.pathname === '/'} />
        <SidebarItem icon={<Gamepad2 className="w-6 h-6" />} onClick={() => navigate('/games')} active={location.pathname === '/games'} />
        <SidebarItem icon={<BookOpen className="w-6 h-6" />} onClick={() => navigate('/vocabulary')} active={location.pathname === '/vocabulary'} />
        <SidebarItem icon={<Video className="w-6 h-6" />} />
        <SidebarItem icon={<PlaySquare className="w-6 h-6" />} />
        <SidebarItem icon={<History className="w-6 h-6" />} />
      </nav>
    </aside>
  );
}

function SidebarItem({ icon, label, active, onClick }: { icon: ReactNode; label?: string; active?: boolean; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1 w-full py-2 hover:bg-zinc-800/50 transition-colors ${active ? 'text-emerald-500' : 'text-zinc-400 hover:text-zinc-200'}`}
    >
      {icon}
      {label && <span className="text-[10px] font-medium">{label}</span>}
    </button>
  );
}
