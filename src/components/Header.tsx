import { useState } from 'react';
import { Search, Youtube, Package, Gift, Diamond, Bell, Globe, User, LogOut, Settings, LayoutDashboard } from 'lucide-react';

export default function Header() {
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Mock user for now since auth was removed
  const user = null;
  const loginGoogle = () => {};
  const logout = () => {};

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

          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(v => !v)}
                className="flex items-center gap-2 p-1 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.displayName ?? ''} className="w-8 h-8 rounded-full object-cover border border-emerald-500/30" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm font-bold border border-emerald-500/30">
                    {(user.displayName ?? user.email ?? 'U')[0].toUpperCase()}
                  </div>
                )}
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 top-full mt-2 z-50 w-52 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden py-1">
                    <div className="px-4 py-3 border-b border-zinc-800">
                      <p className="text-white text-sm font-medium truncate">
                        {user.displayName ?? 'Người dùng'}
                      </p>
                      <p className="text-zinc-500 text-xs truncate">{user.email}</p>
                    </div>
                    <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors text-left">
                      <User size={14} />
                      <span>Hồ sơ</span>
                    </button>
                    <button className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors text-left">
                      <LayoutDashboard size={14} />
                      <span>Kết quả học</span>
                    </button>
                    <div className="h-px bg-zinc-800 my-1" />
                    <button
                      onClick={() => { logout(); setShowUserMenu(false) }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-800 transition-colors text-left"
                    >
                      <LogOut size={14} />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={loginGoogle}
              className="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium text-zinc-900 transition-all bg-white hover:bg-zinc-100 shadow-lg shadow-white/10"
            >
              <svg width="16" height="16" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.038l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
              </svg>
              <span className="hidden md:inline">Đăng nhập Google</span>
              <span className="md:hidden">Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
