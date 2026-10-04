// ============================================================
// 逐日心锚 · 图片日记 · 日历/连续/热力分析 单元测试（纯函数）
// ============================================================
import { describe, it, expect } from 'vitest'
import {
  computePhotoStreak,
  buildPhotoMonthGrid,
  buildPhotoHeatmap,
  heatmapMonthLabels,
  findPhotosOnThisDay,
} from '../photo-diary-analytics'
import type { PhotoEntry } from '../photo-diary'

function e(date: string, images: string[] = ['img']): PhotoEntry {
  return {
    id: `pd_${date}_${images.length}`,
    date,
    images,
    thumbs: images.map(() => ''),
    captions: images.map(() => ''),
    createdAt: `${date}T08:00:00.000Z`,
  }
}

const TODAY = '2026-10-04' // 2026-10-04 为周日

describe('computePhotoStreak 连续记录', () => {
  it('空数据全为 0', () => {
    const s = computePhotoStreak([], TODAY)
    expect(s).toEqual({ current: 0, best: 0, bestEndDate: null, totalDays: 0, lastDate: null })
  })

  it('今日起连续 3 天', () => {
    const s = computePhotoStreak([e('2026-10-02'), e('2026-10-03'), e('2026-10-04')], TODAY)
    expect(s.current).toBe(3)
    expect(s.best).toBe(3)
    expect(s.bestEndDate).toBe('2026-10-04')
    expect(s.totalDays).toBe(3)
    expect(s.lastDate).toBe('2026-10-04')
  })

  it('今日未记但昨日有记录 → 从昨日起算，不断连', () => {
    const s = computePhotoStreak([e('2026-10-02'), e('2026-10-03')], TODAY)
    expect(s.current).toBe(2)
    expect(s.best).toBe(2)
  })

  it('中间断档 → 当前为 0，最长取历史最长', () => {
    const s = computePhotoStreak([e('2026-09-29'), e('2026-10-01'), e('2026-10-02')], TODAY)
    expect(s.current).toBe(0)
    expect(s.best).toBe(2)
    expect(s.bestEndDate).toBe('2026-10-02')
  })

  it('末次记录为昨日 → 今日未记仍计入当前连续', () => {
    const s = computePhotoStreak(
      [e('2026-09-29'), e('2026-10-01'), e('2026-10-02'), e('2026-10-03')],
      TODAY,
    )
    expect(s.current).toBe(3)
    expect(s.best).toBe(3)
  })

  it('忽略无图片的日期', () => {
    const s = computePhotoStreak([e('2026-10-04', []), e('2026-10-03')], TODAY)
    expect(s.totalDays).toBe(1)
    expect(s.current).toBe(1)
  })
})

describe('buildPhotoMonthGrid 月历网格', () => {
  it('按目标月构建、补齐整周、标注今日与张数', () => {
    const grid = buildPhotoMonthGrid([e('2026-10-04', ['a', 'b'])], 2026, 9, TODAY)
    expect(grid.label).toBe('2026 年 10 月')
    expect(grid.cells.length % 7).toBe(0)
    const cell = grid.cells.find(c => c.date === TODAY)!
    expect(cell.day).toBe(4)
    expect(cell.count).toBe(2)
    expect(cell.thumb).toBe('a')
    expect(cell.isCurrentMonth).toBe(true)
    expect(cell.isToday).toBe(true)
    // 首尾补白为相邻月
    expect(grid.cells[0].isCurrentMonth).toBe(false)
  })

  it('无照片的日期 count 为 0 且 thumb 为 null', () => {
    const grid = buildPhotoMonthGrid([], 2026, 9, TODAY)
    const cell = grid.cells.find(c => c.date === '2026-10-15')!
    expect(cell.count).toBe(0)
    expect(cell.thumb).toBeNull()
  })
})

describe('buildPhotoHeatmap 近一年热力', () => {
  it('列=周、每列 7 格，末列含今日，未来格标记 future', () => {
    const weeks = buildPhotoHeatmap([e('2026-10-04', ['a', 'b'])], TODAY, 4)
    expect(weeks.length).toBe(4)
    expect(weeks.every(w => w.cells.length === 7)).toBe(true)

    const flat = weeks.flatMap(w => w.cells)
    expect(flat.length).toBe(28)
    expect(flat[0].date).toBe('2026-09-13')
    expect(flat[flat.length - 1].date).toBe('2026-10-10')

    const todayCell = flat.find(c => c.date === TODAY)!
    expect(todayCell.count).toBe(2)
    expect(todayCell.level).toBe(4)
    expect(todayCell.future).toBe(false)
    expect(flat.find(c => c.date === '2026-10-05')!.future).toBe(true)
  })

  it('默认 53 列', () => {
    expect(buildPhotoHeatmap([], TODAY).length).toBe(53)
  })

  it('月份刻度每月首现列打点且不重复', () => {
    const labels = heatmapMonthLabels(buildPhotoHeatmap([], TODAY, 4))
    expect(labels).toEqual([
      { week: 0, label: '9月' },
      { week: 3, label: '10月' },
    ])
  })
})

describe('findPhotosOnThisDay 那年今日', () => {
  it('仅取往年同月同日、有图条目，按年数升序', () => {
    const list = findPhotosOnThisDay(
      [
        e('2024-10-04', ['a']),
        e('2025-10-04', ['b']),
        e('2026-10-04', ['c']), // 今年，排除
        e('2024-10-05', ['d']), // 异日，排除
        e('2024-09-04', ['f']), // 异月，排除
        e('2023-10-04', []), // 无图，排除
      ],
      TODAY,
    )
    expect(list.map(i => i.date)).toEqual(['2025-10-04', '2024-10-04'])
    expect(list.map(i => i.yearsAgo)).toEqual([1, 2])
  })

  it('无往年记录返回空数组', () => {
    expect(findPhotosOnThisDay([e('2026-10-04')], TODAY)).toEqual([])
  })
})
