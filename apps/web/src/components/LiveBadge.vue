<script setup lang="ts">
import { liveStatus, type LiveStream } from '../api'
defineProps<{ status: LiveStream['status'] }>()
</script>
<template><span class="badge" :class="status"><i></i>{{ status === 'live' ? 'LIVE · 直播中' : liveStatus[status] }}</span></template>
