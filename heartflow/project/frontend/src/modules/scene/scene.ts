// ============================================================
// 场景编辑器 · 数据层
// 为 SceneEditor.vue 提供场景预设（scenes）的标准化存取接口，
// 替代视图内直接的 storage.getKV('hf:scene_presets')
// / storage.setKV(...) 裸调用。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

/** 场景预设 */
export interface ScenePreset {
  id: string
  name: string
  description: string
  atmosphereColor: string
  transition: string
  createdAt: string
  updatedAt: string
}

const SCENES_KEY = 'hf:scene_presets'

// 模块级单例：所有消费方共享同一份场景列表
const scenes = ref<ScenePreset[]>([])

/**
 * 场景编辑器数据层：场景预设的读取 / 写入
 */
export function useScenes() {
  /** 从存储载入场景列表 */
  function load(): void {
    try {
      scenes.value = storage.getKV<ScenePreset[]>(SCENES_KEY, [])
    } catch {
      scenes.value = []
    }
  }

  /** 持久化场景列表 */
  function save(): void {
    storage.setKV(SCENES_KEY, scenes.value)
  }

  return { scenes, load, save }
}
