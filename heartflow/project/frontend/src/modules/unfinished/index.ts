// ============================================================
// 未完成花园 · 自动流转聚合
// 蓝图附录E：逐日心锚推迟>5次的锚点 + 留光阁dormant/sunken目标
// 自动出现在花园作为半透明光点；并暴露手动"放入未完成花园"入口。
// ============================================================

import { useGoal } from '../goal'
import { getAnchors } from '../../engine/storage/anchor'
import { storage } from '../../engine/storage'

export const UNFINISHED_KEY = 'hf:unfinished_v2'

export type UItemType = 'seed' | 'book' | 'draft'

export interface UItem {
  id: string
  type: UItemType
  text: string
  progress?: string
  status?: 'active' | 'paused' | 'abandoned'
  sprouted?: boolean
  at: string
  updatedAt?: string
  completed?: boolean
  completedAt?: string
  dormantSince?: string
}

export type LightDotKind = 'goal-dormant' | 'goal-sunken' | 'anchor-drift'

export interface LightDot {
  id: string
  kind: LightDotKind
  label: string
  source: string
  hint: string
  relatedId?: string
}

const SOURCE_LABELS: Record<LightDotKind, string> = {
  'goal-dormant': '留光阁 · 休眠目标',
  'goal-sunken': '留光阁 · 旧梦潭',
  'anchor-drift': '逐日心锚 · 反复推迟',
}

/** 蓝图阈值：锚点被推迟超过 5 次即视为"反复漂移" */
const DRIFT_THRESHOLD = 5

function fmt(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/**
 * 自动流转：从留光阁休眠/沉梦目标、逐日心锚反复推迟的锚点，
 * 汇聚为半透明光点。返回空数组时表示当前无需浮现。
 */
export function collectLightDots(): LightDot[] {
  const dots: LightDot[] = []
  const goal = useGoal()

  // 留光阁休眠中的目标
  for (const g of goal.goals.value) {
    if (g.status === 'dormant') {
      dots.push({
        id: `dot-gd-${g.id}`,
        kind: 'goal-dormant',
        label: g.title,
        source: SOURCE_LABELS['goal-dormant'],
        hint: `休眠中 · 自 ${fmt(g.updatedAt)}`,
        relatedId: g.id,
      })
    }
  }

  // 留光阁已沉入旧梦潭的目标
  for (const d of goal.oldDreams.value) {
    dots.push({
      id: `dot-gs-${d.goal.id}`,
      kind: 'goal-sunken',
      label: d.goal.title,
      source: SOURCE_LABELS['goal-sunken'],
      hint: `沉入旧梦 ${d.daysInPool} 天`,
      relatedId: d.goal.id,
    })
  }

  // 逐日心锚反复推迟的锚点
  for (const a of getAnchors()) {
    if (a.driftCount > DRIFT_THRESHOLD) {
      dots.push({
        id: `dot-ad-${a.id}`,
        kind: 'anchor-drift',
        label: a.text,
        source: SOURCE_LABELS['anchor-drift'],
        hint: `推迟 ${a.driftCount} 次`,
        relatedId: a.id,
      })
    }
  }

  return dots
}

/**
 * 手动"放入未完成花园"。可被任意房间调用，
 * 例如留光阁放弃目标、心锚长期搁置时写入。
 */
export function placeInUnfinishedGarden(text: string, type: UItemType = 'seed'): UItem {
  const now = new Date().toISOString()
  const item: UItem = {
    id: `uf${Date.now()}`,
    type,
    text: text.trim(),
    at: now,
    updatedAt: now,
  }
  if (type === 'book') {
    item.progress = '开头'
    item.status = 'active'
  }
  const items = storage.getKV<UItem[]>(UNFINISHED_KEY, [])
  items.unshift(item)
  storage.setKV(UNFINISHED_KEY, items)
  return item
}

/** 将一条自动光点收编为正式的未完成卡片（默认收为种子） */
export function adoptLightDot(dot: LightDot): UItem {
  return placeInUnfinishedGarden(dot.label, 'seed')
}

// ---- 数据层（事项 + 种子） ----
export { useUnfinished } from './unfinished-store'
