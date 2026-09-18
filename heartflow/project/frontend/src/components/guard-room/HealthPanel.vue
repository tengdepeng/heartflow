<template>
  <div data-enter class="guard-tab-content">
    <!-- 紧急联系人 -->
    <section class="guard-section">
      <h3 class="section-label">紧急联系人</h3>
      <div class="contact-list" v-if="contacts.length">
        <div v-for="c in contacts" :key="c.id" class="contact-row">
          <span class="contact-priority">{{ c.priority === 'primary' ? '⭐' : '🔹' }}</span>
          <template v-if="editingContactId === c.id">
            <input v-model="editForm.name" class="guard-input" style="flex:1" />
            <input v-model="editForm.phone" class="guard-input" style="flex:1" />
            <button class="guard-btn" @click="saveEdit(c.id)">保存</button>
            <button class="guard-btn" @click="cancelEdit">取消</button>
          </template>
          <template v-else>
            <span>{{ c.name }}</span>
            <span class="contact-phone">{{ c.phone }}</span>
            <span class="contact-tag">{{ c.priority === 'primary' ? '主要' : '备用' }}</span>
            <button class="guard-del" @click="editContact(c)">✎</button>
            <button class="guard-del" @click="removeContact(c.id)">×</button>
          </template>
        </div>
      </div>
      <div class="add-row">
        <input v-model="contactForm.name" placeholder="姓名" class="guard-input" />
        <input v-model="contactForm.phone" placeholder="电话" class="guard-input" />
        <select v-model="contactForm.priority" class="guard-select">
          <option value="primary">⭐ 主要</option>
          <option value="secondary">🔹 备用</option>
        </select>
        <button @click="addContact" class="guard-btn" :disabled="!contactForm.name||!contactForm.phone">添加</button>
      </div>
    </section>

    <!-- 身体数据概览 -->
    <section class="guard-section">
      <h3 class="section-label">身体数据概览</h3>
      <div class="health-grid">
        <!-- 心率 -->
        <div class="health-card">
          <div class="hc-icon">💓</div>
          <div class="hc-body">
            <span class="hc-label">心率</span>
            <span class="hc-value">{{ heartRate }} <small>bpm</small></span>
            <div class="hc-bar-wrap">
              <div class="hc-bar" :style="{ width: heartRatePercent + '%', background: heartRateColor }"></div>
            </div>
            <span class="hc-note">{{ heartRateNote }}</span>
          </div>
          <div class="hc-input-row">
            <input v-model.number="heartRateInput" type="number" min="40" max="200" placeholder="手动输入" class="hc-input" />
            <button class="hc-btn" @click="logHeartRate">记录</button>
          </div>
        </div>
        <!-- 睡眠 -->
        <div class="health-card">
          <div class="hc-icon">😴</div>
          <div class="hc-body">
            <span class="hc-label">睡眠</span>
            <span class="hc-value">{{ sleepAvg }} <small>h</small></span>
            <div class="hc-bar-wrap">
              <div class="hc-bar" :style="{ width: sleepPercent + '%', background: sleepColor }"></div>
            </div>
            <span class="hc-note">{{ sleepNote }}</span>
          </div>
          <div class="hc-mini-chart" v-if="sleepChart.length">
            <span v-for="(d, i) in sleepChart" :key="i" class="hc-spark"
              :style="{ height: (d / 10) * 100 + '%', background: d >= 7 ? '#34d399' : d >= 6 ? '#f0c040' : '#ef4444' }"
              :title="d + 'h'"
            ></span>
          </div>
        </div>
        <!-- 活动 -->
        <div class="health-card">
          <div class="hc-icon">🏃</div>
          <div class="hc-body">
            <span class="hc-label">活动</span>
            <span class="hc-value">{{ exerciseWeek }} <small>分/周</small></span>
            <div class="hc-bar-wrap">
              <div class="hc-bar" :style="{ width: exercisePercent + '%', background: exerciseColor }"></div>
            </div>
            <span class="hc-note">{{ exerciseNote }}</span>
          </div>
          <div class="hc-mini-chart" v-if="exerciseChart.length">
            <span v-for="(d, i) in exerciseChart" :key="i" class="hc-spark"
              :style="{ height: Math.min((d / 60) * 100, 100) + '%', background: d >= 30 ? '#34d399' : d >= 15 ? '#f0c040' : '#ef4444' }"
              :title="d + '分'"
            ></span>
          </div>
        </div>
      </div>
      <p class="setting-hint" style="margin-top:16px">数据来自身体温室，在此处汇聚总览。心率可手动追踪。</p>
    </section>

    <!-- ====== 健康台：存储空间监视 ====== -->
    <section class="guard-section">
      <h3 class="section-label">存储空间监视</h3>
      <div class="hd-storage-card">
        <div class="hd-storage-info">
          <span class="hd-storage-icon">💾</span>
          <div class="hd-storage-details">
            <span class="hd-storage-label">本地存储用量</span>
            <span class="hd-storage-value">{{ storageSize }} / {{ storageUsagePercent }}%</span>
          </div>
        </div>
        <div class="hd-storage-light-column">
          <div class="hd-light-segment safe" :class="{ active: storageLevel === 'safe' }">
            <span class="hd-light-glow" :style="{ background: storageLevel === 'safe' ? '#34d399' : 'rgba(52,211,153,0.15)', boxShadow: storageLevel === 'safe' ? '0 0 12px #34d399' : 'none' }"></span>
            <span class="hd-light-label">安全</span>
          </div>
          <div class="hd-light-segment warning" :class="{ active: storageLevel === 'warning' }">
            <span class="hd-light-glow" :style="{ background: storageLevel === 'warning' ? '#f0c040' : 'rgba(240,192,64,0.15)', boxShadow: storageLevel === 'warning' ? '0 0 12px #f0c040' : 'none' }"></span>
            <span class="hd-light-label">警告</span>
          </div>
          <div class="hd-light-segment critical" :class="{ active: storageLevel === 'critical' }">
            <span class="hd-light-glow" :style="{ background: storageLevel === 'critical' ? '#ef4444' : 'rgba(239,68,68,0.15)', boxShadow: storageLevel === 'critical' ? '0 0 12px #ef4444' : 'none' }"></span>
            <span class="hd-light-label">危险</span>
          </div>
        </div>
        <div class="hd-storage-bar-track">
          <div class="hd-storage-bar-fill" :style="{ width: storageUsagePercent + '%', background: storageLevelColor }"></div>
        </div>
      </div>
    </section>

    <!-- ====== 健康台：权限光点 ====== -->
    <section class="guard-section">
      <h3 class="section-label">权限光点</h3>
      <div class="hd-permission-grid">
        <div
          v-for="perm in permissionLights"
          :key="perm.key"
          class="hd-permission-dot-card"
          :class="perm.status"
          @click="cyclePermissionStatus(perm.key)"
        >
          <div class="hd-perm-dot" :class="perm.status">
            <span class="hd-perm-dot-inner"></span>
          </div>
          <span class="hd-perm-label">{{ perm.label }}</span>
          <span class="hd-perm-status-text">{{ perm.statusText }}</span>
        </div>
      </div>
      <div class="hd-permission-legend">
        <span class="hd-legend-item"><span class="hd-legend-dot authorized"></span> 已授权</span>
        <span class="hd-legend-item"><span class="hd-legend-dot unauthorized"></span> 未授权</span>
        <span class="hd-legend-item"><span class="hd-legend-dot revoked"></span> 已撤销</span>
      </div>
    </section>

    <!-- ====== 健康台：数据完整性 ====== -->
    <section class="guard-section">
      <h3 class="section-label">数据完整性</h3>
      <div class="hd-integrity-card">
        <div class="hd-integrity-indicator" :class="{ broken: !dataIntegrity.intact }">
          <div class="hd-integrity-pattern">
            <span v-for="i in 12" :key="i" class="hd-integrity-segment"
              :style="{
                opacity: dataIntegrity.intact ? 1 : (i % 3 === 0 ? 0.2 : 1),
                animationDelay: (i * 0.15) + 's',
              }"
              :class="{ broken: !dataIntegrity.intact && i % 3 === 0 }"
            ></span>
          </div>
        </div>
        <div class="hd-integrity-info">
          <span class="hd-integrity-status" :style="{ color: dataIntegrity.intact ? '#34d399' : '#ef4444' }">
            {{ dataIntegrity.intact ? '数据完整' : '数据异常' }}
          </span>
          <span class="hd-integrity-desc">{{ dataIntegrity.description }}</span>
        </div>
      </div>
    </section>

    <!-- ====== 健康台：崩溃恢复日志 ====== -->
    <section class="guard-section">
      <h3 class="section-label">崩溃恢复日志</h3>
      <div class="hd-crash-card">
        <div class="hd-crash-list" v-if="crashLogs.length">
          <div v-for="log in crashLogs.slice(0, 10)" :key="log.id" class="hd-crash-row" :class="log.level">
            <span class="hd-crash-time">{{ log.at.slice(0, 16).replace('T', ' ') }}</span>
            <span class="hd-crash-level-badge" :class="log.level">{{ log.level === 'recovered' ? '已恢复' : log.level === 'warning' ? '警告' : '错误' }}</span>
            <span class="hd-crash-msg">{{ log.message }}</span>
            <button class="guard-del hd-crash-del" @click="removeCrashLog(log.id)">×</button>
          </div>
        </div>
        <p v-else class="setting-hint">暂无崩溃恢复记录。系统运行正常。</p>
        <div class="hd-crash-actions">
          <button class="guard-btn" @click="addCrashLog('recovered')">模拟记录</button>
          <button class="guard-btn" @click="clearCrashLogs" :disabled="!crashLogs.length">清除全部</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useGuard, type GuardContact, type GuardCrashLevel } from '../../modules/guard'
import { useHealth } from '../../resonance/bridges/health'

const guard = useGuard()
const { contacts, permissionLights, crashLogs } = guard
const health = useHealth()
const { bodyLogs, guardHeartRateLogs: heartRateLogs } = health

const contactForm = reactive({ name: '', phone: '', priority: 'primary' as const })
function addContact() {
  guard.addContact(contactForm.name, contactForm.phone, contactForm.priority)
  contactForm.name = ''
  contactForm.phone = ''
}
function removeContact(id: string) { guard.removeContact(id) }

const editingContactId = ref<string | null>(null)
const editForm = reactive({ name: '', phone: '', priority: 'primary' as 'primary' | 'secondary' })
function editContact(c: GuardContact) {
  editingContactId.value = c.id
  editForm.name = c.name
  editForm.phone = c.phone
  editForm.priority = c.priority
}
function saveEdit(id: string) {
  const c = contacts.value.find(c => c.id === id)
  if (c) { c.name = editForm.name; c.phone = editForm.phone; c.priority = editForm.priority; guard.saveContacts() }
  editingContactId.value = null
}
function cancelEdit() { editingContactId.value = null }

const storageSize = computed(() => {
  try {
    let total = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i); if (k) total += localStorage.getItem(k)?.length || 0
    }
    return total > 1024 ? `${(total / 1024).toFixed(1)}KB` : `${total}B`
  } catch { return '未知' }
})

// ---- 健康数据 ----
const heartRateInput = ref(72)

function logHeartRate() {
  if (heartRateInput.value < 40 || heartRateInput.value > 200) return
  health.addGuardHeartRateLog(heartRateInput.value)
  heartRateInput.value = 72
}

const recentHeartRate = computed(() => heartRateLogs.value.slice(0, 7).reverse())
const heartRate = computed(() => {
  const r = recentHeartRate.value
  if (!r.length) return '--'
  return Math.round(r.reduce((s, l) => s + l.bpm, 0) / r.length)
})
const heartRatePercent = computed(() => {
  if (typeof heartRate.value !== 'number') return 0
  return Math.min((heartRate.value / 100) * 100, 100)
})
const heartRateColor = computed(() => {
  if (typeof heartRate.value !== 'number') return 'rgba(232,224,216,0.53)'
  if (heartRate.value >= 60 && heartRate.value <= 80) return '#34d399'
  if (heartRate.value >= 50 && heartRate.value <= 100) return '#f0c040'
  return '#ef4444'
})
const heartRateNote = computed(() => {
  if (typeof heartRate.value !== 'number') return '暂无数据'
  if (heartRate.value >= 60 && heartRate.value <= 80) return '静息心率良好'
  if (heartRate.value >= 50 && heartRate.value <= 100) return '在正常范围内'
  return '建议关注'
})

const recentSleep = computed(() => {
  return bodyLogs.value.filter(l => l.type === 'sleep').slice(0, 7)
})
const sleepAvg = computed(() => {
  const s = recentSleep.value
  if (!s.length) return '--'
  const avg = s.reduce((sum, l) => sum + (l.value.hours || 0), 0) / s.length
  return avg.toFixed(1)
})
const sleepAvgNum = computed(() => {
  const s = recentSleep.value
  if (!s.length) return 0
  return s.reduce((sum, l) => sum + (l.value.hours || 0), 0) / s.length
})
const sleepPercent = computed(() => Math.min((sleepAvgNum.value / 8) * 100, 100))
const sleepColor = computed(() => {
  if (sleepAvgNum.value >= 7) return '#34d399'
  if (sleepAvgNum.value >= 6) return '#f0c040'
  if (sleepAvgNum.value > 0) return '#ef4444'
  return 'rgba(232,224,216,0.53)'
})
const sleepNote = computed(() => {
  if (!recentSleep.value.length) return '暂无数据'
  if (sleepAvgNum.value >= 7) return '睡眠充足'
  if (sleepAvgNum.value >= 6) return '睡眠尚可'
  return '睡眠不足'
})
const sleepChart = computed(() => {
  return recentSleep.value.map(l => l.value.hours || 0).reverse()
})

const recentExercise = computed(() => {
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  return bodyLogs.value.filter(l => l.type === 'exercise' && new Date(l.at) >= weekStart)
})
const exerciseWeek = computed(() => {
  return recentExercise.value.reduce((sum, l) => sum + (l.value.minutes || 0), 0)
})
const exercisePercent = computed(() => Math.min((exerciseWeek.value / 150) * 100, 100))
const exerciseColor = computed(() => {
  if (exerciseWeek.value >= 150) return '#34d399'
  if (exerciseWeek.value >= 75) return '#f0c040'
  if (exerciseWeek.value > 0) return '#ef4444'
  return 'rgba(232,224,216,0.53)'
})
const exerciseNote = computed(() => {
  if (!recentExercise.value.length) return '暂无数据'
  if (exerciseWeek.value >= 150) return '达标！'
  if (exerciseWeek.value >= 75) return '完成一半'
  return '需要加油'
})
const exerciseChart = computed(() => {
  const days: number[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i)
    const dayStr = d.toISOString().slice(0, 10)
    const total = recentExercise.value
      .filter(l => l.at.startsWith(dayStr))
      .reduce((s, l) => s + (l.value.minutes || 0), 0)
    days.push(total)
  }
  return days
})

// ---- 健康台：存储空间监视 ----
const storageUsagePercent = computed(() => {
  try {
    const estimatedMax = 5 * 1024 * 1024 // 5MB 估算上限
    let total = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k) total += localStorage.getItem(k)?.length || 0
    }
    return Math.min(Math.round((total / estimatedMax) * 100), 100)
  } catch {
    return 0
  }
})

const storageLevel = computed<'safe' | 'warning' | 'critical'>(() => {
  if (storageUsagePercent.value < 50) return 'safe'
  if (storageUsagePercent.value < 80) return 'warning'
  return 'critical'
})

const storageLevelColor = computed(() => {
  switch (storageLevel.value) {
    case 'safe': return '#34d399'
    case 'warning': return '#f0c040'
    case 'critical': return '#ef4444'
  }
})

// ---- 健康台：权限光点 ----
function cyclePermissionStatus(key: string) {
  guard.cyclePermissionStatus(key)
}

// ---- 健康台：数据完整性 ----
const dataIntegrity = computed(() => {
  let intact = true
  const checks: string[] = []

  try {
    const schema = guard.isKeyPresent
    if (typeof schema !== 'function') {
      intact = false
      checks.push('存储模块异常')
    }

    try {
      const testKey = '__hf_integrity_test__'
      localStorage.setItem(testKey, '1')
      localStorage.removeItem(testKey)
    } catch {
      intact = false
      checks.push('本地存储不可写')
    }

    const criticalKeys = ['hf:contacts', 'hf:guard_visits']
    for (const ck of criticalKeys) {
      try {
        if (!guard.isKeyPresent(ck)) {
          checks.push(`${ck} 缺失`)
        }
      } catch {
        intact = false
        checks.push(`${ck} 读取失败`)
      }
    }
  } catch {
    intact = false
    checks.push('存储系统异常')
  }

  return {
    intact,
    description: intact ? '所有数据模块运行正常，未检测到损坏或异常。' : checks.join('；'),
  }
})

// ---- 健康台：崩溃恢复日志 ----
function addCrashLog(level: GuardCrashLevel = 'recovered') {
  guard.addCrashLog(level)
}

function removeCrashLog(id: string) {
  guard.removeCrashLog(id)
}

function clearCrashLogs() {
  guard.clearCrashLogs()
}
</script>

<style scoped src="./guard-shared.css"></style>
