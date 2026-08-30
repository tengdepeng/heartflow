<template>
  <div class="nav-tree-node">
    <div
      class="nav-item nav-item-core"
      :class="{
        active: isActive,
        'is-adjacent': isAdjacent,
        'nav-item-constitution': node.id === 'constitution',
        'can-drag': canDrag,
        'is-drop-target': isDropTarget,
        'is-dragging': isDragging,
        'is-empty-group': isEmptyGroup,
        'is-group-head': isGroupHead,
      }"
    :style="indentStyle"
    :data-node-id="node.id"
  >
    <button
      v-if="canDrag"
      type="button"
      class="nav-grip"
      aria-label="拖动以移动到其他分组"
      title="拖动以移动"
      @pointerdown.stop.prevent="onGripDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
    >⠿</button>
    <button
      v-if="hasChildren"
      type="button"
      class="nav-caret"
      :class="{ open: isOpen }"
      :aria-label="isOpen ? '收起' : '展开'"
      :title="isOpen ? '收起' : '展开'"
      @click.stop="toggle"
    >▾</button>
    <span v-else class="nav-caret-spacer" aria-hidden="true" />

      <router-link v-if="node.path" :to="node.path" class="nav-link-row" @click="onNavClick">
        <span v-if="isImageIcon(node.icon)" class="nav-icon nav-icon-img"><img :src="node.icon" :alt="node.name" /></span>
        <span v-else class="nav-icon">{{ node.icon }}</span>
        <span class="nav-label">{{ node.name }}</span>
        <span v-if="node.id === 'sanctuary'" class="nav-pill pill-silent">静默</span>
        <span v-else-if="node.id === 'constitution'" class="constitution-foundation-seal">基石</span>
        <span v-else-if="hasChildren && !isOpen" class="nav-child-count">{{ node.children.length }}</span>
      </router-link>
      <div v-else class="nav-link-row nav-group-head" @click="hasChildren && toggle()">
        <span v-if="isImageIcon(node.icon)" class="nav-icon nav-icon-img"><img :src="node.icon" :alt="node.name" /></span>
        <span v-else class="nav-icon">{{ node.icon }}</span>
        <span class="nav-label">{{ node.name }}</span>
        <span v-if="hasChildren && !isOpen" class="nav-child-count">{{ node.children.length }}</span>
        <!-- 空分组占位：分组头必须保留可命中的高度，否则房间被全部移走后
             落点消失、再也拖不回去。用弱化虚线态提示「这里可以拖回来」。 -->
        <span v-if="isEmptyGroup" class="nav-empty-hint">空 · 拖到此处</span>
      </div>
    </div>

    <div v-if="hasChildren && isOpen" class="nav-children">
      <NavTreeNode
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :active-id="activeId"
        :adjacent-ids="adjacentIds"
        :expanded-ids="expandedIds"
        :toggle-expand="toggleExpand"
        :draggable="child.path ? true : false"
        @move-node="(id, target) => emit('moveNode', id, target)"
        @close="emit('close')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { navReorder, navDrag } from '../modules/nav/navReorderState'
import { isImageIcon } from '../utils/icon'

export interface NavTreeNodeData {
  id: string
  name: string
  icon: string
  color: string
  path: string
  group: string
  children: NavTreeNodeData[]
}

const props = defineProps<{
  node: NavTreeNodeData
  depth: number
  activeId: string
  adjacentIds: string[]
  expandedIds: Set<string>
  toggleExpand: (id: string) => void
  /** 是否允许拖拽（叶子房间可拖，分组头不可作为拖拽源） */
  draggable?: boolean
}>()

const emit = defineEmits<{
  close: []
  /** 长按拖拽落到本节点：draggedId 被移到 targetId 之前（targetId 可能是房间或分组头 id） */
  moveNode: [draggedId: string, targetId: string]
}>()

const hasChildren = computed(() => props.node.children.length > 0)
const isOpen = computed(() => props.expandedIds.has(props.node.id))
const isActive = computed(() => props.activeId === props.node.id)
const isAdjacent = computed(() => props.adjacentIds.includes(props.node.id))
// 每层缩进 14px，呈现「包含」层级；根层（depth 0）保持与原侧栏一致的左内边距
const indentStyle = computed(() => ({ paddingLeft: `${10 + props.depth * 14}px` }))

// 分组头（无 path）与房间（有 path）都可拖：分组头之间拖动 = 重排分组顺序；
// 房间拖到分组头 = 改变归属。home-space 与「未分组」兜底头不可作拖拽源。
const canDrag = computed(
  () => (props.draggable ?? true)
    && props.node.id !== 'home-space'
    && props.node.id !== 'tax-custom-ungrouped',
)

/** 分类分组头（tax-* 体系头 / 家原点容器等无 path 的聚合节点） */
const isGroupHead = computed(() => !props.node.path)
/** 空分组：有分组头但没有成员房间。必须照常渲染（见模板注释），仅弱化视觉。 */
const isEmptyGroup = computed(() => isGroupHead.value && props.node.children.length === 0)

// ---- 拖拽重排 ----
// 拖拽态为模块级共享（见 modules/nav/navReorderState.ts）：
// 递归组件每实例各持一份会导致目标节点收不到 targetId、落点高亮永不出现。
const isDropTarget = computed(() => navDrag.active && navDrag.targetId === props.node.id && navDrag.draggedId !== props.node.id)
const isDragging = computed(() => navDrag.active && navDrag.draggedId === props.node.id)

let dragging = false

// 拖拽手柄（⠿）按下即进入拖拽：拖拽与「点击进房」彻底解耦，
// 不再依赖 400ms 长按（长按不可发现、且易与列表触摸滑动冲突）。
function onGripDown(e: PointerEvent): void {
  if (!canDrag.value) return
  startDrag(e)
}

function startDrag(e: PointerEvent) {
  if (!canDrag.value) return
  navDrag.active = true
  navReorder.active = true // 通知 App.vue：房间重排进行中，放弃侧栏拖动
  navDrag.draggedId = props.node.id
  navDrag.targetId = ''
  dragging = true
  try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId) } catch { /* noop */ }
}

// 侧栏滚动容器（拖拽自动滚动用）
function navScroller(): HTMLElement | null {
  return document.querySelector('.nav-scroll')
}

function onPointerMove(e: PointerEvent) {
  if (!dragging) return
  // 拖拽靠近侧栏上/下边缘时自动滚动，让屏幕外的目标分组头滚入视野
  // （修复：手机长列表下源房间与目标分组无法同时可见、够不到目标）
  const sc = navScroller()
  if (sc) {
    const r = sc.getBoundingClientRect()
    const y = e.clientY ?? 0
    const margin = 48
    if (y < r.top + margin) sc.scrollTop -= (r.top + margin - y) * 0.35
    else if (y > r.bottom - margin) sc.scrollTop += (y - (r.bottom - margin)) * 0.35
  }
  const el = document.elementFromPoint(e.clientX ?? 0, e.clientY ?? 0) as HTMLElement | null
  const item = el?.closest('.nav-item-core') as HTMLElement | null
  // 分组头之间才重排：拖动分组头时，落点到房间/家原点不算有效目标（避免误重排）
  const draggedIsGroup = navDrag.draggedId.startsWith('tax-')
  const itemIsGroup = !!item && item.classList.contains('is-group-head')
  if (draggedIsGroup && !itemIsGroup) {
    navDrag.targetId = ''
    return
  }
  navDrag.targetId = item?.getAttribute('data-node-id') ?? ''
}

function onPointerUp(e: PointerEvent) {
  if (!dragging) return
  dragging = false
  try { (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId) } catch { /* noop */ }
  if (navDrag.active) {
    if (navDrag.targetId && navDrag.targetId !== navDrag.draggedId) {
      emit('moveNode', navDrag.draggedId, navDrag.targetId)
      navDrag.consumed = true
    }
    navDrag.active = false
    navReorder.active = false
    navDrag.draggedId = ''
    navDrag.targetId = ''
  }
}

function onPointerCancel() {
  dragging = false
  navDrag.active = false
  navReorder.active = false
  navDrag.draggedId = ''
  navDrag.targetId = ''
}

// 拖拽结束后松手会触发一次 click，需拦截以免误跳转
function onNavClick(e: MouseEvent) {
  if (navDrag.consumed) {
    e.preventDefault()
    e.stopPropagation()
    navDrag.consumed = false
    return
  }
  emit('close')
}

function toggle() {
  if (!hasChildren.value) return
  props.toggleExpand(props.node.id)
}
</script>

<style scoped>
.nav-tree-node {
  display: block;
}

/* ---- 导航项视觉（与侧栏 .nav-item 一致，自包含以保证子组件内生效） ---- */
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: var(--nav-item-py, 9px) clamp(10px, 1vw, 14px);
  border-radius: 8px;
  font-size: var(--nav-item-font, 13px);
  color: var(--text-secondary);
  transition: all var(--transition);
  position: relative;
  overflow: hidden;
}

.nav-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 0;
  border-radius: 0 2px 2px 0;
  background: var(--accent);
  transition: height var(--transition);
  opacity: 0;
}

.nav-item:hover {
  background: var(--bg-surface);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent-glow);
  color: var(--accent);
}

.nav-item.active::before {
  height: 60%;
  opacity: 1;
}

/* 拖拽落点高亮（虚线描边，提示可放下） */
.nav-item.is-drop-target {
  outline: 1px dashed var(--accent);
  outline-offset: -2px;
  background: var(--accent-glow);
}
.nav-item.can-drag {
  cursor: default;
}
/* 拖拽手柄：独立抓取点，按下即拖（与点击进房解耦）；touch-action:none 仅限手柄，
   房间本体仍可正常接收触摸滚动，避免长列表侧栏在手机上滑不动。 */
.nav-grip {
  flex: 0 0 auto;
  width: 18px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 2px 0 -2px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  opacity: 0.4;
  font-size: 12px;
  line-height: 1;
  border-radius: 6px;
  cursor: grab;
  touch-action: none;
  transition: opacity var(--transition), color var(--transition), background var(--transition);
}
.nav-grip:hover {
  opacity: 0.95;
  color: var(--accent);
  background: rgba(255, 255, 255, 0.05);
}
.nav-grip:active {
  cursor: grabbing;
}
.nav-item.can-drag:active {
  cursor: grabbing;
}
.nav-item.is-dragging {
  opacity: 0.55;
  outline: 1px solid var(--accent);
  outline-offset: -2px;
  /* 拖拽源节点自身不拦截 elementFromPoint：否则光标若压在源 item 上，
     命中检测只会拿到自身 → targetId 恒等于 draggedId → 永远拖不动。
     让命中检测穿透到源下方的真实落点（如被源压住的空分组头）。 */
  pointer-events: none;
}
/* 但拖拽手柄仍须接收事件：setPointerCapture 在手柄上，须保持可命中，
   否则 move/up 收不到、整条拖拽链路断。 */
.nav-item.is-dragging .nav-grip {
  pointer-events: auto;
}

/* ---- 空分组头：保留可命中的高度 + 弱化虚线态，提示「可拖回」----
   背景：分组头集合改为「维度全集 ∪ 实际有房间的桶」后，空组也会渲染。
   若不给最小高度/虚线提示，用户会以为是渲染故障；若不给高度，则落点不可命中。 */
.nav-item.is-empty-group {
  min-height: 34px;
  margin: 2px 0;
  border: 1px dashed rgba(var(--accent-rgb), 0.18);
  background: transparent;
  opacity: 0.6;
}
.nav-item.is-empty-group:hover {
  opacity: 0.9;
  border-color: rgba(var(--accent-rgb), 0.4);
  background: rgba(var(--accent-rgb), 0.04);
}
.nav-empty-hint {
  margin-left: auto;
  flex: 0 0 auto;
  font-size: 10px;
  letter-spacing: 0.4px;
  color: var(--text-secondary);
  opacity: 0.65;
  white-space: nowrap;
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px dashed rgba(var(--accent-rgb), 0.25);
}
/* 空分组被拖拽悬停时，明确给出「可放下」的落点反馈 */
.nav-item.is-empty-group.is-drop-target {
  opacity: 1;
  border-style: solid;
  border-color: var(--accent);
  background: var(--accent-glow);
}

.nav-item.is-adjacent {
  opacity: 1;
}

.nav-item-core {
  background: rgba(255, 255, 255, 0.01);
}

.nav-icon {
  font-size: clamp(14px, 1.3vw, 16px);
  width: 20px;
  text-align: center;
  flex-shrink: 0;
  opacity: 0.7;
}

.nav-icon-img {
  width: 20px;
  height: 20px;
  display: inline-grid;
  place-items: center;
  overflow: hidden;
}
.nav-icon-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 4px;
}

.nav-item.active .nav-icon {
  opacity: 1;
}

.nav-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-pill {
  margin-left: auto;
  padding: 2px 7px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 9px;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 0.5px;
  white-space: nowrap;
}

.nav-item.active .nav-pill,
.nav-item-core:hover .nav-pill {
  border-color: rgba(var(--accent-rgb), 0.2);
  color: var(--accent);
}

.pill-silent {
  border-color: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.2);
}

.nav-item-constitution {
  position: relative;
}

.constitution-foundation-seal {
  font-size: 9px;
  letter-spacing: 1px;
  color: var(--accent);
  opacity: 0.3;
  margin-left: 2px;
  font-weight: 400;
  white-space: nowrap;
}

/* ---- 树形专用：展开箭头 / 链接行 / 子层导光线 ---- */
.nav-caret {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 9px;
  line-height: 1;
  cursor: pointer;
  opacity: 0.5;
  transition: transform 0.2s ease, opacity 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-caret:hover {
  opacity: 0.95;
  color: var(--accent);
}
.nav-caret.open {
  transform: rotate(0deg);
}
.nav-caret:not(.open) {
  transform: rotate(-90deg);
}
.nav-caret-spacer {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  display: inline-block;
}

.nav-link-row {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.nav-child-count {
  margin-left: auto;
  font-size: 9px;
  opacity: 0.45;
  color: var(--text-secondary);
  padding: 1px 6px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

/* 子层级左侧导光线，强化「包含」关系（更漏 ⊃ 息壤 等） */
.nav-children {
  position: relative;
}
.nav-children::before {
  content: '';
  position: absolute;
  left: 17px;
  top: 0;
  bottom: 6px;
  width: 1px;
  background: linear-gradient(
    180deg,
    rgba(var(--accent-rgb), 0.14),
    rgba(var(--accent-rgb), 0.04)
  );
}
</style>
