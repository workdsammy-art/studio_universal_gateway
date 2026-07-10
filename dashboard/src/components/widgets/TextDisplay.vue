<script setup lang="ts">
defineProps<{ widget: any; isInput: boolean }>()
const modelValue = defineModel<any>()
</script>

<template>
  <div v-if="isInput">
    <textarea
      v-if="widget.ui_type === 'text(multiline)'"
      v-model="modelValue"
      class="input textarea"
      rows="4"
      :placeholder="widget.name"
    ></textarea>
    <input
      v-else
      v-model="modelValue"
      class="input"
      :type="widget.ui_type?.startsWith('number') ? 'number' : 'text'"
      :step="widget.ui_type === 'number(int)' ? 1 : (widget.step ?? 'any')"
      :min="widget.min"
      :max="widget.max"
      :placeholder="widget.name"
    />
  </div>
  <div v-else class="font-mono text-sm whitespace-pre-wrap break-words" style="max-height: 12rem; overflow-y: auto; color: var(--text-color);">
    {{ modelValue !== undefined && modelValue !== null ? String(modelValue) : '—' }}
  </div>
</template>
