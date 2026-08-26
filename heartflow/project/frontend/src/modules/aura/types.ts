// ============================================================
// AuraLayer · 类型定义
// 桌面美化层（透明常驻浮层 + 多元氛围主题）
// ============================================================

/** 六大氛围主题 id */
export type AuraThemeId =
  | 'starmap'      // 星图（复用星盘视觉）
  | 'breath'       // 呼吸球（镜我静息态）
  | 'fluid'        // 流体实时壁纸
  | 'clock-quote'  // 时钟 + 每日一言
  | 'solar'        // 节气 / 时光胶囊 ambient
  | 'minimal'      // 极简留白（仅一缕微光）

/** 每主题暴露的可定制项（用户可调，持久化进 themeOverrides） */
export interface AuraThemeOverride {
  /** 主色 hex，如 #d4a574 */
  accent?: string
  /** 密度 0–100（节点 / 粒子数量感） */
  density?: number
  /** 动效速度 0.5–2 */
  speed?: number
  /** 是否显示时钟（clock-quote 等主题生效） */
  showClock?: boolean
  /** 是否显示名言（clock-quote 主题生效） */
  showQuote?: boolean
}

/** 主题元数据（注册表） */
export interface AuraThemeMeta {
  id: AuraThemeId
  name: string
  description: string
  defaults: Required<AuraThemeOverride>
}
