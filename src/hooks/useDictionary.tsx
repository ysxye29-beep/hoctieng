import { createContext, useContext, useState, ReactNode } from 'react';
import ChineseDictionaryPopup from '../components/ChineseDictionaryPopup';
import EnglishDictionaryPopup from '../components/EnglishDictionaryPopup';

interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  timestamp: number;
}

interface DictionaryContextType {
  openDict: (
    word: string, 
    x: number, 
    y: number, 
    lang: string, 
    source?: 'shadowing' | 'dictation' | 'pronunciation' | 'summary' | 'manual',
    videoInfo?: VideoInfo
  ) => void;
}

const DictionaryContext = createContext<DictionaryContextType | null>(null);

export function useDictionaryContext() {
  const ctx = useContext(DictionaryContext);
  if (!ctx) throw new Error('useDictionaryContext must be used within DictionaryProvider');
  return ctx;
}

export function DictionaryProvider({ children }: { children: ReactNode }) {
  const [dictState, setDictState] = useState<{
    isOpen: boolean;
    word: string;
    x: number;
    y: number;
    lang: string;
    source: 'shadowing' | 'dictation' | 'pronunciation' | 'summary' | 'manual';
    videoInfo?: VideoInfo;
  }>({
    isOpen: false,
    word: '',
    x: 0,
    y: 0,
    lang: 'zh',
    source: 'manual'
  });

  const openDict = (
    word: string, 
    x: number, 
    y: number, 
    lang: string, 
    source: 'shadowing' | 'dictation' | 'pronunciation' | 'summary' | 'manual' = 'manual',
    videoInfo?: VideoInfo
  ) => {
    const cleanWord = word.replace(/[.,!?()\[\]{}"']/g, '').trim();
    if (!cleanWord) return;

    setDictState({
      isOpen: true,
      word: cleanWord,
      x,
      y,
      lang,
      source,
      videoInfo
    });
  };

  return (
    <DictionaryContext.Provider value={{ openDict }}>
      {children}
      {dictState.lang === 'zh' ? (
        <ChineseDictionaryPopup 
          isOpen={dictState.isOpen}
          word={dictState.word}
          x={dictState.x}
          y={dictState.y}
          source={dictState.source}
          videoInfo={dictState.videoInfo}
          onClose={() => setDictState(prev => ({ ...prev, isOpen: false }))} 
        />
      ) : (
        <EnglishDictionaryPopup 
          isOpen={dictState.isOpen}
          word={dictState.word}
          x={dictState.x}
          y={dictState.y}
          source={dictState.source}
          videoInfo={dictState.videoInfo}
          onClose={() => setDictState(prev => ({ ...prev, isOpen: false }))} 
        />
      )}
    </DictionaryContext.Provider>
  );
}

