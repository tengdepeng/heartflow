import { ref, computed } from 'vue'

/** 房间场景定义 */
export interface RoomScene {
  id: string
  name: string
  icon: string
  description: string
  /** 氛围光色（CSS 颜色值） */
  atmosphereColor: string
  /** 氛围标签 */
  atmosphereLabel: string
  /** 关联数据提示 */
  relatedData?: string[]
  /** 功能入口 */
  functionEntries?: { label: string; roomId: string }[]
}

/** 所有房间场景数据 */
export const ROOM_SCENES: RoomScene[] = [
  {
    id: 'entrance',
    name: '玄关',
    icon: '🚪',
    description: '鞋柜上放着出门常用的东西，一盏暖灯自动亮起。过道连接各个房间，墙上有用户挂的画和照片。走廊尽头透出厨房的光。',
    atmosphereColor: '#fce4b3',
    atmosphereLabel: '暖黄 · 2700K',
    relatedData: ['今日天气', '出门提醒'],
    functionEntries: [{ label: '走向客厅', roomId: 'living' }, { label: '走向厨房', roomId: 'kitchen' }],
  },
  {
    id: 'wardrobe',
    name: '衣帽间',
    icon: '👔',
    description: '所有衣物挂在这里。不是「衣物管理列表」，而是每天早上会经过的角落。某件衬衫挂在那里，旁边是上次穿它时自动关联的记忆光点。',
    atmosphereColor: '#e8e0d8',
    atmosphereLabel: '中性白 · 4000K',
    relatedData: ['衣物总数', '近期穿着'],
    functionEntries: [{ label: '走向卧室', roomId: 'bedroom' }],
  },
  {
    id: 'kitchen',
    name: '厨房',
    icon: '🍳',
    description: '灶台上炖着汤，冰箱里能看到上次记录的食材。锅里的汤正在冒热气，调料架上排列着用户常用的调料。',
    atmosphereColor: '#fde8c8',
    atmosphereLabel: '暖白 · 3500K',
    relatedData: ['今日饮食记录', '冰箱库存'],
    functionEntries: [{ label: '走向餐厅', roomId: 'dining' }],
  },
  {
    id: 'dining',
    name: '餐厅',
    icon: '🍽️',
    description: '一张厚实的木桌，桌上有暖灯。餐桌旁边的墙上挂着和食物相关的记忆——某次重要聚会的照片、某次深夜独自吃饭时写下的心情。',
    atmosphereColor: '#f5d6a8',
    atmosphereLabel: '暖橙 · 3000K',
    relatedData: ['深夜食堂', '聚餐记忆'],
    functionEntries: [{ label: '走向客厅', roomId: 'living' }],
  },
  {
    id: 'bedroom',
    name: '卧室',
    icon: '🛏️',
    description: '床上用品随季节自动更换。床头柜上有一盏可调亮度的夜灯。身体温室里的睡眠数据自动关联到卧室。',
    atmosphereColor: '#f0d5b0',
    atmosphereLabel: '柔和琥珀 · 2200K',
    relatedData: ['睡眠质量', '梦乡结晶'],
    functionEntries: [{ label: '走向浴室', roomId: 'bath' }, { label: '走向衣帽间', roomId: 'wardrobe' }],
  },
  {
    id: 'bath',
    name: '浴室',
    icon: '🛁',
    description: '热水冲在肩膀上，终于松了。浴室的镜子上偶尔会有极淡的雾气——那是身体温室里的植物在「呼吸」。',
    atmosphereColor: '#c8e8f0',
    atmosphereLabel: '水雾蓝 · 5000K',
    relatedData: ['身体护理习惯', '放松记录'],
    functionEntries: [{ label: '回到卧室', roomId: 'bedroom' }],
  },
  {
    id: 'living',
    name: '客厅',
    icon: '🛋️',
    description: '茶几上放着用户最近在读的书、刚拍的照片、和朋友一起玩的桌游。访客模式开启时，客人只能进入客厅和餐厅。',
    atmosphereColor: '#fde8c8',
    atmosphereLabel: '暖白 · 3500K',
    relatedData: ['访客模式', '幕僚活动'],
    functionEntries: [{ label: '走向书房', roomId: 'study' }, { label: '走向餐厅', roomId: 'dining' }],
  },
  {
    id: 'study',
    name: '书房',
    icon: '📚',
    description: '书架上的书就是用户接引进殿堂的所有书。书桌上放着用户的笔记和知识结晶。经略阁的知识星图在书房角落里缓慢旋转。',
    atmosphereColor: '#e8e0d8',
    atmosphereLabel: '暖白 · 4000K',
    relatedData: ['笔记总数', '知识结晶'],
    functionEntries: [{ label: '回到客厅', roomId: 'living' }, { label: '走向庭院', roomId: 'courtyard' }],
  },
  {
    id: 'courtyard',
    name: '庭院',
    icon: '🌿',
    description: '连接室内和外部世界的过渡空间。用户可以在这里种花、晒太阳、发呆。庭院里有一棵树——那是殿堂自主生长出来的树。',
    atmosphereColor: '#d8e8c8',
    atmosphereLabel: '自然光 · 5000K',
    relatedData: ['植物生长', '放松时长'],
    functionEntries: [{ label: '回到书房', roomId: 'study' }],
  },
  {
    id: 'balcony',
    name: '阳台',
    icon: '🌅',
    description: '向外眺望的窗口，城市灯火与星空尽收眼底。在这里驻足片刻，把此刻看到的、想到的轻轻记下来。',
    atmosphereColor: '#b8d0e8',
    atmosphereLabel: '夜空蓝 · 6500K',
    relatedData: ['此刻时分', '今日思绪'],
    functionEntries: [{ label: '走向庭院', roomId: 'courtyard' }],
  },
  {
    id: 'storage',
    name: '储藏室',
    icon: '📦',
    description: '记忆的角落，存放着被归档的旧物与尚未整理的思绪。翻开一只旧纸箱，也许是一段被收起来的时光。',
    atmosphereColor: '#b8a890',
    atmosphereLabel: '暖灰 · 3000K',
    relatedData: ['归档旧物', '待整理思绪'],
    functionEntries: [{ label: '走向衣帽间', roomId: 'wardrobe' }],
  },
]

/** 当前选中的房间场景 */
const currentSceneId = ref<string>('entrance')

export function useRoomAtmosphere() {
  /** 当前场景对象 */
  const currentScene = computed<RoomScene>(() => {
    return ROOM_SCENES.find(s => s.id === currentSceneId.value) ?? ROOM_SCENES[0]
  })

  /** 切换到指定房间 */
  function switchScene(sceneId: string): boolean {
    const exists = ROOM_SCENES.some(s => s.id === sceneId)
    if (!exists) return false
    currentSceneId.value = sceneId
    return true
  }

  /** 应用氛围（设置 CSS 自定义属性） */
  function applyAtmosphere(scene: RoomScene): void {
    document.documentElement.style.setProperty('--room-atmosphere-color', scene.atmosphereColor)
    document.documentElement.style.setProperty('--room-atmosphere-label', `"${scene.atmosphereLabel}"`)
  }

  /** 重置氛围 */
  function resetAtmosphere(): void {
    document.documentElement.style.removeProperty('--room-atmosphere-color')
    document.documentElement.style.removeProperty('--room-atmosphere-label')
  }

  return {
    currentSceneId,
    currentScene,
    switchScene,
    applyAtmosphere,
    resetAtmosphere,
  }
}