<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { analyzeSkinColor, classifySeason } from '@/data/colorAnalysis'
import { useDiagnosisStore } from '@/stores/diagnosis'

const router = useRouter()
const store = useDiagnosisStore()

const fileInputRef = ref<HTMLInputElement | null>(null)
const previewUrl = ref<string | null>(null)
const analyzing = ref(false)
const errorMsg = ref<string | null>(null)

function triggerUpload() {
  fileInputRef.value?.click()
}

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  errorMsg.value = null
  const reader = new FileReader()
  reader.onload = (ev) => {
    previewUrl.value = ev.target?.result as string
  }
  reader.readAsDataURL(file)
}

function resetPhoto() {
  previewUrl.value = null
  errorMsg.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function analyzePhoto() {
  if (!previewUrl.value || analyzing.value) return
  analyzing.value = true
  errorMsg.value = null

  const img = new Image()
  img.src = previewUrl.value
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)

    const cx = img.width / 2
    const cy = img.height * 0.38
    const rx = img.width * 0.28
    const ry = img.height * 0.28
    const x = Math.max(0, Math.round(cx - rx))
    const y = Math.max(0, Math.round(cy - ry))
    const w = Math.min(img.width - x, Math.round(rx * 2))
    const h = Math.min(img.height - y, Math.round(ry * 2))

    const regionData = ctx.getImageData(x, y, w, h)
    const analysis = analyzeSkinColor(regionData)

    if (!analysis) {
      errorMsg.value = '未能提取有效肤色，建议上传光线充足的面部正面照'
      analyzing.value = false
      return
    }

    const diagnosis = classifySeason(analysis)
    store.setCapturedImage(previewUrl.value!)
    store.setResult(analysis, diagnosis)
    router.push('/analyzing')
  }
  img.onerror = () => {
    errorMsg.value = '照片读取失败，请重新选择'
    analyzing.value = false
  }
}

const tips = [
  { icon: '☀️', text: '自然光或白光环境' },
  { icon: '🙅', text: '避免强烈滤镜或美颜' },
  { icon: '🔍', text: '面部居中，五官清晰' },
  { icon: '💆', text: '素颜或淡妆为佳' },
]
</script>

<template>
  <div class="h-full w-full flex flex-col bg-ivory overflow-hidden">
    <div class="flex items-center px-4 py-3 border-b border-warm-stone/50 shrink-0">
      <button
        class="w-9 h-9 rounded-full bg-warm-stone flex items-center justify-center"
        @click="router.back()"
      >
        <span class="text-gray-600 text-sm">←</span>
      </button>
      <span class="flex-1 text-center text-sm font-semibold text-gray-800">上传照片</span>
      <div class="w-9" />
    </div>

    <div class="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
      <div
        v-if="!previewUrl"
        class="rounded-3xl border-2 border-dashed border-blush-200 bg-blush-50/50 flex flex-col items-center justify-center gap-4 py-14 cursor-pointer active:bg-blush-100/50 transition-colors"
        @click="triggerUpload"
      >
        <span class="text-6xl">🤳</span>
        <div class="text-center">
          <p class="text-base font-semibold text-gray-700">点击上传照片</p>
          <p class="text-xs text-gray-400 mt-1">支持 JPG / PNG / HEIC</p>
        </div>
        <div class="px-6 py-2.5 rounded-full bg-gradient-to-r from-blush-300 to-blush-500 text-white text-sm font-medium shadow-sm">
          从相册选择
        </div>
      </div>

      <div v-else class="relative rounded-3xl overflow-hidden shadow-md bg-black">
        <img
          :src="previewUrl"
          class="block w-full"
          style="max-height: 380px; object-fit: cover;"
          alt="preview"
        />
        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            class="border-2 border-dashed border-white/80 rounded-full"
            style="width: 52%; aspect-ratio: 3/4; box-shadow: 0 0 0 9999px rgba(0,0,0,0.35);"
          />
        </div>
        <button
          class="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white text-xs flex items-center justify-center"
          @click="resetPhoto"
        >✕</button>
      </div>

      <div class="grid grid-cols-2 gap-2.5">
        <div
          v-for="tip in tips"
          :key="tip.text"
          class="bg-white rounded-2xl px-3 py-3 flex items-center gap-2.5 shadow-sm"
        >
          <span class="text-xl shrink-0">{{ tip.icon }}</span>
          <span class="text-xs text-gray-600 leading-snug">{{ tip.text }}</span>
        </div>
      </div>

      <p v-if="errorMsg" class="text-center text-sm text-red-400 bg-red-50 rounded-2xl px-4 py-3">
        {{ errorMsg }}
      </p>
    </div>

    <div class="px-5 pb-8 pt-3 shrink-0 border-t border-warm-stone/30 bg-ivory">
      <button
        v-if="!previewUrl"
        class="w-full py-4 rounded-2xl bg-gradient-to-r from-blush-300 to-blush-500 text-white font-semibold shadow-md active:scale-95 transition-transform"
        @click="triggerUpload"
      >选择照片</button>

      <div v-else class="flex gap-3">
        <button
          class="flex-1 py-4 rounded-2xl border-2 border-blush-200 text-blush-400 font-semibold active:scale-95 transition-transform"
          @click="resetPhoto"
        >重新选择</button>
        <button
          class="flex-1 py-4 rounded-2xl font-semibold shadow-md active:scale-95 transition-transform"
          :class="analyzing ? 'bg-gray-200 text-gray-400' : 'bg-gradient-to-r from-blush-300 to-blush-500 text-white'"
          :disabled="analyzing"
          @click="analyzePhoto"
        >{{ analyzing ? '分析中…' : '开始分析' }}</button>
      </div>
    </div>

    <input
      ref="fileInputRef"
      type="file"
      accept="image/*"
      class="hidden"
      @change="onFileSelected"
    />
  </div>
</template>
