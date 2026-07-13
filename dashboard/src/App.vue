<script setup lang="ts">
declare const __APP_VERSION__: string

import { reactive, ref, onMounted, onUnmounted, provide } from 'vue'
import { useGatewayStore } from './composables/useGatewayStore'
import { useWebSocket } from './composables/useWebSocket'
import DashboardLayout from './components/DashboardLayout.vue'
import Toolbar from './components/Toolbar.vue'
import SyncBanner from './components/SyncBanner.vue'
import AssetPanel from './components/AssetPanel.vue'
import emptyState from './assets/empty-state.svg'

const { state, fetchData, setError, setNeedsSync } = useGatewayStore()
const values = reactive<Record<string, any>>({})
const lastSubmitted = reactive<Record<string, any>>({})
const showPanel = ref(false)
interface AssetRecord { name: string; data: any; ui_type: string; subfolder?: string; type?: string }
interface RunRecord { id: number; timestamp: number; assets: AssetRecord[] }
const runHistory = reactive<RunRecord[]>([])
const isDark = ref(true)
const toasts = reactive<string[]>([])

let lastUpdated = 0
let polling: ReturnType<typeof setInterval> | null = null
let bc: BroadcastChannel | null = null
let getClientId: () => string | null = () => null
let toastTimer: ReturnType<typeof setTimeout> | null = null

const refreshing = ref(false)
const batchCount = ref(1)
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
      const emax = Math.min(max, Number.MAX_SAFE_INTEGER)
      const emin = Math.min(min, Number.MAX_SAFE_INTEGER)
      if (emax <= emin) return emin
      const steps = Math.floor((emax - emin) / step)
      const r = Math.floor(Math.random() * (steps + 1))
      const v = emin + r * step
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
  const canvasMode = canvasModes[w.name] ?? 'fixed'
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

function applyControlOverrides(skipDashboardControl = false) {
  for (const w of state.data?.input_widgets || []) {
    const raw = w.control ?? 'fixed'
    canvasModes[w.name] = raw
    const o = controlOverrides[w.name]
    if (o && o.canvasModeAtSet === raw) {
      w.control = o.mode
    } else {
      if (o) {
        delete controlOverrides[w.name]
        saveOverrides()
      }
      if (!skipDashboardControl && w.dashboard_control) {
        w.control = w.dashboard_control
      }
    }
  }
}

async function refreshData(skipDashboardControl = false) {
  if (refreshing.value) return
  refreshing.value = true
  try {
    const prev = state.data
    await fetchData()
    if (state.data) {
      applyControlOverrides(skipDashboardControl)
      initValues()
    } else {
      state.data = prev
    }
  } finally {
    refreshing.value = false
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
  await refreshData(true)

  const bc = batchCount.value
  for (let b = 0; b < bc; b++) {
    setError(null)
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
}

async function resync() {
  setNeedsSync(false)
  for (const name of Object.keys(controlOverrides)) {
    delete controlOverrides[name]
  }
  saveOverrides()
  const sent = postToOpener({ type: 'resync' })
  if (!sent) {
    await refreshData(true)
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
  const runAssets: AssetRecord[] = []
  for (const asset of assets) {
    const w = outputWidgets.find((w: any) => w.name === asset.name)
    runAssets.push({
      name: asset.name,
      data: w?.data ?? asset.data,
      ui_type: w?.ui_type || asset.ui_type || 'text',
      subfolder: w?.subfolder || asset.subfolder || '',
      type: w?.type || asset.type || 'output',
    })
  }
  runHistory.unshift({ id: state.promptId || 'run_' + Date.now(), timestamp: Date.now(), assets: runAssets })
}

async function cancel() {
  try {
    await fetch('/gateway/interrupt', { method: 'POST' })
  } catch (e) {
    console.warn('cancel failed:', e)
  }
}

function clearHistory() {
  runHistory.splice(0, runHistory.length)
}

function handleMessage(event: MessageEvent) {
  if (event.origin !== location.origin) return
  const data = event.data
  if (!data?.type) return
  if (data.type === 'resynced') {
    refreshData().then(() => {
      lastUpdated = state.data?.last_updated || 0
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
    <Toolbar :is-dark="isDark" :batch-count="batchCount" :show-panel="showPanel" @update:batch-count="batchCount = $event" @run="($event: number) => run()" @cancel="cancel" @resync="resync" @toggle-theme="toggleTheme" @toggle-panel="showPanel = !showPanel" />
    <main class="flex-1 flex flex-col min-h-0">
      <template v-if="state.loaded && state.data">
        <DashboardLayout
          :data="state.data"
        />
      </template>
      <div v-else class="flex-1 flex items-center justify-center">
        <div v-if="!state.loaded" class="flex flex-col gap-3" style="width: 400px;">
          <div class="skeleton" style="height: 20px; width: 60%;"></div>
          <div class="skeleton" style="height: 80px;"></div>
          <div class="skeleton" style="height: 20px; width: 40%;"></div>
          <div class="skeleton" style="height: 80px;"></div>
          <div class="skeleton" style="height: 20px; width: 50%;"></div>
          <div class="skeleton" style="height: 80px;"></div>
        </div>
        <div v-if="state.loaded && !state.data" class="flex items-center justify-center flex-col gap-4">
          <img :src="emptyState" alt="No data" style="width: 256px; height: 192px;" />
          <span class="font-mono text-sm" style="color: var(--text-secondary);">Connect Input/Output Gateway nodes to your workflow</span>
        </div>
      </div>
    </main>
    <footer class="flex items-center justify-center shrink-0" style="height: 28px; border-top: 1px solid var(--surface-border);">
      <span class="font-mono text-2xs" style="color: var(--text-secondary); opacity: 0.4;">v{{ __APP_VERSION__ }}</span>
    </footer>
    <AssetPanel
      :visible="showPanel"
      :history="runHistory"
      @clear="clearHistory"
      @close="showPanel = false"
    />
  </div>
</template>
