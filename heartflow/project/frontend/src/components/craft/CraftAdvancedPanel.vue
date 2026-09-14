<template>
  <section class="craft-section">
    <h2 class="section-label">
      <span class="section-label-icon">⚗️</span>
      高级工坊
    </h2>
    <p class="section-desc">创作分析、灵感追踪与版本留档，见证作品进化的每一刻。</p>

    <!-- 分析概览 -->
    <div class="stats-overview mat-stats">
      <div class="stat-card">
        <span class="stat-value">{{ analytics.totalWorks }}</span>
        <span class="stat-label">总作品</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ analytics.completedWorks }}</span>
        <span class="stat-label">已完成</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ analytics.activeWorks }}</span>
        <span class="stat-label">创作中</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ analytics.avgEvolution }}%</span>
        <span class="stat-label">平均进化</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ analytics.monthlyCreations }}</span>
        <span class="stat-label">本月新作</span>
      </div>
    </div>

    <!-- 类型分布 -->
    <div v-if="analytics.typeDistribution.length > 0" class="adv-block">
      <h3 class="mat-subtitle">类型分布</h3>
      <div v-for="d in analytics.typeDistribution" :key="d.type" class="adv-bar-row">
        <span class="adv-bar-label">{{ TYPE_LABEL[d.type] }}</span>
        <div class="adv-bar-track">
          <div class="adv-bar-fill" :style="{ width: typePct(d.count) + '%' }"></div>
        </div>
        <span class="adv-bar-value">{{ d.count }}</span>
      </div>
    </div>

    <!-- 月度趋势 -->
    <div v-if="analytics.monthlyTrend.length > 0" class="adv-block">
      <h3 class="mat-subtitle">月度创作趋势</h3>
      <div class="adv-trend">
        <div v-for="t in analytics.monthlyTrend" :key="t.month" class="adv-trend-col">
          <div
            class="adv-trend-bar"
            :style="{ height: trendHeight(t.created) + '%' }"
            :title="`${t.month} · 创作 ${t.created} · 完成 ${t.completed}`"
          ></div>
          <span class="adv-trend-month">{{ t.month.slice(5) }}</span>
        </div>
      </div>
    </div>

    <!-- 灵感追踪 -->
    <div class="adv-block">
      <h3 class="mat-subtitle">灵感追踪</h3>
      <div class="adv-inspire-form">
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">标题</label>
            <input v-model="inspireForm.title" class="form-input" type="text" placeholder="灵感标题" maxlength="30" />
          </div>
          <div class="form-group">
            <label class="form-label">来源</label>
            <input v-model="inspireForm.source" class="form-input" type="text" placeholder="来源（阅读/梦境/对话…）" maxlength="20" />
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">内容</label>
          <textarea v-model="inspireForm.content" class="form-textarea" placeholder="灵感内容…"></textarea>
        </div>
        <button
          class="craft-btn craft-btn--primary"
          type="button"
          :disabled="!inspireForm.title.trim()"
          @click="handleAddInspiration"
        >
          记录灵感
        </button>
      </div>

      <div v-if="inspirations.length === 0" class="craft-empty">
        <span class="craft-empty-icon">💡</span>
        <span class="craft-empty-text">还没有记录灵感</span>
      </div>
      <div v-else class="adv-inspire-list">
        <div
          v-for="insp in sortedInspirations"
          :key="insp.id"
          class="adv-inspire-card"
          :style="{ borderLeftColor: INSPIRE_STATUS_META[insp.status].color }"
        >
          <div class="adv-inspire-header">
            <span class="adv-inspire-title">{{ insp.title }}</span>
            <span
              class="adv-inspire-status"
              :style="{
                color: INSPIRE_STATUS_META[insp.status].color,
                borderColor: INSPIRE_STATUS_META[insp.status].color + '44',
                background: INSPIRE_STATUS_META[insp.status].color + '14',
              }"
            >
              {{ INSPIRE_STATUS_META[insp.status].label }}
            </span>
          </div>
          <p class="adv-inspire-content">{{ insp.content }}</p>
          <div class="adv-inspire-meta">
            <span v-if="insp.source" class="adv-inspire-source">📌 {{ insp.source }}</span>
            <span class="adv-inspire-date">{{ formatDate(insp.createdAt) }}</span>
          </div>
          <div class="adv-inspire-actions">
            <button
              class="deco-btn deco-btn--sm"
              type="button"
              @click="handleStatusChange(insp.id, INSPIRE_FLOW[insp.status])"
            >
              {{ INSPIRE_STATUS_META[INSPIRE_FLOW[insp.status]].action }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 版本留档 -->
    <div class="adv-block">
      <h3 class="mat-subtitle">版本留档</h3>
      <EmptyState
        v-if="versions.length === 0"
        :glow="false"
        icon="📦"
        title="暂无版本记录"
        cta-label=""
      />
      <div v-else class="adv-version-list">
        <div v-for="v in sortedVersions" :key="v.id" class="adv-version-row">
          <span class="adv-version-badge">v{{ v.version }}</span>
          <span class="adv-version-name">{{ workName(v.workId) }}</span>
          <span class="adv-version-desc">{{ v.description }}</span>
          <span class="adv-version-date">{{ formatDate(v.createdAt) }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import EmptyState from '../EmptyState.vue'
import { useCraftUi } from '../../modules/craft/useCraftUi'
import { useCraftAdvanced, type InspirationEntry } from '../../modules/craft/craft-advanced'
import { TYPE_LABEL } from '../../modules/craft/types'

const ui = useCraftUi()
const { store } = ui
const advanced = useCraftAdvanced()
const { analytics, inspirations, versions } = advanced

// 以当前作品刷新创作分析（幂等，重算并落盘）
advanced.updateAnalytics(store.works, store.stats)

const INSPIRE_STATUS_META: Record<InspirationEntry['status'], { label: string; action: string; color: string }> = {
  raw: { label: '原始', action: '孵化', color: '#8a9aa8' },
  developing: { label: '孵化中', action: '应用', color: '#e8c060' },
  applied: { label: '已应用', action: '归档', color: '#6aba7a' },
  archived: { label: '已归档', action: '恢复', color: '#8a7a6a' },
}

const INSPIRE_FLOW: Record<InspirationEntry['status'], InspirationEntry['status']> = {
  raw: 'developing',
  developing: 'applied',
  applied: 'archived',
  archived: 'raw',
}

interface InspireForm {
  title: string
  content: string
  source: string
}

const inspireForm = ref<InspireForm>({ title: '', content: '', source: '' })

function handleAddInspiration() {
  const title = inspireForm.value.title.trim()
  if (!title) return
  advanced.addInspiration(
    title,
    inspireForm.value.content.trim(),
    inspireForm.value.source.trim(),
  )
  inspireForm.value = { title: '', content: '', source: '' }
}

function handleStatusChange(id: string, status: InspirationEntry['status']) {
  advanced.updateInspirationStatus(id, status)
}

const sortedInspirations = computed(() =>
  [...inspirations.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
)

const sortedVersions = computed(() =>
  [...versions.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
)

function typePct(count: number): number {
  const total = analytics.value.typeDistribution.reduce((s, d) => s + d.count, 0)
  return total > 0 ? Math.round((count / total) * 100) : 0
}

function trendHeight(created: number): number {
  const max = Math.max(...analytics.value.monthlyTrend.map(t => t.created), 1)
  return Math.max(8, Math.round((created / max) * 100))
}

function workName(id: string): string {
  return store.works.find(w => w.id === id)?.name ?? '未知作品'
}

function formatDate(iso: string): string {
  return iso.slice(0, 10)
}
</script>

<style scoped src="./craft-shared.css"></style>
