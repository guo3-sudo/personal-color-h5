<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { toPng } from 'html-to-image'
import { useDiagnosisStore } from '@/stores/diagnosis'

const router = useRouter()
const store = useDiagnosisStore()
const result = computed(() => store.result)

const resultRef = ref<HTMLElement | null>(null)
const aiImages = ref<string[]>([])
const isGenerating = ref(false)
const aiError = ref(false)
const isSaving = ref(false)

const SEASON_GRADIENT: Record<string, { from: string; to: string; text: string }> = {
  SPRING: { from: '#FFF4EC', to: '#FFE0D0', text: '#C45020' },
  SUMMER: { from: '#F4F0FF', to: '#DDD8F8', text: '#5040A0' },
  AUTUMN: { from: '#FFF8EC', to: '#F0DEC8', text: '#804018' },
  WINTER: { from: '#EEF4FF', to: '#D0E0F4', text: '#204080' },
}

const SEASON_EMOJI: Record<string, string> = {
  SPRING: '🌸', SUMMER: '🌿', AUTUMN: '🍂', WINTER: '❄️',
}

const heroStyle = computed(() => {
  const g = SEASON_GRADIENT[result.value?.season ?? 'SPRING']
  return `background: linear-gradient(135deg, ${g.from} 0%, ${g.to} 100%);`
})

const accentColor = computed(() =>
  SEASON_GRADIENT[result.value?.season ?? 'SPRING'].text
)

const makeupSections = [
  { key: 'lip' as const, label: '唇色', icon: '💄' },
  { key: 'blush' as const, label: '腮红', icon: '✨' },
  { key: 'eye' as const, label: '眼影', icon: '👁' },
]

onMounted(() => {
  if (!result.value) { router.replace('/'); return }
  generateAiImages()
})

async function generateAiImages() {
  isGenerating.value = true
  aiError.value = false
  try {
    const res = await fetch('/.netlify/functions/generate-style', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ season: result.value!.season }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    aiImages.value = data.images ?? []
  } catch {
    aiError.value = true
  } finally {
    isGenerating.value = false
  }
}

async function saveImage() {
  if (!resultRef.value || isSaving.value) return
  isSaving.value = true
  try {
    const dataUrl = await toPng(resultRef.value, {
      backgroundColor: '#faf7f2',
      pixelRatio: 2,
      filter: (node) => !node.classList?.contains('no-capture'),
    })
    const link = document.createElement('a')
    link.download = `个人色彩-${result.value?.seasonKo ?? '结果'}.png`
    link.href = dataUrl
    link.click()
  } catch {
    alert('保存失败，请截图保存 📸')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div v-if="result" class="h-full w-full flex flex-col bg-ivory overflow-hidden">

    <div class="no-capture flex items-center px-4 py-3 border-b border-warm-stone/50 shrink-0 bg-ivory/95 backdrop-blur-sm z-10">
      <button class="w-9 h-9 rounded-full bg-warm-stone flex items-center justify-center" @click="router.push('/camera')">
        <span class="text-gray-600 text-sm">←</span>
      </button>
      <span class="flex-1 text-center text-sm font-semibold text-gray-800">诊断结果</span>
      <div class="w-9" />
    </div>

    <div class="flex-1 overflow-y-auto">
      <div ref="resultRef" class="px-4 py-4 space-y-4 pb-2">

        <!-- ① Hero: 用户照片 + 季型 -->
        <div class="rounded-3xl overflow-hidden shadow-sm" :style="heroStyle">
          <div class="flex items-center gap-4 px-5 pt-5 pb-4">
            <img
              v-if="store.capturedImage"
              :src="store.capturedImage"
              class="w-20 h-20 rounded-2xl object-cover shadow-md shrink-0 border-2 border-white/60"
            />
            <div class="min-w-0">
              <p class="text-[10px] tracking-widest opacity-60 font-medium uppercase">Personal Color</p>
              <p class="text-2xl font-bold mt-0.5" :style="{ color: accentColor }">
                {{ SEASON_EMOJI[result.season] }} {{ result.seasonKo }}
              </p>
              <p class="text-xs opacity-70 mt-1 leading-snug">{{ result.seasonDesc }}</p>
              <span class="mt-2 inline-block text-[11px] bg-white/50 rounded-full px-3 py-1 font-medium" :style="{ color: accentColor }">
                置信度 {{ result.confidence }}%
              </span>
            </div>
          </div>
          <div class="px-5 pb-5">
            <p class="text-[11px] opacity-50 mb-2 font-medium">专属关键词</p>
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="kw in result.styleKeywords"
                :key="kw"
                class="px-3 py-1 rounded-full text-xs font-medium bg-white/50"
                :style="{ color: accentColor }"
              >{{ kw }}</span>
            </div>
          </div>
        </div>

        <!-- ② 专属色盘 -->
        <div class="bg-white rounded-3xl p-5 shadow-sm">
          <p class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🎨</span> 专属色盘
          </p>
          <div class="grid grid-cols-4 gap-3">
            <div v-for="(hex, i) in result.palette" :key="hex" class="flex flex-col items-center gap-1.5">
              <div
                class="w-full aspect-square rounded-2xl shadow-sm"
                :style="{ backgroundColor: hex }"
              />
              <span class="text-[10px] text-gray-400 text-center leading-tight">{{ result.paletteNames[i] }}</span>
            </div>
          </div>
        </div>

        <!-- ③ AI 穿搭方案 -->
        <div class="bg-white rounded-3xl p-5 shadow-sm">
          <p class="text-sm font-semibold text-gray-700 mb-1 flex items-center justify-between">
            <span class="flex items-center gap-2"><span>✨</span> AI 穿搭方案</span>
            <span v-if="isGenerating" class="text-[11px] text-blush-400 animate-pulse font-normal">AI 生成中…</span>
          </p>
          <p class="text-[11px] text-gray-400 mb-3">根据你的季型色彩定制的穿搭参考</p>

          <div v-if="isGenerating" class="grid grid-cols-2 gap-2">
            <div v-for="i in 4" :key="i" class="aspect-[9/16] rounded-2xl bg-gradient-to-b from-blush-50 to-warm-stone/30 animate-pulse" />
          </div>

          <div v-else-if="aiImages.length" class="grid grid-cols-2 gap-2">
            <img
              v-for="(url, i) in aiImages"
              :key="i"
              :src="url"
              class="aspect-[9/16] rounded-2xl object-cover w-full bg-gray-100"
              loading="lazy"
            />
          </div>

          <div v-else-if="aiError" class="text-center py-8">
            <p class="text-sm text-gray-400 mb-3">图片生成失败</p>
            <button
              class="px-4 py-2 rounded-full text-sm border border-blush-200 text-blush-400"
              @click="generateAiImages"
            >重新生成</button>
          </div>
        </div>

        <!-- ④ 妆容用色 -->
        <div class="bg-white rounded-3xl p-5 shadow-sm">
          <p class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>💄</span> 妆容用色
          </p>
          <div class="space-y-3.5">
            <div v-for="sec in makeupSections" :key="sec.key" class="flex items-center gap-3">
              <span class="text-base w-5 shrink-0">{{ sec.icon }}</span>
              <span class="text-xs text-gray-500 w-8 shrink-0">{{ sec.label }}</span>
              <div class="flex gap-2">
                <div
                  v-for="hex in result.makeupColors[sec.key]"
                  :key="hex"
                  class="w-8 h-8 rounded-full shadow-sm border-2 border-white"
                  :style="{ backgroundColor: hex }"
                />
              </div>
            </div>
          </div>
          <p class="text-xs text-gray-400 mt-4 leading-relaxed">{{ result.makeupTips }}</p>
        </div>

        <!-- ⑤ 推荐发色 -->
        <div class="bg-white rounded-3xl p-5 shadow-sm">
          <p class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>✂️</span> 推荐发色
          </p>
          <div class="flex gap-3">
            <div
              v-for="hex in result.hairColors"
              :key="hex"
              class="flex-1 aspect-square rounded-2xl shadow-sm max-w-[60px]"
              :style="{ backgroundColor: hex }"
            />
          </div>
        </div>

        <!-- ⑥ 应避开 -->
        <div class="bg-white rounded-3xl p-5 shadow-sm">
          <p class="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <span>🚫</span> 应避开的颜色
          </p>
          <div class="flex gap-3">
            <div
              v-for="hex in result.avoidColors"
              :key="hex"
              class="relative w-14 h-14 rounded-2xl shadow-sm"
              :style="{ backgroundColor: hex }"
            >
              <span class="absolute inset-0 flex items-center justify-center text-white/80 text-xl font-bold drop-shadow">✕</span>
            </div>
          </div>
        </div>

        <!-- 底部署名 -->
        <div class="text-center py-3">
          <p class="text-[10px] text-gray-300 tracking-widest">퍼스널 컬러 · personal-color-h5.netlify.app</p>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="no-capture px-4 pb-8 pt-3 border-t border-warm-stone/30 bg-ivory">
        <div class="flex gap-3">
          <button
            class="flex-1 py-4 rounded-2xl border-2 border-blush-200 text-blush-400 text-sm font-semibold active:scale-95 transition-transform"
            @click="() => { store.reset(); router.push('/camera') }"
          >重新诊断</button>
          <button
            class="flex-1 py-4 rounded-2xl text-sm font-semibold shadow-md active:scale-95 transition-transform"
            :class="isSaving ? 'bg-gray-200 text-gray-400' : 'bg-gradient-to-r from-blush-300 to-blush-500 text-white'"
            :disabled="isSaving"
            @click="saveImage"
          >{{ isSaving ? '生成中…' : '💾 保存长图' }}</button>
        </div>
      </div>
    </div>

  </div>
</template>
