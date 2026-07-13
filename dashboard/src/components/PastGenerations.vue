<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ generations: any[] }>()
const emit = defineEmits<{ clear: [] }>()

const selectedImage = ref<{ filename: string; subfolder: string } | null>(null)

function openLightbox(gen: any) {
  selectedImage.value = { filename: gen.filename, subfolder: gen.subfolder || '' }
}

function closeLightbox() {
  selectedImage.value = null
}
</script>

<template>
  <div v-if="generations.length > 0">
    <div class="flex items-center justify-between mb-3">
      <div class="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest" style="color: var(--text-secondary);">
        <span>Past Generations</span>
        <span class="text-2xs" style="opacity: 0.4;">({{ generations.length }})</span>
      </div>
      <button class="btn btn-outline btn-icon btn-sm" @click="emit('clear')">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <div
        v-for="(gen, idx) in generations"
        :key="idx"
        class="aspect-square rounded overflow-hidden cursor-pointer"
        style="border: 1px solid var(--surface-border);"
        @click="openLightbox(gen)"
      >
        <img
          :src="'/view?filename=' + gen.filename + (gen.subfolder ? '&subfolder=' + gen.subfolder : '') + '&type=output'"
          class="w-full h-full object-cover"
          alt=""
        />
      </div>
    </div>

    <div v-if="selectedImage !== null" class="dialog-overlay" @click="closeLightbox">
      <img
        :src="'/view?filename=' + selectedImage.filename + (selectedImage.subfolder ? '&subfolder=' + selectedImage.subfolder : '') + '&type=output'"
        alt=""
        @click.stop
      />
    </div>
  </div>
</template>
