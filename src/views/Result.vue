<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { toPng } from 'html-to-image'
import { useDiagnosisStore } from '@/stores/diagnosis'
import { getSeasonResult } from '@/data/colorAnalysis'
import type { SeasonType } from '@/data/colorAnalysis'

const router = useRouter()
const store = useDiagnosisStore()
const result = computed(() => store.result)

const resultRef = ref<HTMLElement | null>(null)
const outfitImages = ref<string[]>([])
const isGeneratingOutfit = ref(false)
const outfitError = ref(false)
const isSaving = ref(false)
const showSeasonPicker = ref(false)

const SEASON_GRADIENT: Record<string, { from: string; to: string; text: string }> = {
  SPRING: { from: '#FFF4EC', to: '#FFE0D0', text: '#C45020' },
  SUMMER: { from: '#F4F0FF', to: '#DDD8F8', text: '#5040A0' },
  AUTUMN: { from: '#FFF8EC', to: '#F0DEC8', text: '#804018' },
  WINTER: { from: '#EEF4FF', to: '#D0E0F4', text: '#204080' },
}

const SEASON_EMOJI: Record<string, string> = {
  SPRING: '🌸', SUMMER: '🌿', AUTUMN: '🍂', WINTER: '❄️',
}

const ALL_SEASONS: { season: SeasonType; ko: string; desc: string }[] = [
  { season: 'SPRING', ko: '봄 웜톤', desc: '明亮暖色' },
  { season: 'SUMMER', ko: '여름 쿨톤', desc: '柔雾冷色' },
  { season: 'AUTUMN', ko: '가을 웜톤', desc: '深邃暖色' },
  { season: 'WINTER', ko: '겨울 쿨톤', desc: '高冷冷色' },
]

const heroStyle = computed(() => {
  const g = SEASON_GRADIENT[result.value?.season ?? 'SPRING']
  return `background: linear-gradient(135deg, ${g.from} 0%, ${g.to} 100%);`
})

const accentColor = computed(() => SEASON_GRADIENT[result.value?.season ?? 'SPRING'].text)

const makeupSections = [
  { key: 'lip' as const, label: '唇色', icon: '💄' },
  { key: 'blush' as const, label: '腮红', icon: '✨' },
  { key: 'eye' as const, label: '眼影', icon: '👁' },
]

onMounted(() => {
  if (!result.value) { router.replace('/'); return }
  generateOutfits()
})

function overrideSeason(season: SeasonType) {
  if (!store.result) return
  store.overrideResult(getSeasonResult(season))
  showSeasonPicker.value = false
  outfitImages.value = []
  generateOutfits()
}

async function generateOutfits() {
  isGeneratingOutfit.value = true
  outfitError.value = false
  try {
    const res = await fetch('/.netlify/functions/generate-style', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ season: result.value!.season, type: 'outfit', count: 2 }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    outfitImages.value = (data.images ?? []).slice(0, 2)
  } catch {
    outfitError.value = true
  } finally {
    isGeneratingOutfit.value = false
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
      <div ref="resultRef" class="px-4 py-4 space-y-3 pb-2">

        <!-- ① Hero -->
        <div class="rounded-3xl overflow-hidden shadow-sm" :style="heroStyle">
          <div class="flex items-center gap-4 px-5 pt-5 pb-3">
            <img
              v-if="store.capturedImage"
              :src="store.capturedImage"
              class="w-20 h-20 rounded-2xl object-cover shadow-md shrink-0 border-2 border-white/60"
            />
            <div class="min-w-0">
              <p class="text-[10px] tracking-widest opacity-50 font-medium uppercase">Personal Color</p>
              <p class="text-2xl font-bold mt-0.5" :style="{ color: accentColor }">
                {{ SEASON_EMOJI[result.season] }} {{ result.seasonKo }}
              </p>
              <p class="text-xs opacity-60 mt-1 leading-snug">{{ result.seasonDesc }}</p>
              <span class="mt-2 inline-block text-[11px] bg-white/50 rounded-full px-3 py-1 font-medium" :style="{ color: accentColor }">
                置信度 {{ result.confidence }}%
              </span>
            </div>
          </div>
          <div class="px-5 pb-4">
            <div class="flex flex-wrap gap-1.5">
              <span
                v-for="kw in result.styleKeywords"
                :key="kw"
                class="px-2.5 py-1 rounded-full text-xs font-medium bg-white/50"
                :style="{ color: accentColor }"
              >{{ kw }}</span>
            </div>
          </div>
        </div>

        <!-- ① 手动纠正 -->
        <div class="no-capture">
          <button
            class="w-full text-xs text-gray-400 flex items-center justify-center gap-1.5 py-2"
            @click="showSeasonPicker = !showSeasonPicker"
          >
            <span>{{ showSeasonPicker ? '▲' : '▼' }}</span>
            结果不准确？手动选择季型
          </button>
          <Transition name="slide-down">
            <div v-if="showSeasonPicker" class="bg-white rounded-2xl p-3 shadow-sm grid grid-cols-2 gap-2 mt-1">
              <button
                v-for="s in ALL_SEASONS"
                :key="s.season"
                class="flex items-center gap-2.5 p-3 rounded-xl text-left transition-all border-2"
                :class="result.season === s.season
                  ? 'border-blush-300 bg-blush-50'
                  : 'border-transparent bg-gray-50 active:bg-gray-100'"
                @click="overrideSeason(s.season)"
              >
                <span class="text-2xl">{{ SEASON_EMOJI[s.season] }}</span>
                <div>
                  <p class="text-xs font-semibold text-gray-700">{{ s.ko }}</p>
                  <p class="text-[10px] text-gray-400">{{ s.desc }}</p>
                </div>
              </button>
            </div>
          </Transition>
        </div>

        <!-- ② 专属色盘 -->
        <div class="bg-white rounded-3xl p-4 shadow-sm">
          <p class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>🎨</span> 专属色盘
          </p>
          <div class="grid grid-cols-4 gap-2.5">
            <div v-for="(hex, i) in result.palette" :key="hex" class="flex flex-col items-center gap-1">
              <div class="w-full aspect-square rounded-xl shadow-sm" :style="{ backgroundColor: hex }" />
              <span class="text-[10px] text-gray-400 text-center">{{ result.paletteNames[i] }}</span>
            </div>
          </div>
        </div>

        <!-- ③ 妆容用色 -->
        <div class="bg-white rounded-3xl p-4 shadow-sm">
          <p class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>💄</span> 妆容用色
          </p>
          <div class="space-y-3">
            <div v-for="sec in makeupSections" :key="sec.key" class="flex items-center gap-3">
              <span class="text-base w-5 shrink-0">{{ sec.icon }}</span>
              <span class="text-xs text-gray-400 w-8 shrink-0">{{ sec.label }}</span>
              <div class="flex gap-2">
                <div
                  v-for="hex in result.makeupColors[sec.key]"
                  :key="hex"
                  class="w-7 h-7 rounded-full shadow-sm border-2 border-white"
                  :style="{ backgroundColor: hex }"
                />
              </div>
            </div>
          </div>
          <p class="text-xs text-gray-400 mt-3 leading-relaxed">{{ result.makeupTips }}</p>
        </div>

        <!-- ④ 推荐发色 -->
        <div class="bg-white rounded-3xl p-4 shadow-sm">
          <p class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>✂️</span> 推荐发色
          </p>
          <div class="flex gap-3 items-center">
            <div
              v-for="hex in result.hairColors"
              :key="hex"
              class="w-12 h-12 rounded-2xl shadow-sm"
              :style="{ backgroundColor: hex }"
            />
          </div>
        </div>

        <!-- ⑤ AI 穿搭参考（紧凑版，2张横排） -->
        <div class="bg-white rounded-3xl p-4 shadow-sm">
          <p class="text-sm font-semibold text-gray-700 mb-1 flex items-center justify-between">
            <span class="flex items-center gap-2"><span>✨</span> 穿搭色彩参考</span>
            <span v-if="isGeneratingOutfit" class="text-[11px] text-blush-400 animate-pulse font-normal">生成中…</span>
          </p>
          <p class="text-[11px] text-gray-400 mb-3">符合你季型调色盘的穿搭方向</p>

          <div class="grid grid-cols-2 gap-2">
            <template v-if="isGeneratingOutfit">
              <div v-for="i in 2" :key="i" class="aspect-[3/4] rounded-2xl bg-gradient-to-b from-blush-50 to-warm-stone/30 animate-pulse" />
            </template>
            <template v-else-if="outfitImages.length">
              <img
                v-for="(url, i) in outfitImages"
                :key="i"
                :src="url"
                class="aspect-[3/4] rounded-2xl object-cover w-full bg-gray-100"
              />
            </template>
            <template v-else-if="outfitError">
              <div class="col-span-2 text-center py-5">
                <p class="text-sm text-gray-400 mb-2">生成失败</p>
                <button class="px-4 py-1.5 rounded-full text-xs border border-blush-200 text-blush-400" @click="generateOutfits">重试</button>
              </div>
            </template>
          </div>
        </div>

        <!-- ⑥ AI 发型 & 妆容效果（基于用户本人生成 - 开发中） -->
        <div class="bg-white rounded-3xl p-4 shadow-sm">
          <p class="text-sm font-semibold text-gray-700 mb-1 flex items-center gap-2">
            <span>🪞</span> 基于本人形象的发型 & 妆容效果
          </p>
          <div class="flex items-center gap-3 bg-blush-50/60 rounded-2xl px-4 py-3 mt-2">
            <span class="text-2xl">🚧</span>
            <div>
              <p class="text-xs font-semibold text-gray-600">功能建设中</p>
              <p class="text-[11px] text-gray-400 leading-snug mt-0.5">
                正在接入换脸 AI 模型，将支持在你本人照片上<br/>模拟不同发型、发色与妆容效果
              </p>
            </div>
          </div>
        </div>

        <!-- ⑦ 应避开 -->
        <div class="bg-white rounded-3xl p-4 shadow-sm">
          <p class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>🚫</span> 应避开的颜色
          </p>
          <div class="flex gap-3">
            <div
              v-for="hex in result.avoidColors"
              :key="hex"
              class="relative w-12 h-12 rounded-xl shadow-sm"
              :style="{ backgroundColor: hex }"
            >
              <span class="absolute inset-0 flex items-center justify-center text-white/80 text-lg font-bold drop-shadow">✕</span>
            </div>
          </div>
        </div>

        <div class="text-center py-2">
          <p class="text-[10px] text-gray-300 tracking-widest">퍼스널 컬러 · personal-color-h5.netlify.app</p>
        </div>
      </div>

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

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.25s ease;
}
.slide-down-enter-from,
.slide-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
