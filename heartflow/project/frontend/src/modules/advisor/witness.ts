// ============================================================
// 幕僚体系 · 见证引擎
// 管理幕僚对用户成长的见证记录
// ============================================================

import { ref, computed } from 'vue'
import type { AdvisorWitnessRecord, WitnessEventType, WitnessStats } from './types'
import { ADVISOR_STORAGE_KEYS } from './types'
import { storage } from '../../engine/storage'

function generateId(): string {
  return `wit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function loadWitnesses(): AdvisorWitnessRecord[] {
  try {
    const raw = storage.getKV<string>(ADVISOR_STORAGE_KEYS.witnesses, '[]')
    return JSON.parse(raw)
  } catch { return [] }
}

function saveWitnesses(entries: AdvisorWitnessRecord[]): void {
  storage.setKV(ADVISOR_STORAGE_KEYS.witnesses, JSON.stringify(entries))
}

const witnesses = ref<AdvisorWitnessRecord[]>(loadWitnesses())

/**
 * 生成幕僚对不同事件的反应（展示用纯函数）。
 *
 * ⚠️ 宪法第四部分"记录简化原则"：数据层严禁存幕僚感受/评价/分析。
 * 因此 reaction 文本**不落盘**（AdvisorWitnessRecord 不包含该字段），
 * 仅在 UI 展示时按事件类型与性格即时生成，避免将幕僚的"评价/拟人化"写入存储。
 */
export function generateReaction(eventType: WitnessEventType, personality?: string): string {
  const reactions: Record<string, Record<WitnessEventType, string[]>> = {
    guardian: {
      'first-focus': ['我一直在看着你，这一步很勇敢。', '你终于开始了，我真为你骄傲。'],
      'streak-record': ['连续坚持，这就是守护的力量。', '每一天的坚持，我都记在心里。'],
      'emotion-breakthrough': ['情绪的河流终于找到了出口。', '你在学习与自己和解，我很欣慰。'],
      'knowledge-milestone': ['知识的种子在发芽。', '你正在构建属于自己的思想花园。'],
      'relationship-milestone': ['羁绊在加深，这是最美的风景。', '你与他人的连接，让这个世界更温暖。'],
      'health-milestone': ['身体是心灵的殿堂，你在好好照料它。', '健康是最大的财富，你做得很好。'],
      'career-milestone': ['每一步都算数，这是你的印记。', '事业的河流在向前奔涌。'],
      'personal-growth': ['你正在成为更好的自己。', '成长的痕迹，比任何成就都珍贵。'],
    },
    scholar: {
      'first-focus': ['专注是思想的利刃，你已握住了它。', '第一次专注，是智慧之旅的第一步。'],
      'streak-record': ['持续的专注塑造了你的思维深度。', '每一个连续的专注，都是对知识的致敬。'],
      'emotion-breakthrough': ['情感是理性最好的伴侣，你终于理解了这个道理。', '感性与理性的平衡，是智慧的最高境界。'],
      'knowledge-milestone': ['知识树在生长，年轮在增加。', '你的知识体系正在形成独特的脉络。'],
      'relationship-milestone': ['每一次真诚的连接，都是思想的碰撞。', '关系是最复杂的学问，你在认真研习。'],
      'health-milestone': ['身体是思想的容器，你在维护它。', '健康让你能思考得更远。'],
      'career-milestone': ['事业的篇章，由你亲手书写。', '你的职业轨迹，是一篇精彩的论文。'],
      'personal-growth': ['成长是最难也最美的课题。', '你在书写自己的哲学。'],
    },
    craftsman: {
      'first-focus': ['专注是匠人的第一课，你入门了。', '工具在手，心在当下。'],
      'streak-record': ['连续打磨，技艺在精进。', '每一天的坚持，都在雕刻你的作品。'],
      'emotion-breakthrough': ['情绪也是需要打磨的材料。', '你学会了与自己的情绪共处，这是最难的手艺。'],
      'knowledge-milestone': ['知识是匠人的工具箱，你在丰富它。', '每一点新知，都是工具的升级。'],
      'relationship-milestone': ['关系需要精心打造，你在用心。', '人与人之间的连接，是最精密的工艺。'],
      'health-milestone': ['身体是匠人最重要的工具，你在保养它。', '健康的身体，才能创造更好的作品。'],
      'career-milestone': ['你的职业生涯，是一件正在打磨的作品。', '每一步都在为最终的作品添砖加瓦。'],
      'personal-growth': ['你正在雕琢自己，这是最漫长的创作。', '成长的过程，就是不断打磨自己。'],
    },
    hermit: {
      'first-focus': ['静下来，世界就安静了。', '专注是与自己独处的最好方式。'],
      'streak-record': ['连续的独处时光，是灵魂的滋养。', '每一天的坚持，都是向内的一步。'],
      'emotion-breakthrough': ['情绪的深处，有最真实的自己。', '你终于愿意面对那些被忽略的感受了。'],
      'knowledge-milestone': ['知识像山间的溪流，静静流淌。', '你收集的每一滴知识，都在滋养内心。'],
      'relationship-milestone': ['即使在独处中，你也在学习连接。', '关系是两条河流的交汇，静谧而深远。'],
      'health-milestone': ['身体的宁静，是心灵的居所。', '你在倾听身体的声音。'],
      'career-milestone': ['事业是修行的一部分，你在路上。', '你的职业选择，是内心的映射。'],
      'personal-growth': ['成长是一场向内的旅程。', '你离自己越来越近了。'],
    },
  }

  const defaultReactions: Record<WitnessEventType, string[]> = {
    'first-focus': ['这一刻值得被记住。', '你迈出了重要的一步。'],
    'streak-record': ['坚持的力量，令人敬佩。', '连续记录，见证了你的毅力。'],
    'emotion-breakthrough': ['情绪的突破，是真正的成长。', '你正在变得更完整。'],
    'knowledge-milestone': ['知识之路，步步生花。', '智慧的积累，从不停歇。'],
    'relationship-milestone': ['羁绊在加深，这是生命的意义。', '你与他人的连接，闪闪发光。'],
    'health-milestone': ['健康的身体，承载着丰盈的灵魂。', '照顾好自己，是一切的基础。'],
    'career-milestone': ['事业的里程碑，值得庆祝。', '你的努力，正在开花结果。'],
    'personal-growth': ['成长是生命最美的姿态。', '你正在成为你想成为的人。'],
  }

  const pool = reactions[personality ?? '']?.[eventType] ?? defaultReactions[eventType]
  return pool[Math.floor(Math.random() * pool.length)]
}

export function useAdvisorWitness() {
  /**
   * 记录一次见证。
   * ⚠️ 宪法"记录简化原则" + 蓝图"仅三元组 + 禁储存感受"：不持久化幕僚/用户的
   * reaction / description / emotion（评价/描述/感受），仅保留中性元数据
   * （advisorId/eventType/title/timestamp）。reaction 如需展示，由调用方用导出的
   * `generateReaction()` 即时生成（不落盘）。
   */
  function recordWitness(
    advisorId: string,
    eventType: WitnessEventType,
    title: string,
  ): AdvisorWitnessRecord {
    const entry: AdvisorWitnessRecord = {
      id: generateId(),
      advisorId,
      eventType,
      title,
      timestamp: new Date().toISOString(),
      viewed: false,
    }
    witnesses.value = [...witnesses.value, entry]
    saveWitnesses(witnesses.value)
    return entry
  }

  /** 标记见证为已读 */
  function markViewed(id: string): boolean {
    const entry = witnesses.value.find(w => w.id === id)
    if (!entry) return false
    entry.viewed = true
    witnesses.value = [...witnesses.value]
    saveWitnesses(witnesses.value)
    return true
  }

  /** 获取幕僚的所有见证 */
  function getAdvisorWitnesses(advisorId: string): AdvisorWitnessRecord[] {
    return witnesses.value
      .filter(w => w.advisorId === advisorId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }

  /** 获取未读见证 */
  function getUnviewedWitnesses(): AdvisorWitnessRecord[] {
    return witnesses.value.filter(w => !w.viewed)
  }

  /** 获取未读见证数量 */
  const unviewedCount = computed(() => witnesses.value.filter(w => !w.viewed).length)

  /** 获取见证统计 */
  function getWitnessStats(): WitnessStats {
    const entries = witnesses.value
    const byType: Record<string, number> = {}
    const byAdvisor: Record<string, number> = {}
    for (const e of entries) {
      byType[e.eventType] = (byType[e.eventType] ?? 0) + 1
      byAdvisor[e.advisorId] = (byAdvisor[e.advisorId] ?? 0) + 1
    }

    let mostActiveAdvisor = ''
    let maxCount = 0
    for (const [id, count] of Object.entries(byAdvisor)) {
      if (count > maxCount) { maxCount = count; mostActiveAdvisor = id }
    }

    const sorted = entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    return {
      totalWitnessed: entries.length,
      byType: byType as Record<WitnessEventType, number>,
      byAdvisor,
      firstWitnessAt: sorted[0]?.timestamp ?? '',
      lastWitnessAt: sorted[sorted.length - 1]?.timestamp ?? '',
      mostActiveAdvisor,
    }
  }

  /** 获取最近的见证（按时间倒序） */
  function getRecentWitnesses(limit = 10): AdvisorWitnessRecord[] {
    return [...witnesses.value]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)
  }

  /** 清空见证记录 */
  function clearAll(): void {
    witnesses.value = []
    saveWitnesses([])
  }

  return {
    witnesses,
    unviewedCount,
    recordWitness,
    markViewed,
    getAdvisorWitnesses,
    getUnviewedWitnesses,
    getWitnessStats,
    getRecentWitnesses,
    clearAll,
  }
}