// ============================================================
// 逐日心锚 · 图片日记（Photo Diary）
// ------------------------------------------------------------
// 借鉴 Moo 日记 / Day One / 一本日记 的多图日记能力。
// 宪法第1条「本地私有」：图片以 base64 数据 URL 存入 localStorage，
// 不离开设备，不上传任何云端。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

export const PHOTO_DIARY_KEY = 'hf:anchor:photo_diary'

export interface PhotoEntry {
  id: string
  /** 归属日期 YYYY-MM-DD */
  date: string
  /** base64 数据 URL 列表（按上传顺序） */
  images: string[]
  /** 可选图注 */
  caption?: string
  createdAt: string
}

const entries = ref<PhotoEntry[]>([])

function load() {
  entries.value = storage.getKV<PhotoEntry[]>(PHOTO_DIARY_KEY, [])
}

function save() {
  storage.setKV(PHOTO_DIARY_KEY, entries.value)
}

export function usePhotoDiary() {
  function addImages(date: string, images: string[], caption?: string): PhotoEntry {
    if (images.length === 0) return null as unknown as PhotoEntry
    const existing = entries.value.find(e => e.date === date)
    if (existing) {
      existing.images.push(...images)
      if (caption) existing.caption = caption
      existing.createdAt = new Date().toISOString()
      save()
      return existing
    }
    const entry: PhotoEntry = {
      id: `pd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date,
      images,
      caption,
      createdAt: new Date().toISOString(),
    }
    entries.value.unshift(entry)
    save()
    return entry
  }

  function getByDate(date: string): PhotoEntry | undefined {
    return entries.value.find(e => e.date === date)
  }

  /** 全部有照片的日期（倒序） */
  function allDates(): string[] {
    return entries.value
      .map(e => e.date)
      .sort((a, b) => b.localeCompare(a))
  }

  function removeImage(date: string, index: number) {
    const e = entries.value.find(x => x.date === date)
    if (!e) return
    e.images.splice(index, 1)
    if (e.images.length === 0) {
      entries.value = entries.value.filter(x => x.date !== date)
    }
    save()
  }

  function removeEntry(id: string) {
    entries.value = entries.value.filter(e => e.id !== id)
    save()
  }

  return {
    entries,
    load,
    addImages,
    getByDate,
    allDates,
    removeImage,
    removeEntry,
  }
}

/** 读取本地图片文件为 base64 数据 URL（本地私有，不离开设备） */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/** 今日键 */
export function todayKey(): string {
  return getLocalDateKey()
}
