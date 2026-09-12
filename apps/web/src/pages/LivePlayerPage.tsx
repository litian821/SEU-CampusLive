import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getLiveStream, liveStatus } from '../api'
import { useCatalog } from '../hooks/useCatalog'
import HlsVideo from '../components/HlsVideo'

function LivePlayerPage() {
  const { streamId = 'demo' } = useParams()
  const loader = useCallback((signal?: AbortSignal) => getLiveStream(streamId, signal), [streamId])
  const { data, error, retry } = useCatalog(loader, 10000)
  return (
    <section className="page-section narrow">
      <Link className="back-link" to="/live">← 返回直播列表</Link>
      <div className="page-heading"><p className="eyebrow">LIVE</p><h1>{data?.title || '赛事直播'}</h1></div>
      {error && <div className="notice error" role="alert">{error} <button onClick={retry}>重试</button></div>}
      {!data && !error && <p role="status">正在加载频道…</p>}
      {data && <><p className="hint">{error ? '状态更新失败' : liveStatus[data.status]} · {data.sport} · {data.venue}</p><HlsVideo src={data.playback_url} title={data.title} /></>}
      <p className="hint">直播采用 HLS，画面会比现场晚数秒。开播或断线后，播放器会自动尝试连接。</p>
    </section>
  )
}
export default LivePlayerPage
