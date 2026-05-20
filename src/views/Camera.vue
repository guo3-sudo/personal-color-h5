<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Cropper, CircleStencil } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'
import { analyzeSkinColor, classifySeason } from '@/data/colorAnalysis'
import { useDiagnosisStore } from '@/stores/diagnosis'

const router = useRouter()
const store = useDiagnosisStore()

type Step = 'upload' | 'crop' | 'confirm'
const step = ref<Step>('upload')
const fileInputRef = ref<HTMLInputElement | null>(null)
const cropperRef = ref<InstanceType<typeof Cropper> | null>(null)
const rawUrl = ref<string | null>(null)
const croppedUrl = ref<string | null>(null)
const analyzing = ref(false)
const errorMsg = ref<string | null>(null)

function triggerUpload() {
  fileInputRef.value?.click()
}

function onFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  errorMsg.value = null
  if (rawUrl.value) URL.revokeObjectURL(rawUrl.value)
  rawUrl.value = URL.createObjectURL(file)
  step.value = 'crop'
}

function confirmCrop() {
  const result = cropperRef.value?.getResult()
  if (!result?.canvas) return
  croppedUrl.value = result.canvas.toDataURL('image/jpeg', 0.92)
  step.value = 'confirm'
}

function reselect() {
  step.value = 'upload'
  rawUrl.value = null
  croppedUrl.value = null
  errorMsg.value = null
  if (fileInputRef.value) fileInputRef.value.value = ''
}

function analyzePhoto() {
  if (!croppedUrl.value || analyzing.value) return
  analyzing.value = true
  errorMsg.value = null

  const img = new Image()
  img.src = croppedUrl.value
  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0)
    // After circle-crop the face is centred; sample the inner 40% to avoid
    // hair/background contamination at the crop edges
    const cx = img.width / 2
    const cy = img.height * 0.46
    const r = Math.min(img.width, img.height) * 0.38
    const sx = Math.max(0, Math.round(cx - r))
    const sy = Math.max(0, Math.round(cy - r))
    const sw = Math.min(img.width - sx, Math.round(r * 2))
    const sh = Math.min(img.height - sy, Math.round(r * 2))
    const imageData = ctx.getImageData(sx, sy, sw, sh)
    const analysis = analyzeSkinColor(imageData)
    if (!analysis) {
      errorMsg.value = '未能提取有效肤色，建议选择光线充足的正面素颜照'
      analyzing.value = false
      return
    }
    const diagnosis = classifySeason(analysis)
    store.setCapturedImage(croppedUrl.value!)
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

    <!-- ── Step: Upload ── -->
    <template v-if="step === 'upload'">
      <div class="flex items-center px-4 py-3 border-b border-warm-stone/50 shrink-0">
        <button class="w-9 h-9 rounded-full bg-warm-stone flex items-center justify-center" @click="router.back()">
          <span class="text-gray-600 text-sm">←</span>
        </button>
        <span class="flex-1 text-center text-sm font-semibold text-gray-800">上传照片</span>
        <div class="w-9" />
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        <div
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

        <div class="grid grid-cols-2 gap-2.5">
          <div v-for="tip in tips" :key="tip.text" class="bg-white rounded-2xl px-3 py-3 flex items-center gap-2.5 shadow-sm">
            <span class="text-xl shrink-0">{{ tip.icon }}</span>
            <span class="text-xs text-gray-600 leading-snug">{{ tip.text }}</span>
          </div>
        </div>
      </div>

      <div class="px-5 pb-8 pt-3 shrink-0 border-t border-warm-stone/30 bg-ivory">
        <button
          class="w-full py-4 rounded-2xl bg-gradient-to-r from-blush-300 to-blush-500 text-white font-semibold shadow-md active:scale-95 transition-transform"
          @click="triggerUpload"
        >选择照片</button>
      </div>
    </template>

    <!-- ── Step: Crop ── -->
    <template v-else-if="step === 'crop'">
      <div class="flex items-center px-4 py-3 bg-black/90 shrink-0">
        <button class="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center" @click="reselect">
          <span class="text-white text-sm">←</span>
        </button>
        <span class="flex-1 text-center text-sm font-semibold text-white">调整面部位置</span>
        <div class="w-9" />
      </div>

      <p class="text-center text-xs text-white/70 py-2 bg-black/80 shrink-0">
        捏合缩放 · 拖动移动 · 将面部对准圆框中心
      </p>

      <Cropper
        ref="cropperRef"
        :src="rawUrl!"
        :stencil-component="CircleStencil"
        :stencil-props="{ aspectRatio: 1, movable: true, scalable: true }"
        :resize-image="{ touch: true }"
        :move-image="true"
        background-class="bg-black"
        class="flex-1 min-h-0"
        image-restriction="stencil"
      />

      <div class="flex gap-3 px-5 py-4 bg-black/90 shrink-0">
        <button
          class="flex-1 py-3.5 rounded-2xl bg-white/15 text-white text-sm font-medium"
          @click="reselect"
        >重新选择</button>
        <button
          class="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blush-300 to-blush-500 text-white text-sm font-semibold shadow-md"
          @click="confirmCrop"
        >确认裁切</button>
      </div>
    </template>

    <!-- ── Step: Confirm & Analyze ── -->
    <template v-else>
      <div class="flex items-center px-4 py-3 border-b border-warm-stone/50 shrink-0">
        <button class="w-9 h-9 rounded-full bg-warm-stone flex items-center justify-center" @click="step = 'crop'">
          <span class="text-gray-600 text-sm">←</span>
        </button>
        <span class="flex-1 text-center text-sm font-semibold text-gray-800">确认照片</span>
        <div class="w-9" />
      </div>

      <div class="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-5">
        <div class="relative rounded-3xl overflow-hidden shadow-md bg-black">
          <img
            :src="croppedUrl!"
            class="block w-full"
            style="max-height: 360px; object-fit: cover;"
            alt="preview"
          />
          <button
            class="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white text-xs flex items-center justify-center"
            @click="step = 'crop'"
          >✎</button>
        </div>

        <div class="bg-white rounded-2xl px-4 py-3 shadow-sm flex items-start gap-3">
          <span class="text-lg mt-0.5">💡</span>
          <p class="text-xs text-gray-500 leading-relaxed">
            分析将取图中皮肤区域的色彩信息。建议在自然光下、无强滤镜的照片中获得最准确结果。
          </p>
        </div>

        <p v-if="errorMsg" class="text-center text-sm text-red-400 bg-red-50 rounded-2xl px-4 py-3">
          {{ errorMsg }}
        </p>
      </div>

      <div class="px-5 pb-8 pt-3 shrink-0 border-t border-warm-stone/30 bg-ivory">
        <div class="flex gap-3">
          <button
            class="flex-1 py-4 rounded-2xl border-2 border-blush-200 text-blush-400 font-semibold active:scale-95 transition-transform"
            @click="reselect"
          >重新选择</button>
          <button
            class="flex-1 py-4 rounded-2xl font-semibold shadow-md active:scale-95 transition-transform"
            :class="analyzing ? 'bg-gray-200 text-gray-400' : 'bg-gradient-to-r from-blush-300 to-blush-500 text-white'"
            :disabled="analyzing"
            @click="analyzePhoto"
          >{{ analyzing ? '分析中…' : '开始分析' }}</button>
        </div>
      </div>
    </template>

    <input ref="fileInputRef" type="file" accept="image/*" class="hidden" @change="onFileSelected" />
  </div>
</template>
