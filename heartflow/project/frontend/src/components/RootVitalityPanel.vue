<template>
  <section class="rvt" data-test="root-vitality-panel" aria-label="文明根系·生命力栽培">
    <header class="rvt-head">
      <span class="rvt-title">🌱 根系生命力</span>
      <span class="rvt-badge" data-test="rvt-badge">共 {{ board.total }} 条 · 均值 {{ board.avgVitality }}</span>
    </header>

    <!-- 培育总览 -->
    <div class="rvt-card" data-test="rvt-overview">
      <span class="rvt-card-t">🌿 培育总览</span>
      <div class="rvt-stage-row">
        <div v-for="s in board.byStage" :key="s.stage" class="rvt-stage" :data-test="`rvt-stage-${s.stage}`">
          <span class="rvt-stage-emoji">{{ s.emoji }}</span>
          <span class="rvt-stage-count">{{ s.count }}</span>
          <span class="rvt-stage-label">{{ s.label }}</span>
        </div>
      </div>
      <div class="rvt-stage-bar">
        <div
          v-for="s in board.byStage"
          :key="s.stage"
          class="rvt-stage-seg"
          :style="{ width: stagePct(s.count) }"
          :title="`${s.label} ${s.count}`"
        ></div>
      </div>
      <p v-if="board.total === 0" class="rvt-empty">
        文明根系还是空的。把技艺、仪式与民俗记下来，它们会随实践而生长。
      </p>
    </div>

    <!-- 枝繁叶茂 -->
    <div v-if="board.thriving.length" class="rvt-card" data-test="rvt-thriving">
      <span class="rvt-card-t">🌳 枝繁叶茂 · {{ board.thriving.length }}</span>
      <div v-for="e in board.thriving" :key="e.id" class="rvt-row">
        <span class="rvt-row-name">{{ e.name }}</span>
        <span class="rvt-row-vitality">{{ vitality(e) }}</span>
      </div>
    </div>

    <!-- 凋零守望 -->
    <div v-if="board.withering.length" class="rvt-card rvt-card--warn" data-test="rvt-withering">
      <span class="rvt-card-t">🍂 凋零守望 · {{ board.withering.length }}</span>
      <div v-for="e in board.withering" :key="e.id" class="rvt-row">
        <span class="rvt-row-name">
          {{ e.name }}
          <span v-if="e.endangered" class="rvt-endangered">濒危</span>
        </span>
        <span class="rvt-row-vitality rvt-row-vitality--low">{{ vitality(e) }}</span>
      </div>
    </div>

    <!-- 此刻浇灌 -->
    <div v-if="board.needNurture.length" class="rvt-card" data-test="rvt-nurture">
      <span class="rvt-card-t">💧 此刻浇灌 · {{ board.needNurture.length }}</span>
      <div v-for="e in board.needNurture" :key="e.id" class="rvt-row">
        <span class="rvt-row-name">{{ e.name }}</span>
        <span class="rvt-row-meta">{{ dormantDays(e) }} 天未实践</span>
      </div>
    </div>

    <!-- 岁时关联 -->
    <div v-if="terms.length && termHits.length" class="rvt-card" data-test="rvt-terms">
      <span class="rvt-card-t">⏳ 今日岁时关联 · {{ termHits.length }}</span>
      <div v-for="e in termHits" :key="e.id" class="rvt-row">
        <span class="rvt-row-name">{{ e.name }}</span>
        <span class="rvt-row-meta">{{ terms.join(' / ') }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  cultivate,
  vitalityScore,
  syntaxTermLink,
} from '../modules/traditions/root-vitality'
import type { FolkloreEntry } from '../modules/traditions/types'

const props = defineProps<{
  entries: FolkloreEntry[]
  terms?: string[]
}>()

const terms = computed(() => props.terms ?? [])

const board = computed(() => cultivate(props.entries))

function stagePct(count: number): string {
  const total = board.value.total
  if (!total) return '0%'
  return `${Math.round((count / total) * 100)}%`
}

function vitality(entry: FolkloreEntry): number {
  return vitalityScore(entry)
}

function dormantDays(entry: FolkloreEntry): number {
  const anchor = entry.lastPracticedAt || entry.recordedAt
  return Math.max(0, Math.floor((Date.now() - new Date(anchor).getTime()) / 86400000))
}

const termHits = computed(() => {
  if (!terms.value.length) return []
  return props.entries.filter((e) => syntaxTermLink(e, terms.value))
})
</script>

<style scoped>
.rvt {
  display: flex;
  flex-direction: column;
  gap: 14px;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 18px;
}
.rvt-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.rvt-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--text-strong, #e8e6e1);
}
.rvt-badge {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: var(--text-soft, #c9c5bc);
}
.rvt-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.07);
}
.rvt-card--warn {
  border-color: rgba(196, 106, 90, 0.35);
}
.rvt-card-t {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.06em;
  opacity: 0.75;
}
.rvt-stage-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
}
.rvt-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.rvt-stage-emoji {
  font-size: 18px;
}
.rvt-stage-count {
  font-size: 16px;
  font-weight: 700;
}
.rvt-stage-label {
  font-size: 11px;
  opacity: 0.65;
}
.rvt-stage-bar {
  display: flex;
  gap: 2px;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.06);
}
.rvt-stage-seg {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #8a9a7a, #b8c89a);
}
.rvt-empty {
  font-size: 12px;
  opacity: 0.7;
  margin: 0;
}
.rvt-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
}
.rvt-row-name {
  opacity: 0.92;
}
.rvt-endangered {
  margin-left: 6px;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(196, 106, 90, 0.2);
  color: #d08a7a;
}
.rvt-row-vitality {
  font-weight: 700;
  color: #a8b898;
}
.rvt-row-vitality--low {
  color: #d08a7a;
}
.rvt-row-meta {
  opacity: 0.6;
}
</style>
