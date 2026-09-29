<template>
  <section class="enp">
    <div class="enp-head">
      <div class="enp-title-wrap">
        <span class="enp-title">🔍 词源网络</span>
        <span class="enp-sub">追溯每一个字的来处，看见它如何生长</span>
      </div>
      <span v-if="dictionarySize" class="enp-size">词典 {{ dictionarySize }} 条</span>
    </div>

    <!-- 搜索 -->
    <div class="enp-search">
      <input
        v-model="query"
        class="enp-input"
        type="text"
        placeholder="输入字或词，追溯词源…"
        @keyup.enter="selectFirst"
      />
      <button class="enp-go" :disabled="!query" @click="selectFirst">追溯</button>
    </div>

    <!-- 搜索结果 -->
    <div v-if="query && results.length" class="enp-results">
      <button
        v-for="r in results"
        :key="r.word"
        class="enp-result"
        :class="{ active: selected?.word === r.word }"
        @click="select(r.word)"
      >
        <span class="enp-result-word">{{ r.word }}</span>
        <span class="enp-result-origin">{{ r.origin }}</span>
      </button>
    </div>
    <p v-else-if="query && !results.length" class="enp-none">未找到「{{ query }}」的词源，试试其他字词</p>

    <!-- 词源详情 -->
    <div v-if="selected" class="enp-detail">
      <div class="enp-detail-head">
        <span class="enp-word">{{ selected.word }}</span>
        <span class="enp-lang">{{ selected.language }}</span>
      </div>
      <p class="enp-origin">{{ selected.origin }}</p>

      <div v-if="selected.components.length" class="enp-block">
        <span class="enp-block-label">字根分解</span>
        <div class="enp-chips">
          <span v-for="c in selected.components" :key="c" class="enp-chip">{{ c }}</span>
        </div>
      </div>

      <div v-if="selected.cognates.length" class="enp-block">
        <span class="enp-block-label">同源词</span>
        <div class="enp-cognates">
          <button
            v-for="c in selected.cognates"
            :key="c"
            class="enp-cognate"
            @click="select(c)"
          >{{ c }}</button>
        </div>
      </div>

      <!-- 词根关联 -->
      <div v-if="relatives.length" class="enp-block">
        <span class="enp-block-label">共享词根</span>
        <div class="enp-relatives">
          <button
            v-for="r in relatives"
            :key="r.word"
            class="enp-relative"
            @click="select(r.word)"
          >
            <b>{{ r.word }}</b>
            <span>{{ r.origin }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 词典统计 -->
    <div v-if="languageGroups.length" class="enp-block enp-stats">
      <span class="enp-block-label">词源分布</span>
      <div class="enp-langs">
        <div v-for="g in languageGroups" :key="g.language" class="enp-lang-row">
          <span class="enp-lang-name">{{ g.language }}</span>
          <div class="enp-lang-bar"><i :style="{ width: langPct(g.count) }"></i></div>
          <span class="enp-lang-count">{{ g.count }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useEtymologyNetwork } from '../modules/word-mirror/etymology'
import type { EtymologyNode } from '../modules/word-mirror/types'

const en = useEtymologyNetwork()

const query = ref('')
const selected = ref<EtymologyNode | null>(null)

const etymologies = computed(() => en.etymologies.value)
const dictionarySize = computed(() => en.getDictionarySize())
const results = computed(() => (query.value ? en.searchEtymologies(query.value).slice(0, 8) : []))
const relatives = computed(() => (selected.value ? en.getRootRelatives(selected.value.word) : []))
const languageGroups = computed(() => {
  const grouped = en.getEtymologiesByLanguage()
  return Object.entries(grouped)
    .map(([language, items]) => ({ language, count: items.length }))
    .sort((a, b) => b.count - a.count)
})

function select(word: string) {
  const node = en.getEtymology(word)
  if (node) {
    selected.value = node
    query.value = ''
  }
}

function selectFirst() {
  if (results.value.length) select(results.value[0].word)
}

function langPct(count: number) {
  return Math.round((count / Math.max(dictionarySize.value, 1)) * 100) + '%'
}

onMounted(() => {
  if (etymologies.value.length && !selected.value) {
    selected.value = etymologies.value[0]
  }
})
</script>

<style scoped>
.enp {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(18, 14, 11, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.enp-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.enp-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.enp-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, rgba(232, 224, 216, 0.88)); }
.enp-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.enp-size { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: rgba(var(--accent-rgb), 0.75); white-space: nowrap; }

.enp-search { display: flex; gap: 8px; margin-bottom: 10px; }
.enp-input { flex: 1; padding: 9px 14px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.04); color: var(--text-high, rgba(232, 224, 216, 0.88)); font-size: 13px; font-family: inherit; outline: none; transition: border-color 0.2s; }
.enp-input:focus { border-color: rgba(var(--accent-rgb), 0.4); }
.enp-input::placeholder { color: rgba(232, 221, 208, 0.35); }
.enp-go { padding: 9px 18px; border-radius: 10px; border: 1px solid rgba(var(--accent-rgb), 0.3); background: rgba(var(--accent-rgb), 0.1); color: var(--accent, #d4a574); font-size: 12px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.enp-go:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); border-color: rgba(var(--accent-rgb), 0.5); }
.enp-go:disabled { opacity: 0.35; cursor: not-allowed; }

.enp-results { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.enp-result { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 8px; border: 1px solid transparent; background: rgba(255,255,255,0.03); color: inherit; text-align: left; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.enp-result:hover { background: rgba(var(--accent-rgb), 0.08); }
.enp-result.active { border-color: rgba(var(--accent-rgb), 0.4); background: rgba(var(--accent-rgb), 0.1); }
.enp-result-word { font-size: 15px; color: var(--text-high, rgba(232, 224, 216, 0.88)); flex-shrink: 0; }
.enp-result-origin { font-size: 11px; color: rgba(232, 221, 208, 0.5); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.enp-none { font-size: 12px; color: rgba(232, 221, 208, 0.45); margin: 4px 0 10px; }

.enp-detail { padding: 16px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); }
.enp-detail-head { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.enp-word { font-size: 30px; font-weight: 600; color: var(--text-high, rgba(232, 224, 216, 0.88)); letter-spacing: 6px; }
.enp-lang { font-size: 11px; padding: 2px 10px; border-radius: 10px; background: rgba(var(--accent-rgb), 0.14); color: rgba(var(--accent-rgb), 0.8); }
.enp-origin { font-size: 13px; color: rgba(232, 221, 208, 0.7); line-height: 1.7; margin: 0 0 14px; }

.enp-block { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); }
.enp-block-label { font-size: 10px; letter-spacing: 1px; color: rgba(var(--accent-rgb), 0.5); }
.enp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.enp-chip { font-size: 11px; padding: 3px 10px; border-radius: 7px; background: rgba(var(--accent-rgb), 0.12); color: rgba(var(--accent-rgb), 0.8); }
.enp-cognates { display: flex; flex-wrap: wrap; gap: 6px; }
.enp-cognate { font-size: 12px; padding: 4px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.03); color: var(--text-high, rgba(232, 224, 216, 0.88)); font-family: inherit; cursor: pointer; transition: all 0.2s; }
.enp-cognate:hover { border-color: rgba(var(--accent-rgb), 0.4); background: rgba(var(--accent-rgb), 0.08); }

.enp-relatives { display: flex; flex-direction: column; gap: 6px; }
.enp-relative { display: flex; align-items: baseline; gap: 10px; padding: 8px 12px; border-radius: 8px; border: 1px solid transparent; background: rgba(255,255,255,0.02); color: inherit; text-align: left; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.enp-relative:hover { background: rgba(var(--accent-rgb), 0.06); border-color: rgba(var(--accent-rgb), 0.2); }
.enp-relative b { font-size: 14px; color: var(--text-high, rgba(232, 224, 216, 0.88)); flex-shrink: 0; }
.enp-relative span { font-size: 11px; color: rgba(232, 221, 208, 0.5); }

.enp-langs { display: flex; flex-direction: column; gap: 6px; }
.enp-lang-row { display: flex; align-items: center; gap: 10px; }
.enp-lang-name { width: 52px; font-size: 11px; color: rgba(232, 221, 208, 0.6); flex-shrink: 0; }
.enp-lang-bar { flex: 1; height: 7px; border-radius: 999px; background: rgba(255,255,255,0.05); overflow: hidden; }
.enp-lang-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #8a9a7a, #6b9fc4); }
.enp-lang-count { width: 30px; text-align: right; font-size: 11px; color: rgba(232, 221, 208, 0.5); font-variant-numeric: tabular-nums; }

@media (max-width: 640px) {
  .enp { padding: 14px 14px; }
}
</style>