<template>
  <div class="cross-device-panel">
    <!-- 开启跨端接续 -->
    <div class="sub-card-section">
      <h5 class="sub-card-section-title">跨端接续</h5>
      <p class="setting-hint">
        在不同设备间安全接管同一份数据。源端生成令牌/二维码，目标端输入令牌配对，
        端到端把数据从一方接续到另一方（本地接管，不经任何服务器）。
      </p>
      <label class="setting-row">
        <span>启用跨端接续</span>
        <label class="toggle">
          <input type="checkbox" v-model="enabled" />
          <span class="toggle-slider" />
        </label>
      </label>
      <label class="setting-row">
        <span>会话有效期（分钟）</span>
        <input
          class="guard-input"
          type="number"
          min="1"
          max="120"
          :value="config.sessionTTLMinutes"
          @change="onTtlChange"
        />
      </label>
    </div>

    <!-- 源端：创建接续会话 -->
    <div class="sub-card-section">
      <h5 class="sub-card-section-title">发起接续（源端）</h5>
      <div class="cd-room-row">
        <label class="cd-field">
          <span>当前房间</span>
          <input class="guard-input" v-model="currentRoom" placeholder="如：home-space" />
        </label>
        <label class="cd-field">
          <span>当前路由</span>
          <input class="guard-input" v-model="currentRoute" placeholder="如：/home-space" />
        </label>
      </div>
      <button class="guard-btn" @click="startSession" :disabled="!enabled">
        {{ activeSession ? '接续进行中…' : '生成接续令牌' }}
      </button>

      <!-- 等待配对 / 传输中 -->
      <div v-if="activeSession" class="cd-active">
        <div class="cd-token-box">
          <span class="cd-token-label">接续令牌</span>
          <span class="cd-token">{{ cd.formatToken(activeSession.token) }}</span>
          <button class="guard-del" @click="cancelActive" title="取消接续">×</button>
        </div>
        <div class="cd-qr-data">
          <p class="setting-hint">用目标端扫码即可配对（仅含令牌/设备/房间，零外网）：</p>
          <QrCode :value="qrData" :size="168" aria-label="接续二维码" />
        </div>
        <div class="cd-progress">
          <div class="cd-progress-bar" :style="{ width: progress + '%' }"></div>
        </div>
        <p class="cd-status">{{ statusText }}</p>
        <p class="cd-remaining" v-if="remaining > 0">剩余 {{ remainingText }}</p>
      </div>
    </div>

    <!-- 目标端：配对 + 恢复 -->
    <div class="sub-card-section">
      <h5 class="sub-card-section-title">接收接续（目标端）</h5>
      <div class="cd-pair-row">
        <input
          class="guard-input"
          v-model="inputToken"
          placeholder="输入源端令牌"
          :disabled="!enabled"
        />
        <button class="guard-btn" @click="pair" :disabled="!enabled || !inputToken.trim()">
          配对
        </button>
      </div>
      <p v-if="pairError" class="cd-error">{{ pairError }}</p>
    </div>

    <!-- 本地快照（文件接续，零网络） -->
    <div class="sub-card-section">
      <h5 class="sub-card-section-title">本地快照（文件接续）</h5>
      <p class="setting-hint">
        不经令牌配对、也不经任何服务器：把当前设备完整数据导出为一个本地文件，
        在另一台设备导入即完成接续（本地私有，符合宪法第1条）。导入将覆盖本机当前数据。
      </p>
      <div class="cd-room-row">
        <button class="guard-btn" type="button" @click="exportLocal" :disabled="!enabled">
          导出快照文件
        </button>
        <label class="guard-btn guard-btn--file" :class="{ 'is-disabled': !enabled }">
          导入快照文件
          <input
            type="file"
            accept="application/json,.json"
            class="cd-file-input"
            @change="importLocal"
            :disabled="!enabled"
          />
        </label>
      </div>
      <p v-if="localStatus" class="cd-status">{{ localStatus }}</p>
    </div>

    <!-- 局域网接续（同 WiFi / 本机，守宪法第1条本地私有） -->
    <div class="sub-card-section">
      <h5 class="sub-card-section-title">局域网接续</h5>
      <p class="setting-hint">
        经同一局域网（或本机）的直接接续，不经任何服务器、不出本地边界，符合宪法第1条。
        默认关闭；仅在两台设备都开启本功能后使用：接收端填入本机在局域网中的 IP 并「开启接收」，
        发送端填入接收端地址「推送到对端」，最后接收端「从对端拉取」完成接续。
        后端仅在 localhost / 私有网段 / .local/.lan/.home 监听，公网地址一律拒绝。
      </p>
      <label class="setting-row">
        <span>启用局域网接续</span>
        <label class="toggle">
          <input type="checkbox" v-model="lanEnabled" />
          <span class="toggle-slider" />
        </label>
      </label>
      <div class="cd-room-row">
        <label class="cd-field">
          <span>本机接收地址（LAN IP）</span>
          <input
            class="guard-input"
            v-model="localBindHost"
            placeholder="127.0.0.1"
            :disabled="!lanEnabled || lanServing"
          />
        </label>
        <button
          class="guard-btn"
          type="button"
          :disabled="!lanEnabled || !isLanBindReady() || lanServing"
          @click="startLanReceive"
        >
          {{ lanServing ? '接收中…' : '本机开启接收' }}
        </button>
      </div>
      <div class="cd-room-row">
        <label class="cd-field">
          <span>对端地址</span>
          <input
            class="guard-input"
            v-model="peerUrl"
            placeholder="http://192.168.1.20:54321"
            :disabled="!lanEnabled"
          />
        </label>
        <button
          class="guard-btn"
          type="button"
          :disabled="!lanEnabled || !isLanPeerReady()"
          @click="exportLan"
        >
          推送到对端
        </button>
      </div>
      <div class="cd-room-row">
        <button
          class="guard-btn"
          type="button"
          :disabled="!lanEnabled || !lanServing"
          @click="importLan"
        >
          从对端拉取
        </button>
      </div>
      <p v-if="lanStatus" class="cd-status">{{ lanStatus }}</p>
    </div>

    <!-- 扫码即配对（局域网，免手动填 IP） -->
    <div class="sub-card-section">
      <h5 class="sub-card-section-title">扫码即配对（局域网）</h5>
      <p class="setting-hint">
        源端（生成码的一方）把本机局域网端点编码进二维码，目标端（扫码的一方）扫码即自动连接并拉取快照，
        全程零手动填 IP。需两台设备在同一局域网，且源端已填写本机 LAN 地址。
        守宪法第1条：二维码仅携带本地边界地址。
      </p>
      <label class="setting-row">
        <span>源端本机局域网 IP</span>
        <input
          class="guard-input"
          v-model="localBindHost"
          placeholder="192.168.1.30"
          :disabled="lanServing"
        />
      </label>
      <p class="setting-hint lqs-addr-note">即本机在局域网中的 IP，与上方「局域网接续」共用同一地址</p>
      <div class="cd-room-row">
        <button
          class="guard-btn"
          type="button"
          :disabled="!isLanSourceReady()"
          @click="generateLanQr"
        >
          {{ lanQrData ? '重新生成二维码' : '生成接续二维码' }}
        </button>
        <button
          class="guard-btn"
          type="button"
          :disabled="!lanQrData"
          @click="showScanner = true"
        >
          扫码接收
        </button>
      </div>
      <div v-if="lanQrData" class="cd-qr-data">
        <p class="setting-hint">将此二维码展示给目标设备，目标端点「扫码接收」扫描即可接续本机数据：</p>
        <QrCode :value="lanQrData" :size="168" aria-label="局域网接续二维码" />
        <p class="cd-status">源端已发布快照，等待目标端扫码拉取（{{ localBindHost }}:{{ LAN_PORT }}）</p>
      </div>
      <p v-if="lanQrStatus" class="cd-status">{{ lanQrStatus }}</p>

      <LanQrScanner v-if="showScanner" @detected="onScanDetected" @close="showScanner = false" />
    </div>

    <!-- 信任设备 -->
    <div class="sub-card-section" v-if="trustedDevices.length">
      <h5 class="sub-card-section-title">信任设备 ({{ trustedDevices.length }})</h5>
      <div class="cd-device-list">
        <div v-for="d in trustedDevices" :key="d.id" class="cd-device-row">
          <span class="cd-device-icon">📱</span>
          <span class="cd-device-name">{{ d.name }}</span>
          <span class="cd-device-os">{{ d.os }}</span>
          <button class="guard-del" @click="removeDevice(d.id)" title="移除信任">×</button>
        </div>
      </div>
    </div>

    <!-- 历史会话 -->
    <div class="sub-card-section" v-if="historySessions.length">
      <h5 class="sub-card-section-title">历史接续 ({{ historySessions.length }})</h5>
      <div class="cd-history-list">
        <div
          v-for="s in historySessions"
          :key="s.sessionId"
          class="cd-history-row"
        >
          <span class="cd-history-icon">{{ statusIcon(s.status) }}</span>
          <div class="cd-history-info">
            <span class="cd-history-room">{{ s.currentRoom }}</span>
            <span class="cd-history-time">{{ formatTime(s.createdAt) }}</span>
          </div>
          <!-- 目标端：会话已完成且有数据，可恢复 -->
          <button
            v-if="s.status === 'completed' && s.payload"
            class="guard-btn cd-recover-btn"
            @click="recover(s.sessionId)"
          >
            恢复数据
          </button>
          <span v-else class="cd-history-status">{{ statusLabel(s.status) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useCrossDevice } from '../../modules/data-sovereignty/composables/useCrossDevice'
import type { ContinuitySession } from '../../modules/data-sovereignty/types'
import { formatDateTime as formatTime } from '../../utils/time'
import QrCode from './QrCode.vue'
import {
  createLocalSnapshotAdapter,
  createLanTransportAdapter,
  exportSnapshot,
  importSnapshot,
  isLocalBoundaryUrl,
  setTransportAdapter,
} from '../../modules/sync'
import {
  startLanSnapshotServer,
  stopLanSnapshotServer,
  importIncomingSnapshot,
  publishSharedSnapshot,
} from '../../engine/lan-bridge'
import LanQrScanner from './LanQrScanner.vue'

const cd = useCrossDevice()

const enabled = computed({
  get: () => cd.isEnabled.value,
  set: (v: boolean) => (cd.isEnabled.value = v),
})
const config = cd.config
const activeSession = cd.activeSession
const trustedDevices = cd.trustedDevices
const historySessions = cd.historySessions
const progress = computed(() => cd.continuityProgress.value)
const statusText = computed(() => cd.continuityStatus.value)

const currentRoom = ref('home-space')
const currentRoute = ref('/home-space')
const inputToken = ref('')
const pairError = ref('')
const localStatus = ref('')

// 局域网接续（B1.4）：默认关闭，用户显式开启 + 填本机接收地址（LAN IP）/ 对端地址。
// 适配器层再以 isLocalBoundaryUrl 硬拒公网地址（守宪法第1条）。
const lanEnabled = ref(false)
const peerUrl = ref('')
const localBindHost = ref('127.0.0.1')
const lanStatus = ref('')
const lanServing = ref(false)

const LAN_PORT = 54321

// 扫码即配对：源端发码 + 目标端扫码接收（免手动填 IP）
const lanQrData = ref('')
const lanQrStatus = ref('')
const showScanner = ref(false)

function isLanSourceReady(): boolean {
  return (
    localBindHost.value.trim() !== '' && isLocalBoundaryUrl(localBindHost.value.trim())
  )
}

// 发送端「推送到对端」就绪：需启用且对端地址合法（本地边界内）
function isLanPeerReady(): boolean {
  return lanEnabled.value && peerUrl.value.trim() !== '' && isLocalBoundaryUrl(peerUrl.value.trim())
}
// 接收端「本机开启接收」就绪：需启用且本机接收地址合法（本地边界内）
function isLanBindReady(): boolean {
  return (
    lanEnabled.value &&
    localBindHost.value.trim() !== '' &&
    isLocalBoundaryUrl(localBindHost.value.trim())
  )
}

async function startLanReceive() {
  lanStatus.value = ''
  if (!isLanBindReady()) {
    lanStatus.value = '请先启用并填写合法的本机接收地址（LAN IP，如 192.168.1.30）'
    return
  }
  const res = await startLanSnapshotServer(LAN_PORT, localBindHost.value.trim())
  if (res.success) {
    lanServing.value = true
    lanStatus.value = `本机已在 ${localBindHost.value.trim()}:${LAN_PORT} 开启接收，等待对端推送`
  } else {
    lanStatus.value = '开启接收失败：' + (res.error ?? '未知错误')
  }
}

async function exportLan() {
  lanStatus.value = ''
  if (!isLanPeerReady()) {
    lanStatus.value = '请先启用并填写合法的本地对端地址'
    return
  }
  try {
    setTransportAdapter(createLanTransportAdapter({ peerUrl: peerUrl.value.trim() }))
    const blob = await exportSnapshot()
    if (!blob) {
      lanStatus.value = '推送失败：未配置传输通道'
      return
    }
    lanStatus.value = '已推送到对端'
  } catch (e) {
    lanStatus.value = '推送失败：' + (e instanceof Error ? e.message : String(e))
  }
}

async function importLan() {
  lanStatus.value = ''
  if (!lanEnabled.value || !lanServing.value) {
    lanStatus.value = '请先开启本机接收，并等待对端推送'
    return
  }
  try {
    // 经后端桥接取回对端推送进本机 incoming 的快照并接续（不再 GET 对端 shared，避免收发方向错配）
    const res = await importIncomingSnapshot()
    if (res.success) {
      lanStatus.value = '已从对端拉取并接续本机'
    } else {
      lanStatus.value = '拉取失败：' + (res.error ?? '未知错误')
    }
  } catch (e) {
    lanStatus.value = '拉取失败：' + (e instanceof Error ? e.message : String(e))
  }
}

// 源端：开启本机 LAN 服务 + 发布快照 + 生成含本机端点的二维码
async function generateLanQr() {
  lanQrStatus.value = ''
  if (!isLanSourceReady()) {
    lanQrStatus.value = '请先填写合法的本机 LAN 地址（如 192.168.1.30）'
    return
  }
  try {
    const serve = await startLanSnapshotServer(LAN_PORT, localBindHost.value.trim())
    if (!serve.success) {
      lanQrStatus.value = '开启局域网服务失败：' + (serve.error ?? '未知错误')
      return
    }
    lanServing.value = true
    const blob = await createLocalSnapshotAdapter().export()
    const pub = await publishSharedSnapshot(JSON.stringify(blob))
    if (!pub.success) {
      lanQrStatus.value = '发布快照失败：' + (pub.error ?? '未知错误')
      return
    }
    lanQrData.value = cd.buildLanQrPayload(`http://${localBindHost.value.trim()}:${LAN_PORT}`)
    lanQrStatus.value = '已生成二维码并发布快照，等待目标端扫码'
  } catch (e) {
    lanQrStatus.value = '生成失败：' + (e instanceof Error ? e.message : String(e))
  }
}

// 目标端：扫码得到源端 URL → 校验本地边界 → 拉取并导入快照
async function onScanDetected(text: string) {
  showScanner.value = false
  lanQrStatus.value = ''
  const parsed = cd.parseLanQrPayload(text)
  if (!parsed) {
    lanQrStatus.value = '二维码无效，或非本应用局域网接续码'
    return
  }
  try {
    const res = await cd.receiveFromLanUrl(parsed.url)
    if (res.success) {
      lanQrStatus.value = '已从对端拉取并接续本机'
    } else {
      lanQrStatus.value = '拉取失败：' + (res.error ?? '未知错误')
    }
  } catch (e) {
    lanQrStatus.value = '拉取失败：' + (e instanceof Error ? e.message : String(e))
  }
}

// 剩余时间计时器
const remaining = ref(0)
let timer: number | null = null

function tickRemaining() {
  if (!activeSession.value) {
    remaining.value = 0
    return
  }
  remaining.value = cd.getSessionRemaining(activeSession.value.sessionId)
}
const remainingText = computed(() => cd.formatRemaining(remaining.value))

function startSession() {
  cd.createSession(currentRoom.value.trim() || 'home-space', currentRoute.value.trim() || '/home-space')
  pairError.value = ''
  tickRemaining()
  if (timer) clearInterval(timer)
  timer = window.setInterval(tickRemaining, 1000)
}

function cancelActive() {
  if (activeSession.value) cd.cancelSession(activeSession.value.sessionId)
  if (timer) clearInterval(timer)
  timer = null
  remaining.value = 0
}

function onTtlChange(e: Event) {
  const v = parseInt((e.target as HTMLInputElement).value, 10)
  if (!isNaN(v) && v > 0) cd.updateConfig({ sessionTTLMinutes: Math.min(120, v) })
}

const qrData = computed(() => {
  if (!activeSession.value) return ''
  return cd.getQRCodeData(activeSession.value.sessionId)
})

async function pair() {
  pairError.value = ''
  const session = cd.pairSession(inputToken.value)
  if (!session) {
    pairError.value = '令牌无效或已过期'
    return
  }
  inputToken.value = ''
  // 配对成功后由源端执行传输
  await cd.executeContinuity(session.sessionId)
}

function recover(sessionId: string) {
  const counts = cd.recoverContinuity(sessionId)
  if (!counts) {
    pairError.value = '恢复失败：数据无效'
  }
}

function removeDevice(id: string) {
  cd.removeDevice(id)
}

// 本地快照（文件接续）：导出当前完整数据为本地文件，或导入另一设备的快照文件。
// 复用 sync 传输抽象层的本地适配器（纯本地、零网络，符合宪法第1条）。
async function exportLocal() {
  localStatus.value = ''
  try {
    setTransportAdapter(createLocalSnapshotAdapter())
    const blob = await exportSnapshot()
    if (!blob) {
      localStatus.value = '导出失败：未配置传输通道'
      return
    }
    const json = JSON.stringify(blob, null, 2)
    const file = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = `heartflow-continuation-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    localStatus.value = '已导出快照文件，请将其带到目标设备导入'
  } catch (e) {
    localStatus.value = '导出失败：' + (e instanceof Error ? e.message : String(e))
  }
}

async function importLocal(e: Event) {
  localStatus.value = ''
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const blob = JSON.parse(reader.result as string)
      setTransportAdapter(createLocalSnapshotAdapter())
      void importSnapshot(blob).then((ok) => {
        localStatus.value = ok ? '已导入快照，本机数据已接续' : '导入失败：未配置传输通道'
      })
    } catch {
      localStatus.value = '导入失败：文件无效或已损坏'
    } finally {
      input.value = ''
    }
  }
  reader.onerror = () => {
    localStatus.value = '导入失败：文件读取失败'
    input.value = ''
  }
  reader.readAsText(file)
}

function statusIcon(status: ContinuitySession['status']): string {
  const map: Record<ContinuitySession['status'], string> = {
    waiting: '⏳',
    paired: '🔗',
    transferring: '📡',
    completed: '✅',
    expired: '⌛',
    cancelled: '✖',
  }
  return map[status]
}

function statusLabel(status: ContinuitySession['status']): string {
  const map: Record<ContinuitySession['status'], string> = {
    waiting: '等待中',
    paired: '已配对',
    transferring: '传输中',
    completed: '已完成',
    expired: '已过期',
    cancelled: '已取消',
  }
  return map[status]
}


onUnmounted(() => {
  if (timer) clearInterval(timer)
  // 离开面板时若仍在接收，停止局域网快照服务，避免端口残留占用
  if (lanServing.value) {
    void stopLanSnapshotServer()
  }
})
</script>

<style scoped>
.cd-room-row,
.cd-pair-row {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.cd-field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
  min-width: 140px;
  font-size: 13px;
  color: var(--text-secondary, #9aa3b2);
}
.guard-input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 8px 10px;
  color: inherit;
  font-size: 14px;
}
.cd-active {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
}
.cd-token-box {
  display: flex;
  align-items: center;
  gap: 10px;
}
.cd-token-label {
  font-size: 12px;
  color: var(--text-secondary, #9aa3b2);
}
.cd-token {
  font-family: ui-monospace, monospace;
  font-size: 20px;
  letter-spacing: 2px;
  font-weight: 600;
  color: var(--accent, #a8d5ba);
}
.cd-qr-data {
  margin-top: 10px;
}
.lqs-addr-note {
  font-size: 12px;
  color: var(--text-muted, #8a8a8a);
  margin-top: -2px;
}
.cd-progress {
  margin-top: 12px;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}
.cd-progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #8fd3c0, #a8d5ba);
  transition: width 0.2s ease;
}
.cd-status {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-secondary, #9aa3b2);
}
.cd-remaining {
  font-size: 12px;
  color: #e0a96d;
}
.cd-error {
  margin-top: 8px;
  font-size: 13px;
  color: #e88;
}
.cd-device-list,
.cd-history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 8px;
}
.cd-device-row,
.cd-history-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
}
.cd-device-name,
.cd-history-room {
  flex: 1;
  font-size: 14px;
}
.cd-device-os,
.cd-history-time {
  font-size: 12px;
  color: var(--text-secondary, #9aa3b2);
}
.cd-history-info {
  display: flex;
  flex-direction: column;
  flex: 1;
}
.cd-recover-btn {
  padding: 4px 10px;
  font-size: 13px;
}
.cd-history-status {
  font-size: 12px;
  color: var(--text-secondary, #9aa3b2);
}
.guard-btn--file {
  position: relative;
  overflow: hidden;
  cursor: pointer;
}
.guard-btn--file.is-disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.cd-file-input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}
.cd-file-input:disabled {
  cursor: not-allowed;
}
</style>
