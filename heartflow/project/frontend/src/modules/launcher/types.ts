// ============================================================
// Launcher · 外部应用条目数据模型
// 仅描述「入口」，不嵌入任何外部 App 窗口（桌面原生程序无法嵌 webview）。
// ============================================================

export interface ExternalAppEntry {
  /** 稳定 id（自生成，非用户输入） */
  id: string
  /** 显示名，如「网易云音乐」 */
  name: string
  /** emoji 或本地图标路径 */
  icon: string
  /** 用户自建分类，如「音乐」「支付」「办公」 */
  category: string
  /** 启动方式：可执行路径（.exe/.app）或 URI scheme（weixin://…） */
  launch: string
  /** 可选：深链 URI，如 orpheus://playlist/{id} */
  deepLink?: string
  /** 优先用 deepLink 还是 launch */
  useDeepLink: boolean
  /** 排序权重（小在前） */
  sort: number
  /** 最近一次启动时间（ISO） */
  lastLaunchedAt?: string
  /** 累计启动次数 */
  launchCount: number
}

/** 新增 / 编辑表单的可变字段（id 与计数由引擎托管） */
export interface EntryInput {
  name: string
  icon: string
  category: string
  launch: string
  deepLink?: string
  useDeepLink: boolean
}
