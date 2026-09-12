import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getVodItems } from '../api'
import { useCatalog } from '../hooks/useCatalog'

function VodListPage() {
  const { data, error, retry } = useCatalog(getVodItems)
  const [query, setQuery] = useState('')
  const filtered = data?.filter((item) => `${item.title} ${item.filename}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
  return (
    <section className="page-section">
      <div className="page-heading"><p className="eyebrow">REPLAY</p><h1>赛事点播</h1></div>
      <div className="catalog-tools"><label htmlFor="vod-search">搜索比赛<input id="vod-search" type="search" placeholder="输入赛事名称" value={query} onChange={(event) => setQuery(event.target.value)} /></label><button className="button secondary" onClick={retry}>刷新列表</button></div>
      {error && <p className="notice error" role="alert">{error}</p>}
      {!data && !error && <p className="notice" role="status">正在加载…</p>}
      {data?.length === 0 && <p className="notice">暂无赛事回放，比赛视频发布后会显示在这里。</p>}
      {!!data?.length && <p className="hint" role="status">找到 {filtered?.length} 个视频</p>}
      {!!data?.length && filtered?.length === 0 && <p className="notice">没有匹配的比赛，试试其他关键词。</p>}
      <div className="card-grid">
        {filtered?.map((video) => (
          <Link className="event-card" key={video.id} to={`/vod/${encodeURIComponent(video.id)}`}>
            <div className="event-cover vod-cover"><span>赛事回放</span></div>
            <div className="event-body"><h2>{video.title}</h2><p>{(video.size_bytes / 1024 / 1024).toFixed(1)} MB</p></div>
          </Link>
        ))}
      </div>
    </section>
  )
}
export default VodListPage
