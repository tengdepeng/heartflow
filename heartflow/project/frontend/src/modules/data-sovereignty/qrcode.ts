import qrcode from 'qrcode-generator'

// 启用 UTF-8 字节编码，确保设备名（可能含中文）正确写入二维码，
// 避免库默认的 ASCII 字节函数对非 ASCII 字符产生乱码。
if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) {
  qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8']
}

/**
 * 将文本编码为可扫码的 SVG 二维码字符串（纯受控数据，无外部 HTML 注入风险）。
 * - type 0 = 自动选择最小版本；'M' = 中等纠错（扫码容错好）；
 * - 含 2 模块静区（QR 规范要求，提升识别率）；白底黑模块。
 */
export function qrToSvg(text: string, size = 168): string {
  if (!text) return ''
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const count = qr.getModuleCount()
  const margin = 2
  const total = count + margin * 2
  const cell = Math.max(1, Math.floor(size / total))
  const dim = cell * total
  let rects = ''
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (qr.isDark(r, c)) {
        rects += `<rect x="${(c + margin) * cell}" y="${(r + margin) * cell}" width="${cell}" height="${cell}"/>`
      }
    }
  }
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}"` +
    ` shape-rendering="crispEdges" role="img" aria-label="二维码">` +
    `<rect width="${dim}" height="${dim}" fill="#ffffff"/>` +
    `<g fill="#000000">${rects}</g></svg>`
  )
}
