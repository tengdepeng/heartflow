// ============================================================
// 镜面对话系统 · 10 意图分类
// 每个意图定义：关键词、匹配模式、参数提取器
// ============================================================

import type { IntentMeta, IntentCategory } from './types'

/**
 * 导航「打开/前往」动词共享常量。
 * explore 意图分类用的 patterns 与参数抽取用的 paramExtractors.roomTarget
 * **必须共用这一份清单**——两者 verb 不一致会导致「被判为 navigate 却抽不到目标」
 * 的静默 bug（用户说「打开 XX」→ 无跳转）。
 * 多字动词放前面，避免正则前缀截断（如「导航到」必须先于「导航」）。
 */
export const NAV_OPEN_VERBS = [
  '导航到', '跳转到', '切换到',
  '导航', '跳转', '切到', '转往', '转到',
  '走去', '走到', '去到', '前往', '来到', '到访', '访问',
  '唤出', '展开', '打开', '开启', '进入',
  '记录',
  '逛', '进', '去', '到', '走', '查看', '看看',
].join('|')

// ---- 专注 (focus) ----
const focusIntent: IntentMeta = {
  category: 'focus',
  label: '专注',
  icon: '🎯',
  description: '启动计时器，进入专注模式',
  keywords: [
    '专注', 'focus', '计时', '开始工作', '番茄', '番茄钟', 'pomodoro',
    '我要工作', '专心', '集中', '干活', '干活了',
  ],
  patterns: [
    /(?:开始|启动|进入|来一[个次]|想)\s*(?:专注|focus|计时|番茄|番茄钟|工作)/i,
    /(?:专注|focus|番茄|工作)\s*(?:一[下会]|开始)/i,
    /(?:我要|我想|我来)\s*(?:专注|工作|专心|集中)/i,
    // 边界锚：避免「打开工时」中的「开工」子串被误判为计时
    /(?:^|[\s，。、！？]|我要|我想|咱们|准备|开始|该|咱)(?:干活|开工|撸起袖子)/,
  ],
  paramExtractors: [
    {
      name: 'duration',
      pattern: /(\d+)\s*(?:分钟|分|min|m)/i,
      transform: (m) => parseInt(m, 10),
    },
    {
      name: 'taskName',
      pattern: /(?:要|做|干|搞|写)\s*(.+?)(?:$|[。！？，,.])/,
      transform: (m) => m.trim(),
    },
  ],
}

// ---- 笔记 (note) ----
const noteIntent: IntentMeta = {
  category: 'note',
  label: '笔记',
  icon: '📝',
  description: '记录笔记、想法、灵感',
  keywords: [
    '笔记', '记录', '记下', '写下', 'note', '想法', '灵感',
    'mark', '备忘', '备忘一下', '我想到', '突然想到',
  ],
  patterns: [
    /(?:记|写|note|记录)\s*(?:笔记|下来|一下|个)/i,
    /(?:我想到|突然想到|有个想法|灵感)/,
    /(?:备忘|mark|标记)\s*(?:一下|这个)/i,
    /(?:帮我记|帮我记录|帮我写)/,
  ],
  paramExtractors: [
    {
      name: 'content',
      pattern: /(?:记|写|note|记录|想到|备忘|mark)\s*(?:笔记|下来|一下|个|了)?[:：]?\s*(.+)/i,
      transform: (m) => m.trim(),
    },
    {
      name: 'title',
      pattern: /(?:标题|叫|命名)[:：]?\s*(.+?)(?:$|[。！？，,.])/,
      transform: (m) => m.trim(),
    },
  ],
}

// ---- 情绪 (emotion) ----
const emotionIntent: IntentMeta = {
  category: 'emotion',
  label: '情绪',
  icon: '🌸',
  description: '记录情绪波动',
  keywords: [
    '情绪', '心情', 'emotion', '感觉', '感受', '开心', '难过',
    '焦虑', '愤怒', '低落', '平静', '高兴', '不爽', '烦躁',
  ],
  patterns: [
    /(?:记录|记|mark)\s*(?:情绪|心情|emotion)/i,
    /(?:我|今天|现在)\s*(?:很|好|非常|有点|比较)\s*(?:开心|难过|焦虑|愤怒|低落|平静|高兴|不爽|烦躁|累|疲惫)/i,
    /(?:心情|情绪)\s*(?:不太好|很好|不好|一般|很差)/i,
    /(?:感觉|觉得)\s*(?:自己|今天|现在)\s*(?:很|好|有点)/i,
  ],
  paramExtractors: [
    {
      name: 'type',
      pattern: /(?:开心|高兴|happy)/i,
      transform: () => 'happy',
    },
    {
      name: 'type',
      pattern: /(?:难过|低落|伤心|sad)/i,
      transform: () => 'sad',
    },
    {
      name: 'type',
      pattern: /(?:焦虑|anxious|紧张)/i,
      transform: () => 'anxious',
    },
    {
      name: 'type',
      pattern: /(?:愤怒|生气|angry|不爽|烦躁)/i,
      transform: () => 'angry',
    },
    {
      name: 'type',
      pattern: /(?:平静|calm|淡定)/i,
      transform: () => 'calm',
    },
    {
      name: 'note',
      pattern: /(?:因为|由于|原因是)[:：]?\s*(.+?)(?:$|[。！？])/,
      transform: (m) => m.trim(),
    },
  ],
}

// ---- 锚点 (anchor) ----
const anchorIntent: IntentMeta = {
  category: 'anchor',
  label: '锚点',
  icon: '⚓',
  description: '设立、查看、完成锚点',
  keywords: [
    '锚点', 'anchor', '目标', '待办', 'todo', '设个', '安放',
    '里程碑', 'milestone', '标记', '完成',
  ],
  patterns: [
    /(?:设立|设个|创建|安放|添加|新增)\s*(?:锚点|anchor|目标|待办|todo)/i,
    /(?:查看|列出|我有|我的)\s*(?:锚点|anchor|目标|待办|todo)/i,
    /(?:完成|标记完成|done)\s*(?:锚点|anchor|目标|待办|todo)/i,
    /(?:我要|我想|帮我)\s*(?:设|添加|创建)\s*(?:锚点|目标|待办)/i,
  ],
  paramExtractors: [
    {
      name: 'title',
      pattern: /(?:锚点|目标|待办|todo|anchor)[:：]?\s*(.+?)(?:$|[。！？，,.])/i,
      transform: (m) => m.trim(),
    },
    {
      name: 'targetDate',
      pattern: /(?:日期|时间|deadline|截止|due)[:：]?\s*(\d{4}-\d{2}-\d{2}|\d{2}-\d{2}|明天|后天|今天|下周[一二三四五六日])/i,
      transform: (m) => m.trim(),
    },
  ],
}

// ---- 计划 (plan) ----
const planIntent: IntentMeta = {
  category: 'plan',
  label: '计划',
  icon: '📋',
  description: '制定计划、安排日程',
  keywords: [
    '计划', 'plan', '安排', '日程', 'schedule', '规划', '打算',
    '接下来', '今天要', '明天要',
  ],
  patterns: [
    /(?:制定|做个|做个|来[个份])\s*(?:计划|plan|安排|日程)/i,
    /(?:今天|明天|接下来|本周|下周)\s*(?:要|想|打算|计划)/i,
    /(?:安排|规划)\s*(?:一下|今天|明天)/i,
    /(?:schedule|plan)\s*(?:一下|今天|tomorrow)/i,
  ],
  paramExtractors: [
    {
      name: 'content',
      pattern: /(?:计划|安排|日程|要|想|打算)[:：]?\s*(.+?)(?:$|[。！？])/i,
      transform: (m) => m.trim(),
    },
  ],
}

// ---- 反思 (reflect) ----
const reflectIntent: IntentMeta = {
  category: 'reflect',
  label: '反思',
  icon: '🪞',
  description: '回顾、复盘、总结',
  keywords: [
    '反思', '回顾', '复盘', '总结', 'reflect', 'review',
    '今天做了什么', '今天干了', '这段时间', '最近',
  ],
  patterns: [
    /(?:反思|回顾|复盘|总结|review|reflect)/i,
    /(?:今天|最近|这段时间)\s*(?:做了什么|干了什么|怎么样|如何)/i,
    /(?:帮我|给我)\s*(?:回顾|总结|复盘|看看)/i,
    /(?:做得|干得)\s*(?:怎么样|如何|好不好)/i,
  ],
  paramExtractors: [
    {
      name: 'timeRange',
      pattern: /(?:今天|本周|这个月|最近\d+天|这段时间)/i,
      transform: (m) => m.trim(),
    },
  ],
}

// ---- 学习 (learn) ----
const learnIntent: IntentMeta = {
  category: 'learn',
  label: '学习',
  icon: '📚',
  description: '知识探索、技能练习',
  keywords: [
    '学习', 'learn', '学', '知识', '技能', '练习', '了解',
    '研究', 'study', '探索', '查一下', '看看',
  ],
  patterns: [
    /(?:学习|learn|学|study)\s*(?:一下|习|知识)/i,
    /(?:我想|我要|帮我)\s*(?:学|了解|研究|探索)/i,
    /(?:查一下|搜一下|搜索)\s*.+/i,
    /(?:告诉我|解释|说明)\s*(?:一下|什么是|怎么)/i,
  ],
  paramExtractors: [
    {
      name: 'topic',
      pattern: /(?:学|学习|了解|研究|探索|查|搜|告诉|解释|说明)\s*(?:一下|什么是|怎么)?\s*(.+?)(?:$|[。！？])/i,
      transform: (m) => m.trim(),
    },
  ],
}

// ---- 创造 (create) ----
const createIntent: IntentMeta = {
  category: 'create',
  label: '创造',
  icon: '🎨',
  description: '输出内容、创作',
  keywords: [
    '创造', '创作', 'create', '写', '画', '设计', '做', 'build',
    '制作', '开发', '构建', '生成',
  ],
  patterns: [
    /(?:创造|创作|create|build)\s*(?:一个|一下|个)/i,
    /(?:写|画|设计|做|制作|开发|构建|生成)\s*(?:一[个下篇]|个|篇)/i,
    /(?:我要|我想|帮我)\s*(?:写|画|设计|做|制作|开发|创建)/i,
  ],
  paramExtractors: [
    {
      name: 'content',
      pattern: /(?:创造|创作|create|build|写|画|设计|做|制作|开发|构建|生成)\s*(?:一个|一下|个|篇)?\s*(.+?)(?:$|[。！？])/i,
      transform: (m) => m.trim(),
    },
  ],
}

// ---- 休息 (rest) ----
const restIntent: IntentMeta = {
  category: 'rest',
  label: '休息',
  icon: '☕',
  description: '放松、呼吸、暂停',
  keywords: [
    '休息', 'rest', '暂停', 'pause', '放松', '呼吸', 'break',
    '累了', '歇会', '歇一下', '喘口气',
  ],
  patterns: [
    /(?:休息|rest|暂停|pause|break)\s*(?:一下|一会|会儿|[\d]+)/i,
    /(?:我|好)\s*(?:累了|困了|想休息|想歇)/i,
    /(?:放松|呼吸|歇会|喘口气)/i,
    /(?:先|先停)\s*(?:休息|暂停|歇)/i,
  ],
  paramExtractors: [
    {
      name: 'duration',
      pattern: /(\d+)\s*(?:分钟|分|min|m)/i,
      transform: (m) => parseInt(m, 10),
    },
  ],
}

// ---- 探索 (explore) ----
const exploreIntent: IntentMeta = {
  category: 'explore',
  label: '探索',
  icon: '🔍',
  description: '信息查询、统计分析、系统浏览',
  keywords: [
    '探索', 'explore', '看看', '浏览', '统计', 'stat', '数据',
    '有多少', '几个', '多少', '什么', '怎么', '哪里',
  ],
  patterns: [
    /(?:探索|explore|浏览|逛逛)\s*(?:一下|看看)?/i,
    /(?:统计|stat|数据)\s*(?:一下|看看|数据)/i,
    /(?:有多少|几个|多少)\s*(?:次|个|篇|条|朵)/i,
    /(?:怎么|如何|哪里|什么)\s*(?:用|操作|看|去|是)/i,
    /(?:显示|展示|看看)\s*(?:我的|统计|数据|进度)/i,
    // 导航打开：与 paramExtractors.roomTarget 共用 NAV_OPEN_VERBS（单一真源）
    new RegExp(`(?:${NAV_OPEN_VERBS})\\s*(?:一下|看看|吧)?\\s*(.+?)(?:$|[。！？,.]])`, 'i'),
  ],
  paramExtractors: [
    {
      name: 'query',
      pattern: /(?:探索|explore|浏览|统计|看看|查|显示|展示)\s*(?:一下|看看)?\s*(.+?)(?:$|[。！？])/i,
      transform: (m) => m.trim(),
    },
    {
      name: 'roomTarget',
      pattern: new RegExp(`(?:${NAV_OPEN_VERBS})\\s*(.+?)(?:$|[。！？,.])`, 'i'),
      transform: (m) => m.trim(),
    },
  ],
}

// ---- 记账 (finance) ----
// 项目里真实存在的财务空间是 /reward「劳酬」（记账 v2：多账户 / 预算预警 /
// 支出流水 / 月结单 / CSV 导入）。此前镜我对系统完全没接这个意图，导致用户
// 对玉珠说「我要记账」「打开记账」只回文字、不跳转（与 AdvisorHub 调令系统
// 的 commandIntent 词表脱节）。此处补齐，finance 意图直接发 navigate 步到
// 劳酬（roomResolver 已把「劳酬」映射到 /reward；另在 roomResolver 补记账同义词，
// 让「打开记账」经 explore 也能解析）。
const financeIntent: IntentMeta = {
  category: 'finance',
  label: '记账理财',
  icon: '💰',
  description: '打开劳酬空间，记账与预算都在这里',
  keywords: [
    '记账', '账本', '财务', '劳酬', '算账', '收支', '流水账', '账单', '报销',
    '结余', '资产负债', '开销', '花销', '支出', '收入', '预算', '月结',
    '入账', '出账', '记一笔',
  ],
  patterns: [
    /(?:我要|我想|帮我|给我)\s*(?:记|做|搞|记一笔)\s*(?:一笔)?\s*账/i,
    /(?:打开|开启|去|进入|前往|跳到)\s*(?:记账|账本|财务|劳酬)/i,
    /(?:查|看|记|记一下)\s*(?:一下|这个月|今天|本月)?\s*(?:的)?\s*(?:开销|花销|支出|流水|账单)/i,
    /(?:记一笔|记个账|记个账本)/i,
    /(?:记账|账本|财务|劳酬|算账|记一笔账)/,
  ],
  paramExtractors: [
    {
      name: 'roomTarget',
      pattern: /(?:记账|账本|财务|劳酬|开销|花销|支出|流水|账单)/i,
      transform: () => '劳酬',
    },
  ],
}

// ---- 所有意图注册表 ----

/** 11 意图分类完整定义 */
export const INTENT_REGISTRY: IntentMeta[] = [
  focusIntent,
  noteIntent,
  emotionIntent,
  anchorIntent,
  planIntent,
  reflectIntent,
  learnIntent,
  createIntent,
  restIntent,
  exploreIntent,
  financeIntent,
]

/** 意图信息速查表 */
export const INTENT_INFO: Record<IntentCategory, Omit<IntentMeta, 'keywords' | 'patterns' | 'paramExtractors'>> = {
  focus:    { category: 'focus',    label: '专注', icon: '🎯', description: '启动计时器，进入专注模式' },
  note:     { category: 'note',     label: '笔记', icon: '📝', description: '记录笔记、想法、灵感' },
  emotion:  { category: 'emotion',  label: '情绪', icon: '🌸', description: '记录情绪波动' },
  anchor:   { category: 'anchor',   label: '锚点', icon: '⚓', description: '设立、查看、完成锚点' },
  plan:     { category: 'plan',     label: '计划', icon: '📋', description: '制定计划、安排日程' },
  reflect:  { category: 'reflect',  label: '反思', icon: '🪞', description: '回顾、复盘、总结' },
  learn:    { category: 'learn',    label: '学习', icon: '📚', description: '知识探索、技能练习' },
  create:   { category: 'create',   label: '创造', icon: '🎨', description: '输出内容、创作' },
  rest:     { category: 'rest',     label: '休息', icon: '☕', description: '放松、呼吸、暂停' },
  explore:  { category: 'explore',  label: '探索', icon: '🔍', description: '信息查询、统计分析、系统浏览' },
  finance:  { category: 'finance',  label: '记账理财', icon: '💰', description: '打开劳酬空间，记账与预算都在这里' },
  unknown:  { category: 'unknown',  label: '未知', icon: '❓', description: '无法匹配任何意图' },
}

/** 按关键词查找意图 */
export function findIntentByKeyword(keyword: string): IntentMeta | undefined {
  const lower = keyword.toLowerCase()
  return INTENT_REGISTRY.find(i => i.keywords.some(k => k.toLowerCase().includes(lower) || lower.includes(k.toLowerCase())))
}

/** 获取所有意图分类列表 */
export function getAllIntentCategories(): IntentCategory[] {
  return INTENT_REGISTRY.map(i => i.category)
}