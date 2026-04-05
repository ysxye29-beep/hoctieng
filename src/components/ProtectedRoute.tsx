import { type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'
import AuthModal from './AuthModal'

interface Props {
  children: ReactNode
  fallback?: ReactNode   // hiện gì khi chưa đăng nhập
}

export default function ProtectedRoute({ children, fallback }: Props) {
  const { user, loading, loginGoogle, isAuthModalOpen, setAuthModalOpen } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#121212]">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return (
      <>
        {fallback ?? (
          <div className="flex flex-col items-center justify-center h-screen bg-[#121212] gap-6 text-center px-6">
            <div className="w-20 h-20 bg-zinc-800 rounded-3xl flex items-center justify-center text-4xl shadow-2xl border border-zinc-700">
              🔒
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">Yêu cầu đăng nhập</h2>
                <p className="text-zinc-400 text-sm max-w-xs">
                  Vui lòng đăng nhập bằng Google để truy cập nội dung học tập và theo dõi tiến trình của bạn.
                </p>
              </div>
              <button
                onClick={loginGoogle}
                className="flex items-center gap-3 px-8 py-3.5 bg-white hover:bg-zinc-100 text-zinc-900 rounded-2xl font-bold transition-all shadow-xl active:scale-95 mx-auto"
              >
                <svg width="20" height="20" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.038l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
                </svg>
                Đăng nhập bằng Google
              </button>
            </div>
          </div>
        )}
        <AuthModal open={isAuthModalOpen} onClose={() => setAuthModalOpen(false)} />
      </>
    )
  }

  return <>{children}</>
}
