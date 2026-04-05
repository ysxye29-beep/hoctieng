import { createContext, useContext, useState, ReactNode } from 'react';

interface ChineseContextType {
  showPinyin: boolean;
  setShowPinyin: (show: boolean) => void;
  isTraditional: boolean;
  setIsTraditional: (isTrad: boolean) => void;
  fontSize: number;
  setFontSize: (size: number) => void;
}

const ChineseContext = createContext<ChineseContextType | undefined>(undefined);

export function ChineseProvider({ children }: { children: ReactNode }) {
  const [showPinyin, setShowPinyin] = useState(true);
  const [isTraditional, setIsTraditional] = useState(false);
  const [fontSize, setFontSize] = useState(16);

  return (
    <ChineseContext.Provider value={{ showPinyin, setShowPinyin, isTraditional, setIsTraditional, fontSize, setFontSize }}>
      {children}
    </ChineseContext.Provider>
  );
}

export function useChinese() {
  const context = useContext(ChineseContext);
  if (context === undefined) {
    throw new Error('useChinese must be used within a ChineseProvider');
  }
  return context;
}
