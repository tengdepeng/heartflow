// ============================================================
// 应用空间自定义引擎 · 预置模板
// ============================================================

import type { CustomDimension, DimensionConfig, SpacePreset } from './types'
import { DIMENSION_META } from './types'

// ---- helper ----

/** 快速创建维度配置 */
function dim(dimension: CustomDimension, options: Record<string, any>): DimensionConfig {
  const meta = DIMENSION_META[dimension]
  return {
    dimension,
    label: meta.label,
    icon: meta.icon,
    options,
  }
}

// ---- 预置模板 ----

/**
 * 标准空间：9 房间，全功能
 * - 结构：9 个房间全开
 * - 功能：全部启用
 * - 交互：完整手势集
 * - 风格：默认主题
 * - 数据：全量同步
 * - 权限：完整访问控制
 * - 场景：全部场景
 */
const STANDARD: SpacePreset = {
  id: 'standard',
  name: '标准空间',
  description: '包含 9 个房间和完整功能，适合作息与自我管理全流程',
  icon: 'Building2',
  dimensions: [
    dim('structure',   { rooms: ['home', 'garden', 'study', 'craft', 'relation', 'archive', 'emotion', 'touchpoints', 'career'], layout: 'grid' }),
    dim('features',    { enabled: ['timer', 'anchor', 'carrier', 'astrolabe', 'gesture', 'goal', 'output', 'seasonal', 'bag', 'plugin', 'advisor', 'automation', 'visualization', 'sync'] }),
    dim('interaction', { gestures: 'full', keyboardShortcuts: true, hapticFeedback: true, soundEnabled: true }),
    dim('style',       { theme: 'dark', activeStylePack: 'default-gravity', transitionDuration: 350 }),
    dim('data',        { sync: 'full', autoBackup: true, retentionDays: 365 }),
    dim('permission',  { role: 'owner', multiUser: true, accessControl: 'full' }),
    dim('scene',       { presets: ['default', 'focus', 'relax', 'night'], activeScene: 'default' }),
  ],
}

/**
 * 极简空间：5 房间，精简功能
 * - 结构：5 个核心房间
 * - 功能：基础功能
 * - 交互：核心手势
 * - 风格：简洁主题
 * - 数据：本地存储
 * - 权限：单用户
 * - 场景：基础场景
 */
const MINIMAL: SpacePreset = {
  id: 'minimal',
  name: '极简空间',
  description: '精简至 5 个核心房间，专注基础功能，适合轻量使用',
  icon: 'Minimize2',
  dimensions: [
    dim('structure',   { rooms: ['home', 'garden', 'study', 'emotion', 'archive'], layout: 'list' }),
    dim('features',    { enabled: ['timer', 'anchor', 'carrier', 'gesture', 'goal', 'output'] }),
    dim('interaction', { gestures: 'essential', keyboardShortcuts: true, hapticFeedback: false, soundEnabled: true }),
    dim('style',       { theme: 'dark', activeStylePack: 'default-gravity', transitionDuration: 200 }),
    dim('data',        { sync: 'local', autoBackup: false, retentionDays: 90 }),
    dim('permission',  { role: 'owner', multiUser: false, accessControl: 'basic' }),
    dim('scene',       { presets: ['default', 'focus'], activeScene: 'default' }),
  ],
}

/**
 * 禅意空间：4 房间，极简体验
 * - 结构：4 个最核心房间
 * - 功能：仅核心功能
 * - 交互：最少手势
 * - 风格：禅意主题
 * - 数据：本地存储
 * - 权限：单用户
 * - 场景：禅意场景
 */
const ZEN: SpacePreset = {
  id: 'zen',
  name: '禅意空间',
  description: '仅保留 4 个最核心房间，极致简约，适合深度冥想与专注',
  icon: 'Leaf',
  dimensions: [
    dim('structure',   { rooms: ['home', 'garden', 'study', 'emotion'], layout: 'flow' }),
    dim('features',    { enabled: ['timer', 'anchor', 'gesture'] }),
    dim('interaction', { gestures: 'minimal', keyboardShortcuts: false, hapticFeedback: false, soundEnabled: false }),
    dim('style',       { theme: 'light', activeStylePack: 'zen', transitionDuration: 600 }),
    dim('data',        { sync: 'local', autoBackup: false, retentionDays: 30 }),
    dim('permission',  { role: 'owner', multiUser: false, accessControl: 'basic' }),
    dim('scene',       { presets: ['default', 'focus'], activeScene: 'default' }),
  ],
}

/**
 * 创意空间：6 房间，创作导向
 * - 结构：6 个房间
 * - 功能：创作相关功能
 * - 交互：完整手势集
 * - 风格：暗色主题
 * - 数据：本地存储
 * - 权限：单用户
 * - 场景：4 个场景
 */
const CREATIVE: SpacePreset = {
  id: 'creative',
  name: '创意空间',
  description: '主打创作与表达，6 个房间覆盖灵感收集到作品输出全流程',
  icon: 'Palette',
  dimensions: [
    dim('structure',   { rooms: ['home', 'garden', 'study', 'craft', 'emotion', 'archive'], layout: 'grid' }),
    dim('features',    { enabled: ['timer', 'anchor', 'carrier', 'gesture', 'goal', 'output', 'visualization', 'bag'] }),
    dim('interaction', { gestures: 'full', keyboardShortcuts: true, hapticFeedback: true, soundEnabled: true }),
    dim('style',       { theme: 'dark', activeStylePack: 'default-gravity', transitionDuration: 350 }),
    dim('data',        { sync: 'local', autoBackup: true, retentionDays: 180 }),
    dim('permission',  { role: 'owner', multiUser: false, accessControl: 'basic' }),
    dim('scene',       { presets: ['default', 'focus', 'relax', 'creative'], activeScene: 'default' }),
  ],
}

/**
 * 学人空间：6 房间，学习导向
 * - 结构：6 个房间
 * - 功能：学习研究相关功能
 * - 交互：核心手势
 * - 风格：亮色主题
 * - 数据：全量同步
 * - 权限：Owner 角色
 * - 场景：3 个场景
 */
const SCHOLAR: SpacePreset = {
  id: 'scholar',
  name: '学人空间',
  description: '面向学习与研究，6 个房间构建知识体系，适合深度学习者',
  icon: 'BookOpen',
  dimensions: [
    dim('structure',   { rooms: ['home', 'study', 'archive', 'garden', 'emotion', 'knowledge'], layout: 'grid' }),
    dim('features',    { enabled: ['timer', 'anchor', 'goal', 'output', 'advisor', 'automation', 'visualization', 'plugin'] }),
    dim('interaction', { gestures: 'essential', keyboardShortcuts: true, hapticFeedback: false, soundEnabled: true }),
    dim('style',       { theme: 'light', activeStylePack: 'default-gravity', transitionDuration: 300 }),
    dim('data',        { sync: 'full', autoBackup: true, retentionDays: 365 }),
    dim('permission',  { role: 'owner', multiUser: false, accessControl: 'basic' }),
    dim('scene',       { presets: ['default', 'focus', 'study'], activeScene: 'default' }),
  ],
}

/**
 * 社交空间：5 房间，社交导向
 * - 结构：5 个房间
 * - 功能：社交相关功能
 * - 交互：核心手势
 * - 风格：暗色主题
 * - 数据：本地存储
 * - 权限：单用户
 * - 场景：3 个场景
 */
const SOCIAL: SpacePreset = {
  id: 'social',
  name: '社交空间',
  description: '聚焦人际关系管理，5 个房间覆盖社交网络与触点维护',
  icon: 'Users',
  dimensions: [
    dim('structure',   { rooms: ['home', 'relation', 'garden', 'archive', 'touchpoints'], layout: 'grid' }),
    dim('features',    { enabled: ['timer', 'anchor', 'carrier', 'gesture', 'output', 'advisor', 'sync'] }),
    dim('interaction', { gestures: 'essential', keyboardShortcuts: true, hapticFeedback: true, soundEnabled: true }),
    dim('style',       { theme: 'dark', activeStylePack: 'default-gravity', transitionDuration: 300 }),
    dim('data',        { sync: 'local', autoBackup: false, retentionDays: 180 }),
    dim('permission',  { role: 'owner', multiUser: false, accessControl: 'basic' }),
    dim('scene',       { presets: ['default', 'social', 'relax'], activeScene: 'default' }),
  ],
}

/**
 * 行者空间：4 房间，极简漫游
 * - 结构：4 个房间
 * - 功能：行囊核心功能
 * - 交互：最少手势
 * - 风格：暗色主题
 * - 数据：本地存储
 * - 权限：单用户
 * - 场景：2 个场景
 */
const WANDERER: SpacePreset = {
  id: 'wanderer',
  name: '行者空间',
  description: '极简漫游体验，4 个房间承载行囊与心绪，适合轻装上路',
  icon: 'Compass',
  dimensions: [
    dim('structure',   { rooms: ['home', 'garden', 'emotion', 'archive'], layout: 'flow' }),
    dim('features',    { enabled: ['timer', 'anchor', 'gesture', 'bag', 'output'] }),
    dim('interaction', { gestures: 'minimal', keyboardShortcuts: false, hapticFeedback: false, soundEnabled: false }),
    dim('style',       { theme: 'dark', activeStylePack: 'default-gravity', transitionDuration: 500 }),
    dim('data',        { sync: 'local', autoBackup: false, retentionDays: 60 }),
    dim('permission',  { role: 'owner', multiUser: false, accessControl: 'basic' }),
    dim('scene',       { presets: ['default', 'focus'], activeScene: 'default' }),
  ],
}

/**
 * 疗愈空间：5 房间，身心疗愈
 * - 结构：5 个房间
 * - 功能：疗愈相关功能
 * - 交互：完整手势集
 * - 风格：亮色主题
 * - 数据：本地存储
 * - 权限：Owner 角色
 * - 场景：4 个场景
 */
const HEALER: SpacePreset = {
  id: 'healer',
  name: '疗愈空间',
  description: '专注身心疗愈与情绪管理，5 个房间营造温暖安心的内在空间',
  icon: 'Heart',
  dimensions: [
    dim('structure',   { rooms: ['home', 'garden', 'emotion', 'study', 'archive'], layout: 'grid' }),
    dim('features',    { enabled: ['timer', 'anchor', 'carrier', 'gesture', 'goal', 'output', 'seasonal', 'advisor'] }),
    dim('interaction', { gestures: 'full', keyboardShortcuts: true, hapticFeedback: true, soundEnabled: true }),
    dim('style',       { theme: 'light', activeStylePack: 'default-gravity', transitionDuration: 400 }),
    dim('data',        { sync: 'local', autoBackup: true, retentionDays: 180 }),
    dim('permission',  { role: 'owner', multiUser: false, accessControl: 'basic' }),
    dim('scene',       { presets: ['default', 'relax', 'focus', 'heal'], activeScene: 'default' }),
  ],
}

/** 所有预置模板 */
export const SPACE_PRESETS: SpacePreset[] = [STANDARD, MINIMAL, ZEN, CREATIVE, SCHOLAR, SOCIAL, WANDERER, HEALER]

// ---- 查询 / 应用 ----

/** 根据 ID 获取预设 */
export function getPresetById(id: string): SpacePreset | undefined {
  return SPACE_PRESETS.find(p => p.id === id)
}

/** 应用预设：返回该预设的维度配置列表（深拷贝） */
export function applyPreset(id: string): DimensionConfig[] | null {
  const preset = getPresetById(id)
  if (!preset) return null
  return JSON.parse(JSON.stringify(preset.dimensions))
}