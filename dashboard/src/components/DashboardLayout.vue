<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
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

const DIVIDER = 6
const MIN = 180
const STORAGE_KEY = 'gateway-panel-widths'

const container = ref<HTMLElement | null>(null)
const leftWidth = ref(240)
const rightWidth = ref(240)
const dragging = ref<'left' | 'right' | null>(null)
const startX = ref(0)
const startW = ref(0)

function loadWidths() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw)
      if (typeof p.left === 'number') leftWidth.value = p.left
      if (typeof p.right === 'number') rightWidth.value = p.right
    }
  } catch { /* ignore */ }
}

function saveWidths() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ left: leftWidth.value, right: rightWidth.value }))
}

function startDrag(e: MouseEvent, side: 'left' | 'right') {
  dragging.value = side
  startX.value = e.clientX
  startW.value = side === 'left' ? leftWidth.value : rightWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
}

function onMouseMove(e: MouseEvent) {
  if (!dragging.value || !container.value) return
  const delta = e.clientX - startX.value
  const max = container.value.clientWidth * 0.5
  if (dragging.value === 'left') {
    leftWidth.value = Math.max(MIN, Math.min(max, startW.value + delta))
  } else {
    rightWidth.value = Math.max(MIN, Math.min(max, startW.value - delta))
  }
}

function onMouseUp() {
  if (!dragging.value) return
  dragging.value = null
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  saveWidths()
}

onMounted(() => {
  loadWidths()
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
})

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div ref="container" class="layout-row flex-1 min-h-0">
    <aside v-if="hasLeft" class="col-left overflow-y-auto px-4 py-3 gap-4 flex flex-col" :style="{ width: leftWidth + 'px', background: 'var(--surface-ground)' }">
      <ColumnPanel
        position="left"
        :input-widgets="byPosition.left.inputs"
        :output-widgets="byPosition.left.outputs"
      />
    </aside>

    <div v-if="hasLeft && hasMiddle" class="divider" @mousedown="startDrag($event, 'left')" />

    <section v-if="hasMiddle" class="col-center overflow-y-auto px-4 py-3 gap-4 flex flex-col" :style="{ flex: '1 1 0', minWidth: MIN + 'px', background: 'var(--surface-section)' }">
      <ColumnPanel
        position="middle"
        :input-widgets="byPosition.middle.inputs"
        :output-widgets="byPosition.middle.outputs"
      />
    </section>

    <div v-if="hasMiddle && hasRight" class="divider" @mousedown="startDrag($event, 'right')" />

    <aside v-if="hasRight" class="col-right overflow-y-auto px-4 py-3 gap-4 flex flex-col" :style="{ width: rightWidth + 'px', background: 'var(--surface-ground)' }">
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
.layout-row {
  display: flex;
  flex-direction: row;
}
.col-left {
  flex-shrink: 0;
  border-right: 1px solid var(--surface-border);
}
.col-right {
  flex-shrink: 0;
  border-left: 1px solid var(--surface-border);
}
.divider {
  width: 6px;
  cursor: col-resize;
  flex-shrink: 0;
  background: transparent;
  position: relative;
  z-index: 1;
  transition: background 0.15s;
}
.divider:hover,
.divider:active {
  background: color-mix(in srgb, var(--primary) 20%, transparent);
}
@media (max-width: 900px) {
  .col-left, .col-right, .divider { display: none; }
}
</style>
