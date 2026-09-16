<template>
  <section data-enter class="hz-panel">
    <header class="hz-head">
      <span class="hz-title">📖 字源随手查</span>
      <span class="hz-count">{{ db.length }} 字</span>
    </header>

    <!-- 模式切换 -->
    <div class="hz-modes">
      <button :class="['hz-mode', { on: mode === 'search' }]" @click="mode = 'search'">查找</button>
      <button :class="['hz-mode', { on: mode === 'radical' }]" @click="pickMode('radical')">部首</button>
      <button :class="['hz-mode', { on: mode === 'stroke' }]" @click="pickMode('stroke')">笔画</button>
    </div>

    <!-- 搜索框 -->
    <div class="hz-inputbox" v-if="mode === 'search'">
      <input v-model="query" class="hz-input" type="text" placeholder="输入汉字 / 拼音 / 部首 / 释义 / 组词…" />
    </div>

    <!-- 部首选项 -->
    <div v-if="mode === 'radical'" class="hz-ox">
      <button v-for="g in radicals" :key="g.radical" :class="['hz-o', { on: selRadical === g.radical }]" @click="selRadical = (selRadical === g.radical ? '' : g.radical)">
        {{ g.radical }} <span class="hz-o-c">{{ g.count }}</span>
      </button>
    </div>

    <!-- 笔画分桶 -->
    <div v-if="mode === 'stroke'" class="hz-ox">
      <button v-for="b in buckets" :key="b.key" :class="['hz-o', { on: selBucket === b.key }]" @click="selBucket = (selBucket === b.key ? '' : b.key)">
        {{ b.label }} <span class="hz-o-c">{{ b.count }}</span>
      </button>
    </div>

    <!-- 结果 -->
    <div v-if="results.length" class="hz-results">
      <div v-for="e in results" :key="e.char" class="hz-card" @click="toggle(e)">
        <span class="hz-char">{{ e.char }}</span>
        <div class="hz-info">
          <span class="hz-pinyin">{{ e.pinyin }}</span>
          <span class="hz-meta">{{ e.radical }} · {{ e.strokes }}画 · {{ e.structure }}</span>
          <span class="hz-meaning">{{ e.meaning }}</span>
        </div>
        <span class="hz-expand">{{ openChar === e.char ? '▾' : '▸' }}</span>
      </div>
    </div>
    <p v-else-if="mode !== 'search' || query" class="hz-empty">没有匹配的汉字。</p>

    <!-- 单字详解 -->
    <div v-if="detail" class="hz-detail">
      <p class="hz-detail-char">{{ detail.char }} <span class="hz-detail-py">{{ detail.pinyin }}</span></p>
      <p class="hz-detail-line">部首 <b>{{ detail.radical }}</b>（{{ detail.radicalStrokes }}画）· 总 {{ detail.strokes }} 画 · 构字 <b>{{ detail.structure }}</b></p>
      <p class="hz-detail-line">释义：{{ detail.meaning }}</p>
      <p class="hz-detail-line" v-if="detail.words.length">组词：{{ detail.words.join('、') }}</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { loadHanziAll, type HanziEntry } from '../modules/hanzi/hanzi-data'
import { searchHanzi, byRadical, byStrokeRange, listRadicals, strokeBuckets } from '../modules/hanzi/lookup'

const db = loadHanziAll()
const RANGE: Record<string, [number, number]> = { lo: [1, 5], mid: [6, 10], hi: [11, 15], xh: [16, 99] }

const mode = ref<'search' | 'radical' | 'stroke'>('search')
const query = ref('')
const selRadical = ref('')
const selBucket = ref('')

const radicals = computed(() => listRadicals(db))
const buckets = computed(() => strokeBuckets(db))

const results = computed<HanziEntry[]>(() => {
  if (mode.value === 'radical') return selRadical.value ? byRadical(selRadical.value, db) : []
  if (mode.value === 'stroke') return selBucket.value ? byStrokeRange(...RANGE[selBucket.value], db) : []
  return searchHanzi(query.value, db)
})

const openChar = ref('')
const detail = computed(() => results.value.find((e) => e.char === openChar.value) ?? null)

function pickMode(m: 'radical' | 'stroke') { mode.value = m; openChar.value = '' }
function toggle(e: HanziEntry) { openChar.value = openChar.value === e.char ? '' : e.char }
</script>

<style scoped>
.hz-panel { padding: 16px; border-radius: 12px; background: var(--bg-card); border: 1px solid rgba(var(--accent-rgb), 0.08); }
.hz-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.hz-title { font-size: 14px; letter-spacing: 2px; color: rgba(var(--accent-rgb), 0.75); }
.hz-count { font-size: 11px; opacity: 0.45; }

.hz-modes { display: flex; gap: 6px; margin-bottom: 12px; }
.hz-mode {
  display: inline-flex;
  align-items: center;
  justify-content: center;
   padding: 2px 14px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.14); background: transparent; color: inherit; font-size: 12px; cursor: pointer; 
  min-height: 26px;
}
.hz-mode.on { background: rgba(var(--accent-rgb), 0.22); border-color: rgba(var(--accent-rgb), 0.5); }

.hz-inputbox { margin-bottom: 12px; }
.hz-input { width: 100%; padding: 9px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04); color: inherit; font-size: 13px; }

.hz-ox { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.hz-o { padding: 4px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.1); background: transparent; color: inherit; font-size: 13px; cursor: pointer; }
.hz-o.on { background: rgba(var(--accent-rgb), 0.2); border-color: rgba(var(--accent-rgb), 0.5); }
.hz-o-c { font-size: 10px; opacity: 0.5; margin-left: 3px; }

.hz-results { display: flex; flex-direction: column; gap: 8px; max-height: 320px; overflow: auto; }
.hz-card { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.03); cursor: pointer; }
.hz-card:hover { background: rgba(var(--accent-rgb), 0.08); }
.hz-char { font-size: 28px; color: #e8dcc8; width: 44px; text-align: center; flex-shrink: 0; }
.hz-info { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.hz-pinyin { font-size: 13px; color: rgba(var(--accent-rgb), 0.85); }
.hz-meta { font-size: 11px; opacity: 0.5; }
.hz-meaning { font-size: 12px; opacity: 0.7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.hz-expand { opacity: 0.4; }
.hz-empty { font-size: 12px; opacity: 0.5; padding: 8px 0; }

.hz-detail { margin-top: 12px; padding: 12px; border-radius: 10px; border: 1px solid rgba(var(--accent-rgb), 0.15); background: rgba(var(--accent-rgb), 0.05); }
.hz-detail-char { font-size: 34px; color: #e8dcc8; }
.hz-detail-py { font-size: 14px; color: rgba(var(--accent-rgb), 0.8); margin-left: 8px; }
.hz-detail-line { margin: 4px 0; font-size: 13px; line-height: 1.8; opacity: 0.8; }
</style>