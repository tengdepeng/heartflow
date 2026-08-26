// ============================================================
// 业脉 · 视图数据层
// 为 Career.vue 提供标准化的「联系人 / 连接 / 项目」存取接口，
// 替代视图内直接的 storage.getKV('career:contacts' 等) /
// storage.setKV(...) 裸调用与 deep watch 持久化。
//
// 存储键字符串与原视图严格保持一致，既有视图测试依赖它们：
//   career:contacts  /  career:projects  /  career:connections
// ============================================================

import { ref, watch } from 'vue'
import { storage } from '../../engine/storage'

// ---- 数据模型（与原视图局部类型保持一致）----
export type NodeTypeId = 'mentor' | 'colleague' | 'superior' | 'subordinate' | 'client'
  | 'partner' | 'peer' | 'friend' | 'vendor' | 'investor' | 'alumni'

export interface CareerContact {
  id: string
  name: string
  role: string
  tier: 'core' | 'active' | 'extended' | 'edge'
  nodeType: NodeTypeId
  affinity: number
  tags: string[]
  note?: string
}

export type ConnectionType = 'strong' | 'medium' | 'weak' | 'collaboration' | 'referral' | 'mentorship'

export interface CareerConnection {
  id: string
  fromId: string
  toId: string
  type: ConnectionType
  description?: string
}

export type ProjectStatus = 'active' | 'completed' | 'paused' | 'planning'

export interface CareerProject {
  id: string
  name: string
  icon: string
  description: string
  color: string
  status: ProjectStatus
  statusLabel: string
  partners: string
  date: string
}

// ---- 存储键（与原视图一致）----
const CONTACTS_KEY = 'career:contacts'
const PROJECTS_KEY = 'career:projects'
const CONNECTIONS_KEY = 'career:connections'

// ---- 默认初始数据（与原视图一致）----
const DEFAULT_CONTACTS: CareerContact[] = [
  { id: 'c-001', name: '张老师', role: '导师', tier: 'core', nodeType: 'mentor', affinity: 10, tags: ['技术指导', '职业规划'] },
  { id: 'c-002', name: '李工', role: '后端工程师', tier: 'core', nodeType: 'colleague', affinity: 9, tags: ['合作开发', '代码审查'] },
  { id: 'c-003', name: '王组长', role: '团队负责人', tier: 'core', nodeType: 'superior', affinity: 8, tags: ['项目管理'] },
  { id: 'c-004', name: '陈总监', role: '设计总监', tier: 'active', nodeType: 'superior', affinity: 7, tags: ['UI设计', '产品评审'] },
  { id: 'c-005', name: '刘设计师', role: 'UI设计师', tier: 'active', nodeType: 'colleague', affinity: 7, tags: ['视觉设计', '交互'] },
  { id: 'c-006', name: '赵前端', role: '前端工程师', tier: 'active', nodeType: 'peer', affinity: 6, tags: ['Vue', 'React'] },
  { id: 'c-007', name: '钱后端', role: '后端工程师', tier: 'active', nodeType: 'colleague', affinity: 6, tags: ['Go', '微服务'] },
  { id: 'c-008', name: '孙产品', role: '产品经理', tier: 'extended', nodeType: 'partner', affinity: 5, tags: ['需求分析'] },
  { id: 'c-009', name: '周运营', role: '运营经理', tier: 'extended', nodeType: 'colleague', affinity: 4, tags: ['数据分析'] },
  { id: 'c-010', name: '吴数据', role: '数据工程师', tier: 'extended', nodeType: 'peer', affinity: 4, tags: ['ETL', 'BI'] },
  { id: 'c-011', name: '郑市场', role: '市场总监', tier: 'extended', nodeType: 'client', affinity: 3, tags: ['市场推广'] },
  { id: 'c-012', name: '冯测试', role: '测试工程师', tier: 'extended', nodeType: 'colleague', affinity: 3, tags: ['自动化测试'] },
]

const DEFAULT_PROJECTS: CareerProject[] = [
  {
    id: 'p-001',
    name: '心流工坊',
    icon: '🏗',
    description: 'Vue 3 + TypeScript 个人知识管理系统',
    color: '#8a9a7a',
    status: 'active',
    statusLabel: '进行中',
    partners: '独立开发',
    date: '2025-12',
  },
  {
    id: 'p-002',
    name: '前端组件库重构',
    icon: '🧩',
    description: '企业级组件库从 Vue 2 迁移至 Vue 3',
    color: '#7a9a8a',
    status: 'completed',
    statusLabel: '已完成',
    partners: '李工、王组长',
    date: '2026-03',
  },
  {
    id: 'p-003',
    name: '数据分析平台',
    icon: '📊',
    description: '实时数据看板与报表系统前端开发',
    color: '#8ab87a',
    status: 'active',
    statusLabel: '进行中',
    partners: '陈总监、赵前端',
    date: '2026-05',
  },
  {
    id: 'p-004',
    name: '技术分享工作坊',
    icon: '🎤',
    description: '团队内部 TypeScript 高级类型培训',
    color: '#a0a8b8',
    status: 'completed',
    statusLabel: '已完成',
    partners: '张老师',
    date: '2026-04',
  },
  {
    id: 'p-005',
    name: '微服务网关设计',
    icon: '🔀',
    description: 'API 网关架构设计与技术选型评审',
    color: '#9a8a7a',
    status: 'paused',
    statusLabel: '暂停',
    partners: '刘设计师、钱后端',
    date: '2026-06',
  },
  {
    id: 'p-006',
    name: '用户体验改进计划',
    icon: '🎨',
    description: '产品核心流程的交互优化与用户调研',
    color: '#c4a060',
    status: 'planning',
    statusLabel: '规划中',
    partners: '孙产品',
    date: '2026-07',
  },
]

const DEFAULT_CONNECTIONS: CareerConnection[] = [
  { id: 'conn-001', fromId: 'c-001', toId: 'c-002', type: 'mentorship', description: '张老师指导李工' },
  { id: 'conn-002', fromId: 'c-001', toId: 'c-003', type: 'strong', description: '张老师与王组长紧密合作' },
  { id: 'conn-003', fromId: 'c-002', toId: 'c-003', type: 'collaboration', description: '李工与王组长项目协作' },
  { id: 'conn-004', fromId: 'c-002', toId: 'c-006', type: 'collaboration', description: '前后端协作' },
  { id: 'conn-005', fromId: 'c-005', toId: 'c-006', type: 'collaboration', description: 'UI与前端协作' },
  { id: 'conn-006', fromId: 'c-006', toId: 'c-007', type: 'medium', description: '前后端技术交流' },
  { id: 'conn-007', fromId: 'c-008', toId: 'c-009', type: 'medium', description: '产品与运营协同' },
  { id: 'conn-008', fromId: 'c-004', toId: 'c-005', type: 'strong', description: '设计团队内部' },
  { id: 'conn-009', fromId: 'c-003', toId: 'c-004', type: 'referral', description: '王组长引荐陈总监' },
  { id: 'conn-010', fromId: 'c-008', toId: 'c-011', type: 'weak', description: '产品与市场沟通' },
]

// ---- 纯数据深拷贝（避免调用方就地修改污染默认常量）----
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

// ---- 模块级单例：所有消费方共享同一份列表 ----
const contacts = ref<CareerContact[]>([])
const projects = ref<CareerProject[]>([])
const connections = ref<CareerConnection[]>([])

// ---- deep watch 仅绑定一次（单例共享）----
let bound = false
function bindAutoPersist(): void {
  if (bound) return
  watch(contacts, () => storage.setKV(CONTACTS_KEY, contacts.value), { deep: true })
  watch(projects, () => storage.setKV(PROJECTS_KEY, projects.value), { deep: true })
  watch(connections, () => storage.setKV(CONNECTIONS_KEY, connections.value), { deep: true })
  bound = true
}

/**
 * 业脉数据层：联系人 / 连接 / 项目的读取、写入与自动持久化。
 */
export function useCareer() {
  bindAutoPersist()

  /** 从存储载入三个列表（空存储时回退默认数据） */
  function load(): void {
    contacts.value = loadContacts()
    connections.value = loadConnections()
    projects.value = loadProjects()
  }

  function saveContacts(list: CareerContact[]): void {
    contacts.value = list
    storage.setKV(CONTACTS_KEY, list)
  }

  function saveConnections(list: CareerConnection[]): void {
    connections.value = list
    storage.setKV(CONNECTIONS_KEY, list)
  }

  function saveProjects(list: CareerProject[]): void {
    projects.value = list
    storage.setKV(PROJECTS_KEY, list)
  }

  return { contacts, projects, connections, load, saveContacts, saveConnections, saveProjects }
}

// ---- 载入实现（保留默认的「空则播种」与 nodeType 迁移语义）----
function loadContacts(): CareerContact[] {
  try {
    const saved = storage.getKV<CareerContact[]>(CONTACTS_KEY, [])
    if (saved.length === 0) {
      const seeded = clone(DEFAULT_CONTACTS)
      storage.setKV(CONTACTS_KEY, seeded)
      return seeded
    }
    // 迁移旧数据：补充 nodeType 字段
    return saved.map((c) => ({
      ...c,
      nodeType: c.nodeType || 'colleague' as NodeTypeId,
    }))
  } catch {
    return DEFAULT_CONTACTS
  }
}

function loadConnections(): CareerConnection[] {
  try {
    const saved = storage.getKV<CareerConnection[]>(CONNECTIONS_KEY, [])
    if (saved.length === 0) {
      const seeded = clone(DEFAULT_CONNECTIONS)
      storage.setKV(CONNECTIONS_KEY, seeded)
      return seeded
    }
    return saved
  } catch {
    return DEFAULT_CONNECTIONS
  }
}

function loadProjects(): CareerProject[] {
  try {
    const saved = storage.getKV<CareerProject[]>(PROJECTS_KEY, [])
    if (saved.length === 0) {
      const seeded = clone(DEFAULT_PROJECTS)
      storage.setKV(PROJECTS_KEY, seeded)
      return seeded
    }
    return saved
  } catch {
    return DEFAULT_PROJECTS
  }
}
