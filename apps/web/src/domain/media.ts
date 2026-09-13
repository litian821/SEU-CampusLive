import type { LiveStream, VodItem } from '../api'
export const campusMatch = {
  title: '院系杯 · 网络空间安全学院 vs 电子科学与工程学院',
  teams: ['网络空间安全学院', '电子科学与工程学院'],
  cover: '/brand/seu-basketball.png',
  caption: '用户提供实拍 · AI 辅助调色',
}
export type MediaCard = {
  id: string; title: string; sport: string; href: string; description: string
  meta: string; cover?: string; status?: LiveStream['status']
}
export function liveCard(item: LiveStream): MediaCard {
  return { ...item, href: `/live/${encodeURIComponent(item.id)}`, description: item.venue,
    meta: '校园赛事', cover: item.title === campusMatch.title ? campusMatch.cover : undefined }
}
export function vodCard(item: VodItem): MediaCard {
  return { id: item.id, title: item.title, href: `/vod/${encodeURIComponent(item.id)}`,
    sport: '赛事回放', description: '重温校园比赛，留住每一次全力以赴。',
    meta: `${(item.size_bytes / 1024 / 1024).toFixed(1)} MB · 视频回放` }
}
export function filterCards(items: MediaCard[], query: string, sport: string) {
  const needle = query.trim().toLocaleLowerCase()
  return items.filter(item => (sport === '全部' || item.sport === sport)
    && `${item.title} ${item.id} ${item.sport} ${item.description}`.toLocaleLowerCase().includes(needle))
}
