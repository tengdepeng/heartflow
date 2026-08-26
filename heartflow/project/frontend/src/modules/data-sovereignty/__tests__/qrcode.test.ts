import { describe, it, expect } from 'vitest'
import { qrToSvg } from '../qrcode'

describe('qrToSvg', () => {
  it('空字符串返回空（组件据此隐藏二维码）', () => {
    expect(qrToSvg('')).toBe('')
  })

  it('生成合法 SVG：含静区白底 + 黑模块', () => {
    const svg = qrToSvg('heartflow-continuity:TOKEN-ABC123')
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toContain('<rect')
    expect(svg).toContain('fill="#ffffff"')
    expect(svg).toContain('fill="#000000"')
    expect(svg).toContain('role="img"')
  })

  it('不同输入产生不同输出', () => {
    const a = qrToSvg('TOKEN-AAAAA')
    const b = qrToSvg('TOKEN-BBBBB')
    expect(a).not.toBe(b)
  })

  it('含中文设备名不抛错（UTF-8 编码）', () => {
    const payload = JSON.stringify({ type: 'heartflow-continuity', token: 'ABC123', device: '滕的电脑' })
    expect(() => qrToSvg(payload)).not.toThrow()
    expect(qrToSvg(payload)).toContain('<svg')
  })

  it('固定输入输出稳定（确定性，便于快照）', () => {
    const a = qrToSvg('stable-input-xyz')
    const b = qrToSvg('stable-input-xyz')
    expect(a).toBe(b)
  })
})
