// ============================================================
// 存储领域组合层
// 将所有领域模块组合为统一的 storage 对象
// ============================================================

import { clearAll } from './core'
import * as config from './config'
import * as session from './session'
import * as crystal from './crystal'
import * as carrier from './carrier'
import * as constitution from './constitution'
import * as advisor from './advisor'
import * as emotion from './emotion'
import * as note from './note'
import * as anchor from './anchor'
import * as goal from './goal'
import * as relation from './relation'
import * as ledger from './ledger'
import * as plugin from './plugin'
import * as kv from './kv'
import * as tagCategory from './tag-category'
import * as scenePreset from './scene-preset'

/** 统一存储 API 对象 */
export const storage = {
  ...config,
  ...session,
  ...crystal,
  ...carrier,
  ...constitution,
  ...advisor,
  ...emotion,
  ...note,
  ...anchor,
  ...goal,
  ...relation,
  ...ledger,
  ...plugin,
  ...kv,
  ...tagCategory,
  ...scenePreset,
  clear: clearAll,
}