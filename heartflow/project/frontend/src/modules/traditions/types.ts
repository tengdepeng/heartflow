// ============================================================
// 文明根系 · 类型定义
// 蓝图定义：
//   技艺/仪式/民俗记录：记录传统技艺、仪式流程、民俗知识
//   公共文明镜像：共享的文化记忆库
// ============================================================

/** 技艺类别 */
export type CraftCategory =
  | 'handicraft'    // 手工艺
  | 'culinary'      // 烹饪
  | 'textile'       // 纺织
  | 'woodwork'      // 木工
  | 'metalwork'     // 金工
  | 'ceramic'       // 陶瓷
  | 'painting'      // 绘画
  | 'music'         // 音乐
  | 'dance'         // 舞蹈
  | 'literature'    // 文学
  | 'medicine'      // 医药
  | 'agriculture'   // 农耕
  | 'architecture'  // 建筑
  | 'other'         // 其他

export const CRAFT_CATEGORY_LABELS: Record<CraftCategory, string> = {
  handicraft: '手工艺',
  culinary: '烹饪',
  textile: '纺织',
  woodwork: '木工',
  metalwork: '金工',
  ceramic: '陶瓷',
  painting: '绘画',
  music: '音乐',
  dance: '舞蹈',
  literature: '文学',
  medicine: '医药',
  agriculture: '农耕',
  architecture: '建筑',
  other: '其他',
}

/** 仪式类型 */
export type RitualType =
  | 'life'          // 人生仪礼
  | 'seasonal'      // 岁时节令
  | 'agricultural'  // 农耕仪式
  | 'ancestral'     // 祭祖
  | 'healing'       // 疗愈
  | 'celebration'   // 庆典
  | 'mourning'      // 哀悼
  | 'transition'    // 过渡仪式
  | 'daily'         // 日常仪式
  | 'custom'        // 自定义

export const RITUAL_TYPE_LABELS: Record<RitualType, string> = {
  life: '人生仪礼',
  seasonal: '岁时节令',
  agricultural: '农耕仪式',
  ancestral: '祭祖',
  healing: '疗愈',
  celebration: '庆典',
  mourning: '哀悼',
  transition: '过渡仪式',
  daily: '日常仪式',
  custom: '自定义',
}

/** 民俗条目 */
export interface FolkloreEntry {
  id: string
  /** 名称 */
  name: string
  /** 类别 */
  category: CraftCategory | RitualType
  /** 来源地区 */
  region: string
  /** 详细描述 */
  description: string
  /** 操作步骤/仪式流程 */
  steps: string[]
  /** 所需材料/器具 */
  materials: string[]
  /** 寓意/象征 */
  meanings: string[]
  /** 传承人 */
  inheritor?: string
  /** 标签 */
  tags: string[]
  /** 是否濒危 */
  endangered: boolean
  /** 记录时间 */
  recordedAt: string
  /** 最后实践时间 */
  lastPracticedAt?: string
  /** 实践次数 */
  practiceCount: number
  /** 来源（个人/家族/社区） */
  source: 'personal' | 'family' | 'community' | 'public'
  /** 图片/视频 URL */
  mediaUrls: string[]
}

/** 文明镜像 */
export interface CivilizationMirror {
  id: string
  /** 名称 */
  name: string
  /** 覆盖地区 */
  region: string
  /** 覆盖时期 */
  period: string
  /** 包含的民俗条目数 */
  entryCount: number
  /** 创建时间 */
  createdAt: string
  /** 更新时间 */
  updatedAt: string
  /** 贡献者数 */
  contributors: number
  /** 是否公开 */
  public: boolean
  /** 描述 */
  description: string
  /** 标签 */
  tags: string[]
}

/** 民俗统计 */
export interface FolkloreStats {
  totalEntries: number
  byCategory: { category: string; label: string; count: number }[]
  byRegion: { region: string; count: number }[]
  endangered: number
  totalPracticeCount: number
  recentlyRecorded: number // 最近30天
  recentlyPracticed: number
}