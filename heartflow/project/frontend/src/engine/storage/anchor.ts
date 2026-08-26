import { loadSchema, saveSchema } from './core'
import type { Anchor } from '../../modules/anchor/types'
export function getAnchors(): Anchor[] { return loadSchema().anchors ?? [] }
export function setAnchors(anchors: Anchor[]): void { const s = loadSchema(); s.anchors = anchors; saveSchema(s) }