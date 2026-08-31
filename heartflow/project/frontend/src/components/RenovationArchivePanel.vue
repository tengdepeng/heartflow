<template>
  <section class="rnp-panel" aria-label="装修档案">
    <!-- 空态：装修未启 -->
    <template v-if="!hasData">
      <div class="rnp-head">
        <span class="rnp-title">🏛️ 装修档案</span>
        <span class="rnp-badge rnp-badge-neutral">装修未启</span>
      </div>
      <p class="rnp-empty">
        还没有空间配置与装修活动。定制第一个空间、点亮主题与布局后，健康度、维度配置与最近活动便会在此显影。
      </p>
    </template>

    <!-- 填充态 -->
    <template v-else>
      <div class="rnp-head">
        <span class="rnp-title">🏛️ 装修档案</span>
        <span class="rnp-badge" :class="badgeClass">{{ badge.text }}</span>
      </div>

      <!-- 装修健康度 -->
      <div class="rnp-block">
        <h3 class="rnp-block-title">装修健康度</h3>
        <div class="rnp-health">
          <div class="rnp-health-top">
            <div class="rnp-health-score">
              <b>{{ health.score }}</b><span>/ {{ health.maxScore }}</span>
            </div>
            <div class="rnp-health-bar">
              <div class="rnp-health-fill" :style="{ width: health.score + '%' }"></div>
            </div>
          </div>
          <ul class="rnp-health-reasons" v-if="health.reasons.length">
            <li v-for="r in health.reasons" :key="r" class="rnp-health-reason">{{ r }}</li>
          </ul>
        </div>
      </div>

      <!-- 维度配置 -->
      <div class="rnp-block" v-if="dimensions.length">
        <h3 class="rnp-block-title">维度配置</h3>
        <div class="rnp-dims">
          <div v-for="d in dimensions" :key="d.dimension" class="rnp-dim">
            <span class="rnp-dim-icon">{{ d.icon }}</span>
            <div class="rnp-dim-body">
              <span class="rnp-dim-label">{{ d.label }}</span>
              <span class="rnp-dim-count">{{ d.optionCount }} 项</span>
            </div>
            <span class="rnp-dim-dot" :class="d.configured ? 'rnp-dim-dot--on' : ''"></span>
          </div>
        </div>
      </div>

      <!-- 最近装修活动 -->
      <div class="rnp-block" v-if="activities.length">
        <h3 class="rnp-block-title">最近装修活动</h3>
        <div class="rnp-activities">
          <div v-for="a in activities.slice(0, 5)" :key="a.id" class="rnp-activity">
            <span class="rnp-activity-type">{{ activityLabel(a.type) }}</span>
            <span class="rnp-activity-desc">{{ a.description }}</span>
            <span class="rnp-activity-time">{{ formatTime(a.timestamp) }}</span>
          </div>
        </div>
      </div>

      <!-- 温和洞察 -->
      <ul class="rnp-insights">
        <li v-for="ins in insights" :key="ins.title" class="rnp-insight">
          <span class="rnp-insight-mark">✦</span>
          <span class="rnp-insight-text">
            <b>{{ ins.title }}</b>
            <span>{{ ins.description }}</span>
          </span>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCustomizationBridge } from '../modules/customization'
import { formatDateTime } from '../utils/time'

const bridge = useCustomizationBridge()

const hasData = computed(
  () => bridge.activeConfig.value !== null || bridge.snapshotCount.value > 0 || bridge.recentActivity.value.length > 0,
)

const health = bridge.renovationHealth

const dimensions = computed(() => bridge.dimensionCompleteness.value ?? [])

const activities = bridge.recentActivity

const badge = computed(() => {
  const s = health.value.score
  if (s >= 80) return { text: '装修完备' }
  if (s >= 40) return { text: '装修推进中' }
  return { text: '装修起步' }
})

const badgeClass = computed(() => {
  const s = health.value.score
  if (s >= 80) return 'rnp-badge-positive'
  if (s >= 40) return 'rnp-badge-warn'
  return 'rnp-badge-neutral'
})

const insights = computed(() => buildInsights())

function buildInsights(): { title: string; description: string }[] {
  const out: { title: string; description: string }[] = []
  const s = health.value.score
  const configured = dimensions.value.filter((d) => d.configured).length
  const totalOptions = dimensions.value.reduce((sum, d) => sum + d.optionCount, 0)
  const actCount = activities.value.length

  if (s >= 80) {
    out.push({ title: '装修已完备', description: `健康度 ${s}/100，空间各维度已基本就位，可以继续精雕细琢。` })
  } else if (s >= 40) {
    out.push({ title: '装修推进中', description: `健康度 ${s}/100，还有 ${health.value.reasons.length} 处可打磨，让空间更贴合自己。` })
  } else {
    out.push({ title: '装修刚起步', description: `健康度 ${s}/100，可从配置空间维度开始，逐步点亮主题与布局。` })
  }

  if (configured > 0) {
    out.push({ title: '维度铺陈', description: `${configured}/7 个维度已配置，共 ${totalOptions} 项选项。` })
  }

  if (actCount > 0) {
    out.push({ title: '装修足迹', description: `最近有 ${actCount} 条装修活动，每一次调整都在塑造空间。` })
  }

  if (out.length === 0) {
    out.push({ title: '静待启程', description: '空间尚未定制，写下第一个配置，装修档案便会显影。' })
  }

  return out.slice(0, 4)
}

function activityLabel(type: string): string {
  const map: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    batch: '批量',
    'style-migrate': '风格迁移',
  }
  return map[type] || type
}

function formatTime(ts: string): string {
  return formatDateTime(ts)
}
</script>

<style scoped>
.rnp-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.5);
  border: 1px solid rgba(var(--accent-rgb), 0.1);
}

.rnp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.rnp-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-high);
  letter-spacing: 0.02em;
}

.rnp-badge {
  flex-shrink: 0;
  padding: 3px 10px;
  border-radius: 999px;
  font-size: 10px;
  border: 1px solid;
}

.rnp-badge-neutral {
  color: var(--text-secondary);
  border-color: rgba(var(--accent-rgb), 0.18);
  background: rgba(var(--accent-rgb), 0.06);
}

.rnp-badge-warn {
  color: #f0c040;
  border-color: rgba(240, 192, 64, 0.3);
  background: rgba(240, 192, 64, 0.08);
}

.rnp-badge-positive {
  color: #8a9a7a;
  border-color: rgba(138, 154, 122, 0.3);
  background: rgba(138, 154, 122, 0.08);
}

.rnp-empty {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-secondary);
}

.rnp-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rnp-block-title {
  margin: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  letter-spacing: 0.03em;
}

/* ---- 装修健康度 ---- */
.rnp-health {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.rnp-health-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rnp-health-score {
  display: flex;
  align-items: baseline;
  gap: 2px;
  flex-shrink: 0;
}

.rnp-health-score b {
  font-size: 26px;
  font-weight: 600;
  color: #f0c040;
  line-height: 1;
}

.rnp-health-score span {
  font-size: 11px;
  color: var(--text-dim);
}

.rnp-health-bar {
  flex: 1;
  height: 8px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.08);
  overflow: hidden;
}

.rnp-health-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #c4956a, #f0c040);
  transition: width 0.4s ease;
}

.rnp-health-reasons {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.rnp-health-reason {
  font-size: 11px;
  color: var(--text-low);
}

/* ---- 维度配置 ---- */
.rnp-dims {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.rnp-dim {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.rnp-dim-icon {
  flex-shrink: 0;
  font-size: 14px;
  color: #c4956a;
}

.rnp-dim-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.rnp-dim-label {
  font-size: 12px;
  color: var(--text-high);
}

.rnp-dim-count {
  font-size: 10px;
  color: var(--text-dim);
}

.rnp-dim-dot {
  flex-shrink: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.12);
}

.rnp-dim-dot--on {
  background: #8a9a7a;
  box-shadow: 0 0 6px rgba(138, 154, 122, 0.5);
}

/* ---- 最近装修活动 ---- */
.rnp-activities {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rnp-activity {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.04);
}

.rnp-activity-type {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  color: #c4956a;
  border: 1px solid rgba(196, 149, 106, 0.3);
  background: rgba(196, 149, 106, 0.08);
}

.rnp-activity-desc {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  color: var(--text-high);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rnp-activity-time {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--text-dim);
}

/* ---- 温和洞察 ---- */
.rnp-insights {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rnp-insight {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.05);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}

.rnp-insight-mark {
  flex-shrink: 0;
  color: #f0c040;
  font-size: 12px;
  line-height: 1.6;
}

.rnp-insight-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.rnp-insight-text b {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-high);
}

.rnp-insight-text span {
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-low);
}

@media (max-width: 520px) {
  .rnp-dims {
    grid-template-columns: 1fr;
  }
}
</style>
