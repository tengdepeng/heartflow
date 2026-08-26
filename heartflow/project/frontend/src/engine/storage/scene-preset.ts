import { loadSchema, saveSchema } from './core'
import type { ScenePreset, BackgroundMediaConfig } from '../../types'

/** 获取所有场景预设 */
export function getScenePresets(): ScenePreset[] {
  return loadSchema().scenePresets ?? []
}

/** 覆盖写入场景预设列表 */
export function setScenePresets(presets: ScenePreset[]): void {
  const s = loadSchema()
  s.scenePresets = presets
  saveSchema(s)
}

/** 添加一个场景预设 */
export function addScenePreset(name: string, background: BackgroundMediaConfig): ScenePreset {
  const presets = getScenePresets()
  const now = new Date().toISOString()
  const preset: ScenePreset = {
    id: `scene_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    background: { ...background },
    createdAt: now,
    updatedAt: now,
  }
  presets.push(preset)
  setScenePresets(presets)
  return preset
}

/** 删除场景预设 */
export function removeScenePreset(id: string): boolean {
  const presets = getScenePresets()
  const idx = presets.findIndex(p => p.id === id)
  if (idx === -1) return false
  presets.splice(idx, 1)
  setScenePresets(presets)
  return true
}

/** 重命名场景预设 */
export function renameScenePreset(id: string, name: string): boolean {
  const presets = getScenePresets()
  const preset = presets.find(p => p.id === id)
  if (!preset) return false
  preset.name = name
  preset.updatedAt = new Date().toISOString()
  setScenePresets(presets)
  return true
}

/** 更新场景预设的背景配置 */
export function updateScenePresetBackground(id: string, background: BackgroundMediaConfig): boolean {
  const presets = getScenePresets()
  const preset = presets.find(p => p.id === id)
  if (!preset) return false
  preset.background = { ...background }
  preset.updatedAt = new Date().toISOString()
  setScenePresets(presets)
  return true
}