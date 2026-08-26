// ============================================================
// 幕僚体系 · 作息与生活场景引擎
// 管理幕僚每日作息、活动安排、生活场景
// ============================================================

import { ref, computed } from 'vue'
import type { ActivityType, TimeSlot, AdvisorActivity, LifeScene, DailySchedule } from './types'
import { TIME_SLOT_META, ACTIVITY_META, ADVISOR_STORAGE_KEYS } from './types'
import { storage } from '../../engine/storage'

// ---- 幕僚个性 → 默认作息模板 ----
type PersonalityKey = 'guardian' | 'scholar' | 'craftsman' | 'hermit'

const DEFAULT_SCHEDULES: Record<PersonalityKey, Record<TimeSlot, ActivityType[]>> = {
  guardian: {
    dawn: ['meditating'],
    morning: ['observing', 'wandering'],
    noon: ['resting', 'reading'],
    afternoon: ['observing', 'writing'],
    dusk: ['wandering'],
    evening: ['reading', 'meditating'],
    night: ['resting'],
    midnight: ['dreaming'],
  },
  scholar: {
    dawn: ['reading'],
    morning: ['writing', 'reading'],
    noon: ['resting'],
    afternoon: ['writing', 'reading'],
    dusk: ['meditating'],
    evening: ['reading', 'writing'],
    night: ['meditating'],
    midnight: ['dreaming'],
  },
  craftsman: {
    dawn: ['meditating'],
    morning: ['crafting', 'gardening'],
    noon: ['resting'],
    afternoon: ['crafting'],
    dusk: ['wandering'],
    evening: ['crafting', 'reading'],
    night: ['resting'],
    midnight: ['dreaming'],
  },
  hermit: {
    dawn: ['meditating'],
    morning: ['gardening', 'wandering'],
    noon: ['resting'],
    afternoon: ['meditating', 'observing'],
    dusk: ['wandering'],
    evening: ['reading', 'meditating'],
    night: ['meditating'],
    midnight: ['dreaming'],
  },
}

// ---- 生活场景 ----
const DEFAULT_LIFE_SCENES: LifeScene[] = [
  {
    id: 'study-room',
    name: '书房',
    description: '书架环绕的安静空间，适合阅读与写作',
    location: '家·书房',
    suitableActivities: ['reading', 'writing', 'meditating'],
    maxAdvisors: 3,
    presentAdvisors: [],
  },
  {
    id: 'garden',
    name: '庭院',
    description: '草木葱茏的户外空间，适合园艺与漫步',
    location: '家·庭院',
    suitableActivities: ['gardening', 'wandering', 'meditating', 'observing'],
    maxAdvisors: 4,
    presentAdvisors: [],
  },
  {
    id: 'kitchen',
    name: '厨房',
    description: '温暖的烹饪空间，烟火气弥漫',
    location: '家·厨房',
    suitableActivities: ['cooking', 'resting'],
    maxAdvisors: 2,
    presentAdvisors: [],
  },
  {
    id: 'workshop',
    name: '工坊',
    description: '工具齐全的创作空间',
    location: '家·工坊',
    suitableActivities: ['crafting'],
    maxAdvisors: 2,
    presentAdvisors: [],
  },
  {
    id: 'living-room',
    name: '客厅',
    description: '舒适的社交空间，适合幕僚间互动',
    location: '家·客厅',
    suitableActivities: ['resting', 'reading', 'observing'],
    maxAdvisors: 5,
    presentAdvisors: [],
  },
  {
    id: 'bedroom',
    name: '卧室',
    description: '安静私密的休息空间',
    location: '家·卧室',
    suitableActivities: ['resting', 'dreaming'],
    maxAdvisors: 1,
    presentAdvisors: [],
  },
]

function generateId(): string {
  return `act_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadSchedules(): Record<string, DailySchedule> {
  try {
    const raw = storage.getKV<string>(ADVISOR_STORAGE_KEYS.schedules, '{}')
    return JSON.parse(raw)
  } catch { return {} }
}

function saveSchedules(schedules: Record<string, DailySchedule>): void {
  storage.setKV(ADVISOR_STORAGE_KEYS.schedules, JSON.stringify(schedules))
}

const schedules = ref<Record<string, DailySchedule>>(loadSchedules())
const currentActivities = ref<AdvisorActivity[]>([])
const scenes = ref<LifeScene[]>(DEFAULT_LIFE_SCENES)

/** 根据当前时间判断时段 */
function detectTimeSlot(): TimeSlot {
  const hour = new Date().getHours()
  for (const [slot, meta] of Object.entries(TIME_SLOT_META)) {
    const [start, end] = meta.hourRange
    if (start <= end) {
      if (hour >= start && hour < end) return slot as TimeSlot
    } else {
      if (hour >= start || hour < end) return slot as TimeSlot
    }
  }
  return 'afternoon'
}

export function useAdvisorDailyLife() {
  const currentTimeSlot = computed(() => detectTimeSlot())

  /** 初始化幕僚作息 */
  function initSchedule(advisorId: string, personality: string): DailySchedule {
    const template = DEFAULT_SCHEDULES[personality as PersonalityKey] ?? DEFAULT_SCHEDULES.hermit
    const schedule: DailySchedule = {
      advisorId,
      slots: { ...template },
      isActive: true,
    }
    schedules.value = { ...schedules.value, [advisorId]: schedule }
    saveSchedules(schedules.value)
    return schedule
  }

  /** 获取幕僚在当前时段的活动 */
  function getCurrentActivities(advisorId: string): ActivityType[] {
    const schedule = schedules.value[advisorId]
    if (!schedule) return ['resting']
    return schedule.slots[currentTimeSlot.value] ?? ['resting']
  }

  /** 开始一个活动 */
  function startActivity(
    advisorId: string,
    type: ActivityType,
    sceneId: string,
    description?: string,
  ): AdvisorActivity {
    const meta = ACTIVITY_META[type]
    const activity: AdvisorActivity = {
      id: generateId(),
      advisorId,
      type,
      scene: sceneId,
      startedAt: new Date().toISOString(),
      duration: meta.defaultDuration,
      description: description ?? `${meta.label}中`,
      interruptible: type !== 'dreaming',
    }
    currentActivities.value = [...currentActivities.value.filter(a => a.advisorId !== advisorId), activity]

    // 更新场景中幕僚
    const scene = scenes.value.find(s => s.id === sceneId)
    if (scene && !scene.presentAdvisors.includes(advisorId)) {
      scene.presentAdvisors = [...scene.presentAdvisors, advisorId]
    }
    return activity
  }

  /** 结束当前活动 */
  function endActivity(advisorId: string): AdvisorActivity | undefined {
    const activity = currentActivities.value.find(a => a.advisorId === advisorId)
    if (!activity) return undefined
    currentActivities.value = currentActivities.value.filter(a => a.advisorId !== advisorId)

    // 从场景中移除
    const scene = scenes.value.find(s => s.id === activity.scene)
    if (scene) {
      scene.presentAdvisors = scene.presentAdvisors.filter(id => id !== advisorId)
    }
    return activity
  }

  /** 获取场景中所有幕僚的活动 */
  function getSceneActivities(sceneId: string): AdvisorActivity[] {
    return currentActivities.value.filter(a => a.scene === sceneId)
  }

  /** 切换幕僚活跃状态 */
  function toggleActive(advisorId: string): boolean {
    const schedule = schedules.value[advisorId]
    if (!schedule) return false
    schedule.isActive = !schedule.isActive
    schedules.value = { ...schedules.value }
    saveSchedules(schedules.value)
    return schedule.isActive
  }

  /** 获取所有场景 */
  function getAllScenes(): LifeScene[] {
    return scenes.value
  }

  /** 获取场景使用情况 */
  function getSceneStats(): { sceneId: string; name: string; occupancy: number; maxCapacity: number }[] {
    return scenes.value.map(s => ({
      sceneId: s.id,
      name: s.name,
      occupancy: s.presentAdvisors.length,
      maxCapacity: s.maxAdvisors,
    }))
  }

  return {
    currentTimeSlot,
    currentActivities,
    scenes,
    initSchedule,
    getCurrentActivities,
    startActivity,
    endActivity,
    getSceneActivities,
    toggleActive,
    getAllScenes,
    getSceneStats,
  }
}