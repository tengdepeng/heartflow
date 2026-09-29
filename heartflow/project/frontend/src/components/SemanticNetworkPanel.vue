<template>
  <section class="snp">
    <div class="snp-head">
      <div class="snp-title-wrap">
        <span class="snp-title">🕸 语义网络</span>
        <span class="snp-sub">看见词与词之间看不见的连线</span>
      </div>
      <span v-if="savedNetworks.length" class="snp-saved">已存 {{ savedNetworks.length }} 个网络</span>
    </div>

    <!-- 中心词输入 -->
    <div class="snp-search">
      <input
        v-model="centerWord"
        class="snp-input"
        type="text"
        placeholder="输入中心词，构建语义网络…"
        list="snp-suggest"
        @keyup.enter="build"
      />
      <datalist id="snp-suggest">
        <option v-for="w in suggestPool" :key="w" :value="w">{{ w }}</option>
      </datalist>
      <button class="snp-go" :disabled="!centerWord" @click="build">构建</button>
    </div>

    <!-- 空态 -->
    <div v-if="!network" class="snp-empty">
      <span class="snp-empty-icon">🕸</span>
      <p>输入一个词，生成它的近义、反义、搭配与相关词网络</p>
    </div>

    <template v-else>
      <!-- 关系图 -->
      <div class="snp-graph-wrap">
        <svg class="snp-graph" :viewBox="graphViewBox" role="img" :aria-label="`${network.center} 的语义网络图`">
          <!-- 连线 -->
          <g v-for="(e, i) in network.edges" :key="i">
            <line
              :x1="nodePos(network.center).x"
              :y1="nodePos(network.center).y"
              :x2="nodePos(e.target).x"
              :y2="nodePos(e.target).y"
              :stroke="relationColor(e.relationType)"
              :stroke-opacity="0.25 + e.strength * 0.5"
              stroke-width="1.2"
            />
            <text
              :x="(nodePos(network.center).x + nodePos(e.target).x) / 2"
              :y="(nodePos(network.center).y + nodePos(e.target).y) / 2 - 4"
              class="snp-edge-label"
              :fill="relationColor(e.relationType)"
            >{{ relationIcon(e.relationType) }}</text>
          </g>
          <!-- 中心节点 -->
          <g>
            <circle :cx="nodePos(network.center).x" :cy="nodePos(network.center).y" r="26" fill="rgba(240,192,64,0.16)" stroke="#f0c040" stroke-width="1.5" />
            <text :x="nodePos(network.center).x" :y="nodePos(network.center).y + 5" text-anchor="middle" class="snp-node-text snp-node-center">{{ network.center }}</text>
          </g>
          <!-- 外围节点 -->
          <g v-for="n in outerNodes" :key="n">
            <circle :cx="nodePos(n).x" :cy="nodePos(n).y" r="20" fill="rgba(138,154,122,0.14)" stroke="rgba(138,154,122,0.5)" stroke-width="1" />
            <text :x="nodePos(n).x" :y="nodePos(n).y + 4" text-anchor="middle" class="snp-node-text">{{ n }}</text>
          </g>
        </svg>
      </div>

      <!-- 图例 -->
      <div class="snp-legend">
        <span v-for="(meta, type) in usedRelations" :key="type" class="snp-legend-item">
          <i :style="{ background: meta.color }"></i>{{ meta.icon }} {{ meta.label }}
        </span>
      </div>

      <!-- 关系列表 -->
      <div v-if="network.edges.length" class="snp-block">
        <span class="snp-block-label">关系明细</span>
        <div class="snp-edges">
          <div v-for="(e, i) in network.edges" :key="i" class="snp-edge">
            <span class="snp-edge-src">{{ e.source }}</span>
            <span class="snp-edge-rel" :style="{ color: relationColor(e.relationType) }">
              {{ relationIcon(e.relationType) }} {{ relationLabel(e.relationType) }}
            </span>
            <span class="snp-edge-tgt">{{ e.target }}</span>
            <span class="snp-edge-strength">{{ Math.round(e.strength * 100) }}%</span>
          </div>
        </div>
      </div>

      <!-- 关联推荐 -->
      <div v-if="suggestions.length" class="snp-block">
        <span class="snp-block-label">关联推荐</span>
        <div class="snp-sugg">
          <div v-for="s in suggestions" :key="s.word" class="snp-sugg-item">
            <b>{{ s.word }}</b>
            <span class="snp-sugg-rel" :style="{ color: relationColor(s.relation) }">{{ relationLabel(s.relation) }}</span>
            <span class="snp-sugg-reason">{{ s.reason }}</span>
          </div>
        </div>
      </div>

      <!-- 保存 -->
      <button class="snp-save" @click="save">保存此网络</button>
    </template>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSemanticNetwork } from '../modules/word-mirror/semantic-network'
import { SEMANTIC_RELATION_META } from '../modules/word-mirror/types'
import type { SemanticNetwork, SemanticRelation } from '../modules/word-mirror/types'
import type { WordItem } from '../modules/word-mirror/word-mirror-store'

const props = defineProps<{ words: WordItem[] }>()

const sn = useSemanticNetwork()

const centerWord = ref('')
const network = ref<SemanticNetwork | null>(null)

const savedNetworks = computed(() => sn.networks.value)
const suggestPool = computed(() => {
  const pool = new Set<string>(['思考', '学习', '工作', '休息', '情绪', '记忆', '创造', '成长', '宁静', '自由', '温暖', '勇气', '智慧', '时间', '知识', '习惯', '关系', '身体', '心灵', '光明', '快乐', '开始', '前进', '丰富'])
  props.words.forEach(w => pool.add(w.word))
  return Array.from(pool).slice(0, 30)
})

const outerNodes = computed(() => (network.value ? network.value.nodes.filter(n => n !== network.value!.center) : []))

const usedRelations = computed(() => {
  const used: Record<string, { label: string; color: string; icon: string }> = {}
  network.value?.edges.forEach(e => {
    if (!used[e.relationType]) used[e.relationType] = SEMANTIC_RELATION_META[e.relationType]
  })
  return used
})

const suggestions = computed(() => {
  if (!network.value) return []
  return sn.suggestRelatedWords(network.value.center, toEntries())
})

const GRAPH_W = 360
const GRAPH_H = 300
const graphViewBox = computed(() => `0 0 ${GRAPH_W} ${GRAPH_H}`)

function nodePos(word: string) {
  if (!network.value) return { x: GRAPH_W / 2, y: GRAPH_H / 2 }
  const idx = network.value.nodes.indexOf(word)
  const total = network.value.nodes.length
  if (idx < 0 || total <= 1) return { x: GRAPH_W / 2, y: GRAPH_H / 2 }
  const angle = (idx / total) * Math.PI * 2 - Math.PI / 2
  const rx = GRAPH_W / 2 - 46
  const ry = GRAPH_H / 2 - 40
  return {
    x: GRAPH_W / 2 + Math.cos(angle) * rx,
    y: GRAPH_H / 2 + Math.sin(angle) * ry,
  }
}

function relationMeta(r: SemanticRelation) {
  return SEMANTIC_RELATION_META[r] ?? { label: r, color: '#94a3b8', icon: '~' }
}
function relationColor(r: SemanticRelation) {
  return relationMeta(r).color
}
function relationIcon(r: SemanticRelation) {
  return relationMeta(r).icon
}
function relationLabel(r: SemanticRelation) {
  return relationMeta(r).label
}

function toEntries() {
  return props.words.map(w => ({
    id: w.id,
    word: w.word,
    definition: w.definition,
    proficiency: Math.min(Math.max(w.proficiency, 1), 5) as 1 | 2 | 3 | 4 | 5,
    favorite: w.favorite,
    tags: [] as string[],
    createdAt: w.createdAt,
    lastReviewedAt: w.lastReviewedAt,
    reviewCount: 0,
  }))
}

function build() {
  const word = centerWord.value.trim()
  if (!word) return
  network.value = sn.buildNetwork(word, toEntries())
}

function save() {
  if (network.value) sn.saveNetwork(network.value)
}
</script>

<style scoped>
.snp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.snp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.snp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.snp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.snp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.snp-saved { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: rgba(var(--accent-rgb), 0.75); white-space: nowrap; }

.snp-search { display: flex; gap: 8px; margin-bottom: 12px; }
.snp-input { flex: 1; padding: 9px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-high, rgba(232, 224, 216, 0.88)); font-size: 13px; font-family: inherit; outline: none; transition: border-color 0.2s; }
.snp-input:focus { border-color: rgba(var(--accent-rgb), 0.4); }
.snp-input::placeholder { color: rgba(232, 221, 208, 0.35); }
.snp-go { padding: 9px 18px; border-radius: 10px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d4a574); font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.snp-go:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.5); }
.snp-go:disabled { opacity: 0.35; cursor: not-allowed; }

.snp-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 28px 0; text-align: center; }
.snp-empty-icon { font-size: 30px; opacity: 0.5; }
.snp-empty p { font-size: 12px; color: rgba(232, 221, 208, 0.5); margin: 0; }

.snp-graph-wrap { padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); margin-bottom: 10px; }
.snp-graph { width: 100%; height: auto; display: block; }
.snp-node-text { font-size: 11px; fill: #e8ddd0; font-family: inherit; }
.snp-node-center { font-size: 14px; font-weight: 600; fill: #f0c040; }
.snp-edge-label { font-size: 10px; text-anchor: middle; }

.snp-legend { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 12px; }
.snp-legend-item { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: rgba(232, 221, 208, 0.5); }
.snp-legend-item i { width: 8px; height: 8px; border-radius: 2px; }

.snp-block { display: flex; flex-direction: column; gap: 8px; margin-bottom: 14px; padding-top: 12px; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); }
.snp-block-label { font-size: 10px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.5); }

.snp-edges { display: flex; flex-direction: column; gap: 5px; }
.snp-edge { display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 8px; background: rgba(255,255,255,0.02); font-size: 12px; }
.snp-edge-src { color: var(--text-high, rgba(232, 224, 216, 0.88)); flex-shrink: 0; }
.snp-edge-rel { font-size: 11px; flex-shrink: 0; }
.snp-edge-tgt { color: rgba(232, 221, 208, 0.75); flex-shrink: 0; }
.snp-edge-strength { margin-left: auto; font-size: 10px; color: rgba(232, 221, 208, 0.4); font-variant-numeric: tabular-nums; }

.snp-sugg { display: flex; flex-direction: column; gap: 6px; }
.snp-sugg-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; background: rgba(255,255,255,0.02); }
.snp-sugg-item b { font-size: 13px; color: var(--text-high, rgba(232, 224, 216, 0.88)); flex-shrink: 0; }
.snp-sugg-rel { font-size: 11px; flex-shrink: 0; }
.snp-sugg-reason { font-size: 11px; color: rgba(232, 221, 208, 0.5); }

.snp-save { width: 100%; padding: 9px; border-radius: 10px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d4a574); font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.snp-save:hover { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.5); }

@media (max-width: 640px) {
  .snp { padding: 14px 14px; }
}
</style>