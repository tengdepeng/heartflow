<script setup lang="ts">
// ============================================================
// 逸趣阁 · 时间种子遗传分享面板
// 接入治理层（src/modules/play/seed-transfer.ts），落实宪法第46/47/48条：
//   第47条「遗传的范围」——逐项勾选传递类型 + 细节粒度 + 发送前预览
//   第47条「守护室完整日志」——传过哪些/给谁/何时
//   第48条「遗传的停止」——随时收回（永久赠予不可收回）
// 注：本面板操作的是「收藏时间种子」(time-seed.ts)，非内联心情种子。
// ============================================================
import { ref, reactive, computed } from 'vue'
import {
  TRANSFER_TYPE_LABELS,
  GRANULARITY_LABELS,
  defaultAuthorization,
  buildInvestmentPreview,
  collectTimeInvestments,
  exportSeedGift,
  stringifySeedGift,
  recordTransfer,
  getTransferLogs,
  revokeTransfer,
  isTransferViewable,
  isSeedInheritEnabled,
  isSeedScopeEnabled,
  isSeedRevokeEnabled,
  type TransferType,
  type TransferGranularity,
  type TransferAuthorization,
  type TransferLog,
} from '../modules/play/seed-transfer'
import { markRevokedByGift } from '../modules/play/received-seed'
import { SEED_RARITY_LABELS, SEED_RARITY_COLORS, type TimeSeed } from '../modules/play/time-seed'

const props = withDefaults(defineProps<{
  /** 可遗传的收藏种子列表（逸趣阁游戏种子，作为「游戏记录」类别来源） */
  seeds: TimeSeed[]
  /** 接收方标识（可选，如导出文件/某庭院名） */
  recipient?: string
  /** 发送方庭院名（来源标记，写入礼包） */
  senderName?: string
  /** 是否显示「发送」动作（某些场景仅查看日志） */
  allowSend?: boolean
}>(), {
  allowSend: true,
  senderName: '此方庭院',
})

const emit = defineEmits<{
  (e: 'sent', log: TransferLog): void
  (e: 'revoked', id: string): void
}>()

// ---- 宪法第46/47/48条门控（与治理层单一事实源同步） ----
// 默认启用；用户在宪法编辑器关闭后，对应 UI 同步隐藏/禁用。
const inheritEnabled = isSeedInheritEnabled()  // 第46条：能否主动遗传
const scopeEnabled = isSeedScopeEnabled()      // 第47条：能否逐项选范围
const revokeEnabled = isSeedRevokeEnabled()    // 第48条：能否收回

// ---- 授权表单（第47条：逐项选择） ----
const auth = reactive(defaultAuthorization())

const ALL_TYPES = Object.keys(TRANSFER_TYPE_LABELS) as TransferType[]

function toggleType(t: TransferType) {
  const i = auth.types.indexOf(t)
  if (i === -1) auth.types.push(t)
  else if (auth.types.length > 1) auth.types.splice(i, 1) // 至少保留一项
}

// 实际生效授权：第47条关闭时强制默认授权（与 recordTransfer 一致，确保预览=实际发送内容）
const effectiveAuth = computed<TransferAuthorization>(() =>
  scopeEnabled ? auth : defaultAuthorization(),
)

// ---- 发送前预览（第47条：基于统一时间投入聚合，五类全可选） ----
const preview = computed(() =>
  buildInvestmentPreview(
    collectTimeInvestments(effectiveAuth.value.types, props.seeds),
    effectiveAuth.value,
  ),
)

// ---- 守护室日志 ----
const logs = reactive<TransferLog[]>(getTransferLogs())
function refreshLogs() {
  const next = getTransferLogs()
  logs.splice(0, logs.length, ...next)
}

// 收回态独立驱动视觉（revoked 标记由继承引擎写入，UI 用 Set 可靠反映）
const revokedIds = ref<Set<string>>(new Set(getTransferLogs().filter(l => l.revoked).map(l => l.id)))

const lastError = ref('')

function send() {
  if (!inheritEnabled) {
    lastError.value = '宪法第46条「记录的遗传」已关闭，不可主动遗传时间种子'
    return
  }
  if (auth.types.length === 0) {
    lastError.value = '请至少选择一种传递类型'
    return
  }
  if (preview.value.itemCount === 0) {
    lastError.value = '当前所选类型暂无可传递的记录'
    return
  }
  const records = collectTimeInvestments(effectiveAuth.value.types, props.seeds)
  // recordTransfer 第46条关闭时返回 null（逻辑层兜底拦截）
  const log = recordTransfer(records.map(r => r.id), { ...effectiveAuth.value }, props.recipient)
  if (!log) {
    lastError.value = '宪法第46条「记录的遗传」已关闭，不可主动遗传时间种子'
    return
  }
  // 打包为本地礼包（.seed-gift），交由信任的人导入其接收匣（第46条单向赠予载体）
  const gift = exportSeedGift(records, { ...effectiveAuth.value }, {
    giftId: log.id,
    senderName: props.senderName,
    recipient: props.recipient,
  })
  downloadGift(stringifySeedGift(gift))
  refreshLogs()
  lastError.value = ''
  emit('sent', log)
}

/** 导出礼包为本地 .seed-gift 文件（第49条本地边界：仅本地文件，不触云） */
function downloadGift(json: string) {
  if (typeof document === 'undefined') return
  try {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `时间种子礼包-${Date.now()}.seed-gift`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    /* 非浏览器环境静默 */
  }
}

function revoke(id: string) {
  const res = revokeTransfer(id)
  if (!res.ok) {
    lastError.value = res.reason || '收回失败'
    return
  }
  // 第48条联动：同存储内（演示/自收场景）对应接收切片变暗（跨实例文件传递无法远程变暗，属本地语义）
  markRevokedByGift(id)
  refreshLogs()
  revokedIds.value = new Set(revokedIds.value).add(id)
  lastError.value = ''
  emit('revoked', id)
}

// 取单条日志详情（用于展开查看）
const expandedLogId = ref<string | null>(null)
function toggleLog(id: string) {
  expandedLogId.value = expandedLogId.value === id ? null : id
}
</script>

<template>
  <div class="inherit-panel">
    <div class="section-label">🌿 时间种子的遗传</div>
    <p class="inherit-desc">
      把此刻的收藏遗传给未来的记忆。可逐项选择传递的内容与粒度，发送前先预览接收方将看到的内容；
      随时可在守护室日志收回（永久赠予除外）。
    </p>

    <!-- 第47条：逐项类型勾选（关闭时隐藏，由默认授权决定范围） -->
    <template v-if="scopeEnabled">
      <div class="auth-block">
        <div class="auth-block-title">① 选择传递的类型</div>
        <div class="type-chips">
          <button
            v-for="t in ALL_TYPES"
            :key="t"
            :class="['type-chip', { active: auth.types.includes(t) }]"
            @click="toggleType(t)"
          >{{ TRANSFER_TYPE_LABELS[t] }}</button>
        </div>
      </div>

      <div class="auth-block">
        <div class="auth-block-title">② 细节粒度</div>
        <div class="granularity-row">
          <button
            v-for="g in (['full', 'highlight'] as TransferGranularity[])"
            :key="g"
            :class="['gran-btn', { active: auth.granularity === g }]"
            @click="auth.granularity = g"
          >{{ GRANULARITY_LABELS[g] }}</button>
        </div>
      </div>

      <div class="auth-block">
        <label class="permanent-toggle">
          <input type="checkbox" v-model="auth.permanent" />
          <span>永久赠予（不可收回）</span>
        </label>
      </div>
    </template>
    <p v-else class="inherit-notice">
      宪法第47条「遗传的范围」已关闭：传递范围由系统决定（仅游戏记录 · 仅高亮时刻摘要 · 可收回）。
    </p>

    <!-- 第47条：发送前预览 -->
    <div class="preview-block">
      <div class="preview-head">
        <span class="auth-block-title">③ 发送前预览</span>
        <span class="preview-meta">
          {{ preview.authorizedTypes.map(a => a.label).join(' · ') }} ·
          {{ preview.granularityLabel }} ·
          {{ preview.itemCount }} 枚
        </span>
      </div>
      <div v-if="preview.itemCount" class="preview-list">
        <div v-for="item in preview.items" :key="item.seedId" class="preview-item">
          <span v-if="item.rarity" class="pi-rarity" :style="{ color: SEED_RARITY_COLORS[item.rarity] }">
            {{ SEED_RARITY_LABELS[item.rarity] }}
          </span>
          <span class="pi-name">{{ item.name }}</span>
          <span class="pi-content">{{ item.content }}</span>
        </div>
      </div>
      <div v-else class="preview-empty">当前所选类型暂无可传递的记录</div>
    </div>

    <p v-if="lastError" class="inherit-error">{{ lastError }}</p>

    <!-- 第46条：关闭时禁用主动遗传 -->
    <p v-if="!inheritEnabled" class="inherit-notice">
      宪法第46条「记录的遗传」已关闭：不可主动将时间种子遗传给他人。
    </p>

    <!-- 发送 -->
    <button
      v-if="allowSend !== false"
      class="send-btn"
      :disabled="!inheritEnabled || preview.itemCount === 0"
      @click="send"
    >生成遗传 · 写入守护室日志</button>

    <!-- 第47条：守护室日志 -->
    <div class="logs-block">
      <div class="auth-block-title">④ 守护室传递日志</div>
      <p v-if="!revokeEnabled" class="inherit-notice">
        宪法第48条「遗传的停止」已关闭：已传递的时间种子不可收回。
      </p>
      <div v-if="logs.length" class="log-list">
        <div
          v-for="log in logs"
          :key="log.id"
          :class="{ 'log-item': true, revoked: revokedIds.has(log.id) }"
          @click="isTransferViewable(log) && toggleLog(log.id)"
        >
          <div class="log-row">
            <span class="log-types">{{ log.types.map(t => TRANSFER_TYPE_LABELS[t]).join('·') }}</span>
            <span class="log-when">{{ new Date(log.sentAt).toLocaleString() }}</span>
          </div>
          <div class="log-row log-row--sub">
            <span>{{ log.granularity === 'full' ? '全部细节' : '仅高亮摘要' }}{{ log.permanent ? ' · 永久赠予' : '' }}</span>
            <span v-if="log.recipient">→ {{ log.recipient }}</span>
            <span v-else>→ 导出文件</span>
          </div>
          <div v-if="revokedIds.has(log.id)" class="log-revoked-tag">已收回</div>
          <div v-if="expandedLogId === log.id && isTransferViewable(log)" class="log-detail">
            <span class="log-detail-label">接收方可展开查看的 {{ log.seedIds.length }} 枚种子</span>
            <span class="log-detail-id">ID: {{ log.id }}</span>
          </div>
          <button
            v-if="!revokedIds.has(log.id) && !log.permanent && revokeEnabled"
            class="log-revoke-btn"
            @click.stop="revoke(log.id)"
          >收回</button>
        </div>
      </div>
      <div v-else class="log-empty">还没有任何遗传记录</div>
    </div>
  </div>
</template>

<style scoped>
.inherit-panel {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.12);
}
.inherit-desc {
  font-size: 12px;
  color: var(--text-dim);
  margin-bottom: 14px;
  line-height: 1.6;
}
.auth-block { margin-bottom: 14px; }
.auth-block-title {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
  letter-spacing: 1px;
}
.type-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.type-chip {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  color: var(--text-low);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.type-chip:hover { color: var(--text-high); }
.type-chip.active {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
}
.granularity-row { display: flex; gap: 6px; }
.gran-btn {
  flex: 1;
  padding: 8px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  background: var(--bg-card);
  color: var(--text-low);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}
.gran-btn.active {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: rgba(var(--accent-rgb), 0.3);
  color: var(--accent);
}
.permanent-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
}
.permanent-toggle input { accent-color: var(--accent); }
.preview-block {
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 12px;
}
.preview-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 8px;
}
.preview-meta {
  font-size: 11px;
  color: var(--text-secondary);
  text-align: right;
}
.preview-list { display: flex; flex-direction: column; gap: 4px; }
.preview-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(var(--bg-card-rgb), 0.5);
  font-size: 12px;
}
.pi-rarity { font-size: 10px; font-weight: 600; flex-shrink: 0; }
.pi-name { font-weight: 500; flex-shrink: 0; }
.pi-content { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.preview-empty, .log-empty {
  text-align: center;
  padding: 16px 0;
  font-size: 12px;
  color: var(--text-secondary);
}
.inherit-error {
  font-size: 11px;
  color: var(--error);
  margin: 0 0 10px;
}
.inherit-notice {
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-secondary);
  background: rgba(var(--accent-rgb), 0.08);
  border: 1px dashed rgba(var(--accent-rgb), 0.2);
  border-radius: 8px;
  padding: 8px 10px;
  margin: 0 0 12px;
}
.send-btn {
  width: 100%;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.12);
  color: var(--accent);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  margin-bottom: 16px;
  transition: all 0.2s;
}
.send-btn:hover:not(:disabled) { background: rgba(var(--accent-rgb), 0.2); }
.send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.logs-block { margin-top: 4px; }
.log-list { display: flex; flex-direction: column; gap: 6px; }
.log-item {
  position: relative;
  border-radius: 8px;
  background: var(--bg-card);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  padding: 10px;
  cursor: pointer;
  transition: all 0.2s;
}
.log-item:hover { background: rgba(55, 48, 40, 0.7); }
.log-item.revoked {
  opacity: 0.45;
  cursor: default;
}
.log-row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
}
.log-row--sub { color: var(--text-secondary); font-size: 11px; margin-top: 2px; }
.log-revoked-tag {
  display: inline-block;
  margin-top: 4px;
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.15);
  color: var(--error);
}
.log-detail {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed rgba(var(--accent-rgb), 0.15);
  display: flex;
  flex-direction: column;
  gap: 2px;
  font-size: 11px;
  color: var(--text-secondary);
}
.log-revoke-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 3px 10px;
  border-radius: 6px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: transparent;
  color: var(--error);
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
}
.log-revoke-btn:hover { background: rgba(239, 68, 68, 0.1); }
</style>
