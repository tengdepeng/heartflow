<template>
  <section class="rsp">
    <div class="rsp-head">
      <span class="rsp-title">🗣 背书匠</span>
      <span class="rsp-sub">渐进式背诵 · 20%→100% 遮盖，反复出错处集中强化</span>
    </div>

    <!-- 新增卡片 -->
    <div class="rsp-add">
      <input v-model="title" class="rsp-input" placeholder="标题，如《将进酒》" />
      <div class="rsp-lang">
        <button
          v-for="l in LANGS"
          :key="l.key"
          class="rsp-lang-btn"
          :class="{ active: lang === l.key }"
          @click="lang = l.key"
        >{{ l.label }}</button>
      </div>
      <textarea v-model="text" class="rsp-textarea" placeholder="粘贴要背诵的文本……" rows="4"></textarea>
      <button class="rsp-btn" :disabled="!text.trim()" @click="onAdd">加入背诵单</button>
    </div>

    <!-- 卡片列表 -->
    <div v-if="cards.length" class="rsp-list">
      <div
        v-for="card in cards"
        :key="card.id"
        class="rsp-card"
        :class="{ 'rsp-in-practice': practicingId === card.id }"
      >
        <div class="rsp-card-head">
          <span class="rsp-card-title">{{ card.title || '未命名' }}</span>
          <span class="rsp-card-step">{{ maskLabel(card.stepIndex) }}</span>
          <div class="rsp-card-actions">
            <button class="rsp-mini" @click="startPractice(card)">背</button>
            <button class="rsp-mini rsp-mini-del" @click="onRemove(card.id)">删</button>
          </div>
        </div>
        <div class="rsp-card-meta">
          <span v-if="card.attempts > 0">练 {{ card.attempts }} 次 · 最佳 {{ card.bestAccuracy }}%</span>
          <span v-else>未开始</span>
          <span v-if="card.passed" class="rsp-passed">✓ 本次通过</span>
        </div>

        <!-- 进行中的背诵区 -->
        <div v-if="practicingId === card.id" class="rsp-practice">
          <div class="rsp-masked">
            <template v-for="(tok, idx) in masked.tokens" :key="idx">
              <span
                class="rsp-tok"
                :class="{ 'rsp-tok-masked': masked.maskedIndices.includes(idx) && !revealed[idx] }"
              >{{ revealed[idx] ? realTokens[idx] : tok }}</span>
            </template>
          </div>

          <div class="rsp-reveal-row">
            <button class="rsp-mini" @click="toggleReveal(idx)" v-for="(idx) in masked.maskedIndices" :key="'r'+idx">
              {{ revealed[idx] ? '👁' : '·' }}
            </button>
          </div>

          <textarea v-model="attempt" class="rsp-textarea" placeholder="凭记忆写出整篇……" rows="3"></textarea>
          <div class="rsp-practice-actions">
            <button class="rsp-btn" :disabled="!attempt.trim()" @click="submit">对答案</button>
            <button class="rsp-btn rsp-btn-ghost" @click="cancelPractice">收起</button>
          </div>

          <div v-if="lastResult" class="rsp-result">
            <div class="rsp-result-head">
              <span class="rsp-acc" :class="lastResult.correct ? 'rsp-ok' : 'rsp-bad'">{{ lastResult.accuracy }}%</span>
              <span>{{ lastResult.correct ? '达标，遮盖再深一档' : '再磨一磨' }}</span>
            </div>
            <div v-if="lastResult.wrongTokens.length" class="rsp-wrong">
              <span class="rsp-wrong-label">卡在：</span>
              <span v-for="(t, i) in lastResult.wrongTokens" :key="i" class="rsp-wrong-tok">{{ t }}</span>
            </div>
            <div v-if="lastResult.finished" class="rsp-done">🎉 已能整篇出入，顶满遮盖。</div>
          </div>
        </div>
      </div>
    </div>
    <p v-else class="rsp-empty">还没有背诵卡片。录入一段课文、诗或演讲稿，从第一遍开口开始。</p>

    <!-- 档案概览 -->
    <div class="rsp-archive">
      <h4>📈 背诵档案</h4>
      <div class="rsp-metrics">
        <div class="rsp-metric"><b>{{ ov.total }}</b><span>卡片</span></div>
        <div class="rsp-metric"><b>{{ ov.mastered }}</b><span>已背熟</span></div>
        <div class="rsp-metric"><b>{{ ov.avgBestAccuracy }}%</b><span>均最佳</span></div>
        <div class="rsp-metric"><b>{{ rhythm.passRate }}%</b><span>达标率</span></div>
      </div>
      <div class="rsp-steps">
        <div v-for="row in steps" :key="row.stepIndex" class="rsp-step">
          <span class="rsp-step-label">{{ row.label }}</span>
          <span class="rsp-step-bar"><i :style="{ width: stepPct(row.count) }"></i></span>
          <span class="rsp-step-n">{{ row.count }}</span>
        </div>
      </div>
      <div v-if="rhythm.weakTokens.length" class="rsp-weak">
        <span class="rsp-weak-label">薄弱字：</span>
        <span v-for="w in rhythm.weakTokens" :key="w.token" class="rsp-weak-tok">「{{ w.token }}」×{{ w.count }}</span>
      </div>
      <ul class="rsp-insights">
        <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useRecite, reciteOverview, reciteStepDistribution, reciteRhythm, reciteInsights,
  RECITE_STEPS,
} from '../modules/recite'
import type { ReciteCard, TextLang, MaskedResult } from '../modules/recite'

const LANGS: Array<{ key: TextLang; label: string }> = [
  { key: 'cjk', label: '中文' },
  { key: 'latin', label: '英文' },
]

const recite = useRecite()
const cards = recite.cards

const title = ref('')
const text = ref('')
const lang = ref<TextLang>('cjk')

const practicingId = ref<string | null>(null)
const attempt = ref('')
const masked = ref<MaskedResult>({ tokens: [], content: [], maskedIndices: [], totalContent: 0, coveredCount: 0 })
const realTokens = ref<string[]>([])
const revealed = ref<Record<number, boolean>>({})
const lastResult = ref<{ accuracy: number; correct: boolean; wrongTokens: string[]; finished: boolean } | null>(null)

function maskLabel(stepIndex: number): string {
  return `${Math.round(RECITE_STEPS[stepIndex] * 100)}% 遮盖`
}

function onAdd() {
  const card = recite.addCard(title.value, text.value, lang.value)
  title.value = ''
  text.value = ''
  startPractice(card)
}

function onRemove(id: string) {
  if (practicingId.value === id) practicingId.value = null
  recite.removeCard(id)
}

function startPractice(card: ReciteCard) {
  practicingId.value = card.id
  attempt.value = ''
  lastResult.value = null
  const seg = recite.segmentText(card.text, card.lang)
  masked.value = recite.maskText(seg.tokens, seg.content, RECITE_STEPS[card.stepIndex])
  realTokens.value = seg.tokens
  revealed.value = {}
}

function toggleReveal(idx: number) {
  revealed.value = { ...revealed.value, [idx]: !revealed.value[idx] }
}

function cancelPractice() {
  practicingId.value = null
  revealed.value = {}
  lastResult.value = null
}

function submit() {
  if (!practicingId.value) return
  const r = recite.submitAttempt(practicingId.value, attempt.value)
  const finalMasked = recite.reciteDisplay(
    cards.value.find((c) => c.id === practicingId.value)!
  )
  masked.value = finalMasked
  lastResult.value = { accuracy: r.accuracy, correct: r.correct, wrongTokens: r.wrongTokens, finished: r.finished }
  attempt.value = ''
  revealed.value = {}
}

// ---- 档案 ----
const ov = computed(() => reciteOverview(cards.value))
const steps = computed(() => reciteStepDistribution(cards.value))
const rhythm = computed(() => reciteRhythm(cards.value))
const insights = computed(() => reciteInsights(cards.value, 5))

function stepPct(count: number): string {
  const max = Math.max(...steps.value.map((s) => s.count), 1)
  return `${Math.round((count / max) * 100)}%`
}
</script>

<style scoped>
.rsp {
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
}
.rsp-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 14px;
}
.rsp-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--accent);
}
.rsp-sub {
  font-size: 11px;
  color: var(--text-secondary);
}
.rsp-add {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.4);
  margin-bottom: 16px;
}
.rsp-input,
.rsp-textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: rgba(var(--bg-card-rgb), 0.4);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
}
.rsp-input:focus,
.rsp-textarea:focus {
  outline: none;
  border-color: rgba(var(--accent-rgb), 0.3);
}
.rsp-lang {
  display: flex;
  gap: 6px;
}
.rsp-lang-btn {
  padding: 5px 12px;
  border-radius: 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.rsp-lang-btn.active {
  background: rgba(var(--accent-rgb), 0.12);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
}
.rsp-btn {
  padding: 8px 18px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}
.rsp-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.rsp-btn-ghost {
  background: transparent;
}
.rsp-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.rsp-card {
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: var(--bg-card);
}
.rsp-in-practice {
  border-color: rgba(var(--accent-rgb), 0.3);
}
.rsp-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.rsp-card-title {
  font-size: 14px;
  color: var(--text-bright);
  flex: 1;
}
.rsp-card-step {
  font-size: 11px;
  color: var(--accent);
  padding: 3px 8px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.08);
}
.rsp-card-actions {
  display: flex;
  gap: 4px;
}
.rsp-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 9px;
  border-radius: 5px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: transparent;
  color: var(--accent);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;

  min-height: 26px;
}
.rsp-mini-del {
  color: rgba(224, 112, 80, 0.5);
  border-color: rgba(224, 112, 80, 0.2);
}
.rsp-card-meta {
  display: flex;
  gap: 10px;
  font-size: 11px;
  color: var(--text-secondary);
  margin-top: 6px;
}
.rsp-passed {
  color: #34d399;
}
.rsp-practice {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed rgba(var(--accent-rgb), 0.15);
}
.rsp-masked {
  font-size: 16px;
  line-height: 1.9;
  letter-spacing: 0.5px;
  padding: 10px 0;
}
.rsp-tok {
  color: var(--text-bright);
}
.rsp-tok-masked {
  color: var(--text-low);
  opacity: 0.55;
}
.rsp-reveal-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}
.rsp-practice-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}
.rsp-result {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.06);
}
.rsp-result-head {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
}
.rsp-acc {
  font-size: 20px;
  font-weight: 600;
}
.rsp-ok {
  color: #34d399;
}
.rsp-bad {
  color: #f0c040;
}
.rsp-wrong {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 6px;
  font-size: 12px;
}
.rsp-wrong-label {
  color: var(--text-secondary);
}
.rsp-wrong-tok {
  color: #e07050;
}
.rsp-done {
  margin-top: 6px;
  font-size: 13px;
  color: #34d399;
}
.rsp-empty {
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
  padding: 20px 0;
}
.rsp-archive {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.1);
}
.rsp-archive h4 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
}
.rsp-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.rsp-metric {
  text-align: center;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.4);
}
.rsp-metric b {
  display: block;
  font-size: 18px;
  color: var(--accent);
}
.rsp-metric span {
  font-size: 10px;
  color: var(--text-secondary);
}
.rsp-steps {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
}
.rsp-step {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}
.rsp-step-label {
  width: 42px;
  color: var(--text-secondary);
}
.rsp-step-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}
.rsp-step-bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.5), var(--accent));
  border-radius: 3px;
}
.rsp-step-n {
  width: 20px;
  text-align: right;
  color: var(--text-low);
}
.rsp-weak {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 10px;
}
.rsp-weak-label {
  color: var(--text-secondary);
}
.rsp-weak-tok {
  color: #e07050;
}
.rsp-insights {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.rsp-insights li {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>