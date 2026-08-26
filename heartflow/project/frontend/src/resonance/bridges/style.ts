// ============================================================
// 共鸣协议层 · Style 桥接器
// 将风格包状态通过共振层暴露，替代直接 import useStyleStore
// ============================================================

import { reactive } from 'vue'
import { useStyleStore } from '../../stores/style'
import { storeToRefs } from 'pinia'

export function useStyle() {
  const store = useStyleStore()
  const { packs, activeId, activePack, installedPacks } = storeToRefs(store)

  return reactive({
    // 响应式状态
    packs,
    activeId,
    activePack,
    installedPacks,

    // 方法
    init: store.init?.bind(store),
    activate: store.activate?.bind(store),
    exportPack: store.exportPack?.bind(store),
    createFromBaseColor: store.createFromBaseColor?.bind(store),
    importPack: store.importPack?.bind(store),
  })
}