import { computed, ref, nextTick, inject, type InjectionKey } from 'vue'
import { getLocalDateKey, getLocalMonthKey } from '../../utils/time'
import { getRoom } from '../../engine/room-graph'
import { useRoomNavigation } from '../../composables/useRoomNavigation'
import { useConfig } from '../../resonance/bridges/config'
import { useCraftStore } from './index'
import type { CraftWork, EvolutionRecord, LightFormId, WorkStatus, WorkType } from './types'
import type { ScenePreset, BackgroundMediaConfig } from '../../types'
import { useViewEntrance } from '../../composables/useViewEntrance'

export function createCraftUi() {

const { entranceRef, entranceClass } = useViewEntrance()
const nav = useRoomNavigation()
const configBridge = useConfig()
const { config: configRef } = configBridge
const store = useCraftStore()

// ---- 展品架视觉演化 ----

// 根据进化程度获得展品发光等级
function getExhibitionGlowLevel(evolution: number): 'dim' | 'faint' | 'glowing' | 'radiant' {
  if (evolution >= 75) return 'radiant'
  if (evolution >= 50) return 'glowing'
  if (evolution >= 25) return 'faint'
  return 'dim'
}

// 基于所有作品平均进化程度计算展架整体发光等级
const averageEvolution = computed(() => store.stats.averageEvolution)
const shelfGlowLevel = computed(() => getExhibitionGlowLevel(averageEvolution.value))

// ---- 半成品工作台 ----
const wipWorks = computed(() => store.works.filter(w => w.evolution < 50 && w.status !== 'archived'))

// ---- 房间数据 ----
const roomData = computed(() => getRoom('craft'))

// ---- 搜索输入本地状态 ----
const searchInput = ref('')

// ---- 快速打磨动画状态 ----
const polishingId = ref<string | null>(null)

// ---- 进化阶段定义 ----
const evolutionStages = [
  { value: 0, name: '胚料', color: '#8a7a6a' },
  { value: 25, name: '粗坯', color: '#a08a7a' },
  { value: 50, name: '细琢', color: '#b89a7a' },
  { value: 75, name: '打磨', color: '#c8a87a' },
  { value: 100, name: '成品', color: '#e8c060' },
] as const

// ---- 光质形态定义 ----
interface LightForm {
  id: string
  name: string
  icon: string
  color: string
  glowColor: string
  description: string
}

const lightForms: LightForm[] = [
  { id: 'warm', name: '温煦', icon: '🌤', color: '#e8a060', glowColor: 'rgba(232, 160, 96, 0.25)', description: '温暖包容的光质' },
  { id: 'cool', name: '清冽', icon: '❄', color: '#60a0c8', glowColor: 'rgba(96, 160, 200, 0.25)', description: '冷静理智的光质' },
  { id: 'crystal', name: '晶透', icon: '💎', color: '#c8c0d8', glowColor: 'rgba(200, 192, 216, 0.25)', description: '澄澈通透的光质' },
  { id: 'mist', name: '雾隐', icon: '🌫', color: '#8a9aa8', glowColor: 'rgba(138, 154, 168, 0.25)', description: '朦胧含蓄的光质' },
  { id: 'ember', name: '余烬', icon: '🔥', color: '#c46a4a', glowColor: 'rgba(196, 106, 74, 0.25)', description: '炽热余温的光质' },
  { id: 'aurora', name: '极光', icon: '🌈', color: '#7ac8a0', glowColor: 'rgba(122, 200, 160, 0.25)', description: '梦幻变幻的光质' },
  { id: 'jade', name: '玉润', icon: '🟢', color: '#6aba7a', glowColor: 'rgba(106, 186, 122, 0.25)', description: '温润含蓄的光质' },
  { id: 'gold', name: '鎏金', icon: '⭐', color: '#d4a040', glowColor: 'rgba(212, 160, 64, 0.25)', description: '华贵璀璨的光质' },
  { id: 'void', name: '虚空', icon: '🕳', color: '#6a6a8a', glowColor: 'rgba(106, 106, 138, 0.25)', description: '深邃幽远的光质' },
]

function getLightForm(id?: LightFormId): LightForm | undefined {
  if (!id) return undefined
  return lightForms.find(lf => lf.id === id)
}

// ---- 状态筛选 chips ----
const statusFilterChips = computed(() => {
  const chips: { value: WorkStatus | ''; label: string; count?: number }[] = [
    { value: '', label: '全部', count: store.works.length },
    { value: 'draft', label: '草稿', count: store.stats.byStatus.draft },
    { value: 'refining', label: '打磨中', count: store.stats.byStatus.refining },
    { value: 'completed', label: '已完成', count: store.stats.byStatus.completed },
    { value: 'archived', label: '归档', count: store.stats.byStatus.archived },
  ]
  return chips
})

// =============================================================
// 模态框 · 作品新增/编辑
// =============================================================

const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)

interface WorkForm {
  name: string
  icon: string
  description: string
  color: string
  type: WorkType
  status: WorkStatus
  evolution: number
  tagsInput: string
  date: string
  lightFormId: string
}

const defaultForm: WorkForm = {
  name: '',
  icon: '🔨',
  description: '',
  color: '#b8a080',
  type: 'writing',
  status: 'draft',
  evolution: 0,
  tagsInput: '',
  date: getLocalMonthKey(),
  lightFormId: '',
}

const form = ref<WorkForm>({ ...defaultForm })

function resetForm() {
  form.value = { ...defaultForm }
  editingId.value = null
  isEditing.value = false
}

function openCreateModal() {
  resetForm()
  showModal.value = true
}

function openEditModal(work: CraftWork) {
  isEditing.value = true
  editingId.value = work.id
  form.value = {
    name: work.name,
    icon: work.icon,
    description: work.description,
    color: work.color,
    type: work.type,
    status: work.status,
    evolution: work.evolution,
    tagsInput: work.tags.join(', '),
    date: work.date,
    lightFormId: work.lightFormId || '',
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  resetForm()
}

function handleSaveWork() {
  if (!form.value.name.trim()) return
  const tags = form.value.tagsInput
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0)
  const now = new Date().toISOString()
  const lightFormId = (form.value.lightFormId || '') as LightFormId | ''

  if (isEditing.value && editingId.value) {
    const existing = store.works.find(w => w.id === editingId.value)
    const evolutionChanged = existing && existing.evolution !== form.value.evolution
    const evolutionHistory = existing?.evolutionHistory ? [...existing.evolutionHistory] : []
    if (evolutionChanged && form.value.evolution > 0) {
      const milestone = getEvolutionMilestone(form.value.evolution)
      evolutionHistory.push({
        date: getLocalDateKey(new Date(now)),
        evolution: form.value.evolution,
        milestone,
      })
    }
    store.updateWork(editingId.value, {
      name: form.value.name.trim(),
      icon: form.value.icon || '🔨',
      description: form.value.description.trim(),
      color: form.value.color || '#b8a080',
      type: form.value.type,
      status: form.value.status,
      evolution: form.value.evolution,
      tags,
      date: form.value.date,
      updatedAt: now,
      lightFormId: lightFormId || undefined,
      evolutionHistory: evolutionHistory.length > 0 ? evolutionHistory : undefined,
    })
  } else {
    const initialEvolution = form.value.evolution
    const evolutionHistory: EvolutionRecord[] = []
    if (initialEvolution > 0) {
      const milestone = getEvolutionMilestone(initialEvolution)
      evolutionHistory.push({
        date: getLocalDateKey(new Date(now)),
        evolution: initialEvolution,
        milestone,
      })
    }
    const work: CraftWork = {
      id: `craft-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: form.value.name.trim(),
      icon: form.value.icon || '🔨',
      description: form.value.description.trim(),
      color: form.value.color || '#b8a080',
      status: form.value.status,
      type: form.value.type,
      date: form.value.date,
      evolution: initialEvolution,
      tags,
      lightFormId: lightFormId || undefined,
      evolutionHistory: evolutionHistory.length > 0 ? evolutionHistory : undefined,
      createdAt: now,
      updatedAt: now,
    }
    store.addWork(work)
  }
  closeModal()
}

function handleDeleteWork(work: CraftWork) {
  if (window.confirm(`确定删除作品「${work.name}」吗？`)) {
    store.removeWork(work.id)
  }
}

// =============================================================
// 快速打磨
// =============================================================

function getEvolutionMilestone(evolution: number): string | undefined {
  if (evolution >= 100) return '成品'
  if (evolution >= 75) return '打磨'
  if (evolution >= 50) return '细琢'
  if (evolution >= 25) return '粗坯'
  if (evolution > 0) return '胚料'
  return undefined
}

async function handlePolishWork(work: CraftWork) {
  if (work.evolution >= 100 || polishingId.value) return
  polishingId.value = work.id
  // 模拟打磨动画延迟
  await new Promise(resolve => setTimeout(resolve, 600))
  const newEvolution = Math.min(work.evolution + 10, 100)
  const newStatus: WorkStatus = newEvolution >= 100 ? 'completed' : 'refining'
  const now = new Date().toISOString()
  const milestone = getEvolutionMilestone(newEvolution)
  const evolutionHistory = work.evolutionHistory ? [...work.evolutionHistory] : []
  if (newEvolution > 0) {
    evolutionHistory.push({
      date: getLocalDateKey(new Date(now)),
      evolution: newEvolution,
      milestone,
    })
  }
  store.updateWork(work.id, {
    evolution: newEvolution,
    status: newStatus,
    updatedAt: now,
    evolutionHistory: evolutionHistory.length > 0 ? evolutionHistory : undefined,
  })
  polishingId.value = null
}

// =============================================================
// 进化时间线
// =============================================================

interface TimelineEntry {
  id: string
  name: string
  icon: string
  color: string
  date: string
  evolution: number
  milestoneClass: string
  history: EvolutionRecord[]
}

const timelineEntries = computed<TimelineEntry[]>(() => {
  return store.works
    .filter(w => (w.evolutionHistory && w.evolutionHistory.length > 0) || w.evolution > 0)
    .sort((a, b) => {
      const aDate = a.evolutionHistory?.[a.evolutionHistory.length - 1]?.date || a.createdAt || '2000-01-01'
      const bDate = b.evolutionHistory?.[b.evolutionHistory.length - 1]?.date || b.createdAt || '2000-01-01'
      return bDate.localeCompare(aDate)
    })
    .map(w => ({
      id: w.id,
      name: w.name,
      icon: w.icon,
      color: w.color,
      date: w.evolutionHistory?.[w.evolutionHistory.length - 1]?.date || w.date || '',
      evolution: w.evolution,
      milestoneClass: getMilestoneClass(w.evolution),
      history: w.evolutionHistory || [],
    }))
})

function getMilestoneClass(evolution: number): string {
  if (evolution >= 100) return 'completed'
  if (evolution >= 75) return 'polishing'
  if (evolution >= 50) return 'refining'
  if (evolution >= 25) return 'rough'
  return 'seed'
}

// =============================================================
// 装修工坊 · 场景预设管理
// =============================================================

/** 场景预设列表 */
const scenePresets = computed<ScenePreset[]>(() => configBridge.getScenePresets())

/** 新预设名称输入 */
const presetNameInput = ref('')

/** 正在重命名的预设 ID */
const renamingId = ref<string | null>(null)

/** 重命名输入值 */
const renameInput = ref('')

/** 重命名输入框引用 */
const renameInputRef = ref<HTMLInputElement | null>(null)

/** 反馈消息 */
const decoMessage = ref('')
const decoMessageType = ref<'success' | 'error'>('success')

let messageTimer: ReturnType<typeof setTimeout> | null = null

/** 显示反馈消息（自动消失） */
function showDecoMessage(msg: string, type: 'success' | 'error' = 'success') {
  decoMessage.value = msg
  decoMessageType.value = type
  if (messageTimer) clearTimeout(messageTimer)
  messageTimer = setTimeout(() => { decoMessage.value = '' }, configRef.craft.messageTimeout)
}

/** 保存当前场景为预设 */
function handleSavePreset() {
  const name = presetNameInput.value.trim()
  if (!name) return
  const result = configBridge.saveCurrentAsPreset(name)
  if (result) {
    presetNameInput.value = ''
    showDecoMessage(`场景预设「${name}」已保存`)
  } else {
    showDecoMessage('保存失败，请重试', 'error')
  }
}

/** 应用场景预设 */
function handleApplyPreset(id: string) {
  const ok = configBridge.applyScenePreset(id)
  if (ok) {
    showDecoMessage('场景已应用')
  } else {
    showDecoMessage('应用失败，预设不存在', 'error')
  }
}

/** 删除场景预设 */
function handleDeletePreset(id: string) {
  const ok = configBridge.deleteScenePreset(id)
  if (ok) {
    showDecoMessage('场景预设已删除')
  } else {
    showDecoMessage('删除失败，预设不存在', 'error')
  }
}

/** 开始重命名 */
function startRenaming(preset: ScenePreset) {
  renamingId.value = preset.id
  renameInput.value = preset.name
  nextTick(() => {
    renameInputRef.value?.focus()
    renameInputRef.value?.select()
  })
}

/** 确认重命名 */
function handleRenameConfirm(id: string) {
  if (!renamingId.value) return
  const name = renameInput.value.trim()
  if (!name) {
    renamingId.value = null
    return
  }
  const ok = configBridge.renameScenePreset(id, name)
  renamingId.value = null
  if (ok) {
    showDecoMessage(`已重命名为「${name}」`)
  }
}

/** 判断预设是否为当前激活的场景 */
function isActivePreset(preset: ScenePreset): boolean {
  const current = configRef.background
  return current.type === preset.background.type
    && current.presetScene === preset.background.presetScene
    && current.dataUrl === preset.background.dataUrl
}

/** 预设场景中文标签 */
const PRESET_SCENE_LABELS: Record<string, string> = {
  'forest-dawn': '晨曦森林',
  'coast-starlight': '星空海岸',
  'autumn-courtyard': '秋日庭院',
  'rainy-window': '雨窗',
  'mountain-cloud': '山间云海',
  'snowy-night': '雪夜',
  'none': '无',
}

/** 背景类型中文标签 */
const BG_TYPE_LABELS: Record<string, string> = {
  default: '默认',
  preset: '预设场景',
  image: '图片',
  video: '视频',
}

/** 获取预设的中文场景描述 */
function presetSceneLabel(bg: BackgroundMediaConfig): string {
  if (bg.type === 'default') return '默认氛围'
  if (bg.type === 'preset') return PRESET_SCENE_LABELS[bg.presetScene] ?? bg.presetScene
  if (bg.type === 'image' && bg.fileName) return `图片 · ${bg.fileName}`
  if (bg.type === 'video' && bg.fileName) return `视频 · ${bg.fileName}`
  return BG_TYPE_LABELS[bg.type] ?? bg.type
}

/** 场景指示器 CSS 类名（用于颜色区分） */
function sceneIndicatorClass(bg: BackgroundMediaConfig): string {
  if (bg.type === 'preset') return `deco-scene--${bg.presetScene}`
  if (bg.type === 'default') return 'deco-scene--default'
  return 'deco-scene--custom'
}

/** 场景指示器图标 */
function sceneIndicatorIcon(bg: BackgroundMediaConfig): string {
  if (bg.type === 'preset') {
    const icons: Record<string, string> = {
      'forest-dawn': '🌲',
      'coast-starlight': '🌊',
      'autumn-courtyard': '🍂',
      'rainy-window': '🌧',
      'mountain-cloud': '⛰',
      'snowy-night': '❄',
    }
    return icons[bg.presetScene] ?? '🌄'
  }
  if (bg.type === 'image') return '🖼'
  if (bg.type === 'video') return '🎬'
  return '🌌'
}
  return {
    entranceRef,
    entranceClass,
    nav,
    configBridge,
    configRef,
    store,
    getExhibitionGlowLevel,
    averageEvolution,
    shelfGlowLevel,
    wipWorks,
    roomData,
    searchInput,
    polishingId,
    evolutionStages,
    lightForms,
    getLightForm,
    statusFilterChips,
    showModal,
    isEditing,
    editingId,
    defaultForm,
    form,
    resetForm,
    openCreateModal,
    openEditModal,
    closeModal,
    handleSaveWork,
    handleDeleteWork,
    getEvolutionMilestone,
    handlePolishWork,
    timelineEntries,
    getMilestoneClass,
    scenePresets,
    presetNameInput,
    renamingId,
    renameInput,
    renameInputRef,
    decoMessage,
    decoMessageType,
    showDecoMessage,
    handleSavePreset,
    handleApplyPreset,
    handleDeletePreset,
    startRenaming,
    handleRenameConfirm,
    isActivePreset,
    PRESET_SCENE_LABELS,
    BG_TYPE_LABELS,
    presetSceneLabel,
    sceneIndicatorClass,
    sceneIndicatorIcon,
  }
}

export type CraftUi = ReturnType<typeof createCraftUi>
export const CRAFT_UI_KEY: InjectionKey<CraftUi> = Symbol('craft-ui')
export function useCraftUi(): CraftUi {
  return inject(CRAFT_UI_KEY, null) ?? createCraftUi()
}
