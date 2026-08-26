// ============================================================
// 模板系统 · Pinia Store
// 管理模板 CRUD、搜索、应用、导出/导入
// ============================================================

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { RoomTemplate } from './types'
export type { RoomTemplate }
import { exportTemplate as toShareFormat, downloadTemplate } from './types'
import { getKV, setKV } from '../../engine/storage/kv'

const TEMPLATE_STORAGE_KEY = 'hf:templates'
const APPLIED_ROOM_KEY = 'hf:applied_room_template'
const APPLIED_ADVISOR_KEY = 'hf:applied_advisor_template'

// ---- 内置模板 ----

const BUILTIN_ROOM_TEMPLATES: RoomTemplate[] = [
  {
    id: 'room-minimal-study', name: '极简书房', version: '1.2.0', type: 'room',
    description: '干净、安静的专注空间，适合深度阅读与写作。',
    author: '心流工坊', tags: ['专注', '阅读', '写作'],
    data: { layout: 'single-center', background: 'warm-wood', widgets: ['timer', 'notes', 'goals'] },
    createdAt: '2025-01-15T00:00:00.000Z',
  },
  {
    id: 'room-meditation-garden', name: '冥想庭院', version: '1.1.0', type: 'room',
    description: '静谧的禅意空间，适合冥想、呼吸与情绪整理。',
    author: '心流工坊', tags: ['冥想', '放松', '自然'],
    data: { layout: 'single-center', background: 'zen-garden', widgets: ['emotion', 'breathing', 'journal'], soundscape: 'forest-ambient' },
    createdAt: '2025-02-20T00:00:00.000Z',
  },
  {
    id: 'room-dashboard', name: '效率看板', version: '1.1.0', type: 'room',
    description: '一目了然的专注统计与任务看板，适合日回顾与规划。',
    author: '心流工坊', tags: ['效率', '统计', '规划'],
    data: { layout: 'grid', background: 'dark-professional', widgets: ['stats', 'goals', 'timeline', 'calendar'] },
    createdAt: '2025-03-10T00:00:00.000Z',
  },
  {
    id: 'room-night-sanctuary', name: '深夜安全岛', version: '1.0.0', type: 'room',
    description: '低刺激、暗色调的庇护空间，适合夜间情绪整理。',
    author: '心流工坊', tags: ['夜间', '情绪', '庇护'],
    data: { layout: 'single-center', background: 'deep-night', widgets: ['emotion', 'journal'], dimming: 0.3 },
    createdAt: '2025-04-05T00:00:00.000Z',
  },
  {
    id: 'room-body-temple', name: '身体温室', version: '1.0.0', type: 'room',
    description: '融合运动记录与身体觉察的空间，适合晨间唤醒与晚间放松。',
    author: '心流工坊', tags: ['运动', '身体', '觉察'],
    data: { layout: 'split', background: 'warm-sunset', widgets: ['movement', 'breathing', 'body-stats'] },
    createdAt: '2025-05-01T00:00:00.000Z',
  },
  {
    id: 'room-focus-peak', name: '专注峰顶', version: '1.0.0', type: 'room',
    description: '高度专注的极简空间，排除一切干扰，适合高强度工作。',
    author: '心流工坊', tags: ['专注', '极简', '高强度'],
    data: { layout: 'fullscreen', background: 'sheer-white', widgets: ['timer', 'progress'], dimming: 0.1 },
    createdAt: '2025-05-15T00:00:00.000Z',
  },
]

const BUILTIN_ADVISOR_TEMPLATES: RoomTemplate[] = [
  {
    id: 'advisor-wise-elder', name: '睿智长者', version: '1.0.0', type: 'advisor',
    description: '沉稳、温和的引导型幕僚，适合需要鼓励与大局观的时刻。',
    author: '心流工坊', tags: ['温和', '引导', '鼓励'],
    data: { persona: 'wise-elder', tone: 'gentle', traits: ['patience', 'wisdom', 'encouraging'], greeting: '孩子，今天的路，你走得很好。' },
    createdAt: '2025-01-20T00:00:00.000Z',
  },
  {
    id: 'advisor-accountability-partner', name: '问责伙伴', version: '1.0.0', type: 'advisor',
    description: '直接、干脆的督促型幕僚，帮你守住承诺、推进计划。',
    author: '心流工坊', tags: ['督促', '直接', '效率'],
    data: { persona: 'accountability-partner', tone: 'direct', traits: ['firm', 'honest', 'motivating'], greeting: '你上周说这周要完成的事，开始了吗？' },
    createdAt: '2025-02-10T00:00:00.000Z',
  },
  {
    id: 'advisor-creative-spark', name: '灵感火花', version: '1.0.0', type: 'advisor',
    description: '天马行空、充满想象力的幕僚，适合创意产出与头脑风暴。',
    author: '心流工坊', tags: ['创意', '想象', '轻松'],
    data: { persona: 'creative-spark', tone: 'playful', traits: ['imaginative', 'curious', 'unconventional'], greeting: '嘿，如果今天没什么规则，你最想做什么？' },
    createdAt: '2025-03-01T00:00:00.000Z',
  },
  {
    id: 'advisor-mindful-observer', name: '静观者', version: '1.0.0', type: 'advisor',
    description: '安静、内省的幕僚，帮助你觉察当下、梳理内心。',
    author: '心流工坊', tags: ['内省', '静观', '情绪'],
    data: { persona: 'mindful-observer', tone: 'calm', traits: ['introspective', 'patient', 'observant'], greeting: '此刻，你感受到什么？' },
    createdAt: '2025-03-25T00:00:00.000Z',
  },
]

function isBuiltin(id: string): boolean {
  return BUILTIN_ROOM_TEMPLATES.some(t => t.id === id) || BUILTIN_ADVISOR_TEMPLATES.some(t => t.id === id)
}

export const useTemplateStore = defineStore('template', () => {
  // ---- 状态 ----
  const templates = ref<RoomTemplate[]>([...BUILTIN_ROOM_TEMPLATES, ...BUILTIN_ADVISOR_TEMPLATES])
  const appliedRoomId = ref<string | null>(null)
  const appliedAdvisorId = ref<string | null>(null)
  const searchQuery = ref('')

  // ---- 持久化 ----
  function loadPersisted() {
    const saved = getKV<RoomTemplate[]>(TEMPLATE_STORAGE_KEY, [])
    if (saved.length > 0) {
      // 合并内置模板 + 用户自定义（按 id 去重）
      const builtinIds = new Set(templates.value.map(t => t.id))
      for (const t of saved) {
        if (!builtinIds.has(t.id)) {
          templates.value.push(t)
          builtinIds.add(t.id)
        }
      }
    }
    appliedRoomId.value = getKV<string | null>(APPLIED_ROOM_KEY, null)
    appliedAdvisorId.value = getKV<string | null>(APPLIED_ADVISOR_KEY, null)
  }

  function persist() {
    const userTemplates = templates.value.filter(t => !isBuiltin(t.id))
    setKV(TEMPLATE_STORAGE_KEY, userTemplates)
    setKV(APPLIED_ROOM_KEY, appliedRoomId.value)
    setKV(APPLIED_ADVISOR_KEY, appliedAdvisorId.value)
  }

  // ---- 计算属性 ----
  const roomTemplates = computed(() =>
    templates.value.filter(t => t.type === 'room' && matchesSearch(t))
  )
  const advisorTemplates = computed(() =>
    templates.value.filter(t => t.type === 'advisor' && matchesSearch(t))
  )
  const totalCount = computed(() => templates.value.length)
  const roomCount = computed(() => templates.value.filter(t => t.type === 'room').length)
  const advisorCount = computed(() => templates.value.filter(t => t.type === 'advisor').length)
  const userTemplates = computed(() => templates.value.filter(t => !isBuiltin(t.id)))

  function matchesSearch(t: RoomTemplate): boolean {
    if (!searchQuery.value) return true
    const q = searchQuery.value.toLowerCase()
    return (
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.tags.some(tag => tag.toLowerCase().includes(q)) ||
      t.author.toLowerCase().includes(q)
    )
  }

  const filteredTemplates = computed(() =>
    templates.value.filter(matchesSearch)
  )

  // ---- 操作 ----

  /** 添加模板 */
  function addTemplate(tmpl: RoomTemplate): boolean {
    if (templates.value.some(t => t.id === tmpl.id)) return false
    templates.value.push(tmpl)
    persist()
    return true
  }

  /** 删除模板（仅允许删除用户自定义的） */
  function removeTemplate(id: string): boolean {
    if (isBuiltin(id)) return false
    const idx = templates.value.findIndex(t => t.id === id)
    if (idx === -1) return false
    templates.value.splice(idx, 1)
    if (appliedRoomId.value === id) appliedRoomId.value = null
    if (appliedAdvisorId.value === id) appliedAdvisorId.value = null
    persist()
    return true
  }

  /** 更新模板（仅允许更新用户自定义的） */
  function updateTemplate(id: string, updates: Partial<Pick<RoomTemplate, 'name' | 'description' | 'tags' | 'data'>>): boolean {
    const tmpl = templates.value.find(t => t.id === id)
    if (!tmpl || isBuiltin(id)) return false
    Object.assign(tmpl, updates)
    persist()
    return true
  }

  /** 应用模板 */
  function applyTemplate(id: string): boolean {
    const tmpl = templates.value.find(t => t.id === id)
    if (!tmpl) return false
    if (tmpl.type === 'room') {
      appliedRoomId.value = id
    } else {
      appliedAdvisorId.value = id
    }
    persist()
    return true
  }

  /** 取消应用 */
  function unapplyTemplate(id: string): boolean {
    if (appliedRoomId.value === id) {
      appliedRoomId.value = null
      persist()
      return true
    }
    if (appliedAdvisorId.value === id) {
      appliedAdvisorId.value = null
      persist()
      return true
    }
    return false
  }

  /** 导出模板为文件 */
  function exportTemplate(id: string): boolean {
    const tmpl = templates.value.find(t => t.id === id)
    if (!tmpl) return false
    const share = toShareFormat(tmpl)
    downloadTemplate(share)
    return true
  }

  /** 从分享格式导入模板 */
  function importShareFormat(share: import('./types').TemplateShareFormat): RoomTemplate | null {
    const id = share.id || `imported-${Date.now()}`
    if (templates.value.some(t => t.id === id)) return null
    const tmpl: RoomTemplate = {
      id,
      name: share.name,
      description: share.description,
      author: share.author,
      version: '1.0.0',
      type: share.type,
      data: share.data,
      tags: share.tags,
      createdAt: share.createdAt || new Date().toISOString(),
    }
    templates.value.push(tmpl)
    persist()
    return tmpl
  }

  /** 创建新模板 */
  function createTemplate(input: {
    name: string
    description: string
    type: 'room' | 'advisor'
    tags: string[]
    data: Record<string, any>
  }): RoomTemplate {
    const tmpl: RoomTemplate = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: input.name,
      description: input.description,
      author: '心流工坊用户',
      version: '1.0.0',
      type: input.type,
      data: input.data,
      tags: input.tags,
      createdAt: new Date().toISOString(),
    }
    templates.value.push(tmpl)
    persist()
    return tmpl
  }

  /** 搜索 */
  function setSearch(query: string) {
    searchQuery.value = query
  }

  // ---- 初始化 ----
  loadPersisted()

  return {
    templates,
    appliedRoomId,
    appliedAdvisorId,
    searchQuery,
    roomTemplates,
    advisorTemplates,
    totalCount,
    roomCount,
    advisorCount,
    userTemplates,
    filteredTemplates,
    addTemplate,
    removeTemplate,
    updateTemplate,
    applyTemplate,
    unapplyTemplate,
    exportTemplate,
    importShareFormat,
    createTemplate,
    setSearch,
    isBuiltin,
  }
})

// ============================================================
// 视图数据层 · 顾问人设/语气（替代 TemplateMarket.vue 的裸 storage 调用）
// ============================================================
export { useTemplateMarket } from './template-market'