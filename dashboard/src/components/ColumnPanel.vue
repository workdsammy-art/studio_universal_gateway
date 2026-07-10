<script setup lang="ts">
import WidgetCard from './WidgetCard.vue'

defineProps<{
  position: 'left' | 'middle' | 'right'
  inputWidgets: any[]
  outputWidgets: any[]
}>()
</script>

<template>
  <div class="flex flex-col gap-[16px]">
    <div v-if="inputWidgets.length > 0">
      <div class="flex items-center gap-2 mb-[8px] font-mono text-[11px] font-bold uppercase tracking-widest" style="color: var(--text-secondary);">
        <span>INPUTS</span>
        <span class="text-[10px]" style="opacity: 0.4;">({{ inputWidgets.length }})</span>
      </div>
      <div class="flex flex-wrap gap-[8px]">
        <WidgetCard v-for="w in inputWidgets" :key="'in-' + w.name" :widget="w" :is-input="true" />
      </div>
    </div>
    <div v-if="outputWidgets.length > 0">
      <div class="flex items-center gap-2 mb-[8px] font-mono text-[11px] font-bold uppercase tracking-widest" style="color: var(--text-secondary);">
        <span>OUTPUTS</span>
        <span class="text-[10px]" style="opacity: 0.4;">({{ outputWidgets.length }})</span>
      </div>
      <div class="flex flex-wrap gap-[8px]">
        <WidgetCard v-for="w in outputWidgets" :key="'out-' + w.name" :widget="w" :is-input="false" />
      </div>
    </div>
  </div>
</template>
