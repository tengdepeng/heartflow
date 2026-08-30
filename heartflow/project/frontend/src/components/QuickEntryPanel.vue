<template>
  <section class="qep-panel" aria-label="自然语言快速记账">
    <header class="qep-head">
      <span class="qep-title">⚡ 快速记账</span>
      <span class="qep-sub">一段话智能解析 · 金额 / 类别 / 账户 / 日期 / 备注，回车即入账</span>
    </header>

    <textarea
      v-model="raw"
      class="qep-input"
      rows="2"
      placeholder="例：昨天用支付宝买咖啡25 / 工资入账8000 / 8月5日交房租1万5"
      @keydown.enter.exact.prevent="commit"
    />

    <!-- 解析预览 -->
    <div v-if="draft.amount > 0" class="qep-preview">
      <div class="qep-row">
        <span class="qep-chip" :class="'qep-chip--' + draft.type">
          {{ draft.type === 'income' ? '📥 收入' : '📤 支出' }}
        </span>
        <span class="qep-amount" :class="'qep-amount--' + draft.type">{{ draft.type === 'income' ? '+' : '-' }}{{ draft.amount }}</span>
        <span class="qep-meta">
          <span class="qep-cat" :style="{ color: draftMeta.color }">{{ draftMeta.icon }} {{ draftMeta.label }}</span>
          <span class="qep-acc">{{ accountName }}</span>
          <span class="qep-date">{{ draft.date }}</span>
        </span>
      </div>
      <div class="qep-row qep-row--desc" v-if="draft.description">
        <span class="qep-desc">{{ draft.description }}</span>
        <span class="qep-conf">置信度 {{ Math.round(draft.confidence * 100) }}%</span>
      </div>
      <div class="qep-row qep-row--issues" v-if="draft.issues.length">
        <span v-for="(issue, i) in draft.issues" :key="i" class="qep-issue">⚠ {{ issue }}</span>
      </div>
      <button class="qep-btn qep-btn--primary" type="button" @click="commit">✓ 一键入账</button>
    </div>
    <p v-else-if="raw.trim()" class="qep-wait">输入包含金额后即解析…</p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { parseQuickEntry, type QuickEntryDraft } from '../modules/reward/nlp-entry'
import { resolveMetaAny, type CustomCategory } from '../modules/reward/custom-category'
import type { Account } from '../modules/reward/accounts'

const props = defineProps<{
  categories: CustomCategory[]
  accounts: Account[]
}>()

const emit = defineEmits<{
  (e: 'commit', draft: QuickEntryDraft): void
}>()

const raw = ref('')

const draft = computed(() => parseQuickEntry(raw.value, {
  categories: props.categories,
  accounts: props.accounts,
}))

const draftMeta = computed(() => resolveMetaAny(props.categories, draft.value.category))

const accountName = computed(() => {
  const hit = props.accounts.find(a => a.id === draft.value.account)
  if (hit?.name) return hit.name
  const builtin: Record<string, string> = { cash: '现金', bank: '银行卡', savings: '储蓄', alipay: '支付宝', wechat: '微信' }
  return builtin[draft.value.account] ?? draft.value.account
})

function commit(): void {
  if (draft.value.amount <= 0) return
  emit('commit', draft.value)
  raw.value = ''
}
</script>

<style scoped>
.qep-panel {
  background: #20241f;
  border: 1px solid #333a33;
  border-radius: 12px;
  padding: 14px;
  margin-top: 14px;
  color: #d9decf;
}
.qep-head { display: flex; gap: 10px; align-items: baseline; margin-bottom: 10px; flex-wrap: wrap; }
.qep-title { font-weight: 600; }
.qep-sub { font-size: 12px; color: #8a9a7a; flex: 1; }

.qep-input {
  width: 100%;
  box-sizing: border-box;
  resize: none;
  background: #161a15;
  border: 1px solid #374136;
  border-radius: 8px;
  color: #d9decf;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  line-height: 1.6;
}
.qep-input:focus { outline: none; border-color: #8a9a7a; }
.qep-input::placeholder { color: #6b7563; }

.qep-wait { font-size: 12px; color: #6b7563; margin: 8px 0 0; }

.qep-preview {
  margin-top: 10px;
  border-top: 1px dashed #2c312b;
  padding-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.qep-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.qep-chip {
  font-size: 11px; font-weight: 600;
  border-radius: 6px; padding: 2px 8px;
}
.qep-chip--income { background: rgba(128, 192, 128, 0.12); color: #80c080; }
.qep-chip--expense { background: rgba(192, 128, 128, 0.12); color: #c46a5a; }
.qep-amount { font-size: 16px; font-weight: 700; }
.qep-amount--income { color: #80c080; }
.qep-amount--expense { color: #c46a5a; }
.qep-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #b7c0a8; flex: 1; flex-wrap: wrap; }
.qep-cat { font-weight: 600; }
.qep-acc, .qep-date { color: #6b7563; }
.qep-row--desc { justify-content: space-between; }
.qep-desc { font-size: 12px; color: #b7c0a8; }
.qep-conf { font-size: 11px; color: #f0c040; }
.qep-row--issues { gap: 8px; }
.qep-issue { font-size: 11px; color: #f0c040; background: rgba(240, 192, 64, 0.08); border-radius: 6px; padding: 1px 8px; }
.qep-btn { border: none; border-radius: 8px; cursor: pointer; font-family: inherit; font-weight: 600; }
.qep-btn--primary {
  align-self: flex-start;
  background: #8a9a7a; color: #171a15;
  padding: 6px 16px; font-size: 12px;
}
.qep-btn--primary:hover { background: #9daf8c; }
</style>
