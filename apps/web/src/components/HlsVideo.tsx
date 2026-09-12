import Hls from 'hls.js'
import { useEffect, useRef, useState } from 'react'

type Props = { src: string; title: string }

function HlsVideo({ src, title }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [message, setMessage] = useState('正在连接直播…')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    let hls: Hls | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let failures = 0
    let mediaRecoveries = 0
    let active = true
    setMessage('正在连接直播…')

    const ready = () => { failures = 0; setMessage('') }
    const retry = () => {
      if (timer || !active) return
      const seconds = Math.min(5 * 2 ** failures++, 30)
      setMessage(`直播尚未开始或连接中断，${seconds} 秒后自动重试。`)
      timer = setTimeout(() => { timer = undefined; connect() }, seconds * 1000)
    }
    const nativeError = () => retry()
    function connect() {
      hls?.destroy()
      hls = undefined
      // Prefer hls.js where MSE is supported; native support can be incomplete (Edge).
      if (!Hls.isSupported() && video!.canPlayType('application/vnd.apple.mpegurl')) {
        video!.src = src
        video!.load()
      } else if (Hls.isSupported()) {
        hls = new Hls({ liveSyncDurationCount: 3 })
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!data.fatal) return
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries++ < 2) {
            setMessage('正在恢复播放…')
            hls?.recoverMediaError()
          } else {
            hls?.destroy()
            hls = undefined
            retry()
          }
        })
        hls.loadSource(src)
        hls.attachMedia(video!)
      } else setMessage('当前浏览器不支持 HLS 播放，请使用新版浏览器。')
    }
    video.addEventListener('loadeddata', ready)
    video.addEventListener('playing', ready)
    video.addEventListener('error', nativeError)
    connect()
    return () => {
      active = false
      clearTimeout(timer)
      hls?.destroy()
      video.removeEventListener('loadeddata', ready)
      video.removeEventListener('playing', ready)
      video.removeEventListener('error', nativeError)
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [src, attempt])

  return (
    <>
      <div className="player-frame"><video ref={videoRef} controls playsInline aria-label={title} /></div>
      <div className="player-feedback">
        <p role="status">{message || '直播已就绪，点击播放按钮观看。'}</p>
        <button className="button secondary" onClick={() => setAttempt((value) => value + 1)}>重新连接</button>
      </div>
    </>
  )
}
export default HlsVideo
