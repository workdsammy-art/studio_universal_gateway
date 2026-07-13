<script setup lang="ts">
defineProps<{ widget: any; isInput: boolean }>()
</script>

<template>
  <div class="card">
    <div class="p-[12px]">
      <label class="block font-mono text-[11px] font-bold uppercase tracking-widest truncate mb-[8px]" style="color: var(--text-secondary);">{{ widget.name }}</label>
      <pre class="font-mono text-xs" style="line-height: 1.5; color: var(--text-secondary); background: var(--input-bg); max-width: 100%; overflow-x: auto; word-break: break-all; white-space: pre-wrap; box-sizing: border-box; max-height: 40vh; overflow-y: auto;">{{ widget.data ? (typeof widget.data === 'object' ? JSON.stringify(widget.data, null, 2) : String(widget.data)) : '—' }}</pre>
    </div>
  </div>
</template>
