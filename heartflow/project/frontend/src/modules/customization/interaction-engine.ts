// ============================================================
// 殿堂装修工坊 · 交互配置引擎
// 蓝图定义：
//   自定义交互规则配置，定义空间中各元素的交互行为
//   支持手势绑定、点击行为、拖拽行为、悬停效果
//   交互规则可预览、可导出、可分享
// ============================================================

// ---- 交互类型 ----

export type InteractionType = 'tap' | 'double-tap' | 'long-press' | 'drag' | 'hover' | 'swipe' | 'pinch'

export const INTERACTION_LABELS: Record<InteractionType, string> = {
  'tap': '点击',
  'double-tap': '双击',
  'long-press': '长按',
  'drag': '拖拽',
  'hover': '悬停',
  'swipe': '滑动',
  'pinch': '捏合',
}

// ---- 交互动作 ----

export type InteractionAction =
  | 'navigate'
  | 'open-panel'
  | 'toggle'
  | 'play-animation'
  | 'play-sound'
  | 'show-tooltip'
  | 'trigger-event'
  | 'none'

export const ACTION_LABELS: Record<InteractionAction, string> = {
  'navigate': '导航跳转',
  'open-panel': '打开面板',
  'toggle': '切换状态',
  'play-animation': '播放动画',
  'play-sound': '播放音效',
  'show-tooltip': '显示提示',
  'trigger-event': '触发事件',
  'none': '无动作',
}

// ---- 交互规则 ----

export interface InteractionRule {
  id: string
  /** 规则名称 */
  name: string
  /** 触发类型 */
  type: InteractionType
  /** 触发动作 */
  action: InteractionAction
  /** 目标元素（CSS 选择器或元素 ID） */
  target: string
  /** 动作参数 */
  params: Record<string, string>
  /** 是否启用 */
  enabled: boolean
  /** 优先级（0-100，越高越优先） */
  priority: number
  /** 适用场景 */
  scenes: string[]
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

// ---- 交互配置集 ----

export interface InteractionConfig {
  id: string
  /** 配置名称 */
  name: string
  /** 配置描述 */
  description: string
  /** 交互规则列表 */
  rules: InteractionRule[]
  /** 全局设置 */
  settings: InteractionSettings
  /** 是否活跃 */
  active: boolean
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
}

export interface InteractionSettings {
  /** 是否启用手势 */
  gestureEnabled: boolean
  /** 是否启用音效 */
  soundEnabled: boolean
  /** 是否启用动画 */
  animationEnabled: boolean
  /** 动画速度倍率 */
  animationSpeed: number
  /** 触觉反馈 */
  hapticEnabled: boolean
  /** 双击间隔 (ms) */
  doubleTapDelay: number
  /** 长按触发时间 (ms) */
  longPressDuration: number
}

// ---- 默认设置 ----

export const DEFAULT_SETTINGS: InteractionSettings = {
  gestureEnabled: true,
  soundEnabled: true,
  animationEnabled: true,
  animationSpeed: 1.0,
  hapticEnabled: false,
  doubleTapDelay: 300,
  longPressDuration: 800,
}

// ---- 规则管理 ----

/** 创建交互规则 */
export function createRule(
  name: string,
  type: InteractionType,
  action: InteractionAction,
  target: string,
  params: Record<string, string> = {},
  priority: number = 50,
  scenes: string[] = ['*'],
): InteractionRule {
  const now = new Date().toISOString()
  return {
    id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    type,
    action,
    target,
    params,
    enabled: true,
    priority,
    scenes,
    createdAt: now,
    updatedAt: now,
  }
}

/** 创建交互配置 */
export function createConfig(
  name: string,
  description: string = '',
  settings: InteractionSettings = { ...DEFAULT_SETTINGS },
): InteractionConfig {
  const now = new Date().toISOString()
  return {
    id: `icfg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name,
    description,
    rules: [],
    settings,
    active: false,
    createdAt: now,
    updatedAt: now,
  }
}

/** 添加规则到配置 */
export function addRuleToConfig(config: InteractionConfig, rule: InteractionRule): InteractionConfig {
  return {
    ...config,
    rules: [...config.rules, rule],
    updatedAt: new Date().toISOString(),
  }
}

/** 从配置中移除规则 */
export function removeRuleFromConfig(config: InteractionConfig, ruleId: string): InteractionConfig {
  return {
    ...config,
    rules: config.rules.filter(r => r.id !== ruleId),
    updatedAt: new Date().toISOString(),
  }
}

/** 更新规则 */
export function updateRule(rule: InteractionRule, updates: Partial<Pick<InteractionRule, 'name' | 'type' | 'action' | 'target' | 'params' | 'enabled' | 'priority' | 'scenes'>>): InteractionRule {
  return {
    ...rule,
    ...updates,
    updatedAt: new Date().toISOString(),
  }
}

/** 按优先级排序规则 */
export function sortRulesByPriority(rules: InteractionRule[]): InteractionRule[] {
  return [...rules].sort((a, b) => b.priority - a.priority)
}

/** 按场景筛选规则 */
export function filterRulesByScene(rules: InteractionRule[], scene: string): InteractionRule[] {
  return rules.filter(r => r.enabled && (r.scenes.includes('*') || r.scenes.includes(scene)))
}

// ---- 规则冲突检测 ----

export interface RuleConflict {
  ruleA: InteractionRule
  ruleB: InteractionRule
  /** 冲突原因 */
  reason: string
}

/** 检测规则冲突（同类型+同目标） */
export function detectConflicts(rules: InteractionRule[]): RuleConflict[] {
  const conflicts: RuleConflict[] = []
  const seen = new Set<string>()

  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const a = rules[i]
      const b = rules[j]
      const key = [a.id, b.id].sort().join('::')

      if (seen.has(key)) continue

      if (a.type === b.type && a.target === b.target && a.enabled && b.enabled) {
        seen.add(key)
        conflicts.push({
          ruleA: a,
          ruleB: b,
          reason: `同类型「${INTERACTION_LABELS[a.type]}」在目标「${a.target}」上冲突`,
        })
      }
    }
  }

  return conflicts
}

// ---- 导出/导入 ----

/** 导出交互配置为 JSON */
export function exportConfig(config: InteractionConfig): string {
  return JSON.stringify({
    version: 1,
    name: config.name,
    description: config.description,
    rules: config.rules.map(r => ({
      name: r.name,
      type: r.type,
      action: r.action,
      target: r.target,
      params: r.params,
      priority: r.priority,
      scenes: r.scenes,
    })),
    settings: config.settings,
  }, null, 2)
}

/** 导入交互配置 */
export function importConfig(json: string, name?: string): InteractionConfig | null {
  try {
    const data = JSON.parse(json)
    if (data.version !== 1) return null

    const config = createConfig(
      name || data.name || '导入配置',
      data.description || '',
      data.settings || { ...DEFAULT_SETTINGS },
    )

    const rules: InteractionRule[] = (data.rules || []).map((r: any) =>
      createRule(r.name, r.type, r.action, r.target, r.params || {}, r.priority || 50, r.scenes || ['*']),
    )

    return { ...config, rules }
  } catch {
    return null
  }
}