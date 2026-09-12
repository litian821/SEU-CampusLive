import { Link, useParams } from 'react-router-dom'

function VodPlayerPage() {
  const { videoId = '' } = useParams()
  const filename = decodeURIComponent(videoId)
  return (
    <section className="page-section narrow">
      <Link className="back-link" to="/vod">← 返回点播列表</Link>
      <div className="page-heading"><p className="eyebrow">REPLAY</p><h1>{filename}</h1></div>
      <div className="player-frame">
        <video controls playsInline preload="metadata" src={`/media/vod/${encodeURIComponent(filename)}`} aria-label={filename} />
      </div>
    </section>
  )
}

export default VodPlayerPage
