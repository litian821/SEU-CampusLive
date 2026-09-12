import { Link, useParams } from 'react-router-dom'
import HlsVideo from '../components/HlsVideo'

function LivePlayerPage() {
  const { streamId = 'demo' } = useParams()
  const safeId = encodeURIComponent(streamId)
  return (
    <section className="page-section narrow">
      <Link className="back-link" to="/live">← 返回直播列表</Link>
      <div className="page-heading"><p className="eyebrow">LIVE NOW</p><h1>校园赛事直播</h1></div>
      <HlsVideo src={`/live/${safeId}.m3u8`} title="校园赛事直播" />
      <p className="hint">若直播尚未开始，播放器会等待 OBS 推流。</p>
    </section>
  )
}

export default LivePlayerPage
