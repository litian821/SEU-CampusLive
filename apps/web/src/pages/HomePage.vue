<script setup lang="ts">
import { computed } from 'vue'
import { getAlbums, getLiveMatches, getVodItems } from '../api'
import { useCatalog } from '../composables/useCatalog'
import { campusMatch, liveCard, vodCard } from '../domain/media'
import CampusMark from '../components/CampusMark.vue'
import FeedbackState from '../components/FeedbackState.vue'
import LiveBadge from '../components/LiveBadge.vue'
import MediaCard from '../components/MediaCard.vue'
import MediaCover from '../components/MediaCover.vue'
const live = useCatalog(getLiveMatches, 10000)
const vod = useCatalog(getVodItems)
const albums = useCatalog(getAlbums)
const featured = computed(() => live.data.value?.find(item => item.status === 'live') || live.data.value?.[0])
const featuredCard = computed(() => featured.value ? liveCard(featured.value) : null)
const teams = computed(() => featured.value?.title === campusMatch.title ? campusMatch.teams : null)
const others = computed(() => live.data.value?.filter(item => item.id !== featured.value?.id) || [])
const count = computed(() => live.data.value?.filter(item => item.status === 'live').length || 0)
</script>
<template><div class="container">
  <div class="intro"><div><p class="eyebrow">SEU · OUR CAMPUS, OUR GAME</p><h1>东大此刻，<em>正在上场。</em></h1></div><p class="intro-note"><b>九龙湖 · 四牌楼</b><br>从教室走向赛场，把主场带到屏幕。</p></div>
  <FeedbackState :loading="live.loading.value" :error="live.error.value" @retry="live.retry" />
  <div v-if="featured && featuredCard" class="hero-layout">
    <article class="hero"><MediaCover :src="featuredCard.cover" :alt="campusMatch.caption" :sport="featured.sport" /><div class="hero-shade"></div><div class="hero-content"><div class="hero-tags"><LiveBadge :status="live.error.value ? 'unknown' : featured.status" /><span>{{ featured.sport }} / 校园赛事</span></div><div class="hero-copy"><p class="eyebrow">{{ teams ? '院系杯 / BASKETBALL' : 'CAMPUS MATCH' }}</p><h2 v-if="teams">{{ teams[0] }}<small>vs.</small>{{ teams[1] }}</h2><h2 v-else>{{ featured.title }}</h2><p>{{ featured.venue }} · 为你熟悉的名字，加一次油。</p><RouterLink :to="featuredCard.href" class="btn primary">▶ {{ featured.status === 'live' ? '进入直播间' : '查看直播间' }} ↗</RouterLink></div></div><small v-if="featuredCard.cover" class="photo-credit">{{ campusMatch.caption }}</small></article>
    <aside class="match-rail"><div class="rail-heading"><h2>主场速览</h2><span>{{ live.error.value ? '状态待确认' : `${count} 场直播中` }}</span></div><RouterLink v-for="item in others.slice(0, 2)" :key="item.id" :to="`/live/${encodeURIComponent(item.id)}`" class="rail-row"><LiveBadge :status="live.error.value ? 'unknown' : item.status" /><h3>{{ item.title }}</h3><p>{{ item.venue }}</p></RouterLink><div v-if="!others.length" class="rail-row"><p class="eyebrow">NEXT WHISTLE</p><h3>{{ count ? '此刻，为主场加油。' : '等待下一声哨响。' }}</h3><p>{{ count ? '点击左侧比赛，即可进入直播间。' : '开播后状态会自动更新，也可以先回看精彩比赛。' }}</p></div><RouterLink to="/vod" class="rail-row"><p class="eyebrow">REPLAY / 往期回顾</p><h3>错过现场，也别错过精彩 ↗</h3><p>全场回放，让热爱多停留一会儿。</p></RouterLink><RouterLink to="/moments" class="rail-row"><p class="eyebrow">MOMENTS / 赛场瞬间</p><h3>有些瞬间，值得定格 ↗</h3><p>收藏在这里的，是赛场上的全力以赴。</p></RouterLink><div class="rail-note">从第一声哨响，到最后一次击掌。</div></aside>
  </div>
  <FeedbackState v-else-if="!live.loading.value && !live.error.value" empty title="此刻休息，热爱不散场。" description="暂时没有可用直播频道，先看看精彩回放。" />
  <div class="browse-strip"><span>找到你的主场</span><RouterLink to="/live?sport=篮球" class="chip">篮球</RouterLink><RouterLink to="/live" class="text-link">全部直播 ↗</RouterLink></div>
  <section class="section"><div class="section-head"><div><h2>那些值得再看一遍的瞬间</h2><p>往期回放，留住校园里的每一次欢呼。</p></div><RouterLink to="/vod" class="text-link">浏览点播 ↗</RouterLink></div><FeedbackState :loading="vod.loading.value" :error="vod.error.value" :empty="!vod.data.value?.length" title="比赛回放，正在等待上架。" description="已有回放发布后，会出现在这里。" @retry="vod.retry" /><div v-if="vod.data.value?.length" class="media-grid"><MediaCard v-for="item in vod.data.value.slice(0, 4)" :key="item.id" :item="vodCard(item)" /></div></section>
  <section v-if="albums.data.value?.length" class="section moments-feature"><RouterLink :to="{ path: '/moments', query: { album: albums.data.value[0].id } }"><MediaCover :src="albums.data.value[0].photos[0]?.url" alt="赛场瞬间相册封面" /></RouterLink><div><p class="eyebrow">SEU / THROUGH THE LENS</p><h2>让快门，记住这一刻。</h2><p>{{ albums.data.value[0].title }}</p><RouterLink to="/moments" class="btn">走进赛场瞬间 ↗</RouterLink></div></section>
  <section class="brand-story"><div><p class="eyebrow">SOUTHEAST UNIVERSITY · STUDENT PROJECT</p><h2>止于至善，热爱在场。</h2><p>从九龙湖到四牌楼，这是属于东大学子的 Campus Live。</p></div><CampusMark /></section>
</div></template>
