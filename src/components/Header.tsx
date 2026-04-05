import { Search, Youtube, Package, Gift, Diamond, Bell, Globe, User } from 'lucide-react';

export default function Header() {
  return (
    <header className="sticky top-0 z-40 w-full h-16 bg-[#0d0d0d]/80 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-6">
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 group-focus-within:text-emerald-500 transition-colors" />
          <input 
            type="text" 
            placeholder="Nhập từ khóa để tìm kiếm" 
            className="w-full bg-zinc-900/50 border border-zinc-800 rounded-full py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 ml-4">
        <button className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors">
          <Youtube className="w-4 h-4 text-red-500" />
          <span>Video của tôi</span>
        </button>
        
        <button className="flex items-center gap-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors bg-zinc-800/50 px-3 py-1.5 rounded-full border border-zinc-700/50">
          <Package className="w-4 h-4 text-amber-500" />
          <span>Sản phẩm</span>
          <svg className="w-3 h-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-3 border-l border-zinc-800 pl-4">
          <button className="text-zinc-400 hover:text-emerald-400 transition-colors">
            <Gift className="w-5 h-5 text-purple-400" />
          </button>
          <button className="text-zinc-400 hover:text-emerald-400 transition-colors">
            <Diamond className="w-5 h-5 text-amber-400" />
          </button>
          <button className="relative text-zinc-400 hover:text-emerald-400 transition-colors">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-[#0d0d0d]">1</span>
          </button>
          
          <button className="flex items-center gap-1 text-sm font-medium text-zinc-300 hover:text-white transition-colors bg-zinc-800/50 px-2 py-1 rounded-full border border-zinc-700/50">
            <span className="text-red-500 text-lg leading-none">🇻🇳</span>
            <span className="text-xs uppercase">VI</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          <button className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-medium text-white border border-emerald-500/30 hover:ring-2 hover:ring-emerald-500/50 transition-all">
            Ju
          </button>
        </div>
      </div>
    </header>
  );
}
