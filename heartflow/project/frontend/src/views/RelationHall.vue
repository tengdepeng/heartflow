<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance relation-hall">
    <!-- 氛围背景 -->
    <div data-enter class="rh-ambient">
      <div class="rh-glow-left" />
      <div class="rh-glow-right" />
    </div>

    <!-- 装饰头部 -->
    <header data-enter class="rh-header">
      <div class="header-ornament">
        <span class="orn-line" />
        <span class="orn-diamond">✦</span>
        <span class="orn-line" />
      </div>
      <h1 class="rh-title">羁绊之厅</h1>
      <p class="rh-subtitle">记录你生命中重要的人</p>
      <div class="header-ornament">
        <span class="orn-line" />
        <span class="orn-diamond">✦</span>
        <span class="orn-line" />
      </div>

      <!-- 概览卡片 -->
      <div class="overview-row" v-if="rel.persons.value.length > 0">
        <div class="overview-card">
          <span class="ov-label">总人数</span>
          <strong class="ov-value">{{ rel.persons.value.length }}</strong>
          <span class="ov-note">已记录的重要的人</span>
        </div>
        <div class="overview-card">
          <span class="ov-label">最高亲密度</span>
          <strong class="ov-value">{{ rel.persons.value.length ? Math.round(Math.max(...rel.persons.value.map(p => p.closeness || 0)) * 100) + '%' : '—' }}</strong>
          <span class="ov-note">最亲近的关系</span>
        </div>
        <div class="overview-card">
          <span class="ov-label">最近联系</span>
          <strong class="ov-value">{{ rel.persons.value.length ? (rel.persons.value.reduce((a,b) => (a.lastContact||'') > (b.lastContact||'') ? a : b).name || '—') : '—' }}</strong>
          <span class="ov-note">最近活跃的关系</span>
        </div>
      </div>
    </header>

    <!-- 羁绊档案（INCR-13）档案概览/健康/类型/节律/洞察 -->
    <BondArchivePanel :persons="rel.persons.value" />

    <!-- 选项卡导航 -->
    <nav class="rh-tabs">
      <button
        v-for="tab in RELATION_TABS"
        :key="tab.key"
        class="rh-tab"
        :class="{ active: activeRelationTab === tab.key }"
        @click="activeRelationTab = tab.key"
      >
        <span class="tab-icon">{{ tab.icon }}</span>
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- ============================================================
         关系网 Tab
         ============================================================ -->
    <template v-if="activeRelationTab === 'network'">
    <!-- 添加按钮 -->
    <div class="rh-actions">
      <button class="btn-new" @click="openCreate">+ 添加羁绊</button>
    </div>

    <!-- 搜索与筛选 -->
    <div class="rh-controls" v-if="rel.persons.value.length > 0">
      <div class="rh-control-row">
        <input v-model="searchQuery" class="rh-search-input" placeholder="搜索姓名、备注、标签..." />
        <select v-model="sortOrder" class="rh-sort-select">
          <option value="closeness-desc">亲密度降序</option>
          <option value="closeness-asc">亲密度升序</option>
        </select>
      </div>
      <div class="rh-rel-filters">
        <button
          v-for="opt in relationFilterOptions"
          :key="opt.value"
          class="rh-rel-filter"
          :class="{ active: activeRelationFilter === opt.value }"
          @click="activeRelationFilter = opt.value"
        >{{ opt.label }}</button>
      </div>
    </div>

    <!-- 关系网络图 SVG 径向布局 -->
    <div class="rh-network" v-if="rel.persons.value.length > 0">
      <div class="net-center-label">羁绊之网</div>
      <svg viewBox="0 0 400 400" class="net-svg" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="net-center-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="rgba(var(--accent-rgb), 0.3)" />
            <stop offset="60%" stop-color="rgba(var(--accent-rgb), 0.08)" />
            <stop offset="100%" stop-color="rgba(var(--accent-rgb), 0)" />
          </radialGradient>
          <filter id="net-glow-filter">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <!-- 中心光晕 -->
        <circle cx="200" cy="200" r="80" fill="url(#net-center-glow)">
          <animate attributeName="r" values="75;85;75" dur="4s" repeatCount="indefinite" />
        </circle>

        <!-- 连接线 -->
        <g v-for="(p, i) in networkLayout" :key="'nl'+p.id">
          <line
            :x1="200" :y1="200"
            :x2="p.x" :y2="p.y"
            :stroke="p.color"
            stroke-opacity="0.15"
            stroke-width="1"
            stroke-dasharray="3,4"
          >
            <animate attributeName="stroke-dashoffset" :from="i * 10" :to="i * 10 - 100" dur="20s" repeatCount="indefinite" />
          </line>
        </g>

        <!-- 外围轨道 -->
        <circle cx="200" cy="200" :r="networkLayout.length > 0 ? 140 : 0" fill="none" stroke="rgba(var(--accent-rgb), 0.05)" stroke-width="0.5" stroke-dasharray="2,6" />

        <!-- 人物节点 -->
        <g v-for="p in networkLayout" :key="p.id" class="net-node-group" @click="editPerson(p.person)" @mouseenter="hoveredPerson = p" @mouseleave="hoveredPerson = null">
          <!-- 节点光晕 -->
          <circle :cx="p.x" :cy="p.y" r="16" :fill="p.color" opacity="0.08" filter="url(#net-glow-filter)">
            <animate attributeName="r" values="14;18;14" dur="3s" repeatCount="indefinite" />
          </circle>
          <!-- 节点主体 -->
          <circle :cx="p.x" :cy="p.y" r="12" :fill="p.color" opacity="0.25" stroke="rgba(232,224,216,0.2)" stroke-width="1" />
          <!-- 内圈 -->
          <circle :cx="p.x" :cy="p.y" r="7" :fill="p.color" opacity="0.4" />
          <!-- 亲密度弧 -->
          <circle :cx="p.x" :cy="p.y" r="14" fill="none" :stroke="p.color" :stroke-opacity="0.5" stroke-width="1.5"
            :stroke-dasharray="p.closeness * 88 + ' ' + (1 - p.closeness) * 88"
            :stroke-dashoffset="-22"
            transform="rotate(-90, p.x, p.y)"
          />
          <!-- 姓名标签 -->
          <text :x="p.x" :y="p.y + 28" text-anchor="middle" class="net-node-label" :fill="p.color">{{ p.name }}</text>
          <!-- 关系标签 -->
          <text :x="p.x" :y="p.y + 41" text-anchor="middle" class="net-rel-label" fill="rgba(232,224,216,0.35)">{{ p.relLabel }}</text>
        </g>

        <!-- 中心节点 -->
        <circle cx="200" cy="200" r="18" fill="rgba(var(--accent-rgb), 0.2)" stroke="rgba(var(--accent-rgb), 0.4)" stroke-width="1.5" />
        <circle cx="200" cy="200" r="10" fill="rgba(var(--accent-rgb), 0.35)" />
        <text x="200" y="205" text-anchor="middle" class="net-center-text" fill="#0d0b09" font-size="10" font-weight="700">你</text>
        <!-- 中心呼吸 -->
        <circle cx="200" cy="200" r="22" fill="none" stroke="rgba(var(--accent-rgb), 0.2)" stroke-width="0.8">
          <animate attributeName="r" values="20;26;20" dur="3s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.2;0.05;0.2" dur="3s" repeatCount="indefinite" />
        </circle>
      </svg>

      <!-- 悬浮提示 -->
      <div v-if="hoveredPerson" class="net-tooltip">
        <span class="nt-name">{{ hoveredPerson.name }}</span>
        <span class="nt-rel">{{ hoveredPerson.relLabel }}</span>
        <span class="nt-closeness">亲密度 {{ Math.round(hoveredPerson.closeness * 100) }}%</span>
      </div>
    </div>

    <!-- 人物卡片列表 -->
    <div class="person-grid" v-if="rel.persons.value.length > 0">
      <div v-for="p in filteredPersons" :key="p.id" class="person-card"
        :style="{ borderColor: p.color + '33' }" @click="editPerson(p)">
        <div class="card-top">
          <span class="card-avatar" :style="{ background: p.color + '22', color: p.color }">
            {{ p.name[0] }}
          </span>
          <div class="card-info">
            <span class="card-name">{{ p.name }}</span>
            <span class="card-rel">{{ RELATION_LABELS[p.relation] }}</span>
          </div>
          <span class="closeness" :style="{ opacity: 0.3 + p.closeness * 0.7 }">
            {{ Math.round(p.closeness * 100) }}%
          </span>
        </div>
        <div class="card-body" v-if="p.notes">
          <p>{{ p.notes.slice(0, 80) }}{{ p.notes.length > 80 ? '…' : '' }}</p>
        </div>
        <div class="card-dates" v-if="p.importantDates.length > 0">
          <span v-for="d in p.importantDates.slice(0,2)" :key="d.label" class="date-chip">
            {{ d.label }}: {{ d.date }}
          </span>
        </div>
        <button class="card-del" @click.stop="rel.remove(p.id)">×</button>
      </div>
    </div>

    <div v-else class="empty-state">
      <div class="empty-icon-wrap">
        <span class="empty-icon">👥</span>
        <div class="empty-glow" />
      </div>
      <p>还没有记录任何人</p>
      <span class="empty-hint">点击上方「添加羁绊」开始记录</span>
    </div>
    </template>

    <!-- ============================================================
         家脉树 Tab
         ============================================================ -->
    <template v-if="activeRelationTab === 'family'">
      <div class="rh-family-tree">
        <svg :viewBox="`0 0 ${svgWidth} 220`" class="ft-svg">
          <!-- 根节点 -->
          <circle :cx="svgWidth / 2" cy="40" r="22" class="ft-root-circle" />
          <text :x="svgWidth / 2" y="45" text-anchor="middle" class="ft-root-text">你</text>

          <!-- 分支连线 -->
          <line
            v-for="(m, i) in familyMembers"
            :key="'l-' + m.id"
            :x1="svgWidth / 2"
            :y1="62"
            :x2="memberX(i)"
            :y2="128"
            class="ft-branch"
          />

          <!-- 成员节点 -->
          <g
            v-for="(m, i) in familyMembers"
            :key="m.id"
            :transform="`translate(${memberX(i)}, 150)`"
          >
            <circle r="18" class="ft-member-circle" :style="{ stroke: m.color }" />
            <text y="5" text-anchor="middle" class="ft-member-initial">{{ m.name[0] }}</text>
            <text y="28" text-anchor="middle" class="ft-member-name">{{ m.name }}</text>
          </g>
        </svg>
        <p v-if="familyMembers.length === 0" class="ft-empty">暂无家人记录，请先在「关系网」中添加家人</p>
      </div>
    </template>

    <!-- ============================================================
         留座 Tab
         ============================================================ -->
    <template v-if="activeRelationTab === 'memorial'">
      <div class="rh-memorial">
        <!-- 已留座列表 -->
        <div class="ms-list" v-if="memorialSeats.length > 0">
          <div
            v-for="seat in memorialSeats"
            :key="seat.id"
            class="ms-card"
            :class="'ms-' + seat.reason"
          >
            <div class="ms-card-top">
              <span class="ms-reason-icon">
                <template v-if="seat.reason === 'passed'">&#x1F342;</template>
                <template v-else-if="seat.reason === 'lost'">&#x1F338;</template>
                <template v-else>&#x1F30D;</template>
              </span>
              <div class="ms-card-info">
                <strong class="ms-card-name">{{ seat.name }}</strong>
                <span class="ms-card-rel">{{ seat.relation }}</span>
              </div>
              <span class="ms-reason-tag" :class="'ms-reason-' + seat.reason">
                {{ seat.reason === 'passed' ? '已故' : seat.reason === 'lost' ? '失联' : '远行' }}
              </span>
            </div>
            <p v-if="seat.message" class="ms-card-msg">{{ seat.message }}</p>
            <span class="ms-card-date">{{ new Date(seat.createdAt).toLocaleDateString('zh-CN') }}</span>
          </div>
        </div>

        <!-- 添加留座 -->
        <div class="ms-form">
          <h3 class="ms-form-title">添加留座</h3>
          <input v-model="newMemorial.name" class="ms-input" placeholder="姓名" />
          <input v-model="newMemorial.relation" class="ms-input" placeholder="关系（如：好友、导师）" />
          <div class="ms-reason-pick">
            <button
              v-for="opt in MEMORIAL_REASONS"
              :key="opt.value"
              class="ms-reason-btn"
              :class="{ active: newMemorial.reason === opt.value }"
              @click="newMemorial.reason = opt.value"
            >{{ opt.label }}</button>
          </div>
          <textarea v-model="newMemorial.message" class="ms-textarea" placeholder="想对ta说的话…" rows="3" />
          <button class="ms-submit" @click="addMemorial" :disabled="!newMemorial.name.trim()">留下座位</button>
        </div>
      </div>
    </template>

    <!-- 编辑弹窗 -->
    <Teleport to="body"><Transition name="modal">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal=false">
        <div class="modal-card">
          <h3>{{ editing ? '编辑' : '添加' }}</h3>
          <input v-model="form.name" class="form-input" placeholder="姓名" />
          <div class="rel-pick">
            <button v-for="(label, key) in RELATION_LABELS" :key="key"
              :class="['rel-btn', { active: form.relation === key }]"
              @click="form.relation = key as Person['relation']">{{ label }}</button>
          </div>
          <textarea v-model="form.notes" class="form-textarea" placeholder="关于ta…" rows="3" />
          <div class="form-row">
            <label>亲密度</label>
            <input v-model.number="form.closeness" type="range" min="0" max="1" step="0.1" />
            <span>{{ Math.round(form.closeness * 100) }}%</span>
          </div>
          <div class="modal-actions">
            <button class="btn-cancel" @click="showModal=false">取消</button>
            <button class="btn-save" @click="savePerson" :disabled="!form.name.trim()">保存</button>
          </div>
        </div>
      </div>
    </Transition></Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRelation } from '../modules/relation'
import { useMemorialSeats } from '../modules/relation/memorial-seats'
import { RELATION_LABELS } from '../modules/relation/types'
import type { Person } from '../modules/relation/types'
import BondArchivePanel from '../components/BondArchivePanel.vue'
import { useViewEntrance } from '../composables/useViewEntrance'

// ============================================================
// Tab 切换
// ============================================================
const { entranceRef, entranceClass } = useViewEntrance()
type RelationTab = 'network' | 'family' | 'memorial'

const RELATION_TABS: { key: RelationTab; icon: string; label: string }[] = [
  { key: 'network', icon: '\u{1F465}', label: '关系网' },
  { key: 'family', icon: '\u{1F333}', label: '家脉树' },
  { key: 'memorial', icon: '\u{1F339}', label: '留座' },
]

const activeRelationTab = ref<RelationTab>('network')

// ============================================================
// 关系数据
// ============================================================
const rel = useRelation()
const memorial = useMemorialSeats()
onMounted(() => {
  rel.load()
  memorial.load()
})

const searchQuery = ref('')
const activeRelationFilter = ref('all')
const sortOrder = ref('closeness-desc')

const relationFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'family', label: '家人' },
  { value: 'lover', label: '伴侣' },
  { value: 'friend', label: '朋友' },
  { value: 'colleague', label: '同事' },
  { value: 'mentor', label: '导师' },
  { value: 'other', label: '其他' },
]

const filteredPersons = computed(() => {
  let list = [...rel.persons.value]
  // 搜索过滤
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.notes || '').toLowerCase().includes(q) ||
      (p.tags || []).some(t => t.toLowerCase().includes(q))
    )
  }
  // 关系筛选
  if (activeRelationFilter.value !== 'all') {
    list = list.filter(p => p.relation === activeRelationFilter.value)
  }
  // 排序
  if (sortOrder.value === 'closeness-desc') {
    list.sort((a, b) => (b.closeness || 0) - (a.closeness || 0))
  } else if (sortOrder.value === 'closeness-asc') {
    list.sort((a, b) => (a.closeness || 0) - (b.closeness || 0))
  }
  return list
})

// ============================================================
// 网络图径向布局
// ============================================================
const hoveredPerson = ref<any>(null)

interface NetworkNode {
  id: string
  person: any
  x: number
  y: number
  name: string
  color: string
  closeness: number
  relLabel: string
}

const networkLayout = computed<NetworkNode[]>(() => {
  const persons = rel.persons.value
  if (!persons.length) return []
  const count = persons.length
  const cx = 200
  const cy = 200
  const radius = 140
  return persons.map((p, i) => {
    const angle = (i / count) * Math.PI * 2 - Math.PI / 2
    return {
      id: p.id,
      person: p,
      x: Number((cx + Math.cos(angle) * radius).toFixed(1)),
      y: Number((cy + Math.sin(angle) * radius).toFixed(1)),
      name: p.name,
      color: p.color || '#d4a574',
      closeness: p.closeness || 0.5,
      relLabel: RELATION_LABELS[p.relation] || '未知',
    }
  })
})

// ============================================================
// 家脉树
// ============================================================
const familyMembers = computed(() => {
  return rel.persons.value.filter(p => p.relation === 'family')
})

const svgWidth = 600

function memberX(index: number): number {
  const count = familyMembers.value.length
  if (count === 0) return svgWidth / 2
  const spacing = Math.min(80, (svgWidth - 80) / Math.max(count - 1, 1))
  const totalWidth = (count - 1) * spacing
  const startX = (svgWidth - totalWidth) / 2
  return startX + index * spacing
}

// ============================================================
// 留座 · 纪念座位
// ============================================================
interface MemorialSeat {
  id: string
  name: string
  relation: string
  reason: 'passed' | 'lost' | 'far'
  message: string
  createdAt: number
}

const MEMORIAL_REASONS: { value: MemorialSeat['reason']; label: string }[] = [
  { value: 'passed', label: '已故' },
  { value: 'lost', label: '失联' },
  { value: 'far', label: '远行' },
]

const memorialSeats = memorial.seats

const newMemorial = reactive<Omit<MemorialSeat, 'id' | 'createdAt'>>({
  name: '',
  relation: '',
  reason: 'passed',
  message: '',
})

function addMemorial() {
  if (!newMemorial.name.trim()) return
  const seat: MemorialSeat = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    name: newMemorial.name.trim(),
    relation: newMemorial.relation.trim(),
    reason: newMemorial.reason,
    message: newMemorial.message.trim(),
    createdAt: Date.now(),
  }
  memorial.add(seat)
  // 重置表单
  newMemorial.name = ''
  newMemorial.relation = ''
  newMemorial.reason = 'passed'
  newMemorial.message = ''
}

const showModal = ref(false)
const editing = ref(false)
const editingId = ref<string | null>(null)
const form = reactive({ name: '', relation: 'friend' as Person['relation'], notes: '', closeness: 0.3 })

function openCreate() {
  editing.value = false; editingId.value = null
  form.name = ''; form.relation = 'friend'; form.notes = ''; form.closeness = 0.3
  showModal.value = true
}

function editPerson(p: Person) {
  editing.value = true; editingId.value = p.id
  form.name = p.name; form.relation = p.relation; form.notes = p.notes; form.closeness = p.closeness
  showModal.value = true
}

function savePerson() {
  if (!form.name.trim()) return
  if (editing.value && editingId.value) {
    rel.update(editingId.value, { name: form.name, relation: form.relation, notes: form.notes, closeness: form.closeness })
  } else {
    rel.create(form.name, form.relation)
    const p = rel.persons.value[rel.persons.value.length - 1]
    if (p) rel.update(p.id, { notes: form.notes, closeness: form.closeness })
  }
  showModal.value = false
}
</script>

<style scoped>
/* ============================================================
   容器 & 氛围
   ============================================================ */
.relation-hall {
  position: relative;
  max-width: 640px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
}

.rh-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background: transparent;
}

.rh-glow-left {
  position: absolute;
  top: 0;
  left: -5%;
  width: 35%;
  height: 55%;
  background: radial-gradient(ellipse at 30% 20%, rgba(var(--accent-rgb), 0.04), transparent 60%);
}

.rh-glow-right {
  position: absolute;
  bottom: 0;
  right: -5%;
  width: 40%;
  height: 45%;
  background: radial-gradient(ellipse at 70% 80%, rgba(var(--accent-rgb), 0.03), transparent 60%);
}

/* ============================================================
   头部
   ============================================================ */
.rh-header {
  position: relative;
  z-index: 1;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  margin-bottom: 24px;
}

.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.orn-line {
  display: block;
  width: 50px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.2), transparent);
}

.orn-diamond {
  font-size: 8px;
  color: var(--accent);
  opacity: 0.35;
}

.rh-title {
  font-size: 30px;
  font-weight: 500;
  letter-spacing: 4px;
  color: var(--text-high);
  font-family: var(--font-heading-zh);
  margin: 0;
}

.rh-subtitle {
  font-size: 12px;
  color: var(--text-low);
  margin: 0;
}

/* ---- 概览卡片 ---- */
.overview-row {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  margin-top: 8px;
}

.overview-card {
  padding: 18px 16px;
  border-radius: 16px;
  background: var(--card-bg);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  display: flex;
  flex-direction: column;
  gap: 6px;
  text-align: left;
  transition: all 0.25s ease;
}

.overview-card:hover {
  background: rgba(55, 48, 40, 0.5);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.ov-label {
  font-size: 11px;
  color: var(--text-low);
  letter-spacing: 0.5px;
}

.ov-value {
  font-size: 22px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
}

.ov-note {
  font-size: 11px;
  line-height: 1.5;
  color: var(--text-secondary);
}

/* ============================================================
   操作按钮
   ============================================================ */
.rh-actions {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.btn-new {
  padding: 10px 24px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.08);
  color: var(--accent);
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 1px;
}

.btn-new:hover {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: rgba(var(--accent-rgb), 0.3);
}

/* ============================================================
   关系网络图 SVG 径向布局
   ============================================================ */
.rh-network {
  position: relative;
  z-index: 1;
  text-align: center;
  padding: 20px;
  margin-bottom: 24px;
  border-radius: 16px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.net-center-label {
  font-size: 12px;
  color: var(--text-low);
  letter-spacing: 3px;
  margin-bottom: 12px;
  text-transform: uppercase;
}

.net-svg {
  width: 100%;
  max-width: 400px;
  height: auto;
}

.net-node-group {
  cursor: pointer;
}

.net-node-label {
  font-size: 11px;
  font-weight: 500;
}

.net-rel-label {
  font-size: 9px;
}

.net-tooltip {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 16px;
  background: rgba(20, 18, 15, 0.9);
  border: 1px solid rgba(var(--accent-rgb), 0.2);
  border-radius: 8px;
  pointer-events: none;
  z-index: 10;
}

.nt-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.nt-rel {
  font-size: 11px;
  color: var(--text-medium);
}

.nt-closeness {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.6);
}

.net-node {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--conn-color, rgba(var(--accent-rgb), 0.2));
  background: var(--card-bg);
  cursor: pointer;
  transition: all 0.25s ease;
}

.net-node:hover {
  background: rgba(55, 48, 40, 0.6);
  transform: translateY(-1px);
  box-shadow: 0 0 20px rgba(var(--accent-rgb), 0.06);
}

.node-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.node-name {
  font-size: 13px;
  color: rgba(var(--text-primary-rgb), 0.72);
}

.node-rel {
  font-size: 10px;
  color: var(--text-low);
}

/* ============================================================
   人物卡片列表
   ============================================================ */
.person-grid {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.person-card {
  position: relative;
  padding: 18px;
  border-radius: 14px;
  border: 1px solid;
  background: rgba(var(--bg-card-rgb), 0.35);
  cursor: pointer;
  transition: all 0.25s ease;
}

.person-card:hover {
  background: rgba(55, 48, 40, 0.45);
  transform: translateY(-1px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

.card-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  flex-shrink: 0;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-name {
  font-size: 15px;
  font-weight: 500;
  display: block;
  color: var(--text-high);
}

.card-rel {
  font-size: 11px;
  color: var(--text-dim);
}

.closeness {
  font-size: 11px;
  color: var(--accent);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.card-body {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
}

.card-body p {
  font-size: 12px;
  color: var(--text-medium);
  line-height: 1.6;
  margin: 0;
}

.card-dates {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}

.date-chip {
  font-size: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.06);
  color: var(--text-dim);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.card-del {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: rgba(var(--text-primary-rgb), 0.15);
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.person-card:hover .card-del {
  opacity: 1;
}

.card-del:hover {
  background: rgba(255, 107, 107, 0.15);
  color: var(--danger);
}

/* ============================================================
   空状态
   ============================================================ */
.empty-state {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  gap: 6px;
  color: var(--text-faint);
}

.empty-icon-wrap {
  position: relative;
  margin-bottom: 8px;
}

.empty-icon {
  font-size: 40px;
  opacity: 0.35;
  position: relative;
  z-index: 1;
}

.empty-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 70px;
  height: 70px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.06), transparent 70%);
  border-radius: 50%;
}

.empty-state p {
  font-size: 14px;
  color: var(--text-low);
}

.empty-hint {
  font-size: 12px;
  color: var(--text-faint);
}

/* ============================================================
   模态弹窗
   ============================================================ */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: linear-gradient(180deg, rgba(30, 26, 22, 0.98), rgba(18, 15, 12, 0.98));
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 16px;
  padding: 28px;
  width: 380px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 86vh;
  overflow-y: auto;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4), 0 0 40px rgba(var(--accent-rgb), 0.03);
}

.modal-card h3 {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-high);
  margin: 0;
  text-align: center;
  letter-spacing: 1px;
}

.form-input,
.form-textarea {
  padding: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 10px;
  background: var(--card-bg);
  color: rgba(var(--text-primary-rgb), 0.75);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}

.form-input:focus,
.form-textarea:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.form-input::placeholder,
.form-textarea::placeholder {
  color: rgba(var(--text-primary-rgb), 0.18);
}

.form-textarea {
  resize: vertical;
}

.rel-pick {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.rel-btn {
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: transparent;
  color: var(--text-dim);
  font-size: 12px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s;
}

.rel-btn:hover {
  color: rgba(var(--text-primary-rgb), 0.65);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.rel-btn.active {
  border-color: rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
}

.form-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--text-secondary);
}

.form-row input[type=range] {
  flex: 1;
  accent-color: var(--accent);
  height: 4px;
}

.form-row span {
  font-variant-numeric: tabular-nums;
  min-width: 32px;
  text-align: right;
  color: var(--accent);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

.btn-cancel {
  padding: 8px 20px;
  border-radius: 999px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: transparent;
  color: var(--text-dim);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  border-color: rgba(var(--accent-rgb), 0.15);
  color: rgba(var(--text-primary-rgb), 0.6);
}

.btn-save {
  padding: 8px 20px;
  border-radius: 999px;
  border: none;
  background: var(--accent);
  color: var(--bg-primary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover {
  background: #dbb48a;
}

.btn-save:disabled {
  opacity: 0.35;
  cursor: default;
}

/* ============================================================
   过渡动画
   ============================================================ */
.modal-enter-active {
  transition: all 0.2s ease-out;
}

.modal-leave-active {
  transition: all 0.15s ease-in;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

/* ============================================================
   Tab 导航栏
   ============================================================ */
.rh-tabs {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 24px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.rh-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 18px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-low);
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
  letter-spacing: 0.5px;
}

.rh-tab:hover {
  color: rgba(var(--text-primary-rgb), 0.6);
  background: rgba(var(--accent-rgb), 0.04);
}

.rh-tab.active {
  color: rgba(var(--text-primary-rgb), 0.85);
  background: rgba(var(--accent-rgb), 0.1);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.03);
}

.tab-icon {
  font-size: 15px;
}

.tab-label {
  font-weight: 450;
}

/* ============================================================
   家脉树 SVG
   ============================================================ */
.rh-family-tree {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  border-radius: 16px;
  background: rgba(var(--bg-card-rgb), 0.3);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.ft-svg {
  width: 100%;
  max-width: 600px;
  height: auto;
}

.ft-root-circle {
  fill: var(--accent);
  opacity: 0.9;
}

.ft-root-text {
  fill: var(--bg-primary);
  font-size: 14px;
  font-weight: 600;
  dominant-baseline: central;
}

.ft-branch {
  stroke: rgba(var(--accent-rgb), 0.15);
  stroke-width: 1.5;
  stroke-linecap: round;
}

.ft-member-circle {
  fill: var(--bg-card);
  stroke-width: 2;
  stroke-opacity: 0.6;
}

.ft-member-initial {
  fill: rgba(var(--text-primary-rgb), 0.75);
  font-size: 14px;
  font-weight: 500;
  dominant-baseline: central;
}

.ft-member-name {
  fill: rgba(var(--text-primary-rgb), 0.45);
  font-size: 11px;
}

.ft-empty {
  font-size: 13px;
  color: var(--text-secondary);
  text-align: center;
  padding: 40px 0;
}

/* ============================================================
   留座 · 纪念座位
   ============================================================ */
.rh-memorial {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ---- 留座卡片列表 ---- */
.ms-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ms-card {
  padding: 16px;
  border-radius: 14px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid;
  transition: all 0.25s ease;
}

.ms-card:hover {
  background: rgba(55, 48, 40, 0.45);
  transform: translateY(-1px);
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

/* 已故 - 暖色边框 */
.ms-passed {
  border-color: rgba(255, 152, 67, 0.15);
}

.ms-passed:hover {
  border-color: rgba(255, 152, 67, 0.25);
}

/* 失联 - 粉色边框 */
.ms-lost {
  border-color: rgba(236, 64, 122, 0.15);
}

.ms-lost:hover {
  border-color: rgba(236, 64, 122, 0.25);
}

/* 远行 - 蓝色边框 */
.ms-far {
  border-color: rgba(66, 165, 245, 0.15);
}

.ms-far:hover {
  border-color: rgba(66, 165, 245, 0.25);
}

.ms-card-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ms-reason-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.ms-card-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ms-card-name {
  font-size: 15px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.85);
}

.ms-card-rel {
  font-size: 11px;
  color: var(--text-low);
}

.ms-reason-tag {
  font-size: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  font-weight: 450;
  flex-shrink: 0;
}

.ms-reason-passed {
  background: rgba(255, 152, 67, 0.1);
  color: #ffb74d;
  border: 1px solid rgba(255, 152, 67, 0.15);
}

.ms-reason-lost {
  background: rgba(236, 64, 122, 0.1);
  color: #f48fb1;
  border: 1px solid rgba(236, 64, 122, 0.15);
}

.ms-reason-far {
  background: rgba(66, 165, 245, 0.1);
  color: #90caf9;
  border: 1px solid rgba(66, 165, 245, 0.15);
}

.ms-card-msg {
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-medium);
  padding-top: 10px;
  border-top: 1px solid rgba(var(--accent-rgb), 0.06);
}

.ms-card-date {
  display: block;
  margin-top: 8px;
  font-size: 10px;
  color: var(--text-faint);
}

/* ---- 添加留座表单 ---- */
.ms-form {
  padding: 24px;
  border-radius: 16px;
  background: rgba(var(--bg-card-rgb), 0.35);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ms-form-title {
  font-size: 15px;
  font-weight: 500;
  color: rgba(var(--text-primary-rgb), 0.8);
  margin: 0;
  text-align: center;
  letter-spacing: 1px;
}

.ms-input,
.ms-textarea {
  padding: 10px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 10px;
  background: var(--card-bg);
  color: rgba(var(--text-primary-rgb), 0.75);
  font-family: inherit;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s;
}

.ms-input:focus,
.ms-textarea:focus {
  border-color: rgba(var(--accent-rgb), 0.25);
}

.ms-input::placeholder,
.ms-textarea::placeholder {
  color: rgba(var(--text-primary-rgb), 0.18);
}

.ms-textarea {
  resize: vertical;
}

.ms-reason-pick {
  display: flex;
  gap: 6px;
}

.ms-reason-btn {
  flex: 1;
  padding: 7px 0;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  background: transparent;
  color: var(--text-dim);
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}

.ms-reason-btn:hover {
  color: rgba(var(--text-primary-rgb), 0.6);
  border-color: rgba(var(--accent-rgb), 0.15);
}

.ms-reason-btn.active {
  border-color: rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--accent-rgb), 0.1);
  color: var(--accent);
}

.ms-submit {
  padding: 10px 0;
  border-radius: 10px;
  border: none;
  background: var(--accent);
  color: var(--bg-primary);
  font-family: inherit;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 1px;
}

.ms-submit:hover {
  background: #dbb48a;
}

.ms-submit:disabled {
  opacity: 0.35;
  cursor: default;
}

/* ============================================================
   响应式
   ============================================================ */

/* 860px: 平板过渡 — 紧凑重排 */
@media (max-width: 860px) {
  .relation-hall {
    padding: 32px 20px 72px;
  }

  .overview-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .rh-title {
    font-size: 26px;
  }

  .rh-network {
    padding: 22px;
  }
}

@media (max-width: 680px) {
  .relation-hall {
    padding: 24px 16px 72px;
  }

  .overview-row {
    grid-template-columns: 1fr;
  }

  .rh-title {
    font-size: 26px;
  }

  .rh-network {
    padding: 20px;
  }

  .person-card {
    padding: 14px;
  }
}

.rh-controls { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.rh-control-row { display: flex; gap: 8px; }
.rh-search-input { flex: 1; padding: 8px 12px; border: 1px solid rgba(var(--accent-rgb), 0.1); border-radius: 8px; background: var(--card-bg); color: rgba(var(--text-primary-rgb), 0.75); font-size: 13px; font-family: inherit; outline: none; }
.rh-search-input:focus { border-color: rgba(var(--accent-rgb), 0.25); }
.rh-sort-select { padding: 8px 12px; border: 1px solid rgba(var(--accent-rgb), 0.1); border-radius: 8px; background: var(--card-bg); color: var(--text-secondary); font-size: 12px; font-family: inherit; outline: none; cursor: pointer; }
.rh-sort-select:focus { border-color: rgba(var(--accent-rgb), 0.25); }
.rh-rel-filters { display: flex; flex-wrap: wrap; gap: 4px; }
.rh-rel-filter { padding: 4px 10px; border-radius: 6px; border: 1px solid rgba(var(--accent-rgb), 0.08); background: transparent; color: var(--text-dim); font-size: 11px; font-family: inherit; cursor: pointer; transition: all 0.2s; }
.rh-rel-filter:hover { border-color: rgba(var(--accent-rgb), 0.2); color: rgba(var(--text-primary-rgb), 0.6); }
.rh-rel-filter.active { background: rgba(var(--accent-rgb), 0.1); border-color: rgba(var(--accent-rgb), 0.3); color: var(--accent); }

/* 480px: 极紧凑 — 窄屏 */
@media (max-width: 480px) {
  .overview-row {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .overview-card {
    flex-direction: row;
    align-items: center;
    padding: 12px 14px;
    gap: 10px;
  }

  .overview-card .ov-label {
    font-size: 11px;
    min-width: 60px;
  }

  .overview-card .ov-value {
    font-size: 18px;
  }

  .overview-card .ov-note {
    display: none;
  }

  .rh-network {
    display: none;
  }

  .rh-title {
    font-size: 22px;
  }

  .person-card {
    padding: 12px;
  }
}
</style>