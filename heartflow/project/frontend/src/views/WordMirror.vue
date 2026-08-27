<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance wm">
    <!-- Header pattern -->
    <div data-enter class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <p class="header-kicker">字里行间，映照自我</p>
    <h1 class="wm-title">字镜阁</h1>

    <!-- Tab 导航 -->
    <div data-enter class="wm-tabs">
      <button class="wm-tab" :class="{ active: activeTab === 'analyze' }" @click="activeTab = 'analyze'">文字分析</button>
      <button class="wm-tab" :class="{ active: activeTab === 'vocabulary' }" @click="activeTab = 'vocabulary'">词汇自习室</button>
      <button class="wm-tab" :class="{ active: activeTab === 'association' }" @click="activeTab = 'association'">联想网络</button>
      <button class="wm-tab" :class="{ active: activeTab === 'writing' }" @click="activeTab = 'writing'">写作增强</button>
    </div>

    <!-- ============== Tab 1: 文字分析 ============== -->
    <template v-if="activeTab === 'analyze'">
    <div data-enter class="analyze-box">
      <textarea v-model="text" placeholder="粘贴一段文字…" rows="4" class="wm-input"/>
      <button @click="analyze" class="wm-btn" :disabled="!text.trim()">映照</button>
    </div>

    <div data-enter v-if="analysis.words.length">
      <section><h3>高频字穹顶</h3>
        <div class="wm-star-cloud">
          <span v-for="w in analysis.words.slice(0,50)" :key="w.char" class="wm-star-word"
            :style="{fontSize:`${10+w.count*2}px`,opacity:0.25+w.count*0.08,color:w.emotionColor}">
            {{w.char}}
          </span>
        </div>
      </section>

      <section v-if="analysis.mood"><h3>墨色情绪</h3>
        <div class="wm-mood-bar" :style="{background:analysis.mood.color,width:analysis.mood.intensity+'%'}">
          <span>{{analysis.mood.label}} · {{analysis.mood.intensity}}%</span>
        </div>
      </section>

      <section v-if="analysis.pairs.length"><h3>字间关联</h3>
        <div class="wm-pair-cloud">
          <span v-for="p in analysis.pairs.slice(0,20)" :key="p.pair" class="wm-pair-chip"
            :style="{opacity:0.25+p.count*0.1}">{{p.pair}}</span>
        </div>
      </section>

      <section><h3>书写节奏</h3>
        <div class="wm-rhythm-bar">
          <span v-for="(seg,i) in analysis.rhythm" :key="i" class="wm-rhythm-seg"
            :style="{flex:seg.length,opacity:0.3+seg.density*0.5}"/>
        </div>
        <span class="rhythm-label">字距 {{analysis.avgSpacing}} · 句长 {{analysis.avgSentLen}}字</span>
      </section>

      <section v-if="history.length>=2"><h3>字的演化</h3>
        <div class="wm-evolve-compare">
          <div class="evolve-old">
            <span class="evolve-label">{{fmt(history[history.length-1].at)}}</span>
            <div class="evolve-words">{{history[history.length-1].topWords.slice(0,5).join(' ')}}</div>
          </div>
          <span class="evolve-arrow">→</span>
          <div class="evolve-new">
            <span class="evolve-label">{{fmt(history[0].at)}}</span>
            <div class="evolve-words">{{history[0].topWords.slice(0,5).join(' ')}}</div>
          </div>
        </div>
      </section>
    </div>
    </template>

    <!-- ============== Tab 2: 词汇自习室 ============== -->
    <template v-if="activeTab === 'vocabulary'">
    <section data-enter class="wm-divider">
      <h2>词汇自习室</h2>
      <button class="wm-stale-toggle" :class="{ active: dimStale }" @click="dimStale = !dimStale">
        {{ dimStale ? '生疏词已变暗' : '生疏词不变暗' }}
      </button>
    </section>

    <!-- 间隔重复：今日待复习（F9，纯本地调度，可折叠） -->
    <section data-enter class="wm-review-section" v-if="dueList.length">
      <div class="wm-review-head" @click="reviewOpen = !reviewOpen">
        <span class="wm-review-title">🌱 今日待复习 <b>{{ dueList.length }}</b></span>
        <span class="group-toggle">{{ reviewOpen ? '▾' : '▸' }}</span>
      </div>
      <div v-if="reviewOpen" class="wm-review-body">
        <div v-for="item in dueList" :key="item.id" class="wm-review-row">
          <span class="rr-word">{{ item.word }}</span>
          <span class="rr-def">{{ item.definition }}</span>
          <button class="wm-review-btn" @click="reviewWord(item.id)">已复习</button>
        </div>
      </div>
    </section>

    <!-- 统计概览行 - 3 卡片 -->
    <section data-enter class="wm-stats-section">
      <div class="wm-stat-item">
        <span class="wm-stat-value">{{ stats.total }}</span>
        <span class="wm-stat-label">总词汇</span>
      </div>
      <div class="wm-stat-item">
        <span class="wm-stat-value">{{ stats.memorized }}</span>
        <span class="wm-stat-label">熟记</span>
      </div>
      <div class="wm-stat-item">
        <span class="wm-stat-value">{{ stats.learning }}</span>
        <span class="wm-stat-label">学习中</span>
      </div>
    </section>

    <!-- 词汇画像 -->
    <section data-enter v-if="vocabProfile" class="wm-profile-section">
      <h3>学习画像</h3>
      <div class="wm-profile-grid">
        <div class="wm-profile-item">
          <span class="profile-label">熟练度</span>
          <span class="profile-value">{{ Math.round(vocabProfile.avgProficiency * 20) }}%</span>
        </div>
        <div class="wm-profile-item">
          <span class="profile-label">连续天数</span>
          <span class="profile-value">{{ vocabProgress?.streak ?? 0 }}天</span>
        </div>
        <div class="wm-profile-item">
          <span class="profile-label">今日复习</span>
          <span class="profile-value">{{ vocabProgress?.reviewedToday ?? 0 }}词</span>
        </div>
      </div>
      <div v-if="vocabProfile.strengths?.length" class="wm-profile-tags">
        <span class="profile-tag-label">优势：</span>
        <span v-for="s in vocabProfile.strengths.slice(0, 3)" :key="s" class="profile-tag tag-strength">{{ s }}</span>
      </div>
      <div v-if="vocabProfile.weaknesses?.length" class="wm-profile-tags">
        <span class="profile-tag-label">待提升：</span>
        <span v-for="w in vocabProfile.weaknesses.slice(0, 3)" :key="w" class="profile-tag tag-weakness">{{ w }}</span>
      </div>
    </section>

    <!-- 添加词汇表单 -->
    <section data-enter class="wm-add-section">
      <div class="wm-add-row">
        <input v-model="newWord" placeholder="词汇" class="wm-form-input" @keydown.enter="addWord" />
        <input v-model="newDef" placeholder="释义" class="wm-form-input" @keydown.enter="addWord" />
        <button @click="addWord" class="wm-btn" :disabled="!newWord.trim()">添加</button>
      </div>
    </section>

    <!-- 搜索和筛选 -->
    <section data-enter class="wm-search-section">
      <div class="wm-toolbar">
        <input v-model="searchQuery" class="wm-search-input" placeholder="搜索词汇或释义…" />
        <select v-model="filterProficiency" class="wm-filter-select">
          <option value="">全部熟练度</option>
          <option value="learning">学习中</option>
          <option value="memorized">熟记</option>
          <option value="favorites">收藏</option>
        </select>
      </div>
    </section>

    <!-- 词汇分类分组 -->
    <section data-enter class="wm-word-groups">
      <div v-for="group in displayGroups" :key="group.key" class="wm-word-group">
        <div class="wm-group-header" @click="toggleGroup(group.key)">
          <span class="group-label">{{ group.label }}</span>
          <span class="group-count">{{ group.count }}</span>
          <span class="group-toggle">{{ group.expanded ? '▾' : '▸' }}</span>
        </div>
        <div v-if="group.expanded" class="group-body">
          <div v-for="item in group.items" :key="item.id" class="wm-word-card" :class="{ 'wm-word-card--stale': dimStale && isStale(item, Date.now()) }">
            <button class="wm-del-btn" @click="deleteWord(item.id)">×</button>
            <div class="card-top">
              <span class="card-word">{{ item.word }}</span>
              <span v-if="item.favorite" class="fav-badge">♥</span>
            </div>
            <p class="card-def">{{ item.definition }}</p>
            <div class="card-bottom">
              <div class="star-row" @click="upgradeProficiency(item.id)" :title="'熟练度 ' + item.proficiency + '/5'">
                <span v-for="s in 5" :key="s" class="star" :class="{ filled: s <= item.proficiency }">★</span>
              </div>
              <span class="card-time">{{ fmt(item.createdAt) }}</span>
              <button v-if="!item.favorite" class="wm-fav-btn" @click.stop="toggleFavorite(item.id)" title="收藏">♡</button>
              <button v-else class="wm-fav-btn active" @click.stop="toggleFavorite(item.id)" title="取消收藏">♥</button>
            </div>
          </div>
          <div v-if="!group.items.length" class="empty-group">暂无词汇</div>
        </div>
      </div>
    </section>

    <!-- 原有分析历史 -->
    <section data-enter v-if="history.length" class="history-section">
      <h3>分析历史</h3>
      <div v-for="h in history.slice(0,5)" :key="h.id" class="hist-item">
        <span class="hist-date">{{fmt(h.at)}}</span>
        <span class="hist-top">高频: {{h.topWords.slice(0,5).join(' ')}}</span>
        <span class="hist-mood">标签: {{h.mood||'-'}}</span>
      </div>
    </section>

    <div data-enter v-if="!analysis.words.length && !history.length && !words.length" class="empty"><span>🪞</span><p>在这里映照你的文字，或添加词汇开始学习</p></div>

    <!-- 间隔复习会话 -->
    <ReviewSessionPanel :words="wordEntries" />
    </template>

    <!-- ============== Tab 3: 联想网络 ============== -->
    <template v-if="activeTab === 'association'">
      <section data-enter>
        <h3>联想网络探索</h3>
        <div class="wm-assoc-input-row">
          <input
            v-model="assocSeed"
            class="wm-form-input"
            placeholder="输入一个词作为种子…"
            @keydown.enter="buildAssocGraph"
          />
          <button class="wm-btn" @click="buildAssocGraph" :disabled="!assocSeed.trim()">构建网络</button>
        </div>
      </section>

      <section data-enter v-if="assocGraph">
        <div class="wm-assoc-stats">
          <div class="wm-stat-item">
            <span class="wm-stat-value">{{ assocGraph.nodeCount }}</span>
            <span class="wm-stat-label">节点</span>
          </div>
          <div class="wm-stat-item">
            <span class="wm-stat-value">{{ assocGraph.edgeCount }}</span>
            <span class="wm-stat-label">关联</span>
          </div>
          <div class="wm-stat-item">
            <span class="wm-stat-value">{{ assocGraph.maxHop }}</span>
            <span class="wm-stat-label">跳数</span>
          </div>
          <div class="wm-stat-item">
            <span class="wm-stat-value">{{ Math.round(assocGraph.avgStrength * 100) }}%</span>
            <span class="wm-stat-label">平均强度</span>
          </div>
        </div>
      </section>

      <section data-enter v-if="assocGraph && assocGraph.nodes.length">
        <h3>节点列表</h3>
        <div class="wm-assoc-nodes">
          <span
            v-for="node in assocGraph.nodes"
            :key="node.id"
            class="wm-assoc-node"
            :class="'node-' + node.type"
            :style="{ opacity: 0.4 + node.strength * 0.6 }"
          >
            {{ node.word }}
            <small class="node-type">{{ node.type === 'seed' ? '种子' : node.type === 'direct' ? '直接' : node.type === 'indirect' ? '间接' : '桥接' }}</small>
          </span>
        </div>
      </section>

      <section data-enter v-if="assocGraph && assocGraph.edges.length">
        <h3>关联边</h3>
        <div class="wm-assoc-edges">
          <div v-for="edge in assocGraph.edges.slice(0, 30)" :key="edge.source + edge.target" class="wm-assoc-edge">
            <span class="edge-source">{{ edge.source }}</span>
            <span class="edge-arrow">→</span>
            <span class="edge-target">{{ edge.target }}</span>
            <span class="edge-relation" :style="{ color: getRelationColor(edge.relation) }">{{ edge.label }}</span>
            <span class="edge-strength">{{ Math.round(edge.strength * 100) }}%</span>
          </div>
        </div>
      </section>

      <section data-enter v-if="assocGraph">
        <h3>聚类分析</h3>
        <div class="wm-assoc-clusters">
          <div v-for="(cluster, i) in assocClusters" :key="i" class="wm-assoc-cluster">
            <span class="cluster-center">{{ cluster.center }}</span>
            <span class="cluster-theme">{{ cluster.theme }}</span>
            <div class="cluster-members">
              <span v-for="m in cluster.members" :key="m" class="cluster-member">{{ m }}</span>
            </div>
          </div>
        </div>
      </section>

      <div data-enter v-if="!assocGraph" class="empty"><span>🔗</span><p>输入一个词，探索它的联想网络</p></div>
    </template>

    <!-- ============== Tab 4: 写作增强 ============== -->
    <template v-if="activeTab === 'writing'">
      <section data-enter>
        <h3>写作模板</h3>
        <div class="wm-template-grid">
          <div
            v-for="tpl in writingEnhance.PRESET_TEMPLATES.slice(0, 8)"
            :key="tpl.id"
            class="wm-template-card"
            @click="selectedTemplate = tpl"
          >
            <span class="tpl-name">{{ tpl.name }}</span>
            <span class="tpl-desc">{{ tpl.description }}</span>
            <span class="tpl-difficulty">{{ '★'.repeat(tpl.difficulty) }}{{ '☆'.repeat(5 - tpl.difficulty) }}</span>
          </div>
        </div>
      </section>

      <section data-enter v-if="selectedTemplate">
        <h3>当前模板：{{ selectedTemplate.name }}</h3>
        <p class="tpl-detail-desc">{{ selectedTemplate.description }}</p>
        <div class="tpl-structure">
          <span v-for="(s, i) in selectedTemplate.structure" :key="i" class="tpl-struct-item">{{ s }}</span>
        </div>
        <div class="tpl-prompts">
          <p v-for="(p, i) in selectedTemplate.prompts" :key="i" class="tpl-prompt">{{ p }}</p>
        </div>
      </section>

      <section data-enter>
        <h3>写作分析</h3>
        <div class="analyze-box">
          <textarea v-model="writingText" placeholder="输入写作内容进行分析…" rows="4" class="wm-input" />
          <button @click="analyzeWriting" class="wm-btn" :disabled="!writingText.trim()">分析</button>
        </div>
      </section>

      <section data-enter v-if="writingResult">
        <div class="wm-writing-score">
          <div class="score-circle">
            <span class="score-number">{{ writingResult.score.overall }}</span>
            <span class="score-label">综合评分</span>
          </div>
          <div class="score-details">
            <div class="score-row">
              <span>词汇丰富度</span>
              <div class="score-bar"><div class="score-fill" :style="{ width: writingResult.score.vocabularyRichness * 20 + '%' }" /></div>
              <span>{{ writingResult.score.vocabularyRichness }}/5</span>
            </div>
            <div class="score-row">
              <span>结构完整度</span>
              <div class="score-bar"><div class="score-fill" :style="{ width: writingResult.score.structureCompleteness * 20 + '%' }" /></div>
              <span>{{ writingResult.score.structureCompleteness }}/5</span>
            </div>
            <div class="score-row">
              <span>情感表达</span>
              <div class="score-bar"><div class="score-fill" :style="{ width: writingResult.score.emotionalExpression * 20 + '%' }" /></div>
              <span>{{ writingResult.score.emotionalExpression }}/5</span>
            </div>
            <div class="score-row">
              <span>流畅度</span>
              <div class="score-bar"><div class="score-fill" :style="{ width: writingResult.score.fluency * 20 + '%' }" /></div>
              <span>{{ writingResult.score.fluency }}/5</span>
            </div>
          </div>
        </div>

        <div v-if="writingResult.analysis.suggestions.length" class="wm-suggestions">
          <h4>改进建议</h4>
          <div v-for="(s, i) in writingResult.analysis.suggestions" :key="i" class="wm-suggestion" :class="'sev-' + s.severity">
            <span class="sug-type">{{ s.type }}</span>
            <span class="sug-msg">{{ s.message }}</span>
          </div>
        </div>
      </section>

      <div data-enter v-if="!selectedTemplate && !writingResult" class="empty"><span>✍️</span><p>选择一个模板开始写作，或粘贴文字进行分析</p></div>

      <!-- 写作辅助 -->
      <WritingAssistantPanel :words="wordEntries" />
    </template>

    <!-- 文字分析（词频 + 风格） -->
    <TextAnalysisPanel :words="wordEntries" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { storage } from '../engine/storage'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useWordAssociation } from '../modules/word-mirror/word-association'
import { useWritingEnhance } from '../modules/word-mirror/writing-enhance'
import { usePersonalVocabulary } from '../modules/word-mirror/personal-vocabulary'
import { useWordMirror, type WordItem } from '../modules/word-mirror/word-mirror-store'
import { isStale } from '../modules/word-mirror/stale'
import { dueWords, nextReviewState } from '../modules/word-mirror/spaced-repetition'
import TextAnalysisPanel from '../components/TextAnalysisPanel.vue'
import WritingAssistantPanel from '../components/WritingAssistantPanel.vue'
import ReviewSessionPanel from '../components/ReviewSessionPanel.vue'
import type { WordEntry } from '../modules/word-mirror/types'

/* ============== 类型定义 ============== */
const { entranceRef, entranceClass } = useViewEntrance()
const wordAssoc = useWordAssociation()
const writingEnhance = useWritingEnhance()
const vocab = usePersonalVocabulary()

// ---- F8 生疏词变暗：可关闭，默认开启 ----
const dimStale = ref(storage.getKV<boolean>('hf:wordmirror_dim_stale', true))
watch(dimStale, (v) => storage.setKV('hf:wordmirror_dim_stale', v))

// ---- F9 间隔重复：今日待复习（默认展开；被动展示，不写入） ----
const reviewOpen = ref(true)
const dueList = computed(() => dueWords(words.value, Date.now()))

// Tab 导航
type WmTab = 'analyze' | 'vocabulary' | 'association' | 'writing'
const activeTab = ref<WmTab>('analyze')
interface WAnalysis {
  words: { char: string; count: number; emotionColor: string }[]
  mood: { label: string; color: string; intensity: number } | null
  pairs: { pair: string; count: number }[]
  rhythm: { length: number; density: number }[]
  avgSpacing: string
  avgSentLen: number
}
interface WordGroup {
  key: string
  label: string
  count: number
  items: WordItem[]
  expanded: boolean
}

/* ============== 文字分析相关 ============== */
const wm = useWordMirror()
const text = ref('')
const analysis = reactive<WAnalysis>({ words: [], mood: null, pairs: [], rhythm: [], avgSpacing: '', avgSentLen: 0 })
const history = wm.history
onMounted(() => wm.load())

const emotionMap: Record<string, { label: string; color: string }> = {
  '开心|快乐|高兴|喜欢|爱|幸福|美好|感谢|感恩|笑|暖|亮|光|花': { label: '积极词汇', color: '#f0c040' },
  '难过|悲伤|痛苦|哭|累|疲惫|厌倦|烦|焦虑|怕|担心|害怕|紧张|暗|冷|灰': { label: '低沉词汇', color: '#9080b8' },
  '应该|必须|一定|要|得|不能|不许|必须|绝|绝对|永远': { label: '强约束词汇', color: '#c05050' },
  '可以|也许|可能|试试|慢慢|不急|随便|都行|让|等|放|允许|空|静': { label: '缓和词汇', color: '#80b8d0' },
  '愤怒|气|恨|讨厌|讨厌|厌恶|恶心|滚|滚蛋': { label: '强烈词汇', color: '#e87030' },
}

function getEmotionColor(char: string): string {
  for (const [pattern, info] of Object.entries(emotionMap)) {
    if (new RegExp(pattern).test(char)) return info.color
  }
  return 'rgba(255,255,255,0.5)'
}

function analyze() {
  const t = text.value.trim()
  if (!t) return
  const map = new Map<string, number>()
  const clean = t.replace(/\s/g, '')
  for (const c of clean) { map.set(c, (map.get(c) || 0) + 1) }
  const words = [...map.entries()].map(([char, count]) => ({ char, count, emotionColor: getEmotionColor(char) })).sort((a, b) => b.count - a.count)

  let mood: WAnalysis['mood'] = null
  for (const [pattern, info] of Object.entries(emotionMap)) {
    const regex = new RegExp(pattern)
    const matches = t.match(regex)
    if (matches) { mood = { label: info.label, color: info.color, intensity: Math.min(Math.round(matches.length / t.length * 500), 100) }; break }
  }

  const pairMap = new Map<string, number>()
  for (let i = 0; i < clean.length - 1; i++) { const p = clean[i] + clean[i + 1]; pairMap.set(p, (pairMap.get(p) || 0) + 1) }
  const pairs = [...pairMap.entries()].filter(([, c]) => c >= 2).map(([pair, count]) => ({ pair, count })).sort((a, b) => b.count - a.count)

  const sentences = t.split(/[。！？\n]+/).filter(Boolean)
  const rhythm = sentences.map(s => ({ length: s.length, density: s.replace(/\s/g, '').length / Math.max(s.length, 1) }))
  const avgSentLen = Math.round(sentences.reduce((a, s) => a + s.length, 0) / Math.max(sentences.length, 1))
  const avgSpacing = rhythm.reduce((a, r) => a + r.density, 0) / Math.max(rhythm.length, 1) > 0.7 ? '紧密' : '舒缓'

  analysis.words = words; analysis.mood = mood; analysis.pairs = pairs; analysis.rhythm = rhythm; analysis.avgSpacing = avgSpacing; analysis.avgSentLen = avgSentLen

  const top = words.slice(0, 5).map(w => w.char)
  history.value.unshift({ id: `wh${Date.now()}`, text: t.slice(0, 100), topWords: top, mood: mood?.label || '', at: new Date().toISOString() })
  if (history.value.length > 20) history.value.length = 20
  wm.saveHistory()
  text.value = ''
}

/* ============== 词汇管理相关 ============== */
const words = wm.words
const newWord = ref('')
const newDef = ref('')
const searchQuery = ref('')
const filterProficiency = ref('')

// 文字分析面板所需：WordItem → WordEntry
const wordEntries = computed<WordEntry[]>(() =>
  words.value.map(w => ({
    id: w.id,
    word: w.word,
    definition: w.definition,
    proficiency: w.proficiency as WordEntry['proficiency'],
    favorite: w.favorite,
    tags: [],
    createdAt: w.createdAt,
    lastReviewedAt: w.lastReviewedAt,
    reviewCount: 0,
  })),
)

// 分组展开状态
const groupExpanded: Record<string, boolean> = { learning: true, memorized: false, favorites: false }

/* 统计概览 */
const stats = computed(() => {
  const total = words.value.length
  const memorized = words.value.filter(w => w.proficiency >= 5 && !w.favorite).length
  const learning = words.value.filter(w => w.proficiency < 5 && !w.favorite).length
  const today = words.value.filter(w => {
    const d = new Date(w.createdAt)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
  }).length
  return { total, memorized, learning, today }
})

/* 词汇画像（接入 usePersonalVocabulary） */
const vocabProfile = computed(() => {
  if (!words.value.length) return null
  const wordEntries = words.value.map(w => ({
    id: w.id,
    word: w.word,
    definition: w.definition,
    proficiency: Math.min(Math.max(w.proficiency, 1), 5) as 1|2|3|4|5,
    createdAt: w.createdAt,
    tags: [] as string[],
    favorite: w.favorite,
    reviewCount: 0,
  }))
  return vocab.getProfile(wordEntries)
})

const vocabProgress = computed(() => {
  if (!words.value.length) return null
  const wordEntries = words.value.map(w => ({
    id: w.id,
    word: w.word,
    definition: w.definition,
    proficiency: Math.min(Math.max(w.proficiency, 1), 5) as 1|2|3|4|5,
    createdAt: w.createdAt,
    tags: [] as string[],
    favorite: w.favorite,
    reviewCount: 0,
  }))
  return vocab.getProgress(wordEntries)
})

/* 筛选后的词汇列表 */
const filteredWords = computed(() => {
  return words.value.filter(w => {
    // 搜索过滤
    const matchSearch = !searchQuery.value
      || w.word.toLowerCase().includes(searchQuery.value.toLowerCase())
      || w.definition.toLowerCase().includes(searchQuery.value.toLowerCase())
    if (!matchSearch) return false
    // 熟练度筛选
    if (filterProficiency.value === 'memorized' && w.proficiency < 5) return false
    if (filterProficiency.value === 'learning' && w.proficiency >= 5) return false
    if (filterProficiency.value === 'favorites' && !w.favorite) return false
    return true
  })
})

/* 分组展示 */
const displayGroups = computed<WordGroup[]>(() => {
  const learning: WordItem[] = []
  const memorized: WordItem[] = []
  const favorites: WordItem[] = []

  for (const w of filteredWords.value) {
    if (w.favorite) {
      favorites.push(w)
    } else if (w.proficiency >= 5) {
      memorized.push(w)
    } else {
      learning.push(w)
    }
  }

  // 按创建时间倒序排列
  const sortByTime = (a: WordItem, b: WordItem) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  learning.sort(sortByTime)
  memorized.sort(sortByTime)
  favorites.sort(sortByTime)

  return [
    { key: 'learning', label: '学习中', count: learning.length, items: learning, expanded: groupExpanded.learning },
    { key: 'memorized', label: '熟记', count: memorized.length, items: memorized, expanded: groupExpanded.memorized },
    { key: 'favorites', label: '收藏', count: favorites.length, items: favorites, expanded: groupExpanded.favorites },
  ]
})

function toggleGroup(key: string) {
  groupExpanded[key] = !groupExpanded[key]
}

/* 添加词汇 */
function addWord() {
  const word = newWord.value.trim()
  if (!word) return
  words.value.push({
    id: `wm_${Date.now()}`,
    word,
    definition: newDef.value.trim(),
    proficiency: 1,
    favorite: false,
    createdAt: new Date().toISOString(),
    lastReviewedAt: new Date().toISOString(),
  })
  wm.saveWords()
  newWord.value = ''
  newDef.value = ''
}

/* 熟练度升级 */
function upgradeProficiency(id: string) {
  const item = words.value.find(w => w.id === id)
  if (!item || item.proficiency >= 5) return
  item.proficiency = Math.min(item.proficiency + 1, 5)
  item.lastReviewedAt = new Date().toISOString()
  wm.saveWords()
}

/* F9 间隔重复：标记一次复习（刷新 lastReviewedAt，熟练度 +1 封顶 5） */
function reviewWord(id: string) {
  const item = words.value.find(w => w.id === id)
  if (!item) return
  const next = nextReviewState(item, Date.now())
  item.proficiency = next.proficiency
  item.lastReviewedAt = next.lastReviewedAt
  wm.saveWords()
}

/* 收藏切换 */
function toggleFavorite(id: string) {
  const item = words.value.find(w => w.id === id)
  if (!item) return
  item.favorite = !item.favorite
  wm.saveWords()
}

/* 删除词汇 */
function deleteWord(id: string) {
  words.value = words.value.filter(w => w.id !== id)
  wm.saveWords()
}

/* ============== 通用工具函数 ============== */
function fmt(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 86400000) return '今天'
  if (diff < 172800000) return '昨天'
  return `${d.getMonth() + 1}/${d.getDate()}`
}

/* ============== 联想网络 ============== */
const assocSeed = ref('')
const assocGraph = ref<any>(null)
const assocClusters = ref<any[]>([])

function buildAssocGraph() {
  const seed = assocSeed.value.trim()
  if (!seed) return
  const wordItems = words.value.map(w => ({
    id: w.id,
    word: w.word,
    definition: w.definition,
    proficiency: Math.min(Math.max(w.proficiency, 1), 5) as 1|2|3|4|5,
    createdAt: w.createdAt,
    tags: [] as string[],
    favorite: w.favorite,
    reviewCount: 0,
  }))
  const graph = wordAssoc.buildGraph(seed, wordItems)
  assocGraph.value = graph
  assocClusters.value = wordAssoc.getClusters(graph)
}

function getRelationColor(relation: string): string {
  const meta = (wordAssoc as any).ASSOCIATION_RELATION_META?.[relation]
  return meta?.color ?? 'rgba(255,255,255,0.5)'
}

/* ============== 写作增强 ============== */
const writingText = ref('')
const selectedTemplate = ref<any>(null)
const writingResult = ref<any>(null)

function analyzeWriting() {
  const text = writingText.value.trim()
  if (!text) return
  const session = writingEnhance.createSession(
    '即时分析',
    text,
    selectedTemplate.value?.category ?? 'daily',
    selectedTemplate.value?.id,
  )
  const wordItems2 = words.value.map(w => ({
    id: w.id,
    word: w.word,
    definition: w.definition,
    proficiency: Math.min(Math.max(w.proficiency, 1), 5) as 1|2|3|4|5,
    createdAt: w.createdAt,
    tags: [] as string[],
    favorite: w.favorite,
    reviewCount: 0,
  }))
  const analysis = writingEnhance.analyzeWriting(session, wordItems2)
  const score = writingEnhance.scoreWriting(analysis)
  writingResult.value = { analysis, score }
}
</script>

<style scoped>
/* ============== 根容器 ============== */
.wm {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  overflow: hidden;
  background: transparent;
  color: var(--text-primary);
}

/* 环境辉光 */
.wm::before {
  content: '';
  position: fixed;
  top: -20%;
  left: -10%;
  width: 50%;
  height: 60%;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}
.wm::after {
  content: '';
  position: fixed;
  bottom: -10%;
  right: -10%;
  width: 50%;
  height: 50%;
  background: radial-gradient(ellipse, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* 所有子元素置于辉光之上 */
.wm > * {
  position: relative;
  z-index: 1;
}

/* ============== Header 装饰 ============== */
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 8px;
}
.orn-line {
  display: inline-block;
  width: 40px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.4), transparent);
}
.orn-diamond {
  color: var(--accent);
  font-size: 14px;
  opacity: 0.6;
}
.header-kicker {
  text-align: center;
  font-size: 12px;
  color: var(--accent);
  margin-bottom: 4px;
  letter-spacing: 4px;
}
.wm-title {
  text-align: center;
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 6px;
  color: var(--accent);
  margin-bottom: 28px;
}

/* ============== 文字分析区域 ============== */
.analyze-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 24px;
}
.wm-input {
  width: 100%;
  padding: 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  border-radius: 12px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  outline: none;
  resize: vertical;
  transition: border-color 0.2s;
}
.wm-input:focus {
  border-color: rgba(var(--accent-rgb), 0.35);
}
.wm-btn {
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  align-self: flex-end;
  transition: all 0.2s;
}
.wm-btn:hover:not(:disabled) {
  background: rgba(var(--accent-rgb), 0.18);
  border-color: rgba(var(--accent-rgb), 0.45);
}
.wm-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

section {
  margin-bottom: 24px;
}
section h3 {
  font-size: 14px;
  opacity: 0.7;
  margin-bottom: 10px;
  color: var(--text-primary);
}

/* ============== 高频字穹顶 ============== */
.wm-star-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 6px;
  align-items: baseline;
  padding: 12px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.wm-star-word {
  font-weight: 500;
  transition: all 0.2s;
  cursor: default;
  color: var(--accent);
}
.wm-star-word:hover {
  transform: scale(1.3);
  z-index: 1;
}

/* ============== 墨色情绪 ============== */
.wm-mood-bar {
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  color: #fff;
  min-width: 60px;
  transition: width 0.6s;
}

/* ============== 字间关联 ============== */
.wm-pair-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.wm-pair-chip {
  padding: 3px 8px;
  border-radius: 6px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.25);
  font-size: 11px;
  color: var(--accent);
}

/* ============== 书写节奏 ============== */
.wm-rhythm-bar {
  display: flex;
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 6px;
  background: var(--card-bg);
}
.wm-rhythm-seg {
  min-width: 2px;
  background: var(--accent);
}
.rhythm-label {
  font-size: 11px;
  opacity: 0.35;
  color: var(--text-primary);
}

/* ============== 字的演化 ============== */
.wm-evolve-compare {
  display: flex;
  align-items: center;
  gap: 12px;
}
.evolve-old,
.evolve-new {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.evolve-label {
  font-size: 10px;
  opacity: 0.4;
  display: block;
  margin-bottom: 4px;
  color: var(--text-primary);
}
.evolve-words {
  font-size: 14px;
  color: var(--accent);
  letter-spacing: 2px;
}
.evolve-arrow {
  opacity: 0.3;
  font-size: 20px;
  color: var(--accent);
}

/* ============== 分析历史 ============== */
.hist-item {
  display: flex;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid rgba(var(--accent-rgb), 0.06);
  font-size: 12px;
}
.hist-date {
  opacity: 0.4;
  min-width: 40px;
  color: var(--text-primary);
}
.hist-top {
  flex: 1;
  color: var(--accent);
}
.hist-mood {
  opacity: 0.5;
  color: var(--text-primary);
}
.history-section h3 {
  font-size: 14px;
  opacity: 0.7;
  margin-bottom: 10px;
  color: var(--text-primary);
}

/* ============== 空状态 ============== */
.empty {
  text-align: center;
  padding: 60px 0;
  color: rgba(var(--accent-rgb), 0.2);
}
.empty span {
  font-size: 40px;
  display: block;
  margin-bottom: 8px;
}

/* ============== 词汇管理区域样式 ============== */
.wm-divider {
  margin: 28px 0 16px;
  text-align: center;
  border-top: 1px solid rgba(var(--accent-rgb), 0.12);
  padding-top: 20px;
}
.wm-divider h2 {
  font-size: 18px;
  font-weight: 500;
  opacity: 0.8;
  letter-spacing: 1px;
  color: var(--accent);
}
.wm-stale-toggle {
  display: inline-block;
  margin-top: 8px;
  padding: 4px 14px;
  border-radius: 20px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.5);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.wm-stale-toggle:hover {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.4);
}
.wm-stale-toggle.active {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.4);
  background: rgba(var(--accent-rgb), 0.08);
}

/* ============== F9 间隔重复 · 今日待复习 ============== */
.wm-review-section {
  margin-bottom: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.16);
}
.wm-review-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
}
.wm-review-title {
  font-size: 13px;
  color: var(--accent);
  letter-spacing: 0.5px;
}
.wm-review-title b {
  font-size: 15px;
}
.wm-review-body {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wm-review-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
}
.rr-word {
  font-size: 13px;
  color: var(--text);
  font-weight: 600;
  min-width: 56px;
}
.rr-def {
  flex: 1;
  font-size: 11px;
  color: rgba(var(--text-rgb), 0.55);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wm-review-btn {
  flex: none;
  font-size: 11px;
  padding: 4px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: transparent;
  color: var(--accent);
  font-family: inherit;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.wm-review-btn:hover {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.5);
}

/* ============== 统计概览 ============== */
.wm-stats-section {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  margin-bottom: 20px;
}
.wm-stat-item {
  flex: 1;
  text-align: center;
  padding: 10px 4px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.wm-stat-value {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.3;
}
.wm-stat-label {
  display: block;
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.6);
  margin-top: 2px;
  opacity: 0.7;
}

/* ============== 添加词汇表单 ============== */
.wm-add-section {
  margin-bottom: 16px;
}
.wm-add-row {
  display: flex;
  gap: 8px;
}
.wm-form-input {
  flex: 1;
  min-width: 80px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.wm-form-input:focus {
  border-color: rgba(var(--accent-rgb), 0.4);
}
.wm-form-input::placeholder {
  color: rgba(var(--accent-rgb), 0.3);
}

/* ============== 搜索和筛选 ============== */
.wm-search-section {
  margin-bottom: 16px;
}
.wm-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.wm-search-input {
  flex: 1;
  min-width: 140px;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.wm-search-input:focus {
  border-color: rgba(var(--accent-rgb), 0.4);
}
.wm-search-input::placeholder {
  color: rgba(var(--accent-rgb), 0.3);
}
.wm-filter-select {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}
.wm-filter-select:focus {
  border-color: rgba(var(--accent-rgb), 0.4);
}

/* ============== 词汇分组 ============== */
.wm-word-groups {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 24px;
}
.wm-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.wm-group-header:hover {
  background: var(--bg-card);
  border-color: rgba(var(--accent-rgb), 0.15);
}
.group-label {
  font-size: 14px;
  font-weight: 500;
  flex: 1;
  color: var(--text-primary);
}
.group-count {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
  min-width: 20px;
  text-align: center;
}
.group-toggle {
  font-size: 12px;
  opacity: 0.4;
  transition: transform 0.2s;
  color: var(--accent);
}
.group-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 0 4px 0;
}

/* ============== 词汇卡片 ============== */
.wm-word-card {
  position: relative;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: var(--card-bg);
  border-left: 3px solid var(--accent);
  transition: all 0.2s;
}
.wm-word-card:hover {
  border-color: rgba(var(--accent-rgb), 0.18);
  background: rgba(var(--bg-card-rgb), 0.55);
}
.wm-word-card--stale {
  opacity: 0.45;
  filter: grayscale(0.4);
  transition: opacity 0.25s, filter 0.25s, border-color 0.2s, background 0.2s;
}
.wm-word-card--stale:hover {
  opacity: 0.85;
  filter: grayscale(0);
}
.card-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}
.card-word {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}
.fav-badge {
  font-size: 11px;
  color: var(--accent);
}
.card-def {
  font-size: 12px;
  color: rgba(232, 221, 208, 0.5);
  line-height: 1.5;
  margin-bottom: 6px;
}
.card-bottom {
  display: flex;
  align-items: center;
  gap: 10px;
  justify-content: space-between;
}
.star-row {
  display: flex;
  gap: 1px;
  cursor: pointer;
  padding: 2px 0;
}
.star {
  font-size: 13px;
  color: rgba(var(--accent-rgb), 0.15);
  transition: color 0.15s;
}
.star.filled {
  color: var(--accent);
}
.star-row:hover .star {
  color: rgba(var(--accent-rgb), 0.4);
}
.star-row:hover .star.filled {
  color: #e8c39e;
}
.card-time {
  font-size: 10px;
  color: rgba(232, 221, 208, 0.3);
  opacity: 0.4;
  white-space: nowrap;
}
.wm-del-btn {
  position: absolute;
  top: 8px;
  right: 10px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--accent-rgb), 0.3);
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.wm-del-btn:hover {
  color: var(--danger);
  background: rgba(255, 107, 107, 0.15);
}
.wm-fav-btn {
  background: none;
  border: none;
  color: rgba(var(--accent-rgb), 0.25);
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  transition: all 0.2s;
}
.wm-fav-btn:hover {
  color: var(--accent);
}
.wm-fav-btn.active {
  color: var(--accent);
}
.empty-group {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.12);
  padding: 12px 0;
  text-align: center;
}

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* === Responsive === */
@media (max-width: 860px) {
  .wm { padding: 32px 20px 64px; }
  .wm-stats-section { gap: 8px; }
  .wm-word-groups { grid-template-columns: 1fr; }
}

@media (max-width: 640px) {
  .wm { padding: 24px 14px 56px; }
  .wm-stats-section { flex-direction: column; }
}

@media (max-width: 480px) {
  .wm { padding: 12px; }
  .wm-stats-section { flex-direction: column; gap: 6px; }
  .wm-stat-value { font-size: 16px; }
}

/* ============== Tab 导航 ============== */
.wm-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  padding: 4px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.wm-tab {
  flex: 1;
  padding: 8px 4px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: rgba(var(--accent-rgb), 0.45);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.wm-tab:hover {
  color: rgba(var(--accent-rgb), 0.7);
}
.wm-tab.active {
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  font-weight: 500;
}

/* ============== 联想网络 ============== */
.wm-assoc-input-row {
  display: flex;
  gap: 8px;
}
.wm-assoc-stats {
  display: flex;
  gap: 8px;
  justify-content: space-between;
}
.wm-assoc-nodes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.wm-assoc-node {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
}
.wm-assoc-node.node-seed {
  border-color: rgba(var(--accent-rgb), 0.35);
  font-size: 15px;
}
.wm-assoc-node.node-bridge {
  border-style: dashed;
}
.node-type {
  font-size: 9px;
  opacity: 0.5;
  font-weight: 400;
}
.wm-assoc-edges {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 300px;
  overflow-y: auto;
}
.wm-assoc-edge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--card-bg);
  font-size: 12px;
}
.edge-source, .edge-target {
  color: var(--accent);
  font-weight: 500;
}
.edge-arrow {
  opacity: 0.3;
  font-size: 12px;
}
.edge-relation {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.08);
}
.edge-strength {
  margin-left: auto;
  font-size: 10px;
  opacity: 0.5;
}
.wm-assoc-clusters {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wm-assoc-cluster {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.cluster-center {
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  display: block;
  margin-bottom: 2px;
}
.cluster-theme {
  font-size: 10px;
  opacity: 0.5;
  display: block;
  margin-bottom: 6px;
}
.cluster-members {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.cluster-member {
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.08);
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.7);
}

/* ============== 写作增强 ============== */
.wm-template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.wm-template-card {
  padding: 12px;
  border-radius: 10px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  cursor: pointer;
  transition: all 0.2s;
}
.wm-template-card:hover {
  border-color: rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--bg-card-rgb), 0.55);
}
.tpl-name {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
  margin-bottom: 4px;
}
.tpl-desc {
  display: block;
  font-size: 11px;
  opacity: 0.5;
  line-height: 1.4;
  margin-bottom: 6px;
}
.tpl-difficulty {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.4);
}
.tpl-detail-desc {
  font-size: 12px;
  opacity: 0.6;
  margin: 0 0 10px;
}
.tpl-structure {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 10px;
}
.tpl-struct-item {
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.08);
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.7);
}
.tpl-prompts {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tpl-prompt {
  font-size: 12px;
  opacity: 0.5;
  margin: 0;
  padding-left: 12px;
  border-left: 2px solid rgba(var(--accent-rgb), 0.2);
}
.wm-writing-score {
  display: flex;
  gap: 16px;
  align-items: flex-start;
  padding: 14px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.score-circle {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.1);
  border: 2px solid var(--accent);
  flex-shrink: 0;
}
.score-number {
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  line-height: 1;
}
.score-label {
  font-size: 9px;
  opacity: 0.5;
  margin-top: 2px;
}
.score-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.score-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.6);
}
.score-bar {
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: rgba(var(--accent-rgb), 0.1);
  overflow: hidden;
}
.score-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--accent);
  transition: width 0.4s ease;
}
.wm-suggestions {
  margin-top: 12px;
}
.wm-suggestions h4 {
  font-size: 13px;
  opacity: 0.7;
  margin-bottom: 8px;
}
.wm-suggestion {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  margin-bottom: 4px;
  font-size: 11px;
}
.wm-suggestion.sev-high {
  background: rgba(255, 107, 107, 0.1);
  border-left: 2px solid #ff6b6b;
}
.wm-suggestion.sev-medium {
  background: rgba(255, 193, 7, 0.08);
  border-left: 2px solid #ffc107;
}
.wm-suggestion.sev-low {
  background: rgba(100, 180, 255, 0.08);
  border-left: 2px solid #64b4ff;
}
.sug-type {
  font-weight: 500;
  color: var(--accent);
  white-space: nowrap;
}
.sug-msg {
  opacity: 0.7;
}

/* ============== 词汇画像 ============== */
.wm-profile-section {
  margin-bottom: 20px;
}
.wm-profile-grid {
  display: flex;
  gap: 8px;
  justify-content: space-between;
  margin-bottom: 10px;
}
.wm-profile-item {
  flex: 1;
  text-align: center;
  padding: 8px 4px;
  border-radius: 8px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.profile-label {
  display: block;
  font-size: 10px;
  opacity: 0.5;
  margin-bottom: 2px;
}
.profile-value {
  display: block;
  font-size: 16px;
  font-weight: 600;
  color: var(--accent);
}
.wm-profile-tags {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.profile-tag-label {
  font-size: 10px;
  opacity: 0.4;
}
.profile-tag {
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 10px;
}
.tag-strength {
  background: rgba(52, 211, 153, 0.12);
  color: #34d399;
}
.tag-weakness {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}
</style>