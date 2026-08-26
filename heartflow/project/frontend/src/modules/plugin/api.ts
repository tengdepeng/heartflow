// ============================================================
// 插件API · 暴露给插件的系统能力
// ============================================================

import { registerPluginAPI } from './loader'
import { storage } from '../../engine/storage'

/** 初始化插件API */
export function initPluginAPIs() {
  // 数据读取API
  registerPluginAPI('data:read', {
    getSessions: () => storage.getSessions(),
    getCrystals: () => storage.getCrystals(),
    getNotes: () => storage.getNotes(),
    getEmotions: () => storage.getEmotions(),
    getConfig: () => storage.getConfig(),
  })

  // 数据写入API（受限）
  registerPluginAPI('data:write', {
    addNote: (note: any) => {
      const notes = storage.getNotes()
      notes.push(note)
      storage.setNotes(notes)
    },
    addEmotion: (emotion: any) => {
      const emotions = storage.getEmotions()
      emotions.push(emotion)
      storage.setEmotions(emotions)
    },
  })

  // 导航API
  registerPluginAPI('navigation', {
    navigate: (path: string) => {
      window.dispatchEvent(new CustomEvent('hf:navigate', { detail: { path } }))
    },
  })

  // 通知API
  registerPluginAPI('notification', {
    notify: (text: string) => {
      window.dispatchEvent(new CustomEvent('hf:notify', { detail: { text } }))
    },
  })
}