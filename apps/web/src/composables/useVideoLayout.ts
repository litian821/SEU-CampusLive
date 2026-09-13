import { computed, ref, type Ref } from 'vue'

export function useVideoLayout(video: Ref<HTMLVideoElement | undefined>) {
  const fit = ref<'contain' | 'cover'>('contain')
  const aspectRatio = ref('16 / 9')
  const orientation = ref<'landscape' | 'portrait' | 'square'>('landscape')
  const resolution = ref('')

  const frameStyle = computed(() => ({ '--video-aspect': aspectRatio.value }))
  const frameClass = computed(() => `is-${orientation.value}`)
  const videoClass = computed(() => `fit-${fit.value}`)
  const fitLabel = computed(() => fit.value === 'contain' ? '填满画面' : '完整显示')

  function syncVideoLayout() {
    const width = video.value?.videoWidth || 0
    const height = video.value?.videoHeight || 0
    if (!width || !height) return
    aspectRatio.value = `${width} / ${height}`
    resolution.value = `${width} × ${height}`
    orientation.value = height > width ? 'portrait' : width > height ? 'landscape' : 'square'
  }

  function resetVideoLayout() {
    aspectRatio.value = '16 / 9'
    orientation.value = 'landscape'
    resolution.value = ''
  }

  function toggleFit() {
    fit.value = fit.value === 'contain' ? 'cover' : 'contain'
  }

  return { fit, fitLabel, frameClass, frameStyle, resolution, resetVideoLayout, syncVideoLayout, toggleFit, videoClass }
}
