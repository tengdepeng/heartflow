<template>
  <section class="tls-panel" aria-label="时光检索" data-test="timeline-search">
    <header class="tls-head">
      <span class="tls-title">🔎 时光检索</span>
      <span class="tls-sub">高级搜索 · 搜索历史 · 保存的搜索</span>
    </header>

    <!-- 搜索框 + 选项 -->
    <div class="tls-block">
      <div class="tls-row">
        <input
          v-model="query"
          class="tls-input"
          placeholder="检索结晶、笔记、情绪、专注…"
          data-test="tls-input"
          @keyup.enter="runSearch"
        />
        <button class="tls-btn tls-btn-primary" :disabled="!query.trim()" data-test="tls-run" @click="runSearch">搜索</button>
      </div>

      <div class="tls-field-row">
        <span class="tls-opt-label">范围</span>
        <button
          v-for="f in FIELD_DEFS"
          :key="f.key"
          :class="['tls-chip', { active: opts.fields.includes(f.key) }]"
          :data-test="`tls-field-${f.key}`"
          @click="toggleField(f.key)"
        >{{ f.label }}</button>
      </div>

      <div class="tls-field-row">
        <span class="tls-opt-label">方式</span>
        <button :class="['tls-chip', { active: opts.fuzzy }]" data-test="tls-opt-fuzzy" @click="opts.fuzzy = !opts.fuzzy">模糊</button>
        <button :class="['tls-chip', { active: opts.regex }]" data-test="tls-opt-regex" @click="opts.regex = !opts.regex">正则</button>
        <button :class="['tls-chip', { active: opts.caseSensitive }]" @click="opts.caseSensitive = !opts.caseSensitive">区分大小写</button>
        <button :class="['tls-chip', { active: opts.splitQuery }]" @click="opts.splitQuery = !opts.splitQuery">拆分多词</button>
        <button
          v-for="m in BOOLEAN_MODES"
          :key="m.key"
          :class="['tls-chip', { active: opts.booleanMode === m.key }]"
          @click="opts.booleanMode = m.key"
        >{{ m.label }}</button>
      </div>

      <div class="tls-field-row">
        <span class="tls-opt-label">模糊阈值</span>
        <input v-model.number="opts.fuzzyThreshold" class="tls-range" type="range" min="0" max="1" step="0.05" />
        <span class="tls-num">{{ opts.fuzzyThreshold.toFixed(2) }}</span>
        <span class="tls-opt-label">最小分</span>
        <input v-model.number="opts.minScore" class="tls-range" type="range" min="0" max="100" step="5" />
        <span class="tls-num">{{ opts.minScore }}</span>
      </div>

      <div class="tls-row">
        <input v-model="saveName" class="tls-input tls-input-sm" placeholder="给这次搜索起个名字（可留空）" data-test="tls-save-name" />
        <button class="tls-btn" :disabled="!query.trim()" data-test="tls-save" @click="saveCurrent">保存搜索</button>
      </div>
    </div>

    <!-- 命中结果 -->
    <div class="tls-block">
      <span class="tls-block-label">
        命中（{{ hits.length }}）<span v-if="searched">· 「{{ lastQuery }}」</span>
      </span>
      <div v-if="hits.length" class="tls-hits">
        <div v-for="h in hitRows" :key="h.key" class="tls-hit" data-test="tls-hit">
          <div class="tls-hit-head">
            <span class="tls-hit-type">{{ h.typeLabel }}</span>
            <span class="tls-hit-score">{{ h.score }} 分</span>
          </div>
          <p class="tls-hit-title">{{ h.title }}</p>
          <div class="tls-hit-meta">
            <span>{{ h.date }}</span>
            <span v-if="h.matchedFields.length">命中：{{ h.matchedFields.join('、') }}</span>
          </div>
        </div>
      </div>
      <EmptyState
        v-else-if="searched"
        icon="◌"
        title="没有命中任何记录"
        hint="换个说法，或调低模糊阈值与最小分"
        :cta-label="''"
        :glow="false"
        data-test="tls-hits-empty"
      />
      <EmptyState
        v-else
        icon="🔎"
        title="还没有开始检索"
        hint="输入关键词后回车，检索会同时记入搜索历史"
        :cta-label="''"
        :glow="false"
        data-test="tls-hits-idle"
      />
    </div>

    <!-- 搜索历史 -->
    <div class="tls-block">
      <div class="tls-block-head">
        <span class="tls-block-label">搜索历史（{{ history.length }} / 50）</span>
        <button v-if="history.length" class="tls-btn tls-btn-ghost" data-test="tls-history-clear" @click="clearHistory">清空</button>
      </div>
      <div v-if="history.length" class="tls-list">
        <div v-for="e in history" :key="e.id" class="tls-item" data-test="tls-history-item">
          <button class="tls-item-main" @click="applyHistory(e)">
            <span class="tls-item-text">{{ e.query }}</span>
            <span class="tls-item-meta">{{ e.hitCount }} 命中 · {{ formatTime(e.timestamp) }}</span>
          </button>
          <button class="tls-item-x" aria-label="删除这条历史" data-test="tls-history-remove" @click="removeHistory(e.id)">×</button>
        </div>
      </div>
      <EmptyState
        v-else
        icon="🕘"
        title="还没有搜索历史"
        hint="检索过的关键词会按时间倒序留在这里，最多保留 50 条"
        :cta-label="''"
        :glow="false"
        data-test="tls-history-empty"
      />
    </div>

    <!-- 保存的搜索 -->
    <div class="tls-block">
      <span class="tls-block-label">保存的搜索（{{ savedList.length }}）</span>
      <div v-if="savedList.length" class="tls-list">
        <div v-for="s in savedList" :key="s.id" class="tls-item" data-test="tls-saved-item">
          <button class="tls-item-main" @click="applySaved(s)">
            <span class="tls-item-text">{{ s.name }}</span>
            <span class="tls-item-meta">{{ s.query }} · 上次 {{ s.lastHitCount }} 命中</span>
          </button>
          <button class="tls-item-x" aria-label="删除这条保存的搜索" data-test="tls-saved-remove" @click="removeSaved(s.id)">×</button>
        </div>
      </div>
      <EmptyState
        v-else
        icon="🔖"
        title="还没有保存任何搜索"
        hint="填好条件后点「保存搜索」，下次一键回到这个视图"
        :cta-label="''"
        :glow="false"
        data-test="tls-saved-empty"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import EmptyState from './EmptyState.vue'
import { useTimelineBridge } from '../modules/timeline/timeline-bridge'
import { searchHistoryManager, savedSearchManager } from '../modules/timeline/timeline-search-store'
import type { AdvancedSearchOptions, SavedSearch, SearchHistoryEntry, SearchHit } from '../modules/timeline'
import type { RiverItem, RiverItemType } from '../modules/timeline/river'

type SearchField = AdvancedSearchOptions['fields'][number]

const FIELD_DEFS: { key: SearchField; label: string }[] = [
  { key: 'title', label: '标题' },
  { key: 'content', label: '内容' },
  { key: 'tags', label: '标签' },
]

const BOOLEAN_MODES: { key: AdvancedSearchOptions['booleanMode']; label: string }[] = [
  { key: 'or', label: '任一' },
  { key: 'and', label: '全部' },
]

const TYPE_LABELS: Partial<Record<RiverItemType, string>> = {
  crystal: '💎 结晶', note: '📝 笔记', emotion: '🌷 情绪', session: '⏱ 专注', anchor: '⚓ 心锚',
  body: '🌿 身体', habit: '🎯 习惯', movement: '🏃 运动', rest: '🍃 休息', dialogue: '💬 对话', photo: '📷 照片',
}

const bridge = useTimelineBridge()

const query = ref('')
const saveName = ref('')
const hits = ref<SearchHit[]>([])
const searched = ref(false)
const lastQuery = ref('')
const history = ref<SearchHistoryEntry[]>([])
const savedList = ref<SavedSearch[]>([])

const opts = ref({
  fields: ['title', 'content', 'tags'] as SearchField[],
  caseSensitive: false,
  fuzzy: false,
  fuzzyThreshold: 0.6,
  regex: false,
  booleanMode: 'or' as AdvancedSearchOptions['booleanMode'],
  splitQuery: true,
  minScore: 0,
})

function reload(): void {
  history.value = searchHistoryManager.load()
  savedList.value = savedSearchManager.getAll()
}

onMounted(() => {
  bridge.refreshSource()
  reload()
})

function toggleField(f: SearchField): void {
  const idx = opts.value.fields.indexOf(f)
  if (idx >= 0) {
    // 至少留一个范围，全空会让 advancedSearch 恒不命中
    if (opts.value.fields.length > 1) opts.value.fields.splice(idx, 1)
  } else {
    opts.value.fields.push(f)
  }
}

function buildOptions(): Partial<AdvancedSearchOptions> {
  return {
    query: query.value.trim(),
    fields: [...opts.value.fields],
    caseSensitive: opts.value.caseSensitive,
    fuzzy: opts.value.fuzzy,
    fuzzyThreshold: opts.value.fuzzyThreshold,
    regex: opts.value.regex,
    booleanMode: opts.value.booleanMode,
    splitQuery: opts.value.splitQuery,
    minScore: opts.value.minScore,
  }
}

function applyOptions(o: Partial<AdvancedSearchOptions>): void {
  query.value = o.query ?? ''
  if (o.fields && o.fields.length > 0) opts.value.fields = [...o.fields]
  if (typeof o.caseSensitive === 'boolean') opts.value.caseSensitive = o.caseSensitive
  if (typeof o.fuzzy === 'boolean') opts.value.fuzzy = o.fuzzy
  if (typeof o.fuzzyThreshold === 'number') opts.value.fuzzyThreshold = o.fuzzyThreshold
  if (typeof o.regex === 'boolean') opts.value.regex = o.regex
  if (o.booleanMode) opts.value.booleanMode = o.booleanMode
  if (typeof o.splitQuery === 'boolean') opts.value.splitQuery = o.splitQuery
  if (typeof o.minScore === 'number') opts.value.minScore = o.minScore
}

function runSearch(): void {
  const options = buildOptions()
  if (!options.query) return
  const result = bridge.advancedSearchItems(options)
  hits.value = result
  searched.value = true
  lastQuery.value = options.query
  searchHistoryManager.addEntry({ query: options.query, options, hitCount: result.length })
  reload()
}

function applyHistory(entry: SearchHistoryEntry): void {
  applyOptions({ query: entry.query, ...entry.options })
  runSearch()
}

function removeHistory(id: string): void {
  searchHistoryManager.remove(id)
  reload()
}

function clearHistory(): void {
  searchHistoryManager.clear()
  reload()
}

function saveCurrent(): void {
  const options = buildOptions()
  if (!options.query) return
  savedSearchManager.add({ name: saveName.value.trim() || options.query, query: options.query, options })
  saveName.value = ''
  reload()
}

function applySaved(saved: SavedSearch): void {
  applyOptions({ query: saved.query, ...saved.options })
  const options = buildOptions()
  if (!options.query) return
  const result = bridge.advancedSearchItems(options)
  hits.value = result
  searched.value = true
  lastQuery.value = options.query
  savedSearchManager.update(saved.id, { lastHitCount: result.length })
  searchHistoryManager.addEntry({ query: options.query, options, hitCount: result.length })
  reload()
}

function removeSaved(id: string): void {
  savedSearchManager.remove(id)
  reload()
}

function itemTitle(item: RiverItem): string {
  if (item.note) return item.note.title || '笔记'
  if (item.session) return item.session.note || `专注 ${Math.round((item.session.elapsed || 0) / 60000)} 分钟`
  if (item.crystal) return item.crystal.insight || '结晶'
  if (item.anchor) return item.anchor.text || '心锚'
  if (item.emotion) return item.emotion.note || '情绪'
  if (item.dialogue) return '对话'
  if (item.photo) return '照片'
  return TYPE_LABELS[item.type] ?? item.type
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const hitRows = computed(() =>
  hits.value.map((h) => ({
    key: `${h.item.type}:${h.item.id}`,
    typeLabel: TYPE_LABELS[h.item.type] ?? h.item.type,
    title: itemTitle(h.item),
    score: h.score,
    matchedFields: h.matchedFields,
    date: formatTime(new Date(h.item.ts).toISOString()),
  })),
)
</script>

<style scoped>
.tls-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  color: #d9decf;
  height: 100%;
  overflow-y: auto;
}
.tls-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.tls-title {
  font-size: 15px;
  font-weight: 600;
}
.tls-sub {
  font-size: 11px;
  color: rgba(217, 222, 207, 0.5);
}
.tls-block {
  padding: 10px 12px;
  margin-bottom: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(139, 155, 122, 0.14);
}
.tls-block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.tls-block-label {
  display: block;
  font-size: 12px;
  color: rgba(217, 222, 207, 0.6);
  margin-bottom: 8px;
}
.tls-block-head .tls-block-label {
  margin-bottom: 8px;
}
.tls-row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.tls-row + .tls-row,
.tls-row + .tls-field-row,
.tls-field-row + .tls-field-row,
.tls-field-row + .tls-row {
  margin-top: 8px;
}
.tls-input {
  flex: 1;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid rgba(139, 155, 122, 0.3);
  background: rgba(10, 12, 10, 0.5);
  color: #e8e4d8;
  font-size: 13px;
  font-family: inherit;
}
.tls-input-sm {
  font-size: 12px;
  padding: 5px 8px;
}
.tls-field-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.tls-opt-label {
  font-size: 11px;
  color: rgba(217, 222, 207, 0.5);
  min-width: 48px;
}
.tls-chip {
  padding: 3px 10px;
  border-radius: 10px;
  border: 1px solid rgba(139, 155, 122, 0.22);
  background: transparent;
  color: rgba(217, 222, 207, 0.6);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease, color 0.18s ease;
}
.tls-chip:hover {
  border-color: rgba(139, 155, 122, 0.5);
  color: #e8e4d8;
}
.tls-chip.active {
  background: rgba(138, 154, 122, 0.3);
  border-color: #c4a060;
  color: #e8e4d8;
}
.tls-range {
  width: 88px;
  accent-color: #c4a060;
}
.tls-num {
  font-size: 11px;
  color: #c4a060;
  min-width: 28px;
}
.tls-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(139, 155, 122, 0.3);
  background: rgba(139, 155, 122, 0.16);
  color: #e8e4d8;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}
.tls-btn:hover {
  border-color: #c4a060;
}
.tls-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.tls-btn-primary {
  background: rgba(138, 154, 122, 0.35);
}
.tls-btn-ghost {
  padding: 3px 10px;
  font-size: 11px;
  background: transparent;
}
.tls-hits,
.tls-list {
  display: flex;
  flex-direction: column;
}
.tls-hit,
.tls-item {
  padding: 8px 0;
  border-bottom: 1px dashed rgba(139, 155, 122, 0.15);
}
.tls-hit:last-child,
.tls-item:last-child {
  border-bottom: none;
}
.tls-hit-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.tls-hit-type {
  font-size: 12px;
  font-weight: 600;
  color: #e8e4d8;
}
.tls-hit-score {
  font-size: 11px;
  color: #c4a060;
}
.tls-hit-title {
  margin: 4px 0 0;
  font-size: 13px;
  color: rgba(232, 228, 216, 0.85);
  line-height: 1.5;
}
.tls-hit-meta,
.tls-item-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: rgba(217, 222, 207, 0.45);
}
.tls-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.tls-item-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 2px 0;
  border: none;
  background: transparent;
  color: inherit;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.tls-item-main:hover .tls-item-text {
  color: #c4a060;
}
.tls-item-text {
  font-size: 13px;
  color: #e8e4d8;
}
.tls-item-x {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 6px;
  border: 1px solid rgba(139, 155, 122, 0.22);
  background: transparent;
  color: rgba(217, 222, 207, 0.55);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
}
.tls-item-x:hover {
  border-color: #c4a060;
  color: #c4a060;
}
@media (max-width: 640px) {
  .tls-panel {
    padding: 10px;
  }
  .tls-row {
    flex-wrap: wrap;
  }
  .tls-range {
    width: 64px;
  }
}
</style>
