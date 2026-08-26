// ============================================================
// 数据主权与遗忘退场 · 类型定义
// ============================================================

/** 5 种遗忘方法 */
export type ForgetMethod =
  | 'natural-aging'    // 自然老化：数据随时间自然淡化（标记 + 渐进衰减）
  | 'seal'             // 封存：加密封存归档
  | 'release'          // 释放：物理删除，永久消失
  | 'hibernate'        // 休眠：压缩休眠，可恢复
  | 'forgetting-ritual' // 遗忘仪式：视觉化删除（粒子消散动画）

/** 遗忘方法元信息 */
export interface ForgetMethodInfo {
  id: ForgetMethod
  label: string
  icon: string
  description: string
  /** 是否可逆（可恢复） */
  reversible: boolean
  /** 是否需要确认仪式 */
  needsRitual: boolean
}

/** 6 种大厅退出状态 */
export type HallExitState =
  | 'peaceful'        // 平和：平静退出
  | 'satisfied'       // 满足：满足退出
  | 'contemplative'   // 沉思：沉思退出
  | 'unfinished'      // 未竟：未完成退出
  | 'transformative'  // 蜕变：蜕变退出
  | 'cyclical'        // 循环：循环退出

/** 退出状态元信息 */
export interface HallExitStateInfo {
  id: HallExitState
  label: string
  icon: string
  poem: string
  description: string
  color: string
  /** 过渡动画时长（ms） */
  transitionDuration: number
}

/** 遗忘操作记录 */
export interface ForgettingRecord {
  id: string
  moduleKey: string
  moduleName: string
  method: ForgetMethod
  timestamp: number
  /** 受影响的数据项数 */
  affectedCount: number
  /** 释放的数据大小（字节） */
  freedBytes: number
  /** 是否可恢复（仅 seal/hibernate 可恢复） */
  recoverable: boolean
  /** 恢复截止时间戳（仅 seal/hibernate） */
  recoverableUntil?: number
}

/** 数据主权配置 */
export interface DataSovereigntyConfig {
  /** 默认遗忘方法 */
  defaultForgetMethod: ForgetMethod
  /** 自然老化周期（天） */
  naturalAgingDays: number
  /** 封存保留期（天） */
  sealRetentionDays: number
  /** 休眠保留期（天） */
  hibernateRetentionDays: number
  /** 遗忘记录保留期（天） */
  forgettingRecordRetentionDays: number
  /** 是否启用仪式动画 */
  ritualAnimationEnabled: boolean
  /** 大厅退出状态偏好 */
  preferredExitState: HallExitState
  /** 退出时是否显示过渡动画 */
  exitTransitionEnabled: boolean
}

/** 自然老化标记 */
export interface AgingMark {
  moduleKey: string
  lastAccessedAt: number
  decayLevel: number // 0-100, 越高表示越接近遗忘
  createdAt: number
}

/** 封存数据 */
export interface SealedData {
  id: string
  moduleKey: string
  data: Record<string, any>
  sealedAt: number
  encrypted: boolean
  expiresAt: number
}

/** 休眠数据 */
export interface HibernatedData {
  id: string
  moduleKey: string
  compressedSize: number
  originalSize: number
  hibernatedAt: number
  expiresAt: number
  data: Record<string, any>
}

/** 遗忘仪式阶段 */
export type RitualPhase =
  | 'idle'
  | 'dissolving'    // 粒子消散中
  | 'fading'        // 渐隐中
  | 'fragmenting'   // 碎片化中
  | 'complete'      // 完成

/** 遗忘仪式配置 */
export interface RitualConfig {
  phase: RitualPhase
  duration: number
  particleCount: number
  onComplete?: () => void
}

/** 遗忘退场结果 */
export interface ForgetResult {
  success: boolean
  moduleKey: string
  moduleName: string
  method: ForgetMethod
  affectedCount: number
  freedBytes: number
  record: ForgettingRecord
  error?: string
}

// ---- 数据引渡仪式 ----

/** 引渡阶段 */
export type ExtraditionPhase =
  | 'idle'
  | 'preparing'     // 准备中：选择模块、加密密钥
  | 'packaging'     // 打包中：序列化 + 压缩 + 签名
  | 'transferring'  // 传输中：生成传输码/二维码
  | 'verifying'     // 验证中：校验完整性
  | 'completed'     // 完成
  | 'failed'        // 失败

/** 引渡包清单 */
export interface ExtraditionManifest {
  /** 包 ID */
  packageId: string
  /** 源设备标识 */
  sourceDevice: string
  /** 创建时间 */
  createdAt: number
  /** 包含的模块列表 */
  modules: ExtraditionModule[]
  /** 数据摘要（SHA-256 模拟） */
  checksum: string
  /** 加密方式 */
  encryption: 'aes-256' | 'none'
  /** 版本号 */
  version: string
  /** 引渡密码（6位数字） */
  passcode: string
}

/** 引渡模块 */
export interface ExtraditionModule {
  moduleKey: string
  moduleName: string
  itemCount: number
  sizeBytes: number
  /** 是否包含敏感数据 */
  sensitive: boolean
}

/** 引渡包 */
export interface ExtraditionPackage {
  manifest: ExtraditionManifest
  /** 加密后的数据负载 */
  payload: string
  /** 传输码（用于接收端导入） */
  transferCode: string
  /** 失效时间 */
  expiresAt: number
}

/** 引渡仪式状态 */
export interface ExtraditionState {
  phase: ExtraditionPhase
  progress: number // 0-100
  currentModule: string
  packageId: string | null
  transferCode: string | null
  error: string | null
}

/** 引渡进度回调 */
export interface ExtraditionCallbacks {
  onPhaseChange?: (phase: ExtraditionPhase) => void
  onProgress?: (progress: number, currentModule: string) => void
  onComplete?: (pkg: ExtraditionPackage) => void
  onError?: (error: string) => void
}

// ---- 跨端接续 ----

/** 设备信息 */
export interface DeviceInfo {
  id: string
  name: string
  type: 'desktop' | 'laptop' | 'tablet' | 'phone' | 'other'
  os: string
  lastSeenAt: number
  trusted: boolean
}

/** 接续会话 */
export interface ContinuitySession {
  sessionId: string
  sourceDevice: DeviceInfo
  targetDevice: DeviceInfo | null
  /** 会话令牌 */
  token: string
  /** 会话状态 */
  status: 'waiting' | 'paired' | 'transferring' | 'completed' | 'expired' | 'cancelled'
  /** 当前房间 */
  currentRoom: string
  /** 当前路由 */
  currentRoute: string
  /** 应用状态快照（房间/路由等轻量接续上下文） */
  stateSnapshot: Record<string, any>
  /**
   * 源端导出的完整数据负载（data-port 全量 JSON 字符串）
   * 真实跨端传输时由目标端经 dataPort.importJSON 回写本地存储，
   * 取代原先的模拟传输动画。
   */
  payload?: string
  createdAt: number
  expiresAt: number
  pairedAt: number | null
  completedAt: number | null
}

/** 接续配置 */
export interface ContinuityConfig {
  /** 是否启用跨端接续 */
  enabled: boolean
  /** 会话有效期（分钟） */
  sessionTTLMinutes: number
  /** 是否自动发现设备 */
  autoDiscover: boolean
  /** 是否保留状态快照 */
  preserveState: boolean
  /** 最大历史会话数 */
  maxHistorySessions: number
}