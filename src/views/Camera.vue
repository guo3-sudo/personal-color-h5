<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMediaPipe } from '@/composables/useMediaPipe'
import { analyzeSkinColor, classifySeason } from '@/data/colorAnalysis'
import { useDiagnosisStore } from '@/stores/diagnosis'

const router = useRouter()
const store = useDiagnosisStore()
const { init, isLoading, loadError, detectOnImage, extractFaceRegionCanvas } = useMediaPipe()

const videoRef = ref<HTMLVideoElement | null>(null)
const stream = ref<MediaStream | null>(null)
const faceDetected = ref(false)
const capturing = ref(false)
const initError = ref<string | null>(null)
const modelReady = ref(false)
const faceCheckInterval = ref<ReturnType<typeof setInterval> | null>(null)

onMounted(async () => {
  try {
    stream.value = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 960 } },
      audio: false,
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream.value
      await videoRef.value.play()
    }
  } catch {
    initError.value = '无法访问摄像头，请检查权限设置'
    return
  }

  try {
    await init()
    modelReady.value = true
    startFaceDetection()
  } catch {
    initError.value = loadError.value ?? '模型初始化失败'
  }
})

onUnmounted(() => {
  stopCamera()
  if (faceCheckInterval.value) clearInterval(faceCheckInterval.value)
})

function stopCamera() {
  stream.value?.getTracks().forEach((t) => t.stop())
  stream.value = null
}

function startFaceDetection() {
  faceCheckInterval.value = setInterval(() => {
    if (!videoRef.value || !modelReady.value || capturing.value) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.value.videoWidth
    canvas.height = videoRef.value.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(videoRef.value, 0, 0)
    const img = new Image()
    img.src = canvas.toDataURL('image/jpeg', 0.8)
    img.onload = () => {
      const result = detectOnImage(img)
      faceDetected.value = (result?.faceLandmarks?.length ?? 0) > 0
    }
  }, 800)
}

async function capture() {
  if (!videoRef.value || !modelReady.value || capturing.value) return
  capturing.value = true

  const video = videoRef.value
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video, 0, 0)

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9)
  store.setCapturedImage(dataUrl)

  const img = new Image()
  img.src = dataUrl
  img.onload = () => {
    const detection = detectOnImage(img)
    if (!detection || detection.faceLandmarks.length === 0) {
      store.setError('未检测到人脸，请正对摄像头')
      capturing.value = false
      return
    }

    const regionData = extractFaceRegionCanvas(img, detection.faceLandmarks[0], canvas.width, canvas.height)
    if (!regionData) {
      store.setError('面部区域提取失败，请重试')
      capturing.value = false
      return
    }

    const analysis = analyzeSkinColor(regionData)
    if (!analysis) {
      store.setError('肤色分析失败，请确保光线充足')
      capturing.value = false
      return
    }

    const diagnosis = classifySeason(analysis)
    store.setResult(analysis, diagnosis)
    stopCamera()
    if (faceCheckInterval.value) clearInterval(faceCheckInterval.value)
    router.push('/analyzing')
  }
}
</script>

<template>
  <div class="relative h-full w-full bg-black overflow-hidden">
    <video
      ref="videoRef"
      class="absolute inset-0 h-full w-full object-cover"
      playsinline
      muted
    />

    <div v-if="initError" class="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-8 text-center">
      <span class="text-4xl mb-4">📷</span>
      <p class="text-white text-sm leading-relaxed">{{ initError }}</p>
      <button
        class="mt-6 px-6 py-3 rounded-full bg-white/20 text-white text-sm"
        @click="router.back()"
      >返回</button>
    </div>

    <template v-else>
      <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <svg class="w-64 h-72" viewBox="0 0 256 288" fill="none">
          <defs>
            <mask id="oval-mask">
              <rect width="256" height="288" fill="white" />
              <ellipse cx="128" cy="140" rx="90" ry="118" fill="black" />
            </mask>
          </defs>
          <rect width="256" height="288" fill="black" opacity="0.45" mask="url(#oval-mask)" />
          <ellipse
            cx="128" cy="140" rx="90" ry="118"
            :stroke="faceDetected ? '#86efac' : 'white'"
            stroke-width="2.5"
            stroke-dasharray="8 5"
            fill="none"
          />
        </svg>
      </div>

      <div class="absolute top-safe-top top-8 left-0 right-0 flex flex-col items-center gap-2 pointer-events-none">
        <div class="bg-black/40 backdrop-blur-sm rounded-full px-4 py-1.5">
          <p class="text-white text-xs text-center">
            {{ isLoading ? '模型加载中…' : faceDetected ? '✓ 已识别人脸，点击拍照' : '请将面部置于框内' }}
          </p>
        </div>
        <div v-if="isLoading" class="w-32 h-1 bg-white/20 rounded-full overflow-hidden">
          <div class="h-full bg-white/60 rounded-full animate-pulse w-2/3" />
        </div>
      </div>

      <div class="absolute bottom-safe-bottom bottom-12 left-0 right-0 flex items-center justify-center gap-8">
        <button
          class="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
          @click="router.back()"
        >
          <span class="text-white text-lg">←</span>
        </button>

        <button
          class="w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95"
          :class="[
            faceDetected && modelReady && !capturing
              ? 'bg-white shadow-lg shadow-white/30'
              : 'bg-white/40',
          ]"
          :disabled="!faceDetected || !modelReady || capturing"
          @click="capture"
        >
          <div class="w-16 h-16 rounded-full border-2 border-gray-200 bg-white" />
        </button>

        <div class="w-12 h-12" />
      </div>
    </template>
  </div>
</template>
