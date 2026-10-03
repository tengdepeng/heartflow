// ============================================================
// 组件市场 · 组合式桥接层（INCR-435）
// ------------------------------------------------------------
// 背景：component-market/index.ts 是一套纯函数注册表（含 13 个内置
// 组件、install/uninstall/toggle/update/search、分类元数据），但注册表
// 驻留在内存 Map 中，既非响应式也不持久化；ComponentMarket.vue 此前用
// 视图内硬编码的假组件列表顶替，导致：
//   ① 引擎 13 个组件中的 sankey / timeline / stats-card 从未露面；
//   ② 启用态与 config 弹窗的改动只写本地 ref，刷新即丢。
// 本组合式把「注册表 → 响应式 + 持久化」这一段补齐，视图只消费这里。
// 引擎纯函数保持不动，以免波及 component-market 的既有单测。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../../engine/storage'
import {
  getComponent,
  getAllComponents,
  getComponentsByCategory,
  getInstalledComponents,
  getComponentCount,
  getInstalledCount,
  getCategoryDisplay,
  initBuiltinComponents,
  searchComponents,
  toggleComponent,
  installComponent,
  uninstallComponent,
  updateComponent,
  type ComponentMarketItem,
  type ComponentUpdates,
} from './index'

/** 组件启用态 / 视觉配置的持久化键（kvStore 子键） */
export const MARKET_STORAGE_KEY = 'hf:viz_component_market'

/** 可持久化的字段集合 */
export type ComponentOverrides = Partial<
  Pick<ComponentMarketItem, 'enabled' | 'size' | 'showLegend' | 'showGrid' | 'animated'>
>

/** 分类筛选标签（含「全部」这一 UI 合成项） */
export interface ComponentCategoryTab {
  key: string
  icon: string
  label: string
}

export type ComponentCategoryKey = ComponentMarketItem['category']

/**
 * 确保注册表已播种内置组件。
 * 以「注册表是否为空」为准而非一次性标志——引擎的 clearRegistry()
 * （测试常用）清空后本函数能自愈重新播种。
 */
function ensureSeeded(): void {
  if (getComponentCount() === 0) initBuiltinComponents()
}

/** 读持久化覆盖项 */
function loadOverrides(): Record<string, ComponentOverrides> {
  const saved = storage.getKV<Record<string, ComponentOverrides>>(MARKET_STORAGE_KEY, {})
  return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
}

/** 把持久化覆盖项回填进内存注册表 */
function applyOverrides(): void {
  const saved = loadOverrides()
  for (const [id, ov] of Object.entries(saved)) {
    if (!ov || typeof ov !== 'object') continue
    const item = getComponent(id)
    if (!item) continue
    if (ov.enabled !== undefined) item.enabled = ov.enabled
    if (ov.size !== undefined) item.size = ov.size
    if (ov.showLegend !== undefined) item.showLegend = ov.showLegend
    if (ov.showGrid !== undefined) item.showGrid = ov.showGrid
    if (ov.animated !== undefined) item.animated = ov.animated
  }
}

/** 落盘当前全部状态 */
function persistAll(): void {
  const out: Record<string, ComponentOverrides> = {}
  for (const c of getAllComponents()) {
    out[c.id] = {
      enabled: c.enabled,
      size: c.size,
      showLegend: c.showLegend,
      showGrid: c.showGrid,
      animated: c.animated,
    }
  }
  storage.setKV(MARKET_STORAGE_KEY, out)
}

/**
 * 组件市场组合式。
 *
 * 注册表是内存态非响应式结构，故本组合式以一个 `revision` 计数器驱动
 * computed 重算；所有写操作（toggle / install / uninstall / update）
 * 统一走 `commit()` —— 落盘 + 自增 revision，保证 UI 与 kvStore 同步。
 */
export function useComponentMarket() {
  const revision = ref(0)

  ensureSeeded()
  applyOverrides()

  /** 自增修订号，标记注册表已变更 */
  function commit(): void {
    persistAll()
    revision.value += 1
  }

  /** 全部组件（含未启用） */
  const components = computed<ComponentMarketItem[]>(() => {
    void revision.value
    return getAllComponents()
  })

  /** 分类标签：引擎 meta + UI 合成的「全部」 */
  const categories = computed<ComponentCategoryTab[]>(() => [
    { key: 'all', icon: '◈', label: '全部' },
    ...Object.entries(getCategoryDisplay()).map(([key, meta]) => ({
      key,
      icon: meta.icon,
      label: meta.label,
    })),
  ])

  const totalCount = computed<number>(() => {
    void revision.value
    return getComponentCount()
  })

  const installedCount = computed<number>(() => {
    void revision.value
    return getInstalledCount()
  })

  const installed = computed<ComponentMarketItem[]>(() => {
    void revision.value
    return getInstalledComponents()
  })

  /** 按分类取组件（'all' 返回全部） */
  function listByCategory(category: string): ComponentMarketItem[] {
    void revision.value
    if (category === 'all') return getAllComponents()
    return getComponentsByCategory(category as ComponentCategoryKey)
  }

  /** 关键字搜索（名称/描述/id/标签/分类） */
  function search(query: string): ComponentMarketItem[] {
    void revision.value
    return searchComponents(query)
  }

  /** 取单个组件（快照语义，供 config 弹窗编辑副本） */
  function find(id: string): ComponentMarketItem | undefined {
    void revision.value
    return getComponent(id)
  }

  /** 切换启用态，返回切换后的状态（组件不存在返回 undefined） */
  function toggle(id: string): boolean | undefined {
    const next = toggleComponent(id)
    if (next !== undefined) commit()
    return next
  }

  /** 显式启用 */
  function install(id: string): boolean {
    const ok = installComponent(id)
    if (ok) commit()
    return ok
  }

  /** 显式停用 */
  function uninstall(id: string): boolean {
    const ok = uninstallComponent(id)
    if (ok) commit()
    return ok
  }

  /**
   * 更新组件视觉配置。
   * 注意：引擎的 ComponentUpdates 不含 enabled（启用态由 install/uninstall/toggle
   * 三条语义化入口负责），这里同样不接受 enabled，避免两套入口语义打架。
   */
  function update(id: string, updates: ComponentUpdates): ComponentMarketItem | undefined {
    const next = updateComponent(id, updates)
    if (next) commit()
    return next
  }

  return {
    // 响应式数据
    components,
    categories,
    totalCount,
    installedCount,
    installed,
    // 读取
    listByCategory,
    search,
    find,
    // 写入
    toggle,
    install,
    uninstall,
    update,
  }
}
