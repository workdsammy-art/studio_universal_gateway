import { onMounted, onUnmounted } from 'vue'
import { useGatewayStore } from './useGatewayStore'

export function useWebSocket(callbacks?: { onExecuted?: (assets: any[], outputWidgets: any[]) => void }) {
  const { state, setStatus, updateProgress, setPromptId, setError } = useGatewayStore()
  let ws: WebSocket | null = null
  let clientId: string | null = null

  function connect() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return

    if (!clientId) {
      clientId = localStorage.getItem('studio-gateway-client-id') || crypto.randomUUID()
      localStorage.setItem('studio-gateway-client-id', clientId)
    }
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    ws = new WebSocket(`${proto}//${location.host}/ws?clientId=${clientId}`)

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        handleMessage(msg)
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      ws = null
      setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      ws?.close()
    }
  }

  const pendingImages: {filename: string; subfolder: string; type: string}[] = []
  let pendingStudioAssets: any[] | null = null

  function normalizeMedia(m: any): {filename: string; subfolder: string; type: string} {
    if (m && typeof m === 'object' && !Array.isArray(m)) {
      return { filename: m.filename, subfolder: m.subfolder || '', type: m.type || 'output' }
    }
    if (Array.isArray(m)) {
      return { filename: m[0], subfolder: m[1] || '', type: m[2] || 'output' }
    }
    return { filename: String(m), subfolder: '', type: 'output' }
  }

  function flushImages() {
    console.log('[gateway] flushImages called. pendingStudioAssets=', !!pendingStudioAssets, 'pendingImages=', pendingImages.length, 'output_widgets=', (state.data?.output_widgets || []).length)
    if (!pendingStudioAssets || !state.data?.output_widgets) return
    const widgets = state.data.output_widgets
    let imgIdx = 0
    for (const asset of pendingStudioAssets) {
      if (asset.ui_type !== 'image' || (asset.data !== undefined && asset.data !== null)) continue
      const w = widgets.find((w: any) => w.name === asset.name)
      if (w && imgIdx < pendingImages.length) {
        w.data = pendingImages[imgIdx].filename
        w.subfolder = pendingImages[imgIdx].subfolder
        w.type = pendingImages[imgIdx].type
        imgIdx++
      }
    }
    if (callbacks?.onExecuted) callbacks.onExecuted(pendingStudioAssets, widgets)
    pendingStudioAssets = null
  }

  function handleMessage(msg: any) {
    switch (msg.type) {
      case 'execution_start':
        setStatus('running')
        setPromptId(msg.data?.prompt_id || null)
        updateProgress(0, 1)
        pendingImages.splice(0, pendingImages.length)
        pendingStudioAssets = null
        break

      case 'executing':
        if (msg.data === null || msg.data === undefined || msg.data?.node === null || msg.data?.node === undefined) {
          flushImages()
          setStatus('completed')
          setPromptId(null)
          updateProgress(1, 1)
        }
        break

      case 'executed':
        console.log('[gateway] executed msg received. node=', msg.data?.node, 'outputKeys=', Object.keys(msg.data?.output || {}))
        if (msg.data?.output?.images) {
          console.log('[gateway] collected images:', JSON.stringify(msg.data.output.images))
          for (const img of msg.data.output.images) {
            pendingImages.push(normalizeMedia(img))
          }
        }
        if (msg.data?.output?.gif) {
          for (const g of msg.data.output.gif) pendingImages.push(normalizeMedia(g))
        }
        if (msg.data?.output?.audio) {
          for (const a of msg.data.output.audio) pendingImages.push(normalizeMedia(a))
        }
        if (msg.data?.output?.studio_assets) {
          const assets = msg.data.output.studio_assets
          console.log('[gateway] studio_assets found:', JSON.stringify(assets))
          console.log('[gateway] output_widgets names:', JSON.stringify((state.data?.output_widgets || []).map((w: any) => w.name)))
          if (state.data?.output_widgets) {
            const widgets = state.data.output_widgets
            for (const asset of assets) {
              if (asset.data !== undefined && asset.data !== null) {
                const w = widgets.find((w: any) => w.name === asset.name)
                if (w) {
                  console.log('[gateway] set data for', asset.name, '->', asset.data)
                  w.data = asset.data
                } else {
                  console.log('[gateway] NO WIDGET MATCH for', asset.name)
                }
              } else {
                console.log('[gateway] asset', asset.name, 'has empty data (waiting for image flush)')
              }
            }
          } else {
            console.log('[gateway] output_widgets is null/undefined!')
          }
          pendingStudioAssets = assets
        }
        break

      case 'execution_cached':
        if (state.progress) {
          updateProgress(state.progress.current + 1, state.progress.max + 1)
        }
        break

      case 'progress':
        updateProgress(msg.data?.value || 0, msg.data?.max || 1)
        break

      case 'execution_error':
        setError(msg.data?.exception_message || 'Execution error')
        setStatus('error')
        break
    }
  }

  function getClientId(): string | null {
    return clientId
  }

  onMounted(connect)
  onUnmounted(() => ws?.close())

  return { getClientId }
}
