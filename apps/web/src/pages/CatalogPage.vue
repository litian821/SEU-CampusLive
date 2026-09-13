<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getLiveMatches, getVodItems } from '../api'
import { useCatalog } from '../composables/useCatalog'
import { filterCards, liveCard, vodCard, type MediaCard as Card } from '../domain/media'
import MediaCard from '../components/MediaCard.vue'
import FeedbackState from '../components/FeedbackState.vue'
const props = defineProps<{ kind: 'live' | 'vod' }>()
const route = useRoute()
const query = ref(typeof route.query.q === 'string' ? route.query.q : '')
const sport = ref(typeof route.query.sport === 'string' ? route.query.sport : '全部')
const onlyLive = ref(false)
const { data, error, loading, retry } = useCatalog<Card[]>(async signal => props.kind === 'live'
  ? (await getLiveMatches(signal)).map(liveCard) : (await getVodItems(signal)).map(vodCard), props.kind === 'live' ? 10000 : 0)
watch(() => route.query.q, value => { query.value = typeof value === 'string' ? value : '' })
const sports = computed(() => [...new Set(['全部', ...(data.value || []).map(item => item.sport), ...(sport.value !== '全部' ? [sport.value] : [])])])
const filtered = computed(() => filterCards(data.value || [], query.value, sport.value).filter(item => !onlyLive.value || item.status === 'live'))
const liveCount = computed(() => data.value?.filter(item => item.status === 'live').length || 0)
</script>
<template><div class="container">
  <div class="page-intro"><p class="eyebrow">{{ kind === 'live' ? 'LIVE FROM OUR CAMPUS' : 'THE GAME LIVES ON' }}</p><div class="page-title-row"><div><h1>{{ kind === 'live' ? '为东大的每一次上场喝彩。' : '好比赛，值得再看一遍。' }}</h1><p>{{ kind === 'live' ? '找到正在发生的比赛，一起进入主场。' : '回看比赛，重温那些让人忍不住欢呼的瞬间。' }}</p></div><span v-if="kind === 'live'" class="live-counter"><b>{{ error ? '—' : liveCount.toString().padStart(2, '0') }}</b> 场比赛正在直播</span></div></div>
  <div class="filter-panel"><div class="chips"><button v-for="item in sports" :key="item" class="chip" :class="{ selected: sport === item }" :aria-pressed="sport === item" @click="sport = item">{{ item }}</button></div><label class="catalog-search"><span class="sr-only">搜索比赛</span><input v-model="query" aria-label="搜索比赛" placeholder="搜索比赛、学院…"></label><label v-if="kind === 'live'" class="live-only"><input v-model="onlyLive" type="checkbox">只看直播中</label></div>
  <p class="catalog-count">{{ error ? '目录暂不可用' : `共 ${filtered.length} ${kind === 'live' ? '场比赛' : '个视频'}` }} <span v-if="kind === 'vod'">按标题排列</span></p>
  <FeedbackState :loading="loading" :error="error" :empty="!filtered.length" :title="data?.length ? '没有匹配的比赛，试试其他关键词。' : kind === 'live' ? '此刻休息，热爱不散场。' : '下一场精彩，值得等待。'" description="可以更换筛选条件，或稍后回来看看。" @retry="retry"><button v-if="query || sport !== '全部' || onlyLive" class="btn" @click="query = ''; sport = '全部'; onlyLive = false">清除筛选</button></FeedbackState>
  <div v-if="!error && filtered.length" class="media-grid" :class="{ 'live-grid': kind === 'live' }"><MediaCard v-for="item in filtered" :key="item.id" :item="item" /></div>
  <div class="catalog-banner"><div><h2>{{ kind === 'live' ? '比赛结束，精彩还在。' : '想感受正在发生的比赛？' }}</h2><p>从现场到屏幕，校园里的热爱一直在延续。</p></div><RouterLink :to="kind === 'live' ? '/vod' : '/live'" class="btn secondary">{{ kind === 'live' ? '浏览回放' : '去看直播' }} ↗</RouterLink></div>
</div></template>
