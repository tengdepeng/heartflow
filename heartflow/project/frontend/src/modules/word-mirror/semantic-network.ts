// ============================================================
// 字镜阁 · 语义关联网络
// 词汇间语义关系发现 + 网络构建 + 关联推荐
// ============================================================

import { storage } from '@/engine/storage'
import type { WordEntry, SemanticNetwork, SemanticEdge, SemanticRelation } from './types'
import { WORD_MIRROR_STORAGE_KEYS, SEMANTIC_RELATION_META } from './types'

// 内置近义词词典
const SYNONYM_DICT: Record<string, string[]> = {
  '思考': ['思索', '考虑', '琢磨', '沉思', '冥想'],
  '学习': ['研习', '修习', '钻研', '攻读', '精进'],
  '工作': ['劳作', '作业', '做事', '办公', '干活'],
  '休息': ['歇息', '休憩', '放松', '安歇', '养神'],
  '情绪': ['心情', '情感', '心绪', '感受', '心境'],
  '记忆': ['回忆', '追忆', '回想', '铭记', '记取'],
  '创造': ['创作', '制造', '打造', '构建', '塑造'],
  '连接': ['联结', '联系', '关联', '纽带', '链接'],
  '成长': ['生长', '发展', '进步', '提升', '进化'],
  '宁静': ['安静', '平静', '安详', '静谧', '恬静'],
  '专注': ['专心', '凝神', '沉浸', '投入', '集中'],
  '自由': ['自在', '自主', '独立', '无拘', '洒脱'],
  '温暖': ['温馨', '暖和', '暖意', '温情', '和煦'],
  '勇气': ['勇敢', '胆识', '无畏', '英勇', '刚毅'],
  '智慧': ['才智', '聪明', '睿智', '聪慧', '明达'],
}

// 内置反义词词典
const ANTONYM_DICT: Record<string, string[]> = {
  '光明': ['黑暗', '阴暗', '晦暗'],
  '快乐': ['悲伤', '痛苦', '忧愁'],
  '开始': ['结束', '终止', '完毕'],
  '前进': ['后退', '倒退', '退缩'],
  '丰富': ['贫乏', '匮乏', '单调'],
  '自由': ['束缚', '禁锢', '限制'],
  '宁静': ['喧嚣', '嘈杂', '纷扰'],
  '温暖': ['寒冷', '冰冷', '严寒'],
  '勇气': ['胆怯', '恐惧', '懦弱'],
  '智慧': ['愚昧', '愚蠢', '无知'],
}

// 搭配关系词典
const COLLOCATION_DICT: Record<string, string[]> = {
  '时间': ['管理', '流逝', '规划', '珍惜', '碎片'],
  '知识': ['体系', '积累', '传承', '分享', '图谱'],
  '工作': ['效率', '方法', '流程', '日志', '成果'],
  '情绪': ['管理', '表达', '调节', '记录', '波动'],
  '习惯': ['养成', '坚持', '改变', '追踪', '自律'],
  '关系': ['维护', '建立', '网络', '纽带', '信任'],
  '身体': ['健康', '锻炼', '休息', '感知', '信号'],
  '心灵': ['成长', '滋养', '修行', '宁静', '自由'],
}

/**
 * 字镜阁语义关联网络
 */
export function useSemanticNetwork() {
  const networks = ref<SemanticNetwork[]>([])

  /** 从存储加载 */
  async function load(): Promise<void> {
    const saved = await storage.getKV<SemanticNetwork[]>(WORD_MIRROR_STORAGE_KEYS.NETWORKS, [])
    networks.value = saved
  }

  /**
   * 构建词汇的语义网络
   */
  function buildNetwork(centerWord: string, wordPool: WordEntry[]): SemanticNetwork {
    const edges: SemanticEdge[] = []
    const nodes = new Set<string>([centerWord])

    // 1. 近义词
    const synonyms = SYNONYM_DICT[centerWord] || []
    for (const syn of synonyms) {
      nodes.add(syn)
      edges.push({
        source: centerWord,
        target: syn,
        relationType: 'synonym',
        strength: 0.9,
      })
    }

    // 2. 反义词
    const antonyms = ANTONYM_DICT[centerWord] || []
    for (const ant of antonyms) {
      nodes.add(ant)
      edges.push({
        source: centerWord,
        target: ant,
        relationType: 'antonym',
        strength: 0.7,
      })
    }

    // 3. 搭配关系
    const collocations = COLLOCATION_DICT[centerWord] || []
    for (const col of collocations) {
      nodes.add(col)
      edges.push({
        source: centerWord,
        target: col,
        relationType: 'collocation',
        strength: 0.6,
      })
    }

    // 4. 从词库中查找包含该词的条目
    for (const entry of wordPool) {
      if (entry.word === centerWord) continue
      if (nodes.has(entry.word)) continue

      // 如果词库中的词与中心词共享标签，视为相关
      if (entry.tags.length > 0) {
        nodes.add(entry.word)
        edges.push({
          source: centerWord,
          target: entry.word,
          relationType: 'related',
          strength: 0.4,
        })
      }
    }

    return {
      nodes: Array.from(nodes).slice(0, 20), // 限制节点数
      edges,
      center: centerWord,
    }
  }

  /**
   * 从词汇列表中自动发现语义关系
   */
  function discoverRelations(words: WordEntry[]): SemanticEdge[] {
    const edges: SemanticEdge[] = []
    const wordSet = new Set(words.map((w) => w.word))

    for (const word of words) {
      // 检查近义词
      const synonyms = SYNONYM_DICT[word.word] || []
      for (const syn of synonyms) {
        if (wordSet.has(syn)) {
          edges.push({
            source: word.word,
            target: syn,
            relationType: 'synonym',
            strength: 0.85,
          })
        }
      }

      // 检查反义词
      const antonyms = ANTONYM_DICT[word.word] || []
      for (const ant of antonyms) {
        if (wordSet.has(ant)) {
          edges.push({
            source: word.word,
            target: ant,
            relationType: 'antonym',
            strength: 0.7,
          })
        }
      }

      // 共享标签
      for (const other of words) {
        if (other.word <= word.word) continue
        const sharedTags = word.tags.filter((t) => other.tags.includes(t))
        if (sharedTags.length > 0) {
          edges.push({
            source: word.word,
            target: other.word,
            relationType: 'related',
            strength: Math.min(sharedTags.length * 0.3, 0.8),
          })
        }
      }
    }

    return edges
  }

  /**
   * 获取关系的描述文本
   */
  function describeRelation(edge: SemanticEdge): string {
    const meta = SEMANTIC_RELATION_META[edge.relationType]
    return `${edge.source} ${meta.icon} ${edge.target}（${meta.label}，强度 ${Math.round(edge.strength * 100)}%）`
  }

  /**
   * 推荐关联词汇
   */
  function suggestRelatedWords(word: string, wordPool: WordEntry[]): { word: string; relation: SemanticRelation; reason: string }[] {
    const suggestions: { word: string; relation: SemanticRelation; reason: string }[] = []

    // 近义词推荐
    const synonyms = SYNONYM_DICT[word] || []
    for (const syn of synonyms) {
      if (wordPool.some((w) => w.word === syn)) {
        suggestions.push({ word: syn, relation: 'synonym', reason: '近义词' })
      }
    }

    // 搭配推荐
    const collocations = COLLOCATION_DICT[word] || []
    for (const col of collocations) {
      const match = wordPool.find((w) => w.word === col)
      if (match) {
        suggestions.push({ word: col, relation: 'collocation', reason: `常与"${word}"搭配使用` })
      }
    }

    // 同标签推荐
    const sourceEntry = wordPool.find((w) => w.word === word)
    if (sourceEntry) {
      for (const other of wordPool) {
        if (other.word === word) continue
        const shared = sourceEntry.tags.filter((t) => other.tags.includes(t))
        if (shared.length > 0 && !suggestions.some((s) => s.word === other.word)) {
          suggestions.push({ word: other.word, relation: 'related', reason: `共享标签：${shared.join('、')}` })
        }
      }
    }

    return suggestions.slice(0, 10)
  }

  /**
   * 保存网络
   */
  async function saveNetwork(network: SemanticNetwork): Promise<void> {
    const existing = networks.value.findIndex((n) => n.center === network.center)
    if (existing >= 0) {
      networks.value[existing] = network
    } else {
      networks.value.push(network)
    }
    await persist()
  }

  async function persist(): Promise<void> {
    await storage.setKV(WORD_MIRROR_STORAGE_KEYS.NETWORKS, networks.value)
  }

  load()

  return {
    networks,
    buildNetwork,
    discoverRelations,
    describeRelation,
    suggestRelatedWords,
    saveNetwork,
    load,
  }
}

import { ref } from 'vue'