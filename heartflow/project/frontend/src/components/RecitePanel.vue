<template>
  <section class="rc-panel" aria-label="渐进背诵">
    <div class="rc-panel-head">
      <span class="rc-panel-title">📖 渐进背诵</span>
      <span class="rc-panel-sub">遮盖 20%→100% · 反复强化</span>
    </div>

    <!-- 添加背诵卡 -->
    <div class="rc-block">
      <span class="rc-block-label">添加背诵卡</span>
      <div class="rc-row">
        <input v-model="form.title" class="rc-input" placeholder="标题" />
        <select v-model="form.lang" class="rc-select">
          <option value="cjk">中文 · 按字</option>
          <option value="latin">西文 · 按词</option>
        </select>
      </div>
      <textarea v-model="form.text" class="rc-input rc-textarea" rows="3" placeholder="要背诵的文本…"></textarea>
      <button class="rc-btn rc-btn-primary" @click="add" :disabled="!form.title.trim() || !form.text.trim()">添加</button>
    </div>

    <!-- 背诵卡清单 -->
    <div class="rc-block">
      <span class="rc-block-label">背诵卡 · {{ cards.length }}</span>
      <ul v-if="cards.length" class="rc-list">
        <li v-for="c in cards" :key="c.id" class="rc-card">
          <div class="rc-card-head">
            <span class="rc-card-title">{{ c.title }}</span>
            <span class="rc-chip">第 {{ c.stepIndex + 1 }}/{{ steps.length }} 档</span>
            <span class="rc-chip">最佳 {{ c.bestAccuracy }}%</span>
            <span class="rc-chip">练习 {{ c.attempts }} 次</span>
            <button class="rc-btn rc-btn-sm" @click="togglePractice(c.id)">{{ practiceId === c.id ? '收起' : '背诵' }}</button>
            <button class="rc-del" @click="remove(c.id)">×</button>
          </div>
          <div v-if="practiceId === c.id" class="rc-practice">
            <div class="rc-masked">{{ maskedText(c) }}</div>
            <input v-model="attempt" class="rc-input" placeholder="默写被遮盖的部分…" @keyup.enter="submit(c.id)" />
            <button class="rc-btn" @click="submit(c.id)" :disabled="!attempt.trim()">提交</button>
            <div v-if="result" class="rc-result" :class="{ pass: result.correct }">
              <span>准确率 {{ result.accuracy }}% · {{ result.correct ? '通过 ✓' : '未通过' }}</span>
              <span v-if="result.wrongTokens.length" class="rc-wrong">易错：{{ result.wrongTokens.join('、') }}</span>
            </div>
          </div>
        </li>
      </ul>
      <p v-else class="rc-empty">暂无背诵卡。添加一段想背的文本开始。</p>
    </div>

    <!-- 背诵档案 -->
    <div class="rc-block" v-if="cards.length">
      <span class="rc-block-label">背诵档案</span>
      <div class="rc-arc-metrics">
        <div class="rc-arc-metric"><b>{{ ov.total }}</b><span>卡片</span></div>
        <div class="rc-arc-metric"><b>{{ ov.mastered }}</b><span>已背熟</span></div>
        <div class="rc-arc-metric"><b>{{ ov.avgBestAccuracy }}%</b><span>均最佳</span></div>
        <div class="rc-arc-metric"><b>{{ rhythm.passRate }}%</b><span>达标率</span></div>
      </div>
      <div v-if="rcSteps.length" class="rc-arc-steps">
        <div v-for="row in rcSteps" :key="row.stepIndex" class="rc-arc-step">
          <span class="rc-arc-step-label">{{ row.label }}</span>
          <span class="rc-arc-step-bar"><i :style="{ width: stepPct(row.count) }"></i></span>
          <span class="rc-arc-step-n">{{ row.count }}</span>
        </div>
      </div>
      <div v-if="rhythm.weakTokens.length" class="rc-arc-weak">
        <span class="rc-arc-weak-label">薄弱字：</span>
        <span v-for="w in rhythm.weakTokens" :key="w.token" class="rc-arc-weak-tok">「{{ w.token }}」×{{ w.count }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRecite, reciteOverview, reciteStepDistribution, reciteRhythm } from '../modules/recite'
import type { ReciteCard, ReciteResult, TextLang } from '../modules/recite'

const recite = useRecite()
const cards = computed(() => recite.cards.value)
const steps = computed(() => recite.steps)
// 背诵档案（并入自 ReciteStudioPanel）：概览指标 + 分档分布 + 薄弱字
const ov = computed(() => reciteOverview(cards.value))
const rcSteps = computed(() => reciteStepDistribution(cards.value))
const rhythm = computed(() => reciteRhythm(cards.value))
function stepPct(count: number): string {
  const max = Math.max(...rcSteps.value.map((s) => s.count), 1)
  return `${Math.round((count / max) * 100)}%`
}

const form = reactive({ title: '', text: '', lang: 'cjk' as TextLang })
const practiceId = ref<string | null>(null)
const attempt = ref('')
const result = ref<ReciteResult | null>(null)

function add() {
  if (!form.title.trim() || !form.text.trim()) return
  recite.addCard(form.title, form.text, form.lang)
  form.title = ''
  form.text = ''
}
function remove(id: string) {
  recite.removeCard(id)
  if (practiceId.value === id) {
    practiceId.value = null
    result.value = null
  }
}
function togglePractice(id: string) {
  practiceId.value = practiceId.value === id ? null : id
  attempt.value = ''
  result.value = null
}
function maskedText(c: ReciteCard): string {
  return recite.reciteDisplay(c).tokens.join('')
}
function submit(id: string) {
  if (!attempt.value.trim()) return
  result.value = recite.submitAttempt(id, attempt.value)
  attempt.value = ''
}
</script>

<style scoped>
.rc-panel {
  width: 100%;
  max-width: 520px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  border-radius: 18px;
  background: rgba(14, 16, 24, 0.42);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}
.rc-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.rc-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.rc-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.rc-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.rc-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.rc-row {
  display: flex;
  gap: 6px;
}
.rc-input {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 12px;
  font-family: inherit;
  outline: none;
  min-width: 0;
}
.rc-input.rc-textarea {
  resize: vertical;
}
.rc-select {
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 11px;
  font-family: inherit;
}
.rc-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.rc-btn-primary {
  background: rgba(138, 154, 122, 0.12);
  border-color: rgba(138, 154, 122, 0.3);
  color: #8a9a7a;
}
.rc-btn-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 4px 10px;
  font-size: 11px;

  min-height: 26px;
}
.rc-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.rc-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rc-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.rc-card-head {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.rc-card-title {
  font-size: 12px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.9);
  flex: 1;
  min-width: 0;
}
.rc-chip {
  font-size: 9px;
  padding: 2px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-medium);
}
.rc-del {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.25);
  cursor: pointer;
  font-size: 13px;
  flex-shrink: 0;

  min-height: 24px;
  min-width: 24px;
}
.rc-del:hover {
  color: #c46a5a;
}
.rc-practice {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.rc-masked {
  font-size: 14px;
  line-height: 1.8;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.9);
  word-break: break-all;
}
.rc-result {
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: #c46a5a;
}
.rc-result.pass {
  color: #8a9a7a;
}
.rc-wrong {
  color: var(--text-low);
}
.rc-arc-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}
.rc-arc-metric {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}
.rc-arc-metric b {
  font-size: 16px;
  color: rgba(240, 242, 255, 0.9);
  font-variant-numeric: tabular-nums;
}
.rc-arc-metric span {
  font-size: 10px;
  color: var(--text-low);
}
.rc-arc-steps {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
}
.rc-arc-step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.rc-arc-step-label {
  width: 44px;
  color: var(--text-medium);
}
.rc-arc-step-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
.rc-arc-step-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: linear-gradient(90deg, rgba(138, 154, 122, 0.5), #8a9a7a);
}
.rc-arc-step-n {
  width: 20px;
  text-align: right;
  color: var(--text-low);
  font-variant-numeric: tabular-nums;
}
.rc-arc-weak {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 11px;
}
.rc-arc-weak-label {
  color: var(--text-medium);
}
.rc-arc-weak-tok {
  color: #e0988a;
}
.rc-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-low);
  text-align: center;
}
</style>
