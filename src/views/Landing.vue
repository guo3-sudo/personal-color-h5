<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const visible = ref(false)

onMounted(() => setTimeout(() => (visible.value = true), 100))

const seasons = [
  { color: '#FFB347', label: '春' },
  { color: '#DDA0DD', label: '夏' },
  { color: '#CD853F', label: '秋' },
  { color: '#4169E1', label: '冬' },
]
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center px-8 bg-ivory overflow-hidden">
    <Transition name="fade-up">
      <div v-if="visible" class="flex flex-col items-center gap-8 w-full max-w-sm">
        <div class="flex flex-col items-center gap-1">
          <span class="text-xs tracking-[0.25em] text-blush-400 font-medium uppercase">퍼스널 컬러</span>
          <h1 class="text-4xl font-bold text-gray-900 text-center leading-tight mt-2">
            发现你的<br />专属色彩
          </h1>
          <p class="text-sm text-gray-400 mt-2 tracking-wide">AI 拍照 · 30秒诊断 · 专业色盘</p>
        </div>

        <div class="flex gap-3 items-center">
          <div
            v-for="s in seasons"
            :key="s.label"
            class="w-12 h-12 rounded-full shadow-md flex items-center justify-center text-white text-xs font-semibold transition-transform hover:scale-110"
            :style="{ backgroundColor: s.color }"
          >{{ s.label }}</div>
        </div>

        <button
          class="w-full py-4 rounded-full bg-gradient-to-r from-blush-300 to-blush-500 text-white text-base font-semibold shadow-lg shadow-blush-200/50 active:scale-95 transition-transform"
          @click="router.push('/camera')"
        >开始诊断</button>

        <p class="text-xs text-gray-400 flex items-center gap-1">
          <span>🔒</span> 拍照不会上传至服务器
        </p>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.fade-up-enter-active { transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
.fade-up-enter-from { opacity: 0; transform: translateY(20px); }
</style>
