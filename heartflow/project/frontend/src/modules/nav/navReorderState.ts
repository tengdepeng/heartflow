// ============================================================
// 导航树房间重排 · 跨组件共享态
// 供 App.vue 侧栏拖动与 NavTreeNode 房间重排之间协调手势：
// 房间重排进行中时，侧栏拖动应立即放弃，避免「既移侧栏又重排」的双手抢手势。
// ============================================================

import { reactive } from 'vue'

/** 同一时刻仅一处房间重排进行中 */
export const navReorder = reactive<{ active: boolean }>({ active: false })

// ============================================================
// 导航树房间拖拽落点 · 跨组件共享态
// 关键：NavTreeNode 是递归组件，每个节点都是一个独立实例。
// 若把拖拽态写在组件内部（reactive 在 setup 里），每个实例各持一份，
// 只有「被拖的那个节点」自己的 state 会更新 → 目标节点永远收不到
// targetId → 落点高亮(is-drop-target)永不出现，用户看不到自己正拖到哪，
// 主观感受就是「拖不动 / 拖了没反应」。故必须提到模块级共享。
// ============================================================
export interface NavDragState {
  active: boolean
  draggedId: string
  targetId: string
  consumed: boolean
}

export const navDrag = reactive<NavDragState>({
  active: false,
  draggedId: '',
  targetId: '',
  consumed: false,
})
