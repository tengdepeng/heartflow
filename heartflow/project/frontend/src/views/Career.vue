<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance career">
    <!-- 氛围背景层：业脉 - 网络脉络 -->
    <div data-enter class="career-ambient" aria-hidden="true">
      <div class="career-glow career-glow--top"></div>
      <div class="career-glow career-glow--bottom"></div>
      <!-- 网络节点 SVG -->
      <div class="career-network" aria-hidden="true">
        <svg viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g stroke="currentColor" stroke-width="0.5" opacity="0.025">
            <circle cx="200" cy="100" r="3" fill="currentColor" />
            <circle cx="80" cy="250" r="2" fill="currentColor" />
            <circle cx="320" cy="250" r="2" fill="currentColor" />
            <circle cx="200" cy="400" r="2.5" fill="currentColor" />
            <circle cx="60" cy="500" r="2" fill="currentColor" />
            <circle cx="340" cy="500" r="2" fill="currentColor" />
            <circle cx="140" cy="600" r="1.5" fill="currentColor" />
            <circle cx="260" cy="600" r="1.5" fill="currentColor" />
            <circle cx="200" cy="700" r="2" fill="currentColor" />
            <line x1="200" y1="100" x2="80" y2="250" />
            <line x1="200" y1="100" x2="320" y2="250" />
            <line x1="80" y1="250" x2="200" y2="400" />
            <line x1="320" y1="250" x2="200" y2="400" />
            <line x1="200" y1="400" x2="60" y2="500" />
            <line x1="200" y1="400" x2="340" y2="500" />
            <line x1="60" y1="500" x2="140" y2="600" />
            <line x1="340" y1="500" x2="260" y2="600" />
            <line x1="140" y1="600" x2="200" y2="700" />
            <line x1="260" y1="600" x2="200" y2="700" />
          </g>
        </svg>
      </div>
      <!-- 浮动连接点 -->
      <div class="career-node career-node-1"></div>
      <div class="career-node career-node-2"></div>
      <div class="career-node career-node-3"></div>
    </div>

    <!-- 通用氛围光晕 -->
    <div data-enter class="career-atmos" aria-hidden="true">
      <div class="atmos-warm-glow"></div>
      <div class="atmos-work-light"></div>
    </div>

    <!-- Header -->
    <RoomHeader
      class="career-room-header"
      data-enter
      :title="roomData?.name"
      :subtitle="roomData?.description"
    >
      <template #breadcrumb>
        <div class="breadcrumb-row">
          <button class="breadcrumb-link" @click="nav.enterRoom('home-space')">
            <span class="breadcrumb-home-icon">🏠</span>
            <span>家</span>
          </button>
          <span class="breadcrumb-sep">›</span>
          <span class="breadcrumb-link current">
            <span class="breadcrumb-icon">{{ roomData?.icon }}</span>
            <span>{{ roomData?.name }}</span>
          </span>
        </div>
      </template>
      <template #ornament>
        <div class="career-header-ornament">
          <span class="orn-line"></span>
          <span class="orn-diamond">✦</span>
          <span class="orn-line"></span>
        </div>
      </template>
      <template #meta>
        <p class="career-kicker">从更漏 · 工作日志中生长出的关系网络</p>
      </template>
    </RoomHeader>

    <!-- 概览统计 -->
    <section data-enter class="career-section">
      <div class="career-overview">
        <div class="career-overview-stat">
          <span class="cos-value">{{ overview.totalContacts }}</span>
          <span class="cos-label">联系人</span>
        </div>
        <div class="career-overview-stat">
          <span class="cos-value">{{ overview.activeProjects }}</span>
          <span class="cos-label">活跃项目</span>
        </div>
        <div class="career-overview-stat">
          <span class="cos-value">{{ overview.networkScore }}<span class="cos-unit">分</span></span>
          <span class="cos-label">脉动指数</span>
        </div>
      </div>
    </section>

    <!-- 脉络图 -->
    <section data-enter class="career-section">
      <div class="section-label-row">
        <h2 class="section-label">
          <span class="section-label-icon">🕸</span>
          脉络图
        </h2>
      </div>
      <div class="career-network-canvas" ref="networkCanvasContainer">
        <canvas
          ref="canvasEl"
          :width="canvasWidth"
          :height="canvasHeight"
          @mousemove="handleCanvasHover"
          @mouseleave="handleCanvasLeave"
        ></canvas>
      </div>
      <!-- 图例 -->
      <div class="career-legend">
        <div class="career-legend-section">
          <span class="career-legend-title">圈层距离</span>
          <div class="career-legend-items">
            <span v-for="t in TIER_DEFS" :key="t.id" class="career-legend-item">
              <span class="career-legend-dot" :style="{ background: t.color }"></span>
              {{ t.icon }} {{ t.name }}
            </span>
          </div>
        </div>
        <div class="career-legend-section">
          <span class="career-legend-title">连接类型</span>
          <div class="career-legend-items">
            <span v-for="c in CONNECTION_TYPES" :key="c.type" class="career-legend-item">
              <span class="career-legend-line" :style="{ background: c.color, width: c.width * 4 + 'px' }"></span>
              {{ c.label }}
            </span>
          </div>
        </div>
        <div class="career-legend-section">
          <span class="career-legend-title">节点类型</span>
          <div class="career-legend-items">
            <span v-for="nt in NODE_TYPE_DEFS.slice(0, 6)" :key="nt.id" class="career-legend-item">
              <span class="career-legend-dot" :style="{ background: nt.color }"></span>
              {{ nt.icon }} {{ nt.name }}
            </span>
          </div>
          <div class="career-legend-items" style="margin-top: 4px">
            <span v-for="nt in NODE_TYPE_DEFS.slice(6)" :key="nt.id" class="career-legend-item">
              <span class="career-legend-dot" :style="{ background: nt.color }"></span>
              {{ nt.icon }} {{ nt.name }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <!-- 人脉分层 -->
    <section data-enter class="career-section">
      <div class="section-label-row">
        <h2 class="section-label">
          <span class="section-label-icon">👥</span>
          人脉分层
        </h2>
        <button class="career-add-btn" @click="openContactForm()" title="添加联系人">＋</button>
      </div>

      <!-- 搜索筛选栏 -->
      <div class="career-search-bar">
        <input
          v-model="searchQuery"
          class="career-search-input"
          type="text"
          placeholder="搜索联系人姓名…"
        />
        <div class="career-tier-filters">
          <button
            class="tier-filter-btn"
            :class="{ active: activeTierFilter === null }"
            @click="activeTierFilter = null"
          >全部</button>
          <button
            v-for="def in TIER_DEFS"
            :key="def.id"
            class="tier-filter-btn"
            :class="{ active: activeTierFilter === def.id }"
            :style="{ '--tier-filter-color': def.color }"
            @click="activeTierFilter = activeTierFilter === def.id ? null : def.id"
          >{{ def.name }}</button>
        </div>
      </div>

      <div class="career-tiers">
        <div
          v-for="tier in filteredTiers"
          :key="tier.id"
          class="tier-card"
          :style="{ '--tier-color': tier.color }"
        >
          <div class="tier-header">
            <span class="tier-icon">{{ tier.icon }}</span>
            <span class="tier-name">{{ tier.name }}</span>
            <span class="tier-count">{{ tier.contacts.length }}</span>
          </div>
          <div class="tier-desc">{{ tier.description }}</div>
          <div class="tier-contacts">
            <span
              v-for="contact in tier.contacts"
              :key="contact.id"
              class="tier-contact-tag"
              @click="openContactForm(contact)"
            >
              <span class="tier-contact-name">{{ contact.name }}</span>
              <span class="tier-contact-affinity" :style="{ '--affinity-pct': (contact.affinity / 10) * 100 + '%' }"></span>
            </span>
            <span v-if="tier.contacts.length === 0" class="tier-empty">暂无记录</span>
          </div>
          <div class="tier-affinity-bar" :style="{ '--tier-avg': tier.avgAffinity + '%' }">
            <span class="tier-affinity-label">亲密度均值</span>
            <span class="tier-affinity-val">{{ tier.avgAffinityText }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 合作记录 -->
    <section class="career-section">
      <div class="section-label-row">
        <h2 class="section-label">
          <span class="section-label-icon">🤝</span>
          合作记录
        </h2>
        <button class="career-add-btn" @click="openProjectForm()" title="添加项目">＋</button>
      </div>
      <div class="career-projects">
        <div
          v-for="project in projects"
          :key="project.id"
          class="project-card"
          :style="{ '--project-color': project.color }"
          @click="openProjectForm(project)"
        >
          <div class="project-card-header">
            <span class="project-icon">{{ project.icon }}</span>
            <span class="project-status" :class="project.status">{{ project.statusLabel }}</span>
          </div>
          <h3 class="project-name">{{ project.name }}</h3>
          <p class="project-desc">{{ project.description }}</p>
          <div class="project-meta">
            <span class="project-date">{{ project.date }}</span>
            <span class="project-partners">{{ project.partners }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- 技能图谱概览 -->
    <section data-enter class="career-section" v-if="skillSummary">
      <div class="section-label-row">
        <h2 class="section-label">
          <span class="section-label-icon">💻</span>
          技能图谱
        </h2>
      </div>
      <div class="career-overview">
        <div class="career-overview-stat">
          <span class="cos-value">{{ skillSummary.total }}</span>
          <span class="cos-label">技能总数</span>
        </div>
        <div class="career-overview-stat">
          <span class="cos-value">{{ skillSummary.coreCount }}</span>
          <span class="cos-label">核心技能</span>
        </div>
        <div class="career-overview-stat">
          <span class="cos-value">{{ skillSummary.avgScore }}<span class="cos-unit">分</span></span>
          <span class="cos-label">平均熟练度</span>
        </div>
      </div>
    </section>

    <!-- 可视化数据 · 技能雷达 + 职业路径（career/skill-path 引擎，INCR-194） -->
    <section data-enter class="career-section cvp-section">
      <CareerVisualizationPanel :skills="skillList" />
    </section>

    <!-- 职业里程碑 -->
    <section data-enter class="career-section" v-if="milestoneList.length">
      <div class="section-label-row">
        <h2 class="section-label">
          <span class="section-label-icon">🏆</span>
          职业里程碑
        </h2>
      </div>
      <div class="career-timeline-simple">
        <div v-for="m in milestoneList" :key="m.id" class="career-milestone-item">
          <div class="career-milestone-dot" :style="{ background: MILESTONE_TYPE_META[m.type]?.color || '#8a9a7a' }"></div>
          <div class="career-milestone-body">
            <div class="career-milestone-header">
              <span class="career-milestone-icon">{{ MILESTONE_TYPE_META[m.type]?.icon || '📌' }}</span>
              <span class="career-milestone-title">{{ m.title }}</span>
              <span class="career-milestone-date">{{ m.date }}</span>
            </div>
            <p v-if="m.description" class="career-milestone-desc">{{ m.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 业脉档案（career·career-analytics：业脉健康/圈层/亲密度/角色/项目状态/洞察，INCR-168） -->
    <section data-enter class="career-section cap-section">
      <CareerArchivePanel :contacts="contacts" :projects="projects" :connections="connections" />
    </section>

    <!-- 职业模拟器 · 行动前先看一步棋（career/career-simulator 引擎，INCR-194） -->
    <section data-enter class="career-section csp-section">
      <CareerSimulatorPanel
        :skills="skillList"
        :contacts="contacts"
        :connections="connections"
        :milestones="milestoneAll"
      />
    </section>

    <!-- 转业 · 转型推荐（career/transition-recommend 引擎：技能·人脉·里程碑综合评估，INCR-227） -->
    <section data-enter class="career-section trp-section">
      <TransitionRecommendPanel
        :contacts="contacts"
        :connections="connections"
        :skills="skillList"
        :milestones="milestoneAll"
      />
    </section>

    <!-- 技能缺口档案 · 缺口分析/学习路线图/里程碑准备度（career/skill-gap-advisor 引擎，INCR-220） -->
    <section data-enter class="career-section sga-section">
      <SkillGapArchivePanel :skills="skillList" :milestones="milestoneAll" />
    </section>

    <!-- 技能缺口可视化 · 缺口热力图/矩阵/路线规划（career/skill-gap-visualization 引擎，INCR-220） -->
    <section data-enter class="career-section sgv-section">
      <SkillGapVisualizationPanel :skills="skillList" :milestones="milestoneAll" />
    </section>

    <!-- 底部铭文 -->
    <footer class="career-colophon">
      <div class="colophon-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="colophon-text">脉络所至 · 皆为业途</p>
    </footer>

    <!-- ============================================ -->
    <!-- 联系人表单 Modal -->
    <!-- ============================================ -->
    <Teleport to="body">
      <div v-if="contactFormVisible" class="career-modal-overlay" @click.self="closeContactForm">
        <div class="career-modal">
          <div class="career-modal-header">
            <h3 class="career-modal-title">{{ editingContactId ? '编辑联系人' : '添加联系人' }}</h3>
            <button class="career-modal-close" @click="closeContactForm" title="关闭">✕</button>
          </div>
          <div class="career-modal-body">
            <div class="form-group">
              <label class="form-label">姓名</label>
              <input v-model="contactForm.name" class="form-input" type="text" placeholder="联系人姓名" />
            </div>
            <div class="form-group">
              <label class="form-label">角色 / 职位</label>
              <input v-model="contactForm.role" class="form-input" type="text" placeholder="如：前端工程师" />
            </div>
            <div class="form-group">
              <label class="form-label">所属圈层</label>
              <div class="form-tier-select">
                <button
                  v-for="def in TIER_DEFS"
                  :key="def.id"
                  class="form-tier-option"
                  :class="{ selected: contactForm.tier === def.id }"
                  :style="{ '--tier-opt-color': def.color }"
                  @click="contactForm.tier = def.id"
                >
                  <span>{{ def.icon }}</span>
                  <span>{{ def.name }}</span>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">节点类型</label>
              <div class="form-tier-select">
                <button
                  v-for="nt in NODE_TYPE_DEFS"
                  :key="nt.id"
                  class="form-tier-option"
                  :class="{ selected: contactForm.nodeType === nt.id }"
                  :style="{ '--tier-opt-color': nt.color }"
                  @click="contactForm.nodeType = nt.id"
                >
                  <span>{{ nt.icon }}</span>
                  <span>{{ nt.name }}</span>
                </button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">亲密度 <span class="form-label-hint">{{ contactForm.affinity }} / 10</span></label>
              <input v-model.number="contactForm.affinity" class="form-slider" type="range" min="1" max="10" step="1" />
              <div class="form-slider-labels">
                <span>疏远</span>
                <span>紧密</span>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">标签 <span class="form-label-hint">用逗号分隔</span></label>
              <input v-model="contactFormTags" class="form-input" type="text" placeholder="如：技术指导, 项目管理" />
            </div>
            <div class="form-group">
              <label class="form-label">备注</label>
              <textarea v-model="contactForm.note" class="form-textarea" rows="3" placeholder="可选备注信息"></textarea>
            </div>
          </div>
          <div class="career-modal-footer">
            <button class="form-btn form-btn-secondary" @click="closeContactForm">取消</button>
            <button class="form-btn form-btn-primary" @click="saveContactForm" :disabled="!contactForm.name.trim()">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- ============================================ -->
    <!-- 项目表单 Modal -->
    <!-- ============================================ -->
    <Teleport to="body">
      <div v-if="projectFormVisible" class="career-modal-overlay" @click.self="closeProjectForm">
        <div class="career-modal">
          <div class="career-modal-header">
            <h3 class="career-modal-title">{{ editingProjectId ? '编辑项目' : '添加项目' }}</h3>
            <button class="career-modal-close" @click="closeProjectForm" title="关闭">✕</button>
          </div>
          <div class="career-modal-body">
            <div class="form-group">
              <label class="form-label">项目名称</label>
              <input v-model="projectForm.name" class="form-input" type="text" placeholder="项目名称" />
            </div>
            <div class="form-group">
              <label class="form-label">描述</label>
              <textarea v-model="projectForm.description" class="form-textarea" rows="3" placeholder="项目描述"></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">状态</label>
              <div class="form-status-select">
                <button
                  v-for="opt in STATUS_OPTIONS"
                  :key="opt.value"
                  class="form-status-option"
                  :class="{ selected: projectForm.status === opt.value }"
                  @click="projectForm.status = opt.value"
                >{{ opt.label }}</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">合作者</label>
              <input v-model="projectForm.partners" class="form-input" type="text" placeholder="如：李工、王组长" />
            </div>
            <div class="form-group">
              <label class="form-label">日期</label>
              <input v-model="projectForm.date" class="form-input" type="text" placeholder="如：2026-07" />
            </div>
          </div>
          <div class="career-modal-footer">
            <button class="form-btn form-btn-secondary" @click="closeProjectForm">取消</button>
            <button class="form-btn form-btn-primary" @click="saveProjectForm" :disabled="!projectForm.name.trim()">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch, onMounted, nextTick } from 'vue'
import { getRoom } from '../engine/room-graph'
import { useRoomNavigation } from '../composables/useRoomNavigation'
import { useViewEntrance } from '../composables/useViewEntrance'
import { useCareer, type CareerContact as Contact, type CareerProject, type NodeTypeId, type ProjectStatus } from '../modules/career/career'
import { useCareerMilestones, useSkillMap, MILESTONE_TYPE_META } from '../modules/career/skill-map'
import RoomHeader from '../components/RoomHeader.vue'
import CareerArchivePanel from '../components/CareerArchivePanel.vue'
import CareerVisualizationPanel from '../components/CareerVisualizationPanel.vue'
import CareerSimulatorPanel from '../components/CareerSimulatorPanel.vue'
import SkillGapArchivePanel from '../components/SkillGapArchivePanel.vue'
import SkillGapVisualizationPanel from '../components/SkillGapVisualizationPanel.vue'
import TransitionRecommendPanel from '../components/TransitionRecommendPanel.vue'

const { entranceRef, entranceClass } = useViewEntrance()
const nav = useRoomNavigation()

// ---- 房间数据 ----
const roomData = computed(() => getRoom('career'))

// ============================================================
// 数据模型
// ============================================================

interface NodeTypeDef {
  id: NodeTypeId
  name: string
  icon: string
  color: string
  shape: 'circle' | 'diamond' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'star'
}

const NODE_TYPE_DEFS: NodeTypeDef[] = [
  { id: 'mentor', name: '导师', icon: '🎓', color: '#e8c060', shape: 'diamond' },
  { id: 'colleague', name: '同事', icon: '👥', color: '#8ab87a', shape: 'circle' },
  { id: 'superior', name: '上级', icon: '⬆', color: '#d08080', shape: 'triangle' },
  { id: 'subordinate', name: '下属', icon: '⬇', color: '#80a0d0', shape: 'triangle' },
  { id: 'client', name: '客户', icon: '🤝', color: '#c0a060', shape: 'square' },
  { id: 'partner', name: '合作', icon: '🔗', color: '#6aba7a', shape: 'pentagon' },
  { id: 'peer', name: '同行', icon: '🌐', color: '#8a9ab8', shape: 'hexagon' },
  { id: 'friend', name: '朋友', icon: '💫', color: '#d0a0c0', shape: 'star' },
  { id: 'vendor', name: '供应商', icon: '📦', color: '#a08a7a', shape: 'square' },
  { id: 'investor', name: '投资人', icon: '💰', color: '#c0c060', shape: 'diamond' },
  { id: 'alumni', name: '校友', icon: '🏫', color: '#80b0a0', shape: 'hexagon' },
]

const STATUS_LABEL: Record<ProjectStatus, string> = {
  active: '进行中',
  completed: '已完成',
  paused: '暂停',
  planning: '规划中',
}

void STATUS_LABEL

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'active', label: '进行中' },
  { value: 'completed', label: '已完成' },
  { value: 'paused', label: '暂停' },
  { value: 'planning', label: '规划中' },
]

// ============================================================
// 圈层定义（静态）
// ============================================================

const TIER_DEFS = [
  { id: 'core' as const, name: '核心圈', icon: '⭐', color: '#e8c060', description: '紧密合作的伙伴与导师' },
  { id: 'active' as const, name: '活跃圈', icon: '🔗', color: '#8ab87a', description: '近期有项目交集的同业' },
  { id: 'extended' as const, name: '扩展圈', icon: '🌐', color: '#8a9ab8', description: '行业交流与偶尔合作' },
  { id: 'edge' as const, name: '边缘圈', icon: '📡', color: '#8a8a7a', description: '一面之缘或早期联系' },
]

// ============================================================
// 数据层（已下沉至 ../modules/career/career）
// ============================================================

const career = useCareer()
const contacts = career.contacts
const projects = career.projects
const connections = career.connections
career.load()

// ============================================================
// 搜索筛选状态
// ============================================================

const searchQuery = ref('')
const activeTierFilter = ref<string | null>(null)

// ============================================================
// 人脉分层（派生自 contacts）
// ============================================================

interface TierDisplay {
  id: string
  name: string
  icon: string
  color: string
  description: string
  contacts: Contact[]
  avgAffinity: number
  avgAffinityText: string
}

const filteredTiers = computed<TierDisplay[]>(() => {
  let filtered = contacts.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    filtered = filtered.filter(c => c.name.toLowerCase().includes(q))
  }
  return TIER_DEFS
    .filter(def => activeTierFilter.value === null || activeTierFilter.value === def.id)
    .map(def => {
      const tierContacts = filtered.filter(c => c.tier === def.id)
      const avg = tierContacts.length > 0
        ? Math.round(tierContacts.reduce((s, c) => s + c.affinity, 0) / tierContacts.length * 10)
        : 0
      return {
        ...def,
        contacts: tierContacts.map(c => ({ ...c })),
        avgAffinity: avg,
        avgAffinityText: tierContacts.length > 0 ? (avg / 10).toFixed(1) : '--',
      }
    })
})



// ============================================================
// 统计信息
// ============================================================

const overview = computed(() => {
  const totalContacts = contacts.value.length
  const activeProjects = projects.value.filter(p => p.status === 'active').length
  const networkScore = Math.min(100, totalContacts * 5 + activeProjects * 10)
  return { totalContacts, activeProjects, networkScore }
})

// ============================================================
// 联系人表单
// ============================================================

const contactFormVisible = ref(false)
const editingContactId = ref<string | null>(null)
const contactForm = reactive({
  name: '',
  role: '',
  tier: 'core' as Contact['tier'],
  nodeType: 'colleague' as NodeTypeId,
  affinity: 5,
  tags: [] as string[],
  note: '',
})
const contactFormTags = ref('')

function openContactForm(contact?: Contact) {
  if (contact) {
    editingContactId.value = contact.id
    contactForm.name = contact.name
    contactForm.role = contact.role
    contactForm.tier = contact.tier
    contactForm.nodeType = contact.nodeType
    contactForm.affinity = contact.affinity
    contactForm.tags = [...contact.tags]
    contactForm.note = contact.note ?? ''
    contactFormTags.value = contact.tags.join(', ')
  } else {
    editingContactId.value = null
    contactForm.name = ''
    contactForm.role = ''
    contactForm.tier = 'core'
    contactForm.nodeType = 'colleague'
    contactForm.affinity = 5
    contactForm.tags = []
    contactForm.note = ''
    contactFormTags.value = ''
  }
  contactFormVisible.value = true
}

function closeContactForm() {
  contactFormVisible.value = false
  editingContactId.value = null
}

function saveContactForm() {
  const name = contactForm.name.trim()
  if (!name) return

  const tags = contactFormTags.value
    .split(/[,，]/)
    .map(t => t.trim())
    .filter(Boolean)

  if (editingContactId.value) {
    const idx = contacts.value.findIndex(c => c.id === editingContactId.value)
    if (idx !== -1) {
      contacts.value[idx] = {
        ...contacts.value[idx],
        name,
        role: contactForm.role,
        tier: contactForm.tier,
        nodeType: contactForm.nodeType,
        affinity: contactForm.affinity,
        tags,
        note: contactForm.note,
      }
    }
  } else {
    const maxId = contacts.value.reduce((m, c) => Math.max(m, parseInt(c.id.slice(2), 10) || 0), 0)
    const newContact: Contact = {
      id: `c-${String(maxId + 1).padStart(3, '0')}`,
      name,
      role: contactForm.role,
      tier: contactForm.tier,
      nodeType: contactForm.nodeType,
      affinity: contactForm.affinity,
      tags,
      note: contactForm.note || undefined,
    }
    contacts.value.push(newContact)
  }
  closeContactForm()
}

// ============================================================
// 项目表单
// ============================================================

const PROJECT_ICONS = ['🏗', '🧩', '📊', '🎤', '🔀', '🎨', '🚀', '📱', '🖥', '⚙', '📋', '🔬']
const PROJECT_COLORS = ['#8a9a7a', '#7a9a8a', '#8ab87a', '#a0a8b8', '#9a8a7a', '#c4a060', '#7a8a9a', '#b8a07a', '#8aa0b8', '#a08a7a']

const projectFormVisible = ref(false)
const editingProjectId = ref<string | null>(null)
const projectForm = reactive({
  name: '',
  description: '',
  status: 'active' as ProjectStatus,
  partners: '',
  date: '',
})

function openProjectForm(project?: CareerProject) {
  if (project) {
    editingProjectId.value = project.id
    projectForm.name = project.name
    projectForm.description = project.description
    projectForm.status = project.status
    projectForm.partners = project.partners
    projectForm.date = project.date
  } else {
    editingProjectId.value = null
    projectForm.name = ''
    projectForm.description = ''
    projectForm.status = 'active'
    projectForm.partners = ''
    projectForm.date = ''
  }
  projectFormVisible.value = true
}

function closeProjectForm() {
  projectFormVisible.value = false
  editingProjectId.value = null
}

function saveProjectForm() {
  const name = projectForm.name.trim()
  if (!name) return

  if (editingProjectId.value) {
    const idx = projects.value.findIndex(p => p.id === editingProjectId.value)
    if (idx !== -1) {
      projects.value[idx] = {
        ...projects.value[idx],
        name,
        description: projectForm.description,
        status: projectForm.status,
        statusLabel: STATUS_LABEL[projectForm.status],
        partners: projectForm.partners,
        date: projectForm.date,
      }
    }
  } else {
    const maxId = projects.value.reduce((m, p) => Math.max(m, parseInt(p.id.slice(2), 10) || 0), 0)
    const iconIdx = (maxId + 1) % PROJECT_ICONS.length
    const colorIdx = (maxId + 1) % PROJECT_COLORS.length
    const newProject: CareerProject = {
      id: `p-${String(maxId + 1).padStart(3, '0')}`,
      name,
      icon: PROJECT_ICONS[iconIdx],
      description: projectForm.description,
      color: PROJECT_COLORS[colorIdx],
      status: projectForm.status,
      statusLabel: STATUS_LABEL[projectForm.status],
      partners: projectForm.partners,
      date: projectForm.date,
    }
    projects.value.push(newProject)
  }
  closeProjectForm()
}

// ============================================================
// 脉络图 — Canvas 网络图
// ============================================================

// 6 种连接类型
const CONNECTION_TYPES = [
  { type: 'strong', color: '#e8c060', width: 2, label: '强连接' },
  { type: 'medium', color: '#c0a060', width: 1.5, label: '中连接' },
  { type: 'weak', color: '#8a7a6a', width: 1, label: '弱连接' },
  { type: 'collaboration', color: '#6aba7a', width: 1.5, dash: [5, 3], label: '协作' },
  { type: 'referral', color: '#60a0c8', width: 1.5, dash: [3, 3], label: '引荐' },
  { type: 'mentorship', color: '#d080a0', width: 1.5, dash: [8, 4], label: '师徒' },
]

// Canvas 相关
const canvasEl = ref<HTMLCanvasElement | null>(null)
const networkCanvasContainer = ref<HTMLElement | null>(null)
const canvasWidth = ref(640)
const canvasHeight = ref(480)

interface NetworkNode {
  x: number
  y: number
  radius: number
  color: string
  name: string
  role: string
  tier: string
  nodeType: NodeTypeId
  shape: 'circle' | 'diamond' | 'triangle' | 'square' | 'pentagon' | 'hexagon' | 'star'
}

function getTierRadius(tier: string): number {
  switch (tier) {
    case 'core': return 60
    case 'active': return 120
    case 'extended': return 180
    case 'edge': return 240
    default: return 150
  }
}

function getTierNodeSize(tier: string): number {
  switch (tier) {
    case 'core': return 14
    case 'active': return 11
    case 'extended': return 9
    case 'edge': return 7
    default: return 9
  }
}

// ---- 绘制不同形状的节点 ----
function drawShapeNode(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, size: number,
  shape: NetworkNode['shape'], color: string
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.fillStyle = color
  ctx.globalAlpha = 0.45
  ctx.strokeStyle = color
  ctx.lineWidth = 1.5

  switch (shape) {
    case 'diamond': {
      ctx.beginPath()
      ctx.moveTo(0, -size)
      ctx.lineTo(size, 0)
      ctx.lineTo(0, size)
      ctx.lineTo(-size, 0)
      ctx.closePath()
      break
    }
    case 'triangle': {
      ctx.beginPath()
      ctx.moveTo(0, -size)
      ctx.lineTo(size * 0.87, size * 0.5)
      ctx.lineTo(-size * 0.87, size * 0.5)
      ctx.closePath()
      break
    }
    case 'square': {
      ctx.beginPath()
      ctx.rect(-size * 0.7, -size * 0.7, size * 1.4, size * 1.4)
      break
    }
    case 'pentagon': {
      ctx.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2
        const px = Math.cos(angle) * size
        const py = Math.sin(angle) * size
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
      break
    }
    case 'hexagon': {
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (i * 2 * Math.PI) / 6 - Math.PI / 6
        const px = Math.cos(angle) * size
        const py = Math.sin(angle) * size
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
      break
    }
    case 'star': {
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2
        const r = i % 2 === 0 ? size : size * 0.45
        const px = Math.cos(angle) * r
        const py = Math.sin(angle) * r
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()
      break
    }
    default: { // circle
      ctx.beginPath()
      ctx.arc(0, 0, size * 0.7, 0, Math.PI * 2)
      break
    }
  }

  ctx.fill()
  ctx.globalAlpha = 1
  ctx.stroke()
  ctx.restore()
}

function drawNetwork() {
  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value)

  // 计算节点位置（环形布局）
  const nodes: NetworkNode[] = contacts.value.map((c, i) => {
    const angle = (i / Math.max(contacts.value.length, 1)) * Math.PI * 2 - Math.PI / 2
    const radius = getTierRadius(c.tier)
    const nodeTypeDef = NODE_TYPE_DEFS.find(t => t.id === c.nodeType) || NODE_TYPE_DEFS[1]
    return {
      x: canvasWidth.value / 2 + Math.cos(angle) * radius,
      y: canvasHeight.value / 2 + Math.sin(angle) * radius,
      radius: getTierNodeSize(c.tier),
      color: nodeTypeDef.color,
      name: c.name,
      role: c.role,
      tier: c.tier,
      nodeType: c.nodeType,
      shape: nodeTypeDef.shape,
    }
  })

  // 绘制显式连接线
  for (const conn of connections.value) {
    const fromNode = nodes.find((_, i) => contacts.value[i]?.id === conn.fromId)
    const toNode = nodes.find((_, i) => contacts.value[i]?.id === conn.toId)
    if (!fromNode || !toNode) continue
    const connDef = CONNECTION_TYPES.find(c => c.type === conn.type) || CONNECTION_TYPES[0]
    ctx.beginPath()
    ctx.moveTo(fromNode.x, fromNode.y)
    ctx.lineTo(toNode.x, toNode.y)
    ctx.strokeStyle = connDef.color
    ctx.lineWidth = connDef.width
    ctx.globalAlpha = 0.18
    if (connDef.dash) ctx.setLineDash(connDef.dash)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.globalAlpha = 1
  }

  // 绘制节点（使用不同形状）
  for (const node of nodes) {
    drawShapeNode(ctx, node.x, node.y, node.radius, node.shape, node.color)

    // 节点名称
    ctx.fillStyle = 'rgba(232, 224, 216, 0.5)'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(node.name, node.x, node.y + node.radius + 14)
  }
}

// 探照光 - 鼠标悬停
function handleCanvasHover(e: MouseEvent) {
  const rect = canvasEl.value?.getBoundingClientRect()
  if (!rect) return
  const mx = e.clientX - rect.left
  const my = e.clientY - rect.top
  const canvas = canvasEl.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  // 重绘
  drawNetwork()
  // 添加探照光效果
  ctx.beginPath()
  ctx.arc(mx, my, 50, 0, Math.PI * 2)
  const gradient = ctx.createRadialGradient(mx, my, 0, mx, my, 50)
  gradient.addColorStop(0, 'rgba(232, 224, 216, 0.06)')
  gradient.addColorStop(1, 'rgba(232, 224, 216, 0)')
  ctx.fillStyle = gradient
  ctx.fill()
}

function handleCanvasLeave() {
  drawNetwork()
}

onMounted(() => {
  nextTick(() => drawNetwork())
  skillMap.loadSkills()
  careerMilestones.loadMilestones()
})

watch(contacts, () => {
  nextTick(() => drawNetwork())
}, { deep: true })

watch(connections, () => {
  nextTick(() => drawNetwork())
}, { deep: true })

// ============================================================
// 模块 composable 集成：技能图谱 + 职业里程碑
// ============================================================

const careerMilestones = useCareerMilestones()
const skillMap = useSkillMap()
const skillList = computed(() => skillMap.skills.value)
const milestoneAll = computed(() => careerMilestones.milestones.value)
const milestoneList = computed(() => {
  const ms = careerMilestones.milestones.value
  return ms.slice(0, 6).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const skillSummary = computed(() => {
  const skills = skillMap.skills.value
  if (!skills.length) return null
  const total = skills.length
  const avgScore = Math.round(skills.reduce((s, sk) => s + sk.proficiencyScore, 0) / total)
  const coreCount = skills.filter(sk => sk.isCore).length
  return { total, avgScore, coreCount }
})
</script>

<style scoped>
/* =============================================================
   Career Path — 业脉
   Theme Color: #8a9a7a | Sage green
   ============================================================= */

/* ---- CSS Variables ---- */
.career {
  --career-accent: #8a9a7a;
  --career-accent-rgb: 138, 154, 122;
  --career-bg: #080a09;
  --career-surface: rgba(32, 38, 30, 0.4);
  --career-surface-hover: rgba(42, 50, 38, 0.5);
  --career-border: rgba(138, 154, 122, 0.08);
  --career-border-hover: rgba(138, 154, 122, 0.2);
}

/* ---- Root ---- */
.career {
  position: relative;
  max-width: 860px;
  margin: 0 auto;
  padding: 48px 32px 100px;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 40px;
  background: transparent;
  overflow: hidden;
}

/* ---- Ambient Background ---- */
.career-ambient {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.career-glow {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
}

.career-glow--top {
  top: -15%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 400px;
  background: radial-gradient(ellipse, rgba(138, 154, 122, 0.07) 0%, transparent 70%);
}

.career-glow--bottom {
  bottom: -10%;
  right: -10%;
  width: 350px;
  height: 350px;
  background: radial-gradient(circle, rgba(138, 154, 122, 0.04) 0%, transparent 65%);
}

/* Network SVG */
.career-network {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 500px;
  height: 100%;
  color: var(--career-accent);
  opacity: 0.5;
}

.career-network svg {
  width: 100%;
  height: 100%;
}

/* Floating nodes */
.career-node {
  position: absolute;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--career-accent);
  opacity: 0;
  animation: node-pulse 8s ease-in-out infinite;
}

.career-node-1 { top: 15%; left: 25%; animation-delay: 0s; }
.career-node-2 { top: 45%; right: 20%; animation-delay: 3s; }
.career-node-3 { top: 70%; left: 30%; animation-delay: 6s; }

@keyframes node-pulse {
  0%, 100% { opacity: 0; transform: scale(0.5); }
  25% { opacity: 0.08; }
  50% { opacity: 0.15; transform: scale(1.5); }
  75% { opacity: 0.06; }
}

/* ---- Atmosphere glow ---- */
.career-atmos {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}

.atmos-warm-glow {
  position: absolute;
  top: -10%;
  left: 10%;
  width: 80%;
  height: 50%;
  background: radial-gradient(
    ellipse at 30% 40%,
    rgba(138, 154, 122, 0.06) 0%,
    transparent 60%
  );
  animation: career-breathe 7s ease-in-out infinite;
}

.atmos-work-light {
  position: absolute;
  bottom: -10%;
  right: 10%;
  width: 50%;
  height: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(138, 154, 122, 0.03) 0%,
    transparent 60%
  );
  animation: career-breathe 9s ease-in-out infinite 2s;
}

@keyframes career-breathe {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* ---- Header ---- */
.career-room-header {
  text-align: center;
  position: relative;
  z-index: 1;
}
.career-room-header :deep(.rh-main) {
  flex-direction: column;
  align-items: center;
  gap: 0;
}
.career-room-header :deep(.rh-titles) {
  align-items: center;
  gap: 0;
}

/* Breadcrumb */
.breadcrumb-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 12px;
}

.breadcrumb-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: var(--text-muted, var(--text-muted));
  text-decoration: none;
  background: none;
  border: none;
  padding: 4px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-family: inherit;
  font-size: 12px;
  transition: all 0.25s ease;
}

.breadcrumb-link:hover {
  color: var(--text-primary, #e8e0d8);
  background: rgba(138, 154, 122, 0.08);
}

.breadcrumb-link.current {
  color: var(--career-accent, #8a9a7a);
  cursor: default;
  pointer-events: none;
}

.breadcrumb-home-icon,
.breadcrumb-icon {
  font-size: 14px;
  line-height: 1;
}

.breadcrumb-sep {
  color: var(--text-muted, var(--text-faint));
  font-size: 14px;
}

.career-header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 12px 0;
}

.orn-line {
  display: block;
  width: 60px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(138, 154, 122, 0.25),
    transparent
  );
}

.orn-diamond {
  font-size: 9px;
  color: var(--career-accent, #8a9a7a);
  opacity: 0.4;
}

.career-room-header :deep(.rh-title) {
  font-size: 28px;
  font-weight: 600;
  font-family: var(--font-heading-zh);
  letter-spacing: 3px;
  color: var(--text-primary, #e8e0d8);
  margin: 0;
}

.career-room-header :deep(.rh-subtitle) {
  font-size: 14px;
  color: var(--text-secondary, var(--text-secondary));
  margin: 8px 0 4px;
  letter-spacing: 1px;
}

.career-kicker {
  font-size: 11px;
  color: var(--text-muted, var(--text-muted));
  margin: 0;
  letter-spacing: 0.5px;
}

/* ---- Section ---- */
.career-section {
  position: relative;
  z-index: 1;
}

/* ---- Section label row ---- */
.section-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.section-label-row .section-label {
  margin-bottom: 0;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-secondary, var(--text-secondary));
  margin: 0 0 16px;
  letter-spacing: 0.5px;
}

.section-label-icon {
  font-size: 16px;
  line-height: 1;
  opacity: 0.7;
}

/* ---- Add button ---- */
.career-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--career-border);
  background: var(--career-surface);
  color: var(--career-accent);
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
  padding: 0;
}

.career-add-btn:hover {
  background: var(--career-surface-hover);
  border-color: var(--career-border-hover);
  color: var(--text-primary);
  transform: scale(1.1);
}

/* ---- Search bar ---- */
.career-search-bar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 16px;
}

.career-search-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--career-border);
  background: var(--career-surface);
  color: var(--text-primary, #e8e0d8);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: all 0.25s ease;
  box-sizing: border-box;
}

.career-search-input::placeholder {
  color: var(--text-muted, var(--text-faint));
}

.career-search-input:focus {
  border-color: var(--career-border-hover);
  background: var(--career-surface-hover);
}

.career-tier-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tier-filter-btn {
  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid var(--career-border);
  background: var(--career-surface);
  color: var(--text-muted, var(--text-dim));
  font-size: 11px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
  letter-spacing: 0.3px;
}

.tier-filter-btn:hover {
  color: var(--text-secondary, var(--text-secondary));
  border-color: var(--career-border-hover);
}

.tier-filter-btn.active {
  color: var(--tier-filter-color, var(--career-accent));
  border-color: var(--tier-filter-color, var(--career-accent));
  background: rgba(138, 154, 122, 0.1);
}

/* ---- Overview Stats ---- */
.career-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.career-overview-stat {
  min-height: 90px;
  padding: 18px;
  border-radius: 16px;
  background: var(--career-surface);
  border: 1px solid var(--career-border);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.25s ease;
}

.career-overview-stat:hover {
  background: var(--career-surface-hover);
  border-color: var(--career-border-hover);
}

.cos-value {
  font-size: 28px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  line-height: 1;
}

.cos-unit {
  font-size: 16px;
  font-weight: 400;
  color: var(--text-muted, var(--text-muted));
}

.cos-label {
  font-size: 12px;
  color: var(--text-muted, var(--text-muted));
  letter-spacing: 0.5px;
}

/* ---- Network Canvas ---- */
.career-network-canvas {
  position: relative;
  width: 100%;
  max-width: 640px;
  margin: 0 auto;
  border-radius: 16px;
  overflow: hidden;
  background: rgba(8, 10, 9, 0.3);
  border: 1px solid var(--career-border);
  transition: border-color 0.25s ease;
}

.career-network-canvas:hover {
  border-color: var(--career-border-hover);
}

.career-network-canvas canvas {
  display: block;
  width: 100%;
  height: auto;
}

/* ---- Legend ---- */
.career-legend {
  display: flex;
  gap: 24px;
  margin-top: 16px;
  padding: 16px;
  border-radius: 12px;
  background: var(--career-surface);
  border: 1px solid var(--career-border);
  flex-wrap: wrap;
}

.career-legend-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
  min-width: 180px;
}

.career-legend-title {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary, var(--text-secondary));
  letter-spacing: 0.5px;
}

.career-legend-items {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.career-legend-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--text-muted, var(--text-muted));
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(138, 154, 122, 0.05);
  border: 1px solid rgba(138, 154, 122, 0.06);
  line-height: 1.4;
}

.career-legend-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.career-legend-line {
  height: 2px;
  border-radius: 1px;
  flex-shrink: 0;
}

/* ---- Contact Tiers ---- */
.career-tiers {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.tier-card {
  padding: 20px 16px;
  border-radius: 16px;
  background: var(--career-surface);
  border: 1px solid var(--career-border);
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}

.tier-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--tier-color, var(--career-accent)), transparent);
  opacity: 0.3;
  transition: opacity 0.25s ease;
}

.tier-card:hover {
  background: var(--career-surface-hover);
  border-color: var(--career-border-hover);
  transform: translateY(-2px);
}

.tier-card:hover::before {
  opacity: 0.6;
}

.tier-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.tier-icon {
  font-size: 20px;
  line-height: 1;
  flex-shrink: 0;
}

.tier-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  letter-spacing: 0.5px;
  flex: 1;
}

.tier-count {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted, var(--text-muted));
  font-variant-numeric: tabular-nums;
}

.tier-desc {
  font-size: 11px;
  color: var(--text-muted, var(--text-muted));
  line-height: 1.5;
}

.tier-contacts {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.tier-contact-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 11px;
  color: var(--text-secondary, var(--text-secondary));
  background: rgba(138, 154, 122, 0.08);
  border: 1px solid rgba(138, 154, 122, 0.1);
  line-height: 1.4;
  transition: all 0.25s ease;
  cursor: pointer;
}

.tier-contact-tag:hover {
  color: var(--text-primary, #e8e0d8);
  background: rgba(138, 154, 122, 0.15);
  border-color: rgba(138, 154, 122, 0.2);
}

.tier-contact-name {
  flex-shrink: 0;
}

.tier-contact-affinity {
  display: inline-block;
  width: 28px;
  height: 3px;
  border-radius: 2px;
  background: rgba(138, 154, 122, 0.15);
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.tier-contact-affinity::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: var(--affinity-pct);
  background: var(--career-accent);
  border-radius: 2px;
}

.tier-empty {
  font-size: 11px;
  color: var(--text-muted, var(--text-muted));
  font-style: italic;
  opacity: 0.6;
}

.tier-affinity-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  padding-top: 10px;
  border-top: 1px solid var(--career-border);
}

.tier-affinity-label {
  font-size: 10px;
  color: var(--text-muted, var(--text-faint));
  letter-spacing: 0.3px;
}

.tier-affinity-val {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, var(--text-secondary));
  font-variant-numeric: tabular-nums;
}

/* ---- Projects Grid ---- */
.career-projects {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.project-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  border-radius: 16px;
  background: var(--career-surface);
  border: 1px solid var(--career-border);
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
  cursor: pointer;
}

.project-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(
    ellipse at 20% 30%,
    rgba(var(--career-accent-rgb), 0.03) 0%,
    transparent 60%
  );
  pointer-events: none;
}

.project-card:hover {
  background: var(--career-surface-hover);
  border-color: var(--career-border-hover);
  transform: translateY(-3px);
}

.project-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.project-icon {
  font-size: 24px;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.25s ease;
}

.project-card:hover .project-icon {
  opacity: 1;
}

.project-status {
  font-size: 10px;
  padding: 3px 10px;
  border-radius: 999px;
  letter-spacing: 0.5px;
  font-weight: 500;
  flex-shrink: 0;
}

.project-status.active {
  background: rgba(138, 184, 122, 0.15);
  color: #8ab87a;
}

.project-status.completed {
  background: rgba(106, 186, 122, 0.12);
  color: var(--success-light);
}

.project-status.paused {
  background: rgba(138, 154, 168, 0.12);
  color: #8a9aa8;
}

.project-status.planning {
  background: rgba(232, 192, 96, 0.12);
  color: #e8c060;
}

.project-name {
  font-size: 15px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  margin: 0;
  letter-spacing: 0.3px;
}

.project-desc {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-secondary, var(--text-secondary));
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: var(--text-muted, var(--text-muted));
}

.project-partners {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(138, 154, 122, 0.06);
  border: 1px solid rgba(138, 154, 122, 0.08);
}

/* ---- Colophon ---- */
.career-colophon {
  text-align: center;
  position: relative;
  z-index: 1;
  margin-top: 8px;
}

/* ---- Career Milestone Timeline ---- */
.career-timeline-simple {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.career-milestone-item {
  display: flex;
  gap: 14px;
  padding: 14px 0;
  position: relative;
}

.career-milestone-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 32px;
  bottom: -2px;
  width: 1px;
  background: rgba(138, 154, 122, 0.1);
}

.career-milestone-dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-top: 4px;
  box-shadow: 0 0 6px rgba(138, 154, 122, 0.15);
}

.career-milestone-body {
  flex: 1;
  min-width: 0;
}

.career-milestone-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.career-milestone-icon {
  font-size: 14px;
  flex-shrink: 0;
}

.career-milestone-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
}

.career-milestone-date {
  font-size: 11px;
  color: var(--text-muted, var(--text-muted));
  margin-left: auto;
}

.career-milestone-desc {
  font-size: 12px;
  color: var(--text-secondary, var(--text-secondary));
  margin: 4px 0 0;
  line-height: 1.5;
}

.colophon-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 12px 0;
}

.colophon-text {
  font-size: 12px;
  color: var(--text-muted, var(--text-faint));
  letter-spacing: 2px;
  font-style: italic;
  margin: 0;
}

/* ============================================================
   Modal Overlay
   ============================================================ */

.career-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  animation: modal-fade-in 0.2s ease;
}

@keyframes modal-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.career-modal {
  width: 90%;
  max-width: 480px;
  max-height: 85vh;
  overflow-y: auto;
  background: #0e110e;
  border: 1px solid rgba(138, 154, 122, 0.15);
  border-radius: 20px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
  animation: modal-slide-up 0.25s ease;
}

@keyframes modal-slide-up {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.career-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px 0;
}

.career-modal-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary, #e8e0d8);
  margin: 0;
  letter-spacing: 0.5px;
}

.career-modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--career-border);
  background: var(--career-surface);
  color: var(--text-muted, var(--text-muted));
  font-size: 13px;
  cursor: pointer;
  transition: all 0.25s ease;
  font-family: inherit;
  padding: 0;
  line-height: 1;
}

.career-modal-close:hover {
  color: var(--text-primary, #e8e0d8);
  background: var(--career-surface-hover);
  border-color: var(--career-border-hover);
}

.career-modal-body {
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.career-modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 0 24px 20px;
}

/* ---- Form Elements ---- */
.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, var(--text-secondary));
  letter-spacing: 0.3px;
}

.form-label-hint {
  font-weight: 400;
  color: var(--text-muted, var(--text-muted));
  font-size: 11px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--career-border);
  background: rgba(8, 10, 9, 0.6);
  color: var(--text-primary, #e8e0d8);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: all 0.25s ease;
  box-sizing: border-box;
}

.form-input::placeholder {
  color: var(--text-muted, var(--text-faint));
}

.form-input:focus {
  border-color: rgba(138, 154, 122, 0.3);
  background: rgba(12, 16, 12, 0.6);
}

.form-textarea {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--career-border);
  background: rgba(8, 10, 9, 0.6);
  color: var(--text-primary, #e8e0d8);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: all 0.25s ease;
  resize: vertical;
  box-sizing: border-box;
  min-height: 60px;
}

.form-textarea::placeholder {
  color: var(--text-muted, var(--text-faint));
}

.form-textarea:focus {
  border-color: rgba(138, 154, 122, 0.3);
  background: rgba(12, 16, 12, 0.6);
}

/* ---- Slider ---- */
.form-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(138, 154, 122, 0.15);
  outline: none;
  cursor: pointer;
}

.form-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--career-accent);
  border: 2px solid rgba(8, 10, 9, 0.8);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.form-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.form-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--career-accent);
  border: 2px solid rgba(8, 10, 9, 0.8);
  cursor: pointer;
}

.form-slider-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--text-muted, var(--text-faint));
  margin-top: 2px;
}

/* ---- Tier Select (inline buttons) ---- */
.form-tier-select {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.form-tier-option {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid var(--career-border);
  background: rgba(8, 10, 9, 0.6);
  color: var(--text-muted, var(--text-dim));
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
}

.form-tier-option:hover {
  color: var(--text-secondary, var(--text-secondary));
  border-color: var(--career-border-hover);
}

.form-tier-option.selected {
  color: var(--tier-opt-color, var(--career-accent));
  border-color: var(--tier-opt-color, var(--career-accent));
  background: rgba(138, 154, 122, 0.1);
}

/* ---- Status Select (inline buttons) ---- */
.form-status-select {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.form-status-option {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--career-border);
  background: rgba(8, 10, 9, 0.6);
  color: var(--text-muted, var(--text-dim));
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
}

.form-status-option:hover {
  color: var(--text-secondary, var(--text-secondary));
  border-color: var(--career-border-hover);
}

.form-status-option.selected {
  color: var(--career-accent);
  border-color: var(--career-accent);
  background: rgba(138, 154, 122, 0.1);
}

/* ---- Form Buttons ---- */
.form-btn {
  padding: 9px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
  border: 1px solid var(--career-border);
  letter-spacing: 0.3px;
}

.form-btn-secondary {
  background: var(--career-surface);
  color: var(--text-muted, var(--text-dim));
}

.form-btn-secondary:hover {
  color: var(--text-secondary, var(--text-secondary));
  background: var(--career-surface-hover);
  border-color: var(--career-border-hover);
}

.form-btn-primary {
  background: rgba(138, 154, 122, 0.15);
  color: var(--career-accent);
  border-color: rgba(138, 154, 122, 0.2);
}

.form-btn-primary:hover:not(:disabled) {
  background: rgba(138, 154, 122, 0.25);
  border-color: rgba(138, 154, 122, 0.3);
}

.form-btn-primary:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* =============================================================
   Responsive — Tablet ( <= 860px )
   ============================================================= */
@media (max-width: 860px) {
  .career {
    padding: 28px 20px 100px;
    gap: 32px;
  }

  .career-tiers {
    gap: 10px;
  }

  .tier-card {
    padding: 16px;
  }

  .career-projects {
    gap: 10px;
  }

  .project-card {
    padding: 16px;
  }

  .career-room-header :deep(.rh-title) {
    font-size: 24px;
  }

  .career-header-ornament {
    gap: 8px;
  }

  .orn-line {
    width: 40px;
  }

  .career-modal {
    max-width: 420px;
  }
}

/* =============================================================
   Responsive — Mobile ( <= 640px )
   ============================================================= */
@media (max-width: 640px) {
  .career {
    padding: 20px 14px 90px;
    gap: 24px;
  }

  .career-room-header {
    padding-top: 40px;
  }

  .career-room-header :deep(.rh-title) {
    font-size: 20px;
    letter-spacing: 2px;
  }

  .career-room-header :deep(.rh-subtitle) {
    font-size: 12px;
  }

  .career-kicker {
    font-size: 10px;
  }

  .career-header-ornament {
    gap: 6px;
  }

  .orn-line {
    width: 28px;
  }

  .orn-diamond {
    font-size: 7px;
  }

  .breadcrumb-row {
    font-size: 11px;
  }

  .breadcrumb-link {
    font-size: 11px;
    padding: 3px 6px;
  }

  /* Tiers: single column */
  .career-tiers {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .tier-card {
    padding: 14px;
    border-radius: 12px;
  }

  .tier-card:hover {
    transform: none;
  }

  .tier-icon {
    font-size: 18px;
  }

  .tier-name {
    font-size: 13px;
  }

  /* Projects: single column */
  .career-projects {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .project-card {
    padding: 14px;
    border-radius: 12px;
  }

  .project-card:hover {
    transform: none;
  }

  .project-icon {
    font-size: 20px;
  }

  .project-name {
    font-size: 14px;
  }

  .project-desc {
    font-size: 11px;
  }

  .project-meta {
    font-size: 10px;
  }

  /* Overview compact */
  .career-overview {
    gap: 8px;
  }

  .career-overview-stat {
    min-height: 64px;
    padding: 10px 12px;
    border-radius: 12px;
    gap: 4px;
  }

  .cos-value {
    font-size: 18px;
  }

  .cos-unit {
    font-size: 13px;
  }

  .cos-label {
    font-size: 10px;
  }

  /* Colophon */
  .career-colophon {
    margin-top: 4px;
  }

  .colophon-text {
    font-size: 11px;
  }

  /* Modal full width on mobile */
  .career-modal {
    width: 95%;
    max-width: 100%;
    border-radius: 16px;
  }

  .career-modal-header {
    padding: 16px 18px 0;
  }

  .career-modal-body {
    padding: 16px 18px;
    gap: 14px;
  }

  .career-modal-footer {
    padding: 0 18px 16px;
  }

  /* Search bar */
  .career-search-input {
    font-size: 12px;
    padding: 8px 12px;
  }

  .tier-filter-btn {
    font-size: 10px;
    padding: 4px 10px;
  }
}
</style>