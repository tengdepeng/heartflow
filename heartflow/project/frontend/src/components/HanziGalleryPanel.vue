<template>
  <section class="hgp">
    <div class="hgp-head">
      <span class="hgp-title">🔍 查字台</span>
      <span class="hgp-sub">拼音 / 部首 / 笔画，一字三入口 · 本地离线</span>
    </div>

    <!-- 查询方式切换 -->
    <div class="hgp-tabs">
      <button
        v-for="t in TABS"
        :key="t.key"
        class="hgp-tab"
        :class="{ active: tab === t.key }"
        @click="tab = t.key"
      >{{ t.label }}</button>
    </div>

    <!-- 拼音 -->
    <div v-if="tab === 'pinyin'" class="hgp-body">
      <input class="hgp-input" v-model="pinyinQuery" placeholder="键入拼音，如 xin / shan / a…" />
      <div v-if="pinyinResult.length" class="hgp-grid">
        <button
          v-for="e in pinyinResult"
          :key="e.char"
          class="hgp-char"
          :class="{ active: selected?.char === e.char }"
          @click="select(e)"
        >
          <b>{{ e.char }}</b>
          <span>{{ e.pinyin }}</span>
        </button>
      </div>
      <p v-else class="hgp-empty">输入拼音开始查字（支持声调，如 xīn 或 xin）</p>
    </div>

    <!-- 部首 -->
    <div v-if="tab === 'radical'" class="hgp-body">
      <div class="hgp-radical-grid">
        <button
          v-for="g in radicalGroups"
          :key="g.radical"
          class="hgp-radical"
          :class="{ active: activeRadical === g.radical }"
          @click="toggleRadical(g.radical)"
        >
          <span class="hgp-radical-ch">{{ g.radical }}</span>
          <span class="hgp-radical-n">{{ g.count }}</span>
        </button>
      </div>
      <div v-if="activeRadical" class="hgp-grid">
        <button
          v-for="e in byRadical(activeRadical, library)"
          :key="e.char"
          class="hgp-char"
          :class="{ active: selected?.char === e.char }"
          @click="select(e)"
        >
          <b>{{ e.char }}</b>
          <span>{{ e.strokes }}画</span>
        </button>
      </div>
    </div>

    <!-- 笔画 -->
    <div v-if="tab === 'stroke'" class="hgp-body">
      <div class="hgp-range">
        <span>{{ strokeMin }}画</span>
        <input type="range" class="hgp-slider" min="1" :max="maxStroke" v-model.number="strokeMin" />
        <input type="range" class="hgp-slider" min="1" :max="maxStroke" v-model.number="strokeMax" />
        <span>{{ strokeMax }}画</span>
      </div>
      <div v-if="strokeResult.length" class="hgp-grid">
        <button
          v-for="e in strokeResult"
          :key="e.char"
          class="hgp-char"
          :class="{ active: selected?.char === e.char }"
          @click="select(e)"
        >
          <b>{{ e.char }}</b>
          <span>{{ e.strokes }}画</span>
        </button>
      </div>
      <p v-else class="hgp-empty">拖动滑块设定笔画区间</p>
    </div>

    <!-- 汉字详情 -->
    <div v-if="selected" class="hgp-detail">
      <div class="hgp-detail-head">
        <span class="hgp-detail-char">{{ selected.char }}</span>
        <div class="hgp-detail-basic">
          <span class="hgp-detail-py">{{ selected.pinyin || '—' }}</span>
          <span class="hgp-detail-meta">
            部首 {{ selected.radical }} · {{ selected.radicalStrokes }}画 · 总 {{ selected.strokes }}画
          </span>
          <span v-if="selected.structure" class="hgp-detail-st">{{ selected.structure }}</span>
        </div>
      </div>
      <p v-if="selected.meaning" class="hgp-detail-meaning">{{ selected.meaning }}</p>
      <div v-if="selected.words && selected.words.length" class="hgp-detail-words">
        <span v-for="w in selected.words" :key="w" class="hgp-word">{{ w }}</span>
      </div>
      <button v-if="collectable" class="hgp-collect" @click="emitCollect(selected)">＋ 收录到殿堂词库</button>
    </div>

    <!-- 档案概览 -->
    <div class="hgp-archive">
      <h4>📚 汉字档案</h4>
      <div class="hgp-metrics">
        <div class="hgp-metric"><b>{{ ov.total }}</b><span>总字</span></div>
        <div class="hgp-metric"><b>{{ ov.radicalCount }}</b><span>部首</span></div>
        <div class="hgp-metric"><b>{{ ov.avgStrokes }}</b><span>均画</span></div>
        <div class="hgp-metric"><b>{{ ov.simpleRatio }}%</b><span>简字</span></div>
      </div>
      <div class="hgp-arch-rows">
        <div v-for="row in radicalRows" :key="row.initial" class="hgp-arch-row">
          <span class="hgp-arch-label">「{{ row.initial }}」</span>
          <span class="hgp-arch-bar"><i :style="{ width: rowPct(row.count) }"></i></span>
          <span class="hgp-arch-n">{{ row.count }}</span>
        </div>
      </div>
      <ul class="hgp-insights">
        <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { loadHanziAll } from '../modules/hanzi'
import type { HanziEntry } from '../modules/hanzi'
import { byPinyin, byRadical, byStrokeRange, listRadicals } from '../modules/hanzi'
import { hanziOverview, radicalDistribution, hanziInsights } from '../modules/hanzi'

const props = defineProps<{
  /** 传入完整字库（缺省用内置字库） */
  library?: HanziEntry[]
  /** 是否允许「收录到殿堂词库」 */
  collectable?: boolean
}>()

const emit = defineEmits<{ (e: 'collect', entry: HanziEntry): void }>()

const library = computed(() => props.library || loadHanziAll())

type TabKey = 'pinyin' | 'radical' | 'stroke'

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'pinyin', label: '拼音' },
  { key: 'radical', label: '部首' },
  { key: 'stroke', label: '笔画' },
]

const tab = ref<TabKey>('pinyin')
const pinyinQuery = ref('')
const selected = ref<HanziEntry | null>(null)
const activeRadical = ref('')
const strokeMin = ref(1)
const strokeMax = ref(13)

const maxStroke = computed(() =>
  library.value.reduce((m, e) => Math.max(m, e.strokes), 13)
)

const pinyinResult = computed(() => byPinyin(pinyinQuery.value, library.value).slice(0, 24))
const radicalGroups = computed(() => listRadicals(library.value).slice(0, 48))
const strokeResult = computed(() =>
  byStrokeRange(strokeMin.value, strokeMax.value, library.value).slice(0, 30)
)

function toggleRadical(r: string) {
  activeRadical.value = activeRadical.value === r ? '' : r
  if (selected.value?.radical !== r) selected.value = null
}

function select(e: HanziEntry) {
  selected.value = e
}

function emitCollect(e: HanziEntry) {
  emit('collect', e)
}

// ---- 档案 ----
const ov = computed(() => hanziOverview(library.value))
const radicalRows = computed(() => radicalDistribution(library.value, 6))
const insights = computed(() => hanziInsights(library.value, 4))

function rowPct(count: number): string {
  const max = Math.max(...radicalRows.value.map((r) => r.count), 1)
  return `${Math.round((count / max) * 100)}%`
}
</script>

<style scoped>
.hgp {
  margin-bottom: 24px;
  padding: 18px 20px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}
.hgp-head { margin-bottom: 12px; }
.hgp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high); display: block; }
.hgp-sub { font-size: 11px; color: var(--text-faint); }

.hgp-tabs { display: flex; gap: 6px; margin-bottom: 12px; }
.hgp-tab {
  padding: 5px 16px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: transparent; color: var(--text-dim); font-size: 12px; cursor: pointer; font-family: inherit;
  transition: all 0.2s;
}
.hgp-tab.active { background: rgba(var(--accent-rgb), 0.12); color: var(--accent); border-color: rgba(var(--accent-rgb), 0.2); }

.hgp-body { margin-bottom: 6px; }
.hgp-input {
  width: 100%; box-sizing: border-box; padding: 8px 12px; border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12); background: var(--bg-card); color: var(--text-high);
  font-size: 13px; font-family: inherit; outline: none; margin-bottom: 10px;
}

.hgp-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.hgp-char {
  display: flex; flex-direction: column; align-items: center; gap: 2px; width: 52px; padding: 6px 4px;
  border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.08); background: rgba(var(--accent-rgb), 0.04);
  color: var(--text-sign-row, var(--text-high)); cursor: pointer; font-family: inherit; transition: all 0.15s;
}
.hgp-char b { font-size: 18px; font-weight: 500; }
.hgp-char span { font-size: 9px; color: var(--text-faint); }
.hgp-char.active { border-color: rgba(var(--accent-rgb), 0.4); background: rgba(var(--accent-rgb), 0.14); }

.hgp-radical-grid { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.hgp-radical {
  display: flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.1); background: transparent; color: var(--text-dim);
  cursor: pointer; font-family: inherit; font-size: 12px; transition: all 0.15s;
}
.hgp-radical-ch { font-size: 15px; color: var(--text-high); }
.hgp-radical-n { font-size: 10px; color: var(--text-faint); }
.hgp-radical.active { border-color: rgba(var(--accent-rgb), 0.35); background: rgba(var(--accent-rgb), 0.1); color: var(--accent); }

.hgp-range { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 12px; color: var(--text-dim); }
.hgp-slider { flex: 1; accent-color: var(--accent); }

/* 详情 */
.hgp-detail {
  margin-top: 14px; padding: 14px 16px; border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.14); background: rgba(var(--accent-rgb), 0.05);
}
.hgp-detail-head { display: flex; align-items: center; gap: 14px; }
.hgp-detail-char { font-size: 44px; line-height: 1; color: var(--text-high); font-family: var(--font-heading-zh); }
.hgp-detail-basic { display: flex; flex-direction: column; gap: 3px; }
.hgp-detail-py { font-size: 16px; color: var(--accent); }
.hgp-detail-meta { font-size: 11px; color: var(--text-dim); }
.hgp-detail-st { display: inline-block; width: fit-content; font-size: 10px; padding: 1px 7px; border-radius: 6px; background: rgba(var(--accent-rgb), 0.1); color: var(--accent); }
.hgp-detail-meaning { font-size: 13px; color: var(--text-low); margin: 10px 0 8px; line-height: 1.6; }
.hgp-detail-words { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.hgp-word { font-size: 12px; padding: 2px 8px; border-radius: 6px; background: rgba(255, 255, 255, 0.06); color: var(--text-sign-row, var(--text-dim)); }
.hgp-collect {
  padding: 5px 12px; border-radius: 8px; border: 1px solid rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.12); color: var(--accent); font-size: 11px; cursor: pointer; font-family: inherit;
}

/* 档案 */
.hgp-archive { margin-top: 18px; border-top: 1px dashed rgba(var(--accent-rgb), 0.1); padding-top: 14px; }
.hgp-archive h4 { font-size: 12px; margin: 0 0 10px; color: var(--text-low); font-weight: 500; }
.hgp-metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 12px; }
.hgp-metric { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 8px 4px; border-radius: 8px; background: rgba(var(--accent-rgb), 0.05); border: 1px solid rgba(var(--accent-rgb), 0.07); }
.hgp-metric b { font-size: 16px; font-weight: 300; color: rgba(var(--text-primary-rgb), 0.85); }
.hgp-metric span { font-size: 10px; color: var(--text-faint); }
.hgp-arch-row { display: flex; align-items: center; gap: 8px; margin-bottom: 5px; }
.hgp-arch-label { width: 40px; font-size: 11px; color: var(--text-dim); }
.hgp-arch-bar { flex: 1; height: 7px; border-radius: 4px; background: rgba(255, 255, 255, 0.06); overflow: hidden; }
.hgp-arch-bar i { display: block; height: 100%; border-radius: 4px; background: var(--accent); transition: width 0.3s; }
.hgp-arch-n { font-size: 11px; color: var(--text-dim); width: 18px; text-align: right; }
.hgp-insights { margin: 10px 0 0; padding-left: 18px; }
.hgp-insights li { font-size: 11px; color: var(--text-dim); line-height: 1.7; margin-bottom: 3px; }
.hgp-empty { font-size: 12px; color: rgba(var(--text-primary-rgb), 0.15); padding: 12px 0; text-align: center; }

@media (max-width: 480px) {
  .hgp-metrics { grid-template-columns: repeat(2, 1fr); }
}
</style>