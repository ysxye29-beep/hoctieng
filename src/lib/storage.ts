export interface VideoItem {
  id: string;
  youtubeId: string;
  title: string;
  thumbnail: string;
  channel: string;
  language: string;
  subtitle: string;
  createdAt: number;
  views: number;
  category: string;
  showPinyin?: boolean;
}

const STORAGE_KEY = 'shadowing_videos';

export function getVideos(): VideoItem[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addVideo(video: VideoItem): void {
  const videos = getVideos();
  videos.push(video);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
}

export function deleteVideo(id: string): void {
  const videos = getVideos();
  const filtered = videos.filter(v => v.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function incrementViews(id: string): void {
  const videos = getVideos();
  const updated = videos.map(v => v.id === id ? { ...v, views: v.views + 1 } : v);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}
