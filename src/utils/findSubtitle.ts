export interface SubtitleItem {
  text: string
  start: number
  duration: number
  translation?: string
  [key: string]: any
}

export function findCurrentSubtitle(
  subtitles: SubtitleItem[],
  currentTime: number
): SubtitleItem | null {
  if (!subtitles || subtitles.length === 0) return null

  let left = 0
  let right = subtitles.length - 1
  let bestMatch: SubtitleItem | null = null

  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    const sub = subtitles[mid]
    const start = sub.start ?? 0
    const duration = sub.duration ?? 3
    const endTime = start + duration

    if (currentTime >= start && currentTime <= endTime) {
      return sub // Nằm chính xác trong khoảng
    }

    if (currentTime < start) {
      right = mid - 1
    } else {
      // time > endTime
      // Lưu lại sub gần nhất phòng trường hợp gap nhỏ
      bestMatch = sub
      left = mid + 1
    }
  }

  // Xử lý gap (khoảng trống giữa 2 sub):
  // Nếu time vượt qua sub hiện tại nhưng chưa tới sub tiếp theo
  // và khoảng cách < 0.5s thì vẫn giữ sub cũ cho mượt
  if (bestMatch) {
    const start = bestMatch.start ?? 0
    const duration = bestMatch.duration ?? 3
    const gap = currentTime - (start + duration)
    if (gap > 0 && gap < 0.5) {
      return bestMatch
    }
  }

  return null
}
