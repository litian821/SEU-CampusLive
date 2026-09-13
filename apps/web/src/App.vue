<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CampusMark from './components/CampusMark.vue'
const route = useRoute()
const router = useRouter()
const search = ref('')
const nav = [{ to: '/', label: '首页' }, { to: '/live', label: '赛事直播' }, { to: '/vod', label: '精彩回放' }, { to: '/moments', label: '赛场瞬间' }]
watch(() => route.path, async () => {
  document.title = `${String(route.meta.title || '东大主场')} · Campus Live`
  await nextTick()
  document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true })
}, { immediate: true })
function submit() { void router.push({ path: '/vod', query: search.value ? { q: search.value } : {} }) }
</script>
<template>
  <a class="skip" href="#main">跳到主要内容</a>
  <header class="site-header"><div class="container header-inner">
    <RouterLink to="/" class="brand" aria-label="Campus Live 首页"><span class="brand-symbol" aria-hidden="true">C↗</span><span>Campus<span class="brand-live">Live<i></i></span><small>东南大学 · 学生体育</small></span></RouterLink>
    <nav aria-label="主导航"><RouterLink v-for="item in nav" :key="item.to" :to="item.to" :class="{ selected: item.to === '/' ? route.path === '/' : route.path.startsWith(item.to) }">{{ item.label }}</RouterLink></nav>
    <form class="header-search" @submit.prevent="submit"><input v-model="search" aria-label="搜索回放" placeholder="搜索比赛回放…"><button aria-label="搜索">⌕</button></form>
  </div></header>
  <main id="main" tabindex="-1"><RouterView :key="route.path" /></main>
  <footer class="container footer"><div><RouterLink to="/" class="footer-brand">Campus Live ↗</RouterLink><p>东大主场 · 止于至善，热爱在场。</p></div><CampusMark /><p>东南大学学生团队作品<br>校园体育赛事直播与点播平台</p></footer>
</template>
