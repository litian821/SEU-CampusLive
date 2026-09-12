import { Link } from 'react-router-dom'
import { getLiveStreams } from '../api'
import { useCatalog } from '../hooks/useCatalog'

function LiveListPage() {
  const { data, error } = useCatalog(getLiveStreams)
  return (
    <section className="page-section">
      <div className="page-heading"><p className="eyebrow">LIVE</p><h1>赛事直播</h1></div>
      {error && <p className="notice error">{error}</p>}
      {!data && !error && <p className="notice">正在加载…</p>}
      <div className="card-grid">
        {data?.map((stream) => (
          <Link className="event-card" key={stream.id} to={`/live/${encodeURIComponent(stream.id)}`}>
            <div className="event-cover live-cover"><span>LIVE</span></div>
            <div className="event-body"><h2>{stream.title}</h2><p>{stream.sport} · {stream.venue}</p></div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default LiveListPage
