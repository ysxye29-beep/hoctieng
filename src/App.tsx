/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Hero from './components/Hero';
import CategoryFilter from './components/CategoryFilter';
import PlaylistGrid from './components/PlaylistGrid';
import { ChineseProvider } from './lib/ChineseContext';
import { useLanguageStore, LANGUAGES } from './store/languageStore';
import { DictionaryProvider } from './hooks/useDictionary';
import WatchPage from './pages/WatchPage';
import VocabularyPage from './pages/VocabularyPage';
import GameReactionPage from './pages/GameReactionPage';

export default function App() {
  return (
    <ChineseProvider>
      <DictionaryProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route 
            path="/watch/:youtubeId" 
            element={<WatchPage />} 
          />
          <Route 
            path="/vocabulary" 
            element={<VocabularyPage />} 
          />
          <Route 
            path="/games" 
            element={<GameReactionPage />} 
          />
        </Routes>
      </DictionaryProvider>
    </ChineseProvider>
  );
}

function HomePage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { language } = useLanguageStore();
  const [isChanging, setIsChanging] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const prevLangRef = useRef(language);

  useEffect(() => {
    if (prevLangRef.current !== language) {
      setIsChanging(true);
      setShowToast(true);
      
      const timer1 = setTimeout(() => setIsChanging(false), 300);
      const timer2 = setTimeout(() => setShowToast(false), 2000);
      
      prevLangRef.current = language;
      
      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    }
  }, [language]);

  return (
    <div className={`min-h-screen bg-[#121212] text-zinc-200 font-sans selection:bg-emerald-500/30 transition-opacity duration-300 ${isChanging ? 'opacity-0' : 'opacity-100'}`}>
      <Sidebar />
      <div className="pl-20 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 px-6 md:px-10 lg:px-16 pt-8 max-w-[1600px] mx-auto w-full">
          <Hero onVideoAdded={() => setRefreshTrigger(t => t + 1)} />
          <CategoryFilter />
          <PlaylistGrid refreshTrigger={refreshTrigger} />
        </main>
      </div>
      
      <div className={`fixed bottom-6 right-6 flex items-center gap-3 
                       bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-3 
                       shadow-xl transition-all duration-300 z-50
                       ${showToast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}>
        <span className="text-2xl">{LANGUAGES[language].flag}</span>
        <div>
          <p className="text-sm font-medium text-white">
            Đã chuyển sang {LANGUAGES[language].nativeName}
          </p>
          <p className="text-xs text-zinc-400">
            Playlist đã được lọc theo ngôn ngữ này
          </p>
        </div>
      </div>
    </div>
  );
}
