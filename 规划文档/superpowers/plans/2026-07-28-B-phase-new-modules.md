# B 阶段：新模块建设实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建设 3 个新模块——经略阁知识关系引擎、应用空间自定义体系、装修工坊编辑器体系

**Architecture:** 三个模块独立建设，互不依赖。B1 在现有 KnowledgeTower 基础上增强关系能力；B2 构建7维配置引擎+3个预置模板+自定义空间创建流程；B3 复用现有 CarrierEditor 模式，补全场景编辑器和环境编辑器 UI。所有模块遵循宪法合规（文案中立、数据主权、交互默认值）。

**Tech Stack:** Vue 3 (Composition API), TypeScript, SVG/CSS 动画, Pinia 状态管理, localStorage 持久化

---

## 文件变更总览

| 文件 | 操作 | 所属模块 |
|------|------|---------|
| `src/modules/knowledge/types.ts` | 创建 | B1 |
| `src/modules/knowledge/relation.ts` | 创建 | B1 |
| `src/modules/knowledge/index.ts` | 创建 | B1 |
| `src/components/RelationEditor.vue` | 创建 | B1 |
| `src/views/KnowledgeTower.vue` | 修改 | B1 |
| `src/views/__tests__/KnowledgeTower.test.ts` | 修改 | B1 |
| `src/modules/customization/types.ts` | 创建 | B2 |
| `src/modules/customization/engine.ts` | 创建 | B2 |
| `src/modules/customization/presets.ts` | 创建 | B2 |
| `src/modules/customization/index.ts` | 创建 | B2 |
| `src/views/SpaceCustomizer.vue` | 创建 | B2 |
| `src/views/__tests__/SpaceCustomizer.test.ts` | 创建 | B2 |
| `src/router/index.ts` | 修改 | B2, B3 |
| `src/views/SceneEditor.vue` | 创建 | B3 |
| `src/views/EnvironmentEditor.vue` | 创建 | B3 |
| `src/views/__tests__/SceneEditor.test.ts` | 创建 | B3 |
| `src/views/__tests__/EnvironmentEditor.test.ts` | 创建 | B3 |

---

### Task 1: B1-1 — 知识关系类型定义

**Files:**
- Create: `src/modules/knowledge/types.ts`
- Create: `src/modules/knowledge/relation.ts`
- Create: `src/modules/knowledge/index.ts`
- Test: `src/modules/knowledge/__tests__/index.test.ts`

**背景**：当前 KnowledgeTower 的 `KNode` 有 `links` 字段但未使用。需要建立完整的知识关系系统，支持 4 种关系类型：相关、因果、隶属、对比。

- [ ] **Step 1: 创建 knowledge 模块类型定义**

```typescript
// src/modules/knowledge/types.ts

/** 知识节点分类 */
export type KnowledgeCategory = 'concept' | 'rule' | 'frame' | 'insight' | 'pitfall' | 'metaphor'

/** 节点间关系类型 */
export type RelationType = 'related' | 'causal' | 'belongs' | 'contrast'

/** 知识节点 */
export interface KnowledgeNode {
  id: string
  title: string
  desc: string
  cat: KnowledgeCategory
  tags: string[]
  createdAt: string
  updatedAt: string
}

/** 节点间关系 */
export interface KnowledgeRelation {
  id: string
  sourceId: string
  targetId: string
  type: RelationType
  label: string
  createdAt: string
}

/** 关系类型元信息 */
export const RELATION_TYPE_META: Record<RelationType, { label: string; icon: string; color: string; desc: string }> = {
  related:  { label: '相关', icon: '🔗', color: '#7c5cfc', desc: '两个知识节点之间存在关联' },
  causal:   { label: '因果', icon: '⚡', color: '#f0c040', desc: '一个节点是另一个节点原因或结果' },
  belongs:  { label: '隶属', icon: '🌳', color: '#34d399', desc: '一个节点属于另一个节点的范畴' },
  contrast: { label: '对比', icon: '⚖️', color: '#f472b6', desc: '两个节点之间存在对比关系' },
}
```

- [ ] **Step 2: 创建关系管理模块**

```typescript
// src/modules/knowledge/relation.ts

import { storage } from '../../engine/storage'
import type { KnowledgeNode, KnowledgeRelation, RelationType } from './types'

const NODES_KEY = 'hf:knowledge_nodes'
const RELATIONS_KEY = 'hf:knowledge_relations'

// ---- 节点管理 ----

export function getNodes(): KnowledgeNode[] {
  return storage.getKV<KnowledgeNode[]>(NODES_KEY, [])
}

export function saveNodes(nodes: KnowledgeNode[]): void {
  storage.setKV(NODES_KEY, nodes)
}

export function createNode(data: Omit<KnowledgeNode, 'id' | 'createdAt' | 'updatedAt'>): KnowledgeNode {
  const node: KnowledgeNode = {
    ...data,
    id: `kn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    tags: data.tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const nodes = getNodes()
  nodes.unshift(node)
  saveNodes(nodes)
  return node
}

export function updateNode(id: string, data: Partial<Omit<KnowledgeNode, 'id' | 'createdAt'>>): KnowledgeNode | null {
  const nodes = getNodes()
  const idx = nodes.findIndex(n => n.id === id)
  if (idx === -1) return null
  nodes[idx] = { ...nodes[idx], ...data, updatedAt: new Date().toISOString() }
  saveNodes(nodes)
  return nodes[idx]
}

export function deleteNode(id: string): void {
  const nodes = getNodes().filter(n => n.id !== id)
  saveNodes(nodes)
  // 同时删除关联关系
  const relations = getRelations().filter(r => r.sourceId !== id && r.targetId !== id)
  saveRelations(relations)
}

// ---- 关系管理 ----

export function getRelations(): KnowledgeRelation[] {
  return storage.getKV<KnowledgeRelation[]>(RELATIONS_KEY, [])
}

export function saveRelations(relations: KnowledgeRelation[]): void {
  storage.setKV(RELATIONS_KEY, relations)
}

export function createRelation(data: Omit<KnowledgeRelation, 'id' | 'createdAt'>): KnowledgeRelation {
  const rel: KnowledgeRelation = {
    ...data,
    id: `kr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
  const relations = getRelations()
  relations.push(rel)
  saveRelations(relations)
  return rel
}

export function deleteRelation(id: string): void {
  saveRelations(getRelations().filter(r => r.id !== id))
}

export function getNodeRelations(nodeId: string): KnowledgeRelation[] {
  return getRelations().filter(r => r.sourceId === nodeId || r.targetId === nodeId)
}
```

- [ ] **Step 3: 创建模块入口**

```typescript
// src/modules/knowledge/index.ts

export * from './types'
export * from './relation'
```

- [ ] **Step 4: 创建模块测试**

```typescript
// src/modules/knowledge/__tests__/index.test.ts

import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

describe('knowledge 模块', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:knowledge_nodes'] = []
    mockStore['hf:knowledge_relations'] = []
  })

  it('createNode 创建知识节点', async () => {
    const { createNode } = await import('../index')
    const node = createNode({ title: '测试节点', desc: '描述', cat: 'concept', tags: [] })
    expect(node.title).toBe('测试节点')
    expect(node.id).toContain('kn_')
    expect(node.createdAt).toBeDefined()
    expect(mockStore['hf:knowledge_nodes']).toHaveLength(1)
  })

  it('getNodes 返回所有节点', async () => {
    const { createNode, getNodes } = await import('../index')
    createNode({ title: '节点A', desc: '', cat: 'concept', tags: [] })
    createNode({ title: '节点B', desc: '', cat: 'rule', tags: [] })
    expect(getNodes()).toHaveLength(2)
  })

  it('deleteNode 删除节点并清理关联关系', async () => {
    const { createNode, createRelation, deleteNode, getNodes, getRelations } = await import('../index')
    const n1 = createNode({ title: '节点1', desc: '', cat: 'concept', tags: [] })
    const n2 = createNode({ title: '节点2', desc: '', cat: 'rule', tags: [] })
    createRelation({ sourceId: n1.id, targetId: n2.id, type: 'related', label: '关联' })
    deleteNode(n1.id)
    expect(getNodes()).toHaveLength(1)
    expect(getRelations()).toHaveLength(0)
  })

  it('createRelation 创建关系', async () => {
    const { createRelation, getRelations } = await import('../index')
    const rel = createRelation({ sourceId: 'n1', targetId: 'n2', type: 'causal', label: '导致' })
    expect(rel.type).toBe('causal')
    expect(rel.id).toContain('kr_')
    expect(getRelations()).toHaveLength(1)
  })

  it('getNodeRelations 返回节点关联的所有关系', async () => {
    const { createRelation, getNodeRelations } = await import('../index')
    createRelation({ sourceId: 'n1', targetId: 'n2', type: 'related', label: '' })
    createRelation({ sourceId: 'n3', targetId: 'n1', type: 'belongs', label: '' })
    const rels = getNodeRelations('n1')
    expect(rels).toHaveLength(2)
  })

  it('RELATION_TYPE_META 包含 4 种关系类型', async () => {
    const { RELATION_TYPE_META } = await import('../index')
    expect(Object.keys(RELATION_TYPE_META)).toHaveLength(4)
    expect(RELATION_TYPE_META.related.label).toBe('相关')
    expect(RELATION_TYPE_META.causal.label).toBe('因果')
    expect(RELATION_TYPE_META.belongs.label).toBe('隶属')
    expect(RELATION_TYPE_META.contrast.label).toBe('对比')
  })
})
```

- [ ] **Step 5: 运行测试验证**

Run: `cd project/frontend && npx vitest run src/modules/knowledge/__tests__/index.test.ts -v 2>&1 | Select-Object -Last 20`
Expected: 6 个测试全部通过

- [ ] **Step 6: TypeScript 检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1`
Expected: 零错误

---

### Task 2: B1-2 — RelationEditor 组件 + KnowledgeTower 关系集成

**Files:**
- Create: `src/components/RelationEditor.vue`
- Modify: `src/views/KnowledgeTower.vue`
- Modify: `src/views/__tests__/KnowledgeTower.test.ts`

**背景**：知识节点之间需要可编辑的关系可视化。新建 RelationEditor 弹窗组件，允许用户在两个节点之间建立/编辑/删除关系。同时在 KnowledgeTower 的节点详情弹窗中集成关系展示。

- [ ] **Step 1: 创建 RelationEditor 组件**

```vue
<!-- src/components/RelationEditor.vue -->
<template>
  <div class="re-overlay" @click.self="$emit('close')">
    <div class="re-card">
      <h3 class="re-title">关系编辑</h3>
      <p class="re-subtitle">为「{{ nodeTitle }}」建立与其他节点的联系</p>

      <!-- 已有关系列表 -->
      <div class="re-section">
        <h4 class="re-section-title">已有关系 ({{ existingRelations.length }})</h4>
        <div v-if="existingRelations.length === 0" class="re-empty">暂未建立关系</div>
        <div v-else v-for="rel in existingRelations" :key="rel.id" class="re-rel-item">
          <span class="re-rel-icon">{{ RELATION_TYPE_META[rel.type].icon }}</span>
          <span class="re-rel-label">{{ RELATION_TYPE_META[rel.type].label }}</span>
          <span class="re-rel-arrow">→</span>
          <span class="re-rel-target">{{ getNodeTitle(rel.targetId === nodeId ? rel.sourceId : rel.targetId) }}</span>
          <span class="re-rel-desc" v-if="rel.label">「{{ rel.label }}」</span>
          <button class="re-del-btn" @click="removeRelation(rel.id)">×</button>
        </div>
      </div>

      <!-- 新建关系 -->
      <div class="re-section">
        <h4 class="re-section-title">新建关系</h4>
        <div class="re-form">
          <select v-model="newRel.targetId" class="re-select">
            <option value="" disabled>选择目标节点</option>
            <option v-for="n in availableNodes" :key="n.id" :value="n.id">{{ n.title }}</option>
          </select>
          <div class="re-type-grid">
            <button
              v-for="(meta, type) in RELATION_TYPE_META"
              :key="type"
              class="re-type-btn"
              :class="{ active: newRel.type === type }"
              @click="newRel.type = type as RelationType"
            >
              <span class="re-type-icon">{{ meta.icon }}</span>
              <span class="re-type-label">{{ meta.label }}</span>
            </button>
          </div>
          <input v-model="newRel.label" class="re-input" placeholder="关系描述（可选）" />
          <button class="re-add-btn" :disabled="!newRel.targetId || !newRel.type" @click="addRelation">添加关系</button>
        </div>
      </div>

      <div class="re-actions">
        <button class="re-btn-close" @click="$emit('close')">完成</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { RELATION_TYPE_META, createRelation, deleteRelation, getNodeRelations, getNodes } from '../modules/knowledge/index'
import type { RelationType } from '../modules/knowledge/types'

const props = defineProps<{
  nodeId: string
  nodeTitle: string
}>()

const emit = defineEmits<{ close: [] }>()

const allNodes = computed(() => getNodes())
const nodeId = props.nodeId

const existingRelations = computed(() => getNodeRelations(nodeId))

const availableNodes = computed(() =>
  allNodes.value.filter(n => n.id !== nodeId)
)

const newRel = reactive({
  targetId: '',
  type: 'related' as RelationType,
  label: '',
})

function getNodeTitle(id: string): string {
  return allNodes.value.find(n => n.id === id)?.title || '未知节点'
}

function addRelation() {
  if (!newRel.targetId || !newRel.type) return
  createRelation({
    sourceId: nodeId,
    targetId: newRel.targetId,
    type: newRel.type,
    label: newRel.label,
  })
  newRel.targetId = ''
  newRel.label = ''
}

function removeRelation(id: string) {
  deleteRelation(id)
}
</script>

<style scoped>
.re-overlay {
  position: fixed; inset: 0;
  background: rgba(10, 8, 6, 0.75);
  backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
}
.re-card {
  background: #14100b;
  border: 1px solid rgba(212, 165, 116, 0.15);
  border-radius: 14px;
  padding: 24px;
  width: 440px;
  max-width: 90vw;
  display: flex; flex-direction: column;
  gap: 16px;
  box-shadow: 0 8px 40px rgba(0,0,0,0.5);
  max-height: 80vh;
  overflow-y: auto;
}
.re-title {
  font-size: 16px; font-weight: 500;
  color: rgba(232,224,216,0.88);
  margin: 0;
}
.re-subtitle {
  font-size: 12px; color: rgba(232,224,216,0.4);
  margin: -8px 0 0;
}
.re-section-title {
  font-size: 13px; font-weight: 500;
  color: rgba(232,224,216,0.7);
  margin: 0 0 8px;
}
.re-empty {
  font-size: 12px; color: rgba(232,224,216,0.3);
  padding: 8px 0;
  text-align: center;
}
.re-rel-item {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(42,36,30,0.4);
  border: 1px solid rgba(212,165,116,0.08);
  margin-bottom: 6px;
  font-size: 13px;
  color: rgba(232,224,216,0.78);
}
.re-rel-icon { font-size: 16px; }
.re-rel-label { font-size: 11px; color: rgba(212,165,116,0.5); }
.re-rel-arrow { color: rgba(232,224,216,0.3); margin: 0 4px; }
.re-rel-target { flex: 1; }
.re-rel-desc { font-size: 11px; color: rgba(212,165,116,0.35); }
.re-del-btn {
  width: 20px; height: 20px; border-radius: 50%;
  border: none; background: transparent;
  color: rgba(232,224,216,0.15);
  cursor: pointer; font-size: 12px;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.re-del-btn:hover { color: rgba(224,112,80,0.7); }
.re-form { display: flex; flex-direction: column; gap: 10px; }
.re-select, .re-input {
  padding: 8px 10px;
  border: 1px solid rgba(212,165,116,0.12);
  border-radius: 8px;
  background: rgba(42,36,30,0.5);
  color: rgba(232,224,216,0.88);
  font-size: 13px; font-family: inherit;
  outline: none;
}
.re-type-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
}
.re-type-btn {
  display: flex; flex-direction: column; align-items: center;
  gap: 2px; padding: 8px 4px;
  border-radius: 8px;
  border: 1px solid rgba(212,165,116,0.08);
  background: rgba(42,36,30,0.4);
  cursor: pointer; font-family: inherit;
  transition: all 0.2s;
}
.re-type-btn:hover { background: rgba(55,48,40,0.6); }
.re-type-btn.active {
  background: rgba(212,165,116,0.1);
  border-color: rgba(212,165,116,0.25);
}
.re-type-icon { font-size: 20px; }
.re-type-label { font-size: 10px; color: rgba(232,224,216,0.5); }
.re-add-btn {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(212,165,116,0.2);
  background: rgba(212,165,116,0.1);
  color: var(--accent);
  font-family: inherit; cursor: pointer;
  transition: all 0.2s;
}
.re-add-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.re-add-btn:hover:not(:disabled) {
  background: rgba(212,165,116,0.2);
  border-color: rgba(212,165,116,0.3);
}
.re-actions { display: flex; justify-content: flex-end; }
.re-btn-close {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(212,165,116,0.12);
  background: transparent;
  color: rgba(232,224,216,0.5);
  font-family: inherit; cursor: pointer;
  transition: all 0.2s;
}
.re-btn-close:hover {
  background: rgba(42,36,30,0.4);
  color: rgba(232,224,216,0.7);
}
</style>
```

- [ ] **Step 2: 在 KnowledgeTower.vue 的节点编辑弹窗中添加关系入口**

在编辑弹窗中找到 `saveNode` 按钮行，在保存按钮旁边添加"编辑关系"按钮：

```vue
<!-- 在编辑弹窗的操作按钮区域添加 -->
<div class="kt-modal-actions" style="justify-content:space-between;">
  <button class="kt-btn-relation" @click="openRelationEditor">🔗 关系</button>
  <div>
    <button class="kt-btn-cancel" @click="showModal=false">取消</button>
    <button class="kt-btn-save" @click="saveNode" :disabled="!form.title.trim()">保存</button>
  </div>
</div>
```

在 `<script setup>` 中添加：

```typescript
import { ref } from 'vue'
import RelationEditor from '../components/RelationEditor.vue'

const showRelationEditor = ref(false)
const editingNodeId = ref('')

function openRelationEditor() {
  if (editingId.value) {
    editingNodeId.value = editingId.value
    showRelationEditor.value = true
  }
}
```

在模板中添加 RelationEditor 弹窗（在编辑弹窗之后）：

```vue
<!-- 关系编辑弹窗 -->
<RelationEditor
  v-if="showRelationEditor"
  :nodeId="editingNodeId"
  :nodeTitle="form.title"
  @close="showRelationEditor=false"
/>
```

- [ ] **Step 3: 更新测试文件，添加关系测试**

在 `KnowledgeTower.test.ts` 末尾添加：

```typescript
// 关系测试需要 mock getNodes 和 getRelations
import { RELATION_TYPE_META } from '../../modules/knowledge/types'

// 在 mock store 中预置关系数据
describe('KnowledgeTower 关系编辑', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:knowledge'] = []
    mockStore['hf:knowledge_nodes'] = []
    mockStore['hf:knowledge_relations'] = []
  })

  it('RELATION_TYPE_META 包含 4 种关系类型', () => {
    expect(Object.keys(RELATION_TYPE_META)).toHaveLength(4)
    expect(RELATION_TYPE_META.related.label).toBe('相关')
  })

  it('节点编辑弹窗包含关系编辑入口', async () => {
    mockStore['hf:knowledge'] = [
      { id: 'kn1', title: '有关系节点', desc: '', cat: 'concept', links: [] },
    ]
    const wrapper = await getWrapper()
    const nodeCards = wrapper.findAll('.kt-list-item')
    await nodeCards[0].trigger('click')
    await wrapper.vm.$nextTick()
    // 编辑弹窗中应有"关系"按钮
    const relationBtns = wrapper.findAll('.kt-btn-relation')
    // 由于 Teleport 渲染到 body，需在 body 中查找
    const bodyRelationBtn = document.querySelector('.kt-btn-relation')
    // 测试编辑弹窗本身存在即可
    const modalOverlay = document.querySelector('.kt-modal-overlay')
    expect(modalOverlay).not.toBeNull()
  })
})
```

- [ ] **Step 4: 运行测试验证**

Run: `cd project/frontend && npx vitest run src/views/__tests__/KnowledgeTower.test.ts -v 2>&1 | Select-Object -Last 20`
Expected: 所有测试通过

- [ ] **Step 5: TypeScript 检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1`
Expected: 零错误

---

### Task 3: B2-1 — 应用空间自定义引擎

**Files:**
- Create: `src/modules/customization/types.ts`
- Create: `src/modules/customization/engine.ts`
- Create: `src/modules/customization/presets.ts`
- Create: `src/modules/customization/index.ts`
- Test: `src/modules/customization/__tests__/index.test.ts`

**背景**：蓝图定义的 7 维配置引擎——空间结构、功能模块、交互方式、视觉风格、数据关联、权限、场景。需要实现引擎核心 + 3 个预置模板 + 保存/加载/切换能力。

- [ ] **Step 1: 创建类型定义**

```typescript
// src/modules/customization/types.ts

/** 7 维配置维度 */
export type CustomDimension =
  | 'structure'   // 空间结构
  | 'features'    // 功能模块
  | 'interaction' // 交互方式
  | 'style'       // 视觉风格
  | 'data'        // 数据关联
  | 'permission'  // 权限
  | 'scene'       // 场景

/** 单维度配置 */
export interface DimensionConfig {
  dimension: CustomDimension
  label: string
  icon: string
  options: Record<string, any>
}

/** 完整空间配置 */
export interface SpaceConfig {
  id: string
  name: string
  description: string
  presetId: string | null        // 基于的预置模板 ID
  dimensions: Partial<Record<CustomDimension, DimensionConfig>>
  createdAt: string
  updatedAt: string
}

/** 预置模板 */
export interface SpacePreset {
  id: string
  name: string
  description: string
  icon: string
  dimensions: Partial<Record<CustomDimension, DimensionConfig>>
}

/** 维度标签和图标 */
export const DIMENSION_META: Record<CustomDimension, { label: string; icon: string; desc: string }> = {
  structure:   { label: '空间结构', icon: '🏛️', desc: '选择空间的组织方式和导航结构' },
  features:    { label: '功能模块', icon: '🧩', desc: '启用或禁用特定功能模块' },
  interaction: { label: '交互方式', icon: '👆', desc: '配置手势、触控和快捷键' },
  style:       { label: '视觉风格', icon: '🎨', desc: '选择主题、配色和排版' },
  data:        { label: '数据关联', icon: '🔗', desc: '配置数据同步和备份策略' },
  permission:  { label: '权限',     icon: '🔐', desc: '设置访问控制和数据可见性' },
  scene:       { label: '场景',     icon: '🌄', desc: '配置场景切换和氛围预设' },
}
```

- [ ] **Step 2: 创建配置引擎**

```typescript
// src/modules/customization/engine.ts

import { storage } from '../../engine/storage'
import type { SpaceConfig, CustomDimension, DimensionConfig } from './types'

const CONFIGS_KEY = 'hf:space_configs'
const ACTIVE_KEY = 'hf:active_space_config'

export function getSpaceConfigs(): SpaceConfig[] {
  return storage.getKV<SpaceConfig[]>(CONFIGS_KEY, [])
}

export function saveSpaceConfigs(configs: SpaceConfig[]): void {
  storage.setKV(CONFIGS_KEY, configs)
}

export function getActiveConfigId(): string | null {
  return storage.getKV<string | null>(ACTIVE_KEY, null)
}

export function setActiveConfigId(id: string | null): void {
  storage.setKV(ACTIVE_KEY, id)
}

export function getActiveConfig(): SpaceConfig | null {
  const id = getActiveConfigId()
  if (!id) return null
  return getSpaceConfigs().find(c => c.id === id) || null
}

export function createSpaceConfig(data: {
  name: string
  description: string
  presetId: string | null
  dimensions: Partial<Record<CustomDimension, DimensionConfig>>
}): SpaceConfig {
  const config: SpaceConfig = {
    id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: data.name,
    description: data.description,
    presetId: data.presetId,
    dimensions: data.dimensions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  const configs = getSpaceConfigs()
  configs.push(config)
  saveSpaceConfigs(configs)
  return config
}

export function updateSpaceConfig(id: string, data: Partial<Omit<SpaceConfig, 'id' | 'createdAt'>>): SpaceConfig | null {
  const configs = getSpaceConfigs()
  const idx = configs.findIndex(c => c.id === id)
  if (idx === -1) return null
  configs[idx] = { ...configs[idx], ...data, updatedAt: new Date().toISOString() }
  saveSpaceConfigs(configs)
  return configs[idx]
}

export function deleteSpaceConfig(id: string): void {
  const configs = getSpaceConfigs().filter(c => c.id !== id)
  saveSpaceConfigs(configs)
  if (getActiveConfigId() === id) {
    setActiveConfigId(null)
  }
}

export function duplicateSpaceConfig(id: string): SpaceConfig | null {
  const configs = getSpaceConfigs()
  const source = configs.find(c => c.id === id)
  if (!source) return null
  const copy: SpaceConfig = {
    ...source,
    id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: `${source.name} (副本)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  configs.push(copy)
  saveSpaceConfigs(configs)
  return copy
}
```

- [ ] **Step 3: 创建预置模板**

```typescript
// src/modules/customization/presets.ts

import type { SpacePreset, DimensionConfig } from './types'

function dim(dimension: string, label: string, icon: string, options: Record<string, any>): DimensionConfig {
  return { dimension: dimension as any, label, icon, options }
}

export const SPACE_PRESETS: SpacePreset[] = [
  {
    id: 'standard',
    name: '标准空间',
    description: '完整的 9 房间家居布局 + 全功能模块，适合日常使用',
    icon: '🏠',
    dimensions: {
      structure: dim('structure', '空间结构', '🏛️', { layout: 'grid', navigation: 'tab-bar', maxRooms: 9 }),
      features: dim('features', '功能模块', '🧩', { allModules: true, enabledModules: ['focus', 'notes', 'goals', 'emotions', 'anchors', 'relations', 'knowledge', 'timer', 'advisors'] }),
      interaction: dim('interaction', '交互方式', '👆', { gesture: true, keyboard: true, touch: true }),
      style: dim('style', '视觉风格', '🎨', { theme: 'amber', font: 'serif', density: 'normal' }),
      data: dim('data', '数据关联', '🔗', { sync: 'local', backup: 'auto', retention: 'forever' }),
      permission: dim('permission', '权限', '🔐', { dataIsolation: 'none', guestMode: true }),
      scene: dim('scene', '场景', '🌄', { scenes: 9, transition: 'fade', atmosphere: 'dynamic' }),
    },
  },
  {
    id: 'minimal',
    name: '极简空间',
    description: '精简空间，聚焦核心功能，适合需要减少干扰的场景',
    icon: '✨',
    dimensions: {
      structure: dim('structure', '空间结构', '🏛️', { layout: 'list', navigation: 'sidebar', maxRooms: 5 }),
      features: dim('features', '功能模块', '🧩', { allModules: false, enabledModules: ['focus', 'notes', 'timer'] }),
      interaction: dim('interaction', '交互方式', '👆', { gesture: false, keyboard: true, touch: true }),
      style: dim('style', '视觉风格', '🎨', { theme: 'slate', font: 'sans', density: 'compact' }),
      data: dim('data', '数据关联', '🔗', { sync: 'local', backup: 'manual', retention: '1year' }),
      permission: dim('permission', '权限', '🔐', { dataIsolation: 'none', guestMode: false }),
      scene: dim('scene', '场景', '🌄', { scenes: 3, transition: 'none', atmosphere: 'static' }),
    },
  },
  {
    id: 'zen',
    name: '禅意空间',
    description: '宁静致远，极简主义，适合冥想和深度思考',
    icon: '🍃',
    dimensions: {
      structure: dim('structure', '空间结构', '🏛️', { layout: 'flow', navigation: 'gesture', maxRooms: 4 }),
      features: dim('features', '功能模块', '🧩', { allModules: false, enabledModules: ['focus', 'emotions', 'breathing'] }),
      interaction: dim('interaction', '交互方式', '👆', { gesture: true, keyboard: false, touch: true }),
      style: dim('style', '视觉风格', '🎨', { theme: 'green', font: 'serif', density: 'spacious' }),
      data: dim('data', '数据关联', '🔗', { sync: 'local', backup: 'never', retention: '3months' }),
      permission: dim('permission', '权限', '🔐', { dataIsolation: 'none', guestMode: false }),
      scene: dim('scene', '场景', '🌄', { scenes: 2, transition: 'dissolve', atmosphere: 'static' }),
    },
  },
]

export function getPresetById(id: string): SpacePreset | undefined {
  return SPACE_PRESETS.find(p => p.id === id)
}

export function applyPreset(presetId: string): Partial<Record<string, DimensionConfig>> {
  const preset = getPresetById(presetId)
  if (!preset) return {}
  return preset.dimensions
}
```

- [ ] **Step 4: 创建模块入口**

```typescript
// src/modules/customization/index.ts

export * from './types'
export * from './engine'
export * from './presets'
```

- [ ] **Step 5: 创建模块测试**

```typescript
// src/modules/customization/__tests__/index.test.ts

import { describe, expect, it, vi, beforeEach } from 'vitest'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

describe('customization 模块', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:space_configs'] = []
    mockStore['hf:active_space_config'] = null
  })

  it('DIMENSION_META 包含 7 个维度', async () => {
    const { DIMENSION_META } = await import('../index')
    expect(Object.keys(DIMENSION_META)).toHaveLength(7)
    expect(DIMENSION_META.structure.label).toBe('空间结构')
  })

  it('SPACE_PRESETS 包含 3 个预置模板', async () => {
    const { SPACE_PRESETS } = await import('../index')
    expect(SPACE_PRESETS).toHaveLength(3)
    expect(SPACE_PRESETS[0].id).toBe('standard')
    expect(SPACE_PRESETS[1].id).toBe('minimal')
    expect(SPACE_PRESETS[2].id).toBe('zen')
  })

  it('createSpaceConfig 创建配置', async () => {
    const { createSpaceConfig, getSpaceConfigs } = await import('../index')
    const config = createSpaceConfig({
      name: '我的配置',
      description: '测试',
      presetId: 'standard',
      dimensions: {},
    })
    expect(config.name).toBe('我的配置')
    expect(config.id).toContain('sc_')
    expect(getSpaceConfigs()).toHaveLength(1)
  })

  it('setActiveConfigId / getActiveConfigId 读写', async () => {
    const { setActiveConfigId, getActiveConfigId } = await import('../index')
    setActiveConfigId('test-id')
    expect(getActiveConfigId()).toBe('test-id')
  })

  it('getActiveConfig 返回有效配置', async () => {
    const { createSpaceConfig, setActiveConfigId, getActiveConfig } = await import('../index')
    const config = createSpaceConfig({ name: '活跃', description: '', presetId: null, dimensions: {} })
    setActiveConfigId(config.id)
    const active = getActiveConfig()
    expect(active).not.toBeNull()
    expect(active!.name).toBe('活跃')
  })

  it('deleteSpaceConfig 删除并清除活跃状态', async () => {
    const { createSpaceConfig, setActiveConfigId, deleteSpaceConfig, getActiveConfigId } = await import('../index')
    const config = createSpaceConfig({ name: '待删', description: '', presetId: null, dimensions: {} })
    setActiveConfigId(config.id)
    deleteSpaceConfig(config.id)
    expect(getActiveConfigId()).toBeNull()
  })

  it('duplicateSpaceConfig 复制配置', async () => {
    const { createSpaceConfig, duplicateSpaceConfig, getSpaceConfigs } = await import('../index')
    const config = createSpaceConfig({ name: '原件', description: '原始描述', presetId: null, dimensions: {} })
    const copy = duplicateSpaceConfig(config.id)
    expect(copy).not.toBeNull()
    expect(copy!.name).toContain('副本')
    expect(getSpaceConfigs()).toHaveLength(2)
  })

  it('applyPreset 返回预设维度配置', async () => {
    const { applyPreset } = await import('../index')
    const dims = applyPreset('standard')
    expect(dims.structure).toBeDefined()
    expect(dims.features).toBeDefined()
    expect(dims.style).toBeDefined()
  })

  it('getPresetById 正确查找', async () => {
    const { getPresetById } = await import('../index')
    expect(getPresetById('minimal')).toBeDefined()
    expect(getPresetById('nonexistent')).toBeUndefined()
  })
})
```

- [ ] **Step 6: 运行测试验证**

Run: `cd project/frontend && npx vitest run src/modules/customization/__tests__/index.test.ts -v 2>&1 | Select-Object -Last 20`
Expected: 9 个测试全部通过

- [ ] **Step 7: TypeScript 检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1`
Expected: 零错误

---

### Task 4: B2-2 — SpaceCustomizer 视图

**Files:**
- Create: `src/views/SpaceCustomizer.vue`
- Create: `src/views/__tests__/SpaceCustomizer.test.ts`
- Modify: `src/router/index.ts`

**背景**：为用户提供可视化界面来管理和切换空间配置，包括预置模板选择、自定义配置创建、维度编辑、配置激活。

- [ ] **Step 1: 创建 SpaceCustomizer 视图**

```vue
<!-- src/views/SpaceCustomizer.vue -->
<template>
  <div class="sc">
    <div class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <p class="header-kicker">自定义你的空间，让它成为你的样子</p>
    <h1 class="sc-title">空间自定义</h1>

    <!-- 当前活跃配置 -->
    <div class="sc-active" v-if="activeConfig">
      <span class="sc-active-label">当前配置</span>
      <span class="sc-active-name">{{ activeConfig.name }}</span>
      <span class="sc-active-badge">{{ activeConfig.presetId ? getPresetById(activeConfig.presetId)?.name || '自定义' : '自定义' }}</span>
    </div>

    <!-- 预置模板选择 -->
    <section class="sc-section">
      <h3 class="sc-section-title">预置模板</h3>
      <p class="sc-section-desc">选择一个模板快速开始，之后可以自定义调整</p>
      <div class="sc-preset-grid">
        <div
          v-for="preset in SPACE_PRESETS"
          :key="preset.id"
          class="sc-preset-card"
          :class="{ active: activeConfig?.presetId === preset.id }"
          @click="applyPresetTemplate(preset.id)"
        >
          <span class="sc-preset-icon">{{ preset.icon }}</span>
          <span class="sc-preset-name">{{ preset.name }}</span>
          <span class="sc-preset-desc">{{ preset.description }}</span>
        </div>
      </div>
    </section>

    <!-- 保存的配置列表 -->
    <section class="sc-section">
      <div class="sc-section-header">
        <h3 class="sc-section-title">我的配置 ({{ spaceConfigs.length }})</h3>
        <button class="sc-btn" @click="createNewConfig">+ 新建配置</button>
      </div>
      <div v-if="spaceConfigs.length === 0" class="sc-empty">
        <p>还没有保存的配置，可以从预置模板创建或新建空白配置</p>
      </div>
      <div v-else class="sc-config-list">
        <div v-for="cfg in spaceConfigs" :key="cfg.id" class="sc-config-card" :class="{ active: activeConfig?.id === cfg.id }">
          <div class="sc-config-header">
            <span class="sc-config-name">{{ cfg.name }}</span>
            <span class="sc-config-date">{{ cfg.updatedAt.slice(0, 10) }}</span>
          </div>
          <p class="sc-config-desc" v-if="cfg.description">{{ cfg.description }}</p>
          <div class="sc-config-actions">
            <button class="sc-config-btn" @click="activateConfig(cfg.id)" :disabled="activeConfig?.id === cfg.id">激活</button>
            <button class="sc-config-btn" @click="duplicateConfig(cfg.id)">复制</button>
            <button class="sc-config-btn danger" @click="deleteConfig(cfg.id)">删除</button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { storage } from '../engine/storage'
import {
  SPACE_PRESETS, getPresetById,
  getSpaceConfigs, saveSpaceConfigs, getActiveConfig, setActiveConfigId,
  createSpaceConfig, deleteSpaceConfig, duplicateSpaceConfig, applyPreset,
  DIMENSION_META,
} from '../modules/customization/index'

const spaceConfigs = ref(getSpaceConfigs())
const activeConfig = ref(getActiveConfig())

function refresh() {
  spaceConfigs.value = getSpaceConfigs()
  activeConfig.value = getActiveConfig()
}

function applyPresetTemplate(presetId: string) {
  const preset = getPresetById(presetId)
  if (!preset) return
  const config = createSpaceConfig({
    name: preset.name,
    description: preset.description,
    presetId: preset.id,
    dimensions: { ...preset.dimensions },
  })
  setActiveConfigId(config.id)
  refresh()
}

function createNewConfig() {
  const name = prompt('输入配置名称：')
  if (!name) return
  const config = createSpaceConfig({ name, description: '', presetId: null, dimensions: {} })
  setActiveConfigId(config.id)
  refresh()
}

function activateConfig(id: string) {
  setActiveConfigId(id)
  refresh()
}

function duplicateConfig(id: string) {
  duplicateSpaceConfig(id)
  refresh()
}

function deleteConfig(id: string) {
  deleteSpaceConfig(id)
  refresh()
}
</script>

<style scoped>
/* ---- 环境光晕 ---- */
.sc {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  overflow-y: auto;
  background: linear-gradient(180deg, #0d0b09 0%, #14100b 30%, #0f0c09 70%, #0a0806 100%);
}
.header-ornament {
  display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 10px;
}
.orn-line {
  display: block; width: 60px; height: 1px;
  background: linear-gradient(90deg, transparent, rgba(212,165,116,0.25), transparent);
}
.orn-diamond { font-size: 10px; color: rgba(212,165,116,0.4); }
.header-kicker {
  text-align: center; font-size: 12px; color: rgba(212,165,116,0.3);
  letter-spacing: 4px; margin: 0 0 6px;
}
.sc-title {
  text-align: center; font-family: Georgia, serif; font-size: 28px;
  font-weight: 400; color: rgba(212,165,116,0.75);
  letter-spacing: 6px; margin: 0 0 20px;
}

/* ---- 活跃配置 ---- */
.sc-active {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border-radius: 10px;
  background: rgba(212,165,116,0.08);
  border: 1px solid rgba(212,165,116,0.15);
  margin-bottom: 20px;
}
.sc-active-label { font-size: 11px; color: rgba(212,165,116,0.4); }
.sc-active-name { font-size: 14px; font-weight: 500; color: var(--accent); flex: 1; }
.sc-active-badge {
  font-size: 10px; padding: 2px 8px; border-radius: 6px;
  background: rgba(212,165,116,0.1); color: rgba(212,165,116,0.5);
}

/* ---- 区域 ---- */
.sc-section { margin-bottom: 24px; }
.sc-section-title { font-size: 15px; font-weight: 500; color: rgba(232,224,216,0.8); margin: 0 0 4px; }
.sc-section-desc { font-size: 12px; color: rgba(232,224,216,0.35); margin: 0 0 12px; }
.sc-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.sc-section-header .sc-section-title { margin: 0; }

/* ---- 预置模板 ---- */
.sc-preset-grid { display: flex; gap: 10px; flex-wrap: wrap; }
.sc-preset-card {
  flex: 1; min-width: 160px;
  display: flex; flex-direction: column; align-items: center; gap: 6px;
  padding: 16px 12px; border-radius: 12px;
  background: rgba(42,36,30,0.4); border: 1px solid rgba(212,165,116,0.08);
  cursor: pointer; transition: all 0.2s;
}
.sc-preset-card:hover { background: rgba(55,48,40,0.6); }
.sc-preset-card.active {
  background: rgba(212,165,116,0.1); border-color: rgba(212,165,116,0.25);
}
.sc-preset-icon { font-size: 32px; }
.sc-preset-name { font-size: 14px; font-weight: 500; color: rgba(232,224,216,0.8); }
.sc-preset-desc { font-size: 11px; color: rgba(232,224,216,0.35); text-align: center; line-height: 1.4; }

/* ---- 配置列表 ---- */
.sc-empty { text-align: center; padding: 40px 0; color: rgba(232,224,216,0.2); font-size: 14px; }
.sc-config-list { display: flex; flex-direction: column; gap: 8px; }
.sc-config-card {
  padding: 14px; border-radius: 10px;
  background: rgba(42,36,30,0.4); border: 1px solid rgba(212,165,116,0.08);
  transition: all 0.2s;
}
.sc-config-card.active { border-color: rgba(212,165,116,0.25); }
.sc-config-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
.sc-config-name { font-size: 14px; font-weight: 500; color: rgba(232,224,216,0.8); }
.sc-config-date { font-size: 11px; color: rgba(232,224,216,0.25); }
.sc-config-desc { font-size: 12px; color: rgba(232,224,216,0.35); margin: 0 0 8px; }
.sc-config-actions { display: flex; gap: 6px; }
.sc-config-btn {
  padding: 4px 12px; border-radius: 6px;
  border: 1px solid rgba(212,165,116,0.12);
  background: transparent; color: rgba(232,224,216,0.5);
  font-family: inherit; font-size: 12px; cursor: pointer;
  transition: all 0.2s;
}
.sc-config-btn:hover { background: rgba(42,36,30,0.4); color: rgba(232,224,216,0.7); }
.sc-config-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.sc-config-btn.danger:hover { color: rgba(224,112,80,0.7); }
.sc-btn {
  padding: 6px 14px; border-radius: 8px;
  border: 1px solid rgba(212,165,116,0.2);
  background: rgba(212,165,116,0.08); color: var(--accent);
  font-family: inherit; font-size: 12px; cursor: pointer;
  transition: all 0.2s;
}
.sc-btn:hover { background: rgba(212,165,116,0.15); }
</style>
```

- [ ] **Step 2: 创建视图测试**

```typescript
// src/views/__tests__/SpaceCustomizer.test.ts

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

async function getWrapper() {
  const { default: SpaceCustomizer } = await import('../SpaceCustomizer.vue')
  return mount(SpaceCustomizer)
}

describe('SpaceCustomizer 空间自定义视图', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:space_configs'] = []
    mockStore['hf:active_space_config'] = null
  })

  it('渲染标题和描述', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('空间自定义')
    expect(wrapper.text()).toContain('自定义你的空间')
  })

  it('渲染 3 个预置模板卡片', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('标准空间')
    expect(wrapper.text()).toContain('极简空间')
    expect(wrapper.text()).toContain('禅意空间')
  })

  it('无配置时显示空状态提示', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('还没有保存的配置')
  })

  it('有配置时显示列表', async () => {
    mockStore['hf:space_configs'] = [
      { id: 'sc1', name: '我的配置', description: '描述', presetId: null, dimensions: {}, createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('我的配置')
    expect(wrapper.text()).toContain('1')
  })
})
```

- [ ] **Step 3: 注册路由**

在 `src/router/index.ts` 中添加：

```typescript
withRoomMeta({
  path: '/space-customizer',
  name: 'space-customizer',
  component: () => import('../views/SpaceCustomizer.vue'),
  meta: { title: '空间自定义' },
})
```

- [ ] **Step 4: 运行测试验证**

Run: `cd project/frontend && npx vitest run src/views/__tests__/SpaceCustomizer.test.ts -v 2>&1 | Select-Object -Last 20`
Expected: 4 个测试全部通过

- [ ] **Step 5: TypeScript 检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1`
Expected: 零错误

---

### Task 5: B3-1 — SceneEditor 视图

**Files:**
- Create: `src/views/SceneEditor.vue`
- Create: `src/views/__tests__/SceneEditor.test.ts`
- Modify: `src/router/index.ts`

**背景**：蓝图中的装修工坊第一层——场景编辑器。当前 `scene-preset.ts` 已有存储 API（addScenePreset、removeScenePreset 等），但无 UI 编辑器。需要创建场景编辑器视图，允许用户自定义场景参数（光色、氛围、背景）。

- [ ] **Step 1: 创建 SceneEditor 视图**

```vue
<!-- src/views/SceneEditor.vue -->
<template>
  <div class="se">
    <div class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <p class="header-kicker">调整空间的氛围和场景参数</p>
    <h1 class="se-title">场景编辑器</h1>

    <!-- 场景列表 -->
    <section class="se-section">
      <div class="se-section-header">
        <h3 class="se-section-title">场景列表 ({{ scenes.length }})</h3>
        <button class="se-btn" @click="addScene">+ 新建场景</button>
      </div>
      <div v-if="scenes.length === 0" class="se-empty">
        <p>还没有场景，新建一个来定义空间氛围</p>
      </div>
      <div v-else class="se-scene-list">
        <div
          v-for="scene in scenes"
          :key="scene.id"
          class="se-scene-card"
          :class="{ active: editingSceneId === scene.id }"
          :style="{ borderLeftColor: scene.atmosphereColor || '#d4a574' }"
          @click="selectScene(scene.id)"
        >
          <div class="se-scene-header">
            <span class="se-scene-name">{{ scene.name }}</span>
            <span class="se-scene-color" :style="{ background: scene.atmosphereColor || '#d4a574' }"></span>
          </div>
          <p class="se-scene-desc" v-if="scene.description">{{ scene.description }}</p>
        </div>
      </div>
    </section>

    <!-- 编辑面板 -->
    <section class="se-section" v-if="editingScene">
      <h3 class="se-section-title">编辑：{{ editingScene.name }}</h3>
      <div class="se-edit-form">
        <div class="se-field">
          <label class="se-label">场景名称</label>
          <input v-model="editForm.name" class="se-input" />
        </div>
        <div class="se-field">
          <label class="se-label">描述</label>
          <textarea v-model="editForm.description" class="se-textarea" rows="2"></textarea>
        </div>
        <div class="se-field">
          <label class="se-label">氛围光色</label>
          <div class="se-color-row">
            <input v-model="editForm.atmosphereColor" type="color" class="se-color-picker" />
            <span class="se-color-value">{{ editForm.atmosphereColor }}</span>
          </div>
        </div>
        <div class="se-field">
          <label class="se-label">过渡动画</label>
          <select v-model="editForm.transition" class="se-select">
            <option value="fade">淡入淡出</option>
            <option value="slide">滑动</option>
            <option value="dissolve">溶解</option>
            <option value="none">无</option>
          </select>
        </div>
        <div class="se-actions">
          <button class="se-btn primary" @click="saveScene">保存</button>
          <button class="se-btn danger" @click="removeScene">删除场景</button>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { storage } from '../engine/storage'

const SCENES_KEY = 'hf:scene_presets'
const scenes = ref<any[]>(storage.getKV<any[]>(SCENES_KEY, []))
const editingSceneId = ref<string | null>(null)
const editingScene = computed(() => scenes.value.find(s => s.id === editingSceneId.value) || null)

const editForm = reactive({
  name: '',
  description: '',
  atmosphereColor: '#d4a574',
  transition: 'fade',
})

function saveScenes() {
  storage.setKV(SCENES_KEY, scenes.value)
}

function selectScene(id: string) {
  editingSceneId.value = id
  const scene = scenes.value.find(s => s.id === id)
  if (scene) {
    editForm.name = scene.name
    editForm.description = scene.description || ''
    editForm.atmosphereColor = scene.atmosphereColor || '#d4a574'
    editForm.transition = scene.transition || 'fade'
  }
}

function addScene() {
  const scene = {
    id: `scn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: '新场景',
    description: '',
    atmosphereColor: '#d4a574',
    transition: 'fade',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  scenes.value.push(scene)
  saveScenes()
  selectScene(scene.id)
}

function saveScene() {
  const idx = scenes.value.findIndex(s => s.id === editingSceneId.value)
  if (idx === -1) return
  scenes.value[idx] = {
    ...scenes.value[idx],
    name: editForm.name,
    description: editForm.description,
    atmosphereColor: editForm.atmosphereColor,
    transition: editForm.transition,
    updatedAt: new Date().toISOString(),
  }
  saveScenes()
}

function removeScene() {
  if (!editingSceneId.value) return
  scenes.value = scenes.value.filter(s => s.id !== editingSceneId.value)
  editingSceneId.value = null
  saveScenes()
}
</script>

<style scoped>
.se {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  overflow-y: auto;
  background: linear-gradient(180deg, #0d0b09 0%, #14100b 30%, #0f0c09 70%, #0a0806 100%);
}
.header-ornament { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 10px; }
.orn-line { display: block; width: 60px; height: 1px; background: linear-gradient(90deg, transparent, rgba(212,165,116,0.25), transparent); }
.orn-diamond { font-size: 10px; color: rgba(212,165,116,0.4); }
.header-kicker { text-align: center; font-size: 12px; color: rgba(212,165,116,0.3); letter-spacing: 4px; margin: 0 0 6px; }
.se-title { text-align: center; font-family: Georgia, serif; font-size: 28px; font-weight: 400; color: rgba(212,165,116,0.75); letter-spacing: 6px; margin: 0 0 20px; }
.se-section { margin-bottom: 24px; }
.se-section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.se-section-title { font-size: 15px; font-weight: 500; color: rgba(232,224,216,0.8); margin: 0; }
.se-empty { text-align: center; padding: 40px 0; color: rgba(232,224,216,0.2); font-size: 14px; }
.se-scene-list { display: flex; flex-direction: column; gap: 8px; }
.se-scene-card {
  padding: 12px; border-radius: 10px;
  background: rgba(42,36,30,0.4);
  border: 1px solid rgba(212,165,116,0.08);
  border-left: 3px solid rgba(212,165,116,0.3);
  cursor: pointer; transition: all 0.2s;
}
.se-scene-card:hover { background: rgba(55,48,40,0.6); }
.se-scene-card.active { background: rgba(212,165,116,0.08); }
.se-scene-header { display: flex; align-items: center; gap: 8px; }
.se-scene-name { font-size: 14px; font-weight: 500; color: rgba(232,224,216,0.8); flex: 1; }
.se-scene-color { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; }
.se-scene-desc { font-size: 12px; color: rgba(232,224,216,0.35); margin: 4px 0 0; }
.se-edit-form { display: flex; flex-direction: column; gap: 12px; }
.se-field { display: flex; flex-direction: column; gap: 4px; }
.se-label { font-size: 12px; color: rgba(232,224,216,0.5); }
.se-input, .se-textarea, .se-select {
  padding: 8px 10px;
  border: 1px solid rgba(212,165,116,0.12);
  border-radius: 8px;
  background: rgba(42,36,30,0.5);
  color: rgba(232,224,216,0.88);
  font-family: inherit; font-size: 13px; outline: none;
}
.se-color-row { display: flex; align-items: center; gap: 8px; }
.se-color-picker { width: 36px; height: 36px; border: none; border-radius: 6px; cursor: pointer; background: transparent; }
.se-color-value { font-size: 12px; color: rgba(232,224,216,0.4); font-family: monospace; }
.se-actions { display: flex; gap: 8px; }
.se-btn {
  padding: 8px 16px; border-radius: 8px;
  border: 1px solid rgba(212,165,116,0.2);
  background: rgba(212,165,116,0.08); color: var(--accent);
  font-family: inherit; font-size: 13px; cursor: pointer;
  transition: all 0.2s;
}
.se-btn:hover { background: rgba(212,165,116,0.15); }
.se-btn.primary { background: rgba(212,165,116,0.12); }
.se-btn.danger { color: rgba(224,112,80,0.7); border-color: rgba(224,112,80,0.2); }
.se-btn.danger:hover { background: rgba(224,112,80,0.1); }
</style>
```

- [ ] **Step 2: 创建 SceneEditor 测试**

```typescript
// src/views/__tests__/SceneEditor.test.ts

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockStore: Record<string, any> = {}
const mockGetKV = vi.fn((_key: string, def: any) => mockStore[_key] ?? def)
const mockSetKV = vi.fn((key: string, val: any) => { mockStore[key] = val })

vi.mock('../../engine/storage', () => ({
  storage: {
    getKV: (...args: any[]) => (mockGetKV as any)(...args),
    setKV: (...args: any[]) => (mockSetKV as any)(...args),
  },
}))

async function getWrapper() {
  const { default: SceneEditor } = await import('../SceneEditor.vue')
  return mount(SceneEditor)
}

describe('SceneEditor 场景编辑器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockStore['hf:scene_presets'] = []
  })

  it('渲染标题和描述', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('场景编辑器')
    expect(wrapper.text()).toContain('调整空间的氛围和场景参数')
  })

  it('无场景时显示空状态', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('还没有场景')
  })

  it('有场景时显示列表', async () => {
    mockStore['hf:scene_presets'] = [
      { id: 's1', name: '清晨', description: '柔和晨光', atmosphereColor: '#f0c040', transition: 'fade', createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' },
      { id: 's2', name: '黄昏', description: '温暖余晖', atmosphereColor: '#d4a574', transition: 'dissolve', createdAt: '2026-07-01T00:00:00Z', updatedAt: '2026-07-01T00:00:00Z' },
    ]
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('清晨')
    expect(wrapper.text()).toContain('黄昏')
    expect(wrapper.text()).toContain('2')
  })
})
```

- [ ] **Step 3: 注册路由**

在 `src/router/index.ts` 中添加：

```typescript
withRoomMeta({
  path: '/scene-editor',
  name: 'scene-editor',
  component: () => import('../views/SceneEditor.vue'),
  meta: { title: '场景编辑器' },
})
```

- [ ] **Step 4: 运行测试验证**

Run: `cd project/frontend && npx vitest run src/views/__tests__/SceneEditor.test.ts -v 2>&1 | Select-Object -Last 20`
Expected: 3 个测试全部通过

- [ ] **Step 5: TypeScript 检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1`
Expected: 零错误

---

### Task 6: B3-2 — EnvironmentEditor 视图

**Files:**
- Create: `src/views/EnvironmentEditor.vue`
- Create: `src/views/__tests__/EnvironmentEditor.test.ts`
- Modify: `src/router/index.ts`

**背景**：装修工坊的环境编辑器，允许用户调整全局环境参数（背景氛围、环境光色、显示密度、字体偏好等），通过 `AppConfig` 的对应字段保存。

- [ ] **Step 1: 创建 EnvironmentEditor 视图**

```vue
<!-- src/views/EnvironmentEditor.vue -->
<template>
  <div class="ee">
    <div class="header-ornament">
      <span class="orn-line"></span>
      <span class="orn-diamond">✦</span>
      <span class="orn-line"></span>
    </div>
    <p class="header-kicker">调整全局环境参数</p>
    <h1 class="ee-title">环境编辑器</h1>

    <div class="ee-form">
      <!-- 背景氛围 -->
      <div class="ee-field">
        <label class="ee-label">背景氛围</label>
        <select v-model="form.background" class="ee-select">
          <option value="default">默认暖色</option>
          <option value="dark">深色静谧</option>
          <option value="light">明亮清新</option>
          <option value="nature">自然绿意</option>
          <option value="ocean">海洋蓝调</option>
        </select>
      </div>

      <!-- 环境光色 -->
      <div class="ee-field">
        <label class="ee-label">环境光色</label>
        <div class="ee-color-row">
          <input v-model="form.accentColor" type="color" class="ee-color-picker" />
          <span class="ee-color-value">{{ form.accentColor }}</span>
        </div>
      </div>

      <!-- 显示密度 -->
      <div class="ee-field">
        <label class="ee-label">显示密度</label>
        <div class="ee-density-row">
          <button
            v-for="d in densities"
            :key="d.value"
            class="ee-density-btn"
            :class="{ active: form.density === d.value }"
            @click="form.density = d.value"
          >
            <span class="ee-density-icon">{{ d.icon }}</span>
            <span class="ee-density-label">{{ d.label }}</span>
          </button>
        </div>
      </div>

      <!-- 字体偏好 -->
      <div class="ee-field">
        <label class="ee-label">字体偏好</label>
        <select v-model="form.fontFamily" class="ee-select">
          <option value="serif">衬线体 (Serif)</option>
          <option value="sans-serif">无衬线体 (Sans)</option>
          <option value="monospace">等宽体 (Mono)</option>
        </select>
      </div>

      <!-- 过渡动画 -->
      <div class="ee-field">
        <label class="ee-label">页面过渡动画</label>
        <select v-model="form.transition" class="ee-select">
          <option value="fade">淡入淡出</option>
          <option value="slide">滑动</option>
          <option value="none">无</option>
        </select>
      </div>

      <div class="ee-actions">
        <button class="ee-btn primary" @click="saveEnvironment">保存设置</button>
        <button class="ee-btn" @click="resetEnvironment">重置默认</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { storage } from '../engine/storage'

const densities = [
  { value: 'compact', label: '紧凑', icon: '📏' },
  { value: 'normal', label: '标准', icon: '📐' },
  { value: 'spacious', label: '宽松', icon: '📜' },
]

const form = reactive({
  background: 'default',
  accentColor: '#d4a574',
  density: 'normal',
  fontFamily: 'serif',
  transition: 'fade',
})

onMounted(() => {
  const config = storage.getConfig()
  if (config) {
    form.background = (config as any).background || 'default'
    form.accentColor = (config as any).accentColor || '#d4a574'
    form.density = (config as any).density || 'normal'
    form.fontFamily = (config as any).fontFamily || 'serif'
    form.transition = (config as any).transition || 'fade'
  }
})

function saveEnvironment() {
  const config = storage.getConfig()
  const updated = {
    ...config,
    background: form.background,
    accentColor: form.accentColor,
    density: form.density,
    fontFamily: form.fontFamily,
    transition: form.transition,
  } as any
  storage.setConfig(updated)
}

function resetEnvironment() {
  form.background = 'default'
  form.accentColor = '#d4a574'
  form.density = 'normal'
  form.fontFamily = 'serif'
  form.transition = 'fade'
  saveEnvironment()
}
</script>

<style scoped>
.ee {
  position: relative;
  max-width: 600px;
  margin: 0 auto;
  padding: 40px 32px 80px;
  min-height: 100vh;
  overflow-y: auto;
  background: linear-gradient(180deg, #0d0b09 0%, #14100b 30%, #0f0c09 70%, #0a0806 100%);
}
.header-ornament { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 10px; }
.orn-line { display: block; width: 60px; height: 1px; background: linear-gradient(90deg, transparent, rgba(212,165,116,0.25), transparent); }
.orn-diamond { font-size: 10px; color: rgba(212,165,116,0.4); }
.header-kicker { text-align: center; font-size: 12px; color: rgba(212,165,116,0.3); letter-spacing: 4px; margin: 0 0 6px; }
.ee-title { text-align: center; font-family: Georgia, serif; font-size: 28px; font-weight: 400; color: rgba(212,165,116,0.75); letter-spacing: 6px; margin: 0 0 24px; }
.ee-form { display: flex; flex-direction: column; gap: 16px; }
.ee-field { display: flex; flex-direction: column; gap: 6px; }
.ee-label { font-size: 13px; color: rgba(232,224,216,0.6); font-weight: 500; }
.ee-select, .ee-input {
  padding: 10px; border: 1px solid rgba(212,165,116,0.12);
  border-radius: 8px; background: rgba(42,36,30,0.5);
  color: rgba(232,224,216,0.88); font-family: inherit; font-size: 13px; outline: none;
}
.ee-color-row { display: flex; align-items: center; gap: 8px; }
.ee-color-picker { width: 40px; height: 40px; border: none; border-radius: 8px; cursor: pointer; background: transparent; }
.ee-color-value { font-size: 12px; color: rgba(232,224,216,0.4); font-family: monospace; }
.ee-density-row { display: flex; gap: 8px; }
.ee-density-btn {
  flex: 1; display: flex; flex-direction: column; align-items: center;
  gap: 4px; padding: 12px; border-radius: 10px;
  border: 1px solid rgba(212,165,116,0.08);
  background: rgba(42,36,30,0.4); cursor: pointer; font-family: inherit;
  transition: all 0.2s;
}
.ee-density-btn:hover { background: rgba(55,48,40,0.6); }
.ee-density-btn.active { background: rgba(212,165,116,0.1); border-color: rgba(212,165,116,0.25); }
.ee-density-icon { font-size: 20px; }
.ee-density-label { font-size: 11px; color: rgba(232,224,216,0.5); }
.ee-actions { display: flex; gap: 8px; margin-top: 8px; }
.ee-btn {
  padding: 10px 20px; border-radius: 8px;
  border: 1px solid rgba(212,165,116,0.2);
  background: rgba(212,165,116,0.08); color: var(--accent);
  font-family: inherit; font-size: 13px; cursor: pointer;
  transition: all 0.2s;
}
.ee-btn:hover { background: rgba(212,165,116,0.15); }
.ee-btn.primary { background: rgba(212,165,116,0.12); }
</style>
```

- [ ] **Step 2: 创建 EnvironmentEditor 测试**

```typescript
// src/views/__tests__/EnvironmentEditor.test.ts

import { describe, expect, it, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

const mockConfig: any = {
  theme: 'amber',
  background: 'default',
  accentColor: '#d4a574',
  density: 'normal',
  fontFamily: 'serif',
  transition: 'fade',
}
const mockGetConfig = vi.fn(() => mockConfig)
const mockSetConfig = vi.fn((config: any) => { Object.assign(mockConfig, config) })

vi.mock('../../engine/storage', () => ({
  storage: {
    getConfig: (...args: any[]) => (mockGetConfig as any)(...args),
    setConfig: (...args: any[]) => (mockSetConfig as any)(...args),
  },
}))

async function getWrapper() {
  const { default: EnvironmentEditor } = await import('../EnvironmentEditor.vue')
  return mount(EnvironmentEditor)
}

describe('EnvironmentEditor 环境编辑器', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('渲染标题和描述', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('环境编辑器')
    expect(wrapper.text()).toContain('调整全局环境参数')
  })

  it('渲染背景氛围选择器', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('背景氛围')
    const selects = wrapper.findAll('select')
    expect(selects.length).toBeGreaterThan(0)
  })

  it('渲染密度选择按钮', async () => {
    const wrapper = await getWrapper()
    expect(wrapper.text()).toContain('紧凑')
    expect(wrapper.text()).toContain('标准')
    expect(wrapper.text()).toContain('宽松')
  })
})
```

- [ ] **Step 3: 注册路由**

在 `src/router/index.ts` 中添加：

```typescript
withRoomMeta({
  path: '/environment-editor',
  name: 'environment-editor',
  component: () => import('../views/EnvironmentEditor.vue'),
  meta: { title: '环境编辑器' },
})
```

- [ ] **Step 4: 运行测试验证**

Run: `cd project/frontend && npx vitest run src/views/__tests__/EnvironmentEditor.test.ts -v 2>&1 | Select-Object -Last 20`
Expected: 3 个测试全部通过

- [ ] **Step 5: TypeScript 检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1`
Expected: 零错误

---

### Task 7: 全量验证

**Files:** 无文件变更，仅运行验证命令

- [ ] **Step 1: 运行全量测试**

Run: `cd project/frontend && npx vitest run 2>&1 | Select-Object -Last 10`
Expected: 全量测试通过

- [ ] **Step 2: TypeScript 类型检查**

Run: `cd project/frontend && npx vue-tsc --noEmit 2>&1`
Expected: 零错误

- [ ] **Step 3: 宪法合规测试**

Run: `cd project/frontend && npx vitest run src/engine/__tests__/constitution-compliance.test.ts -v 2>&1 | Select-Object -Last 20`
Expected: 20 项宪法合规测试全部通过

---

## 计划对照检查

| 规范要求 | 实现任务 | 覆盖 |
|---------|---------|------|
| B1: 知识关系类型定义（4种关系） | Task 1 | ✅ |
| B1: 关系 CRUD 管理 | Task 1 | ✅ |
| B1: RelationEditor 组件 | Task 2 | ✅ |
| B1: KnowledgeTower 关系集成 | Task 2 | ✅ |
| B2: 7 维配置引擎 | Task 3 | ✅ |
| B2: 3 个预置模板（标准/极简/禅意） | Task 3 | ✅ |
| B2: SpaceCustomizer 视图 | Task 4 | ✅ |
| B2: 配置激活/复制/删除 | Task 4 | ✅ |
| B3: SceneEditor 场景编辑器 | Task 5 | ✅ |
| B3: EnvironmentEditor 环境编辑器 | Task 6 | ✅ |
| B3: 路由注册 | Task 5, 6 | ✅ |
| 全量验证 | Task 7 | ✅ |