<template>
  <div :class="entranceClass" ref="entranceRef" class="view-entrance ah">
    <!-- Header ornament pattern -->
    <div data-enter class="ah-header">
      <div class="header-ornament">
        <span class="orn-line"></span>
        <span class="orn-diamond">✦</span>
        <span class="orn-line"></span>
      </div>
      <p class="header-kicker">你的专属幕僚团</p>
      <h1 class="ah-title">幕僚阁</h1>
    </div>

    <!-- Overview cards -->
    <div data-enter class="ah-overview">
      <div class="ah-overview-card">
        <span class="ah-overview-value">{{ advisors.length }}</span>
        <span class="ah-overview-label">幕僚总数</span>
      </div>
      <div class="ah-overview-card">
        <span class="ah-overview-value">{{ advisors.filter(a => a.state !== 'slumber').length }}</span>
        <span class="ah-overview-label">在位幕僚</span>
      </div>
      <div class="ah-overview-card">
        <span class="ah-overview-value">{{ advisors.filter(a => !isPreset(a.id)).length }}</span>
        <span class="ah-overview-label">自建幕僚</span>
      </div>
    </div>

    <!-- 调令（幕僚管家闭环：下达 → 派单 → 任务中 → 完成光点） -->
    <section data-enter class="ah-command-section">
      <h3 class="ah-scheduler-heading">⚡ 调令</h3>
      <p class="ah-aura-desc">对镜我下达一句话调令，她会解析意图、派给合适的幕僚，并真正帮你办事——开启专注、写下笔记、跳到锚点庭院或情绪花房，完成后浮现极淡的完成光点。</p>
      <div class="ah-command-bar">
        <input
          v-model="commandText"
          class="ah-command-input"
          placeholder="例如：帮我查一下最近三个月的工作记录，看看加班最密集的是哪段"
          @keyup.enter="sendCommand"
        />
        <button class="ah-command-send" :disabled="!commandText.trim()" @click="sendCommand">下达</button>
      </div>
      <!-- 执行策略判定（dispatch·detectStrategy 独有维度，INCR-360：实时预览单幕僚/并行/串行决策） -->
      <div class="ah-cmd-strategy" v-if="commandText.trim()">
        <span class="ah-cmd-strategy-label">⚙ 执行策略判定</span>
        <span class="ah-cmd-strategy-chip" :class="'st-' + strategyPreview">{{ strategyName(strategyPreview) }}</span>
        <span class="ah-cmd-strategy-reason">{{ strategyReason }}</span>
      </div>
      <div class="ah-command-list" v-if="commandTasksReversed.length">
        <div
          v-for="t in commandTasksReversed"
          :key="t.id"
          class="ah-command-item"
          :class="{ done: t.status === 'done' }"
        >
          <span class="ah-cmd-dot" :class="{ light: t.doneLight }"></span>
          <div class="ah-cmd-body">
            <div class="ah-cmd-head">
              <span class="ah-cmd-intent">{{ t.intentLabel }}</span>
              <span class="ah-cmd-advisor" v-if="t.advisorName">· {{ t.advisorName }}</span>
              <span class="ah-cmd-status" v-if="t.status === 'running'">任务中…</span>
            </div>
            <p class="ah-cmd-progress">{{ t.progressDesc }}</p>
            <p class="ah-cmd-summary" v-if="t.status === 'done' && t.resultSummary">{{ t.resultSummary }}</p>
          </div>
        </div>
      </div>
      <EmptyState
        v-else
        icon="📜"
        title="还没有调令。"
        hint="试着下达第一条，让管家动起来。"
        :glow="false"
        cta-label=""
      />
    </section>

    <!-- 跨域任务拆解（INCR-372 补挂载孤儿引擎 advisor/task-decompose：跨域调令识别→分头收集真实统计→汇总） -->
    <section data-enter class="ah-command-section">
      <CommandDecomposePanel />
    </section>

    <!-- 手动幕僚调度（INCR-393 补挂载孤儿组件 DispatchPanel：useDispatch 引擎应用内唯一、零 props 自足；下达手动调令→单一/并行/串行判策略→逐步产出录入，与自动调令/任务拆解互补） -->
    <section data-enter class="ah-command-section">
      <DispatchPanel />
    </section>

    <!-- 功能直达（INCR-312 补挂载孤儿组件 FeatureSearchPanel：关键词搜索/直达跳转/推荐快捷入口，featureDictionary 引擎应用内唯一） -->
    <section data-enter class="ah-scheduler-section">
      <h3 class="ah-scheduler-heading">🧭 功能直达</h3>
      <FeatureSearchPanel />
    </section>

    <!-- 幕僚卡片 -->
    <div data-enter class="ah-advisor-grid" v-if="advisors.length">
      <div v-for="a in advisors" :key="a.id" class="ah-advisor-card" :class="{ dormant: a.state === 'slumber' }" role="button" tabindex="0" :aria-label="'编辑幕僚 ' + a.name" @click="editAdvisor(a)" @keydown.enter.prevent="editAdvisor(a)" @keydown.space.prevent="editAdvisor(a)">
        <div class="a-avatar" :style="{ background: (a.customColorScheme?.primary ?? '#a08a7a') + '22', borderColor: (a.customColorScheme?.primary ?? '#a08a7a') + '44' }">
          <img v-if="carrierIsImage(a.carrier, advisorCarrierStageOf(a))" :src="a.carrier?.imageData" class="a-avatar-img" :alt="a.name" />
          <span v-else class="a-icon">{{ glyphOf(a) }}</span>
          <div class="a-status" :class="a.state === 'slumber' ? 'dormant' : 'active'" />
        </div>
        <div class="a-info">
          <span class="a-name">{{ a.name }}</span>
          <span class="a-role">{{ roleLabel(a.role) }}<template v-if="isPreset(a.id)"> · 固定</template><template v-else-if="a.derivedFrom"> · 派生</template></span>
          <span class="a-personality">{{ personalityLabel(a.personality) }}<template v-if="a.derivedFrom"> · 源自{{ presetName(a.derivedFrom) }}</template></span>
        </div>
        <!-- 好感度等级标签（直接取自真实档案层，统一后不再恒为 --） -->
        <div class="a-affinity-tier" :style="affinityTierStyle(a.id)">
          {{ affinityTierLabel(a.id) }}
        </div>
        <div class="a-actions">
          <button v-if="isPreset(a.id)" @click.stop="deriveFromPreset(a)" title="基于该预设派生自定义幕僚">⧉ 派生</button>
          <button @click.stop="toggleDormant(a.id)" :title="a.state === 'slumber' ? '唤醒' : '沉睡'">{{ a.state === 'slumber' ? '🌱' : '💤' }}</button>
          <button v-if="!isPreset(a.id)" @click.stop="removeAdvisor(a.id)">×</button>
        </div>
      </div>
    </div>

    <!-- 操作按钮组 -->
    <div data-enter class="ah-action-row">
      <button class="ah-btn-new" @click="openCreate" :disabled="userAdvisors.length >= maxAdvisors">+ 创建幕僚</button>
      <button class="ah-btn-affinity" @click="$router.push('/advisor-affinity')" :disabled="!advisors.length">❤ 好感</button>
    </div>

    <!-- 镜我对白会话（归档） -->
    <section data-enter class="ah-dialogue-sessions">
      <DialogueSessionList />
    </section>

    <!-- 幕僚调度 -->
    <section data-enter class="ah-scheduler-section">
      <h3 class="ah-scheduler-heading">⚙ 幕僚调度</h3>
      <AdvisorScheduler />
    </section>

    <!-- 协调权（INCR-295 补挂载孤儿组件 CoordinatorSettingsPanel：协调者转移/关闭集中协调，引擎 modules/advisor/coordinator 应用库内唯一，零 props 自持读桥） -->
    <section data-enter class="ah-scheduler-section">
      <h3 class="ah-scheduler-heading">🧭 协调权</h3>
      <CoordinatorSettingsPanel />
    </section>

    <!-- 氛围主题（原右下角常驻浮层：迁至此处与设置页两入口） -->
    <section data-enter class="ah-aura-section">
      <h3 class="ah-scheduler-heading">🌌 氛围主题</h3>
      <p class="ah-aura-desc">星图 / 呼吸球 / 流体壁纸等多元氛围，本地保存，随你的陪伴幕僚一同呼吸。</p>
      <AuraThemePicker />
    </section>

    <!-- 笔记（原独立浮动 FAB / 笔记板已并入此处，消除接线孤儿；
            INCR-363：SearchInput 真接入笔记搜索，NoteSticky/FabButton 以浮层便签与统一新建按钮复活） -->
      <section data-enter class="ah-notes-section">
        <h3 class="ah-scheduler-heading">📝 笔记</h3>
        <p class="ah-aura-desc">思绪沉淀都在这里。新建即可记录，或贴为浮窗便签。</p>
        <div class="ah-notes-bar">
          <SearchInput v-model="noteQuery" placeholder="搜索笔记标题或内容…" :debounce="150" />
          <button class="ah-btn-affinity ah-notes-new" @click="noteEditor.openCreate()">+ 新建笔记</button>
          <button
            class="ah-btn-affinity ah-sticky-toggle"
            :class="{ active: stickyLayer }"
            @click="stickyLayer = !stickyLayer"
            :title="stickyLayer ? '隐藏浮层便签' : '显示浮层便签'"
            :aria-pressed="stickyLayer"
          >🧲 浮层 ({{ stickyCount }})</button>
        </div>
      <div class="ah-notes-list" v-if="noteList.length">
        <div
          v-for="n in noteList"
          :key="n.id"
          class="ah-note-item"
          :class="{ sticky: isNoteSticky(n.id) }"
        >
          <div class="ah-note-head">
            <span class="ah-note-dot" :style="{ background: '#' + noteColor(n.id) }"></span>
            <span class="ah-note-title">{{ n.title || '无标题' }}</span>
          </div>
          <p class="ah-note-preview">{{ n.content || '（空）' }}</p>
          <div class="ah-note-meta">
            <span class="ah-note-time">{{ noteFmt(n.updatedAt) }}</span>
          </div>
          <div class="ah-note-actions">
            <button @click="noteEditor.openEdit(asSticky(n))" title="编辑">✏️</button>
            <button @click="noteToggleSticky(n.id)" :title="isNoteSticky(n.id) ? '收入面板' : '贴为便签'">📌</button>
            <button class="ah-note-del" @click="noteDelete(n.id)" title="删除">🗑️</button>
          </div>
        </div>
      </div>
      <EmptyState
        v-else
        icon="📝"
        title="还没有笔记。"
        hint="点「+ 新建笔记」记录第一条。"
        :glow="false"
        cta-label=""
      />
      </section>

      <!-- 浮层便签（NoteSticky 真接入：📌 标记的便签以浮动便签显示，可拖动/置顶/编辑/关闭，事件回写 note 引擎） -->
      <Teleport to="body">
        <div v-if="stickyLayer && stickyCount" class="ah-sticky-layer" aria-label="浮层便签">
          <NoteSticky
            v-for="s in floatingStickyNotes"
            :key="s.id"
            :note="s"
            :visible="true"
            @update:position="onStickyPosition"
            @update:mode="onStickyMode"
            @edit="onStickyEdit"
            @delete="noteDelete"
            @pin="onStickyPin"
          />
        </div>
      </Teleport>

      <!-- 统一新建便签（FabButton 真接入：右下角浮动「新建」，开启笔记编辑器） -->
      <Teleport to="body">
        <FabButton v-if="stickyLayer" label="新建便签" icon="＋" position="bl" @click="noteEditor.openCreate()" />
      </Teleport>

    <!-- 幕僚总览（INCR-383 补挂载孤儿桥接面板 AdvisorOverviewPanel：useAdvisorBridge 聚合关系网络分级分布/场景统计/仪式摘要/见证日志摘要四面, Advisor 各视图原走 resonance store+专项面板, 桥层计算面零呈现, 真缺口） -->
    <section data-enter class="ah-section">
      <AdvisorOverviewPanel />
    </section>

    <!-- 幕僚互动（INCR-246 补挂载孤儿组件 AdvisorInteractionPanel：幕僚↔幕僚关系/协作/互学/共处，引擎 useAdvisorInteraction 唯一、advisors props 薄委托注入） -->
    <section data-enter class="ah-section">
      <AdvisorInteractionPanel :advisors="advisors" />
    </section>

    <!-- 见证收件箱（INCR-279 补挂载孤儿组件 AdvisorWitnessPanel：记录见证/事件统计/未读已读/幕僚反应，引擎 useAdvisorWitness 唯一、advisors props 薄委托注入） -->
    <section data-enter class="ah-section">
      <AdvisorWitnessPanel :advisors="advisors" />
    </section>

    <!-- 庆祝与退休（INCR-280 补挂载孤儿组件 AdvisorCelebrationPanel：里程碑庆祝/完成仪式/退休阶段推进/遗产传承，引擎 useAdvisorCelebration 唯一、advisors props 薄委托注入） -->
    <section data-enter class="ah-section">
      <AdvisorCelebrationPanel :advisors="advisors" />
    </section>

    <!-- 作息与场景（INCR-281 补挂载孤儿组件 AdvisorDailyLifePanel：时段/场景分布/活动开始结束，引擎 useAdvisorDailyLife 唯一、advisors props 薄委托注入） -->
    <section data-enter class="ah-section">
      <AdvisorDailyLifePanel :advisors="advisors" />
    </section>

    <EmptyState
      v-if="!advisors.length"
      data-enter
      icon="🏛"
      title="幕僚大厅等待第一位居民"
      :glow="false"
      cta-label=""
    />

    <!-- 编辑弹窗 -->
    <Teleport to="body"><Transition name="modal">
      <div v-if="showModal" class="ah-dialog-overlay" @click.self="showModal = false">
        <div class="ah-dialog-card">
          <h3 class="ah-dialog-title">{{ editing ? '编辑幕僚' : '创建幕僚' }}</h3>
          <input v-model="form.name" placeholder="名字" class="ah-form-input" />
          <div class="ah-form-row">
            <select v-model="form.role" class="ah-select">
              <option v-for="o in ROLE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
            <select v-model="form.personality" class="ah-select">
              <option v-for="o in PERSONALITY_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
            </select>
          </div>
          <div class="ah-form-carrier">
            <AdvisorCarrierEditor v-model="form.carrier" />
          </div>
          <div class="ah-form-row">
            <select v-model="form.color" class="ah-select">
              <option value="">默认色</option>
              <option v-for="c in COLORS" :key="c" :value="c" :style="{ color: c }">● 配色</option>
            </select>
          </div>
          <div class="ah-dialog-actions">
            <button class="ah-btn-cancel" @click="showModal = false">取消</button>
            <button class="ah-btn-save" @click="saveAdvisor" :disabled="!form.name.trim()">保存</button>
          </div>
        </div>
      </div>
    </Transition></Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAdvisor } from '../resonance/bridges/advisor'
import { storage } from '../engine/storage'
import type { AdvisorProfile, AdvisorRole, AdvisorPersonality, AdvisorCarrier } from '../types'
import { advisorCarrierStageOf, carrierGlyph, carrierIsImage } from '../types'
import AdvisorScheduler from '../components/AdvisorScheduler.vue'
import DialogueSessionList from '../components/DialogueSessionList.vue'
import CoordinatorSettingsPanel from '../components/CoordinatorSettingsPanel.vue'
import AdvisorCarrierEditor from '../components/AdvisorCarrierEditor.vue'
import AdvisorInteractionPanel from '../components/AdvisorInteractionPanel.vue'
import AdvisorWitnessPanel from '../components/AdvisorWitnessPanel.vue'
import AdvisorCelebrationPanel from '../components/AdvisorCelebrationPanel.vue'
import AdvisorDailyLifePanel from '../components/AdvisorDailyLifePanel.vue'
import AdvisorOverviewPanel from '../components/AdvisorOverviewPanel.vue'
import AuraThemePicker from '../modules/aura/AuraThemePicker.vue'
import FeatureSearchPanel from '../components/FeatureSearchPanel.vue'
import CommandDecomposePanel from '../components/CommandDecomposePanel.vue'
import DispatchPanel from '../components/DispatchPanel.vue'
import SearchInput from '../components/SearchInput.vue'
import NoteSticky from '../components/NoteSticky.vue'
import FabButton from '../components/FabButton.vue'
import EmptyState from '../components/EmptyState.vue'
import { useCommandExecutor } from '../modules/advisor/commandExecutor'
import { detectStrategy } from '../modules/dispatch'
import type { DispatchStrategy } from '../modules/dispatch'
import { getNoteStore } from '../modules/note'
import { useNoteEditor } from '../modules/note/useNoteEditor'
import type { StickyNote } from '../modules/note/types'
import { useViewEntrance } from '../composables/useViewEntrance'

const { entranceRef, entranceClass } = useViewEntrance()
const $router = useRouter()

// ---- 调令系统（幕僚管家闭环）：下达 → 派单 → 任务中 → 完成光点 → 真办事 ----
const commandText = ref('')
const commandTasksReversed = computed(() => [...(advisor.commandTasks ?? [])].reverse())
const executor = useCommandExecutor()
function sendCommand() {
  const text = commandText.value.trim()
  if (!text) return
  const task = advisor.issueCommand(text)
  commandText.value = ''
  if (!task) return
  // 调令要真办事，不能只汇报：
  // navigate 类（如「打开殿堂设置」）下达即跳转，不等完成光点
  if (task.targetRoute) {
    $router.push(task.targetRoute)
    return
  }
  // action 类：真正触发对应能力（开启专注 / 写笔记 / 跳锚点庭院 / 跳情绪花房）
  executor.runAction(task)
}

// ---- 执行策略判定（dispatch·detectStrategy 独有维度，INCR-360） ----
const activeAdvisorIds = computed(() =>
  advisors.value.filter(a => a.state !== 'slumber').map(a => a.id),
)
const strategyPreview = computed<DispatchStrategy>(() =>
  detectStrategy(commandText.value, activeAdvisorIds.value),
)
const STRATEGY_NAME: Record<DispatchStrategy, string> = {
  single: '单一',
  parallel: '并行',
  serial: '串行',
}
function strategyName(s: DispatchStrategy): string {
  return STRATEGY_NAME[s] ?? s
}
const strategyReason = computed(() => {
  const s = strategyPreview.value
  const count = activeAdvisorIds.value.length
  if (s === 'serial') return '检测到先后依赖词（先/再/然后/随后/接着），按序推进'
  if (s === 'single') return count <= 1 ? '单幕僚直接执行' : '调令整体交予单一幕僚'
  return `多幕僚并行，${count} 位在位幕僚协同收集`
})

// ---- 统一到真实 advisor 档案层（含 6 固定预设）；与幕僚坞共享同一批幕僚 ----
const advisor = useAdvisor()
const advisors = computed<AdvisorProfile[]>(() => advisor.advisors)

const maxAdvisors = 5
const isPreset = (id: string) => id.startsWith('preset-')
const userAdvisors = computed(() => advisors.value.filter(a => !isPreset(a.id)))

// ---- 一次性迁移：旧表单层 hf:advisors → 真实档案层（保留用户已创建的幕僚） ----
const LEGACY_ADVISORS_KEY = 'hf:advisors'
interface LegacyAdvisor {
  id: string
  name: string
  role?: string
  personality?: string
  icon?: string
  color?: string
  rhythm?: string
  scene?: string
  dormant?: boolean
  createdAt?: string
}
const PERSONALITY_FROM_CN: Record<string, AdvisorPersonality> = {
  '沉稳': 'steady',
  '活泼': 'lively',
  '严谨': 'rigorous',
  '直觉': 'intuitive',
  '关怀': 'caring',
}
function migrateLegacyAdvisors() {
  const legacy = storage.getKV<LegacyAdvisor[]>(LEGACY_ADVISORS_KEY, [])
  if (!legacy.length) return
  for (const f of legacy) {
    if (advisor.advisors.some(a => a.id === f.id)) continue
    advisor.addAdvisorProfile({
      id: f.id,
      name: f.name || '无名幕僚',
      role: (f.role as AdvisorRole) || 'guardian',
      personality: PERSONALITY_FROM_CN[f.personality ?? ''] ?? 'steady',
      state: f.dormant ? 'slumber' : 'awake',
      affinity: 0,
      level: 1,
      totalInteractions: 0,
      createdAt: f.createdAt || new Date().toISOString(),
      lastActiveAt: null,
      unlocked: true,
      customColorScheme: f.color
        ? { primary: f.color, secondary: f.color, aura: f.color, text: '#ffffff' }
        : undefined,
      carrier: { kind: 'official-geometry', geometry: 'orb' },
    })
  }
  storage.setKV(LEGACY_ADVISORS_KEY, [])
}

onMounted(migrateLegacyAdvisors)

// ---- 展示映射 ----
const ROLE_OPTIONS: { value: AdvisorRole; label: string }[] = [
  { value: 'guardian', label: '陪伴型' },
  { value: 'scholar', label: '研究型' },
  { value: 'craftsman', label: '工作型' },
  { value: 'hermit', label: '生活型' },
]
const PERSONALITY_OPTIONS: { value: AdvisorPersonality; label: string }[] = [
  { value: 'steady', label: '沉稳' },
  { value: 'lively', label: '活泼' },
  { value: 'rigorous', label: '严谨' },
  { value: 'intuitive', label: '直觉' },
  { value: 'caring', label: '关怀' },
]
const COLORS = ['#f0c040', '#a07c8c', '#8a9a7a', '#d98c7a', '#6b9fc4', '#5ab8a0']

function roleLabel(r: AdvisorRole): string {
  return ROLE_OPTIONS.find(o => o.value === r)?.label ?? r
}
function personalityLabel(p: AdvisorPersonality): string {
  return PERSONALITY_OPTIONS.find(o => o.value === p)?.label ?? p
}
function glyphOf(a: AdvisorProfile): string {
  // 载体有官方几何 → 字形；用户图片 → 占位（模板改用 <img>）；无载体 → 回退星形
  // 按幕僚当前生命阶段解析对应形态（蓝图16:585 生命周期）
  return carrierGlyph(a.carrier, advisorCarrierStageOf(a)) ?? '✦'
}

// ---- 好感度等级（真实档案层，统一后有效） ----
const AFFINITY_BG = [
  'rgba(120,120,120,0.2)',
  'rgba(160,160,160,0.2)',
  'rgba(140,120,200,0.2)',
  'rgba(120,100,220,0.25)',
  'rgba(200,160,80,0.25)',
  'rgba(220,180,60,0.3)',
]
const AFFINITY_TEXT = [
  'rgba(255,255,255,0.35)',
  'rgba(255,255,255,0.45)',
  'rgba(255,255,255,0.55)',
  'rgba(200,180,255,0.75)',
  'rgba(255,220,120,0.85)',
  'rgba(255,200,80,1)',
]
function affinityTierLabel(id: string): string {
  return advisor.getAffinityTier(id)?.title ?? '--'
}
function affinityTierStyle(id: string): Record<string, string> {
  const tier = advisor.getAffinityTier(id)
  const idx = tier?.index ?? 0
  return { background: AFFINITY_BG[idx] ?? AFFINITY_BG[0], color: AFFINITY_TEXT[idx] ?? AFFINITY_TEXT[0] }
}

// ---- 创建 / 编辑 / 沉睡 / 删除（全部走真实档案层） ----
const showModal = ref(false)
const editing = ref(false)
const editingId = ref('')
const form = reactive<{
  name: string
  role: AdvisorRole
  personality: AdvisorPersonality
  carrier: AdvisorCarrier | undefined
  color: string
  derivedFrom: string
}>({
  name: '',
  role: 'guardian',
  personality: 'steady',
  carrier: undefined,
  color: '',
  derivedFrom: '',
})

function openCreate() {
  editing.value = false
  editingId.value = ''
  form.name = ''
  form.role = 'guardian'
  form.personality = 'steady'
  form.carrier = undefined
  form.color = ''
  form.derivedFrom = ''
  showModal.value = true
}

/** 基于某固定预设派生自定义幕僚：克隆其角色/性格/载体/色系/职责到表单，
 *  标 derivedFrom = 预设 id；保存时以非 preset- 前缀新 id 存入自定义层，
 *  绝不覆盖 6 固定预设（ensureDefaultAdvisors 幂等注入不受影响）。 */
function deriveFromPreset(preset: AdvisorProfile) {
  editing.value = false
  editingId.value = ''
  form.name = `${preset.name}的变体`
  form.role = preset.role
  form.personality = preset.personality
  form.carrier = preset.carrier ? (JSON.parse(JSON.stringify(preset.carrier)) as AdvisorCarrier) : undefined
  form.color = preset.customColorScheme?.primary ?? ''
  form.derivedFrom = preset.id
  showModal.value = true
}

/** 由预设 id 反查中文名（用于派生体「源自 X」展示） */
function presetName(presetId: string): string {
  return advisor.advisors.find(a => a.id === presetId)?.name ?? '预设'
}
function editAdvisor(a: AdvisorProfile) {
  editing.value = true
  editingId.value = a.id
  form.name = a.name
  form.role = a.role
  form.personality = a.personality
  // 深拷贝，避免编辑中途影响真实档案
  form.carrier = a.carrier ? (JSON.parse(JSON.stringify(a.carrier)) as AdvisorCarrier) : undefined
  form.color = a.customColorScheme?.primary ?? ''
  showModal.value = true
}
function saveAdvisor() {
  if (!form.name.trim()) return
  const colorScheme = form.color
    ? { primary: form.color, secondary: form.color, aura: form.color, text: '#ffffff' }
    : undefined
  if (editing.value) {
    advisor.updateAdvisorProfile(editingId.value, {
      name: form.name.trim(),
      role: form.role,
      personality: form.personality,
      carrier: form.carrier,
      customColorScheme: colorScheme,
    })
  } else {
    advisor.addAdvisorProfile({
      id: `adv${Date.now()}`,
      name: form.name.trim(),
      role: form.role,
      personality: form.personality,
      state: 'awake',
      affinity: 0,
      level: 1,
      totalInteractions: 0,
      createdAt: new Date().toISOString(),
      lastActiveAt: null,
      unlocked: true,
      customColorScheme: colorScheme,
      carrier: form.carrier,
      // 派生体溯源：标注入来源预设 id；空白创建时 derivedFrom 为空串 → undefined
      derivedFrom: form.derivedFrom || undefined,
    })
  }
  showModal.value = false
}
function toggleDormant(id: string) {
  const a = advisor.advisors.find(x => x.id === id)
  if (!a) return
  advisor.updateAdvisorProfile(id, { state: a.state === 'slumber' ? 'awake' : 'slumber' })
}
function removeAdvisor(id: string) {
  // 固定预设不可删，仅用户自建可删（避免误删 6 类固定幕僚）
  if (isPreset(id)) return
  advisor.removeAdvisorProfile(id)
}

// ---- 笔记（并入幕僚阁：内联列表 + 复用全局编辑器，原独立 FAB 已删） ----
const noteStore = getNoteStore()
const noteEditor = useNoteEditor()
const noteQuery = ref('')

const noteList = computed(() => {
  const all = noteStore.allNotes.value
  if (!noteQuery.value.trim()) return all.slice(0, 20)
  const q = noteQuery.value.toLowerCase()
  return all
    .filter(n => n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q))
    .slice(0, 20)
})

/** 每篇笔记都有对应的便签扩展状态（create 时同步写入），取之喂给编辑器 */
function asSticky(n: { id: string }): StickyNote {
  return noteStore.getStickyById(n.id) as StickyNote
}

function isNoteSticky(id: string): boolean {
  const s = noteStore.getStickyById(id)
  return !!s && (s.displayMode === 'sticky' || s.displayMode === 'minimized')
}

function noteColor(id: string): string {
  return noteStore.getStickyById(id)?.color ?? 'cccccc'
}

function noteToggleSticky(id: string) {
  if (isNoteSticky(id)) noteStore.moveToBoard(id)
  else noteStore.moveToSticky(id)
}

function noteDelete(id: string) {
  noteStore.hardRemove(id)
}

function noteFmt(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ---- 浮层便签（NoteSticky 真接入）：allStickyNotes 由 note 引擎维护，事件在此回写 store ----
const stickyLayer = ref(true)
const floatingStickyNotes = computed(() => noteStore.allStickyNotes.value)
const stickyCount = computed(() => floatingStickyNotes.value.length)

function onStickyPosition(id: string, x: number, y: number) {
  noteStore.updateStickyPosition(id, x, y)
}
function onStickyMode(id: string, mode: 'sticky' | 'minimized') {
  noteStore.updateStickyMode(id, mode)
}
function onStickyEdit(note: StickyNote) {
  noteEditor.openEdit(note)
}
function onStickyPin(id: string) {
  noteStore.togglePin(id)
}
</script>

<style scoped>
/* =========================================================
   Warm Amber Theme — 幕僚阁 (AdvisorHub)
   Background gradient: var(--bg-primary) → var(--bg-deep) → var(--bg-surface-alt) → var(--bg-deepest)
   Accent: var(--accent)
   Max-width: 600px
   ========================================================= */

/* ---- Root container ---- */
.ah {
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  background: transparent;
  position: relative;
  overflow: hidden;
}
.ah::before {
  content: '';
  position: absolute;
  top: -40%;
  left: 50%;
  transform: translateX(-50%);
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(var(--accent-rgb), 0.06) 0%, transparent 70%);
  pointer-events: none;
  z-index: 0;
}

/* ---- Header ---- */
.ah-header {
  text-align: center;
  margin-bottom: 32px;
  position: relative;
  z-index: 1;
}
.header-ornament {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}
.orn-line {
  display: inline-block;
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
}
.orn-diamond {
  font-size: 14px;
  color: var(--accent);
  opacity: 0.7;
}
.header-kicker {
  font-size: 11px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: rgba(var(--accent-rgb), 0.5);
  margin-bottom: 6px;
}
.ah-title {
  font-size: 26px;
  font-weight: 400;
  letter-spacing: 6px;
  color: var(--accent);
  margin: 0;
}

/* ---- Overview cards ---- */
.ah-overview {
  display: flex;
  gap: 10px;
  margin-bottom: 28px;
  position: relative;
  z-index: 1;
}
.ah-overview-card {
  flex: 1;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.10);
  border-radius: 12px;
  padding: 14px 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  overflow: hidden;
}
.ah-overview-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.3), transparent);
  pointer-events: none;
}
.ah-overview-value {
  font-size: 22px;
  font-weight: 500;
  color: var(--accent);
  line-height: 1.1;
}
.ah-overview-label {
  font-size: 10px;
  letter-spacing: 1px;
  color: rgba(var(--accent-rgb), 0.4);
}

/* ---- Advisor grid ---- */
.ah-advisor-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

/* ---- Advisor card ---- */
.ah-advisor-card {
  position: relative;
  padding: 16px;
  border-radius: 14px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: hidden;
}
.ah-advisor-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: radial-gradient(ellipse at 50% 0%, rgba(var(--accent-rgb), 0.04) 0%, transparent 70%);
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s;
}
.ah-advisor-card:hover::before {
  opacity: 1;
}
.ah-advisor-card:hover {
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.15);
}
.ah-advisor-card:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
  border-color: rgba(var(--accent-rgb), 0.3);
}
.ah-advisor-card.dormant {
  opacity: 0.35;
}

/* ---- Avatar / status (kept as a-*) ---- */
.a-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.a-icon {
  font-size: 24px;
}
.a-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.a-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--bg-primary);
}
.a-status.active {
  background: var(--success);
}
.a-status.dormant {
  background: #555;
}

/* ---- Info lines ---- */
.a-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.a-name {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255,240,224,0.92);
}
.a-role {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.45);
}
.a-personality {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.35);
}

/* ---- Affinity tier badge ---- */
.a-affinity-tier {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
  font-weight: 500;
  pointer-events: none;
}

/* ---- Actions overlay ---- */
.a-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}
.ah-advisor-card:hover .a-actions {
  opacity: 1;
}
.a-actions button {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: rgba(var(--accent-rgb), 0.08);
  color: rgba(var(--accent-rgb), 0.45);
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s, color 0.2s;
}
.a-actions button:hover {
  background: rgba(var(--accent-rgb), 0.15);
  color: var(--accent);
}

/* ---- Action row ---- */
.ah-action-row {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

/* ---- Buttons ---- */
.ah-btn-new {
  display: block;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  border: 1px dashed rgba(var(--accent-rgb), 0.25);
  background: rgba(var(--accent-rgb), 0.04);
  color: var(--accent);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.ah-btn-new:hover {
  background: rgba(var(--accent-rgb), 0.09);
  border-color: rgba(var(--accent-rgb), 0.35);
}
.ah-btn-new:disabled {
  opacity: 0.25;
  cursor: default;
}

.ah-btn-affinity {
  display: block;
  width: 100%;
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.18);
  background: rgba(var(--accent-rgb), 0.04);
  color: var(--accent);
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.2s;
}
.ah-btn-affinity:hover {
  background: rgba(var(--accent-rgb), 0.10);
}
.ah-btn-affinity:disabled {
  opacity: 0.25;
  cursor: default;
}

/* 已迁共享 EmptyState */

/* ---- Dialog overlay ---- */
.ah-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(10,8,6,0.7);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

/* ---- Dialog card ---- */
.ah-dialog-card {
  background: linear-gradient(145deg, var(--bg-deep) 0%, var(--bg-surface-alt) 100%);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 14px;
  padding: 28px 24px;
  width: 400px;
  max-width: 90vw;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 86vh;
  overflow-y: auto;
  position: relative;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5), 0 0 0 1px rgba(var(--accent-rgb), 0.05);
}
.ah-dialog-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(var(--accent-rgb), 0.25), transparent);
  border-radius: 14px 14px 0 0;
  pointer-events: none;
}
.ah-dialog-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 2px;
  margin: 0;
}

/* ---- Form inputs ---- */
.ah-form-input {
  padding: 10px 12px;
  border: 1px solid rgba(var(--accent-rgb), 0.10);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.03);
  color: rgba(255,240,224,0.85);
  font-family: inherit;
  font-size: 14px;
  outline: none;
  transition: border-color 0.2s;
}
.ah-form-input::placeholder {
  color: rgba(var(--accent-rgb), 0.20);
}
.ah-form-input:focus {
  border-color: rgba(var(--accent-rgb), 0.30);
}

/* ---- Form row ---- */
.ah-form-row {
  display: flex;
  gap: 8px;
}

/* ---- Select ---- */
.ah-select {
  flex: 1;
  padding: 8px 10px;
  border: 1px solid rgba(var(--accent-rgb), 0.10);
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.03);
  color: rgba(255,240,224,0.75);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.ah-select:focus {
  border-color: rgba(var(--accent-rgb), 0.30);
}

/* ---- Dialog actions ---- */
.ah-dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ---- Cancel / Save buttons ---- */
.ah-btn-cancel {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(var(--accent-rgb), 0.10);
  background: transparent;
  color: rgba(var(--accent-rgb), 0.45);
  font-family: inherit;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.ah-btn-cancel:hover {
  background: rgba(var(--accent-rgb), 0.06);
  color: rgba(var(--accent-rgb), 0.65);
}

.ah-btn-save {
  padding: 8px 16px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: var(--bg-primary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.ah-btn-save:hover {
  background: #debc8c;
}
.ah-btn-save:disabled {
  opacity: 0.35;
  cursor: default;
}

/* ---- Modal transition ---- */
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

/* === Entrance Animation === */
@keyframes fade-slide-up {
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ---- 幕僚调度面板 ---- */
.ah-scheduler-section {
  margin-top: 28px;
  position: relative;
  z-index: 1;
}
.ah-scheduler-heading {
  font-size: 14px;
  color: rgba(var(--accent-rgb), 0.55);
  margin-bottom: 12px;
  letter-spacing: 1px;
}

/* ---- 氛围主题段 ---- */
.ah-aura-section {
  margin-top: 28px;
  position: relative;
  z-index: 1;
}
.ah-aura-desc {
  font-size: 11px;
  line-height: 1.6;
  color: rgba(var(--accent-rgb), 0.38);
  margin: -4px 0 12px;
}

/* ---- 笔记区（并入幕僚阁） ---- */
.ah-notes-section {
  margin-top: 28px;
  position: relative;
  z-index: 1;
}
.ah-notes-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.ah-notes-new {
  width: auto;
  flex: 0 0 auto;
  padding: 8px 16px;
}
.ah-notes-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ah-note-item {
  padding: 12px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: background 0.2s, border-color 0.2s;
}
.ah-note-item:hover {
  background: rgba(var(--accent-rgb), 0.06);
  border-color: rgba(var(--accent-rgb), 0.14);
}
.ah-note-item.sticky {
  border-left: 3px solid var(--accent);
}
.ah-note-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.ah-note-dot {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  flex-shrink: 0;
}
.ah-note-title {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: rgba(255, 240, 224, 0.85);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ah-note-preview {
  font-size: 11px;
  color: rgba(255, 240, 224, 0.4);
  margin: 4px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.ah-note-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
}
.ah-note-time {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.3);
  margin-left: auto;
}
.ah-note-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity 0.15s;
}
.ah-note-item:hover .ah-note-actions {
  opacity: 1;
}
.ah-note-actions button {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: rgba(var(--accent-rgb), 0.06);
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}
.ah-note-actions button:hover {
  background: rgba(var(--accent-rgb), 0.14);
}
.ah-note-del:hover {
  background: rgba(224, 49, 49, 0.18);
}
/* 已迁共享 EmptyState */
.ah-notes-bar :deep(.hf-search) {
  flex: 1;
  min-width: 0;
}
.ah-sticky-toggle.active {
  background: rgba(var(--accent-rgb), 0.14);
  border-color: rgba(var(--accent-rgb), 0.32);
  color: var(--accent);
}
.ah-sticky-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 60;
}
.ah-sticky-layer > * {
  pointer-events: auto;
}

/* ---- 调令 section（幕僚管家闭环） ---- */
.ah-command-section {
  margin-top: 28px;
  position: relative;
  z-index: 1;
}
.ah-command-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}
.ah-command-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.03);
  color: rgba(255, 240, 224, 0.85);
  font-size: 13px;
  font-family: inherit;
  outline: none;
  transition: border-color 0.2s;
}
.ah-command-input::placeholder {
  color: rgba(var(--accent-rgb), 0.28);
}
.ah-command-input:focus {
  border-color: rgba(var(--accent-rgb), 0.32);
}
.ah-command-send {
  flex: 0 0 auto;
  padding: 10px 20px;
  border: none;
  border-radius: 12px;
  background: var(--accent);
  color: var(--bg-primary);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}
.ah-command-send:hover {
  background: #debc8c;
}
.ah-command-send:disabled {
  opacity: 0.35;
  cursor: default;
}
.ah-command-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ah-command-item {
  display: flex;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  transition: background 0.3s, border-color 0.3s;
}
.ah-command-item.done {
  background: rgba(var(--accent-rgb), 0.05);
  border-color: rgba(var(--accent-rgb), 0.14);
}
.ah-cmd-dot {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  margin-top: 6px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.22);
  transition: all 0.5s ease;
}
.ah-cmd-dot.light {
  background: var(--accent);
  box-shadow: 0 0 10px 2px rgba(var(--accent-rgb), 0.5);
  animation: cmd-light-breathe 2.4s ease-in-out infinite;
}
@keyframes cmd-light-breathe {
  0%, 100% { opacity: 0.55; box-shadow: 0 0 6px 1px rgba(var(--accent-rgb), 0.35); }
  50% { opacity: 1; box-shadow: 0 0 12px 3px rgba(var(--accent-rgb), 0.6); }
}
.ah-cmd-body {
  flex: 1;
  min-width: 0;
}
.ah-cmd-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  flex-wrap: wrap;
}
.ah-cmd-intent {
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 240, 224, 0.9);
}
.ah-cmd-advisor {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
}
.ah-cmd-status {
  font-size: 10px;
  color: rgba(var(--accent-rgb), 0.55);
  margin-left: auto;
  animation: cmd-pulse 1.4s ease-in-out infinite;
}
@keyframes cmd-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.9; }
}
.ah-cmd-progress {
  font-size: 11px;
  color: rgba(255, 240, 224, 0.4);
  margin: 4px 0 0;
  line-height: 1.5;
}
.ah-cmd-summary {
  font-size: 12px;
  color: rgba(var(--accent-rgb), 0.72);
  margin: 6px 0 0;
  line-height: 1.5;
}
/* 已迁共享 EmptyState */

/* ---- 执行策略判定（dispatch·detectStrategy 独有维度，INCR-360） ---- */
.ah-cmd-strategy {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(var(--accent-rgb), 0.03);
  border: 1px solid rgba(var(--accent-rgb), 0.08);
}
.ah-cmd-strategy-label {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.5);
  letter-spacing: 1px;
}
.ah-cmd-strategy-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(138, 154, 122, 0.18);
  color: #8a9a7a;
}
.ah-cmd-strategy-chip.st-parallel {
  background: rgba(91, 184, 160, 0.18);
  color: #5ab8a0;
}
.ah-cmd-strategy-chip.st-serial {
  background: rgba(240, 192, 64, 0.18);
  color: #d8b04a;
}
.ah-cmd-strategy-reason {
  font-size: 11px;
  color: rgba(var(--accent-rgb), 0.42);
  flex: 1 1 100%;
  padding-top: 4px;
  border-top: 1px dashed rgba(var(--accent-rgb), 0.08);
}

@media (max-width: 860px) {
  .ah { padding: 32px 20px 64px; }
  .ah-advisor-grid { gap: 8px; }
}

@media (max-width: 640px) {
  .ah { padding: 24px 14px 56px; }
  .ah-advisor-grid { grid-template-columns: 1fr; gap: 8px; }
  .ah-title { font-size: 22px; }
  .ah-action-row { flex-direction: column; }
  .ah-btn-new { width: 100%; }
  .ah-btn-affinity { width: 100%; }
  /* 笔记栏在窄屏换行，避免「新建笔记 / 浮层」按钮被 min-content 撑出视口 */
  .ah-notes-bar { flex-wrap: wrap; }
  .ah-notes-bar :deep(.hf-search) { flex: 1 1 100%; min-width: 0; }
  .ah-notes-new,
  .ah-sticky-toggle { flex: 1 1 auto; min-width: 0; }
}
</style>
