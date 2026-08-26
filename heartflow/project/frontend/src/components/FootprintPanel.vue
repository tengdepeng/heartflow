<template>
  <section class="fp-panel" aria-label="足迹志">
    <div class="fp-panel-head">
      <span class="fp-panel-title">📍 足迹志</span>
      <span class="fp-panel-sub">去过哪 · 标记在哪</span>
    </div>

    <!-- 概览 -->
    <div class="fp-block">
      <span class="fp-block-label">足迹概览</span>
      <div class="fp-stats">
        <div class="fp-stat"><span class="fp-stat-num">{{ stats.total }}</span><span class="fp-stat-label">足迹</span></div>
        <div class="fp-stat"><span class="fp-stat-num">{{ stats.uniqueRegions }}</span><span class="fp-stat-label">地区</span></div>
        <div class="fp-stat"><span class="fp-stat-num">{{ stats.sinceYear ?? '—' }}</span><span class="fp-stat-label">始于</span></div>
      </div>
      <div v-if="stats.byType.length" class="fp-types">
        <div v-for="t in stats.byType" :key="t.type" class="fp-type">
          <span class="fp-type-icon" :style="{ color: typeColor(t.type) }">{{ typeIcon(t.type) }}</span>
          <span class="fp-type-label">{{ typeLabel(t.type) }}</span>
          <span class="fp-type-count">{{ t.count }}</span>
        </div>
      </div>
    </div>

    <!-- 记录足迹 -->
    <div class="fp-block">
      <span class="fp-block-label">记录足迹</span>
      <div class="fp-row">
        <input v-model="form.name" class="fp-input" placeholder="地点名称" />
        <input v-model="form.region" class="fp-input" placeholder="地区（省/城市/国家）" />
      </div>
      <div class="fp-row">
        <input v-model="form.date" type="date" class="fp-input fp-date" />
        <select v-model="form.type" class="fp-select">
          <option v-for="(m, key) in VISIT_TYPE_META" :key="key" :value="key">{{ m.icon }} {{ m.label }}</option>
        </select>
        <input v-model="form.mood" class="fp-input" placeholder="心情" />
      </div>
      <div class="fp-row">
        <input v-model="form.companion" class="fp-input" placeholder="同行人" />
        <button class="fp-btn fp-btn-primary" @click="add" :disabled="!form.name.trim() || !form.region.trim() || !form.date">记录</button>
      </div>
    </div>

    <!-- 足迹清单 -->
    <div class="fp-block">
      <span class="fp-block-label">足迹清单 · {{ filtered.length }}</span>
      <div class="fp-row">
        <select v-model="typeFilter" class="fp-select">
          <option value="all">全部类型</option>
          <option v-for="(m, key) in VISIT_TYPE_META" :key="key" :value="key">{{ m.icon }} {{ m.label }}</option>
        </select>
        <input v-model="keyword" class="fp-input" placeholder="搜索名称/地区/心情/同行…" />
      </div>
      <ul v-if="filtered.length" class="fp-list">
        <li v-for="r in filtered" :key="r.id" class="fp-item">
          <span class="fp-item-icon" :style="{ color: typeColor(r.type) }">{{ typeIcon(r.type) }}</span>
          <span class="fp-item-body">
            <span class="fp-item-name">{{ r.name }}</span>
            <span class="fp-item-meta">{{ r.region }} · {{ r.date }}<template v-if="r.mood"> · {{ r.mood }}</template><template v-if="r.companion"> · 与 {{ r.companion }}</template></span>
          </span>
          <button class="fp-del" @click="remove(r.id)">×</button>
        </li>
      </ul>
      <p v-else class="fp-empty">暂无足迹记录。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useFootprint, VISIT_TYPE_META } from '../modules/footprint'
import type { VisitType } from '../modules/footprint'

const footprint = useFootprint()
const stats = computed(() => footprint.stats.value)
const records = computed(() => footprint.records.value)

const form = reactive({ name: '', region: '', date: '', type: 'sight' as VisitType, mood: '', companion: '' })
const typeFilter = ref<VisitType | 'all'>('all')
const keyword = ref('')

const filtered = computed(() => {
  let list = footprint.byType(records.value, typeFilter.value)
  list = footprint.searchFootprints(list, keyword.value)
  return footprint.sortByDate(list)
})

function add() {
  if (!form.name.trim() || !form.region.trim() || !form.date) return
  footprint.add({
    name: form.name.trim(),
    region: form.region.trim(),
    date: form.date,
    type: form.type,
    mood: form.mood.trim() || undefined,
    companion: form.companion.trim() || undefined,
  })
  form.name = ''
  form.mood = ''
  form.companion = ''
}
function remove(id: string) {
  footprint.remove(id)
}
function typeIcon(t: VisitType): string {
  return VISIT_TYPE_META[t].icon
}
function typeLabel(t: VisitType): string {
  return VISIT_TYPE_META[t].label
}
function typeColor(t: VisitType): string {
  return VISIT_TYPE_META[t].color
}
</script>

<style scoped>
.fp-panel {
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
.fp-panel-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.fp-panel-title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: rgba(240, 242, 255, 0.92);
}
.fp-panel-sub {
  font-size: 10px;
  letter-spacing: 1px;
  color: var(--text-low);
}
.fp-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.fp-block-label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-medium);
}
.fp-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.fp-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 4px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.fp-stat-num {
  font-size: 18px;
  font-weight: 600;
  color: rgba(240, 242, 255, 0.92);
}
.fp-stat-label {
  font-size: 10px;
  color: var(--text-low);
}
.fp-types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.fp-type {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  font-size: 10px;
}
.fp-type-count {
  color: var(--text-low);
}
.fp-row {
  display: flex;
  gap: 6px;
}
.fp-input {
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
.fp-input.fp-date {
  flex: 0 0 140px;
}
.fp-select {
  padding: 8px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(240, 242, 255, 0.85);
  font-size: 11px;
  font-family: inherit;
}
.fp-btn {
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
  color: rgba(240, 242, 255, 0.8);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}
.fp-btn-primary {
  background: rgba(107, 159, 196, 0.12);
  border-color: rgba(107, 159, 196, 0.3);
  color: #6b9fc4;
}
.fp-btn:disabled {
  opacity: 0.35;
  cursor: default;
}
.fp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.fp-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.fp-item-icon {
  font-size: 15px;
}
.fp-item-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.fp-item-name {
  font-size: 12px;
  color: rgba(240, 242, 255, 0.9);
}
.fp-item-meta {
  font-size: 10px;
  color: var(--text-low);
}
.fp-del {
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
.fp-del:hover {
  color: #c46a5a;
}
.fp-empty {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-low);
  text-align: center;
}
</style>
