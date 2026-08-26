import { loadSchema, saveSchema } from './core'
import type { JadeBeadCarrier } from '../../types'
export function getCarriers(): JadeBeadCarrier[] { return loadSchema().carriers }
export function setCarriers(carriers: JadeBeadCarrier[]): void { const s = loadSchema(); s.carriers = carriers; saveSchema(s) }