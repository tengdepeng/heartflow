// ============================================================
// 安全守护体系 · 财产安全（反诈骗）
// 提供诈骗关键词检测、诈骗模式识别、假来电模拟、报平安签到
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../../engine/storage'

// ---- 诈骗检测 ----

/** 诈骗类型 */
export type FraudType = '钓鱼' | '冒充' | '投资' | '刷单' | '借贷' | '中奖' | '恐吓' | '其他'

/** 诈骗风险等级 */
export type FraudRiskLevel = 'low' | 'medium' | 'high' | 'critical'

/** 诈骗检测结果 */
export interface FraudDetectionResult {
  risk: FraudRiskLevel
  type: FraudType
  confidence: number // 0-1
  matchedKeywords: string[]
  warning: string
  suggestions: string[]
}

/** 诈骗关键词库 */
const FRAUD_KEYWORDS: Record<FraudType, { keywords: string[]; warning: string; suggestions: string[] }> = {
  '钓鱼': {
    keywords: ['验证码', '点击链接', '更新信息', '账号异常', '安全升级', '激活账户', '重新认证'],
    warning: '疑似钓鱼诈骗：请勿点击不明链接或提供验证码',
    suggestions: ['勿点击短信/邮件中的链接', '通过官方渠道核实', '验证码绝不透露给他人'],
  },
  '冒充': {
    keywords: ['公检法', '公安局', '法院', '检察院', '客服退款', '领导', '熟人', '老师', '快递丢失'],
    warning: '疑似冒充身份诈骗：请通过原有联系方式核实对方身份',
    suggestions: ['挂断后回拨官方电话核实', '不要按对方要求转账', '公检法不会电话办案要求转账'],
  },
  '投资': {
    keywords: ['稳赚', '高收益', '内幕消息', '专家指导', '数字货币', '原始股', '零风险', '保本', '翻倍'],
    warning: '疑似投资理财诈骗：高收益必然伴随高风险',
    suggestions: ['核实平台是否正规持牌', '不轻信"内幕消息"', '投资前咨询正规金融机构'],
  },
  '刷单': {
    keywords: ['刷单', '兼职', '日结', '在家赚钱', '轻松', '佣金', '垫付', '任务奖励'],
    warning: '疑似刷单诈骗：先给甜头后吞本金',
    suggestions: ['拒绝任何需要垫付资金的兼职', '正规兼职不需要先交钱', '刷单本身是违法行为'],
  },
  '借贷': {
    keywords: ['无抵押', '秒到账', '低利息', '黑户可贷', '无需征信', '手续费', '保证金'],
    warning: '疑似贷款诈骗：正规贷款不会要求提前支付费用',
    suggestions: ['选择正规银行或持牌机构', '贷款前要求缴费的都是诈骗', '查看平台金融牌照'],
  },
  '中奖': {
    keywords: ['恭喜中奖', '幸运用户', '领取奖品', '手续费', '个人所得税', '先交钱'],
    warning: '疑似中奖诈骗：天上不会掉馅饼',
    suggestions: ['未参与的活动不会中奖', '中奖不需要先交钱', '通过官方渠道核实'],
  },
  '恐吓': {
    keywords: ['通缉令', '逮捕令', '涉嫌洗钱', '安全账户', '保密', '不要告诉任何人', '转账到'],
    warning: '疑似恐吓诈骗：公检法不会通过电话发送通缉令',
    suggestions: ['立即挂断', '拨打110核实', '不存在"安全账户"'],
  },
  '其他': {
    keywords: ['转账', '汇款', '打钱', '借', '急用', '出事', '医院'],
    warning: '疑似诈骗：涉及资金往来请务必核实',
    suggestions: ['通过电话或视频确认对方身份', '不向陌生账户转账', '遇到紧急情况先冷静核实'],
  },
}

/** 检测诈骗风险 */
export function detectFraud(text: string): FraudDetectionResult | null {
  if (!text || text.trim().length === 0) return null

  const lowerText = text.toLowerCase()
  let bestMatch: { type: FraudType; count: number; keywords: string[] } | null = null

  for (const [type, config] of Object.entries(FRAUD_KEYWORDS)) {
    const matched: string[] = []
    for (const kw of config.keywords) {
      if (lowerText.includes(kw.toLowerCase())) {
        matched.push(kw)
      }
    }
    if (matched.length > 0 && (!bestMatch || matched.length > bestMatch.count)) {
      bestMatch = { type: type as FraudType, count: matched.length, keywords: matched }
    }
  }

  if (!bestMatch) return null

  const config = FRAUD_KEYWORDS[bestMatch.type]
  const confidence = Math.min(1, bestMatch.count / 4)
  let risk: FraudRiskLevel = 'low'
  if (confidence >= 0.75) risk = 'critical'
  else if (confidence >= 0.5) risk = 'high'
  else if (confidence >= 0.25) risk = 'medium'

  return {
    risk,
    type: bestMatch.type,
    confidence: Math.round(confidence * 100) / 100,
    matchedKeywords: bestMatch.keywords,
    warning: config.warning,
    suggestions: config.suggestions,
  }
}

// ---- 假来电 ----

export interface FakeCallConfig {
  callerName: string
  callerPhone: string
  /** 来电原因 */
  reason: string
  /** 延迟秒数 */
  delaySeconds: number
}

/** 生成假来电配置 */
export function createFakeCall(
  callerName: string,
  reason: string,
  delaySeconds: number = 5,
): FakeCallConfig {
  return {
    callerName,
    callerPhone: generateFakePhone(),
    reason,
    delaySeconds: Math.max(3, Math.min(delaySeconds, 60)),
  }
}

function generateFakePhone(): string {
  const prefixes = ['138', '139', '150', '151', '186', '188']
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)]
  const suffix = String(Math.floor(Math.random() * 100000000)).padStart(8, '0')
  return `${prefix}${suffix}`
}

// ---- 报平安签到 ----

const CHECKIN_STORAGE_KEY = 'hf:safety_checkin'

export interface SafetyCheckin {
  id: string
  timestamp: number
  location?: string
  note?: string
  /** 签到类型 */
  type: 'manual' | 'auto' | 'emergency'
  /** 是否安全 */
  safe: boolean
}

export interface CheckinStats {
  total: number
  lastCheckin: number | null
  streak: number // 连续签到天数
  safeCount: number
  emergencyCount: number
}

function loadCheckins(): SafetyCheckin[] {
  try {
    return storage.getKV<SafetyCheckin[]>(CHECKIN_STORAGE_KEY, [])
  } catch {
    return []
  }
}

function persistCheckins(checkins: SafetyCheckin[]) {
  storage.setKV(CHECKIN_STORAGE_KEY, checkins)
}

export function usePropertySafety() {
  const checkins = ref<SafetyCheckin[]>(loadCheckins())
  const fakeCallActive = ref(false)
  const fakeCallConfig = ref<FakeCallConfig | null>(null)

  /** 检测文本中的诈骗风险 */
  function checkFraud(text: string): FraudDetectionResult | null {
    return detectFraud(text)
  }

  /** 添加报平安签到 */
  function checkin(type: SafetyCheckin['type'] = 'manual', location?: string, note?: string): SafetyCheckin {
    const entry: SafetyCheckin = {
      id: `checkin_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: Date.now(),
      location,
      note,
      type,
      safe: type !== 'emergency',
    }
    checkins.value = [...checkins.value, entry]
    persistCheckins(checkins.value)
    return entry
  }

  /** 紧急签到 */
  function emergencyCheckin(location?: string): SafetyCheckin {
    return checkin('emergency', location, '紧急签到')
  }

  /** 触发假来电 */
  function triggerFakeCall(config: FakeCallConfig) {
    fakeCallConfig.value = config
    fakeCallActive.value = true
    setTimeout(() => {
      fakeCallActive.value = false
    }, config.delaySeconds * 1000)
  }

  /** 取消假来电 */
  function cancelFakeCall() {
    fakeCallActive.value = false
    fakeCallConfig.value = null
  }

  /** 获取签到统计 */
  const checkinStats = computed<CheckinStats>(() => {
    const sorted = [...checkins.value].sort((a, b) => b.timestamp - a.timestamp)
    const safeCount = checkins.value.filter(c => c.safe).length
    const emergencyCount = checkins.value.filter(c => !c.safe).length

    // 计算连续签到天数
    let streak = 0
    if (sorted.length > 0) {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
      let checkDay = today

      for (const c of sorted) {
        const cDay = new Date(new Date(c.timestamp).getFullYear(), new Date(c.timestamp).getMonth(), new Date(c.timestamp).getDate()).getTime()
        if (cDay === checkDay) {
          streak++
          checkDay -= 86400000
        } else if (cDay < checkDay) {
          break
        }
      }
    }

    return {
      total: checkins.value.length,
      lastCheckin: sorted.length > 0 ? sorted[0].timestamp : null,
      streak,
      safeCount,
      emergencyCount,
    }
  })

  /** 清理7天前的签到记录 */
  function cleanup() {
    const cutoff = Date.now() - 7 * 86400000
    checkins.value = checkins.value.filter(c => c.timestamp >= cutoff)
    persistCheckins(checkins.value)
  }

  return {
    checkins,
    checkinStats,
    fakeCallActive,
    fakeCallConfig,
    checkFraud,
    checkin,
    emergencyCheckin,
    triggerFakeCall,
    cancelFakeCall,
    cleanup,
  }
}