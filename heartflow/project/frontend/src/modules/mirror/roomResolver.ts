// ============================================================
// 镜我对系统 · 房间路由解析器
// 将用户口语房间名动态解析为真实路由（基于房间图引擎 + 别名表）
// 替换 useMirrorDialogue 写死的 roomRouteMap，修复「只回复正在跳转却不跳转」
// ============================================================

import { getAllRooms } from '../../engine/room-graph'

export interface RoomResolveResult {
  /** 解析到的路由路径；未找到为 null */
  path: string | null
  /** 匹配到的房间显示名（用于回执文案） */
  roomName: string | null
}

/**
 * 口语别名 → 路由路径。
 * 覆盖两类情况：
 *  1) 用户口语与房间图 name 不一致（如「知识殿堂」对应房间图 name「经略阁」、路由 /knowledge）；
 *  2) 路由已存在但房间图未注册节点（如「房间管理器」无房间图节点，但路由 /room-manager 存在）。
 * 所有别名目标均为 router/index.ts 中真实存在的路由。
 */
const ROOM_ALIASES: Record<string, string> = {
  // ---- 系统 / 设置 ----
  '殿堂设置': '/settings',
  '设置': '/settings',
  '系统设置': '/settings',
  '房间管理': '/room-manager',
  '房间管理器': '/room-manager',
  '管理房间': '/room-manager',
  '空间自定义': '/space-customizer',
  '自定义空间': '/space-customizer',
  '装修': '/decoration-workshop',
  '殿堂装修': '/decoration-workshop',
  '装修工坊': '/decoration-workshop',
  '应用空间': '/app-space',
  '插件': '/plugins',
  '插件管理': '/plugins',
  '插件管理器': '/plugins',
  '心流宪法': '/constitution',
  '宪法': '/constitution',

  // ---- 主链路 ----
  '心流': '/',
  '首页': '/',
  '主页': '/',
  '家': '/home-space',
  '时间线': '/timeline',
  '时间线枢纽': '/timeline',
  '时间长廊': '/time-corridor',
  '时间线索引': '/timeline-index',
  '逐日心锚': '/anchor',
  '心锚': '/anchor',
  '锚点': '/anchor',
  '情绪花房': '/garden',
  '花房': '/garden',
  '花园': '/garden',
  '情绪': '/garden',
  '安全岛': '/sanctuary',
  '庇护': '/sanctuary',
  '静默庇护': '/sanctuary',

  // ---- 世界房间 ----
  '留光阁': '/goals',
  '目标': '/goals',
  '阅览殿': '/reading',
  '阅览': '/reading',
  '阅读': '/reading',
  '思绪书房': '/study',
  '书房': '/study',
  '羁绊之厅': '/relations',
  '羁绊': '/relations',
  '身体温室': '/body',
  '身体': '/body',
  '更漏': '/worklog',
  '专注日志': '/worklog',
  '工时': '/worklog',
  '工作日志': '/worklog',
  '工时记录': '/worklog',
  '工时日志': '/worklog',
  '逸趣阁': '/play',
  '地图室': '/map',
  '地图': '/map',
  '书签': '/bookmarks',
  '殿堂触角': '/touchpoints',
  '触角': '/touchpoints',
  '保险库': '/vault',
  '守护室': '/guard',
  '守护': '/guard',
  '字镜阁': '/word-mirror',
  '岁时阁': '/seasonal',
  '未完成花园': '/unfinished',
  '动律之间': '/movement',
  '运动': '/movement',
  '根脉之庭': '/roots',
  '根脉': '/roots',
  '知微阁': '/wisdom',
  '智慧': '/wisdom',
  '殿堂辞典': '/dictionary',
  '辞典': '/dictionary',
  '经略阁': '/knowledge',
  '知识殿堂': '/knowledge',
  '知识': '/knowledge',
  '释光阁': '/cognition',
  '认知': '/cognition',
  '藏象阁': '/body-wisdom',
  '自律工坊': '/discipline-workshop',
  '自律': '/discipline-workshop',
  '习惯': '/discipline-workshop',
  '自动化': '/automation',
  '数据档案馆': '/archive',
  '档案馆': '/archive',
  '众生象': '/all-selves',
  '多重自我': '/all-selves',
  '平行世界': '/parallel',
  '平行': '/parallel',
  '时光胶囊': '/capsule',
  '胶囊': '/capsule',
  '工作中心': '/workhub',
  '工作': '/workhub',
  '幕僚大厅': '/advisors',
  '幕僚': '/advisors',
  '顾问': '/advisors',
  '载体编辑器': '/carrier-editor',
  '载体': '/carrier-editor',
  '插件市场': '/plugin-market',
  '风格包市场': '/style-market',
  '风格市场': '/style-market',
  '模板市场': '/template-market',
  '模板': '/template-market',
  '幕僚好感': '/advisors/affinity',
  '好感': '/advisors/affinity',
  '工痕': '/scar',
  '劳酬': '/reward',
  '记账': '/reward',
  '账本': '/reward',
  '财务': '/reward',
  '收支': '/reward',
  '流水账': '/reward',
  '账单': '/reward',
  '报销': '/reward',
  '结余': '/reward',
  '资产负债': '/reward',
  '开销': '/reward',
  '花销': '/reward',
  '支出': '/reward',
  '收入': '/reward',
  '预算': '/reward',
  '月结': '/reward',
  '入账': '/reward',
  '出账': '/reward',
  '自奖': '/self-reward',
  '匠庐': '/craft',
  '工艺': '/craft',
  '作品': '/craft',
  '材质工坊': '/material-workshop',
  '组件市场': '/component-market',
  '业脉': '/career',
  '职业': '/career',
  '行囊': '/bag',
  '背包': '/bag',
  '息壤': '/rest',
  '休息': '/rest',
  '自动化工坊': '/automation',
  '蜕变回廊': '/transform-gallery',
  '输出管理': '/output',
  '输出': '/output',
  '梦乡小筑': '/dream-nook',
  '梦境': '/dream-nook',
  '成长庭院': '/growth-garden',
  '成长花园': '/growth-garden',
  '成长': '/growth-garden',
  '数据视觉工坊': '/visualization-studio',
  '镜我': '/mirror-self',
  '知识星图': '/star-map',
  '星图': '/star-map',
  '共鸣图谱': '/association-graph',
  '文明根系': '/traditions',
  '文明': '/traditions',
  '启动器': '/launcher',
  '家1比1复刻': '/home-replica',
  '家复刻': '/home-replica',
  '1比1复刻': '/home-replica',
  '关系图谱': '/knowledge-graph',
  '知识图谱': '/knowledge-graph',
  '图谱': '/knowledge-graph',
  '荣休录': '/advisors/archive',
  '退役幕僚': '/advisors/archive',
}

/** 规范化：去空格、转小写，用于匹配 */
function normalize(s: string): string {
  return s.replace(/\s+/g, '').toLowerCase()
}

/**
 * 解析口语房间名 → 路由路径。
 * 优先级：别名精准 → 房间图 name 精准 → 房间图 id → 别名/name 包含匹配。
 * 失败返回 { path: null }，调用方据此回退提示文案（而非静默无动作）。
 */
export function resolveRoomRoute(rawTarget: string): RoomResolveResult {
  const target = (rawTarget || '').trim()
  if (!target) return { path: null, roomName: null }
  const norm = normalize(target)
  const rooms = getAllRooms()

  // 1) 别名精准匹配
  for (const [alias, path] of Object.entries(ROOM_ALIASES)) {
    if (normalize(alias) === norm) {
      return { path, roomName: alias }
    }
  }

  // 2) 房间图 name 精准匹配
  for (const r of rooms) {
    if (normalize(r.name) === norm) {
      return { path: r.path, roomName: r.name }
    }
  }

  // 3) 房间图 id 匹配
  for (const r of rooms) {
    if (r.id === norm || r.id === target) {
      return { path: r.path, roomName: r.name }
    }
  }

  // 4) 包含匹配（别名或 name 包含 target，或反之）；取首个命中
  for (const [alias, path] of Object.entries(ROOM_ALIASES)) {
    const an = normalize(alias)
    if (an.includes(norm) || norm.includes(an)) {
      return { path, roomName: alias }
    }
  }
  for (const r of rooms) {
    const rn = normalize(r.name)
    if (rn.includes(norm) || norm.includes(rn)) {
      return { path: r.path, roomName: r.name }
    }
  }

  return { path: null, roomName: null }
}
