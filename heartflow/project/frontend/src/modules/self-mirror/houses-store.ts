// ============================================================
// 自体镜像 · 十二宫格共享状态（跨组件单例）
// 十二宫格（编辑）与自体星盘（可视化）共享同一份宫格状态，
// 持久化到 hf:self_mirror_houses，任一组件改动即时同步。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { createEmptyHouses } from './twelve-houses'
import type { House } from './twelve-houses'

const HOUSES_KEY = 'hf:self_mirror_houses'

function loadHouses(): House[] {
  try {
    const saved = storage.getKV<House[] | null>(HOUSES_KEY, null)
    if (saved && saved.length === 12) return saved
  } catch { /* ignore */ }
  return createEmptyHouses()
}

export function useSelfMirrorHouses() {
  const houses = ref<House[]>(loadHouses())

  function persist() {
    storage.setKV(HOUSES_KEY, houses.value)
  }

  function setRating(id: string, rating: number) {
    const h = houses.value.find(x => x.id === id)
    if (h) {
      h.rating = h.rating === rating ? 0 : rating
      persist()
    }
  }

  return { houses, setRating, persist }
}

let _housesInstance: ReturnType<typeof useSelfMirrorHouses> | null = null

export function getSelfMirrorHousesStore() {
  if (!_housesInstance) {
    _housesInstance = useSelfMirrorHouses()
  }
  return _housesInstance
}
