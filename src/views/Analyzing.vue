<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDiagnosisStore } from '@/stores/diagnosis'

const router = useRouter()
const store = useDiagnosisStore()

onMounted(() => {
  if (!store.result) {
    router.replace('/')
    return
  }
  setTimeout(() => router.replace('/result'), 2800)
})
</script>

<template>
  <div class="h-full w-full flex flex-col items-center justify-center bg-ivory gap-8 px-8">
    <div class="relative w-28 h-28">
      <div class="absolute inset-0 rounded-full border-4 border-blush-100 animate-ping opacity-40" />
      <div class="absolute inset-0 rounded-full border-4 border-blush-200 animate-pulse" />
      <div class="relative w-full h-full rounded-full bg-gradient-to-br from-blush-200 to-blush-400 flex items-center justify-center shadow-lg">
        <span class="text-4xl">✨</span>
      </div>
    </div>

    <div class="text-center space-y-2">
      <p class="text-lg font-semibold text-gray-800">正在分析色彩特征</p>
      <p class="text-sm text-gray-400">AI 正在解析你的专属色调…</p>
    </div>

    <div class="w-48 h-1.5 bg-blush-100 rounded-full overflow-hidden">
      <div class="h-full bg-gradient-to-r from-blush-300 to-blush-500 rounded-full animate-[loading_2.6s_ease-in-out_forwards]" />
    </div>

    <div v-if="store.capturedImage" class="w-16 h-16 rounded-2xl overflow-hidden shadow-md opacity-60">
      <img :src="store.capturedImage" class="w-full h-full object-cover" alt="captured" />
    </div>
  </div>
</template>

<style scoped>
@keyframes loading {
  from { width: 0% }
  to { width: 100% }
}
</style>
