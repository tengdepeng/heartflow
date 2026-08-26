// ============================================================
// 心流工坊 · 房间图引擎
// 定义房间邻接关系、主链路序列、导航函数
// ============================================================

export type RoomGroup = 'gravity' | 'main-path' | 'world' | 'system'
/** 宅院空间分区（世界壳 · 宅院地图的物理 zone；非院中房间无此字段） */
// 宅院六位置（与 world-shell 私有 ShellSlot 对齐，见 modules/world-shell/types.ts）。
// 用作 RoomNode.slot 与 getRoomsBySlot 的查询键；其中仅 front-yard/hall/back-yard 实际挂房间，
// screen/side-wing/corner 为无房间的壳槽（屏风/厢房/角门）。两处各定义一份、注释标对齐，
// 避免 engine(room-graph) ← module(world-shell) 循环依赖。
export type RoomSlot = 'screen' | 'front-yard' | 'hall' | 'back-yard' | 'side-wing' | 'corner'

/** 房间领域（导航树聚合维度；与 App.vue DOMAIN_LABELS 对齐） */
export type RoomDomain = 'inward' | 'outward' | 'body' | 'knowledge' | 'work' | 'time' | 'system'

export interface RoomNode {
  id: string
  path: string
  name: string
  icon: string
  color: string
  group: RoomGroup
  description: string
  /** 与该房间直接相连的房间 ID 列表 */
  adjacentTo: string[]
  /** 是否在主链路上 */
  isMainPath: boolean
  /** 主链路顺序（仅主链路房间有效） */
  mainPathOrder: number
  /** 是否为分支入口（从主链路岔出的房间） */
  branchFrom?: string
  /** 宅院空间分区（仅院中房间有：前院/正堂/后院；不在院中则缺省，getRoomsBySlot 过滤时自然落空） */
  slot?: RoomSlot
  /** 房间领域分组（导航树按 domain 聚合；七领域：向内/向外/身体/知识/工作/时间/系统） */
  domain?: RoomDomain
  /** 是否被其他房间收编：默认不进侧边栏（路由保留、父房间内链可达） */
  defaultNavVisible?: boolean
}

// ---- 房间图数据 ----
const ROOM_GRAPH: Record<string, RoomNode> = {
  // ================================================================
  // 主链路（四核心闭环）
  // 心流 → 时间长廊 → 逐日心锚 → 情绪花房
  // ================================================================
  home: {
    id: 'home',
    path: '/',
    name: '心流',
    icon: '⊙',
    color: '#d4a574',
    group: 'gravity',
    description: '静场 · 一切开始的地方 · 万有引力中心',
    adjacentTo: ['home-space', 'timeline', 'anchor', 'garden', 'sanctuary'],
    isMainPath: false,
    mainPathOrder: -1,
  },
  'home-space': {
    id: 'home-space',
    path: '/home-space',
    name: '家',
    icon: '🏠',
    color: '#d4a574',
    group: 'gravity',
    description: '居住空间 · 情感原点 · 从这里走向所有房间',
    adjacentTo: ['home', 'timeline', 'roots', 'goals'],
    isMainPath: false,
    mainPathOrder: -1,
  },
  timeline: {
    id: 'timeline',
    path: '/timeline',
    name: '时间线枢纽',
    icon: '◈',
    color: '#c4a060',
    group: 'main-path',
    description: '时间线 · 结晶与回看',
    adjacentTo: ['home-space', 'anchor', 'archive', 'worklog'],
    isMainPath: true,
    mainPathOrder: 1,
    slot: 'front-yard',
  },
  anchor: {
    id: 'anchor',
    path: '/anchor',
    name: '逐日心锚',
    icon: '⚓',
    color: '#5ab8a0',
    group: 'main-path',
    description: '每日锚点 · 把念头安放',
    adjacentTo: ['home-space', 'timeline', 'garden', 'goals'],
    isMainPath: true,
    mainPathOrder: 2,
    slot: 'front-yard',
  },
  garden: {
    id: 'garden',
    path: '/garden',
    name: '情绪花房',
    icon: '◇',
    color: '#8ab87a',
    group: 'main-path',
    description: '情绪记录 · 花开有时',
    adjacentTo: ['home-space', 'anchor', 'sanctuary', 'touchpoints'],
    isMainPath: true,
    mainPathOrder: 3,
    slot: 'front-yard',
  },
  sanctuary: {
    id: 'sanctuary',
    path: '/sanctuary',
    name: '安全岛',
    icon: '○',
    color: '#6b9fc4',
    group: 'system',
    description: '静默庇护 · 暂停与恢复',
    adjacentTo: ['home-space', 'garden', 'body', 'movement'],
    isMainPath: false,
    mainPathOrder: -1,
  },

  // ================================================================
  // 世界房间（从主链路分支出去的空间）
  // ================================================================

  goals: {
    id: 'goals',
    path: '/goals',
    name: '留光阁',
    icon: '☆',
    color: '#e8c060',
    group: 'world',
    description: '目标体系 · 留光存志',
    adjacentTo: ['home-space', 'unfinished', 'worklog', 'anchor'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'anchor',
    slot: 'hall',
  },
  reading: {
    id: 'reading',
    path: '/reading',
    name: '阅览殿',
    icon: '📖',
    color: '#8a7a6a',
    group: 'world',
    description: '知识接引 · 书卷与摘录',
    adjacentTo: ['home-space', 'timeline', 'knowledge', 'dictionary', 'bookmarks'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  relations: {
    id: 'relations',
    path: '/relations',
    name: '羁绊之厅',
    icon: '👥',
    color: '#a07c8c',
    group: 'world',
    description: '人物关系 · 羁绊编织',
    adjacentTo: ['home-space', 'roots', 'play', 'advisors', 'all-selves', 'map'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  body: {
    id: 'body',
    path: '/body',
    name: '身体温室',
    icon: '🌿',
    color: '#7ab87a',
    group: 'world',
    description: '生命节律 · 身体养护',
    adjacentTo: ['sanctuary', 'body-wisdom', 'movement', 'home-space'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  worklog: {
    id: 'worklog',
    path: '/worklog',
    name: '更漏',
    icon: '⏳',
    color: '#b8a080',
    group: 'world',
    description: '专注日志 · 时间流水',
    adjacentTo: ['timeline', 'anchor', 'goals', 'automation', 'home-space',
      'scar', 'reward', 'craft', 'career', 'bag', 'rest'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'timeline',
    slot: 'back-yard',
  },
  play: {
    id: 'play',
    path: '/play',
    name: '逸趣阁',
    icon: '🎮',
    color: '#b89a6a',
    group: 'world',
    description: '趣味互动 · 放松一隅',
    adjacentTo: ['home-space', 'movement', 'seasonal', 'relations'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  map: {
    id: 'map',
    path: '/map',
    name: '地图室',
    icon: '🗺️',
    color: '#8a9a7a',
    group: 'world',
    description: '房间总览 · 所有空间一览',
    adjacentTo: ['home-space', 'relations', 'movement', 'timeline'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  bookmarks: {
    id: 'bookmarks',
    path: '/bookmarks',
    name: '书签',
    icon: '🔖',
    color: '#c4a060',
    group: 'world',
    description: '书签入口架',
    adjacentTo: ['home-space', 'reading', 'archive'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  touchpoints: {
    id: 'touchpoints',
    path: '/touchpoints',
    name: '殿堂触角',
    icon: '📡',
    color: '#7a9ab8',
    group: 'world',
    description: '桌面触角 · 通知与浮窗',
    adjacentTo: ['garden', 'home-space', 'automation'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'garden',
  },
  vault: {
    id: 'vault',
    path: '/vault',
    name: '保险库',
    icon: '🔐',
    color: '#7a8a9a',
    group: 'world',
    description: '加密存储 · 私密空间',
    adjacentTo: ['home-space', 'guard'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  guard: {
    id: 'guard',
    path: '/guard',
    name: '守护室',
    icon: '🛡',
    color: '#8a7a6a',
    group: 'world',
    description: '安全守护 · 隐私管理',
    adjacentTo: ['vault', 'home-space', 'body', 'constitution'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  'word-mirror': {
    id: 'word-mirror',
    path: '/word-mirror',
    name: '字镜阁',
    icon: '🪞',
    color: '#c4a0b8',
    group: 'world',
    description: '文字镜像 · 表达与反思',
    adjacentTo: ['home-space', 'wisdom', 'parallel'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  seasonal: {
    id: 'seasonal',
    path: '/seasonal',
    name: '岁时阁',
    icon: '🎋',
    color: '#8aba7a',
    group: 'world',
    description: '岁时仪式 · 节律与纪念',
    adjacentTo: ['home-space', 'play', 'roots', 'body-wisdom', 'cognition'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  unfinished: {
    id: 'unfinished',
    path: '/unfinished',
    name: '未完成花园',
    icon: '🌾',
    color: '#b8a060',
    group: 'world',
    description: '未完成事项 · 暂存与沉淀',
    adjacentTo: ['home-space', 'goals', 'anchor', 'timeline'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'garden',
  },
  movement: {
    id: 'movement',
    path: '/movement',
    name: '动律之间',
    icon: '🏃',
    color: '#c48a6a',
    group: 'world',
    description: '运动记录 · 身体律动',
    adjacentTo: ['sanctuary', 'body', 'play'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  roots: {
    id: 'roots',
    path: '/roots',
    name: '根脉之庭',
    icon: '🌳',
    color: '#7a9a6a',
    group: 'world',
    description: '家族记忆 · 根脉追溯',
    adjacentTo: ['home-space', 'seasonal'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  wisdom: {
    id: 'wisdom',
    path: '/wisdom',
    name: '知微阁',
    icon: '🔮',
    color: '#a08ac4',
    group: 'world',
    description: '智慧沉淀 · 见微知著',
    adjacentTo: ['home-space', 'word-mirror', 'cognition'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  dictionary: {
    id: 'dictionary',
    path: '/dictionary',
    name: '殿堂辞典',
    icon: '📖',
    color: '#8a8a7a',
    group: 'world',
    description: '概念辞典 · 术语释义',
    adjacentTo: ['reading', 'knowledge'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'reading',
  },
  knowledge: {
    id: 'knowledge',
    path: '/knowledge',
    name: '经略阁',
    icon: '🌟',
    color: '#c4a060',
    group: 'world',
    description: '知识体系 · 系统化学习',
    adjacentTo: ['reading', 'dictionary', 'wisdom'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'reading',
    slot: 'hall',
  },
  cognition: {
    id: 'cognition',
    path: '/cognition',
    name: '释光阁',
    icon: '🔦',
    color: '#c4a060',
    group: 'world',
    description: '认知觉察 · 素镜自照',
    adjacentTo: ['wisdom', 'home-space', 'seasonal'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'wisdom',
  },
  'body-wisdom': {
    id: 'body-wisdom',
    path: '/body-wisdom',
    name: '藏象阁',
    icon: '☯',
    color: '#7a9a8a',
    group: 'world',
    description: '藏象智慧 · 身体与感知',
    adjacentTo: ['body', 'movement', 'seasonal', 'garden', 'home-space'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'body',
  },
  automation: {
    id: 'automation',
    path: '/automation',
    name: '自律工坊',
    icon: '⚙️',
    color: '#b89a6a',
    group: 'world',
    description: '自动化引擎 · 自律规则',
    adjacentTo: ['worklog', 'workhub', 'touchpoints'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'worklog',
  },
  archive: {
    id: 'archive',
    path: '/archive',
    name: '数据档案馆',
    icon: '🗄',
    color: '#7a8a9a',
    group: 'world',
    description: '数据导入导出 · 备份恢复',
    adjacentTo: ['timeline', 'home-space', 'vault'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'timeline',
  },
  'all-selves': {
    id: 'all-selves',
    path: '/all-selves',
    name: '众生象',
    icon: '🪞',
    color: '#a07c8c',
    group: 'world',
    description: '多重自我 · 镜像观察',
    adjacentTo: ['relations', 'home-space', 'advisors'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'relations',
  },
  parallel: {
    id: 'parallel',
    path: '/parallel',
    name: '平行世界',
    icon: '🌿',
    color: '#7a9a8a',
    group: 'world',
    description: '平行时间线 · 假设与推演',
    adjacentTo: ['home-space', 'timeline', 'word-mirror'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  'time-capsule': {
    id: 'time-capsule',
    path: '/capsule',
    name: '时光胶囊',
    icon: '⏳',
    color: '#7c5cfc',
    group: 'world',
    description: '封存此刻心流，留给未来的自己开启',
    adjacentTo: ['parallel', 'dream-nook', 'timeline'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'parallel',
  },
  workhub: {
    id: 'workhub',
    path: '/workhub',
    name: '工作中心',
    icon: '💼',
    color: '#b8a080',
    group: 'world',
    description: '工作台 · 任务与进度',
    adjacentTo: ['goals', 'worklog', 'unfinished', 'automation'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'goals',
  },
  advisors: {
    id: 'advisors',
    path: '/advisors',
    name: '幕僚大厅',
    icon: '🏛',
    color: '#a08a7a',
    group: 'world',
    description: '幕僚顾问 · 对话与指引',
    adjacentTo: ['relations', 'all-selves', 'home-space'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'relations',
  },
  'carrier-editor': {
    id: 'carrier-editor',
    path: '/carrier-editor',
    name: '载体编辑器',
    icon: '◆',
    color: '#c4a060',
    group: 'world',
    description: '玉珠载体 · 形态与光效',
    adjacentTo: ['home-space', 'timeline'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  'plugin-market': {
    id: 'plugin-market',
    path: '/plugin-market',
    name: '插件市场',
    icon: '▤',
    color: '#8a9ab8',
    group: 'world',
    description: '插件发现与安装',
    adjacentTo: ['plugins', 'home-space'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  'style-market': {
    id: 'style-market',
    path: '/style-market',
    name: '风格包市场',
    icon: '🎨',
    color: '#c4a0b8',
    group: 'world',
    description: '主题风格 · 创建与分享',
    adjacentTo: ['home-space', 'plugins'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  'template-market': {
    id: 'template-market',
    path: '/template-market',
    name: '模板市场',
    icon: '📋',
    color: '#8a9a7a',
    group: 'world',
    description: '模板 · 房间与幕僚性格',
    adjacentTo: ['home-space', 'advisors', 'style-market'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  'advisor-affinity': {
    id: 'advisor-affinity',
    path: '/advisors/affinity',
    name: '幕僚好感',
    icon: '💝',
    color: '#c48a9a',
    group: 'world',
    description: '幕僚好感度 · 羁绊等级',
    adjacentTo: ['advisors', 'home-space'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'advisors',
  },

  // ================================================================
  // 工作类房间（从更漏分支）
  // ================================================================
  scar: {
    id: 'scar',
    path: '/scar',
    name: '工痕',
    icon: '🔨',
    color: '#c48a6a',
    group: 'world',
    description: '工作的身体印记',
    adjacentTo: ['worklog', 'goals', 'home-space'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'worklog',
  },
  reward: {
    id: 'reward',
    path: '/reward',
    name: '劳酬',
    icon: '⚖️',
    color: '#e8c060',
    group: 'world',
    description: '工作的价值回报',
    adjacentTo: ['worklog', 'scar', 'goals', 'home-space', 'self-reward'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'worklog',
  },
  'self-reward': {
    id: 'self-reward',
    path: '/self-reward',
    name: '自奖',
    icon: '🎁',
    color: '#e0a96d',
    group: 'world',
    description: '自我奖励 · 成就兑现清单',
    adjacentTo: ['reward', 'worklog', 'craft'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'reward',
  },
  craft: {
    id: 'craft',
    path: '/craft',
    name: '匠庐',
    icon: '🔧',
    color: '#b8a080',
    group: 'world',
    description: '工作成果与作品集',
    adjacentTo: ['worklog', 'scar', 'knowledge', 'goals', 'material-workshop', 'home-space'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'worklog',
  },
  'material-workshop': {
    id: 'material-workshop',
    path: '/material-workshop',
    name: '材质工坊',
    icon: '◈',
    color: '#b8a080',
    group: 'world',
    description: '材质工坊 · 风格包与视觉隐喻管理中心',
    adjacentTo: ['craft', 'component-market', 'home-space'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'craft',
  },
  'component-market': {
    id: 'component-market',
    path: '/component-market',
    name: '组件市场',
    icon: '▣',
    color: '#8a9ab8',
    group: 'world',
    description: '组件市场 · 可视化组件发现与配置',
    adjacentTo: ['material-workshop', 'craft', 'home-space'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'craft',
  },
  career: {
    id: 'career',
    path: '/career',
    name: '业脉',
    icon: '🌐',
    color: '#8a9a7a',
    group: 'world',
    description: '工作关系网络',
    adjacentTo: ['worklog', 'scar', 'reward', 'craft', 'goals', 'roots', 'home-space'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'worklog',
  },
  bag: {
    id: 'bag',
    path: '/bag',
    name: '行囊',
    icon: '🎒',
    color: '#a07c8c',
    group: 'world',
    description: '工作技能与工具',
    adjacentTo: ['worklog', 'career', 'craft', 'knowledge', 'home-space'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'worklog',
  },
  rest: {
    id: 'rest',
    path: '/rest',
    name: '息壤',
    icon: '🌱',
    color: '#7ab87a',
    group: 'world',
    description: '工作间歇与休假',
    adjacentTo: ['worklog', 'automation', 'garden', 'body', 'home-space'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'worklog',
  },

  // ================================================================
  // 系统与设定
  // ================================================================
  constitution: {
    id: 'constitution',
    path: '/constitution',
    name: '心流宪法',
    icon: '⚜',
    color: '#d4a574',
    group: 'system',
    description: '宪法规则 · 不可变核心',
    adjacentTo: ['guard', 'home-space'],
    isMainPath: false,
    mainPathOrder: -1,
  },
  plugins: {
    id: 'plugins',
    path: '/plugins',
    name: '插件管理器',
    icon: '▤',
    color: '#8a9ab8',
    group: 'system',
    description: '插件管理 · 安装与卸载',
    adjacentTo: ['plugin-market', 'constitution'],
    isMainPath: false,
    mainPathOrder: -1,
  },
  settings: {
    id: 'settings',
    path: '/settings',
    name: '殿堂设置',
    icon: '⚙️',
    color: '#8a8a8a',
    group: 'system',
    description: '系统设置 · 自定义配置',
    adjacentTo: ['home-space'],
    isMainPath: false,
    mainPathOrder: -1,
  },

  // ================================================================
  // 接入层收口：已建但未注册到房间图的功能空间
  // （使星盘搜索 / 外环 / 最近访问能直达这些空间）
  // ================================================================
  'automation-workshop': {
    id: 'automation-workshop',
    path: '/automation-workshop',
    name: '自动化工坊',
    icon: '🪢',
    color: '#b89a6a',
    group: 'world',
    description: '自动化工作流编排 · 触发条件与操作',
    adjacentTo: ['workhub', 'worklog', 'automation', 'touchpoints'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'workhub',
  },
  'transform-gallery': {
    id: 'transform-gallery',
    path: '/transform-gallery',
    name: '蜕变回廊',
    icon: '🦋',
    color: '#a08ac4',
    group: 'world',
    description: '记录身体与心灵的每一次蜕变',
    adjacentTo: ['cognition', 'seasonal', 'body-wisdom', 'parallel'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'cognition',
  },
  output: {
    id: 'output',
    path: '/output',
    name: '输出管理',
    icon: '📤',
    color: '#7a8a9a',
    group: 'world',
    description: '内容导出与分享 · 安静离开',
    adjacentTo: ['archive', 'bookmarks', 'timeline'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'archive',
  },
  study: {
    id: 'study',
    path: '/study',
    name: '思绪书房',
    icon: '📝',
    color: '#8a7a6a',
    group: 'world',
    description: '轻量笔记 · 思绪沉淀',
    adjacentTo: ['reading', 'knowledge', 'dictionary', 'goals'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'reading',
  },
  'dream-nook': {
    id: 'dream-nook',
    path: '/dream-nook',
    name: '梦乡小筑',
    icon: '🌙',
    color: '#6b7a9a',
    group: 'world',
    description: '梦境记录 · 夜的痕迹',
    adjacentTo: ['rest', 'sanctuary', 'parallel', 'seasonal'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'rest',
  },
  'growth-garden': {
    id: 'growth-garden',
    path: '/growth-garden',
    name: '成长庭院',
    icon: '🌱',
    color: '#7ab87a',
    group: 'world',
    description: '成长轨迹 · 缓慢生长',
    adjacentTo: ['goals', 'anchor', 'unfinished', 'body'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'goals',
  },

  // ================================================================
  // 接入层补充：已路由但未注册进房间图的空间 / 时间线变体
  // （让星盘地图 / 搜索 / 最近访问能直达这些空间，并理清 /time-corridor 与 /timeline 的重复命名）
  // ================================================================
  'app-space': {
    id: 'app-space',
    path: '/app-space',
    name: '应用空间',
    icon: '🧩',
    color: '#8a9ab8',
    group: 'world',
    description: '应用空间 · 插件与工具的中枢',
    adjacentTo: ['home-space', 'plugins', 'space-customizer', 'decoration-workshop'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  'decoration-workshop': {
    id: 'decoration-workshop',
    path: '/decoration-workshop',
    name: '殿堂装修工坊',
    icon: '🎨',
    color: '#c4a0b8',
    group: 'world',
    description: '殿堂装修 · 空间视觉与风格定制',
    adjacentTo: ['home-space', 'space-customizer', 'app-space', 'style-market', 'carrier-editor'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  'space-customizer': {
    id: 'space-customizer',
    path: '/space-customizer',
    name: '空间自定义',
    icon: '🪟',
    color: '#8a9ab8',
    group: 'world',
    description: '空间自定义 · 模板与维度配置',
    adjacentTo: ['home-space', 'decoration-workshop', 'app-space', 'style-market'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  'time-corridor': {
    id: 'time-corridor',
    path: '/time-corridor',
    name: '时间长廊',
    icon: '⌛',
    color: '#c4a060',
    group: 'world',
    description: '时间长廊 · 时间的可视化长廊',
    adjacentTo: ['timeline', 'home-space', 'archive', 'parallel'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'timeline',
  },
  'timeline-index': {
    id: 'timeline-index',
    path: '/timeline-index',
    name: '时间线索引',
    icon: '🗂',
    color: '#c4a060',
    group: 'world',
    description: '时间线索引 · 按天分片与二级索引梳理',
    adjacentTo: ['timeline', 'home-space', 'archive', 'time-corridor', 'garden'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'timeline',
  },
  'mirror-self': {
    id: 'mirror-self',
    path: '/mirror-self',
    name: '镜我',
    icon: '◉',
    color: '#c4a0b8',
    group: 'world',
    description: '镜我 · 陈列而非叙事的年度对话面',
    adjacentTo: ['home-space', 'advisors', 'all-selves'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  'visualization-studio': {
    id: 'visualization-studio',
    path: '/visualization-studio',
    name: '数据视觉工坊',
    icon: '◈',
    color: '#d4a574',
    group: 'world',
    description: '数据视觉工坊 · 用数据视觉逻辑语言把本地心流数据转译为光点排布',
    adjacentTo: ['home-space', 'mirror-self', 'advisors'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  'data-outflow': {
    id: 'data-outflow',
    path: '/data-outflow',
    name: '数据流出日志',
    icon: '🚪',
    color: '#8a7a6a',
    group: 'world',
    description: '守护室 · 记录每一次数据离开本设备的去向',
    adjacentTo: ['guard', 'output', 'home-space'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'guard',
  },
  'home-replica': {
    id: 'home-replica', path: '/home-replica', name: '家 · 1:1 复刻', icon: '🏠',
    color: '#b89a6a', group: 'world',
    description: '家 · 1:1 3D 复刻（骨架占位）· 待设计稿后呈现',
    adjacentTo: ['home-space', 'star-map'],
    isMainPath: false, mainPathOrder: -1, branchFrom: 'home-space',
  },
  'star-map': {
    id: 'star-map',
    path: '/star-map',
    name: '知识星图',
    icon: '✦',
    color: '#7c5cfc',
    group: 'world',
    description: '知识星图 · 用 3D 力导向把经略阁知识节点铺成可旋转的星云',
    adjacentTo: ['home-space', 'mirror-self', 'visualization-studio'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  'traditions': {
    id: 'traditions',
    path: '/traditions',
    name: '文明根系',
    icon: '🪶',
    color: '#c9a063',
    group: 'world',
    description: '文明根系 · 本地私有的技艺/仪式/民俗记录与个人文明收藏',
    adjacentTo: ['home-space', 'star-map', 'mirror-self', 'all-selves'],
    isMainPath: false,
    mainPathOrder: -1,
    branchFrom: 'home-space',
  },
  'launcher': {
    id: 'launcher',
    path: '/launcher',
    name: '启动器',
    icon: '🚀',
    color: '#d4a574',
    group: 'system',
    description: '桌面启动台 · 外部应用入口（仅找入口启动，深链跳子页，不嵌入外部窗口）',
    adjacentTo: ['home-space', 'app-space'],
    isMainPath: false,
    mainPathOrder: -1,
    domain: 'system',
  },
}

// ---- 主链路顺序列表 ----
const MAIN_PATH_ORDER: string[] = ['timeline', 'anchor', 'garden']

// ---- 导出函数 ----

/** 获取所有房间节点 */
// ---- 收编房间默认不进侧边栏（路由保留、父房间内链可达） ----
// 与 modules/room-manager/__tests__/nav-dedupe.test.ts 契约一致；
// 删除任何房间直达入口前，务必先确认此处未将其标记为 defaultNavVisible:false（默认进侧栏）。
const DEDUPED_ROOM_IDS = new Set<string>([
  'style-market', 'template-market', 'component-market', 'carrier-editor',
  'advisor-affinity', 'plugin-market', 'space-customizer', 'data-outflow',
  'mirror-self', 'decoration-workshop', 'app-space', 'plugins',
  'time-corridor', 'timeline-index', 'visualization-studio', 'home-replica',
  'star-map', 'automation-workshop', 'transform-gallery', 'body-wisdom',
])
for (const id of DEDUPED_ROOM_IDS) {
  const r = ROOM_GRAPH[id]
  if (r) r.defaultNavVisible = false
}

export function getAllRooms(): RoomNode[] {
  return Object.values(ROOM_GRAPH)
}

/** 按组获取房间 */
export function getRoomsByGroup(group: RoomGroup): RoomNode[] {
    return getAllRooms().filter(r => r.group === group)
  }

  /** 按宅院空间分区获取房间（世界壳 · 宅院：前院/正堂/后院；不在院中的房间无 slot 字段，filter 自然返回 []） */
  export function getRoomsBySlot(slot: RoomSlot): RoomNode[] {
    return getAllRooms().filter(r => r.slot === slot)
  }

  /** 按 ID 获取单个房间 */
export function getRoom(id: string): RoomNode | undefined {
  return ROOM_GRAPH[id]
}

/** 按路径获取房间 */
export function getRoomByPath(path: string): RoomNode | undefined {
  return getAllRooms().find(r => r.path === path)
}

/** 获取与指定房间相邻的房间列表 */
export function getAdjacentRooms(roomId: string): RoomNode[] {
  const room = ROOM_GRAPH[roomId]
  if (!room) return []
  return room.adjacentTo
    .map(id => ROOM_GRAPH[id])
    .filter(Boolean)
}

/** 获取主链路房间列表（按顺序） */
export function getMainPath(): RoomNode[] {
  return MAIN_PATH_ORDER
    .map(id => ROOM_GRAPH[id])
    .filter(Boolean)
}

/** 获取主链路上某个房间的前一个房间 */
export function getPreviousOnMainPath(roomId: string): RoomNode | undefined {
  const idx = MAIN_PATH_ORDER.indexOf(roomId)
  if (idx <= 0) return undefined
  return ROOM_GRAPH[MAIN_PATH_ORDER[idx - 1]]
}

/** 获取主链路上某个房间的后一个房间 */
export function getNextOnMainPath(roomId: string): RoomNode | undefined {
  const idx = MAIN_PATH_ORDER.indexOf(roomId)
  if (idx < 0 || idx >= MAIN_PATH_ORDER.length - 1) return undefined
  return ROOM_GRAPH[MAIN_PATH_ORDER[idx + 1]]
}

/** 判断房间是否在主链路上 */
export function isOnMainPath(roomId: string): boolean {
  return MAIN_PATH_ORDER.includes(roomId)
}

/** 获取从指定房间分支出去的所有直接房间 */
export function getBranchRooms(branchFromId: string): RoomNode[] {
  return getAllRooms().filter(r => r.branchFrom === branchFromId)
}

/** 获取指定房间的祖先链（从该房间回溯到主链路，不含自身） */
export function getBranchAncestors(roomId: string): RoomNode[] {
  const ancestors: RoomNode[] = []
  const visited = new Set<string>()
  let current = getRoom(roomId)
  while (current && current.branchFrom && !visited.has(current.branchFrom)) {
    visited.add(current.branchFrom)
    const parent = getRoom(current.branchFrom)
    if (parent) {
      ancestors.unshift(parent)
      current = parent
    } else {
      break
    }
  }
  return ancestors
}

/** 获取返回心流（家）的路径 */
export function getReturnPath(fromRoomId: string): string[] {
  // 简单策略：如果不在主链路上，先回到分支源，再沿主链路回到心流
  const path: string[] = [fromRoomId]
  const visited = new Set<string>()
  visited.add(fromRoomId)

  let current = ROOM_GRAPH[fromRoomId]
  while (current && current.id !== 'home' && current.id !== 'home-space') {
    if (current.branchFrom && !visited.has(current.branchFrom)) {
      path.push(current.branchFrom)
      visited.add(current.branchFrom)
      current = ROOM_GRAPH[current.branchFrom]
    } else {
      // 沿主链路往回走
      const prev = getPreviousOnMainPath(current.id)
      if (prev && !visited.has(prev.id)) {
        path.push(prev.id)
        visited.add(prev.id)
        current = prev
      } else {
        // 回退到 home-space
        path.push('home-space')
        break
      }
    }
  }
  return path
}

/** 获取从心流到指定房间的导航路径 */
export function getPathTo(roomId: string): string[] {
  if (roomId === 'home' || roomId === 'home-space') return [roomId]
  if (isOnMainPath(roomId)) {
    const idx = MAIN_PATH_ORDER.indexOf(roomId)
    return ['home-space', ...MAIN_PATH_ORDER.slice(0, idx + 1)]
  }
  const room = ROOM_GRAPH[roomId]
  if (!room) return ['home-space', roomId]
  // 沿 branchFrom 回溯到主链路
  const path: string[] = [roomId]
  let current = room
  while (current.branchFrom && current.branchFrom !== 'home' && current.branchFrom !== 'home-space') {
    path.unshift(current.branchFrom)
    current = ROOM_GRAPH[current.branchFrom]!
  }
  path.unshift('home-space')
  return path
}

/** 获取所有房间的邻接关系（用于地图渲染） */
export function getAdjacencyPairs(): Array<[string, string]> {
  const pairs: Array<[string, string]> = []
  const seen = new Set<string>()
  for (const room of getAllRooms()) {
    for (const adjId of room.adjacentTo) {
      const key = [room.id, adjId].sort().join('::')
      if (!seen.has(key)) {
        seen.add(key)
        pairs.push([room.id, adjId])
      }
    }
  }
  return pairs
}