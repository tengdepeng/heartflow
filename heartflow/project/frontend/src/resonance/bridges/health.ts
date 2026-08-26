// ============================================================
// 共鸣协议层 · Health 桥接器
// 将健康数据通过共振层暴露，替代直接 import useHealthStore
// ============================================================

import { useHealthStore } from '../../stores/health'
import { storeToRefs } from 'pinia'

export function useHealth() {
  const store = useHealthStore()
  const {
    bodyLogs, cycleData, bodyNotes, senseNotes, sutraNotes,
    meridianLogs, wisdomLogs, readingLogs, guardHeartRateLogs,
    thisWeekExerciseMinutes, thisWeekSleepAvg,
  } = storeToRefs(store)

  return {
    // 响应式状态
    bodyLogs,
    cycleData,
    bodyNotes,
    senseNotes,
    sutraNotes,
    meridianLogs,
    wisdomLogs,
    readingLogs,
    guardHeartRateLogs,
    thisWeekExerciseMinutes,
    thisWeekSleepAvg,

    // 身体日志
    addBodyLog: store.addBodyLog?.bind(store),
    persistBodyLogs: store.persistBodyLogs?.bind(store),

    // 周期
    logCycle: store.logCycle?.bind(store),
    persistCycle: store.persistCycle?.bind(store),

    // 笔记
    addBodyNote: store.addBodyNote?.bind(store),
    addSenseNote: store.addSenseNote?.bind(store),
    addSutraNote: store.addSutraNote?.bind(store),

    // 经络
    recordMeridianFeeling: store.recordMeridianFeeling?.bind(store),
    getMeridianFeeling: store.getMeridianFeeling?.bind(store),

    // 心境
    addWisdomLog: store.addWisdomLog?.bind(store),

    // 阅读
    addReadingLog: store.addReadingLog?.bind(store),
    removeReadingLog: store.removeReadingLog?.bind(store),
    persistReadingLogs: store.persistReadingLogs?.bind(store),

    // 守卫室
    addGuardHeartRateLog: store.addGuardHeartRateLog?.bind(store),

    // 计算属性
    recentLogs: store.recentLogs?.bind(store),
  }
}