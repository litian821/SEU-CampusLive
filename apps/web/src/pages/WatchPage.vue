<script setup lang="ts">
import { computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getLiveStream, getVodItem, getVodItems, type LiveStream, type VodItem } from '../api'
import { campusMatch, vodCard } from '../domain/media'
import { useCatalog } from '../composables/useCatalog'
import HlsVideo from '../components/HlsVideo.vue'
import VodVideo from '../components/VodVideo.vue'
import LiveBadge from '../components/LiveBadge.vue'
import FeedbackState from '../components/FeedbackState.vue'
import MediaCard from '../components/MediaCard.vue'
const props = defineProps<{ kind: 'live' | 'vod' }>()
const route = useRoute()
// Vue Router already decodes params. Never decode a percent-containing filename again.
const id = String(route.params.id)
const { data, error, loading, retry } = useCatalog<LiveStream | VodItem>(signal => props.kind === 'live' ? getLiveStream(id, signal) : getVodItem(id, signal), props.kind === 'live' ? 10000 : 0)
const related = useCatalog(getVodItems)
const stream = computed(() => data.value && 'status' in data.value ? data.value : null)
const isCampusMatch = computed(() => data.value?.title === campusMatch.title)
const recommendations = computed(() => related.data.value?.filter(item => item.id !== id).slice(0, 4) || [])
watch(data, value => { if (value) document.title = `${value.title} · Campus Live` })
</script>
<template>
  <div v-if="loading || (error && !data)" class="container"><RouterLink :to="`/${kind}`" class="breadcrumb">← 返回{{ kind === 'live' ? '直播列表' : '精彩回放' }}</RouterLink><FeedbackState :loading="loading" :error="error" @retry="retry" /></div>
  <template v-if="data">
    <section class="watch-stage"><div class="container"><RouterLink :to="`/${kind}`" class="breadcrumb">← 返回{{ kind === 'live' ? '直播列表' : '精彩回放' }}</RouterLink><div class="watch-top"><LiveBadge v-if="stream" :status="error ? 'unknown' : stream.status" /><span v-else class="badge offline">视频回放</span><span>{{ stream?.sport || 'REPLAY' }} · {{ stream?.venue || '让精彩再发生' }}</span><span class="watch-wordmark">CAMPUS LIVE / 东大主场</span></div><div class="watch-grid" :class="{ 'vod-watch': kind === 'vod' }"><div><HlsVideo v-if="kind === 'live'" :src="data.playback_url" :title="data.title" :poster="isCampusMatch ? campusMatch.cover : undefined" /><VodVideo v-else :src="data.playback_url" :title="data.title" /></div><aside v-if="stream" class="match-info"><p class="eyebrow">MATCH INFO</p><h2>{{ isCampusMatch ? '院系杯' : '赛事信息' }}</h2><div v-if="isCampusMatch" class="teams"><div><b>网安</b><span>{{ campusMatch.teams[0] }}</span></div><i>VS</i><div><b>电子</b><span>{{ campusMatch.teams[1] }}</span></div></div><dl><dt>比赛项目</dt><dd>{{ stream.sport }}</dd><dt>比赛场地</dt><dd>{{ stream.venue }}</dd><dt>赛事状态</dt><dd><LiveBadge :status="error ? 'unknown' : stream.status" /></dd></dl><p class="match-note">熟悉的学院，热爱的主场。<br>一起为场上的同学加油。</p></aside></div><p v-if="error" class="inline-alert" role="alert">赛事信息更新失败：{{ error }} <button class="btn small ghost" @click="retry">重试</button></p></div></section>
    <div class="container"><div class="watch-heading"><div><p class="eyebrow">SEU / {{ kind === 'live' ? 'CAMPUS MATCH' : 'MATCH REPLAY' }}</p><h1>{{ data.title }}</h1><p>{{ stream ? `${stream.venue} · ${stream.sport}` : '校园赛事回放' }}</p></div><RouterLink :to="`/${kind}`" class="btn secondary">{{ kind === 'live' ? '浏览其他直播' : '返回内容库' }} ↗</RouterLink></div><div class="watch-description"><div><h2>{{ kind === 'live' ? '关于这场比赛' : '视频简介' }}</h2><p>{{ isCampusMatch ? '网络空间安全学院与电子科学与工程学院在院系杯篮球赛相遇。为队友的配合喝彩，也为每一位全力以赴的同学鼓掌。' : '从第一声哨响到终场时刻，在 Campus Live 观看校园赛事，留住每一次全力以赴。' }}</p></div><aside><h2>有些瞬间，值得定格。</h2><p>走进比赛相册，看看镜头里的主场。</p><RouterLink to="/moments" class="text-link">查看赛场瞬间 ↗</RouterLink></aside></div><section v-if="recommendations.length" class="section"><div class="section-head"><h2>比赛之后，还有这些精彩</h2><RouterLink to="/vod" class="text-link">全部回放 ↗</RouterLink></div><div class="media-grid"><MediaCard v-for="item in recommendations" :key="item.id" :item="vodCard(item)" /></div></section></div>
  </template>
</template>
