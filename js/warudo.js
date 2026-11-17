// Warudo 호환 로직 (DOM 없음 → node 테스트 가능).
// 출처: docs.warudo.app (문서) + HakuyaLabs/Warudo-Mod-Tool SDK 스텁의 필드 기본값 (SDK).
// 'inferred' 표시는 공식 자료에 공식이 없어 추정한 부분. 'real' = 사용자의 실제 Warudo 0.15.1 씬(Avatar_MediaPipe_Reference)에서 확인한 값.
export const ARKIT = ["eyeBlinkLeft","eyeBlinkRight","eyeLookDownLeft","eyeLookDownRight","eyeLookInLeft","eyeLookInRight","eyeLookOutLeft","eyeLookOutRight","eyeLookUpLeft","eyeLookUpRight","eyeSquintLeft","eyeSquintRight","eyeWideLeft","eyeWideRight","jawLeft","jawRight","jawForward","jawOpen","mouthLeft","mouthRight","mouthSmileLeft","mouthSmileRight","mouthFrownLeft","mouthFrownRight","mouthDimpleLeft","mouthDimpleRight","mouthStretchLeft","mouthStretchRight","mouthPressLeft","mouthPressRight","mouthLowerDownLeft","mouthLowerDownRight","mouthUpperUpLeft","mouthUpperUpRight","mouthClose","mouthFunnel","mouthPucker","mouthRollLower","mouthRollUpper","mouthShrugLower","mouthShrugUpper","browDownLeft","browDownRight","browOuterUpLeft","browOuterUpRight","browInnerUp","cheekSquintLeft","cheekSquintRight","cheekPuff","noseSneerLeft","noseSneerRight","tongueOut"];
// SDK GenericTrackerAsset.MirroredBlendShapesMapping 그대로
const MIR_PAIRS = [["eyeBlinkLeft","eyeBlinkRight"],["eyeLookDownLeft","eyeLookDownRight"],["eyeLookInLeft","eyeLookInRight"],["eyeLookOutLeft","eyeLookOutRight"],["eyeLookUpLeft","eyeLookUpRight"],["eyeSquintLeft","eyeSquintRight"],["eyeWideLeft","eyeWideRight"],["jawLeft","jawRight"],["mouthLeft","mouthRight"],["mouthSmileLeft","mouthSmileRight"],["mouthFrownLeft","mouthFrownRight"],["mouthDimpleLeft","mouthDimpleRight"],["mouthStretchLeft","mouthStretchRight"],["mouthRollLower","mouthRollUpper"],["mouthShrugLower","mouthShrugUpper"],["mouthPressLeft","mouthPressRight"],["mouthLowerDownLeft","mouthLowerDownRight"],["mouthUpperUpLeft","mouthUpperUpRight"],["browDownLeft","browDownRight"],["browOuterUpLeft","browOuterUpRight"],["cheekSquintLeft","cheekSquintRight"],["noseSneerLeft","noseSneerRight"]];
export const MIRROR = {}; for (const [a, b] of MIR_PAIRS) { MIRROR[a] = b; MIRROR[b] = a; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const clamp01 = v => clamp(v, 0, 1);

// ---- 설정 스키마: key는 Warudo SDK 필드명(= 씬 파일 dataInputs 키로 추정) ----
// src: real(실제 Warudo 씬으로 확인) / doc(문서) / sdk(SDK 기본값) / inferred(추정) / ours(우리 전용, Warudo에 없음)
export const SCHEMA = [
 // MediaPipe Tracker (GenericTrackerAsset)
 { sec: 'tracker', key: 'MirroredTracking', en: 'Mirrored Tracking', ko: '추적 좌우 반전', type: 'bool', def: false, src: 'real' },
 { sec: 'tracker', key: 'BlendShapeSensitivity', en: 'Global BlendShape Sensitivity', ko: '전체 블렌드쉐이프 민감도', type: 'num', min: 0.5, max: 2, step: 0.01, def: 1, src: 'real' },
 { sec: 'tracker', key: 'ClampAllBlendShapes', en: 'Clamp All BlendShapes', ko: '블렌드쉐이프 0~1 제한', type: 'bool', def: true, src: 'real' },
 { sec: 'tracker', key: 'HeadMovementIntensity', en: 'Head Movement Intensity', ko: '머리 이동 강도', type: 'vec3', min: 0, max: 5, step: 0.1, def: [2, 2, 2], src: 'real' },
 { sec: 'tracker', key: 'MaximalHeadTranslation', en: 'Maximal Head Translation', ko: '최대 머리 이동(m)', type: 'vec3', min: 0, max: 1, step: 0.01, def: [0.5, 0.5, 0.5], src: 'real' },
 { sec: 'tracker', key: 'HeadRotationIntensity', en: 'Head Rotation Intensity', ko: '머리 회전 강도', type: 'vec3', min: 0, max: 3, step: 0.05, def: [1, 1, 1], src: 'real' },
 { sec: 'tracker', key: 'HeadRotationOffset', en: 'Head Rotation Offset', ko: '머리 회전 오프셋(°)', type: 'vec3', min: -45, max: 45, step: 1, def: [0, 0, 0], src: 'real' },
 { sec: 'tracker', key: 'BodyMovementIntensity', en: 'Body Movement Intensity', ko: '몸 이동 강도', type: 'num', min: 0, max: 1, step: 0.01, def: 0.5, src: 'real' },
 { sec: 'tracker', key: 'BodyRotationType', en: 'Body Rotation Type', ko: '몸 회전 방식', type: 'enum', opts: [['None', '없음'], ['Normal', '같은 방향'], ['Inverted', '반대(Z축만)'], ['Custom', '직접 지정']], def: 'Inverted', src: 'real' },
 { sec: 'tracker', key: 'BodyRotationIntensity', en: 'Body Rotation Intensity', ko: '몸 회전 강도', type: 'num', min: 0, max: 1, step: 0.01, def: 0.5, src: 'real' },
 { sec: 'tracker', key: 'BodyRotationDirection', en: 'Body Rotation Direction (Custom)', ko: '몸 회전 축별 방향·크기', type: 'vec3', min: -1, max: 1, step: 0.05, def: [0.5, 1, 0.5], src: 'real' },
 { sec: 'tracker', key: 'BodyRotationNeckCompensation', en: 'Neck Compensation', ko: '목 보정', type: 'num', min: 0, max: 1, step: 0.01, def: 0.75, src: 'real' },
 { sec: 'tracker', key: 'BodyRotationSpineRotationIntensity', en: 'Spine Rotation Intensity', ko: '허리(spine) 회전 비율', type: 'num', min: 0, max: 1, step: 0.01, def: 0.5, src: 'real' },
 { sec: 'tracker', key: 'BodyRotationChestRotationIntensity', en: 'Chest Rotation Intensity', ko: '가슴 회전 비율', type: 'num', min: 0, max: 1, step: 0.01, def: 0.25, src: 'real' },
 { sec: 'tracker', key: 'BodyRotationHipsRotationIntensity', en: 'Hips Rotation Intensity', ko: '골반 회전 비율', type: 'num', min: 0, max: 1, step: 0.01, def: 0, src: 'real' },
 { sec: 'tracker', key: 'BodyRotationDelayDuration', en: 'Body Rotation Delay Duration', ko: '몸 회전 지연(초)', type: 'num', min: 0, max: 1, step: 0.01, def: 0, src: 'real' },
 { sec: 'tracker', key: 'BodyRotationSmoothingDuration', en: 'Body Rotation Smoothing Duration', ko: '몸 회전 부드럽게(초)', type: 'num', min: 0, max: 1, step: 0.01, def: 0, src: 'real' },
 { sec: 'tracker', key: 'EyeMovementIntensity', en: 'Eye Movement Intensity', ko: '눈동자 움직임 강도', type: 'vec2', min: 0, max: 3, step: 0.05, def: [1, 1], src: 'real' },
 { sec: 'tracker', key: 'EyeMovementHeadRotationCompensation', en: 'Eye Movement Head Rotation Compensation', ko: '머리 회전 시선 보정', type: 'vec2', min: 0, max: 1, step: 0.05, def: [0, 0], src: 'real' },
 { sec: 'tracker', key: 'EyeBlinkSensitivity', en: 'Eye Blink Sensitivity', ko: '눈 깜빡임 민감도', type: 'num', min: 1, max: 3, step: 0.01, def: 1.2, src: 'real' },
 { sec: 'tracker', key: 'LinkedEyeBlinking', en: 'Linked Eye Blinking', ko: '양눈 같이 깜빡임', type: 'bool', def: false, src: 'real' },
 { sec: 'tracker', key: 'UseBonesForEyeMovement', en: 'Use Bones For Eye Movement', ko: '눈 뼈로 시선', type: 'bool', def: true, src: 'real' },
 { sec: 'tracker', key: 'UseBlendShapesForEyeMovement', en: 'Use BlendShapes For Eye Movement', ko: '블렌드쉐이프로 시선', type: 'bool', def: false, src: 'real' },
 { sec: 'tracker', key: 'CalibrateEyeMovement', en: 'Calibrate Eye Movement', ko: '보정 시 시선도 보정', type: 'bool', def: true, src: 'real' },
 { sec: 'tracker', key: 'ConvertToVRMEyeBlendShapes', en: 'Convert ARKit Look → VRM LookUp/Down/Left/Right (hidden)', ko: '시선을 VRM Look 표정으로도 보냄', type: 'bool', def: true, src: 'real' },
 // 얼굴 추적 Blueprint (온보딩 Customize Face Tracking)
 { sec: 'bp', key: 'BlendShapeMappingType', en: 'BlendShape Mapping', ko: '블렌드쉐이프 매핑', type: 'enum', opts: [['Auto', '자동 감지'], ['VRM', 'VRM'], ['ARKit', 'ARKit (Perfect Sync)']], def: 'Auto', src: 'real' },
 { sec: 'bp', key: 'EnableHeadAndBodyMovements', en: 'Enable Head and Body Movements', ko: '머리·몸 움직임', type: 'bool', def: true, src: 'real' },
 { sec: 'bp', key: 'IdleAutoBlinking', en: 'Idle Head Animation: Auto Blinking', ko: '자동 깜빡임', type: 'bool', def: true, src: 'real' },
 { sec: 'bp', key: 'IdleAutoEyeMovements', en: 'Idle Head Animation: Auto Eye Movements', ko: '자동 눈 움직임', type: 'bool', def: true, src: 'real' },
 { sec: 'bp', key: 'IdleAutoHeadMovements', en: 'Idle Head Animation: Auto Head Movements', ko: '자동 머리 움직임', type: 'bool', def: true, src: 'real' },
 { sec: 'bp', key: 'LookAt', en: 'Look At', ko: '카메라 눈맞춤', type: 'bool', def: true, src: 'real' },
 { sec: 'bp', key: 'LipSync', en: 'Lip Sync', ko: '립싱크(마이크)', type: 'enum', opts: [['Disabled', '끔'], ['WhenTrackingLost', '추적 끊길 때만'], ['Always', '항상']], def: 'Disabled', src: 'real' },
 // 실제 Blueprint 그래프 노드 값 (Face Tracking - MediaPipe)
 { sec: 'bp', key: 'BlendShapeSmoothTime', en: 'Smooth BlendShapes: Smooth Time', ko: '표정 부드럽게(초)', type: 'num', min: 0, max: 1, step: 0.01, def: 0.2, src: 'real' },
 { sec: 'bp', key: 'BoneSmoothTime', en: 'Smooth Rotations: Smooth Time', ko: '머리·몸 회전 부드럽게(초)', type: 'num', min: 0, max: 2, step: 0.01, def: 0.6, src: 'real' },
 { sec: 'bp', key: 'RootSmoothTime', en: 'Smooth Position: Smooth Time', ko: '몸 위치 부드럽게(초)', type: 'num', min: 0, max: 2, step: 0.01, def: 0.6, src: 'real' },
 { sec: 'bp', key: 'LostTransitionTime', en: 'Switch BlendShape List / Rotations: Transition Time', ko: '추적 끊김·복귀 전환(초)', type: 'num', min: 0, max: 2, step: 0.01, def: 0.4, src: 'real' },
 { sec: 'bp', key: 'IdleTransitionTime', en: 'Switch Float (idle / Look At weight): Transition Time', ko: '대기 동작·눈맞춤 전환(초)', type: 'num', min: 0, max: 5, step: 0.1, def: 2, src: 'real' },
 { sec: 'bp', key: 'IdleBlinkInterval', en: 'Generate Head & Eyes Motion: Blink Interval', ko: '자동 깜빡임 간격(초, 최소·최대)', type: 'vec2', min: 0, max: 30, step: 0.1, def: [1, 10], src: 'real' },
 { sec: 'bp', key: 'IdleBlinkSpeed', en: 'Blink Speed', ko: '자동 깜빡임 속도', type: 'num', min: 0.1, max: 3, step: 0.05, def: 1, src: 'real' },
 { sec: 'bp', key: 'IdleLookWeight', en: 'Look Weight', ko: '대기 시선 세기', type: 'num', min: 0, max: 1, step: 0.01, def: 0.5, src: 'real' },
 { sec: 'bp', key: 'IdleMaxLookAngles', en: 'Max Look Angles', ko: '대기 시선 최대각(°)', type: 'vec4', axes: ['Up', 'Down', 'Left', 'Right'], min: 0, max: 30, step: 0.5, def: [4, 10, 15, 15], src: 'real' },
 { sec: 'bp', key: 'IdleLookAroundInterval', en: 'Look Around Interval', ko: '대기 둘러보기 간격(초)', type: 'vec2', min: 0, max: 60, step: 0.5, def: [8, 30], src: 'real' },
 { sec: 'bp', key: 'IdleMaxLookAroundAngle', en: 'Max Look Around Angle', ko: '대기 둘러보기 최대각(°)', type: 'num', min: 0, max: 45, step: 0.5, def: 10, src: 'real' },
 { sec: 'bp', key: 'IdleHeadTilt', en: 'Head Tilt', ko: '대기 머리 기울기(°)', type: 'vec3', min: -45, max: 45, step: 0.5, def: [0, 0, 0], src: 'real' },
 { sec: 'bp', key: 'SmoothingMode', en: 'smoothing method', ko: '부드럽게 방식', type: 'enum', opts: [['Warudo', 'Warudo 그래프와 같게'], ['OneEuro', '우리 방식 (반응 빠름)']], def: 'Warudo', src: 'ours' },
 // 입 (우리 전용 확장: Warudo VRM 그래프 공식 위에 더함. 다양성 0·감도 1·부드럽게 0.2 = Warudo 그대로)
 { sec: 'mouth', key: 'MouthMode', en: 'mouth mapping', ko: '입 매핑 방식', type: 'enum', opts: [['Extended', '확장 (Warudo 공식 + 이 아바타의 입 모양 더 쓰기)'], ['Warudo', 'Warudo 그래프 그대로']], def: 'Extended', src: 'ours' },
 { sec: 'mouth', key: 'MouthGain', en: 'mouth sensitivity', ko: '입 감도 (모음 세기 배율)', type: 'num', min: 0.5, max: 2.5, step: 0.05, def: 1, src: 'ours' },
 { sec: 'mouth', key: 'MouthVariety', en: 'mouth shape variety', ko: '입 모양 다양성 (에·미소·찡그림·입 다물기)', type: 'num', min: 0, max: 1.5, step: 0.05, def: 1, src: 'ours' },
 { sec: 'mouth', key: 'MouthSmoothTime', en: 'mouth smooth time', ko: '입 부드럽게(초, 작을수록 빠름)', type: 'num', min: 0, max: 0.4, step: 0.01, def: 0.06, src: 'ours' },
 { sec: 'mouth', key: 'MouthAsymmetry', en: 'one-sided mouth', ko: '한쪽 입꼬리 반영 (좌우 따로)', type: 'bool', def: true, src: 'ours' },
 // Character Look At Target 노드 (실제 씬의 얼굴 추적 Blueprint에 있음, 대상 = Camera 1)
 { sec: 'look', key: 'LookAtNodeWeight', en: 'Weight', ko: '눈맞춤 세기 (실제 씬: 추적 상태에 연결됨 → 추적 중 1)', type: 'num', min: 0, max: 1, step: 0.05, def: 1, src: 'real' },
 { sec: 'look', key: 'LookAtNodeHeadWeight', en: 'Head Weight', ko: '머리 비중', type: 'num', min: 0, max: 1, step: 0.01, def: 0.66, src: 'real' },
 { sec: 'look', key: 'LookAtNodeEyesWeight', en: 'Eyes Weight', ko: '눈 비중', type: 'num', min: 0, max: 1, step: 0.01, def: 0.33, src: 'real' },
 { sec: 'look', key: 'MaximumLookAtAngle', en: 'Maximum Look At Angle', ko: '최대 눈맞춤 각도(°)', type: 'num', min: 0, max: 180, step: 1, def: 135, src: 'real' },
 { sec: 'look', key: 'MaximalHeadRotation', en: 'Maximal Head Rotation', ko: '최대 머리 회전(°)', type: 'vec3', min: 0, max: 90, step: 1, def: [30, 30, 30], src: 'real' },
 { sec: 'look', key: 'MaximalEyeRotation', en: 'Maximal Eye Rotation', ko: '최대 눈 회전(°)', type: 'vec2', min: 0, max: 45, step: 1, def: [10, 5], src: 'real' },
 { sec: 'look', key: 'SmoothHeadTime', en: 'Smooth Head Time', ko: '머리 따라가기 속도', type: 'num', min: 0, max: 10, step: 0.1, def: 3.5, src: 'real' },
 { sec: 'look', key: 'SmoothEyesTime', en: 'Smooth Eyes Time', ko: '눈 따라가기 속도', type: 'num', min: 0, max: 10, step: 0.1, def: 2, src: 'real' },
 // Character 에셋
 { sec: 'char', key: 'LookAtEnabled', en: 'Look At IK', ko: 'Look At IK (카메라 보기)', type: 'bool', def: false, src: 'real' },
 { sec: 'char', key: 'LookAtWeight', en: 'Weight', ko: '전체 세기', type: 'num', min: 0, max: 1, step: 0.05, def: 0.5, src: 'real' },
 { sec: 'char', key: 'LookAtHeadWeight', en: 'Head Weight', ko: '머리', type: 'num', min: 0, max: 1, step: 0.05, def: 1, src: 'real' },
 { sec: 'char', key: 'LookAtEyesWeight', en: 'Eyes Weight', ko: '눈', type: 'num', min: 0, max: 1, step: 0.05, def: 1, src: 'real' },
 { sec: 'char', key: 'LookAtBodyWeight', en: 'Body Weight', ko: '몸', type: 'num', min: 0, max: 1, step: 0.05, def: 1, src: 'real' },
 { sec: 'char', key: 'LookAtClampHeadWeight', en: 'Clamp Head Weight', ko: '머리 제한', type: 'num', min: 0, max: 1, step: 0.05, def: 0.7, src: 'real' },
 { sec: 'char', key: 'LookAtClampEyesWeight', en: 'Clamp Eyes Weight', ko: '눈 제한', type: 'num', min: 0, max: 1, step: 0.05, def: 0.8, src: 'real' },
 { sec: 'char', key: 'LookAtClampBodyWeight', en: 'Clamp Body Weight', ko: '몸 제한', type: 'num', min: 0, max: 1, step: 0.05, def: 0.6, src: 'real' },
 { sec: 'char', key: 'BreathingEnabled', en: 'Breathing Animation', ko: '숨쉬기', type: 'bool', def: false, src: 'real' },
 { sec: 'char', key: 'BreathingExertion', en: 'Breathing Exertion', ko: '숨 세기', type: 'num', min: 0, max: 1, step: 0.01, def: 0.1, src: 'real' },
 { sec: 'char', key: 'BreathingRate', en: 'Breathing Rate', ko: '숨 빠르기(회/초)', type: 'num', min: 0, max: 2, step: 0.01, def: 0.25, src: 'real' },
 { sec: 'char', key: 'SwayingEnabled', en: 'Swaying Animation', ko: '흔들림', type: 'bool', def: false, src: 'real' },
 { sec: 'char', key: 'SwayingIntensity', en: 'Swaying Intensity', ko: '흔들림 세기', type: 'num', min: 0, max: 1, step: 0.01, def: 0.25, src: 'real' },
 // Camera 에셋
 { sec: 'cam', key: 'FieldOfView', en: 'Field Of View', ko: '시야각(°)', type: 'num', min: 10, max: 90, step: 1, def: 35, src: 'real' },
 { sec: 'cam', key: 'TransparentBackground', en: 'Transparent Background', ko: '투명 배경', type: 'bool', def: false, src: 'real' },
 { sec: 'cam', key: 'ChromaKeyColor', en: 'Chroma Key Color', ko: '크로마키 색', type: 'color', def: '#00ff00', src: 'real' },
 { sec: 'cam', key: 'Brightness', en: 'Brightness', ko: '밝기(후처리)', type: 'num', min: 0, max: 2, step: 0.01, def: 1.05, src: 'real' },
 { sec: 'cam', key: 'Contrast', en: 'Contrast', ko: '대비(후처리)', type: 'num', min: 0, max: 2, step: 0.01, def: 1.02, src: 'real' },
 { sec: 'cam', key: 'Vibrance', en: 'Vibrance', ko: '선명도(후처리, 근사)', type: 'num', min: 0, max: 2, step: 0.01, def: 1, src: 'real' },
 // 우리 전용 (Warudo에 대응 없음)
 { sec: 'ours', key: 'smooth', en: 'One-Euro smoothing', ko: '부드러움 (One-Euro 방식일 때)', type: 'num', min: 0, max: 1, step: 0.01, def: 0.55, src: 'ours' },
 { sec: 'ours', key: 'beta', en: 'fast-motion response', ko: '빠른 움직임 반응', type: 'num', min: 0, max: 1, step: 0.01, def: 0.5, src: 'ours' },
 { sec: 'ours', key: 'idleAnim', en: 'idle animation (approx.)', ko: '숨쉬기 대기 애니메이션 (근사)', type: 'bool', def: true, src: 'ours' },
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
// SDK MappingData 기본값은 0,1,0,1. 아래는 실제 Warudo 0.15.1 MediaPipe Tracker가 넣은 초기 매핑 (real, 52줄 중 다른 5줄)
export const MEDIAPIPE_INITIAL = { eyeBlinkLeft: [0.3, 0.7, 0, 1], eyeBlinkRight: [0.3, 0.7, 0, 1], jawOpen: [0, 1, -0.15, 1], mouthFunnel: [0, 1, -0.15, 1], mouthPucker: [0, 1, -0.15, 1] };
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

// ---- 실제 Warudo 얼굴 추적 Blueprint(VRM 매핑)의 ARKit → VRM 변환 (real: 노드·상수·연결 그대로) ----
// aa = jawOpen×1.2 − mouthFunnel / oh = mouthFunnel×3 + (mouthLowerDownL+R)×0.5 / ih = (mouthSmileL+R)×2 × jawOpen / ou = mouthPucker
// blinkLeft/Right = eyeBlinkLeft/Right, LookUp/Down/Left/Right = 트래커가 변환한 값, Brows up = browInnerUp, Brows down = browDownLeft. ee는 설정 안 함.
// Set BlendShape: Clamp = true (0~1). 그 뒤 Constrain BlendShape 4개: aa→oh, ih→oh, aa→ih, ou→(ih,aa,oh)
export const VRM_GRAPH_CONSTRAINTS = [['aa', ['oh']], ['ih', ['oh']], ['aa', ['ih']], ['ou', ['ih', 'aa', 'oh']]];
// Constrain 노드: 제약값이 Min→Max로 갈수록 대상의 허용 최대가 ConstrainedValueMax→ConstrainedValueMin으로 줄어듦
// (실제 값 0,1,1,0 → 대상 ≤ 1 − 제약값. 노드 내부 공식은 비공개라 inferred)
export function constrain(vals, constraint, targets, cMin = 0, cMax = 1, tMax = 1, tMin = 0) {
  const t = clamp01((vals[constraint] - cMin) / ((cMax - cMin) || 1));
  const lim = tMax + (tMin - tMax) * t;
  for (const n of targets) if (n in vals) vals[n] = Math.min(vals[n], lim);
  return vals;
}
// ConvertToVRMEyeBlendShapes(real: 켜짐): ARKit 시선 → VRM Look 블렌드쉐이프. 합치는 방법은 비공개 → 양눈 평균 (inferred)
export function arkitLookToVRM(bs) {
  const a = (x, y) => ((bs[x] || 0) + (bs[y] || 0)) / 2;
  return { LookUp: a('eyeLookUpLeft', 'eyeLookUpRight'), LookDown: a('eyeLookDownLeft', 'eyeLookDownRight'), LookLeft: a('eyeLookOutLeft', 'eyeLookInRight'), LookRight: a('eyeLookInLeft', 'eyeLookOutRight') };
}
export function vrmFromArkit(bs, cfg = {}) {
  const g = n => bs[n] || 0;
  const look = cfg.ConvertToVRMEyeBlendShapes === false ? { LookUp: 0, LookDown: 0, LookLeft: 0, LookRight: 0 } : arkitLookToVRM(bs);
  const v = { ...look, blinkLeft: g('eyeBlinkLeft'), blinkRight: g('eyeBlinkRight'),
    aa: g('jawOpen') * 1.2 - g('mouthFunnel'), oh: g('mouthFunnel') * 3 + (g('mouthLowerDownLeft') + g('mouthLowerDownRight')) * 0.5,
    ih: (g('mouthSmileLeft') + g('mouthSmileRight')) * 2 * (g('jawOpen') / 1) - 0, ou: g('mouthPucker'),
    'Brows up': g('browInnerUp'), 'Brows down': g('browDownLeft') };
  for (const k in v) v[k] = clamp01(v[k]);
  for (const [c, t] of VRM_GRAPH_CONSTRAINTS) constrain(v, c, t);
  return v;
}
// ---- 확장 입 매핑 (우리 전용, inferred) ----
// ARKit 입 셰이프가 없는 VRM 아바타용. Warudo 그래프의 aa/ih/ou/oh를 그대로 두고 그 위에:
//  ee = 입 벌린 채 옆으로 당김(mouthStretch), smile/frown = 좌우 따로(입꼬리), 입 다물기(mouthClose·Press·Roll)는 벌린 모음을 줄임.
//  MouthVariety 0, MouthGain 1이면 Warudo 결과와 같음.
export function mouthExtended(bs, cfg = {}) {
  const g = n => bs[n] || 0;
  const V = cfg.MouthMode === 'Warudo' ? 0 : (cfg.MouthVariety ?? 1), G = cfg.MouthMode === 'Warudo' ? 1 : (cfg.MouthGain ?? 1);
  const w = vrmFromArkit(bs, cfg);
  const jaw = g('jawOpen');
  const close = clamp01(g('mouthClose') * 2.5 + (g('mouthPressLeft') + g('mouthPressRight')) * 0.6 + (g('mouthRollLower') + g('mouthRollUpper')) * 0.6) * Math.min(1, V);
  const open = 1 - close;
  const o = { aa: w.aa * open, ih: w.ih * open, ou: w.ou * (1 - close * 0.5), oh: w.oh * open, ee: 0 };
  // '이'는 미소+당김, '에'는 당김만 → 미소가 클수록 ee를 줄여 ih와 구분
  o.ee = clamp01((g('mouthStretchLeft') + g('mouthStretchRight')) * 1.5 * clamp01(jaw * 5) * (1 - clamp01((g('mouthSmileLeft') + g('mouthSmileRight')) * 0.75))) * V * open;
  for (const k of ['aa', 'ih', 'ou', 'oh', 'ee']) o[k] = clamp01(o[k] * G);
  if (V > 0) { constrain(o, 'aa', ['ee'], 0, 1, 1, 0.3); const sum = o.aa + o.ih + o.ou + o.oh + o.ee; if (sum > 1.3) for (const k of ['aa', 'ih', 'ou', 'oh', 'ee']) o[k] *= 1.3 / sum; }
  // 입꼬리: 벌린 입(aa)이 클수록 줄여서 모음과 덜 겹치게
  const keep = 1 - 0.5 * o.aa;
  let sL = clamp01((g('mouthSmileLeft') * 1.3 - 0.05)) * V * keep, sR = clamp01((g('mouthSmileRight') * 1.3 - 0.05)) * V * keep;
  let fL = clamp01(g('mouthFrownLeft') * 1.5) * V, fR = clamp01(g('mouthFrownRight') * 1.5) * V;
  if (cfg.MouthAsymmetry === false) { sL = sR = (sL + sR) / 2; fL = fR = (fL + fR) / 2; }
  // smileOpen: 미소를 '벌린 입 미소'로 보일 비율 (나머지는 '다문 입 미소')
  // 윗입술 올림(mouthUpperUp, 이가 보이는 미소)도 '벌린 미소'로
  const smileOpen = clamp01(Math.max((jaw - 0.08) * 4, ((g('mouthUpperUpLeft') + g('mouthUpperUpRight')) / 2 - 0.25) * 2.5)) * open;
  Object.assign(o, { smileL: clamp01(sL), smileR: clamp01(sR), frownL: clamp01(fL), frownR: clamp01(fR), close, smileOpen });
  return o;
}
// 입 관련 표정 찾기 (이름 규칙, inferred): smile = *happy_mouth / *smile_mouth, frown = *sad_mouth, 혀 = *tongue*
export function findMouthChannels(names) {
  const f = re => names.find(n => re.test(n)) || null;
  // smile = 벌린 입 미소(happy), smileClosed = 다문 입 미소(relaxed). 둘 다 있으면 입 벌림 정도로 섞음
  return { smile: f(/(^|_)(happy|smile)_?mouth$|^mouth_?smile$/i), smileClosed: f(/(^|_)relaxed_?mouth$|^mouth_?smile_?closed$/i), frown: f(/(^|_)(sad|frown)_?mouth$|^mouth_?frown$/i), tongue: names.filter(n => /tongue|베롱|혀/i.test(n)) };
}
// 표정 하나를 좌우로 나눈 블렌드쉐이프 가중치: x(아바타 왼쪽 +) 기준으로 가운데에서 부드럽게 나눔. 합은 항상 1
export function sideWeight(x, mid, width) { const t = clamp01((x - mid) / (width || 1e-6) + 0.5); const sm = t * t * (3 - 2 * t); return [sm, 1 - sm]; }

// ---- Smooth 노드 (SmoothTime): Unity SmoothDamp와 같은 임계 감쇠 (이름이 같아 SmoothDamp로 추정, inferred) ----
export function smoothDamp(cur, target, st, smoothTime, dt) {
  smoothTime = Math.max(0.0001, smoothTime);
  const omega = 2 / smoothTime, x = omega * dt, exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = cur - target, temp = (st.v + omega * change) * dt;
  st.v = (st.v - omega * temp) * exp;
  return target + (change + temp) * exp;
}
export class SmoothBank { constructor() { this.m = new Map(); } run(k, target, smoothTime, dt) { let s = this.m.get(k); if (!s) { s = { x: target, v: 0 }; this.m.set(k, s); return target; } if (smoothTime <= 0) { s.x = target; s.v = 0; return target; } s.x = smoothDamp(s.x, target, s, smoothTime, dt); return s.x; } reset() { this.m.clear(); } }
// ---- Switch 노드 전환 (real: InOutSine) ----
export const easeInOutSine = t => -(Math.cos(Math.PI * clamp01(t)) - 1) / 2;
export class Switch { // 조건이 바뀌면 transition 시간 동안 0↔1을 InOutSine으로
  constructor(v = 0) { this.from = v; this.to = v; this.t0 = -1e9; }
  set(on, now) { const tv = on ? 1 : 0; if (tv !== this.to) { this.from = this.value; this.to = tv; this.t0 = now; this._cur = undefined; } }
  get value() { return this._cur ?? this.to; }
  update(now, dur) { const p = dur > 0 ? clamp01((now - this.t0) / dur) : 1; this._cur = this.from + (this.to - this.from) * easeInOutSine(p); return this._cur; }
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

// ---- VRM 표정 가져오기 ----
// real (사용자 VRM 1.0 아바타): Warudo 표정 이름 = VRM 표정 이름 그대로 (happy, angry, sad, relaxed, surprised, 그 뒤 추가 표정)
// 레이어: 기본 5개는 0, 추가 표정은 파일 순서대로 1, 2, 3…  / 페이드 0.4초, Is Binary 꺼짐, 조건 없음
// Disable Eye Blink / Mouth Tracking = VRM overrideBlink / overrideMouth 가 none이 아님 (23개 전부 일치), Brow는 VRM에 없어 항상 꺼짐
// VRM 0.x 이름(Joy, Sorrow, Fun)은 실제 자료가 없어 문서 표기를 따름 (inferred)
export const VRM_PRESET_NAMES = { happy: 'Joy', angry: 'Angry', sad: 'Sorrow', relaxed: 'Fun', surprised: 'Surprised' };
const NON_EXPR = new Set(['aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight', 'lookUp', 'lookDown', 'lookLeft', 'lookRight', 'neutral']);
// 표정 단축키 (real: 온보딩이 만든 Expression Key Bindings 그래프) — Alt + 1 2 … 0 - = Q W E R T Y U I O P [ , Alt+Backspace = 모두 끄기
export const HOTKEY_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[',
  // 24번째부터는 실제 자료(23개)에 없어서 키보드 순서대로 이어 붙임 (inferred)
  ']', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.'];
export function importVrmExpressions(names, opt = {}) {
  const vrm0 = opt.vrm0 === undefined ? false : opt.vrm0, ov = opt.overrides || {};
  const list = []; let layer = 1;
  const mk = (name, vrmName, L) => { const e = newExpression(name, vrmName, L); const o = ov[vrmName] || {}; e.DisableEyeBlinkTracking = !!o.blink && o.blink !== 'none'; e.DisableMouthTracking = !!o.mouth && o.mouth !== 'none'; return e; };
  for (const k of ['happy', 'angry', 'sad', 'relaxed', 'surprised']) if (names.includes(k)) list.push(mk(vrm0 ? VRM_PRESET_NAMES[k] : k, k, 0));
  const arkit = new Set(ARKIT.map(n => n.toLowerCase()));
  for (const n of names) if (!NON_EXPR.has(n) && !VRM_PRESET_NAMES[n] && !['happy', 'angry', 'sad', 'relaxed', 'surprised'].includes(n) && !arkit.has(n.toLowerCase())) list.push(mk(n, n, layer++));
  list.forEach((e, i) => { e.Hotkey = HOTKEY_KEYS[i] ? 'Alt+' + HOTKEY_KEYS[i] : ''; });
  return list;
}
// ARKit(Perfect Sync) 자동 감지: 모델 표정 이름 중 ARKit 이름이 절반(26개) 이상이면 ARKit (기준 inferred)
export function detectMapping(names) {
  const hit = Object.keys(matchPerfectSync(names).map).length;
  return { type: hit >= PS_AUTO_MIN ? 'ARKit' : 'VRM', hit };
}

// ---- 퍼펙트싱크 (v5, 우리 확장 / Warudo ARKit 매핑과 같은 1:1 연결) ----
// 아바타 셰이프 이름의 흔한 변형을 ARKit 52 이름에 맞춤:
//   대소문자, 구분자(_ - . 공백), 끝의 _L/_R·L/R → Left/Right, 접두사(blendShape1. / BS_ / ARKit_ 등 → 뒤쪽이 ARKit 이름이면 인정)
export const PS_AUTO_MIN = 26; // Auto: 52개 중 절반 이상 찾으면 ARKit(퍼펙트싱크) 경로 (우리 기준, inferred)
const CANON = n => n.toLowerCase().replace(/[^a-z0-9]/g, '');
const ARKIT_CANON = Object.fromEntries(ARKIT.map(n => [CANON(n), n]));
const ARKIT_CANON_KEYS = Object.keys(ARKIT_CANON).sort((a, b) => b.length - a.length);
export function canonShape(name) {
  let s = String(name ?? '');
  const dot = s.lastIndexOf('.'); if (dot >= 0 && s.length - dot > 3) s = s.slice(dot + 1); // blendShape1.eyeBlinkLeft → eyeBlinkLeft (끝이 .L 같은 짧은 건 유지)
  s = s.replace(/[_\-. ]([LRlr])$/, (m, c) => (c.toUpperCase() === 'L' ? 'Left' : 'Right')).replace(/([a-z0-9])([LR])$/, (m, a, c) => a + (c === 'L' ? 'Left' : 'Right'));
  return CANON(s);
}
// 이름 하나 → ARKit 이름 (없으면 null)
export function arkitOf(name) {
  const c = canonShape(name);
  if (ARKIT_CANON[c]) return ARKIT_CANON[c];
  for (const k of ARKIT_CANON_KEYS) if (c.endsWith(k) && c.length - k.length <= 14) { const pre = c.slice(0, c.length - k.length); if (/^(blendshape\d*|blendshapes|bs|arkit|ps|perfectsync|face|facial|head|body|shape|morph|exp|mesh\d*|[a-z]{0,4}\d*)$/.test(pre)) return ARKIT_CANON[k]; }
  return null;
}
// names(표정 이름 또는 블렌드쉐이프 이름 목록) → { map: {arkit: 원래이름}, hit, missing }. 정확히 같은 이름 우선
export function matchPerfectSync(names, already = {}) {
  const map = { ...already }; const exact = new Map(); for (const n of names) if (!exact.has(String(n).toLowerCase())) exact.set(String(n).toLowerCase(), n);
  for (const a of ARKIT) if (!map[a] && names.includes(a)) map[a] = a;
  for (const a of ARKIT) if (!map[a] && exact.has(a.toLowerCase())) map[a] = exact.get(a.toLowerCase());
  for (const n of names) { const a = arkitOf(n); if (a && !map[a]) map[a] = n; }
  const missing = ARKIT.filter(a => !map[a]);
  return { map, hit: ARKIT.length - missing.length, missing };
}
// 셰이프별 보정: 중립 얼굴 빼기 → × 게인 + 오프셋 → 0~1 (기본 게인 1·오프셋 0·중립 0 = Warudo와 같음)
export function defaultPSCal() { return { gain: {}, offset: {}, neutral: {} }; }
export function psCalibrate(bs, cal, clamp = true) {
  const out = {};
  for (const n of ARKIT) {
    let v = bs[n] || 0; const nz = cal?.neutral?.[n] || 0;
    if (nz > 0 && nz < 0.95) v = Math.max(0, (v - nz) / (1 - nz));
    v = v * (cal?.gain?.[n] ?? 1) + (cal?.offset?.[n] ?? 0);
    out[n] = clamp ? clamp01(v) : v;
  }
  return out;
}
// 중립 얼굴 표본들 → 셰이프별 평균 (시선 eyeLook*은 시선 보정이 따로 있어서 제외)
export function neutralFrom(samples) {
  const nz = {}; if (!samples.length) return nz;
  for (const n of ARKIT) { if (n.startsWith('eyeLook')) continue; const m = samples.reduce((a, s) => a + (s[n] || 0), 0) / samples.length; if (m > 0.005) nz[n] = +m.toFixed(4); }
  return nz;
}

// ---- Warudo 씬/프로필 JSON 가져오기 ----
// real (Warudo 0.15.1 씬 파일): { name, appVersion, assets:[{typeId,name,id,dataInputs:{키:{type,typeKind,value,properties,key}}}], graphs:[{name,nodes:{id:{typeId,name,dataInputs}},dataConnections,flowConnections}] }
// value는 JSON 문자열: 숫자 "1.0", 문자열 "\"x\"", 벡터 "{\"x\":2.0,...}", enum "{\"label\":\"Inverted\",\"value\":2,...}",
// 구조체(StructuredData)는 다시 {header,id,dataInputs,...}의 JSON 문자열, 배열은 그 배열의 JSON 문자열.
export const MEDIAPIPE_TRACKER_TYPE_ID = 'e3beded4-4cf2-43c4-bc8a-80be02d8d823'; // real
export const CHARACTER_TYPE_ID = '726ab674-a550-474e-8b92-66526a5ad55e'; // real
export const CAMERA_TYPE_ID = '6a05ecf3-1501-4cab-b9d7-84131b881a29'; // real
const ENUMS = { BodyRotationType: ['None', 'Normal', 'Inverted', 'Custom'] };
function parseVal(v) {
  if (v && typeof v === 'object' && !Array.isArray(v) && 'value' in v && ('typeKind' in v || 'key' in v || Object.keys(v).length <= 6) && !('label' in v)) v = v.value;
  if (typeof v === 'string') { const t = v.trim(); if (/^[\[{"\-0-9tfn]/.test(t)) { try { return JSON.parse(t); } catch {} } }
  return v;
}
function coerce(s, v) {
  if (s.type === 'bool') return typeof v === 'boolean' ? v : v === 'true' || v === 1 ? true : v === 'false' || v === 0 ? false : undefined;
  if (s.type === 'num') { const n = +v; return v !== null && v !== '' && Number.isFinite(n) ? n : undefined; }
  if (s.type === 'vec3' || s.type === 'vec2' || s.type === 'vec4') {
    const ks = s.axes ? s.axes : s.type === 'vec3' ? ['x', 'y', 'z'] : ['x', 'y'];
    let a; if (Array.isArray(v)) a = v; else if (v && typeof v === 'object') a = ks.map(k => v[k] ?? v[k.toLowerCase()] ?? v[k.toUpperCase()]); else if (typeof v === 'number') a = ks.map(() => v);
    return a && a.length >= ks.length && a.slice(0, ks.length).every(x => x !== undefined && Number.isFinite(+x)) ? a.slice(0, ks.length).map(Number) : undefined;
  }
  if (s.type === 'enum') { // real: {label, value} 객체
    const names = ENUMS[s.key] || s.opts.map(o => o[0]);
    if (v && typeof v === 'object') { const byLabel = names.find(n => n.toLowerCase() === String(v.label).toLowerCase()); return byLabel ?? (typeof v.value === 'number' ? names[v.value] : undefined); }
    if (typeof v === 'number') return names[v]; return names.find(n => n.toLowerCase() === String(v).toLowerCase());
  }
  if (s.type === 'color') { if (v && typeof v === 'object' && 'r' in v) { const h = x => Math.round(clamp01(+x) * 255).toString(16).padStart(2, '0'); return '#' + h(v.r) + h(v.g) + h(v.b); } return typeof v === 'string' ? v : undefined; }
  return v;
}
// 우리 키 ↔ Warudo 씬 키
const SCENE_KEYS = {
  tracker: ['MirroredTracking', 'BlendShapeSensitivity', 'ClampAllBlendShapes', 'HeadMovementIntensity', 'MaximalHeadTranslation', 'HeadRotationIntensity', 'HeadRotationOffset', 'BodyMovementIntensity', 'BodyRotationType', 'BodyRotationIntensity', 'BodyRotationDirection', 'BodyRotationNeckCompensation', 'BodyRotationSpineRotationIntensity', 'BodyRotationChestRotationIntensity', 'BodyRotationHipsRotationIntensity', 'BodyRotationDelayDuration', 'BodyRotationSmoothingDuration', 'EyeMovementIntensity', 'EyeMovementHeadRotationCompensation', 'EyeBlinkSensitivity', 'LinkedEyeBlinking', 'UseBonesForEyeMovement', 'UseBlendShapesForEyeMovement', 'CalibrateEyeMovement', 'ConvertToVRMEyeBlendShapes'],
  char: ['LookAtEnabled', 'LookAtWeight', 'LookAtHeadWeight', 'LookAtEyesWeight', 'LookAtBodyWeight', 'LookAtClampHeadWeight', 'LookAtClampEyesWeight', 'LookAtClampBodyWeight', 'BreathingEnabled', 'BreathingExertion', 'BreathingRate', 'SwayingEnabled', 'SwayingIntensity'],
  cam: ['FieldOfView', 'TransparentBackground', 'ChromaKeyColor', 'Brightness', 'Contrast', 'Vibrance'],
  // 그래프 노드 (노드 이름 → { 입력 키: 우리 키 })
  nodes: {
    CHARACTER_LOOK_AT_TARGET: { Weight: 'LookAtNodeWeight', HeadWeight: 'LookAtNodeHeadWeight', EyesWeight: 'LookAtNodeEyesWeight', MaximumLookAtAngle: 'MaximumLookAtAngle', MaximalHeadRotation: 'MaximalHeadRotation', MaximalEyeRotation: 'MaximalEyeRotation', SmoothHeadTime: 'SmoothHeadTime', SmoothEyesTime: 'SmoothEyesTime', Enabled: 'LookAt' },
    SMOOTH_BLENDSHAPES: { SmoothTime: 'BlendShapeSmoothTime' },
    SMOOTH_ROTATIONS: { SmoothTime: 'BoneSmoothTime' },
    SMOOTH_POSITION: { SmoothTime: 'RootSmoothTime' },
    SWITCH_BLENDSHAPE_LIST: { ToTrueTransitionTime: 'LostTransitionTime' },
    SWITCH_FLOAT: { ToTrueTransitionTime: 'IdleTransitionTime' },
    'GENERATE_HEAD_&_EYES_MOTION': { AutoBlinking: 'IdleAutoBlinking', AutoEyeMovements: 'IdleAutoEyeMovements', AutoHeadMovements: 'IdleAutoHeadMovements', BlinkInterval: 'IdleBlinkInterval', BlinkSpeed: 'IdleBlinkSpeed', LookWeight: 'IdleLookWeight', MaxLookAngles: 'IdleMaxLookAngles', LookAroundInterval: 'IdleLookAroundInterval', MaxLookAroundAngle: 'IdleMaxLookAroundAngle', HeadTilt: 'IdleHeadTilt' },
  },
};
// 웹에서 쓰지 않는(대응 없는) Warudo 값 — 매칭 보고에서 "해당 없음"으로 분류
const NOT_APPLICABLE = /^(InputCameraName|ShowCamera|Freeze|ProcessPriority|InvertHands|ShowCharacterDaemon|Hand|Hands|Arm|Finger|Shoulder|Camera(Diagonal)?|GPU|Enable(Hand|Face)|Pendulum|Ragdoll|Muscle|Angular|Internal|Spine|Left|Right|Override|Overlapping|Additional|Apply|Disable|Meshes|UseMesh|UseVrm|Tracking(Asset|Graph)|ExpressionKey|Source|Enabled|Transform|Default|Quick|Blueprint|Controller|Control|Focus|Follow|Use|Render|Near|Far|Ortho|Force|Spout|Ndi|Virtual|Mirror|Noise|LUT|ACES|Tint|Bloom|HBAO|Anamorphic|DepthOfField|EnableDepth|EnableBloom|EnableHBAO|EnableAnamorphic|EnableChromatic|Chromatic|LensDirt|EnableVignetting|Vignetting|EnableNight|NightVision|EnableBlur|Blur|EnablePixelate|Pixelate|Orbit|Character|Delay|Smoothing|IKTarget|Pose|Lip|Limit|Average|Expressions|BlendShapesMapping|Calibrat|Tracker|Selected|Hips)/;
function inputsOf(ent) { if (!ent || typeof ent !== 'object') return null; if (ent.dataInputs && typeof ent.dataInputs === 'object') return ent.dataInputs; return ent; }
function assetKind(a, inp) {
  const t = a.typeId, n = String(a.name || '');
  if (t === MEDIAPIPE_TRACKER_TYPE_ID || /tracker/i.test(n) || 'BlendShapeSensitivity' in inp || 'MirroredTracking' in inp) return 'tracker';
  if (t === CHARACTER_TYPE_ID || 'Expressions' in inp || 'LookAtEnabled' in inp) return 'char';
  if (t === CAMERA_TYPE_ID || ('FieldOfView' in inp && ('ControlMode' in inp || 'TransparentBackground' in inp))) return 'cam';
  return 'other';
}
export function importWarudoJSON(json) {
  const S = Object.fromEntries(SCHEMA.map(s => [s.key, s]));
  const res = { settings: {}, mapping: null, expressions: null, hotkeys: null, found: [], sources: [], kind: 'unknown', notes: [], report: { assets: [], nodes: [], totals: { inputs: 0, matched: 0, connected: 0, notApplicable: 0, unknown: 0 } }, scene: null };
  if (json && json.format === 'vrm-vtuber-warudo') { // 우리 내보내기 파일
    res.kind = 'ours';
    for (const [k, v] of Object.entries(json.settings || {})) if (S[k]) { const c = coerce(S[k], v); if (c !== undefined) { res.settings[k] = c; res.found.push(k); } }
    if (Array.isArray(json.mapping)) res.mapping = json.mapping;
    if (Array.isArray(json.expressions)) res.expressions = json.expressions;
    return res;
  }
  const take = (inputs, key, ourKey, srcName) => {
    if (!(key in inputs)) return false;
    const s = S[ourKey]; const c = coerce(s, parseVal(inputs[key]));
    if (c === undefined) return false;
    if (!(ourKey in res.settings)) { res.settings[ourKey] = c; res.found.push(ourKey); if (!res.sources.includes(srcName)) res.sources.push(srcName); }
    return true;
  };
  const T = res.report.totals;
  const tally = (rep, k, cls) => { rep[cls].push(k); T[cls === 'matched' ? 'matched' : cls]++; T.inputs++; };
  if (Array.isArray(json?.assets)) {
    res.kind = 'scene'; res.scene = { name: json.name, appVersion: json.appVersion };
    for (const a of json.assets) {
      const inp = inputsOf(a) || {}; const kind = assetKind(a, inp);
      const rep = { name: a.name || a.typeId, kind, total: Object.keys(inp).length, matched: [], connected: [], notApplicable: [], unknown: [] };
      for (const k of Object.keys(inp)) {
        let ok = false;
        if (kind !== 'other' && SCENE_KEYS[kind]?.includes(k)) ok = take(inp, k, k, rep.name);
        if (kind === 'tracker' && k === 'BlendShapesMapping') { const m = findMappings(parseVal(inp[k])); if (m.length) { res.mapping = m; res.found.push('BlendShapesMapping(' + m.length + ')'); ok = true; } }
        if (kind === 'char' && k === 'Expressions') { const x = findExpressions(parseVal(inp[k])); if (x.length) { res.expressions = x; res.found.push('Expressions(' + x.length + ')'); ok = true; } }
        tally(rep, k, ok ? 'matched' : (kind === 'other' || NOT_APPLICABLE.test(k)) ? 'notApplicable' : 'unknown');
      }
      res.report.assets.push(rep);
    }
  }
  const graphs = Array.isArray(json?.graphs) ? json.graphs : [];
  let hasLipSync = false, hasVrmGraph = false, hasFaceGraph = false;
  for (const g of graphs) {
    const nodes = g.nodes || {}; const byId = id => nodes[id];
    const connected = new Set((g.dataConnections || []).map(c => c.inputNode + '.' + c.inputPort));
    for (const [id, n] of Object.entries(nodes)) {
      const nm = n.name || n.typeId || ''; if (/LIP_?SYNC/i.test(nm)) hasLipSync = true;
      if (nm === 'CONSTRAIN_BLENDSHAPE' || nm === 'SET_BLENDSHAPE') hasVrmGraph = true; if (nm === 'GET_MEDIAPIPE_TRACKER_DATA') hasFaceGraph = true;
      const map = SCENE_KEYS.nodes[nm]; const inp = inputsOf(n) || {};
      const rep = { name: (g.name || 'graph') + ' / ' + nm, total: Object.keys(inp).length, matched: [], connected: [], notApplicable: [], unknown: [] };
      if (!map) { res.report.nodes.push({ name: rep.name, total: rep.total, used: false }); continue; }
      for (const k of Object.keys(inp)) {
        if (connected.has(id + '.' + k)) { tally(rep, k, 'connected'); continue; } // 다른 노드에서 값이 들어옴 → 상수 아님
        if (map[k]) { const v = parseVal(inp[k]); const s = S[map[k]];
          let ok = false;
          if (s?.type === 'vec4' && v && v.dataInputs) ok = take({ x: [0, 1, 2, 3].map(i => +parseVal(v.dataInputs[s.axes[i]])) }, 'x', map[k], rep.name);
          else if ((s?.type === 'vec3') && v && v.dataInputs) ok = take({ x: ['X', 'Y', 'Z'].map(a => +parseVal(v.dataInputs[a])) }, 'x', map[k], rep.name);
          else ok = take(inp, k, map[k], rep.name);
          tally(rep, k, ok ? 'matched' : 'unknown');
        } else tally(rep, k, 'notApplicable');
      }
      res.report.nodes.push({ ...rep, used: true });
    }
    // Expression Key Bindings: ON_KEYSTROKE_PRESSED → TOGGLE_CHARACTER_EXPRESSION / EXIT_ALL
    const flows = g.flowConnections || []; const hk = [];
    for (const [id, n] of Object.entries(nodes)) if (n.name === 'ON_KEYSTROKE_PRESSED') {
      const d = inputsOf(n) || {}; const ks = parseVal(d.Keystroke); const label = ks && typeof ks === 'object' ? ks.label : ks;
      const mods = ['Ctrl', 'Shift', 'Alt', 'Meta'].filter(m => parseVal(d['Require' + m]) === true);
      const f = flows.find(c => c.outputNode === id); const t = f && byId(f.inputNode); if (!t) continue;
      const key = [...mods, label].join('+');
      if (t.name === 'EXIT_ALL_CHARACTER_EXPRESSIONS') hk.push({ key, exitAll: true });
      else if (t.name === 'TOGGLE_CHARACTER_EXPRESSION') hk.push({ key, expression: parseVal(inputsOf(t).Expression), action: parseVal(inputsOf(t).Action)?.label || 'Toggle' });
    }
    if (hk.length) { res.hotkeys = hk; res.found.push('ExpressionKeyBindings(' + hk.length + ')'); }
  }
  if (hasFaceGraph) {
    if (!('LipSync' in res.settings)) { res.settings.LipSync = hasLipSync ? 'WhenTrackingLost' : 'Disabled'; res.found.push('LipSync'); }
    if (!('BlendShapeMappingType' in res.settings) && hasVrmGraph) { res.settings.BlendShapeMappingType = 'VRM'; res.found.push('BlendShapeMappingType'); }
  }
  if (res.expressions && res.hotkeys) for (const h of res.hotkeys) { const e = res.expressions.find(x => x.Name === h.expression); if (e) e.Hotkey = h.key; }
  if (!res.kind || res.kind === 'unknown') { // 씬 구조가 아님 → 평평한 객체로 시도
    if (!graphs.length) { res.kind = 'loose'; const inp = inputsOf(json) || {}; for (const k of [...SCENE_KEYS.tracker, ...SCENE_KEYS.char, ...SCENE_KEYS.cam]) take(inp, k, k, 'json'); }
  }
  if (!res.mapping) { const m = findMappings(json); if (m.length) { res.mapping = m; res.found.push('BlendShapesMapping(' + m.length + ')'); } }
  if (!res.found.length) res.notes.push('알려진 Warudo 설정 이름을 찾지 못했어요. Warudo 씬 파일(.json)이 필요해요.');
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
  const out = []; const seen = new Set();
  walk(json, o => {
    if (o.dataInputs === undefined && seen.size && !Array.isArray(o) && o.Name && o.Name.value === undefined) return;
    const f = flat(o); if (typeof f.Name !== 'string' || !('Layer' in f) || !('IsBinary' in f) || seen.has(f.Name)) return;
    seen.add(f.Name);
    const e = newExpression(f.Name, f.Name, +f.Layer || 0); e.IsBinary = !!f.IsBinary;
    for (const k of ['DisableEyeBlinkTracking', 'DisableMouthTracking', 'DisableBrowTracking']) e[k] = !!f[k];
    const bs = findFirst(f.BlendShapes, x => 'EnterDuration' in x); if (bs) { for (const k of ['EnterDuration', 'EnterDelay', 'ExitDuration', 'ExitDelay', 'TargetValue']) if (Number.isFinite(+bs[k]) && bs[k] !== undefined) e[k] = +bs[k]; if (bs.IsBinary !== undefined) e.IsBinary = e.IsBinary || !!bs.IsBinary; }
    const binds = []; walk(f.BlendShapes, x => { const xf = flat(x); if (typeof xf.BlendShape === 'string' && 'TargetValue' in xf && !binds.some(b => b.BlendShape === xf.BlendShape && b.Mesh === xf.TargetSkinnedMesh)) binds.push({ Mesh: xf.TargetSkinnedMesh || '', BlendShape: xf.BlendShape, TargetValue: +xf.TargetValue }); });
    e.Binds = binds;
    const tcs = []; walk(f.TriggerConditions, t => { const tf = flat(t); if ('Conditions' in tf) { const conds = []; walk(tf.Conditions, c => { const cf = flat(c); if (typeof cf.BlendShape === 'string' && 'Value' in cf) conds.push({ BlendShape: cf.BlendShape, Condition: (cf.Condition === 1 || cf.Condition === 'LessThanOrEqual' || cf.Condition?.label === 'LessThanOrEqual' || cf.Condition?.value === 1) ? 'LessThanOrEqual' : 'GreaterThanOrEqual', Value: +cf.Value }); }); const TT = ['DoNothing', 'Enter', 'Exit']; const tt = v => v && typeof v === 'object' ? (TT.find(x => x.toLowerCase() === String(v.label).replace(/\s/g, '').toLowerCase()) ?? TT[v.value]) : typeof v === 'number' ? TT[v] : v; tcs.push({ Conditions: conds, TriggerWhenMet: tt(tf.TriggerWhenMet) ?? 'Enter', TriggerWhenMetDelay: +(tf.TriggerWhenMetDelay ?? 0), TriggerWhenNotMet: tt(tf.TriggerWhenNotMet) ?? 'Exit', TriggerWhenNotMetDelay: +(tf.TriggerWhenNotMetDelay ?? 2) }); } });
    e.TriggerConditions = tcs; out.push(e);
  });
  return out;
}
function findFirst(o, pred) { let r = null; walk(o, x => { if (!r) { const f = flat(x); if (pred(f)) r = f; } }); return r; }
