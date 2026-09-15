// 命令面板 · 命令项类型
// 房间 / 页面 / 动作 三类统一抽象，供 CommandPalette.vue 渲染与模糊检索。

export type CommandKind = 'room' | 'page' | 'action'

export interface CommandItem {
  /** 全局唯一 id（用于 listbox option 的 id 与 aria） */
  id: string
  kind: CommandKind
  /** 主展示名（房间名 / 页面标题 / 动作名） */
  label: string
  /** 检索用关键词（id、path、别名等），不参与展示 */
  keywords?: string
  /** 右侧辅助信息（如路由 path、快捷键），可选 */
  hint?: string
  /** 选中并回车 / 点击时执行 */
  run: () => void
}
