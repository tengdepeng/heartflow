// ============================================================
// 字镜阁 · 词源网络（P16-4 扩展）
// 词汇词源追溯 + 词根词缀分解 + 同源词发现
// 内置词典从 15 条扩展至 55 条
// ============================================================

import { storage } from '@/engine/storage'
import type { EtymologyNode, WordEntry } from './types'
import { WORD_MIRROR_STORAGE_KEYS } from './types'

/** 内置词源数据（55 条，覆盖常用字词） */
const BUILTIN_ETYMOLOGIES: Record<string, EtymologyNode> = {
  // ===== 原 15 条 =====
  '心': {
    word: '心',
    origin: '象形字，甲骨文像心脏之形',
    language: '甲骨文',
    cognates: ['芯', '沁', '吣', '杺'],
    components: ['心(独体象形)'],
  },
  '流': {
    word: '流',
    origin: '从水㐬声，本义为水流动',
    language: '金文',
    cognates: ['硫', '琉', '旒'],
    components: ['氵(水)', '㐬(声旁)'],
  },
  '光': {
    word: '光',
    origin: '会意字，从火在人上，表示光明',
    language: '甲骨文',
    cognates: ['恍', '晃', '幌', '觥'],
    components: ['⺌(火)', '儿(人)'],
  },
  '时': {
    word: '时',
    origin: '从日寺声，本义为季节、时候',
    language: '金文',
    cognates: ['诗', '侍', '恃', '峙'],
    components: ['日', '寺(声旁)'],
  },
  '镜': {
    word: '镜',
    origin: '从金竟声，本义为铜镜',
    language: '说文',
    cognates: ['境', '竟', '獍'],
    components: ['钅(金)', '竟(声旁)'],
  },
  '思': {
    word: '思',
    origin: '从心囟声，本义为思考、想念',
    language: '金文',
    cognates: ['腮', '鳃', '揌'],
    components: ['田(囟)', '心'],
  },
  '记': {
    word: '记',
    origin: '从言己声，本义为记录、记忆',
    language: '说文',
    cognates: ['纪', '忌', '跽'],
    components: ['讠(言)', '己(声旁)'],
  },
  '书': {
    word: '书',
    origin: '从聿者声，本义为书写',
    language: '金文',
    cognates: ['抒', '纾', '杼'],
    components: ['肀(聿)', '者(声旁)'],
  },
  '言': {
    word: '言',
    origin: '指事字，从口辛声，本义为说话',
    language: '甲骨文',
    cognates: ['唁', '狺', '這'],
    components: ['口', '辛(声旁)'],
  },
  '语': {
    word: '语',
    origin: '从言吾声，本义为谈论、话语',
    language: '说文',
    cognates: ['悟', '梧', '唔', '焐'],
    components: ['讠(言)', '吾(声旁)'],
  },
  '工': {
    word: '工',
    origin: '象形字，像工具之形，引申为工匠、工作',
    language: '甲骨文',
    cognates: ['功', '攻', '汞', '虹', '红', '江', '扛', '项', '空'],
    components: ['工(独体象形)'],
  },
  '匠': {
    word: '匠',
    origin: '从匚从斤，匚为工具箱，斤为斧头，本义为木匠',
    language: '金文',
    cognates: ['近', '芹', '忻'],
    components: ['匚(工具箱)', '斤(斧)'],
  },
  '痕': {
    word: '痕',
    origin: '从疒艮声，本义为疤痕',
    language: '说文',
    cognates: ['很', '狠', '恨', '根', '跟', '恳', '垦', '银', '限', '眼'],
    components: ['疒(病)', '艮(声旁)'],
  },
  '休': {
    word: '休',
    origin: '会意字，从人依木，表示休息',
    language: '甲骨文',
    cognates: ['咻', '庥', '鸺'],
    components: ['亻(人)', '木'],
  },
  '业': {
    word: '业',
    origin: '象形字，像古代乐器架子上的装饰，引申为事业',
    language: '金文',
    cognates: ['邺', '䲜'],
    components: ['业(象形)'],
  },

  // ===== P16-4 新增 40 条 =====

  // ---- 自然与宇宙 ----
  '日': {
    word: '日',
    origin: '象形字，甲骨文像太阳之形，本义为太阳',
    language: '甲骨文',
    cognates: ['时', '明', '晴', '晒', '暖', '晓', '晖', '昭'],
    components: ['日(独体象形)'],
  },
  '月': {
    word: '月',
    origin: '象形字，甲骨文像月牙之形，本义为月亮',
    language: '甲骨文',
    cognates: ['明', '朗', '期', '朝', '朦', '胧', '望'],
    components: ['月(独体象形)'],
  },
  '山': {
    word: '山',
    origin: '象形字，甲骨文像山峰并立之形',
    language: '甲骨文',
    cognates: ['岭', '峰', '岳', '岩', '岛', '岸', '峡', '崇'],
    components: ['山(独体象形)'],
  },
  '水': {
    word: '水',
    origin: '象形字，甲骨文像水流之形',
    language: '甲骨文',
    cognates: ['河', '海', '江', '湖', '泉', '波', '浪', '泳', '沐', '沐'],
    components: ['水(独体象形)'],
  },
  '火': {
    word: '火',
    origin: '象形字，甲骨文像火焰上腾之形',
    language: '甲骨文',
    cognates: ['炎', '焰', '燃', '烧', '热', '灯', '烛', '炉'],
    components: ['火(独体象形)'],
  },
  '风': {
    word: '风',
    origin: '从虫凡声，甲骨文假借"凤"为风，本义为空气流动',
    language: '甲骨文',
    cognates: ['飘', '飓', '飒', '岚', '枫'],
    components: ['几(凡)', '乂(虫)'],
  },
  '星': {
    word: '星',
    origin: '从日生声，本义为天上的星星',
    language: '甲骨文',
    cognates: ['醒', '腥', '猩', '惺'],
    components: ['日', '生(声旁)'],
  },
  '天': {
    word: '天',
    origin: '指事字，甲骨文在人上加一横表示头顶上方，引申为天空',
    language: '甲骨文',
    cognates: ['添', '忝', '蚕'],
    components: ['一(头顶)', '大(人)'],
  },
  '地': {
    word: '地',
    origin: '从土也声，本义为大地、土地',
    language: '金文',
    cognates: ['池', '他', '她', '拖', '施'],
    components: ['土', '也(声旁)'],
  },

  // ---- 人体与生命 ----
  '手': {
    word: '手',
    origin: '象形字，金文像手掌五指之形',
    language: '金文',
    cognates: ['掌', '拳', '拿', '摩', '攀', '拜'],
    components: ['手(独体象形)'],
  },
  '目': {
    word: '目',
    origin: '象形字，甲骨文像眼睛之形',
    language: '甲骨文',
    cognates: ['眼', '睛', '看', '盯', '盲', '盼', '督', '眉'],
    components: ['目(独体象形)'],
  },
  '口': {
    word: '口',
    origin: '象形字，甲骨文像张开的嘴巴',
    language: '甲骨文',
    cognates: ['吃', '喝', '唱', '叫', '喊', '问', '味', '品'],
    components: ['口(独体象形)'],
  },
  '足': {
    word: '足',
    origin: '象形字，甲骨文像小腿和脚之形',
    language: '甲骨文',
    cognates: ['跑', '跳', '路', '跟', '踢', '踩', '踪'],
    components: ['足(独体象形)'],
  },
  '身': {
    word: '身',
    origin: '象形字，甲骨文像人怀孕之形，引申为身体',
    language: '甲骨文',
    cognates: ['躬', '躺', '躯', '躲'],
    components: ['身(独体象形)'],
  },
  '生': {
    word: '生',
    origin: '会意字，从屮从土，表示草木从土中长出',
    language: '甲骨文',
    cognates: ['性', '姓', '星', '牲', '笙', '胜'],
    components: ['屮(草)', '土'],
  },
  '命': {
    word: '命',
    origin: '从口从令，令亦声，本义为命令、天命',
    language: '金文',
    cognates: ['令', '领', '铃', '岭', '龄'],
    components: ['口', '令(声旁)'],
  },

  // ---- 情绪与心智 ----
  '情': {
    word: '情',
    origin: '从心青声，本义为感情、情绪',
    language: '说文',
    cognates: ['清', '晴', '请', '精', '睛', '静', '靖'],
    components: ['忄(心)', '青(声旁)'],
  },
  '意': {
    word: '意',
    origin: '从心音声，本义为心意、意思',
    language: '说文',
    cognates: ['忆', '臆', '薏', '噫'],
    components: ['心', '音(声旁)'],
  },
  '志': {
    word: '志',
    origin: '从心之声，本义为志向、意志',
    language: '说文',
    cognates: ['誌', '痣', '誌'],
    components: ['心', '之(声旁)'],
  },
  '爱': {
    word: '爱',
    origin: '从心旡声，本义为喜爱、仁爱',
    language: '说文',
    cognates: ['暖', '援', '缓', '媛'],
    components: ['爫(爪)', '冖(覆盖)', '心', '夊(行走)'],
  },
  '梦': {
    word: '梦',
    origin: '从夕瞢省声，本义为睡眠中的幻象',
    language: '甲骨文',
    cognates: ['朦', '檬', '礞'],
    components: ['林', '夕'],
  },

  // ---- 行动与创造 ----
  '行': {
    word: '行',
    origin: '象形字，甲骨文像十字路口，本义为行走',
    language: '甲骨文',
    cognates: ['街', '往', '征', '徒', '衡', '衔'],
    components: ['彳(左步)', '亍(右步)'],
  },
  '走': {
    word: '走',
    origin: '会意字，从天从止，表示奔跑',
    language: '金文',
    cognates: ['起', '超', '越', '赶', '赴', '趣', '趋'],
    components: ['土(天)', '止(脚)'],
  },
  '建': {
    word: '建',
    origin: '从聿从廴，聿为笔廴为长行，本义为建立、创立',
    language: '金文',
    cognates: ['健', '键', '腱', '毽'],
    components: ['聿(笔)', '廴(长行)'],
  },
  '造': {
    word: '造',
    origin: '从辵告声，本义为到、前往，引申为制造',
    language: '金文',
    cognates: ['糙', '慥'],
    components: ['辶(辵)', '告(声旁)'],
  },
  '写': {
    word: '写',
    origin: '从宀舄声，本义为放置、移置，引申为书写',
    language: '说文',
    cognates: ['泻', '卸'],
    components: ['宀(房屋)', '舄(声旁)'],
  },
  '画': {
    word: '画',
    origin: '会意字，从聿从田，表示用笔划分田界',
    language: '甲骨文',
    cognates: ['划', '畵'],
    components: ['聿(笔)', '田'],
  },

  // ---- 关系与连接 ----
  '友': {
    word: '友',
    origin: '会意字，从二又，表示两只手相握，引申为朋友',
    language: '甲骨文',
    cognates: ['爱', '受', '授', '爰'],
    components: ['又(右手)', '又(右手)'],
  },
  '家': {
    word: '家',
    origin: '从宀从豕，表示屋内有猪，古代农业社会富足的象征',
    language: '甲骨文',
    cognates: ['嫁', '稼', '傢'],
    components: ['宀(房屋)', '豕(猪)'],
  },
  '信': {
    word: '信',
    origin: '从人从言，会意为人言可信',
    language: '金文',
    cognates: ['訫', '㐰'],
    components: ['亻(人)', '言'],
  },
  '和': {
    word: '和',
    origin: '从口禾声，本义为声音相应、和谐',
    language: '金文',
    cognates: ['禾', '科', '酥', '龢'],
    components: ['口', '禾(声旁)'],
  },
  '根': {
    word: '根',
    origin: '从木艮声，本义为植物根部',
    language: '说文',
    cognates: ['跟', '很', '恨', '痕', '恳', '垦', '银', '限'],
    components: ['木', '艮(声旁)'],
  },

  // ---- 抽象概念 ----
  '道': {
    word: '道',
    origin: '从辵首声，本义为道路，引申为道理、方法',
    language: '金文',
    cognates: ['导', '首'],
    components: ['辶(辵)', '首(声旁)'],
  },
  '德': {
    word: '德',
    origin: '从彳从直从心，表示心正行直，本义为道德',
    language: '甲骨文',
    cognates: ['得', '聴'],
    components: ['彳(行走)', '直', '心'],
  },
  '知': {
    word: '知',
    origin: '从口从矢，表示说话如箭般准确，引申为知道',
    language: '金文',
    cognates: ['智', '痴', '蜘'],
    components: ['矢(箭)', '口'],
  },
  '空': {
    word: '空',
    origin: '从穴工声，本义为孔洞、空虚',
    language: '说文',
    cognates: ['控', '腔', '椌'],
    components: ['穴', '工(声旁)'],
  },
  '静': {
    word: '静',
    origin: '从青争声，本义为安静、宁静',
    language: '说文',
    cognates: ['净', '靖', '婧', '睛', '精'],
    components: ['青', '争(声旁)'],
  },
  '美': {
    word: '美',
    origin: '会意字，从羊从大，表示羊大为美',
    language: '甲骨文',
    cognates: ['镁', '渼', '媄'],
    components: ['羊', '大'],
  },
  '善': {
    word: '善',
    origin: '从羊从言，表示吉祥之言，引申为善良',
    language: '金文',
    cognates: ['膳', '缮', '鳝', '鄯'],
    components: ['羊', '言'],
  },
  '真': {
    word: '真',
    origin: '从匕从目从乚从八，本义为真实、真诚',
    language: '金文',
    cognates: ['镇', '填', '慎', '缜', '稹'],
    components: ['匕', '目', '乚', '八'],
  },
  '变': {
    word: '变',
    origin: '从攵䜌声，本义为改变、变化',
    language: '说文',
    cognates: ['恋', '栾', '鸾', '弯', '蛮'],
    components: ['䜌(声旁)', '攵(攴)'],
  },
  '化': {
    word: '化',
    origin: '会意字，从人从匕，表示人变化',
    language: '甲骨文',
    cognates: ['花', '华', '货', '靴'],
    components: ['亻(人)', '匕(变化)'],
  },
}

/**
 * 字镜阁词源网络
 */
export function useEtymologyNetwork() {
  /** 所有词源记录 */
  const etymologies = ref<EtymologyNode[]>([])

  /** 从存储加载 */
  async function load(): Promise<void> {
    const saved = await storage.getKV<EtymologyNode[]>(WORD_MIRROR_STORAGE_KEYS.NETWORKS, [])
    // 合并内置词源与用户自定义词源
    const builtin = Object.values(BUILTIN_ETYMOLOGIES)
    const custom = (saved || []).filter(
      (e: EtymologyNode) => !builtin.some((b) => b.word === e.word)
    )
    etymologies.value = [...builtin, ...custom]
  }

  /**
   * 查询词源
   */
  function getEtymology(word: string): EtymologyNode | null {
    // 精确匹配
    const exact = etymologies.value.find((e) => e.word === word)
    if (exact) return exact

    // 模糊匹配：查找包含该字的复合词
    const compound = etymologies.value.find(
      (e) => e.word.includes(word) && e.word !== word
    )
    return compound || null
  }

  /**
   * 查询同源词
   */
  function getCognates(word: string): string[] {
    const node = getEtymology(word)
    return node?.cognates || []
  }

  /**
   * 查找词根关联
   * 给定一个词，找到所有共享相同词根的词汇
   */
  function getRootRelatives(word: string): EtymologyNode[] {
    const target = getEtymology(word)
    if (!target || target.components.length === 0) return []

    const targetRoot = target.components[0].replace(/[（(].*[）)]/g, '')
    return etymologies.value.filter((e) => {
      if (e.word === word) return false
      return e.components.some(
        (c) => c.replace(/[（(].*[）)]/g, '') === targetRoot
      )
    })
  }

  /**
   * 添加自定义词源
   */
  async function addEtymology(node: EtymologyNode): Promise<void> {
    const existing = etymologies.value.findIndex((e) => e.word === node.word)
    if (existing >= 0) {
      etymologies.value[existing] = node
    } else {
      etymologies.value.push(node)
    }
    await persist()
  }

  /**
   * 从词汇列表生成词源建议
   */
  function suggestEtymologies(words: WordEntry[]): { word: string; suggestion: EtymologyNode }[] {
    return words
      .filter((w) => !etymologies.value.some((e) => e.word === w.word))
      .map((w) => {
        // 简单规则：如果词包含已知词根字，尝试推荐
        const char = w.word.charAt(0)
        const root = etymologies.value.find((e) => e.word === char)
        if (root) {
          return {
            word: w.word,
            suggestion: {
              word: w.word,
              origin: `可能与"${char}"相关：${root.origin}`,
              language: root.language,
              cognates: [],
              components: [char, w.word.slice(1)],
            },
          }
        }
        return {
          word: w.word,
          suggestion: {
            word: w.word,
            origin: '待追溯',
            language: '未知',
            cognates: [],
            components: w.word.split(''),
          },
        }
      })
  }

  /** 获取词源词典大小 */
  function getDictionarySize(): number {
    return etymologies.value.length
  }

  /** 按语言分类词源 */
  function getEtymologiesByLanguage(): Record<string, EtymologyNode[]> {
    const grouped: Record<string, EtymologyNode[]> = {}
    for (const e of etymologies.value) {
      if (!grouped[e.language]) grouped[e.language] = []
      grouped[e.language].push(e)
    }
    return grouped
  }

  /** 搜索词源（支持模糊匹配） */
  function searchEtymologies(query: string): EtymologyNode[] {
    const q = query.toLowerCase()
    return etymologies.value.filter(
      (e) =>
        e.word.includes(q) ||
        e.origin.includes(q) ||
        e.cognates.some((c) => c.includes(q)) ||
        e.components.some((c) => c.includes(q))
    )
  }

  /** 持久化自定义词源 */
  async function persist(): Promise<void> {
    const builtinWords = new Set(Object.keys(BUILTIN_ETYMOLOGIES))
    const custom = etymologies.value.filter((e) => !builtinWords.has(e.word))
    await storage.setKV(WORD_MIRROR_STORAGE_KEYS.NETWORKS, custom)
  }

  // 初始化
  load()

  return {
    etymologies,
    getEtymology,
    getCognates,
    getRootRelatives,
    addEtymology,
    suggestEtymologies,
    getDictionarySize,
    getEtymologiesByLanguage,
    searchEtymologies,
    load,
  }
}

// 用于 Vue 响应式
import { ref } from 'vue'