<script setup lang="ts">
const emit = defineEmits<{
  resync: []
}>()
</script>

<template>
  <div class="flex items-center gap-3 px-6 py-2" style="border-bottom: 1px solid var(--surface-border); background: var(--message-bg);">
    <span class="font-mono text-xs" style="color: var(--text-color);">Workflow updated.</span>
    <button class="btn btn-outline btn-sm" @click="emit('resync')">
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/><path d="M8 3H5a2 2 0 0 0-2 2v3"/></svg>
      Re-Sync
    </button>
  </div>
</template>
