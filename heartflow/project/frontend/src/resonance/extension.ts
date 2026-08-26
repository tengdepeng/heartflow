// ============================================================
// 共鸣协议层 · 扩展接口 (IExtension)
// 定义插件、主题、模板等扩展模块的统一契约
// 不实现具体功能，只定规则
// ============================================================

import type { ResonanceResult, ResonanceEventListener } from './types'

/** 扩展类型 */
export type ExtensionType = 'plugin' | 'style-pack' | 'room-template' | 'interaction-pack' | 'theme' | 'custom'

/** 扩展权限 */
export type ExtensionPermission =
  | 'storage:read'          // 读取存储
  | 'storage:write'         // 写入存储
  | 'navigation'            // 导航
  | 'interaction'           // 交互事件
  | 'notification'          // 通知
  | 'network'               // 网络访问
  | 'ai:chat'               // AI 对话
  | 'ai:config'             // AI 配置
  | 'file:read'             // 文件读取
  | 'file:write'            // 文件写入
  | 'custom'                // 自定义权限

/** 扩展清单 */
export interface ExtensionManifest {
  /** 扩展唯一 ID */
  readonly id: string
  /** 扩展名称 */
  readonly name: string
  /** 扩展版本（语义化版本） */
  readonly version: string
  /** 扩展类型 */
  readonly type: ExtensionType
  /** 扩展描述 */
  readonly description: string
  /** 作者 */
  readonly author: string
  /** 图标（Base64 或 URL） */
  readonly icon?: string
  /** 所需权限列表 */
  readonly permissions: ExtensionPermission[]
  /** 最小平台版本要求 */
  readonly minPlatformVersion?: string
  /** 扩展入口文件 */
  readonly entry?: string
  /** 依赖的其他扩展 ID 列表 */
  readonly dependencies?: string[]
  /** 标签 */
  readonly tags?: string[]
  /** 扩展主页 URL */
  readonly homepage?: string
}

/** 扩展运行时 */
export interface ExtensionRuntime {
  /** 扩展清单 */
  readonly manifest: ExtensionManifest
  /** 是否已启用 */
  enabled: boolean
  /** 安装时间 */
  readonly installedAt: string
  /** 安装来源 */
  readonly source: 'builtin' | 'market' | 'file' | 'url'
  /** 运行时状态 */
  state: 'loading' | 'running' | 'error' | 'disabled'
  /** 错误信息 */
  error?: string
  /** 资源使用统计 */
  resourceUsage?: {
    memory: number
    cpu: number
    storage: number
  }
}

/** 扩展沙箱配置 */
export interface ExtensionSandboxConfig {
  /** 是否启用沙箱 */
  sandboxEnabled: boolean
  /** 允许的网络域名列表（空 = 禁止网络） */
  allowedDomains: string[]
  /** 最大内存使用（MB） */
  maxMemoryMB: number
  /** 最大存储使用（MB） */
  maxStorageMB: number
  /** 是否允许访问 DOM */
  allowDOMAccess: boolean
  /** 是否允许 eval */
  allowEval: boolean
}

/**
 * 扩展接口
 * 所有扩展必须遵守此契约
 */
export interface IExtension {
  /** 获取扩展清单 */
  getManifest(): ExtensionManifest
  /** 初始化扩展 */
  initialize(sandbox: ExtensionSandboxConfig): Promise<ResonanceResult<void>>
  /** 激活扩展 */
  activate(): Promise<ResonanceResult<void>>
  /** 停用扩展 */
  deactivate(): Promise<ResonanceResult<void>>
  /** 卸载扩展 */
  uninstall(): Promise<ResonanceResult<void>>
  /** 获取运行时状态 */
  getRuntime(): ExtensionRuntime
  /** 扩展是否可用 */
  readonly available: boolean
}

/**
 * 扩展管理器接口
 * 管理所有扩展的安装、卸载、启用、禁用
 */
export interface IExtensionManager {
  /** 管理器标识 */
  readonly managerId: string

  // ---- 安装管理 ----
  /** 安装一个扩展 */
  install(manifest: ExtensionManifest, source: ExtensionRuntime['source']): Promise<ResonanceResult<IExtension>>
  /** 卸载一个扩展 */
  uninstall(extensionId: string): Promise<ResonanceResult<void>>
  /** 启用一个扩展 */
  enable(extensionId: string): Promise<ResonanceResult<void>>
  /** 禁用一个扩展 */
  disable(extensionId: string): Promise<ResonanceResult<void>>

  // ---- 查询 ----
  /** 按 ID 获取扩展 */
  getExtension(extensionId: string): IExtension | undefined
  /** 按类型获取扩展 */
  getExtensionsByType(type: ExtensionType): IExtension[]
  /** 获取所有已安装扩展 */
  getAllExtensions(): IExtension[]
  /** 获取所有已启用扩展 */
  getEnabledExtensions(): IExtension[]

  // ---- 沙箱与权限 ----
  /** 获取沙箱配置 */
  getSandboxConfig(): ExtensionSandboxConfig
  /** 更新沙箱配置 */
  updateSandboxConfig(partial: Partial<ExtensionSandboxConfig>): void
  /** 检查扩展是否拥有指定权限 */
  hasPermission(extensionId: string, permission: ExtensionPermission): boolean
  /** 授予扩展额外权限 */
  grantPermission(extensionId: string, permission: ExtensionPermission): ResonanceResult<void>
  /** 撤销扩展权限 */
  revokePermission(extensionId: string, permission: ExtensionPermission): ResonanceResult<void>

  // ---- 事件 ----
  /** 注册扩展生命周期事件监听器 */
  onLifecycleEvent(listener: ResonanceEventListener<{ extensionId: string; event: 'installed' | 'uninstalled' | 'enabled' | 'disabled' | 'error' }>): void
  /** 移除生命周期事件监听器 */
  offLifecycleEvent(listener: ResonanceEventListener<{ extensionId: string; event: 'installed' | 'uninstalled' | 'enabled' | 'disabled' | 'error' }>): void
}

/**
 * 风格包接口
 * 主题/风格包扩展必须遵守此契约
 */
export interface IStylePack {
  /** 获取风格包清单 */
  getManifest(): ExtensionManifest
  /** 应用风格包 */
  apply(): Promise<ResonanceResult<void>>
  /** 移除风格包 */
  remove(): Promise<ResonanceResult<void>>
  /** 获取预览数据 */
  getPreview(): Promise<ResonanceResult<{ colors: Record<string, string>; fonts: Record<string, string>; thumbnail?: string }>>
}

/**
 * 房间模板接口
 * 房间模板扩展必须遵守此契约
 */
export interface IRoomTemplate {
  /** 获取模板清单 */
  getManifest(): ExtensionManifest
  /** 安装房间模板 */
  install(): Promise<ResonanceResult<void>>
  /** 卸载房间模板（房间移除，数据保留） */
  uninstall(): Promise<ResonanceResult<void>>
  /** 获取模板预览数据 */
  getPreview(): Promise<ResonanceResult<{ rooms: Array<{ id: string; name: string; icon: string }>; layout?: unknown }>>
}