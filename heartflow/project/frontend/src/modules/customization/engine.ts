// ============================================================
// 应用空间自定义引擎 · 配置引擎
// ============================================================

import { storage } from '../../engine/storage'
import type { SpaceConfig } from './types'

/** 存储键：空间配置列表 */
const SPACE_CONFIGS_KEY = 'hf:space_configs'

/** 存储键：当前活跃空间配置 ID */
const ACTIVE_CONFIG_KEY = 'hf:active_space_config'

// ---- 读取 / 写入空间配置列表 ----

/** 获取所有空间配置 */
export function getSpaceConfigs(): SpaceConfig[] {
  return storage.getKV<SpaceConfig[]>(SPACE_CONFIGS_KEY, [])
}

/** 保存空间配置列表 */
export function saveSpaceConfigs(configs: SpaceConfig[]): void {
  storage.setKV(SPACE_CONFIGS_KEY, configs)
}

// ---- 活跃配置 ID ----

/** 获取当前活跃配置 ID */
export function getActiveConfigId(): string | null {
  return storage.getKV<string | null>(ACTIVE_CONFIG_KEY, null)
}

/** 设置当前活跃配置 ID */
export function setActiveConfigId(id: string | null): void {
  storage.setKV(ACTIVE_CONFIG_KEY, id)
}

// ---- 活跃配置对象 ----

/** 获取当前活跃的完整空间配置对象 */
export function getActiveConfig(): SpaceConfig | null {
  const id = getActiveConfigId()
  if (!id) return null
  const configs = getSpaceConfigs()
  return configs.find(c => c.id === id) ?? null
}

// ---- CRUD ----

/** 创建空间配置 */
export function createSpaceConfig(config: Omit<SpaceConfig, 'id' | 'createdAt' | 'updatedAt'>): SpaceConfig {
  const configs = getSpaceConfigs()
  const now = new Date().toISOString()
  const newConfig: SpaceConfig = {
    ...config,
    id: `space_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: now,
    updatedAt: now,
  }
  configs.push(newConfig)
  saveSpaceConfigs(configs)
  return newConfig
}

/** 更新空间配置 */
export function updateSpaceConfig(id: string, partial: Partial<Omit<SpaceConfig, 'id' | 'createdAt' | 'updatedAt'>>): SpaceConfig | null {
  const configs = getSpaceConfigs()
  const idx = configs.findIndex(c => c.id === id)
  if (idx === -1) return null
  configs[idx] = {
    ...configs[idx],
    ...partial,
    id: configs[idx].id,
    createdAt: configs[idx].createdAt,
    updatedAt: new Date().toISOString(),
  }
  saveSpaceConfigs(configs)
  return configs[idx]
}

/** 删除空间配置 */
export function deleteSpaceConfig(id: string): boolean {
  const configs = getSpaceConfigs()
  const idx = configs.findIndex(c => c.id === id)
  if (idx === -1) return false
  configs.splice(idx, 1)
  saveSpaceConfigs(configs)
  // 如果删除的是活跃配置，清除活跃状态
  if (getActiveConfigId() === id) {
    setActiveConfigId(null)
  }
  return true
}

/** 复制空间配置 */
export function duplicateSpaceConfig(id: string, newName?: string): SpaceConfig | null {
  const configs = getSpaceConfigs()
  const source = configs.find(c => c.id === id)
  if (!source) return null
  const now = new Date().toISOString()
  const duplicate: SpaceConfig = {
    ...source,
    id: `space_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: newName ?? `${source.name} (副本)`,
    presetId: source.presetId,
    dimensions: JSON.parse(JSON.stringify(source.dimensions)),
    createdAt: now,
    updatedAt: now,
  }
  configs.push(duplicate)
  saveSpaceConfigs(configs)
  return duplicate
}