// ============================================================
// 逐日心锚 · 时令元数据（时辰 / 节气 / 天气 / 季节）
// ============================================================

export {
  shichenForHour,
  shichenForDate,
  solarTermOnDate,
  seasonForMonth,
  collectAutoMetadata,
  weatherPreset,
  useZeitgeist,
  SHICHEN_LIST,
  WEATHER_PRESETS,
  WEEKDAY_LABELS,
} from './zeitgeist'
export type {
  Shichen,
  ZeitMeta,
  WeatherType,
  WeatherPreset,
  ZeitgeistPref,
} from './zeitgeist'