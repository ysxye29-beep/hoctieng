import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Language = 'en' | 'zh-CN';

export interface LanguageConfig {
  code: Language;
  flag: string;
  label: string;
  nativeName: string;
  heroTitle: string;
  heroSubtitle: string;
  inputPlaceholder: string;
  emptyMessage: string;
  categories: { id: string; label: string; icon: string }[];
}

export const LANGUAGES: Record<Language, LanguageConfig> = {
  'en': {
    code: 'en',
    flag: '🇺🇸',
    label: 'EN',
    nativeName: 'English',
    heroTitle: 'Luyện Shadowing tiếng Anh',
    heroSubtitle: 'Học qua podcast, TED Talks, phim, BBC...',
    inputPlaceholder: 'Dán link YouTube video tiếng Anh...',
    emptyMessage: 'Chưa có video tiếng Anh. Thêm video đầu tiên!',
    categories: [
      { id: 'all',        icon: '📚', label: 'Tất cả' },
      { id: 'beginner',   icon: '🌱', label: 'Mới bắt đầu' },
      { id: 'podcast',    icon: '🎙️', label: 'Podcast' },
      { id: 'ted',        icon: '🎤', label: 'TED Talks' },
      { id: 'news',       icon: '📰', label: 'Tin tức' },
      { id: 'movie',      icon: '🎬', label: 'Phim' },
      { id: 'ielts',      icon: '📋', label: 'IELTS' },
      { id: 'toeic',      icon: '📋', label: 'TOEIC' },
      { id: 'business',   icon: '💼', label: 'Business' },
    ]
  },
  'zh-CN': {
    code: 'zh-CN',
    flag: '🇨🇳',
    label: 'ZH',
    nativeName: '中文',
    heroTitle: '学中文，从视频开始',
    heroSubtitle: 'Học tiếng Trung qua video · Shadowing · Dictation · HSK',
    inputPlaceholder: 'Dán link YouTube video tiếng Trung...',
    emptyMessage: 'Chưa có video tiếng Trung. Thêm video đầu tiên!',
    categories: [
      { id: 'all',        icon: '📚', label: 'Tất cả' },
      { id: 'hsk1-3',     icon: '🌱', label: 'HSK 1-3' },
      { id: 'hsk4-6',     icon: '🔥', label: 'HSK 4-6' },
      { id: 'podcast',    icon: '🎙️', label: 'Podcast' },
      { id: 'drama',      icon: '🎭', label: 'Phim/Drama' },
      { id: 'news',       icon: '📰', label: 'Tin tức' },
      { id: 'business',   icon: '💼', label: 'Kinh doanh' },
      { id: 'daily',      icon: '☀️', label: 'Giao tiếp' },
    ]
  }
};

interface LanguageStore {
  language: Language;
  config: LanguageConfig;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'en',
      config: LANGUAGES['en'],
      setLanguage: (lang) => set({ language: lang, config: LANGUAGES[lang] }),
    }),
    {
      name: 'language-storage',
    }
  )
);
