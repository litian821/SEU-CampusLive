<script setup lang="ts">
import { liveStatus, type LiveStatus } from '../api'
defineProps<{ status: LiveStatus }>()
</script>
<template><span class="badge" :class="status"><i></i>{{ status === 'live' ? 'LIVE · 直播中' : liveStatus[status] }}</span></template>
