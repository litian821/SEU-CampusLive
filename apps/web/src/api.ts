export type LiveStatus = 'live' | 'offline' | 'unknown'
export type LiveStream = {
  id: string; title: string; sport: string; venue: string
  status: LiveStatus; playback_url: string
}
export type LiveAngle = { id: string; name: string; status: LiveStatus; playback_url: string }
export type LiveMatch = {
  id: string; title: string; sport: string; venue: string
  status: LiveStatus; angles: LiveAngle[]
}
export type VodItem = { id: string; title: string; filename: string; size_bytes: number; playback_url: string }
export type Photo = { id: string; title: string; url: string; size_bytes: number }
export type PhotoAlbum = { id: string; title: string; photos: Photo[] }
export async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal })
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    throw new Error(typeof payload?.detail === 'string' ? payload.detail : `请求失败：${response.status}`)
  }
  return response.json() as Promise<T>
}
export const getLiveStreams = (signal?: AbortSignal) => getJson<LiveStream[]>('/api/live', signal)
export const getLiveMatches = (signal?: AbortSignal) => getJson<LiveMatch[]>('/api/matches', signal)
export const getVodItems = (signal?: AbortSignal) => getJson<VodItem[]>('/api/vod', signal)
export const getAlbums = (signal?: AbortSignal) => getJson<PhotoAlbum[]>('/api/photos', signal)
export const getLiveStream = (id: string, signal?: AbortSignal) => getJson<LiveStream>(`/api/live/${encodeURIComponent(id)}`, signal)
export const getLiveMatch = (id: string, signal?: AbortSignal) => getJson<LiveMatch>(`/api/matches/${encodeURIComponent(id)}`, signal)
export const getVodItem = (id: string, signal?: AbortSignal) => getJson<VodItem>(`/api/vod/detail?filename=${encodeURIComponent(id)}`, signal)
export const liveStatus = { live: '正在直播', offline: '尚未开播', unknown: '状态暂不可用' }
