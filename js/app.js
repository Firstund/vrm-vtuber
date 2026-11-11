// 3D VTuber (VRM) — three.js + @pixiv/three-vrm + MediaPipe FaceLandmarker. 모든 처리는 브라우저 안에서만.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { FilterBank } from './filter.js';
import { loadTracker, detect, tracker } from './tracker.js';
import { mic, startMic, micTick } from './mic.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEFAULT_VRM = 'assets/FirstundHoodieBoy_v2_VRM0.vrm';
const D2R = Math.PI / 180;
const clamp01 = v => Math.max(0, Math.min(1, v));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smoothstep = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const VV = window.__vv = { errors: [], loaded: false, frames: 0 };
window.addEventListener('error', e => VV.errors.push(String(e.message)));
window.addEventListener('unhandledrejection', e => VV.errors.push(String(e.reason?.message || e.reason)));

// ---------- 설정 (localStorage 저장) ----------
const PS = (() => { try { return JSON.parse(localStorage.getItem('vv_settings') || '{}'); } catch { return {}; } })();
const savePS = () => { try { localStorage.setItem('vv_settings', JSON.stringify(PS)); } catch {} };
const cfg = {};
const SLIDERS = ['smooth', 'beta', 'headSens', 'bodyFollow', 'mouthSens', 'blinkTh', 'gaze', 'emoSens', 'armDown', 'micSens', 'zoom', 'camY', 'camX', 'camRot', 'light', 'lightDir'];
for (const id of SLIDERS) {
  const el = $(id), out = el.nextElementSibling;
  if (id in PS) el.value = PS[id];
  const upd = (save) => { cfg[id] = parseFloat(el.value); if (out) out.textContent = el.value; if (save) { PS[id] = cfg[id]; savePS(); } onCfg(id); };
  el.addEventListener('input', () => upd(true)); cfg[id] = parseFloat(el.value); if (out) out.textContent = el.value;
}
const CHECKS = ['wink', 'autoEmo', 'mirror', 'autoBlink', 'breath', 'micBounce', 'micExpr', 'preview'];
for (const id of CHECKS) {
  const el = $(id); if (id in PS) el.checked = PS[id];
  if (params.get(id) === '0') el.checked = false; if (params.get(id) === '1') el.checked = true;
  cfg[id] = el.checked; el.onchange = () => { cfg[id] = el.checked; PS[id] = cfg[id]; savePS(); onCfg(id); };
}
$('lipMode').value = PS.lipMode || 'fallback'; cfg.lipMode = $('lipMode').value;
$('lipMode').onchange = e => { cfg.lipMode = PS.lipMode = e.target.value; savePS(); };
cfg.frame = params.get('frame') || PS.frame || 'bust';
function onCfg(id) {
  if (id === 'mirror') document.body.classList.toggle('mirror', cfg.mirror);
  if (id === 'preview') document.body.classList.toggle('preview', cfg.preview);
  if (['zoom', 'camY', 'camX', 'camRot'].includes(id)) frameCamera();
  if (id === 'light' || id === 'lightDir') applyLight();
}
document.body.classList.toggle('mirror', cfg.mirror);
document.body.classList.toggle('preview', cfg.preview);
const status = s => { $('status').textContent = s; VV.status = s; };
const showErr = s => { const e = $('err'); e.hidden = !s; e.textContent = s || ''; };

// ---------- three.js ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: params.get('shot') === '1' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
const dirLight = new THREE.DirectionalLight(0xffffff, Math.PI);
const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(dirLight, ambLight, dirLight.target);
function applyLight() {
  const a = (cfg.lightDir || 0) * D2R;
  dirLight.position.set(Math.sin(a) * 2, 2.2, Math.cos(a) * 2);
  dirLight.intensity = Math.PI * cfg.light; ambLight.intensity = 0.6 * cfg.light;
}
applyLight();
function resize() {
  const r = $('stage').getBoundingClientRect();
  const w = Math.max(1, r.width), h = Math.max(1, r.height);
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); frameCamera();
}
new ResizeObserver(resize).observe($('stage'));

// ---------- 아바타 ----------
let vrm = null, rig = null; // rig: { headY, height, hipsY, rootQ, rootQi, has: {expr} }
const loader = new GLTFLoader();
loader.register(p => new VRMLoaderPlugin(p));
const EXPRS = ['aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight', 'happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral'];

async function loadVRM(src, name) {
  status('아바타 불러오는 중…'); showErr('');
  let gltf;
  try { gltf = typeof src === 'string' ? await loader.loadAsync(src) : await loader.parseAsync(src, ''); }
  catch (e) { console.error(e); showErr('VRM을 불러오지 못했어요: ' + (e.message || e)); status('불러오기 실패'); return false; }
  const v = gltf.userData.vrm;
  if (!v) { showErr('VRM 파일이 아니에요 (VRM 확장 정보가 없음).'); status('불러오기 실패'); return false; }
  if (vrm) { scene.remove(vrm.scene); VRMUtils.deepDispose(vrm.scene); }
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  if (VRMUtils.combineSkeletons) VRMUtils.combineSkeletons(gltf.scene); else if (VRMUtils.removeUnnecessaryJoints) VRMUtils.removeUnnecessaryJoints(gltf.scene);
  VRMUtils.rotateVRM0(v); // VRM0은 180° 돌려서 카메라(+Z)를 보게
  v.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  vrm = v; scene.add(vrm.scene);
  if (vrm.lookAt) vrm.lookAt.target = null; // 시선은 yaw/pitch로 직접 지정
  const rootQ = vrm.scene.quaternion.clone();
  const has = {}; for (const n of EXPRS) has[n] = !!vrm.expressionManager?.getExpression(n);
  const hipsN = vrm.humanoid.getNormalizedBoneNode('hips');
  rig = { rootQ, rootQi: rootQ.clone().invert(), has, hipsPos: hipsN.position.clone() };
  vrm.humanoid.resetNormalizedPose(); vrm.update(0); vrm.scene.updateMatrixWorld(true);
  const wp = n => { const b = vrm.humanoid.getNormalizedBoneNode(n) || vrm.humanoid.getRawBoneNode(n); return b ? b.getWorldPosition(new THREE.Vector3()) : null; };
  const head = wp('head'), neck = wp('neck') || head, hips = wp('hips');
  const box = new THREE.Box3().setFromObject(vrm.scene);
  rig.headY = head.y; rig.neckY = neck.y; rig.height = box.max.y; rig.top = Math.max(box.max.y, head.y + 0.12); rig.hipsY = hips.y; rig.centerX = head.x;
  rig.lowerArm = !!vrm.humanoid.getNormalizedBoneNode('leftLowerArm');
  const meta = vrm.meta || {};
  const title = meta.name || meta.title || name || '이름 없음';
  $('avatarName').textContent = `아바타: ${title} (VRM ${meta.metaVersion === '0' ? '0.x' : '1.0'})`;
  VV.loaded = true; VV.avatar = { title, version: meta.metaVersion, has, lookAt: vrm.lookAt?.applier?.constructor?.type || (vrm.lookAt ? 'yes' : 'none') };
  buildExprButtons(); frameCamera(); status(mode === 'demo' ? '데모 모드' : mode === 'track' ? `추적 중 (${tracker.delegate})` : '대기 중');
  return true;
}

// 아바타 기억 (IndexedDB) — 파일은 기기 밖으로 나가지 않음
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('vv_avatar', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const idbGet = async () => { const db = await idb(); return new Promise(res => { const q = db.transaction('f').objectStore('f').get('vrm'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); };
const idbPut = async v => { const db = await idb(); return new Promise(res => { const tx = db.transaction('f', 'readwrite'); v ? tx.objectStore('f').put(v, 'vrm') : tx.objectStore('f').delete('vrm'); tx.oncomplete = res; tx.onerror = res; }); };
async function loadFile(file) {
  if (!file) return;
  if (!/\.vrm$/i.test(file.name) && !/\.glb$/i.test(file.name)) { showErr('.vrm 파일만 불러올 수 있어요.'); return; }
  const buf = await file.arrayBuffer();
  if (await loadVRM(buf, file.name)) { try { await idbPut({ name: file.name, buf }); } catch {} }
}
$('vrmFile').onchange = e => loadFile(e.target.files[0]);
$('vrmDefault').onclick = async () => { await idbPut(null).catch(() => {}); loadVRM(DEFAULT_VRM, '기본'); };
{ let dc = 0; const drop = $('drop');
  addEventListener('dragenter', e => { e.preventDefault(); dc++; drop.hidden = false; });
  addEventListener('dragleave', () => { if (--dc <= 0) { dc = 0; drop.hidden = true; } });
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => { e.preventDefault(); dc = 0; drop.hidden = true; loadFile(e.dataTransfer.files[0]); });
}

// ---------- 카메라 프레이밍 ----------
function frameCamera() {
  if (!rig) { camera.position.set(0, 1.3, 1.2); camera.lookAt(0, 1.3, 0); return; }
  const tan = Math.tan(camera.fov * D2R / 2), z = cfg.zoom || 1;
  let ty, viewH;
  if (cfg.frame === 'full') { viewH = rig.top * 1.12; ty = rig.top / 2; }
  else { viewH = (rig.top - rig.neckY) * 2.4 + 0.1; ty = rig.neckY + (rig.top - rig.neckY) * 0.25; }
  // 세로 화면(휴대폰)에서는 가로가 좁으니 어깨가 잘리지 않게 거리 보정
  const needW = cfg.frame === 'full' ? 0.6 : 0.62; const fitW = needW / (2 * tan * camera.aspect);
  let dist = Math.max(viewH / (2 * tan), fitW) / z;
  ty += (cfg.camY || 0) * (cfg.frame === 'full' ? rig.top : 0.5);
  const a = (cfg.camRot || 0) * D2R, cx = rig.centerX + (cfg.camX || 0) * (cfg.frame === 'full' ? 1 : 0.5);
  camera.position.set(cx + Math.sin(a) * dist, ty, Math.cos(a) * dist);
  camera.lookAt(cx, ty, 0);
  dirLight.target.position.set(0, ty, 0);
}
for (const b of $('frameRow').querySelectorAll('button')) {
  b.classList.toggle('on', b.dataset.f === cfg.frame);
  b.onclick = () => { cfg.frame = PS.frame = b.dataset.f; savePS(); for (const x of $('frameRow').children) x.classList.toggle('on', x === b); frameCamera(); };
}
$('camReset').onclick = () => { for (const [id, v] of [['zoom', 1], ['camY', 0], ['camX', 0], ['camRot', 0], ['light', 1], ['lightDir', -25]]) { $(id).value = v; $(id).dispatchEvent(new Event('input')); } };
for (const [q, id] of [['zoom', 'zoom'], ['y', 'camY'], ['x', 'camX'], ['rot', 'camRot']]) if (params.get(q) !== null && !isNaN(+params.get(q))) { $(id).value = +params.get(q); cfg[id] = +params.get(q); $(id).nextElementSibling.textContent = $(id).value; }
// 휠 / 핀치 확대
canvas.addEventListener('wheel', e => { e.preventDefault(); const el = $('zoom'); el.value = clamp(+el.value * Math.exp(-e.deltaY * 0.001), +el.min, +el.max); el.dispatchEvent(new Event('input')); }, { passive: false });
{ const pts = new Map(); let d0 = 0, z0 = 1;
  canvas.addEventListener('pointerdown', e => { pts.set(e.pointerId, e); if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); z0 = cfg.zoom; } });
  canvas.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e); if (pts.size === 2 && d0) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); const el = $('zoom'); el.value = clamp(z0 * d / d0, +el.min, +el.max); el.dispatchEvent(new Event('input')); } });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) d0 = 0; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
}

// ---------- 표정 프리셋 ----------
const PRESETS = [['auto', '자동'], ['happy', '웃음'], ['angry', '화남'], ['sad', '슬픔'], ['relaxed', '즐거움'], ['surprised', '놀람']];
let exprOverride = 'auto';
function buildExprButtons() {
  const box = $('expr'); box.innerHTML = '';
  PRESETS.forEach(([k, label], i) => {
    const b = document.createElement('button'); b.textContent = `${i + 1} ${label}`; b.dataset.e = k;
    const na = k !== 'auto' && rig && !rig.has[k]; b.classList.toggle('na', na); if (na) b.title = '이 아바타에는 이 표정이 없어요';
    b.classList.toggle('on', k === exprOverride); b.onclick = () => setExpr(k); box.appendChild(b);
  });
}
function setExpr(k) { exprOverride = k; for (const b of $('expr').children) b.classList.toggle('on', b.dataset.e === k); VV.exprOverride = k; }

// ---------- 추적 상태 ----------
const bank = new FilterBank();
function updFilter() { // 부드러움 0→컷오프 6Hz(민감), 1→0.25Hz(아주 부드러움)
  const s = cfg.smooth; bank.set(lerp(6, 0.25, Math.pow(s, 0.8)), lerp(0.02, 3, cfg.beta * cfg.beta));
}
let mode = 'idle', faceSeen = -1e9, lastVideoTime = -1, trackCount = 0, trackT0 = 0;
const calib = PS.calib || null; // { q:[x,y,z,w], t:[x,y,z], bs:{...} }
let neutral = calib ? { q: new THREE.Quaternion().fromArray(calib.q), t: new THREE.Vector3().fromArray(calib.t), bs: calib.bs } : null;
let lastRaw = null, autoCalibAt = 0;
// 목표값(필터 후) / 화면 값(렌더 프레임마다 보간)
const tgt = { yaw: 0, pitch: 0, roll: 0, lean: 0, leanZ: 0, eL: 0, eR: 0, gx: 0, gy: 0, aa: 0, ih: 0, ou: 0, ee: 0, oh: 0, happy: 0, angry: 0, sad: 0, relaxed: 0, surprised: 0 };
const cur = { ...tgt };
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler();

function avg(bs, a, b) { return ((bs[a] || 0) + (bs[b] || 0)) / 2; }
// 원시 결과 → 목표값 (거울/보정/감도/필터 적용)
function ingest(raw, tSec) {
  const bs = raw.bs, nb = neutral?.bs || {};
  // --- 머리 회전: MediaPipe 얼굴 변환 행렬 (원본 카메라 기준, 얼굴 정면 = +Z, 아바타도 +Z를 봄 → 그대로 대응)
  if (raw.m) {
    _m.fromArray(raw.m); _m.decompose(_p, _q, _s);
    if (neutral) _q.premultiply(_qi.copy(neutral.q).invert());
    if (cfg.mirror) { _q.y = -_q.y; _q.z = -_q.z; }
    _e.setFromQuaternion(_q, 'YXZ');
    const k = cfg.headSens;
    const yaw = clamp(_e.y * k / D2R, -75, 75), pitch = clamp(_e.x * k / D2R, -55, 55), roll = clamp(_e.z * k / D2R, -50, 50);
    let tx = _p.x - (neutral ? neutral.t.x : 0), ty = _p.y - (neutral ? neutral.t.y : 0);
    if (cfg.mirror) tx = -tx;
    tgt.yaw = bank.run('yaw', yaw, tSec); tgt.pitch = bank.run('pitch', pitch, tSec); tgt.roll = bank.run('roll', roll, tSec);
    tgt.lean = bank.run('lean', clamp(-tx * 0.7, -12, 12), tSec, 0.7); // 몸을 옆으로 옮기면 상체 기울기
    tgt.leanZ = bank.run('leanZ', clamp(ty * 0.4, -6, 6), tSec, 0.7);
  }
  // --- 눈: 좌우 따로 (거울: 사용자 왼눈 → 아바타 오른눈 = 화면 왼쪽)
  const th = cfg.blinkTh;
  const eye = (side) => { const v = bs['eyeBlink' + side] || 0, n0 = Math.min(nb['eyeBlink' + side] ?? 0.1, th - 0.15); return smoothstep((v - n0 - 0.04) / Math.max(0.08, th - n0 - 0.04)); };
  let uL = eye('Left'), uR = eye('Right');
  if (!cfg.wink || Math.abs(uL - uR) < 0.45) { const m = Math.max(uL, uR) * 0.6 + Math.min(uL, uR) * 0.4; uL = uR = m; }
  const aL = cfg.mirror ? uR : uL, aR = cfg.mirror ? uL : uR;
  tgt.eL = bank.run('eL', aL, tSec, 4, 2); tgt.eR = bank.run('eR', aR, tSec, 4, 2);
  // --- 시선 (+gx = 사용자 왼쪽, +gy = 위)
  const gx = ((bs.eyeLookOutLeft || 0) + (bs.eyeLookInRight || 0) - (bs.eyeLookInLeft || 0) - (bs.eyeLookOutRight || 0)) / 2;
  const gy = ((bs.eyeLookUpLeft || 0) + (bs.eyeLookUpRight || 0) - (bs.eyeLookDownLeft || 0) - (bs.eyeLookDownRight || 0)) / 2;
  const gx0 = neutral?.gx || 0, gy0 = neutral?.gy || 0;
  tgt.gx = bank.run('gx', (cfg.mirror ? -1 : 1) * (gx - gx0), tSec, 1.5); tgt.gy = bank.run('gy', gy - gy0, tSec, 1.5);
  // --- 입 (모음 AIUEO)
  const ms = cfg.mouthSens;
  const jaw = clamp01(((bs.jawOpen || 0) - (nb.jawOpen || 0) * 0.8 - 0.02) * ms);
  const funnel = clamp01(((bs.mouthFunnel || 0) - (nb.mouthFunnel || 0)) * ms * 1.1);
  const pucker = clamp01(((bs.mouthPucker || 0) - (nb.mouthPucker || 0)) * ms);
  const smile = clamp01(avg(bs, 'mouthSmileLeft', 'mouthSmileRight') - (avg(nb, 'mouthSmileLeft', 'mouthSmileRight') || 0) * 0.8);
  const stretch = clamp01((avg(bs, 'mouthStretchLeft', 'mouthStretchRight') - (avg(nb, 'mouthStretchLeft', 'mouthStretchRight') || 0)) * 2.2);
  const lowerDown = clamp01((avg(bs, 'mouthLowerDownLeft', 'mouthLowerDownRight') - (avg(nb, 'mouthLowerDownLeft', 'mouthLowerDownRight') || 0)) * ms);
  const open = clamp01(Math.max(jaw, lowerDown * 0.7));
  const round = clamp01(Math.max(funnel, pucker * 0.9));
  const wide = clamp01(stretch + smile * 0.6);
  let v = {
    aa: open * (1 - round) * (1 - wide * 0.55),
    oh: open * round,
    ou: round * (1 - open) * 0.85,
    ee: open * wide * (1 - round) * 0.9,
    ih: wide * (1 - open) * (1 - round) * 0.45 * clamp01(lowerDown * 4 + jaw * 4),
  };
  const sum = v.aa + v.ih + v.ou + v.ee + v.oh; if (sum > 1) for (const k in v) v[k] /= sum;
  for (const k in v) tgt[k] = bank.run(k, v[k], tSec, 2.5, 2);
  // --- 감정
  const es = cfg.emoSens;
  const browDown = avg(bs, 'browDownLeft', 'browDownRight') - (avg(nb, 'browDownLeft', 'browDownRight') || 0);
  const browUp = (bs.browInnerUp || 0) - (nb.browInnerUp || 0);
  const frown = avg(bs, 'mouthFrownLeft', 'mouthFrownRight') - (avg(nb, 'mouthFrownLeft', 'mouthFrownRight') || 0);
  const wideEye = avg(bs, 'eyeWideLeft', 'eyeWideRight') - (avg(nb, 'eyeWideLeft', 'eyeWideRight') || 0);
  const cheek = avg(bs, 'cheekSquintLeft', 'cheekSquintRight');
  let e = { happy: 0, angry: 0, sad: 0, relaxed: 0, surprised: 0 };
  if (cfg.autoEmo) {
    e.happy = smoothstep((smile + cheek * 0.3 - 0.38) / 0.35) * es;
    e.relaxed = smoothstep((smile - 0.12) / 0.22) * (1 - e.happy) * 0.55 * es;
    e.angry = smoothstep((browDown - 0.3) / 0.35) * (1 - e.happy) * es;
    e.sad = smoothstep((browUp * 0.7 + frown * 0.9 - 0.35) / 0.35) * (1 - e.happy) * (1 - e.angry) * es;
    e.surprised = smoothstep((browUp * 0.6 + wideEye * 0.9 + jaw * 0.25 - 0.55) / 0.35) * (1 - e.happy) * es;
  }
  for (const k in e) tgt[k] = bank.run('e_' + k, clamp01(e[k]), tSec, 0.8);
  lastRaw = { bs, m: raw.m };
  VV.raw = { jaw: +jaw.toFixed(3), blinkL: +(bs.eyeBlinkLeft || 0).toFixed(3), blinkR: +(bs.eyeBlinkRight || 0).toFixed(3), smile: +smile.toFixed(3), yaw: +tgt.yaw.toFixed(2), pitch: +tgt.pitch.toFixed(2), roll: +tgt.roll.toFixed(2) };
}
const _qi = new THREE.Quaternion();
function calibrate() {
  if (!lastRaw || !lastRaw.m) { showErr('얼굴이 인식된 상태에서 눌러 주세요.'); return; }
  _m.fromArray(lastRaw.m); _m.decompose(_p, _q, _s);
  const bs = lastRaw.bs;
  const gx = ((bs.eyeLookOutLeft || 0) + (bs.eyeLookInRight || 0) - (bs.eyeLookInLeft || 0) - (bs.eyeLookOutRight || 0)) / 2;
  const gy = ((bs.eyeLookUpLeft || 0) + (bs.eyeLookUpRight || 0) - (bs.eyeLookDownLeft || 0) - (bs.eyeLookDownRight || 0)) / 2;
  neutral = { q: _q.clone(), t: _p.clone(), bs: { ...bs }, gx, gy };
  PS.calib = { q: _q.toArray(), t: _p.toArray(), bs: neutral.bs, gx, gy }; savePS(); bank.reset();
  showErr(''); status('정면 보정 완료'); VV.calibrated = true;
}
if (neutral && PS.calib) { neutral.gx = PS.calib.gx || 0; neutral.gy = PS.calib.gy || 0; }
$('calib').onclick = calibrate;

// ---------- 데모 (카메라 없이 동작 순환) — 실제 추적과 같은 경로(ingest)로 가짜 결과를 넣음 ----------
function demoRaw(t) {
  const s = t / 1000;
  const yaw = Math.sin(s * 0.7) * 28 + Math.sin(s * 1.9) * 4, pitch = Math.sin(s * 0.53 + 1) * 14, roll = Math.sin(s * 0.41 + 2) * 12;
  _e.set(pitch * D2R, (cfg.mirror ? -yaw : yaw) * D2R, (cfg.mirror ? -roll : roll) * D2R, 'YXZ'); _q.setFromEuler(_e);
  if (neutral) _q.premultiply(neutral.q);
  _m.compose(new THREE.Vector3(Math.sin(s * 0.33) * 6 + (neutral ? neutral.t.x : 0), (neutral ? neutral.t.y : 0), -40), _q, new THREE.Vector3(1, 1, 1));
  const ph = (s % 12);
  const blinkPh = (s % 3.7) < 0.16 ? 1 : 0, winkPh = ph > 9.5 && ph < 10.3 ? 1 : 0;
  const vowel = Math.floor(s * 2.2) % 6; const talk = ph < 6 ? Math.abs(Math.sin(s * 9)) : 0;
  const bs = { eyeBlinkLeft: Math.max(blinkPh, winkPh) * 0.9, eyeBlinkRight: blinkPh * 0.9,
    jawOpen: talk * [0.5, 0.15, 0.2, 0.3, 0.4, 0][vowel], mouthFunnel: talk * [0, 0, 0.5, 0, 0.6, 0][vowel], mouthPucker: talk * [0, 0, 0.6, 0, 0.2, 0][vowel],
    mouthStretchLeft: talk * [0, 0.5, 0, 0.4, 0, 0][vowel], mouthStretchRight: talk * [0, 0.5, 0, 0.4, 0, 0][vowel], mouthLowerDownLeft: talk * 0.2, mouthLowerDownRight: talk * 0.2,
    mouthSmileLeft: ph > 6 && ph < 8.5 ? 0.85 : 0.05, mouthSmileRight: ph > 6 && ph < 8.5 ? 0.85 : 0.05,
    browDownLeft: ph > 10.5 && ph < 12 ? 0.8 : 0, browDownRight: ph > 10.5 && ph < 12 ? 0.8 : 0,
    eyeLookOutLeft: Math.max(0, Math.sin(s * 1.3)) * 0.5, eyeLookInRight: Math.max(0, Math.sin(s * 1.3)) * 0.5,
    eyeLookInLeft: Math.max(0, -Math.sin(s * 1.3)) * 0.5, eyeLookOutRight: Math.max(0, -Math.sin(s * 1.3)) * 0.5 };
  return { bs, m: _m.toArray() };
}

// ---------- 카메라 ----------
const video = $('video');
async function startCamera() {
  showErr('');
  if (!navigator.mediaDevices?.getUserMedia) { showErr('이 브라우저는 카메라를 지원하지 않거나 HTTPS가 아니에요. localhost 또는 HTTPS 주소로 열어 주세요.'); return; }
  $('start').disabled = true;
  try {
    status('카메라 권한 요청 중…');
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }, audio: false });
    video.srcObject = stream; await video.play();
    status('얼굴 인식 모델 불러오는 중…');
    await loadTracker();
    mode = 'track'; bank.reset(); trackT0 = performance.now(); autoCalibAt = neutral ? 0 : performance.now() + 1500;
    status(`추적 중 (${tracker.delegate})`); $('start').textContent = '■ 카메라 끄기'; $('start').disabled = false;
    $('start').onclick = stopCamera;
  } catch (e) {
    console.error(e);
    showErr(e?.name === 'NotAllowedError' ? '카메라 권한이 거부됐어요. 브라우저 설정에서 허용해 주세요.' : ('카메라/모델을 시작하지 못했어요: ' + (e.message || e)));
    status('대기 중'); $('start').disabled = false;
  }
}
function stopCamera() {
  const s = video.srcObject; if (s) s.getTracks().forEach(t => t.stop()); video.srcObject = null;
  mode = 'idle'; status('대기 중'); $('start').textContent = '▶ 카메라 시작'; $('start').onclick = startCamera;
}
$('start').onclick = startCamera;
function startDemo() { if (mode === 'track') stopCamera(); mode = 'demo'; bank.reset(); status('데모 모드'); }
$('demo').onclick = () => mode === 'demo' ? (mode = 'idle', status('대기 중')) : startDemo();
$('micBtn').onclick = async () => {
  $('micBtn').disabled = true; showErr('');
  if (await startMic()) { $('micBtn').textContent = '🎤 마이크 켜짐'; $('meter').hidden = false; }
  else { showErr(mic.err); $('micBtn').disabled = false; }
};

// ---------- 뼈대 적용 ----------
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _ea = new THREE.Euler();
// 아바타 공간(+Z를 봄, +X = 아바타 왼쪽) 기준 회전(도)을 정규화 뼈 로컬 회전으로 (VRM0은 루트가 180° 돌아 있어 보정)
function setBone(name, x, y, z, order = 'YXZ') {
  const b = vrm.humanoid.getNormalizedBoneNode(name); if (!b) return false;
  _ea.set(x * D2R, y * D2R, z * D2R, order); _qa.setFromEuler(_ea);
  b.quaternion.copy(rig.rootQi).multiply(_qa).multiply(rig.rootQ);
  return true;
}
let blinkUntil = 0, nextBlink = 0, bounce = 0, excHi = false, excSince = 0, calmSince = 0;
function autoBlink(t) {
  if (t > nextBlink) { blinkUntil = t + 150; nextBlink = t + 2200 + Math.random() * 3800; if (Math.random() < 0.15) nextBlink = t + 350; }
  if (t >= blinkUntil) return 0;
  const p = 1 - (blinkUntil - t) / 150; return Math.sin(p * Math.PI);
}
function applyAvatar(t, dt) {
  const tracking = (mode === 'track' || mode === 'demo') && t - faceSeen < 600;
  VV.tracking = tracking;
  // 렌더 프레임 보간: 추적(약 30fps) 사이를 부드럽게 이어줌
  const k = 1 - Math.exp(-dt / 0.035), kb = 1 - Math.exp(-dt / 0.02), kRelax = 1 - Math.exp(-dt / 0.5);
  for (const n in cur) {
    if (tracking) cur[n] += (tgt[n] - cur[n]) * (n === 'eL' || n === 'eR' ? kb : k);
    else cur[n] += (0 - cur[n]) * kRelax; // 인식이 끊기면 천천히 정면으로
  }
  const s = t / 1000;
  // --- 숨쉬기 / 흔들림
  const br = cfg.breath ? 1 : 0;
  const breath = Math.sin(s * 2 * Math.PI / 3.8) * br, sway = Math.sin(s * 0.45) * br, sway2 = Math.sin(s * 0.31 + 1) * br;
  // --- 마이크
  const e = mic.on ? micTick(t, cfg.micSens) : 0;
  VV.mic = mic.on ? { level: +mic.level.toFixed(3), score: +e.toFixed(3), bounce: +bounce.toFixed(3) } : null;
  if (mic.on) { $('meterBar').style.width = (e * 100).toFixed(0) + '%'; $('lvBar').style.width = (mic.level * 100).toFixed(0) + '%'; }
  if (e > 0.6) { calmSince = 0; if (!excSince) excSince = t; if (t - excSince > 700) excHi = true; }
  else { excSince = 0; if (e < 0.35) { if (!calmSince) calmSince = t; if (t - calmSince > 1200) excHi = false; } else calmSince = 0; }
  if (!mic.on) excHi = false;
  const bAmp = cfg.micBounce && mic.on ? smoothstep((e - 0.3) / 0.5) : 0;
  bounce += (bAmp - bounce) * (1 - Math.exp(-dt / 0.25));
  // --- 머리 · 몸 분배
  const f = cfg.bodyFollow, spineW = 0.12 + 0.18 * f, chestW = 0.1 + 0.2 * f;
  const neckW = (1 - spineW - chestW) * 0.4, headW = (1 - spineW - chestW) * 0.6;
  const Y = cur.yaw, P = cur.pitch, R = cur.roll;
  const idleY = tracking ? 0 : sway2 * 3, idleP = tracking ? 0 : Math.sin(s * 0.6) * 2;
  setBone('hips', 0, Y * 0.05 * f, -cur.lean * 0.15);
  setBone('spine', P * spineW * 0.6 + breath * 0.6, Y * spineW + idleY * 0.3, R * spineW * 0.7 + cur.lean * 0.5 + sway * 0.8);
  setBone('chest', P * chestW * 0.6 - breath * 1.2, Y * chestW + idleY * 0.3, R * chestW * 0.7 + cur.lean * 0.3);
  setBone('upperChest', 0, 0, 0);
  setBone('neck', P * neckW + idleP * 0.4, Y * neckW + idleY * 0.4, R * neckW);
  setBone('head', P * (headW + spineW * 0.4 + chestW * 0.4) + idleP * 0.6, Y * headW, R * (headW + (spineW + chestW) * 0.3) - sway * 0.6);
  // --- 팔: T포즈 → 편하게 내림 (숨쉴 때 살짝 들썩)
  const ad = cfg.armDown, arm = ad + breath * 1.2;
  setBone('leftShoulder', 0, 0, -breath * 0.6); setBone('rightShoulder', 0, 0, breath * 0.6);
  setBone('leftUpperArm', 4, -6, -arm, 'XYZ'); setBone('rightUpperArm', 4, 6, arm, 'XYZ');
  setBone('leftLowerArm', 0, -18 * ad / 72, 0); setBone('rightLowerArm', 0, 18 * ad / 72, 0);
  setBone('leftHand', 0, -6, -6 * ad / 72); setBone('rightHand', 0, 6, 6 * ad / 72);
  for (const side of ['left', 'right']) { const sg = side === 'left' ? -1 : 1;
    for (const fn of ['Index', 'Middle', 'Ring', 'Little']) for (const seg of ['Proximal', 'Intermediate', 'Distal']) setBone(side + fn + seg, 0, 0, sg * (fn === 'Index' ? 12 : 18) * ad / 72);
    setBone(side + 'ThumbProximal', 0, sg * -10 * ad / 72, 0); }
  // --- 통통 튀기 (신남)
  const hips = vrm.humanoid.getNormalizedBoneNode('hips');
  hips.position.copy(rig.hipsPos); hips.position.y += bounce * 0.025 * Math.abs(Math.sin(s * Math.PI * 2.4)) + breath * 0.002;
  // --- 표정
  const em = vrm.expressionManager; if (!em) return;
  let eL = cur.eL, eR = cur.eR;
  if (!tracking && cfg.autoBlink) { const b = autoBlink(t); eL = Math.max(eL, b); eR = Math.max(eR, b); }
  const emo = { happy: cur.happy, angry: cur.angry, sad: cur.sad, relaxed: cur.relaxed, surprised: cur.surprised };
  if (excHi && cfg.micExpr && exprOverride === 'auto') emo.happy = Math.max(emo.happy, 0.8);
  if (exprOverride !== 'auto') { for (const n in emo) emo[n] = 0; emo[exprOverride] = 1; }
  // 없는 표정 대체: 놀람 → 입 살짝 벌림 / 즐거움 → 웃음 약하게
  if (!rig.has.relaxed && emo.relaxed > 0) emo.happy = Math.max(emo.happy, emo.relaxed * 0.5);
  let emoSum = 0; for (const n in emo) emoSum += emo[n];
  if (emoSum > 1) for (const n in emo) emo[n] /= emoSum;
  for (const n in emo) if (rig.has[n]) em.setValue(n, emo[n]);
  // 웃음 표정(눈을 감는 경우가 많음)과 깜빡임이 겹쳐 과해지지 않게
  const eyeScale = 1 - Math.max(emo.happy, emo.relaxed * 0.5) * 0.85;
  if (rig.has.blinkLeft && rig.has.blinkRight) { em.setValue('blinkLeft', clamp01(eL) * eyeScale); em.setValue('blinkRight', clamp01(eR) * eyeScale); if (rig.has.blink) em.setValue('blink', 0); }
  else if (rig.has.blink) em.setValue('blink', clamp01((eL + eR) / 2) * eyeScale);
  // 입 + 마이크 립싱크
  const mouthScale = 1 - emo.happy * 0.25;
  let vis = { aa: cur.aa, ih: cur.ih, ou: cur.ou, ee: cur.ee, oh: cur.oh };
  const lv = mic.on ? mic.level : 0;
  if (lv > 0 && (cfg.lipMode === 'boost' || (cfg.lipMode === 'fallback' && !tracking))) {
    const tot = vis.aa + vis.ih + vis.ou + vis.ee + vis.oh;
    if (lv > tot) { const wob = 0.5 + 0.5 * Math.sin(s * 13); vis.aa = Math.max(vis.aa, lv * (0.6 + 0.3 * wob)); vis.oh = Math.max(vis.oh, lv * 0.25 * (1 - wob)); }
  }
  if (!rig.has.surprised && emo.surprised > 0) vis.oh = Math.max(vis.oh, emo.surprised * 0.35);
  for (const n in vis) if (rig.has[n]) em.setValue(n, clamp01(vis[n] * mouthScale));
  VV.vis = Object.fromEntries(Object.entries(vis).map(([k, v]) => [k, +v.toFixed(3)]));
  // 시선 (yaw/pitch: 입력 각도, VRM lookAt 범위 맵이 실제 눈 회전으로 변환)
  if (vrm.lookAt) {
    const g = cfg.gaze, idleGx = tracking ? 0 : Math.sin(s * 0.27) * 0.15;
    vrm.lookAt.yaw = clamp((cur.gx + idleGx) * g * 70, -90, 90);
    vrm.lookAt.pitch = clamp(-cur.gy * g * 70, -90, 90);
  }
  VV.cur = Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, +(+v).toFixed(3)]));
}

// ---------- 메인 루프 ----------
let last = performance.now(), fpsN = 0, fpsT = last, tN = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  updFilter();
  if (mode === 'track' && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    try {
      const r = detect(video, t);
      if (r) { ingest(r, t / 1000); faceSeen = t; tN++; trackCount++; if (autoCalibAt && t > autoCalibAt) { autoCalibAt = 0; calibrate(); } }
    } catch (e) { console.error(e); VV.errors.push('detect: ' + e.message); }
    status(t - faceSeen < 600 ? `추적 중 (${tracker.delegate})` : '얼굴을 찾는 중…');
  } else if (mode === 'demo') { ingest(demoRaw(t), t / 1000); faceSeen = t; tN++; }
  if (vrm && rig) { applyAvatar(t, dt); vrm.update(dt); }
  renderer.render(scene, camera);
  VV.frames++; fpsN++;
  if (t - fpsT > 1000) { $('fps').textContent = 'FPS ' + Math.round(fpsN * 1000 / (t - fpsT)); $('tfps').textContent = '추적 ' + Math.round(tN * 1000 / (t - fpsT)); VV.fps = fpsN; VV.tfps = tN; fpsN = 0; tN = 0; fpsT = t; }
}

// ---------- 배경 / 클린 뷰 / OBS ----------
const setBg = c => { document.body.style.backgroundColor = c; $('bg').value = c; PS.bg = c; savePS(); };
$('bg').addEventListener('input', e => setBg(e.target.value));
$('green').onclick = () => { setTransp(false); setBg('#00ff00'); };
const setTransp = on => { document.body.classList.toggle('transp', on); document.documentElement.classList.toggle('transp', on); $('transp').checked = on; PS.transp = on; };
$('transp').onchange = e => { setTransp(e.target.checked); savePS(); };
if (PS.bg) setBg(PS.bg); if (PS.transp) setTransp(true);
const bgParam = params.get('bg');
if (bgParam === 'transparent' || params.get('transparent') === '1') setTransp(true);
else if (bgParam) { setTransp(false); document.body.style.backgroundColor = '#' + bgParam.replace('#', ''); $('bg').value = '#' + bgParam.replace('#', '').slice(0, 6); }
const setClean = on => { document.body.classList.toggle('clean', on); requestAnimationFrame(resize); };
$('clean').onclick = () => setClean(true);
if (params.get('clean') === '1') setClean(true);
if (params.get('obs') === '1') { setClean(true); if (!bgParam) setTransp(true); }
$('panelToggle').onclick = () => { document.body.classList.toggle('collapsed'); requestAnimationFrame(resize); };
function obsUrl() {
  const u = new URL(location.origin + location.pathname);
  u.searchParams.set('obs', '1'); u.searchParams.set('autostart', '1');
  if (!cfg.mirror) u.searchParams.set('mirror', '0');
  if (cfg.frame !== 'bust') u.searchParams.set('frame', cfg.frame);
  if (cfg.zoom !== 1) u.searchParams.set('zoom', cfg.zoom); if (cfg.camY) u.searchParams.set('y', cfg.camY); if (cfg.camX) u.searchParams.set('x', cfg.camX); if (cfg.camRot) u.searchParams.set('rot', cfg.camRot);
  if (!document.body.classList.contains('transp')) u.searchParams.set('bg', $('bg').value.replace('#', ''));
  return u.toString();
}
$('obsCopy').onclick = async () => {
  const url = obsUrl(), msg = $('obsMsg'); msg.hidden = false;
  try { await navigator.clipboard.writeText(url); msg.textContent = '복사됨! OBS > 소스 추가 > 브라우저에 붙여넣기: ' + url; }
  catch { msg.textContent = '아래 주소를 길게 눌러 복사하세요: ' + url; }
};
window.__obsUrl = obsUrl;
document.addEventListener('keydown', e => {
  if (e.target?.closest?.('input,textarea,select')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === 'h' || e.key === 'H') setClean(!document.body.classList.contains('clean'));
  if (e.key === 'Escape') setClean(false);
  const i = '123456'.indexOf(e.key); if (i >= 0) setExpr(PRESETS[i][0]);
});
let lastTap = 0;
$('stage').addEventListener('pointerup', () => { const t = performance.now(); if (t - lastTap < 350 && document.body.classList.contains('clean')) setClean(false); lastTap = t; });
document.addEventListener('dblclick', () => setClean(false));

// ---------- 시작 ----------
buildExprButtons();
resize();
requestAnimationFrame(loop);
(async () => {
  let ok = false;
  if (params.get('vrm')) ok = await loadVRM(params.get('vrm'), params.get('vrm'));
  if (!ok && params.get('default') !== '1') {
    try { const saved = await idbGet(); if (saved?.buf) ok = await loadVRM(saved.buf, saved.name); } catch {}
  }
  if (!ok) await loadVRM(DEFAULT_VRM, '기본');
  if (params.get('demo') === '1') startDemo();
  else if (params.get('autostart') === '1') startCamera();
})();
