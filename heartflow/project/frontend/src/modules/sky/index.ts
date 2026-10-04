// ============================================================
// 时间长廊 · 时间星图模块导出
// ============================================================

export {
  CONSTELLATIONS,
  SEASONS,
  seasonAtMonth,
  gstDegrees,
  lstDegrees,
  altAz,
  sizeForMag,
  starToCanvas,
  bySeason,
  skyMapAt,
  ladlePointSeason,
} from './starfield'
export type {
  SeasonKey,
  BrightStar,
  Constellation,
  ProjectedStar,
  ProjectedConstellation,
  SkyMapConfig,
  StarMapResult,
} from './starfield'

export {
  DEEP_SKY_CATALOG,
  TYPE_META,
  deepSkyByType,
  deepSkyByConstellation,
  searchDeepSky,
  sortDeepSkyByMagnitude,
  visibilityHint,
} from './deep-sky'
export type { DeepSkyObject, DeepSkyType } from './deep-sky'

export {
  PLANET_META,
  NAKED_EYE_PLANETS,
  planetsAt,
  visiblePlanets,
  obliquity,
  eqlToEquatorial,
} from './planets'
export type { PlanetPosition, PlanetElementSet, PlanetId } from './planets'

export {
  CURATED_SPOTS,
  filterByProvince,
  searchSpots,
  sortByDarkness,
  bortleLabel,
  useStargazingSpots,
} from './stargazing-spots'
export type { StargazingSpot } from './stargazing-spots'