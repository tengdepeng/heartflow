// ============================================================
// 更漏 · 班次 / 时薪数据层
// 为 WorkLog.vue 提供标准化的「班次列表」与「时薪」存取接口，
// 替代视图内直接的
//   storage.getKV('heartflow:shifts', [])
//   storage.setKV('heartflow:shifts', ...)
//   storage.getKV('heartflow:hourly_rate', 0)
//   storage.setKV('heartflow:hourly_rate', String(...))
// 裸调用。
// 注意：时薪在存储中以字符串形式保存（与重构前一致），读取时
// 还原为数值；跨房间联动所用的其他 storage 键仍保留在视图内。
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'

const SHIFTS_KEY = 'heartflow:shifts'
const HOURLY_RATE_KEY = 'heartflow:hourly_rate'

/** 班次记录（与 WorkLog.vue 局部 Shift 结构一致） */
export interface WorkShift {
  id: string
  type: 'regular' | 'night' | 'overtime'
  date: string
  start: string
  end: string
  hours: number
  note?: string
}

// 模块级单例：所有消费方共享同一份班次列表与时薪
const shifts = ref<WorkShift[]>([])
const hourlyRate = ref<number>(0)

/**
 * 更漏班次 / 时薪数据层：读取 / 写入
 */
export function useWorkLog() {
  /** 从存储载入班次列表与时薪 */
  function load(): void {
    shifts.value = storage.getKV<WorkShift[]>(SHIFTS_KEY, [])
    hourlyRate.value = Number(storage.getKV(HOURLY_RATE_KEY, 0))
  }

  /** 整体覆盖并持久化班次列表 */
  function save(list: WorkShift[]): void {
    shifts.value = list
    storage.setKV(SHIFTS_KEY, list)
  }

  /** 持久化时薪（以字符串形式保存，与重构前一致） */
  function saveHourlyRate(): void {
    storage.setKV(HOURLY_RATE_KEY, String(hourlyRate.value))
  }

  return { shifts, hourlyRate, load, save, saveHourlyRate }
}
