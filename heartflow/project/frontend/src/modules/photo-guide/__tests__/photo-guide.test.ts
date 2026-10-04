// ============================================================
// 藏象阁 · AI 拍照引导取景（INCR-506）测试
// 覆盖：场景预设 / sceneById 回落 / 画质统计（亮度·清晰度·主体占比）/
//       取景质量评估分级 / 历史元数据持久化与清空
// 键 hf:photo_captures，仅存元数据，本地私有、不触云。
// ============================================================
import { describe, expect, it, beforeEach } from 'vitest'
import {
  usePhotoGuide,
  reloadPhotoGuide,
  sceneById,
  analyzeImageData,
  evaluateCapture,
  CAPTURE_SCENES,
} from '../photo-guide'
import { storage } from '../../../engine/storage'

const KEY = 'hf:photo_captures'

/** 生成 width×height 的 RGBA 数组，fill(x,y) 返回 [r,g,b] */
function makeImage(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number],
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = fill(x, y)
      const i = (y * width + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = 255
    }
  }
  return data
}

describe('photo-guide · AI 拍照引导取景', () => {
  beforeEach(() => {
    storage.setKV(KEY, '')
    reloadPhotoGuide()
  })

  it('提供舌诊/面诊/脉诊三类场景且各含分步与要点', () => {
    expect(CAPTURE_SCENES).toHaveLength(3)
    expect(CAPTURE_SCENES.map((s) => s.id)).toEqual(['tongue', 'face', 'pulse'])
    CAPTURE_SCENES.forEach((s) => {
      expect(s.steps.length).toBeGreaterThanOrEqual(3)
      expect(s.tips.length).toBeGreaterThanOrEqual(2)
    })
  })

  it('sceneById 未知 id 回落首个场景', () => {
    expect(sceneById('nope').id).toBe('tongue')
    expect(sceneById('pulse').id).toBe('pulse')
  })

  it('纯色画面：亮度等于灰度、清晰度为 0、主体占比为 0', () => {
    const data = makeImage(40, 40, () => [128, 128, 128])
    const m = analyzeImageData(data, 40, 40)
    expect(Math.round(m.brightness)).toBe(128)
    expect(m.sharpness).toBe(0)
    expect(m.coverage).toBe(0)
  })

  it('高对比棋盘：清晰度拉满', () => {
    const data = makeImage(40, 40, (x, y) => ((x + y) % 2 === 0 ? [0, 0, 0] : [255, 255, 255]))
    const m = analyzeImageData(data, 40, 40)
    expect(m.sharpness).toBeGreaterThan(90)
  })

  it('中心暗块：主体占比约为中心面积比', () => {
    const data = makeImage(40, 40, (x, y) =>
      x >= 10 && x < 30 && y >= 10 && y < 30 ? [40, 40, 40] : [200, 200, 200],
    )
    const m = analyzeImageData(data, 40, 40)
    expect(m.coverage).toBeGreaterThan(0.2)
    expect(m.coverage).toBeLessThan(0.3)
  })

  it('尺寸非法时返回零指标', () => {
    expect(analyzeImageData(new Uint8ClampedArray(4), 0, 0)).toEqual({
      brightness: 0,
      sharpness: 0,
      coverage: 0,
    })
  })

  it('评估：理想画质评为 good 且无问题项', () => {
    const e = evaluateCapture({ brightness: 130, sharpness: 70, coverage: 0.6 })
    expect(e.level).toBe('good')
    expect(e.issues).toHaveLength(0)
    expect(e.score).toBe(100)
  })

  it('评估：偏暗+模糊+主体小评为 poor 并给出对应提示', () => {
    const e = evaluateCapture({ brightness: 40, sharpness: 10, coverage: 0.1 })
    expect(e.level).toBe('poor')
    expect(e.score).toBeLessThan(55)
    expect(e.issues).toContain('画面偏暗')
    expect(e.issues).toContain('画面偏模糊')
    expect(e.issues).toContain('主体占比偏小')
    expect(e.tips.length).toBeGreaterThanOrEqual(3)
  })

  it('submitMetrics 出评估并写入历史，重载仍可读回', () => {
    const { submitMetrics, records } = usePhotoGuide()
    const e = submitMetrics({ brightness: 130, sharpness: 70, coverage: 0.6 })
    expect(e.level).toBe('good')
    expect(records.value).toHaveLength(1)
    expect(records.value[0].sceneId).toBe('tongue')
    expect(records.value[0].score).toBe(100)

    reloadPhotoGuide()
    const { records: again } = usePhotoGuide()
    expect(again.value).toHaveLength(1)
    expect(again.value[0].level).toBe('good')
  })

  it('clearHistory 清空历史', () => {
    const { submitMetrics, clearHistory, records } = usePhotoGuide()
    submitMetrics({ brightness: 130, sharpness: 70, coverage: 0.6 })
    clearHistory()
    expect(records.value).toHaveLength(0)
    expect(storage.getKV(KEY, null)).toEqual([])
  })

  it('脏历史数据被过滤与归一', () => {
    storage.setKV(KEY, [
      { id: 'a', sceneId: 'pulse', at: '2026-01-01T00:00:00.000Z', score: 88, level: 'good' },
      { id: 5, sceneId: 'x' },
      null,
    ])
    reloadPhotoGuide()
    const { records } = usePhotoGuide()
    expect(records.value).toHaveLength(1)
    expect(records.value[0].sceneId).toBe('pulse')
  })
})
