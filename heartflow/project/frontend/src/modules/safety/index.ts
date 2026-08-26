// ============================================================
// 安全守护体系 · 模块引擎
// 提供安全配置管理、安全评分计算等核心能力
// ============================================================

import { ref } from 'vue'
import { storage } from '../../engine/storage'
import type {
  SafetyConfig,
  DataSecurityConfig,
  PropertySecurityConfig,
  PersonalSafetyConfig,
  PsychologicalSafetyConfig,
  SafetyScore,
} from './types'

export type {
  SafetyConfig,
  DataSecurityConfig,
  PropertySecurityConfig,
  PersonalSafetyConfig,
  PsychologicalSafetyConfig,
  SafetyScore,
} from './types'

export { useDataSecurity } from './composables/useDataSecurity'
export { usePsychologicalSafety } from './composables/usePsychologicalSafety'
export { usePropertySafety } from './composables/usePropertySafety'
export { usePersonalSafety } from './composables/usePersonalSafety'

// ---- 安全事件响应与威胁检测 ----
export { useIncidentResponse, useThreatDetection, useAuditLog, useSecurityDashboard, THREAT_LEVEL_META, THREAT_TYPE_META, SAFETY_ADVANCED_STORAGE_KEYS } from './incident-response'
export type { ThreatLevel, ThreatType, SecurityIncident, ThreatRule, AuditLogEntry, SecurityDashboard } from './incident-response'

// ---- 隐私仪表盘（P15-6） ----
export {
  usePrivacyDashboard,
  DATA_CATEGORY_META,
  SENSITIVITY_META,
  EXPOSURE_STATUS_META,
  DEFAULT_PRIVACY_CONFIG,
} from './privacy-dashboard'
export type {
  DataCategory,
  SensitivityLevel,
  StorageLocation,
  ExposureStatus,
  DataExposure,
  PermissionEntry,
  PermissionAudit,
  PrivacyScoreDimension,
  PrivacyScore,
  LeakWarning,
  LockState,
  PrivacyDashboardConfig,
} from './privacy-dashboard'

// ---- 审计时间线可视化（P16-15） ----
export {
  useAuditTimeline,
  AUDIT_TIMELINE_STORAGE_KEYS,
} from './audit-timeline'
export type {
  TimelineEvent,
  TimelineSegment,
  EventAggregation,
  TrendAnalysis,
  TrendDataPoint,
  TrendAnomaly,
  HeatmapData,
  TimelineConfig,
  ExportFormat,
  ExportResult,
} from './audit-timeline'

// ---- Web Crypto 端到端加密（P16-15） ----
export {
  useCryptoGuard,
  CRYPTO_GUARD_STORAGE_KEYS,
} from './crypto-guard'
export type {
  CryptoAlgorithm,
  KeyUsage,
  CryptoKeyMeta,
  EncryptionResult,
  DecryptionResult,
  SignatureResult,
  CryptoKeyPairMeta,
  KeyExportFormat,
  KeyExportResult,
  KeyImportParams,
  CryptoStatus,
  CryptoConfig,
} from './crypto-guard'

// ---- 实时异常检测（P16-15） ----
export {
  useAnomalyDetector,
  ANOMALY_DIMENSION_META,
  ANOMALY_SEVERITY_META,
  ANOMALY_DETECTOR_STORAGE_KEYS,
} from './anomaly-detector'
export type {
  AnomalyDimension,
  AnomalySeverity,
  DetectionDataPoint,
  AnomalyResult,
  BehavioralBaseline,
  SlidingWindowConfig,
  DetectionRule,
  DetectionStats,
} from './anomaly-detector'

// ---- 备份恢复与传感器（P15） ----
export {
  useBackupRecovery,
  useSecurityReports,
  useSensorIntegration,
} from './backup-recovery'
export type {
  BackupType,
  BackupMetadata,
  BackupSnapshot,
  RestoreResult,
  SecurityReportPeriod,
  SecurityReport,
  SensorType,
  SensorReading,
  SensorStatus,
  SafetyAlert,
} from './backup-recovery'

/** 存储键 */
const STORAGE_KEY = 'hf:safety_config'

// ---- 默认配置 ----

const DEFAULT_DATA_SECURITY: DataSecurityConfig = {
  encryptionEnabled: true,
  backupEnabled: true,
  autoBackupInterval: 24,
  selfDestructTimer: 0,
  lastBackupTime: null,
}

const DEFAULT_PROPERTY_SECURITY: PropertySecurityConfig = {
  fraudCheckEnabled: true,
  sosEnabled: true,
  fakeCallEnabled: false,
  safetyCheckinEnabled: true,
}

const DEFAULT_PERSONAL_SAFETY: PersonalSafetyConfig = {
  emergencyContacts: [],
  locationSharingEnabled: false,
  healthDataEnabled: false,
}

const DEFAULT_PSYCHOLOGICAL_SAFETY: PsychologicalSafetyConfig = {
  lightNoteEnabled: true,
  moodDetectionEnabled: true,
  crisisHotline: '400-161-9995',
  lastCheckIn: null,
}

export const DEFAULT_SAFETY_CONFIG: SafetyConfig = {
  dataSecurity: DEFAULT_DATA_SECURITY,
  propertySecurity: DEFAULT_PROPERTY_SECURITY,
  personalSafety: DEFAULT_PERSONAL_SAFETY,
  psychologicalSafety: DEFAULT_PSYCHOLOGICAL_SAFETY,
}

// ---- 响应式状态 ----

const config = ref<SafetyConfig>(loadConfig())

function loadConfig(): SafetyConfig {
  try {
    return storage.getKV<SafetyConfig>(STORAGE_KEY, DEFAULT_SAFETY_CONFIG)
  } catch {
    return { ...DEFAULT_SAFETY_CONFIG }
  }
}

function persistConfig() {
  storage.setKV(STORAGE_KEY, config.value)
}

// ---- 公开 API ----

/**
 * 获取当前安全配置（响应式）
 */
export function getSafetyConfig() {
  return config
}

/**
 * 更新安全配置（合并更新）
 */
export function updateSafetyConfig(partial: Partial<SafetyConfig>) {
  config.value = {
    ...config.value,
    ...partial,
    dataSecurity: { ...config.value.dataSecurity, ...(partial.dataSecurity ?? {}) },
    propertySecurity: { ...config.value.propertySecurity, ...(partial.propertySecurity ?? {}) },
    personalSafety: { ...config.value.personalSafety, ...(partial.personalSafety ?? {}) },
    psychologicalSafety: { ...config.value.psychologicalSafety, ...(partial.psychologicalSafety ?? {}) },
  }
  persistConfig()
}

/**
 * 更新数据安全子配置
 */
export function updateDataSecurity(partial: Partial<DataSecurityConfig>) {
  config.value.dataSecurity = { ...config.value.dataSecurity, ...partial }
  persistConfig()
}

/**
 * 更新财产安全子配置
 */
export function updatePropertySecurity(partial: Partial<PropertySecurityConfig>) {
  config.value.propertySecurity = { ...config.value.propertySecurity, ...partial }
  persistConfig()
}

/**
 * 更新人身安全子配置
 */
export function updatePersonalSafety(partial: Partial<PersonalSafetyConfig>) {
  config.value.personalSafety = { ...config.value.personalSafety, ...partial }
  persistConfig()
}

/**
 * 更新心理安全子配置
 */
export function updatePsychologicalSafety(partial: Partial<PsychologicalSafetyConfig>) {
  config.value.psychologicalSafety = { ...config.value.psychologicalSafety, ...partial }
  persistConfig()
}

/**
 * 计算安全评分
 *
 * 评分规则：
 * - 数据安全 (25分)：加密 +10、备份 +8、自毁 +7
 * - 财产安全 (25分)：反诈骗 +8、SOS +7、假来电 +4、报平安 +6
 * - 人身安全 (25分)：联系人 +10、位置共享 +8、健康数据 +7
 * - 心理安全 (25分)：光笺 +8、情绪检测 +7、最近签到 +10
 */
export function getSafetyScore(): SafetyScore {
  const c = config.value

  // 数据安全评分 (0-25)
  let dataSecurity = 0
  if (c.dataSecurity.encryptionEnabled) dataSecurity += 10
  if (c.dataSecurity.backupEnabled) dataSecurity += 8
  if (c.dataSecurity.selfDestructTimer > 0) dataSecurity += 7

  // 财产安全评分 (0-25)
  let propertySecurity = 0
  if (c.propertySecurity.fraudCheckEnabled) propertySecurity += 8
  if (c.propertySecurity.sosEnabled) propertySecurity += 7
  if (c.propertySecurity.fakeCallEnabled) propertySecurity += 4
  if (c.propertySecurity.safetyCheckinEnabled) propertySecurity += 6

  // 人身安全评分 (0-25)
  let personalSafety = 0
  if (c.personalSafety.emergencyContacts.length > 0) personalSafety += 10
  if (c.personalSafety.locationSharingEnabled) personalSafety += 8
  if (c.personalSafety.healthDataEnabled) personalSafety += 7

  // 心理安全评分 (0-25)
  let psychologicalSafety = 0
  if (c.psychologicalSafety.lightNoteEnabled) psychologicalSafety += 8
  if (c.psychologicalSafety.moodDetectionEnabled) psychologicalSafety += 7
  // 最近7天内有过签到
  if (c.psychologicalSafety.lastCheckIn !== null) {
    const daysSince = (Date.now() - c.psychologicalSafety.lastCheckIn) / 86400000
    if (daysSince <= 7) psychologicalSafety += 10
  }

  const total = dataSecurity + propertySecurity + personalSafety + psychologicalSafety

  let level: SafetyScore['level'] = 'needsImprovement'
  if (total >= 80) level = 'excellent'
  else if (total >= 60) level = 'good'

  return {
    total,
    dataSecurity,
    propertySecurity,
    personalSafety,
    psychologicalSafety,
    level,
  }
}

/**
 * 重置安全配置为默认值
 */
export function resetSafetyConfig() {
  config.value = { ...DEFAULT_SAFETY_CONFIG }
  config.value.dataSecurity = { ...DEFAULT_DATA_SECURITY }
  config.value.propertySecurity = { ...DEFAULT_PROPERTY_SECURITY }
  config.value.personalSafety = { ...DEFAULT_PERSONAL_SAFETY }
  config.value.psychologicalSafety = { ...DEFAULT_PSYCHOLOGICAL_SAFETY }
  persistConfig()
}

/**
 * 刷新配置（从存储重新加载）
 */
export function reloadSafetyConfig() {
  config.value = loadConfig()
}