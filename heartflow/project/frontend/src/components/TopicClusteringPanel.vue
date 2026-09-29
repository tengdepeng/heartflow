<template>
  <section class="tcl-panel" aria-label="对话主题洞察">
    <!-- 面板头 -->
    <div class="tcl-head">
      <div class="tcl-head-left">
        <span class="tcl-title">🧭 对话主题洞察</span>
        <span class="tcl-sub">{{ topics.length }} 主题 · {{ activeTopics.length }} 活跃</span>
      </div>
      <span class="tcl-badge">主题聚类 · 趋势 · 搜索</span>
    </div>

    <!-- 概览四格 -->
    <div class="tcl-stats">
      <div class="tcl-stat">
        <span class="tcl-stat-value">{{ summary.totalTopics }}</span>
        <span class="tcl-stat-label">主题总数</span>
      </div>
      <div class="tcl-stat">
        <span class="tcl-stat-value">{{ summary.activeTopics }}</span>
        <span class="tcl-stat-label">活跃主题</span>
      </div>
      <div class="tcl-stat">
        <span class="tcl-stat-value">{{ summary.hotTopics.length }}</span>
        <span class="tcl-stat-label">热点主题</span>
      </div>
      <div class="tcl-stat">
        <span class="tcl-stat-value">{{ topKeywords.length }}</span>
        <span class="tcl-stat-label">高频关键词</span>
      </div>
    </div>

    <!-- 高频关键词 -->
    <div class="tcl-block">
      <h3 class="tcl-block-title">高频关键词</h3>
      <div v-if="topKeywords.length > 0" class="tcl-keywords">
        <span v-for="k in topKeywords" :key="k.keyword" class="tcl-keyword">
          {{ k.keyword }} <em>{{ k.score }}</em>
        </span>
      </div>
      <p v-else class="tcl-empty">暂无高频关键词。</p>
    </div>

    <!-- 主题列表 -->
    <div class="tcl-block">
      <h3 class="tcl-block-title">主题</h3>
      <div v-if="topics.length > 0" class="tcl-list">
        <div v-for="t in topics" :key="t.id" class="tcl-card">
          <div class="tcl-card-head">
            <span class="tcl-card-name">{{ t.name }}</span>
            <span class="tcl-chip" :class="`tcl-chip--${trendOf(t.id)}`">{{ trendLabel(trendOf(t.id)) }}</span>
            <span class="tcl-card-count">{{ t.entryCount }} 条</span>
          </div>
          <div class="tcl-card-kws">
            <span v-for="kw in t.keywords" :key="kw" class="tcl-kw">{{ kw }}</span>
          </div>
          <div class="tcl-strength">
            <div class="tcl-strength-bar" :style="{ width: `${Math.round(t.strength * 100)}%` }"></div>
          </div>
        </div>
      </div>
      <p v-else class="tcl-empty">还没有足够的自我对话，写下一些话再回来看看主题吧。</p>
    </div>

    <!-- 趋势 -->
    <div class="tcl-block">
      <h3 class="tcl-block-title">趋势</h3>
      <div v-if="trends.length > 0" class="tcl-trends">
        <div v-for="tr in trends" :key="tr.topicId" class="tcl-trend">
          <span class="tcl-trend-name">{{ tr.topicName }}</span>
          <span class="tcl-chip" :class="`tcl-chip--${tr.direction}`">{{ trendLabel(tr.direction) }}</span>
          <span class="tcl-trend-rate">{{ changeRateText(tr.changeRate) }}</span>
        </div>
      </div>
      <p v-else class="tcl-empty">暂无趋势数据。</p>
    </div>

    <!-- 搜索 -->
    <div class="tcl-block">
      <h3 class="tcl-block-title">搜索</h3>
      <div class="tcl-search">
        <input v-model="query" type="text" placeholder="输入关键词搜索主题…" class="tcl-input" />
      </div>
      <div v-if="searchResults.length > 0" class="tcl-results">
        <div v-for="r in searchResults" :key="r.topic.id" class="tcl-result">
          <span class="tcl-result-name">{{ r.topic.name }}</span>
          <span class="tcl-result-score">相关度 {{ r.relevanceScore }}</span>
        </div>
      </div>
      <p v-else-if="query.trim()" class="tcl-empty">没有匹配的主题。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useTopicClustering } from '../modules/mirror'
import type { SelfTalk } from '../modules/self'

const props = defineProps<{ talks: SelfTalk[] }>()

const {
  topics,
  trends,
  activeTopics,
  topKeywords,
  clearEntries,
  addEntries,
  cluster,
  searchTopics,
  generateSummary,
} = useTopicClustering()

// 同步自我对话 → 聚类条目，数据变化时重新聚类
watch(
  () => props.talks,
  (list) => {
    clearEntries()
    addEntries(list.map(t => ({ text: t.text, timestamp: new Date(t.at).getTime() })))
    cluster()
  },
  { immediate: true },
)

const summary = computed(() => generateSummary())

const query = ref('')
const searchResults = computed(() => searchTopics(query.value))

const TREND_LABEL: Record<string, string> = {
  rising: '上升',
  falling: '下降',
  stable: '平稳',
  new: '新兴',
  fading: '衰退',
}

function trendLabel(d: string): string {
  return TREND_LABEL[d] ?? d
}

function trendOf(topicId: string): string {
  return trends.value.find(t => t.topicId === topicId)?.direction ?? 'stable'
}

function changeRateText(rate: number): string {
  const pct = Math.round(rate * 100)
  return pct > 0 ? `+${pct}%` : `${pct}%`
}
</script>

<style scoped>
.tcl-panel {
  background: linear-gradient(160deg, rgba(138, 154, 122, 0.10), rgba(138, 154, 122, 0.03));
  border: 1px solid rgba(138, 154, 122, 0.28);
  border-radius: 16px;
  padding: 18px 20px;
  margin-top: 16px;
  color: var(--text-primary, #e8e0d8);
}

.tcl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.tcl-head-left {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.tcl-title {
  font-size: 16px;
  font-weight: 700;
}

.tcl-sub {
  font-size: 12px;
  opacity: 0.65;
}

.tcl-badge {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.22);
  color: #8a9a7a;
}

.tcl-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.tcl-stat {
  text-align: center;
  padding: 10px 6px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(138, 154, 122, 0.18);
}

.tcl-stat-value {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: #8a9a7a;
}

.tcl-stat-label {
  font-size: 11px;
  opacity: 0.6;
  margin-top: 2px;
  display: block;
}

.tcl-block {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed rgba(138, 154, 122, 0.2);
}

.tcl-block-title {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.tcl-keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tcl-keyword {
  font-size: 12px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(240, 192, 64, 0.14);
  border: 1px solid rgba(240, 192, 64, 0.3);
  color: #d8b04a;
}

.tcl-keyword em {
  font-style: normal;
  opacity: 0.7;
  margin-left: 4px;
}

.tcl-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.tcl-card {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(138, 154, 122, 0.2);
  border-radius: 10px;
  padding: 10px 12px;
}

.tcl-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.tcl-card-name {
  font-weight: 600;
  font-size: 13px;
  flex: 1;
}

.tcl-card-count {
  font-size: 11px;
  opacity: 0.6;
}

.tcl-card-kws {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-bottom: 8px;
}

.tcl-kw {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 6px;
  background: rgba(138, 154, 122, 0.12);
  color: #8a9a7a;
}

.tcl-strength {
  height: 4px;
  border-radius: 2px;
  background: rgba(138, 154, 122, 0.15);
  overflow: hidden;
}

.tcl-strength-bar {
  height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg, #8a9a7a, #d8b04a);
}

.tcl-chip {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.18);
  color: #8a9a7a;
}

.tcl-chip--rising {
  background: rgba(138, 154, 122, 0.25);
  color: #8a9a7a;
}

.tcl-chip--falling {
  background: rgba(196, 106, 90, 0.2);
  color: #c46a5a;
}

.tcl-chip--new {
  background: rgba(240, 192, 64, 0.2);
  color: #d8b04a;
}

.tcl-chip--fading {
  background: rgba(196, 106, 90, 0.15);
  color: #c46a5a;
}

.tcl-trends {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tcl-trend {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.15);
}

.tcl-trend-name {
  flex: 1;
  font-weight: 600;
}

.tcl-trend-rate {
  font-size: 11px;
  opacity: 0.7;
}

.tcl-search {
  margin-bottom: 8px;
}

.tcl-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(138, 154, 122, 0.3);
  border-radius: 8px;
  color: inherit;
  padding: 8px 12px;
  font-size: 13px;
}

.tcl-results {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tcl-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.15);
}

.tcl-result-name {
  font-weight: 600;
}

.tcl-result-score {
  font-size: 11px;
  opacity: 0.7;
}

.tcl-empty {
  font-size: 13px;
  opacity: 0.6;
  padding: 8px 0;
}
</style>
