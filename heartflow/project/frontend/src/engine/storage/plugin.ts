import type { PluginManifest } from '../../modules/plugin/types'
import { loadSchema, saveSchema } from './core'

export interface PluginRegistryEntry {
  enabled: boolean
  permissions: string[]
  granted?: string[]
  /** 第三方插件：持久化完整 manifest，应用重启后重建运行时（核心插件不写） */
  manifest?: PluginManifest
}

export type PluginRegistry = Record<string, PluginRegistryEntry>

export function getPluginRegistry(): PluginRegistry {
  const s = loadSchema()
  return (s as any).pluginRegistry ?? {}
}

export function setPluginRegistry(registry: PluginRegistry): void {
  const s = loadSchema()
  ;(s as any).pluginRegistry = registry
  saveSchema(s)
}
