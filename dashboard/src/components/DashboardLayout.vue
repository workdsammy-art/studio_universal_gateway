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
  <div class="flex flex-1 min-h-0">
    <aside v-if="hasLeft" class="overflow-y-auto px-[16px] py-[12px] gap-[16px] border-r flex flex-col" style="width: 20%; min-width: 240px; background: var(--surface-ground);">
      <ColumnPanel
        position="left"
        :input-widgets="byPosition.left.inputs"
        :output-widgets="byPosition.left.outputs"
      />
    </aside>

    <section v-if="hasMiddle" class="flex-1 overflow-y-auto px-[16px] py-[12px] gap-[16px] flex flex-col" style="background: var(--surface-section);">
      <ColumnPanel
        position="middle"
        :input-widgets="byPosition.middle.inputs"
        :output-widgets="byPosition.middle.outputs"
      />
    </section>

    <aside v-if="hasRight" class="overflow-y-auto px-[16px] py-[12px] gap-[16px] border-l flex flex-col" style="width: 20%; min-width: 240px; background: var(--surface-ground);">
      <ColumnPanel
        position="right"
        :input-widgets="byPosition.right.inputs"
        :output-widgets="byPosition.right.outputs"
      />

      <PastGenerations :generations="pastGenerations" @clear="emit('clear')" />
    </aside>
  </div>
</template>
