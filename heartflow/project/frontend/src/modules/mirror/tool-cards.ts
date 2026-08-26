// ============================================================
// 镜我 · 工具卡 / 百宝袋（F5 意图工具卡）
// 宪法：本地私有（第1条）；超级自定义——可增删（第2条）；沉默默认（无推送）
// 持久化 key：hf:mirror_tool_cards
// 复用 @/engine/storage 的 getKV / setKV
// ============================================================

import { ref, type Ref } from 'vue'
import { storage } from '@/engine/storage'
import type { IntentCategory } from './types'
import { INTENT_INFO } from './intents'

/** 一张工具卡 = 一个意图的快捷入口 */
export interface MirrorToolCard {
  id: string
  category: IntentCategory
  label: string
  icon: string
  description: string
}

/** 持久化存储键 */
export const MIRROR_TOOL_CARDS_KEY = 'hf:mirror_tool_cards'

/** 构建默认种子卡：引用与 handleIntentLaunch 相同的 10 个意图。 */
function buildSeedCards(): MirrorToolCard[] {
  return (Object.keys(INTENT_INFO) as IntentCategory[])
    .filter((c) => c !== 'unknown')
    .map((c) => {
      const meta = INTENT_INFO[c]
      return {
        id: `seed-${c}`,
        category: c,
        label: meta.label,
        icon: meta.icon,
        description: meta.description,
      }
    })
}

// ---- 模块级单例状态（宪法:沉默默认，初次访问才加载）----
const cards: Ref<MirrorToolCard[]> = ref([])
let initialized = false

function load(): MirrorToolCard[] {
  const stored = storage.getKV<MirrorToolCard[] | null>(MIRROR_TOOL_CARDS_KEY, null)
  if (stored && Array.isArray(stored) && stored.length > 0) return stored
  return buildSeedCards()
}

function persist(value: MirrorToolCard[]): void {
  storage.setKV(MIRROR_TOOL_CARDS_KEY, value)
}

function genId(): string {
  return `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/**
 * 工具卡组合式（模块级单例）。
 * 首次调用时从存储加载（无记录则回退到种子卡）。
 */
export function useMirrorToolCards() {
  if (!initialized) {
    cards.value = load()
    initialized = true
  }

  /** 新增一张自定义卡（超级自定义：用户可任意添加） */
  function addCard(input: Omit<MirrorToolCard, 'id'>): MirrorToolCard {
    const card: MirrorToolCard = { ...input, id: genId() }
    cards.value = [...cards.value, card]
    persist(cards.value)
    return card
  }

  /** 按 id 删除一张卡（超级自定义：用户可移除） */
  function removeCard(id: string): void {
    cards.value = cards.value.filter((c) => c.id !== id)
    persist(cards.value)
  }

  /** 恢复为默认种子卡集合 */
  function resetToSeed(): void {
    cards.value = buildSeedCards()
    persist(cards.value)
  }

  return { cards, addCard, removeCard, resetToSeed }
}
