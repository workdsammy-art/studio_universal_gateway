<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'
import { useGatewayStore } from '../composables/useGatewayStore'
import logo from '../assets/logo.svg'

const { state } = useGatewayStore()

const props = defineProps<{ isDark: boolean; batchCount: number; showPanel: boolean }>()
const emit = defineEmits<{
  run: [count: number]
  cancel: []
  resync: []
  toggleTheme: []
  togglePanel: []
  'update:batchCount': [val: number]
}>()

const displayStatus = ref('Idle')
const statusColor = ref('var(--text-secondary)')
let idleTimer: ReturnType<typeof setTimeout> | null = null

watch(() => state.status, (s) => {
  if (idleTimer) { clearTimeout(idleTimer); idleTimer = null }
  if (s === 'completed') {
    displayStatus.value = 'Completed'
    statusColor.value = 'var(--success)'
    idleTimer = setTimeout(() => {
      displayStatus.value = 'Idle'
      statusColor.value = 'var(--text-secondary)'
    }, 2000)
  } else if (s === 'error') {
    displayStatus.value = state.error || 'Error'
    statusColor.value = 'var(--danger)'
    idleTimer = setTimeout(() => {
      displayStatus.value = 'Idle'
      statusColor.value = 'var(--text-secondary)'
    }, 2000)
  } else if (s === 'running') {
    displayStatus.value = ''
  } else {
    displayStatus.value = 'Idle'
    statusColor.value = 'var(--text-secondary)'
  }
}, { immediate: true })

onUnmounted(() => {
  if (idleTimer) clearTimeout(idleTimer)
})

function pct(): number {
  if (!state.progress || state.progress.max <= 0) return 0
  return Math.round((state.progress.current / state.progress.max) * 100)
}

function decrement() {
  emit('update:batchCount', Math.max(1, props.batchCount - 1))
}

function increment() {
  emit('update:batchCount', Math.min(100, props.batchCount + 1))
}
</script>

<template>
  <header class="shrink-0 toolbar-row" :style="{ borderBottom: '1px solid var(--surface-border)', background: 'var(--surface-ground)' }">
    <div class="flex items-center gap-3 px-6 toolbar-left">
      <img :src="logo" alt="Studio Gateway" style="height: 20px; width: 20px;" />
      <button
        class="btn btn-primary btn-sm"
        style="min-width: 120px;"
        :disabled="!state.data"
        @click="emit('run', batchCount)"
      >Queue Prompt</button>
      <div class="flex items-center gap-1">
        <button class="btn btn-outline btn-icon btn-sm" @click="decrement" :disabled="batchCount <= 1" aria-label="Decrement batch count">−</button>
        <input
          type="number"
          min="1"
          max="100"
          class="batch-count"
          :value="batchCount"
          @input="emit('update:batchCount', Math.max(1, parseInt(($event.target as HTMLInputElement).value) || 1))"
          title="Batch count"
        />
        <button class="btn btn-outline btn-icon btn-sm" @click="increment" :disabled="batchCount >= 100" aria-label="Increment batch count">+</button>
      </div>
    </div>

    <div class="flex items-center gap-2 toolbar-center">
      <button v-if="state.isRunning" class="btn btn-danger-outline btn-sm" @click="emit('cancel')" aria-label="Cancel execution">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
        Cancel
      </button>
      <div class="progress-container">
        <div class="progress-bar" style="width: 180px;">
          <div class="fill" :style="{ width: pct() + '%' }"></div>
        </div>
      </div>
      <span v-if="pct() > 0" class="font-mono text-xs text-right" style="min-width: 3ch; color: var(--text-secondary);">{{ pct() }}%</span>
      <span class="font-mono text-xs font-bold" :style="{ color: statusColor }">{{ displayStatus }}</span>
    </div>

    <div class="flex items-center gap-3 px-6 toolbar-right">
      <button class="btn btn-outline btn-sm" @click="emit('resync')" aria-label="Re-sync workflow data">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/><path d="M8 3H5a2 2 0 0 0-2 2v3"/></svg>
        Re-Sync
      </button>
      <button class="btn btn-outline btn-icon btn-sm" :class="{ 'btn-active': showPanel }" @click="emit('togglePanel')" title="Output History" aria-label="Toggle output history panel">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
      </button>
      <button class="btn btn-outline btn-icon btn-sm" @click="emit('toggleTheme')" :aria-label="isDark ? 'Switch to light theme' : 'Switch to dark theme'">
        <svg v-if="isDark" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
        <svg v-else xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
      </button>
    </div>
  </header>
</template>

<style scoped>
.toolbar-row {
  display: flex;
  align-items: center;
  height: 56px;
  position: relative;
}
.toolbar-left {
  flex: 1;
  justify-content: flex-start;
}
.toolbar-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.toolbar-right {
  flex: 1;
  justify-content: flex-end;
}
.batch-count {
  width: 44px;
  height: 28px;
  text-align: center;
  font-family: monospace;
  font-size: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--input-border);
  background: var(--input-bg);
  color: var(--text-color);
  outline: none;
  -moz-appearance: textfield;
}
.batch-count::-webkit-inner-spin-button,
.batch-count::-webkit-outer-spin-button {
  display: none;
}
.batch-count:focus {
  border-color: var(--accent-color, #FF3F00);
}
.btn-active {
  background: var(--primary) !important;
  border-color: var(--primary) !important;
  color: #fff !important;
}
.btn-sm {
  height: 28px;
  font-size: 0.75rem;
}
.progress-container {
  height: 28px;
  display: flex;
  align-items: center;
}
</style>
