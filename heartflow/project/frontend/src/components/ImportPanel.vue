<template>
  <section class="imp-panel" aria-label="导入账单">
    <header class="imp-head">
      <span class="imp-title">📥 导入账单</span>
      <span class="imp-sub">支持支付宝 / 微信 / 银联官方账单 CSV，导入前可预览去重结果</span>
    </header>

    <div class="imp-controls">
      <label class="imp-file">
        <input type="file" accept=".csv,.txt" @change="onFile" />
        选择账单文件
      </label>
      <span v-if="source" class="imp-src" :class="'imp-src--' + source">
        {{ srcLabel(source) }}
      </span>
      <span v-if="preview.length" class="imp-count">预览 {{ preview.length }} 条</span>
    </div>

    <p v-if="error" class="imp-error">{{ error }}</p>

    <div v-if="preview.length" class="imp-list">
      <div v-for="(r, i) in preview" :key="i" class="imp-row">
        <span class="imp-type" :class="r.type">{{ r.type === 'income' ? '收' : '支' }}</span>
        <span class="imp-main">
          <b>¥{{ r.amount.toLocaleString() }} · {{ r.note || r.category }}</b>
          <span class="imp-meta">{{ r.at.slice(0, 10) }} · {{ r.category }}</span>
        </span>
      </div>
    </div>

    <div v-if="preview.length" class="imp-actions">
      <button class="imp-btn" @click="confirm">确认导入 {{ preview.length }} 条</button>
      <button class="imp-btn imp-btn--ghost" @click="preview = []">清空</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  detectSource,
  parseCsv,
  mapAlipay,
  mapWechat,
  mapUnionpay,
  type ImportRow,
  type ImportSource,
} from '../modules/reward/importer'

const emit = defineEmits<{ (e: 'import:records', rows: ImportRow[], source: ImportSource): void }>()

const source = ref<ImportSource>('unknown')
const preview = ref<ImportRow[]>([])
const error = ref('')

const SOURCE_LABEL: Record<ImportSource, string> = {
  alipay: '支付宝账单',
  wechat: '微信账单',
  unionpay: '银联账单',
  unknown: '未知来源',
}
function srcLabel(s: ImportSource): string {
  return SOURCE_LABEL[s]
}

async function onFile(e: Event): Promise<void> {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const text = await file.text()
  const src = detectSource(text.split('\n')[0])
  source.value = src
  if (src === 'unknown') {
    error.value = '未能识别该文件来源（支持支付宝 / 微信 / 银联官方账单 CSV）'
    preview.value = []
    return
  }
  error.value = ''
  const rows = parseCsv(text)
  const mapped = rows
    .map(r =>
      src === 'alipay' ? mapAlipay(r) : src === 'wechat' ? mapWechat(r) : mapUnionpay(r),
    )
    .filter(Boolean) as ImportRow[]
  preview.value = mapped
  ;(e.target as HTMLInputElement).value = ''
}

function confirm(): void {
  if (!preview.value.length) return
  emit('import:records', preview.value, source.value)
  preview.value = []
}
</script>

<style scoped>
.imp-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.imp-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.imp-title { font-weight: 600; }
.imp-sub { font-size: 12px; color: #8a9a7a; flex: 1; }

.imp-controls { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.imp-file {
  background: #6b9fc4;
  color: #0c1216;
  border-radius: 8px;
  padding: 7px 14px;
  cursor: pointer;
  font-weight: 600;
  font-size: 13px;
}
.imp-file input { display: none; }
.imp-src { font-size: 12px; color: #8a9a7a; }
.imp-src--alipay { color: #8a9a7a; }
.imp-src--wechat { color: #6b9fc4; }
.imp-src--unionpay { color: #e0a96d; }
.imp-count { font-size: 12px; color: #8a9a7a; }

.imp-error { color: #c46a5a; font-size: 12px; margin-bottom: 8px; }

.imp-list { display: flex; flex-direction: column; max-height: 180px; overflow: auto; gap: 4px; margin-bottom: 10px; }
.imp-row { display: flex; align-items: center; gap: 8px; font-size: 12px; padding: 4px 2px; border-bottom: 1px dashed #2c312b; }
.imp-type { width: 20px; height: 20px; border-radius: 6px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
.imp-type.income { background: rgba(138, 154, 122, 0.2); color: #8a9a7a; }
.imp-type.expense { background: rgba(196, 106, 90, 0.2); color: #c46a5a; }
.imp-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.imp-meta { color: #6b7563; font-size: 11px; }

.imp-actions { display: flex; gap: 8px; }
.imp-btn { background: #8a9a7a; color: #171a15; border: none; border-radius: 8px; padding: 6px 14px; cursor: pointer; font-weight: 600; font-size: 12px; }
.imp-btn--ghost { background: transparent; border: 1px solid #374136; color: #b7c0a8; }
</style>