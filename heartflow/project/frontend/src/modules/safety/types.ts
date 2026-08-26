// ============================================================
// 安全守护体系 · 类型定义
// ============================================================

export interface SafetyConfig {
  dataSecurity: DataSecurityConfig
  propertySecurity: PropertySecurityConfig
  personalSafety: PersonalSafetyConfig
  psychologicalSafety: PsychologicalSafetyConfig
}

export interface DataSecurityConfig {
  encryptionEnabled: boolean
  backupEnabled: boolean
  autoBackupInterval: number // 小时
  selfDestructTimer: number // 天，0=禁用
  lastBackupTime: number | null
}

export interface PropertySecurityConfig {
  fraudCheckEnabled: boolean
  sosEnabled: boolean
  fakeCallEnabled: boolean
  safetyCheckinEnabled: boolean
}

export interface PersonalSafetyConfig {
  emergencyContacts: EmergencyContact[]
  locationSharingEnabled: boolean
  healthDataEnabled: boolean
}

export interface EmergencyContact {
  id: string
  name: string
  phone: string
  priority: 'primary' | 'secondary'
}

export interface PsychologicalSafetyConfig {
  lightNoteEnabled: boolean
  moodDetectionEnabled: boolean
  crisisHotline: string
  lastCheckIn: number | null
}

export interface SafetyScore {
  total: number // 0-100
  dataSecurity: number
  propertySecurity: number
  personalSafety: number
  psychologicalSafety: number
  level: 'excellent' | 'good' | 'needsImprovement'
}