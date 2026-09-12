import { Link } from 'react-router-dom'

function HomePage() {
  return (
    <>
      <section className="hero">
        <p className="eyebrow">CAMPUS SPORTS</p>
        <h1>把每一场校园比赛，带到每一块屏幕。</h1>
        <p>观看正在进行的赛事，或回看已经结束的精彩对局。</p>
        <div className="actions">
          <Link className="button primary" to="/live">观看直播</Link>
          <Link className="button secondary" to="/vod">浏览点播</Link>
        </div>
      </section>
      <section className="feature-grid" aria-label="平台能力">
        <article><strong>OBS 推流</strong><span>标准 RTMP 接入</span></article>
        <article><strong>浏览器直播</strong><span>HLS 自研播放页面</span></article>
        <article><strong>赛事回看</strong><span>原生播放与进度拖动</span></article>
      </section>
    </>
  )
}

export default HomePage
