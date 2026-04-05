import { useState, type FormEvent } from 'react'
import { X, Eye, EyeOff, Mail, Lock, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

type Mode = 'login' | 'register' | 'forgot'

interface AuthModalProps {
  open:    boolean
  onClose: () => void
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { loginGoogle, error, clearError } = useAuth()
  const [loading,  setLoading]  = useState(false)

  if (!open) return null

  const handleClose = () => {
    clearError()
    onClose()
  }

  const handleGoogle = async () => {
    setLoading(true)
    await loginGoogle()
    setLoading(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center
                 bg-black/70 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-2xl
                   w-[380px] shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4
                        border-b border-zinc-800">
          <h2 className="text-white font-semibold text-base">
            Đăng nhập
          </h2>
          <button onClick={handleClose}
            className="text-zinc-500 hover:text-white transition-colors p-1">
            <X size={16} />
          </button>
        </div>

        <div className="px-6 py-8 flex flex-col gap-6 text-center">
          <div className="space-y-2">
            <h3 className="text-white font-bold text-xl">Chào mừng bạn trở lại!</h3>
            <p className="text-zinc-400 text-sm">Đăng nhập bằng tài khoản Google để tiếp tục học tập.</p>
          </div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3
                       py-3.5 rounded-xl border border-zinc-700
                       bg-white hover:bg-zinc-100
                       text-zinc-900 text-sm font-bold
                       transition-all disabled:opacity-50 shadow-xl active:scale-95"
          >
            {/* Google SVG icon */}
            <svg width="20" height="20" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.706c-.18-.54-.282-1.117-.282-1.706s.102-1.166.282-1.706V4.962H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.038l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.962L3.964 6.294C4.672 4.167 6.656 3.58 9 3.58z"/>
            </svg>
            {loading ? 'Đang kết nối...' : 'Tiếp tục với Google'}
          </button>

          {/* Error */}
          {error && (
            <p className="text-red-400 text-xs bg-red-500/10
                          border border-red-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <p className="text-zinc-500 text-[10px] leading-relaxed">
            Bằng cách tiếp tục, bạn đồng ý với Điều khoản dịch vụ và Chính sách bảo mật của chúng tôi.
          </p>
        </div>
      </div>
    </div>
  )
}
