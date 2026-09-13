<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getAlbums, type Photo } from '../api'
import { useCatalog } from '../composables/useCatalog'
import FeedbackState from '../components/FeedbackState.vue'
import MediaCover from '../components/MediaCover.vue'
const route = useRoute()
const selected = ref(typeof route.query.album === 'string' ? route.query.album : '')
const { data, error, loading, retry } = useCatalog(getAlbums)
const albums = computed(() => selected.value ? data.value?.filter(album => album.id === selected.value) || [] : data.value || [])
const allPhotos = computed(() => albums.value.flatMap(album => album.photos.map(photo => ({ ...photo, album: album.title }))))
const index = ref(-1)
const active = computed(() => allPhotos.value[index.value])
const dialog = ref<HTMLDialogElement>()
const failed = ref(false)
let trigger: HTMLElement | null = null
let previousOverflow = ''
async function open(photo: Photo, event: Event) {
  trigger = event.currentTarget as HTMLElement
  index.value = allPhotos.value.findIndex(item => item.id === photo.id)
  failed.value = false
  await nextTick()
  previousOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  dialog.value?.showModal()
}
function close() {
  dialog.value?.close()
  index.value = -1
  document.body.style.overflow = previousOverflow
  trigger?.focus()
}
function move(delta: number) {
  index.value = (index.value + delta + allPhotos.value.length) % allPhotos.value.length
  failed.value = false
}
function keyboard(event: KeyboardEvent) {
  if (event.key === 'ArrowRight') { event.preventDefault(); move(1) }
  if (event.key === 'ArrowLeft') { event.preventDefault(); move(-1) }
}
onBeforeUnmount(() => { if (dialog.value?.open) { dialog.value.close(); document.body.style.overflow = previousOverflow } })
</script>
<template><div class="container"><div class="page-intro"><p class="eyebrow">SEU / THROUGH THE LENS</p><h1>赛场瞬间<span class="gold-dot">.</span></h1><p>比赛会结束，全力以赴的样子会留下。</p></div><div class="filter-panel"><label class="album-select">比赛相册<select v-model="selected"><option value="">全部比赛</option><option v-for="album in data" :key="album.id" :value="album.id">{{ album.title }}</option></select></label><span class="catalog-count">{{ allPhotos.length }} 张照片</span><button class="btn secondary small" @click="retry">刷新相册</button></div><FeedbackState :loading="loading" :error="error" :empty="!albums.length" title="让下一次快门，留在这里。" description="目前没有比赛照片，发布后即可在这里浏览。" @retry="retry" />
  <section v-for="album in albums" :key="album.id" class="section photo-album"><div class="section-head"><div><p class="eyebrow">MATCH ALBUM / {{ album.photos.length }} PHOTOS</p><h2>{{ album.title }}</h2></div></div><div class="photo-grid" :class="{ 'single-photo': album.photos.length === 1 }"><figure v-for="photo in album.photos" :key="photo.id"><button class="photo-button" :aria-label="`放大查看：${photo.title}`" @click="open(photo, $event)"><MediaCover :src="photo.url" :alt="photo.title" /><span class="photo-zoom">⤢ 查看大图</span></button><figcaption>{{ photo.title }}</figcaption></figure></div></section>
  <p class="photo-footnote">照片按比赛归档 · 点击照片放大查看 · 原图保留现场色彩与细节</p>
  <dialog ref="dialog" class="lightbox" aria-label="赛场照片查看器" @cancel.prevent="close" @keydown="keyboard" @click="($event.target === dialog) && close()"><template v-if="active"><div class="lightbox-toolbar"><span>{{ index + 1 }} / {{ allPhotos.length }} · {{ active.album }}</span><button autofocus class="btn ghost" aria-label="关闭照片" @click="close">关闭 ×</button></div><p v-if="failed" role="alert">照片加载失败，请关闭后重试。</p><img v-else :src="active.url" :alt="active.title" @error="failed = true"><div class="lightbox-bottom"><button v-if="allPhotos.length > 1" class="btn ghost" aria-label="上一张" @click="move(-1)">← 上一张</button><p>{{ active.title }}</p><button v-if="allPhotos.length > 1" class="btn ghost" aria-label="下一张" @click="move(1)">下一张 →</button></div></template></dialog>
</div></template>
