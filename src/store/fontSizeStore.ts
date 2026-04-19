import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FontSizeSettings {
  zhMain: number;
  zhTrans: number;
  enMain: number;
  enTrans: number;
  dictSize: number;
  dictWidth: number;
  dictHeight: number;
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
        dictSize: 100,
        dictWidth: 340,
        dictHeight: 500,
      },
      updateSettings: (newSettings) =>
        set((state) => {
          // Ensure dictSize is never NaN if it was undefined in legacy storage
          const currentSettings = {
            ...state.settings,
            dictSize: state.settings.dictSize ?? 100,
            dictWidth: state.settings.dictWidth ?? 340,
            dictHeight: state.settings.dictHeight ?? 500,
          };
          return {
            settings: { ...currentSettings, ...newSettings },
          };
        }),
    }),
    {
      name: 'font_size_settings',
    }
  )
);
