// ============================================================
// 插件市场 · 市场源注册表（市场源单一数据源）
// 替代视图内硬编码的可安装插件列表；提供市场条目、分类统计、
// 关键词搜索与分类筛选，便于后续批次接入远程市场源与真实下载数。
// ============================================================

import type { PluginMeta, PluginManifest } from './types'
import type { PluginDependency } from './plugin-marketplace'

/** 依赖声明的快捷构造（可选演化为具名常量） */
function dep(pluginId: string, minVersion: string, optional = false, description = ''): PluginDependency {
  return { pluginId, minVersion, optional, description }
}

/** 插件分类 ID（与 PluginMeta.category 对齐） */
export type PluginCategoryId = PluginMeta['category']

/** 市场分类（含中文标签与计数） */
export interface MarketplaceCategory {
  /** 分类 ID */
  id: PluginCategoryId
  /** 中文标签 */
  label: string
  /** 该分类下的市场插件数 */
  count: number
}

/** 市场条目（注册表内的可安装插件） */
export interface MarketplaceEntry {
  /** 插件声明（可直接交给 installPlugin 安装） */
  manifest: PluginManifest
  /** 统计下载量（供市场排名/热度展示；占位真实数据源） */
  downloads: number
  /** 社区评分 1-5 */
  rating: number
  /** 检索标签（搜索命中用） */
  tags: string[]
  /** 依赖声明（依赖解析引擎消费；缺省为无依赖） */
  dependencies?: PluginDependency[]
}

/** 分类中文标签（市场源单一真相） */
export const CATEGORY_LABELS: Record<PluginCategoryId, string> = {
  timer: '计时',
  note: '笔记',
  emotion: '情绪',
  health: '健康',
  knowledge: '知识',
  visual: '视觉',
  automation: '自动化',
  other: '其他',
}

/** 分类顺序（用于筛选栏排序） */
export const CATEGORY_ORDER: PluginCategoryId[] = [
  'timer', 'note', 'emotion', 'health', 'knowledge', 'visual', 'automation', 'other',
]

// ============================================================
// 市场源：社区可安装插件目录
// ============================================================

/** 社区市场目录（静态注册表；后续批次可替换为远程拉取） */
const MARKETPLACE_SOURCE: MarketplaceEntry[] = [
  {
    manifest: {
      meta: {
        id: 'community-pomodoro-stats',
        name: '番茄钟统计',
        version: '1.2.0',
        description: '高级番茄钟数据统计，包含周报、月报和趋势图表',
        author: '心流工坊',
        tier: 'community',
        category: 'timer',
        icon: '🍅',
      },
      permissions: ['read:history', 'read:current'],
      sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: false },
      entry: 'community:pomodoro-stats',
      hooks: [],
    },
    downloads: 12830,
    rating: 4.8,
    tags: ['番茄钟', '统计', '报告', '图表'],
  },
  {
    manifest: {
      meta: {
        id: 'community-daily-review',
        name: '每日回顾',
        version: '0.8.0',
        description: '每日结束时自动生成回顾卡片，汇总当日专注与情绪',
        author: '心流工坊',
        tier: 'community',
        category: 'note',
        icon: '📋',
      },
      permissions: ['read:history', 'read:current', 'write:data'],
      sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: false },
      entry: 'community:daily-review',
      hooks: [],
      contributes: {
        rooms: [
          {
            id: 'daily-review-room',
            path: '/daily-review',
            name: '每日回顾房',
            icon: '📋',
            color: '#a3b8cc',
            description: '社区插件「每日回顾」贡献的房间 · 汇总当日专注与情绪',
            group: 'world',
            adjacentTo: ['home-space', 'plugins'],
            branchFrom: 'home-space',
          },
        ],
      },
    },
    dependencies: [dep('community-pomodoro-stats', '1.0.0', false, '汇总专注时长与番茄统计')],
    downloads: 9560,
    rating: 4.6,
    tags: ['回顾', '日记', '情绪', '每日'],
  },
  {
    manifest: {
      meta: {
        id: 'community-white-noise',
        name: '白噪音播放器',
        version: '1.0.0',
        description: '专注时播放白噪音/自然音效，支持多种声景',
        author: '心流工坊',
        tier: 'community',
        category: 'other',
        icon: '🎧',
      },
      permissions: ['read:current'],
      sandbox: { isolateFS: true, isolateNetwork: false, isolateDOM: false },
      entry: 'community:white-noise',
      hooks: [],
    },
    downloads: 15200,
    rating: 4.7,
    tags: ['白噪音', '专注', '音效', '声景'],
  },
  {
    manifest: {
      meta: {
        id: 'community-diary-export',
        name: '日记导出',
        version: '1.1.0',
        description: '将笔记和结晶数据导出为 Markdown 或 PDF 格式',
        author: '心流工坊',
        tier: 'community',
        category: 'note',
        icon: '📤',
      },
      permissions: ['read:history', 'export:data'],
      sandbox: { isolateFS: false, isolateNetwork: true, isolateDOM: false },
      entry: 'community:diary-export',
      hooks: [],
    },
    downloads: 7430,
    rating: 4.4,
    tags: ['导出', 'Markdown', 'PDF', '备份'],
  },
  {
    manifest: {
      meta: {
        id: 'community-emotion-journal',
        name: '情绪日记',
        version: '1.0.2',
        description: '记录每日情绪状态与波动曲线，识别情绪趋势',
        author: '心流工坊',
        tier: 'community',
        category: 'emotion',
        icon: '🌊',
      },
      permissions: ['read:history', 'write:data'],
      sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: false },
      entry: 'community:emotion-journal',
      hooks: [],
    },
    dependencies: [dep('community-pomodoro-stats', '1.0.0', false, '关联专注数据以识别情绪波动')],
    downloads: 11800,
    rating: 4.5,
    tags: ['情绪', '日记', '趋势', '记录'],
  },
  {
    manifest: {
      meta: {
        id: 'community-breath-health',
        name: '呼吸训练',
        version: '1.3.0',
        description: '引导式呼吸练习与身心放松，支持多种呼吸节奏',
        author: '心流工坊',
        tier: 'community',
        category: 'health',
        icon: '🌬️',
      },
      permissions: ['read:current'],
      sandbox: { isolateFS: true, isolateNetwork: false, isolateDOM: false },
      entry: 'community:breath-health',
      hooks: [],
    },
    downloads: 8720,
    rating: 4.6,
    tags: ['呼吸', '放松', '健康', '冥想'],
  },
  {
    manifest: {
      meta: {
        id: 'community-knowledge-cards',
        name: '知识卡片',
        version: '0.9.0',
        description: '将笔记自动聚合为可回顾的知识卡片，支持间隔复习',
        author: '心流工坊',
        tier: 'community',
        category: 'knowledge',
        icon: '🃏',
      },
      permissions: ['read:history', 'read_notes'],
      sandbox: { isolateFS: true, isolateNetwork: true, isolateDOM: false },
      entry: 'community:knowledge-cards',
      hooks: [],
    },
    dependencies: [
      dep('community-daily-review', '0.8.0', false, '提取每日回顾作为知识素材'),
      dep('community-emotion-journal', '1.0.0', true, '可选：关联情绪上下文'),
    ],
    downloads: 6390,
    rating: 4.3,
    tags: ['知识', '卡片', '复习', '笔记'],
  },
  {
    manifest: {
      meta: {
        id: 'community-theme-switcher',
        name: '主题切换器',
        version: '2.0.0',
        description: '一键切换界面主题与氛围，适配不同专注场景',
        author: '心流工坊',
        tier: 'community',
        category: 'visual',
        icon: '🎨',
      },
      permissions: ['read:current', 'write:data'],
      sandbox: { isolateFS: false, isolateNetwork: true, isolateDOM: false },
      entry: 'community:theme-switcher',
      hooks: [],
    },
    downloads: 20410,
    rating: 4.9,
    tags: ['主题', '外观', '风格', '切换'],
  },
  {
    manifest: {
      meta: {
        id: 'community-automation-flow',
        name: '自动化工作流',
        version: '1.1.1',
        description: '按规则自动触发专注与记录，串联常用动作',
        author: '心流工坊',
        tier: 'community',
        category: 'automation',
        icon: '⚙️',
      },
      permissions: ['read:history', 'write:data', 'network'],
      sandbox: { isolateFS: true, isolateNetwork: false, isolateDOM: false },
      entry: 'community:automation-flow',
      hooks: [],
    },
    downloads: 5120,
    rating: 4.2,
    tags: ['自动化', '工作流', '触发', '规则'],
  },
]

// ============================================================
// 市场源注册表 API
// ============================================================

export const pluginMarketplaceRegistry = {
  /** 全部市场条目 */
  getAll(): MarketplaceEntry[] {
    return MARKETPLACE_SOURCE
  },

  /** 可安装插件声明列表（按下载量降序） */
  getCatalog(): PluginManifest[] {
    return [...MARKETPLACE_SOURCE]
      .sort((a, b) => b.downloads - a.downloads)
      .map(e => e.manifest)
  },

  /** 市场总数 */
  count(): number {
    return MARKETPLACE_SOURCE.length
  },

  /** 分类统计（仅含非空分类，按预排顺序） */
  getCategories(): MarketplaceCategory[] {
    const counts = new Map<PluginCategoryId, number>()
    for (const e of MARKETPLACE_SOURCE) {
      const cat = e.manifest.meta.category
      counts.set(cat, (counts.get(cat) || 0) + 1)
    }
    return CATEGORY_ORDER
      .filter(cat => (counts.get(cat) || 0) > 0)
      .map(id => ({ id, label: CATEGORY_LABELS[id], count: counts.get(id) || 0 }))
  },

  /** 按分类筛选目录（category 为 null 表示全部分类） */
  byCategory(category: PluginCategoryId | null): PluginManifest[] {
    const catalog = this.getCatalog()
    if (!category) return catalog
    return catalog.filter(m => m.meta.category === category)
  },

  /** 关键词搜索（匹配 id/名称/描述/作者/标签，忽略大小写） */
  search(keyword: string): PluginManifest[] {
    const kw = keyword.trim().toLowerCase()
    if (!kw) return this.getCatalog()
    return this.getCatalog().filter(m => {
      const entry = MARKETPLACE_SOURCE.find(e => e.manifest.meta.id === m.meta.id)
      const haystack = [
        m.meta.id,
        m.meta.name,
        m.meta.description,
        m.meta.author ?? '',
        ...(entry?.tags ?? []),
      ].join(' ').toLowerCase()
      return haystack.includes(kw)
    })
  },

  /** 在注册表中查找插件声明 */
  find(id: string): PluginManifest | undefined {
    return MARKETPLACE_SOURCE.find(e => e.manifest.meta.id === id)?.manifest
  },

  /** 是否已在注册表（用于区分市场插件与本地手工 manifest） */
  isMarketPlugin(id: string): boolean {
    return MARKETPLACE_SOURCE.some(e => e.manifest.meta.id === id)
  },

  /** 依赖图（供依赖解析引擎消费：id → 版本 + 依赖声明） */
  getDependencyGraph(): { id: string; version: string; dependencies: PluginDependency[] }[] {
    return MARKETPLACE_SOURCE.map(e => ({
      id: e.manifest.meta.id,
      version: e.manifest.meta.version,
      dependencies: e.dependencies ?? [],
    }))
  },
}