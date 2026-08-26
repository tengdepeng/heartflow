// ============================================================
// 殿堂触角 · 桌面小组件管理器
// 管理桌面小组件的创建、布局、启用/禁用
// ============================================================

import { ref, computed } from 'vue'
import type { WidgetInstance, WidgetType, WidgetSize } from './types'
import { WIDGET_META, TOUCHPOINTS_STORAGE_KEYS } from './types'
import { storage } from '../../engine/storage'

/** 生成唯一 ID */
function generateId(): string {
  return `widget_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

/** 从存储加载小组件列表 */
function loadWidgets(): WidgetInstance[] {
  try {
    const raw = storage.getKV<string>(TOUCHPOINTS_STORAGE_KEYS.widgets, '[]')
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // 数据损坏时返回空数组
  }
  return []
}

/** 持久化小组件列表 */
function saveWidgets(widgets: WidgetInstance[]): void {
  storage.setKV(TOUCHPOINTS_STORAGE_KEYS.widgets, JSON.stringify(widgets))
}

/** 响应式小组件列表 */
const widgets = ref<WidgetInstance[]>(loadWidgets())

/** 已启用的小组件 */
const enabledWidgets = computed(() => widgets.value.filter(w => w.enabled))

/** 按类型分组的小组件 */
const widgetsByType = computed(() => {
  const map = new Map<WidgetType, WidgetInstance[]>()
  for (const w of widgets.value) {
    const list = map.get(w.type) || []
    list.push(w)
    map.set(w.type, list)
  }
  return map
})

export function useWidgetManager() {
  /** 添加小组件 */
  function addWidget(
    type: WidgetType,
    options?: Partial<Pick<WidgetInstance, 'x' | 'y' | 'size' | 'customTitle'>>,
  ): WidgetInstance {
    const meta = WIDGET_META[type]
    const instance: WidgetInstance = {
      id: generateId(),
      type,
      x: options?.x ?? 68,
      y: options?.y ?? 10,
      size: options?.size ?? meta.defaultSize,
      enabled: true,
      createdAt: Date.now(),
      customTitle: options?.customTitle,
    }
    widgets.value = [...widgets.value, instance]
    saveWidgets(widgets.value)
    return instance
  }

  /** 移除小组件 */
  function removeWidget(id: string): boolean {
    const index = widgets.value.findIndex(w => w.id === id)
    if (index === -1) return false
    widgets.value = widgets.value.filter(w => w.id !== id)
    saveWidgets(widgets.value)
    return true
  }

  /** 更新小组件位置 */
  function updatePosition(id: string, x: number, y: number): boolean {
    const widget = widgets.value.find(w => w.id === id)
    if (!widget) return false
    widget.x = Math.max(0, Math.min(100, x))
    widget.y = Math.max(0, Math.min(100, y))
    widgets.value = [...widgets.value]
    saveWidgets(widgets.value)
    return true
  }

  /** 更新小组件尺寸 */
  function updateSize(id: string, size: WidgetSize): boolean {
    const widget = widgets.value.find(w => w.id === id)
    if (!widget) return false
    widget.size = size
    widgets.value = [...widgets.value]
    saveWidgets(widgets.value)
    return true
  }

  /** 切换小组件启用状态 */
  function toggleWidget(id: string): boolean {
    const widget = widgets.value.find(w => w.id === id)
    if (!widget) return false
    widget.enabled = !widget.enabled
    widgets.value = [...widgets.value]
    saveWidgets(widgets.value)
    return widget.enabled
  }

  /** 启用/禁用小组件 */
  function setWidgetEnabled(id: string, enabled: boolean): boolean {
    const widget = widgets.value.find(w => w.id === id)
    if (!widget) return false
    widget.enabled = enabled
    widgets.value = [...widgets.value]
    saveWidgets(widgets.value)
    return true
  }

  /** 获取单个小组件 */
  function getWidget(id: string): WidgetInstance | undefined {
    return widgets.value.find(w => w.id === id)
  }

  /** 获取指定类型的小组件 */
  function getWidgetsByType(type: WidgetType): WidgetInstance[] {
    return widgets.value.filter(w => w.type === type)
  }

  /** 重置所有小组件为默认布局 */
  function resetToDefault(): WidgetInstance[] {
    const defaults: WidgetInstance[] = [
      {
        id: generateId(),
        type: 'pomodoro',
        x: 68, y: 10,
        size: 'small',
        enabled: true,
        createdAt: Date.now(),
      },
      {
        id: generateId(),
        type: 'daily-anchor',
        x: 68, y: 30,
        size: 'medium',
        enabled: true,
        createdAt: Date.now(),
      },
      {
        id: generateId(),
        type: 'emotion-check',
        x: 68, y: 55,
        size: 'small',
        enabled: true,
        createdAt: Date.now(),
      },
      {
        id: generateId(),
        type: 'quote',
        x: 68, y: 68,
        size: 'small',
        enabled: true,
        createdAt: Date.now(),
      },
    ]
    widgets.value = defaults
    saveWidgets(widgets.value)
    return defaults
  }

  /** 获取网格布局建议 */
  function suggestLayout(): { x: number; y: number } {
    const taken = widgets.value.map(w => ({ x: w.x, y: w.y }))
    // 尝试在右侧列从上到下找空位
    const rightColumn = [
      { x: 68, y: 10 },
      { x: 68, y: 30 },
      { x: 68, y: 50 },
      { x: 68, y: 70 },
    ]
    for (const pos of rightColumn) {
      const occupied = taken.some(
        t => Math.abs(t.x - pos.x) < 5 && Math.abs(t.y - pos.y) < 5,
      )
      if (!occupied) return pos
    }
    // 默认放在右下角
    return { x: 68, y: 85 }
  }

  return {
    widgets,
    enabledWidgets,
    widgetsByType,
    addWidget,
    removeWidget,
    updatePosition,
    updateSize,
    toggleWidget,
    setWidgetEnabled,
    getWidget,
    getWidgetsByType,
    resetToDefault,
    suggestLayout,
  }
}