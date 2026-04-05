export function extractYouTubeId(url: string): string | null {
  const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[7].length === 11) ? match[7] : null;
}

export async function fetchYouTubeInfo(videoId: string): Promise<{
  title: string
  thumbnail: string
  channel: string
} | null> {
  try {
    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
    if (!response.ok) return null;
    const data = await response.json();
    if (data.error) return null;
    return {
      title: data.title,
      thumbnail: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      channel: data.author_name
    };
  } catch (error) {
    // Fallback if noembed fails
    return {
      title: 'YouTube Video',
      thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      channel: 'YouTube Channel'
    };
  }
}

export function isValidYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}
