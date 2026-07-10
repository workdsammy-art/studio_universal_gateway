<script setup lang="ts">
defineProps<{ widget: any; isInput: boolean }>()
const modelValue = defineModel<any>()
</script>

<template>
  <label v-if="isInput" class="flex items-center gap-[8px] cursor-pointer">
    <label class="toggle">
      <input type="checkbox" v-model="modelValue" />
      <div class="slider"></div>
    </label>
    <span class="font-mono text-xs font-bold" :style="{ color: modelValue ? 'var(--primary)' : 'var(--text-secondary)' }">{{ modelValue ? 'ON' : 'OFF' }}</span>
  </label>
  <div v-else class="font-mono text-xs font-bold" :style="{ color: modelValue ? 'var(--primary)' : 'var(--text-secondary)' }">
    {{ modelValue ? 'ON' : 'OFF' }}
  </div>
</template>
