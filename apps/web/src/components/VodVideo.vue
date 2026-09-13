<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useVideoLayout } from '../composables/useVideoLayout'
const props = defineProps<{ src: string; title: string }>()
const video = ref<HTMLVideoElement>()
const failed = ref(false)
const duration = ref('')
const { fit, fitLabel, frameClass, frameStyle, resolution, resetVideoLayout, syncVideoLayout, toggleFit, videoClass } = useVideoLayout(video)
function metadata() {
  syncVideoLayout()
  const seconds = video.value?.duration
  if (seconds && Number.isFinite(seconds)) duration.value = `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}
function retry() { failed.value = false; video.value?.load() }
watch(() => props.src, () => { failed.value = false; duration.value = ''; resetVideoLayout() })
onBeforeUnmount(() => { video.value?.pause() })
</script>
<template>
  <div class="player-frame" :class="frameClass" :style="frameStyle">
    <video ref="video" :src="src" :aria-label="title" controls playsinline preload="metadata" :class="videoClass" @error="failed = true" @loadedmetadata="metadata" />
  </div>
  <div class="player-feedback">
    <p v-if="failed" role="alert">视频播放失败，请检查网络后重试。</p>
    <p v-else>播放、暂停、拖动进度 · {{ duration ? `时长 ${duration}` : '加载视频信息中' }}<span v-if="resolution" class="video-resolution">输入 {{ resolution }}</span></p>
    <div class="player-actions">
      <button class="btn small ghost" :aria-pressed="fit === 'cover'" @click="toggleFit">{{ fitLabel }}</button>
      <button v-if="failed" class="btn small ghost" @click="retry">重试播放</button>
    </div>
  </div>
</template>
