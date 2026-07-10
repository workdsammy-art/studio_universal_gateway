<script setup lang="ts">
import { useGatewayStore } from '../composables/useGatewayStore'
import logo from '../assets/logo.svg'

const { state } = useGatewayStore()

defineProps<{ isDark: boolean }>()
const emit = defineEmits<{
  run: []
  cancel: []
  resync: []
  toggleTheme: []
}>()

function pct(): number {
  if (!state.progress || state.progress.max <= 0) return 0
  return Math.round((state.progress.current / state.progress.max) * 100)
}
</script>

<template>
  <header class="flex items-center gap-3 px-6 shrink-0" style="height: 56px; border-bottom: 1px solid var(--surface-border); background: var(--surface-ground);">
    <img :src="logo" alt="Studio Gateway" style="height: 20px; width: 20px;" />

    <button
      v-if="!state.isRunning"
      class="btn btn-primary btn-sm"
      style="min-width: 120px;"
      :disabled="!state.data"
      @click="emit('run')"
    >Queue Prompt</button>

    <template v-if="state.isRunning">
      <button class="btn btn-danger-outline btn-sm" @click="emit('cancel')">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        Cancel
      </button>
      <div class="flex items-center gap-2">
        <div v-if="state.progress" class="progress-bar">
          <div class="fill" :style="{ width: pct() + '%' }"></div>
        </div>
        <span v-if="pct() > 0" class="font-mono text-xs text-right" style="min-width: 3ch; color: var(--text-secondary);">{{ pct() }}%</span>
      </div>
    </template>

    <template v-if="state.status === 'completed'">
      <span class="font-mono text-xs font-bold mr-1" style="color: var(--success);">Completed</span>
    </template>
    <template v-else-if="state.status === 'error'">
      <span class="font-mono text-xs font-bold mr-1" style="color: var(--danger);">{{ state.error || 'Error' }}</span>
    </template>
    <template v-else-if="!state.isRunning">
      <span class="font-mono text-xs mr-1" style="color: var(--text-secondary); opacity: 0.6;">Ready</span>
    </template>

    <div class="ml-auto flex items-center gap-3">
      <button class="btn btn-outline btn-sm" @click="emit('resync')">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/><path d="M8 3H5a2 2 0 0 0-2 2v3"/></svg>
        Re-Sync
      </button>
      <span class="font-mono text-[10px]" style="color: var(--text-secondary); opacity: 0.4;">v0.1.0</span>
      <button class="btn btn-outline btn-icon btn-sm" @click="emit('toggleTheme')">
        <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      </button>
    </div>
  </header>
</template>
