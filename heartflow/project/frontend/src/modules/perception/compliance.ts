/**
 * 感知层 · 宪法合规控制
 *
 * 约束来源：
 * - 第1条「本地私有」：所有采集数据仅存本地，不经过任何外部服务
 * - 第2条「超级自定义」：用户可关闭任意采集项
 * - 第4条「数据驱动自我探索」：仅呈现事实，不进行评判性标注
 * - 第52条「沉默的默认」：所有新增采集项默认关闭，用户需主动开启
 *
 * 设计原则：
 * - 可关闭的采集项默认全部关闭（沉默的默认）
 * - 不可关闭的采集项是系统基础功能依赖（时段/暗色/网络）
 * - 健康数据仅存脱敏趋势摘要，不存原始数值
 */

// ---- 采集项分类 ----

/** 可被用户关闭的采集项 */
export const USER_CONFIGURABLE_ITEMS = [
  'battery',
  'ambientLight',
  'screenAwake',
  'activeWindow',
  'healthData',
  // #84 应用空间+感知层 · 本地注意力/数字健康（默认关闭，沉默的默认）
  'attention',
] as const

export type ConfigurablePerceptionItem = (typeof USER_CONFIGURABLE_ITEMS)[number]

/** 不可关闭的采集项（系统基础功能依赖） */
export const ALWAYS_ON_ITEMS = [
  'timeOfDay',
  'isDark',
  'isOnline',
  'deviceIdle',
] as const

// ---- 存储键 ----

export const PERCEPTION_STORAGE_KEYS: Record<ConfigurablePerceptionItem, string> = {
  battery: 'hf:permission:perception:battery',
  ambientLight: 'hf:permission:perception:ambient-light',
  screenAwake: 'hf:permission:perception:screen-awake',
  activeWindow: 'hf:permission:perception:active-window',
  healthData: 'hf:permission:perception:health',
  // #84 应用空间+感知层 · 本地注意力/数字健康
  attention: 'hf:permission:perception:attention',
}

// ---- 合规检查 ----

/**
 * 检查某采集项是否被用户允许。
 * 默认全部关闭（第52条"沉默的默认"），只有明确设为 'true' 时才开启。
 */
export function isPerceptionAllowed(item: ConfigurablePerceptionItem): boolean {
  try {
    const key = PERCEPTION_STORAGE_KEYS[item]
    const stored = localStorage.getItem(key)
    return stored === 'true'
  } catch {
    return false
  }
}

/**
 * 设置某采集项的开关状态。
 * @param item 采集项
 * @param allowed 是否允许
 */
export function setPerceptionAllowed(item: ConfigurablePerceptionItem, allowed: boolean): void {
  try {
    const key = PERCEPTION_STORAGE_KEYS[item]
    localStorage.setItem(key, allowed ? 'true' : 'false')
  } catch {
    // localStorage 不可用（如隐私模式配额耗尽）→ 静默失败
  }
}

/**
 * 获取所有可配置采集项的当前状态。
 * 返回一个映射，key 为采集项标识，value 为是否已开启。
 */
export function getAllPerceptionPermissions(): Record<ConfigurablePerceptionItem, boolean> {
  const result = {} as Record<ConfigurablePerceptionItem, boolean>
  for (const item of USER_CONFIGURABLE_ITEMS) {
    result[item] = isPerceptionAllowed(item)
  }
  return result
}

/**
 * 重置所有采集项权限为默认值（全部关闭）。
 * 用于用户"恢复默认设置"场景。
 */
export function resetPerceptionPermissions(): void {
  for (const item of USER_CONFIGURABLE_ITEMS) {
    setPerceptionAllowed(item, false)
  }
}