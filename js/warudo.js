// Warudo 호환 로직 (DOM 없음 → node 테스트 가능).
// 출처: docs.warudo.app (문서) + HakuyaLabs/Warudo-Mod-Tool SDK 스텁의 필드 기본값 (SDK).
// 'inferred' 표시는 공식 자료에 공식이 없어 추정한 부분.
export const ARKIT = ["eyeBlinkLeft","eyeBlinkRight","eyeLookDownLeft","eyeLookDownRight","eyeLookInLeft","eyeLookInRight","eyeLookOutLeft","eyeLookOutRight","eyeLookUpLeft","eyeLookUpRight","eyeSquintLeft","eyeSquintRight","eyeWideLeft","eyeWideRight","jawLeft","jawRight","jawForward","jawOpen","mouthLeft","mouthRight","mouthSmileLeft","mouthSmileRight","mouthFrownLeft","mouthFrownRight","mouthDimpleLeft","mouthDimpleRight","mouthStretchLeft","mouthStretchRight","mouthPressLeft","mouthPressRight","mouthLowerDownLeft","mouthLowerDownRight","mouthUpperUpLeft","mouthUpperUpRight","mouthClose","mouthFunnel","mouthPucker","mouthRollLower","mouthRollUpper","mouthShrugLower","mouthShrugUpper","browDownLeft","browDownRight","browOuterUpLeft","browOuterUpRight","browInnerUp","cheekSquintLeft","cheekSquintRight","cheekPuff","noseSneerLeft","noseSneerRight","tongueOut"];
// SDK GenericTrackerAsset.MirroredBlendShapesMapping 그대로
const MIR_PAIRS = [["eyeBlinkLeft","eyeBlinkRight"],["eyeLookDownLeft","eyeLookDownRight"],["eyeLookInLeft","eyeLookInRight"],["eyeLookOutLeft","eyeLookOutRight"],["eyeLookUpLeft","eyeLookUpRight"],["eyeSquintLeft","eyeSquintRight"],["eyeWideLeft","eyeWideRight"],["jawLeft","jawRight"],["mouthLeft","mouthRight"],["mouthSmileLeft","mouthSmileRight"],["mouthFrownLeft","mouthFrownRight"],["mouthDimpleLeft","mouthDimpleRight"],["mouthStretchLeft","mouthStretchRight"],["mouthRollLower","mouthRollUpper"],["mouthShrugLower","mouthShrugUpper"],["mouthPressLeft","mouthPressRight"],["mouthLowerDownLeft","mouthLowerDownRight"],["mouthUpperUpLeft","mouthUpperUpRight"],["browDownLeft","browDownRight"],["browOuterUpLeft","browOuterUpRight"],["cheekSquintLeft","cheekSquintRight"],["noseSneerLeft","noseSneerRight"]];
export const MIRROR = {}; for (const [a, b] of MIR_PAIRS) { MIRROR[a] = b; MIRROR[b] = a; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clamp01 = v => clamp(v, 0, 1);

// ---- 설정 스키마: key는 Warudo SDK 필드명(= 씬 파일 dataInputs 키로 추정) ----
// src: doc(문서) / sdk(SDK 기본값) / inferred(추정) / ours(우리 전용, Warudo에 없음)
export const SCHEMA = [
 // MediaPipe Tracker (GenericTrackerAsset)
 { sec: 'tracker', key: 'MirroredTracking', en: 'Mirrored Tracking', ko: '추적 좌우 반전', type: 'bool', def: false, src: 'sdk' },
 { sec: 'tracker', key: 'BlendShapeSensitivity', en: 'BlendShape Sensitivity', ko: '블렌드쉐이프 민감도', type: 'num', min: 0, max: 3, step: 0.05, def: 1, src: 'sdk' },
 { sec: 'tracker', key: 'ClampAllBlendShapes', en: 'Clamp All BlendShapes', ko: '블렌드쉐이프 0~1 제한', type: 'bool', def: true, src: 'sdk' },
 { sec: 'tracker', key: 'HeadMovementIntensity', en: 'Head Movement Intensity', ko: '머리 이동 강도', type: 'vec3', min: 0, max: 5, step: 0.1, def: [2, 2, 2], src: 'sdk' },
 { sec: 'tracker', key: 'MaximalHeadTranslation', en: 'Maximal Head Translation', ko: '최대 머리 이동(m)', type: 'vec3', min: 0, max: 1, step: 0.01, def: [0.5, 0.5, 0.5], src: 'sdk' },
 { sec: 'tracker', key: 'HeadRotationIntensity', en: 'Head Rotation Intensity', ko: '머리 회전 강도', type: 'vec3', min: 0, max: 3, step: 0.05, def: [1, 1, 1], src: 'sdk' },
 { sec: 'tracker', key: 'HeadRotationOffset', en: 'Head Rotation Offset', ko: '머리 회전 오프셋(°)', type: 'vec3', min: -45, max: 45, step: 1, def: [0, 0, 0], src: 'sdk' },
 { sec: 'tracker', key: 'BodyMovementIntensity', en: 'Body Movement Intensity', ko: '몸 이동 강도', type: 'num', min: 0, max: 1, step: 0.05, def: 0.5, src: 'sdk' },
 { sec: 'tracker', key: 'BodyRotationType', en: 'Body Rotation Type', ko: '몸 회전 방식', type: 'enum', opts: [['None', '없음'], ['Normal', '같은 방향'], ['Inverted', '반대(Z축만)'], ['Custom', '직접 지정']], def: 'Inverted', src: 'doc' },
 { sec: 'tracker', key: 'BodyRotationIntensity', en: 'Body Rotation Intensity', ko: '몸 회전 강도', type: 'num', min: 0, max: 1, step: 0.05, def: 0.5, src: 'sdk' },
 { sec: 'tracker', key: 'BodyRotationDirection', en: 'Body Rotation Direction (Custom)', ko: '몸 회전 축별 방향·크기', type: 'vec3', min: -1, max: 1, step: 0.05, def: [0.5, 1, 0.5], src: 'sdk' },
 { sec: 'tracker', key: 'BodyRotationNeckCompensation', en: 'Neck Compensation', ko: '목 보정', type: 'num', min: 0, max: 1, step: 0.05, def: 0.75, src: 'sdk' },
 { sec: 'tracker', key: 'BodyRotationSpineRotationIntensity', en: 'Spine Rotation Intensity', ko: '허리(spine) 회전 비율', type: 'num', min: 0, max: 1, step: 0.05, def: 0.5, src: 'sdk' },
 { sec: 'tracker', key: 'BodyRotationChestRotationIntensity', en: 'Chest Rotation Intensity', ko: '가슴 회전 비율', type: 'num', min: 0, max: 1, step: 0.05, def: 0.25, src: 'sdk' },
 { sec: 'tracker', key: 'BodyRotationHipsRotationIntensity', en: 'Hips Rotation Intensity', ko: '골반 회전 비율', type: 'num', min: 0, max: 1, step: 0.05, def: 0, src: 'sdk' },
 { sec: 'tracker', key: 'BodyRotationDelayDuration', en: 'Body Rotation Delay Duration', ko: '몸 회전 지연(초)', type: 'num', min: 0, max: 1, step: 0.05, def: 0, src: 'sdk' },
 { sec: 'tracker', key: 'BodyRotationSmoothingDuration', en: 'Body Rotation Smoothing Duration', ko: '몸 회전 부드럽게(초)', type: 'num', min: 0, max: 1, step: 0.05, def: 0, src: 'sdk' },
 { sec: 'tracker', key: 'EyeMovementIntensity', en: 'Eye Movement Intensity', ko: '눈동자 움직임 강도', type: 'vec2', min: 0, max: 3, step: 0.05, def: [1, 1], src: 'sdk' },
 { sec: 'tracker', key: 'EyeMovementHeadRotationCompensation', en: 'Eye Movement Head Rotation Compensation', ko: '머리 회전 시선 보정', type: 'vec2', min: 0, max: 1, step: 0.05, def: [0, 0], src: 'sdk' },
 { sec: 'tracker', key: 'EyeBlinkSensitivity', en: 'Eye Blink Sensitivity', ko: '눈 깜빡임 민감도', type: 'num', min: 0, max: 3, step: 0.05, def: 1.2, src: 'sdk' },
 { sec: 'tracker', key: 'LinkedEyeBlinking', en: 'Linked Eye Blinking', ko: '양눈 같이 깜빡임', type: 'bool', def: false, src: 'sdk' },
 { sec: 'tracker', key: 'UseBonesForEyeMovement', en: 'Use Bones For Eye Movement', ko: '눈 뼈로 시선', type: 'bool', def: true, src: 'sdk' },
 { sec: 'tracker', key: 'UseBlendShapesForEyeMovement', en: 'Use BlendShapes For Eye Movement', ko: '블렌드쉐이프로 시선', type: 'bool', def: false, src: 'sdk' },
 { sec: 'tracker', key: 'CalibrateEyeMovement', en: 'Calibrate Eye Movement', ko: '보정 시 시선도 보정', type: 'bool', def: true, src: 'sdk' },
 // 얼굴 추적 Blueprint (온보딩 Customize Face Tracking)
 { sec: 'bp', key: 'BlendShapeMappingType', en: 'BlendShape Mapping', ko: '블렌드쉐이프 매핑', type: 'enum', opts: [['Auto', '자동 감지'], ['VRM', 'VRM'], ['ARKit', 'ARKit (Perfect Sync)']], def: 'Auto', src: 'doc' },
 { sec: 'bp', key: 'EnableHeadAndBodyMovements', en: 'Enable Head and Body Movements', ko: '머리·몸 움직임', type: 'bool', def: true, src: 'doc' },
 { sec: 'bp', key: 'IdleAutoBlinking', en: 'Idle Head Animation: Auto Blinking', ko: '자동 깜빡임', type: 'bool', def: true, src: 'doc' },
 { sec: 'bp', key: 'IdleAutoEyeMovements', en: 'Idle Head Animation: Auto Eye Movements', ko: '자동 눈 움직임', type: 'bool', def: true, src: 'doc' },
 { sec: 'bp', key: 'IdleAutoHeadMovements', en: 'Idle Head Animation: Auto Head Movements', ko: '자동 머리 움직임', type: 'bool', def: true, src: 'doc' },
 { sec: 'bp', key: 'LookAt', en: 'Look At', ko: '카메라 눈맞춤', type: 'bool', def: true, src: 'doc' },
 { sec: 'bp', key: 'LipSync', en: 'Lip Sync', ko: '립싱크(마이크)', type: 'enum', opts: [['Disabled', '끔'], ['WhenTrackingLost', '추적 끊길 때만'], ['Always', '항상']], def: 'WhenTrackingLost', src: 'doc' },
 // Character Look At Target 노드 (Look At 옵션이 쓰는 노드로 추정)
 { sec: 'look', key: 'LookAtNodeWeight', en: 'Weight', ko: '눈맞춤 세기', type: 'num', min: 0, max: 1, step: 0.05, def: 1, src: 'sdk' },
 { sec: 'look', key: 'LookAtNodeHeadWeight', en: 'Head Weight', ko: '머리 비중', type: 'num', min: 0, max: 1, step: 0.01, def: 0.66, src: 'sdk' },
 { sec: 'look', key: 'LookAtNodeEyesWeight', en: 'Eyes Weight', ko: '눈 비중', type: 'num', min: 0, max: 1, step: 0.01, def: 0.33, src: 'sdk' },
 { sec: 'look', key: 'MaximumLookAtAngle', en: 'Maximum Look At Angle', ko: '최대 눈맞춤 각도(°)', type: 'num', min: 0, max: 180, step: 1, def: 135, src: 'sdk' },
 { sec: 'look', key: 'MaximalHeadRotation', en: 'Maximal Head Rotation', ko: '최대 머리 회전(°)', type: 'vec3', min: 0, max: 90, step: 1, def: [30, 30, 30], src: 'sdk' },
 { sec: 'look', key: 'MaximalEyeRotation', en: 'Maximal Eye Rotation', ko: '최대 눈 회전(°)', type: 'vec2', min: 0, max: 45, step: 1, def: [10, 5], src: 'sdk' },
 { sec: 'look', key: 'SmoothHeadTime', en: 'Smooth Head Time', ko: '머리 따라가기 속도', type: 'num', min: 0, max: 10, step: 0.1, def: 3.5, src: 'sdk' },
 { sec: 'look', key: 'SmoothEyesTime', en: 'Smooth Eyes Time', ko: '눈 따라가기 속도', type: 'num', min: 0, max: 10, step: 0.1, def: 2, src: 'sdk' },
 // Character 에셋
 { sec: 'char', key: 'LookAtEnabled', en: 'Look At IK', ko: 'Look At IK (카메라 보기)', type: 'bool', def: false, src: 'sdk' },
 { sec: 'char', key: 'LookAtWeight', en: 'Weight', ko: '전체 세기', type: 'num', min: 0, max: 1, step: 0.05, def: 0.5, src: 'sdk' },
 { sec: 'char', key: 'LookAtHeadWeight', en: 'Head Weight', ko: '머리', type: 'num', min: 0, max: 1, step: 0.05, def: 1, src: 'sdk' },
 { sec: 'char', key: 'LookAtEyesWeight', en: 'Eyes Weight', ko: '눈', type: 'num', min: 0, max: 1, step: 0.05, def: 1, src: 'sdk' },
 { sec: 'char', key: 'LookAtBodyWeight', en: 'Body Weight', ko: '몸', type: 'num', min: 0, max: 1, step: 0.05, def: 1, src: 'sdk' },
 { sec: 'char', key: 'LookAtClampHeadWeight', en: 'Clamp Head Weight', ko: '머리 제한', type: 'num', min: 0, max: 1, step: 0.05, def: 0.7, src: 'sdk' },
 { sec: 'char', key: 'LookAtClampEyesWeight', en: 'Clamp Eyes Weight', ko: '눈 제한', type: 'num', min: 0, max: 1, step: 0.05, def: 0.8, src: 'sdk' },
 { sec: 'char', key: 'LookAtClampBodyWeight', en: 'Clamp Body Weight', ko: '몸 제한', type: 'num', min: 0, max: 1, step: 0.05, def: 0.6, src: 'sdk' },
 { sec: 'char', key: 'BreathingEnabled', en: 'Breathing Animation', ko: '숨쉬기', type: 'bool', def: false, src: 'sdk' },
 { sec: 'char', key: 'BreathingExertion', en: 'Breathing Exertion', ko: '숨 세기', type: 'num', min: 0, max: 1, step: 0.01, def: 0.1, src: 'sdk' },
 { sec: 'char', key: 'BreathingRate', en: 'Breathing Rate', ko: '숨 빠르기(회/초)', type: 'num', min: 0, max: 2, step: 0.01, def: 0.25, src: 'sdk' },
 { sec: 'char', key: 'SwayingEnabled', en: 'Swaying Animation', ko: '흔들림', type: 'bool', def: false, src: 'sdk' },
 { sec: 'char', key: 'SwayingIntensity', en: 'Swaying Intensity', ko: '흔들림 세기', type: 'num', min: 0, max: 1, step: 0.01, def: 0.25, src: 'sdk' },
 // Camera 에셋
 { sec: 'cam', key: 'FieldOfView', en: 'Field Of View', ko: '시야각(°)', type: 'num', min: 10, max: 90, step: 1, def: 35, src: 'sdk' },
 { sec: 'cam', key: 'TransparentBackground', en: 'Transparent Background', ko: '투명 배경', type: 'bool', def: false, src: 'sdk' },
 { sec: 'cam', key: 'ChromaKeyColor', en: 'Chroma Key Color', ko: '크로마키 색', type: 'color', def: '#00ff00', src: 'sdk' },
 { sec: 'cam', key: 'Brightness', en: 'Brightness', ko: '밝기(후처리)', type: 'num', min: 0, max: 2, step: 0.01, def: 1.05, src: 'doc' },
 { sec: 'cam', key: 'Contrast', en: 'Contrast', ko: '대비(후처리)', type: 'num', min: 0, max: 2, step: 0.01, def: 1.02, src: 'doc' },
 { sec: 'cam', key: 'Vibrance', en: 'Vibrance', ko: '선명도(후처리, 근사)', type: 'num', min: 0, max: 2, step: 0.01, def: 1, src: 'doc' },
 // 우리 전용 (Warudo에 대응 없음)
 { sec: 'ours', key: 'smooth', en: 'One-Euro smoothing', ko: '부드러움', type: 'num', min: 0, max: 1, step: 0.01, def: 0.55, src: 'ours' },
 { sec: 'ours', key: 'beta', en: 'fast-motion response', ko: '빠른 움직임 반응', type: 'num', min: 0, max: 1, step: 0.01, def: 0.5, src: 'ours' },
 { sec: 'ours', key: 'idleAnim', en: 'idle animation (approx.)', ko: '대기 애니메이션 (근사)', type: 'bool', def: true, src: 'ours' },
 { sec: 'ours', key: 'armDown', en: 'arm down', ko: '팔 내림(°)', type: 'num', min: 0, max: 85, step: 1, def: 72, src: 'ours' },
 { sec: 'ours', key: 'autoEmo', en: 'auto emotion', ko: '표정 자동 인식 (Warudo 기본엔 없음)', type: 'bool', def: false, src: 'ours' },
 { sec: 'ours', key: 'emoSens', en: 'emotion sensitivity', ko: '감정 감도', type: 'num', min: 0, max: 2, step: 0.05, def: 1, src: 'ours' },
 { sec: 'ours', key: 'micSens', en: 'excitement sensitivity', ko: '신남 감도', type: 'num', min: 0.5, max: 2, step: 0.05, def: 1, src: 'ours' },
 { sec: 'ours', key: 'micBounce', en: 'bounce', ko: '신나면 통통 튀기', type: 'bool', def: true, src: 'ours' },
 { sec: 'ours', key: 'micExpr', en: 'excited → smile', ko: '신나면 웃음', type: 'bool', def: true, src: 'ours' },
 { sec: 'ours', key: 'light', en: 'light', ko: '조명 밝기', type: 'num', min: 0.2, max: 2, step: 0.05, def: 1, src: 'ours' },
 { sec: 'ours', key: 'lightDir', en: 'light direction', ko: '조명 방향(°)', type: 'num', min: -90, max: 90, step: 1, def: -25, src: 'ours' },
 { sec: 'ours', key: 'preview', en: 'camera preview', ko: '카메라 미리보기', type: 'bool', def: false, src: 'ours' },
];
export const DEFAULTS = Object.fromEntries(SCHEMA.map(s => [s.key, Array.isArray(s.def) ? [...s.def] : s.def]));

// ---- Configure BlendShapes Mapping (MappingData: SourceValueMin/Max → TargetValueMin/Max, SDK 기본 0,1,0,1) ----
// 문서 예: 입력 0-1, 출력 0-2 → 0.40 → 0.80. 선형. 입력은 원본 범위로 제한(inferred), 최종 0~1 제한은 ClampAllBlendShapes(SDK, 적용 위치 inferred).
export function mapValue(v, m) {
  const s0 = m.SourceValueMin ?? 0, s1 = m.SourceValueMax ?? 1, t0 = m.TargetValueMin ?? 0, t1 = m.TargetValueMax ?? 1;
  if (s1 === s0) return v >= s1 ? t1 : t0;
  const t = clamp01((v - s0) / (s1 - s0));
  return t0 + t * (t1 - t0);
}
// SDK MappingData 기본값은 0,1,0,1. Warudo는 트래커별 초기 매핑(Initialize)을 따로 넣지만 MediaPipe 값은 비공개.
// MediaPipe는 눈을 떠도 eyeBlink가 0.2 안팎이라, 실제 Warudo 값을 받기 전까지 eyeBlink만 임시값 사용 (inferred, 교체 대상)
export const MEDIAPIPE_INITIAL = { eyeBlinkLeft: [0.25, 0.8, 0, 1], eyeBlinkRight: [0.25, 0.8, 0, 1] };
export function sdkMapping() { return ARKIT.map(n => ({ BlendShape: n, SourceValueMin: 0, SourceValueMax: 1, TargetValueMin: 0, TargetValueMax: 1 })); }
export function defaultMapping() { return sdkMapping().map(m => { const i = MEDIAPIPE_INITIAL[m.BlendShape]; return i ? { BlendShape: m.BlendShape, SourceValueMin: i[0], SourceValueMax: i[1], TargetValueMin: i[2], TargetValueMax: i[3] } : m; }); }
// 추적값 → 캐릭터 입력값. 순서(inferred): 좌우반전 → 개별 매핑 → 전체 민감도(×) → 눈 깜빡임 민감도(×) → 0~1 제한
export function processBlendShapes(raw, cfg, mappingIndex) {
  const out = {};
  for (const n of ARKIT) {
    const src = cfg.MirroredTracking ? (MIRROR[n] || n) : n;
    let v = raw[src] || 0;
    const m = mappingIndex[n]; if (m) v = mapValue(v, m);
    v *= cfg.BlendShapeSensitivity;
    if (n === 'eyeBlinkLeft' || n === 'eyeBlinkRight') v *= cfg.EyeBlinkSensitivity;
    if (cfg.ClampAllBlendShapes) v = clamp01(v);
    out[n] = v;
  }
  if (cfg.LinkedEyeBlinking) { const b = Math.max(out.eyeBlinkLeft, out.eyeBlinkRight); out.eyeBlinkLeft = out.eyeBlinkRight = b; } // max: inferred
  return out;
}

// ---- Body Rotation Type (문서: None 회전 없음 / Normal 같은 방향 / Inverted X·Y 같은 방향, Z 반대 / Custom 축별 방향·크기) ----
// 입력: 머리 회전(도) {x:pitch, y:yaw, z:roll}. 반환: 몸 전체 회전(도). Normal/Inverted 세기 = BodyRotationIntensity, Custom = BodyRotationDirection (SDK 숨김 조건으로 추정)
export function bodyRotation(head, cfg) {
  const t = cfg.BodyRotationType, I = cfg.BodyRotationIntensity;
  let d;
  if (t === 'None') d = [0, 0, 0];
  else if (t === 'Normal') d = [I, I, I];
  else if (t === 'Inverted') d = [I, I, -I];
  else d = cfg.BodyRotationDirection;
  return { x: head.x * d[0], y: head.y * d[1], z: head.z * d[2] };
}
// 몸 회전을 골반/허리/가슴에 나누고, 목에서 일부를 되돌림(Neck Compensation) → 머리의 최종 방향은 추적값에 가깝게 (분배 방식 inferred)
export function distributeBody(head, cfg) {
  const B = bodyRotation(head, cfg);
  const hs = cfg.BodyRotationHipsRotationIntensity, sp = cfg.BodyRotationSpineRotationIntensity, ch = cfg.BodyRotationChestRotationIntensity;
  const sum = hs + sp + ch, comp = cfg.BodyRotationNeckCompensation;
  const mul = (k) => ({ x: B.x * k, y: B.y * k, z: B.z * k });
  const body = mul(sum);
  const headLocal = { x: head.x - comp * body.x, y: head.y - comp * body.y, z: head.z - comp * body.z };
  return { hips: mul(hs), spine: mul(sp), chest: mul(ch), headLocal, body };
}

// ---- 머리 이동: MediaPipe 이동(cm) → m, × Head Movement Intensity, ±Maximal Head Translation 제한 ----
export function headTranslation(tcm, cfg) {
  const k = cfg.HeadMovementIntensity, mx = cfg.MaximalHeadTranslation;
  return [0, 1, 2].map(i => clamp((tcm[i] / 100) * k[i], -mx[i], mx[i]));
}

// ---- 표정 (ExpressionData): 같은 Layer는 페이드아웃, 다른 Layer는 겹침. Enter 0.4s OutCubic, Exit 0.4s Linear, Is Binary면 즉시 ----
export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);
export function newExpression(name, vrmName, layer = 0) {
  return { Name: name, vrm: vrmName, Layer: layer, IsBinary: false, TargetValue: 1, EnterDuration: 0.4, EnterDelay: 0, ExitDuration: 0.4, ExitDelay: 0,
    DisableEyeBlinkTracking: false, DisableMouthTracking: false, DisableBrowTracking: false, TriggerConditions: [] };
}
export class ExpressionEngine {
  constructor() { this.list = []; this.st = new Map(); }
  setList(list) { this.list = list; for (const e of list) if (!this.st.has(e.Name)) this.st.set(e.Name, { w: 0, from: 0, to: 0, t0: 0, dur: 0, ease: 'lin', delay: 0, active: false, trig: [] }); }
  _go(e, to, now) {
    const s = this.st.get(e.Name); if (!s) return;
    const enter = to > 0;
    s.active = enter; s.from = s.w; s.to = to; s.t0 = now;
    s.delay = enter ? e.EnterDelay : e.ExitDelay;
    s.dur = e.IsBinary ? 0 : (enter ? e.EnterDuration : e.ExitDuration);
    s.ease = enter ? 'outCubic' : 'lin';
  }
  enter(name, now) {
    const e = this.list.find(x => x.Name === name); if (!e) return;
    for (const o of this.list) if (o !== e && o.Layer === e.Layer && this.st.get(o.Name).active) this._go(o, 0, now);
    this._go(e, 1, now);
  }
  exit(name, now) { const e = this.list.find(x => x.Name === name); if (e) this._go(e, 0, now); }
  exitAll(now) { for (const e of this.list) if (this.st.get(e.Name).active) this._go(e, 0, now); }
  isActive(name) { return !!this.st.get(name)?.active; }
  // 조건 평가: 한 항목(entry) 안의 조건은 모두 만족(AND, 문서 예시 기준 inferred), 항목끼리는 하나라도(OR, 문서)
  triggers(values, now) {
    for (const e of this.list) {
      const s = this.st.get(e.Name);
      (e.TriggerConditions || []).forEach((tc, i) => {
        const conds = tc.Conditions || []; if (!conds.length) return;
        const met = conds.every(c => { const v = values[c.BlendShape] ?? 0; return c.Condition === 'LessThanOrEqual' ? v <= c.Value : v >= c.Value; });
        const ts = s.trig[i] || (s.trig[i] = { met: false, since: now, fired: false });
        if (met !== ts.met) { ts.met = met; ts.since = now; ts.fired = false; }
        if (ts.fired) return;
        const delay = met ? (tc.TriggerWhenMetDelay ?? 0) : (tc.TriggerWhenNotMetDelay ?? 2);
        const act = met ? (tc.TriggerWhenMet ?? 'Enter') : (tc.TriggerWhenNotMet ?? 'Exit');
        if (now - ts.since >= delay) { ts.fired = true; if (act === 'Enter' && !s.active) this.enter(e.Name, now); else if (act === 'Exit' && s.active) this.exit(e.Name, now); }
      });
    }
  }
  update(now) {
    const out = {};
    for (const e of this.list) {
      const s = this.st.get(e.Name);
      const el = now - s.t0 - s.delay;
      if (el < 0) { /* 지연 중 */ }
      else if (s.dur <= 0) s.w = s.to;
      else { const p = clamp01(el / s.dur); s.w = s.from + (s.to - s.from) * (s.ease === 'outCubic' ? easeOutCubic(p) : p); }
      out[e.Name] = s.w * e.TargetValue;
    }
    return out;
  }
}

// ---- Look At IK 제한 (Final IK의 clampWeight 방식, Warudo Look At IK가 Final IK 기반이라 추정) ----
// angle(도)를 clampWeight로 줄인 결과. clampWeight 0 = 자유, 1 = 완전 고정. smoothing 2회(Final IK 기본)
export function clampLookAngle(angleDeg, clampWeight, smoothing = 2) {
  if (clampWeight <= 0) return angleDeg;
  if (clampWeight >= 1) return 0;
  const a = Math.abs(angleDeg), dot = 1 - a / 180;
  const targetClampMlp = clamp01(1 - (clampWeight - dot) / (1 - dot));
  let clampMlp = clamp01(dot / clampWeight);
  for (let i = 0; i < smoothing; i++) clampMlp = Math.sin(clampMlp * Math.PI * 0.5);
  return angleDeg * clampMlp * targetClampMlp;
}

// ---- 표준 VRM 표정 → Warudo 이름 (VRM0 BlendShapeClip 프리셋) ----
export const VRM_PRESET_NAMES = { happy: 'Joy', angry: 'Angry', sad: 'Sorrow', relaxed: 'Fun', surprised: 'Surprised' };
const NON_EXPR = new Set(['aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight', 'lookUp', 'lookDown', 'lookLeft', 'lookRight', 'neutral']);
// 문서: 기본 클립(Joy, Angry, Sorrow, Fun/Surprised)은 layer 0, 모델러가 추가한 클립은 layer 1, 2, 3…
export function importVrmExpressions(names) {
  const list = []; let layer = 1;
  for (const k of ['happy', 'angry', 'sad', 'relaxed', 'surprised']) if (names.includes(k)) list.push(newExpression(VRM_PRESET_NAMES[k], k, 0));
  const arkit = new Set(ARKIT.map(n => n.toLowerCase()));
  for (const n of names) if (!NON_EXPR.has(n) && !VRM_PRESET_NAMES[n] && !arkit.has(n.toLowerCase())) list.push(newExpression(n, n, layer++));
  return list;
}
// ARKit(Perfect Sync) 자동 감지: 모델 표정 이름 중 ARKit 이름이 절반(26개) 이상이면 ARKit (기준 inferred)
export function detectMapping(names) {
  const set = new Set(names.map(n => n.toLowerCase()));
  const hit = ARKIT.filter(n => set.has(n.toLowerCase())).length;
  return { type: hit >= 26 ? 'ARKit' : 'VRM', hit };
}

// ---- Warudo 씬/프로필 JSON 가져오기 (관대한 방식) ----
// SDK 직렬화 구조: SerializedScene{ assets:[{typeId,name,dataInputs:{키:{value}}}], graphs:[{nodes:{id:{typeId,name,dataInputs}}}] }
// 값(value)은 문자열(JSON)일 수 있어 파싱. 실제 씬 파일로 검증 전이라 키 이름 일치만 믿고 가져옴.
const ENUMS = { BodyRotationType: ['None', 'Normal', 'Inverted', 'Custom'] };
function parseVal(v) {
  if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in v && Object.keys(v).length <= 6) v = v.value;
  if (typeof v === 'string') { const t = v.trim(); if (/^[\[{"\-0-9tfn]/.test(t)) { try { return JSON.parse(t); } catch {} } }
  return v;
}
function coerce(s, v) {
  if (s.type === 'bool') return typeof v === 'boolean' ? v : v === 'true' || v === 1 ? true : v === 'false' || v === 0 ? false : undefined;
  if (s.type === 'num') { const n = +v; return Number.isFinite(n) ? n : undefined; }
  if (s.type === 'vec3' || s.type === 'vec2') {
    const ks = s.type === 'vec3' ? ['x', 'y', 'z'] : ['x', 'y'];
    let a; if (Array.isArray(v)) a = v; else if (v && typeof v === 'object') a = ks.map(k => v[k] ?? v[k.toUpperCase()]); else if (typeof v === 'number') a = ks.map(() => v);
    return a && a.length >= ks.length && a.slice(0, ks.length).every(x => Number.isFinite(+x)) ? a.slice(0, ks.length).map(Number) : undefined;
  }
  if (s.type === 'enum') { const names = ENUMS[s.key] || s.opts.map(o => o[0]); if (typeof v === 'number') return names[v]; return names.find(n => n.toLowerCase() === String(v).toLowerCase()); }
  if (s.type === 'color') { if (v && typeof v === 'object' && 'r' in v) { const h = x => Math.round(clamp01(+x) * 255).toString(16).padStart(2, '0'); return '#' + h(v.r) + h(v.g) + h(v.b); } return typeof v === 'string' ? v : undefined; }
  return v;
}
// 우리 키 ↔ Warudo 씬 키 (같은 이름이 여러 에셋에 있으면 어떤 에셋인지로 구분)
const SCENE_KEYS = {
  tracker: ['MirroredTracking', 'BlendShapeSensitivity', 'ClampAllBlendShapes', 'HeadMovementIntensity', 'MaximalHeadTranslation', 'HeadRotationIntensity', 'HeadRotationOffset', 'BodyMovementIntensity', 'BodyRotationType', 'BodyRotationIntensity', 'BodyRotationDirection', 'BodyRotationNeckCompensation', 'BodyRotationSpineRotationIntensity', 'BodyRotationChestRotationIntensity', 'BodyRotationHipsRotationIntensity', 'BodyRotationDelayDuration', 'BodyRotationSmoothingDuration', 'EyeMovementIntensity', 'EyeMovementHeadRotationCompensation', 'EyeBlinkSensitivity', 'LinkedEyeBlinking', 'UseBonesForEyeMovement', 'UseBlendShapesForEyeMovement', 'CalibrateEyeMovement'],
  char: ['LookAtEnabled', 'LookAtWeight', 'LookAtHeadWeight', 'LookAtEyesWeight', 'LookAtBodyWeight', 'LookAtClampHeadWeight', 'LookAtClampEyesWeight', 'LookAtClampBodyWeight', 'BreathingEnabled', 'BreathingExertion', 'BreathingRate', 'SwayingEnabled', 'SwayingIntensity'],
  cam: ['FieldOfView', 'TransparentBackground', 'ChromaKeyColor', 'Brightness', 'Contrast', 'Vibrance'],
  look: { Weight: 'LookAtNodeWeight', HeadWeight: 'LookAtNodeHeadWeight', EyesWeight: 'LookAtNodeEyesWeight', MaximumLookAtAngle: 'MaximumLookAtAngle', MaximalHeadRotation: 'MaximalHeadRotation', MaximalEyeRotation: 'MaximalEyeRotation', SmoothHeadTime: 'SmoothHeadTime', SmoothEyesTime: 'SmoothEyesTime' },
};
function inputsOf(ent) { // dataInputs 또는 평평한 객체 모두 허용
  if (!ent || typeof ent !== 'object') return null;
  if (ent.dataInputs && typeof ent.dataInputs === 'object') return ent.dataInputs;
  return ent;
}
export function importWarudoJSON(json) {
  const S = Object.fromEntries(SCHEMA.map(s => [s.key, s]));
  const res = { settings: {}, mapping: null, expressions: null, found: [], sources: [], kind: 'unknown', notes: [] };
  if (json && json.format === 'vrm-vtuber-warudo') { // 우리 내보내기 파일
    res.kind = 'ours';
    for (const [k, v] of Object.entries(json.settings || {})) if (S[k]) { const c = coerce(S[k], v); if (c !== undefined) { res.settings[k] = c; res.found.push(k); } }
    if (Array.isArray(json.mapping)) res.mapping = json.mapping;
    if (Array.isArray(json.expressions)) res.expressions = json.expressions;
    return res;
  }
  const take = (inputs, key, ourKey, srcName) => {
    if (!(key in inputs)) return;
    const s = S[ourKey]; const c = coerce(s, parseVal(inputs[key]));
    if (c !== undefined && !(ourKey in res.settings)) { res.settings[ourKey] = c; res.found.push(ourKey); if (!res.sources.includes(srcName)) res.sources.push(srcName); }
  };
  const ents = [];
  if (Array.isArray(json?.assets)) { res.kind = 'scene'; for (const a of json.assets) ents.push({ name: a.name || a.typeId || 'asset', inputs: inputsOf(a) }); }
  for (const g of json?.graphs || []) for (const n of Object.values(g.nodes || {})) ents.push({ name: (g.name || 'blueprint') + ' / ' + (n.name || n.typeId || 'node'), inputs: inputsOf(n), node: true });
  if (!ents.length) { res.kind = 'loose'; ents.push({ name: 'json', inputs: inputsOf(json) }); }
  for (const e of ents) {
    const inp = e.inputs; if (!inp) continue;
    const isTracker = 'BlendShapeSensitivity' in inp || 'MirroredTracking' in inp;
    const isChar = 'LookAtEnabled' in inp || 'Expressions' in inp || 'BreathingEnabled' in inp;
    const isCam = 'FieldOfView' in inp && ('ControlMode' in inp || 'TransparentBackground' in inp || 'Vibrance' in inp);
    const isLookNode = 'MaximalEyeRotation' in inp || 'SmoothHeadTime' in inp;
    if (isTracker || res.kind === 'loose') for (const k of SCENE_KEYS.tracker) take(inp, k, k, e.name);
    if (isChar || res.kind === 'loose') for (const k of SCENE_KEYS.char) take(inp, k, k, e.name);
    if (isCam || res.kind === 'loose') for (const k of SCENE_KEYS.cam) take(inp, k, k, e.name);
    if (isLookNode) for (const [k, ok] of Object.entries(SCENE_KEYS.look)) take(inp, k, ok, e.name);
    // BlendShapesMapping: 어디에 있든 {BlendShape, SourceValueMin...} 묶음을 찾음
    if (isTracker && 'BlendShapesMapping' in inp && !res.mapping) { const m = findMappings(parseVal(inp.BlendShapesMapping)); if (m.length) { res.mapping = m; res.found.push('BlendShapesMapping(' + m.length + ')'); } }
    if (isChar && 'Expressions' in inp && !res.expressions) { const x = findExpressions(parseVal(inp.Expressions)); if (x.length) { res.expressions = x; res.found.push('Expressions(' + x.length + ')'); } }
  }
  if (!res.mapping) { const m = findMappings(json); if (m.length) { res.mapping = m; res.found.push('BlendShapesMapping(' + m.length + ')'); } }
  if (!res.found.length) res.notes.push('알려진 Warudo 설정 이름을 찾지 못했어요. 실제 Warudo 씬 파일(.json)이 필요해요.');
  return res;
}
function walk(o, fn, depth = 0) { if (!o || typeof o !== 'object' || depth > 40) return; fn(o); for (const v of Array.isArray(o) ? o : Object.values(o)) { const p = parseVal(v); walk(p, fn, depth + 1); } }
function flat(o) { const i = inputsOf(o) || {}; const r = {}; for (const [k, v] of Object.entries(i)) r[k] = parseVal(v); return r; }
export function findMappings(json) {
  const out = []; const seen = new Set();
  walk(json, o => { const f = flat(o); if (typeof f.BlendShape === 'string' && ('SourceValueMax' in f || 'TargetValueMax' in f) && !seen.has(f.BlendShape)) { seen.add(f.BlendShape); out.push({ BlendShape: f.BlendShape, SourceValueMin: +(f.SourceValueMin ?? 0), SourceValueMax: +(f.SourceValueMax ?? 1), TargetValueMin: +(f.TargetValueMin ?? 0), TargetValueMax: +(f.TargetValueMax ?? 1) }); } });
  return out;
}
export function findExpressions(json) {
  const out = [];
  walk(json, o => {
    const f = flat(o); if (typeof f.Name !== 'string' || !('Layer' in f) || !('IsBinary' in f)) return;
    const e = newExpression(f.Name, null, +f.Layer || 0); e.IsBinary = !!f.IsBinary;
    for (const k of ['DisableEyeBlinkTracking', 'DisableMouthTracking', 'DisableBrowTracking']) e[k] = !!f[k];
    const bs = findFirst(f.BlendShapes, x => 'EnterDuration' in x); if (bs) for (const k of ['EnterDuration', 'EnterDelay', 'ExitDuration', 'ExitDelay']) if (Number.isFinite(+bs[k])) e[k] = +bs[k];
    const tcs = []; walk(f.TriggerConditions, t => { const tf = flat(t); if ('Conditions' in tf) { const conds = []; walk(tf.Conditions, c => { const cf = flat(c); if (typeof cf.BlendShape === 'string' && 'Value' in cf) conds.push({ BlendShape: cf.BlendShape, Condition: (cf.Condition === 1 || cf.Condition === 'LessThanOrEqual') ? 'LessThanOrEqual' : 'GreaterThanOrEqual', Value: +cf.Value }); }); const T = ['DoNothing', 'Enter', 'Exit']; const tt = v => typeof v === 'number' ? T[v] : v; tcs.push({ Conditions: conds, TriggerWhenMet: tt(tf.TriggerWhenMet) ?? 'Enter', TriggerWhenMetDelay: +(tf.TriggerWhenMetDelay ?? 0), TriggerWhenNotMet: tt(tf.TriggerWhenNotMet) ?? 'Exit', TriggerWhenNotMetDelay: +(tf.TriggerWhenNotMetDelay ?? 2) }); } });
    e.TriggerConditions = tcs; out.push(e);
  });
  return out;
}
function findFirst(o, pred) { let r = null; walk(o, x => { if (!r) { const f = flat(x); if (pred(f)) r = f; } }); return r; }
