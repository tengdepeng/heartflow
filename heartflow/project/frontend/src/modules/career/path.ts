// ============================================================
// 业脉 · 职业路径可视化 + 网络分析
// 职业路径构建 + 人脉统计 + 脉动指数
// ============================================================

import { storage } from '@/engine/storage'
import type {
  Contact, CareerConnection, CareerProject, CareerPosition,
  CareerPathNode, NetworkStats, NetworkTier, NodeType,
  ConnectionType, ProjectStatus,
} from './types'
import { CAREER_STORAGE_KEYS, TIER_META, NODE_TYPE_DEFS } from './types'

/**
 * 业脉职业路径引擎
 */
export function useCareerPath() {
  const contacts = ref<Contact[]>([])
  const connections = ref<CareerConnection[]>([])
  const projects = ref<CareerProject[]>([])
  const positions = ref<CareerPosition[]>([])

  async function load(): Promise<void> {
    const [savedContacts, savedConnections, savedProjects, savedPositions] = await Promise.all([
      storage.getKV<Contact[]>(CAREER_STORAGE_KEYS.CONTACTS, []),
      storage.getKV<CareerConnection[]>(CAREER_STORAGE_KEYS.CONNECTIONS, []),
      storage.getKV<CareerProject[]>(CAREER_STORAGE_KEYS.PROJECTS, []),
      storage.getKV<CareerPosition[]>(CAREER_STORAGE_KEYS.POSITIONS, []),
    ])
    contacts.value = savedContacts
    connections.value = savedConnections
    projects.value = savedProjects
    positions.value = savedPositions
  }

  /**
   * 添加联系人
   */
  async function addContact(
    name: string,
    role: string,
    tier: NetworkTier,
    nodeType: NodeType,
    affinity: number,
    tags: string[],
    note?: string
  ): Promise<Contact> {
    const contact: Contact = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      role,
      tier,
      nodeType,
      affinity,
      tags,
      note,
      firstContactAt: new Date().toISOString(),
      contactCount: 0,
    }
    contacts.value.push(contact)
    await persistContacts()
    return contact
  }

  /**
   * 记录联系
   */
  async function recordContact(contactId: string): Promise<void> {
    const contact = contacts.value.find((c) => c.id === contactId)
    if (contact) {
      contact.lastContactAt = new Date().toISOString()
      contact.contactCount++
      await persistContacts()
    }
  }

  /**
   * 添加连接
   */
  async function addConnection(
    fromId: string,
    toId: string,
    type: ConnectionType,
    strength: number,
    description?: string
  ): Promise<CareerConnection> {
    const conn: CareerConnection = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      fromId,
      toId,
      type,
      strength,
      description,
      createdAt: new Date().toISOString(),
    }
    connections.value.push(conn)
    await persistConnections()
    return conn
  }

  /**
   * 添加项目
   */
  async function addProject(
    name: string,
    description: string,
    status: ProjectStatus,
    partners: string[],
    color?: string
  ): Promise<CareerProject> {
    const statusLabels: Record<ProjectStatus, string> = {
      active: '进行中',
      completed: '已完成',
      paused: '暂停',
      planning: '规划中',
    }

    const project: CareerProject = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name,
      icon: '📋',
      description,
      color: color || '#6b9fc4',
      status,
      statusLabel: statusLabels[status],
      partners,
      startDate: new Date().toISOString(),
    }
    projects.value.push(project)
    await persistProjects()
    return project
  }

  /**
   * 添加职业职位
   */
  async function addPosition(
    title: string,
    organization: string,
    startDate: string,
    description: string,
    skills: string[],
    achievements: string[],
    endDate?: string
  ): Promise<CareerPosition> {
    const position: CareerPosition = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title,
      organization,
      startDate,
      endDate,
      description,
      skills,
      achievements,
    }
    positions.value.push(position)
    // 按时间排序
    positions.value.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    await persistPositions()
    return position
  }

  /**
   * 构建职业路径
   */
  function buildCareerPath(): CareerPathNode[] {
    if (positions.value.length === 0) return []

    // 按时间排序
    const sorted = [...positions.value].sort(
      (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )

    const nodes: CareerPathNode[] = sorted.map((pos, index) => {
      // 检测是否为关键转折点（组织变更或角色层级跳跃）
      const isPivot =
        index > 0 &&
        (pos.organization !== sorted[index - 1].organization ||
          pos.skills.some((s) => !sorted[index - 1].skills.includes(s)))

      return {
        id: pos.id,
        position: pos,
        level: index,
        parentId: index > 0 ? sorted[index - 1].id : undefined,
        isPivot,
      }
    })

    return nodes
  }

  /**
   * 获取网络统计
   */
  function getNetworkStats(): NetworkStats {
    const totalContacts = contacts.value.length
    const activeProjects = projects.value.filter((p) => p.status === 'active').length

    // 圈层分布
    const tierDistribution: Record<NetworkTier, number> = {
      core: 0, active: 0, extended: 0, peripheral: 0,
    }
    for (const c of contacts.value) {
      tierDistribution[c.tier]++
    }

    // 节点类型分布
    const nodeTypeDistribution: Record<NodeType, number> = {} as Record<NodeType, number>
    for (const def of NODE_TYPE_DEFS) {
      nodeTypeDistribution[def.id] = 0
    }
    for (const c of contacts.value) {
      nodeTypeDistribution[c.nodeType] = (nodeTypeDistribution[c.nodeType] || 0) + 1
    }

    // 平均亲密度
    const avgAffinity = totalContacts > 0
      ? Math.round(contacts.value.reduce((sum, c) => sum + c.affinity, 0) / totalContacts * 10) / 10
      : 0

    // 最近活跃度（30天内有联系的比例）
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentActive = contacts.value.filter(
      (c) => c.lastContactAt && new Date(c.lastContactAt) >= thirtyDaysAgo
    ).length
    const recentActivity = totalContacts > 0
      ? Math.round((recentActive / totalContacts) * 100)
      : 0

    // 脉动指数
    const pulseIndex = Math.round(
      (totalContacts * 0.3 + activeProjects * 10 + recentActivity * 0.5 + avgAffinity * 5)
    )

    return {
      totalContacts,
      activeProjects,
      pulseIndex,
      tierDistribution,
      nodeTypeDistribution,
      avgAffinity,
      recentActivity,
    }
  }

  /**
   * 获取联系人所在圈层信息
   */
  function getTierInfo(tier: NetworkTier): { label: string; color: string; radius: number; description: string } {
    return TIER_META[tier]
  }

  /**
   * 推荐升级圈层的联系人
   */
  function suggestTierUpgrade(): { contact: Contact; fromTier: NetworkTier; toTier: NetworkTier; reason: string }[] {
    const suggestions: { contact: Contact; fromTier: NetworkTier; toTier: NetworkTier; reason: string }[] = []
    const tierOrder: NetworkTier[] = ['peripheral', 'extended', 'active', 'core']

    for (const contact of contacts.value) {
      const currentIndex = tierOrder.indexOf(contact.tier)
      if (currentIndex >= tierOrder.length - 1) continue

      const nextTier = tierOrder[currentIndex + 1]

      // 升级条件：高亲密度 + 多次联系
      if (contact.affinity >= 7 && contact.contactCount >= 5) {
        suggestions.push({
          contact,
          fromTier: contact.tier,
          toTier: nextTier,
          reason: `亲密度 ${contact.affinity}/10，已联系 ${contact.contactCount} 次`,
        })
      }
    }

    return suggestions
  }

  /**
   * 获取联系人之间的最短路径
   */
  function findShortestPath(fromId: string, toId: string): Contact[] {
    if (fromId === toId) return [contacts.value.find((c) => c.id === fromId)!].filter(Boolean)

    const visited = new Set<string>()
    const queue: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }]
    visited.add(fromId)

    while (queue.length > 0) {
      const current = queue.shift()!
      const neighbors = connections.value
        .filter((c) => c.fromId === current.id || c.toId === current.id)
        .map((c) => (c.fromId === current.id ? c.toId : c.fromId))

      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue
        const newPath = [...current.path, neighbor]
        if (neighbor === toId) {
          return newPath.map((id) => contacts.value.find((c) => c.id === id)!).filter(Boolean)
        }
        visited.add(neighbor)
        queue.push({ id: neighbor, path: newPath })
      }
    }

    return []
  }

  async function persistContacts(): Promise<void> {
    await storage.setKV(CAREER_STORAGE_KEYS.CONTACTS, contacts.value)
  }
  async function persistConnections(): Promise<void> {
    await storage.setKV(CAREER_STORAGE_KEYS.CONNECTIONS, connections.value)
  }
  async function persistProjects(): Promise<void> {
    await storage.setKV(CAREER_STORAGE_KEYS.PROJECTS, projects.value)
  }
  async function persistPositions(): Promise<void> {
    await storage.setKV(CAREER_STORAGE_KEYS.POSITIONS, positions.value)
  }

  load()

  return {
    contacts,
    connections,
    projects,
    positions,
    addContact,
    recordContact,
    addConnection,
    addProject,
    addPosition,
    buildCareerPath,
    getNetworkStats,
    getTierInfo,
    suggestTierUpgrade,
    findShortestPath,
    load,
  }
}

import { ref } from 'vue'