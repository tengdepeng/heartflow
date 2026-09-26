// ============================================================
// 逐日心锚 · 图片日记（Photo Diary）
// ------------------------------------------------------------
// 借鉴 Moo 日记 / Day One / 一本日记 的多图日记能力。
// 宪法第1条「本地私有」：图片以 dataURL 存入本地存储，
// 不离开设备，不上传任何云端。
//
// P0（2026-09-26）：
//  - 入库前 canvas 降采样为 JPEG（原图直存会造成写放大 + 静默丢数据）
//  - 缩略图（thumb）用于网格，原尺寸（images）用于全屏查看
//  - 写入前做容量预检（localStorage 后端约 5MB），超限明确报错而非静默失败
//  - 支持导出 / 导入 JSON 备份
//
// P1（2026-09-26）：
//  - 单日上限 PHOTO_MAX_PER_ENTRY（9 张 = 一屏九宫格），写入时截断并给出非阻断提示
//  - 每图独立说明 captions[]（与 images / thumbs 严格同序）
//  - 排序 moveImage(date, from, to)：三数组同步搬移
//  - 所有入口（load / addImages / importJson）统一走 alignEntry 归一化，
//    保证「三数组等长」这一不变量永不破，UI 可放心按下标索引
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import { getLocalDateKey } from '../../utils/time'

export const PHOTO_DIARY_KEY = 'hf:anchor:photo_diary'

/** localStorage 后端下的软上限（字符数），留余量给其它数据 */
export const PHOTO_SOFT_LIMIT_CHARS = 4_200_000

/** 展示图最长边 / 缩略图最长边 */
export const PHOTO_FULL_DIM = 1280
export const PHOTO_THUMB_DIM = 320

/** 单日照片上限（九宫格一屏）。对标 Day One「每日精选」节奏，同时防止单日堆积撑爆主库 */
export const PHOTO_MAX_PER_ENTRY = 9

export interface PhotoEntry {
  id: string
  /** 归属日期 YYYY-MM-DD（与逐日心锚的 Anchor.targetDate 同一日期口径） */
  date: string
  /** 展示尺寸 JPEG dataURL 列表（按用户排列顺序） */
  images: string[]
  /** 缩略图 dataURL 列表（与 images 同序，缺失位为空串） */
  thumbs: string[]
  /** 每图独立说明（与 images 同序，缺失位为空串） */
  captions: string[]
  /** 可选整条日记说明 */
  caption?: string
  createdAt: string
}

/** 最近一次写入失败原因（容量 / 超限等），阻断性；成功后清空 */
export const photoDiaryError = ref<string | null>(null)

/** 非阻断提示（如超限被截断），成功后清空 */
export const photoDiaryNotice = ref<string | null>(null)

export function clearPhotoDiaryMessages(): void {
  photoDiaryError.value = null
  photoDiaryNotice.value = null
}

const entries = ref<PhotoEntry[]>([])

/** 把列表对齐到长度 len（截断多余项，缺失位补空串），始终返回新数组 */
function alignList(list: string[] | undefined, len: number): string[] {
  const out = new Array<string>(len).fill('')
  if (Array.isArray(list)) {
    for (let i = 0; i < len; i++) if (typeof list[i] === 'string') out[i] = list[i]
  }
  return out
}

/**
 * 归一化一条记录：截断到单日上限，并把 thumbs / captions 补齐到与 images 等长。
 * 任何进入内存的条目都必须先过这里（老数据缺字段、导入文件字段不齐都能兜住）。
 */
function alignEntry(raw: Partial<PhotoEntry> & { images?: unknown }): PhotoEntry {
  const images = Array.isArray(raw.images) ? raw.images.filter((s): s is string => typeof s === 'string' && !!s) : []
  const n = Math.min(images.length, PHOTO_MAX_PER_ENTRY)
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : `pd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: typeof raw.date === 'string' ? raw.date : getLocalDateKey(),
    images: images.slice(0, n),
    thumbs: alignList(raw.thumbs as string[] | undefined, n),
    captions: alignList(raw.captions as string[] | undefined, n),
    caption: typeof raw.caption === 'string' && raw.caption ? raw.caption : undefined,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date().toISOString(),
  }
}

function load() {
  const raw = storage.getKV<unknown>(PHOTO_DIARY_KEY, [])
  const list = Array.isArray(raw) ? raw : []
  entries.value = list
    .filter((e): e is Partial<PhotoEntry> => !!e && typeof e === 'object')
    .filter(e => Array.isArray((e as { images?: unknown }).images))
    .map(e => alignEntry(e))
}

function save() {
  storage.setKV(PHOTO_DIARY_KEY, entries.value)
}

/** 当前是否使用 localStorage 后端（Tauri 桌面走文件后端，无 5MB 限制） */
function lsBackendActive(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem('heartflow:storage') !== null
  } catch {
    return false
  }
}

/** 预估写入后主库字符数是否仍在软上限内 */
function hasRoomFor(prevChars: number, nextChars: number): boolean {
  if (!lsBackendActive()) return true
  let total = 0
  try {
    total = localStorage.getItem('heartflow:storage')?.length ?? 0
  } catch {
    return true
  }
  return total - prevChars + nextChars <= PHOTO_SOFT_LIMIT_CHARS
}

/** 某日期已用张数 */
function usedSlots(date: string): number {
  return entries.value.find(e => e.date === date)?.images.length ?? 0
}

/** 某日期剩余可添加张数 */
function remainingSlots(date: string): number {
  return Math.max(0, PHOTO_MAX_PER_ENTRY - usedSlots(date))
}

export function usePhotoDiary() {
  /**
   * 追加图片到指定日期。
   * @param captions 逐图说明（可选，与 images 同序）
   * @returns 归一化后的条目；因超限 / 容量不足而完全未写入时返回 null
   */
  function addImages(
    date: string,
    images: string[],
    caption?: string,
    thumbs?: string[],
    captions?: string[],
  ): PhotoEntry | null {
    if (!images.length) return null
    clearPhotoDiaryMessages()

    const room = remainingSlots(date)
    if (room <= 0) {
      photoDiaryError.value = `单日最多 ${PHOTO_MAX_PER_ENTRY} 张照片，请先删除后再添加。`
      return null
    }
    let take = images.length
    if (take > room) {
      take = room
      photoDiaryNotice.value = `单日上限 ${PHOTO_MAX_PER_ENTRY} 张，已选 ${images.length} 张，本次仅写入前 ${take} 张。`
    }
    const addImagesSlice = images.slice(0, take)
    const addThumbsSlice = thumbs ? thumbs.slice(0, take) : undefined
    const addCaptionsSlice = captions ? captions.slice(0, take) : undefined

    const prevChars = JSON.stringify(entries.value).length
    const existing = entries.value.find(e => e.date === date)
    let next: PhotoEntry[]

    if (existing) {
      const merged = alignEntry({
        ...existing,
        images: [...existing.images, ...addImagesSlice],
        thumbs: [...existing.thumbs, ...(addThumbsSlice ?? addImagesSlice.map(() => ''))],
        captions: [...existing.captions, ...(addCaptionsSlice ?? addImagesSlice.map(() => ''))],
        caption: caption || existing.caption,
        createdAt: new Date().toISOString(),
      })
      next = entries.value.map(e => (e.date === date ? merged : e))
    } else {
      next = [
        alignEntry({
          date,
          images: addImagesSlice,
          thumbs: addThumbsSlice,
          captions: addCaptionsSlice,
          caption,
        }),
        ...entries.value,
      ]
    }

    if (!hasRoomFor(prevChars, JSON.stringify(next).length)) {
      photoDiaryError.value = '本地存储空间不足，未能保存照片。请先导出备份并删除部分旧照片。'
      return null
    }

    entries.value = next
    save()
    return next.find(e => e.date === date) ?? null
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

  /** 删除某图；三数组同步；删空则整条移除 */
  function removeImage(date: string, index: number) {
    const e = entries.value.find(x => x.date === date)
    if (!e || index < 0 || index >= e.images.length) return
    const next = alignEntry({
      ...e,
      images: e.images.filter((_, i) => i !== index),
      thumbs: e.thumbs.filter((_, i) => i !== index),
      captions: e.captions.filter((_, i) => i !== index),
    })
    if (next.images.length === 0) {
      entries.value = entries.value.filter(x => x.date !== date)
    } else {
      e.images = next.images
      e.thumbs = next.thumbs
      e.captions = next.captions
      entries.value = [...entries.value]
    }
    save()
  }

  /** 重排某图位置（from → to）；三数组同步搬移，越界或原地不动返回 false */
  function moveImage(date: string, from: number, to: number): boolean {
    const e = entries.value.find(x => x.date === date)
    if (!e) return false
    const n = e.images.length
    if (from === to || from < 0 || to < 0 || from >= n || to >= n) return false
    const reorder = <T>(arr: T[]): T[] => {
      const copy = arr.slice()
      const [moved] = copy.splice(from, 1)
      copy.splice(to, 0, moved)
      return copy
    }
    e.images = reorder(e.images)
    e.thumbs = reorder(e.thumbs)
    e.captions = reorder(e.captions)
    entries.value = [...entries.value]
    save()
    return true
  }

  /** 写某图的独立说明 */
  function setImageCaption(date: string, index: number, text: string): boolean {
    const e = entries.value.find(x => x.date === date)
    if (!e || index < 0 || index >= e.images.length) return false
    const next = e.captions.slice()
    next[index] = text.trim()
    e.captions = next
    entries.value = [...entries.value]
    save()
    return true
  }

  /** 写整条日记说明 */
  function setEntryCaption(date: string, text: string): boolean {
    const e = entries.value.find(x => x.date === date)
    if (!e) return false
    e.caption = text.trim() || undefined
    entries.value = [...entries.value]
    save()
    return true
  }

  function removeEntry(id: string) {
    entries.value = entries.value.filter(e => e.id !== id)
    save()
  }

  /** 导出全部图片日记为 JSON 字符串（本地备份，不上传） */
  function exportJson(): string {
    return JSON.stringify(
      { key: PHOTO_DIARY_KEY, exportedAt: new Date().toISOString(), entries: entries.value },
      null,
      2,
    )
  }

  /** 从导出 JSON 合并导入（按 id 去重；每条先过归一化，超 9 张自动截断） */
  function importJson(json: string): { added: number; error?: string } {
    try {
      const parsed = JSON.parse(json)
      const list = Array.isArray(parsed) ? parsed : parsed?.entries
      if (!Array.isArray(list)) return { added: 0, error: '文件格式不正确' }
      const valid = list
        .filter((e): e is Partial<PhotoEntry> => !!e && typeof e === 'object' && typeof e.date === 'string' && Array.isArray((e as { images?: unknown }).images))
        .map(e => alignEntry(e))
        .filter(e => e.images.length > 0)
      const existingIds = new Set(entries.value.map(e => e.id))
      const existingDates = new Set(entries.value.map(e => e.date))
      const fresh = valid.filter(e => !existingIds.has(e.id) && !existingDates.has(e.date))
      if (!fresh.length) return { added: 0 }
      const prevChars = JSON.stringify(entries.value).length
      const next = [...fresh, ...entries.value]
      if (!hasRoomFor(prevChars, JSON.stringify(next).length)) {
        return { added: 0, error: '本地存储空间不足，导入已取消' }
      }
      entries.value = next
      save()
      return { added: fresh.length }
    } catch {
      return { added: 0, error: '文件解析失败' }
    }
  }

  return {
    entries,
    load,
    addImages,
    getByDate,
    allDates,
    usedSlots,
    remainingSlots,
    removeImage,
    moveImage,
    setImageCaption,
    setEntryCaption,
    removeEntry,
    exportJson,
    importJson,
  }
}

/** 今日键 */
export function todayKey(): string {
  return getLocalDateKey()
}
