<script setup lang="ts">
import { computed } from 'vue'
import {
  knowledgeOverview,
  knowledgeGraphShape,
  importOverview,
  knowledgeInsights,
} from '../modules/knowledge'
import type { KNode, ImportSource } from '../modules/knowledge'

const props = defineProps<{ nodes: KNode[]; sources: ImportSource[] }>()

const ov = computed(() => knowledgeOverview(props.nodes))
const shape = computed(() => knowledgeGraphShape(props.nodes))
const imp = computed(() => importOverview(props.sources, Date.now()))
const insights = computed(() => knowledgeInsights(ov.value, shape.value, imp.value))

const empty = computed(() => props.nodes.length === 0)
</script>

<template>
  <section class="kap-panel" data-enter aria-label="知识档案">
    <header class="kap-head">
      <span class="kap-title">📚 知识档案</span>
      <span class="kap-sub">档案概览 · 图谱形状 · 导入来源 · 温和洞察</span>
    </header>

    <div v-if="empty" class="kap-empty">
      <span class="kap-empty-icon">🌱</span>
      <p v-if="insights.length">{{ insights[0].text }}</p>
      <p v-else>知识塔还是空的。从导入一本摘录或记下一条初识开始。</p>
    </div>

    <template v-else>
      <!-- 档案概览 -->
      <div class="kap-card">
        <span class="kap-card-t">档案概览</span>
        <div class="kap-ov-grid">
          <div class="kap-ov-cell"><span>知识节点</span><b>{{ ov.nodeCount }}</b></div>
          <div class="kap-ov-cell"><span>已相连</span><b>{{ ov.linkedNodeCount }}</b></div>
          <div class="kap-ov-cell"><span>链接边</span><b>{{ ov.edgeCount }}</b></div>
          <div class="kap-ov-cell"><span>分类数</span><b>{{ ov.categoryCount }}</b></div>
          <div class="kap-ov-cell"><span>平均度数</span><b>{{ ov.avgDegree }}</b></div>
        </div>
        <div v-if="ov.categories.length" class="kap-cats">
          <span v-for="c in ov.categories" :key="c.cat" class="kap-cat">{{ c.label }} · {{ c.count }}</span>
        </div>
      </div>

      <!-- 图谱形状 -->
      <div class="kap-card">
        <span class="kap-card-t">图谱形状</span>
        <div class="kap-shape-grid">
          <div class="kap-shape-cell"><span>连通率</span><b>{{ shape.connectivity }}%</b></div>
          <div class="kap-shape-cell"><span>孤立节点</span><b>{{ shape.isolated }}</b></div>
          <div class="kap-shape-cell"><span>密度</span><b>{{ shape.density }}</b></div>
        </div>
        <div v-if="shape.hubs.length && shape.hubs[0].degree > 0" class="kap-hubs">
          <span class="kap-hub-label">枢纽节点</span>
          <span v-for="h in shape.hubs" :key="h.id" class="kap-hub">{{ h.title }} · {{ h.degree }}</span>
        </div>
      </div>

      <!-- 导入来源 -->
      <div v-if="imp.total > 0" class="kap-card">
        <span class="kap-card-t">导入来源</span>
        <div class="kap-imp-grid">
          <div class="kap-imp-cell"><span>总导入</span><b>{{ imp.total }}</b></div>
          <div class="kap-imp-cell"><span>近7天</span><b>{{ imp.recent7 }}</b></div>
        </div>
        <div class="kap-row-list">
          <div v-for="t in imp.byType" :key="t.type" class="kap-row">
            <span class="kap-row-label">{{ t.icon }} {{ t.label }}</span>
            <div class="kap-row-track"><div class="kap-row-fill" :style="{ width: Math.round((t.count / imp.total) * 100) + '%' }"></div></div>
            <span class="kap-row-meta">{{ t.count }}</span>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <div v-if="insights.length" class="kap-card">
        <span class="kap-card-t">温和洞察</span>
        <ul class="kap-insights">
          <li v-for="(ins, i) in insights" :key="i">✦ {{ ins.text }}</li>
        </ul>
      </div>
    </template>
  </section>
</template>

<style scoped>
.kap-panel {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0 auto 24px;
  max-width: 880px;
  width: 100%;
  padding: 18px 18px 20px;
  border-radius: 16px;
  background: rgba(122, 138, 184, 0.05);
  border: 1px solid rgba(122, 138, 184, 0.12);
}
.kap-head {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.kap-title {
  font-size: 16px;
  font-weight: 500;
  letter-spacing: 2px;
  color: #d8dcff;
}
.kap-sub {
  font-size: 11px;
  color: rgba(122, 138, 184, 0.55);
  letter-spacing: 1px;
}
.kap-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 0;
  color: rgba(236, 238, 252, 0.3);
}
.kap-empty-icon {
  font-size: 26px;
  opacity: 0.5;
}
.kap-empty p {
  font-size: 12px;
  line-height: 1.7;
  text-align: center;
  margin: 0;
  max-width: 440px;
}
.kap-card {
  padding: 14px;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid rgba(122, 138, 184, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex: 1;
}
.kap-card-t {
  font-size: 12px;
  font-weight: 500;
  color: rgba(122, 138, 184, 0.6);
  letter-spacing: 1px;
}
.kap-ov-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
}
@media (max-width: 600px) {
  .kap-ov-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
.kap-ov-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(122, 138, 184, 0.06);
}
.kap-ov-cell span {
  font-size: 10px;
  color: rgba(236, 238, 252, 0.45);
}
.kap-ov-cell b {
  font-size: 20px;
  font-weight: 600;
  color: #d8dcff;
  line-height: 1.1;
}
.kap-cats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.kap-cat {
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(122, 138, 184, 0.12);
  color: rgba(216, 220, 255, 0.75);
}
.kap-shape-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
@media (max-width: 600px) {
  .kap-shape-grid {
    grid-template-columns: 1fr;
  }
}
.kap-shape-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(122, 138, 184, 0.06);
}
.kap-shape-cell span {
  font-size: 10px;
  color: rgba(236, 238, 252, 0.45);
}
.kap-shape-cell b {
  font-size: 20px;
  font-weight: 600;
  color: #d8dcff;
  line-height: 1.1;
}
.kap-hubs {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.kap-hub-label {
  font-size: 11px;
  color: rgba(122, 138, 184, 0.55);
}
.kap-hub {
  font-size: 11px;
  padding: 2px 9px;
  border-radius: 999px;
  background: rgba(122, 138, 184, 0.12);
  color: rgba(216, 220, 255, 0.75);
}
.kap-imp-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.kap-imp-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(122, 138, 184, 0.06);
}
.kap-imp-cell span {
  font-size: 10px;
  color: rgba(236, 238, 252, 0.45);
}
.kap-imp-cell b {
  font-size: 18px;
  font-weight: 600;
  color: #d8dcff;
  line-height: 1.1;
}
.kap-row-list {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.kap-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.kap-row-label {
  width: 90px;
  flex-shrink: 0;
  font-size: 12px;
  color: rgba(236, 238, 252, 0.65);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.kap-row-track {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: var(--bg-card);
  overflow: hidden;
}
.kap-row-fill {
  height: 100%;
  border-radius: 999px;
  min-width: 4px;
  background: rgba(122, 138, 184, 0.55);
}
.kap-row-meta {
  width: 40px;
  text-align: right;
  flex-shrink: 0;
  font-size: 11px;
  color: rgba(236, 238, 252, 0.4);
}
.kap-insights {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.kap-insights li {
  font-size: 12px;
  line-height: 1.7;
  color: rgba(236, 238, 252, 0.55);
}
</style>