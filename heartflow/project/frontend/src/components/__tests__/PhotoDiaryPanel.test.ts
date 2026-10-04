// ============================================================
// 逐日心锚 · 照片日记面板测试
// ============================================================
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createMockStorage } from '../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../engine/storage/core'

function entry(overrides: Record<string, any> = {}) {
  return {
    id: `pd_${Math.random().toString(36).slice(2, 8)}`,
    date: '2026-08-20',
    images: ['data:image/png;base64,AAAA'],
    caption: '今天的天空',
    createdAt: '2026-08-20T08:00:00.000Z',
    ...overrides,
  }
}

async function mountPanel(kvStore: Record<string, any> = {}, props: Record<string, any> = {}) {
  vi.resetModules()
  const storageMock = createMockStorage()
  storageMock.setItem('heartflow:storage', JSON.stringify({
    version: 10,
    kvStore,
    sessions: [],
    crystals: [],
  }))
  ;(globalThis as any).localStorage = storageMock
  invalidateCache()
  const mod = await import('../PhotoDiaryPanel.vue')
  // Teleport 桩掉：全屏浮层内容改在原地渲染，便于断言
  const wrapper = mount(mod.default, { props, global: { stubs: { Teleport: true } } })
  await wrapper.vm.$nextTick()
  return wrapper
}

function savedEntry() {
  const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
  return saved.kvStore['hf:anchor:photo_diary'][0]
}

describe('PhotoDiaryPanel 照片日记', () => {
  it('空状态提示', async () => {
    const wrapper = await mountPanel()
    expect(wrapper.text()).toContain('照片日记')
    expect(wrapper.text()).toContain('还没有照片日记')
  })

  it('展示预置照片', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [
        entry({ images: ['data:image/png;base64,AAAA', 'data:image/png;base64,BBBB'] }),
        entry({ date: '2026-08-19', images: ['data:image/png;base64,CCCC'], caption: '晨光' }),
      ],
    })
    expect(wrapper.text()).toContain('3')
    expect(wrapper.text()).toContain('照片')
    expect(wrapper.text()).toContain('今天的天空')
    expect(wrapper.text()).toContain('晨光')
  })

  it('删除照片并持久化', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [
        entry({ images: ['data:image/png;base64,AAAA', 'data:image/png;base64,BBBB'] }),
      ],
    })
    await wrapper.find('.pd-img-remove').trigger('click')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore['hf:anchor:photo_diary'][0].images.length).toBe(1)
  })
})

// ============================================================
// P1：拖拽排序 / 逐图说明 / 全屏导航 / 日期绑定
// ============================================================
describe('PhotoDiaryPanel P1', () => {
  const A = 'data:image/png;base64,AAA'
  const B = 'data:image/png;base64,BBB'
  const C = 'data:image/png;base64,CCC'

  it('拖拽缩略图可排序并持久化', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [entry({ images: [A, B, C] })],
    })
    const wraps = wrapper.findAll('.pd-img-wrap')
    expect(wraps.length).toBe(3)

    await wraps[0].trigger('dragstart')
    await wraps[2].trigger('dragover')
    await wraps[2].trigger('drop')

    expect(savedEntry().images).toEqual([B, C, A])
    // 顺序徽标随之重排
    expect(wrapper.findAll('.pd-img-order').map(n => n.text())).toEqual(['1', '2', '3'])
  })

  it('点击缩略图打开全屏并能翻页', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [entry({ images: [A, B] })],
    })
    expect(wrapper.find('.pd-viewer').exists()).toBe(false)
    await wrapper.findAll('.pd-img')[0].trigger('click')
    expect(wrapper.find('.pd-viewer').exists()).toBe(true)
    expect(wrapper.find('.pd-viewer-idx').text()).toBe('1 / 2')

    const next = wrapper.findAll('.pd-viewer-bar .pd-btn').find(b => b.text().includes('下一张'))!
    await next.trigger('click')
    expect(wrapper.find('.pd-viewer-idx').text()).toBe('2 / 2')
    expect(wrapper.find('.pd-viewer-img').attributes('src')).toBe(B)
  })

  it('全屏内写单图说明并持久化到 captions 下标位', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [entry({ images: [A, B] })],
    })
    await wrapper.findAll('.pd-img')[1].trigger('click')
    const input = wrapper.find('.pd-viewer-cap-input')
    await input.setValue('第二张的说明')
    await input.trigger('change')
    expect(savedEntry().captions).toEqual(['', '第二张的说明'])
  })

  it('全屏内可前移排序与删除当前图', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [entry({ images: [A, B, C] })],
    })
    await wrapper.findAll('.pd-img')[1].trigger('click')
    const shiftBack = wrapper.findAll('.pd-viewer-bar .pd-btn').find(b => b.text() === '前移')!
    await shiftBack.trigger('click')
    expect(savedEntry().images).toEqual([B, A, C])

    const del = wrapper.findAll('.pd-viewer-bar .pd-btn').find(b => b.text() === '删除此图')!
    await del.trigger('click')
    expect(savedEntry().images).toEqual([A, C])
  })

  it('日期绑定：展示该日心锚数并提供心锚日期快速跳转', async () => {
    const today = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`
    const wrapper = await mountPanel(
      { 'hf:anchor:photo_diary': [entry({ date: todayStr, images: [A] })] },
      { anchorDates: [todayStr, '2026-09-20', '2026-09-18'] },
    )
    expect(wrapper.text()).toContain('该日心锚')
    const chips = wrapper.findAll('.pd-date-chip')
    expect(chips.length).toBe(3)
    expect(chips[0].text()).toBe(todayStr.slice(5))

    // 今日已有 1 张 → 余量 8
    expect(wrapper.text()).toContain('8')
    expect(wrapper.text()).toContain('1 / 9 张')
  })

  it('无心锚日期时不渲染跳转 chips', async () => {
    const wrapper = await mountPanel({ 'hf:anchor:photo_diary': [entry({ images: [A] })] })
    expect(wrapper.findAll('.pd-date-chip').length).toBe(0)
    expect(wrapper.text()).toContain('该日心锚')
  })
})

// ============================================================
// P2：照片进手札（全屏「收入手札」→ emit send-to-journal）
// ============================================================
describe('PhotoDiaryPanel 照片进手札', () => {
  it('全屏点击「收入手札」触发 send-to-journal 事件', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [entry({ images: ['data:image/png;base64,AAAA', 'data:image/png;base64,BBBB'] })],
    })
    await wrapper.findAll('.pd-img')[0].trigger('click')
    const btn = wrapper.find('[data-test="pd-send-journal"]')
    expect(btn.exists()).toBe(true)
    await btn.trigger('click')
    const ev = wrapper.emitted('send-to-journal')
    expect(ev).toBeTruthy()
    expect(ev![0]).toEqual([{ date: '2026-08-20', index: 0 }])
  })
})

// ============================================================
// P2：孤儿 API 挂 UI（续11）
//  - 整条（按日）日记说明编辑 → usePhotoDiary().setEntryCaption
//  - 整日删除 → usePhotoDiary().removeEntry
// ============================================================
describe('PhotoDiaryPanel 孤儿 API 挂 UI', () => {
  function savedEntries() {
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    return saved.kvStore['hf:anchor:photo_diary']
  }

  it('编辑整条日记说明并持久化（setEntryCaption）', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [entry({ caption: '今天的天空' })],
    })
    await wrapper.find('[data-test="pd-edit-cap"]').trigger('click')
    const input = wrapper.find('[data-test="pd-cap-input"]')
    expect(input.exists()).toBe(true)
    await input.setValue('改后的整日说明')
    await wrapper.find('[data-test="pd-cap-save"]').trigger('click')
    expect(savedEntries()[0].caption).toBe('改后的整日说明')
    // 编辑态退出
    expect(wrapper.find('[data-test="pd-cap-input"]').exists()).toBe(false)
  })

  it('取消编辑整条说明不改写原值', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [entry({ caption: '原说明' })],
    })
    await wrapper.find('[data-test="pd-edit-cap"]').trigger('click')
    await wrapper.find('[data-test="pd-cap-input"]').setValue('临时改')
    await wrapper.find('[data-test="pd-cap-cancel"]').trigger('click')
    expect(savedEntries()[0].caption).toBe('原说明')
  })

  it('删除整日条目（removeEntry）', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [
        entry({ id: 'day_a', date: '2026-08-20', images: ['data:image/png;base64,AAAA'] }),
        entry({ id: 'day_b', date: '2026-08-19', images: ['data:image/png;base64,BBBB'] }),
      ],
    })
    expect(savedEntries().length).toBe(2)
    // 渲染顺序为倒序（最新在前）→ 第一条即 2026-08-20
    const delBtns = wrapper.findAll('[data-test="pd-del-day"]')
    expect(delBtns.length).toBe(2)
    await delBtns[0].trigger('click')
    const left = savedEntries()
    expect(left.length).toBe(1)
    expect(left[0].id).toBe('day_b')
  })
})

// ============================================================
// 续13：照片墙按月分组（长列表可读性）
// ============================================================
describe('PhotoDiaryPanel 照片墙按月分组', () => {
  it('跨月照片按月份分组渲染并标注年月，组内按日倒序', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [
        entry({ id: 'a', date: '2026-09-20', images: ['data:image/png;base64,AAAA'] }),
        entry({ id: 'b', date: '2026-09-05', images: ['data:image/png;base64,BBBB'] }),
        entry({ id: 'c', date: '2026-08-15', images: ['data:image/png;base64,CCCC'] }),
      ],
    })
    const months = wrapper.findAll('.pd-month')
    expect(months.length).toBe(2)
    expect(months[0].text()).toBe('2026 年 9 月')
    expect(months[1].text()).toBe('2026 年 8 月')
    const entriesEls = wrapper.findAll('.pd-entry')
    expect(entriesEls.length).toBe(3)
    // 第一条为最新（9 月 20 日）
    expect(entriesEls[0].find('.pd-entry-date').text()).toBe('2026-09-20')
  })

  it('单月照片只渲染一个月份标题', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [
        entry({ id: 'a', date: '2026-08-20', images: ['A'] }),
        entry({ id: 'b', date: '2026-08-19', images: ['B'] }),
      ],
    })
    expect(wrapper.findAll('.pd-month').length).toBe(1)
    expect(wrapper.find('.pd-month').text()).toBe('2026 年 8 月')
  })
})

// ============================================================
// 相册：模式切换（长廊 / 按月 / 收藏册）+ 收藏册（新建/归入/筛选）
// ============================================================
describe('PhotoDiaryPanel 相册（长廊 + 收藏册）', () => {
  it('模式切换到长廊渲染扁平画廊，总数=全部照片，按月标题消失', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [
        entry({ date: '2026-09-20', images: ['A', 'B'] }),
        entry({ date: '2026-08-15', images: ['C'] }),
      ],
    })
    // 默认按月
    expect(wrapper.findAll('.pd-month').length).toBe(2)
    await wrapper.find('[data-test="pd-mode-corridor"]').trigger('click')
    expect(wrapper.find('.pd-corridor').exists()).toBe(true)
    expect(wrapper.findAll('.pd-corridor-item').length).toBe(3)
    expect(wrapper.findAll('.pd-month').length).toBe(0)
    // 点击长廊项开灯箱
    await wrapper.findAll('.pd-corridor-item')[0].trigger('click')
    expect(wrapper.find('.pd-viewer').exists()).toBe(true)
  })

  it('收藏册空状态提示', async () => {
    const wrapper = await mountPanel({ 'hf:anchor:photo_diary': [entry({ images: ['A'] })] })
    await wrapper.find('[data-test="pd-mode-album"]').trigger('click')
    expect(wrapper.text()).toContain('还没有相册')
  })

  it('新建相册并归入某日，相册视图只显示该日照片', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [
        entry({ id: 'day_a', date: '2026-08-20', images: ['A'] }),
        entry({ id: 'day_b', date: '2026-08-19', images: ['B'] }),
      ],
    })
    // 进入收藏册 → 新建
    await wrapper.find('[data-test="pd-mode-album"]').trigger('click')
    await wrapper.find('[data-test="pd-new-album-input"]').setValue('旅行')
    await wrapper.find('[data-test="pd-new-album"]').trigger('click')
    // 自动选中 → 相册视图
    expect(wrapper.find('.pd-album-title').text()).toBe('旅行')
    expect(wrapper.text()).toContain('这个相册还没有照片')
    // 返回列表，卡片可见
    await wrapper.find('[data-test="pd-album-back"]').trigger('click')
    const card = wrapper.find('[data-test="pd-album-card"]')
    expect(card.exists()).toBe(true)
    expect(card.find('.pd-album-name').text()).toBe('旅行')

    // 读取随机相册 id
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    const albumId = saved.kvStore['hf:anchor:photo_albums'][0].id

    // 切到按月，把 day_a 归入相册（渲染倒序：首条为 08-20）
    await wrapper.find('[data-test="pd-mode-month"]').trigger('click')
    const selects = wrapper.findAll('[data-test="pd-album-select"]')
    await selects[0].setValue(albumId)

    // 回到收藏册，点开相册 → 仅 day_a
    await wrapper.find('[data-test="pd-mode-album"]').trigger('click')
    await wrapper.find('[data-test="pd-album-card"]').trigger('click')
    const entriesEls = wrapper.findAll('.pd-entry')
    expect(entriesEls.length).toBe(1)
    expect(entriesEls[0].find('.pd-entry-date').text()).toBe('2026-08-20')
  })

  it('相册视图全屏内「设为封面」写封面且卡片列表随之变', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [
        entry({ id: 'day_a', date: '2026-08-20', images: ['A', 'B'] }),
      ],
    })
    // 进入收藏册 → 新建相册（建完自动选中进入相册视图）
    await wrapper.find('[data-test="pd-mode-album"]').trigger('click')
    await wrapper.find('[data-test="pd-new-album-input"]').setValue('旅行')
    await wrapper.find('[data-test="pd-new-album"]').trigger('click')
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    const albumId = saved.kvStore['hf:anchor:photo_albums'][0].id

    // 返回相册列表（清除选中），以便后续从卡片进入
    await wrapper.find('[data-test="pd-album-back"]').trigger('click')
    await wrapper.vm.$nextTick()

    // 切到按月，把 day_a 归入相册
    await wrapper.find('[data-test="pd-mode-month"]').trigger('click')
    const selects = wrapper.findAll('[data-test="pd-album-select"]')
    await selects[0].setValue(albumId)
    await wrapper.vm.$nextTick()

    // 回到收藏册列表 → 点开卡片
    await wrapper.find('[data-test="pd-mode-album"]').trigger('click')
    await wrapper.find('[data-test="pd-album-card"]').trigger('click')
    await wrapper.vm.$nextTick()

    // 点开第 2 张（index 1）灯箱 → 设为封面
    const imgs = wrapper.findAll('.pd-grid .pd-img')
    expect(imgs.length).toBe(2)
    await imgs[1].trigger('click')
    await wrapper.vm.$nextTick()
    const setBtn = wrapper.find('[data-test="pd-set-cover"]')
    expect(setBtn.exists()).toBe(true)
    await setBtn.trigger('click')
    await wrapper.vm.$nextTick()

    // 封面写入相册（date + index）
    const saved2 = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    const album = saved2.kvStore['hf:anchor:photo_albums'][0]
    expect(album.coverDate).toBe('2026-08-20')
    expect(album.coverIndex).toBe(1)
    // 当前封面按钮出现
    expect(wrapper.find('[data-test="pd-clear-cover"]').exists()).toBe(true)

    // 关闭灯箱，返回列表，卡片封面应反映自定义封面（index 1 = B）
    await wrapper.findAll('.pd-viewer-bar .pd-btn').find(b => b.text() === '关闭')!.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.find('[data-test="pd-album-back"]').trigger('click')
    await wrapper.vm.$nextTick()
    const cardImg = wrapper.find('[data-test="pd-album-card"] .pd-album-cover .pd-img')
    // PhotoTile 根为 <figure>，src 落在其内部 <img> 上，故查内层 img
    expect(cardImg.find('img').attributes('src')).toBe('B')
  })
})

// ============================================================
// 日历视图：连续记录 / 月历网格 / 近一年热力 / 那年今日
// （对标 Day One 日历+streak、一本日记 日历热力）
// ============================================================
describe('PhotoDiaryPanel 日历视图', () => {
  const A = 'data:image/png;base64,AAA'
  const B = 'data:image/png;base64,BBB'
  const pad = (n: number) => String(n).padStart(2, '0')
  const now = new Date()
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const thisMonthLabel = `${now.getFullYear()} 年 ${now.getMonth() + 1} 月`

  it('切到日历渲染连续统计、月历与热力网格', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [entry({ id: 'today', date: todayStr, images: [A, B] })],
    })
    expect(wrapper.find('[data-test="pd-calendar"]').exists()).toBe(false)

    await wrapper.find('[data-test="pd-mode-calendar"]').trigger('click')
    expect(wrapper.find('[data-test="pd-calendar"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="pd-cal-title"]').text()).toBe(thisMonthLabel)

    // 连续统计：今日 1 张 → 当前连续 1 天
    expect(wrapper.find('[data-test="pd-streak-current"]').text()).toBe('1')

    // 月历补齐整周；今日格显示张数徽标
    expect(wrapper.findAll('.pd-cal-cell').length % 7).toBe(0)
    const cell = wrapper.find(`[data-test="pd-cal-cell-${todayStr}"]`)
    expect(cell.exists()).toBe(true)
    expect(cell.find('.pd-cal-count').text()).toBe('2')

    // 热力：53 列 × 7 格
    expect(wrapper.findAll('.pd-heat-grid .pd-heat-col').length).toBe(53)
    expect(wrapper.findAll('.pd-heat-grid .pd-heat-cell').length).toBe(53 * 7)
  })

  it('点有照片的日期打开全屏查看', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [entry({ date: todayStr, images: [A, B] })],
    })
    await wrapper.find('[data-test="pd-mode-calendar"]').trigger('click')
    await wrapper.find(`[data-test="pd-cal-cell-${todayStr}"]`).trigger('click')
    expect(wrapper.find('.pd-viewer').exists()).toBe(true)
    expect(wrapper.find('.pd-viewer-idx').text()).toBe('1 / 2')
  })

  it('月份可前后切换并可回到本月', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [entry({ date: todayStr, images: [A] })],
    })
    await wrapper.find('[data-test="pd-mode-calendar"]').trigger('click')

    await wrapper.find('[data-test="pd-cal-prev"]').trigger('click')
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    expect(wrapper.find('[data-test="pd-cal-title"]').text()).toBe(
      `${prev.getFullYear()} 年 ${prev.getMonth() + 1} 月`,
    )

    await wrapper.find('[data-test="pd-cal-today"]').trigger('click')
    expect(wrapper.find('[data-test="pd-cal-title"]').text()).toBe(thisMonthLabel)
  })

  it('往年同月同日渲染「那年今日」卡片', async () => {
    const lastYear = `${now.getFullYear() - 1}-${todayStr.slice(5)}`
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [
        entry({ id: 'old', date: lastYear, images: [A], caption: '去年的今天' }),
        entry({ id: 'today', date: todayStr, images: [B] }),
      ],
    })
    await wrapper.find('[data-test="pd-mode-calendar"]').trigger('click')
    const otd = wrapper.find('[data-test="pd-otd"]')
    expect(otd.exists()).toBe(true)
    expect(otd.text()).toContain('1 年前')
    expect(otd.text()).toContain('去年的今天')
  })
})

// ============================================================
describe('PhotoDiaryPanel 地图视图', () => {
  const A = 'data:image/png;base64,AAA'
  const B = 'data:image/png;base64,BBB'
  const D = '2026-10-01'

  const place = (over: Record<string, any> = {}) => ({
    id: 'pl1',
    name: '西湖',
    city: '杭州',
    type: 'travel',
    note: '',
    visitCount: 1,
    at: D,
    lng: 120.15,
    lat: 30.25,
    ...over,
  })

  it('照片日期匹配地点到访日期 → 渲染地球落点与统计', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [entry({ id: 'p1', date: D, images: [A, B] })],
      'hf:map_places_v2': [place()],
    })
    expect(wrapper.find('[data-test="pd-map"]').exists()).toBe(false)

    await wrapper.find('[data-test="pd-mode-map"]').trigger('click')
    expect(wrapper.find('[data-test="pd-map"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="pd-map-place-count"]').text()).toBe('1')
    expect(wrapper.find('[data-test="pgb"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="pgb-pin-pl1"]').exists()).toBe(true)
  })

  it('点落点展开当日照片，点缩略图打开灯箱', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [entry({ id: 'p1', date: D, images: [A, B] })],
      'hf:map_places_v2': [place()],
    })
    await wrapper.find('[data-test="pd-mode-map"]').trigger('click')
    expect(wrapper.find('[data-test="pd-map-detail"]').exists()).toBe(false)

    await wrapper.find('[data-test="pgb-pin-pl1"]').trigger('click')
    const detail = wrapper.find('[data-test="pd-map-detail"]')
    expect(detail.exists()).toBe(true)
    expect(detail.text()).toContain('西湖')
    expect(detail.text()).toContain('2 张')

    await wrapper.find('.pd-map-thumb').trigger('click')
    expect(wrapper.find('.pd-viewer').exists()).toBe(true)
  })

  it('无地点数据 → 地图空态引导', async () => {
    const wrapper = await mountPanel({
      'hf:anchor:photo_diary': [entry({ id: 'p1', date: D, images: [A] })],
    })
    await wrapper.find('[data-test="pd-mode-map"]').trigger('click')
    expect(wrapper.find('[data-test="pd-map-empty"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="pd-map-place-count"]').text()).toBe('0')
    expect(wrapper.find('[data-test="pgb"]').exists()).toBe(false)
  })
})
