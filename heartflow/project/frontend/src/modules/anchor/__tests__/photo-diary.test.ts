// ============================================================
// 逐日心锚 · 图片日记 单元测试
// ============================================================
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockStorage } from '../../../engine/storage/__tests__/test-utils'
import { invalidateCache } from '../../../engine/storage/core'

function setup(kvStore: Record<string, any> = {}) {
  vi.resetModules()
  const mock = createMockStorage()
  mock.setItem('heartflow:storage', JSON.stringify({ version: 10, kvStore, sessions: [], crystals: [] }))
  ;(globalThis as any).localStorage = mock
  invalidateCache()
  return mock
}

async function loadModule() {
  return await import('../photo-diary')
}

const IMG = 'data:image/jpeg;base64,AAAA'
const THUMB = 'data:image/jpeg;base64,BB'

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('photo-diary 数据层', () => {
  it('新增图片时缩略图与展示图同序保存', async () => {
    setup()
    const { usePhotoDiary, PHOTO_DIARY_KEY } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    const e = d.addImages('2026-09-26', [IMG, IMG], '两图', [THUMB, THUMB])
    expect(e).not.toBeNull()
    expect(e!.images.length).toBe(2)
    expect(e!.thumbs!.length).toBe(2)
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore[PHOTO_DIARY_KEY][0].thumbs.length).toBe(2)
  })

  it('删除图片时缩略图同步删除', async () => {
    setup()
    const { usePhotoDiary } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    d.addImages('2026-09-26', [IMG, IMG, IMG], undefined, [THUMB, THUMB, THUMB])
    d.removeImage('2026-09-26', 1)
    const e = d.getByDate('2026-09-26')
    expect(e!.images.length).toBe(2)
    expect(e!.thumbs!.length).toBe(2)
  })

  it('同一日期追加图片会合并', async () => {
    setup()
    const { usePhotoDiary } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    d.addImages('2026-09-26', [IMG], undefined, [THUMB])
    d.addImages('2026-09-26', [IMG], '追加', [THUMB])
    expect(d.getByDate('2026-09-26')!.images.length).toBe(2)
    expect(d.getByDate('2026-09-26')!.caption).toBe('追加')
  })

  it('导出后可导入且按 id 去重', async () => {
    setup()
    const { usePhotoDiary } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    d.addImages('2026-09-26', [IMG], '备份', [THUMB])
    const json = d.exportJson()

    // 新环境导入
    setup()
    const m2 = await loadModule()
    const d2 = m2.usePhotoDiary()
    d2.load()
    const r = d2.importJson(json)
    expect(r.added).toBe(1)
    expect(d2.getByDate('2026-09-26')!.caption).toBe('备份')

    // 再导入同一份 → 去重，不新增
    const r2 = d2.importJson(json)
    expect(r2.added).toBe(0)
  })

  it('容量不足时明确报错而非静默丢数据', async () => {
    // 主库已有 ~4.3MB 其它数据 → 超过软上限
    setup({ pad: 'x'.repeat(4_300_000) })
    const { usePhotoDiary, photoDiaryError } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    const e = d.addImages('2026-09-26', [IMG], '超限', [THUMB])
    expect(e).toBeNull()
    expect(photoDiaryError.value).toContain('空间不足')
  })

  it('导入非法 JSON 返回错误', async () => {
    setup()
    const { usePhotoDiary } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    const r = d.importJson('{ not json')
    expect(r.added).toBe(0)
    expect(r.error).toBeTruthy()
  })
})

// ============================================================
// P1：单日上限 / 排序 / 逐图说明 / 归一化
// ============================================================
describe('photo-diary P1', () => {
  function imgs(n: number, tag = 'I') {
    return Array.from({ length: n }, (_, i) => `data:image/jpeg;base64,${tag}${i}`)
  }

  it('单日超过 9 张被截断，并给出非阻断提示', async () => {
    setup()
    const { usePhotoDiary, photoDiaryNotice, photoDiaryError, PHOTO_MAX_PER_ENTRY } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    expect(PHOTO_MAX_PER_ENTRY).toBe(9)
    const e = d.addImages('2026-09-26', imgs(12), undefined, imgs(12, 'T'))
    expect(e).not.toBeNull()
    expect(e!.images.length).toBe(9)
    expect(e!.thumbs.length).toBe(9)
    expect(photoDiaryNotice.value).toContain('9')
    expect(photoDiaryNotice.value).toContain('仅写入前 9 张')
    expect(photoDiaryError.value).toBeNull()
  })

  it('单日已满 9 张时再添加直接报错且不写入', async () => {
    setup()
    const { usePhotoDiary, photoDiaryError } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    d.addImages('2026-09-26', imgs(9), undefined, imgs(9, 'T'))
    const before = Math.max(0, d.remainingSlots('2026-09-26'))
    expect(before).toBe(0)
    const e = d.addImages('2026-09-26', imgs(1), undefined, imgs(1, 'X'))
    expect(e).toBeNull()
    expect(photoDiaryError.value).toContain('单日最多 9 张')
    expect(d.getByDate('2026-09-26')!.images.length).toBe(9)
  })

  it('跨日追加时按当日剩余额度截断', async () => {
    setup()
    const { usePhotoDiary, photoDiaryNotice } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    d.addImages('2026-09-26', imgs(7), undefined, imgs(7, 'T'))
    expect(d.remainingSlots('2026-09-26')).toBe(2)
    const e = d.addImages('2026-09-26', imgs(5), undefined, imgs(5, 'U'))
    expect(e!.images.length).toBe(9)
    expect(photoDiaryNotice.value).toContain('仅写入前 2 张')
  })

  it('moveImage 同步搬移 images / thumbs / captions', async () => {
    setup()
    const { usePhotoDiary } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    const images = imgs(3, 'A')
    const thumbs = imgs(3, 'T')
    d.addImages('2026-09-26', images, undefined, thumbs, ['第一', '第二', '第三'])
    const e0 = d.getByDate('2026-09-26')!
    expect(e0.captions).toEqual(['第一', '第二', '第三'])

    // 0 → 2：整体左移，原首项落到末尾
    expect(d.moveImage('2026-09-26', 0, 2)).toBe(true)
    const e = d.getByDate('2026-09-26')!
    expect(e.images).toEqual([images[1], images[2], images[0]])
    expect(e.thumbs).toEqual([thumbs[1], thumbs[2], thumbs[0]])
    expect(e.captions).toEqual(['第二', '第三', '第一'])

    // 越界 / 原地不动 → false 且不变
    expect(d.moveImage('2026-09-26', 0, 0)).toBe(false)
    expect(d.moveImage('2026-09-26', 0, 9)).toBe(false)
    expect(d.moveImage('2099-01-01', 0, 1)).toBe(false)
    expect(d.getByDate('2026-09-26')!.images).toEqual([images[1], images[2], images[0]])
  })

  it('setImageCaption 按下标写入并持久化', async () => {
    setup()
    const { usePhotoDiary, PHOTO_DIARY_KEY } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    d.addImages('2026-09-26', imgs(2), undefined, imgs(2, 'T'))
    expect(d.setImageCaption('2026-09-26', 1, '  海边的云  ')).toBe(true)
    expect(d.setImageCaption('2026-09-26', 5, '越界')).toBe(false)
    const e = d.getByDate('2026-09-26')!
    expect(e.captions).toEqual(['', '海边的云'])
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore[PHOTO_DIARY_KEY][0].captions).toEqual(['', '海边的云'])
  })

  it('load 归一化老数据：补齐 thumbs / captions、截断超 9 张', async () => {
    setup({
      'hf:anchor:photo_diary': [
        // 老数据：无 thumbs / captions，且多于 9 张
        { id: 'legacy', date: '2026-01-02', images: imgs(11, 'L'), createdAt: '2026-01-02T00:00:00.000Z' },
      ],
    })
    const { usePhotoDiary } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    const e = d.getByDate('2026-01-02')!
    expect(e.images.length).toBe(9)
    expect(e.thumbs.length).toBe(9)
    expect(e.captions.length).toBe(9)
    expect(e.thumbs.every(t => t === '')).toBe(true)
    expect(e.id).toBe('legacy')
  })

  it('removeImage 同步移除说明，删空则整条消失', async () => {
    setup()
    const { usePhotoDiary } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    d.addImages('2026-09-26', imgs(2), undefined, imgs(2, 'T'), ['甲', '乙'])
    d.removeImage('2026-09-26', 0)
    expect(d.getByDate('2026-09-26')!.captions).toEqual(['乙'])
    d.removeImage('2026-09-26', 0)
    expect(d.getByDate('2026-09-26')).toBeUndefined()
    expect(d.entries.value.length).toBe(0)
  })

  it('importJson 归一化条目并跳过同日冲突', async () => {
    setup()
    const { usePhotoDiary } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    d.addImages('2026-09-26', imgs(1), '本地已有', imgs(1, 'T'))

    const backup = JSON.stringify({
      entries: [
        { id: 'x1', date: '2026-09-26', images: imgs(2, 'B'), caption: '同日冲突' },
        { id: 'x2', date: '2026-09-20', images: imgs(12, 'C') },
      ],
    })
    const r = d.importJson(backup)
    expect(r.added).toBe(1)
    const imported = d.getByDate('2026-09-20')!
    expect(imported.images.length).toBe(9)
    expect(imported.captions.length).toBe(9)
    // 同日既有条目未被顶掉
    expect(d.getByDate('2026-09-26')!.caption).toBe('本地已有')
  })

  it('setEntryCaption 支持设置与清空', async () => {
    setup()
    const { usePhotoDiary } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    d.addImages('2026-09-26', imgs(1), undefined, imgs(1, 'T'))
    expect(d.setEntryCaption('2026-09-26', '整条说明')).toBe(true)
    expect(d.getByDate('2026-09-26')!.caption).toBe('整条说明')
    d.setEntryCaption('2026-09-26', '   ')
    expect(d.getByDate('2026-09-26')!.caption).toBeUndefined()
    expect(d.setEntryCaption('2099-01-01', 'x')).toBe(false)
  })
})

// ============================================================
// 收藏册（相册）数据层
// ============================================================
describe('photo-diary 收藏册（相册）', () => {
  it('新建相册并持久化', async () => {
    setup()
    const { usePhotoDiary, PHOTO_ALBUMS_KEY } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    const a = d.addAlbum('旅行')
    expect(a).not.toBeNull()
    expect(a!.name).toBe('旅行')
    expect(d.albums.value.length).toBe(1)
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore[PHOTO_ALBUMS_KEY][0].name).toBe('旅行')
  })

  it('空名不建相册', async () => {
    setup()
    const { usePhotoDiary } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    expect(d.addAlbum('   ')).toBeNull()
    expect(d.albums.value.length).toBe(0)
  })

  it('改名与删除', async () => {
    setup()
    const { usePhotoDiary } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    const a = d.addAlbum('旅行')!
    expect(d.renameAlbum(a.id, '远方')).toBe(true)
    expect(d.getAlbum(a.id)!.name).toBe('远方')
    expect(d.renameAlbum('nope', 'x')).toBe(false)
    expect(d.removeAlbum(a.id)).toBe(true)
    expect(d.albums.value.length).toBe(0)
  })

  it('把某日照片归入相册，并随删除相册解除归属（避免孤儿）', async () => {
    setup()
    const { usePhotoDiary, PHOTO_DIARY_KEY } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    d.addImages('2026-09-26', ['data:image/jpeg;base64,I1'], undefined, ['data:image/jpeg;base64,T1'])
    const a = d.addAlbum('旅行')!
    expect(d.setEntryAlbum('2026-09-26', a.id)).toBe(true)
    expect(d.getByDate('2026-09-26')!.albumId).toBe(a.id)
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore[PHOTO_DIARY_KEY][0].albumId).toBe(a.id)
    // 取消归类
    expect(d.setEntryAlbum('2026-09-26', null)).toBe(true)
    expect(d.getByDate('2026-09-26')!.albumId).toBeUndefined()
    // 删除相册清除归属
    d.setEntryAlbum('2026-09-26', a.id)
    expect(d.removeAlbum(a.id)).toBe(true)
    expect(d.getByDate('2026-09-26')!.albumId).toBeUndefined()
  })

  it('load 兼容无 albumId 老数据与独立相册存储', async () => {
    setup({
      'hf:anchor:photo_diary': [{ id: 'legacy', date: '2026-01-02', images: ['data:image/jpeg;base64,L1'], createdAt: '2026-01-02T00:00:00.000Z' }],
      'hf:anchor:photo_albums': [{ id: 'al_x', name: '旧相册', createdAt: '2026-01-01T00:00:00.000Z' }],
    })
    const { usePhotoDiary } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    expect(d.getByDate('2026-01-02')!.albumId).toBeUndefined()
    expect(d.albums.value.length).toBe(1)
    expect(d.getAlbum('al_x')!.name).toBe('旧相册')
  })

  it('setAlbumCover 设置与清除封面并持久化', async () => {
    setup()
    const { usePhotoDiary, PHOTO_ALBUMS_KEY } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    d.addImages('2026-09-26', ['data:image/jpeg;base64,I1', 'data:image/jpeg;base64,I2'], undefined, ['data:image/jpeg;base64,T1', 'data:image/jpeg;base64,T2'])
    const a = d.addAlbum('旅行')!
    // 指定第 2 张（index 1）为封面
    expect(d.setAlbumCover(a.id, '2026-09-26', 1)).toBe(true)
    expect(d.getAlbum(a.id)!.coverDate).toBe('2026-09-26')
    expect(d.getAlbum(a.id)!.coverIndex).toBe(1)
    const saved = JSON.parse((globalThis as any).localStorage.getItem('heartflow:storage'))
    expect(saved.kvStore[PHOTO_ALBUMS_KEY][0].coverDate).toBe('2026-09-26')
    expect(saved.kvStore[PHOTO_ALBUMS_KEY][0].coverIndex).toBe(1)
    // 清除封面
    expect(d.setAlbumCover(a.id, null, null)).toBe(true)
    expect(d.getAlbum(a.id)!.coverDate).toBeNull()
    expect(d.getAlbum(a.id)!.coverIndex).toBeNull()
  })

  it('setAlbumCover 对不存在的相册返回 false', async () => {
    setup()
    const { usePhotoDiary } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    expect(d.setAlbumCover('no-such', '2026-09-26', 0)).toBe(false)
  })

  it('setAlbumCover 自动首图回退：清除后仍可用首张', async () => {
    setup()
    const { usePhotoDiary } = await loadModule()
    const d = usePhotoDiary()
    d.load()
    d.addImages('2026-09-26', ['data:image/jpeg;base64,I1'], undefined, ['data:image/jpeg;base64,T1'])
    const a = d.addAlbum('旅行')!
    d.setEntryAlbum('2026-09-26', a.id)
    expect(d.setAlbumCover(a.id, '2026-09-26', 0)).toBe(true)
    expect(d.setAlbumCover(a.id, null, null)).toBe(true)
    // 清除后封面应回退到该相册首张（由 UI 计算，数据层仅清标记）
    expect(d.getAlbum(a.id)!.coverDate).toBeNull()
  })
})
