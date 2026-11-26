// Exercise the actual demo/ingest/calibration functions without a browser or webcam.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../lib/three/three.module.js';
import * as WD from '../js/warudo.js';
import { FilterBank } from '../js/filter.js';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
function section(start, end) {
  const a = source.indexOf(start), b = source.indexOf(end, a);
  assert.ok(a >= 0 && b > a, `app.js section not found: ${start}`);
  return source.slice(a, b);
}
// Keep production math in the test: only DOM, storage and UI feedback are stubbed.
const script = new vm.Script([
  section('const _m = new THREE.Matrix4()', "$('calib').onclick = calibrate;"),
  section('function demoRaw(t)', '// ---------- 카메라 ----------'),
  '({ demoRaw, ingest, calibrate })',
].join('\n'), { filename: 'app-pose-functions.js' });
const near = (actual, expected, message = '') => assert.ok(
  Math.abs(actual - expected) < 1e-9, `${message}: ${actual} ≈ ${expected}`,
);
const poseKeys = ['hx', 'hy', 'hz', 'px', 'py', 'pz', 'gx', 'gy'];
const serializeNeutral = n => n && ({ q: n.q.toArray(), t: n.t.toArray(), gx: n.gx, gy: n.gy });
const savedNeutral = () => ({
  q: new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, -0.4, 0.15, 'YXZ')),
  t: new THREE.Vector3(-7, 4, -60), gx: 0.3, gy: -0.2,
});

function harness({ neutral = null, settings = {} } = {}) {
  const feedback = { errors: [], statuses: [], saves: [] };
  const ctx = vm.createContext({
    THREE, WD, Math,
    W: { ...structuredClone(WD.DEFAULTS), ...settings },
    MAPI: Object.fromEntries(WD.defaultMapping().map(m => [m.BlendShape, m])),
    neutral, PS: { zoom: 1.3, camY: 0.1, ...(neutral ? { calib2: serializeNeutral(neutral) } : {}) },
    mode: 'demo', lastRaw: null, VV: {}, tgt: {},
    mapped: {}, mappedF: {}, calBS: {}, vrmConv: {}, mouthOut: {},
    neutralRec: null, CAL: WD.defaultPSCal(),
    bank: new FilterBank(), sb: new WD.SmoothBank(),
    D2R: Math.PI / 180, R2D: 180 / Math.PI,
    clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
    clamp01: v => Math.max(0, Math.min(1, v)),
    smoothstep: v => { v = Math.max(0, Math.min(1, v)); return v * v * (3 - 2 * v); },
    showErr: message => feedback.errors.push(message),
    status: message => feedback.statuses.push(message),
    savePS: () => feedback.saves.push(structuredClone(ctx.PS)),
  });
  const functions = script.runInContext(ctx);
  return { ctx, feedback, ...functions };
}
function realSample(q, t, bs = {}) {
  return { bs, m: new THREE.Matrix4().compose(t, q, new THREE.Vector3(1, 1, 1)).toArray() };
}

test('fresh demo has no depth offset throughout its motion cycle', () => {
  const h = harness();
  let minX = Infinity, maxX = -Infinity;
  for (let t = 0; t <= 24000; t += 250) {
    const raw = h.demoRaw(t);
    assert.equal(raw.synthetic, true);
    h.ingest(raw, t / 1000);
    near(h.ctx.tgt.py, 0, `y at ${t}`);
    near(h.ctx.tgt.pz, 0, `z at ${t}`);
    for (const key of poseKeys) assert.ok(Number.isFinite(h.ctx.tgt[key]), key);
    assert.ok(Math.abs(h.ctx.tgt.px) <= 0.12 + 1e-9);
    minX = Math.min(minX, h.ctx.tgt.px); maxX = Math.max(maxX, h.ctx.tgt.px);
  }
  assert.ok(minX < -0.11 && maxX > 0.11, 'lateral demo motion remains animated');
});

test('saved camera pose and gaze do not change demo motion in either smoothing mode', () => {
  for (const SmoothingMode of ['Warudo', 'OneEuro']) {
    const fresh = harness({ settings: { SmoothingMode } });
    const saved = harness({ neutral: savedNeutral(), settings: { SmoothingMode } });
    const before = JSON.stringify(saved.ctx.PS), settingsBefore = JSON.stringify(saved.ctx.W);
    for (const t of [0, 1250, 5000, 10000, 15000, 19000, 21000]) {
      fresh.ingest(fresh.demoRaw(t), t / 1000);
      saved.ingest(saved.demoRaw(t), t / 1000);
      for (const key of poseKeys) near(saved.ctx.tgt[key], fresh.ctx.tgt[key], `${SmoothingMode} ${key} at ${t}`);
    }
    assert.equal(JSON.stringify(saved.ctx.PS), before);
    assert.equal(JSON.stringify(saved.ctx.W), settingsBefore);
    assert.equal(saved.feedback.saves.length, 0);
  }
});

test('demo mirroring keeps head animation and reverses lateral movement, gaze and winks', () => {
  const normal = harness(), mirrored = harness({ settings: { MirroredTracking: true } });
  for (const t of [1250, 5000, 9600, 15000]) {
    normal.ingest(normal.demoRaw(t), t / 1000);
    mirrored.ingest(mirrored.demoRaw(t), t / 1000);
    const a = normal.ctx.tgt, b = mirrored.ctx.tgt;
    for (const key of ['hx', 'hy', 'hz', 'py', 'pz', 'gy']) near(b[key], a[key], key);
    near(b.px, -a.px, 'mirrored x'); near(b.gx, -a.gx, 'mirrored gaze');
    near(b.eL, a.eR, 'left blink'); near(b.eR, a.eL, 'right blink');
  }
});

test('real tracking still subtracts camera calibration and honors gains, offsets and mirroring', () => {
  const n = savedNeutral();
  const bs = { eyeLookOutLeft: 0.3, eyeLookInRight: 0.3, eyeLookDownLeft: 0.2, eyeLookDownRight: 0.2 };
  const h = harness({ neutral: n });
  h.ingest(realSample(n.q, n.t, bs), 0);
  for (const key of poseKeys) near(h.ctx.tgt[key], 0, `neutral ${key}`);
  const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(10 * Math.PI / 180, -20 * Math.PI / 180, 15 * Math.PI / 180, 'YXZ'));
  const moved = realSample(n.q.clone().multiply(delta), n.t.clone().add(new THREE.Vector3(5, -3, 8)), bs);
  h.ingest(moved, 1);
  for (const [key, value] of Object.entries({ hx: 10, hy: -20, hz: 15, px: 0.1, py: -0.06, pz: 0.16 })) near(h.ctx.tgt[key], value, key);
  h.ctx.W.HeadRotationIntensity = [1.2, 0.5, 2]; h.ctx.W.HeadRotationOffset = [2, -3, 4];
  h.ctx.W.MirroredTracking = true;
  h.ingest(moved, 2);
  for (const [key, value] of Object.entries({ hx: 14, hy: 7, hz: -26, px: -0.1, py: -0.06, pz: 0.16 })) near(h.ctx.tgt[key], value, key);
  h.ingest(realSample(n.q, n.t.clone().add(new THREE.Vector3(100, -100, 100))), 3);
  near(h.ctx.tgt.px, -0.5); near(h.ctx.tgt.py, -0.5); near(h.ctx.tgt.pz, 0.5);
});

test('synthetic sample cannot overwrite camera calibration even after a mode switch', () => {
  for (const initial of [null, savedNeutral()]) for (const mode of ['demo', 'idle', 'track']) {
    const h = harness({ neutral: initial });
    const before = JSON.stringify(h.ctx.PS), neutralBefore = JSON.stringify(serializeNeutral(h.ctx.neutral));
    h.ingest(h.demoRaw(5000), 5);
    assert.equal(h.ctx.lastRaw.synthetic, true, 'ingest retains sample provenance');
    h.ctx.mode = mode;
    h.calibrate();
    assert.equal(h.feedback.saves.length, 0, mode);
    assert.equal(JSON.stringify(h.ctx.PS), before, mode);
    assert.equal(JSON.stringify(serializeNeutral(h.ctx.neutral)), neutralBefore, mode);
    assert.notEqual(h.ctx.VV.calibrated, true, mode);
    assert.match(h.feedback.errors.at(-1), /카메라/);
  }
});

test('a real sample after the demo can still be calibrated and saved', () => {
  const h = harness();
  h.ingest(h.demoRaw(5000), 5); h.calibrate();
  h.ctx.mode = 'track';
  const n = savedNeutral(), raw = realSample(n.q, n.t, { eyeLookOutLeft: 0.4, eyeLookInRight: 0.4 });
  h.ingest(raw, 6); h.calibrate();
  assert.equal(h.feedback.saves.length, 1);
  assert.equal(h.ctx.VV.calibrated, true);
  assert.equal(h.ctx.PS.zoom, 1.3); assert.equal(h.ctx.PS.camY, 0.1);
  n.q.toArray().forEach((v, i) => near(h.ctx.PS.calib2.q[i], v));
  n.t.toArray().forEach((v, i) => near(h.ctx.PS.calib2.t[i], v));
  near(h.ctx.PS.calib2.gx, 0.4); near(h.ctx.PS.calib2.gy, 0);
  h.ingest(raw, 7);
  for (const key of poseKeys) near(h.ctx.tgt[key], 0, `new neutral ${key}`);
});
