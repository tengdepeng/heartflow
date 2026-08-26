// ============================================================
// 思绪书房 · 笔记模板系统（P19-5）
// 蓝图：预设模板库、模板自定义、从模板创建笔记
// ============================================================

import { ref } from 'vue'
import type { Note } from '../../types'


// ---- 模板类型 ----

/** 模板分类 */
export type TemplateCategory =
  | 'work'
  | 'journal'
  | 'planning'
  | 'reading'
  | 'creativity'
  | 'review'
  | 'goals'
  | 'learning'

/** 模板字段定义 */
export interface TemplateField {
  /** 字段名 */
  key: string
  /** 显示标签 */
  label: string
  /** 字段类型 */
  type: 'text' | 'textarea' | 'date' | 'select' | 'number' | 'checkbox' | 'tags'
  /** 占位符 */
  placeholder?: string
  /** 默认值 */
  defaultValue?: string | number | boolean | string[]
  /** 是否必填 */
  required: boolean
  /** 选项（select 类型） */
  options?: string[]
  /** 排序权重 */
  order: number
}

/** 笔记模板 */
export interface NoteTemplate {
  /** 模板唯一标识 */
  id: string
  /** 模板名称 */
  name: string
  /** 模板描述 */
  description: string
  /** 分类 */
  category: TemplateCategory
  /** 模板图标（emoji 或图标名） */
  icon: string
  /** 默认标签 */
  defaultTags: string[]
  /** 模板字段定义 */
  fields: TemplateField[]
  /** 预设内容模板（支持 {{fieldKey}} 占位符） */
  contentTemplate: string
  /** 标题模板 */
  titleTemplate: string
  /** 是否为内置模板 */
  builtin: boolean
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 使用次数 */
  useCount: number
}

/** 模板预览数据 */
export interface TemplatePreview {
  /** 模板 */
  template: NoteTemplate
  /** 填充后的标题 */
  previewTitle: string
  /** 填充后的内容 */
  previewContent: string
  /** 填充后的标签 */
  previewTags: string[]
}

// ---- 模板分类标签 ----

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  work: '工作',
  journal: '日记',
  planning: '规划',
  reading: '阅读',
  creativity: '创意',
  review: '回顾',
  goals: '目标',
  learning: '学习',
}

export const TEMPLATE_CATEGORY_ICONS: Record<TemplateCategory, string> = {
  work: 'briefcase',
  journal: 'book',
  planning: 'calendar',
  reading: 'book-open',
  creativity: 'lightbulb',
  review: 'refresh',
  goals: 'target',
  learning: 'graduation-cap',
}

// ---- 预置模板库 ----

const BUILTIN_TEMPLATES: NoteTemplate[] = [
  // 1. 会议笔记
  {
    id: 'builtin:meeting-notes',
    name: '会议笔记',
    description: '结构化会议记录模板，包含议程、讨论要点、行动项和后续安排',
    category: 'work',
    icon: 'users',
    defaultTags: ['会议', '工作'],
    fields: [
      {
        key: 'meetingTopic',
        label: '会议主题',
        type: 'text',
        placeholder: '请输入会议主题',
        required: true,
        order: 1,
      },
      {
        key: 'meetingDate',
        label: '会议日期',
        type: 'date',
        required: true,
        order: 2,
      },
      {
        key: 'attendees',
        label: '参会人员',
        type: 'text',
        placeholder: '张三、李四、王五',
        required: false,
        order: 3,
      },
      {
        key: 'location',
        label: '会议地点',
        type: 'text',
        placeholder: '会议室 A / 线上',
        required: false,
        order: 4,
      },
      {
        key: 'agenda',
        label: '议程',
        type: 'textarea',
        placeholder: '- 议题一\n- 议题二',
        required: false,
        order: 5,
      },
      {
        key: 'discussion',
        label: '讨论要点',
        type: 'textarea',
        placeholder: '记录关键讨论内容...',
        required: false,
        order: 6,
      },
      {
        key: 'decisions',
        label: '决议事项',
        type: 'textarea',
        placeholder: '- 决议一\n- 决议二',
        required: false,
        order: 7,
      },
      {
        key: 'actionItems',
        label: '行动项',
        type: 'textarea',
        placeholder: '- [ ] 任务一 @负责人 截止日期\n- [ ] 任务二 @负责人 截止日期',
        required: false,
        order: 8,
      },
      {
        key: 'nextMeeting',
        label: '下次会议时间',
        type: 'date',
        required: false,
        order: 9,
      },
      {
        key: 'notes',
        label: '补充备注',
        type: 'textarea',
        placeholder: '其他需要记录的内容...',
        required: false,
        order: 10,
      },
    ],
    contentTemplate: `# {{meetingTopic}}

**日期**: {{meetingDate}}
**参会人**: {{attendees}}
**地点**: {{location}}

---

## 议程

{{agenda}}

---

## 讨论要点

{{discussion}}

---

## 决议事项

{{decisions}}

---

## 行动项

{{actionItems}}

---

## 下次会议

{{nextMeeting}}

---

## 备注

{{notes}}`,
    titleTemplate: '会议: {{meetingTopic}} - {{meetingDate}}',
    builtin: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    useCount: 0,
  },

  // 2. 每日日记
  {
    id: 'builtin:daily-journal',
    name: '每日日记',
    description: '每日反思与记录，包含心情、收获、感恩和明日计划',
    category: 'journal',
    icon: 'book',
    defaultTags: ['日记', '日常'],
    fields: [
      {
        key: 'date',
        label: '日期',
        type: 'date',
        required: true,
        order: 1,
      },
      {
        key: 'mood',
        label: '今日心情',
        type: 'select',
        options: ['开心', '平静', '焦虑', '疲惫', '充实', '期待', '感恩', '思考'],
        required: true,
        order: 2,
      },
      {
        key: 'weather',
        label: '天气',
        type: 'select',
        options: ['晴', '多云', '阴', '雨', '雪', '风'],
        required: false,
        order: 3,
      },
      {
        key: 'highlights',
        label: '今日亮点',
        type: 'textarea',
        placeholder: '今天最值得记录的事情...',
        required: false,
        order: 4,
      },
      {
        key: 'gratitude',
        label: '感恩时刻',
        type: 'textarea',
        placeholder: '今天值得感恩的三件事...',
        required: false,
        order: 5,
      },
      {
        key: 'learnings',
        label: '今日收获',
        type: 'textarea',
        placeholder: '今天学到了什么新知识或感悟...',
        required: false,
        order: 6,
      },
      {
        key: 'challenges',
        label: '遇到的挑战',
        type: 'textarea',
        placeholder: '今天遇到了什么困难，如何应对的...',
        required: false,
        order: 7,
      },
      {
        key: 'tomorrow',
        label: '明日计划',
        type: 'textarea',
        placeholder: '- [ ] 任务一\n- [ ] 任务二',
        required: false,
        order: 8,
      },
      {
        key: 'freeWriting',
        label: '自由书写',
        type: 'textarea',
        placeholder: '随心所欲地写下任何想法...',
        required: false,
        order: 9,
      },
    ],
    contentTemplate: `# {{date}} 日记

**心情**: {{mood}} | **天气**: {{weather}}

---

## 今日亮点

{{highlights}}

---

## 感恩时刻

{{gratitude}}

---

## 今日收获

{{learnings}}

---

## 遇到的挑战

{{challenges}}

---

## 明日计划

{{tomorrow}}

---

## 自由书写

{{freeWriting}}`,
    titleTemplate: '{{date}} 日记',
    builtin: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    useCount: 0,
  },

  // 3. 项目规划
  {
    id: 'builtin:project-planning',
    name: '项目规划',
    description: '系统化项目规划模板，包含目标、里程碑、资源、风险和进度追踪',
    category: 'planning',
    icon: 'clipboard',
    defaultTags: ['项目', '规划'],
    fields: [
      {
        key: 'projectName',
        label: '项目名称',
        type: 'text',
        placeholder: '请输入项目名称',
        required: true,
        order: 1,
      },
      {
        key: 'objective',
        label: '项目目标',
        type: 'textarea',
        placeholder: '描述项目的核心目标和预期成果...',
        required: true,
        order: 2,
      },
      {
        key: 'scope',
        label: '项目范围',
        type: 'textarea',
        placeholder: '明确项目的边界，包含和不包含的内容...',
        required: false,
        order: 3,
      },
      {
        key: 'stakeholders',
        label: '干系人',
        type: 'textarea',
        placeholder: '- 产品经理: 张三\n- 技术负责人: 李四',
        required: false,
        order: 4,
      },
      {
        key: 'milestones',
        label: '关键里程碑',
        type: 'textarea',
        placeholder: '- [ ] M1: 需求评审 2025-01-15\n- [ ] M2: 原型设计 2025-01-30\n- [ ] M3: 开发完成 2025-02-28\n- [ ] M4: 上线发布 2025-03-15',
        required: false,
        order: 5,
      },
      {
        key: 'resources',
        label: '资源需求',
        type: 'textarea',
        placeholder: '人力、预算、工具等资源需求...',
        required: false,
        order: 6,
      },
      {
        key: 'risks',
        label: '风险与应对',
        type: 'textarea',
        placeholder: '- 风险一: 描述 | 影响: 高/中/低 | 应对措施\n- 风险二: ...',
        required: false,
        order: 7,
      },
      {
        key: 'timeline',
        label: '时间线',
        type: 'textarea',
        placeholder: '预计开始: 2025-01-01\n预计结束: 2025-03-31',
        required: false,
        order: 8,
      },
      {
        key: 'successCriteria',
        label: '成功标准',
        type: 'textarea',
        placeholder: '如何衡量项目成功...',
        required: false,
        order: 9,
      },
      {
        key: 'weeklyUpdates',
        label: '每周进展',
        type: 'textarea',
        placeholder: '记录每周的关键进展...',
        required: false,
        order: 10,
      },
    ],
    contentTemplate: `# 项目: {{projectName}}

---

## 项目目标

{{objective}}

---

## 项目范围

{{scope}}

---

## 干系人

{{stakeholders}}

---

## 关键里程碑

{{milestones}}

---

## 资源需求

{{resources}}

---

## 风险与应对

{{risks}}

---

## 时间线

{{timeline}}

---

## 成功标准

{{successCriteria}}

---

## 每周进展

{{weeklyUpdates}}`,
    titleTemplate: '项目: {{projectName}}',
    builtin: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    useCount: 0,
  },

  // 4. 读书笔记
  {
    id: 'builtin:book-notes',
    name: '读书笔记',
    description: '结构化读书笔记，包含书籍信息、核心观点、摘录和个人感悟',
    category: 'reading',
    icon: 'book-open',
    defaultTags: ['阅读', '读书笔记'],
    fields: [
      {
        key: 'bookTitle',
        label: '书名',
        type: 'text',
        placeholder: '请输入书名',
        required: true,
        order: 1,
      },
      {
        key: 'author',
        label: '作者',
        type: 'text',
        placeholder: '请输入作者',
        required: true,
        order: 2,
      },
      {
        key: 'rating',
        label: '评分',
        type: 'select',
        options: ['5 - 强烈推荐', '4 - 推荐', '3 - 尚可', '2 - 一般', '1 - 不推荐'],
        required: false,
        order: 3,
      },
      {
        key: 'readDate',
        label: '阅读日期',
        type: 'date',
        required: false,
        order: 4,
      },
      {
        key: 'category',
        label: '分类',
        type: 'select',
        options: ['技术', '人文', '商业', '心理', '小说', '哲学', '历史', '科学', '自我提升', '其他'],
        required: false,
        order: 5,
      },
      {
        key: 'coreIdeas',
        label: '核心观点',
        type: 'textarea',
        placeholder: '总结书中的核心思想...',
        required: false,
        order: 6,
      },
      {
        key: 'keyQuotes',
        label: '精彩摘录',
        type: 'textarea',
        placeholder: '> 摘录一 (页码)\n> 摘录二 (页码)',
        required: false,
        order: 7,
      },
      {
        key: 'personalThoughts',
        label: '个人感悟',
        type: 'textarea',
        placeholder: '这本书对你有什么启发...',
        required: false,
        order: 8,
      },
      {
        key: 'actionItems',
        label: '行动清单',
        type: 'textarea',
        placeholder: '- [ ] 基于书中观点要做的改变...',
        required: false,
        order: 9,
      },
      {
        key: 'relatedBooks',
        label: '相关书籍',
        type: 'textarea',
        placeholder: '与此主题相关的其他书籍...',
        required: false,
        order: 10,
      },
    ],
    contentTemplate: `# {{bookTitle}}

**作者**: {{author}} | **评分**: {{rating}} | **阅读时间**: {{readDate}} | **分类**: {{category}}

---

## 核心观点

{{coreIdeas}}

---

## 精彩摘录

{{keyQuotes}}

---

## 个人感悟

{{personalThoughts}}

---

## 行动清单

{{actionItems}}

---

## 相关推荐

{{relatedBooks}}`,
    titleTemplate: '读书笔记: {{bookTitle}} - {{author}}',
    builtin: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    useCount: 0,
  },

  // 5. 灵感捕捉
  {
    id: 'builtin:idea-capture',
    name: '灵感捕捉',
    description: '快速捕捉灵感和创意想法，支持关联、优先级和可行性评估',
    category: 'creativity',
    icon: 'lightbulb',
    defaultTags: ['灵感', '创意'],
    fields: [
      {
        key: 'ideaTitle',
        label: '灵感标题',
        type: 'text',
        placeholder: '给这个灵感起个名字',
        required: true,
        order: 1,
      },
      {
        key: 'inspiration',
        label: '灵感来源',
        type: 'text',
        placeholder: '是什么触发了这个想法？',
        required: false,
        order: 2,
      },
      {
        key: 'description',
        label: '详细描述',
        type: 'textarea',
        placeholder: '尽可能详细地描述这个想法...',
        required: true,
        order: 3,
      },
      {
        key: 'potential',
        label: '潜力评估',
        type: 'select',
        options: ['高潜力 - 值得深入探索', '中潜力 - 需要验证', '低潜力 - 暂且记录'],
        required: false,
        order: 4,
      },
      {
        key: 'feasibility',
        label: '可行性',
        type: 'select',
        options: ['立即可行', '短期可行', '需要资源', '远期设想'],
        required: false,
        order: 5,
      },
      {
        key: 'relatedIdeas',
        label: '关联想法',
        type: 'textarea',
        placeholder: '与哪些已有想法或项目相关...',
        required: false,
        order: 6,
      },
      {
        key: 'nextSteps',
        label: '下一步行动',
        type: 'textarea',
        placeholder: '- [ ] 第一步\n- [ ] 第二步',
        required: false,
        order: 7,
      },
      {
        key: 'constraints',
        label: '限制条件',
        type: 'textarea',
        placeholder: '实施这个想法可能面临的限制...',
        required: false,
        order: 8,
      },
    ],
    contentTemplate: `# {{ideaTitle}}

**灵感来源**: {{inspiration}}
**潜力**: {{potential}} | **可行性**: {{feasibility}}

---

## 详细描述

{{description}}

---

## 关联想法

{{relatedIdeas}}

---

## 下一步行动

{{nextSteps}}

---

## 限制条件

{{constraints}}`,
    titleTemplate: '灵感: {{ideaTitle}}',
    builtin: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    useCount: 0,
  },

  // 6. 周回顾
  {
    id: 'builtin:weekly-review',
    name: '周回顾',
    description: '每周回顾模板，总结本周成就、反思改进点、规划下周目标',
    category: 'review',
    icon: 'refresh',
    defaultTags: ['回顾', '周报'],
    fields: [
      {
        key: 'week',
        label: '周次',
        type: 'text',
        placeholder: '如: 2025年第5周',
        required: true,
        order: 1,
      },
      {
        key: 'dateRange',
        label: '日期范围',
        type: 'text',
        placeholder: '2025-01-27 ~ 2025-02-02',
        required: true,
        order: 2,
      },
      {
        key: 'achievements',
        label: '本周成就',
        type: 'textarea',
        placeholder: '- 完成了什么\n- 取得了什么进展',
        required: true,
        order: 3,
      },
      {
        key: 'challenges',
        label: '遇到的挑战',
        type: 'textarea',
        placeholder: '本周遇到了什么困难？如何解决的？',
        required: false,
        order: 4,
      },
      {
        key: 'learnings',
        label: '经验教训',
        type: 'textarea',
        placeholder: '这周学到了什么？有什么可以改进的？',
        required: false,
        order: 5,
      },
      {
        key: 'improvements',
        label: '改进方向',
        type: 'textarea',
        placeholder: '下周需要改进的地方...',
        required: false,
        order: 6,
      },
      {
        key: 'nextWeekGoals',
        label: '下周目标',
        type: 'textarea',
        placeholder: '- [ ] 目标一\n- [ ] 目标二\n- [ ] 目标三',
        required: true,
        order: 7,
      },
      {
        key: 'focusArea',
        label: '重点领域',
        type: 'select',
        options: ['工作', '学习', '健康', '人际关系', '个人成长', '财务'],
        required: false,
        order: 8,
      },
      {
        key: 'gratitude',
        label: '感恩记录',
        type: 'textarea',
        placeholder: '这周值得感恩的人和事...',
        required: false,
        order: 9,
      },
      {
        key: 'selfRating',
        label: '自我评分',
        type: 'select',
        options: ['10 - 非常满意', '8 - 满意', '6 - 一般', '4 - 不太满意', '2 - 需要改进'],
        required: false,
        order: 10,
      },
    ],
    contentTemplate: `# 周回顾 {{week}}

**日期**: {{dateRange}} | **重点领域**: {{focusArea}} | **自评**: {{selfRating}}

---

## 本周成就

{{achievements}}

---

## 遇到的挑战

{{challenges}}

---

## 经验教训

{{learnings}}

---

## 改进方向

{{improvements}}

---

## 下周目标

{{nextWeekGoals}}

---

## 感恩记录

{{gratitude}}`,
    titleTemplate: '周回顾: {{week}}',
    builtin: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    useCount: 0,
  },

  // 7. 目标设定
  {
    id: 'builtin:goal-setting',
    name: '目标设定',
    description: 'SMART 目标设定模板，包含目标分解、衡量标准、时间节点和追踪',
    category: 'goals',
    icon: 'target',
    defaultTags: ['目标', '规划'],
    fields: [
      {
        key: 'goalName',
        label: '目标名称',
        type: 'text',
        placeholder: '清晰简洁的目标名称',
        required: true,
        order: 1,
      },
      {
        key: 'goalType',
        label: '目标类型',
        type: 'select',
        options: ['年度目标', '季度目标', '月度目标', '项目目标', '个人成长'],
        required: true,
        order: 2,
      },
      {
        key: 'specific',
        label: '具体描述 (Specific)',
        type: 'textarea',
        placeholder: '你想要达成什么具体成果？',
        required: true,
        order: 3,
      },
      {
        key: 'measurable',
        label: '衡量标准 (Measurable)',
        type: 'textarea',
        placeholder: '如何衡量目标是否达成？量化指标是什么？',
        required: true,
        order: 4,
      },
      {
        key: 'achievable',
        label: '可行性分析 (Achievable)',
        type: 'textarea',
        placeholder: '为什么这个目标是可以实现的？你拥有什么资源？',
        required: false,
        order: 5,
      },
      {
        key: 'relevant',
        label: '相关性 (Relevant)',
        type: 'textarea',
        placeholder: '这个目标与你的长期愿景如何关联？',
        required: false,
        order: 6,
      },
      {
        key: 'timeBound',
        label: '时间节点 (Time-bound)',
        type: 'date',
        required: true,
        order: 7,
      },
      {
        key: 'keyResults',
        label: '关键结果',
        type: 'textarea',
        placeholder: '- KR1: 达成XX指标\n- KR2: 完成XX里程碑\n- KR3: 实现XX成果',
        required: false,
        order: 8,
      },
      {
        key: 'milestones',
        label: '里程碑分解',
        type: 'textarea',
        placeholder: '- [ ] 阶段一 (截止日期): 描述\n- [ ] 阶段二 (截止日期): 描述',
        required: false,
        order: 9,
      },
      {
        key: 'obstacles',
        label: '潜在障碍',
        type: 'textarea',
        placeholder: '可能遇到的障碍和应对方案...',
        required: false,
        order: 10,
      },
      {
        key: 'rewards',
        label: '达成奖励',
        type: 'textarea',
        placeholder: '达成目标后给自己的奖励...',
        required: false,
        order: 11,
      },
    ],
    contentTemplate: `# {{goalName}}

**类型**: {{goalType}} | **截止日期**: {{timeBound}}

---

## SMART 目标

- **具体**: {{specific}}
- **可衡量**: {{measurable}}
- **可实现**: {{achievable}}
- **相关性**: {{relevant}}
- **时限**: {{timeBound}}

---

## 关键结果

{{keyResults}}

---

## 里程碑

{{milestones}}

---

## 潜在障碍与应对

{{obstacles}}

---

## 达成奖励

{{rewards}}`,
    titleTemplate: '目标: {{goalName}}',
    builtin: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    useCount: 0,
  },

  // 8. 学习日志
  {
    id: 'builtin:learning-log',
    name: '学习日志',
    description: '系统化学习记录模板，包含知识来源、核心概念、实践应用和复习计划',
    category: 'learning',
    icon: 'graduation-cap',
    defaultTags: ['学习', '知识'],
    fields: [
      {
        key: 'topic',
        label: '学习主题',
        type: 'text',
        placeholder: '本次学习的主题或知识点',
        required: true,
        order: 1,
      },
      {
        key: 'source',
        label: '知识来源',
        type: 'select',
        options: ['书籍', '课程', '文章', '视频', '播客', '实践', '讨论', '其他'],
        required: true,
        order: 2,
      },
      {
        key: 'sourceDetail',
        label: '来源详情',
        type: 'text',
        placeholder: '具体的书名、课程名或链接',
        required: false,
        order: 3,
      },
      {
        key: 'learnDate',
        label: '学习日期',
        type: 'date',
        required: true,
        order: 4,
      },
      {
        key: 'keyConcepts',
        label: '核心概念',
        type: 'textarea',
        placeholder: '- 概念一: 解释\n- 概念二: 解释',
        required: true,
        order: 5,
      },
      {
        key: 'understanding',
        label: '理解程度',
        type: 'select',
        options: ['完全掌握', '基本理解', '一知半解', '需要复习'],
        required: true,
        order: 6,
      },
      {
        key: 'practicalApplication',
        label: '实践应用',
        type: 'textarea',
        placeholder: '如何将所学应用到实际工作或生活中...',
        required: false,
        order: 7,
      },
      {
        key: 'questions',
        label: '待解问题',
        type: 'textarea',
        placeholder: '学习中产生的疑问，需要进一步探索...',
        required: false,
        order: 8,
      },
      {
        key: 'connections',
        label: '知识关联',
        type: 'textarea',
        placeholder: '这个知识点与你已有的知识体系有什么关联...',
        required: false,
        order: 9,
      },
      {
        key: 'nextReview',
        label: '下次复习日期',
        type: 'date',
        required: false,
        order: 10,
      },
      {
        key: 'resources',
        label: '延伸资源',
        type: 'textarea',
        placeholder: '相关书籍、文章、课程推荐...',
        required: false,
        order: 11,
      },
    ],
    contentTemplate: `# {{topic}}

**来源**: {{source}} - {{sourceDetail}} | **日期**: {{learnDate}} | **理解**: {{understanding}}

---

## 核心概念

{{keyConcepts}}

---

## 实践应用

{{practicalApplication}}

---

## 待解问题

{{questions}}

---

## 知识关联

{{connections}}

---

## 复习计划

下次复习: {{nextReview}}

---

## 延伸资源

{{resources}}`,
    titleTemplate: '学习: {{topic}}',
    builtin: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
    useCount: 0,
  },
]

// ---- 模板管理 composable ----

export function useNoteTemplates() {
  /** 所有模板（内置 + 自定义） */
  const templates = ref<NoteTemplate[]>([...BUILTIN_TEMPLATES])

  /**
   * 获取所有模板
   */
  function getTemplates(): NoteTemplate[] {
    return templates.value
  }

  /**
   * 按分类获取模板
   */
  function getTemplatesByCategory(category: TemplateCategory): NoteTemplate[] {
    return templates.value.filter(t => t.category === category)
  }

  /**
   * 获取模板分类列表（含模板数量）
   */
  function getTemplateCategories(): { category: TemplateCategory; label: string; icon: string; count: number }[] {
    const categoryMap = new Map<TemplateCategory, number>()
    for (const t of templates.value) {
      categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + 1)
    }

    return Object.entries(TEMPLATE_CATEGORY_LABELS).map(([cat, label]) => ({
      category: cat as TemplateCategory,
      label,
      icon: TEMPLATE_CATEGORY_ICONS[cat as TemplateCategory],
      count: categoryMap.get(cat as TemplateCategory) || 0,
    }))
  }

  /**
   * 根据 ID 获取模板
   */
  function getTemplateById(id: string): NoteTemplate | undefined {
    return templates.value.find(t => t.id === id)
  }

  /**
   * 搜索模板
   */
  function searchTemplates(
    query: string,
    options?: {
      category?: TemplateCategory
      builtinOnly?: boolean
      customOnly?: boolean
    },
  ): NoteTemplate[] {
    let results = templates.value
    const q = query.toLowerCase().trim()

    if (q) {
      results = results.filter(
        t =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.defaultTags.some(tag => tag.toLowerCase().includes(q)),
      )
    }

    if (options?.category) {
      results = results.filter(t => t.category === options.category)
    }
    if (options?.builtinOnly) {
      results = results.filter(t => t.builtin)
    }
    if (options?.customOnly) {
      results = results.filter(t => !t.builtin)
    }

    // 优先展示使用次数多的模板
    return results.sort((a, b) => b.useCount - a.useCount)
  }

  /**
   * 从模板创建笔记数据
   * 返回填充后的标题、内容和标签，不执行实际的创建操作
   */
  function createFromTemplate(
    templateId: string,
    fieldValues: Record<string, string | number | boolean | string[]>,
  ): { title: string; content: string; tags: string[] } | null {
    const template = getTemplateById(templateId)
    if (!template) return null

    // 填充标题和内容中的占位符
    let title = template.titleTemplate
    let content = template.contentTemplate

    for (const field of template.fields) {
      const value = fieldValues[field.key]
      const strValue = value != null ? String(value) : ''
      title = title.replace(new RegExp(`\\{\\{${field.key}\\}\\}`, 'g'), strValue)
      content = content.replace(new RegExp(`\\{\\{${field.key}\\}\\}`, 'g'), strValue)
    }

    // 清理未填充的占位符
    title = title.replace(/\{\{.*?\}\}/g, '').trim()
    content = content.replace(/\{\{.*?\}\}/g, '').trim()

    // 增加使用计数
    template.useCount++

    return {
      title,
      content,
      tags: [...template.defaultTags],
    }
  }

  /**
   * 使用模板创建笔记（返回 StickyNote 兼容格式的创建参数）
   */
  function createNoteFromTemplate(
    templateId: string,
    fieldValues: Record<string, string | number | boolean | string[]>,
  ): { title: string; content: string; tags: string[] } | null {
    return createFromTemplate(templateId, fieldValues)
  }

  /**
   * 保存自定义模板
   */
  function saveAsTemplate(
    name: string,
    description: string,
    category: TemplateCategory,
    defaultTags: string[],
    titleTemplate: string,
    contentTemplate: string,
    fields: TemplateField[],
    icon: string = 'file',
  ): NoteTemplate {
    const now = new Date().toISOString()
    const template: NoteTemplate = {
      id: `custom:${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      description,
      category,
      icon,
      defaultTags,
      fields,
      contentTemplate,
      titleTemplate,
      builtin: false,
      createdAt: now,
      updatedAt: now,
      useCount: 0,
    }

    templates.value.push(template)
    return template
  }

  /**
   * 从现有笔记创建模板
   */
  function saveFromNote(
    note: Pick<Note, 'title' | 'content' | 'tags'>,
    name: string,
    description: string,
    category: TemplateCategory,
  ): NoteTemplate {
    // 尝试从内容中提取字段
    const placeholderRegex = /(\w+)/g
    const extractedFields: TemplateField[] = []
    const seen = new Set<string>()

    let order = 1
    let match: RegExpExecArray | null
    while ((match = placeholderRegex.exec(note.content)) !== null) {
      const key = match[1].toLowerCase()
      if (!seen.has(key) && key.length > 1 && !['的', '了', '是', '在'].includes(key)) {
        seen.add(key)
        extractedFields.push({
          key,
          label: key,
          type: 'text',
          placeholder: `请输入${key}`,
          required: false,
          order: order++,
        })
      }
    }

    const now = new Date().toISOString()
    const template: NoteTemplate = {
      id: `custom:${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name,
      description,
      category,
      icon: 'file',
      defaultTags: [...note.tags],
      fields: extractedFields.length > 0 ? extractedFields : [
        {
          key: 'content',
          label: '内容',
          type: 'textarea',
          placeholder: '请输入笔记内容',
          required: false,
          order: 1,
        },
      ],
      contentTemplate: note.content,
      titleTemplate: note.title || '{{title}}',
      builtin: false,
      createdAt: now,
      updatedAt: now,
      useCount: 0,
    }

    templates.value.push(template)
    return template
  }

  /**
   * 更新自定义模板
   */
  function updateTemplate(
    id: string,
    updates: Partial<Pick<NoteTemplate, 'name' | 'description' | 'category' | 'icon' | 'defaultTags' | 'fields' | 'contentTemplate' | 'titleTemplate'>>,
  ): NoteTemplate | undefined {
    const template = templates.value.find(t => t.id === id)
    if (!template || template.builtin) return undefined

    if (updates.name !== undefined) template.name = updates.name
    if (updates.description !== undefined) template.description = updates.description
    if (updates.category !== undefined) template.category = updates.category
    if (updates.icon !== undefined) template.icon = updates.icon
    if (updates.defaultTags !== undefined) template.defaultTags = updates.defaultTags
    if (updates.fields !== undefined) template.fields = updates.fields
    if (updates.contentTemplate !== undefined) template.contentTemplate = updates.contentTemplate
    if (updates.titleTemplate !== undefined) template.titleTemplate = updates.titleTemplate
    template.updatedAt = new Date().toISOString()

    return template
  }

  /**
   * 删除自定义模板
   */
  function deleteTemplate(id: string): boolean {
    const index = templates.value.findIndex(t => t.id === id)
    if (index === -1) return false
    const template = templates.value[index]
    if (template.builtin) return false

    templates.value.splice(index, 1)
    return true
  }

  /**
   * 生成模板预览
   */
  function previewTemplate(
    templateId: string,
    fieldValues: Record<string, string | number | boolean | string[]>,
  ): TemplatePreview | null {
    const template = getTemplateById(templateId)
    if (!template) return null

    let previewTitle = template.titleTemplate
    let previewContent = template.contentTemplate

    for (const field of template.fields) {
      const value = fieldValues[field.key]
      const strValue = value != null ? String(value) : `[${field.label}]`
      previewTitle = previewTitle.replace(new RegExp(`\\{\\{${field.key}\\}\\}`, 'g'), strValue)
      previewContent = previewContent.replace(new RegExp(`\\{\\{${field.key}\\}\\}`, 'g'), strValue)
    }

    // 用默认值或标签填充未提供的占位符
    for (const field of template.fields) {
      if (!(field.key in fieldValues)) {
        const fillValue = field.defaultValue != null
          ? String(field.defaultValue)
          : `[${field.label}]`
        previewTitle = previewTitle.replace(new RegExp(`\\{\\{${field.key}\\}\\}`, 'g'), fillValue)
        previewContent = previewContent.replace(new RegExp(`\\{\\{${field.key}\\}\\}`, 'g'), fillValue)
      }
    }

    return {
      template,
      previewTitle,
      previewContent,
      previewTags: [...template.defaultTags],
    }
  }

  /**
   * 复制内置模板为自定义模板
   */
  function duplicateBuiltinTemplate(builtinId: string): NoteTemplate | null {
    const builtin = templates.value.find(t => t.id === builtinId && t.builtin)
    if (!builtin) return null

    const now = new Date().toISOString()
    const custom: NoteTemplate = {
      ...builtin,
      id: `custom:${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: `${builtin.name} (自定义)`,
      builtin: false,
      createdAt: now,
      updatedAt: now,
      useCount: 0,
    }

    templates.value.push(custom)
    return custom
  }

  /**
   * 获取模板使用统计
   */
  function getTemplateStats(): {
    total: number
    builtin: number
    custom: number
    mostUsed: NoteTemplate | null
    byCategory: Record<TemplateCategory, number>
  } {
    const builtin = templates.value.filter(t => t.builtin).length
    const custom = templates.value.filter(t => !t.builtin).length
    const mostUsed = templates.value.length > 0
      ? templates.value.reduce((a, b) => a.useCount > b.useCount ? a : b)
      : null

    const byCategory: Record<TemplateCategory, number> = {
      work: 0,
      journal: 0,
      planning: 0,
      reading: 0,
      creativity: 0,
      review: 0,
      goals: 0,
      learning: 0,
    }
    for (const t of templates.value) {
      byCategory[t.category]++
    }

    return {
      total: templates.value.length,
      builtin,
      custom,
      mostUsed,
      byCategory,
    }
  }

  /**
   * 获取模板的字段默认值映射
   */
  function getFieldDefaults(templateId: string): Record<string, string | number | boolean | string[]> {
    const template = getTemplateById(templateId)
    if (!template) return {}

    const defaults: Record<string, string | number | boolean | string[]> = {}
    for (const field of template.fields) {
      if (field.defaultValue !== undefined) {
        defaults[field.key] = field.defaultValue
      }
    }
    return defaults
  }

  /**
   * 验证模板字段值
   */
  function validateFieldValues(
    templateId: string,
    fieldValues: Record<string, string | number | boolean | string[]>,
  ): { valid: boolean; errors: { field: string; message: string }[] } {
    const template = getTemplateById(templateId)
    if (!template) return { valid: false, errors: [{ field: '', message: '模板不存在' }] }

    const errors: { field: string; message: string }[] = []

    for (const field of template.fields) {
      if (field.required) {
        const value = fieldValues[field.key]
        if (value == null || value === '' || (Array.isArray(value) && value.length === 0)) {
          errors.push({ field: field.key, message: `${field.label} 为必填项` })
        }
      }

      if (field.type === 'number' && fieldValues[field.key] != null) {
        const num = Number(fieldValues[field.key])
        if (isNaN(num)) {
          errors.push({ field: field.key, message: `${field.label} 必须为数字` })
        }
      }

      if (field.type === 'select' && field.options && fieldValues[field.key] != null) {
        const val = String(fieldValues[field.key])
        if (!field.options.includes(val)) {
          errors.push({ field: field.key, message: `${field.label} 的值不在可选项中` })
        }
      }
    }

    return { valid: errors.length === 0, errors }
  }

  return {
    templates,
    getTemplates,
    getTemplatesByCategory,
    getTemplateCategories,
    getTemplateById,
    searchTemplates,
    createFromTemplate,
    createNoteFromTemplate,
    saveAsTemplate,
    saveFromNote,
    updateTemplate,
    deleteTemplate,
    previewTemplate,
    duplicateBuiltinTemplate,
    getTemplateStats,
    getFieldDefaults,
    validateFieldValues,
  }
}

