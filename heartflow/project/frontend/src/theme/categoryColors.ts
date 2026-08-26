// ============================================================
// 数据分类色 · 暖琥珀同温层（单一事实源）
// ------------------------------------------------------------
// 设计约束（见 DESIGN.md §2 / §7）：
//   - 琥珀 --accent 是唯一年品牌色；青/蓝/紫仅作「低饱和」语义/图表点缀。
//   - 所有「区分数据类别」的色板（图表/标签/分支/聚类/成员）必须收敛到
//     暖色温、低-中饱和、与琥珀调和，杜绝 AI-slop（亮粉/亮蓝/亮紫/亮青）。
// 本文件定义的 CATEGORY_PALETTE 即为该同温层；
// 旧代码中散落的 Tailwind 默认亮色（#f472b6/#8b5cf6/#38bdf8/#4f8cff/#7c5cfc…）
// 应迁移到此处，避免各自硬编码。
// 注：图表在运行时需要具体 hex 字符串，故此处用字面量而非 CSS 变量。
// ============================================================

/**
 * 暖琥珀同温层 · 数据分类调色板（16 色，互异且暗底 #0d0b09 可读）
 * 顺序经验序排列：琥珀主 → 浅琥珀 → 古铜 → 赭石 → 赤陶 → 陶土玫 →
 * 烟玫 → 雾紫 → 暖鼠尾草 → 雾青绿 → 雾青 → 雾蓝 → 暖金 → 焦糖 → 暖锈 → 橄榄金
 */
export const CATEGORY_PALETTE: string[] = [
  '#d4a574', // 0  琥珀（--accent）
  '#e8c8a0', // 1  浅琥珀
  '#c89060', // 2  古铜
  '#e0a96d', // 3  赭石
  '#cf8b6b', // 4  赤陶
  '#d98c7a', // 5  陶土玫
  '#b5707a', // 6  烟玫
  '#a07c8c', // 7  雾紫（--accent-purple）
  '#8a9a7a', // 8  暖鼠尾草
  '#7a9a8a', // 9  雾青绿
  '#5ab8a0', // 10 雾青（--accent-cyan）
  '#6b9fc4', // 11 雾蓝（--accent-blue）
  '#f0c040', // 12 暖金（--warning）
  '#c4956a', // 13 焦糖
  '#c46a5a', // 14 暖锈（red 的暖替代）
  '#b89a6a', // 15 橄榄金
]

export const CATEGORY_COLOR_COUNT = CATEGORY_PALETTE.length

/** 按索引取色（自动取模，循环安全） */
export function categoryColor(index: number): string {
  const i = ((index % CATEGORY_COLOR_COUNT) + CATEGORY_COLOR_COUNT) % CATEGORY_COLOR_COUNT
  return CATEGORY_PALETTE[i]
}

/**
 * 旧亮色 → 暖琥珀同温层 映射表（仅供迁移参考 / 文档 / 测试断言）
 * 覆盖本项目散落的高频离调色板 Tailwind 默认亮色。
 */
export const LEGACY_CATEGORY_COLORS: Record<string, string> = {
  '#7c5cfc': '#a07c8c',
  '#4f8cff': '#6b9fc4',
  '#06b6d4': '#5ab8a0',
  '#8b5cf6': '#a07c8c',
  '#34d399': '#8a9a7a',
  '#10b981': '#8a9a7a',
  '#fbbf24': '#e0a96d',
  '#36d6e7': '#5ab8a0',
  '#fb923c': '#cf8b6b',
  '#f472b6': '#d98c7a',
  '#f59e0b': '#e0a96d',
  '#ef4444': '#c46a5a',
  '#7c6cf0': '#a07c8c',
  '#60a5fa': '#6b9fc4',
  '#a78bfa': '#b5707a',
  '#6c9cf5': '#6b9fc4',
  '#ffd700': '#f0c040',
  '#f6b26b': '#cf8b6b',
  '#818cf8': '#a07c8c',
  '#38bdf8': '#6b9fc4',
  '#7c9cff': '#6b9fc4',
  '#ec4899': '#d98c7a',
  '#a855f7': '#a07c8c',
  '#3b82f6': '#6b9fc4',
  '#06d6a0': '#5ab8a0',
  '#118ab2': '#6b9fc4',
  '#e63946': '#c46a5a',
  '#a8dadc': '#a8c4c0',
  '#457b9d': '#6b9fc4',
  '#1d3557': '#2a3540',
  '#2a9d8f': '#5ab8a0',
}

/** 将任意旧亮色收敛到暖同温层（无映射则原样返回） */
export function warmCategoryColor(legacy: string): string {
  return LEGACY_CATEGORY_COLORS[legacy.toLowerCase()] ?? legacy
}
