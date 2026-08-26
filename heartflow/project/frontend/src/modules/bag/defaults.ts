// ============================================================
// 行囊 · 默认数据
// ============================================================

import type { CategoryItem, CategoryTypeInfo, EvolutionEntry } from './types'

/** 7 种抽象类别类型定义 */
export const CATEGORY_TYPES: CategoryTypeInfo[] = [
  { value: 'language', icon: '🔤', label: '语言', color: '#60a0c8', bgColor: 'rgba(96, 160, 200, 0.06)' },
  { value: 'framework', icon: '🧩', label: '框架', color: '#8ab87a', bgColor: 'rgba(138, 184, 122, 0.06)' },
  { value: 'tool', icon: '🔧', label: '工具', color: '#c8a060', bgColor: 'rgba(200, 160, 96, 0.06)' },
  { value: 'design', icon: '🎨', label: '设计', color: '#d080a0', bgColor: 'rgba(208, 128, 160, 0.06)' },
  { value: 'softskill', icon: '💬', label: '软技能', color: '#a0c0d0', bgColor: 'rgba(160, 192, 208, 0.06)' },
  { value: 'domain', icon: '📚', label: '领域知识', color: '#c0a080', bgColor: 'rgba(192, 160, 128, 0.06)' },
  { value: 'certification', icon: '🏅', label: '资质', color: '#e8c060', bgColor: 'rgba(232, 192, 96, 0.06)' },
]

export const DEFAULT_CATEGORIES: CategoryItem[] = [
  {
    id: 'tools',
    name: '工具',
    icon: '🛠',
    color: '#c48a6a',
    proficiency: 65,
    categoryType: 'tool',
    items: [
      { name: 'VS Code', proficiency: 4 },
      { name: 'Git', proficiency: 4 },
      { name: 'Figma', proficiency: 3 },
      { name: 'Postman', proficiency: 3 },
      { name: 'Docker', proficiency: 2 },
    ],
  },
  {
    id: 'knowledge',
    name: '知识',
    icon: '📚',
    color: '#8a9ab8',
    proficiency: 72,
    categoryType: 'framework',
    items: [
      { name: 'Vue 3', proficiency: 4 },
      { name: 'TypeScript', proficiency: 4 },
      { name: 'Node.js', proficiency: 3 },
      { name: 'Python', proficiency: 3 },
      { name: 'CSS', proficiency: 4 },
    ],
  },
  {
    id: 'skills',
    name: '技能',
    icon: '⚡',
    color: '#e8c060',
    proficiency: 58,
    categoryType: 'softskill',
    items: [
      { name: '沟通协作', proficiency: 4 },
      { name: '问题分析', proficiency: 3 },
      { name: '项目管理', proficiency: 3 },
      { name: '技术写作', proficiency: 2 },
    ],
  },
  {
    id: 'materials',
    name: '素材',
    icon: '📦',
    color: '#7a9a8a',
    proficiency: 45,
    categoryType: 'domain',
    items: [
      { name: '组件库', proficiency: 3 },
      { name: '设计稿', proficiency: 2 },
      { name: '代码片段', proficiency: 3 },
      { name: '模板', proficiency: 2 },
    ],
  },
  {
    id: 'keepsakes',
    name: '珍藏',
    icon: '💎',
    color: '#c4a0b8',
    proficiency: 38,
    categoryType: 'certification',
    items: [
      { name: '优秀项目', proficiency: 3 },
      { name: '推荐读物', proficiency: 2 },
      { name: '获奖记录', proficiency: 1 },
    ],
  },
  {
    id: 'references',
    name: '参考',
    icon: '📎',
    color: '#8a8a7a',
    proficiency: 55,
    categoryType: 'design',
    items: [
      { name: 'API 文档', proficiency: 3 },
      { name: '教程链接', proficiency: 3 },
      { name: '速查表', proficiency: 2 },
      { name: '最佳实践', proficiency: 3 },
    ],
  },
  {
    id: 'inspirations',
    name: '灵感',
    icon: '✨',
    color: '#a08ac4',
    proficiency: 42,
    categoryType: 'design',
    items: [
      { name: '创意笔记', proficiency: 3 },
      { name: '灵感片段', proficiency: 2 },
      { name: '未来方向', proficiency: 2 },
    ],
  },
]

export const DEFAULT_EVOLUTION: EvolutionEntry[] = [
  { icon: '🎯', title: '掌握 TypeScript 高级类型', date: '2026-07-20', levelLabel: '精通', levelClass: 'master' },
  { icon: '🌟', title: '完成 Vue 3 组合式 API 项目', date: '2026-07-15', levelLabel: '进阶', levelClass: 'advanced' },
  { icon: '📘', title: '阅读《设计模式》并实践', date: '2026-07-08', levelLabel: '入门', levelClass: 'beginner' },
  { icon: '🔧', title: '配置新的开发环境工具链', date: '2026-06-28', levelLabel: '新增', levelClass: 'new' },
]