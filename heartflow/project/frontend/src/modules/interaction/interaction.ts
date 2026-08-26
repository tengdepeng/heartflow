// ============================================================
// 交互配置 · 数据层
// 为 InteractionConfig.vue 提供交互配置集（configs）的标准化存取接口，
// 替代视图内直接的 storage.getKV('hf:interaction_configs')
// / storage.setKV(...) 裸调用。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type { InteractionConfig } from '../customization/interaction-engine'

const CONFIGS_KEY = 'hf:interaction_configs'

// 模块级单例：所有消费方共享同一份配置集
const configs = ref<InteractionConfig[]>([])

/**
 * 交互配置数据层：配置集的读取 / 写入
 */
export function useInteractionConfigs() {
  /** 从存储载入配置集 */
  function load(): void {
    try {
      configs.value = storage.getKV<InteractionConfig[]>(CONFIGS_KEY, [])
    } catch {
      configs.value = []
    }
  }

  /** 持久化配置集 */
  function save(): void {
    storage.setKV(CONFIGS_KEY, configs.value)
  }

  return { configs, load, save }
}
