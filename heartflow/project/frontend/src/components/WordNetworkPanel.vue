<template>
  <section class="wnp" aria-label="词源与语义网络">
    <div class="wnp-head">
      <span class="wnp-title">🌐 词源与语义网络</span>
      <span class="wnp-sub">词源追溯 · 同根发现 · 语义关联</span>
    </div>

    <!-- 统计 -->
    <div class="wnp-stats">
      <div class="wnp-stat">
        <span class="wnp-stat-value">{{ dictionarySize }}</span>
        <span class="wnp-stat-label">词典规模</span>
      </div>
      <div class="wnp-stat">
        <span class="wnp-stat-value">{{ languageCount }}</span>
        <span class="wnp-stat-label">语言覆盖</span>
      </div>
      <div class="wnp-stat">
        <span class="wnp-stat-value">{{ networks.length }}</span>
        <span class="wnp-stat-label">已存网络</span>
      </div>
    </div>

    <!-- 词源查询 -->
    <div class="wnp-block">
      <div class="wnp-block-title">🔍 词源查询</div>
      <div class="wnp-row">
        <input v-model="queryWord" class="wnp-input" placeholder="输入一个字或词，如「心」" @keyup.enter="lookup" />
        <button class="wnp-btn wnp-btn--primary" :disabled="!queryWord.trim()" @click="lookup">查询</button>
      </div>
      <div v-if="etymologyResult" class="wnp-etymology">
        <div class="wnp-etymology-word">{{ etymologyResult.word }}</div>
        <div class="wnp-etymology-origin">{{ etymologyResult.origin }}</div>
        <div class="wnp-etymology-meta">语言 · {{ etymologyResult.language }}</div>
        <div v-if="etymologyResult.cognates.length" class="wnp-tags">
          <span class="wnp-tag">同源 · {{ etymologyResult.cognates.join('、') }}</span>
        </div>
        <div v-if="etymologyResult.components.length" class="wnp-tags">
          <span class="wnp-tag">构词 · {{ etymologyResult.components.join(' · ') }}</span>
        </div>
        <div v-if="rootRelatives.length" class="wnp-relatives">
          <span class="wnp-relatives-label">同根词</span>
          <div class="wnp-chips">
            <span v-for="r in rootRelatives" :key="r.word" class="wnp-chip">{{ r.word }}</span>
          </div>
        </div>
      </div>
      <div v-else-if="lookedUp" class="wnp-empty">未找到该词的词源。</div>
    </div>

    <!-- 词源搜索 -->
    <div class="wnp-block">
      <div class="wnp-block-title">🔎 词源搜索</div>
      <input v-model="searchQuery" class="wnp-input" placeholder="按字 / 词源 / 同源词 / 构词搜索" />
      <div v-if="searchResults.length" class="wnp-search-list">
        <div v-for="e in searchResults" :key="e.word" class="wnp-search-item">
          <span class="wnp-search-word">{{ e.word }}</span>
          <span class="wnp-search-origin">{{ e.origin }}</span>
        </div>
      </div>
      <div v-else-if="searchQuery" class="wnp-empty">无匹配结果。</div>
    </div>

    <!-- 词源建议 -->
    <div v-if="suggestions.length" class="wnp-block">
      <div class="wnp-block-title">💡 词源建议</div>
      <div v-for="s in suggestions" :key="s.word" class="wnp-suggestion">
        <span class="wnp-suggestion-word">{{ s.word }}</span>
        <span class="wnp-suggestion-origin">{{ s.suggestion.origin }}</span>
      </div>
    </div>

    <!-- 添加词源 -->
    <div class="wnp-block">
      <div class="wnp-block-title">➕ 添加词源</div>
      <div class="wnp-row">
        <input v-model="formWord" class="wnp-input" placeholder="字 / 词" />
        <input v-model="formOrigin" class="wnp-input" placeholder="词源解释" />
      </div>
      <div class="wnp-row">
        <input v-model="formLanguage" class="wnp-input" placeholder="语言（如 说文）" />
        <input v-model="formCognates" class="wnp-input" placeholder="同源词（逗号分隔）" />
      </div>
      <div class="wnp-row">
        <input v-model="formComponents" class="wnp-input" placeholder="构词（逗号分隔）" />
        <button class="wnp-btn wnp-btn--primary" :disabled="!canAdd" @click="addCustom">添加</button>
      </div>
    </div>

    <!-- 语义网络 -->
    <div class="wnp-block">
      <div class="wnp-block-title">🕸️ 语义网络</div>
      <div class="wnp-row">
        <input v-model="centerWord" class="wnp-input" placeholder="输入中心词，如「思考」" @keyup.enter="build" />
        <button class="wnp-btn wnp-btn--primary" :disabled="!centerWord.trim()" @click="build">构建</button>
      </div>
      <div v-if="builtNetwork" class="wnp-network">
        <div class="wnp-network-nodes">
          <span v-for="n in builtNetwork.nodes" :key="n" class="wnp-node">{{ n }}</span>
        </div>
        <div class="wnp-network-edges">
          <div v-for="(e, i) in builtNetwork.edges" :key="i" class="wnp-edge">{{ describeRelation(e) }}</div>
        </div>
        <button class="wnp-btn" @click="saveBuilt">保存网络</button>
      </div>
    </div>

    <!-- 关联推荐 -->
    <div class="wnp-block">
      <div class="wnp-block-title">🧩 关联推荐</div>
      <div class="wnp-row">
        <input v-model="relWord" class="wnp-input" placeholder="输入词汇，如「专注」" @keyup.enter="suggest" />
        <button class="wnp-btn wnp-btn--primary" :disabled="!relWord.trim()" @click="suggest">推荐</button>
      </div>
      <div v-if="relatedSuggestions.length" class="wnp-suggest-list">
        <div v-for="(s, i) in relatedSuggestions" :key="i" class="wnp-suggest-item">
          <span class="wnp-suggest-word">{{ s.word }}</span>
          <span class="wnp-suggest-rel">{{ relationLabel(s.relation) }}</span>
          <span class="wnp-suggest-reason">{{ s.reason }}</span>
        </div>
      </div>
    </div>

    <!-- 已保存网络 -->
    <div v-if="networks.length" class="wnp-block">
      <div class="wnp-block-title">📚 已保存网络</div>
      <div v-for="n in networks" :key="n.center" class="wnp-saved">
        <span class="wnp-saved-center">{{ n.center }}</span>
        <span class="wnp-saved-meta">{{ n.nodes.length }} 节点 · {{ n.edges.length }} 边</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEtymologyNetwork } from '../modules/word-mirror/etymology'
import { useSemanticNetwork } from '../modules/word-mirror/semantic-network'
import { SEMANTIC_RELATION_META } from '../modules/word-mirror/types'
import type { WordEntry, EtymologyNode, SemanticNetwork, SemanticRelation } from '../modules/word-mirror/types'

const props = defineProps<{
  words?: WordEntry[]
}>()

const {
  getEtymology,
  getRootRelatives,
  addEtymology,
  suggestEtymologies,
  getDictionarySize,
  getEtymologiesByLanguage,
  searchEtymologies,
} = useEtymologyNetwork()

const {
  networks,
  buildNetwork,
  describeRelation,
  suggestRelatedWords,
  saveNetwork,
} = useSemanticNetwork()

const wordPool = computed<WordEntry[]>(() => props.words ?? [])

// ---- 统计 ----
const dictionarySize = computed(() => getDictionarySize())
const languageCount = computed(() => Object.keys(getEtymologiesByLanguage()).length)

// ---- 词源查询 ----
const queryWord = ref('')
const etymologyResult = ref<EtymologyNode | null>(null)
const lookedUp = ref(false)
const rootRelatives = ref<EtymologyNode[]>([])

function lookup() {
  const q = queryWord.value.trim()
  if (!q) return
  etymologyResult.value = getEtymology(q)
  rootRelatives.value = getRootRelatives(q)
  lookedUp.value = true
}

// ---- 词源搜索 ----
const searchQuery = ref('')
const searchResults = computed(() => (searchQuery.value.trim() ? searchEtymologies(searchQuery.value.trim()) : []))

// ---- 词源建议 ----
const suggestions = computed(() => suggestEtymologies(wordPool.value))

// ---- 添加词源 ----
const formWord = ref('')
const formOrigin = ref('')
const formLanguage = ref('')
const formCognates = ref('')
const formComponents = ref('')
const canAdd = computed(() => Boolean(formWord.value.trim() && formOrigin.value.trim()))
function addCustom() {
  if (!canAdd.value) return
  addEtymology({
    word: formWord.value.trim(),
    origin: formOrigin.value.trim(),
    language: formLanguage.value.trim() || '未知',
    cognates: formCognates.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
    components: formComponents.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean),
  })
  formWord.value = ''
  formOrigin.value = ''
  formLanguage.value = ''
  formCognates.value = ''
  formComponents.value = ''
}

// ---- 语义网络 ----
const centerWord = ref('')
const builtNetwork = ref<SemanticNetwork | null>(null)
function build() {
  const c = centerWord.value.trim()
  if (!c) return
  builtNetwork.value = buildNetwork(c, wordPool.value)
}
function saveBuilt() {
  if (builtNetwork.value) saveNetwork(builtNetwork.value)
}

// ---- 关联推荐 ----
const relWord = ref('')
const relatedSuggestions = ref<{ word: string; relation: SemanticRelation; reason: string }[]>([])
function suggest() {
  const w = relWord.value.trim()
  if (!w) return
  relatedSuggestions.value = suggestRelatedWords(w, wordPool.value)
}
function relationLabel(r: SemanticRelation): string {
  return SEMANTIC_RELATION_META[r]?.label ?? r
}
</script>

<style scoped>
.wnp {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  background: var(--panel-bg, rgba(255, 255, 255, 0.03));
}
.wnp-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.wnp-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.wnp-sub {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.wnp-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.wnp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.06));
}
.wnp-stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #f0c040;
}
.wnp-stat-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.5));
}
.wnp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(138, 154, 122, 0.06);
  border: 1px solid rgba(138, 154, 122, 0.16);
}
.wnp-block-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.wnp-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  align-items: center;
}
.wnp-input {
  flex: 1;
  min-width: 120px;
  padding: 6px 10px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-primary, #e8e6e1);
  font-size: 12px;
  outline: none;
}
.wnp-input::placeholder {
  color: var(--text-secondary, rgba(232, 230, 225, 0.4));
}
.wnp-btn {
  padding: 6px 14px;
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.wnp-btn:hover:not(:disabled) {
  border-color: #f0c040;
  color: #f0c040;
}
.wnp-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.wnp-btn--primary {
  border-color: #f0c040;
  color: #f0c040;
}
.wnp-etymology {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.08));
}
.wnp-etymology-word {
  font-size: 18px;
  font-weight: 700;
  color: #f0c040;
}
.wnp-etymology-origin {
  font-size: 13px;
  color: var(--text-primary, #e8e6e1);
}
.wnp-etymology-meta {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.wnp-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.wnp-tag {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.8));
  background: rgba(138, 154, 122, 0.12);
  border: 1px solid rgba(138, 154, 122, 0.25);
}
.wnp-relatives {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wnp-relatives-label {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.wnp-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.wnp-chip {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
  color: #8a9a7a;
  background: rgba(138, 154, 122, 0.1);
  border: 1px solid rgba(138, 154, 122, 0.3);
}
.wnp-search-list,
.wnp-suggest-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wnp-search-item,
.wnp-suggestion,
.wnp-suggest-item {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.07));
}
.wnp-search-word,
.wnp-suggestion-word,
.wnp-suggest-word {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.wnp-search-origin,
.wnp-suggestion-origin {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.wnp-suggest-rel {
  padding: 1px 8px;
  border-radius: 10px;
  font-size: 11px;
  color: #8a9a7a;
  background: rgba(138, 154, 122, 0.1);
}
.wnp-suggest-reason {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.5));
}
.wnp-network {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.wnp-network-nodes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.wnp-node {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  color: #6b9fc4;
  background: rgba(107, 159, 196, 0.1);
  border: 1px solid rgba(107, 159, 196, 0.3);
}
.wnp-network-edges {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.wnp-edge {
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.7));
}
.wnp-saved {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--border-color, rgba(255, 255, 255, 0.07));
}
.wnp-saved-center {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary, #e8e6e1);
}
.wnp-saved-meta {
  margin-left: auto;
  font-size: 11px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.6));
}
.wnp-empty {
  font-size: 12px;
  color: var(--text-secondary, rgba(232, 230, 225, 0.5));
}
</style>
