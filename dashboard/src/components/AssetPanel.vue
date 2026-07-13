<script setup lang="ts">
import { ref } from 'vue'

interface AssetRecord { name: string; data: any; ui_type: string; subfolder?: string; type?: string }
interface RunRecord { id: number; timestamp: number; assets: AssetRecord[] }

const props = defineProps<{
  visible: boolean
  history: RunRecord[]
}>()
const emit = defineEmits<{ clear: []; close: [] }>()

const collapsed = ref<Set<number>>(new Set())
const lightbox = ref<{ filename: string; subfolder: string; type: string; name: string } | null>(null)

function toggleCollapse(id: number) {
  if (collapsed.value.has(id)) collapsed.value.delete(id)
  else collapsed.value.add(id)
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString()
}

function imgUrl(a: AssetRecord) {
  return `/view?filename=${a.data}&subfolder=${a.subfolder || ''}&type=${a.type || 'output'}`
}

function downloadAsset(a: any) {
  const filename = a.data || a.filename || ''
  const url = `/view?filename=${filename}&subfolder=${a.subfolder || ''}&type=${a.type || 'output'}&download=1`
  const link = document.createElement('a')
  link.href = url
  link.download = a.data || a.filename || a.name || 'image'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function isImage(a: AssetRecord) { return a.ui_type === 'image' }
function isMetrics(a: AssetRecord) { return a.ui_type === 'metrics' }
function isColor(a: AssetRecord) { return a.ui_type === 'color' }
function isToggle(a: AssetRecord) { return a.ui_type === 'toggle' }
</script>

<template>
  <Transition name="overlay">
    <div v-if="visible" class="asset-panel-overlay" @click.self="emit('close')" />
  </Transition>
  <Transition name="slide">
    <aside v-if="visible" class="asset-panel">
      <div class="panel-header">
        <span class="font-mono text-xs font-bold uppercase tracking-widest" style="color: var(--text-secondary);">Output History</span>
        <div class="flex items-center gap-2">
          <button v-if="history.length" class="btn btn-danger-outline btn-sm" @click="emit('clear')" title="Clear all">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
          <button class="btn btn-outline btn-icon btn-sm" @click="emit('close')">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      <div v-if="history.length === 0" class="panel-empty">
        <span class="font-mono text-xs" style="color: var(--text-secondary); opacity: 0.5;">No runs yet</span>
      </div>

      <div v-else class="panel-body">
        <div v-for="run in history" :key="run.id" class="run-card">
          <div class="run-header" @click="toggleCollapse(run.id)">
            <div class="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                :style="{ transform: collapsed.has(run.id) ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }"
              ><polyline points="9 18 15 12 9 6"/></svg>
              <span class="font-mono text-xs font-bold">{{ run.id }}</span>
              <span class="font-mono text-2xs" style="color: var(--text-secondary); opacity: 0.6;">{{ formatTime(run.timestamp) }}</span>
            </div>
            <span class="font-mono text-2xs" style="color: var(--text-secondary); opacity: 0.5;">{{ run.assets.length }}</span>
          </div>

          <div v-if="!collapsed.has(run.id)" class="run-assets">
            <div v-for="(a, idx) in run.assets" :key="idx" class="asset-item">
              <div class="asset-label">{{ a.name }}</div>
              <div v-if="isImage(a) && a.data" class="asset-thumb">
                <img :src="imgUrl(a)" alt="" />
                <div class="thumb-overlay">
                  <button class="btn btn-sm" style="background: rgba(255,255,255,0.15); color: #fff; border: none;" @click.stop="lightbox = { filename: a.data, subfolder: a.subfolder || '', type: a.type || 'output', name: a.name }">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  </button>
                  <button class="btn btn-sm" style="background: rgba(255,255,255,0.15); color: #fff; border: none;" @click.stop="downloadAsset(a)">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                </div>
              </div>
              <div v-else-if="isColor(a) && a.data" class="asset-color" :style="{ background: a.data }">
                <span class="font-mono text-2xs" style="mix-blend-mode: difference; color: #fff;">{{ a.data }}</span>
              </div>
              <div v-else-if="isMetrics(a) && a.data" class="asset-metrics">
                <pre class="font-mono text-2xs whitespace-pre-wrap break-words">{{ typeof a.data === 'object' ? JSON.stringify(a.data, null, 2) : String(a.data) }}</pre>
              </div>
              <div v-else-if="isToggle(a)" class="asset-toggle">
                <span class="font-mono text-2xs" :style="{ color: a.data ? 'var(--success)' : 'var(--text-secondary)' }">{{ a.data ? 'true' : 'false' }}</span>
              </div>
              <div v-else class="asset-value">
                <span class="font-mono text-xs break-words">{{ a.data != null ? String(a.data) : '∅' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </Transition>

  <div v-if="lightbox !== null" class="dialog-overlay" @click="lightbox = null">
    <div class="relative inline-block" @click.stop>
      <img
        :src="'/view?filename=' + lightbox.filename + (lightbox.subfolder ? '&subfolder=' + lightbox.subfolder : '') + '&type=' + lightbox.type"
        alt=""
      />
      <button class="btn btn-sm lightbox-download" @click.stop="downloadAsset(lightbox)">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      </button>
    </div>
  </div>
</template>

<style scoped>
.asset-panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 9997;
  background: rgba(0,0,0,0.3);
}
.asset-panel {
  position: fixed;
  top: 0; right: 0; bottom: 0;
  width: 340px;
  background: var(--surface-ground);
  border-left: 1px solid var(--surface-border);
  z-index: 9998;
  box-shadow: -4px 0 16px rgba(0,0,0,0.15);
  overflow-y: auto;
  overscroll-behavior: contain;
}
.panel-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--surface-ground);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--surface-border);
}
.panel-empty {
  padding: 48px 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.panel-body {
  padding: 8px;
}
.run-card + .run-card {
  margin-top: 8px;
}
.run-card {
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-md);
  background: var(--input-bg);
  overflow: hidden;
}
.run-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  user-select: none;
}
.run-header:hover {
  background: color-mix(in srgb, var(--surface-border) 20%, transparent);
}
.run-assets {
  border-top: 1px solid var(--surface-border);
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.asset-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.asset-label {
  font-family: monospace;
  font-size: 0.625rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
  opacity: 0.7;
}
.asset-thumb {
  border-radius: var(--radius-sm);
  overflow: hidden;
  cursor: pointer;
  border: 1px solid var(--surface-border);
  aspect-ratio: 1;
  max-width: 100%;
  max-height: 50vh;
  display: flex;
  position: relative;
}
.asset-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.thumb-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(0,0,0,0.6);
  opacity: 0;
  transition: opacity 0.15s;
}
.asset-thumb:hover .thumb-overlay {
  opacity: 1;
}
.lightbox-download {
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0,0,0,0.6) !important;
  color: #fff !important;
  border: none !important;
}
.asset-color {
  height: 28px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--surface-border);
}
.asset-metrics pre {
  margin: 0;
  padding: 6px 8px;
  background: var(--surface-section);
  border-radius: var(--radius-sm);
  border: 1px solid var(--surface-border);
  line-height: 1.4;
  max-height: 40vh;
  overflow-y: auto;
}
.asset-value {
  padding: 4px 0;
  max-height: 40vh;
  overflow-y: auto;
}
.asset-toggle {
  padding: 4px 0;
}

/* Overlay fade */
.overlay-enter-active, .overlay-leave-active {
  transition: opacity 0.2s;
}
.overlay-enter-from, .overlay-leave-to {
  opacity: 0;
}

/* Panel slide from right */
.slide-enter-active, .slide-leave-active {
  transition: transform 0.2s ease;
}
.slide-enter-from, .slide-leave-to {
  transform: translateX(100%);
}
</style>
