<template>
  <section class="dscp">
    <header class="dscp-header">
      <h2 class="dscp-title">🔌 数据源连接器</h2>
      <p class="dscp-sub">多源适配 · 连接管理 · 缓存 · 错误恢复</p>
    </header>

    <div class="dscp-stats">
      <span class="dscp-stat"><b>{{ connector.connectedSources.value.length }}</b> 已连接</span>
      <span class="dscp-stat"><b>{{ connector.sources.value.length }}</b> 源总数</span>
      <span class="dscp-stat"><b>{{ cacheStats.total }}</b> 缓存条目</span>
      <span class="dscp-stat"><b>{{ cacheStats.totalHits }}</b> 命中</span>
      <span class="dscp-stat"><b>{{ connector.errors.value.length }}</b> 错误</span>
    </div>

    <div class="dscp-body">
      <!-- 左列：数据源列表 + 注册 -->
      <div class="dscp-col">
        <div class="dscp-list">
          <div
            v-for="s in connector.sources.value"
            :key="s.id"
            class="dscp-src"
            :class="{ 'is-error': statusOf(s) === 'error' }"
            :data-testid="`dscp-src-${s.id}`"
          >
            <div class="dscp-src-top">
              <span class="dscp-src-name">{{ s.name }}</span>
              <span class="dscp-badge" :class="'dscp-badge--' + statusOf(s)">{{ statusLabel(statusOf(s)) }}</span>
            </div>
            <div class="dscp-src-meta">
              <span class="dscp-chip">{{ typeLabel(s.type) }}</span>
              <span class="dscp-chip">{{ s.format.toUpperCase() }}</span>
              <span class="dscp-src-url" :title="s.source">{{ s.source }}</span>
            </div>
            <div class="dscp-src-sub">{{ subMeta(s) }}</div>
            <div class="dscp-src-actions">
              <button
                type="button"
                class="dscp-btn dscp-btn--connect"
                :disabled="isConnectingOrConnected(s)"
                @click="connect(s.id)"
              >连接</button>
              <button
                type="button"
                class="dscp-btn"
                :disabled="statusOf(s) === 'idle' || statusOf(s) === 'disconnected'"
                @click="disconnect(s.id)"
              >断开</button>
              <button
                type="button"
                class="dscp-btn"
                :disabled="statusOf(s) !== 'error'"
                @click="reconnect(s.id)"
              >重连</button>
              <button
                type="button"
                class="dscp-btn dscp-btn--danger"
                @click="unregister(s.id)"
              >注销</button>
            </div>
          </div>
          <p v-if="connector.sources.value.length === 0" class="dscp-empty" data-testid="dscp-empty">
            尚未注册数据源，可在下方注册或一键添加示例
          </p>
        </div>

        <!-- 注册表单 -->
        <div class="dscp-form">
          <span class="dscp-form-label">注册数据源</span>
          <div class="dscp-form-row">
            <input v-model="form.name" class="dscp-input" placeholder="名称" data-testid="dscp-name" />
            <select v-model="form.type" class="dscp-input dscp-select">
              <option v-for="t in TYPE_ORDER" :key="t" :value="t">{{ typeLabel(t) }}</option>
            </select>
            <select v-model="form.format" class="dscp-input dscp-select">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="xml">XML</option>
            </select>
          </div>
          <div class="dscp-form-row">
            <input v-model="form.source" class="dscp-input" placeholder="数据地址（https://… 或标识）" data-testid="dscp-source" />
          </div>
          <div class="dscp-form-row dscp-form-row--options">
            <label class="dscp-opt"><input v-model="form.autoConnect" type="checkbox" /> 自动连接</label>
            <label class="dscp-opt"><input v-model="form.enableCache" type="checkbox" /> 启用缓存</label>
            <label v-if="form.type === 'polling'" class="dscp-opt">
              轮询间隔 <input v-model.number="form.pollingInterval" type="number" min="1000" step="1000" class="dscp-num" /> ms
            </label>
          </div>
          <div class="dscp-form-actions">
            <button type="button" class="dscp-btn dscp-btn--primary" @click="register" data-testid="dscp-register">
              注册
            </button>
            <button
              v-for="p in PRESETS"
              :key="p.name"
              type="button"
              class="dscp-btn"
              @click="registerPreset(p)"
            >{{ p.name }}</button>
          </div>
        </div>
      </div>

      <!-- 右列：缓存 + 错误 + 订阅 -->
      <div class="dscp-col">
        <div class="dscp-block">
          <div class="dscp-block-head">
            <span class="dscp-block-label">缓存</span>
            <button type="button" class="dscp-btn dscp-btn--sm" data-testid="dscp-clear-cache" @click="clearAllCache">清空</button>
            <button type="button" class="dscp-btn dscp-btn--sm" @click="clearExpiredCache">清过期</button>
          </div>
          <p class="dscp-block-body">
            条目 {{ cacheStats.total }} · 命中 {{ cacheStats.totalHits }} · 过期 {{ cacheStats.expired }}
          </p>
        </div>

        <div class="dscp-block">
          <div class="dscp-block-head">
            <span class="dscp-block-label">错误</span>
            <button type="button" class="dscp-btn dscp-btn--sm" data-testid="dscp-clear-errors" @click="clearErrors">清空</button>
          </div>
          <div v-if="connector.errors.value.length === 0" class="dscp-block-body dscp-muted">无错误记录</div>
          <ul v-else class="dscp-errors">
            <li v-for="e in connector.errors.value" :key="e.code" class="dscp-error">
              <span class="dscp-error-code">{{ e.code }}</span>
              <span class="dscp-error-msg">{{ e.message }}</span>
              <span class="dscp-error-time">{{ fmtTime(e.timestamp) }}</span>
            </li>
          </ul>
        </div>

        <div class="dscp-block">
          <span class="dscp-block-label">订阅</span>
          <p class="dscp-block-body">活动订阅 {{ activeSubscriptions }} 个</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import {
  useDataSourceConnector,
  type DataSourceConfig,
  type DataSourceType,
  type ConnectionRecord,
} from '../modules/visualization/datasource-connector'

const connector = useDataSourceConnector()

const TYPE_ORDER: DataSourceType[] = ['static', 'polling', 'streaming', 'websocket', 'rest-api']

const TYPE_LABELS: Record<DataSourceType, string> = {
  static: '静态',
  polling: '轮询',
  streaming: '流式',
  websocket: 'WebSocket',
  'rest-api': 'REST API',
}

const STATUS_LABELS: Record<string, string> = {
  idle: '空闲',
  connecting: '连接中',
  connected: '已连接',
  disconnected: '已断开',
  error: '错误',
  reconnecting: '重连中',
}

const PRESETS: Array<{ name: string; config: Omit<DataSourceConfig, 'id'> }> = [
  { name: '静态示例', config: { name: '静态示例', type: 'static', source: '/data/sample.json', format: 'json' } },
  { name: '轮询示例', config: { name: '轮询示例', type: 'polling', source: '/api/feed', format: 'json', pollingInterval: 5000 } },
  { name: 'REST 示例', config: { name: 'REST 示例', type: 'rest-api', source: 'https://example.com/api/data', format: 'json', timeout: 8000 } },
]

const form = reactive({
  name: '',
  type: 'static' as DataSourceType,
  format: 'json' as 'json' | 'csv' | 'xml',
  source: '',
  autoConnect: false,
  enableCache: true,
  pollingInterval: 5000,
})

const cacheStats = computed(() => connector.getCacheStats())

const activeSubscriptions = computed(
  () => connector.subscriptions.value.filter((s) => s.active).length,
)

function statusOf(s: DataSourceConfig): string {
  return connector.connections.value[s.id]?.status ?? 'idle'
}

function recordOf(s: DataSourceConfig): ConnectionRecord | undefined {
  return connector.connections.value[s.id]
}

function typeLabel(t: DataSourceType): string {
  return TYPE_LABELS[t]
}

function statusLabel(st: string): string {
  return STATUS_LABELS[st] ?? st
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('zh-CN', { hour12: false })
}

function subMeta(s: DataSourceConfig): string {
  const r = recordOf(s)
  const parts: string[] = [`连接 ${fmtTime(r?.connectedAt)}`]
  if (r?.latency != null) parts.push(`延迟 ${Math.round(r.latency)}ms`)
  if (r?.errorCount) parts.push(`错误 ${r.errorCount} 次`)
  if (r?.lastError) parts.push(r.lastError)
  return parts.join(' · ')
}

function isConnectingOrConnected(s: DataSourceConfig): boolean {
  const st = statusOf(s)
  return st === 'connected' || st === 'connecting' || st === 'reconnecting'
}

function register(): void {
  if (!form.name.trim() || !form.source.trim()) return
  const cfg: Omit<DataSourceConfig, 'id'> = {
    name: form.name.trim(),
    type: form.type,
    format: form.format,
    source: form.source.trim(),
    autoConnect: form.autoConnect,
    enableCache: form.enableCache,
    pollingInterval: form.type === 'polling' ? form.pollingInterval : undefined,
  }
  connector.registerSource(cfg as DataSourceConfig)
  form.name = ''
  form.source = ''
  form.autoConnect = false
}

function registerPreset(p: { name: string; config: Omit<DataSourceConfig, 'id'> }): void {
  const cfg: Omit<DataSourceConfig, 'id'> = { ...p.config, name: `${p.name}${suffixSeq(p.name)}` }
  connector.registerSource(cfg as DataSourceConfig)
}

let presetSeq = 0
function suffixSeq(name: string): string {
  const existing = connector.sources.value.some((s) => s.name === name)
  if (!existing) return ''
  presetSeq += 1
  return ` ${presetSeq}`
}

function connect(id: string): void {
  void connector.connectSource(id).catch(() => undefined)
}

function disconnect(id: string): void {
  connector.disconnectSource(id)
}

function reconnect(id: string): void {
  void connector.reconnectSource(id).catch(() => undefined)
}

function unregister(id: string): void {
  connector.unregisterSource(id)
}

function clearAllCache(): void {
  connector.clearAllCache()
}

function clearExpiredCache(): void {
  connector.clearExpiredCache()
}

function clearErrors(): void {
  connector.clearErrors()
}
</script>

<style scoped>
.dscp {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 18px 20px;
  margin-top: 16px;
}

.dscp-header {
  margin-bottom: 12px;
}

.dscp-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.dscp-sub {
  margin: 4px 0 0;
  font-size: 12px;
  opacity: 0.55;
}

.dscp-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  padding: 10px 12px;
  margin-bottom: 14px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.18);
  font-size: 12px;
  opacity: 0.8;
}

.dscp-stat b {
  color: #f0c040;
  font-variant-numeric: tabular-nums;
  margin-right: 4px;
}

.dscp-body {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 18px;
}

.dscp-col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.dscp-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dscp-src {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid transparent;
}

.dscp-src.is-error {
  border-color: rgba(196, 106, 90, 0.5);
}

.dscp-src-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.dscp-src-name {
  font-size: 13px;
  font-weight: 600;
}

.dscp-badge {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 999px;
  white-space: nowrap;
}

.dscp-badge--idle,
.dscp-badge--disconnected {
  background: rgba(255, 255, 255, 0.08);
  opacity: 0.75;
}

.dscp-badge--connecting,
.dscp-badge--reconnecting {
  background: rgba(240, 192, 64, 0.18);
  color: #f0c040;
}

.dscp-badge--connected {
  background: rgba(138, 154, 122, 0.25);
  color: #b9c9a6;
}

.dscp-badge--error {
  background: rgba(196, 106, 90, 0.25);
  color: #e09b8a;
}

.dscp-src-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.dscp-chip {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  white-space: nowrap;
}

.dscp-src-url {
  font-size: 11px;
  opacity: 0.55;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  font-family: ui-monospace, monospace;
}

.dscp-src-sub {
  font-size: 11px;
  opacity: 0.5;
  font-variant-numeric: tabular-nums;
}

.dscp-src-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.dscp-empty {
  margin: 6px 0;
  font-size: 12px;
  opacity: 0.5;
  text-align: center;
  padding: 10px 0;
}

.dscp-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
}

.dscp-form-label {
  font-size: 12px;
  opacity: 0.6;
}

.dscp-form-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.dscp-form-row--options {
  flex-wrap: wrap;
  gap: 6px 14px;
}

.dscp-input {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 12px;
}

.dscp-input:focus {
  outline: none;
  border-color: rgba(240, 192, 64, 0.5);
}

.dscp-select {
  flex: 0 0 auto;
}

.dscp-num {
  width: 80px;
  padding: 4px 6px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  font-size: 12px;
}

.dscp-opt {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  opacity: 0.8;
}

.dscp-form-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.dscp-btn {
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.dscp-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
}

.dscp-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.dscp-btn--primary {
  border-color: rgba(240, 192, 64, 0.5);
  background: rgba(240, 192, 64, 0.16);
  color: #f0c040;
}

.dscp-btn--connect {
  border-color: rgba(138, 154, 122, 0.45);
  color: #b9c9a6;
}

.dscp-btn--danger {
  border-color: rgba(196, 106, 90, 0.45);
  color: #e09b8a;
}

.dscp-btn--sm {
  padding: 3px 8px;
  font-size: 11px;
}

.dscp-block {
  padding: 12px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.dscp-block-head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.dscp-block-label {
  font-size: 12px;
  opacity: 0.6;
  flex: 1;
}

.dscp-block-body {
  margin: 0;
  font-size: 12px;
  opacity: 0.75;
  font-variant-numeric: tabular-nums;
}

.dscp-muted {
  opacity: 0.45;
}

.dscp-errors {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.dscp-error {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  padding: 6px 8px;
  border-radius: 8px;
  background: rgba(196, 106, 90, 0.1);
}

.dscp-error-code {
  color: #e09b8a;
  font-family: ui-monospace, monospace;
  white-space: nowrap;
}

.dscp-error-msg {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dscp-error-time {
  opacity: 0.5;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 720px) {
  .dscp-body {
    grid-template-columns: 1fr;
  }
}
</style>
