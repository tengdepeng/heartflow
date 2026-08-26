// ============================================================
// 释光阁 · 反思笔记数据层
// 将 CognitionHall 视图中裸 storage 的「反思笔记」下沉为组合式函数。
// 存储键与历史实现保持一致（hf:cognition_reflections），确保既有记录不丢失。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

export const COGNITION_REFLECTIONS_KEY = 'hf:cognition_reflections'

export interface Reflection {
  id: string
  title: string
  body: string
  at: string
}

// 模块级单例：跨组件实例共享同一份反思笔记
const reflections = ref<Reflection[]>([])

export function useCognitionReflections() {
  function load() {
    reflections.value = storage.getKV<Reflection[]>(COGNITION_REFLECTIONS_KEY, [])
  }

  function save() {
    storage.setKV(COGNITION_REFLECTIONS_KEY, reflections.value)
  }

  return {
    items: reflections,
    load,
    save,
  }
}
