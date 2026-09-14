<template>
  <section class="wroot">
    <div class="wroot-head">
      <span class="wroot-title">🔍 词根词缀拆解</span>
      <span class="wroot-sub">不背单词 / 无痛单词 借鉴</span>
    </div>

    <!-- 输入 -->
    <div class="wroot-input-row">
      <input
        v-model="wordInput"
        class="wroot-input"
        placeholder="输入一个英文单词，如 transport…"
        @keyup.enter="analyze"
      />
      <button class="wroot-btn" @click="analyze" :disabled="!wordInput.trim()">拆解</button>
    </div>

    <!-- 拆解结果 -->
    <div v-if="result" class="wroot-result">
      <div class="wroot-segments">
        <span
          v-for="(p, i) in result.parts"
          :key="i"
          class="wroot-seg"
          :class="`seg-${p.type}`"
          :title="`${p.text}：${p.meaning}`"
        >
          {{ p.text }}
        </span>
        <span v-if="result.residual" class="wroot-seg seg-unknown">{{ result.residual }}</span>
      </div>

      <!-- 部件释义 -->
      <div v-if="result.parts.length" class="wroot-legend">
        <div v-for="(p, i) in result.parts" :key="i" class="wroot-legend-row">
          <span class="wroot-legend-text" :class="`seg-${p.type}`">{{ p.text }}</span>
          <span class="wroot-legend-type">{{ typeLabel(p.type) }}</span>
          <span class="wroot-legend-mean">{{ p.meaning }}</span>
        </div>
      </div>

      <!-- 洞察 -->
      <ul v-if="insights.length" class="wroot-insights">
        <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
      </ul>
    </div>

    <!-- 常用词根速查 -->
    <details class="wroot-ref">
      <summary>常用词根速查</summary>
      <div class="wroot-ref-grid">
        <div v-for="r in commonRoots" :key="r.text" class="wroot-ref-item">
          <span class="wroot-ref-text">{{ r.text }}</span>
          <span class="wroot-ref-mean">{{ r.meaning }}</span>
        </div>
      </div>
    </details>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { decomposeWord, wordRootInsights } from '../modules/wisdom/word-roots'
import type { DecomposedWord, WordPartType } from '../modules/wisdom/word-roots'

const wordInput = ref('')
const result = ref<DecomposedWord | null>(null)
const insights = ref<string[]>([])

function analyze() {
  const w = wordInput.value.trim()
  if (!w) return
  result.value = decomposeWord(w)
  insights.value = wordRootInsights(w)
}

function typeLabel(t: WordPartType) {
  return t === 'prefix' ? '前缀' : t === 'root' ? '词根' : '后缀'
}

const commonRoots = [
  { text: 'dict', meaning: '说' },
  { text: 'duc/duct', meaning: '引导' },
  { text: 'graph', meaning: '写，画' },
  { text: 'ject', meaning: '投掷' },
  { text: 'log', meaning: '话语，学问' },
  { text: 'mit/miss', meaning: '送' },
  { text: 'path', meaning: '感情，疾病' },
  { text: 'port', meaning: '搬运' },
  { text: 'scrib/script', meaning: '写' },
  { text: 'spec/spect', meaning: '看' },
  { text: 'struct', meaning: '建造' },
  { text: 'tract', meaning: '拉，拖' },
  { text: 'ven/vent', meaning: '来' },
  { text: 'vid/vis', meaning: '看' },
  { text: 'voc/vok', meaning: '呼唤' },
  { text: 'chron', meaning: '时间' },
  { text: 'cred', meaning: '相信' },
  { text: 'geo', meaning: '地球' },
  { text: 'bio', meaning: '生命' },
  { text: 'phon', meaning: '声音' },
]
</script>

<style scoped>
.wroot {
  position: relative;
  z-index: 1;
  margin-bottom: 24px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}
.wroot-head { margin-bottom: 12px; }
.wroot-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high); display: block; }
.wroot-sub { font-size: 11px; color: var(--text-faint); }

.wroot-input-row { display: flex; gap: 8px; margin-bottom: 12px; }
.wroot-input {
  flex: 1;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: rgba(0, 0, 0, 0.2);
  color: rgba(var(--text-primary-rgb), 0.85);
  font-size: 13px;
  font-family: inherit;
  outline: none;
}
.wroot-input:focus { border-color: rgba(var(--accent-rgb), 0.35); }
.wroot-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
}
.wroot-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.18); }
.wroot-btn:disabled { opacity: 0.3; cursor: not-allowed; }

/* 拆解结果 */
.wroot-result { margin-bottom: 12px; }
.wroot-segments {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 12px;
}
.wroot-seg {
  padding: 5px 10px;
  border-radius: 6px;
  font-size: 13px;
  font-family: inherit;
  cursor: default;
}
.seg-prefix { background: rgba(96, 165, 250, 0.15); color: #93c5fd; border: 1px solid rgba(96, 165, 250, 0.25); }
.seg-root { background: rgba(52, 211, 153, 0.15); color: #6ee7b7; border: 1px solid rgba(52, 211, 153, 0.25); }
.seg-suffix { background: rgba(251, 191, 36, 0.15); color: #fcd34d; border: 1px solid rgba(251, 191, 36, 0.25); }
.seg-unknown { background: rgba(148, 163, 184, 0.12); color: #94a3b8; border: 1px dashed rgba(148, 163, 184, 0.3); }

.wroot-legend { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
.wroot-legend-row { display: flex; align-items: baseline; gap: 8px; font-size: 11px; }
.wroot-legend-text { flex: 0 0 70px; padding: 2px 6px; border-radius: 4px; text-align: center; }
.wroot-legend-type { flex: 0 0 36px; color: var(--text-faint); }
.wroot-legend-mean { color: var(--text-dim); }

.wroot-insights { margin: 0; padding-left: 18px; }
.wroot-insights li { font-size: 11px; color: var(--text-dim); line-height: 1.7; margin-bottom: 3px; }

/* 速查 */
.wroot-ref { margin-top: 4px; }
.wroot-ref summary {
  font-size: 11px;
  color: var(--text-dim);
  cursor: pointer;
  user-select: none;
}
.wroot-ref-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 4px;
  margin-top: 8px;
}
.wroot-ref-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.15);
  font-size: 10px;
}
.wroot-ref-text { color: #6ee7b7; }
.wroot-ref-mean { color: var(--text-faint); }
</style>
