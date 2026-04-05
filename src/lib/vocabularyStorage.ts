export interface VocabularyItem {
  id: string;
  word: string;
  pinyin?: string;
  phonetic?: string;
  type: string;
  meaning_vi: string;
  example: string;
  example_vi: string;
  source_video_id: string;
  source_video_title: string;
  source_timestamp: number | null;
  createdAt: number;
}

const STORAGE_KEY = 'shadowing_vocabulary';

export function getVocabulary(): VocabularyItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveVocabularyItem(item: Omit<VocabularyItem, 'id' | 'createdAt'>): void {
  const vocab = getVocabulary();
  
  // Check for duplicates
  const exists = vocab.some(v => v.word === item.word && v.source_video_id === item.source_video_id);
  if (exists) return;

  const newItem: VocabularyItem = {
    ...item,
    id: Math.random().toString(36).substring(2, 9),
    createdAt: Date.now(),
  };

  vocab.push(newItem);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(vocab));
}

export function saveMultipleVocabularyItems(items: Omit<VocabularyItem, 'id' | 'createdAt'>[]): number {
  const vocab = getVocabulary();
  let addedCount = 0;

  const newItems: VocabularyItem[] = [];
  for (const item of items) {
    const exists = vocab.some(v => v.word === item.word && v.source_video_id === item.source_video_id);
    if (!exists) {
      newItems.push({
        ...item,
        id: Math.random().toString(36).substring(2, 9),
        createdAt: Date.now(),
      });
      addedCount++;
    }
  }

  if (newItems.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...vocab, ...newItems]));
  }
  
  return addedCount;
}

export function deleteVocabularyItem(id: string): void {
  const vocab = getVocabulary();
  const filtered = vocab.filter(v => v.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}
