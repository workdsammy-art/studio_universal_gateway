<script setup lang="ts">
import { reactive, ref, onMounted, onUnmounted, provide } from 'vue'
import { useGatewayStore } from './composables/useGatewayStore'
import { useWebSocket } from './composables/useWebSocket'
import DashboardLayout from './components/DashboardLayout.vue'
import Toolbar from './components/Toolbar.vue'
import SyncBanner from './components/SyncBanner.vue'
import emptyState from './assets/empty-state.svg'

const { state, fetchData, setError, setNeedsSync } = useGatewayStore()
const values = reactive<Record<string, any>>({})
const lastSubmitted = reactive<Record<string, any>>({})
const pastGenerations = reactive<{ filename: string; subfolder: string }[]>([])
const isDark = ref(true)
const toasts = reactive<string[]>([])

let lastUpdated = 0
let polling: ReturnType<typeof setInterval> | null = null
let bc: BroadcastChannel | null = null
let getClientId: () => string | null = () => null
let toastTimer: ReturnType<typeof setTimeout> | null = null

// ponytail: dashboard control-mode preference that beats the canvas default on
// resync. canvasModeAtSet records what the canvas said when the user picked the
// mode, so a later canvas edit can auto-take-effect (drop the override).
const controlOverrides = reactive<Record<string, { mode: string; canvasModeAtSet: string }>>({})
const canvasModes: Record<string, string> = {}

function loadOverrides() {
  try {
    const raw = localStorage.getItem('gateway-control-overrides')
    if (raw) Object.assign(controlOverrides, JSON.parse(raw))
  } catch {
    /* ignore corrupt storage */
  }
}

function saveOverrides() {
  localStorage.setItem('gateway-control-overrides', JSON.stringify(controlOverrides))
}

provide('gatewayValues', values)
provide('setControl', setControl)

function showToast(msg: string) {
  toasts.push(msg)
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toasts.splice(0, toasts.length) }, 2000)
}

function postToOpener(msg: any): boolean {
  if (window.opener && !window.opener.closed) {
    window.opener.postMessage(msg, location.origin)
    return true
  }
  return false
}

function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  document.documentElement.classList.toggle('light', !isDark.value)
  localStorage.setItem('gateway-theme', isDark.value ? 'dark' : 'light')
}

function resolveValue(w: any, current: any): any {
  const ctrl = w.control || 'fixed'
  const min = w.min ?? 0
  const max = w.max ?? 100
  const step = (w.step ?? 1) || 1
  const isInt = !String(step).includes('.')

  switch (ctrl) {
    case 'randomize': {
      const steps = Math.floor((max - min) / step)
      const r = Math.floor(Math.random() * (steps + 1))
      const v = min + r * step
      return isInt ? Math.round(v) : parseFloat(v.toFixed(10))
    }
    case 'increment': {
      const prev = w.name in lastSubmitted ? lastSubmitted[w.name] : current
      let v = (prev ?? min) + step
      if (v > max) v = min
      return isInt ? Math.round(v) : parseFloat(v.toFixed(10))
    }
    case 'decrement': {
      const prev = w.name in lastSubmitted ? lastSubmitted[w.name] : current
      let v = (prev ?? min) - step
      if (v < min) v = max
      return isInt ? Math.round(v) : parseFloat(v.toFixed(10))
    }
    default:
      return current
  }
}

async function setControl(w: any, mode: string) {
  // Remember the canvas mode at set-time so a later canvas edit can take over.
  const canvasMode = canvasModes[w.name] ?? w.control ?? 'fixed'
  controlOverrides[w.name] = { mode, canvasModeAtSet: canvasMode }
  saveOverrides()
  w.control = mode
  try {
    await fetch('/gateway/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: w.name, control: mode }),
    })
  } catch (e) {
    console.warn('set control failed:', e)
  }
}

// Re-apply dashboard control-mode overrides on top of freshly fetched data.
// If the canvas mode moved since the user set the override, let the canvas win.
function applyControlOverrides() {
  for (const w of state.data?.input_widgets || []) {
    const raw = w.control
    canvasModes[w.name] = raw
    const o = controlOverrides[w.name]
    if (o && o.canvasModeAtSet === raw) {
      w.control = o.mode
    } else {
      if (o) {
        delete controlOverrides[w.name]
        saveOverrides()
      }
      if (w.dashboard_control) {
        w.control = w.dashboard_control
      }
    }
  }
}

async function refreshData() {
  const prev = state.data
  await fetchData()
  if (state.data) {
    applyControlOverrides()
    initValues()
  } else {
    state.data = prev
  }
}

async function run() {
  setError(null)

  // Pull the latest canvas state so control-mode changes made on the node
  // (without a save) are honored before resolving values.
  const opener = window.opener
  if (opener && !opener.closed) {
    await new Promise<void>((resolve) => {
      const onResynced = (e: MessageEvent) => {
        if (e.data?.type === 'resynced') {
          window.removeEventListener('message', onResynced)
          resolve()
        }
      }
      window.addEventListener('message', onResynced)
      opener.postMessage({ type: 'resync' }, location.origin)
      setTimeout(resolve, 2500)
    })
  }
  await refreshData()

  const runValues: Record<string, any> = {}
  for (const w of state.data?.input_widgets || []) {
    if (w.name in values) {
      const v = resolveValue(w, values[w.name])
      runValues[w.name] = v
      values[w.name] = v
    }
  }
  Object.assign(lastSubmitted, runValues)
  const clientId = getClientId()
  const sent = postToOpener({ type: 'run', values: runValues, client_id: clientId })
  if (!sent) {
    try {
      const resp = await fetch('/gateway/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          output: state.data?.output,
          workflow: state.data?.workflow,
          values: runValues,
          client_id: clientId,
        }),
      })
      const result = await resp.json()
    } catch (e) {
      setError((e as Error).message)
    }
  }
}

async function resync() {
  setNeedsSync(false)
  const sent = postToOpener({ type: 'resync' })
  if (!sent) {
    await refreshData()
    lastUpdated = state.data?.last_updated || 0
  }
  showToast('Re-synced')
}

async function silentResync() {
  setNeedsSync(false)
  await refreshData()
  lastUpdated = state.data?.last_updated || 0
}

function initValues() {
  for (const w of state.data?.input_widgets || []) {
    if (!(w.name in values)) {
      if (w.control === 'randomize') {
        values[w.name] = resolveValue(w, 0)
      } else if (w.ui_type === 'toggle') {
        values[w.name] = false
      } else if (w.ui_type === 'slider' || w.ui_type?.startsWith('number')) {
        const lo = w.min != null ? w.min : 0
        const hi = w.max != null ? w.max : 100
        if (w.default != null) {
          values[w.name] = w.ui_type === 'number(int)' ? Math.round(w.default) : w.default
        } else {
          const mid = lo + (hi - lo) / 2
          values[w.name] = w.ui_type === 'number(int)' ? Math.round(mid) : mid
        }
      } else if (w.ui_type === 'color') {
        values[w.name] = '#ffffff'
      } else if (w.ui_type === 'select') {
        values[w.name] = Array.isArray(w.options) && w.options.length ? w.options[0] : ''
      } else {
        values[w.name] = ''
      }
    }
  }
}

function onExecuted(assets: any[], outputWidgets: any[]) {
  for (const asset of assets) {
    const w = outputWidgets.find((w: any) => w.name === asset.name)
    if (w && w.ui_type === 'image' && asset.data) {
      const filename = String(asset.data)
      if (!pastGenerations.some((g) => g.filename === filename)) {
        pastGenerations.push({ filename, subfolder: asset.subfolder || '' })
      }
    }
  }
}

async function cancel() {
  try {
    await fetch('/gateway/interrupt', { method: 'POST' })
  } catch (e) {
    console.warn('cancel failed:', e)
  }
}

function clearPastGenerations() {
  pastGenerations.splice(0, pastGenerations.length)
}

function handleMessage(event: MessageEvent) {
  if (event.origin !== location.origin) return
  const data = event.data
  if (!data?.type) return
  if (data.type === 'resynced') {
    refreshData().then(() => {
      lastUpdated = state.data?.last_updated || 0
      showToast('Re-synced')
    })
  } else if (data.type === 'run_error') {
    setError(data.message || 'Run failed')
  }
}

const ws = useWebSocket({ onExecuted })
getClientId = ws.getClientId

onMounted(async () => {
  const saved = localStorage.getItem('gateway-theme')
  if (saved === 'light') {
    isDark.value = false
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.add('light')
  }

  loadOverrides()
  await refreshData()
  lastUpdated = state.data?.last_updated || 0

  window.addEventListener('message', handleMessage)

  bc = new BroadcastChannel('studio-gateway')
  bc.onmessage = (event) => {
    if (event.data?.type === 'workflow-saved') {
      silentResync()
    }
  }

  polling = setInterval(async () => {
    if (window.opener && !window.opener.closed) return
    try {
      const resp = await fetch('/gateway/data')
      if (!resp.ok) return
      const data = await resp.json()
      if (data.last_updated && data.last_updated > lastUpdated) {
        state.data = data
        lastUpdated = data.last_updated
        setNeedsSync(false)
        applyControlOverrides()
        initValues()
      }
    } catch {
      console.warn('polling fetch failed')
    }
  }, 30000)
})

onUnmounted(() => {
  if (polling) clearInterval(polling)
  bc?.close()
  window.removeEventListener('message', handleMessage)
})
</script>

<template>
  <div class="toast-container">
    <div v-for="(msg, i) in toasts" :key="i" class="toast">{{ msg }}</div>
  </div>
  <div class="flex flex-col" style="min-height: 100vh; background: var(--surface-ground); color: var(--text-color);">
    <SyncBanner v-if="state.needsSync" @resync="resync" />
    <Toolbar :is-dark="isDark" @run="run" @cancel="cancel" @resync="resync" @toggle-theme="toggleTheme" />
    <main class="flex-1 flex flex-col min-h-0">
      <DashboardLayout
        v-if="state.loaded && state.data"
        :data="state.data"
        :past-generations="pastGenerations"
        @clear="clearPastGenerations"
      />
      <div v-else class="flex-1 flex items-center justify-center flex-col gap-4">
        <img v-if="!state.loaded" :src="emptyState" alt="Loading..." style="width: 256px; height: 192px;" />
        <span v-if="!state.loaded" class="font-mono text-xs" style="color: var(--text-secondary); opacity: 0.6;">Loading dashboard...</span>
        <img v-if="state.loaded && !state.data" :src="emptyState" alt="No data" style="width: 256px; height: 192px;" />
        <span v-if="state.loaded && !state.data" class="font-mono text-xs" style="color: var(--text-secondary); opacity: 0.6;">Connect Input/Output Gateway nodes to your workflow</span>
      </div>
    </main>
  </div>
</template>
