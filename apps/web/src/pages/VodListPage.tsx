import { Link } from 'react-router-dom'
import { getVodItems } from '../api'
import { useCatalog } from '../hooks/useCatalog'

const formatSize = (size: number) => `${(size / 1024 / 1024).toFixed(1)} MB`

function VodListPage() {
  const { data, error } = useCatalog(getVodItems)
  return (
    <section className="page-section">
      <div className="page-heading"><p className="eyebrow">REPLAY</p><h1>赛事点播</h1></div>
      {error && <p className="notice error">{error}</p>}
      {!data && !error && <p className="notice">正在加载…</p>}
      {data?.length === 0 && <p className="notice">暂无点播视频。请把测试视频放入 storage/vod/。</p>}
      <div className="card-grid">
        {data?.map((video) => (
          <Link className="event-card" key={video.id} to={`/vod/${encodeURIComponent(video.id)}`}>
            <div className="event-cover vod-cover"><span>PLAY</span></div>
            <div className="event-body"><h2>{video.title}</h2><p>{formatSize(video.size_bytes)}</p></div>
          </Link>
        ))}
      </div>
    </section>
  )
}

export default VodListPage
