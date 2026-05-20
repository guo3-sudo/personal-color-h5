import { ref, shallowRef } from 'vue'
import { FaceLandmarker, FilesetResolver, type FaceLandmarkerResult } from '@mediapipe/tasks-vision'

const CHEEK_LEFT = [116, 117, 118, 132, 172, 173, 174, 176, 149, 150]
const CHEEK_RIGHT = [345, 346, 347, 361, 400, 401, 402, 404, 378, 379]
const FOREHEAD = [10, 151, 9, 8, 107, 336]

export function useMediaPipe() {
  const landmarker = shallowRef<FaceLandmarker | null>(null)
  const isLoading = ref(false)
  const loadError = ref<string | null>(null)

  async function init() {
    if (landmarker.value) return
    isLoading.value = true
    loadError.value = null
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20240626/wasm'
      )
      landmarker.value = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'IMAGE',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
      })
    } catch (e) {
      loadError.value = '模型加载失败，请检查网络连接'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  function detectOnImage(imageElement: HTMLImageElement | HTMLCanvasElement): FaceLandmarkerResult | null {
    if (!landmarker.value) return null
    return landmarker.value.detect(imageElement)
  }

  function extractFaceRegionCanvas(
    source: HTMLImageElement | HTMLCanvasElement,
    landmarks: Array<{ x: number; y: number; z: number }>,
    width: number,
    height: number
  ): ImageData | null {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(source, 0, 0, width, height)

    const allIndices = [...CHEEK_LEFT, ...CHEEK_RIGHT, ...FOREHEAD]
    const points = allIndices.map((i) => ({
      x: landmarks[i].x * width,
      y: landmarks[i].y * height,
    }))

    const minX = Math.max(0, Math.floor(Math.min(...points.map((p) => p.x))))
    const maxX = Math.min(width, Math.ceil(Math.max(...points.map((p) => p.x))))
    const minY = Math.max(0, Math.floor(Math.min(...points.map((p) => p.y))))
    const maxY = Math.min(height, Math.ceil(Math.max(...points.map((p) => p.y))))

    const w = maxX - minX
    const h = maxY - minY
    if (w <= 0 || h <= 0) return null

    return ctx.getImageData(minX, minY, w, h)
  }

  return { landmarker, isLoading, loadError, init, detectOnImage, extractFaceRegionCanvas }
}
