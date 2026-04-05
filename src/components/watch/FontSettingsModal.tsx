import { X } from 'lucide-react'

export interface FontSettings {
  primary: number
  translation: number
  pinyin: number
  listPrimary: number
  listTranslation: number
}

export const defaultFontSettings: FontSettings = {
  primary: 24,
  translation: 14,
  pinyin: 12,
  listPrimary: 16,
  listTranslation: 14
}

interface Props {
  settings: FontSettings
  onChange: (settings: FontSettings) => void
  onClose: () => void
  isChinese: boolean
}

export default function FontSettingsModal({ settings, onChange, onClose, isChinese }: Props) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-sm overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h3 className="font-medium text-white">Cài đặt cỡ chữ</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Khu vực hiển thị chính</h4>
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <label className="text-zinc-300">Chữ {isChinese ? 'Hán' : 'Anh'}</label>
                <span className="text-zinc-500">{settings.primary}px</span>
              </div>
              <input 
                type="range" min="16" max="48" step="1" 
                value={settings.primary}
                onChange={e => onChange({...settings, primary: Number(e.target.value)})}
                className="w-full accent-emerald-500"
              />
            </div>

            {isChinese && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <label className="text-zinc-300">Phiên âm (Pinyin)</label>
                  <span className="text-zinc-500">{settings.pinyin}px</span>
                </div>
                <input 
                  type="range" min="10" max="24" step="1" 
                  value={settings.pinyin}
                  onChange={e => onChange({...settings, pinyin: Number(e.target.value)})}
                  className="w-full accent-emerald-500"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <label className="text-zinc-300">Bản dịch (Việt)</label>
                <span className="text-zinc-500">{settings.translation}px</span>
              </div>
              <input 
                type="range" min="12" max="32" step="1" 
                value={settings.translation}
                onChange={e => onChange({...settings, translation: Number(e.target.value)})}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Khu vực danh sách</h4>
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <label className="text-zinc-300">Chữ {isChinese ? 'Hán' : 'Anh'}</label>
                <span className="text-zinc-500">{settings.listPrimary}px</span>
              </div>
              <input 
                type="range" min="12" max="32" step="1" 
                value={settings.listPrimary}
                onChange={e => onChange({...settings, listPrimary: Number(e.target.value)})}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <label className="text-zinc-300">Bản dịch (Việt)</label>
                <span className="text-zinc-500">{settings.listTranslation}px</span>
              </div>
              <input 
                type="range" min="10" max="24" step="1" 
                value={settings.listTranslation}
                onChange={e => onChange({...settings, listTranslation: Number(e.target.value)})}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>
          
          <button 
            onClick={() => onChange(defaultFontSettings)}
            className="w-full py-2 text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Khôi phục mặc định
          </button>
        </div>
      </div>
    </div>
  )
}
