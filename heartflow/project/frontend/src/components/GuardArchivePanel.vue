<template>
  <section class="guardarch">
    <div class="guardarch-head">
      <div class="guardarch-title-wrap">
        <span class="guardarch-title">🛡 守护档案</span>
        <span class="guardarch-sub">把一次次的造访与守护，拢成一册安放</span>
      </div>
      <span class="guardarch-tag">{{ health.label }}</span>
    </div>

    <!-- 健康圆环 + 三轴 -->
    <div class="guardarch-main">
      <div class="guardarch-ring" :style="{ background: ringStyle }">
        <span class="guardarch-ring-num">{{ health.score }}<i>/100</i></span>
      </div>
      <div class="guardarch-axes">
        <div class="guardarch-axis">
          <span class="guardarch-axis-label">权限完备</span>
          <div class="guardarch-bar"><i :style="{ width: health.permission + '%' }"></i></div>
          <b>{{ health.permission }}</b>
        </div>
        <div class="guardarch-axis">
          <span class="guardarch-axis-label">隐私守护</span>
          <div class="guardarch-bar"><i :style="{ width: health.privacy + '%' }"></i></div>
          <b>{{ health.privacy }}</b>
        </div>
        <div class="guardarch-axis">
          <span class="guardarch-axis-label">应急准备</span>
          <div class="guardarch-bar"><i :style="{ width: health.readiness + '%' }"></i></div>
          <b>{{ health.readiness }}</b>
        </div>
      </div>
    </div>

    <!-- 概览指标 -->
    <div class="guardarch-metrics">
      <div class="guardarch-metric"><b>{{ ov.totalVisits }}</b><span>造访次数</span></div>
      <div class="guardarch-metric"><b>{{ ov.activeDays }}</b><span>造访天数</span></div>
      <div class="guardarch-metric"><b>{{ ov.permissionCount }}</b><span>权限光点</span></div>
      <div class="guardarch-metric"><b>{{ ov.pendingCount }}</b><span>待受理</span></div>
      <div class="guardarch-metric"><b>{{ rhy.consecutiveDays }}</b><span>连续造访（日）</span></div>
    </div>

    <!-- 护伞节奏 -->
    <div v-if="rhythmTips.length" class="guardarch-summary">
      <span v-if="rhy.weeklyVisits > 0">· 近 7 天回到这里 {{ rhy.weeklyVisits }} 次</span>
      <span v-if="rhy.preferredHour !== null">· 常于 {{ rhy.preferredHour }} 点来访</span>
      <span v-if="rhythmTips.length">· {{ rhythmTips[0] }}</span>
    </div>

    <!-- 权限光点受理详情 -->
    <div class="guardarch-perms">
      <div v-for="p in perms" :key="p.key" class="guardarch-perm">
        <span class="guardarch-perm-label">{{ p.label }}</span>
        <span class="guardarch-perm-status" :class="p.status">{{ p.statusText }}</span>
      </div>
    </div>

    <!-- 温和洞察 -->
    <ul v-if="insights.length" class="guardarch-insights">
      <li v-for="(s, i) in insights" :key="i">{{ s }}</li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type {
  GuardVisitLog,
  GuardSessionActivity,
  GuardPermissionLight,
  GuardContact,
  GuardCrashLog,
} from '../modules/guard/useGuard'
import {
  shieldOverview,
  guardRhythm,
  shieldHealth,
  guardInsights,
  type ShieldOverview,
} from '../modules/guard/guard-analytics'

const props = defineProps<{
  visits: GuardVisitLog[]
  sessions: GuardSessionActivity[]
  perms: GuardPermissionLight[]
  anonymousMode: boolean
  dataReflux: boolean
  externalLinkControl: boolean
  contacts: GuardContact[]
  crashes: GuardCrashLog[]
}>()

const privacy = computed(() => ({
  anonymousMode: props.anonymousMode,
  dataReflux: props.dataReflux,
  externalLinkControl: props.externalLinkControl,
}))

const ov = ref<ShieldOverview>(shieldOverview([], [], [], { anonymousMode: false, dataReflux: true, externalLinkControl: true }, []))
const rhy = ref(guardRhythm([], new Date()))
const health = ref(shieldHealth([], [], privacy.value, [], new Date()))
const insights = ref<string[]>([])
const rhythmTips = ref<string[]>([])

function refresh(now = new Date()) {
  ov.value = shieldOverview(props.visits, props.sessions, props.perms, privacy.value, props.contacts)
  rhy.value = guardRhythm(props.visits, now)
  health.value = shieldHealth(props.visits, props.perms, privacy.value, props.contacts, now)
  insights.value = guardInsights(props.visits, props.sessions, props.perms, privacy.value, props.contacts, props.crashes, now, 4)
  const tips: string[] = []
  if (rhy.value.preferredHour !== null) tips.push(`常见于${rhy.value.preferredHour}时来访`)
  if (rhy.value.lastVisit) tips.push('最近来过')
  rhythmTips.value = tips
}

watch(() => props, () => refresh(), { deep: true })

// 圆环：低→沉静的青灰，高→清透的靛蓝
const ringStyle = computed(() => {
  const s = health.value.score
  const hue = s >= 80 ? 218 : s >= 60 ? 224 : s >= 40 ? 238 : 252
  return `conic-gradient(hsl(${hue} 46% 58%) ${s * 3.6}deg, rgba(var(--accent-rgb), 0.08) ${s * 3.6}deg)`
})

refresh()
</script>

<style scoped>
.guardarch {
  margin: 8px 0 0;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg, rgba(15, 13, 20, 0.6));
  border: 1px solid var(--border, rgba(255, 255, 255, 0.08));
}
.guardarch-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.guardarch-title-wrap { display: flex; flex-direction: column; gap: 3px; }
.guardarch-title { font-size: 13px; letter-spacing: 2px; color: var(--text-high, #d6caf0); }
.guardarch-sub { font-size: 11px; color: rgba(var(--accent-rgb), 0.45); }
.guardarch-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; background: rgba(var(--accent-rgb), 0.12); color: #b9b0e8; white-space: nowrap; }

.guardarch-main { display: flex; align-items: center; gap: 22px; margin-bottom: 16px; }
.guardarch-ring {
  width: 92px; height: 92px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  position: relative; flex-shrink: 0;
}
.guardarch-ring::before { content: ''; position: absolute; inset: 8px; border-radius: 50%; background: rgba(15, 13, 20, 0.92); }
.guardarch-ring-num { position: relative; font-size: 20px; font-weight: 400; color: #e0d9f5; letter-spacing: 0.5px; }
.guardarch-ring-num i { font-style: normal; font-size: 10px; opacity: 0.5; }

.guardarch-axes { flex: 1; display: flex; flex-direction: column; gap: 10px; }
.guardarch-axis { display: flex; align-items: center; gap: 10px; }
.guardarch-axis-label { width: 62px; font-size: 11px; color: rgba(226, 220, 240, 0.55); flex-shrink: 0; }
.guardarch-bar { flex: 1; height: 6px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.05)); overflow: hidden; }
.guardarch-bar i { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, hsl(224 46% 58%), hsl(252 46% 55%)); }
.guardarch-axis b { width: 26px; text-align: right; font-size: 11px; font-weight: 500; color: rgba(226, 220, 240, 0.7); }

.guardarch-metrics { display: flex; gap: 8px; margin-bottom: 14px; }
.guardarch-metric { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 10px; background: var(--bg-card, rgba(255,255,255,0.03)); }
.guardarch-metric b { font-size: 15px; font-weight: 500; color: var(--text-high, #d6caf0); }
.guardarch-metric span { font-size: 10px; color: rgba(226, 220, 240, 0.4); }

.guardarch-summary { display: flex; flex-wrap: wrap; gap: 4px; font-size: 11px; color: rgba(226, 220, 240, 0.45); margin-bottom: 10px; }
.guardarch-summary span { border-left: 2px solid rgba(var(--accent-rgb), 0.25); padding-left: 8px; }

.guardarch-perms { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
.guardarch-perm { display: flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 999px; background: var(--bg-card, rgba(255,255,255,0.04)); }
.guardarch-perm-label { font-size: 11px; color: rgba(226, 220, 240, 0.6); }
.guardarch-perm-status { font-size: 11px; }
.guardarch-perm-status.authorized { color: #34d399; }
.guardarch-perm-status.unauthorized { color: #f0c040; }
.guardarch-perm-status.revoked { color: #f87171; }

.guardarch-insights { list-style: none; margin: 0; padding: 12px 0 0; border-top: 1px dashed rgba(var(--accent-rgb), 0.14); display: flex; flex-direction: column; gap: 8px; }
.guardarch-insights li { font-size: 12px; line-height: 1.65; color: rgba(226, 220, 240, 0.6); }
.guardarch-insights li::before { content: '· '; color: rgba(var(--accent-rgb), 0.5); }
</style>