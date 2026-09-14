<template>
  <section class="cga-panel" aria-label="星盘档案">
    <div class="cga-head">
      <span class="cga-title">✦ 星盘档案</span>
      <span class="cga-sub">星座 · 落点 · 引力</span>
    </div>

    <!-- 星座档案 -->
    <div class="cga-block">
      <h3 class="cga-block-title">星座档案</h3>
      <div class="cga-grid">
        <div class="cga-cell"><b>{{ constellations.length }}</b><span>星座</span></div>
        <div class="cga-cell"><b>{{ starTotal }}</b><span>星点</span></div>
        <div class="cga-cell"><b>{{ activeCount }}</b><span>激活</span></div>
      </div>

      <button class="cga-btn" :disabled="discovering" @click="discover">✦ 从结晶自动生成星座</button>

      <p v-if="constellations.length === 0" class="cga-empty">
        暂无星座 · 点击上方按键，让聚集的结晶自动形成星图
      </p>
      <div v-else class="cga-list">
        <div v-for="c in constellations" :key="c.id" class="cga-row">
          <div class="cga-row-top">
            <i class="cga-dot" :style="{ background: c.lineColor }"></i>
            <span class="cga-row-name">{{ c.name }}</span>
            <span class="cga-badge" :class="c.active ? 'on' : 'off'">{{ c.active ? '已激活' : '已停用' }}</span>
          </div>
          <p v-if="c.description" class="cga-row-desc">{{ c.description }}</p>
          <div class="cga-row-meta">{{ c.starIds.length }} 颗星 · {{ fmtDate(c.createdAt) }}</div>
          <div class="cga-row-ops">
            <button class="cga-text-btn" @click="toggle(c.id)">{{ c.active ? '停用' : '激活' }}</button>
            <button class="cga-text-btn cga-del" @click="remove(c.id)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 落点足迹 -->
    <div class="cga-block">
      <h3 class="cga-block-title">落点足迹</h3>
      <p v-if="recentLandings.length === 0" class="cga-empty">
        暂无结晶落点记录 · 专注完成、结晶落定引力场时会留下足迹
      </p>
      <div v-else class="cga-list">
        <div v-for="l in recentLandings" :key="l.id" class="cga-row">
          <div class="cga-row-top">
            <i class="cga-dot" :style="{ background: l.color }"></i>
            <span class="cga-row-name">结晶落点</span>
          </div>
          <div class="cga-row-meta">{{ l.crystalId || '—' }} · {{ fmtTime(l.landedAt) }}</div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCanvasGravityEngine } from '../modules/canvas'
import type { CanvasCrystal } from '../modules/canvas'
import type { TimeCrystal } from '../types'
import { storage } from '../engine/storage'

const gravity = useCanvasGravityEngine()
const constellations = gravity.constellations
const recentLandings = gravity.recentLandings
const discovering = ref(false)

const starTotal = computed(() =>
  constellations.value.reduce((sum, c) => sum + c.starIds.length, 0),
)
const activeCount = computed(() =>
  constellations.value.filter(c => c.active).length,
)

/** 用紧致网格为结晶推算坐标，保证聚集结晶稳定聚簇成星座（自动发现） */
function buildCanvasCrystal(tc: TimeCrystal, index: number, total: number): CanvasCrystal {
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)))
  const col = index % cols
  const row = Math.floor(index / cols)
  return {
    crystal: tc,
    x: 200 + col * 60,
    y: 200 + row * 60,
    targetX: 0,
    targetY: 0,
    scale: 0.5,
    opacity: 0.7,
    floatPhase: (index * 0.7) % (Math.PI * 2),
  }
}

function discover() {
  discovering.value = true
  try {
    const crystals = storage.getCrystals().map((c, i) => buildCanvasCrystal(c, i, storage.getCrystals().length))
    gravity.discoverConstellations(crystals)
  } finally {
    discovering.value = false
  }
}

function toggle(id: string) {
  gravity.toggleConstellation(id)
}

function remove(id: string) {
  gravity.deleteConstellation(id)
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fmtTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>

<style scoped>
.cga-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  color: #e7e2d6;
  font-size: 13px;
  line-height: 1.5;
}

.cga-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.cga-title {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: 0.5px;
}
.cga-sub {
  font-size: 12px;
  color: #8f8a7d;
}

.cga-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cga-block-title {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  color: #c8aa5a;
  letter-spacing: 0.5px;
}

.cga-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.cga-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 6px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.cga-cell b {
  font-size: 18px;
  color: #e7e2d6;
}
.cga-cell span {
  font-size: 11px;
  color: #8f8a7d;
}

.cga-btn {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  color: #e7e2d6;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s;
}
.cga-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
}
.cga-btn:disabled {
  opacity: 0.5;
  cursor: default;
}

.cga-empty {
  margin: 0;
  padding: 6px 2px;
  color: #8f8a7d;
  font-size: 12px;
}

.cga-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cga-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 9px 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.03);
}
.cga-row-top {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cga-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  flex: none;
}
.cga-row-name {
  font-weight: 500;
  color: #e7e2d6;
}
.cga-badge {
  margin-left: auto;
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11px;
}
.cga-badge.on {
  background: rgba(138, 154, 122, 0.22);
  color: #a8b79a;
}
.cga-badge.off {
  background: rgba(255, 255, 255, 0.08);
  color: #8f8a7d;
}
.cga-row-desc {
  margin: 0;
  font-size: 12px;
  color: #9a9588;
}
.cga-row-meta {
  font-size: 11px;
  color: #8f8a7d;
}
.cga-row-ops {
  display: flex;
  gap: 10px;
  margin-top: 2px;
}
.cga-text-btn {
  padding: 2px 6px;
  border: none;
  background: none;
  color: #c8aa5a;
  font-size: 12px;
  cursor: pointer;
}
.cga-text-btn:hover {
  color: #e2cc8f;
}
.cga-text-btn.cga-del {
  color: #c46a5a;
}
</style>