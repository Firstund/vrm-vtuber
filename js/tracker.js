// MediaPipe FaceLandmarker (로컬 파일만 사용, 영상은 브라우저 밖으로 나가지 않음)
import { FaceLandmarker, FilesetResolver } from '../lib/mediapipe/vision_bundle.mjs';
let landmarker = null;
export const tracker = { delegate: '', ready: false };
export async function loadTracker() {
  if (landmarker) return landmarker;
  const fileset = await FilesetResolver.forVisionTasks(new URL('../lib/mediapipe/wasm', import.meta.url).href);
  const opts = d => ({
    baseOptions: { modelAssetPath: new URL('../models/face_landmarker.task', import.meta.url).href, delegate: d },
    runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true, outputFacialTransformationMatrixes: true,
    minFaceDetectionConfidence: 0.5, minFacePresenceConfidence: 0.5, minTrackingConfidence: 0.5,
  });
  try { landmarker = await FaceLandmarker.createFromOptions(fileset, opts('GPU')); tracker.delegate = 'GPU'; }
  catch (e) { console.warn('GPU 실패, CPU로 전환', e); landmarker = await FaceLandmarker.createFromOptions(fileset, opts('CPU')); tracker.delegate = 'CPU'; }
  tracker.ready = true;
  return landmarker;
}
// 결과 → { bs: {이름: 점수}, m: 4x4(column-major) } 또는 null
export function detect(video, tMs) {
  if (!landmarker) return null;
  const r = landmarker.detectForVideo(video, tMs);
  if (!r.faceBlendshapes?.length) return null;
  const bs = {}; for (const c of r.faceBlendshapes[0].categories) bs[c.categoryName] = c.score;
  const m = r.facialTransformationMatrixes?.[0]?.data || null;
  return { bs, m: m ? Array.from(m) : null };
}
