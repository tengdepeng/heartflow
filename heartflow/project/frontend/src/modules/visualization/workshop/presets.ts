// ============================================================
// 数据可视化基础框架 · 预置材质库（起点种子）
//
// 蓝图 模块〇「第一层：视觉材质工坊」声明了材质库起点
//   （发光15 / 水墨10 / 自然18 / 手工10 / 几何10 / 音波6 /
//     纹理基底9），并约定「全部可拆解、可修改、可删除」——
//   系统不预设"推荐"材质，只提供规则参数的预设组合作为起点。
//
// 此处以「8 类、每类一组代表作」的轻量种子落地，与 workshop 的
// CRUD 引擎配合：首次进入材质库时惰性填入，用户可自由增删改。
// 种子刻意克制，避免样例过度膨胀，满足宪法第2条「超级自定义」。
// ============================================================

import type { MetaphorType, VisualElementType } from '../types'
import {
  createMaterial,
  clearMaterialStore,
  getMaterialCount,
  type MaterialGroup,
  type MaterialCreateConfig,
} from './index'

export type { MaterialGroup }

/** 蓝图声明的各分类数量：15+10+18+10+10+6+9 = 78 */
export const MATERIAL_GROUP_TOTALS: Record<MaterialGroup, number> = {
  glow: 15,
  ink: 10,
  nature: 18,
  handcraft: 10,
  geometry: 10,
  wave: 6,
  texture: 9,
}

/** 分类的显示元信息 */
export const MATERIAL_GROUPS: { key: MaterialGroup; label: string; hint: string }[] = [
  { key: 'glow', label: '发光', hint: '光点 / 光丝 / 光晕 / 光弧 · 明暗与弥散' },
  { key: 'ink', label: '水墨', hint: '墨点 / 墨线 / 墨晕 / 枯笔 · 浓淡与飞白' },
  { key: 'nature', label: '自然', hint: '年轮 / 木纹 / 藤蔓 / 石纹 · 疏密与风化' },
  { key: 'handcraft', label: '手工', hint: '针脚 / 绣线 / 编织线 · 线粗细与疏密' },
  { key: 'geometry', label: '几何', hint: '矩形 / 菱形 / 六边形 · 结构与层次' },
  { key: 'wave', label: '音波', hint: '波形线 / 频谱柱 / 节拍点 · 振幅与频率' },
  { key: 'texture', label: '纹理基底', hint: '宣纸 / 牛皮纸 / 帆布 / 纸感 · 基底的质感' },
]

/**
 * 每个预置材质都会打上所属分类标签，便于市场按类浏览。
 * 数据项内可覆盖隐喻（如自然类内部混合木/水/土、手工类混合金/木），
 * 未覆盖时回退到家族隐喻。
 */
type PresetEntry = {
  name: string
  primary: string
  metaphor?: MetaphorType
  secondary?: string
  radius?: string
  opacity?: string
  width?: string
}

type PresetFamily = {
  group: MaterialGroup
  metaphor: MetaphorType
  entries: PresetEntry[]
}

const PRESET_FAMILIES: PresetFamily[] = [
  {
    group: 'glow',
    metaphor: 'light',
    entries: [
      { name: '暖金光点', primary: '#e8b84a', radius: '6', opacity: '0.9' },
      { name: '星辉光丝', primary: '#f0d6b0', width: '2', opacity: '0.7' },
      { name: '暮色光晕', primary: '#d4a574', radius: '10', opacity: '0.5' },
      { name: '晨曦光弧', primary: '#f5c94a', width: '3', opacity: '0.8' },
      { name: '静烛微光', primary: '#e0a060', radius: '4', opacity: '0.85' },
      { name: '烛焰暖芒', primary: '#f0a040', radius: '7', opacity: '0.75' },
      { name: '银河碎点', primary: '#e0e8f0', radius: '2', opacity: '0.9' },
      { name: '萤火流辉', primary: '#d8f06a', radius: '3', opacity: '0.85' },
      { name: '霓光薄雾', primary: '#c8a0e8', radius: '12', opacity: '0.35' },
      { name: '金箔扬尘', primary: '#f0d890', radius: '1', opacity: '0.6' },
      { name: '月晕淡彩', primary: '#e8e0c8', radius: '14', opacity: '0.4' },
      { name: '新星迸发', primary: '#f0c060', radius: '9', opacity: '0.8' },
      { name: '余晖渐变', primary: '#e89050', radius: '11', opacity: '0.5' },
      { name: '微光闪烁', primary: '#d0e0a0', radius: '3', opacity: '0.9' },
      { name: '紫霄远光', primary: '#b880d8', radius: '8', opacity: '0.7' },
    ],
  },
  {
    group: 'ink',
    metaphor: 'ink',
    entries: [
      { name: '浓墨一点', primary: '#1a1815', radius: '3', opacity: '0.9' },
      { name: '淡墨晕染', primary: '#7a7268', radius: '8', opacity: '0.35' },
      { name: '枯笔飞白', primary: '#c8c0b0', width: '1.5', opacity: '0.6' },
      { name: '留白线墨', primary: '#a8a090', width: '1', opacity: '0.7' },
      { name: '青褐宿墨', primary: '#6a5a50', radius: '4', opacity: '0.8' },
      { name: '焦墨渴笔', primary: '#3a3228', width: '2.5', opacity: '0.75' },
      { name: '泼墨山势', primary: '#4a4038', radius: '16', opacity: '0.3' },
      { name: '淡彩罩染', primary: '#9a8070', radius: '10', opacity: '0.4' },
      { name: '篆印朱点', primary: '#c86050', radius: '3', opacity: '0.85' },
      { name: '砚边宿痕', primary: '#5a4e45', radius: '5', opacity: '0.6' },
    ],
  },
  {
    group: 'nature',
    metaphor: 'wood',
    entries: [
      { name: '年轮密圈', primary: '#8a6a40', radius: '7', opacity: '0.75' },
      { name: '木纹疏排', primary: '#b89a68', width: '2.5', opacity: '0.65' },
      { name: '藤蔓攀延', primary: '#6aa860', width: '2', opacity: '0.7' },
      { name: '石纹风化', primary: '#9a9088', radius: '5', opacity: '0.6' },
      { name: '苔痕点青', primary: '#6b8e5a', radius: '4', opacity: '0.7' },
      { name: '山脊折线', primary: '#8a8078', width: '2.5', opacity: '0.6', metaphor: 'earth' },
      { name: '湖面水波', primary: '#5a90b8', width: '1.5', opacity: '0.7', metaphor: 'water' },
      { name: '草茎交错', primary: '#7aa860', width: '1', opacity: '0.75' },
      { name: '叶脉网纹', primary: '#88a858', width: '1', opacity: '0.6' },
      { name: '桂花小点', primary: '#e8c878', radius: '2', opacity: '0.8' },
      { name: '竹林疏影', primary: '#6a9a68', width: '2', opacity: '0.65' },
      { name: '芦苇轻荡', primary: '#b0a878', width: '1.5', opacity: '0.55' },
      { name: '冬雪覆枝', primary: '#e8ece4', radius: '5', opacity: '0.7', metaphor: 'mist' },
      { name: '苔原斑驳', primary: '#5a8a60', radius: '6', opacity: '0.5' },
      { name: '波纹沙丘', primary: '#c8b088', radius: '8', opacity: '0.5', metaphor: 'earth' },
      { name: '海潮呼吸', primary: '#4a80a0', radius: '12', opacity: '0.4', metaphor: 'water' },
      { name: '松针扇形', primary: '#4a7048', width: '1.5', opacity: '0.7' },
      { name: '云影游移', primary: '#a8aab0', radius: '14', opacity: '0.35', metaphor: 'mist' },
    ],
  },
  {
    group: 'handcraft',
    metaphor: 'wood',
    entries: [
      { name: '针脚细密', primary: '#c0a080', width: '1', opacity: '0.85', metaphor: 'metal' },
      { name: '绣线交错', primary: '#e8c8a0', width: '1.5', opacity: '0.75', metaphor: 'metal' },
      { name: '织带疏编', primary: '#a08060', width: '3', opacity: '0.65' },
      { name: '麻线捆扎', primary: '#d0b898', width: '2', opacity: '0.7' },
      { name: '帘边流苏', primary: '#c8a888', width: '1', opacity: '0.8', metaphor: 'metal' },
      { name: '盘扣绳结', primary: '#6a4a30', radius: '5', opacity: '0.8', metaphor: 'metal' },
      { name: '刺绣牡丹', primary: '#d08878', radius: '4', opacity: '0.85', metaphor: 'metal' },
      { name: '竹篾编圈', primary: '#a08050', width: '2', opacity: '0.7' },
      { name: '藤筐孔隙', primary: '#9a7848', radius: '3', opacity: '0.5' },
      { name: '灯心绒坑', primary: '#b09070', radius: '6', opacity: '0.6' },
    ],
  },
  {
    group: 'geometry',
    metaphor: 'metal',
    entries: [
      { name: '棱镜六边', primary: '#a0a8b0', radius: '5', opacity: '0.8' },
      { name: '铂金菱点', primary: '#c8d0d8', radius: '4', opacity: '0.85' },
      { name: '铁灰方阵', primary: '#7a8288', radius: '6', opacity: '0.6' },
      { name: '青锋直线', primary: '#b8c0c8', width: '2', opacity: '0.7' },
      { name: '同心圆环', primary: '#a8b0b8', width: '2', opacity: '0.7' },
      { name: '对角网格', primary: '#989098', width: '1', opacity: '0.5' },
      { name: '星形放射', primary: '#c0a858', width: '2', opacity: '0.75', metaphor: 'star' },
      { name: '三角密铺', primary: '#8a9088', radius: '3', opacity: '0.7' },
      { name: '圆点阵排', primary: '#b0b8c0', radius: '2.5', opacity: '0.8' },
      { name: '折线锯齿', primary: '#a09098', width: '2', opacity: '0.6' },
    ],
  },
  {
    group: 'wave',
    metaphor: 'water',
    entries: [
      { name: '涟漪波形', primary: '#3a8ac8', width: '1.5', opacity: '0.75' },
      { name: '频谱柱列', primary: '#5ab0d8', radius: '3', opacity: '0.8' },
      { name: '节拍脉冲', primary: '#80d0e0', radius: '5', opacity: '0.7' },
      { name: '潮汐振幅', primary: '#2a6a9a', width: '2', opacity: '0.65' },
      { name: '心跳律动', primary: '#c86a6a', width: '2', opacity: '0.7' },
      { name: '声呐扫描环', primary: '#4aa0d0', width: '1.5', opacity: '0.6' },
    ],
  },
  {
    group: 'texture',
    metaphor: 'earth',
    entries: [
      { name: '宣纸底色', primary: '#e8dcc8', radius: '20', opacity: '0.12' },
      { name: '牛皮纸纹', primary: '#c8a878', radius: '16', opacity: '0.2' },
      { name: '帆布经纬', primary: '#b8a888', width: '1', opacity: '0.25' },
      { name: '纸钉固定', primary: '#a08050', radius: '3', opacity: '0.9' },
      { name: '折痕叠纸', primary: '#d8c090', width: '1', opacity: '0.4' },
      { name: '纸层堆叠', primary: '#c8b088', radius: '8', opacity: '0.5' },
      { name: '烛光纸灯', primary: '#e0c8a0', radius: '12', opacity: '0.3', metaphor: 'light' },
      { name: '老书页黄', primary: '#e0d0b0', radius: '18', opacity: '0.18' },
      { name: '桑皮纸理', primary: '#d8c8a8', width: '1', opacity: '0.35' },
    ],
  },
]

/** 规整为 MaterialCreateConfig（统一半径/线宽/透明度字段，隐喻按条目覆盖） */
function toConfig(p: PresetFamily, e: PresetFamily['entries'][number]): MaterialCreateConfig {
  // 半径归入 point 元素、线宽归入 line 元素，透明度共用
  const point: Record<string, string> = {}
  const line: Record<string, string> = {}
  if (e.radius) point.radius = e.radius
  if (e.width) line.width = e.width
  if (e.opacity) {
    point.opacity = e.opacity
    line.opacity = e.opacity
  }
  const elementDefaults: Partial<Record<VisualElementType, Record<string, string>>> = {}
  if (Object.keys(point).length) elementDefaults.point = point
  if (Object.keys(line).length) elementDefaults.line = line
  return {
    name: e.name,
    metaphor: e.metaphor ?? p.metaphor,
    group: p.group,
    palette: {
      primary: e.primary,
      secondary: e.secondary ?? e.primary,
      accent: e.secondary ?? e.primary,
      muted: '#6a5a50',
      bg: '#1a1612',
      surface: '#2a2420',
      border: '#3a3430',
      positive: '#7ec8a0',
      negative: '#c87a7a',
      neutral: '#8a8a8a',
    },
    elementDefaults,
  }
}

/**
 * 计算预置材质总数（供 UI 展示"起点库共 N 种"）
 */
export function getPresetMaterialTotal(): number {
  return PRESET_FAMILIES.reduce((sum, f) => sum + f.entries.length, 0)
}

/**
 * 惰性初始化材质库：仅当库为空时一次性填入全部预置材质。
 * 用户已增删过材质（非空）则保持现状，不覆盖用户数据。
 */
export function initMaterialPresets(): number {
  if (getMaterialCount() > 0) return getMaterialCount()
  for (const family of PRESET_FAMILIES) {
    for (const entry of family.entries) {
      createMaterial(entry.name, toConfig(family, entry))
    }
  }
  return getMaterialCount()
}

/**
 * 重置材质库到出厂预置状态（供测试与"恢复默认"使用）
 */
export function resetMaterialPresets(): number {
  clearMaterialStore()
  return initMaterialPresets()
}