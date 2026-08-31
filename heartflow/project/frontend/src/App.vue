<template>
  <UnlockGate v-if="showUnlock" />
  <div v-else-if="!isAuraWindow" class="app-shell" :class="{ 'sidebar-collapsed': sidebarCollapsed, 'chrome-hidden': chromeHidden, 'is-mobile': isMobile, 'docked-mode': navMode === 'docked', 'surface-3d': is3dShell }" :style="shellStyle">
    <!-- 全局自定义背景层：垫在画布之下，跨路由持久化 -->
    <!-- effectiveBackground 已注入单房间覆盖的背景场景（否则跟随全局） -->
    <div class="app-base-bg" aria-hidden="true">
      <HomeBackgroundMedia :background="effectiveBackground" @loadError="handleAppBackgroundError" />
    </div>

    <!-- 路由顶部加载条（接线孤儿 RouteProgress：跨路由常驻的细进度条） -->
    <RouteProgress ref="routeProgressRef" />

    <!-- 夜静调暗遮罩（宪法第49条：22:00–05:00 自动调暗；pointer-events:none 不拦截交互） -->
    <div class="night-dim-overlay" :class="{ active: isNight }" aria-hidden="true"></div>

    <!-- 数字安息日叠层（宪法第50条：每周日全面断联；pointer-events:none 不拦截交互） -->
    <div class="sabbath-overlay" :class="{ active: isSabbath }" aria-hidden="true">
      <span class="sabbath-label">数字安息日 · 今日不扰</span>
    </div>

    <!-- 引力场画布背景层（跨路由持久化 — 全强度常驻） -->
    <CanvasRoom :intensity="canvasIntensity" />

    <!-- 中层交互面容器：整屏三态（屏风/3D正厅/2D宅院俯瞰），非屏风态整屏接管屏幕 -->
    <SurfaceStage />

    <!-- 画布轻量笔记层：编辑器 / 笔记板 / 新建入口（浮动便签本身由 CanvasRoom 内的 CanvasNotes 渲染） -->
    <NoteLayer />

    <!-- 环境氛围层 -->
    <div class="ambient-layer">
      <div class="ambient-glow"></div>
      <div class="ambient-grain"></div>
      <div class="ambient-dust"></div>
    </div>

    <!-- 锁屏光痕（殿堂触角）：应用内氛围底光，移动端安全，不拦截交互 -->
    <GlowOverlay />

    <!-- 移动端应用内静默覆盖（B2-EXT-3）：桌面无原生多窗口时的降级浮层 -->
    <MobileSilentOverlay />

    <!-- 桌面端侧边导航（悬浮窗模式：可拖到任意位置，松手吸附最近边，空闲半透明贴边收缩） -->
    <nav
      ref="navBarEl"
      class="nav-bar"
      :class="[
        { collapsed: sidebarCollapsed },
        `float-edge-${sidebarFloatEdge}`,
        { dragging: sidebarDragging },
        { 'room-drag-active': navReorder.active },
      ]"
      :style="navBarFloatStyle"
      @pointerdown="onNavBarPointerDown"
    >
      <!-- 移动/平板端抽屉关闭按钮：覆盖层抽屉无自带收回开关，需显式提供（汉堡在打开时被本栏盖住无法点击） -->
      <button
        v-if="isMobileOrTablet"
        class="nav-drawer-close"
        @click="setSidebarCollapsed(true)"
        aria-label="收起导航"
        title="收起导航"
      >✕</button>

      <div class="nav-brand drag-handle" title="拖动可移动侧栏 · 松手自动吸附最近边">
        <div class="brand-emblem">
          <img v-if="isImageIcon(appBrandIcon)" :src="appBrandIcon ?? ''" alt="品牌图标" class="brand-emblem-img" />
          <template v-else>{{ appBrandIcon || '✦' }}</template>
        </div>
        <div class="brand-text">
          <strong>心流工坊</strong>
          <span class="brand-note">深夜食堂 · 灯一直亮着</span>
        </div>
      </div>

      <div class="style-row">
        <button v-for="p in styleStore.installedPacks" :key="p.id"
          :class="['style-swatch', {active: styleStore.activeId === p.id}]"
          :title="p.name" @click="styleStore.activate(p.id)" />
        <span class="style-name">{{ styleStore.activePack?.name }}</span>
      </div>

      <!-- 空间面包屑导航 -->
      <div class="spatial-breadcrumb" v-if="currentRoom && currentRoomId !== 'home'">
        <div class="breadcrumb-path">
          <button class="breadcrumb-home" @click="nav.goHome" title="返回引力场">⊙</button>
          <span class="breadcrumb-arrow">›</span>
          <span class="breadcrumb-current">{{ currentRoom.name }}</span>
        </div>
        <div class="breadcrumb-nav">
          <button v-if="nav.previousOnMainPath.value"
            class="breadcrumb-btn" @click="nav.goPreviousOnMainPath()"
            :title="'← ' + nav.previousOnMainPath.value.name">←</button>
          <button v-if="nav.nextOnMainPath.value"
            class="breadcrumb-btn" @click="nav.goNextOnMainPath()"
            :title="nav.nextOnMainPath.value.name + ' →'">→</button>
          <button class="breadcrumb-btn" @click="nav.goBack()" title="返回上一间">↩</button>
        </div>
      </div>

      <div class="nav-scroll">
        <!-- 蓝图18空间排布 · 全量导航树（家为原点 → 主链路 → 世界空间七领域 → 系统边界） -->
        <div class="nav-links nav-tree">
          <NavTreeNode
            v-for="node in navTree"
            :key="node.id"
            :node="node"
            :depth="0"
            :active-id="currentRoomId"
            :adjacent-ids="adjacentIds"
            :expanded-ids="expandedIds"
            :toggle-expand="toggleExpand"
            :draggable="true"
            @move-node="onMoveNode"
            @close="closeMobileDrawer"
          />
        </div>
      </div>

      <!-- 幕僚任务：侧栏常驻显示调令任务（与幕僚阁调令系统联动） -->
      <div class="nav-tasks" v-if="taskRecent.length" @click="goAdvisors" title="查看幕僚任务">
        <div class="nav-tasks-head">
          <span class="nav-tasks-title">幕僚任务</span>
          <span v-if="taskRunning" class="nav-tasks-badge">{{ taskRunning }} 进行中</span>
        </div>
        <ul class="nav-tasks-list">
          <li
            v-for="t in taskRecent"
            :key="t.id"
            class="nav-task-item"
            :class="{ done: t.status === 'done' }"
          >
            <span class="nav-task-dot" :class="t.status"></span>
            <span class="nav-task-label">{{ t.intentLabel }}</span>
          </li>
        </ul>
      </div>

      <!-- 底部氛围 -->
      <div class="nav-footer">
        <div class="nav-footer-light"></div>
      </div>

      <!-- 2D/3D 切换入口已隐藏（浮钮/侧栏/玉珠点击均移除），改由全局 V 键触发 -->

      <!-- 快捷键提示 -->
      <div class="nav-shortcut-hint">
        <span class="hint-key">Ctrl+K</span>
        <span class="hint-label">星盘导航</span>
      </div>
    </nav>

    <!-- 移动/平板端侧边栏遮罩：点击遮罩区域收起抽屉（仅覆盖式抽屉模式） -->
    <div v-if="isMobileOrTablet && !sidebarCollapsed" class="sidebar-overlay" @click="setSidebarCollapsed(true)"></div>

    <!-- 主内容区（就地绑定单房间覆盖的 CSS 变量，不污染侧栏/壳层） -->
    <main class="main-content" :style="roomStyleVars">
      <router-view v-slot="{ Component, route }">
        <transition :name="pageTransition" mode="out-in" @after-enter="onAfterRouteEnter">
          <component :is="Component" v-if="Component" :key="route.fullPath" />
          <SkeletonLoader v-else :variant="currentSkeletonVariant" />
        </transition>
      </router-view>
    </main>

    <!-- 全局介质呼吸层 -->
    <BreathingLayer ref="breathingRef" />

    <!-- 边缘面板（全局） -->
    <EdgePanel :visible="panelVisible" @close="panelVisible = false" />

    <!-- 全局 Toast 消息 -->
    <ToastContainer />

    <!-- 三层空间 · 切换面板（键盘/长按空白触发） -->
    <SwitchPanel />

    <!-- 三层空间 · 上层浮层宿主（从物件激活、可关闭） -->
    <FloatingLayerHost />

    <!-- 三级操作模式 · 待确认/建议 托盘 -->
    <PendingActionsTray />

    <!-- 悬浮液态玻璃双浮岛底栏（全局常驻：左岛 ≡/房间/前后/星盘/画布控制，右岛 返回/添加弹层）。
         接管并取代原先散落的 astrolabe-summon-btn 与 canvas-controls 孤儿浮层。
         桌面端随沉浸模式(自动隐藏)一并淡出。
         导航布局 = floating 时显示；docked 模式改由上下固定栏承载（见下方 docked 栏）。 -->
    <FloatingNavBar
      v-if="navMode === 'floating'"
      @toggle-sidebar="onToggleSidebar"
    />

    <!-- 幕僚形象：全局常驻一颗「幕僚」珠（原镜我/玉珠合并为主陪伴幕僚），除安全岛外每页都在。
         单击唤对话 / 按住拖动重定位 / hover 看今日状态与切房间 / 四幕入口，均在 MirrorSelf 内。
         形态（玉珠/晶簇/焰/种）实时反映「幕僚设置」里主陪伴幕僚的载体几何；位置与隐藏本地持久化。
         门厅态时通过 hallAnchor 把玉珠光球锚定到屏风计时器旁（屏风契约）。
         宅院壳激活时玉珠居中（中央留白给幕僚）；2D/3D 切换已移至右下浮岛按键，玉珠点击回归「唤对话」。 -->
    <MirrorSelf
      :active-room-id="currentRoomId"
      :hall-anchor="hallAnchor"
      :centered="activeShell === 'courtyard'"
      :home-centered="homeCentered"
    />

    <!-- 星盘导航 -->
    <Astrolabe :visible="astrolabe.isOpen.value" @close="astrolabe.close()" />

    <!-- 安全岛全局覆盖层（五击触发） -->
    <SanctuaryOverlay
      :breath-progress="sanctuaryBreathProgress"
      :tap-progress="sanctuaryTrigger.triggerProgress.value"
    />
  </div>

  <!-- 桌面美化层 AuraLayer：透明常驻浮层 + 多元氛围主题。
       aura 窗（Tauri 透明窗）下主壳经 v-else-if 隐藏，仅渲染此层。 -->
  <AuraLayer />
</template>

<script setup lang="ts">
import { ref, provide, onMounted, computed, onUnmounted, nextTick, watch, defineAsyncComponent } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useConstitutionStore } from './stores/constitution'
import { useAdvisorStore } from './stores/advisor'
import { useStyleStore } from './stores/style'
import { useConfigStore } from './stores/config'
import { isImageIcon } from './utils/icon'
import { useUnlockStore } from './stores/unlock'
import UnlockGate from './components/safety/UnlockGate.vue'
import { useRoomNavigation } from './composables/useRoomNavigation'
import { getAllRooms, type RoomNode, type RoomGroup, type RoomSlot, type RoomDomain } from './engine/room-graph'
import NavTreeNode from './components/NavTreeNode.vue'
import { useRoomManager } from './modules/room-manager'
import { useRoomTaxonomy, DOMAIN_LABELS, GROUP_LABELS, SLOT_LABELS, UNGROUPED_KEY, collectTaxonomyKeys } from './modules/room-taxonomy'
import type { BackgroundMediaConfig } from './types'
// composable 静态导入（触发逻辑小），重组件懒加载，首屏不打包
import { useAstrolabe } from './modules/astrolabe'
import { useSanctuaryTrigger } from './modules/sanctuary'
import { useAppearance } from './modules/customization/useAppearance'
import { useChromeAutoHide } from './modules/customization/useChromeAutoHide'
import { useRoomStyle } from './modules/customization/useRoomStyle'
import { applyBrandIconToWindow } from './modules/customization/applyWindowIcon'
import { useRuntimeState } from './resonance/bridges/runtime'
import CanvasRoom from './modules/canvas/CanvasRoom.vue'
import SurfaceStage from './modules/canvas/SurfaceStage.vue'
import NoteLayer from './components/NoteLayer.vue'
import MirrorSelf from './components/MirrorSelf.vue'
import FloatingNavBar from './components/FloatingNavBar.vue'
// ① 窗口缩放重锚：侧栏自由浮动位置钳回视口（接回 floatReanchor 规划好的重锚逻辑）
import { clampSidebarFloat } from './modules/customization/floatReanchor'
import BreathingLayer from './modules/breathing/BreathingLayer.vue'
import AuraLayer from './modules/aura/AuraLayer.vue'
import { useAura } from './modules/aura/auraLayer'
import ToastContainer from './components/ToastContainer.vue'
import PendingActionsTray from './components/PendingActionsTray.vue'
import SkeletonLoader from './components/SkeletonLoader.vue'
import { initConstitutionEffect } from './engine/constitution-effect'
import { useNightDim } from './composables/useNightDim'
import { useDigitalSabbath } from './composables/useDigitalSabbath'
import { useLongDormancy } from './composables/useLongDormancy'
import { initAppearance } from './modules/customization/useAppearance'
import { ROUTE_TRANSITION_DONE_KEY } from './composables/useViewEntrance'
import { useConfig } from './resonance/bridges/config'
import HomeBackgroundMedia from './components/HomeBackgroundMedia.vue'
import RouteProgress from './components/RouteProgress.vue'
import GlowOverlay from './components/GlowOverlay.vue'
import MobileSilentOverlay from './components/MobileSilentOverlay.vue'
import SwitchPanel from './components/SwitchPanel.vue'
import FloatingLayerHost from './components/FloatingLayerHost.vue'
import { useLayerSwitchTrigger } from './composables/useLayerSwitchTrigger'
import { useBreakpoint } from './composables/useBreakpoint'
import { navReorder } from './modules/nav/navReorderState'

// 非首屏重组件：按需加载
const Astrolabe = defineAsyncComponent(() =>
  import('./modules/astrolabe').then((m) => m.Astrolabe)
)
const SanctuaryOverlay = defineAsyncComponent(() =>
  import('./modules/sanctuary').then((m) => m.SanctuaryOverlay)
)
const EdgePanel = defineAsyncComponent(() =>
  import('./components/EdgePanel.vue')
)
import { getPerception } from './modules/perception/usePerception'
import { usePerceptionStore } from './stores/perception'

useConstitutionStore()
const { isNight } = useNightDim()
const { isSabbath } = useDigitalSabbath()
const { isAuraWindow } = useAura()
useLongDormancy()
const styleStore = useStyleStore()
const advisor = useAdvisorStore()
const commandTasks = computed(() =>
  Array.isArray(advisor.commandTasks) ? advisor.commandTasks : []
)
const taskRunning = computed(
  () => commandTasks.value.filter((t) => t.status === 'running').length
)
const taskRecent = computed(() => [...commandTasks.value].reverse().slice(0, 3))
function goAdvisors() {
  window.location.hash = '/advisors'
}
const perceptionStore = usePerceptionStore()
const nav = useRoomNavigation()
// 三层空间 · 切换触发器（键盘 + 长按空白，三端通用、可自定义）
useLayerSwitchTrigger()
const astrolabe = useAstrolabe()
provide('astrolabe', astrolabe)

// ---- 外观设置（侧栏宽度/玻璃等驱动壳层；画布控制已移交 FloatingNavBar 内部）----
const {
  sidebarWidth,
  sidebarGlass,
  sidebarBgMode,
  sidebarDefaultCollapsed,
  sidebarDensity,
  edgeBarAlpha,
  autoHideDelay,
  navMode,
  sidebarCollapsed,
  setSidebarCollapsed,
} = useAppearance()

// 导航布局模式：floating（悬浮双浮岛）/ docked（桌面端上下固定栏），由 navMode 直接驱动模板

// ---- 界面自动隐藏（沉浸模式）----
// chromeHidden 驱动壳层显隐（底栏 + 浮岛等沉浸元素）。
// 侧边浮动窗的「无操作自动吸附最近边框并隐藏」由独立的 sidebarAutoHidden 控制
// （侧栏显示时全局无操作超时 → 吸附边框滑出完全隐藏；对侧栏操作 → 原位置出现），
// 与 chromeHidden 解耦、互不打架。
const { chromeHidden, sidebarAutoHidden, autoHideChrome, poke, pokeSidebar, initChromeAutoHide } =
  useChromeAutoHide()
// 悬浮侧栏：自由位置（持久化） + 收缩时贴附的最近边（持久化）
const { sidebarFloatEdge, setSidebarFloatEdge, sidebarFloatPos, setSidebarFloatPos } =
  useAppearance()
// 设置里重新开启自动隐藏时，立即重启空闲计时（否则需等下次活动才生效）
watch(autoHideChrome, (on) => { if (on) poke() })
// 空闲时长变更时，若界面当前可见则重启计时，使新时长即时生效（隐藏态不强行唤醒）
watch(autoHideDelay, () => { if (!chromeHidden.value) poke() })

// ---- 侧边栏自定义：派生 CSS 变量注入壳层（超级自定义 · 侧边栏子组） ----
// 宽度 / 毛玻璃通透度 / 背景模式 / 项目组密度 统一映射为 :root 级自定义属性，
// 由壳层与各断点样式消费，避免散落硬编码。
const SIDEBAR_DENSITY: Record<string, { py: string; font: string; gp: string }> = {
  compact: { py: '7px', font: '12px', gp: '10px' },
  standard: { py: '9px', font: '13px', gp: '14px' },
  relaxed: { py: '12px', font: '14px', gp: '18px' },
}
const shellStyle = computed<Record<string, string>>(() => {
  const density = SIDEBAR_DENSITY[sidebarDensity.value] ?? SIDEBAR_DENSITY.standard
  const mode = sidebarBgMode.value
  let bgAlpha = 1
  let blur = 0
  if (mode === 'glass') {
    const g = Math.min(100, Math.max(0, sidebarGlass.value)) / 100
    bgAlpha = 1 - g * 0.85
    blur = g * 14
  }
  const style: Record<string, string> = {
    '--sidebar-bg-alpha': String(bgAlpha),
    '--sidebar-blur': `${blur.toFixed(2)}px`,
    '--nav-item-py': density.py,
    '--nav-item-font': density.font,
    '--nav-group-py': density.gp,
    // 顶栏/底栏（移动/平板端）背景不透明度，与侧边栏同级控制
    // 滑块语义为「不透明度」：值越大越实（100% 完全不透明），直接映射为 rgba alpha
    '--edge-bar-alpha': String(Math.min(100, Math.max(0, edgeBarAlpha.value)) / 100),
  }
  // 宽度仅在桌面端生效（平板/移动端侧栏为覆盖层，宽度另由媒体查询控制，避免挤压内容）。
  // 默认侧栏宽(220)走 CSS 流式 clamp(200px,17vw,280px)；仅当用户显式自定义(≠220)时才用固定 px 覆盖。
  if (isDesktop.value && sidebarWidth.value !== 220) {
    style['--sidebar-w'] = `${sidebarWidth.value}px`
  }
  return style
})

// ---- 悬浮侧栏：拖动 + 松手吸附最近边 + 无操作自动隐藏（独立 sidebarAutoHidden） ----
// 仅桌面端启用自由悬浮拖动；平板/移动端沿用覆盖式抽屉（不拖）。
// 交互：
//  - ≡ 调出/隐藏 → sidebarCollapsed（collapsed=true 用户主动隐藏）
//  - 显示后全局无操作超时 → sidebarAutoHidden=true → 吸附最近边框滑出并完全隐藏
//  - 对侧栏操作（pointerdown / 全局活动）→ pokeSidebar() 唤醒 → 在原位置出现
const navBarEl = ref<HTMLElement | null>(null)
const sidebarDragging = ref(false)
const dragPos = ref<{ x: number; y: number } | null>(null)
let dragStart: { sx: number; sy: number; ox: number; oy: number } | null = null

/** 浮动定位：
 *  - 拖动中：内联 left/top 跟随指针（禁过渡）
 *  - 常态（有自由位置）：内联 left/top 停在任意位置
 *  - 从未拖动/已吸附（pos 为 null）：交 CSS float-edge-* 类定位（严丝合缝贴边）
 *  - 隐藏态（用户 ≡ 收起 或 无操作超时）：就近滑出 + 完全淡出 */
const navBarFloatStyle = computed((): Record<string, string> => {
  if (sidebarDragging.value && dragPos.value) {
    return {
      left: `${dragPos.value.x}px`,
      top: `${dragPos.value.y}px`,
      right: 'auto',
      bottom: 'auto',
      transition: 'none',
    }
  }
  // 常态定位（先算好，隐藏时在其上叠加滑出，不重设 left/top 以免破坏吸附居中）
  let normal: Record<string, string>
  if (sidebarFloatPos.value) {
    // 有自由坐标：内联 left/top 停任意位置。
    // 关键：覆盖 float-edge-left/right 类的 top:50%+translateY(-50%) 居中，
    // 以及 float-edge-top/bottom 的 left:50%+translateX(-50%) 居中，
    // 否则单边吸附时用户拖动的自由轴会被 CSS 强制拉回居中（「归位中间」的根源）。
    normal = {
      left: `${sidebarFloatPos.value.x}px`,
      top: `${sidebarFloatPos.value.y}px`,
      right: 'auto',
      bottom: 'auto',
      transform: 'none',
    }
  } else {
    // pos 为 null（吸附态或从未拖动）：交给 CSS float-edge-* 类定位（严丝合缝贴边）
    normal = {}
  }
  // 隐藏态（用户主动收起 或 无操作超时）：就近滑出 + 完全淡出。
  // 就近方向由吸附边 edge 决定：贴右/右侧角 → 向右滑；其余（贴左/上/下/四角/free）→ 向左滑。
  // - free 态（pos 有值）：内联 transform 覆盖 normal 的 none，就近滑出。
  // - 吸附态（pos 为 null）：不写内联 transform，交还 CSS .nav-bar.collapsed / .float-edge-* 规则，
  //   它已正确合并居中偏移（如 translate(-110%,-50%)），保证滑动轨迹贴边不卡中间。
  if (sidebarCollapsed.value || sidebarAutoHidden.value) {
    const edge = sidebarFloatEdge.value
    const toRight = edge === 'right' || edge.endsWith('r')
    const slide = toRight ? 'translateX(110%)' : 'translateX(-110%)'
    return {
      ...normal,
      transform: slide,
      opacity: '0',
      pointerEvents: 'none',
      transition: 'transform 0.4s ease, opacity 0.4s ease',
    }
  }
  return normal
})

let pendingDragTimer: number | null = null
let pendingDragStart: { x: number; y: number } | null = null

function onNavBarPointerDown(e: PointerEvent): void {
  if (sidebarCollapsed.value) return // 用户主动收起态不拖
  const t = e.target as HTMLElement
  // 房间列表（.nav-scroll）整体可抓来拖动侧栏；仅链接/按钮/输入/抽屉关闭钮不触发拖动
  // （房间项自身的「长按重排」由 NavTreeNode 接管，重排进行中 onDragMove 会放弃侧栏拖动）
  if (t.closest('a, button, input, textarea, .nav-drawer-close')) return
  // 桌面鼠标：按下即拖（与桌面一致）；触摸：长按 350ms 才进拖动，
  // 先滑动=滚动房间列表，按住再拖=移动侧栏，避免手势冲突抢占列表触摸滑动。
  if (e.pointerType === 'touch') {
    pendingDragStart = { x: e.clientX, y: e.clientY }
    const onEarlyMove = (me: PointerEvent) => {
      if (pendingDragStart && Math.hypot(me.clientX - pendingDragStart.x, me.clientY - pendingDragStart.y) > 10) {
        cleanupPendingDrag()
      }
    }
    const onEarlyUp = () => cleanupPendingDrag()
    pendingDragTimer = window.setTimeout(() => {
      window.removeEventListener('pointermove', onEarlyMove)
      window.removeEventListener('pointerup', onEarlyUp)
      pendingDragTimer = null
      pendingDragStart = null
      beginSidebarDrag(e)
    }, 350)
    window.addEventListener('pointermove', onEarlyMove)
    window.addEventListener('pointerup', onEarlyUp, { once: true })
    return
  }
  beginSidebarDrag(e)
}

function cleanupPendingDrag(): void {
  if (pendingDragTimer !== null) {
    clearTimeout(pendingDragTimer)
    pendingDragTimer = null
  }
  pendingDragStart = null
}

function beginSidebarDrag(e: PointerEvent): void {
  // 对侧栏操作（点按/拖拽）→ pokeSidebar 唤醒无操作隐藏，侧栏立即在
  // 「原位置」（sidebarFloatPos 拖动位置）出现、不回边框隐藏，随后可拖。
  pokeSidebar()
  const el = navBarEl.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  dragStart = { sx: e.clientX, sy: e.clientY, ox: rect.left, oy: rect.top }
  dragPos.value = { x: rect.left, y: rect.top }
  sidebarDragging.value = true
  try { el.setPointerCapture(e.pointerId) } catch { /* noop */ }
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
  e.preventDefault()
}

function onDragMove(e: PointerEvent): void {
  // 房间重排进行中：放弃侧栏拖动，避免「既移侧栏又重排」的手势冲突
  if (navReorder.active) {
    cancelSidebarDrag()
    return
  }
  if (!dragStart || !navBarEl.value) return
  const rect = navBarEl.value.getBoundingClientRect()
  let nx = dragStart.ox + (e.clientX - dragStart.sx)
  let ny = dragStart.oy + (e.clientY - dragStart.sy)
  // 钳制：横向保证侧栏至少有一个 keep 区域留在视口内；
  // 纵向允许侧栏向上溢出（top 可为负，避免比视口高的侧栏底部永远误触吸附），
  // 但不允许向下溢出超过 keep（保证底部可抓取）。
  // 配合「≤24px 才吸附」的判定：自由放置中部时顶/底都不进阈值 → 停任意位置，不再退化贴边。
  const keep = 48
  nx = Math.max(-(rect.width - keep), Math.min(nx, window.innerWidth - keep))
  ny = Math.max(-(rect.height - keep), Math.min(ny, window.innerHeight - keep))
  dragPos.value = { x: nx, y: ny }
}

function cancelSidebarDrag(): void {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  sidebarDragging.value = false
  dragStart = null
  dragPos.value = null
}

function onDragEnd(): void {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', onDragEnd)
  const el = navBarEl.value
  const pos = dragPos.value // 指针跟手的真实坐标（不受 CSS 类污染）
  sidebarDragging.value = false
  dragStart = null
  dragPos.value = null
  if (!el || !pos) return
  const rect = el.getBoundingClientRect()
  const vw = window.innerWidth
  const vh = window.innerHeight
  // 关键：吸附判定基于「拖动末帧跟手坐标 pos」而非 getBoundingClientRect()——
  // 后者在松手瞬间仍挂着旧 float-edge-* 类（如 left:0/top:50%），会读出被 CSS 拉偏的位置，
  // 导致「一松手自动回缩左上角」。pos 是纯指针位置，干净可靠。
  const left = pos.x
  const top = pos.y
  const right = left + rect.width
  const bottom = top + rect.height
  // 四边各自到视口对应边的真实距离（基于指针跟手坐标 pos，不受 CSS 类污染）
  const distLeft = left
  const distRight = vw - right
  const distTop = top
  const distBottom = vh - bottom
  // 窄屏（手机/平板）：保持覆盖抽屉模型。松手吸附到最近水平边（左/右）并清除自由浮动坐标，
  // 使抽屉收起（translateX(-110%)）仍可正常隐藏，避免拖动后变浮动面板卡死无法收起。
  if (isMobileOrTablet.value) {
    setSidebarFloatEdge(distLeft <= distRight ? 'left' : 'right')
    setSidebarFloatPos(null)
    return
  }
  // 吸附阈值：窗体任意边距视口该边 ≤ 24px 即判定为「贴该边」。
  // 但当侧栏在该方向尺寸 ≥ 视口尺寸时，该方向无法自由放置（必然溢出），
  // 此时不吸附该方向，避免「侧栏太高 → 底部永远进阈值 → 拖到中部也强制贴边」的退化。
  // 这样矮视口下垂直方向自由拖、仅水平吸附；宽视口下四角/单边均正常工作。
  const SNAP = 24
  const vTooShort = rect.height >= vh - SNAP * 2 // 垂直空间不足以自由放置
  const hTooShort = rect.width >= vw - SNAP * 2 // 水平空间不足以自由放置
  const snapL = !hTooShort && distLeft <= SNAP
  const snapR = !hTooShort && distRight <= SNAP
  const snapT = !vTooShort && distTop <= SNAP
  const snapB = !vTooShort && distBottom <= SNAP
  const hEdge = snapL ? 'left' : snapR ? 'right' : '' // 水平贴边（左/右）
  const vEdge = snapT ? 'top' : snapB ? 'bottom' : ''   // 垂直贴边（上/下）
  const edge =
    hEdge && vEdge ? `${vEdge.charAt(0)}${hEdge.charAt(0)}` : // 角落：tl / tr / bl / br（垂直边首字母+水平边首字母）
    hEdge ? hEdge :                                            // 仅水平贴边：left / right（y 自由）
    vEdge ? vEdge :                                            // 仅垂直贴边：top / bottom（x 自由）
    'free'                                                     // 都不贴：自由放置任意位置
  setSidebarFloatEdge(edge)
  // 落档决策 + 坐标存储：
  //  - 四角（hEdge && vEdge）：交 CSS float-edge-tl/tr/bl/br 严丝合缝贴角，清坐标。
  //  - 仅单边（左/右/顶/底）：保留用户拖动的「自由轴」坐标（贴左时 y 自由、贴顶时 x 自由），
  //    只把吸附轴钉到视口边（left=0 / right=0 / top=0 / bottom=0），绝不用 CSS 居中覆盖用户位置。
  //  - 都不贴（free）：存完整坐标，任意位置停。
  if (hEdge && vEdge) {
    // 四角：完全交 CSS 定位
    setSidebarFloatPos(null)
  } else if (hEdge) {
    // 仅贴左/右：y 保留用户拖动位置（自由），x 钉到边
    const x = hEdge === 'left' ? 0 : vw - rect.width
    setSidebarFloatPos({ x: Math.round(x), y: Math.round(top) })
  } else if (vEdge) {
    // 仅贴顶/底：x 保留用户拖动位置（自由），y 钉到边
    const y = vEdge === 'top' ? 0 : vh - rect.height
    setSidebarFloatPos({ x: Math.round(left), y: Math.round(y) })
  } else {
    // free：完整坐标任意停
    setSidebarFloatPos({ x: Math.round(left), y: Math.round(top) })
  }
}
const breathingRef = ref<InstanceType<typeof BreathingLayer> | null>(null)
// 路由顶部加载条实例（接线孤儿 RouteProgress：组件已完工但此前从未挂载）
const routeProgressRef = ref<InstanceType<typeof RouteProgress> | null>(null)

// 安全岛五击触发器
const sanctuaryTrigger = useSanctuaryTrigger()
const sanctuaryBreathProgress = ref(0)
// 对接呼吸层真实节律：安全岛激活时全局呼吸层被暂停，此处复用同一引擎暴露的
// --br-cycle-ms（已含 ui:breathing-speed 软效果缩放）驱动余弦平滑呼吸相位。
// 仅在安全岛激活时运行 RAF，避免常驻重渲染（性能守卫同原模拟）。
interface BreathingExposed {
  br: { phase: { value: { styleVars: Record<string, string> } } }
}
let breathRaf: number | null = null
let breathStart = 0

function breathCycleMs(): number {
  const engine = breathingRef.value as unknown as BreathingExposed | null
  const raw = engine?.br.phase.value.styleVars['--br-cycle-ms']
  const ms = raw ? parseInt(raw, 10) : 0
  return ms > 0 ? ms : 8000
}

function breathFrame(now: number) {
  if (!breathStart) breathStart = now
  const cycle = breathCycleMs()
  const t = (now - breathStart) % cycle
  // 0→1→0 平滑呼吸（与呼吸层 ease-in-out 关键帧同构：calm→peak→calm）
  sanctuaryBreathProgress.value = 0.5 - 0.5 * Math.cos((2 * Math.PI * t) / cycle)
  breathRaf = requestAnimationFrame(breathFrame)
}

function startBreathSim() {
  if (breathRaf != null) return
  breathStart = 0
  breathRaf = requestAnimationFrame(breathFrame)
}

function stopBreathSim() {
  if (breathRaf != null) {
    cancelAnimationFrame(breathRaf)
    breathRaf = null
  }
  breathStart = 0
  sanctuaryBreathProgress.value = 0
}

const { isSanctuaryActive } = useRuntimeState()
watch(isSanctuaryActive, (active) => {
  if (active) startBreathSim()
  else stopBreathSim()
})
// P2 感知层订阅取消句柄
let perceptionUnsub: (() => void) | null = null

// 引力场画布：按路由映射背景强度。
// - 首页（'/'）全强度 1：粒子与连线全开；
// - 安全岛（'/sanctuary'）0：画布近透明、粒子最少，营造静谧（呼吸循环由 Sanctuary 暂停）；
// - 其余路由 0.35：弱化到环境级（粒子数、连线、帧率、透明度随 intensity 缩放，语义不变）。
const $router = useRouter()
const route = useRoute()
const canvasIntensity = computed(() => {
  const path = $router.currentRoute.value.path
  if (path === '/') return 1
  if (path === '/sanctuary') return 0
  return 0.35
})

// ---- 全局自定义背景（画布之下，跨路由持久化） ----
const configBridge = useConfig()
const { config: appConfig } = configBridge

// 宅院壳激活态（供镜我玉珠居中定位判断）
const configStore = useConfigStore()
const activeShell = computed(() => configStore.config.worldShell.activeShell)
// 三态表面态：3D 正厅时驱动 .nav-bar 自动降级，避免侧栏顶部吸附态压住 homeCentered 顾问球（2026-08-26 补）
const is3dShell = computed(() => configStore.config.worldShell.surfaceState === 'hall-3d')
// 模板 :class 已消费 is3dShell；显式 void 让 vue-tsc 视为「已使用」（避免 TS6133 误报）
void is3dShell.value

// 应用品牌图标（app 自身 logo）：侧栏品牌徽标 + 运行时 favicon 同步
const appBrandIcon = computed(() => configStore.config.appBrandIcon ?? null)
watch(appBrandIcon, async (v) => {
  const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (link && v && isImageIcon(v)) link.href = v
  // 桌面端：品牌图（图片）热替换窗口标题栏 / 任务栏图标（item3 运行时补全）
  await applyBrandIconToWindow(v)
}, { immediate: true })

// B0 加密存储：启动期若磁盘已加密且内存未解锁，挂起主界面、显示解锁遮罩
const unlockStore = useUnlockStore()
const showUnlock = computed(() => unlockStore.needsUnlock())
// 心流页('/')：幕僚珠珠列顶端居中（与计时珠纵向并存，D4/D5）
const homeCentered = computed(() => route.path === '/')

const appBackground = computed(() => appConfig.background)
function handleAppBackgroundError() {
  configBridge.resetBackgroundMedia()
}

// 边缘面板全局状态
const panelVisible = ref(false)
provide('edgePanelVisible', panelVisible)

// ---- 路由过渡协调 ----
// 路由过渡完成后置为 true，子视图通过 useViewEntrance 注入感知
const routeTransitionDone = ref(false)
provide(ROUTE_TRANSITION_DONE_KEY, routeTransitionDone)

/** 路由过渡动画完成后，通知子视图入场 */
function onAfterRouteEnter() {
  nextTick(() => {
    routeTransitionDone.value = true
  })
}

// ---- 路由加载状态（骨架屏） ----
const currentSkeletonVariant = ref<'home' | 'card-list' | 'list' | 'detail' | 'stats' | 'default'>('default')

/** 路由路径到骨架屏变体的映射 */
const SKELETON_VARIANT_MAP: Record<string, string> = {
  '/': 'home',
  '/home-space': 'card-list',
  '/timeline': 'list',
  '/anchor': 'card-list',
  '/garden': 'card-list',
  '/sanctuary': 'stats',
  '/guard': 'stats',
  '/knowledge': 'card-list',
  '/workhub': 'card-list',
  '/worklog': 'card-list',
  '/study': 'card-list',
  '/dream-nook': 'card-list',
  '/growth-garden': 'card-list',
  '/constitution': 'detail',
  '/material-workshop': 'card-list',
  '/advisors': 'card-list',
  '/bag': 'list',
  '/craft': 'card-list',
  '/reward': 'card-list',
  '/self-reward': 'card-list',
  '/career': 'list',
  '/rest': 'stats',
}

// 通过 router.beforeEach 跟踪路由加载，设置骨架屏变体
$router.beforeEach((to) => {
  currentSkeletonVariant.value = (SKELETON_VARIANT_MAP[to.path] as any) || 'default'
  // 路由切换启动顶部加载条（RouteProgress 已在模板挂载，可选链防初始未绑定）
  routeProgressRef.value?.start()
  return true
})

// 路由落地后收束顶部加载条（与 router/index.ts 既有 afterEach 触觉反馈互不冲突）
$router.afterEach(() => {
  routeProgressRef.value?.finish()
})

// ---- 响应式状态 ----
// 注意：sidebarCollapsed 现由 useAppearance 持久化（ui:sidebar-collapsed），
// 此处不再声明本地 ref，避免与持久化状态脱节（汉堡 ≡ 切换需跨刷新保留）。
// 响应式断点统一走 useBreakpoint()（与设备能力 hasCapability 解耦，T6.1）
const bp = useBreakpoint()
const isMobile = bp.isPhone
const isMobileOrTablet = computed(() => !bp.isDesktop.value)
const isDesktop = bp.isDesktop

// 上一次视口断点（isDesktop 态），用于检测 1024px 边界跃迁
let lastIsDesktop: boolean | null = null

// ① 窗口缩放重锚：侧栏若为自由浮动位置（sidebarFloatPos 有值），钳进视口，
//    避免「缩小窗口后侧栏停在旧像素位置 / 跑出屏幕」。
//    吸附态（pos 为 null，四角/单边吸附）由 CSS float-edge-* 接管，本就不受缩放影响。
let reanchorRaf = 0
function reanchorSidebar() {
  if (!sidebarFloatPos.value) return
  const el = navBarEl.value
  if (!el) return
  const next = clampSidebarFloat(
    sidebarFloatPos.value,
    sidebarFloatEdge.value || 'free',
    { width: el.offsetWidth, height: el.offsetHeight },
    window.innerWidth,
    window.innerHeight,
  )
  if (next.x !== sidebarFloatPos.value.x || next.y !== sidebarFloatPos.value.y) {
    setSidebarFloatPos(next)
  }
}

function onResize() {
  const nowDesktop = window.innerWidth >= 1024
  // 仅在跨过 1024px 断点（桌面 <-> 移动/平板）时重置折叠态：
  // 普通 resize（桌面拖拽窗口、iOS 键盘弹出等不跨断点的宽度变化）不干扰用户手动展开/收起。
  // 首次初始化（lastIsDesktop 为 null）时采用「桌面端启动默认状态」设置（侧栏自定义 · 默认折叠）。
  if (lastIsDesktop === null) {
    setSidebarCollapsed(sidebarDefaultCollapsed.value)
  } else if (lastIsDesktop !== nowDesktop) {
    setSidebarCollapsed(true)
  }
  lastIsDesktop = nowDesktop
  // 缩放重锚（rAF 合帧，规避拖拽缩放时高频写存储）
  if (reanchorRaf) cancelAnimationFrame(reanchorRaf)
  reanchorRaf = requestAnimationFrame(reanchorSidebar)
}

// 汉堡 ≡ 切换侧栏显隐（调出 / 隐藏）：
// - 调出（collapsed → false）：pokeSidebar() 唤醒无操作隐藏，侧栏立即在
//   「原位置」（sidebarFloatPos 拖动位置）可见。
// - 隐藏（collapsed → true）：加 .collapsed 类滑出，用户主动收起。
function onToggleSidebar() {
  const next = !sidebarCollapsed.value
  setSidebarCollapsed(next)
  if (!next) pokeSidebar() // 调出时唤醒无操作隐藏，确保不被自动隐藏遮挡
}

// 移动/平板端：抽屉为覆盖层，点击其中导航项后自动收起，避免遮挡界面
function closeMobileDrawer() {
  if (isMobileOrTablet.value) setSidebarCollapsed(true)
}

onMounted(() => {
  window.addEventListener('resize', onResize)
  onResize()

  // 宪法效果引擎初始化（监听规则开关，自动应用产品行为效果）
  initConstitutionEffect()

  // 超级自定义 · 视觉强度初始化（粒子画布 / 环境辉光 / 颗粒 / 微尘 / 背景 各项不透明度）
  initAppearance()

  // 超级自定义 · 界面自动隐藏（沉浸模式）全局活动监听
  initChromeAutoHide()

  // P2 感知层：采集器已在 main.ts bootstrap 启动；此处订阅并把快照写入感知 store（单一真源）
  const perception = getPerception()
  perceptionUnsub = perception.subscribe((state) => {
    perceptionStore.setEnvironment(state)
  })

  // 全局幕僚顾问初始化（延迟到首帧绘制后，避免阻塞首屏渲染 → 启动提速）
  // resetDaily/checkReturn/onVisit 均为纯谏言逻辑，非首屏渲染所需，放 rAF 后置即可。
  requestAnimationFrame(() => {
    advisor.resetDaily()
    advisor.checkReturn()
    advisor.onVisit(new Date().getHours())
  })

  // 安全岛呼吸模拟：若进入时已处于激活态则启动（watch 只响应后续变化）
  if (isSanctuaryActive.value) {
    startBreathSim()
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  if (breathRaf != null) {
    cancelAnimationFrame(breathRaf)
    breathRaf = null
  }
  if (perceptionUnsub) {
    perceptionUnsub()
    perceptionUnsub = null
  }
})

// ---- 单房间风格覆盖（全局为主 + 单房间可覆盖） ----
// 覆盖仅作用于内容容器 .main-content（不污染侧栏/壳层），随路由切换自动应用。
const roomStyle = useRoomStyle()
const roomStyleVars = computed(() => roomStyle.roomStyleVars(currentRoomId.value))
const effectiveBackground = computed<BackgroundMediaConfig>(() => {
  const scene = roomStyle.roomBackgroundScene(currentRoomId.value)
  const base = appBackground.value
  if (scene) return { ...base, type: 'preset', presetScene: scene }
  return base
})

// ---- 房间数据 ----
const currentRoomId = computed(() => nav.currentRoomId.value)
const currentRoom = computed(() => nav.currentRoom.value)
const adjacentIds = computed(() => nav.adjacentRooms.value.map(r => r.id))

// ---- 屏风契约 · 玉珠门厅锚点 ----
// 读取世界壳共享的屏风矩形契约：门厅态（courtyard 或通用门厅）下，
// 把玉珠光球锚定到屏风计时器旁的屏侧玉珠位；其余壳回落默认右下常驻位。
import { screenContract, getEffectiveScreenRect } from './modules/world-shell/screenContract'
const hallAnchor = computed<{ x: number; y: number } | null>(() => {
  if (!screenContract.ready) return null
  const r = getEffectiveScreenRect()
  // 优先取契约内屏侧玉珠位；fallback 矩形自带 jade，缺失时取矩形右侧中点
  const jade = r.jade
  if (jade) return { x: jade.x, y: jade.y }
  return { x: r.x + r.w + 40, y: r.y + r.h / 2 }
})

// ---- 超级自定义 · 收藏式导航（侧栏与底栏统一驱动） ----
const rm = useRoomManager()
const taxonomy = useRoomTaxonomy()

// 未自定义排序时的「自然序」：主链路优先（与现状首屏顺序一致），其余按房间图定义序
// ---- 侧栏全量树 · 按蓝图18空间排布（家为原点 → 主链路 → 世界空间七领域 → 系统边界）----
interface NavNode {
  id: string
  name: string
  icon: string
  color: string
  path: string
  group: string
  slot?: string
  domain?: string
  children: NavNode[]
}

// 哪些房间需要从"父房间"下作为子节点呈现（更漏、家延伸等）
function childRoomsOf(parentId: string): RoomNode[] {
  return getAllRooms().filter((r) => r.branchFrom === parentId)
}

// 超级自定义 · 用户 pin 覆盖（优先读 pinnedSlot/pinnedDomain，否则沿用 room-graph 默认）
function effSlot(r: RoomNode): RoomSlot {
  const cfg = rm.getRoomConfig(r.id)
  return (cfg?.pinnedSlot as RoomSlot) ?? r.slot
}
function effDomain(r: RoomNode): RoomDomain {
  const cfg = rm.getRoomConfig(r.id)
  return (cfg?.pinnedDomain as RoomDomain) ?? r.domain
}

// 导航可见性：用户在「房间设置 / 房间管理器」隐藏的房间从侧栏移除（home / home-space 为原点，永不隐藏）
function isNavVisible(r: RoomNode): boolean {
  if (r.id === 'home' || r.id === 'home-space') return true
  return rm.getRoomConfig(r.id)?.visible !== false
}

const navTree = computed<NavNode[]>(() => {
  const all = getAllRooms()
  const tree: NavNode[] = []

  // 1) 家 · 原点（home-space 为根，列出未 pin 走其他区的家延伸房间）
  const home = all.find((r) => r.id === 'home-space')
  if (home) {
    const homeKids = childRoomsOf('home-space')
      .filter((r) => effSlot(r) === 'screen' && isNavVisible(r)) // 用户没钉到其他区的家延伸才留在家下
      .map(roomToNode)
    tree.push({ ...roomToNode(home), children: homeKids })
  }
  // 心流（引力场）作为家原点旁的入口
  const heart = all.find((r) => r.id === 'home')
  if (heart) tree.push(roomToNode(heart))

  // 2) 其余房间按所选分类体系（taxonomy）聚合重排
  const rest = all.filter((r) => r.id !== 'home-space' && r.id !== 'home' && isNavVisible(r))
  const buckets = new Map<string, RoomNode[]>()
  for (const r of rest) {
    const key = dimKey(r)
    const arr = buckets.get(key) ?? []
    arr.push(r)
    buckets.set(key, arr)
  }
  // 分组头集合 = 维度全集 ∪ 实际有房间的桶。
  // 关键修复：空桶同样生成分组头（带「空 · 拖到此处」占位），保证：
  //   · 把某组房间全移走后，源组头仍在 → 还能把房间拖回去（此前源组头消失即永久移不回）；
  //   · 新建的自定义分组（roomIds: []）立刻可见、且是有效拖拽落点。
  const groupKeys = collectTaxonomyKeys(
    taxonomy.selectedTaxonomy.value,
    buckets.keys(),
    taxonomy.customGroups.value.map((g) => g.id),
  )
  // 应用用户分组头排序覆盖（Item 1：预设/自定义分组可拖动重排）
  const orderedKeys = taxonomy.applyGroupOrderOverride(taxonomy.selectedTaxonomy.value, groupKeys)
  for (const key of orderedKeys) {
    const rooms = buckets.get(key) ?? []
    const kids = rooms
      .sort((a, b) => roomOrder(a.id) - roomOrder(b.id))
      .map((r) => {
        // 更漏：把其 branchFrom==='worklog' 的子空间挂上
        if (r.id === 'worklog') {
          return { ...roomToNode(r), children: childRoomsOf('worklog').filter(isNavVisible).map(roomToNode) }
        }
        return roomToNode(r)
      })
    tree.push(buildGroupHead(key, kids))
  }

  return tree
})

/** 未应用用户覆盖的分组头默认顺序（供 onReorderGroup 以当前全序为基准重排） */
const defaultGroupKeys = computed<string[]>(() => {
  const rest = getAllRooms().filter((r) => r.id !== 'home-space' && r.id !== 'home' && isNavVisible(r))
  const b = new Map<string, RoomNode[]>()
  for (const r of rest) {
    const k = dimKey(r)
    const a = b.get(k) ?? []
    a.push(r)
    b.set(k, a)
  }
  return collectTaxonomyKeys(
    taxonomy.selectedTaxonomy.value,
    b.keys(),
    taxonomy.customGroups.value.map((g) => g.id),
  )
})

/** 按当前分类体系计算房间的聚合维度 key */
function dimKey(r: RoomNode): string {
  switch (taxonomy.selectedTaxonomy.value) {
    case 'domain':
      // 主链路房间未显式设 domain，归到「时间 · 记忆」
      return effDomain(r) ?? (r.isMainPath ? 'time' : 'system')
    case 'group':
      return r.group
    case 'slot':
      return effSlot(r) ?? r.slot ?? 'screen'
    case 'custom': {
      const gid = taxonomy.groupIdOf(r.id)
      return gid ?? UNGROUPED_KEY
    }
  }
}

/** 按维度 key 构造导航树分组头节点（id 前缀 tax-* 供 onMoveNode 落点判定） */
function buildGroupHead(key: string, children: NavNode[]): NavNode {
  const t = taxonomy.selectedTaxonomy.value
  if (t === 'domain') {
    return { id: `tax-domain-${key}`, name: DOMAIN_LABELS[key as RoomDomain] ?? key, icon: '·', color: '#b89a6a', path: '', group: key, slot: undefined, domain: key, children }
  }
  if (t === 'group') {
    return { id: `tax-group-${key}`, name: GROUP_LABELS[key as RoomGroup] ?? key, icon: '·', color: '#b89a6a', path: '', group: key, slot: undefined, domain: undefined, children }
  }
  if (t === 'slot') {
    return { id: `tax-slot-${key}`, name: SLOT_LABELS[key as RoomSlot] ?? key, icon: '·', color: '#b89a6a', path: '', group: 'world', slot: key, domain: undefined, children }
  }
  // custom（含 roomIds 为空的新建分组：仍生成分组头，作为有效拖拽落点）
  if (key === UNGROUPED_KEY) {
    return { id: 'tax-custom-ungrouped', name: '未分组', icon: '·', color: '#b89a6a', path: '', group: 'world', slot: undefined, domain: undefined, children }
  }
  const g = taxonomy.customGroups.value.find((g) => g.id === key)
  return { id: `tax-custom-${key}`, name: g?.name ?? '未命名分组', icon: '·', color: '#b89a6a', path: '', group: 'world', slot: undefined, domain: undefined, children }
}

/** 房间排序权重（order===0 视为自然序，保持 room-graph 定义序） */
function roomOrder(id: string): number {
  return rm.getRoomConfig(id)?.order ?? 0
}

function roomToNode(r: RoomNode): NavNode {
  const cfg = rm.getRoomConfig(r.id)
  return {
    id: r.id,
    name: cfg?.customName ?? r.name,
    icon: cfg?.customIcon ?? r.icon,
    color: cfg?.customColor ?? r.color,
    path: r.path,
    group: r.group,
    slot: effSlot(r),
    domain: effDomain(r),
    children: [],
  }
}

// 侧栏全量树展开状态。
// 默认展开所有「分类分组头」(tax-*)，让房间立即可见、可拖到别的分组
// （修复：原先仅展开 home-space → 分组全折叠 → 侧栏只渲染分组头、无房间可拖，
//   用户感知为「根本不能移动房间到别的分组」）。用户手动折叠仍生效（watch 仅追加不收回）。
const expandedIds = ref<Set<string>>(
  new Set(['home-space']),
)
function toggleExpand(id: string) {
  const s = new Set(expandedIds.value)
  if (s.has(id)) s.delete(id)
  else s.add(id)
  expandedIds.value = s
}
// 默认展开分类分组头：挂载即把当前 navTree 中所有 tax-* 头加入展开集（仅追加，尊重手动折叠）
watch(
  navTree,
  (tree) => {
    const s = new Set(expandedIds.value)
    let changed = false
    for (const n of tree) {
      if (n.id.startsWith('tax-') && !s.has(n.id)) {
        s.add(n.id)
        changed = true
      }
    }
    if (changed) expandedIds.value = s
  },
  { immediate: true },
)

// ---- 超级自定义 · 拖拽落点处理 ----
function findNavNode(nodes: NavNode[], id: string): NavNode | undefined {
  for (const n of nodes) {
    if (n.id === id) return n
    const found = findNavNode(n.children, id)
    if (found) return found
  }
  return undefined
}

function onMoveNode(draggedId: string, targetId: string) {
  // 分组头之间拖动 → 重排分组头顺序（预设分组/自定义分组通用，Item 1）
  if (draggedId.startsWith('tax-') && targetId.startsWith('tax-')) {
    onReorderGroup(draggedId, targetId)
    return
  }
  const target = findNavNode(navTree.value, targetId)
  if (!target || draggedId === target.id) return
  // 拖到分组头（无 path）：改变归属维度
  if (!target.path) {
    if (target.id.startsWith('tax-domain-')) {
      const domain = target.id.slice('tax-domain-'.length) as RoomDomain
      // 仅改领域归属，不动 slot 钉：
      // 原先 rm.setRoomPin(draggedId, null, domain) 会把 pinnedSlot 一并写成 null，
      // 属于「改 A 顺手清掉 B」的破坏性副作用（用户明确要求不改变现有状态），
      // 且房间被拖走后丢失原 slot，再拖回来时行为已变、主观感受「拖不回去」。
      rm.updateRoomConfig(draggedId, { pinnedDomain: domain })
    } else if (target.id.startsWith('tax-slot-')) {
      const slot = target.id.slice('tax-slot-'.length) as RoomSlot
      rm.updateRoomConfig(draggedId, { pinnedSlot: slot }) // 保留 domain 钉
    } else if (target.id.startsWith('tax-custom-')) {
      const gid = target.id.slice('tax-custom-'.length)
      if (gid === 'ungrouped') taxonomy.removeRoomFromGroups(draggedId)
      else taxonomy.addRoomToGroup(gid, draggedId)
    }
    // tax-group-* 为只读聚合视图（group 是 room-graph 常量不可写），不触发归属变更
    // 展开目标组，让用户看到结果
    const s = new Set(expandedIds.value)
    s.add(target.id)
    expandedIds.value = s
    return
  }
  // 拖到房间项（有 path）：同组内排序 + 归属对齐到目标房间的大区/分组
  rm.reorderWithinGroup(draggedId, target.id)
  if (target.domain) rm.updateRoomConfig(draggedId, { pinnedDomain: target.domain as RoomDomain })
  if (target.slot) rm.updateRoomConfig(draggedId, { pinnedSlot: target.slot as RoomSlot })
  if (taxonomy.selectedTaxonomy.value === 'custom' && target.id) {
    const gid = taxonomy.groupIdOf(target.id)
    if (gid) taxonomy.addRoomToGroup(gid, draggedId)
  }
}

/** 从分组头 id 剥出维度 key（去掉 tax-<体系>- 前缀） */
function stripGroupKey(id: string): string {
  if (id.startsWith('tax-domain-')) return id.slice('tax-domain-'.length)
  if (id.startsWith('tax-group-')) return id.slice('tax-group-'.length)
  if (id.startsWith('tax-slot-')) return id.slice('tax-slot-'.length)
  if (id.startsWith('tax-custom-')) return id.slice('tax-custom-'.length)
  return ''
}

/** 重排某分类体系下两个分组头的相对顺序：取当前全序 → 移动 fromKey 到 toKey 位 → 持久化 */
function onReorderGroup(fromId: string, toId: string): void {
  const tax = taxonomy.selectedTaxonomy.value
  const fromKey = stripGroupKey(fromId)
  const toKey = stripGroupKey(toId)
  if (!fromKey || !toKey || fromKey === toKey) return
  const current = taxonomy.applyGroupOrderOverride(tax, defaultGroupKeys.value)
  const f = current.indexOf(fromKey)
  const t = current.indexOf(toKey)
  if (f < 0 || t < 0 || f === t) return
  const copy = current.slice()
  const [moved] = copy.splice(f, 1)
  copy.splice(t, 0, moved)
  taxonomy.setGroupOrder(tax, copy)
}

// ---- 页面过渡动画（光门过渡） ----
const pageTransition = computed(() => {
  if (!nav.lastNavigation.value) return 'page-fade'
  const dir = nav.lastNavigation.value.direction
  if (dir === 'forward') return 'light-gate-forward'
  if (dir === 'backward') return 'light-gate-backward'
  if (dir === 'branch') return 'light-gate-branch'
  if (dir === 'return') return 'light-gate-return'
  return 'page-fade'
})

// 路由切换时重置过渡状态，使新视图等待过渡完成再入场
watch(() => nav.currentRoomId.value, () => {
  routeTransitionDone.value = false
})
</script>

<style>
/* 全局样式已迁移至 assets/design-tokens.css 和 assets/animations.css */
</style>

<style scoped>
/* ============================================================
   应用壳层
   ============================================================ */

.app-shell {
  display: flex;
  min-height: 100dvh;
  width: 100vw;
  position: relative;
  background: var(--bg-primary);
  /* 侧边栏宽度令牌：视图内 position:fixed 浮层用其偏移，避免压在侧边栏上 */
  /* 流式默认值：随视口连续缩放（200–280px）；桌面端用户显式自定义时由 shellStyle 覆盖为固定 px */
  --sidebar-w: clamp(200px, 17vw, 280px);
  /* 移动/平板端顶栏与底栏高度令牌：流式区间，触控目标保持安全下限 */
  --edge-bar-h: clamp(44px, 6vw, 56px);
  /* 仅裁横向溢出，纵向滚动交给 .main-content（唯一滚动容器）。
     用 clip 而非 hidden：hidden 会在此处创建块级格式化/裁剪上下文，
     吞掉内部主内容区的纵向滚动条；clip 不阻塞子项滚动。 */
  overflow-x: clip;
}

/* ---- 夜静调暗遮罩（宪法第49条） ---- */
/* 固定全屏、pointer-events:none 不拦截任何交互；仅视觉调暗。高 z-index 让其覆盖内容层，
   但透传点击。随 isNight 切换 .active 平滑过渡。 */
.night-dim-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-mask);
  pointer-events: none;
  background: radial-gradient(120% 120% at 50% 0%, rgba(6, 10, 26, 0.34), rgba(4, 6, 18, 0.42));
  opacity: 0;
  transition: opacity 1.2s ease;
}
.night-dim-overlay.active {
  opacity: 1;
}

/* ---- 数字安息日叠层（宪法第50条） ---- */
/* 冷色静谧叠层 + 底部「数字安息日」标签；与夜静调暗的暗色不同，呈清冷断联感。
   同样 pointer-events:none，不拦截交互；z-index 略高于夜静调暗，二者可叠加。 */
.sabbath-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-mask);
  pointer-events: none;
  background: linear-gradient(180deg, rgba(26, 42, 78, 0.14), rgba(18, 30, 60, 0.2));
  opacity: 0;
  transition: opacity 1.2s ease;
}
.sabbath-overlay.active {
  opacity: 1;
}
.sabbath-label {
  position: absolute;
  left: 50%;
  bottom: clamp(20px, 4vh, 40px);
  transform: translateX(-50%);
  padding: 6px 16px;
  border-radius: 999px;
  font-size: 12px;
  letter-spacing: 0.08em;
  color: rgba(200, 214, 240, 0.82);
  background: rgba(20, 32, 60, 0.42);
  border: 1px solid rgba(150, 170, 220, 0.22);
  backdrop-filter: blur(6px);
}

/* ---- 引力场画布层（背景持久化） ---- */
.canvas-room {
  position: fixed;
  inset: 0;
  z-index: 0;
}
/* 全屏铺底态：去掉内嵌卡片的圆角与贴边内发光，否则屏幕四角被裁成“浮动卡片”割裂缝 */
:deep(.canvas-room) {
  border-radius: 0;
  box-shadow: none;
}

/* ---- 全局自定义背景层（画布之下、壳层底色之上） ---- */
/* 注意：z-index 必须为 0（而非 -1）。.app-shell 自身有实心底色 background:var(--bg-primary)，
   负 z-index 子元素会被父级自身背景盖死（CSS 经典陷阱），自定义背景永远透不出来。
   取 0 且与 .canvas-room 同为 z-index:0，靠 DOM 顺序（本层在前）落在画布之下、视图之上。 */
.app-base-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

/* ---- 环境氛围层 ---- */
.ambient-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 1;
  overflow: hidden;
}

.ambient-glow {
  position: absolute;
  top: -30%;
  left: 20%;
  width: 60%;
  height: 80%;
  background: radial-gradient(
    ellipse at center,
    rgba(var(--accent-rgb), 0.04) 0%,
    transparent 70%
  );
  animation: breathe 8s ease-in-out infinite;
  /* 超级自定义：环境辉光强度，默认 1 与现状一致 */
  opacity: var(--ambient-glow-alpha, 1);
}

.ambient-grain {
  position: absolute;
  inset: -50%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.03'/%3E%3C/svg%3E");
  background-repeat: repeat;
  background-size: 256px 256px;
  animation: grain 0.5s steps(6) infinite;
  /* 超级自定义：环境颗粒强度，默认 0.5 与现状一致 */
  opacity: var(--ambient-grain-alpha, 0.5);
}

/* 漂浮微尘：此前为空占位，现补上可自定义强度的缓慢漂移层（默认 0.3，极淡） */
.ambient-dust {
  position: absolute;
  inset: -20%;
  background-image:
    radial-gradient(1.5px 1.5px at 20% 30%, rgba(var(--accent-rgb), 0.5) 0%, transparent 60%),
    radial-gradient(1px 1px at 70% 60%, rgba(var(--accent-rgb), 0.4) 0%, transparent 60%),
    radial-gradient(1.5px 1.5px at 40% 80%, rgba(var(--accent-rgb), 0.35) 0%, transparent 60%),
    radial-gradient(1px 1px at 85% 20%, rgba(var(--accent-rgb), 0.4) 0%, transparent 60%),
    radial-gradient(1px 1px at 55% 45%, rgba(var(--accent-rgb), 0.3) 0%, transparent 60%);
  background-repeat: no-repeat;
  animation: dust-drift 60s linear infinite;
  opacity: var(--ambient-dust-alpha, 0.3);
}

/* ---- 导航栏 ---- */
.nav-bar {
  width: var(--sidebar-w, 220px);
  /* 悬浮窗高度由内容决定（短一些），不再铺满整屏；上限留边距避免顶穿 */
  max-height: calc(100dvh - 32px);
  display: flex;
  flex-direction: column;
  position: relative;
  z-index: var(--z-navbar);
  /* 侧栏背景：实底模式用不透明渐变（等同现状）；毛玻璃模式由 --sidebar-bg-alpha 调透 + --sidebar-blur 模糊 */
  background: linear-gradient(
    180deg,
    rgba(var(--bg-primary-rgb), var(--sidebar-bg-alpha, 1)) 0%,
    rgba(16, 14, 12, var(--sidebar-bg-alpha, 1)) 100%
  );
  backdrop-filter: blur(var(--sidebar-blur, 0px));
  border-right: 1px solid var(--border-light);
  flex-shrink: 0;
  transition: transform var(--transition), width var(--transition), background var(--transition),
    opacity var(--transition), box-shadow var(--transition);
}

/* 拖动中：禁用过渡防抖、禁止选中、抬升层级抓取手型 */
.nav-bar.dragging {
  transition: none !important;
  user-select: none;
  z-index: var(--z-navbar-drag);
  cursor: grabbing;
}

/* 房间重排拖拽进行中：强制侧栏可命中且停屏上。
   根因：沉浸自动隐藏（.app-shell.chrome-hidden）会给 .nav-bar 设
   pointer-events:none !important 并把侧栏 translate 出屏；拖拽时
   elementFromPoint 因此「看不见」任何分组头 → targetId 永为空 →
   房间永远拖不动（用户实测「侧边栏移动不了」）。拖拽激活期间
   必须压住这两个状态，保证落点检测能命中分组头。
   特异性：须高于 .app-shell.chrome-hidden .nav-bar(0,3,0,!important)，
   故首条用 .app-shell.chrome-hidden .nav-bar.room-drag-active(0,4,0) 必赢；
   次条 .app-shell .nav-bar.room-drag-active(0,3,0) 兜非 chrome-hidden 的
   侧栏位移（如 float-edge 收边/sidebar-collapsed）。二者均带 !important。 */
.app-shell.chrome-hidden .nav-bar.room-drag-active,
.app-shell .nav-bar.room-drag-active {
  pointer-events: auto !important;
  opacity: 1 !important;
  translate: 0 !important;
  transform: none !important;
}

/* 整条侧栏可抓取拖动（仅桌面端，JS 门控排除交互元素）。
   非交互区显示 grab 手型，交互元素（链接/按钮/滚动列表）恢复默认手型。
   该手型仅在桌面段启用，移动/平板覆盖抽屉保持 default（见响应式段）。 */
.nav-bar a,
.nav-bar button,
.nav-bar input,
.nav-bar textarea,
.nav-bar .nav-scroll {
  cursor: auto;
}
.nav-bar.dragging {
  cursor: grabbing;
}

/* 移动/平板端抽屉显式关闭按钮（覆盖层抽屉收回开关） */
.nav-drawer-close {
  position: absolute;
  top: 14px;
  right: 14px;
  z-index: 1;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  border-radius: 8px;
  background: rgba(var(--bg-card-rgb), 0.5);
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  transition: all var(--transition);
}
.nav-drawer-close:hover {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.3);
  background: rgba(var(--bg-card-rgb), 0.8);
}

/* 导航栏左侧边缘光 */
.nav-bar::before {
  content: '';
  position: absolute;
  top: 0;
  right: -1px;
  width: 1px;
  height: 100%;
  background: linear-gradient(
    180deg,
    transparent 0%,
    rgba(var(--accent-rgb), 0.08) 20%,
    rgba(var(--accent-rgb), 0.12) 50%,
    rgba(var(--accent-rgb), 0.08) 80%,
    transparent 100%
  );
}

/* ---- 品牌区 ---- */
.nav-brand {
  padding: clamp(20px, 2.2vw, 28px) clamp(14px, 1.6vw, 20px) clamp(14px, 1.6vw, 20px);
  display: flex;
  align-items: flex-start;
  gap: 12px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 4px;
}

.brand-emblem {
  font-size: clamp(18px, 1.6vw, 20px);
  color: var(--accent);
  opacity: 0.6;
  margin-top: 2px;
  animation: float 6s ease-in-out infinite;
  display: grid;
  place-items: center;
}
.brand-emblem-img {
  width: 22px;
  height: 22px;
  object-fit: cover;
  border-radius: 6px;
  opacity: 1;
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.brand-text strong {
  font-size: clamp(14px, 1.3vw, 16px);
  font-weight: 600;
  letter-spacing: 2px;
  color: var(--text-primary);
  font-family: var(--font-heading-zh);
}

.brand-note {
  font-size: 10px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

/* ---- 风格切换 ---- */
.style-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px 14px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 4px;
}

.style-swatch {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: all var(--transition);
  position: relative;
}

.style-swatch:nth-child(1) {
  background: linear-gradient(135deg, var(--accent), #c4956a);
}
.style-swatch:nth-child(2) {
  background: linear-gradient(135deg, #a66a24, #523010);
}
.style-swatch:nth-child(3) {
  background: linear-gradient(135deg, #b0aea5, #8a541c);
}

.style-swatch.active {
  border-color: var(--accent);
  transform: scale(1.25);
  box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.2);
}

.style-swatch:hover {
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.15);
}

.style-name {
  font-size: 11px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

/* ---- 空间面包屑 ---- */
.spatial-breadcrumb {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin: 0 8px 4px;
  border-radius: 8px;
  background: rgba(var(--accent-rgb), 0.04);
  border: 1px solid rgba(var(--accent-rgb), 0.06);
}

.breadcrumb-path {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
}

.breadcrumb-home {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color var(--transition);
}
.breadcrumb-home:hover {
  color: var(--accent);
}

.breadcrumb-arrow {
  color: var(--text-secondary);
  font-size: 11px;
  opacity: 0.5;
}

.breadcrumb-current {
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.breadcrumb-nav {
  display: flex;
  gap: 2px;
}

.breadcrumb-btn {
  background: none;
  border: 1px solid rgba(var(--accent-rgb), 0.08);
  color: var(--text-secondary);
  font-size: 11px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all var(--transition);
}
.breadcrumb-btn:hover {
  color: var(--accent);
  border-color: rgba(var(--accent-rgb), 0.2);
  background: rgba(var(--accent-rgb), 0.06);
}

/* ---- 导航链接区（可滚动） ---- */
.nav-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0 8px;
  /* 整栏 touch-action:none 时会禁掉列表触摸滚动，这里恢复纵向滚动 */
  touch-action: pan-y;
}

.nav-links {
  display: flex;
  flex-direction: column;
  gap: 1px;
  padding-bottom: 16px;
}

.nav-group-title {
  padding: var(--nav-group-py, 14px) clamp(10px, 1vw, 14px) 6px;
  font-size: 10px;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--text-secondary);
  font-weight: 500;
}

.nav-empty-hint {
  padding: 12px;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-secondary);
  opacity: 0.7;
}

/* ---- 主链路流式布局 ---- */
.main-path-flow {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.main-path-connector {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 12px;
  margin-left: 20px;
}

.connector-dot {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(var(--accent-rgb), 0.15);
  flex-shrink: 0;
}

.connector-line {
  flex: 1;
  height: 1px;
  background: linear-gradient(
    90deg,
    rgba(var(--accent-rgb), 0.1) 0%,
    transparent 100%
  );
}

/* ---- 分支组 ---- */
.branch-group {
  margin-bottom: 2px;
}

.branch-group-label {
  font-size: 10px;
  color: var(--text-secondary);
  padding: 6px 12px 2px;
  opacity: 0.5;
  letter-spacing: 0.5px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.branch-from-arrow {
  font-size: 10px;
  font-family: monospace;
}

/* ---- 导航项 ---- */
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

/* 宪法 nav-item */
.nav-item-constitution {
  position: relative;
}

/* section 分隔线 */
.nav-section-sep {
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(var(--accent-rgb), 0.1) 30%,
    rgba(var(--accent-rgb), 0.1) 70%,
    transparent 100%
  );
  margin: 8px 12px;
}

/* 基石标签 */
.constitution-foundation-seal {
  font-size: 9px;
  letter-spacing: 1px;
  color: var(--accent);
  opacity: 0.3;
  margin-left: 2px;
  font-weight: 400;
  white-space: nowrap;
}

/* ---- 侧栏幕僚任务（与幕僚阁调令系统联动）---- */
.nav-tasks {
  margin: 4px 12px 2px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(var(--accent-rgb), 0.06);
  border: 1px solid rgba(var(--accent-rgb), 0.12);
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s ease;
}
.nav-tasks:hover {
  background: rgba(var(--accent-rgb), 0.1);
}
.nav-tasks-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.nav-tasks-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.72);
}
.nav-tasks-badge {
  font-size: 10px;
  padding: 1px 7px;
  border-radius: 999px;
  background: rgba(var(--accent-rgb), 0.18);
  color: rgba(var(--accent-rgb), 1);
  white-space: nowrap;
}
.nav-tasks-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}
.nav-task-item {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.82);
}
.nav-task-item.done {
  color: rgba(255, 255, 255, 0.5);
}
.nav-task-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: rgba(var(--accent-rgb), 0.55);
}
.nav-task-dot.running {
  background: rgba(var(--accent-rgb), 0.9);
  animation: nav-task-pulse 1.4s ease-out infinite;
}
.nav-task-item.done .nav-task-dot {
  animation: nav-task-light 2.6s ease-in-out infinite;
  background: rgba(var(--accent-rgb), 0.6);
}
.nav-task-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@keyframes nav-task-pulse {
  0% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb), 0.5); }
  70% { box-shadow: 0 0 0 6px rgba(var(--accent-rgb), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb), 0); }
}
@keyframes nav-task-light {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 1; }
}

/* ---- 底部氛围 ---- */
.nav-footer {
  height: 2px;
  position: relative;
  flex-shrink: 0;
}

.nav-footer-light {
  position: absolute;
  bottom: 0;
  left: 20%;
  right: 20%;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(var(--accent-rgb), 0.08),
    transparent
  );
}

/* 宅院壳 3D 切换按钮已移除（改由全局 V 键触发），相关样式一并删除 */

/* ---- 快捷键提示 ---- */
.nav-shortcut-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px 14px;
  flex-shrink: 0;
}

.hint-key {
  font-size: 10px;
  padding: 2px 6px;
  border: 1px solid rgba(var(--accent-rgb), 0.1);
  border-radius: 4px;
  color: rgba(var(--accent-rgb), 0.4);
  font-family: monospace;
  letter-spacing: 0.5px;
  line-height: 1.4;
}

.hint-label {
  font-size: 10px;
  color: var(--text-faint);
  letter-spacing: 0.5px;
}

/* ---- 主内容区 ---- */
/* 唯一滚动容器：高度锁定为视口高（100dvh），overflow-y:auto 让长内容可纵向滚动。
   此前 .main-content 无显式高度（flex:1 在父级 .app-shell 无确定高时塌缩为内容高），
   导致所有视图根（min-height:100vh + overflow:hidden）既撑满又被裁，滚动条永不出现。
   现锁定 height:100dvh 使其成为确定高的滚动视口，内部视图根改为 min-height:100% 跟随此高度，
   超出部分由本容器滚动。 */
.main-content {
  flex: 1 1 auto;
  height: 100dvh;
  min-height: 100dvh;
  overflow-y: auto;
  overflow-x: clip;
  position: relative;
  z-index: 1;
}

/* 侧边栏遮罩：z-index 必须高于 .main-content（1），低于 .nav-bar(--z-navbar=40)，
   否则点击遮罩区域实际命中主内容、抽屉无法关闭。消费 --z-drawer-backdrop 令牌。 */
.sidebar-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-drawer-backdrop);
  background: rgba(0, 0, 0, 0.5);
}
/* 沉浸隐藏时不留遮罩（侧栏已滑出，勿盖内容） */
.app-shell.chrome-hidden .sidebar-overlay {
  display: none;
}

/* ---- 侧边栏折叠切换按钮 ---- */
.sidebar-collapsed .astrolabe-summon-btn {
  left: 24px;
}

/* ---- 界面自动隐藏（沉浸模式）：chrome-hidden 时淡出壳层元素 ---- */
/* 液态底栏（FloatingNavBar）同样随沉浸隐藏淡出 */
.app-shell.chrome-hidden .floating-nav {
  opacity: 0;
  pointer-events: none;
  transform: translateY(12px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}
/* 侧栏同样随沉浸模式淡出（铁律清单要求；此前仅淡出浮栏/镜我，遗漏侧栏，
   导致 chrome-hidden 态侧栏仍杵着挡内容）。!important 确保沉浸态优先于 surface-3d 降级。 */
.app-shell.chrome-hidden .nav-bar {
  opacity: 0 !important;
  pointer-events: none !important;
}
/* 桌面端悬浮侧栏随沉浸模式同步淡出（与底栏一块自动隐藏）。
   滑动位移由各 float-edge-* 类的 chrome-hidden 规则负责，此处补 opacity 淡出，
   使「滑出 + 淡出」同步，视觉与底栏一致；不影响移动/平板端（其 chrome-hidden 已自带滑出）。 */
/* 镜我光球（全局幕僚形象）随沉浸模式同步淡出（与底栏一块自动隐藏） */
.app-shell.chrome-hidden .mirror-self-wrapper {
  opacity: 0;
  pointer-events: none;
  transform: translateY(8px);
  transition: opacity 0.4s ease, transform 0.4s ease;
}
/* ---- 桌面美化层 AuraLayer 控制簇：随沉浸模式同步淡出（与底栏一块自动隐藏） ----
   aura-control 是 .aura-layer 的直接子节点、.app-shell 的兄弟节点，
   故用 .app-shell.chrome-hidden ~ 通用兄弟选择器命中。 */
.app-shell.chrome-hidden ~ .aura-layer .aura-control {
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s ease;
}

/* ---- aura 透明窗：去除 html/body 实底背景，使透明窗真正透出桌面 ----
   仅对已加 .aura-window 类的文档生效（web 主窗不受影响）。 */
:global(html.aura-window),
:global(html.aura-window body) {
  background: transparent !important;
}

/* ---- 3D 正厅态：侧栏悬浮窗自动降级（2026-08-26 补） ----
   3D 世界壳接管屏幕时，2D 侧栏悬浮窗不应抢镜、压住 homeCentered 顾问球与中央内容。
   弱化到 0.32 不透明 + 不拦截交互；hover/focus-within 唤回近全不透明、可点。
   与 chrome-hidden 互补：chrome-hidden 是全局沉浸（任意态都淡出），surface-3d 是仅 3D 态降级。
   z 不动（仍为 --z-navbar），靠 opacity/pointer-events 降级——不破坏契约层级、不动优先级，
   3D 模式下顾问球(z-jade:20)与侧栏(z-navbar:40)仍按令牌正确叠放，但侧栏几乎不可见。 */
/* 3D 世界壳接管屏幕时，左侧栏降级为半透明、不抢镜；但保留导航树交互
   （pointer-events:auto），否则 3D 态下房间树无法滚动/点击（回归：原整栏
   pe:none 导致「侧边悬浮栏上下滑动不了」）。hover/focus-within 唤回近全不透明。
   z 不动（--z-navbar），靠 opacity 降级不破坏层叠契约。 */
.app-shell.surface-3d .nav-bar {
  opacity: 0.32;
  pointer-events: auto;
  transition: opacity 0.5s ease, transform 0.4s ease, background 0.4s ease;
}
.app-shell.surface-3d .nav-bar:hover,
.app-shell.surface-3d .nav-bar:focus-within {
  opacity: 0.96;
}

/* 3D 正厅态：心流页顾问球纵向偏移量沿用 2D 基准 220px。
   2026-08-26 曾误改为 180，导致 orb 下压、完全覆盖首页 h1（实测 co<217 即与 h1 重叠）；
   回到 220 让 orb 落在 h1 上方（2D/3D 同值，避免重叠）。 */
.app-shell.surface-3d :deep(.mirror-self-wrapper.mirror-self--home-centered) {
  --column-offset: 220px;
}

/* ============================================================
   响应式布局
   ============================================================ */

/* 桌面端：悬浮窗侧栏（超级自定义 · 可拖到任意位置，松手吸附最近边，空闲半透明贴边收缩）
   定位由 .float-edge-* 类驱动（替代原固定 left:0）。主内容始终全宽，不被侧栏占位。 */
@media (min-width: 1024px) {
  .nav-bar {
    width: var(--sidebar-w, 220px);
    position: fixed;
    box-shadow: 4px 0 28px rgba(0, 0, 0, 0.38);
    border-radius: 0 14px 14px 0;
    /* 桌面端整栏可抓（JS 门控排除交互元素） */
    cursor: grab;
    touch-action: none;
  }

  /* 四边吸附定位（拖动松手后由 JS 设定 sidebarFloatEdge，CSS 接管）
     四边独立判定，支持角落：tl/tr/bl/br 同时贴两边；单边 l/r/t/b 仅贴该边、另一轴自由；
     free 为任意位置（内联 left/top 由 JS 设）。高度由内容自适应（短），不再铺满。 */
  .nav-bar.float-edge-left {
    left: 0; top: 50%; bottom: auto; right: auto;
    transform: translateY(-50%);
    border-radius: 0 14px 14px 0;
  }
  .nav-bar.float-edge-right {
    right: 0; top: 50%; bottom: auto; left: auto;
    transform: translateY(-50%);
    border-radius: 14px 0 0 14px;
    box-shadow: -4px 0 28px rgba(0, 0, 0, 0.38);
  }
  .nav-bar.float-edge-top {
    top: 0; left: 50%; right: auto; bottom: auto;
    width: auto; transform: translateX(-50%);
    border-radius: 0 0 14px 14px;
    box-shadow: 0 4px 28px rgba(0, 0, 0, 0.38);
  }
  .nav-bar.float-edge-bottom {
    bottom: 0; left: 50%; right: auto; top: auto;
    width: auto; transform: translateX(-50%);
    border-radius: 14px 14px 0 0;
    box-shadow: 0 -4px 28px rgba(0, 0, 0, 0.38);
  }
  /* 四角吸附：同时贴两条边，严丝合缝停角落 */
  .nav-bar.float-edge-tl {
    left: 0; top: 0; right: auto; bottom: auto;
    transform: none;
    border-radius: 0 0 14px 0;
  }
  .nav-bar.float-edge-tr {
    right: 0; top: 0; left: auto; bottom: auto;
    transform: none;
    border-radius: 0 0 0 14px;
    box-shadow: -4px 0 28px rgba(0, 0, 0, 0.38);
  }
  .nav-bar.float-edge-bl {
    left: 0; bottom: 0; right: auto; top: auto;
    transform: none;
    border-radius: 0 14px 0 0;
  }
  .nav-bar.float-edge-br {
    right: 0; bottom: 0; left: auto; top: auto;
    transform: none;
    border-radius: 14px 0 0 0;
    box-shadow: -4px 0 28px rgba(0, 0, 0, 0.38);
  }
  /* 自由放置：内联 left/top 由 JS 设，此处仅确保不残留吸附类定位 */
  .nav-bar.float-edge-free {
    left: auto; right: auto; top: auto; bottom: auto;
    transform: none;
  }

  .nav-bar.collapsed {
    transform: translateX(-110%);
  }
  /* 收起方向须与吸附居中位移合并，否则 translate 单一值会丢失居中/角落 */
  .nav-bar.float-edge-left.collapsed {
    transform: translate(-110%, -50%);
  }
  .nav-bar.float-edge-right.collapsed {
    transform: translate(110%, -50%);
  }
  .nav-bar.float-edge-top.collapsed {
    transform: translate(-50%, -110%);
  }
  .nav-bar.float-edge-bottom.collapsed {
    transform: translate(-50%, 110%);
  }
  .nav-bar.float-edge-tl.collapsed {
    transform: translate(-110%, -110%);
  }
  .nav-bar.float-edge-tr.collapsed {
    transform: translate(110%, -110%);
  }
  .nav-bar.float-edge-bl.collapsed {
    transform: translate(-110%, 110%);
  }
  .nav-bar.float-edge-br.collapsed {
    transform: translate(110%, 110%);
  }
  .nav-bar.float-edge-free.collapsed {
    transform: translateX(-110%);
  }

  /* 主内容全宽，不被侧栏占位 */
  .main-content { margin-left: 0; }
  .sidebar-collapsed .main-content { margin-left: 0; }
}

/* 平板端：可折叠侧边栏（覆盖式弹窗，与桌面端一致） */
@media (max-width: 1023px) and (min-width: 640px) {
  .sidebar-toggle {
    display: none;
  }

  .nav-bar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    transform: translateX(0);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.4);
  }

  .nav-bar.collapsed {
    transform: translateX(-110%);
  }
}

/* 移动端：覆盖侧边栏 */
@media (max-width: 639px) {
  /* 移动端侧边栏默认离屏，浮层偏移归零（贴左 24px 即可，勿压在底栏上） */
  .app-shell {
    --sidebar-w: 0px;
  }

  .sidebar-toggle {
    display: none;
  }

  .main-content {
    padding-bottom: calc(var(--edge-bar-h, 56px) + 16px);
  }

  /* 移动端：星盘浮动按钮上移避开底部悬浮窗 */
  .astrolabe-summon-btn {
    bottom: calc(var(--edge-bar-h, 56px) + 16px);
    left: 16px;
    width: clamp(46px, 13vw, 54px);    height: clamp(46px, 13vw, 54px);
  }

  .nav-bar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    transform: translateX(0);
    width: clamp(240px, 78vw, 300px);
    box-shadow: 4px 0 32px rgba(0, 0, 0, 0.5);
  }

  .nav-bar.collapsed {
    transform: translateX(-110%);
  }

  .nav-brand {
    padding: 20px 16px 16px;
  }

  .brand-text strong {
    font-size: 14px;
  }

  .nav-item {
    padding: 8px 10px;
    font-size: 12px;
  }
}

/* ============================================================
   桌面端 docked 导航（navMode = docked）：顶部固定栏 + 底部固定栏
   与悬浮双浮岛互斥；移动/平板端不使用（其响应式顶/底栏独立承载）。
   ============================================================ */
</style>