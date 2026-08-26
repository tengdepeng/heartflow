// ============================================================
// 共鸣协议层 · Anchor 桥接器
// 将逐日心锚状态通过共振层暴露，替代直接 import useAnchor
// ============================================================

import { useAnchor } from '../../modules/anchor'

/**
 * 逐日心锚状态 composable
 * 模块通过此 composable 获取响应式的心锚数据，
 * 而无需直接 import useAnchor
 */
export function useAnchorBridge() {
  const anchor = useAnchor()

  return {
    // 响应式状态
    anchors: anchor.anchors,
    todayAnchors: anchor.todayAnchors,
    poolAnchors: anchor.poolAnchors,
    pending: anchor.pending,
    done: anchor.done,
    allAnchors: anchor.allAnchors,
    // 操作方法
    load: anchor.load.bind(anchor),
    add: anchor.add.bind(anchor),
    addRaw: anchor.addRaw.bind(anchor),
    update: anchor.update.bind(anchor),
    editField: anchor.editField.bind(anchor),
    markDone: anchor.markDone.bind(anchor),
    markUndone: anchor.markUndone.bind(anchor),
    toggleDone: anchor.toggleDone.bind(anchor),
    remove: anchor.remove.bind(anchor),
    setPriority: anchor.setPriority.bind(anchor),
    addTag: anchor.addTag.bind(anchor),
    removeTag: anchor.removeTag.bind(anchor),
    driftPending: anchor.driftPending.bind(anchor),
    addToPool: anchor.addToPool.bind(anchor),
    placeFromPool: anchor.placeFromPool.bind(anchor),
    placeAllFromPool: anchor.placeAllFromPool.bind(anchor),
    returnToPool: anchor.returnToPool.bind(anchor),
    postponeToTomorrow: anchor.postponeToTomorrow.bind(anchor),
    // 查询方法
    getAnchorsByScale: anchor.getAnchorsByScale.bind(anchor),
    getAllTags: anchor.getAllTags.bind(anchor),
    getTagTrend: anchor.getTagTrend.bind(anchor),
    getCategories: anchor.getCategories.bind(anchor),
  }
}