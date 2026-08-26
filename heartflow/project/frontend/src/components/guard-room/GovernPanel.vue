<template>
  <div data-enter class="guard-tab-content">
    <!-- 次级标签导航 -->
    <nav class="guard-sub-tabs">
      <button
        v-for="sub in GOVERN_SUB_TABS"
        :key="sub.id"
        class="guard-sub-tab"
        :class="{ active: governSubTab === sub.id }"
        @click="governSubTab = sub.id"
      >
        <span class="sub-tab-icon">{{ sub.icon }}</span>
        <span class="sub-tab-label">{{ sub.label }}</span>
      </button>
    </nav>

    <!-- 数据治理 -->
    <div v-if="governSubTab === 'data-govern'" class="guard-sub-tab-content">
      <div class="sub-card">
        <div class="sub-card-header">
          <span class="sub-card-icon">📊</span>
          <div>
            <h4 class="sub-card-title">数据治理</h4>
            <p class="sub-card-desc">管理本地数据存储和加密备份</p>
          </div>
        </div>
        <div class="sub-card-body">
          <div class="setting-row">
            <span>数据全部本地存储</span>
            <span class="setting-status on">✅ 已保护</span>
          </div>
          <div class="setting-row">
            <span>存储空间</span>
            <span class="setting-status">{{ storageSize }}</span>
          </div>
          <div class="setting-row">
            <span>加密备份状态</span>
            <span class="setting-status on">已启用</span>
          </div>
          <div class="setting-row">
            <span>数据回流总开关</span>
            <label class="toggle"><input type="checkbox" v-model="dataReflux" /><span class="toggle-slider" /></label>
          </div>
          <div style="margin-top:12px">
            <button class="guard-btn" @click="exportBackup">导出备份</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 存储治理 -->
    <div v-if="governSubTab === 'storage-govern'" class="guard-sub-tab-content">
      <div class="sub-card">
        <div class="sub-card-header">
          <span class="sub-card-icon">💾</span>
          <div>
            <h4 class="sub-card-title">存储治理</h4>
            <p class="sub-card-desc">查看各模块存储占用情况</p>
          </div>
        </div>
        <div class="sub-card-body">
          <div class="setting-row" v-for="mod in moduleStorageUsage" :key="mod.key">
            <span>{{ mod.icon }} {{ mod.key }}</span>
            <span class="setting-status">{{ mod.size }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 权限治理 -->
    <div v-if="governSubTab === 'permission-govern'" class="guard-sub-tab-content">
      <div class="sub-card">
        <div class="sub-card-header">
          <span class="sub-card-icon">🔑</span>
          <div>
            <h4 class="sub-card-title">权限治理</h4>
            <p class="sub-card-desc">管理幕僚访问权限和外部集成</p>
          </div>
        </div>
        <div class="sub-card-body">
          <div class="setting-row">
            <span>幕僚访问权限</span>
            <label class="toggle"><input type="checkbox" v-model="advisorEnabled" /><span class="toggle-slider" /></label>
          </div>
          <div class="setting-row">
            <span>数据导出</span>
            <button class="guard-btn" @click="exportBackup">导出全部</button>
          </div>
          <div class="setting-row">
            <span>外部集成状态</span>
            <span class="setting-status">未集成</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 隐私治理 -->
    <div v-if="governSubTab === 'privacy-govern'" class="guard-sub-tab-content">
      <div class="sub-card">
        <div class="sub-card-header">
          <span class="sub-card-icon">🔍</span>
          <div>
            <h4 class="sub-card-title">隐私治理</h4>
            <p class="sub-card-desc">管理匿名模式、数据保留和清除</p>
          </div>
        </div>
        <div class="sub-card-body">
          <div class="setting-row">
            <span>匿名模式</span>
            <label class="toggle"><input type="checkbox" v-model="anonymousMode" /><span class="toggle-slider" /></label>
          </div>
          <div class="setting-row">
            <span>数据保留期</span>
            <span class="setting-status">{{ dataRetentionDays }} 天</span>
          </div>
          <div class="setting-row">
            <span>清除所有数据</span>
            <button class="guard-btn" @click="clearAllData">清除</button>
          </div>
          <div class="setting-row">
            <span>导出所有数据</span>
            <button class="guard-btn" @click="exportBackup">导出</button>
          </div>
        </div>
      </div>
      <!-- 访问记录 -->
      <section class="guard-section" style="margin-top:24px">
        <h3 class="section-label">访问记录</h3>
        <div class="visit-list" v-if="visitLogs.length">
          <div v-for="log in visitLogs.slice(0, 10)" :key="log.id" class="visit-row">
            <span class="visit-time">{{ log.at.slice(0, 16) }}</span>
            <span class="visit-action">{{ log.action }}</span>
            <button class="guard-del" @click="clearVisitLog(log.id)">×</button>
          </div>
        </div>
        <p v-else class="setting-hint">还没有访问记录</p>
        <button class="guard-btn" @click="addVisitLog" style="margin-top:6px">记录本次访问</button>
      </section>
    </div>

    <!-- 数据主权 -->
    <div v-if="governSubTab === 'sovereignty'" class="guard-sub-tab-content">
      <div class="sub-card">
        <div class="sub-card-header">
          <span class="sub-card-icon">🏛</span>
          <div>
            <h4 class="sub-card-title">数据主权</h4>
            <p class="sub-card-desc">完全掌控你的数据——导出、遗忘、迁移、退场</p>
          </div>
        </div>
        <div class="sub-card-body">
          <!-- 数据清单 -->
          <div class="sub-card-section">
            <h5 class="sub-card-section-title">数据清单 ({{ dataInventory.length }} 个模块)</h5>
            <div class="inventory-list">
              <div v-for="item in dataInventory" :key="item.key" class="inventory-row">
                <span class="inventory-icon">{{ item.icon }}</span>
                <div class="inventory-info">
                  <span class="inventory-name">{{ item.name }}</span>
                  <span class="inventory-size">{{ item.size }}</span>
                </div>
                <span v-if="forgetCtrl.getAgingProgress(item.key) > 0" class="aging-badge" :title="`自然老化 ${forgetCtrl.getAgingProgress(item.key)}%`">
                  🍂 {{ forgetCtrl.getAgingProgress(item.key) }}%
                </span>
                <button class="guard-del" @click="showForgetMethodPicker(item.key, item.name, item.prefix)" title="遗忘此模块">🗑</button>
              </div>
            </div>
          </div>
          <!-- 选择性导出 -->
          <div class="sub-card-section">
            <h5 class="sub-card-section-title">选择性导出</h5>
            <div class="export-options">
              <label class="export-option" v-for="item in dataInventory" :key="'exp'+item.key">
                <input type="checkbox" v-model="selectedExportKeys" :value="item.key" />
                <span>{{ item.icon }} {{ item.name }}</span>
              </label>
            </div>
            <button class="guard-btn" @click="exportSelected" :disabled="!selectedExportKeys.length" style="margin-top:8px">
              导出选中 ({{ selectedExportKeys.length }})
            </button>
          </div>
          <!-- 遗忘方法选择 -->
          <div class="sub-card-section" v-if="forgetTarget">
            <h5 class="sub-card-section-title">遗忘「{{ forgetTarget.name }}」</h5>
            <p class="setting-hint">选择遗忘方法：</p>
            <div class="forget-method-grid">
              <button
                v-for="method in FORGET_METHODS"
                :key="method.id"
                class="forget-method-btn"
                :class="{ active: forgetCtrl.selectedMethod.value === method.id }"
                @click="forgetCtrl.selectMethod(method.id)"
              >
                <span class="method-icon">{{ method.icon }}</span>
                <span class="method-label">{{ method.label }}</span>
                <span class="method-desc">{{ method.description }}</span>
                <span v-if="method.reversible" class="method-tag">可恢复</span>
              </button>
            </div>
            <div class="forget-actions">
              <button class="guard-btn forget-btn" @click="confirmForgetModule" :disabled="forgetCtrl.isForgetting.value">
                {{ forgetCtrl.isForgetting.value ? '执行中…' : '确认遗忘' }}
              </button>
              <button class="guard-btn" @click="cancelForget">取消</button>
            </div>
            <!-- 遗忘结果 -->
            <div v-if="forgetCtrl.lastForgetResult.value" class="forget-result" :class="{ success: forgetCtrl.lastForgetResult.value.success }">
              <span>{{ forgetCtrl.lastForgetResult.value.success ? '✅' : '❌' }}</span>
              <span>
                {{ forgetCtrl.lastForgetResult.value.success
                  ? `已遗忘，释放 ${forgetCtrl.formatBytes(forgetCtrl.lastForgetResult.value.freedBytes)}，影响 ${forgetCtrl.lastForgetResult.value.affectedCount} 项数据`
                  : `遗忘失败: ${forgetCtrl.lastForgetResult.value.error}` }}
              </span>
              <button class="guard-del" @click="forgetCtrl.clearResult()">×</button>
            </div>
          </div>
          <!-- 遗忘记录 -->
          <div class="sub-card-section" v-if="forgetCtrl.recentRecords.value.length > 0">
            <h5 class="sub-card-section-title">遗忘记录 ({{ forgetCtrl.recentRecords.value.length }})</h5>
            <div class="forget-records">
              <div v-for="record in forgetCtrl.recentRecords.value" :key="record.id" class="forget-record-row">
                <span class="forget-record-icon">{{ FORGET_METHODS.find(m => m.id === record.method)?.icon }}</span>
                <span class="forget-record-name">{{ record.moduleName }}</span>
                <span class="forget-record-size">{{ forgetCtrl.formatBytes(record.freedBytes) }}</span>
                <span class="forget-record-time">{{ forgetCtrl.formatForgetTime(record.timestamp) }}</span>
                <span v-if="record.recoverable && record.recoverableUntil && record.recoverableUntil > Date.now()" class="recoverable-tag">
                  可恢复·{{ forgetCtrl.formatRecoverableUntil(record.recoverableUntil) }}
                </span>
              </div>
            </div>
          </div>
          <!-- 可恢复数据 -->
          <div class="sub-card-section" v-if="forgetCtrl.sealedList.value.length > 0 || forgetCtrl.hibernatedList.value.length > 0">
            <h5 class="sub-card-section-title">可恢复数据</h5>
            <div class="recoverable-list">
              <div v-for="sealed in forgetCtrl.sealedList.value" :key="sealed.id" class="recoverable-row">
                <span class="recoverable-icon">📦</span>
                <span class="recoverable-name">{{ sealed.moduleKey }} (封存)</span>
                <span class="recoverable-time">{{ forgetCtrl.formatRecoverableUntil(sealed.expiresAt) }}</span>
                <button class="guard-btn" @click="recoverSealedData(sealed.id)">恢复</button>
              </div>
              <div v-for="hibernated in forgetCtrl.hibernatedList.value" :key="hibernated.id" class="recoverable-row">
                <span class="recoverable-icon">💤</span>
                <span class="recoverable-name">{{ hibernated.moduleKey }} (休眠)</span>
                <span class="recoverable-time">{{ forgetCtrl.formatRecoverableUntil(hibernated.expiresAt) }}</span>
                <button class="guard-btn" @click="recoverHibernatedData(hibernated.id)">恢复</button>
              </div>
            </div>
          </div>
          <!-- 跨端接续 -->
          <div class="sub-card-section">
            <h5 class="sub-card-section-title">跨端接续</h5>
            <CrossDevicePanel />
          </div>
          <!-- 大厅退出状态 -->
          <div class="sub-card-section">
            <h5 class="sub-card-section-title">大厅退出状态</h5>
            <p class="setting-hint">选择你偏好的退出方式，定义每次离开的心境</p>
            <div class="exit-state-grid">
              <button
                v-for="state in hallExitCtrl.exitStates.value"
                :key="state.id"
                class="exit-state-btn"
                :class="{ active: hallExitCtrl.selectedExitState.value === state.id }"
                :style="{
                  borderColor: hallExitCtrl.selectedExitState.value === state.id ? state.color : 'transparent',
                  boxShadow: hallExitCtrl.selectedExitState.value === state.id ? `0 0 12px ${state.color}40` : 'none',
                }"
                @click="hallExitCtrl.selectExitState(state.id)"
              >
                <span class="exit-state-icon">{{ state.icon }}</span>
                <span class="exit-state-label">{{ state.label }}</span>
                <span class="exit-state-poem">{{ state.poem }}</span>
              </button>
            </div>
            <div class="exit-state-settings">
              <label class="setting-row">
                <span>退出过渡动画</span>
                <label class="toggle">
                  <input type="checkbox" v-model="hallExitCtrl.exitTransitionEnabled.value" />
                  <span class="toggle-slider" />
                </label>
              </label>
              <button class="guard-btn" @click="previewExitTransition" style="margin-top:8px">
                预览退出过渡
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ====== 遗忘仪式组件 ====== -->
    <ForgettingRitual
      :visible="showRitual"
      :module-name="ritualModuleName"
      :affected-count="ritualAffectedCount"
      :freed-bytes="ritualFreedBytes"
      method="forgetting-ritual"
      @complete="onRitualComplete"
      @cancel="onRitualCancel"
    />

    <!-- ====== 大厅退出过渡组件 ====== -->
    <HallExitTransition
      :visible="hallExitCtrl.showExitTransition.value"
      :exit-state="hallExitCtrl.selectedExitState.value"
      :duration="hallExitCtrl.currentExitStateInfo.value.transitionDuration"
      @complete="onExitTransitionComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useConfig } from '../../resonance/bridges/config'
import { useGuard } from '../../modules/guard'
import { useForgetting } from '../../modules/data-sovereignty/composables/useForgetting'
import { useHallExit } from '../../modules/data-sovereignty/composables/useHallExit'
import { FORGET_METHODS } from '../../modules/data-sovereignty'
import ForgettingRitual from '../../components/data-sovereignty/ForgettingRitual.vue'
import HallExitTransition from '../../components/data-sovereignty/HallExitTransition.vue'
import CrossDevicePanel from '../../components/data-sovereignty/CrossDevicePanel.vue'

const guard = useGuard()
const { dataReflux, visitLogs, anonymousMode } = guard

const configBridge = useConfig()
const advisorEnabled = computed({
  get: () => configBridge.config.advisorEnabled,
  set: (v: boolean) => configBridge.updateAdvisorEnabled(v),
})

const forgetCtrl = useForgetting()
const hallExitCtrl = useHallExit()

interface SubTabItem {
  id: string
  label: string
  icon: string
}

const GOVERN_SUB_TABS: SubTabItem[] = [
  { id: 'data-govern', label: '数据治理', icon: '📊' },
  { id: 'storage-govern', label: '存储治理', icon: '💾' },
  { id: 'permission-govern', label: '权限治理', icon: '🔑' },
  { id: 'privacy-govern', label: '隐私治理', icon: '🔍' },
  { id: 'sovereignty', label: '数据主权', icon: '🏛' },
]

const governSubTab = ref<string>('data-govern')

// 隐私治理状态（anonymousMode 已下沉为 useGuard 单例，此处不再本地声明）
const dataRetentionDays = ref(90)

// 存储空间
const storageSize = computed(() => {
  try {
    let total = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i); if (k) total += localStorage.getItem(k)?.length || 0
    }
    return total > 1024 ? `${(total / 1024).toFixed(1)}KB` : `${total}B`
  } catch { return '未知' }
})

interface ModuleStorage {
  key: string
  prefix: string
  icon: string
  size: string
}
const moduleStorageUsage = computed<ModuleStorage[]>(() => {
  const modules = [
    { key: '情绪记录', prefix: 'hf:mood', icon: '📝' },
    { key: '锚点数据', prefix: 'hf:anchor', icon: '⚓' },
    { key: '目标', prefix: 'hf:goal', icon: '🎯' },
    { key: '知识节点', prefix: 'hf:knowledge', icon: '📚' },
  ]
  return modules.map(m => {
    let total = 0
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(m.prefix)) {
          total += localStorage.getItem(k)?.length || 0
        }
      }
    } catch { /* ignore */ }
    const size = total > 1024 ? `${(total / 1024).toFixed(1)}KB` : `${total}B`
    return { ...m, size }
  })
})

// ---- 数据主权 ----
interface DataInventoryItem {
  key: string
  name: string
  icon: string
  prefix: string
  size: string
  rawSize: number
}

const MODULE_CATALOG: { key: string; name: string; icon: string; prefix: string }[] = [
  { key: 'knowledge', name: '知识节点', icon: '📚', prefix: 'hf:knowledge' },
  { key: 'mood', name: '情绪记录', icon: '📝', prefix: 'hf:mood' },
  { key: 'anchor', name: '锚点数据', icon: '⚓', prefix: 'hf:anchor' },
  { key: 'goal', name: '目标', icon: '🎯', prefix: 'hf:goal' },
  { key: 'contact', name: '联系人', icon: '👤', prefix: 'hf:contacts' },
  { key: 'guard', name: '访问记录', icon: '🔐', prefix: 'hf:guard' },
  { key: 'timer', name: '计时数据', icon: '⏱', prefix: 'hf:timer' },
  { key: 'note', name: '笔记', icon: '📓', prefix: 'hf:note' },
  { key: 'constitution', name: '宪法配置', icon: '⚖', prefix: 'hf:constitution' },
  { key: 'plugin', name: '插件', icon: '🧩', prefix: 'hf:plugin' },
  { key: 'carrier', name: '载体', icon: '📦', prefix: 'hf:carrier' },
  { key: 'emotion', name: '情绪', icon: '💜', prefix: 'hf:emotion' },
  { key: 'relation', name: '关系', icon: '🔗', prefix: 'hf:relation' },
  { key: 'scene', name: '场景预设', icon: '🎬', prefix: 'hf:scene' },
  { key: 'config', name: '系统配置', icon: '⚙', prefix: 'hf:config' },
]

const dataInventory = computed<DataInventoryItem[]>(() => {
  return MODULE_CATALOG.map(m => {
    let total = 0
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k && k.startsWith(m.prefix)) {
          total += localStorage.getItem(k)?.length || 0
        }
      }
    } catch { /* ignore */ }
    const size = total > 1024 ? `${(total / 1024).toFixed(1)}KB` : `${total}B`
    return { ...m, size, rawSize: total }
  }).filter(m => m.rawSize > 0)
})

const selectedExportKeys = ref<string[]>([])

function exportSelected() {
  const data: Record<string, any> = {}
  for (const m of MODULE_CATALOG) {
    if (!selectedExportKeys.value.includes(m.key)) continue
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith(m.prefix)) {
        try { data[k] = JSON.parse(localStorage.getItem(k) || '') } catch { data[k] = localStorage.getItem(k) }
      }
    }
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `heartflow-export-${selectedExportKeys.value.join('-')}-${new Date().toISOString().slice(0,10)}.json`
  a.click()
  selectedExportKeys.value = []
}

// ---- 数据主权：遗忘方法交互 ----
const forgetTarget = ref<{ key: string; name: string; prefix: string } | null>(null)

function showForgetMethodPicker(key: string, name: string, prefix: string) {
  forgetTarget.value = { key, name, prefix }
}

function cancelForget() {
  forgetTarget.value = null
  forgetCtrl.clearResult()
}

async function confirmForgetModule() {
  if (!forgetTarget.value) return
  const { key, name, prefix } = forgetTarget.value
  const method = forgetCtrl.selectedMethod.value

  if (method === 'forgetting-ritual') {
    const result = await forgetCtrl.forget(key, name, prefix, method)
    if (result.success) {
      ritualModuleName.value = name
      ritualAffectedCount.value = result.affectedCount
      ritualFreedBytes.value = result.freedBytes
      showRitual.value = true
    }
  } else {
    const result = await forgetCtrl.forget(key, name, prefix, method)
    if (result.success) {
      alert(`已遗忘「${name}」\n方法: ${FORGET_METHODS.find(m => m.id === method)?.label}\n释放: ${forgetCtrl.formatBytes(result.freedBytes)}\n影响: ${result.affectedCount} 项数据`)
    } else {
      alert(`遗忘失败: ${result.error}`)
    }
  }
  forgetTarget.value = null
}

function recoverSealedData(sealId: string) {
  if (confirm('确定要恢复此封存数据吗？')) {
    const success = forgetCtrl.recoverSealed(sealId)
    if (success) {
      alert('数据已恢复！')
    } else {
      alert('恢复失败，数据可能已过期。')
    }
  }
}

function recoverHibernatedData(hibernateId: string) {
  if (confirm('确定要恢复此休眠数据吗？')) {
    const success = forgetCtrl.recoverHibernated(hibernateId)
    if (success) {
      alert('数据已恢复！')
    } else {
      alert('恢复失败，数据可能已过期。')
    }
  }
}

function previewExitTransition() {
  hallExitCtrl.triggerExitTransition()
}

function onExitTransitionComplete() {
  // 预览结束，什么都不做
}

// ---- 遗忘仪式状态 ----
const showRitual = ref(false)
const ritualModuleName = ref('')
const ritualAffectedCount = ref(0)
const ritualFreedBytes = ref(0)
function onRitualComplete() {
  showRitual.value = false
}
function onRitualCancel() {
  showRitual.value = false
}

// ---- 访问记录 ----
function addVisitLog() { guard.addVisitLog() }
function clearVisitLog(id: string) { guard.clearVisitLog(id) }

function exportBackup() {
  const data: Record<string, any> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i); if (k) data[k] = localStorage.getItem(k)
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
  a.download = `heartflow-backup-${new Date().toISOString().slice(0,10)}.json`; a.click()
}

function clearAllData() {
  if (confirm('确定要清除所有本地数据吗？此操作不可撤销。')) {
    localStorage.clear()
    anonymousMode.value = false
    dataReflux.value = false
    guard.visitLogs.value = []
    guard.contacts.value = []
    guard.sessionActivity.value = []
    alert('所有本地数据已清除。')
  }
}
</script>

<style scoped src="./guard-shared.css"></style>
