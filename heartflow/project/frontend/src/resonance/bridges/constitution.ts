// ============================================================
// 共鸣协议层 · Constitution 桥接器
// 将宪法状态通过共振层暴露，替代直接 import useConstitutionStore
// ============================================================

import { reactive } from 'vue'
import { useConstitutionStore } from '../../stores/constitution'
import { storeToRefs } from 'pinia'

export function useConstitution() {
  const store = useConstitutionStore()
  const {
    constitution, immutableRules, mutableRules, name, version,
    preamble, createdAt, updatedAt, enabledMutableCount, totalMutableCount,
  } = storeToRefs(store)

  return reactive({
    // 响应式状态
    constitution,
    immutableRules,
    mutableRules,
    name,
    version,
    preamble,
    createdAt,
    updatedAt,
    enabledMutableCount,
    totalMutableCount,

    // CRUD
    addRule: store.addRule?.bind(store),
    updateRule: store.updateRule?.bind(store),
    removeRule: store.removeRule?.bind(store),
    toggleRule: store.toggleRule?.bind(store),
    reorderRules: store.reorderRules?.bind(store),
    renumberArticles: store.renumberArticles?.bind(store),

    // 追踪
    canTrack: store.canTrack?.bind(store),
    initTracking: store.initTracking?.bind(store),
    trackOnce: store.trackOnce?.bind(store),
    resetTracking: store.resetTracking?.bind(store),

    // 导入导出
    exportConstitution: store.exportConstitution?.bind(store),
    importConstitution: store.importConstitution?.bind(store),
    resetToDefaults: store.resetToDefaults?.bind(store),
    getRandomMantra: store.getRandomMantra?.bind(store),
  })
}