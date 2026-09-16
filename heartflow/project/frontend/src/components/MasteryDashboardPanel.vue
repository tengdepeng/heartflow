<template>
  <section class="mdp">
    <div class="mdp-head">
      <span class="mdp-title">🌳 掌握度</span>
      <span class="mdp-sub">Khan 式知识掌握追踪 · 按自己的节奏推进</span>
    </div>

    <!-- 新增知识点 -->
    <div class="mdp-add">
      <input v-model="topic" class="mdp-input" placeholder="记下一个正在琢磨的概念……" @keyup.enter="onAdd" />
      <input v-model.number="difficulty" class="mdp-input mdp-diff" type="number" min="1" max="5" title="难度 1-5" />
      <button class="mdp-btn" :disabled="!topic.trim()" @click="onAdd">收录</button>
    </div>

    <!-- 知识点列表（待加强优先） -->
    <div v-if="items.length" class="mdp-list">
      <div v-for="row in sorted" :key="row.id" class="mdp-item" :class="`mdp-${stateOf(row.confidence)}`">
        <div class="mdp-item-head">
          <span class="mdp-topic">{{ row.topic }}</span>
          <span class="mdp-conf">{{ row.confidence }}</span>
          <span class="mdp-state">{{ stateLabel(row.confidence) }}</span>
          <div class="mdp-item-actions">
            <button class="mdp-mini" @click="score(row.id, 100)">通</button>
            <button class="mdp-mini" @click="score(row.id, 60)">半</button>
            <button class="mdp-mini" @click="score(row.id, 20)">迷</button>
            <button class="mdp-mini mdp-mini-del" @click="onRemove(row.id)">删</button>
          </div>
        </div>
        <div class="mdp-bar"><i :style="{ width: row.confidence + '%' }"></i></div>
        <div class="mdp-meta">
          <span>练 {{ row.attempts }} 次 · 难度 ×{{ row.difficulty }}</span>
          <span v-if="row.lastScore !== undefined">最近 {{ row.lastScore }}</span>
        </div>
      </div>
    </div>
    <p v-else class="mdp-empty">还没有知识点。记下一个概念，让掌握度随练习生长。</p>

    <!-- 档案 -->
    <div class="mdp-archive">
      <h4>📊 掌握档案</h4>
      <div class="mdp-metrics">
        <div class="mdp-metric"><b>{{ ov.total }}</b><span>知识点</span></div>
        <div class="mdp-metric"><b>{{ ov.mastered }}</b><span>已通晓</span></div>
        <div class="mdp-metric"><b>{{ ov.avgConfidence }}</b><span>平均掌握</span></div>
        <div class="mdp-metric"><b>{{ ov.masteryRate }}%</b><span>掌握率</span></div>
      </div>
      <div class="mdp-dist">
        <div v-for="row in dist" :key="row.state" class="mdp-dist-row">
          <span class="mdp-dist-ic">{{ row.icon }}</span>
          <span class="mdp-dist-label">{{ row.label }}</span>
          <span class="mdp-dist-bar"><i :style="{ width: distPct(row.count), background: row.color }"></i></span>
          <span class="mdp-dist-n">{{ row.count }}</span>
        </div>
      </div>
      <div v-if="weak.length" class="mdp-weak">
        <span class="mdp-weak-label">待回炉：</span>
        <span v-for="w in weak" :key="w.item.id" class="mdp-weak-tok">{{ w.item.topic }}</span>
      </div>
      <div class="mdp-rhythm">
        <span>近 7 天练习 <b>{{ rhythm.weeklyAttempts }}</b> 次</span>
        <span v-if="rhythm.streakDays >= 1">· 连续 <b>{{ rhythm.streakDays }}</b> 天</span>
        <span>· 累计 <b>{{ rhythm.activeDays }}</b> 天</span>
      </div>
      <ul class="mdp-insights">
        <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  useMastery, masteryOverview, masteryStateDistribution, weakList, masteryRhythm, masteryInsights,
  MASTERY_STATE_META,
} from '../modules/mastery'

const mastery = useMastery()
const items = mastery.items

const topic = ref('')
const difficulty = ref(1)

function onAdd() {
  if (!topic.value.trim()) return
  mastery.addItem(topic.value, Math.min(5, Math.max(1, difficulty.value || 1)))
  topic.value = ''
  difficulty.value = 1
}

function onRemove(id: string) {
  mastery.removeItem(id)
}

function score(id: string, s: number) {
  mastery.recordScore(id, s)
}

const stateOf = (conf: number) => mastery.stateFor(conf)
function stateLabel(conf: number): string {
  return MASTERY_STATE_META[mastery.stateFor(conf)].label
}
const sorted = computed(() => mastery.sorted.value)

// ---- 档案 ----
const ov = computed(() => masteryOverview(items.value))
const dist = computed(() => masteryStateDistribution(items.value))
const weak = computed(() => weakList(items.value).slice(0, 4))
const rhythm = computed(() => masteryRhythm(items.value))
const insights = computed(() => masteryInsights(items.value, undefined, 5))

function distPct(count: number): string {
  const max = Math.max(...dist.value.map((d) => d.count), 1)
  return `${Math.round((count / max) * 100)}%`
}
</script>

<style scoped>
.mdp {
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 14px;
  padding: 20px;
  margin-bottom: 16px;
}
.mdp-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 14px;
}
.mdp-title {
  font-size: 15px;
  font-weight: 500;
  color: var(--accent);
}
.mdp-sub {
  font-size: 11px;
  color: var(--text-secondary);
}
.mdp-add {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: rgba(var(--bg-card-rgb), 0.4);
  margin-bottom: 16px;
}
.mdp-input {
  flex: 1;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.14);
  background: rgba(var(--bg-card-rgb), 0.4);
  color: var(--text-high);
  font-size: 13px;
  font-family: inherit;
}
.mdp-diff {
  flex: 0 0 60px;
}
.mdp-input:focus {
  outline: none;
  border-color: rgba(var(--accent-rgb), 0.3);
}
.mdp-btn {
  padding: 8px 16px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
}
.mdp-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
.mdp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 6px;
}
.mdp-item {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  background: var(--bg-card);
}
.mdp-item-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mdp-topic {
  flex: 1;
  font-size: 14px;
  color: var(--text-bright);
}
.mdp-conf {
  font-size: 15px;
  font-weight: 600;
  color: var(--accent);
}
.mdp-state {
  font-size: 11px;
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.06);
}
.mdp-new .mdp-conf { color: #9ca3af; }
.mdp-learning .mdp-conf { color: #f0c040; }
.mdp-mastered .mdp-conf { color: #34d399; }
.mdp-item-actions {
  display: flex;
  gap: 3px;
}
.mdp-mini {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  padding: 3px 8px;
  border-radius: 5px;
  border: 1px solid rgba(var(--accent-rgb), 0.15);
  background: transparent;
  color: var(--accent);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;

  min-height: 26px;
}
.mdp-mini-del {
  color: rgba(224, 112, 80, 0.5);
  border-color: rgba(224, 112, 80, 0.2);
}
.mdp-bar {
  height: 5px;
  border-radius: 3px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
  margin: 8px 0 4px;
}
.mdp-bar i {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, rgba(var(--accent-rgb), 0.4), var(--accent));
  border-radius: 3px;
  transition: width 0.3s;
}
.mdp-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-secondary);
}
.mdp-empty {
  text-align: center;
  color: var(--text-secondary);
  font-size: 13px;
  padding: 18px 0;
}
.mdp-archive {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.1);
}
.mdp-archive h4 {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 500;
  color: var(--accent);
}
.mdp-metrics {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}
.mdp-metric {
  text-align: center;
  padding: 8px 4px;
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.4);
}
.mdp-metric b {
  display: block;
  font-size: 18px;
  color: var(--accent);
}
.mdp-metric span {
  font-size: 10px;
  color: var(--text-secondary);
}
.mdp-dist {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 10px;
}
.mdp-dist-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
}
.mdp-dist-ic {
  width: 18px;
}
.mdp-dist-label {
  width: 52px;
  color: var(--text-secondary);
}
.mdp-dist-bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: rgba(var(--accent-rgb), 0.07);
  overflow: hidden;
}
.mdp-dist-bar i {
  display: block;
  height: 100%;
  border-radius: 3px;
}
.mdp-dist-n {
  width: 20px;
  text-align: right;
  color: var(--text-low);
}
.mdp-weak {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 12px;
  margin-bottom: 8px;
}
.mdp-weak-label {
  color: var(--text-secondary);
}
.mdp-weak-tok {
  color: #f0c040;
}
.mdp-rhythm {
  font-size: 11px;
  color: var(--text-secondary);
  margin-bottom: 10px;
}
.mdp-rhythm b {
  color: var(--accent);
}
.mdp-insights {
  margin: 0;
  padding-left: 18px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.mdp-insights li {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}
</style>