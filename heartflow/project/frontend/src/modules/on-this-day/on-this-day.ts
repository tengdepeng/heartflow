// ============================================================
// 时间长廊 · 历史上的今天（On This Day · History，INCR-510）
// ------------------------------------------------------------
// 借鉴 96 APK「万年日历」assets/chinaHistoryEvent.json（中国历史事件表）。
// 心流此前仅有个人的「那年今日」（anchor/anchor-journals journalsOnThisDay），
// 缺公共历史事件库。本模块补一份精选历史事件库 + 按「月-日」检索，
// 供 CalendarView / 时间长廊呈现「今日历史事件」。
//
// 合规：纯本地静态数据，零网络；收藏状态存 hf:on_this_day_favs。
// ============================================================

import { ref, computed } from 'vue'
import { storage } from '../../engine/storage'

const FAV_KEY = 'hf:on_this_day_favs'

export type HistoryCategory = '中国' | '世界' | '科技' | '文化' | '探索'

export interface HistoryEvent {
  id: string
  /** 月 1~12 */
  month: number
  /** 日 1~31 */
  day: number
  /** 年份（公元前用负数） */
  year: number
  title: string
  category: HistoryCategory
}

export const HISTORY_CATEGORIES: HistoryCategory[] = ['中国', '世界', '科技', '文化', '探索']

/**
 * 精选历史事件库（真实公开史实，日期取通行公历口径）。
 * 非全量 366 天，仅覆盖常见纪念日；未收录日期给出优雅空态。
 */
export const HISTORY_EVENTS: HistoryEvent[] = [
  // —— 1 月 ——
  { id: 'h-2012-j20', month: 1, day: 11, year: 2012, title: '歼-20 隐形战斗机首飞成功', category: '科技' },
  { id: 'h-1935-zunyi', month: 1, day: 15, year: 1935, title: '遵义会议召开，确立毛泽东的领导地位', category: '中国' },
  { id: 'h-2004-spirit', month: 1, day: 4, year: 2004, title: '勇气号火星车成功着陆火星', category: '探索' },
  { id: 'h-2019-change4', month: 1, day: 3, year: 2019, title: '嫦娥四号实现人类首次月球背面软着陆', category: '探索' },
  // —— 2 月 ——
  { id: 'h-2022-beijing-winter', month: 2, day: 4, year: 2022, title: '北京冬奥会开幕，北京成为双奥之城', category: '中国' },
  { id: 'h-2003-columbia', month: 2, day: 1, year: 2003, title: '哥伦比亚号航天飞机返航解体失事', category: '探索' },
  { id: 'h-1990-paleblue', month: 2, day: 14, year: 1990, title: '旅行者一号拍下「暗淡蓝点」地球照片', category: '探索' },
  // —— 3 月 ——
  { id: 'h-1879-einstein', month: 3, day: 14, year: 1879, title: '阿尔伯特·爱因斯坦出生', category: '科技' },
  // —— 4 月 ——
  { id: 'h-1961-gagarin', month: 4, day: 12, year: 1961, title: '加加林乘东方一号完成人类首次载人航天', category: '探索' },
  { id: 'h-1912-titanic', month: 4, day: 15, year: 1912, title: '泰坦尼克号沉没', category: '世界' },
  { id: 'h-1970-dongfanghong', month: 4, day: 24, year: 1970, title: '中国第一颗人造卫星「东方红一号」发射成功', category: '探索' },
  { id: 'h-1990-hubble', month: 4, day: 24, year: 1990, title: '哈勃空间望远镜发射升空', category: '探索' },
  { id: 'h-2019-blackhole', month: 4, day: 10, year: 2019, title: '人类首张黑洞照片公布', category: '探索' },
  // —— 5 月 ——
  { id: 'h-1919-mayfourth', month: 5, day: 4, year: 1919, title: '五四运动爆发', category: '中国' },
  { id: 'h-2008-wenchuan', month: 5, day: 12, year: 2008, title: '汶川大地震', category: '中国' },
  { id: 'h-2021-tianwen', month: 5, day: 15, year: 2021, title: '天问一号「祝融号」成功着陆火星', category: '探索' },
  { id: 'h-1953-everest', month: 5, day: 29, year: 1953, title: '人类首次登顶珠穆朗玛峰', category: '探索' },
  { id: 'h-2010-expo', month: 5, day: 1, year: 2010, title: '上海世博会开幕', category: '中国' },
  // —— 6 月 ——
  { id: 'h-1905-relativity', month: 6, day: 30, year: 1905, title: '爱因斯坦提交狭义相对论论文', category: '科技' },
  { id: 'h-2012-jiaolong', month: 6, day: 24, year: 2012, title: '蛟龙号载人潜水器突破 7000 米深潜', category: '探索' },
  // —— 7 月 ——
  { id: 'h-1997-hongkong', month: 7, day: 1, year: 1997, title: '香港回归祖国', category: '中国' },
  { id: 'h-1937-lugou', month: 7, day: 7, year: 1937, title: '卢沟桥事变，全民族抗战爆发', category: '中国' },
  { id: 'h-2001-bidwin', month: 7, day: 13, year: 2001, title: '北京申奥成功', category: '中国' },
  { id: 'h-1969-apollo11', month: 7, day: 20, year: 1969, title: '阿波罗 11 号登月，人类首次踏上月球', category: '探索' },
  { id: 'h-1921-cpc', month: 7, day: 23, year: 1921, title: '中国共产党第一次全国代表大会召开', category: '中国' },
  { id: 'h-1976-tangshan', month: 7, day: 28, year: 1976, title: '唐山大地震', category: '中国' },
  { id: 'h-1953-armistice', month: 7, day: 27, year: 1953, title: '朝鲜停战协定签署', category: '世界' },
  { id: 'h-1984-xuhaifeng', month: 7, day: 29, year: 1984, title: '许海峰夺中国奥运首金', category: '中国' },
  { id: 'h-2015-pluto', month: 7, day: 14, year: 2015, title: '新视野号飞掠冥王星', category: '探索' },
  // —— 8 月 ——
  { id: 'h-1945-hiroshima', month: 8, day: 6, year: 1945, title: '广岛遭原子弹轰炸', category: '世界' },
  { id: 'h-1945-vj', month: 8, day: 15, year: 1945, title: '日本宣布无条件投降，二战结束', category: '世界' },
  { id: 'h-2008-beijing', month: 8, day: 8, year: 2008, title: '北京奥运会开幕', category: '中国' },
  { id: 'h-1991-www', month: 8, day: 6, year: 1991, title: '万维网（WWW）向公众开放', category: '科技' },
  { id: 'h-1963-dream', month: 8, day: 28, year: 1963, title: '马丁·路德·金发表《我有一个梦想》', category: '世界' },
  { id: 'h-2016-mozi', month: 8, day: 16, year: 2016, title: '墨子号量子科学实验卫星发射', category: '科技' },
  // —— 9 月 ——
  { id: 'h-1990-asian-games', month: 9, day: 22, year: 1990, title: '北京亚运会开幕', category: '中国' },
  { id: 'h-1928-penicillin', month: 9, day: 28, year: 1928, title: '弗莱明发现青霉素', category: '科技' },
  // —— 10 月 ——
  { id: 'h-1949-prc', month: 10, day: 1, year: 1949, title: '中华人民共和国成立', category: '中国' },
  { id: 'h-1957-sputnik', month: 10, day: 4, year: 1957, title: '苏联发射人类第一颗人造卫星「斯普特尼克 1 号」', category: '探索' },
  { id: 'h-1883-orient', month: 10, day: 4, year: 1883, title: '东方快车首次发车', category: '世界' },
  { id: 'h-1911-xinhai', month: 10, day: 10, year: 1911, title: '武昌起义，辛亥革命爆发', category: '中国' },
  { id: 'h-1964-atom', month: 10, day: 16, year: 1964, title: '中国第一颗原子弹爆炸成功', category: '科技' },
  { id: 'h-2003-shenzhou5', month: 10, day: 15, year: 2003, title: '神舟五号载人飞船发射，杨利伟进入太空', category: '探索' },
  { id: 'h-1971-un', month: 10, day: 25, year: 1971, title: '中国恢复在联合国的合法席位', category: '中国' },
  { id: 'h-1969-arpanet', month: 10, day: 29, year: 1969, title: 'ARPANET 发出第一条网络消息，互联网雏形诞生', category: '科技' },
  // —— 11 月 ——
  { id: 'h-1895-xray', month: 11, day: 8, year: 1895, title: '伦琴发现 X 射线', category: '科技' },
  { id: 'h-1989-berlinwall', month: 11, day: 9, year: 1989, title: '柏林墙倒塌', category: '世界' },
  // —— 12 月 ——
  { id: 'h-1936-xian', month: 12, day: 12, year: 1936, title: '西安事变', category: '中国' },
  { id: 'h-1903-wright', month: 12, day: 17, year: 1903, title: '莱特兄弟完成人类首次动力飞行', category: '科技' },
  { id: 'h-1978-thirdplenum', month: 12, day: 18, year: 1978, title: '十一届三中全会召开，开启改革开放', category: '中国' },
  { id: 'h-1999-macau', month: 12, day: 20, year: 1999, title: '澳门回归祖国', category: '中国' },
  { id: 'h-2020-change5', month: 12, day: 17, year: 2020, title: '嫦娥五号携月壤返回地球', category: '探索' },
]

// ------------------------------------------------------------
// 纯函数（可单测）
// ------------------------------------------------------------

/** 取某月某日的历史事件（按年份升序） */
export function eventsOn(month: number, day: number): HistoryEvent[] {
  return HISTORY_EVENTS.filter((e) => e.month === month && e.day === day).sort((a, b) => a.year - b.year)
}

/** 按分类筛选 */
export function eventsByCategory(category: HistoryCategory | ''): HistoryEvent[] {
  if (!category) return [...HISTORY_EVENTS]
  return HISTORY_EVENTS.filter((e) => e.category === category)
}

/** 关键词搜索（匹配标题，不区分大小写） */
export function searchEvents(query: string): HistoryEvent[] {
  const q = (query ?? '').trim().toLowerCase()
  if (!q) return [...HISTORY_EVENTS]
  return HISTORY_EVENTS.filter((e) => e.title.toLowerCase().includes(q))
}

/** 年份展示：负数转「公元前」 */
export function formatYear(year: number): string {
  return year < 0 ? `公元前 ${Math.abs(year)} 年` : `${year} 年`
}

/** 随机抽取一桩（可注入 rng 以便测试） */
export function pickRandom(events: HistoryEvent[], rng: () => number = Math.random): HistoryEvent | null {
  if (events.length === 0) return null
  const idx = Math.min(events.length - 1, Math.floor(rng() * events.length))
  return events[idx]
}

/** 事件总量（供概览） */
export function totalEvents(): number {
  return HISTORY_EVENTS.length
}

// ------------------------------------------------------------
// 收藏（模块级单例 + 持久化）
// ------------------------------------------------------------

function loadFavs(): string[] {
  try {
    const raw = storage.getKV<unknown>(FAV_KEY, [])
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

const favIds = ref<string[]>(loadFavs())

export function reloadOnThisDay(): void {
  favIds.value = loadFavs()
}

export function useOnThisDay() {
  const favs = computed(() => favIds.value)
  const favEvents = computed(() => HISTORY_EVENTS.filter((e) => favIds.value.includes(e.id)))

  function isFav(id: string): boolean {
    return favIds.value.includes(id)
  }

  function toggleFav(id: string): boolean {
    if (!HISTORY_EVENTS.some((e) => e.id === id)) return false
    const next = favIds.value.includes(id)
      ? favIds.value.filter((x) => x !== id)
      : [...favIds.value, id]
    favIds.value = next
    try {
      storage.setKV(FAV_KEY, next)
    } catch {
      /* 持久化失败不影响内存态 */
    }
    return next.includes(id)
  }

  return { favs, favEvents, isFav, toggleFav }
}
