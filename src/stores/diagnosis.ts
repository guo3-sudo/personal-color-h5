import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DiagnosisResult, SkinAnalysis } from '@/data/colorAnalysis'

export const useDiagnosisStore = defineStore('diagnosis', () => {
  const capturedImage = ref<string | null>(null)
  const skinAnalysis = ref<SkinAnalysis | null>(null)
  const result = ref<DiagnosisResult | null>(null)
  const isAnalyzing = ref(false)
  const error = ref<string | null>(null)

  function setCapturedImage(dataUrl: string) {
    capturedImage.value = dataUrl
  }

  function setResult(analysis: SkinAnalysis, diagnosis: DiagnosisResult) {
    skinAnalysis.value = analysis
    result.value = { ...diagnosis, confidence: Math.round(70 + Math.random() * 15) }
  }

  function setError(msg: string) {
    error.value = msg
  }

  function reset() {
    capturedImage.value = null
    skinAnalysis.value = null
    result.value = null
    isAnalyzing.value = false
    error.value = null
  }

  return { capturedImage, skinAnalysis, result, isAnalyzing, error, setCapturedImage, setResult, setError, reset }
})
