// ============================================================
// 平行世界 · 时间胶囊（给未来的自己）
// 蓝图模块29（梦境区）/ 模块13（岁时阁年度胶囊）：写现在、未来主动开启，
// 不提醒（兼容宪法第52条沉默默认）。
//
// 存储唯一真源已统一至 modules/capsule（键 hf:time_capsules）。
// 本文件仅作兼容适配层：复用唯一真源，对外暴露并行世界视图所需的表单与
// 操作 API，不再独立读写存储 —— 杜绝双实现写同键、schema 不兼容导致的
// 数据损坏 / 跨视图崩溃（旧并行世界格式 message+opened(boolean) 已在
// modules/capsule 的 load 时归一化迁移）。
// ============================================================

import { reactive, computed } from 'vue'
import {
  useTimeCapsule as useCapsuleStore,
  reloadCapsules,
  type TimeCapsule,
  type CapsuleScope,
} from '../capsule'

/** 复用唯一真源的胶囊列表（对象自带 opened / at / message / scope，兼容旧视图） */
const store = useCapsuleStore()
const capsules = store.capsules

/** 表单状态（仅 UI，不持久化） */
const capForm = reactive({ message: '', openDate: '' })

/** 排序：未开启在前，再按开启日期升序 */
const sortedCapsules = computed(() =>
  [...capsules.value].sort((a, b) => {
    if (a.opened !== b.opened) return a.opened ? 1 : -1
    return new Date(a.openDate).getTime() - new Date(b.openDate).getTime()
  }),
)

/** 是否可开启（未开启且到达开启日期） */
function checkReady(c: TimeCapsule): boolean {
  if (c.opened) return false
  return new Date(c.openDate) <= new Date()
}

/** 主动开启（不提醒） */
function tryOpenCapsule(c: TimeCapsule) {
  if (c.opened || !checkReady(c)) return
  store.openCapsule(c.id)
}

/** 封存一封胶囊（默认自由胶囊，可指定年度） */
function addCapsule(scope: CapsuleScope = 'free') {
  if (!capForm.message.trim() || !capForm.openDate) return
  // 写入唯一真源：title/note 用留言文本，scope 透传
  store.createCapsule(capForm.message.trim(), capForm.openDate, [], capForm.message.trim(), scope)
  capForm.message = ''
  capForm.openDate = ''
}

function removeCapsule(id: string) {
  store.removeCapsule(id)
}

/** 从唯一真源重新同步 */
function load() {
  reloadCapsules()
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
    load,
  }
}

/** 兼容旧导出：Capsule 即唯一真源结构，CapsuleScope 来自 modules/capsule */
export type Capsule = TimeCapsule
export type { CapsuleScope }
