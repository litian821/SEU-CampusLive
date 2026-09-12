import { Link } from 'react-router-dom'
import { getLiveStreams, liveStatus } from '../api'
import { useCatalog } from '../hooks/useCatalog'

function LiveListPage() {
  const { data, error, retry } = useCatalog(getLiveStreams, 10000)
  return (
    <section className="page-section">
      <div className="page-heading"><p className="eyebrow">LIVE</p><h1>赛事直播</h1><p className="hint">开播状态每 10 秒更新，进入频道即可等待比赛开始。</p></div>
      {error && <div className="notice error" role="alert">{error} {data && '以下为上次获取的状态。'} <button onClick={retry}>重试</button></div>}
      {!data && !error && <p className="notice" role="status">正在加载…</p>}
      <div className="card-grid">
        {data?.map((stream) => (
          <Link className="event-card" key={stream.id} to={`/live/${encodeURIComponent(stream.id)}`}>
            <div className={`event-cover live-cover ${stream.status}`}><span>{liveStatus[stream.status]}</span></div>
            <div className="event-body"><h2>{stream.title}</h2><p>{stream.sport} · {stream.venue}</p></div>
          </Link>
        ))}
      </div>
    </section>
  )
}
export default LiveListPage
