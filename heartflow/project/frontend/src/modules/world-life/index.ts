// ============================================================
// 世界生命系统 · 模块出口
// 蓝图：世界级生命系统 — 昼夜/天气/传承
// ============================================================

// ---- 昼夜循环 ----
export { useDayNightCycle, getCurrentDayPhase, DAY_PHASES } from './day-night-cycle'
export type { DayPhase, DayPhaseInfo } from './day-night-cycle'

// ---- 天气系统 ----
export { useWeather, WEATHER_TYPES } from './weather-system'
export type { WeatherType, WeatherInfo } from './weather-system'

// ---- 世界传承 ----
export { useWorldLegacy } from './world-legacy'
export type { WorldGeneration, WorldLegacy } from './world-legacy'