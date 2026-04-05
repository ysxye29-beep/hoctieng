import {
  createContext, useContext, useState,
  useEffect, useCallback, type ReactNode
} from 'react'
import {
  type User,
  onAuthStateChanged,
  signInWithRedirect,
  getRedirectResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

interface AuthCtx {
  user:           User | null
  loading:        boolean
  loginGoogle:    () => Promise<void>
  loginEmail:     (email: string, password: string) => Promise<void>
  registerEmail:  (email: string, password: string, name: string) => Promise<void>
  logout:         () => Promise<void>
  resetPassword:  (email: string) => Promise<void>
  error:          string | null
  clearError:     () => void
  isAuthModalOpen: boolean
  setAuthModalOpen: (open: boolean) => void
}

const Ctx = createContext<AuthCtx | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,    setUser]    = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [isAuthModalOpen, setAuthModalOpen] = useState(false)

useEffect(() => {
    // Bắt kết quả sau khi Google redirect về
    getRedirectResult(auth).then((result) => {
      if (result?.user) setUser(result.user)
    }).catch((e: unknown) => {
      const code = (e as { code?: string }).code ?? ''
      setError(parseError(code))
    })

    // Giữ nguyên phần này
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsub
  }, [])

  // Dịch lỗi Firebase sang tiếng Việt
  const parseError = (code: string): string => {
    const map: Record<string, string> = {
      'auth/user-not-found':       'Không tìm thấy tài khoản.',
      'auth/wrong-password':       'Mật khẩu không đúng.',
      'auth/email-already-in-use': 'Email đã được sử dụng.',
      'auth/weak-password':        'Mật khẩu quá yếu (tối thiểu 6 ký tự).',
      'auth/invalid-email':        'Email không hợp lệ.',
      'auth/popup-closed-by-user': 'Đã huỷ đăng nhập.',
      'auth/network-request-failed': 'Lỗi mạng. Kiểm tra kết nối.',
      'auth/too-many-requests':    'Quá nhiều lần thử. Thử lại sau.',
    }
    return map[code] ?? 'Có lỗi xảy ra. Thử lại sau.'
  }

const loginGoogle = useCallback(async () => {
  try {
    setError(null)
    await signInWithRedirect(auth, googleProvider)
  } catch (e: unknown) {
    const code = (e as { code?: string }).code ?? ''
    setError(parseError(code))
  }
}, [])

  const loginEmail = useCallback(async (email: string, password: string) => {
    try {
      setError(null)
      await signInWithEmailAndPassword(auth, email, password)
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? ''
      setError(parseError(code))
    }
  }, [])

  const registerEmail = useCallback(async (
    email: string, password: string, name: string
  ) => {
    try {
      setError(null)
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name })
      setUser({ ...cred.user, displayName: name })
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? ''
      setError(parseError(code))
    }
  }, [])

  const logout = useCallback(async () => {
    await signOut(auth)
  }, [])

  const resetPassword = useCallback(async (email: string) => {
    try {
      setError(null)
      await sendPasswordResetEmail(auth, email)
    } catch (e: unknown) {
      const code = (e as { code?: string }).code ?? ''
      setError(parseError(code))
    }
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return (
    <Ctx.Provider value={{
      user, loading,
      loginGoogle, loginEmail, registerEmail,
      logout, resetPassword,
      error, clearError,
      isAuthModalOpen, setAuthModalOpen,
    }}>
      {children}
    </Ctx.Provider>
  )
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
