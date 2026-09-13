// ============================================================
// 插件管理器 · 类型定义
// ============================================================

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