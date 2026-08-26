// ============================================================
// 平行世界 · 时间胶囊（给未来的自己）
// 蓝图模块29（梦境区）/ 模块13（岁时阁年度胶囊）：写现在、未来主动开启，
// 不提醒（兼容宪法第52条沉默默认）。从 views/ParallelWorld.vue 抽取为
// 模块级单例 composable，保留 hf:time_capsules 存储键。
// ============================================================

import { ref, reactive, computed } from 'vue'
import { storage } from '../../engine/storage'

/** 胶囊范围：年度时间胶囊 / 自由胶囊 */
export type CapsuleScope = 'year' | 'free'

/** 时间胶囊 */
export interface Capsule {
  id: string
  message: string
  /** 开启日期（YYYY-MM-DD） */
  openDate: string
  /** 是否已开启 */
  opened: boolean
  /** 封存时间 */
  at: string
  /** 范围（年度/自由），默认自由 */
  scope?: CapsuleScope
}

const CAPS_KEY = 'hf:time_capsules'

function load(): Capsule[] {
  try {
    const v = storage.getKV<Capsule[]>(CAPS_KEY, [])
    return Array.isArray(v) ? v : []
  } catch {
    return []
  }
}

function save(caps: Capsule[]) {
  storage.setKV(CAPS_KEY, caps)
}

const capsules = ref<Capsule[]>(load())

const capForm = reactive({ message: '', openDate: '' })

/** 排序：未开启在前，再按开启日期升序 */
const sortedCapsules = computed(() =>
  [...capsules.value].sort((a, b) => {
    if (a.opened !== b.opened) return a.opened ? 1 : -1
    return new Date(a.openDate).getTime() - new Date(b.openDate).getTime()
  })
)

/** 是否可开启（未开启且到达开启日期） */
function checkReady(c: Capsule): boolean {
  if (c.opened) return false
  return new Date(c.openDate) <= new Date()
}

/** 主动开启（不提醒） */
function tryOpenCapsule(c: Capsule) {
  if (c.opened || !checkReady(c)) return
  c.opened = true
  capsules.value = [...capsules.value] // 触发响应式更新
  save(capsules.value)
}

/** 封存一封胶囊（默认自由胶囊，可指定年度） */
function addCapsule(scope: CapsuleScope = 'free') {
  if (!capForm.message.trim() || !capForm.openDate) return
  const capsule: Capsule = {
    id: `cp${Date.now()}${Math.random().toString(36).slice(2, 4)}`,
    message: capForm.message.trim(),
    openDate: capForm.openDate,
    opened: false,
    at: new Date().toISOString(),
    scope,
  }
  capsules.value = [capsule, ...capsules.value]
  save(capsules.value)
  capForm.message = ''
  capForm.openDate = ''
}

function removeCapsule(id: string) {
  capsules.value = capsules.value.filter(c => c.id !== id)
  save(capsules.value)
}

function loadCapsules() {
  capsules.value = load()
}

export function useTimeCapsule() {
  return {
    capsules,
    capForm,
    sortedCapsules,
    checkReady,
    tryOpenCapsule,
    addCapsule,
    removeCapsule,
    load: loadCapsules,
  }
}
