<template>
  <section class="wa-panel" aria-label="心愿锚">
    <div class="wa-panel-head">
      <span class="wa-panel-title">🎯 心愿锚</span>
      <span class="wa-panel-sub">心愿单 · 倒计时 · 达成</span>
    </div>

    <!-- 概览 -->
    <div class="wa-block">
      <span class="wa-block-label">心愿概览</span>
      <div class="wa-stats">
        <div class="wa-stat"><span class="wa-stat-num">{{ stats.total }}</span><span class="wa-stat-label">心愿</span></div>
        <div class="wa-stat"><span class="wa-stat-num">{{ stats.active }}</span><span class="wa-stat-label">进行中</span></div>
        <div class="wa-stat"><span class="wa-stat-num">{{ stats.overdue }}</span><span class="wa-stat-label">已过期</span></div>
        <div class="wa-stat"><span class="wa-stat-num">{{ stats.done }}</span><span class="wa-stat-label">已达成</span></div>
      </div>
    </div>

    <!-- 立新心愿 -->
    <div class="wa-block">
      <span class="wa-block-label">立新心愿</span>
      <div class="wa-row">
        <input v-model="form.title" class="wa-input" placeholder="心愿内容" @keyup.enter="create" />
        <input v-model="form.targetDate" type="date" class="wa-input wa-date" />
        <button class="wa-btn" @click="recommend">推荐</button>
      </div>
      <input v-model="form.note" class="wa-input" placeholder="备注（可选）" />
      <button class="wa-btn wa-btn-primary" @click="create" :disabled="!form.title.trim() || !form.targetDate">立愿</button>
    </div>

    <!-- 心愿清单 -->
    <div class="wa-block">
      <span class="wa-block-label">心愿清单 · {{ views.length }}</span>
      <ul v-if="views.length" class="wa-list">
        <li v-for="w in views" :key="w.id" class="wa-item" :class="{ done: w.done }">
          <button class="wa-toggle" :class="{ checked: w.done }" @click="toggle(w.id)">{{ w.done ? '✓' : '' }}</button>
          <span class="wa-item-body">
            <span class="wa-item-title">{{ w.title }}</span>
            <span class="wa-item-meta">
              {{ fmtDate(w.targetDate) }} · {{ w.daysLeft >= 0 ? `剩 ${w.daysLeft} 天` : `已过 ${-w.daysLeft} 天` }}
              <span v-if="w.note"> · {{ w.note }}</span>
            </span>
          </span>
          <span class="wa-badge" :style="{ color: urgencyColor(w.urgency), borderColor: urgencyColor(w.urgency) + '55' }">{{ w.urgencyLabel }}</span>
          <button class="wa-del" @click="remove(w.id)">×</button>
        </li>
      </ul>
      <p v-else class="wa-empty">尚无心愿。立一个想达成的事，给它一个日期。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useWishAnchor, URGENCY_META, recommendTargetDate } from '../modules/wish-anchor'
import type { WishUrgency } from '../modules/wish-anchor'

const wish = useWishAnchor()
const views = computed(() => wish.views.value)
const stats = computed(() => wish.stats.value)

const form = reactive({ title: '', targetDate: '', note: '' })

function recommend() {
  form.targetDate = recommendTargetDate()
}
function create() {
  if (!form.title.trim() || !form.targetDate) return
  wish.create(form.title, form.targetDate, form.note)
  form.title = ''
  form.note = ''
}
function toggle(id: string) {
  wish.toggleDone(id)
}
function remove(id: string) {
  wish.remove(id)
}
function urgencyColor(u: WishUrgency): string {
  return URGENCY_META[u].color
}
function fmtDate(d: string): string {
  const [y, m, day] = d.split('-')
  return `${y}.${m}.${day}`
}
</script>

<style scoped>
.wa-panel {
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
.wa-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.wa-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.wa-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.wa-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.wa-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.wa-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.wa-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.wa-stat-num {
  font-size: 18px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.92);
}
.wa-stat-label {
  font-size: 10px;
  color: var(--text-low);
}
.wa-row {
  display: flex;
  gap: 6px;
}
.wa-input {
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
.wa-input.wa-date {
  flex: 0 0 140px;
}
.wa-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.wa-btn-primary {
  background: rgba(240, 192, 64, 0.12);
  border-color: rgba(240, 192, 64, 0.3);
  color: #f0c040;
}
.wa-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.wa-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.wa-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.wa-item.done {
  opacity: 0.55;
}
.wa-toggle {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: transparent;
  color: #8a9a7a;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}
.wa-toggle.checked {
  background: rgba(138, 154, 122, 0.25);
  border-color: #8a9a7a;
}
.wa-item-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.wa-item-title {
  font-size: 12px;
  color: rgba(240, 242, 255, 0.9);
}
.wa-item-meta {
  font-size: 10px;
  color: var(--text-low);
}
.wa-badge {
  font-size: 9px;
  padding: 2px 8px;
  border-radius: 10px;
  border: 1px solid;
  white-space: nowrap;
}
.wa-del {
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
.wa-del:hover {
  color: #c46a5a;
}
.wa-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-low);
  text-align: center;
}
</style>
