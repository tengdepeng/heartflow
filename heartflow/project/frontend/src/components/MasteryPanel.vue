<template>
  <section class="my-panel" aria-label="掌握度">
    <div class="my-panel-head">
      <span class="my-panel-title">🌳 掌握度</span>
      <span class="my-panel-sub">知识点 · 自我测验 · 三态</span>
    </div>

    <!-- 概览 -->
    <div class="my-block">
      <span class="my-block-label">掌握概览</span>
      <div class="my-stats">
        <div class="my-stat"><span class="my-stat-num">{{ stats.total }}</span><span class="my-stat-label">知识点</span></div>
        <div class="my-stat"><span class="my-stat-num">{{ stats.mastered }}</span><span class="my-stat-label">已通晓</span></div>
        <div class="my-stat"><span class="my-stat-num">{{ stats.learning }}</span><span class="my-stat-label">练习中</span></div>
        <div class="my-stat"><span class="my-stat-num">{{ stats.average }}</span><span class="my-stat-label">平均掌握</span></div>
      </div>
    </div>

    <!-- 添加知识点 -->
    <div class="my-block">
      <span class="my-block-label">添加知识点</span>
      <div class="my-row">
        <input v-model="form.topic" class="my-input" placeholder="知识点名称" @keyup.enter="add" />
        <select v-model="form.difficulty" class="my-select">
          <option :value="1">普通</option>
          <option :value="1.5">较难</option>
          <option :value="2">很难</option>
        </select>
        <button class="my-btn my-btn-primary" @click="add" :disabled="!form.topic.trim()">添加</button>
      </div>
    </div>

    <!-- 知识点清单（按薄弱优先） -->
    <div class="my-block">
      <span class="my-block-label">知识点清单 · 薄弱优先</span>
      <ul v-if="sorted.length" class="my-list">
        <li v-for="i in sorted" :key="i.id" class="my-item">
          <span class="my-item-icon" :style="{ color: stateColor(i.confidence) }">{{ stateIcon(i.confidence) }}</span>
          <span class="my-item-body">
            <span class="my-item-head">
              <span class="my-item-topic">{{ i.topic }}</span>
              <span class="my-chip" :style="{ color: stateColor(i.confidence) }">{{ stateLabel(i.confidence) }}</span>
            </span>
            <div class="my-bar-wrap"><div class="my-bar" :style="{ width: i.confidence + '%', background: stateColor(i.confidence) }"></div></div>
            <span class="my-item-meta">掌握 {{ i.confidence }}% · 练习 {{ i.attempts }} 次<template v-if="i.lastScore !== undefined"> · 上次 {{ i.lastScore }} 分</template></span>
          </span>
          <span class="my-score-row">
            <input v-model.number="scoreInput[i.id]" type="number" min="0" max="100" class="my-input my-score" placeholder="0-100" />
            <button class="my-btn my-btn-sm" @click="record(i.id)" :disabled="scoreInput[i.id] === undefined || scoreInput[i.id] === null">记录</button>
          </span>
          <button class="my-del" @click="remove(i.id)">×</button>
        </li>
      </ul>
      <p v-else class="my-empty">暂无知识点。添加一个想掌握的主题。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useMastery, MASTERY_STATE_META } from '../modules/mastery'

const mastery = useMastery()
const stats = computed(() => mastery.stats.value)
const sorted = computed(() => mastery.sorted.value)

const form = reactive({ topic: '', difficulty: 1 })
const scoreInput = reactive<Record<string, number | undefined>>({})

function add() {
  if (!form.topic.trim()) return
  mastery.addItem(form.topic, form.difficulty)
  form.topic = ''
  form.difficulty = 1
}
function remove(id: string) {
  mastery.removeItem(id)
  delete scoreInput[id]
}
function record(id: string) {
  const s = scoreInput[id]
  if (s === undefined || s === null) return
  mastery.recordScore(id, Math.min(100, Math.max(0, s)))
  delete scoreInput[id]
}
function stateOf(confidence: number) {
  return mastery.stateFor(confidence)
}
function stateLabel(confidence: number): string {
  return MASTERY_STATE_META[stateOf(confidence)].label
}
function stateIcon(confidence: number): string {
  return MASTERY_STATE_META[stateOf(confidence)].icon
}
function stateColor(confidence: number): string {
  return MASTERY_STATE_META[stateOf(confidence)].color
}
</script>

<style scoped>
.my-panel {
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
.my-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.my-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.my-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.my-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.my-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.my-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.my-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.my-stat-num {
  font-size: 18px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.92);
}
.my-stat-label {
  font-size: 10px;
  color: var(--text-low);
}
.my-row {
  display: flex;
  gap: 6px;
}
.my-input {
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
.my-input.my-score {
  width: 56px;
  flex: 0 0 56px;
  padding: 5px 6px;
  font-size: 11px;
}
.my-select {
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 11px;
  font-family: inherit;
}
.my-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.my-btn-primary {
  background: rgba(138, 154, 122, 0.12);
  border-color: rgba(138, 154, 122, 0.3);
  color: #8a9a7a;
}
.my-btn-sm {
  padding: 5px 10px;
  font-size: 11px;
}
.my-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.my-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.my-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.my-item-icon {
  font-size: 15px;
  flex-shrink: 0;
}
.my-item-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.my-item-head {
  display: flex;
  align-items: center;
  gap: 6px;
}
.my-item-topic {
  font-size: 12px;
  color: rgba(240, 242, 255, 0.9);
}
.my-chip {
  font-size: 9px;
  padding: 1px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.05);
}
.my-bar-wrap {
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
  overflow: hidden;
}
.my-bar {
  height: 100%;
  border-radius: 3px;
}
.my-item-meta {
  font-size: 10px;
  color: var(--text-low);
}
.my-score-row {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.my-del {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(255, 255, 255, 0.25);
  cursor: pointer;
  font-size: 13px;
  flex-shrink: 0;
}
.my-del:hover {
  color: #c46a5a;
}
.my-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-low);
  text-align: center;
}
</style>
