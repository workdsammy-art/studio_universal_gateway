import { reactive } from 'vue'

type WidgetType = 'text' | 'number' | 'slider' | 'toggle' | 'color' | 'image' | 'metrics'
type Position = 'left' | 'middle' | 'right'
type Status = 'idle' | 'running' | 'completed' | 'error'

interface WidgetInfo {
  name: string
  ui_type: WidgetType
  position: Position
  isInput: boolean
  data?: any
}

interface StoredData {
  output: Record<string, any>
  workflow: any
  input_widgets: WidgetInfo[]
  output_widgets: WidgetInfo[]
  last_updated: number
}

interface DashboardState {
  loaded: boolean
  data: StoredData | null
  status: Status
  isRunning: boolean
  promptId: string | null
  progress: { current: number; max: number } | null
  needsSync: boolean
  error: string | null
}

const state = reactive<DashboardState>({
  loaded: false,
  data: null,
  status: 'idle',
  isRunning: false,
  promptId: null,
  progress: null,
  needsSync: false,
  error: null,
})

async function fetchData() {
  try {
    const resp = await fetch('/gateway/data')
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const json = await resp.json()
    if (json && typeof json === 'object' && !('error' in json)) {
      state.data = json as StoredData
    } else {
      state.data = null
    }
  } catch (e) {
    state.error = (e as Error).message
  }
  state.loaded = true
}

function setStatus(s: Status) {
  state.status = s
  state.isRunning = s === 'running'
  if (s !== 'running') state.progress = null
}

function updateProgress(current: number, max: number) {
  state.progress = { current, max }
}

function setPromptId(id: string | null) {
  state.promptId = id
}

function setError(msg: string | null) {
  state.error = msg
}

function setNeedsSync(v: boolean) {
  state.needsSync = v
}

export function useGatewayStore() {
  return { state, fetchData, setStatus, updateProgress, setPromptId, setError, setNeedsSync }
}
