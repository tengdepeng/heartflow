// ============================================================
// 心理安全 composable
// 提供情绪关键词检测、光笔记生成、危机热线查询等能力
// 纯函数，不依赖存储层
// ============================================================

// ---- 情绪关键词预设 ----

/** 低能量词 */
const LOW_ENERGY_WORDS = [
  '累', '疲惫', '没力气', '不想动', '困', '没精神',
  '瘫', '虚', '无力', '疲劳', '倦', '乏', '没劲',
  'tired', 'exhausted', 'drained', 'fatigued', 'weak',
]

/** 自伤/危机词 */
const SELF_HARM_WORDS = [
  '不想活', '没意思', '死了', '自杀', '结束', '消失',
  '撑不住', '受不了', '熬不下去', '崩溃', '绝望',
  'hopeless', 'suicide', 'end it', 'can\'t go on', 'give up',
]

/** 焦虑词 */
const ANXIETY_WORDS = [
  '焦虑', '紧张', '担心', '害怕', '恐慌', '不安',
  '心慌', '喘不过气', '睡不着', '失眠', '烦躁',
  'anxious', 'panic', 'worried', 'fear', 'nervous', 'restless',
]

/** 悲伤词 */
const SADNESS_WORDS = [
  '难过', '伤心', '哭', '泪', '悲伤', '忧郁',
  '失落', '孤独', '寂寞', '空虚', '心碎',
  'sad', 'depressed', 'lonely', 'heartbroken', 'grief', 'empty',
]

/** 愤怒词 */
const ANGER_WORDS = [
  '生气', '愤怒', '恼火', '烦', '讨厌', '恨',
  '不爽', '暴躁', '发火', '气死',
  'angry', 'furious', 'hate', 'annoyed', 'irritated',
]

export interface MoodDetectionResult {
  hasLowEnergy: boolean
  hasSelfHarm: boolean
  hasAnxiety: boolean
  hasSadness: boolean
  hasAnger: boolean
  /** 匹配到的关键词列表 */
  matchedKeywords: string[]
  /** 整体情绪严重程度: 0-10 */
  severity: number
}

export interface LightNote {
  message: string
  type: 'comfort' | 'reminder' | 'crisis' | 'calm'
}

/**
 * 检测文本中的情绪关键词
 */
export function detectMoodKeywords(text: string): MoodDetectionResult {
  const lower = text.toLowerCase()

  const matchedLowEnergy = LOW_ENERGY_WORDS.filter(w => lower.includes(w))
  const matchedSelfHarm = SELF_HARM_WORDS.filter(w => lower.includes(w))
  const matchedAnxiety = ANXIETY_WORDS.filter(w => lower.includes(w))
  const matchedSadness = SADNESS_WORDS.filter(w => lower.includes(w))
  const matchedAnger = ANGER_WORDS.filter(w => lower.includes(w))

  const hasLowEnergy = matchedLowEnergy.length > 0
  const hasSelfHarm = matchedSelfHarm.length > 0
  const hasAnxiety = matchedAnxiety.length > 0
  const hasSadness = matchedSadness.length > 0
  const hasAnger = matchedAnger.length > 0

  const matchedKeywords = [
    ...matchedLowEnergy,
    ...matchedSelfHarm,
    ...matchedAnxiety,
    ...matchedSadness,
    ...matchedAnger,
  ]

  // 计算严重程度
  const totalMatches = matchedKeywords.length
  const severity = Math.min(10, Math.round(totalMatches * 1.5))

  return {
    hasLowEnergy,
    hasSelfHarm,
    hasAnxiety,
    hasSadness,
    hasAnger,
    matchedKeywords,
    severity,
  }
}

/**
 * 根据检测结果生成光笔记（安慰/提醒文案）
 */
export function getLightNote(result: MoodDetectionResult): LightNote {
  // 危机优先 — 检测到自伤/危机词
  if (result.hasSelfHarm) {
    return {
      type: 'crisis',
      message:
        '我听到了你的声音。如果你现在很难受，不用说话，不用解释。\n' +
        '全国心理援助热线：400-161-9995\n' +
        '这通电话是免费的，会有人陪着你。',
    }
  }

  // 高焦虑
  if (result.hasAnxiety && result.severity >= 5) {
    return {
      type: 'calm',
      message:
        '感受到你心里的不安。如果觉得喘不过气，试试慢慢深呼吸——\n' +
        '吸气 4 秒，屏住 4 秒，呼气 6 秒。\n' +
        '不用着急，你可以慢慢来。',
    }
  }

  // 低能量
  if (result.hasLowEnergy) {
    return {
      type: 'comfort',
      message:
        '今天是不是有点累了？没关系，累了就歇一歇。\n' +
        '你已经做得很好了，不需要每时每刻都充满能量。\n' +
        '喝杯温水，给自己一个安静的角落。',
    }
  }

  // 悲伤
  if (result.hasSadness) {
    return {
      type: 'comfort',
      message:
        '难过的时候，不需要强颜欢笑。\n' +
        '允许自己脆弱，允许自己休息。\n' +
        '你并不孤单，总有人在默默关心着你。',
    }
  }

  // 愤怒
  if (result.hasAnger) {
    return {
      type: 'calm',
      message:
        '感受到你的情绪了。愤怒是正常的，不需要压抑它。\n' +
        '如果可以，给自己几分钟，离开让你生气的环境。\n' +
        '等心情平复一点，再回来面对。',
    }
  }

  // 低焦虑
  if (result.hasAnxiety) {
    return {
      type: 'calm',
      message:
        '有点紧张对吗？试着把注意力放在呼吸上。\n' +
        '感受空气进入和离开身体的感觉。\n' +
        '一切都会好起来的。',
    }
  }

  // 默认 — 安慰
  return {
    type: 'reminder',
    message:
      '你还好吗？如果有什么想说的，可以写在这里。\n' +
      '如果不想说也没关系，记得照顾好自己。',
  }
}

/**
 * 获取危机热线信息
 */
export function getCrisisHotline(): { name: string; phone: string; hours: string }[] {
  return [
    { name: '全国心理援助热线', phone: '400-161-9995', hours: '24 小时' },
    { name: '希望 24 热线', phone: '400-161-9995', hours: '24 小时' },
    { name: '北京心理危机研究与干预中心', phone: '010-82951332', hours: '24 小时' },
  ]
}

/**
 * 使用心理安全功能
 */
export function usePsychologicalSafety() {
  return {
    detectMoodKeywords,
    getLightNote,
    getCrisisHotline,
  }
}