// ============================================================
// 共鸣协议层 · Emotion 桥接器
// 将情绪花园状态通过共振层暴露，替代直接 import useEmotionGarden
// ============================================================

import { useEmotionGarden } from '../../modules/emotion'

/**
 * 情绪花园状态 composable
 * 模块通过此 composable 获取响应式的情绪数据，
 * 而无需直接 import useEmotionGarden
 */
export function useEmotion() {
  const garden = useEmotionGarden()

  return {
    // 响应式状态
    records: garden.records,
    counts: garden.counts,
    // 操作方法
    load: garden.load.bind(garden),
    add: garden.add.bind(garden),
    remove: garden.remove.bind(garden),
    update: garden.update.bind(garden),
    recent: garden.recent.bind(garden),
    getAmbientMood: garden.getAmbientMood.bind(garden),
  }
}