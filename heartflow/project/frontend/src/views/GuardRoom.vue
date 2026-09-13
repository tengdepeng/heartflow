<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance guard">
    <!-- 氛围背景 -->
    <div data-enter class="guard-atmos">
      <div class="atmos-warm-glow"></div>
    </div>

    <!-- 装饰性头部 -->
    <header data-enter class="guard-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <h1 class="guard-title">守护室</h1>
      <p class="guard-subtitle">你的安全与隐私控制中心</p>
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
    </header>

    <!-- 标签导航 -->
    <nav data-enter class="guard-tabs">
      <button
        v-for="tab in GUARD_TABS"
        :key="tab.id"
        class="guard-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- 统计概览 -->
    <section data-enter class="stats-overview">
      <div class="stat-card">
        <span class="stat-value">{{ contacts.length }}</span>
        <span class="stat-label">紧急联系人</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ advisorEnabled ? '开' : '关' }}</span>
        <span class="stat-label">幕僚顾问</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ dataReflux ? '开' : '关' }}</span>
        <span class="stat-label">数据回流</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">{{ visitCount }}</span>
        <span class="stat-label">访问次数</span>
      </div>
      <div class="stat-card">
        <span class="stat-value" :style="{ color: securityLevel.color }">{{ securityScore }}</span>
        <span class="stat-label">安全评分</span>
      </div>
      <div class="stat-card">
        <span class="stat-value" :style="{ color: sessionStatus.color }">{{ sessionStatus.label }}</span>
        <span class="stat-label">会话状态</span>
      </div>
    </section>

    <!-- 守护档案（guard-analytics 分析引擎） -->
    <GuardArchivePanel
      :visits="visitLogs"
      :sessions="sessionActivity"
      :perms="permissionLights"
      :anonymous-mode="anonymousMode"
      :data-reflux="dataReflux"
      :external-link-control="externalLinkControl"
      :contacts="contacts"
      :crashes="crashLogs"
    />

    <!-- 四大台面板（按当前标签渲染其一） -->
    <GovernPanel v-if="activeTab === 'govern'" />
    <SecurityPanel v-if="activeTab === 'security'" />
    <HealthPanel v-if="activeTab === 'health'" />
    <PsySafePanel v-if="activeTab === 'psyche'" />

    <!-- 专注声场（sound-scene 模块，原已实现但未挂载） -->
    <SoundScenePanel />

    <!-- 跨房间共鸣态势（仅其他房间，过滤本房回声） -->
    <section data-enter class="cross-room-climate">
      <h2 class="climate-title">跨房间共鸣态势</h2>
      <p v-if="externalFeed.length === 0" class="climate-empty">各房间尚在静默，去其他房间留一道光痕吧。</p>
      <ul v-else class="climate-list">
        <li v-for="s in externalFeed" :key="s.room" class="climate-item">
          <span class="climate-room">{{ roomLabel(s.room) }}</span>
          <span class="climate-signal">{{ s.label }}</span>
        </li>
      </ul>
      <p v-if="externalClimate.rooms.length" class="climate-summary">{{ summarizeClimate(externalClimate) }}</p>
    </section>

    <!-- 感官守护：护眼 / 日出日落自动启停 / 白噪音 -->
    <EyeCarePanel />
    <SunSchedulePanel />
    <WhiteNoisePanel />

    <!-- 设备传感器感知（safety·useSensorIntegration） -->
    <SensorIntegrationPanel />

    <!-- 人身安全（safety·usePersonalSafety：SOS / 跌倒检测 / 紧急联系人） -->
    <PersonalSafetyPanel />

    <!-- 实时异常检测（safety·useAnomalyDetector：行为基线 / 自适应阈值 / 规则，INCR-161） -->
    <AnomalyDetectorPanel />

    <!-- 审计时间线（guard·audit-timeline，INCR-176） -->
    <AuditTimelinePanel />

    <!-- 合规审查（guard·compliance-review，INCR-176） -->
    <ComplianceReviewPanel />

    <!-- 隐私仪表盘（INCR-284 补挂载孤儿组件 PrivacyDashboardPanel：隐私评分/数据暴露面/权限审计/泄露预警/一键锁定，经 usePrivacyDashboard 桥自持读取存储） -->
    <PrivacyDashboardPanel />

    <!-- 护眼盾 -->
    <EyeShieldPanel />

    <!-- 用眼休息调度（INCR-261 补挂载孤儿组件：20-20-20 实时倒计时 · 完成/稍后 · 今日节律） -->
    <EyeBreakSchedulerPanel />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useConfig } from '../resonance/bridges/config'
import { useGuard } from '../modules/guard'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useRoomResonance, ROOM_LABELS, aggregateClimate } from '../modules/room-resonance'
import GovernPanel from '../components/guard-room/GovernPanel.vue'
import SecurityPanel from '../components/guard-room/SecurityPanel.vue'
import HealthPanel from '../components/guard-room/HealthPanel.vue'
import PsySafePanel from '../components/guard-room/PsySafePanel.vue'
import SoundScenePanel from '../components/SoundScenePanel.vue'
import EyeShieldPanel from '../components/EyeShieldPanel.vue'
import EyeBreakSchedulerPanel from '../components/EyeBreakSchedulerPanel.vue'
import EyeCarePanel from '../components/EyeCarePanel.vue'
import SunSchedulePanel from '../components/SunSchedulePanel.vue'
import WhiteNoisePanel from '../components/WhiteNoisePanel.vue'
import SensorIntegrationPanel from '../components/SensorIntegrationPanel.vue'
import PersonalSafetyPanel from '../components/PersonalSafetyPanel.vue'
import AnomalyDetectorPanel from '../components/AnomalyDetectorPanel.vue'
import GuardArchivePanel from '../components/GuardArchivePanel.vue'
import AuditTimelinePanel from '../components/AuditTimelinePanel.vue'
import ComplianceReviewPanel from '../components/ComplianceReviewPanel.vue'
import PrivacyDashboardPanel from '../components/PrivacyDashboardPanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()

// ---- 跨房间共鸣联动：守护室既消费各房间态势，也发射自身守护信号 ----
const { crossRoomFeed, summarizeClimate, emitRoomSignal, getSignals } = useRoomResonance()

// 本房信号只发射给「其他房间」看，自身态势区块须过滤回声
const externalFeed = computed(() => crossRoomFeed.value.filter(s => s.room !== 'guard-room'))
const externalClimate = computed(() => aggregateClimate(getSignals().filter(s => s.room !== 'guard-room')))

function roomLabel(r: keyof typeof ROOM_LABELS): string {
  return ROOM_LABELS[r]
}

// 守护信号标签：反映本地私有守护现状（守宪法第1条）
function guardSignalLabel(): string {
  const parts: string[] = []
  if (anonymousMode.value) parts.push('匿名模式守护')
  if (dataReflux.value) parts.push('数据回流开启')
  else parts.push('数据不外发')
  if (!externalLinkControl.value) parts.push('外链已受限')
  if (contacts.value.length) parts.push(`${contacts.value.length}位紧急联系人`)
  return parts.length ? parts.join(' · ') : '守护待配置'
}

function emitGuardSignal() {
  emitRoomSignal({
    room: 'guard-room',
    kind: 'security',
    label: guardSignalLabel(),
    detail: '本地私有守护中',
    ts: Date.now(),
  })
}

// 守护室数据层组合式函数（模块级单例，状态跨视图与面板共享）
const guard = useGuard()
const { contacts, visitLogs, sessionActivity, permissionLights, crashLogs, dataReflux, anonymousMode, externalLinkControl } = guard
const configBridge = useConfig()
const advisorEnabled = computed({
  get: () => configBridge.config.advisorEnabled,
  set: (v: boolean) => configBridge.updateAdvisorEnabled(v),
})

onMounted(() => {
  guard.load()
  emitGuardSignal()
})
// 隐私/安全开关变化时刷新守护信号，让其他房间实时感知
watch([anonymousMode, dataReflux, externalLinkControl, contacts], () => emitGuardSignal())

type GuardTab = 'govern' | 'security' | 'health' | 'psyche'

interface GuardTabItem {
  id: GuardTab
  label: string
  icon: string
}

const GUARD_TABS: GuardTabItem[] = [
  { id: 'govern', label: '治理台', icon: '🛡' },
  { id: 'security', label: '安全台', icon: '🔒' },
  { id: 'health', label: '健康台', icon: '❤' },
  { id: 'psyche', label: '心理安全', icon: '🌿' },
]

const activeTab = ref<GuardTab>('govern')

const visitCount = computed(() => visitLogs.value.length)

const sessionStatus = computed(() => {
  const recent = sessionActivity.value.slice(0, 5)
  if (recent.length === 0) return { label: '无活动记录', level: 'idle', color: 'var(--text-dim)' }
  const last = new Date(recent[0].at)
  const now = Date.now()
  const diff = now - last.getTime()
  if (diff < 60000) return { label: '活跃', level: 'active', color: '#34d399' }
  if (diff < 300000) return { label: '近期活跃', level: 'recent', color: '#f0c040' }
  return { label: '空闲', level: 'idle', color: 'var(--text-dim)' }
})

const securityScore = computed(() => {
  let score = 0
  score += 20
  if (anonymousMode.value) score += 15
  if (advisorEnabled.value) score += 10
  if (!dataReflux.value) score += 15
  if (externalLinkControl.value) score += 10
  if (contacts.value.length > 0) score += 10
  if (visitLogs.value.length > 0) score += 10
  return score
})

const securityLevel = computed(() => {
  if (securityScore.value >= 80) return { label: '优秀', color: '#34d399' }
  if (securityScore.value >= 60) return { label: '良好', color: '#f0c040' }
  return { label: '待加强', color: '#ef4444' }
})
</script>

<style scoped src="../components/guard-room/guard-shared.css"></style>

<style scoped>
.cross-room-climate {
  margin: 28px auto 0;
  max-width: 720px;
  padding: 18px 20px;
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid var(--border);
}
.climate-title {
  margin: 0 0 12px;
  font-size: 14px;
  letter-spacing: 2px;
  color: var(--text-high);
}
.climate-empty {
  margin: 0;
  font-size: 12px;
  color: var(--text-dim);
}
.climate-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.climate-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
}
.climate-room {
  flex: 0 0 72px;
  color: rgba(196, 160, 184, 0.85);
}
.climate-signal {
  color: var(--text-high);
}
.climate-summary {
  margin: 12px 0 0;
  font-size: 12px;
  color: var(--text-medium);
}
</style>
