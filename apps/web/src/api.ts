export type LiveStream = {
  id: string
  title: string
  sport: string
  venue: string
  status: string
  playback_url: string
}

export type VodItem = {
  id: string
  title: string
  filename: string
  size_bytes: number
  playback_url: string
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`)
  }
  return response.json() as Promise<T>
}

export const getLiveStreams = () => getJson<LiveStream[]>('/api/live')
export const getVodItems = () => getJson<VodItem[]>('/api/vod')
