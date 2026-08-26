// ============================================================
// 家 · 内部房间定义（11 个场景化空间）
// 这些房间通过 HomeRoomPanel 切换，不注册独立路由
// ============================================================

export interface HomeRoom {
  id: string
  name: string
  icon: string
  description: string
  color: string
  /** 氛围光色（CSS 渐变起始色） */
  atmosphereColor: string
  /** 氛围光色（CSS 渐变结束色） */
  atmosphereEndColor: string
  /** 壁纸纹理类型 */
  texture: 'wall' | 'wood' | 'stone' | 'fabric' | 'glass' | 'paper' | 'tile' | 'metal' | 'plant'
  /** 环境音效代号 */
  ambientSound: string
  /** 是否有交互元素 */
  hasInteractive: boolean
}

export const HOME_ROOMS: HomeRoom[] = [
  {
    id: 'entrance',
    name: '玄关',
    icon: '🚪',
    description: '每日归家的第一道门，悬挂着今日的钥匙与备忘',
    color: '#c49a6a',
    atmosphereColor: '#c49a6a',
    atmosphereEndColor: '#8b7355',
    texture: 'wall',
    ambientSound: 'wind-chime',
    hasInteractive: true,
  },
  {
    id: 'study',
    name: '书房',
    icon: '📚',
    description: '知识沉淀之所，书架与笔记堆叠出思想的轮廓',
    color: '#8b7d6b',
    atmosphereColor: '#8b7d6b',
    atmosphereEndColor: '#5c4f3f',
    texture: 'wood',
    ambientSound: 'pages',
    hasInteractive: true,
  },
  {
    id: 'courtyard',
    name: '庭院',
    icon: '🌿',
    description: '内院的一方天井，四时草木与光影在此流转',
    color: '#7a9a5a',
    atmosphereColor: '#7a9a5a',
    atmosphereEndColor: '#4a6a3a',
    texture: 'stone',
    ambientSound: 'leaves',
    hasInteractive: true,
  },
  {
    id: 'bedroom',
    name: '卧室',
    icon: '🛏️',
    description: '安眠与休憩的私密空间，梦境在此酝酿',
    color: '#a0806a',
    atmosphereColor: '#a0806a',
    atmosphereEndColor: '#6a5544',
    texture: 'fabric',
    ambientSound: 'silence',
    hasInteractive: false,
  },
  {
    id: 'kitchen',
    name: '厨房',
    icon: '🍳',
    description: '烟火气的温暖角落，烹饪与创造在此发生',
    color: '#c4a060',
    atmosphereColor: '#c4a060',
    atmosphereEndColor: '#8a7040',
    texture: 'tile',
    ambientSound: 'simmer',
    hasInteractive: true,
  },
  {
    id: 'living-room',
    name: '客厅',
    icon: '🛋️',
    description: '会客与独处的交汇处，光线洒落在地毯上',
    color: '#b8987a',
    atmosphereColor: '#b8987a',
    atmosphereEndColor: '#7a6048',
    texture: 'fabric',
    ambientSound: 'fireplace',
    hasInteractive: true,
  },
  {
    id: 'bathroom',
    name: '浴室',
    icon: '🛁',
    description: '卸下一天的疲惫，在蒸汽与暖光中放空',
    color: '#8aacb8',
    atmosphereColor: '#8aacb8',
    atmosphereEndColor: '#5a7c88',
    texture: 'tile',
    ambientSound: 'water',
    hasInteractive: false,
  },
  {
    id: 'balcony',
    name: '阳台',
    icon: '🌅',
    description: '向外眺望的窗口，城市灯火与星空尽收眼底',
    color: '#6a8ab0',
    atmosphereColor: '#6a8ab0',
    atmosphereEndColor: '#3a5a80',
    texture: 'glass',
    ambientSound: 'city-hum',
    hasInteractive: true,
  },
  {
    id: 'storage',
    name: '储藏室',
    icon: '📦',
    description: '记忆的角落，存放着旧物与未被整理的思绪',
    color: '#6a5a4a',
    atmosphereColor: '#6a5a4a',
    atmosphereEndColor: '#3a2a1a',
    texture: 'stone',
    ambientSound: 'echo',
    hasInteractive: false,
  },
  {
    id: 'wardrobe',
    name: '衣帽间',
    icon: '👗',
    description: '每日装扮的仪式空间，风格在此切换与演进',
    color: '#c4a0b8',
    atmosphereColor: '#c4a0b8',
    atmosphereEndColor: '#8a6080',
    texture: 'fabric',
    ambientSound: 'rustle',
    hasInteractive: true,
  },
  {
    id: 'dining-room',
    name: '餐厅',
    icon: '🍽️',
    description: '味觉的记忆殿堂，一餐一饭皆是生活叙事',
    color: '#c4a478',
    atmosphereColor: '#c4a478',
    atmosphereEndColor: '#8a6848',
    texture: 'wood',
    ambientSound: 'dining',
    hasInteractive: true,
  },
]

/** 默认房间 */
export const DEFAULT_HOME_ROOM = HOME_ROOMS[0]

/** 通过 id 查找房间 */
export function getHomeRoom(id: string): HomeRoom | undefined {
  return HOME_ROOMS.find((r) => r.id === id)
}