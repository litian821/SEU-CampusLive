<script setup lang="ts">
defineProps<{ loading?: boolean; error?: string; empty?: boolean; title?: string; description?: string }>()
defineEmits<{ retry: [] }>()
</script>
<template>
  <div v-if="loading" class="feedback-state" role="status"><span class="loading-dot"></span><h2>正在连接主场…</h2><p>赛事与精彩内容即将呈现。</p></div>
  <div v-else-if="error" class="feedback-state" role="alert"><h2>暂时连不上赛场</h2><p>{{ error }}</p><button class="btn" @click="$emit('retry')">重新加载</button></div>
  <div v-else-if="empty" class="feedback-state"><h2>{{ title || '下一场精彩，值得等待。' }}</h2><p>{{ description || '目前还没有内容，发布后会出现在这里。' }}</p><slot /></div>
</template>
