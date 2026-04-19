import { useState, useEffect } from 'react';
import { Youtube, Upload, Link as LinkIcon, ChevronDown, Video } from 'lucide-react';
import { extractYouTubeId, fetchYouTubeInfo, isValidYouTubeUrl } from '../lib/youtube';
import { addVideo, VideoItem } from '../lib/storage';
import { useLanguageStore, type Language } from '../store/languageStore';

const heroGradients: Record<Language, string> = {
  'en':    'from-blue-900/40 to-indigo-900/20',    // xanh Anh/Mỹ  
  'zh-CN': 'from-red-900/40 to-orange-900/20',     // đỏ Trung
};

export default function Hero({ onVideoAdded }: { onVideoAdded: () => void }) {
  const { config, language } = useLanguageStore();
  const [url, setUrl] = useState('');
  const [lang, setLang] = useState(language as string);
  const [sub, setSub] = useState('none');
  const [showPinyin, setShowPinyin] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setLang(language);
  }, [language]);

  const isChineseLang = lang === 'zh-CN' || lang === 'zh-TW';

  const handleCreate = async () => {
    setError(null);
    if (!isValidYouTubeUrl(url)) {
      setError('⚠️ Vui lòng nhập link YouTube hợp lệ');
      return;
    }
    if (!lang) {
      setError('⚠️ Vui lòng chọn ngôn ngữ video');
      return;
    }

    setIsCreating(true);
    const videoId = extractYouTubeId(url);
    
    if (!videoId) {
      setError('⚠️ Vui lòng nhập link YouTube hợp lệ');
      setIsCreating(false);
      return;
    }

    const info = await fetchYouTubeInfo(videoId);
    
    if (!info) {
      setError('❌ Không thể lấy thông tin video. Video có thể là private hoặc không tồn tại.');
      setIsCreating(false);
      return;
    }

    const newVideo: VideoItem = {
      id: crypto.randomUUID(),
      youtubeId: videoId,
      title: info.title,
      thumbnail: info.thumbnail,
      channel: info.channel,
      language: lang,
      subtitle: sub,
      createdAt: Date.now(),
      views: 0,
      category: 'all',
      showPinyin: isChineseLang ? showPinyin : undefined
    };

    addVideo(newVideo);
    onVideoAdded();
    
    setUrl('');
    setIsCreating(false);
    
    setToast('✅ Đã thêm video thành công!');
    setTimeout(() => setToast(null), 3000);
  };

  const placeholderText = config.inputPlaceholder;

  return (
    <div className={`relative w-full rounded-3xl overflow-hidden bg-gradient-to-r ${heroGradients[language]} border border-emerald-500/20 p-8 md:p-12 mb-10 shadow-2xl shadow-emerald-900/20 transition-colors duration-500`}>
      {toast && (
        <div className="absolute top-4 right-4 z-50 bg-emerald-500 text-white px-4 py-2 rounded-lg shadow-lg font-medium animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}
      
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none"></div>
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="relative z-10 max-w-3xl">
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight tracking-tight">
          {config.heroTitle}
        </h1>
        <p className="text-lg text-zinc-300 mb-6">
          {config.heroSubtitle}
        </p>

        <div className="bg-[#121212]/80 backdrop-blur-xl border border-zinc-800/80 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-4 mb-6 border-b border-zinc-800 pb-4">
            <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800/80 text-white font-medium text-sm hover:bg-zinc-700 transition-colors border border-zinc-700">
              <Youtube className="w-4 h-4 text-red-500" />
              Youtube
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-full text-zinc-400 font-medium text-sm hover:bg-zinc-800/50 hover:text-zinc-200 transition-colors">
              <Upload className="w-4 h-4" />
              Tải lên
            </button>
          </div>
          
          {error && (
            <div className="mb-4 text-red-400 text-sm font-medium bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-4 items-end">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Link Youtube</label>
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input 
                  type="text" 
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={placeholderText} 
                  className="w-full bg-zinc-900/80 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                  Ngôn ngữ video <span className="text-amber-500">💡</span>
                </label>
                {language === 'zh-CN' && (
                  <div className="flex items-center gap-1 text-[10px]">
                    <button 
                      onClick={() => setLang('zh-CN')}
                      className={`px-1.5 py-0.5 rounded ${lang === 'zh-CN' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Giản
                    </button>
                    <button 
                      onClick={() => setLang('zh-TW')}
                      className={`px-1.5 py-0.5 rounded ${lang === 'zh-TW' ? 'bg-emerald-500/20 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'}`}
                    >
                      Phồn
                    </button>
                  </div>
                )}
              </div>
              <div className="relative">
                <select 
                  value={lang}
                  onChange={(e) => setLang(e.target.value)}
                  className="w-full appearance-none bg-zinc-900/80 border border-zinc-700 rounded-xl py-3 pl-4 pr-10 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
                >
                  <option value="">Chọn ngôn ngữ</option>
                  <option value="zh-CN">Tiếng Trung (Giản thể)</option>
                  <option value="zh-TW">Tiếng Trung (Phồn thể)</option>
                  <option value="en">Tiếng Anh</option>
                  <option value="vi">Tiếng Việt</option>
                  <option value="ja">Tiếng Nhật</option>
                  <option value="ko">Tiếng Hàn</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Phụ đề</label>
              <div className="relative">
                <select 
                  value={sub}
                  onChange={(e) => setSub(e.target.value)}
                  className="w-full appearance-none bg-zinc-900/80 border border-zinc-700 rounded-xl py-3 pl-4 pr-10 text-sm text-zinc-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all cursor-pointer"
                >
                  <option value="">Chọn phụ đề</option>
                  <option value="auto">Tự động tạo</option>
                  <option value="youtube">Từ Youtube</option>
                  <option value="none">Không phụ đề</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
              </div>
            </div>
            
            <button 
              onClick={handleCreate}
              disabled={isCreating}
              className="h-[46px] px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all hover:shadow-emerald-500/40 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isCreating ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Video className="w-4 h-4" />
              )}
              {isCreating ? 'Đang tạo...' : 'Tạo video'}
            </button>
          </div>

          {isChineseLang && (
            <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center gap-4 animate-in fade-in slide-in-from-top-2">
              <label className="text-sm font-medium text-zinc-300">Hiển thị Pinyin mặc định:</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="showPinyin" 
                    checked={showPinyin} 
                    onChange={() => setShowPinyin(true)}
                    className="w-4 h-4 text-emerald-500 bg-zinc-900 border-zinc-700 focus:ring-emerald-500 focus:ring-offset-zinc-900" 
                  />
                  <span className="text-sm text-zinc-400">Có</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="showPinyin" 
                    checked={!showPinyin} 
                    onChange={() => setShowPinyin(false)}
                    className="w-4 h-4 text-emerald-500 bg-zinc-900 border-zinc-700 focus:ring-emerald-500 focus:ring-offset-zinc-900" 
                  />
                  <span className="text-sm text-zinc-400">Không</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Mascot illustration */}
      <div className="absolute right-12 bottom-0 hidden lg:block pointer-events-none">
        <div className="w-64 h-64 relative">
          {/* A simple CSS representation of a mascot since we don't have an image asset */}
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-emerald-400 rounded-t-full border-4 border-emerald-600 flex flex-col items-center justify-end pb-8 shadow-2xl">
            <div className="flex gap-4 mb-4">
              <div className="w-8 h-8 bg-white rounded-full border-4 border-emerald-800 flex items-center justify-center">
                <div className="w-3 h-3 bg-emerald-900 rounded-full"></div>
              </div>
              <div className="w-8 h-8 bg-white rounded-full border-4 border-emerald-800 flex items-center justify-center">
                <div className="w-3 h-3 bg-emerald-900 rounded-full"></div>
              </div>
            </div>
            <div className="w-12 h-6 bg-red-400 rounded-full border-4 border-emerald-800"></div>
            
            {/* Popcorn bucket */}
            <div className="absolute -bottom-4 -left-8 w-24 h-28 bg-white border-4 border-red-500 rounded-b-xl transform -rotate-12 flex flex-col overflow-hidden">
              <div className="flex-1 flex gap-1">
                <div className="w-4 h-full bg-red-500"></div>
                <div className="w-4 h-full bg-white"></div>
                <div className="w-4 h-full bg-red-500"></div>
                <div className="w-4 h-full bg-white"></div>
                <div className="w-4 h-full bg-red-500"></div>
              </div>
              {/* Popcorn pieces */}
              <div className="absolute -top-6 left-0 w-full h-12 flex flex-wrap justify-center gap-1">
                <div className="w-6 h-6 bg-yellow-200 rounded-full border-2 border-yellow-400"></div>
                <div className="w-5 h-5 bg-yellow-100 rounded-full border-2 border-yellow-300"></div>
                <div className="w-7 h-7 bg-yellow-200 rounded-full border-2 border-yellow-400"></div>
                <div className="w-6 h-6 bg-yellow-100 rounded-full border-2 border-yellow-300"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
