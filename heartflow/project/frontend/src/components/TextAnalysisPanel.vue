<template>
  <section class="ta-panel" aria-label="文字分析">
    <div class="ta-panel-head">
      <span class="ta-panel-title">🔍 文字分析</span>
      <span class="ta-panel-sub">词频 · 情绪 · 节奏 · 风格</span>
    </div>

    <div class="ta-block">
      <textarea v-model="text" class="ta-textarea" placeholder="粘贴一段文字，分析词频、情绪、节奏与写作风格…" rows="4"></textarea>
      <button class="ta-btn ta-btn-primary" :disabled="!text.trim()" @click="analyze">分析</button>
    </div>

    <template v-if="analysis">
      <div class="ta-block">
        <span class="ta-block-label">词频 · Top 15</span>
        <div class="ta-freq">
          <span v-for="w in analysis.wordFreq.slice(0, 15)" :key="w.word" class="ta-freq-chip">
            {{ w.word }} <b>{{ w.count }}</b>
          </span>
        </div>
      </div>

      <div class="ta-block">
        <span class="ta-block-label">情绪基调 · {{ analysis.mood }}</span>
        <div class="ta-rhythm">
          <span
            v-for="(seg, i) in analysis.rhythm"
            :key="i"
            class="ta-rhythm-seg"
            :class="`pace-${seg.pace}`"
            :title="seg.segment"
          >{{ seg.segment }}</span>
        </div>
        <p class="ta-meta">平均句长 {{ analysis.avgSentenceLength }} 字 · 平均间距 {{ analysis.avgSpacing }}</p>
      </div>
    </template>

    <template v-if="style">
      <div class="ta-block">
        <span class="ta-block-label">写作风格 · {{ STYLE_META[style.style].label }}</span>
        <div class="ta-style-grid">
          <div class="ta-style-item">
            <span class="ta-style-num">{{ Math.round(style.styleScore * 100) }}%</span>
            <span class="ta-style-label">风格得分</span>
          </div>
          <div class="ta-style-item">
            <span class="ta-style-num">{{ Math.round(style.vocabularyRichness * 100) }}%</span>
            <span class="ta-style-label">词汇丰富度</span>
          </div>
          <div class="ta-style-item">
            <span class="ta-style-num">{{ style.avgSentenceLength }}</span>
            <span class="ta-style-label">平均句长</span>
          </div>
          <div class="ta-style-item">
            <span class="ta-style-num">{{ Math.round(style.sentenceVariation * 100) }}%</span>
            <span class="ta-style-label">句长变化</span>
          </div>
          <div class="ta-style-item">
            <span class="ta-style-num">{{ SENTIMENT_META[style.sentiment].label }}</span>
            <span class="ta-style-label">情感倾向</span>
          </div>
        </div>
        <ul v-if="style.suggestions.length" class="ta-suggestions">
          <li v-for="(s, i) in style.suggestions" :key="i">{{ s }}</li>
        </ul>
      </div>
    </template>

    <p v-if="!analysis && !style" class="ta-hint">输入文字并点击「分析」，查看词频、情绪、节奏与风格洞察。</p>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useTextAnalysisEngine, useStyleAnalysis } from '../modules/word-mirror/text-analysis'
import type { StyleAnalysis } from '../modules/word-mirror/text-analysis'
import type { TextAnalysis, WordEntry } from '../modules/word-mirror/types'

const props = defineProps<{ words: WordEntry[] }>()

const STYLE_META: Record<StyleAnalysis['style'], { label: string }> = {
  narrative: { label: '叙事' },
  descriptive: { label: '描写' },
  argumentative: { label: '议论' },
  lyrical: { label: '抒情' },
  conversational: { label: '口语' },
  technical: { label: '技术' },
}

const SENTIMENT_META: Record<StyleAnalysis['sentiment'], { label: string }> = {
  positive: { label: '积极' },
  neutral: { label: '中性' },
  negative: { label: '消极' },
}

const engine = useTextAnalysisEngine()
const styleEngine = useStyleAnalysis()

const text = ref('')
const analysis = ref<TextAnalysis | null>(null)
const style = ref<StyleAnalysis | null>(null)

function analyze() {
  const knownWords = props.words
  analysis.value = engine.analyze(text.value, knownWords)
  style.value = styleEngine.analyzeStyle(text.value, knownWords)
}
</script>

<style scoped>
.ta-panel {
  background: linear-gradient(135deg, rgba(60, 70, 90, 0.35), rgba(40, 48, 64, 0.25));
  border: 1px solid rgba(140, 160, 190, 0.18);
  border-radius: 14px;
  padding: 16px;
  margin: 12px 0;
}
.ta-panel-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}
.ta-panel-title {
  font-size: 15px;
  font-weight: 600;
  color: #dce4f0;
}
.ta-panel-sub {
  font-size: 12px;
  color: #8a97ad;
}
.ta-block { margin-bottom: 12px; }
.ta-block-label {
  display: block;
  font-size: 12px;
  color: #8a97ad;
  margin-bottom: 8px;
}
.ta-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.2);
  background: rgba(20, 26, 38, 0.6);
  color: #c6d0e0;
  font-size: 13px;
  resize: vertical;
  margin-bottom: 8px;
}
.ta-btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid rgba(140, 160, 190, 0.25);
  background: transparent;
  color: #aab6c9;
  font-size: 12px;
  cursor: pointer;
}
.ta-btn-primary {
  background: rgba(120, 150, 200, 0.2);
  border-color: rgba(140, 170, 220, 0.5);
  color: #dce4f0;
}
.ta-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.ta-freq {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.ta-freq-chip {
  font-size: 12px;
  color: #aab6c9;
  background: rgba(120, 150, 200, 0.1);
  border: 1px solid rgba(140, 160, 190, 0.15);
  border-radius: 6px;
  padding: 3px 8px;
}
.ta-freq-chip b {
  color: #9fc4e8;
  margin-left: 4px;
}
.ta-rhythm {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.ta-rhythm-seg {
  font-size: 12px;
  border-radius: 6px;
  padding: 3px 8px;
}
.ta-rhythm-seg.pace-fast { background: rgba(196, 106, 90, 0.2); color: #d98c7a; }
.ta-rhythm-seg.pace-normal { background: rgba(138, 154, 122, 0.2); color: #a8b89a; }
.ta-rhythm-seg.pace-slow { background: rgba(107, 159, 196, 0.2); color: #9fc4e8; }
.ta-meta {
  font-size: 11px;
  color: #7a879c;
  margin: 8px 0 0;
}
.ta-style-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(90px, 1fr));
  gap: 8px;
}
.ta-style-item {
  background: rgba(20, 26, 38, 0.45);
  border: 1px solid rgba(140, 160, 190, 0.12);
  border-radius: 8px;
  padding: 8px;
  text-align: center;
}
.ta-style-num {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #dce4f0;
}
.ta-style-label {
  display: block;
  font-size: 11px;
  color: #8a97ad;
  margin-top: 2px;
}
.ta-suggestions {
  margin: 10px 0 0;
  padding-left: 18px;
}
.ta-suggestions li {
  font-size: 12px;
  color: #aab6c9;
  margin-bottom: 4px;
}
.ta-hint {
  font-size: 12px;
  color: #7a879c;
  margin: 8px 0 0;
}
</style>
