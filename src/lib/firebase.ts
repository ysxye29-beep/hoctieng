import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'

// Config này sẽ được thay bằng config thật khi deploy
// Lấy từ: Firebase Console → Project Settings → Your apps → Web app
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            ?? 'demo-key',
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        ?? 'demo.firebaseapp.com',
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         ?? 'demo-project',
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     ?? 'demo.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '000000000000',
  appId:             import.meta.env.VITE_FIREBASE_APP_ID             ?? '1:000:web:000',
}

const app             = initializeApp(firebaseConfig)
export const auth     = getAuth(app)
export const googleProvider = new GoogleAuthProvider()
