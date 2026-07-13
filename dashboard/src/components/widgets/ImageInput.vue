<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{ widget: any; isInput: boolean; modelValue: any }>()
const emit = defineEmits<{ 'update:model-value': [val: any] }>()

const uploading = ref(false)
const previewUrl = ref<string | null>(props.modelValue ? `/view?filename=${encodeURIComponent(props.modelValue)}&type=input` : null)
const error = ref('')

async function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  error.value = ''
  try {
    const form = new FormData()
    form.append('image', file)
    form.append('type', 'input')
    const resp = await fetch('/upload/image', { method: 'POST', body: form })
    if (!resp.ok) throw new Error(`Upload failed (${resp.status})`)
    const result = await resp.json()
    const filename = result.name || file.name
    previewUrl.value = `/view?filename=${encodeURIComponent(filename)}&type=input`
    emit('update:model-value', filename)
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    uploading.value = false
  }
}

function clearImage() {
  previewUrl.value = null
  emit('update:model-value', undefined)
}
</script>

<template>
  <div>
    <div v-if="error" class="font-mono text-xs mt-1" style="color: #e74c3c;">{{ error }}</div>
    <div v-if="previewUrl" class="relative group">
      <img :src="previewUrl" style="max-width: 100%; height: auto; border-radius: var(--radius-sm); display: block;" alt="uploaded image" />
      <div class="absolute inset-0 flex items-center justify-center gap-3 transition-opacity opacity-0 group-hover:opacity-100" style="background: rgba(0,0,0,0.6);">
        <label class="btn btn-sm" style="cursor:pointer; background:rgba(255,255,255,0.15); color:#fff; border:none; padding:4px 8px; border-radius:var(--radius-sm); font-size:11px;" aria-label="Replace image">
          Replace
          <input type="file" accept="image/*" style="display:none" @change="onFileSelected" />
        </label>
        <button class="btn btn-sm" style="background:rgba(255,255,255,0.15); color:#fff; border:none;" aria-label="Remove image" @click="clearImage">Remove</button>
      </div>
    </div>
    <label v-else class="upload-btn">
      <input type="file" accept="image/*" @change="onFileSelected" :disabled="uploading" />
      <span v-if="uploading" class="font-mono text-xs">Uploading...</span>
      <span v-else class="font-mono text-xs">Upload Image</span>
    </label>
  </div>
</template>

<style scoped>
.upload-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border-radius: var(--radius-sm, 6px);
  cursor: pointer;
  border: 1px dashed var(--input-border);
  transition: border-color 0.15s;
}
.upload-btn:hover {
  border-color: var(--accent-color, #FF3F00);
}
.upload-btn input {
  display: none;
}
</style>
