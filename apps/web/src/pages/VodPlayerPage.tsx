import { useCallback, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getVodItem } from '../api'
import { useCatalog } from '../hooks/useCatalog'

function VodPlayerPage() {
  // React Router has already decoded the parameter. Decoding again corrupts '%' filenames.
  const { videoId = '' } = useParams()
  const loader = useCallback((signal?: AbortSignal) => getVodItem(videoId, signal), [videoId])
  const { data, error, retry } = useCatalog(loader)
  const [failed, setFailed] = useState(false)
  const reload = () => { setFailed(false); retry() }
  return (
    <section className="page-section narrow">
      <Link className="back-link" to="/vod">← 返回点播列表</Link>
      <div className="page-heading"><p className="eyebrow">REPLAY</p><h1>{data?.title || '赛事回放'}</h1></div>
      {error && <div className="notice error" role="alert">{error} <button onClick={reload}>重试</button></div>}
      {!data && !error && <p role="status">正在加载视频…</p>}
      {data && <><div className="player-frame"><video key={data.id} controls playsInline preload="metadata" src={data.playback_url} aria-label={data.title} onError={() => setFailed(true)} onLoadedData={() => setFailed(false)} /></div><p className="hint">使用播放器控制栏播放、暂停、拖动进度或进入全屏。</p></>}
      {failed && <div className="notice error" role="alert">视频加载失败，可能已下架、网络中断或编码不受浏览器支持。<button onClick={reload}>重新加载</button></div>}
    </section>
  )
}
export default VodPlayerPage
