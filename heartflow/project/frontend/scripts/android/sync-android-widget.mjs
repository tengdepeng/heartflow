#!/usr/bin/env node
// ============================================================
// Android 小组件规范源 → gen/android 幂等同步
// 源  ：src-tauri/android-widget/   （受版本控制，唯一真源）
// 目标：src-tauri/gen/android/app/src/main/（tauri android 生成，不入库）
// 作用：复制 kt / 布局 / 描边 / widget 元数据，并按类名幂等补丁
//       AndroidManifest 的 9 个 AppWidgetProvider receiver。
//       注：kotlin 全部动态复制（含 HeartflowWidgetBridge.kt / HeartflowWidgetsPlugin.kt），
//       无需手维护清单——这两份曾靠手工拷贝进 gen，陈旧带 bug 直接炸安卓构建。
// 用法：node scripts/android/sync-android-widget.mjs [--dry]
// 说明：gen/android 不存在时默认不创建骨架（请先跑 tauri android），
//       避免污染生成目录；--dry 仅枚举计划、不写盘。
// 注意：放 scripts/android/ 子目录而非 scripts/ 一层——后者不进 git，
//       曾导致本脚本丢失，规范源无法部署。
// ============================================================

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(here, '..', '..', '..')
const SRC = path.join(projectRoot, 'src-tauri', 'android-widget')
const DEST = path.join(projectRoot, 'src-tauri', 'gen', 'android', 'app', 'src', 'main')
const dry = process.argv.includes('--dry')

const LAYOUTS = [
  'widget_heartflow', 'widget_anchors', 'widget_countdown', 'widget_focus',
  'widget_calendar', 'widget_emotion', 'widget_note', 'widget_quadrant',
  'widget_heatmap',
]
const DRAWABLES = ['widget_bg', 'widget_today_bg']

/** Provider 类名 → widget 元数据 → 桌面显示名 */
const RECEIVERS = [
  ['HeartflowWidgetProvider', 'widget_heartflow_info', '心流 · 一言'],
  ['HeartflowAnchorsWidgetProvider', 'widget_anchors_info', '心流 · 心锚'],
  ['HeartflowCountdownWidgetProvider', 'widget_countdown_info', '心流 · 倒数日'],
  ['HeartflowFocusWidgetProvider', 'widget_focus_info', '心流 · 专注'],
  ['HeartflowCalendarWidgetProvider', 'widget_calendar_info', '心流 · 月历'],
  ['HeartflowEmotionWidgetProvider', 'widget_emotion_info', '心流 · 情绪'],
  ['HeartflowNoteWidgetProvider', 'widget_note_info', '心流 · 便签'],
  ['HeartflowQuadrantWidgetProvider', 'widget_quadrant_info', '心流 · 四象限'],
  ['HeartflowHeatmapWidgetProvider', 'widget_heatmap_info', '心流 · 热力图'],
]

if (!fs.existsSync(SRC)) {
  console.error(`[sync-android-widget] 规范源目录不存在：${SRC}`)
  process.exit(1)
}

function copyIfChanged(src, dest, bucket) {
  if (!fs.existsSync(src)) {
    console.error(`[sync-android-widget] 缺失源文件：${src}`)
    return 'missing'
  }
  const data = fs.readFileSync(src)
  if (fs.existsSync(dest) && fs.readFileSync(dest).equals(data)) return 'skipped'
  if (dry) return 'pending'
  fs.mkdirSync(path.dirname(dest), { recursive: true })
  fs.writeFileSync(dest, data)
  bucket?.push(path.relative(DEST, dest))
  return 'written'
}

function receiverBlock(cls, info, label) {
  return [
    `    <receiver android:name=".${cls}" android:exported="true" android:label="${label}">`,
    '      <intent-filter>',
    '        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />',
    '      </intent-filter>',
    `      <meta-data android:name="android.appwidget.provider" android:resource="@xml/${info}" />`,
    '    </receiver>',
  ].join('\n') + '\n'
}

function patchManifest(log) {
  const mf = path.join(DEST, 'AndroidManifest.xml')
  if (!fs.existsSync(mf)) {
    console.warn('[sync-android-widget] 未找到 AndroidManifest.xml，跳过 receiver 补丁（请先跑 tauri android 生成工程）')
    return { added: 0, skipped: RECEIVERS.length }
  }
  let xml = fs.readFileSync(mf, 'utf8')
  let added = 0
  for (const [cls, info, label] of RECEIVERS) {
    if (xml.includes(`.${cls}`)) continue
    const anchor = xml.lastIndexOf('</application>')
    if (anchor < 0) {
      console.warn('[sync-android-widget] AndroidManifest.xml 无 </application> 锚点，跳过剩余 receiver')
      break
    }
    xml = xml.slice(0, anchor) + receiverBlock(cls, info, label) + xml.slice(anchor)
    added++
    log.push(`AndroidManifest.xml + receiver ${cls}`)
  }
  if (added && !dry) fs.writeFileSync(mf, xml)
  return { added, skipped: RECEIVERS.length - added }
}

// ---- 枚举并执行 ----
const ktFiles = fs.readdirSync(SRC).filter(f => f.endsWith('.kt'))
const log = []
const stats = { written: 0, skipped: 0, missing: 0 }

const bump = (r) => {
  if (r === 'written') { stats.written++; return }
  if (r === 'skipped') { stats.skipped++; return }
  if (r === 'pending') { stats.written++; return }
  stats.missing++
}

for (const f of ktFiles) {
  bump(copyIfChanged(path.join(SRC, f), path.join(DEST, 'java', 'com', 'heartflow', 'app', f), log))
}
for (const n of LAYOUTS) {
  bump(copyIfChanged(path.join(SRC, `${n}.xml`), path.join(DEST, 'res', 'layout', `${n}.xml`), log))
}
for (const n of DRAWABLES) {
  bump(copyIfChanged(path.join(SRC, `${n}.xml`), path.join(DEST, 'res', 'drawable', `${n}.xml`), log))
}
for (const n of LAYOUTS) {
  bump(copyIfChanged(path.join(SRC, `${n}_info.xml`), path.join(DEST, 'res', 'xml', `${n}_info.xml`), log))
}

const mf = patchManifest(log)

console.log(`[sync-android-widget] 源 ${SRC}`)
console.log(`[sync-android-widget] 目标 ${DEST}`)
console.log(`[sync-android-widget] kt ${ktFiles.length} · 布局 ${LAYOUTS.length} · 描边 ${DRAWABLES.length} · 元数据 ${LAYOUTS.length} · receiver ${RECEIVERS.length}`)
console.log(`[sync-android-widget] 写入 ${stats.written} · 跳过(内容一致) ${stats.skipped} · 缺失 ${stats.missing}`)
console.log(`[sync-android-widget] receiver 新增 ${mf.added} · 已存在 ${mf.skipped}`)
if (dry) console.log('[sync-android-widget] --dry 模式，未写盘')
else if (log.length) for (const l of log) console.log(`  · ${l}`)
