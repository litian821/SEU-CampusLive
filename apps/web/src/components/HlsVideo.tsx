import Hls from 'hls.js'
import { useEffect, useRef, useState } from 'react'

type Props = {
  src: string
  title: string
}

function HlsVideo({ src, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [message, setMessage] = useState('正在连接直播…')

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src
      setMessage('')
      return
    }

    if (!Hls.isSupported()) {
      setMessage('当前浏览器不支持 HLS 播放。')
      return
    }

    const hls = new Hls({ liveSyncDurationCount: 3 })
    hls.loadSource(src)
    hls.attachMedia(video)
    hls.on(Hls.Events.MANIFEST_PARSED, () => setMessage(''))
    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) setMessage('直播暂未开始或连接中断，请稍后重试。')
    })
    return () => hls.destroy()
  }, [src])

  return (
    <div className="player-frame">
      <video ref={videoRef} controls playsInline aria-label={title} />
      {message && <p className="player-message">{message}</p>}
    </div>
  )
}

export default HlsVideo
