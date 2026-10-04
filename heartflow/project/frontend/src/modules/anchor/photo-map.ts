// ============================================================
// 逐日心锚 · 照片地图（Photo Map）
// ------------------------------------------------------------
// 借鉴 Day One 照片地图：把「照片」与「地点」在时间维度上对齐，
// 落到本地正射地球（复用 map/geo-projection，零网络零瓦片）。
//
// 关联口径：照片归属日期（PhotoEntry.date）与地图室地点到访日期
// （Place.at 的本地日历键）一致即视为该地点当天拍的照片。
// 不新增照片字段、不做手动标注 —— 完全数据驱动、本地私有。
//
// 说明：同一天到访多个地点时，当日照片会同时落到各地点（无法自动
// 消歧，属可接受的近似）。
// ============================================================

import { computed } from 'vue'
import { getLocalDateKey } from '../../utils/time'
import { usePhotoDiary } from './photo-diary'
import type { PhotoEntry } from './photo-diary'
import { useMap } from '../map/map'
import type { Place } from '../map/map'

// ---- 类型 ----

/** 落到地图上的一张照片（指向某条 PhotoEntry 的某一张） */
export interface PhotoMapPhoto {
  entryId: string
  /** 归属日期 YYYY-MM-DD */
  date: string
  /** 在该条日记 images 中的下标（用于打开灯箱） */
  index: number
  thumb: string
  caption: string
}

/** 地图上的一个落点（一个地点 + 当天拍的照片） */
export interface PhotoMapPin {
  placeId: string
  name: string
  city: string
  type: string
  lng: number
  lat: number
  /** 地点到访日期（本地日历键） */
  visitDate: string
  photos: PhotoMapPhoto[]
}

export interface PhotoMapStats {
  /** 有照片的落点数 */
  placeCount: number
  /** 落点覆盖的城市数 */
  cityCount: number
  /** 落点照片总数 */
  photoCount: number
}

// ---- 纯函数 ----

/** 地点到访日期的本地日历键；无法解析返回空串 */
export function placeVisitDate(place: Place): string {
  const at = place.at
  if (!at) return ''
  // 纯日期串直接返回，避免 new Date('YYYY-MM-DD') 按 UTC 解析引起跨日偏移
  if (/^\d{4}-\d{2}-\d{2}$/.test(at)) return at
  const d = new Date(at)
  return Number.isNaN(d.getTime()) ? '' : getLocalDateKey(d)
}

/** 把某条照片日记展开为逐张照片（保留原始下标，供灯箱定位） */
export function expandEntry(entry: PhotoEntry): PhotoMapPhoto[] {
  const out: PhotoMapPhoto[] = []
  for (let i = 0; i < entry.images.length; i++) {
    out.push({
      entryId: entry.id,
      date: entry.date,
      index: i,
      thumb: entry.thumbs[i] || entry.images[i] || '',
      caption: entry.captions?.[i] || '',
    })
  }
  return out
}

/**
 * 由照片与地点生成地图落点。
 * 仅有经纬度、有可解析到访日期、且当天确有照片的地点才会成为落点。
 * 返回按到访日期倒序排列。
 */
export function buildPhotoMapPins(photos: PhotoEntry[], places: Place[]): PhotoMapPin[] {
  const photosByDate = new Map<string, PhotoMapPhoto[]>()
  for (const entry of photos) {
    const list = photosByDate.get(entry.date) ?? []
    list.push(...expandEntry(entry))
    photosByDate.set(entry.date, list)
  }

  const pins: PhotoMapPin[] = []
  for (const place of places) {
    if (typeof place.lng !== 'number' || typeof place.lat !== 'number') continue
    const visitDate = placeVisitDate(place)
    if (!visitDate) continue
    const matched = photosByDate.get(visitDate)
    if (!matched || !matched.length) continue
    pins.push({
      placeId: place.id,
      name: place.name,
      city: place.city,
      type: place.type,
      lng: place.lng,
      lat: place.lat,
      visitDate,
      photos: matched,
    })
  }

  return pins.sort((a, b) => b.visitDate.localeCompare(a.visitDate))
}

export function photoMapStats(pins: PhotoMapPin[]): PhotoMapStats {
  const cities = new Set<string>()
  let photoCount = 0
  for (const pin of pins) {
    if (pin.city) cities.add(pin.city)
    photoCount += pin.photos.length
  }
  return { placeCount: pins.length, cityCount: cities.size, photoCount }
}

/** 落点经纬度质心（供地球「回到数据」定向）；无落点返回 null */
export function pinsCentroid(pins: PhotoMapPin[]): { lng: number; lat: number } | null {
  if (!pins.length) return null
  let lng = 0
  let lat = 0
  for (const pin of pins) {
    lng += pin.lng
    lat += pin.lat
  }
  return { lng: lng / pins.length, lat: lat / pins.length }
}

// ---- 组合式 ----

/** 照片地图：聚合照片日记与地图室地点，产出落点与统计 */
export function usePhotoMap() {
  const { entries, load: loadPhotos } = usePhotoDiary()
  const { places, load: loadPlaces } = useMap()

  const pins = computed(() => buildPhotoMapPins(entries.value, places.value))
  const stats = computed(() => photoMapStats(pins.value))

  function refresh(): void {
    loadPhotos()
    loadPlaces()
  }

  return { pins, stats, refresh }
}
