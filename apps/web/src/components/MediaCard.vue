<script setup lang="ts">
import type { MediaCard } from '../domain/media'
import MediaCover from './MediaCover.vue'
import LiveBadge from './LiveBadge.vue'
defineProps<{ item: MediaCard }>()
</script>
<template><RouterLink :to="item.href" class="media-card event-card"><MediaCover :src="item.cover" :alt="item.title" :sport="item.sport"><LiveBadge v-if="item.status" :status="item.status" /><span v-else class="duration">回放</span><span class="cover-play" aria-hidden="true">▶</span></MediaCover><p class="card-category">{{ item.sport }} <span>／ {{ item.meta }}</span></p><h3>{{ item.title }}</h3><p class="card-description">{{ item.description }}</p></RouterLink></template>
