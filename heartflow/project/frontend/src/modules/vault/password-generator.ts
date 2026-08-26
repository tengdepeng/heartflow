// ============================================================
// 保险库 · 强密码生成器
// 借鉴 KeePass 密码生成器：可配置长度、字符集、排除相似字符
// 全部本地生成，不依赖任何外部 API，守宪法第1条本地私有
// ============================================================

// 字符集
const CHARS_LOWER = 'abcdefghijklmnopqrstuvwxyz'
const CHARS_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const CHARS_DIGITS = '0123456789'
const CHARS_SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?~'

// 排除相似字符后的安全字符集
const CHARS_LOWER_SAFE = 'abcdefghijkmnpqrstuvwxyz'
const CHARS_UPPER_SAFE = 'ABCDEFGHJKLMNPQRTUVWXY'
const CHARS_DIGITS_SAFE = '234679'

export interface PasswordGeneratorConfig {
  /** 密码长度（4~128） */
  length: number
  /** 包含小写字母 */
  includeLower: boolean
  /** 包含大写字母 */
  includeUpper: boolean
  /** 包含数字 */
  includeDigits: boolean
  /** 包含符号 */
  includeSymbols: boolean
  /** 排除相似字符（如 0/O/1/l） */
  excludeAmbiguous: boolean
  /** 至少包含每种字符集一个字符 */
  requireEach: boolean
}

export const DEFAULT_PASSWORD_CONFIG: PasswordGeneratorConfig = {
  length: 16,
  includeLower: true,
  includeUpper: true,
  includeDigits: true,
  includeSymbols: true,
  excludeAmbiguous: true,
  requireEach: true,
}

/** 预设方案 */
export const PASSWORD_PRESETS = [
  { label: '高强度', config: { ...DEFAULT_PASSWORD_CONFIG, length: 24 } },
  { label: '标准', config: { ...DEFAULT_PASSWORD_CONFIG } },
  { label: '易输入', config: { ...DEFAULT_PASSWORD_CONFIG, includeSymbols: false, length: 12 } },
  { label: '纯数字 PIN', config: { length: 6, includeLower: false, includeUpper: false, includeDigits: true, includeSymbols: false, excludeAmbiguous: false, requireEach: false } },
  { label: '短语密码', config: { length: 20, includeLower: true, includeUpper: true, includeDigits: true, includeSymbols: false, excludeAmbiguous: true, requireEach: true } },
] as const

function getAvailableChars(config: PasswordGeneratorConfig): {
  pool: string
  required: string[]
} {
  const sets: { chars: string; include: boolean }[] = [
    { chars: config.excludeAmbiguous ? CHARS_LOWER_SAFE : CHARS_LOWER, include: config.includeLower },
    { chars: config.excludeAmbiguous ? CHARS_UPPER_SAFE : CHARS_UPPER, include: config.includeUpper },
    { chars: config.excludeAmbiguous ? CHARS_DIGITS_SAFE : CHARS_DIGITS, include: config.includeDigits },
    { chars: CHARS_SYMBOLS, include: config.includeSymbols },
  ]

  const poolParts: string[] = []
  const required: string[] = []

  for (const s of sets) {
    if (s.include) {
      poolParts.push(s.chars)
      if (config.requireEach) required.push(s.chars)
    }
  }

  const pool = poolParts.join('')
  if (!pool) return { pool: CHARS_LOWER_SAFE, required: [CHARS_LOWER_SAFE] }

  return { pool, required }
}

/**
 * 生成一个随机密码。
 * 若 requireEach 为 true，保证每种字符集至少出现一次。
 */
export function generatePassword(config: PasswordGeneratorConfig = DEFAULT_PASSWORD_CONFIG): string {
  const { pool, required } = getAvailableChars(config)
  const len = Math.max(4, Math.min(128, config.length))
  const result: string[] = []

  // 先保证每种字符集至少一个
  if (config.requireEach && required.length > 0) {
    for (const chars of required) {
      result.push(chars[Math.floor(Math.random() * chars.length)])
    }
  }

  // 填充剩余长度
  while (result.length < len) {
    result.push(pool[Math.floor(Math.random() * pool.length)])
  }

  // 打乱顺序
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }

  return result.join('')
}

/** 评估密码强度：0~100 */
export function evaluatePasswordStrength(password: string): {
  score: number
  label: string
  color: string
} {
  let score = 0

  // 长度评分
  if (password.length >= 8) score += 20
  if (password.length >= 12) score += 10
  if (password.length >= 16) score += 10
  if (password.length >= 24) score += 10

  // 字符多样性
  const hasLower = /[a-z]/.test(password)
  const hasUpper = /[A-Z]/.test(password)
  const hasDigits = /\d/.test(password)
  const hasSymbols = /[^a-zA-Z0-9]/.test(password)

  const variety = [hasLower, hasUpper, hasDigits, hasSymbols].filter(Boolean).length
  score += variety * 10

  // 字符重复度惩罚
  const unique = new Set(password).size
  const uniqueRatio = unique / password.length
  if (uniqueRatio > 0.7) score += 10
  else if (uniqueRatio < 0.3) score -= 10

  // 常见模式惩罚
  if (/^(password|123456|qwerty|abc123)/i.test(password)) score = Math.max(0, score - 40)
  if (/^(\d+)$/.test(password)) score = Math.max(0, score - 20)
  if (/^([a-z]+)$/i.test(password) && !hasDigits && !hasSymbols) score = Math.max(0, score - 15)

  // 归一化
  score = Math.max(0, Math.min(100, score))

  let label: string
  let color: string
  if (score >= 80) { label = '强'; color = '#52c41a' }
  else if (score >= 60) { label = '中等'; color = '#faad14' }
  else if (score >= 40) { label = '弱'; color = '#fa8c16' }
  else { label = '极弱'; color = '#f5222d' }

  return { score, label, color }
}

/** 生成可读的密码短语（由常见单词组成，易记） */
export function generatePassphrase(wordCount: number = 4, separator: string = '-'): string {
  const WORDS = [
    'cloud', 'river', 'stone', 'wind', 'moon', 'star', 'lake', 'peak',
    'dawn', 'dusk', 'fern', 'oak', 'pine', 'rose', 'vine', 'wave',
    'amber', 'coral', 'flint', 'frost', 'glen', 'haze', 'iris', 'jade',
    'knot', 'leaf', 'moss', 'nest', 'opal', 'pine', 'rain', 'silk',
    'thorn', 'vale', 'willow', 'yarn', 'zephyr', 'acorn', 'birch', 'cove',
    'dune', 'elm', 'ford', 'gale', 'holm', 'isle', 'kelp', 'loom',
    'mead', 'nook', 'oath', 'plum', 'quay', 'reed', 'sloe', 'tarn',
    'ulna', 'veil', 'weld', 'xeno', 'yew', 'zeal', 'ark', 'bell',
    'cliff', 'dove', 'echo', 'frog', 'gnat', 'hawk', 'ibis', 'jack',
  ]

  const result: string[] = []
  for (let i = 0; i < wordCount; i++) {
    result.push(WORDS[Math.floor(Math.random() * WORDS.length)])
  }
  return result.join(separator)
}