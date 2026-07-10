<script setup lang="ts">
defineProps<{ widget: any; isInput: boolean }>()
const modelValue = defineModel<any>()
</script>

<template>
  <div v-if="isInput" class="flex items-center gap-[8px]">
    <input type="range" v-model.number="modelValue" class="w-full" :min="widget.min ?? 0" :max="widget.max ?? 100" :step="widget.step ?? 1" />
    <span class="font-mono text-xs font-bold text-right" style="min-width: 2rem; color: var(--text-secondary);">{{ modelValue }}</span>
  </div>
  <div v-else class="font-mono text-sm" style="color: var(--text-color);">
    {{ modelValue !== undefined && modelValue !== null ? modelValue : '—' }}
  </div>
</template>
