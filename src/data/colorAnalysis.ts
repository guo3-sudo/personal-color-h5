export interface LabColor {
  L: number
  a: number
  b: number
}

export interface RgbColor {
  r: number
  g: number
  b: number
}

export interface SkinAnalysis {
  dominantRgb: RgbColor
  lab: LabColor
  undertone: 'WARM' | 'COOL' | 'NEUTRAL'
  brightness: 'LIGHT' | 'DEEP' | 'MID'
  chroma: 'CLEAR' | 'MUTED' | 'MID'
}

export type SeasonType = 'SPRING' | 'SUMMER' | 'AUTUMN' | 'WINTER'

export interface MakeupColors {
  lip: string[]
  blush: string[]
  eye: string[]
}

export interface DiagnosisResult {
  season: SeasonType
  seasonKo: string
  seasonDesc: string
  undertone: 'WARM' | 'COOL'
  palette: string[]
  paletteNames: string[]
  avoidColors: string[]
  makeupTips: string
  styleTips: string
  confidence: number
  makeupColors: MakeupColors
  hairColors: string[]
  styleKeywords: string[]
}

function linearize(c: number): number {
  const v = c / 255
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}

function cbrt(x: number): number {
  return x > 0.008856 ? Math.pow(x, 1 / 3) : 7.787 * x + 16 / 116
}

export function rgbToLab({ r, g, b }: RgbColor): LabColor {
  const rl = linearize(r)
  const gl = linearize(g)
  const bl = linearize(b)
  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047
  const y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / 1.0
  const z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883
  const fx = cbrt(x), fy = cbrt(y), fz = cbrt(z)
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) }
}

function isSkinPixel(r: number, g: number, b: number): boolean {
  const y = 0.299 * r + 0.587 * g + 0.114 * b
  const cb = -0.1687 * r - 0.3313 * g + 0.5 * b + 128
  const cr = 0.5 * r - 0.4187 * g - 0.0813 * b + 128
  return y > 40 && cb >= 80 && cb <= 130 && cr >= 130 && cr <= 175
}

function kMeans(pixels: RgbColor[], k: number, iterations = 10): RgbColor[] {
  let centroids = pixels.slice(0, k).map((p) => ({ ...p }))
  for (let iter = 0; iter < iterations; iter++) {
    const clusters: RgbColor[][] = Array.from({ length: k }, () => [])
    for (const px of pixels) {
      let minDist = Infinity, closest = 0
      for (let i = 0; i < k; i++) {
        const dr = px.r - centroids[i].r, dg = px.g - centroids[i].g, db = px.b - centroids[i].b
        const dist = dr * dr + dg * dg + db * db
        if (dist < minDist) { minDist = dist; closest = i }
      }
      clusters[closest].push(px)
    }
    for (let i = 0; i < k; i++) {
      if (clusters[i].length === 0) continue
      centroids[i] = {
        r: clusters[i].reduce((s, p) => s + p.r, 0) / clusters[i].length,
        g: clusters[i].reduce((s, p) => s + p.g, 0) / clusters[i].length,
        b: clusters[i].reduce((s, p) => s + p.b, 0) / clusters[i].length,
      }
    }
  }
  return centroids
}

export function normalizeIllumination(data: Uint8ClampedArray): Uint8ClampedArray {
  let rSum = 0, gSum = 0, bSum = 0
  const count = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    rSum += data[i]; gSum += data[i + 1]; bSum += data[i + 2]
  }
  const gray = (rSum + gSum + bSum) / (3 * count)
  const rs = gray / (rSum / count), gs = gray / (gSum / count), bs = gray / (bSum / count)
  const out = new Uint8ClampedArray(data)
  for (let i = 0; i < out.length; i += 4) {
    out[i] = Math.min(255, out[i] * rs)
    out[i + 1] = Math.min(255, out[i + 1] * gs)
    out[i + 2] = Math.min(255, out[i + 2] * bs)
  }
  return out
}

export function analyzeSkinColor(imageData: ImageData): SkinAnalysis | null {
  const normalized = normalizeIllumination(imageData.data)
  const skinPixels: RgbColor[] = []
  for (let i = 0; i < normalized.length; i += 4) {
    const r = normalized[i], g = normalized[i + 1], b = normalized[i + 2]
    if (isSkinPixel(r, g, b)) skinPixels.push({ r, g, b })
  }
  if (skinPixels.length < 50) return null
  const sampled = skinPixels.length > 2000
    ? skinPixels.filter((_, idx) => idx % Math.floor(skinPixels.length / 2000) === 0)
    : skinPixels
  const centroids = kMeans(sampled, 3)
  const dominant = centroids.sort((a, b) => rgbToLab(b).L - rgbToLab(a).L)[0]
  const lab = rgbToLab(dominant)
  const undertone: 'WARM' | 'COOL' | 'NEUTRAL' =
    lab.b > 14 && lab.a > 4 ? 'WARM' : lab.b < 10 && lab.a < 1 ? 'COOL' : 'NEUTRAL'
  const brightness: 'LIGHT' | 'DEEP' | 'MID' =
    lab.L > 65 ? 'LIGHT' : lab.L < 48 ? 'DEEP' : 'MID'
  const pixelVariance = skinPixels.reduce((acc, p) => {
    const dr = p.r - dominant.r, dg = p.g - dominant.g, db = p.b - dominant.b
    return acc + dr * dr + dg * dg + db * db
  }, 0) / skinPixels.length
  const chroma: 'CLEAR' | 'MUTED' | 'MID' =
    pixelVariance < 800 ? 'CLEAR' : pixelVariance > 2000 ? 'MUTED' : 'MID'
  return { dominantRgb: dominant, lab, undertone, brightness, chroma }
}

export function classifySeason(analysis: SkinAnalysis): DiagnosisResult {
  const { undertone, brightness } = analysis
  const isWarm = undertone === 'WARM' || (undertone === 'NEUTRAL' && brightness === 'LIGHT')
  let season: SeasonType
  if (isWarm && brightness !== 'DEEP') season = 'SPRING'
  else if (!isWarm && brightness !== 'DEEP') season = 'SUMMER'
  else if (isWarm) season = 'AUTUMN'
  else season = 'WINTER'
  return SEASON_DATA[season]
}

const SEASON_DATA: Record<SeasonType, DiagnosisResult> = {
  SPRING: {
    season: 'SPRING',
    seasonKo: '봄 웜톤',
    seasonDesc: '明亮活泼，充满生命力的暖色系',
    undertone: 'WARM',
    palette: ['#FFDAB9', '#FFB347', '#FF7F50', '#98FF98', '#87CEEB', '#FFF0F5', '#FFD700', '#FFDEAD'],
    paletteNames: ['蜜桃', '琥珀橙', '珊瑚', '嫩草绿', '天空蓝', '樱花白', '香槟金', '杏仁'],
    avoidColors: ['#000000', '#808080', '#4B0082', '#006400'],
    makeupTips: '珊瑚橘唇色 · 桃粉腮红 · 金棕眼影',
    styleTips: '象牙白 · 米杏 · 珊瑚红 · 草绿 · 浅蓝',
    confidence: 0,
    makeupColors: {
      lip: ['#FF7F6E', '#FF9B8A', '#E8736A', '#FFADA0'],
      blush: ['#FFBDAA', '#FFB0A0', '#F5A090'],
      eye: ['#C4956A', '#D4A76A', '#F0C080', '#A0845C'],
    },
    hairColors: ['#8B6914', '#C8960C', '#C67C52', '#A0522D'],
    styleKeywords: ['清新自然', '甜美少女', '温暖活力', '度假休闲', '韩系少女'],
  },
  SUMMER: {
    season: 'SUMMER',
    seasonKo: '여름 쿨톤',
    seasonDesc: '柔雾清透，如梦似幻的冷色系',
    undertone: 'COOL',
    palette: ['#FFB6C1', '#DDA0DD', '#B0C4DE', '#E6E6FA', '#F0FFFF', '#C0C0C0', '#FAFAFA', '#D8BFD8'],
    paletteNames: ['粉玫瑰', '丁香紫', '雾蓝', '薰衣草', '冰白', '珍珠银', '云白', '梅紫'],
    avoidColors: ['#FF8C00', '#8B4513', '#FFD700', '#006400'],
    makeupTips: '玫瑰粉唇色 · 莫兰迪腮红 · 灰紫眼影',
    styleTips: '薰衣草紫 · 粉蓝 · 雾粉 · 浅灰 · 米白',
    confidence: 0,
    makeupColors: {
      lip: ['#D4688A', '#E087A0', '#C05878', '#F0A0B8'],
      blush: ['#F0C0D0', '#E8B0C8', '#D8A0B8'],
      eye: ['#9090B0', '#A8A0C0', '#C8B8D8', '#807898'],
    },
    hairColors: ['#A0A0B8', '#808098', '#B8A8C0', '#C8B8D0'],
    styleKeywords: ['柔美优雅', '莫兰迪', '复古温柔', '梦幻少女', '日系清雅'],
  },
  AUTUMN: {
    season: 'AUTUMN',
    seasonKo: '가을 웜톤',
    seasonDesc: '深邃成熟，大地质感的暖色系',
    undertone: 'WARM',
    palette: ['#D2691E', '#8B4513', '#A0522D', '#CD853F', '#DEB887', '#BC8F5F', '#F4A460', '#8B6914'],
    paletteNames: ['肉桂棕', '深栗', '赤陶', '驼色', '小麦', '焦糖', '杏棕', '深茶'],
    avoidColors: ['#000080', '#FF69B4', '#E0E0E0', '#000000'],
    makeupTips: '砖红唇色 · 焦糖腮红 · 大地眼影',
    styleTips: '芥末黄 · 驼色 · 砖红 · 橄榄绿 · 深棕',
    confidence: 0,
    makeupColors: {
      lip: ['#A0402A', '#C05038', '#B84030', '#D06048'],
      blush: ['#C08060', '#B07050', '#A86848'],
      eye: ['#805030', '#906040', '#A07848', '#704028'],
    },
    hairColors: ['#3C1A0A', '#6B3A1F', '#8B5530', '#A06840'],
    styleKeywords: ['成熟知性', '复古文艺', '大地系', '优雅干练', '森系自然'],
  },
  WINTER: {
    season: 'WINTER',
    seasonKo: '겨울 쿨톤',
    seasonDesc: '高冷锐利，对比鲜明的冷色系',
    undertone: 'COOL',
    palette: ['#000000', '#FFFFFF', '#0000CD', '#8B0000', '#228B22', '#4B0082', '#FF1493', '#C0C0C0'],
    paletteNames: ['纯黑', '纯白', '宝蓝', '酒红', '祖母绿', '深紫', '玫红', '亮银'],
    avoidColors: ['#FFD700', '#D2691E', '#F4A460', '#8FBC8F'],
    makeupTips: '正红/酒红唇色 · 冷粉腮红 · 深色眼影',
    styleTips: '纯白 · 纯黑 · 宝蓝 · 酒红 · 祖母绿',
    confidence: 0,
    makeupColors: {
      lip: ['#CC0020', '#990030', '#AA1040', '#BB0028'],
      blush: ['#D8A0B0', '#C890A0', '#E0B0C0'],
      eye: ['#303050', '#404060', '#202040', '#505070'],
    },
    hairColors: ['#101010', '#201810', '#303030', '#181820'],
    styleKeywords: ['高冷御姐', '极简主义', '都市摩登', '戏剧高级', '欧美大气'],
  },
}

export { SEASON_DATA }

export function getSeasonResult(season: SeasonType): DiagnosisResult {
  return SEASON_DATA[season]
}
