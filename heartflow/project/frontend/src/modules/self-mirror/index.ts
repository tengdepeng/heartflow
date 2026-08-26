// ============================================================
// 自体镜像 · 模块入口
// 模块三十五·众生象：四柱画像、十二宫格、自体星盘
// 全部本地、自我映射、无命理推算
// ============================================================

export { computeFourPillars, defaultBirthData, zodiacForYear, constellationFor } from './four-pillars'
export type { BirthData, Pillar, FourPillarsProfile } from './four-pillars'

export { createEmptyHouses, computeHouseStats, assessBalance, DEFAULT_HOUSES } from './twelve-houses'
export type { House, TwelveHousesState, HouseStats, BalanceScore } from './twelve-houses'

export { housesToAstrolabe, deriveAstrolabeInsight } from './self-astrolabe'
export type { AstrolabePoint, AstrolabeData, AstrolabeInsight } from './self-astrolabe'

export { useSelfMirrorHouses, getSelfMirrorHousesStore } from './houses-store'