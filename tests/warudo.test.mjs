// node --test tests/warudo.test.mjs — Warudo 호환 공식 단위 테스트
import test from 'node:test';
import assert from 'node:assert/strict';
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
test('VRM 표정 가져오기: 기본 클립은 layer 0, 추가 클립은 1,2,…', () => {
  const l = WD.importVrmExpressions(['aa', 'blink', 'happy', 'sad', 'Tears', 'Sparkle', 'jawOpen']);
  assert.deepEqual(l.map(e => [e.Name, e.Layer]), [['Joy', 0], ['Sorrow', 0], ['Tears', 1], ['Sparkle', 2]]);
  assert.equal(l[0].EnterDuration, 0.4); assert.equal(l[0].ExitDuration, 0.4);
});
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
test('모르는 JSON → 안내 메모', () => { const r = WD.importWarudoJSON({ foo: 1 }); assert.equal(r.found.length, 0); assert.ok(r.notes.length); });
test('우리 내보내기 형식 왕복', () => { const r = WD.importWarudoJSON({ format: 'vrm-vtuber-warudo', settings: { EyeBlinkSensitivity: 0.9, BodyRotationType: 'None' } }); assert.equal(r.settings.EyeBlinkSensitivity, 0.9); assert.equal(r.settings.BodyRotationType, 'None'); });
