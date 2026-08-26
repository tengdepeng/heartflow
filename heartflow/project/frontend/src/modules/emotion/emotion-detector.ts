// ============================================================
// 情绪花房 · 实时情绪检测引擎（P16-14）
// 文本情绪分析、周期性环境检测、语音情绪分析、日记情绪扫描
// ============================================================

import { ref, computed } from 'vue'

// ============================================================
// 类型定义
// ============================================================

/** 情绪检测来源 */
export type DetectionSource = 'text' | 'voice' | 'diary' | 'periodic' | 'manual'

/** 检测到的情绪片段 */
export interface DetectedEmotion {
  /** 片段 ID */
  id: string
  /** 情绪类型 */
  type: string
  /** 置信度 (0-1) */
  confidence: number
  /** 检测来源 */
  source: DetectionSource
  /** 原始文本（如有） */
  rawText?: string
  /** 检测时间 */
  timestamp: number
  /** 情绪强度 (0-1) */
  intensity: number
  /** 关联关键词 */
  keywords: string[]
  /** 触发词 */
  triggerWords: string[]
  /** 是否需要用户确认 */
  needsConfirmation: boolean
}

/** 实时检测配置 */
export interface EmotionDetectorConfig {
  /** 是否启用文本分析 */
  enableTextAnalysis: boolean
  /** 是否启用周期性检测 */
  enablePeriodicDetection: boolean
  /** 周期性检测间隔（分钟） */
  periodicInterval: number
  /** 最小置信度阈值 */
  minConfidence: number
  /** 是否自动确认高置信度结果 */
  autoConfirmHighConfidence: boolean
  /** 自动确认阈值 */
  autoConfirmThreshold: number
  /** 最大缓存检测片段数 */
  maxDetections: number
  /** 情绪类型权重 */
  typeWeights: Record<string, number>
  /** 情绪关键词词典 */
  keywordDictionary: Record<string, string[]>
  /** 情绪强度修饰词 */
  intensityModifiers: Record<string, number>
}

/** 情绪检测统计 */
export interface DetectionStats {
  /** 总检测次数 */
  totalDetections: number
  /** 各情绪类型计数 */
  typeCounts: Record<string, number>
  /** 平均置信度 */
  averageConfidence: number
  /** 各来源计数 */
  sourceCounts: Record<string, number>
  /** 最近检测时间 */
  lastDetectionTime: number | null
  /** 用户确认率 */
  confirmationRate: number
}

/** 周期性检测结果 */
export interface PeriodicCheckResult {
  /** 是否触发检测 */
  triggered: boolean
  /** 检测到的情绪 */
  emotions: DetectedEmotion[]
  /** 环境上下文 */
  context: {
    timeOfDay: string
    dayOfWeek: string
    recentActivity: string
    ambientMood: string
  }
}

// ============================================================
// 情绪关键词词典
// ============================================================

export const DEFAULT_EMOTION_KEYWORDS: Record<string, string[]> = {
  happy: [
    '开心', '快乐', '高兴', '喜悦', '兴奋', '满足', '幸福', '愉快',
    '太好了', '真棒', '哈哈', 'nice', '太开心了', '好开心', '乐',
    '欣慰', '舒畅', '爽', '美滋滋', '心情好', '感动', '温暖',
  ],
  sad: [
    '难过', '伤心', '悲伤', '哭', '泪', '失落', '沮丧', '失望',
    '不开心', '心碎', '痛苦', '难受', '低落', '消沉', '悲哀',
    '郁闷', '心情不好', '不开心', '想哭', '无奈', '无助',
  ],
  anxious: [
    '焦虑', '紧张', '担心', '不安', '害怕', '恐惧', '慌', '压力',
    '烦躁', '心神不宁', '忐忑', '坐立不安', '心慌', '忧虑',
    '不知所措', '担心', '不安心', '着急', '揪心', '提心吊胆',
  ],
  angry: [
    '生气', '愤怒', '恼火', '不爽', '烦', '怒', '火大', '暴躁',
    '气死', '受不了', '可恶', '讨厌', '可恨', '无语', '真烦',
    '恼', '暴躁', '发脾气', '火冒三丈', '气炸了',
  ],
  calm: [
    '平静', '安静', '宁静', '淡定', '安详', '放松', '悠闲', '平和',
    '舒适', '轻松', '自在', '从容', '坦然', '安心', '稳',
    '心平气和', '淡定', '不慌', '冷静', '休闲',
  ],
  excited: [
    '激动', '期待', '盼望', '迫不及待', '热血', '澎湃', '燃',
    '兴奋不已', '充满期待', '等不及', '向往', '雀跃', '跃跃欲试',
    '来劲', '精神', '振奋', '鼓舞', '激情', '热血沸腾',
  ],
  grateful: [
    '感谢', '感恩', '感激', '谢谢', '多谢', '幸运', '珍惜',
    '知足', '庆幸', '亏欠', '值得', '感动', '温暖', '美好',
    '美好', '幸福', '有福气', '上天眷顾', '恩惠',
  ],
  tired: [
    '累', '疲惫', '没精神', '困', '疲劳', '乏力', '筋疲力尽',
    '不想动', '倦', '昏昏欲睡', '身心俱疲', '累死', '乏',
    '没力气', '想休息', '睡不醒', '打不起精神', '萎靡',
  ],
  inspired: [
    '灵感', '创意', '启发', '触动', '感悟', '豁然开朗', '顿悟',
    '有想法', '新思路', '开窍', '领悟', '意会', '醍醐灌顶',
    '受启发', '有感触', '眼前一亮', '思想火花', '灵光一闪',
  ],
  neutral: [
    '还好', '一般', '还行', '就那样', '没什么', '平常', '普通',
    '无所谓', '都可以', '随便', '正常', '日常', '平淡',
  ],
}

/** 情绪强度修饰词 */
export const DEFAULT_INTENSITY_MODIFIERS: Record<string, number> = {
  '非常': 1.5, '特别': 1.4, '极其': 1.6, '超级': 1.5, '太': 1.3,
  '好': 1.2, '真': 1.2, '十分': 1.4, '格外': 1.3, '异常': 1.4,
  '有点': 0.8, '稍微': 0.7, '略微': 0.6, '一点点': 0.5, '不太': 0.6,
  '无比': 1.6, '极度': 1.7, '万分': 1.5, '相当': 1.2,
  '很': 1.3, '挺': 1.1, '蛮': 1.0, '还': 0.9, '算': 0.8,
}

// ============================================================
// 默认配置
// ============================================================

export const DEFAULT_DETECTOR_CONFIG: EmotionDetectorConfig = {
  enableTextAnalysis: true,
  enablePeriodicDetection: true,
  periodicInterval: 60,
  minConfidence: 0.3,
  autoConfirmHighConfidence: true,
  autoConfirmThreshold: 0.8,
  maxDetections: 200,
  typeWeights: {
    happy: 1.0, sad: 1.0, anxious: 1.0, angry: 1.0, calm: 1.0,
    excited: 1.0, grateful: 1.0, tired: 1.0, inspired: 1.0, neutral: 0.5,
  },
  keywordDictionary: { ...DEFAULT_EMOTION_KEYWORDS },
  intensityModifiers: { ...DEFAULT_INTENSITY_MODIFIERS },
}

// ============================================================
// 实时情绪检测 Composable
// ============================================================

export function useEmotionDetector(config?: Partial<EmotionDetectorConfig>) {
  // ---- 配置 ----
  const detectorConfig = ref<EmotionDetectorConfig>({
    ...DEFAULT_DETECTOR_CONFIG,
    ...config,
    keywordDictionary: {
      ...DEFAULT_EMOTION_KEYWORDS,
      ...config?.keywordDictionary,
    },
    intensityModifiers: {
      ...DEFAULT_INTENSITY_MODIFIERS,
      ...config?.intensityModifiers,
    },
  })

  // ---- 状态 ----
  const detections = ref<DetectedEmotion[]>([])
  const isAnalyzing = ref(false)
  const lastAnalysisTime = ref<number | null>(null)
  const confirmedDetections = ref<DetectedEmotion[]>([])
  const pendingDetections = ref<DetectedEmotion[]>([])

  // ---- 内部状态 ----
  let detectionIdCounter = 0
  let periodicTimer: ReturnType<typeof setInterval> | null = null

  // ---- 派生状态 ----
  const detectionCount = computed(() => detections.value.length)

  const pendingCount = computed(() => pendingDetections.value.length)

  const confirmedCount = computed(() => confirmedDetections.value.length)

  const stats = computed<DetectionStats>(() => {
    const all = detections.value
    const typeCounts: Record<string, number> = {}
    const sourceCounts: Record<string, number> = {}
    let totalConfidence = 0
    let confirmedTotal = 0

    for (const d of all) {
      typeCounts[d.type] = (typeCounts[d.type] ?? 0) + 1
      sourceCounts[d.source] = (sourceCounts[d.source] ?? 0) + 1
      totalConfidence += d.confidence
      if (!d.needsConfirmation) confirmedTotal++
    }

    return {
      totalDetections: all.length,
      typeCounts,
      averageConfidence: all.length > 0 ? Math.round(totalConfidence / all.length * 100) / 100 : 0,
      sourceCounts,
      lastDetectionTime: lastAnalysisTime.value,
      confirmationRate: all.length > 0 ? Math.round(confirmedTotal / all.length * 100) / 100 : 0,
    }
  })

  const dominantEmotion = computed(() => {
    const s = stats.value
    if (s.totalDetections === 0) return null
    let maxType = ''
    let maxCount = 0
    for (const [type, count] of Object.entries(s.typeCounts)) {
      if (count > maxCount) {
        maxCount = count
        maxType = type
      }
    }
    return { type: maxType, count: maxCount, ratio: Math.round(maxCount / s.totalDetections * 100) / 100 }
  })

  // ============================================================
  // 文本情绪分析
  // ============================================================

  /** 分析文本中的情绪 */
  function analyzeText(text: string): DetectedEmotion[] {
    if (!detectorConfig.value.enableTextAnalysis || !text.trim()) return []

    const results: DetectedEmotion[] = []
    const cfg = detectorConfig.value
    const dict = cfg.keywordDictionary
    const modifiers = cfg.intensityModifiers

    // 对每种情绪类型进行关键词匹配
    for (const [emotionType, keywords] of Object.entries(dict)) {
      let maxConfidence = 0
      let matchedKeywords: string[] = []
      let triggerWords: string[] = []

      for (const keyword of keywords) {
        if (text.includes(keyword)) {
          triggerWords.push(keyword)
          // 计算关键词密度
          const count = (text.match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length
          const density = count / Math.max(1, text.length)
          const confidence = Math.min(1, density * 20 + 0.3)

          if (confidence > maxConfidence) {
            maxConfidence = confidence
          }
          if (!matchedKeywords.includes(keyword)) {
            matchedKeywords.push(keyword)
          }
        }
      }

      if (maxConfidence > 0 && maxConfidence >= cfg.minConfidence) {
        // 计算情绪强度
        let intensity = 0.5
        for (const [modifier, factor] of Object.entries(modifiers)) {
          if (text.includes(modifier)) {
            intensity *= factor
          }
        }
        intensity = Math.min(1, Math.max(0.1, intensity * maxConfidence))

        const needsConfirmation = maxConfidence < cfg.autoConfirmThreshold

        results.push({
          id: `detect_${Date.now().toString(36)}_${(detectionIdCounter++).toString(36)}`,
          type: emotionType,
          confidence: Math.round(maxConfidence * 100) / 100,
          source: 'text',
          rawText: text,
          timestamp: Date.now(),
          intensity: Math.round(intensity * 100) / 100,
          keywords: matchedKeywords,
          triggerWords,
          needsConfirmation,
        })
      }
    }

    // 按置信度排序
    results.sort((a, b) => b.confidence - a.confidence)

    // 添加检测结果
    if (results.length > 0) {
      addDetections(results)
    }

    return results
  }

  /** 快速检测单条文本的主要情绪 */
  function detectPrimary(text: string): DetectedEmotion | null {
    const results = analyzeText(text)
    if (results.length === 0) return null
    return results[0]
  }

  // ============================================================
  // 日记情绪扫描
  // ============================================================

  /** 扫描日记条目中的情绪 */
  function scanDiary(entries: Array<{ text: string; timestamp: number }>): DetectedEmotion[] {
    const allResults: DetectedEmotion[] = []

    for (const entry of entries) {
      const results = analyzeText(entry.text)
      for (const r of results) {
        r.source = 'diary'
        r.timestamp = entry.timestamp
      }
      allResults.push(...results)
    }

    return allResults
  }

  // ============================================================
  // 周期性检测
  // ============================================================

  /** 启动周期性检测 */
  function startPeriodicDetection(): void {
    if (periodicTimer) return

    const interval = detectorConfig.value.periodicInterval * 60 * 1000
    periodicTimer = setInterval(() => {
      performPeriodicCheck()
    }, interval)
  }

  /** 停止周期性检测 */
  function stopPeriodicDetection(): void {
    if (periodicTimer) {
      clearInterval(periodicTimer)
      periodicTimer = null
    }
  }

  /** 执行周期性检查 */
  function performPeriodicCheck(): PeriodicCheckResult {
    const now = new Date()
    const context = {
      timeOfDay: getTimeOfDay(now),
      dayOfWeek: getDayOfWeek(now),
      recentActivity: '未知',
      ambientMood: 'normal',
    }

    // 基于时间段的情绪检测
    const timeEmotions: DetectedEmotion[] = []

    if (context.timeOfDay === '深夜') {
      timeEmotions.push(createDetection('calm', 0.4, 'periodic', context.timeOfDay))
    } else if (context.timeOfDay === '早晨') {
      timeEmotions.push(createDetection('excited', 0.3, 'periodic', context.timeOfDay))
    }

    if (context.dayOfWeek === '周一') {
      timeEmotions.push(createDetection('anxious', 0.35, 'periodic', context.dayOfWeek))
    } else if (context.dayOfWeek === '周五') {
      timeEmotions.push(createDetection('excited', 0.4, 'periodic', context.dayOfWeek))
    } else if (context.dayOfWeek === '周末') {
      timeEmotions.push(createDetection('calm', 0.35, 'periodic', context.dayOfWeek))
    }

    if (timeEmotions.length > 0) {
      addDetections(timeEmotions)
    }

    return {
      triggered: timeEmotions.length > 0,
      emotions: timeEmotions,
      context,
    }
  }

  // ============================================================
  // 检测管理
  // ============================================================

  /** 添加检测结果 */
  function addDetections(newDetections: DetectedEmotion[]): void {
    const cfg = detectorConfig.value

    for (const d of newDetections) {
      // 自动确认高置信度结果
      if (cfg.autoConfirmHighConfidence && d.confidence >= cfg.autoConfirmThreshold) {
        d.needsConfirmation = false
      }
    }

    detections.value = [...newDetections, ...detections.value].slice(0, cfg.maxDetections)
    lastAnalysisTime.value = Date.now()

    // 更新待确认列表
    updatePendingList()
  }

  /** 确认检测结果 */
  function confirmDetection(detectionId: string): boolean {
    const idx = detections.value.findIndex(d => d.id === detectionId)
    if (idx === -1) return false

    const updated = [...detections.value]
    updated[idx] = { ...updated[idx], needsConfirmation: false }
    detections.value = updated

    updatePendingList()
    return true
  }

  /** 拒绝检测结果 */
  function rejectDetection(detectionId: string): boolean {
    const idx = detections.value.findIndex(d => d.id === detectionId)
    if (idx === -1) return false

    detections.value = [...detections.value.slice(0, idx), ...detections.value.slice(idx + 1)]
    updatePendingList()
    return true
  }

  /** 确认所有待确认检测 */
  function confirmAll(): number {
    let count = 0
    detections.value = detections.value.map(d => {
      if (d.needsConfirmation) {
        count++
        return { ...d, needsConfirmation: false }
      }
      return d
    })
    updatePendingList()
    return count
  }

  /** 更新待确认列表 */
  function updatePendingList(): void {
    pendingDetections.value = detections.value.filter(d => d.needsConfirmation)
    confirmedDetections.value = detections.value.filter(d => !d.needsConfirmation)
  }

  // ============================================================
  // 情绪检测统计
  // ============================================================

  /** 获取最近 N 小时的检测结果 */
  function getRecentDetections(hours: number = 24): DetectedEmotion[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000
    return detections.value.filter(d => d.timestamp >= cutoff)
  }

  /** 获取指定时间段的检测结果 */
  function getDetectionsInRange(startTime: number, endTime: number): DetectedEmotion[] {
    return detections.value.filter(d => d.timestamp >= startTime && d.timestamp <= endTime)
  }

  /** 按情绪类型筛选 */
  function getDetectionsByType(type: string): DetectedEmotion[] {
    return detections.value.filter(d => d.type === type)
  }

  /** 按来源筛选 */
  function getDetectionsBySource(source: DetectionSource): DetectedEmotion[] {
    return detections.value.filter(d => d.source === source)
  }

  // ============================================================
  // 配置管理
  // ============================================================

  /** 更新配置 */
  function updateConfig(update: Partial<EmotionDetectorConfig>): void {
    detectorConfig.value = {
      ...detectorConfig.value,
      ...update,
      keywordDictionary: update.keywordDictionary ?? detectorConfig.value.keywordDictionary,
      intensityModifiers: update.intensityModifiers ?? detectorConfig.value.intensityModifiers,
    }
  }

  /** 添加自定义关键词 */
  function addKeywords(emotionType: string, keywords: string[]): void {
    const dict = { ...detectorConfig.value.keywordDictionary }
    dict[emotionType] = [...(dict[emotionType] ?? []), ...keywords]
    detectorConfig.value = { ...detectorConfig.value, keywordDictionary: dict }
  }

  /** 重置 */
  function reset(): void {
    detections.value = []
    confirmedDetections.value = []
    pendingDetections.value = []
    lastAnalysisTime.value = null
    stopPeriodicDetection()
  }

  return {
    // 配置
    detectorConfig,
    updateConfig,
    addKeywords,

    // 状态
    detections,
    isAnalyzing,
    lastAnalysisTime,
    confirmedDetections,
    pendingDetections,

    // 派生状态
    detectionCount,
    pendingCount,
    confirmedCount,
    stats,
    dominantEmotion,

    // 文本分析
    analyzeText,
    detectPrimary,
    scanDiary,

    // 周期性检测
    startPeriodicDetection,
    stopPeriodicDetection,
    performPeriodicCheck,

    // 检测管理
    addDetections,
    confirmDetection,
    rejectDetection,
    confirmAll,

    // 查询
    getRecentDetections,
    getDetectionsInRange,
    getDetectionsByType,
    getDetectionsBySource,

    // 生命周期
    reset,

    // 常量
    DEFAULT_DETECTOR_CONFIG,
    DEFAULT_EMOTION_KEYWORDS,
    DEFAULT_INTENSITY_MODIFIERS,
  }
}

// ============================================================
// 工具函数
// ============================================================

/** 创建检测结果 */
function createDetection(
  type: string,
  confidence: number,
  source: DetectionSource,
  context: string,
): DetectedEmotion {
  return {
    id: `detect_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    type,
    confidence,
    source,
    rawText: context,
    timestamp: Date.now(),
    intensity: 0.5,
    keywords: [],
    triggerWords: [],
    needsConfirmation: confidence < 0.6,
  }
}

/** 获取时段 */
function getTimeOfDay(date: Date): string {
  const hour = date.getHours()
  if (hour < 6) return '深夜'
  if (hour < 9) return '早晨'
  if (hour < 12) return '上午'
  if (hour < 14) return '中午'
  if (hour < 18) return '下午'
  if (hour < 21) return '傍晚'
  return '夜晚'
}

/** 获取星期 */
function getDayOfWeek(date: Date): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const day = days[date.getDay()]
  return day === '周六' || day === '周日' ? '周末' : day
}