// ============================================================
// 幕僚体系 · 庆祝与退休引擎
// 管理幕僚里程碑庆祝、退休仪式、遗产传承
// ============================================================

import { ref } from 'vue'
import type { CelebrationEvent, CelebrationType, RetirementCeremony, RetirementPhase, AdvisorLegacy } from './types'
import { CELEBRATION_TYPE_META, ADVISOR_STORAGE_KEYS } from './types'
import { storage } from '../../engine/storage'

function generateId(): string {
  return `cel_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadCelebrations(): CelebrationEvent[] {
  try {
    const raw = storage.getKV<string>(ADVISOR_STORAGE_KEYS.celebrations, '[]')
    return JSON.parse(raw)
  } catch { return [] }
}

function saveCelebrations(events: CelebrationEvent[]): void {
  storage.setKV(ADVISOR_STORAGE_KEYS.celebrations, JSON.stringify(events))
}

function loadRetirements(): RetirementCeremony[] {
  try {
    const raw = storage.getKV<string>(ADVISOR_STORAGE_KEYS.retirements, '[]')
    return JSON.parse(raw)
  } catch { return [] }
}

function saveRetirements(ceremonies: RetirementCeremony[]): void {
  storage.setKV(ADVISOR_STORAGE_KEYS.retirements, JSON.stringify(ceremonies))
}

const celebrations = ref<CelebrationEvent[]>(loadCelebrations())
const retirements = ref<RetirementCeremony[]>(loadRetirements())

export function useAdvisorCelebration() {
  /** 创建庆祝事件 */
  function createCelebration(
    advisorId: string,
    type: CelebrationType,
    title: string,
    description: string,
    date?: string,
  ): CelebrationEvent {
    const meta = CELEBRATION_TYPE_META[type]
    const event: CelebrationEvent = {
      id: generateId(),
      type,
      advisorId,
      title,
      description,
      date: date ?? new Date().toISOString().split('T')[0],
      celebrated: false,
      ritual: {
        name: meta.defaultRitual,
        steps: [
          '点燃烛火，照亮幕僚的面容',
          '回顾幕僚与你共同走过的旅程',
          '念诵祝福词，表达感谢',
          '幕僚回应，分享感悟',
          '记录这一刻，化为永恒',
        ],
        participants: [advisorId],
      },
    }
    celebrations.value = [...celebrations.value, event]
    saveCelebrations(celebrations.value)
    return event
  }

  /** 完成庆祝 */
  function completeCelebration(id: string, artifact?: string): boolean {
    const event = celebrations.value.find(e => e.id === id)
    if (!event) return false
    event.celebrated = true
    if (artifact && event.ritual) {
      event.ritual.artifact = artifact
    }
    celebrations.value = [...celebrations.value]
    saveCelebrations(celebrations.value)
    return true
  }

  /** 获取幕僚的庆祝历史 */
  function getAdvisorCelebrations(advisorId: string): CelebrationEvent[] {
    return celebrations.value.filter(e => e.advisorId === advisorId)
  }

  /** 获取今日待庆祝事件 */
  function getTodayCelebrations(): CelebrationEvent[] {
    const today = new Date().toISOString().split('T')[0]
    return celebrations.value.filter(e => e.date === today && !e.celebrated)
  }

  /** 获取即将到来的庆祝事件（未来7天） */
  function getUpcomingCelebrations(): CelebrationEvent[] {
    const now = new Date()
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const todayStr = now.toISOString().split('T')[0]
    const weekStr = weekLater.toISOString().split('T')[0]
    return celebrations.value.filter(
      e => e.date >= todayStr && e.date <= weekStr && !e.celebrated,
    )
  }

  // ---- 退休仪式 ----

  /** 开始退休仪式 */
  function startRetirement(
    advisorId: string,
    reason: string,
    witnesses: string[] = [],
  ): RetirementCeremony {
    const ceremony: RetirementCeremony = {
      id: `ret_${Date.now()}`,
      advisorId,
      reason,
      phase: 'contemplation',
      startedAt: new Date().toISOString(),
      legacies: [],
      witnesses,
    }
    retirements.value = [...retirements.value, ceremony]
    saveRetirements(retirements.value)
    return ceremony
  }

  /** 推进退休阶段 */
  function advanceRetirementPhase(id: string): RetirementPhase | undefined {
    const ceremony = retirements.value.find(r => r.id === id)
    if (!ceremony) return undefined
    const phases: RetirementPhase[] = ['contemplation', 'farewell', 'archiving', 'legacy']
    const currentIdx = phases.indexOf(ceremony.phase)
    if (currentIdx < phases.length - 1) {
      ceremony.phase = phases[currentIdx + 1]
      if (ceremony.phase === 'legacy') {
        ceremony.completedAt = new Date().toISOString()
      }
      retirements.value = [...retirements.value]
      saveRetirements(retirements.value)
    }
    return ceremony.phase
  }

  /** 添加幕僚遗留物 */
  function addLegacy(
    ceremonyId: string,
    type: 'wisdom' | 'memory' | 'artifact' | 'blessing',
    title: string,
    content: string,
    inheritable = true,
  ): AdvisorLegacy | undefined {
    const ceremony = retirements.value.find(r => r.id === ceremonyId)
    if (!ceremony) return undefined
    const legacy: AdvisorLegacy = {
      id: `leg_${Date.now()}`,
      type,
      title,
      content,
      inheritable,
    }
    ceremony.legacies = [...ceremony.legacies, legacy]
    retirements.value = [...retirements.value]
    saveRetirements(retirements.value)
    return legacy
  }

  /** 写入告别信 */
  function writeFarewellLetter(id: string, letter: string): boolean {
    const ceremony = retirements.value.find(r => r.id === id)
    if (!ceremony) return false
    ceremony.farewellLetter = letter
    retirements.value = [...retirements.value]
    saveRetirements(retirements.value)
    return true
  }

  /** 获取幕僚正在进行的退休仪式 */
  function getActiveRetirement(advisorId: string): RetirementCeremony | undefined {
    return retirements.value.find(
      r => r.advisorId === advisorId && !r.completedAt,
    )
  }

  /** 获取所有退休幕僚的遗产 */
  function getAllLegacies(): AdvisorLegacy[] {
    return retirements.value.flatMap(r => r.legacies)
  }

  /** 获取退休仪式统计 */
  function getRetirementStats(): { total: number; completed: number; active: number; totalLegacies: number } {
    return {
      total: retirements.value.length,
      completed: retirements.value.filter(r => r.completedAt).length,
      active: retirements.value.filter(r => !r.completedAt).length,
      totalLegacies: retirements.value.reduce((s, r) => s + r.legacies.length, 0),
    }
  }

  return {
    celebrations,
    retirements,
    createCelebration,
    completeCelebration,
    getAdvisorCelebrations,
    getTodayCelebrations,
    getUpcomingCelebrations,
    startRetirement,
    advanceRetirementPhase,
    addLegacy,
    writeFarewellLetter,
    getActiveRetirement,
    getAllLegacies,
    getRetirementStats,
  }
}