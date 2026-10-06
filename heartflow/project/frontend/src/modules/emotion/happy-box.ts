// ============================================================
// 情绪花房 · 快乐收集 / 情绪盒子（本地）
// ------------------------------------------------------------
// 借鉴「小确幸收集 / 感恩日记类 App」：把日常微小而确定的快乐
// 收进盒子，随时随机抽取回顾，为低落时刻提供温和支撑。
// 全部本地存储，守宪法第1条本地私有，无云端依赖。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

export interface HappyItem {
  id: string
  text: string
  tags: string[]
  createdAt: string
  /** 被随机回顾的次数 */
  recalledCount: number
}

export const HAPPY_BOX_KEY = 'hf:happy_box'

/** 常用快乐标签 */
export const HAPPY_TAGS = ['美食', '自然', '朋友', '成就', '小确幸', '健康', '灵感', '家人']

const items = ref<HappyItem[]>([])

function load() {
  try {
    const data = storage.getKV<unknown>(HAPPY_BOX_KEY, [])
    items.value = Array.isArray(data) ? (data as HappyItem[]) : []
  } catch {
    items.value = []
  }
}

function save() {
  storage.setKV(HAPPY_BOX_KEY, items.value)
}

/** 收集一条快乐（空内容返回 null） */
function capture(text: string, tags: string[] = []): HappyItem | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const item: HappyItem = {
    id: `happy_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    text: trimmed,
    tags: tags.filter(Boolean),
    createdAt: new Date().toISOString(),
    recalledCount: 0,
  }
  items.value.unshift(item)
  save()
  return item
}

function remove(id: string) {
  items.value = items.value.filter(i => i.id !== id)
  save()
}

/** 随机抽取一条快乐回顾（累计回顾次数） */
function recall(): HappyItem | null {
  if (items.value.length === 0) return null
  const idx = Math.floor(Math.random() * items.value.length)
  const item = items.value[idx]
  item.recalledCount += 1
  save()
  return item
}

export function useHappyBox() {
  const total = computed(() => items.value.length)
  const todayCount = computed(() => {
    // ⚠️ 业务「今天」按本地日历日：createdAt 是 UTC ISO 串，不能 slice(0,10) 取 UTC 日。
    //    与 widget-calendar 读同一份 HAPPY_BOX_KEY，两侧口径必须一致。
    const today = getLocalDateKey()
    return items.value.filter(i => i.createdAt && getLocalDateKey(new Date(i.createdAt)) === today).length
  })

  return { items, total, todayCount, load, capture, remove, recall }
}
