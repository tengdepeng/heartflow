// ============================================================
// 插件管理器 · 类型定义
// ============================================================

import type { RoomDomain, RoomGroup } from '../../engine/room-graph'

/** 插件权限级别 */
export type PluginPermission =
  | 'read:current'    // L0: 只读当前上下文
  | 'read:history'    // L1: 可读历史数据
  | 'write:data'      // L2: 可读写数据
  | 'export:data'     // 可导出数据
  | 'network'         // 网络访问（外部 API）
  | 'filesystem'      // 文件系统访问
  | 'read_sessions'   // 读取会话数据
  | 'read_notes'      // 读取笔记数据

/** 插件分级 */
export type PluginTier = 'official' | 'community' | 'experimental'

/** 插件元数据 */
export interface PluginMeta {
  /** 唯一标识 */
  id: string
  /** 显示名称 */
  name: string
  /** 版本号 */
  version: string
  /** 简短描述 */
  description: string
  /** 分级 */
  tier: PluginTier
  /** 作者 */
  author?: string
  /** 所属分类 */
  category: 'timer' | 'note' | 'emotion' | 'health' | 'knowledge' | 'visual' | 'automation' | 'other'
  /** 图标（emoji 或 unicode） */
  icon: string
}

/** 插件对外提供的能力（蓝图 L10612：经能力扩展对话分身） */
export interface PluginCapability {
  /** 能力标识 */
  id: string
  /** 中文名 */
  label: string
  /** 说明 */
  description: string
  /** 对话命中关键词（最长优先） */
  keywords: string[]
  /** 调用该能力所需权限 */
  permission: PluginPermission
}

/** 插件贡献点（可注册进房子的扩展，如 Obsidian manifest 贡献点） */
export interface PluginContribution {
  /** 贡献的房间（注册进房间图与路由，出现在侧栏/星盘/邻接导航） */
  rooms?: PluginRoomContribution[]
}

/** 插件贡献的房间声明（可序列化数据；组件加载器由插件模块另行注册） */
export interface PluginRoomContribution {
  /** 房间 ID（全仓唯一） */
  id: string
  /** 路由路径（如 /plugin-demo，全仓唯一） */
  path: string
  /** 显示名称 */
  name: string
  /** 图标（emoji 或 unicode） */
  icon: string
  /** 主题色（CSS 色值） */
  color: string
  /** 简述 */
  description?: string
  /** 房间组（默认 world；插件房间不进主链路） */
  group?: RoomGroup
  /** 房间领域（侧栏聚合维度；缺省落未分组） */
  domain?: RoomDomain
  /** 邻接房间 ID（可含静态房间，双向可达） */
  adjacentTo?: string[]
  /** 分支来源房间 ID（返回路径回溯用） */
  branchFrom?: string
}

/** 插件声明（安装时公开） */
export interface PluginManifest {
  meta: PluginMeta
  /** 所需权限 */
  permissions: PluginPermission[]
  /** 沙箱配置 */
  sandbox: {
    /** 是否隔离文件系统 */
    isolateFS: boolean
    /** 是否隔离网络 */
    isolateNetwork: boolean
    /** 是否隔离 DOM */
    isolateDOM: boolean
  }
  /** 入口文件（相对路径或模块名） */
  entry: string
  /** 注册的钩子列表 */
  hooks?: string[]
  /** 对外提供的能力清单（供房间经能力注册表调用） */
  capabilities?: PluginCapability[]
  /** 贡献点：注册进房子的扩展（房间/入口等） */
  contributes?: PluginContribution
}

/** 插件运行时状态 */
export interface PluginRuntime {
  /** 插件ID（快捷引用，同 manifest.meta.id） */
  id: string
  /** 插件名称（快捷引用，同 manifest.meta.name） */
  name: string
  /** 插件版本（快捷引用，同 manifest.meta.version） */
  version: string
  manifest: PluginManifest
  /** 是否启用 */
  enabled: boolean
  /** 是否已加载 */
  loaded: boolean
  /** 加载错误信息 */
  loadError?: string
  /** 安装时间 */
  installedAt: string
  /** 插件钩子注册表 */
  hooks: Map<string, any>
  /** 沙箱隔离状态 */
  sandbox: {
    /** 是否隔离文件系统 */
    isolateFS: boolean
    /** 是否隔离网络 */
    isolateNetwork: boolean
    /** 是否隔离 DOM */
    isolateDOM: boolean
  }
  /** 已授予的权限子集（用户可逐项开关；缺省为声明全集） */
  granted?: PluginPermission[]
}

/** 内置核心插件（最小可运行单元） */
export const CORE_PLUGINS: PluginManifest[] = [
  {
    meta: {
      id: 'core-timer',
      name: '基础计时',
      version: '1.0.0',
      description: '番茄钟计时、小憩、自由模式',
      tier: 'official',
      category: 'timer',
      icon: '⏱️',
    },
    permissions: ['read:current', 'write:data'],
    sandbox: { isolateFS: false, isolateNetwork: true, isolateDOM: false },
    entry: 'core:timer',
    capabilities: [
      {
        id: 'start-focus',
        label: '启动专注',
        description: '启动一段专注计时（默认 25 分钟）',
        keywords: ['专注', '开始专注', '番茄钟', '进入专注', '专注计时'],
        permission: 'write:data',
      },
      {
        id: 'start-rest',
        label: '开始休息',
        description: '进入休息 / 安全岛',
        keywords: ['开始休息', '小憩', '歇一会', '休息一下'],
        permission: 'write:data',
      },
    ],
  },
  {
    meta: {
      id: 'core-crystal',
      name: '时间结晶',
      version: '1.0.0',
      description: '专注完成后自动生成结晶',
      tier: 'official',
      category: 'visual',
      icon: '💎',
    },
    permissions: ['read:history', 'write:data'],
    sandbox: { isolateFS: false, isolateNetwork: true, isolateDOM: false },
    entry: 'core:crystal',
    capabilities: [
      {
        id: 'crystal-stats',
        label: '结晶统计',
        description: '查看时间结晶的数量与近况',
        keywords: ['时间结晶', '结晶统计', '多少结晶', '几颗结晶', '攒了多少结晶', '结晶架'],
        permission: 'read:history',
      },
    ],
  },
  {
    meta: {
      id: 'core-canvas',
      name: '心流画布',
      version: '1.0.0',
      description: '结晶可视化心流布局',
      tier: 'official',
      category: 'visual',
      icon: '⊙',
    },
    permissions: ['read:history', 'write:data'],
    sandbox: { isolateFS: false, isolateNetwork: true, isolateDOM: false },
    entry: 'core:canvas',
  },
  {
    meta: {
      id: 'core-breathing',
      name: '介质呼吸',
      version: '1.0.0',
      description: '画布呼吸光晕层',
      tier: 'official',
      category: 'visual',
      icon: '◌',
    },
    permissions: ['read:current'],
    sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: false },
    entry: 'core:breathing',
  },
  {
    meta: {
      id: 'core-constitution',
      name: '心流宪法',
      version: '1.0.0',
      description: '不可变条款 + 弹性宪法管理',
      tier: 'official',
      category: 'other',
      icon: '⚜',
    },
    permissions: ['read:history', 'write:data', 'export:data'],
    sandbox: { isolateFS: false, isolateNetwork: true, isolateDOM: false },
    entry: 'core:constitution',
    capabilities: [
      {
        id: 'lookup-article',
        label: '查宪法条款',
        description: '按编号或浏览心流宪法条款',
        keywords: ['宪法', '宪法条款', '第几条', '宪法第', '不可变条款'],
        permission: 'read:history',
      },
    ],
  },
  {
    meta: {
      id: 'demo-room',
      name: '示例插件房',
      version: '0.1.0',
      description: '插件贡献点演示：经 contributes.rooms 在运行时注册进房子',
      tier: 'experimental',
      category: 'other',
      icon: '🧩',
      author: '心流工坊',
    },
    permissions: ['read:current'],
    sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: false },
    entry: 'core:demo-room',
    contributes: {
      rooms: [
        {
          id: 'demo-room',
          path: '/plugin-demo',
          name: '示例插件房',
          icon: '🧩',
          color: '#8a9ab8',
          description: '插件贡献点最小可行演示 · 由 demo-room 插件在运行时注册',
          group: 'world',
          adjacentTo: ['home-space', 'plugins'],
          branchFrom: 'home-space',
        },
      ],
    },
  },
]

/** 权限的中文描述 */
export const PERMISSION_LABELS: Record<PluginPermission, string> = {
  'read:current': '读取当前上下文',
  'read:history': '读取历史数据',
  'write:data': '写入数据',
  'export:data': '导出数据',
  'network': '网络访问',
  'filesystem': '文件系统访问',
  'read_sessions': '读取会话数据',
  'read_notes': '读取笔记数据',
}