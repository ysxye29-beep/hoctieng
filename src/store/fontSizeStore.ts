import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FontSizeSettings {
  zhMain: number;
  zhTrans: number;
  enMain: number;
  enTrans: number;
}

interface FontSizeStore {
  settings: FontSizeSettings;
  updateSettings: (newSettings: Partial<FontSizeSettings>) => void;
}

export const useFontSizeStore = create<FontSizeStore>()(
  persist(
    (set) => ({
      settings: {
        zhMain: 24,
        zhTrans: 18,
        enMain: 24,
        enTrans: 18,
      },
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
    }),
    {
      name: 'font_size_settings',
    }
  )
);
