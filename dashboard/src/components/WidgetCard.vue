<script setup lang="ts">
import { computed, inject, toRefs } from 'vue'
import SliderInput from './widgets/SliderInput.vue'
import ToggleInput from './widgets/ToggleInput.vue'
import ColorInput from './widgets/ColorInput.vue'
import TextDisplay from './widgets/TextDisplay.vue'
import MetricsCard from './widgets/MetricsCard.vue'
import ImageViewer from './widgets/ImageViewer.vue'
import SelectInput from './widgets/SelectInput.vue'

const props = defineProps<{
  widget: any
  isInput: boolean
}>()
const { widget, isInput } = toRefs(props)

const gatewayValues = inject('gatewayValues') as Record<string, any>
const setControl = inject('setControl') as (w: any, mode: string) => void

const compMap: Record<string, any> = {
  slider: SliderInput,
  toggle: ToggleInput,
  color: ColorInput,
  text: TextDisplay,
  "text(line)": TextDisplay,
  "text(multiline)": TextDisplay,
  number: TextDisplay,
  metrics: MetricsCard,
  image: ImageViewer,
  select: SelectInput,
}

const comp = computed(() => compMap[widget.value.ui_type] || TextDisplay)

const isNumeric = computed(() => {
  const t = widget.value.ui_type
  return t === 'slider' || t === 'number(int)' || t === 'number(float)'
})

const ctrlOptions = ['fixed', 'randomize', 'increment', 'decrement']

function onControlChange(e: Event) {
  const mode = (e.target as HTMLSelectElement).value
  widget.value.control = mode
  if (setControl) setControl(widget.value, mode)
}

function onUpdate(val: any) {
  if (gatewayValues) {
    gatewayValues[widget.value.name] = val
  }
}
</script>

<template>
  <div class="card">
    <div class="p-3">
      <div class="flex items-center justify-between">
        <label class="block font-mono text-xs font-bold uppercase tracking-widest truncate" :title="widget.name" style="color: var(--text-secondary);">
          {{ widget.name }}
        </label>
        <div v-if="isInput" class="flex items-center gap-1">
          <select
            v-if="isNumeric"
            class="mode-select"
            :value="widget.control || 'fixed'"
            @change="onControlChange"
            :title="'control mode'"
          >
            <option v-for="m in ctrlOptions" :key="m" :value="m">{{ m }}</option>
          </select>
          <span
            v-else
            class="font-mono text-2xs px-1 rounded"
            :title="'control: fixed'"
            style="color: var(--accent-color); background: color-mix(in srgb, var(--accent-color) 12%, transparent); line-height: 1.4;"
          >fx</span>
        </div>
      </div>
      <div class="mt-2" style="max-width: 100%; overflow-x: auto;">
        <component
          :is="comp"
          :widget="widget"
          :is-input="isInput"
          :model-value="isInput ? gatewayValues?.[widget.name] : widget.data"
          @update:model-value="onUpdate"
        />
      </div>
      <span v-if="!isInput && widget.data === undefined" class="block mt-1 font-mono text-sm italic" style="color: var(--text-secondary); opacity: 0.4;">waiting for data...</span>
    </div>
  </div>
</template>

<style scoped>
.mode-select {
  font-family: monospace;
  font-size: 10px;
  padding: 2px 4px;
  border-radius: 4px;
  line-height: 1.4;
  cursor: pointer;
  color: var(--accent-color);
  background: color-mix(in srgb, var(--accent-color) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent-color) 30%, transparent);
  outline: none;
}
.mode-select:focus {
  border-color: var(--accent-color);
}
</style>
