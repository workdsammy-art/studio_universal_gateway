<script setup lang="ts">
defineProps<{ widget: any; isInput: boolean }>()
const modelValue = defineModel<any>()
</script>

<template>
  <div v-if="isInput" class="flex items-center gap-[8px]">
    <input
      type="color"
      v-model="modelValue"
      style="height: 32px; width: 48px; border-radius: 4px; cursor: pointer; border: 1px solid var(--input-border); background: var(--input-bg);"
    />
    <span class="font-mono text-xs" style="color: var(--text-secondary);">{{ modelValue }}</span>
  </div>
  <div v-else class="flex items-center gap-2">
    <span class="inline-block rounded" style="width: 20px; height: 20px; border: 1px solid var(--surface-border);" :style="{ backgroundColor: modelValue }"></span>
    <span class="font-mono text-xs" style="color: var(--text-secondary);">{{ modelValue }}</span>
  </div>
</template>
