<script setup lang="ts">
defineProps<{ widget: any; isInput: boolean }>()
const modelValue = defineModel<any>()
</script>

<template>
  <div v-if="isInput">
    <select
      v-model="modelValue"
      class="input"
      :placeholder="widget.name"
    >
      <option v-for="opt in (widget.options || [])" :key="String(opt)" :value="opt">
        {{ opt }}
      </option>
    </select>
  </div>
  <div v-else class="font-mono text-sm whitespace-pre-wrap break-words" style="color: var(--text-color);">
    {{ modelValue !== undefined && modelValue !== null ? String(modelValue) : '—' }}
  </div>
</template>
