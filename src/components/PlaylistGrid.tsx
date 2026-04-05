import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Headphones, Trash2, Play, Video as VideoIcon } from 'lucide-react';
import { getVideos, deleteVideo, incrementViews, VideoItem } from '../lib/storage';
import PinyinText from './chinese/PinyinText';
import { useChinese } from '../lib/ChineseContext';
import { toTraditional, toSimplified } from '../lib/chinese';
import { useLanguageStore } from '../store/languageStore';

export default function PlaylistGrid({ refreshTrigger }: { refreshTrigger: number }) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const { language, config } = useLanguageStore();
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean
    videoId: string
    videoTitle: string
  } | null>(null);

  useEffect(() => {
    const allVideos = getVideos();
    const filtered = allVideos.filter(v => 
      v.language === language || 
      v.language.startsWith(language.split('-')[0])
    );
    filtered.sort((a, b) => b.createdAt - a.createdAt);
    setVideos(filtered);
  }, [refreshTrigger, language]);

  const handleDeleteVideo = (videoId: string) => {
    deleteVideo(videoId);
    const allVideos = getVideos();
    const filtered = allVideos.filter(v => 
      v.language === language || 
      v.language.startsWith(language.split('-')[0])
    );
    setVideos(filtered.sort((a, b) => b.createdAt - a.createdAt));
    setDeleteConfirm(null);
  };

  return (
    <div className="w-full pb-20">
      <h2 className="text-2xl font-bold text-white mb-6">Playlist</h2>
      
      {videos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-800 flex items-center justify-center">
            <span className="text-2xl">📋</span>
          </div>
          <p className="text-zinc-400 text-sm font-medium">Playlist trống</p>
          <p className="text-zinc-600 text-xs">
            Dán link YouTube vào ô bên trên để thêm video
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {videos.map((video) => (
            <VideoCard 
              key={video.id} 
              video={video} 
              onDelete={() => setDeleteConfirm({
                show: true,
                videoId: video.id,
                videoTitle: video.title
              })} 
            />
          ))}
        </div>
      )}

      {deleteConfirm?.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
             onClick={() => setDeleteConfirm(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 w-72 shadow-2xl"
               onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">Xoá video?</h3>
                <p className="text-zinc-500 text-xs mt-0.5 line-clamp-1">
                  {deleteConfirm.videoTitle}
                </p>
              </div>
            </div>
            <p className="text-zinc-400 text-sm mb-5">
              Video sẽ bị xoá khỏi playlist. Bạn có thể thêm lại bất cứ lúc nào.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors">
                Huỷ
              </button>
              <button
                onClick={() => deleteConfirm && handleDeleteVideo(deleteConfirm.videoId)}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors">
                Xoá
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VideoCard({ video, onDelete }: { video: VideoItem; onDelete: () => void }) {
  const { showPinyin: contextShowPinyin, isTraditional } = useChinese();
  const navigate = useNavigate();
  
  const formatViews = (views: number) => {
    if (views >= 1000) return (views / 1000).toFixed(1) + 'K';
    return views.toString();
  };

  const isChinese = video.language.startsWith('zh');
  const shouldShowPinyin = isChinese && video.showPinyin && contextShowPinyin;

  const displayTitle = isChinese ? (isTraditional ? toTraditional(video.title) : toSimplified(video.title)) : video.title;
  const displayChannel = isChinese ? (isTraditional ? toTraditional(video.channel) : toSimplified(video.channel)) : video.channel;

  const getLanguageBadge = (lang: string) => {
    if (lang.startsWith('zh')) return '🇨🇳 ZH';
    switch (lang) {
      case 'ja': return '🇯🇵 JP';
      case 'en': return '🇺🇸 EN';
      case 'ko': return '🇰🇷 KR';
      case 'vi': return '🇻🇳 VI';
      default: return '🌐 ' + lang.toUpperCase();
    }
  };

  const getSubtitleBadge = (sub: string) => {
    switch (sub) {
      case 'none': return 'Không phụ đề';
      case 'vi': return 'Phụ đề Việt';
      case 'bilingual': return 'Song ngữ';
      case 'auto': return 'Tự động';
      case 'youtube': return 'Từ YouTube';
      default: return sub;
    }
  };

  return (
    <div 
      className="group flex flex-col gap-3 bg-zinc-900/40 rounded-2xl p-3 border border-zinc-800/50 hover:border-emerald-500/30 transition-all hover:bg-zinc-800/40 relative"
      title={isChinese ? (isTraditional ? '繁體' : '简体') : undefined}
    >
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-5 right-5 z-20 w-8 h-8 bg-red-500/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-lg"
        title="Xóa video"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-800">
        <img 
          src={video.thumbnail} 
          alt={video.title} 
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
        
        <div className={`absolute top-2 left-2 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-md border border-white/10 ${isChinese ? 'bg-red-500/80' : 'bg-black/70'}`}>
          {getLanguageBadge(video.language)}
        </div>
        
        <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-white text-[10px] font-medium px-2 py-1 rounded-full flex items-center gap-1 border border-white/10">
          <Headphones className="w-3 h-3" />
          {formatViews(video.views)}
        </div>
        
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center text-white transform scale-90 group-hover:scale-100 transition-transform shadow-lg shadow-emerald-500/30">
            <Play className="w-5 h-5 ml-1 fill-current" />
          </div>
        </div>
      </div>
      
      <div className="flex flex-col gap-2 px-1">
        <h3 className="text-sm font-bold text-zinc-100 line-clamp-2 group-hover:text-emerald-400 transition-colors leading-snug" title={displayTitle}>
          {displayTitle}
        </h3>
        
        {shouldShowPinyin && (
          <div className="text-xs text-zinc-500 line-clamp-1 opacity-70">
            <PinyinText text={video.title} showPinyin={true} ignoreFontSize={true} />
          </div>
        )}
        
        <div className="flex items-center justify-between mt-1">
          <p className="text-xs text-zinc-400 truncate pr-2 flex items-center gap-1.5">
            <span className="w-4 h-4 rounded-full bg-zinc-700 flex items-center justify-center text-[8px] text-zinc-300">
              {displayChannel.charAt(0).toUpperCase()}
            </span>
            {displayChannel}
          </p>
          <span className="text-[10px] text-zinc-500 bg-zinc-800/80 px-2 py-0.5 rounded-md whitespace-nowrap">
            {getSubtitleBadge(video.subtitle)}
          </span>
        </div>

        <button 
          onClick={() => {
            incrementViews(video.id);
            navigate(`/watch/${video.youtubeId}`, { state: { video } });
          }}
          className="w-full mt-2 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-semibold rounded-lg transition-colors border border-emerald-500/20"
        >
          Học ngay
        </button>
      </div>
    </div>
  );
}
