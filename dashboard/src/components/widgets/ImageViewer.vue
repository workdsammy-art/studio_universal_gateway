<script setup lang="ts">
defineProps<{ widget: any; isInput: boolean }>()

function imgUrl(w: any): string {
  const f = w.data || ''
  const sub = w.subfolder ? '&subfolder=' + encodeURIComponent(w.subfolder) : ''
  return '/view?filename=' + encodeURIComponent(f) + sub + '&type=output'
}

function openImage(w: any) {
  window.open(imgUrl(w).replace('&type=output', ''), '_blank')
}

function downloadImage(w: any) {
  window.open(imgUrl(w) + '&download=1', '_blank')
}
</script>

<template>
  <div class="relative group">
    <div v-if="widget.data" class="relative">
      <img
        :src="imgUrl(widget)"
        style="max-width: 100%; height: auto; border-radius: var(--radius-sm); display: block;"
        :alt="widget.name"
      />
      <div class="absolute inset-0 flex items-center justify-center gap-3 transition-opacity opacity-0 group-hover:opacity-100" style="background: rgba(0,0,0,0.6);">
        <button class="btn btn-sm" style="background: rgba(255,255,255,0.15); color: #fff; border: none;" @click="openImage(widget)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
        </button>
        <button class="btn btn-sm" style="background: rgba(255,255,255,0.15); color: #fff; border: none;" @click="downloadImage(widget)">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
      </div>
    </div>
    <div v-else class="font-mono text-xs italic text-center p-[12px]" style="color: var(--text-secondary); opacity: 0.4;">no image</div>
  </div>
</template>
