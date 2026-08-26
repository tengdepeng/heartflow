<template>
  <section class="will-panel" aria-label="殿堂遗嘱">
    <div class="will-panel-head">
      <span class="will-panel-title">🏛️ 殿堂遗嘱</span>
      <span class="will-panel-sub">立嘱 · 封印 · 执行</span>
    </div>

    <!-- 遗嘱统计 -->
    <div class="will-block">
      <span class="will-block-label">遗嘱统计</span>
      <div class="will-stats">
        <div class="will-stat"><span class="will-stat-num">{{ stats.total }}</span><span class="will-stat-label">遗嘱</span></div>
        <div class="will-stat"><span class="will-stat-num">{{ stats.draft }}</span><span class="will-stat-label">草稿</span></div>
        <div class="will-stat"><span class="will-stat-num">{{ stats.active }}</span><span class="will-stat-label">生效中</span></div>
        <div class="will-stat"><span class="will-stat-num">{{ stats.executed }}</span><span class="will-stat-label">已执行</span></div>
      </div>
      <div class="will-row">
        <span class="will-chip">受益人 {{ stats.totalBeneficiaries }}</span>
        <span class="will-chip">条款 {{ stats.totalClauses }}</span>
        <span class="will-chip">关联遗志 {{ stats.linkedWills }}</span>
      </div>
    </div>

    <!-- 创建遗嘱 -->
    <div class="will-block">
      <span class="will-block-label">立新遗嘱</span>
      <div class="will-row">
        <input v-model="form.name" class="will-input" placeholder="遗嘱名称" />
        <input v-model="form.testator" class="will-input" placeholder="立嘱人" />
      </div>
      <div class="will-row">
        <select v-model="form.type" class="will-select">
          <option v-for="(label, key) in TESTAMENT_TYPE_LABELS" :key="key" :value="key">{{ TESTAMENT_TYPE_ICONS[key as TestamentType] }} {{ label }}</option>
        </select>
        <select v-model="form.trigger" class="will-select">
          <option v-for="(label, key) in TRIGGER_LABELS" :key="key" :value="key">{{ label }}</option>
        </select>
        <button class="will-btn" @click="create">立嘱</button>
      </div>
    </div>

    <!-- 遗嘱列表 -->
    <div class="will-block">
      <span class="will-block-label">遗嘱清单</span>
      <ul v-if="testaments.length" class="will-list">
        <li v-for="t in testaments" :key="t.id" class="will-item">
          <span class="will-item-body">
            <span class="will-item-name">{{ TESTAMENT_TYPE_ICONS[t.type] }} {{ t.name }}</span>
            <span class="will-item-meta">
              {{ t.testator }} · {{ TESTAMENT_TYPE_LABELS[t.type] }} · {{ TRIGGER_LABELS[t.trigger] }} · {{ fmtDate(t.createdAt) }}
            </span>
            <span class="will-item-meta">条款 {{ t.clauses.length }} · 受益人 {{ t.beneficiaries.length }}</span>
          </span>
          <span class="will-badge" :style="{ color: statusColor(t.status), borderColor: statusColor(t.status) + '55' }">{{ TESTAMENT_STATUS_LABELS[t.status] }}</span>
          <button class="will-btn" @click="toggleExpand(t.id)">{{ expandedId === t.id ? '收起' : '详情' }}</button>
        </li>
      </ul>
      <p v-else class="will-empty">尚无遗嘱。立下第一份遗嘱，为珍视之物安排归宿。</p>
    </div>

    <!-- 遗嘱详情 -->
    <div v-if="expanded" class="will-block">
      <span class="will-block-label">{{ expanded.name }} · 详情</span>

      <div class="will-row">
        <button class="will-btn" :disabled="expanded.status !== 'draft'" @click="seal(expanded.id)">封印</button>
        <button class="will-btn" :disabled="expanded.status !== 'sealed'" @click="activate(expanded.id)">生效</button>
        <button class="will-btn" :disabled="expanded.status !== 'active'" @click="execute(expanded.id)">执行仪式</button>
        <button class="will-btn danger" :disabled="expanded.status === 'executed'" @click="revoke(expanded.id)">撤销</button>
      </div>

      <!-- 条款 -->
      <div class="will-row">
        <input v-model="clauseForm.title" class="will-input" placeholder="条款标题" />
        <input v-model="clauseForm.content" class="will-input" placeholder="条款内容" />
        <button class="will-btn" @click="addClause(expanded.id)">加条款</button>
      </div>
      <ul v-if="expanded.clauses.length" class="will-list">
        <li v-for="c in expanded.clauses" :key="c.id" class="will-item">
          <span class="will-item-body">
            <span class="will-item-name">{{ c.title }}</span>
            <span class="will-item-meta">{{ c.content }}</span>
          </span>
          <span class="will-chip">{{ TESTAMENT_TYPE_ICONS[c.type] }}</span>
          <button class="will-btn danger" @click="removeClause(expanded.id, c.id)">×</button>
        </li>
      </ul>
      <p v-else class="will-empty">暂无条款，封印前至少需要一条条款。</p>

      <!-- 受益人 -->
      <div class="will-row">
        <input v-model="beneficiaryForm.name" class="will-input" placeholder="受益人" />
        <input v-model="beneficiaryForm.relationship" class="will-input" placeholder="关系" />
        <button class="will-btn" @click="addBeneficiary(expanded.id)">加受益人</button>
      </div>
      <ul v-if="expanded.beneficiaries.length" class="will-list">
        <li v-for="b in expanded.beneficiaries" :key="b.id" class="will-item">
          <span class="will-item-body">
            <span class="will-item-name">{{ b.name }}</span>
            <span class="will-item-meta">{{ b.relationship }} · 优先级 {{ b.priority }}</span>
          </span>
          <span v-if="b.received" class="will-chip">已接收</span>
          <button class="will-btn danger" @click="removeBeneficiary(expanded.id, b.id)">×</button>
        </li>
      </ul>
      <p v-else class="will-empty">暂无受益人。</p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useTestament } from '../../modules/will'
import {
  TESTAMENT_TYPE_LABELS,
  TESTAMENT_TYPE_ICONS,
  TESTAMENT_STATUS_LABELS,
  TRIGGER_LABELS,
} from '../../modules/will'
import type { TestamentType, TestamentTrigger } from '../../modules/will'

const testament = useTestament()
const expandedId = ref<string | null>(null)

const testaments = computed(() => testament.allTestaments.value)
const stats = computed(() => testament.stats.value)
const expanded = computed(() => testaments.value.find(t => t.id === expandedId.value) ?? null)

const form = reactive({
  name: '',
  testator: '',
  type: 'spiritual' as TestamentType,
  trigger: 'immediate' as TestamentTrigger,
})

const clauseForm = reactive({ title: '', content: '' })
const beneficiaryForm = reactive({ name: '', relationship: '' })

const STATUS_COLORS: Record<string, string> = {
  draft: '#8a9a7a',
  sealed: '#e0a96d',
  active: '#6b9fc4',
  executed: '#a07c8c',
  revoked: '#c46a5a',
  expired: '#7f8c8d',
}

function statusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#7f8c8d'
}

function fmtDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`
}

function toggleExpand(id: string) {
  expandedId.value = expandedId.value === id ? null : id
}

function create() {
  if (!form.name.trim()) return
  testament.createTestament({
    name: form.name.trim(),
    testator: form.testator.trim() || '我',
    type: form.type,
    trigger: form.trigger,
  })
  form.name = ''
  form.testator = ''
}

function seal(id: string) {
  testament.sealTestament(id)
}

function activate(id: string) {
  testament.activateTestament(id)
}

function revoke(id: string) {
  testament.revokeTestament(id)
}

async function execute(id: string) {
  const result = await testament.executeTestament(id, '我')
  if (!result.success && result.error) {
    // eslint-disable-next-line no-console
    console.warn('[TestamentPanel] 执行失败:', result.error)
  }
}

function addClause(id: string) {
  if (!clauseForm.title.trim()) return
  testament.addClause(id, {
    title: clauseForm.title.trim(),
    content: clauseForm.content.trim() || clauseForm.title.trim(),
    type: form.type,
    beneficiaryIds: [],
  })
  clauseForm.title = ''
  clauseForm.content = ''
}

function removeClause(id: string, clauseId: string) {
  testament.removeClause(id, clauseId)
}

function addBeneficiary(id: string) {
  if (!beneficiaryForm.name.trim()) return
  testament.addBeneficiary(id, {
    name: beneficiaryForm.name.trim(),
    relationship: beneficiaryForm.relationship.trim() || '亲友',
  })
  beneficiaryForm.name = ''
  beneficiaryForm.relationship = ''
}

function removeBeneficiary(id: string, beneficiaryId: string) {
  testament.removeBeneficiary(id, beneficiaryId)
}
</script>

<style scoped src="./will-shared.css"></style>
