<script setup lang="ts">
import { computed } from 'vue'
import ColumnPanel from './ColumnPanel.vue'
import PastGenerations from './PastGenerations.vue'

const props = defineProps<{ data: any; pastGenerations: any[] }>()
const emit = defineEmits<{ clear: [] }>()

type Position = 'left' | 'middle' | 'right'

const byPosition = computed(() => {
  const map: Record<Position, { inputs: any[]; outputs: any[] }> = {
    left: { inputs: [], outputs: [] },
    middle: { inputs: [], outputs: [] },
    right: { inputs: [], outputs: [] },
  }
  for (const w of props.data?.input_widgets || []) {
    const pos = (w.position || 'middle') as Position
    if (map[pos]) map[pos].inputs.push(w)
  }
  for (const w of props.data?.output_widgets || []) {
    const pos = (w.position || 'middle') as Position
    if (map[pos]) map[pos].outputs.push(w)
  }
  return map
})

const hasLeft = computed(() => byPosition.value.left.inputs.length > 0 || byPosition.value.left.outputs.length > 0)
const hasMiddle = computed(() => byPosition.value.middle.inputs.length > 0 || byPosition.value.middle.outputs.length > 0)
const hasRight = computed(() => byPosition.value.right.inputs.length > 0 || byPosition.value.right.outputs.length > 0)
</script>

<template>
  <div class="layout-grid flex-1 min-h-0">
    <aside v-if="hasLeft" class="col-left overflow-y-auto px-4 py-3 gap-4 flex flex-col" style="background: var(--surface-ground);">
      <ColumnPanel
        position="left"
        :input-widgets="byPosition.left.inputs"
        :output-widgets="byPosition.left.outputs"
      />
    </aside>

    <section v-if="hasMiddle" class="col-center overflow-y-auto px-4 py-3 gap-4 flex flex-col" style="background: var(--surface-section);">
      <ColumnPanel
        position="middle"
        :input-widgets="byPosition.middle.inputs"
        :output-widgets="byPosition.middle.outputs"
      />
    </section>

    <aside v-if="hasRight" class="col-right overflow-y-auto px-4 py-3 gap-4 flex flex-col" style="background: var(--surface-ground);">
      <ColumnPanel
        position="right"
        :input-widgets="byPosition.right.inputs"
        :output-widgets="byPosition.right.outputs"
      />
      <PastGenerations :generations="pastGenerations" @clear="emit('clear')" />
    </aside>
  </div>
</template>

<style scoped>
.layout-grid {
  display: grid;
  grid-template-columns: 240px 1fr 240px;
}
.col-left { border-right: 1px solid var(--surface-border); }
.col-right { border-left: 1px solid var(--surface-border); }
@media (max-width: 1200px) {
  .layout-grid { grid-template-columns: 200px 1fr 200px; }
}
@media (max-width: 900px) {
  .layout-grid { grid-template-columns: 1fr; }
  .col-left, .col-right { display: none; }
}
</style>
