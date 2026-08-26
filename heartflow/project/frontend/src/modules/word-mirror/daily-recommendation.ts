// ============================================================
// 字镜阁 · 每日词汇推荐（P16-4）
// 每日一词推荐 + 复习推荐 + 主题词汇包 + 个性化推荐
// ============================================================

import { ref } from 'vue'
import { storage } from '@/engine/storage'
import type { WordEntry, ProficiencyLevel, WordGameType } from './types'

// ---- 每日推荐类型 ----

/** 每日一词 */
export interface DailyWord {
  /** 日期 YYYY-MM-DD */
  date: string
  /** 词汇 */
  word: string
  /** 释义 */
  definition: string
  /** 例句 */
  example: string
  /** 词源 */
  etymology: string
  /** 关联词汇 */
  relatedWords: string[]
  /** 趣味知识 */
  funFact: string
  /** 推荐练习类型 */
  practiceType: WordGameType
  /** 标签 */
  tags: string[]
}

/** 词汇推荐包 */
export interface WordRecommendationPack {
  id: string
  /** 推荐日期 */
  date: string
  /** 推荐类型 */
  type: 'daily_word' | 'review' | 'theme' | 'personalized'
  /** 每日一词 */
  dailyWord?: DailyWord
  /** 复习词汇列表 */
  reviewWords?: string[]
  /** 主题词汇包 */
  themePack?: ThemeWordPack
  /** 个性化推荐 */
  personalizedWords?: PersonalizedWord[]
  /** 推荐理由 */
  reason: string
  /** 今日学习建议 */
  studyTip: string
}

/** 主题词汇包 */
export interface ThemeWordPack {
  /** 主题名 */
  theme: string
  /** 主题描述 */
  description: string
  /** 主题图标 */
  icon: string
  /** 核心词汇 */
  coreWords: string[]
  /** 扩展词汇 */
  extendedWords: string[]
  /** 主题写作提示 */
  writingPrompt: string
}

/** 个性化推荐词 */
export interface PersonalizedWord {
  word: string
  definition: string
  /** 推荐理由 */
  reason: string
  /** 匹配度 0-100 */
  matchScore: number
  /** 推荐优先级 */
  priority: 'high' | 'medium' | 'low'
}

/** 推荐历史 */
export interface RecommendationHistory {
  date: string
  type: WordRecommendationPack['type']
  wordCount: number
  completed: boolean
  completedAt?: string
}

// ---- 存储键 ----

const DAILY_RECOMMENDATION_KEY = 'hf:word_mirror:daily_recommendation'
const RECOMMENDATION_HISTORY_KEY = 'hf:word_mirror:recommendation_history'

// ---- 内置每日一词库（365 天轮换） ----

const DAILY_WORD_LIBRARY: DailyWord[] = [
  {
    date: '',
    word: '澄明',
    definition: '清澈明亮，形容心境纯净透彻',
    example: '静坐片刻后，他的心境变得澄明如水。',
    etymology: '"澄"从水登声，本义为水清；"明"从日从月，日月之光为明',
    relatedWords: ['清澈', '通透', '明澈', '净澈'],
    funFact: '古人用"澄明"形容经过沉淀后的清水，也用来比喻修行后的心境。',
    practiceType: 'flashcard',
    tags: ['心境', '修行', '品质'],
  },
  {
    date: '',
    word: '笃行',
    definition: '切实地践行，坚定不移地执行',
    example: '知行合一，笃行不怠，方能有所成就。',
    etymology: '"笃"从马竹声，本义为马行稳健；"行"象形十字路口，本义为行走',
    relatedWords: ['践行', '力行', '躬行', '实践'],
    funFact: '"笃行"出自《中庸》"博学之，审问之，慎思之，明辨之，笃行之"，是学习的最后也是最重要一步。',
    practiceType: 'fill-blank',
    tags: ['行动', '品质', '学习'],
  },
  {
    date: '',
    word: '素朴',
    definition: '质朴无华，保持本真',
    example: '他过着素朴的生活，却拥有最丰富的精神世界。',
    etymology: '"素"从糸垂声，本义为本色丝织品；"朴"从木卜声，本义为未经加工的木材',
    relatedWords: ['质朴', '简约', '淳朴', '朴素'],
    funFact: '老子主张"见素抱朴"，认为回归本真是修身的最高境界。',
    practiceType: 'match',
    tags: ['品质', '生活', '哲学'],
  },
  {
    date: '',
    word: '精进',
    definition: '勤奋努力，不断向上',
    example: '每日精进一点点，日积月累便是巨大的进步。',
    etymology: '"精"从米青声，本义为精选米；"进"从辵隹声，本义为向前走',
    relatedWords: ['进步', '提升', '向上', '奋进'],
    funFact: '"精进"是佛教六度之一，指不懈怠地修行善法，后成为日常用语。',
    practiceType: 'etymology-quiz',
    tags: ['成长', '行动', '品质'],
  },
  {
    date: '',
    word: '温润',
    definition: '温和柔润，如玉般温雅',
    example: '他的言谈举止温润如玉，让人如沐春风。',
    etymology: '"温"从水昷声，本义为温暖；"润"从水闰声，本义为滋润',
    relatedWords: ['温和', '润泽', '柔和', '优雅'],
    funFact: '"温润如玉"出自《诗经》"言念君子，温其如玉"，是中国文化中对君子品格的最高赞美之一。',
    practiceType: 'flashcard',
    tags: ['品质', '性格', '文化'],
  },
  {
    date: '',
    word: '徜徉',
    definition: '悠闲自在地漫步或徘徊',
    example: '周末午后，他在书店里徜徉，享受难得的闲适时光。',
    etymology: '"徜"从彳尚声，表示行走；"徉"从彳羊声，本义为徘徊',
    relatedWords: ['漫步', '徘徊', '闲逛', '流连'],
    funFact: '"徜徉"常与"恣肆"连用，形容自由自在地遨游于学问或想象之中。',
    practiceType: 'fill-blank',
    tags: ['行动', '生活', '心情'],
  },
  {
    date: '',
    word: '蕴藉',
    definition: '含蓄而不外露，有内涵',
    example: '他的文字蕴藉深厚，读来余味无穷。',
    etymology: '"蕴"从艹缊声，本义为积聚；"藉"从艹耤声，本义为草垫，引申为依托',
    relatedWords: ['含蓄', '内敛', '深沉', '渊博'],
    funFact: '古人评文常用"蕴藉"一词，指文章含蓄而有深意，不直白浅露。',
    practiceType: 'match',
    tags: ['品质', '文学', '性格'],
  },
  {
    date: '',
    word: '洞见',
    definition: '深刻透彻的见解',
    example: '他对人性的洞见让人叹服，往往一语道破本质。',
    etymology: '"洞"从水同声，本义为水流急，引申为透彻；"见"从目从人，表示看见',
    relatedWords: ['洞察', '远见', '卓识', '真知'],
    funFact: '"洞见"强调不只是看到表面，而是穿透现象直达本质的深刻理解。',
    practiceType: 'etymology-quiz',
    tags: ['智慧', '思维', '品质'],
  },
  {
    date: '',
    word: '沉潜',
    definition: '深入沉静，专心致志',
    example: '他沉潜于古籍研究已有十年，终有所成。',
    etymology: '"沉"从水冘声，本义为沉入水中；"潜"从水朁声，本义为涉水',
    relatedWords: ['沉浸', '专注', '深入', '潜心'],
    funFact: '"沉潜"一词常用于学术研究，指长时间的专注投入，是中国文人推崇的治学态度。',
    practiceType: 'flashcard',
    tags: ['学习', '品质', '行动'],
  },
  {
    date: '',
    word: '幽微',
    definition: '深奥微妙，不易察觉',
    example: '书中的幽微之处，需要反复阅读才能体会。',
    etymology: '"幽"从山幺声，本义为昏暗深远；"微"从彳微声，本义为隐蔽行走',
    relatedWords: ['微妙', '深奥', '精微', '玄妙'],
    funFact: '"幽微"常用来形容道理或情感中那些难以言传但真实存在的细微之处。',
    practiceType: 'fill-blank',
    tags: ['思维', '品质', '文学'],
  },
  {
    date: '',
    word: '涵养',
    definition: '内在的修养和包容力',
    example: '真正的涵养不是忍耐，而是理解之后的从容。',
    etymology: '"涵"从水函声，本义为水泽众多，引申为包容；"养"从食羊声，本义为供养',
    relatedWords: ['修养', '包容', '气度', '胸襟'],
    funFact: '古人认为"涵养"如湖水，表面平静却深不可测，是内在修为的外在体现。',
    practiceType: 'match',
    tags: ['品质', '修养', '性格'],
  },
  {
    date: '',
    word: '砥砺',
    definition: '磨炼、锻炼，在困难中成长',
    example: '逆境是砥砺心志的最好磨刀石。',
    etymology: '"砥"从石氐声，本义为细磨刀石；"砺"从石厉声，本义为粗磨刀石',
    relatedWords: ['磨练', '锤炼', '锻炼', '淬炼'],
    funFact: '古人用"砥"和"砺"分别指细磨刀石和粗磨刀石，合起来表示全面的磨炼。',
    practiceType: 'etymology-quiz',
    tags: ['成长', '品质', '行动'],
  },
  {
    date: '',
    word: '旷达',
    definition: '心胸开阔，豁达大度',
    example: '他为人旷达，从不计较得失小事。',
    etymology: '"旷"从日广声，本义为光明开阔；"达"从辵羍声，本义为道路通畅',
    relatedWords: ['豁达', '开朗', '大度', '洒脱'],
    funFact: '苏轼以"旷达"著称，即使在贬谪中也能写出"一蓑烟雨任平生"的豪迈词句。',
    practiceType: 'flashcard',
    tags: ['性格', '品质', '心态'],
  },
  {
    date: '',
    word: '缱绻',
    definition: '情意深厚，难舍难分',
    example: '夕阳下，两人缱绻相依，不忍分离。',
    etymology: '"缱"从糹遣声，本义为丝线缠绕；"绻"从糹卷声，本义为卷曲缠绕',
    relatedWords: ['缠绵', '依恋', '眷恋', '深情'],
    funFact: '"缱绻"二字皆为绞丝旁，形象地表达了如丝线般缠绕难解的情感。',
    practiceType: 'fill-blank',
    tags: ['情感', '关系', '文学'],
  },
  {
    date: '',
    word: '峥嵘',
    definition: '高峻突出，比喻超越寻常',
    example: '那座山峰峥嵘险峻，令人望而生畏。',
    etymology: '"峥"从山争声，本义为山势高峻；"嵘"从山荣声，本义为山势突出',
    relatedWords: ['嶙峋', '崔嵬', '巍峨', '峻拔'],
    funFact: '"峥嵘岁月"出自毛泽东诗词，形容不平凡的岁月，后成为常用成语。',
    practiceType: 'match',
    tags: ['自然', '品质', '文学'],
  },
  {
    date: '',
    word: '翩跹',
    definition: '轻快地旋转舞动',
    example: '蝴蝶在花丛中翩跹起舞，春意盎然。',
    etymology: '"翩"从羽扁声，本义为鸟快速飞翔；"跹"从足千声，本义为旋转',
    relatedWords: ['起舞', '飞舞', '飘舞', '轻盈'],
    funFact: '"翩跹"常用于形容舞姿或飞鸟，两个字的偏旁一羽一足，暗示了飞翔与舞动的结合。',
    practiceType: 'etymology-quiz',
    tags: ['行动', '自然', '文学'],
  },
  {
    date: '',
    word: '醇厚',
    definition: '味道纯正浓厚，比喻品质纯朴深厚',
    example: '这杯陈年普洱，入口醇厚，回味悠长。',
    etymology: '"醇"从酉享声，本义为不掺水的浓酒；"厚"从厂从反，本义为山陵之厚',
    relatedWords: ['浓郁', '纯正', '深厚', '淳朴'],
    funFact: '古人用"醇"形容酒，用"厚"形容德，合起来既指味觉也指品性。',
    practiceType: 'flashcard',
    tags: ['品质', '感官', '文化'],
  },
  {
    date: '',
    word: '婉约',
    definition: '委婉含蓄，柔美动人',
    example: '她的文字婉约动人，如清泉流过心田。',
    etymology: '"婉"从女宛声，本义为柔顺；"约"从糹勺声，本义为缠束',
    relatedWords: ['含蓄', '柔美', '雅致', '细腻'],
    funFact: '"婉约派"是宋词的重要流派，以李清照、柳永为代表，词风含蓄柔美。',
    practiceType: 'fill-blank',
    tags: ['文学', '品质', '美学'],
  },
  {
    date: '',
    word: '恢弘',
    definition: '广阔宏大，气势磅礴',
    example: '故宫的建筑群恢弘壮丽，展现了古代工匠的智慧。',
    etymology: '"恢"从心灰声，本义为大；"弘"从弓厶声，本义为弓声，引申为广大',
    relatedWords: ['宏大', '壮阔', '磅礴', '雄伟'],
    funFact: '"恢弘"一词最早见于《周易》，"范围天地之化而不过，曲成万物而不遗"的恢弘气度。',
    practiceType: 'match',
    tags: ['品质', '规模', '美学'],
  },
  {
    date: '',
    word: '参悟',
    definition: '深入思考领悟',
    example: '他花了三年时间才参悟这个道理的真谛。',
    etymology: '"参"从厽从彡，本义为参与；"悟"从心吾声，本义为理解、觉醒',
    relatedWords: ['领悟', '体悟', '了悟', '顿悟'],
    funFact: '"参悟"常用于禅宗语境，指通过参禅达到对真理的领悟，后泛指深入思考后的理解。',
    practiceType: 'etymology-quiz',
    tags: ['思维', '学习', '哲学'],
  },
]

// ---- 主题词汇包 ----

const THEME_WORD_PACKS: ThemeWordPack[] = [
  {
    theme: '时间',
    description: '关于时间的词汇，帮助你更精确地表达时间的流逝与感受',
    icon: '⏳',
    coreWords: ['光阴', '荏苒', '须臾', '刹那', '流年'],
    extendedWords: ['朝暮', '经年', '蹉跎', '白驹', '倏忽', '韶华', '朝夕', '亘古'],
    writingPrompt: '用今天学到的关于时间的词汇，写一段 100 字的小短文，描述你感受到的"时间"。',
  },
  {
    theme: '宁静',
    description: '表达安静、平和心境的词汇集',
    icon: '🧘',
    coreWords: ['静谧', '恬淡', '安然', '澄澈', '幽静'],
    extendedWords: ['清寂', '宁和', '安详', '淡泊', '闲适', '悠然', '空灵', '旷然'],
    writingPrompt: '用"宁静"主题的词汇，描述一个让你感到平静的时刻或场景。',
  },
  {
    theme: '成长',
    description: '关于学习、进步和自我提升的词汇',
    icon: '🌱',
    coreWords: ['精进', '砥砺', '蜕变', '积淀', '升华'],
    extendedWords: ['淬炼', '磨砺', '厚积', '薄发', '豁然', '贯通', '日新', '知行'],
    writingPrompt: '回顾最近一次让你感到"成长"的经历，用主题词汇写一段 150 字的反思。',
  },
  {
    theme: '自然',
    description: '描绘自然风光与季节变化的词汇',
    icon: '🌿',
    coreWords: ['苍翠', '氤氲', '潋滟', '婆娑', '葳蕤'],
    extendedWords: ['葱茏', '缥缈', '潺潺', '蕭瑟', '浩渺', '旖旎', '斑驳', '扶疏'],
    writingPrompt: '选择一个你喜欢的自然场景，用这些词汇描绘它的美。',
  },
  {
    theme: '情感',
    description: '精确表达细腻情感的词汇',
    icon: '💝',
    coreWords: ['缱绻', '悸动', '惆怅', '欣然', '怅惘'],
    extendedWords: ['眷恋', '惦念', '怦然', '凄然', '温存', '依偎', '恍然', '倾心'],
    writingPrompt: '描述一个让你心动或感动的瞬间，尝试用至少 3 个主题词汇。',
  },
  {
    theme: '智慧',
    description: '关于思考、洞察和智慧的词汇',
    icon: '💡',
    coreWords: ['洞见', '睿智', '通达', '明辨', '灼见'],
    extendedWords: ['颖悟', '慧眼', '卓识', '融通', '渊博', '深邃', '真谛', '觉知'],
    writingPrompt: '分享一个你最近获得的"洞见"，用主题词汇解释它为什么重要。',
  },
  {
    theme: '意志',
    description: '表达决心、毅力和坚持的词汇',
    icon: '⚔️',
    coreWords: ['笃志', '坚韧', '执著', '刚毅', '矢志'],
    extendedWords: ['不屈', '不舍', '勇毅', '决绝', '恒心', '果敢', '毅然', '担当'],
    writingPrompt: '写一段关于你曾经坚持做某件事的经历，用主题词汇表达你的决心。',
  },
  {
    theme: '美学',
    description: '关于美、艺术和审美的词汇',
    icon: '🎨',
    coreWords: ['雅致', '隽永', '灵秀', '空灵', '蕴藉'],
    extendedWords: ['清逸', '婉约', '恢弘', '精妙', '飘逸', '浑然', '天成', '匠心'],
    writingPrompt: '描述一件你欣赏的艺术作品或自然美景，用美学词汇表达你的感受。',
  },
]

// ---- 基于用户数据的推荐词汇库 ----

const RECOMMENDATION_WORD_POOL: PersonalizedWord[] = [
  { word: '澄明', definition: '清澈明亮', reason: '适合冥想和反思场景', matchScore: 85, priority: 'high' },
  { word: '笃行', definition: '切实地践行', reason: '与行动力提升相关', matchScore: 82, priority: 'high' },
  { word: '精进', definition: '勤奋努力不断向上', reason: '契合成长型思维', matchScore: 88, priority: 'high' },
  { word: '涵养', definition: '内在的修养和包容力', reason: '与情绪管理相关', matchScore: 80, priority: 'medium' },
  { word: '洞见', definition: '深刻透彻的见解', reason: '提升思维深度', matchScore: 84, priority: 'high' },
  { word: '沉潜', definition: '深入沉静专心致志', reason: '适合专注力训练', matchScore: 78, priority: 'medium' },
  { word: '旷达', definition: '心胸开阔豁达大度', reason: '与心理健康相关', matchScore: 76, priority: 'medium' },
  { word: '砥砺', definition: '磨炼锻炼', reason: '与自我提升相关', matchScore: 83, priority: 'high' },
  { word: '温润', definition: '温和柔润如玉', reason: '与社交能力相关', matchScore: 74, priority: 'medium' },
  { word: '参悟', definition: '深入思考领悟', reason: '与学习能力相关', matchScore: 81, priority: 'high' },
  { word: '素朴', definition: '质朴无华保持本真', reason: '与简约生活理念相关', matchScore: 72, priority: 'medium' },
  { word: '醇厚', definition: '纯正浓厚', reason: '与品位提升相关', matchScore: 70, priority: 'low' },
  { word: '恢弘', definition: '广阔宏大', reason: '与格局拓展相关', matchScore: 73, priority: 'medium' },
  { word: '婉约', definition: '委婉含蓄柔美', reason: '与表达能力相关', matchScore: 71, priority: 'low' },
  { word: '幽微', definition: '深奥微妙', reason: '与洞察力提升相关', matchScore: 77, priority: 'medium' },
]

// ============================================================
// 每日词汇推荐引擎
// ============================================================

export function useDailyRecommendation() {
  const todayRecommendation = ref<WordRecommendationPack | null>(null)
  const history = ref<RecommendationHistory[]>([])
  const isLoading = ref(false)

  // ---- 持久化 ----

  function loadHistory(): void {
    history.value = storage.getKV<RecommendationHistory[]>(RECOMMENDATION_HISTORY_KEY, []) || []
  }

  function saveHistory(): void {
    storage.setKV(RECOMMENDATION_HISTORY_KEY, history.value)
  }

  function loadTodayRecommendation(): WordRecommendationPack | null {
    const saved = storage.getKV<WordRecommendationPack | null>(DAILY_RECOMMENDATION_KEY, null)
    if (saved && saved.date === getTodayStr()) {
      todayRecommendation.value = saved
      return saved
    }
    return null
  }

  // ---- 每日一词生成 ----

  /** 根据日期获取每日一词 */
  function getDailyWord(dateStr?: string): DailyWord {
    const date = dateStr || getTodayStr()
    // 基于日期的确定性选择（同一天永远返回同一个词）
    const dayOfYear = getDayOfYear(date)
    const index = dayOfYear % DAILY_WORD_LIBRARY.length
    const dailyWord = { ...DAILY_WORD_LIBRARY[index] }
    dailyWord.date = date
    return dailyWord
  }

  // ---- 复习推荐 ----

  /** 根据用户词汇数据生成复习推荐 */
  function getReviewRecommendations(words: WordEntry[], count: number = 5): string[] {
    if (words.length === 0) return []

    return words
      // 优先复习低熟练度词汇
      .sort((a, b) => {
        // 先按熟练度排序（低的优先）
        if (a.proficiency !== b.proficiency) return a.proficiency - b.proficiency
        // 再按上次复习时间（旧的优先）
        const aTime = a.lastReviewedAt ? new Date(a.lastReviewedAt).getTime() : 0
        const bTime = b.lastReviewedAt ? new Date(b.lastReviewedAt).getTime() : 0
        return aTime - bTime
      })
      .slice(0, count)
      .map((w) => w.word)
  }

  // ---- 主题推荐 ----

  /** 根据日期和用户偏好获取主题词汇包 */
  function getThemePack(dateStr?: string, userTags?: string[]): ThemeWordPack {
    const date = dateStr || getTodayStr()
    const dayOfYear = getDayOfYear(date)

    // 如果有用户偏好标签，优先匹配
    if (userTags && userTags.length > 0) {
      for (const pack of THEME_WORD_PACKS) {
        const packKeywords = [pack.theme, ...pack.coreWords, ...pack.extendedWords]
        const matchCount = userTags.filter((t) =>
          packKeywords.some((k) => k.includes(t) || t.includes(k)),
        ).length
        if (matchCount > 0) return pack
      }
    }

    // 否则基于日期轮换
    const index = (dayOfYear * 7) % THEME_WORD_PACKS.length
    return THEME_WORD_PACKS[index]
  }

  // ---- 个性化推荐 ----

  /** 根据用户词汇数据生成个性化推荐 */
  function getPersonalizedRecommendations(
    words: WordEntry[],
    count: number = 5,
  ): PersonalizedWord[] {
    if (words.length === 0 || count === 0) return []

    // 计算用户词汇画像
    const userProfile = buildUserWordProfile(words)

    // 过滤掉用户已掌握的词汇
    const knownWords = new Set(words.map((w) => w.word))
    const availableWords = RECOMMENDATION_WORD_POOL.filter(
      (pw) => !knownWords.has(pw.word),
    )

    if (availableWords.length === 0) return []

    // 根据用户画像调整匹配度
    const scored = availableWords.map((pw) => {
      let adjustedScore = pw.matchScore

      // 如果用户偏好匹配，加分
      if (userProfile.preferredTags.some((t) =>
        DAILY_WORD_LIBRARY.find((dw) => dw.word === pw.word)?.tags.includes(t),
      )) {
        adjustedScore += 10
      }

      // 如果用户弱项匹配，加分
      if (userProfile.weakProficiencyLevel <= 2 && pw.priority === 'high') {
        adjustedScore += 5
      }

      return { ...pw, matchScore: Math.min(100, adjustedScore) }
    })

    return scored
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, count)
      .map((pw) => ({
        ...pw,
        priority: pw.matchScore >= 85 ? 'high' : pw.matchScore >= 75 ? 'medium' : 'low',
      }))
  }

  // ---- 综合推荐包 ----

  /** 生成今日综合推荐 */
  function generateTodayRecommendation(
    words: WordEntry[],
    dateStr?: string,
  ): WordRecommendationPack {
    const date = dateStr || getTodayStr()
    const dayOfYear = getDayOfYear(date)

    // 每日一词
    const dailyWord = getDailyWord(date)

    // 复习推荐
    const reviewWords = getReviewRecommendations(words, 5)

    // 主题包
    const userProfile = buildUserWordProfile(words)
    const themePack = getThemePack(date, userProfile.preferredTags)

    // 个性化推荐
    const personalizedWords = getPersonalizedRecommendations(words, 4)

    // 根据日期轮换推荐重点
    const rotationType = dayOfYear % 7
    let type: WordRecommendationPack['type']
    let reason: string
    let studyTip: string

    if (rotationType === 0 || rotationType === 3) {
      type = 'daily_word'
      reason = `今日新词"${dailyWord.word}"，可纳入你的词汇边界`
      studyTip = '可先阅读词源和例句，再用它写一个句子，加深记忆。'
    } else if (rotationType === 1 || rotationType === 4) {
      type = 'review'
      reason = `你有 ${reviewWords.length} 个词汇需要复习，巩固记忆`
      studyTip = '使用间隔复习法：先自测，再对照释义，标记掌握程度。'
    } else if (rotationType === 2 || rotationType === 5) {
      type = 'theme'
      reason = `本周主题"${themePack.theme}"，系统学习一组相关词汇`
      studyTip = '可按主题学习，建立词汇之间的语义网络，记忆更牢固。'
    } else {
      type = 'personalized'
      reason = `根据你的学习进度，以下 ${personalizedWords.length} 个词汇与你的兴趣和弱项相关`
      studyTip = '这些词汇与你的兴趣和弱项相关，每天学一个，坚持就是胜利。'
    }

    const pack: WordRecommendationPack = {
      id: `rec-${date}`,
      date,
      type,
      dailyWord: type === 'daily_word' ? dailyWord : undefined,
      reviewWords: type === 'review' ? reviewWords : undefined,
      themePack: type === 'theme' ? themePack : undefined,
      personalizedWords: type === 'personalized' ? personalizedWords : undefined,
      reason,
      studyTip,
    }

    todayRecommendation.value = pack
    storage.setKV(DAILY_RECOMMENDATION_KEY, pack)

    // 记录历史
    addToHistory(date, type, 1)

    return pack
  }

  // ---- 历史管理 ----

  function addToHistory(
    date: string,
    type: WordRecommendationPack['type'],
    wordCount: number,
  ): void {
    // 避免重复
    const existing = history.value.find((h) => h.date === date && h.type === type)
    if (existing) return

    history.value.push({
      date,
      type,
      wordCount,
      completed: false,
    })
    saveHistory()
  }

  /** 标记推荐为已完成 */
  function completeRecommendation(date: string, type: WordRecommendationPack['type']): void {
    const record = history.value.find((h) => h.date === date && h.type === type)
    if (record) {
      record.completed = true
      record.completedAt = new Date().toISOString()
      saveHistory()
    }
  }

  /** 获取推荐历史统计 */
  function getRecommendationStats(): {
    totalRecommendations: number
    completedCount: number
    completionRate: number
    currentStreak: number
    longestStreak: number
    favoriteType: string
  } {
    const total = history.value.length
    const completed = history.value.filter((h) => h.completed).length
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0

    // 计算连续天数
    let currentStreak = 0
    let longestStreak = 0
    const dates = new Set(
      history.value.filter((h) => h.completed).map((h) => h.date),
    )
    const today = new Date()
    const checkDate = new Date(today)

    // 从今天往回数
    while (dates.has(checkDate.toISOString().split('T')[0])) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    }

    // 最长连续
    const sortedDates = [...dates].sort()
    let streakCount = 0
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        streakCount = 1
      } else {
        const prev = new Date(sortedDates[i - 1])
        const curr = new Date(sortedDates[i])
        const diffDays = (curr.getTime() - prev.getTime()) / 86400000
        if (diffDays === 1) {
          streakCount++
        } else {
          longestStreak = Math.max(longestStreak, streakCount)
          streakCount = 1
        }
      }
    }
    longestStreak = Math.max(longestStreak, streakCount)

    // 最常用类型
    const typeCounts: Record<string, number> = {}
    history.value.forEach((h) => {
      typeCounts[h.type] = (typeCounts[h.type] || 0) + 1
    })
    const favoriteType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'daily_word'

    return {
      totalRecommendations: total,
      completedCount: completed,
      completionRate: rate,
      currentStreak,
      longestStreak,
      favoriteType,
    }
  }

  /** 获取词汇库统计 */
  function getWordLibraryStats(): {
    dailyWordsCount: number
    themePacksCount: number
    recommendationPoolCount: number
  } {
    return {
      dailyWordsCount: DAILY_WORD_LIBRARY.length,
      themePacksCount: THEME_WORD_PACKS.length,
      recommendationPoolCount: RECOMMENDATION_WORD_POOL.length,
    }
  }

  // 初始化
  loadHistory()
  loadTodayRecommendation()

  return {
    todayRecommendation,
    history,
    isLoading,
    getDailyWord,
    getReviewRecommendations,
    getThemePack,
    getPersonalizedRecommendations,
    generateTodayRecommendation,
    completeRecommendation,
    getRecommendationStats,
    getWordLibraryStats,
    loadHistory,
    loadTodayRecommendation,
  }
}

// ============================================================
// 辅助函数
// ============================================================

/** 获取今日日期字符串 */
function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

/** 获取一年中的第几天 */
function getDayOfYear(dateStr: string): number {
  const date = new Date(dateStr)
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  return Math.floor(diff / 86400000)
}

/** 构建用户词汇画像 */
function buildUserWordProfile(words: WordEntry[]): {
  totalWords: number
  averageProficiency: number
  weakProficiencyLevel: ProficiencyLevel
  preferredTags: string[]
  strongTags: string[]
  masteredCount: number
  learningCount: number
} {
  if (words.length === 0) {
    return {
      totalWords: 0,
      averageProficiency: 1,
      weakProficiencyLevel: 1,
      preferredTags: [],
      strongTags: [],
      masteredCount: 0,
      learningCount: 0,
    }
  }

  const totalProficiency = words.reduce((sum, w) => sum + w.proficiency, 0)
  const averageProficiency = Math.round((totalProficiency / words.length) * 10) / 10

  // 最弱熟练度
  const proficiencyCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  words.forEach((w) => proficiencyCounts[w.proficiency]++)
  let weakLevel: ProficiencyLevel = 1
  let maxLowCount = 0
  for (let i = 1; i <= 5; i++) {
    if (proficiencyCounts[i] > maxLowCount) {
      maxLowCount = proficiencyCounts[i]
      weakLevel = i as ProficiencyLevel
    }
  }

  // 标签偏好
  const tagCounts: Record<string, number> = {}
  words.forEach((w) => {
    w.tags.forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1
    })
  })
  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])
  const preferredTags = sortedTags.slice(0, 5).map(([tag]) => tag)

  // 强标签（高熟练度词汇的标签）
  const strongTagWords = words.filter((w) => w.proficiency >= 4)
  const strongTagCounts: Record<string, number> = {}
  strongTagWords.forEach((w) => {
    w.tags.forEach((t) => {
      strongTagCounts[t] = (strongTagCounts[t] || 0) + 1
    })
  })
  const strongTags = Object.entries(strongTagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag)

  return {
    totalWords: words.length,
    averageProficiency,
    weakProficiencyLevel: weakLevel,
    preferredTags,
    strongTags,
    masteredCount: words.filter((w) => w.proficiency >= 4).length,
    learningCount: words.filter((w) => w.proficiency <= 2).length,
  }
}