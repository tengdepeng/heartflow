// ============================================================
// 留光阁 · 修习实践引擎
// 冥想序列、释怀仪式、澄明追踪、光点收集
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'
import type { MeditationRecord, MeditationType, ReleaseEntry, ClarityLevel } from './types'

// ============================================================
// 类型定义
// ============================================================

/** 冥想序列 */
export interface MeditationSequence {
  id: string
  name: string
  description: string
  /** 序列步骤 */
  steps: MeditationSequenceStep[]
  /** 总时长（分钟） */
  totalDuration: number
  /** 难度 */
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  /** 使用次数 */
  useCount: number
}

/** 冥想序列步骤 */
export interface MeditationSequenceStep {
  type: MeditationType
  duration: number
  instruction: string
  /** 背景音 */
  ambientSound?: string
}

/** 释怀仪式 */
export interface ReleaseRitual {
  id: string
  name: string
  method: ReleaseEntry['method']
  steps: string[]
  /** 预计时长（分钟） */
  duration: number
  /** 适用场景 */
  scenario: string
}

/** 光点 */
export interface LightPoint {
  id: string
  name: string
  /** 来源 */
  source: 'meditation' | 'release' | 'insight' | 'streak' | 'milestone'
  /** 亮度 0-1 */
  brightness: number
  /** 颜色 */
  color: string
  /** 获得时间 */
  acquiredAt: string
  /** 描述 */
  description: string
}

/** 澄明追踪 */
export interface ClarityTracker {
  /** 当前澄明度 */
  level: ClarityLevel
  /** 澄明度分数 0-100 */
  score: number
  /** 连续冥想天数 */
  streak: number
  /** 总冥想分钟数 */
  totalMinutes: number
  /** 释怀条目数 */
  releaseCount: number
  /** 光点收集数 */
  lightPointCount: number
  /** 最近7天澄明趋势 */
  trend: { date: string; score: number; level: ClarityLevel }[]
}

/** 预设冥想序列 */
export const MEDITATION_SEQUENCES: MeditationSequence[] = [
  {
    id: 'seq-morning-awaken',
    name: '晨间唤醒',
    description: '用呼吸和身体扫描开启新的一天',
    steps: [
      { type: 'breath', duration: 3, instruction: '深呼吸，感受气息流过鼻腔与胸腔' },
      { type: 'body_scan', duration: 5, instruction: '从头顶到脚尖，逐一唤醒身体各部位' },
      { type: 'visualization', duration: 3, instruction: '想象金色阳光从头顶洒下，温暖全身' },
    ],
    totalDuration: 11,
    difficulty: 'beginner',
    useCount: 0,
  },
  {
    id: 'seq-midday-reset',
    name: '午间重置',
    description: '在忙碌中找回内心的平静',
    steps: [
      { type: 'breath', duration: 2, instruction: '三次深长的腹式呼吸' },
      { type: 'silent', duration: 5, instruction: '在静默中观察思绪的来去，不评判' },
      { type: 'breath', duration: 2, instruction: '回到呼吸，感受此刻的平静' },
    ],
    totalDuration: 9,
    difficulty: 'beginner',
    useCount: 0,
  },
  {
    id: 'seq-evening-release',
    name: '晚间释怀',
    description: '放下一天的疲惫与心结',
    steps: [
      { type: 'body_scan', duration: 5, instruction: '扫描身体，找到紧张与不适的部位' },
      { type: 'loving_kindness', duration: 5, instruction: '向自己发送善意，接纳今天的一切' },
      { type: 'silent', duration: 5, instruction: '在静默中，让一切自然而然地消散' },
    ],
    totalDuration: 15,
    difficulty: 'intermediate',
    useCount: 0,
  },
  {
    id: 'seq-deep-insight',
    name: '深度洞察',
    description: '在深度冥想中探索内在智慧',
    steps: [
      { type: 'breath', duration: 5, instruction: '建立稳定的呼吸节奏' },
      { type: 'visualization', duration: 10, instruction: '想象自己走进一座光的殿堂，每一束光都是一个答案' },
      { type: 'silent', duration: 10, instruction: '在完全的静默中，等待洞察浮现' },
    ],
    totalDuration: 25,
    difficulty: 'advanced',
    useCount: 0,
  },
]

/** 预设释怀仪式 */
export const RELEASE_RITUALS: ReleaseRitual[] = [
  {
    id: 'ritual-letter',
    name: '书信仪式',
    method: 'write',
    steps: [
      '准备纸笔，找一个安静的地方坐下',
      '写下你想释怀的事情，不加修饰，如实地表达',
      '重读一遍，感受字里行间的情绪',
      '将纸折好，放入信封，封存',
      '告诉自己：这件事已经写下来了，不再需要背负',
    ],
    duration: 15,
    scenario: '心中积压了想说却未说的话',
  },
  {
    id: 'ritual-leaf',
    name: '落叶仪式',
    method: 'float',
    steps: [
      '找一片落叶或花瓣',
      '在心中默念需要释怀的事情',
      '想象这件事随着叶片飘落',
      '将叶片放入溪流或水面，看着它漂远',
      '深呼吸三次，感受释怀后的轻盈',
    ],
    duration: 10,
    scenario: '感到被过去的事情牵绊',
  },
  {
    id: 'ritual-transform',
    name: '转化仪式',
    method: 'transform',
    steps: [
      '写下让你困扰的事情',
      '在下方列出从这件事中学到的三样东西',
      '写下你因此变得更强大的三个理由',
      '将正面表述大声读出来',
      '保留这张纸作为成长的见证',
    ],
    duration: 20,
    scenario: '想要从困境中汲取力量',
  },
]

/** 存储键 */
const LIGHT_PRACTICE_KEY = 'hf:light:practice'
const LIGHT_POINTS_KEY = 'hf:light:points'
const CLARITY_TRACKER_KEY = 'hf:light:clarity'

// ============================================================
// 修习实践引擎
// ============================================================

export function useLightPractice() {
  const sequences = ref<MeditationSequence[]>(loadSequences())
  const lightPoints = ref<LightPoint[]>(loadLightPoints())
  const clarityTracker = ref<ClarityTracker>(loadClarityTracker())

  // ---- 持久化 ----

  function loadSequences(): MeditationSequence[] {
    try {
      const raw = storage.getKV<string>(LIGHT_PRACTICE_KEY, '')
      // 兜底返回预设的**深拷贝**：MEDITATION_SEQUENCES 是模块级共享常量，
      // 浅拷贝（[...MEDITATION_SEQUENCES]）只换新数组、元素仍是同一批对象，
      // 而 useSequence 的 useCount++ / addStepToSequence 的 steps.push 会经reactive
      // 代理写穿到这些原始对象上，永久抬高面板展示的「已用 N 次」。
      // 同 useHomeReplica.readManifest() 的处理：深拷贝切断别名。
      if (!raw) return structuredClone(MEDITATION_SEQUENCES)
      return JSON.parse(raw)
    } catch { return structuredClone(MEDITATION_SEQUENCES) }
  }

  function saveSequences() {
    storage.setKV(LIGHT_PRACTICE_KEY, JSON.stringify(sequences.value))
  }

  function loadClarityTracker(): ClarityTracker {
    try {
      const raw = storage.getKV<string>(CLARITY_TRACKER_KEY, '')
      if (!raw) {
        return {
          level: 'neutral',
          score: 50,
          streak: 0,
          totalMinutes: 0,
          releaseCount: 0,
          lightPointCount: 0,
          trend: [],
        }
      }
      return JSON.parse(raw)
    } catch {
      return {
        level: 'neutral',
        score: 50,
        streak: 0,
        totalMinutes: 0,
        releaseCount: 0,
        lightPointCount: 0,
        trend: [],
      }
    }
  }

  function loadLightPoints(): LightPoint[] {
    try {
      const raw = storage.getKV<string>(LIGHT_POINTS_KEY, '[]')
      return JSON.parse(raw)
    } catch { return [] }
  }

  function saveClarityTracker() {
    storage.setKV(CLARITY_TRACKER_KEY, JSON.stringify(clarityTracker.value))
  }

  // ---- 冥想序列 ----

  /** 使用冥想序列 */
  function useSequence(sequenceId: string, record: MeditationRecord): boolean {
    const seq = sequences.value.find(s => s.id === sequenceId)
    if (!seq) return false
    seq.useCount++
    saveSequences()

    // 更新澄明追踪
    clarityTracker.value.totalMinutes += record.duration
    updateClarityAfterMeditation(record)
    saveClarityTracker()

    // 可能获得光点
    maybeAwardLightPoint('meditation', record as unknown as Record<string, unknown>)

    return true
  }

  /** 创建自定义冥想序列 */
  function createSequence(name: string, description: string, difficulty: MeditationSequence['difficulty']): MeditationSequence {
    const sequence: MeditationSequence = {
      id: `seq_${Date.now()}`,
      name,
      description,
      steps: [],
      totalDuration: 0,
      difficulty,
      useCount: 0,
    }
    sequences.value.push(sequence)
    saveSequences()
    return sequence
  }

  /** 向序列添加步骤 */
  function addStepToSequence(sequenceId: string, step: MeditationSequenceStep): boolean {
    const seq = sequences.value.find(s => s.id === sequenceId)
    if (!seq) return false
    seq.steps.push(step)
    seq.totalDuration = seq.steps.reduce((sum, s) => sum + s.duration, 0)
    saveSequences()
    return true
  }

  // ---- 释怀仪式 ----

  /** 完成释怀仪式 */
  function completeReleaseRitual(ritualId: string, release: ReleaseEntry): void {
    const ritual = RELEASE_RITUALS.find(r => r.id === ritualId)
    if (!ritual) return

    clarityTracker.value.releaseCount++
    updateClarityAfterRelease()
    saveClarityTracker()

    maybeAwardLightPoint('release', { ritual, release })
  }

  // ---- 光点管理 ----

  /** 光点列表 */
  const collectedLightPoints = computed(() => {
    return [...lightPoints.value].sort(
      (a, b) => new Date(b.acquiredAt).getTime() - new Date(a.acquiredAt).getTime()
    )
  })

  /** 光点总亮度 */
  const totalBrightness = computed(() => {
    return lightPoints.value.reduce((sum, p) => sum + p.brightness, 0)
  })

  // ---- 澄明追踪 ----

  /** 更新澄明度 */
  function updateClarityAfterMeditation(record: MeditationRecord) {
    const tracker = clarityTracker.value
    // 根据冥想时长和类型加分
    const scoreGain = Math.min(record.duration * 0.5, 10)
    tracker.score = Math.min(100, tracker.score + scoreGain)
    tracker.level = calculateClarityLevel(tracker.score)

    // 更新趋势
    const today = getLocalDateKey()
    const existing = tracker.trend.find(t => t.date === today)
    if (existing) {
      existing.score = tracker.score
      existing.level = tracker.level
    } else {
      tracker.trend.push({ date: today, score: tracker.score, level: tracker.level })
    }
    if (tracker.trend.length > 90) tracker.trend = tracker.trend.slice(-90)
  }

  function updateClarityAfterRelease() {
    const tracker = clarityTracker.value
    tracker.score = Math.min(100, tracker.score + 2)
    tracker.level = calculateClarityLevel(tracker.score)
  }

  /** 更新连续天数 */
  function updateStreak(date: string) {
    const tracker = clarityTracker.value
    const today = new Date(date)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = getLocalDateKey(yesterday)

    const trend = tracker.trend
    const hasYesterday = trend.some(t => t.date === yesterdayStr)
    if (hasYesterday) {
      tracker.streak++
    } else {
      tracker.streak = 1
    }
    saveClarityTracker()
  }

  return {
    // 状态
    sequences,
    lightPoints,
    clarityTracker,

    // 计算属性
    collectedLightPoints,
    totalBrightness,

    // 冥想序列
    useSequence,
    createSequence,
    addStepToSequence,

    // 释怀
    completeReleaseRitual,

    // 澄明
    updateStreak,
  }
}

// ============================================================
// 辅助函数
// ============================================================

function calculateClarityLevel(score: number): ClarityLevel {
  if (score >= 85) return 'crystal'
  if (score >= 65) return 'clear'
  if (score >= 40) return 'neutral'
  if (score >= 20) return 'unclear'
  return 'clouded'
}

function maybeAwardLightPoint(
  _source: LightPoint['source'],
  _data: Record<string, unknown>
) {
  // 光点获取逻辑：根据来源和里程碑决定
  // 实际实现中应调用 lightPoints ref 来添加光点
  // 这里保留接口，由调用方根据具体数据决定
}