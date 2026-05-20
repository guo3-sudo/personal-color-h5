<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDiagnosisStore } from '@/stores/diagnosis'

const router = useRouter()
const store = useDiagnosisStore()

onMounted(() => {
  if (!store.result) router.replace('/')
})

const seasonConfig: Record<string, { emoji: string; from: string; to: string }> = {
  SPRING: { emoji: '🌸', from: '#fff7ed', to: '#ffe4e6' },
  SUMMER: { emoji: '☁️', from: '#f5f3ff', to: '#dbeafe' },
  AUTUMN: { emoji: '🍂', from: '#fffbeb', to: '#fed7aa' },
  WINTER: { emoji: '❄️', from: '#f0f9ff', to: '#e0e7ff' },
}

function copyHex(hex: string) {
  navigator.clipboard.writeText(hex).then(() => alert(`已复制 ${hex}`))
}

function saveResult() {
  alert('请截图保存结果 📸')
}
</script>

<template>
  <div v-if="store.result" class="h-full w-full overflow-y-auto bg-ivory">
    <div class="sticky top-0 z-10 bg-ivory/90 backdrop-blur-sm px-4 py-3 flex items-center border-b border-warm-stone/50">
      <button class="w-9 h-9 rounded-full bg-warm-stone flex items-center justify-center" @click="router.push('/camera')">
        <span class="text-gray-600">←</span>
      </button>
      <span class="flex-1 text-center text-sm font-semibold text-gray-800">诊断结果</span>
      <div class="w-9" />
    </div>

    <div class="px-4 py-5 space-y-5 pb-8">
      <div
        class="rounded-3xl p-6 flex flex-col items-center gap-3 shadow-sm"
        :style="{ background: `linear-gradient(135deg, ${seasonConfig[store.result.season].from}, ${seasonConfig[store.result.season].to})` }"
      >
        <span class="text-5xl">{{ seasonConfig[store.result.season].emoji }}</span>
        <div class="text-center">
          <p class="text-2xl font-bold text-gray-900">{{ store.result.seasonKo }}</p>
          <p class="text-sm text-gray-500 mt-1">{{ store.result.seasonDesc }}</p>
        </div>
        <div class="bg-white/60 rounded-full px-4 py-1.5 text-xs text-gray-600 font-medium">
          置信度 {{ store.result.confidence }}%
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-700 mb-3">推荐色盘</h3>
        <div class="grid grid-cols-4 gap-3">
          <button
            v-for="hex in store.result.palette"
            :key="hex"
            class="aspect-square rounded-2xl shadow-sm active:scale-95 transition-transform"
            :style="{ backgroundColor: hex }"
            @click="copyHex(hex)"
          />
        </div>
      </div>

      <div class="bg-white rounded-2xl p-4 shadow-sm">
        <div class="flex items-center gap-2 mb-2">
          <span>💄</span>
          <span class="text-sm font-semibold text-gray-700">妆容建议</span>
        </div>
        <p class="text-sm text-gray-500 leading-relaxed">{{ store.result.makeupTips }}</p>
      </div>

      <div class="bg-white rounded-2xl p-4 shadow-sm">
        <div class="flex items-center gap-2 mb-2">
          <span>👗</span>
          <span class="text-sm font-semibold text-gray-700">穿搭建议</span>
        </div>
        <p class="text-sm text-gray-500 leading-relaxed">{{ store.result.styleTips }}</p>
      </div>

      <div>
        <h3 class="text-sm font-semibold text-gray-700 mb-3">避开色系</h3>
        <div class="flex gap-3">
          <div
            v-for="hex in store.result.avoidColors"
            :key="hex"
            class="w-10 h-10 rounded-full shadow-sm opacity-60"
            :style="{ backgroundColor: hex }"
          />
        </div>
      </div>

      <div class="flex gap-3 pt-2">
        <button
          class="flex-1 py-3.5 rounded-2xl border-2 border-blush-300 text-blush-400 text-sm font-semibold active:scale-95 transition-transform"
          @click="() => { store.reset(); router.push('/camera') }"
        >重新诊断</button>
        <button
          class="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-blush-300 to-blush-500 text-white text-sm font-semibold shadow-md active:scale-95 transition-transform"
          @click="saveResult"
        >保存结果</button>
      </div>
    </div>
  </div>
</template>
