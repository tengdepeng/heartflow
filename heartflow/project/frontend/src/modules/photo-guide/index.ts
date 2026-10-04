// ============================================================
// 藏象阁 · AI 拍照引导取景 barrel（INCR-506）
// ============================================================

export {
  usePhotoGuide,
  reloadPhotoGuide,
  sceneById,
  analyzeImageData,
  evaluateCapture,
  CAPTURE_SCENES,
  LEVEL_LABEL,
} from './photo-guide'

export type {
  CaptureScene,
  CaptureSceneId,
  ImageMetrics,
  CaptureEvaluation,
  CaptureRecord,
  CapturePhase,
} from './photo-guide'
