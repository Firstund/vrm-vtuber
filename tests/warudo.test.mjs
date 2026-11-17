// node --test tests/warudo.test.mjs — Warudo 호환 공식 단위 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as WD from '../js/warudo.js';
const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} ≈ ${b}`);
const cfg = o => ({ ...structuredClone(WD.DEFAULTS), ...o });
const idx = list => Object.fromEntries(list.map(m => [m.BlendShape, m]));

test('문서 예시: 입력 0-1 → 출력 0-2, 0.40 → 0.80', () => near(WD.mapValue(0.4, { SourceValueMin: 0, SourceValueMax: 1, TargetValueMin: 0, TargetValueMax: 2 }), 0.8));
test('출력 최대 0 → 블렌드쉐이프 꺼짐', () => near(WD.mapValue(0.9, { SourceValueMin: 0, SourceValueMax: 1, TargetValueMin: 0, TargetValueMax: 0 }), 0));
test('출력 최소 -0.25 → 늦게 반응 (0.2 → 0, 클램프 후)', () => {
  const m = { SourceValueMin: 0, SourceValueMax: 1, TargetValueMin: -0.25, TargetValueMax: 1 };
  near(WD.mapValue(0.2, m), 0); near(WD.mapValue(0.6, m), 0.5);
  const out = WD.processBlendShapes({ jawOpen: 0.1 }, cfg({}), idx([{ BlendShape: 'jawOpen', ...m }])); near(out.jawOpen, 0);
});
test('SDK 기본 매핑(0,1,0,1)은 그대로', () => { for (const v of [0, 0.3, 1]) near(WD.mapValue(v, WD.sdkMapping()[0]), v); });
test('BlendShape Sensitivity 2 → 두 배, ClampAllBlendShapes면 1에서 멈춤', () => {
  const o = WD.processBlendShapes({ jawOpen: 0.3, mouthFunnel: 0.7 }, cfg({ BlendShapeSensitivity: 2 }), idx(WD.sdkMapping()));
  near(o.jawOpen, 0.6); near(o.mouthFunnel, 1);
  const u = WD.processBlendShapes({ mouthFunnel: 0.7 }, cfg({ BlendShapeSensitivity: 2, ClampAllBlendShapes: false }), idx(WD.sdkMapping())); near(u.mouthFunnel, 1.4);
});
test('Eye Blink Sensitivity 기본 1.2 → 0.5 깜빡임은 0.6', () => near(WD.processBlendShapes({ eyeBlinkLeft: 0.5 }, cfg({}), {}).eyeBlinkLeft, 0.6));
test('Mirrored Tracking: 좌우 이름 맞바꿈 (SDK 표)', () => {
  const o = WD.processBlendShapes({ eyeBlinkLeft: 0.8, mouthSmileRight: 0.4, jawOpen: 0.2 }, cfg({ MirroredTracking: true, EyeBlinkSensitivity: 1 }), {});
  near(o.eyeBlinkRight, 0.8); near(o.eyeBlinkLeft, 0); near(o.mouthSmileLeft, 0.4); near(o.jawOpen, 0.2);
});
test('Linked Eye Blinking → 양쪽 같게', () => { const o = WD.processBlendShapes({ eyeBlinkLeft: 0.8, eyeBlinkRight: 0.1 }, cfg({ LinkedEyeBlinking: true, EyeBlinkSensitivity: 1 }), {}); near(o.eyeBlinkLeft, o.eyeBlinkRight); });
test('Body Rotation Type', () => {
  const h = { x: 10, y: 20, z: 30 };
  assert.deepEqual(WD.bodyRotation(h, cfg({ BodyRotationType: 'None' })), { x: 0, y: 0, z: 0 });
  assert.deepEqual(WD.bodyRotation(h, cfg({ BodyRotationType: 'Normal' })), { x: 5, y: 10, z: 15 });
  assert.deepEqual(WD.bodyRotation(h, cfg({ BodyRotationType: 'Inverted' })), { x: 5, y: 10, z: -15 }); // X·Y 같은 방향, Z 반대
  assert.deepEqual(WD.bodyRotation(h, cfg({ BodyRotationType: 'Custom', BodyRotationDirection: [0, -1, 2] })), { x: 0, y: -20, z: 60 });
  assert.equal(WD.DEFAULTS.BodyRotationType, 'Inverted'); // 문서: 기본 Inverted
});
test('Head Movement Intensity 2, 최대 0.5m', () => { const t = WD.headTranslation([5, -10, 40], cfg({})); near(t[0], 0.1); near(t[1], -0.2); near(t[2], 0.5); });
test('Body Movement Intensity 기본 0.5 (SDK)', () => assert.equal(WD.DEFAULTS.BodyMovementIntensity, 0.5));
test('표정: 기본 0.4초 페이드, Enter OutCubic', () => {
  const E = new WD.ExpressionEngine(); E.setList([WD.newExpression('Joy', 'happy', 0)]);
  E.enter('Joy', 0); near(E.update(0).Joy, 0); near(E.update(0.2).Joy, WD.easeOutCubic(0.5)); near(E.update(0.4).Joy, 1);
  E.exit('Joy', 1); near(E.update(1.2).Joy, 0.5); near(E.update(1.4).Joy, 0); // Exit Linear
});
test('표정: Is Binary는 즉시', () => { const E = new WD.ExpressionEngine(); const e = WD.newExpression('A', 'a', 0); e.IsBinary = true; E.setList([e]); E.enter('A', 0); near(E.update(0).A, 1); });
test('표정: 같은 레이어는 페이드아웃, 다른 레이어는 겹침', () => {
  const E = new WD.ExpressionEngine(); E.setList([WD.newExpression('Joy', 'happy', 0), WD.newExpression('Angry', 'angry', 0), WD.newExpression('Tears', 'tears', 1)]);
  E.enter('Joy', 0); E.update(1); E.enter('Tears', 1); E.enter('Angry', 1);
  const o = E.update(1.4); near(o.Joy, 0); near(o.Angry, 1); near(o.Tears, 1);
  assert.equal(E.isActive('Joy'), false);
});
test('트리거 조건: mouthSmileLeft·Right 둘 다 ≥0.5면 들어가고, 안 맞으면 2초 뒤 나감 (SDK 기본)', () => {
  const E = new WD.ExpressionEngine(); const e = WD.newExpression('Joy', 'happy', 0);
  e.TriggerConditions = [{ Conditions: [{ BlendShape: 'mouthSmileLeft', Condition: 'GreaterThanOrEqual', Value: 0.5 }, { BlendShape: 'mouthSmileRight', Condition: 'GreaterThanOrEqual', Value: 0.5 }] }];
  E.setList([e]);
  E.triggers({ mouthSmileLeft: 0.7, mouthSmileRight: 0.3 }, 0); assert.equal(E.isActive('Joy'), false);
  E.triggers({ mouthSmileLeft: 0.7, mouthSmileRight: 0.6 }, 0.1); assert.equal(E.isActive('Joy'), true);
  E.triggers({ mouthSmileLeft: 0.1, mouthSmileRight: 0.1 }, 1); E.triggers({}, 2.5); assert.equal(E.isActive('Joy'), true);
  E.triggers({}, 3.01); assert.equal(E.isActive('Joy'), false);
});
test('VRM 표정 가져오기 (real, VRM 1.0): 이름 그대로, 기본 5개 layer 0, 추가는 1,2,…, override → Disable 플래그, Alt 단축키', () => {
  const ov = { happy: { blink: 'block', mouth: 'block' }, Tears: { blink: 'none', mouth: 'block' } };
  const l = WD.importVrmExpressions(['aa', 'blink', 'happy', 'sad', 'Tears', 'Sparkle', 'jawOpen'], { overrides: ov });
  assert.deepEqual(l.map(e => [e.Name, e.Layer, e.Hotkey]), [['happy', 0, 'Alt+1'], ['sad', 0, 'Alt+2'], ['Tears', 1, 'Alt+3'], ['Sparkle', 2, 'Alt+4']]);
  assert.equal(l[0].DisableEyeBlinkTracking, true); assert.equal(l[0].DisableMouthTracking, true); assert.equal(l[0].DisableBrowTracking, false);
  assert.equal(l[2].DisableEyeBlinkTracking, false); assert.equal(l[2].DisableMouthTracking, true);
  assert.equal(l[0].EnterDuration, 0.4); assert.equal(l[0].ExitDuration, 0.4);
  assert.equal(WD.importVrmExpressions(['happy'], { vrm0: true })[0].Name, 'Joy'); // VRM0 이름은 inferred
});
test('real: MediaPipe 초기 매핑 (eyeBlink 0.3~0.7, jaw/funnel/pucker 출력 -0.15~1, 나머지 0~1)', () => {
  const m = idx(WD.defaultMapping()); assert.equal(Object.keys(m).length, 52);
  assert.deepEqual([m.eyeBlinkLeft.SourceValueMin, m.eyeBlinkLeft.SourceValueMax, m.eyeBlinkLeft.TargetValueMin, m.eyeBlinkLeft.TargetValueMax], [0.3, 0.7, 0, 1]);
  for (const n of ['jawOpen', 'mouthFunnel', 'mouthPucker']) assert.equal(m[n].TargetValueMin, -0.15);
  assert.deepEqual([m.mouthSmileLeft.SourceValueMin, m.mouthSmileLeft.SourceValueMax, m.mouthSmileLeft.TargetValueMin, m.mouthSmileLeft.TargetValueMax], [0, 1, 0, 1]);
  near(WD.processBlendShapes({ eyeBlinkLeft: 0.22 }, cfg({}), m).eyeBlinkLeft, 0); // 뜬 눈 기본값 ~0.2 → 0
  near(WD.processBlendShapes({ eyeBlinkLeft: 0.5 }, cfg({}), m).eyeBlinkLeft, 0.6); // (0.5) × 1.2
});
test('real: VRM 변환 공식 (aa = jaw×1.2 − funnel, oh = funnel×3 + lowerDown합×0.5, ih = smile합×2×jaw, ou = pucker, ee 없음)', () => {
  const v = WD.vrmFromArkit({ jawOpen: 0.5, mouthFunnel: 0.1, mouthLowerDownLeft: 0.1, mouthLowerDownRight: 0.1, mouthSmileLeft: 0.2, mouthSmileRight: 0.2, mouthPucker: 0.05, eyeBlinkLeft: 0.7, browInnerUp: 0.3, browDownLeft: 0.4, eyeLookUpLeft: 0.4, eyeLookUpRight: 0.2 });
  near(v.aa, 0.5); near(v.oh, 0.4); near(v.ih, 0.4); near(v.ou, 0.05); near(v.blinkLeft, 0.7); near(v['Brows up'], 0.3); near(v['Brows down'], 0.4); near(v.LookUp, 0.3);
  assert.equal('ee' in v, false);
});
test('real: Constrain 순서 aa→oh, ih→oh, aa→ih, ou→(ih,aa,oh) (대상 ≤ 1 − 제약, 공식 inferred)', () => {
  const v = WD.vrmFromArkit({ jawOpen: 1, mouthFunnel: 0, mouthLowerDownLeft: 1, mouthLowerDownRight: 1, mouthSmileLeft: 0.5, mouthSmileRight: 0.5 });
  near(v.aa, 1); near(v.oh, 0); near(v.ih, 0);
  const w = WD.vrmFromArkit({ mouthPucker: 0.8, mouthFunnel: 0.3 }); near(w.ou, 0.8); near(w.oh, 0.2);
});
test('Smooth 노드 (SmoothDamp): 0.2초 뒤 대부분 따라감, 0이면 즉시', () => {
  const b = new WD.SmoothBank(); b.run('a', 0, 0.2, 0.016); let x = 0; for (let i = 0; i < 25; i++) x = b.run('a', 1, 0.2, 0.016);
  assert.ok(x > 0.85 && x <= 1.0001, String(x)); near(new WD.SmoothBank().run('z', 0.7, 0, 0.016), 0.7);
});
test('Switch (real: InOutSine): 0.4초 전환', () => { const s = new WD.Switch(0); s.set(true, 0); near(s.update(0.2, 0.4), 0.5); near(s.update(0.4, 0.4), 1); s.set(false, 1); near(s.update(1.4, 0.4), 0); });
test('ARKit 자동 감지', () => { assert.equal(WD.detectMapping(['aa', 'happy']).type, 'VRM'); assert.equal(WD.detectMapping(WD.ARKIT).type, 'ARKit'); });
test('Look At clamp: 0이면 그대로, 1이면 0, 사이면 줄어듦', () => { near(WD.clampLookAngle(40, 0), 40); near(WD.clampLookAngle(40, 1), 0); near(WD.clampLookAngle(40, 0.7), 40); const v = WD.clampLookAngle(100, 0.7); assert.ok(v > 0 && v < 100, String(v)); });
test('씬 가져오기: SDK 직렬화 구조(assets[].dataInputs[키].value)', () => {
  const scene = { name: 'Test', appVersion: '0.13', assets: [
    { id: 'a', typeId: 'mediapipe', name: 'MediaPipe Tracker', dataInputs: {
      MirroredTracking: { value: 'true' }, BlendShapeSensitivity: { value: '1.5' }, HeadMovementIntensity: { value: '{"x":1,"y":2,"z":3}' }, BodyRotationType: { value: '1' },
      BlendShapesMapping: { value: JSON.stringify({ dataInputs: { BlendShapeMappings: { value: JSON.stringify([{ dataInputs: { BlendShape: { value: '"jawOpen"' }, SourceValueMin: { value: '0' }, SourceValueMax: { value: '1' }, TargetValueMin: { value: '-0.25' }, TargetValueMax: { value: '1' } } }]) } } }) } } },
    { id: 'b', typeId: 'character', name: 'Character', dataInputs: { LookAtEnabled: { value: 'true' }, LookAtClampHeadWeight: { value: '0.3' },
      Expressions: { value: JSON.stringify([{ dataInputs: { Name: { value: '"Joy"' }, Layer: { value: '0' }, IsBinary: { value: 'true' }, BlendShapes: { value: '[]' }, TriggerConditions: { value: '[]' } } }]) } } },
    { id: 'c', typeId: 'camera', name: 'Camera', dataInputs: { FieldOfView: { value: '40' }, ControlMode: { value: '0' } } }] };
  const r = WD.importWarudoJSON(scene);
  assert.equal(r.kind, 'scene'); assert.equal(r.settings.MirroredTracking, true); assert.equal(r.settings.BlendShapeSensitivity, 1.5);
  assert.deepEqual(r.settings.HeadMovementIntensity, [1, 2, 3]); assert.equal(r.settings.BodyRotationType, 'Normal');
  assert.equal(r.settings.LookAtEnabled, true); near(r.settings.LookAtClampHeadWeight, 0.3); assert.equal(r.settings.FieldOfView, 40);
  assert.equal(r.mapping[0].BlendShape, 'jawOpen'); near(r.mapping[0].TargetValueMin, -0.25);
  assert.equal(r.expressions[0].Name, 'Joy'); assert.equal(r.expressions[0].IsBinary, true);
});
test('real 형식: enum은 {label,value}, 다른 노드에서 연결된 입력은 가져오지 않음, 키 바인딩', () => {
  const di = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { type: 'x', typeKind: 'Value', defaultValue: null, value: v, properties: {}, key: k }]));
  const scene = { name: 'S', appVersion: '0.15.1', assets: [{ typeId: WD.MEDIAPIPE_TRACKER_TYPE_ID, name: 'MediaPipe Tracker', id: 't', dataInputs: di({ BodyRotationType: '{"label":"Normal","value":1,"description":null,"icon":null}', InputCameraName: '"cam"' }) }],
    graphs: [{ name: 'G', nodes: {
      n1: { typeId: 'x', name: 'CHARACTER_LOOK_AT_TARGET', dataInputs: di({ Weight: '0.0', HeadWeight: '0.5' }) },
      k1: { typeId: 'k', name: 'ON_KEYSTROKE_PRESSED', dataInputs: di({ Keystroke: '{"label":"1","value":2}', RequireCtrl: 'false', RequireShift: 'false', RequireAlt: 'true', RequireMeta: 'false' }) },
      t1: { typeId: 't', name: 'TOGGLE_CHARACTER_EXPRESSION', dataInputs: di({ Expression: '"happy"', Action: '{"label":"Toggle","value":0}' }) } },
      dataConnections: [{ outputNode: 'z', outputPort: 'Output', inputNode: 'n1', inputPort: 'Weight' }], flowConnections: [{ outputNode: 'k1', outputPort: 'Exit', inputNode: 't1', inputPort: 'Enter' }] }] };
  const r = WD.importWarudoJSON(scene);
  assert.equal(r.settings.BodyRotationType, 'Normal'); assert.equal('LookAtNodeWeight' in r.settings, false); near(r.settings.LookAtNodeHeadWeight, 0.5);
  assert.deepEqual(r.hotkeys, [{ key: 'Alt+1', expression: 'happy', action: 'Toggle' }]);
  assert.ok(r.report.totals.connected >= 1); assert.ok(r.report.assets[0].notApplicable.includes('InputCameraName'));
});
// 실제 씬 파일 (개인 자료라 저장소에 없음 → 있으면만 검사)
const REAL = new URL('../../vrm-vtuber-ref/warudo-data/Avatar_MediaPipe_Reference.json', import.meta.url);
test('real 씬 파일 가져오기 (있을 때만)', { skip: !fs.existsSync(REAL) }, () => {
  const r = WD.importWarudoJSON(JSON.parse(fs.readFileSync(REAL, 'utf8').replace(/^\uFEFF/, '')));
  assert.equal(r.kind, 'scene'); assert.equal(r.mapping.length, 52); assert.equal(r.expressions.length, 23); assert.equal(r.hotkeys.length, 24);
  assert.equal(r.settings.BodyRotationType, 'Inverted'); assert.equal(r.settings.ConvertToVRMEyeBlendShapes, true); assert.equal(r.settings.BlendShapeSmoothTime, 0.2); assert.equal(r.settings.LipSync, 'Disabled');
  for (const k of Object.keys(r.settings)) if (k in WD.DEFAULTS && k !== 'BlendShapeMappingType') assert.deepEqual(r.settings[k], WD.DEFAULTS[k], k); // 기본값 = 실제 씬 값
  assert.deepEqual(WD.defaultMapping(), r.mapping.map(m => ({ ...m })).sort((a, b) => WD.ARKIT.indexOf(a.BlendShape) - WD.ARKIT.indexOf(b.BlendShape)));
});
test('모르는 JSON → 안내 메모', () => { const r = WD.importWarudoJSON({ foo: 1 }); assert.equal(r.found.length, 0); assert.ok(r.notes.length); });
test('우리 내보내기 형식 왕복', () => { const r = WD.importWarudoJSON({ format: 'vrm-vtuber-warudo', settings: { EyeBlinkSensitivity: 0.9, BodyRotationType: 'None' } }); assert.equal(r.settings.EyeBlinkSensitivity, 0.9); assert.equal(r.settings.BodyRotationType, 'None'); });

// ---- v4: 입 따라하기 확장 ----
test('mouthExtended: Warudo 모드 = Warudo VRM 그래프 결과와 같음', () => {
  const bs = { jawOpen: 0.6, mouthFunnel: 0.2, mouthPucker: 0.3, mouthSmileLeft: 0.4, mouthSmileRight: 0.1, mouthStretchLeft: 0.5, mouthClose: 0.3 };
  const w = WD.vrmFromArkit(bs, {}), o = WD.mouthExtended(bs, { MouthMode: 'Warudo' });
  for (const k of ['aa', 'ih', 'ou', 'oh']) assert.ok(Math.abs(o[k] - w[k]) < 1e-9, k);
  assert.equal(o.ee, 0); assert.equal(o.smileL, 0); assert.equal(o.close, 0);
});
test('mouthExtended: 확장 모드 ee·입 다물기·좌우 입꼬리', () => {
  const e = WD.mouthExtended({ jawOpen: 0.4, mouthStretchLeft: 0.5, mouthStretchRight: 0.5 }, WD.DEFAULTS);
  assert.ok(e.ee > 0.5, 'ee ' + e.ee);
  const i = WD.mouthExtended({ jawOpen: 0.3, mouthSmileLeft: 0.45, mouthSmileRight: 0.45, mouthStretchLeft: 0.25, mouthStretchRight: 0.25 }, WD.DEFAULTS);
  assert.ok(i.ih > i.ee, '이: ih > ee');
  const c = WD.mouthExtended({ jawOpen: 0.3, mouthClose: 0.5 }, WD.DEFAULTS);
  assert.ok(c.close > 0.9 && c.aa < 0.05, 'closed');
  const s = WD.mouthExtended({ mouthSmileLeft: 0.8 }, WD.DEFAULTS);
  assert.ok(s.smileL > 0.8 && s.smileR === 0, 'one side');
  const sym = WD.mouthExtended({ mouthSmileLeft: 0.8 }, { ...WD.DEFAULTS, MouthAsymmetry: false });
  assert.ok(Math.abs(sym.smileL - sym.smileR) < 1e-9);
  const g = WD.mouthExtended({ jawOpen: 0.3 }, { ...WD.DEFAULTS, MouthGain: 2 }), g1 = WD.mouthExtended({ jawOpen: 0.3 }, WD.DEFAULTS);
  assert.ok(g.aa > g1.aa * 1.9);
  const v0 = WD.mouthExtended({ jawOpen: 0.4, mouthStretchLeft: 0.5, mouthSmileLeft: 0.6 }, { ...WD.DEFAULTS, MouthVariety: 0 });
  assert.equal(v0.ee, 0); assert.equal(v0.smileL, 0);
});
test('mouth 설정 기본값 / 범위', () => {
  assert.equal(WD.DEFAULTS.MouthMode, 'Extended'); assert.equal(WD.DEFAULTS.MouthSmoothTime, 0.06); assert.ok(WD.DEFAULTS.MouthSmoothTime < WD.DEFAULTS.BlendShapeSmoothTime);
});
test('findMouthChannels / sideWeight', () => {
  const ch = WD.findMouthChannels(['aa', 'happy', 'happy_mouth', 'relaxed_mouth', 'sad_mouth', 'angry_eye']);
  assert.equal(ch.smile, 'happy_mouth'); assert.equal(ch.smileClosed, 'relaxed_mouth'); assert.equal(ch.frown, 'sad_mouth'); assert.deepEqual(ch.tongue, []);
  assert.equal(WD.findMouthChannels(['joy']).smile, null);
  assert.deepEqual(WD.findMouthChannels(['TongueOut']).tongue, ['TongueOut']);
  const [l, r] = WD.sideWeight(0, 0, 1); assert.ok(Math.abs(l - 0.5) < 1e-9 && Math.abs(r - 0.5) < 1e-9);
  assert.deepEqual(WD.sideWeight(5, 0, 1), [1, 0]); assert.deepEqual(WD.sideWeight(-5, 0, 1), [0, 1]);
});
test('표정 단축키 40개까지', () => { assert.ok(WD.HOTKEY_KEYS.length >= 40); assert.equal(new Set(WD.HOTKEY_KEYS).size, WD.HOTKEY_KEYS.length); });
