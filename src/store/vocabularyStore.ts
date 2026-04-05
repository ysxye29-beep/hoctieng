import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SavedWord {
  id: string;
  language: 'zh' | 'en';
  word: string;           // chữ Hán hoặc từ tiếng Anh
  traditional?: string;   // chỉ tiếng Trung
  pinyin?: string;        // chỉ tiếng Trung
  phonetic?: string;      // chỉ tiếng Anh
  meaning: string;        // nghĩa tiếng Việt
  partOfSpeech?: string;  // Danh từ, Động từ...
  examples: Array<{ original: string; vi: string }>;
  source: 'shadowing' | 'dictation' | 'pronunciation' | 'summary' | 'manual';
  savedAt: string; // Sử dụng string (ISO) để dễ lưu trữ localStorage
  
  // Nguồn video
  source_video_id?: string;
  source_video_title?: string;
  source_video_thumbnail?: string;
  source_timestamp?: number;
}

interface VocabularyStore {
  enWords: SavedWord[];
  zhWords: SavedWord[];
  addWord: (word: Omit<SavedWord, 'id' | 'savedAt'>) => void;
  removeWord: (id: string, lang: 'en' | 'zh') => void;
  getWords: (lang: 'en' | 'zh') => SavedWord[];
  getWordsBySource: (lang: 'en' | 'zh', source: string) => SavedWord[];
}

export const useVocabularyStore = create<VocabularyStore>()(
  persist(
    (set, get) => ({
      enWords: [],
      zhWords: [],
      addWord: (newWord) => set((state) => {
        const lang = newWord.language;
        const targetList = lang === 'en' ? state.enWords : state.zhWords;
        
        // Tránh thêm trùng từ
        if (targetList.some(w => w.word === newWord.word)) {
          return state;
        }
        
        const wordToAdd = { 
          ...newWord, 
          id: Date.now().toString(), 
          savedAt: new Date().toISOString() 
        };

        if (lang === 'en') {
          return { enWords: [wordToAdd, ...state.enWords] };
        } else {
          return { zhWords: [wordToAdd, ...state.zhWords] };
        }
      }),
      removeWord: (id, lang) => set((state) => {
        if (lang === 'en') {
          return { enWords: state.enWords.filter(w => w.id !== id) };
        } else {
          return { zhWords: state.zhWords.filter(w => w.id !== id) };
        }
      }),
      getWords: (lang) => {
        return lang === 'en' ? get().enWords : get().zhWords;
      },
      getWordsBySource: (lang, source) => {
        const words = lang === 'en' ? get().enWords : get().zhWords;
        return words.filter(w => w.source === source);
      },
    }),
    {
      name: 'vocabulary-storage', // tên key trong localStorage
    }
  )
);
