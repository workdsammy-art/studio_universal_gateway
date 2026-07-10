<script setup lang="ts">
defineProps<{ widget: any; isInput: boolean }>()
</script>

<template>
  <div class="card">
    <div class="p-[12px]">
      <label class="block font-mono text-[11px] font-bold uppercase tracking-widest truncate mb-[8px]" style="color: var(--text-secondary);">{{ widget.name }}</label>
      <pre class="font-mono text-xs whitespace-pre-wrap overflow-x-auto" style="line-height: 1.5; color: var(--text-secondary); background: var(--input-bg);">{{ widget.data ? (typeof widget.data === 'object' ? JSON.stringify(widget.data, null, 2) : String(widget.data)) : '—' }}</pre>
    </div>
  </div>
</template>
