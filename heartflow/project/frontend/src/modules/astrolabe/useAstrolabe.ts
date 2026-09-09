// ============================================================
// 天星盘 · 导航组合式函数
// 星图导航仪核心逻辑 — 搜索、最近访问、长按呼出、快捷键
// ============================================================

import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import type { AstrolabeConfig, AstrolabeVisibility, AstrolabeSearchState } from './types'
import { DEFAULT_ASTROLABE_CONFIG } from './types'
import { getRoom, getAllRooms, getRoomByPath, getMainPath, type RoomNode } from '../../engine/room-graph'
import { storage } from '../../engine/storage'

// ---- 最近访问 localStorage 键名 ----
const RECENT_ROOMS_KEY = 'heartflow:astrolabe:recent'

// ---- 全局导航历史（用于获取最近访问） ----
const navigationHistory = ref<string[]>([])

/** 记录路由变化（由 App.vue 在路由变化时调用） */
export function recordNavigation(roomId: string) {
  navigationHistory.value.push(roomId)
  if (navigationHistory.value.length > 50) {
    navigationHistory.value = navigationHistory.value.slice(-50)
  }
}

/**
 * 天星盘导航组合式函数
 *
 * 提供：
 * - 星盘可见性管理（open/close/toggle）
 * - 键盘快捷键（Ctrl+K 呼出、Escape 关闭、/ 聚焦搜索）
 * - 长按检测呼出
 * - 房间搜索（名称/ID 模糊匹配 + 高亮）
 * - 最近访问持久化（localStorage）
 * - 键盘导航（↑↓ 选择、Enter 跳转）
 *
 * 使用方式：
 *   const astrolabe = useAstrolabe()
 *   // 绑定到 Astrolabe.vue 组件
 */
export function useAstrolabe(opts?: {
  config?: Partial<AstrolabeConfig>
}) {
  // 优先从持久化配置读取，未传入 opts 时使用 AppConfig 中的值
  const storedConfig = storage.getConfig().astrolabe
  const cfg = { ...DEFAULT_ASTROLABE_CONFIG, ...storedConfig, ...opts?.config }
  const router = useRouter()

  // ---- 可见性状态 ----
  const visibility = ref<AstrolabeVisibility>({
    visible: false,
    trigger: 'unknown',
    openedAt: null,
  })

  const isOpen = computed(() => visibility.value.visible)

  // ---- 搜索状态 ----
  const search = ref<AstrolabeSearchState>({
    query: '',
    selectedIndex: 0,
    isFocused: false,
  })

  // ---- 搜索防抖 ----
  const debouncedQuery = ref('')
  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  watch(
    () => search.value.query,
    (q) => {
      if (debounceTimer) clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        debouncedQuery.value = q
        search.value.selectedIndex = 0
      }, 250)
    },
  )

  const animating = ref(false)

  // ---- 搜索面板可折叠：默认收起，避免遮挡星盘节点；需要时点击 🔍 展开 ----
  const searchCollapsed = ref(true)
  function expandSearch() {
    searchCollapsed.value = false
    nextTick(() => {
      const el = document.querySelector('.astrolabe-search-input') as HTMLInputElement | null
      el?.focus()
    })
  }
  function collapseSearch() {
    searchCollapsed.value = true
    search.value.query = ''
    search.value.selectedIndex = 0
    debouncedQuery.value = ''
    if (debounceTimer) clearTimeout(debounceTimer)
    ;(document.activeElement as HTMLElement | null)?.blur()
  }

  // ---- 自适应：统一居中正方形舞台，罗盘环 / 节点 / 连线同坐标系，连续缩放 ----
  // 旧方案（layoutScale 三档 + 节点按视口宽高各自取百分比定位）会让节点在宽/竖屏飞出屏幕，
  // 且罗盘环（固定 560px）与节点（视口百分比）错位成椭圆。现改为：舞台可视尺寸 =
  // min(可用宽, 可用高)，内部 500 坐标系等比映射到舞台，整体再 scale 到视口内 ——
  // 任意屏宽图表完整可见，缩放连续而非三档死跳。
  const viewportW = ref(typeof window !== 'undefined' ? window.innerWidth : 1280)
  const viewportH = ref(typeof window !== 'undefined' ? window.innerHeight : 800)
  // 舞台基准边长（设计稿 560px），最终可视尺寸 = STAGE_BASE * stageScale
  const STAGE_BASE = 560
  const stageScale = computed(() => {
    const margin = 24 // 舞台四周安全留白
    const reserveTop = 120 // 顶部搜索 / 控制区
    const reserveBottom = 64 // 底部中心说明文字
    // 节点坐标范围约 -12%~112%（外环半径最大时），需额外留白避免飞出屏幕
    const overflowPad = 1.22
    const availW = Math.max(0, viewportW.value - margin * 2) / overflowPad
    const availH = Math.max(0, viewportH.value - reserveTop - reserveBottom) / overflowPad
    const maxStage = 760 // 超大屏封顶，避免环过大
    const size = Math.max(240, Math.min(availW, availH, maxStage))
    return size / STAGE_BASE
  })
  // 紧凑模式：舞台缩到较小尺寸（< 420px，即 stageScale < 0.75）时隐藏节点标签，避免宽标签互相压住造成遮挡
  const compact = computed(() => stageScale.value < 0.75)
  // 世界节点缩放系数：房间越多 / 舞台越小，外环节点缩得越小，保证相邻节点不重叠（修复缩窗遮挡）。
  // 主链路仅 3 个节点不挤，不受影响；此系数仅作用于世界节点（见 Astrolabe.vue）。
  const worldNodeScale = computed(() => {
    const n = worldRooms.value.length
    const countFactor = n > 50 ? 0.62 : n > 35 ? 0.72 : n > 22 ? 0.82 : 0.92
    const scaleFactor = Math.max(0.55, Math.min(1, stageScale.value * 1.1))
    return Math.round(Math.min(countFactor, scaleFactor) * 100) / 100
  })
  let resizeRaf = 0
  function onAstrolabeResize() {
    if (typeof window === 'undefined') return
    // 用 rAF 合并连续 resize 事件：快速拖拽窗口时每帧只重算一次，避免频繁重排导致卡顿
    if (resizeRaf) return
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0
      viewportW.value = window.innerWidth
      viewportH.value = window.innerHeight
    })
  }

  // ---- 计算属性 ----

  /** 当前活跃房间 ID */
  const activeRoomId = computed(() => {
    const room = getRoomByPath(router.currentRoute.value.path)
    return room?.id ?? 'home'
  })

  /** 主链路房间（排除 home） */
  const mainPathRooms = computed(() => {
    return getAllRooms()
      .filter(r => r.group === 'main-path' && r.id !== 'home')
  })

  /** 家（蓝图第二层「家」）：当前为 gravity 组，未参与主链路/世界环；单独作为星图「家」节点接入 */
  const homeSpaceRoom = computed(() => getRoom('home-space'))

  /** 搜索结果（基于防抖后的查询） */
  const searchResults = computed(() => {
    const q = debouncedQuery.value.trim().toLowerCase()
    if (!q) return []
    return getAllRooms().filter(r => {
      return r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q)
    })
  })

  /** 世界房间（外环，含搜索过滤 + 动态分组排序） */
  const worldRooms = computed(() => {
    const all = getAllRooms()
      .filter(r => r.group === 'world' || r.group === 'system')

    const q = debouncedQuery.value.trim().toLowerCase()
    if (q) {
      return all.filter(r => r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q))
    }

    // 动态获取主链路房间ID作为分支排序优先级
    const mainPathIds = getMainPath().map(r => r.id)
    const branchOrder = [...mainPathIds, '']
    const roomMap = new Map<string, RoomNode[]>()
    for (const room of all) {
      const key = room.branchFrom ?? ''
      if (!roomMap.has(key)) roomMap.set(key, [])
      roomMap.get(key)!.push(room)
    }
    for (const [, rooms] of roomMap) {
      rooms.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
    }
    const result: RoomNode[] = []
    const added = new Set<string>()
    for (const key of branchOrder) {
      const rooms = roomMap.get(key)
      if (rooms) {
        for (const room of rooms) {
          if (!added.has(room.id)) {
            result.push(room)
            added.add(room.id)
          }
        }
      }
    }
    for (const [key, rooms] of roomMap) {
      if (!branchOrder.includes(key)) {
        for (const room of rooms) {
          if (!added.has(room.id)) {
            result.push(room)
            added.add(room.id)
          }
        }
      }
    }
    return result
  })

  /** 最近访问房间列表（持久化） */
  const recentRooms = ref<RoomNode[]>(loadRecentRooms())

  /** 高亮匹配文本（基于防抖后的查询） */
  function highlightMatch(text: string): string {
    const q = debouncedQuery.value.trim().toLowerCase()
    if (!q) return text
    const idx = text.toLowerCase().indexOf(q)
    if (idx === -1) return text
    return text.slice(0, idx) + '<mark>' + text.slice(idx, idx + q.length) + '</mark>' + text.slice(idx + q.length)
  }

  // ---- 星盘打开/关闭 ----

  /** 打开星盘 */
  function open(trigger: AstrolabeVisibility['trigger'] = 'unknown') {
    if (visibility.value.visible) return
    visibility.value = {
      visible: true,
      trigger,
      openedAt: Date.now(),
    }
    search.value = { query: '', selectedIndex: 0, isFocused: false }
    searchCollapsed.value = true
    debouncedQuery.value = ''
    if (debounceTimer) clearTimeout(debounceTimer)
    animating.value = true
    setTimeout(() => { animating.value = false }, 400)
  }

  /** 关闭星盘 */
  function close() {
    if (!visibility.value.visible) return
    visibility.value = {
      visible: false,
      trigger: 'unknown',
      openedAt: null,
    }
    search.value = { query: '', selectedIndex: 0, isFocused: false }
    searchCollapsed.value = true
    debouncedQuery.value = ''
    if (debounceTimer) clearTimeout(debounceTimer)
  }

  /** 切换星盘 */
  function toggle(trigger: AstrolabeVisibility['trigger'] = 'unknown') {
    if (visibility.value.visible) {
      close()
    } else {
      open(trigger)
    }
  }

  /** 导航到指定房间 */
  function goTo(roomId: string) {
    const room = getAllRooms().find(r => r.id === roomId)
    if (room) {
      // 记录最近访问
      addRecentRoom(roomId)
      close()
      // 使用 nextTick 等待关闭动画
      setTimeout(() => {
        router.push(room.path)
      }, 50)
    }
  }

  // ---- 最近访问持久化 ----

  function loadRecentRooms(): RoomNode[] {
    try {
      const ids: string[] = storage.getKV<string[]>(RECENT_ROOMS_KEY, [])
      return ids
        .map(id => getRoom(id))
        .filter((r): r is RoomNode => r != null)
        .slice(0, cfg.maxRecentRooms)
    } catch {
      return []
    }
  }

  function saveRecentRooms() {
    try {
      const ids = recentRooms.value.map(r => r.id)
      storage.setKV(RECENT_ROOMS_KEY, ids)
    } catch {
      // 存储不可用时静默忽略
    }
  }

  function addRecentRoom(roomId: string) {
    if (roomId === 'home' || roomId === 'home-space') return
    recentRooms.value = recentRooms.value.filter(r => r.id !== roomId)
    const room = getRoom(roomId)
    if (room) {
      recentRooms.value.unshift(room)
      if (recentRooms.value.length > cfg.maxRecentRooms) {
        recentRooms.value = recentRooms.value.slice(0, cfg.maxRecentRooms)
      }
    }
    saveRecentRooms()
  }

  // ---- 键盘导航 ----

  /** 搜索结果键盘导航 */
  function onSearchKeydown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (searchResults.value.length > 0) {
        search.value.selectedIndex = (search.value.selectedIndex + 1) % searchResults.value.length
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (searchResults.value.length > 0) {
        search.value.selectedIndex = (search.value.selectedIndex - 1 + searchResults.value.length) % searchResults.value.length
      }
    } else if (e.key === 'Enter') {
      if (searchResults.value.length > 0) {
        e.preventDefault()
        goTo(searchResults.value[search.value.selectedIndex].id)
      }
    }
  }

  /**
   * 全局键盘快捷键（仅星盘已打开时生效：Esc 关闭、/ 聚焦搜索）。
   * 注意：Ctrl/Cmd+K 不再用于召唤星盘——该键位已归属命令面板
   * （App.vue 的 onCommandKeydown），避免一次按键同时弹出两层遮罩互相遮挡。
   * 星盘的键盘入口改为：命令面板「星盘导航」动作（act:astrolabe）。
   */
  function onGlobalKeydown(e: KeyboardEvent) {
    // 星盘打开时的快捷键
    if (!visibility.value.visible) return

    if (e.key === 'Escape') {
      if (search.value.query.trim()) {
        search.value.query = ''
        search.value.selectedIndex = 0
      } else {
        close()
      }
      e.preventDefault()
      return
    }

    // / 聚焦搜索框（若搜索面板已收起则先展开）
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      if (searchCollapsed.value) {
        expandSearch()
        e.preventDefault()
        return
      }
      const active = document.activeElement
      const searchInput = document.querySelector('.astrolabe-search-input') as HTMLInputElement | null
      if (active !== searchInput) {
        e.preventDefault()
        searchInput?.focus()
      }
    }
  }

  // ---- 长按检测 ----

  /** 长按检测状态 */
  const longPressState = ref<{
    startX: number
    startY: number
    startTime: number
    triggered: boolean
  } | null>(null)

  /** 开始长按检测 */
  function startLongPress(e: MouseEvent | Touch) {
    if (!cfg.enableLongPress) return
    longPressState.value = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: Date.now(),
      triggered: false,
    }
  }

  /** 移动检测（移动超过阈值则取消长按） */
  function moveLongPress(e: MouseEvent | Touch) {
    if (!longPressState.value || longPressState.value.triggered) return
    const dx = Math.abs(e.clientX - longPressState.value.startX)
    const dy = Math.abs(e.clientY - longPressState.value.startY)
    if (dx > 15 || dy > 15) {
      longPressState.value = null
    }
  }

  /** 结束长按检测 */
  function endLongPress() {
    if (!longPressState.value || longPressState.value.triggered) return
    const elapsed = Date.now() - longPressState.value.startTime
    if (elapsed >= cfg.longPressDuration) {
      longPressState.value.triggered = true
      open('long-press')
    }
    longPressState.value = null
  }

  /** 取消长按检测 */
  function cancelLongPress() {
    longPressState.value = null
  }

  // ---- 生命周期 ----

  onMounted(() => {
    document.addEventListener('keydown', onGlobalKeydown)
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', onAstrolabeResize)
    }
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', onGlobalKeydown)
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', onAstrolabeResize)
    }
  })

  // 监听路由变化，记录导航历史
  watch(
    () => router.currentRoute.value.path,
    (newPath, oldPath) => {
      if (!oldPath) return
      const newRoom = getRoomByPath(newPath)
      if (newRoom) {
        recordNavigation(newRoom.id)
        // 自动添加到最近访问
        addRecentRoom(newRoom.id)
      }
    },
  )

  // ---- 星盘坐标计算 ----

  /** 主链路节点坐标 */
  function mainPathCoord(index: number) {
    const total = mainPathRooms.value.length
    const angle = (index / total) * 360 + 180
    const rad = (angle * Math.PI) / 180
    // 半径取基准值；舞台整体 scale 已统一负责视觉缩放，此处不再乘系数（避免双重缩放）
    const r = 140
    return {
      x: Math.round(250 + r * Math.cos(rad)),
      y: Math.round(250 + r * Math.sin(rad)),
    }
  }

  /** 主链路节点样式 */
  function mainPathStyle(index: number) {
    const coord = mainPathCoord(index)
    const total = mainPathRooms.value.length
    const angle = (index / total) * 360
    return {
      left: `${(coord.x / 500) * 100}%`,
      top: `${(coord.y / 500) * 100}%`,
      '--node-angle': `${angle}deg`,
      '--node-delay': `${0.2 + index * 0.08}s`,
    } as any
  }

  /** 世界房间节点坐标 */
  function worldCoord(index: number) {
    const total = worldRooms.value.length
    const angle = (index / total) * 360 + 270
    const rad = (angle * Math.PI) / 180
    // 外环基准半径：房间较多时扩大外环，较少时缩小（视觉缩放由舞台 stageScale 统一负责）
    const base = total > 25 ? 310 : total > 15 ? 280 : 250
    const r = base
    return {
      x: Math.round(250 + r * Math.cos(rad)),
      y: Math.round(250 + r * Math.sin(rad)),
    }
  }

  /** 世界房间节点样式 */
  function worldStyle(index: number) {
    const coord = worldCoord(index)
    const total = worldRooms.value.length
    const angle = (index / total) * 360
    return {
      left: `${(coord.x / 500) * 100}%`,
      top: `${(coord.y / 500) * 100}%`,
      '--node-angle': `${angle}deg`,
      '--node-delay': `${0.5 + index * 0.008}s`,
    } as any
  }

  /** 家节点坐标（内环之内、贴近中心，位于顶部，不与主链路三节点及中心说明文字冲突） */
  function homeSpaceCoord() {
    const r = 78
    const angle = -90 // 顶部
    const rad = (angle * Math.PI) / 180
    return {
      x: Math.round(250 + r * Math.cos(rad)),
      y: Math.round(250 + r * Math.sin(rad)),
    }
  }

  function homeSpaceStyle() {
    const c = homeSpaceCoord()
    return {
      left: `${(c.x / 500) * 100}%`,
      top: `${(c.y / 500) * 100}%`,
      '--node-delay': '0.1s',
    } as any
  }

  /** 任意已渲染房间（家 / 主链路 / 世界）在 500 坐标系内的坐标 —— 供分支拓扑连线对准使用 */
  function roomCoord(id: string): { x: number; y: number } | null {
    if (id === 'home-space') return homeSpaceCoord()
    const mpIdx = mainPathRooms.value.findIndex(r => r.id === id)
    if (mpIdx >= 0) return mainPathCoord(mpIdx)
    const wIdx = worldRooms.value.findIndex(r => r.id === id)
    if (wIdx >= 0) return worldCoord(wIdx)
    return null
  }

  /** 当前悬停的房间 id —— 用于分支拓扑连线的「悬停高亮」：仅相连连线高亮，其余保持极淡 */
  const hoveredRoomId = ref<string | null>(null)
  function setHoveredRoom(id: string) {
    hoveredRoomId.value = id
  }
  function clearHovered() {
    hoveredRoomId.value = null
  }

  /** 分支拓扑连线：每个世界房间从其 branchFrom 父节点连出，呈现「主链路→分支」的星座结构。
   *  active：当悬停节点是连线任一端点（子房间或其父节点）时高亮，默认极淡以保持克制。 */
  const branchLines = computed(() => {
    const lines: Array<{ key: string; x1: number; y1: number; x2: number; y2: number; active: boolean }> = []
    for (const room of worldRooms.value) {
      if (!room.branchFrom) continue
      const from = roomCoord(room.branchFrom)
      const to = roomCoord(room.id)
      if (from && to) {
        const active = hoveredRoomId.value !== null &&
          (room.id === hoveredRoomId.value || room.branchFrom === hoveredRoomId.value)
        lines.push({ key: 'branch-' + room.id, x1: from.x, y1: from.y, x2: to.x, y2: to.y, active })
      }
    }
    return lines
  })

  /** 星辰样式 */
  function starStyle(_n: number) {
    return {
      width: `${1 + Math.random() * 2}px`,
      height: `${1 + Math.random() * 2}px`,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 5}s`,
      animationDuration: `${2 + Math.random() * 4}s`,
      opacity: 0.2 + Math.random() * 0.5,
    }
  }

  /** 刻度样式 */
  function degStyle(index: number, total: number) {
    const angle = (index / total) * 360 - 90
    return {
      transform: `rotate(${angle}deg) translateY(-258px)`,
      opacity: index % 6 === 0 ? 0.6 : index % 3 === 0 ? 0.3 : 0.12,
      height: index % 6 === 0 ? '10px' : index % 3 === 0 ? '6px' : '3px',
    }
  }

  return {
    // 状态
    visibility,
    isOpen,
    search,
    animating,
    searchCollapsed,
    expandSearch,
    collapseSearch,
    activeRoomId,
    mainPathRooms,
    homeSpaceRoom,
    searchResults,
    worldRooms,
    branchLines,
    hoveredRoomId,
    recentRooms,
    stageScale,
    compact,
    worldNodeScale,

    // 方法
    open,
    close,
    toggle,
    goTo,
    setHoveredRoom,
    clearHovered,
    highlightMatch,
    onSearchKeydown,
    startLongPress,
    moveLongPress,
    endLongPress,
    cancelLongPress,

    // 坐标计算
    mainPathCoord,
    mainPathStyle,
    worldCoord,
    worldStyle,
    homeSpaceStyle,
    starStyle,
    degStyle,
  }
}