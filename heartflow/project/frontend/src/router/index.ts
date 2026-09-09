// ============================================================
// 心流工坊 · 路由配置
// 基于 room-graph 引擎的房间感知路由
// ============================================================
//
// 宪法边界标注（D5 · 实现房间数超集于蓝图）
// 本路由表除蓝图核心「30 空间」外，还含若干扩展房间，例如：
//   /wisdom 知微阁、/dictionary 殿堂辞典、/workhub 工作中心、
//   /archive 数据档案馆、/all-selves 众生象、/timeline 时间线枢纽、
//   /star-map 知识星图、/traditions 文明根系、/visualization-studio
//   数据视觉工坊、/home-replica 家·1:1 复刻 等。
// 这些扩展房间一律遵循宪法前两条硬约束：
//   · 第1条 本地私有 —— 数据全走本地 storage，零外网调用；
//   · 第2条 超级自定义 —— 房间 / 主题 / 载体由用户定义或在相处中自然形成。
// 扩展空间纳入宪法边界统一审查，避免合规遗漏
// （详见《蓝图与实现差距清单》§三 D5）。

import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import { getRoomByPath } from '../engine/room-graph'
import { triggerHaptic } from '../utils/platform'
import { storage } from '../engine/storage'

/**
 * 为路由自动注入 roomId 元数据
 * 确保路由与房间图引擎保持一致
 */
function withRoomMeta(route: RouteRecordRaw, defaultTitle?: string): RouteRecordRaw {
  const room = getRoomByPath(route.path)
  return {
    ...route,
    meta: {
      ...route.meta,
      roomId: room?.id ?? route.name,
      title: route.meta?.title ?? defaultTitle ?? '',
    },
  }
}

const routes: RouteRecordRaw[] = [
  // ================================================================
  // 主链路
  // ================================================================
  withRoomMeta({
    path: '/',
    name: 'home',
    component: () => import('../views/Home.vue'),
    meta: { title: '心流 · 静场' },
  }),
  withRoomMeta({
    path: '/home-space',
    name: 'home-space',
    component: () => import('../views/HomeSpace.vue'),
    meta: { title: '家' },
  }),
  withRoomMeta({
    path: '/timeline',
    name: 'timeline',
    component: () => import('../views/Timeline.vue'),
    meta: { title: '时间线枢纽' },
  }),
  withRoomMeta({
    path: '/timeline-index',
    name: 'timeline-index',
    component: () => import('../views/TimelineIndex.vue'),
    meta: { title: '时间线索引' },
  }),
  withRoomMeta({
    path: '/time-corridor',
    name: 'time-corridor',
    component: () => import('../views/TimeCorridorView.vue'),
    meta: { title: '时间长廊' },
  }),
  withRoomMeta({
    path: '/crystal',
    name: 'crystal',
    component: () => import('../views/Crystal.vue'),
    meta: { title: '结晶阁' },
  }),
  withRoomMeta({
    path: '/will',
    name: 'will',
    component: () => import('../views/Will.vue'),
    meta: { title: '遗志堂' },
  }),
  withRoomMeta({
    path: '/world-life',
    name: 'world-life',
    component: () => import('../views/WorldLife.vue'),
    meta: { title: '世界生命' },
  }),
  withRoomMeta({
    path: '/visitor',
    name: 'visitor',
    component: () => import('../views/Visitor.vue'),
    meta: { title: '访客中心' },
  }),
  withRoomMeta({
    path: '/anchor',
    name: 'anchor',
    component: () => import('../views/DailyAnchor.vue'),
    meta: { title: '逐日心锚' },
  }),
  withRoomMeta({
    path: '/garden',
    name: 'garden',
    component: () => import('../views/EmotionGarden.vue'),
    meta: { title: '情绪花房' },
  }),
  withRoomMeta({
    path: '/sanctuary',
    name: 'sanctuary',
    component: () => import('../views/Sanctuary.vue'),
    meta: { title: '安全岛' },
  }),

  // ================================================================
  // 世界房间
  // ================================================================
  withRoomMeta({
    path: '/goals',
    name: 'goals',
    component: () => import('../views/LightPavilion.vue'),
    meta: { title: '留光阁' },
  }),
  withRoomMeta({
    path: '/reading',
    name: 'reading',
    component: () => import('../views/ReadingHall.vue'),
    meta: { title: '阅览殿' },
  }),
  withRoomMeta({
    path: '/relations',
    name: 'relations',
    component: () => import('../views/RelationHall.vue'),
    meta: { title: '羁绊之厅' },
  }),
  withRoomMeta({
    path: '/body',
    name: 'body',
    component: () => import('../views/BodyGreenhouse.vue'),
    meta: { title: '身体温室' },
  }),
  withRoomMeta({
    path: '/worklog',
    name: 'worklog',
    component: () => import('../views/WorkLog.vue'),
    meta: { title: '更漏' },
  }),
  withRoomMeta({
    path: '/play',
    name: 'play',
    component: () => import('../views/PlayGallery.vue'),
    meta: { title: '逸趣阁' },
  }),
  withRoomMeta({
    path: '/map',
    name: 'map',
    component: () => import('../views/MapRoom.vue'),
    meta: { title: '地图室' },
  }),
  withRoomMeta({
    path: '/bookmarks',
    name: 'bookmarks',
    component: () => import('../views/Bookmarks.vue'),
    meta: { title: '书签入口架' },
  }),
  withRoomMeta({
    path: '/touchpoints',
    name: 'touchpoints',
    component: () => import('../views/Touchpoints.vue'),
    meta: { title: '殿堂触角' },
  }),
  withRoomMeta({
    path: '/vault',
    name: 'vault',
    component: () => import('../views/Vault.vue'),
    meta: { title: '保险库' },
  }),
  withRoomMeta({
    path: '/guard',
    name: 'guard',
    component: () => import('../views/GuardRoom.vue'),
    meta: { title: '守护室' },
  }),
  withRoomMeta({
    path: '/word-mirror',
    name: 'word-mirror',
    component: () => import('../views/WordMirror.vue'),
    meta: { title: '字镜阁' },
  }),
  withRoomMeta({
    path: '/seasonal',
    name: 'seasonal',
    component: () => import('../views/SeasonalRituals.vue'),
    meta: { title: '岁时阁' },
  }),
  withRoomMeta({
    path: '/unfinished',
    name: 'unfinished',
    component: () => import('../views/UnfinishedGarden.vue'),
    meta: { title: '未完成花园' },
  }),
  withRoomMeta({
    path: '/movement',
    name: 'movement',
    component: () => import('../views/MovementRoom.vue'),
    meta: { title: '动律之间' },
  }),
  withRoomMeta({
    path: '/roots',
    name: 'roots',
    component: () => import('../views/RootGarden.vue'),
    meta: { title: '根脉之庭' },
  }),
  withRoomMeta({
    path: '/wisdom',
    name: 'wisdom',
    component: () => import('../views/WisdomPavilion.vue'),
    meta: { title: '知微阁' },
  }),
  withRoomMeta({
    path: '/dictionary',
    name: 'dictionary',
    component: () => import('../views/Dictionary.vue'),
    meta: { title: '殿堂辞典' },
  }),
  withRoomMeta({
    path: '/knowledge',
    name: 'knowledge',
    component: () => import('../views/KnowledgeTower.vue'),
    meta: { title: '经略阁' },
  }),
  withRoomMeta({
    path: '/carrier-editor',
    name: 'carrier-editor',
    component: () => import('../views/CarrierEditor.vue'),
    meta: { title: '载体编辑器' },
  }),
  withRoomMeta({
    path: '/cognition',
    name: 'cognition',
    component: () => import('../views/CognitionHall.vue'),
    meta: { title: '释光阁·素镜' },
  }),
  withRoomMeta({
    path: '/body-wisdom',
    name: 'body-wisdom',
    component: () => import('../views/BodyWisdom.vue'),
    meta: { title: '藏象阁' },
  }),
  withRoomMeta({
    path: '/automation',
    name: 'automation',
    component: () => import('../views/DisciplineWorkshop.vue'),
    meta: { title: '自律工坊' },
  }),
  withRoomMeta({
    path: '/archive',
    name: 'archive',
    component: () => import('../views/Archive.vue'),
    meta: { title: '数据档案馆' },
  }),
  withRoomMeta({
    path: '/data-asset',
    name: 'data-asset',
    component: () => import('../views/DataAsset.vue'),
    meta: { title: '数据资产' },
  }),
  withRoomMeta({
    path: '/all-selves',
    name: 'all-selves',
    component: () => import('../views/AllSelvesMirror.vue'),
    meta: { title: '众生象' },
  }),
  withRoomMeta({
    path: '/parallel',
    name: 'parallel',
    component: () => import('../views/ParallelWorld.vue'),
    meta: { title: '平行世界' },
  }),
  withRoomMeta({
    path: '/plugin-market',
    name: 'plugin-market',
    component: () => import('../views/PluginMarket.vue'),
    meta: { title: '插件市场' },
  }),
  withRoomMeta({
    path: '/workhub',
    name: 'workhub',
    component: () => import('../views/WorkHub.vue'),
    meta: { title: '工作中心' },
  }),
  withRoomMeta({
    path: '/advisors',
    name: 'advisors',
    component: () => import('../views/AdvisorHub.vue'),
    meta: { title: '幕僚大厅' },
  }),
  withRoomMeta({
    path: '/advisors/affinity',
    name: 'advisor-affinity',
    component: () => import('../views/AdvisorAffinity.vue'),
    meta: { title: '幕僚好感' },
  }),
  withRoomMeta({
    path: '/advisors/witness/:id',
    name: 'advisor-witness',
    component: () => import('../views/AdvisorWitnessLog.vue'),
    meta: { title: '幕僚见证' },
  }),
  withRoomMeta({
    path: '/advisors/chat/:id',
    name: 'advisor-chat',
    component: () => import('../views/AdvisorChat.vue'),
    meta: { title: '幕僚对话' },
  }),
  withRoomMeta({
    path: '/advisors/archive',
    name: 'advisor-archive',
    component: () => import('../views/AdvisorArchive.vue'),
    meta: { title: '幕僚档案' },
  }),
  withRoomMeta({
    path: '/style-market',
    name: 'style-market',
    component: () => import('../views/StyleMarket.vue'),
    meta: { title: '风格包市场' },
  }),
  withRoomMeta({
    path: '/template-market',
    name: 'template-market',
    component: () => import('../views/TemplateMarket.vue'),
    meta: { title: '模板市场' },
  }),

  // ================================================================
  // 工作类房间（从更漏分支）
  // ================================================================
  withRoomMeta({
    path: '/scar',
    name: 'scar',
    component: () => import('../views/Scar.vue'),
    meta: { title: '工痕' },
  }),
  withRoomMeta({
    path: '/reward',
    name: 'reward',
    component: () => import('../views/Reward.vue'),
    meta: { title: '劳酬' },
  }),
  withRoomMeta({
    path: '/self-reward',
    name: 'self-reward',
    component: () => import('../views/SelfReward.vue'),
    meta: { title: '自我奖励' },
  }),
  withRoomMeta({
    path: '/craft',
    name: 'craft',
    component: () => import('../views/Craft.vue'),
    meta: { title: '匠庐' },
  }),
  withRoomMeta({
    path: '/material-workshop',
    name: 'material-workshop',
    component: () => import('../views/MaterialWorkshop.vue'),
    meta: { title: '材质工坊' },
  }),
  withRoomMeta({
    path: '/component-market',
    name: 'component-market',
    component: () => import('../views/ComponentMarket.vue'),
    meta: { title: '组件市场' },
  }),
  withRoomMeta({
    path: '/career',
    name: 'career',
    component: () => import('../views/Career.vue'),
    meta: { title: '业脉' },
  }),
  withRoomMeta({
    path: '/bag',
    name: 'bag',
    component: () => import('../views/Bag.vue'),
    meta: { title: '行囊' },
  }),
  withRoomMeta({
    path: '/rest',
    name: 'rest',
    component: () => import('../views/Rest.vue'),
    meta: { title: '息壤' },
  }),

  // ================================================================
  // 系统与设定
  // ================================================================
  withRoomMeta({
    path: '/constitution',
    name: 'constitution',
    component: () => import('../views/Constitution.vue'),
    meta: { title: '心流宪法' },
  }),
  withRoomMeta({
    path: '/plugins',
    name: 'plugins',
    component: () => import('../views/Plugins.vue'),
    meta: { title: '插件管理器' },
  }),
  withRoomMeta({
    path: '/settings',
    name: 'settings',
    component: () => import('../views/Settings.vue'),
    meta: { title: '殿堂设置' },
  }),

  // ================================================================
  // 工具与管理
  // ================================================================
  withRoomMeta({
    path: '/room-manager',
    name: 'room-manager',
    component: () => import('../views/RoomManager.vue'),
    meta: { title: '房间管理器' },
  }),

  // ================================================================
  // 定音四幕
  // ================================================================
  withRoomMeta({
    path: '/dingyin-four-acts',
    name: 'DingyinFourActs',
    component: () => import('../views/DingyinFourActs.vue'),
    meta: { title: '定音四幕' },
  }),

  // ================================================================
  // B 阶段：新模块
  // ================================================================
  withRoomMeta({
    path: '/space-customizer',
    name: 'space-customizer',
    component: () => import('../views/SpaceCustomizer.vue'),
    meta: { title: '空间自定义' },
  }),
  withRoomMeta({
    path: '/scene-editor',
    name: 'scene-editor',
    component: () => import('../views/SceneEditor.vue'),
    meta: { title: '场景编辑器' },
  }),
  withRoomMeta({
    path: '/environment-editor',
    name: 'environment-editor',
    component: () => import('../views/EnvironmentEditor.vue'),
    meta: { title: '环境编辑器' },
  }),
  withRoomMeta({
    path: '/decoration-workshop',
    name: 'decoration-workshop',
    component: () => import('../views/DecorationWorkshop.vue'),
    meta: { title: '殿堂装修工坊' },
  }),
  withRoomMeta({
    path: '/app-space',
    name: 'app-space',
    component: () => import('../views/AppSpace.vue'),
    meta: { title: '应用空间' },
  }),
  withRoomMeta({
    path: '/launcher',
    name: 'launcher',
    component: () => import('../modules/launcher/Launcher.vue'),
    meta: { title: '启动器' },
  }),
  withRoomMeta({
    path: '/external',
    name: 'external',
    component: () => import('../views/ExternalRoom.vue'),
    meta: { title: '外链房' },
  }),
  withRoomMeta({
    path: '/interaction-config',
    name: 'interaction-config',
    component: () => import('../views/InteractionConfig.vue'),
    meta: { title: '交互配置' },
  }),

  // ================================================================
  // 补充空间：未注册视图
  // ================================================================
  withRoomMeta({
    path: '/output',
    name: 'output',
    component: () => import('../views/Output.vue'),
    meta: { title: '输出管理' },
  }),
  withRoomMeta({
    path: '/study',
    name: 'study',
    component: () => import('../views/Study.vue'),
    meta: { title: '思绪书房' },
  }),
  withRoomMeta({
    path: '/capsule',
    name: 'capsule',
    component: () => import('../views/Capsule.vue'),
    meta: { title: '时光胶囊' },
  }),
  withRoomMeta({
    path: '/dream-nook',
    name: 'dream-nook',
    component: () => import('../views/DreamNook.vue'),
    meta: { title: '梦乡小筑' },
  }),
  withRoomMeta({
    path: '/growth-garden',
    name: 'growth-garden',
    component: () => import('../views/GrowthGarden.vue'),
    meta: { title: '成长庭院' },
  }),
  withRoomMeta({
    path: '/automation-workshop',
    name: 'automation-workshop',
    component: () => import('../views/AutomationWorkshop.vue'),
    meta: { title: '自动化工坊' },
  }),
  withRoomMeta({
    path: '/transform-gallery',
    name: 'transform-gallery',
    component: () => import('../views/TransformGallery.vue'),
    meta: { title: '蜕变回廊' },
  }),
  withRoomMeta({
    path: '/mirror-self',
    name: 'mirror-self',
    component: () => import('../views/MirrorSelfView.vue'),
    meta: { title: '镜我' },
  }),
  withRoomMeta({
    path: '/visualization-studio',
    name: 'visualization-studio',
    component: () => import('../views/VisualizationStudio.vue'),
    meta: { title: '数据视觉工坊' },
  }),
  withRoomMeta({
    path: '/star-map',
    name: 'star-map',
    component: () => import('../views/StarMapView.vue'),
    meta: { title: '知识星图' },
  }),
  withRoomMeta({
    path: '/association-graph',
    name: 'association-graph',
    component: () => import('../views/AssociationGraph.vue'),
    meta: { title: '共鸣图谱' },
  }),
  withRoomMeta({
    path: '/traditions',
    name: 'traditions',
    component: () => import('../views/Traditions.vue'),
    meta: { title: '文明根系' },
  }),
  withRoomMeta({
    path: '/data-outflow',
    name: 'data-outflow',
    component: () => import('../views/DataOutflowView.vue'),
    meta: { title: '数据流出日志' },
  }),
  withRoomMeta({
    path: '/home-replica',
    name: 'home-replica',
    component: () => import('../views/HomeReplicaView.vue'),
    meta: { title: '家 · 1:1 复刻' },
  }),
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

// 全局后置守卫：房间切换时触发触觉反馈
router.afterEach(() => {
  const cfg = storage.getConfig()
  const enabled = !!cfg?.interaction?.hapticFeedback || !!cfg?.complianceOverride?.hapticFeedbackOverwrite
  triggerHaptic('light', enabled)
})

// 安全导航：导航被拒时静默忽略良性的「重复跳转」(NavigationDuplicated)，
// 避免 unhandled promise rejection 噪声；真实导航错误（守卫拦截/路径非法等）
// 仍向上抛出，不掩盖真实故障。一次性包装，覆盖全仓所有 router.push/replace 调用点。
const NAV_DUP = 'NavigationDuplicated'
function silenceDuplicate(to: Promise<unknown>): Promise<unknown> {
  return to.catch((err: unknown) => {
    if (err && (err as { name?: string }).name === NAV_DUP) return
    throw err
  })
}
const _origPush = router.push.bind(router)
const _origReplace = router.replace.bind(router)
const _mutable = router as unknown as {
  push: (to: Parameters<typeof _origPush>[0]) => Promise<unknown>
  replace: (to: Parameters<typeof _origReplace>[0]) => Promise<unknown>
}
_mutable.push = (to) => silenceDuplicate(_origPush(to))
_mutable.replace = (to) => silenceDuplicate(_origReplace(to))

export default router