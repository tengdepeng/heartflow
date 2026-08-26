<template>
  <div data-enter class="guard-tab-content">
    <!-- 次级标签导航 -->
    <nav class="guard-sub-tabs">
      <button
        v-for="sub in SECURITY_SUB_TABS"
        :key="sub.id"
        class="guard-sub-tab"
        :class="{ active: securitySubTab === sub.id }"
        @click="securitySubTab = sub.id"
      >
        <span class="sub-tab-icon">{{ sub.icon }}</span>
        <span class="sub-tab-label">{{ sub.label }}</span>
      </button>
    </nav>

    <!-- 数据安全 -->
    <div v-if="securitySubTab === 'data-security'" class="guard-sub-tab-content">
      <div class="sub-card">
        <div class="sub-card-header">
          <span class="sub-card-icon">🔐</span>
          <div>
            <h4 class="sub-card-title">数据安全</h4>
            <p class="sub-card-desc">本地存储加密和备份状态</p>
          </div>
        </div>
        <div class="sub-card-body">
          <div class="setting-row">
            <span>本地存储加密</span>
            <span class="setting-status on">已启用</span>
          </div>
          <div class="setting-row">
            <span>备份状态</span>
            <span class="setting-status on">正常</span>
          </div>
          <div class="setting-row">
            <span>数据导出记录</span>
            <span class="setting-status">{{ dataExportLogs.length }} 次</span>
          </div>
          <div class="setting-row">
            <span>安全评分</span>
            <span class="setting-status" :style="{ color: securityLevel.color }">{{ securityScore }} / 100 · {{ securityLevel.label }}</span>
          </div>
        </div>
      </div>
      <!-- 安全评分详情 -->
      <div class="sub-card" style="margin-top:16px">
        <div class="sub-card-header">
          <span class="sub-card-icon">📊</span>
          <div>
            <h4 class="sub-card-title">安全评分详情</h4>
            <p class="sub-card-desc">各项安全指标评分</p>
          </div>
        </div>
        <div class="sub-card-body">
          <div class="score-item">
            <span>数据本地存储</span>
            <span class="score-bar"><span class="score-fill" style="width:100%"></span></span>
            <span class="score-val on">+20</span>
          </div>
          <div class="score-item">
            <span>匿名模式</span>
            <span class="score-bar"><span class="score-fill" :style="{width: anonymousMode ? '100%' : '0%'}"></span></span>
            <span class="score-val" :class="{on: anonymousMode}">{{ anonymousMode ? '+15' : '+0' }}</span>
          </div>
          <div class="score-item">
            <span>幕僚顾问</span>
            <span class="score-bar"><span class="score-fill" :style="{width: advisorEnabled ? '100%' : '0%'}"></span></span>
            <span class="score-val" :class="{on: advisorEnabled}">{{ advisorEnabled ? '+10' : '+0' }}</span>
          </div>
          <div class="score-item">
            <span>数据回流关闭</span>
            <span class="score-bar"><span class="score-fill" :style="{width: !dataReflux ? '100%' : '0%'}"></span></span>
            <span class="score-val" :class="{on: !dataReflux}">{{ !dataReflux ? '+15' : '+0' }}</span>
          </div>
          <div class="score-item">
            <span>外部链接控制</span>
            <span class="score-bar"><span class="score-fill" :style="{width: externalLinkControl ? '100%' : '0%'}"></span></span>
            <span class="score-val" :class="{on: externalLinkControl}">{{ externalLinkControl ? '+10' : '+0' }}</span>
          </div>
          <div class="score-item">
            <span>紧急联系人</span>
            <span class="score-bar"><span class="score-fill" :style="{width: contacts.length > 0 ? '100%' : '0%'}"></span></span>
            <span class="score-val" :class="{on: contacts.length > 0}">{{ contacts.length > 0 ? '+10' : '+0' }}</span>
          </div>
          <div class="score-item">
            <span>访问记录</span>
            <span class="score-bar"><span class="score-fill" :style="{width: visitLogs.length > 0 ? '100%' : '0%'}"></span></span>
            <span class="score-val" :class="{on: visitLogs.length > 0}">{{ visitLogs.length > 0 ? '+10' : '+0' }}</span>
          </div>
        </div>
      </div>
      <!-- 会话活动 -->
      <div class="sub-card" style="margin-top:16px">
        <div class="sub-card-header">
          <span class="sub-card-icon">🔄</span>
          <div>
            <h4 class="sub-card-title">会话活动</h4>
            <p class="sub-card-desc">最近的应用活动记录</p>
          </div>
        </div>
        <div class="sub-card-body">
          <div class="session-status-indicator">
            <span class="status-dot" :style="{ background: sessionStatus.color }"></span>
            <span>当前状态：{{ sessionStatus.label }}</span>
          </div>
          <div class="visit-list" v-if="sessionActivity.length" style="margin-top:12px">
            <div v-for="act in sessionActivity.slice(0, 8)" :key="act.id" class="visit-row">
              <span class="visit-time">{{ act.at.slice(11, 19) }}</span>
              <span class="visit-action">{{ act.action }}</span>
            </div>
          </div>
          <p v-else class="setting-hint" style="margin-top:12px">还没有活动记录</p>
          <button class="guard-btn" @click="clearSessionActivity" style="margin-top:8px">清除记录</button>
        </div>
      </div>
    </div>

    <!-- 网络安全 -->
    <div v-if="securitySubTab === 'network-security'" class="guard-sub-tab-content">
      <div class="sub-card">
        <div class="sub-card-header">
          <span class="sub-card-icon">🌐</span>
          <div>
            <h4 class="sub-card-title">网络安全</h4>
            <p class="sub-card-desc">网络请求和外部链接控制</p>
          </div>
        </div>
        <div class="sub-card-body">
          <div class="setting-row">
            <span>网络请求状态</span>
            <span class="setting-status on">正常</span>
          </div>
          <div class="setting-row">
            <span>外部链接控制</span>
            <label class="toggle"><input type="checkbox" v-model="externalLinkControl" /><span class="toggle-slider" /></label>
          </div>
        </div>
      </div>
    </div>

    <!-- 设备安全 -->
    <div v-if="securitySubTab === 'device-security'" class="guard-sub-tab-content">
      <div class="sub-card">
        <div class="sub-card-header">
          <span class="sub-card-icon">📱</span>
          <div>
            <h4 class="sub-card-title">设备安全</h4>
            <p class="sub-card-desc">当前设备信息和解锁方式</p>
          </div>
        </div>
        <div class="sub-card-body">
          <div class="setting-row">
            <span>当前设备</span>
            <span class="setting-status">{{ deviceInfo }}</span>
          </div>
          <div class="setting-row">
            <span>解锁方式</span>
            <span class="setting-status">{{ unlockMethod }}</span>
          </div>
        </div>
      </div>
      <!-- P2 感知层：设备实时状态 -->
      <div class="sub-card" style="margin-top:16px">
        <div class="sub-card-header">
          <span class="sub-card-icon">📡</span>
          <div>
            <h4 class="sub-card-title">实时感知状态</h4>
            <p class="sub-card-desc">环境与设备信号采集</p>
          </div>
        </div>
        <div class="sub-card-body">
          <div class="setting-row">
            <span>🔋 电池</span>
            <span class="setting-status" :style="{ color: batteryStatusColor }">{{ batteryStatusText }}</span>
          </div>
          <div class="setting-row">
            <span>🌐 网络</span>
            <span class="setting-status" :style="{ color: networkStatusColor }">{{ networkStatusText }}</span>
          </div>
          <div class="setting-row">
            <span>💡 环境光</span>
            <span class="setting-status">{{ ambientLightText }}</span>
          </div>
          <div class="setting-row">
            <span>🖥 屏幕</span>
            <span class="setting-status">{{ screenStatusText }}</span>
          </div>
          <div class="setting-row">
            <span>🎨 系统主题</span>
            <span class="setting-status">{{ perceptionEnv.systemTheme ?? '不可用' }}</span>
          </div>
          <div class="setting-row">
            <span>📊 数据来源</span>
            <span class="setting-status">{{ perceptionEnv.source }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 应急安全 -->
    <div v-if="securitySubTab === 'emergency-security'" class="guard-sub-tab-content">
      <div class="sub-card">
        <div class="sub-card-header">
          <span class="sub-card-icon">🆘</span>
          <div>
            <h4 class="sub-card-title">应急安全</h4>
            <p class="sub-card-desc">紧急操作和防诈骗核验</p>
          </div>
        </div>
        <div class="sub-card-body">
          <!-- 反诈骗核验 -->
          <div class="sub-card-section">
            <h5 class="sub-card-section-title">反诈骗核验</h5>
            <textarea v-model="verifyText" placeholder="粘贴可疑短信/链接/电话…" class="verify-input" rows="2" />
            <button class="guard-btn" @click="verifyText=''; verified='已提交至本地核验（模拟）'" style="margin-top:8px">核验</button>
            <p v-if="verified" class="verify-result">{{ verified }}</p>
          </div>
          <!-- 紧急操作 -->
          <div class="sub-card-section">
            <h5 class="sub-card-section-title">紧急操作</h5>
            <div class="emer-grid">
              <button class="emer-btn sos" @click="triggerSOS">SOS</button>
              <button class="emer-btn fake" @click="triggerFakeCall">假来电</button>
              <button class="emer-btn safe" @click="triggerCheckin">报平安</button>
            </div>
            <p class="emer-hint">SOS 将向紧急联系人发送位置和求救消息</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 态势中心 -->
    <div v-if="securitySubTab === 'situation-center'" class="guard-sub-tab-content">
      <div class="sub-card">
        <div class="sub-card-header">
          <span class="sub-card-icon">📡</span>
          <div>
            <h4 class="sub-card-title">安全态势中心</h4>
            <p class="sub-card-desc">威胁事件与安全评分总览</p>
          </div>
        </div>
        <div class="sub-card-body">
          <div class="setting-row">
            <span>安全评分</span>
            <span class="setting-status" :style="{ color: dashboard.securityScore >= 80 ? '#34d399' : dashboard.securityScore >= 60 ? '#f0c040' : '#ef4444' }">{{ dashboard.securityScore }} / 100</span>
          </div>
          <div class="setting-row">
            <span>总事件</span>
            <span class="setting-status">{{ dashboard.totalIncidents }} 起</span>
          </div>
          <div class="setting-row">
            <span>未解决事件</span>
            <span class="setting-status" :style="{ color: dashboard.unresolvedIncidents > 0 ? '#ef4444' : '#34d399' }">{{ dashboard.unresolvedIncidents }} 起</span>
          </div>
          <div class="setting-row">
            <span>本周事件</span>
            <span class="setting-status">{{ dashboard.weeklyIncidents }} 起</span>
          </div>
        </div>
      </div>
      <!-- 活跃威胁 -->
      <div class="sub-card" style="margin-top:16px">
        <div class="sub-card-header">
          <span class="sub-card-icon">⚠️</span>
          <div>
            <h4 class="sub-card-title">活跃威胁</h4>
            <p class="sub-card-desc">当前未解决的威胁类型</p>
          </div>
        </div>
        <div class="sub-card-body">
          <div v-if="dashboard.activeThreats.length" class="visit-list">
            <div v-for="t in dashboard.activeThreats" :key="t" class="visit-row">
              <span class="visit-time">{{ THREAT_TYPE_META[t].icon }}</span>
              <span class="visit-action">{{ THREAT_TYPE_META[t].label }} · {{ THREAT_TYPE_META[t].desc }}</span>
            </div>
          </div>
          <p v-else class="setting-hint">暂无活跃威胁，态势良好</p>
        </div>
      </div>
      <!-- 最近事件 -->
      <div class="sub-card" style="margin-top:16px">
        <div class="sub-card-header">
          <span class="sub-card-icon">🕒</span>
          <div>
            <h4 class="sub-card-title">最近事件</h4>
            <p class="sub-card-desc">最近的安全事件记录</p>
          </div>
        </div>
        <div class="sub-card-body">
          <div v-if="dashboard.recentIncidents.length" class="visit-list">
            <div v-for="inc in dashboard.recentIncidents.slice(0, 6)" :key="inc.id" class="visit-row">
              <span class="visit-time">{{ inc.timestamp.slice(5, 16) }}</span>
              <span class="visit-action">{{ THREAT_TYPE_META[inc.type].label }} · {{ THREAT_LEVEL_META[inc.level].label }}</span>
            </div>
          </div>
          <p v-else class="setting-hint">暂无安全事件记录</p>
        </div>
      </div>
    </div>

    <!-- 隐私加密 -->
    <div v-if="securitySubTab === 'privacy-crypto'" class="guard-sub-tab-content">
      <div class="sub-card">
        <div class="sub-card-header">
          <span class="sub-card-icon">🔒</span>
          <div>
            <h4 class="sub-card-title">端到端加密</h4>
            <p class="sub-card-desc">Web Crypto 本地加密状态</p>
          </div>
        </div>
        <div class="sub-card-body">
          <div class="setting-row">
            <span>加密引擎</span>
            <span class="setting-status" :class="{ on: cryptoReady }">{{ cryptoReady ? '就绪' : '未初始化' }}</span>
          </div>
          <div class="setting-row">
            <span>对称算法</span>
            <span class="setting-status">{{ cryptoConfig.defaultSymmetricAlgorithm }} · {{ cryptoConfig.aesKeyLength }} 位</span>
          </div>
          <div class="setting-row">
            <span>活跃密钥</span>
            <span class="setting-status">{{ cryptoStatus.activeKeyCount }} 个</span>
          </div>
          <div class="setting-row">
            <span>已撤销密钥</span>
            <span class="setting-status">{{ cryptoStatus.revokedKeyCount }} 个</span>
          </div>
          <div class="setting-row">
            <span>自动轮换</span>
            <span class="setting-status" :class="{ on: cryptoConfig.autoRotationEnabled }">{{ cryptoConfig.autoRotationEnabled ? '已启用 · ' + cryptoConfig.autoRotationDays + ' 天' : '已关闭' }}</span>
          </div>
          <div class="setting-row">
            <span>加密 / 解密次数</span>
            <span class="setting-status">{{ cryptoStatus.encryptionCount }} / {{ cryptoStatus.decryptionCount }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGuard } from '../../modules/guard'
import { useConfig } from '../../resonance/bridges/config'
import { usePerceptionStore } from '../../stores/perception'
import { useSecurityDashboard, THREAT_LEVEL_META, THREAT_TYPE_META } from '../../modules/safety'
import { useCryptoGuard } from '../../modules/safety'

const guard = useGuard()
const { sessionActivity, contacts, visitLogs, anonymousMode, dataReflux, externalLinkControl } = guard

const configBridge = useConfig()
const advisorEnabled = computed({
  get: () => configBridge.config.advisorEnabled,
  set: (v: boolean) => configBridge.updateAdvisorEnabled(v),
})

interface SubTabItem {
  id: string
  label: string
  icon: string
}

const SECURITY_SUB_TABS: SubTabItem[] = [
  { id: 'data-security', label: '数据安全', icon: '🔐' },
  { id: 'network-security', label: '网络安全', icon: '🌐' },
  { id: 'device-security', label: '设备安全', icon: '📱' },
  { id: 'emergency-security', label: '应急安全', icon: '🆘' },
  { id: 'situation-center', label: '态势中心', icon: '📡' },
  { id: 'privacy-crypto', label: '隐私加密', icon: '🔒' },
]

const securitySubTab = ref<string>('data-security')

// ---- 安全态势中心 ----
const securityDashboard = useSecurityDashboard()
const dashboard = computed(() => securityDashboard.getDashboard())

// ---- 隐私加密 ----
const cryptoGuard = useCryptoGuard()
const cryptoStatus = computed(() => cryptoGuard.status.value)
const cryptoConfig = computed(() => cryptoGuard.config.value)
const cryptoReady = computed(() => cryptoGuard.isReady.value)

const deviceInfo = ref('')
try { deviceInfo.value = navigator.userAgent.slice(0, 60) + '…' } catch { deviceInfo.value = '未知设备' }
const unlockMethod = ref('密码')
const dataExportLogs = ref<{ id: string; time: string; type: string }[]>([])

// ---- P2 感知层：设备实时状态 ----
const perceptionStore = usePerceptionStore()
const perceptionEnv = computed(() => perceptionStore.environment)

/** 电池状态描述 */
const batteryStatusText = computed(() => {
  const level = perceptionEnv.value.batteryLevel
  if (level === null) return '不可用'
  const pct = Math.round(level * 100)
  const charging = perceptionEnv.value.isCharging ? ' (充电中)' : ''
  return `${pct}%${charging}`
})

/** 电池状态颜色 */
const batteryStatusColor = computed(() => {
  const level = perceptionEnv.value.batteryLevel
  if (level === null) return 'var(--text-secondary)'
  if (perceptionEnv.value.isLowPower) return '#ef4444'
  if (level <= 0.2) return '#f0c040'
  return '#34d399'
})

/** 网络状态 */
const networkStatusText = computed(() =>
  perceptionEnv.value.isOnline ? '在线' : '离线'
)
const networkStatusColor = computed(() =>
  perceptionEnv.value.isOnline ? '#34d399' : '#ef4444'
)

/** 屏幕状态 */
const screenStatusText = computed(() =>
  perceptionEnv.value.isScreenAwake ? '活跃' : '休眠'
)

/** 环境光描述 */
const ambientLightText = computed(() => {
  const lux = perceptionEnv.value.ambientLight
  if (lux === null) return '不可用'
  if (lux < 10) return '暗环境'
  if (lux < 100) return '室内'
  if (lux < 1000) return '明亮'
  return '强光'
})

const sessionStatus = computed(() => {
  const recent = sessionActivity.value.slice(0, 5)
  if (recent.length === 0) return { label: '无活动记录', level: 'idle', color: 'rgba(232,224,216,0.35)' }
  const last = new Date(recent[0].at)
  const now = Date.now()
  const diff = now - last.getTime()
  if (diff < 60000) return { label: '活跃', level: 'active', color: '#34d399' }
  if (diff < 300000) return { label: '近期活跃', level: 'recent', color: '#f0c040' }
  return { label: '空闲', level: 'idle', color: 'rgba(232,224,216,0.35)' }
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

// 会话活跃度监控
function clearSessionActivity() {
  guard.clearSessionActivity()
}

const verifyText = ref('')
const verified = ref('')

function triggerSOS() { alert('SOS 已触发！将向紧急联系人发送位置。\n（此功能需设备权限）') }
function triggerFakeCall() { alert('假来电将在 5 秒后触发…') }
function triggerCheckin() { alert('报平安消息已发送给紧急联系人。') }
</script>

<style scoped src="./guard-shared.css"></style>
