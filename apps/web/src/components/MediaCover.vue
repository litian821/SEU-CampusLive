<script setup lang="ts">
import { ref, watch } from 'vue'
import CampusMark from './CampusMark.vue'
const props = defineProps<{ src?: string; alt: string; sport?: string }>()
const failed = ref(false)
watch(() => props.src, () => { failed.value = false })
</script>
<template><div class="media-cover"><img v-if="src && !failed" :src="src" :alt="alt" loading="lazy" @error="failed = true"><div v-else class="cover-fallback"><CampusMark /><span><small>CAMPUS LIVE / 东大主场</small>{{ sport || '赛场瞬间' }}</span></div><slot /></div></template>
