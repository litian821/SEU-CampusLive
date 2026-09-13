<script setup lang="ts">
import Hls from 'hls.js'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
const props = defineProps<{ src: string; title: string; poster?: string }>()
const video = ref<HTMLVideoElement>()
const message = ref('正在连接直播…')
let cleanup = () => {}
function start() {
  cleanup()
  const element = video.value
  if (!element) return
  let hls: Hls | undefined
  let timer: ReturnType<typeof setTimeout> | undefined
  let failures = 0
  let recoveries = 0
  let active = true
  let resume = false
  message.value = '正在连接直播…'
  const ready = () => { failures = 0; message.value = ''; if (resume) void element.play().catch(() => { resume = false }) }
  const playing = () => { resume = false; message.value = '' }
  const retry = () => {
    if (!active || timer) return
    const seconds = Math.min(5 * 2 ** failures++, 30)
    message.value = `直播尚未开始或连接中断，${seconds} 秒后自动重试。`
    timer = setTimeout(() => { timer = undefined; connect() }, seconds * 1000)
  }
  function connect() {
    if (!active) return
    hls?.destroy()
    hls = undefined
    if (Hls.isSupported()) {
      hls = new Hls({ liveSyncDurationCount: 3 })
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal || !active) return
        resume = resume || !element!.paused
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR && recoveries++ < 2) {
          message.value = '正在恢复播放…'
          hls?.recoverMediaError()
        } else { hls?.destroy(); hls = undefined; retry() }
      })
      hls.loadSource(props.src)
      hls.attachMedia(element!)
    } else if (element!.canPlayType('application/vnd.apple.mpegurl')) {
      element!.src = props.src
      element!.load()
    } else message.value = '当前浏览器不支持 HLS 播放，请使用新版浏览器。'
  }
  element.addEventListener('loadeddata', ready)
  element.addEventListener('playing', playing)
  element.addEventListener('error', retry)
  connect()
  cleanup = () => {
    active = false
    clearTimeout(timer)
    element.removeEventListener('loadeddata', ready)
    element.removeEventListener('playing', playing)
    element.removeEventListener('error', retry)
    hls?.destroy()
    element.pause()
    element.removeAttribute('src')
    element.load()
  }
}
onMounted(start)
watch(() => props.src, start)
onBeforeUnmount(() => cleanup())
</script>
<template><div class="player-frame"><video ref="video" controls playsinline :poster="poster" :aria-label="title" /></div><div class="player-feedback"><p role="status">{{ message || '直播已就绪，点击播放按钮观看。' }}</p><button class="btn small ghost" @click="start">重新连接</button></div></template>
