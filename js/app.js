// 3D VTuber (VRM) v4 — Warudo 설정 호환 (실제 Warudo 0.15.1 씬 자료로 검증) + 입 따라하기 확장. three.js + @pixiv/three-vrm + MediaPipe FaceLandmarker. 모든 처리는 브라우저 안에서만.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VRMLoaderPlugin, VRMUtils } from '@pixiv/three-vrm';
import { FilterBank } from './filter.js';
import { loadTracker, detect, tracker } from './tracker.js';
import { mic, startMic, micTick } from './mic.js';
import * as WD from './warudo.js?v=4';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEFAULT_VRM = 'assets/FirstundHoodieBoy_v2_VRM0.vrm';
// 로컬 테스트 전용 아바타 (git에 올리지 않음, .gitignore의 assets-local/). 파일이 있을 때만 버튼이 보임
const LOCAL_AVATARS = [{ path: 'assets-local/avatar.vrm', label: '내 아바타 (로컬)' }, { path: 'assets-local/reference.vrm', label: '기준 아바타 (로컬)' }];
const headOk = async p => { try { return (await fetch(p, { method: 'HEAD' })).ok; } catch { return false; } };
const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const clamp01 = v => Math.max(0, Math.min(1, v));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, k) => a + (b - a) * k;
const smoothstep = v => { v = clamp01(v); return v * v * (3 - 2 * v); };
const VV = window.__vv = { errors: [], loaded: false, frames: 0, WD };
window.addEventListener('error', e => VV.errors.push(String(e.message)));
window.addEventListener('unhandledrejection', e => VV.errors.push(String(e.reason?.message || e.reason)));

// ---------- 저장 ----------
const LS = { get: (k, d) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const PS = LS.get('vv_settings', {}); // v1 설정(카메라 구도·보정)
const savePS = () => LS.set('vv_settings', PS);
const SCH = Object.fromEntries(WD.SCHEMA.map(s => [s.key, s]));
const W = { ...structuredClone(WD.DEFAULTS), ...LS.get('vv_warudo', {}) }; // Warudo 호환 설정
let MAP = LS.get('vv_warudo_map', null) || WD.defaultMapping();
let MAPI = {}; const reindexMap = () => { MAPI = {}; for (const m of MAP) MAPI[m.BlendShape] = m; };
reindexMap();
// OBS 등 다른 브라우저용: ?ws=base64(JSON)
const b64e = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64d = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
if (params.get('ws')) { try { const j = JSON.parse(b64d(params.get('ws'))); Object.assign(W, j.s || {}); if (j.m) { MAP = WD.defaultMapping(); for (const m of j.m) { const i = MAP.findIndex(x => x.BlendShape === m.BlendShape); if (i >= 0) MAP[i] = m; } reindexMap(); } if (j.e) VV.urlExpr = j.e; } catch (e) { console.warn('ws 파라미터 오류', e); } }
if (params.get('mirror') === '1') W.MirroredTracking = true; if (params.get('mirror') === '0') W.MirroredTracking = false;
const saveW = () => { LS.set('vv_warudo', W); LS.set('vv_warudo_map', MAP); };
VV.W = W; VV.MAP = () => MAP;

const status = s => { $('status').textContent = s; VV.status = s; };
const showErr = s => { const e = $('err'); e.hidden = !s; e.textContent = s || ''; };

// ---------- 설정 UI (스키마로 생성) ----------
const SRC_LABEL = { real: '실측', doc: '문서', sdk: 'SDK', inferred: '추정', ours: '전용' };
const SECS = [
  ['tracker', 'MediaPipe Tracker', '얼굴 추적 에셋'],
  ['bp', 'Face Tracking Blueprint', '얼굴 추적 Blueprint (온보딩이 만든 그래프)'],
  ['look', 'Look At (Character Look At Target)', '카메라 눈맞춤'],
  ['char', 'Character', '캐릭터 에셋'],
  ['mouth', 'mouth (ours)', '입 따라하기 (우리 확장)'],
  ['cam', 'Camera', '카메라 에셋'],
  ['ours', 'extras', '우리 전용 (Warudo에 없음)'],
];
const ui = {}; // key -> setter(v)
function el(tag, attrs = {}, ...kids) { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k in e && typeof v !== 'string') e[k] = v; else e.setAttribute(k, v); } for (const k of kids) if (k != null) e.append(k); return e; }
function numCtl(s, get, set) {
  const r = el('input', { type: 'range', min: s.min, max: s.max, step: s.step }); const n = el('input', { type: 'number', step: s.step });
  const show = v => { r.value = v; n.value = +(+v).toFixed(4); };
  r.oninput = () => { set(+r.value); n.value = r.value; }; n.onchange = () => { if (n.value === '' || !isFinite(+n.value)) return show(get()); set(+n.value); r.value = n.value; };
  show(get()); return [el('span', { class: 'ctl' }, r, n), show];
}
function buildSetting(s) {
  const lab = el('span', { class: 'lab' }, s.ko, el('small', {}, s.en), el('b', { class: 'src ' + s.src, title: s.src }, SRC_LABEL[s.src]));
  const set = v => { W[s.key] = v; saveW(); onW(s.key); };
  let row, show;
  if (s.type === 'bool') {
    const c = el('input', { type: 'checkbox' }); c.checked = !!W[s.key]; c.onchange = () => set(c.checked);
    show = v => { c.checked = !!v; }; row = el('label', { class: 'w bool' }, el('span', { class: 'lab' }, c, ...lab.childNodes));
  } else if (s.type === 'num') {
    const [ctl, sh] = numCtl(s, () => W[s.key], set); show = sh; row = el('div', { class: 'w' }, lab, ctl);
  } else if (s.type === 'vec3' || s.type === 'vec2' || s.type === 'vec4') {
    const axes = s.axes || (s.type === 'vec3' ? ['X', 'Y', 'Z'] : ['X', 'Y']); const ins = [];
    const box = el('span', { class: 'vec' }, ...axes.map((a, i) => { const n = el('input', { type: 'number', step: s.step, min: s.min, max: s.max }); n.onchange = () => { if (!isFinite(+n.value) || n.value === '') return show(W[s.key]); const v = [...W[s.key]]; v[i] = +n.value; set(v); }; ins.push(n); return el('label', {}, a, n); }));
    show = v => ins.forEach((n, i) => { n.value = v[i]; }); show(W[s.key]); row = el('div', { class: 'w' }, lab, el('span', { class: 'ctl' }, box));
  } else if (s.type === 'enum') {
    const sel = el('select'); for (const [v, k] of s.opts) sel.append(el('option', { value: v }, `${k} (${v})`)); sel.value = W[s.key]; sel.onchange = () => set(sel.value);
    show = v => { sel.value = v; }; row = el('div', { class: 'w' }, lab, el('span', { class: 'ctl' }, sel));
  } else if (s.type === 'color') {
    const c = el('input', { type: 'color' }); c.value = W[s.key]; c.oninput = () => set(c.value); show = v => { c.value = v; }; row = el('div', { class: 'w' }, lab, el('span', { class: 'ctl' }, c));
  }
  row.dataset.k = s.key; ui[s.key] = show; return row;
}
const SEC_EL = {};
for (const [id, en, ko] of SECS) {
  const d = el('details', { class: 'wsec', id: 'sec-' + id }, el('summary', {}, ko + ' ', el('small', {}, en)));
  if (id === 'tracker') d.open = true;
  for (const s of WD.SCHEMA) if (s.sec === id) {
    if (s.key === 'BodyRotationIntensity' || s.key === 'BodyRotationDirection') { const r = buildSetting(s); r.dataset.key = s.key; d.append(r); continue; }
    d.append(buildSetting(s));
  }
  SEC_EL[id] = d; $('wpanel').append(d);
}
// Configure BlendShapes Mapping 표
const mapDet = el('details', { id: 'mapSec' }, el('summary', {}, '개별 블렌드쉐이프 매핑 ', el('small', {}, 'Configure BlendShapes Mapping')));
mapDet.append(el('p', { class: 'hint' }, '입력 최소~최대(추적값) → 출력 최소~최대(캐릭터). 예: 입력 0~1, 출력 0~2면 0.40 → 0.80. 끄려면 출력 최대를 0, 더 늦게 반응하려면 출력 최소를 -0.25처럼 음수로. 초기값은 실제 Warudo MediaPipe 초기 매핑이에요 (eyeBlink 입력 0.3~0.7, jawOpen·mouthFunnel·mouthPucker 출력 -0.15~1, 나머지 0~1).'));
const mapTab = el('table', { class: 'maptab' }); mapDet.append(mapTab);
let mapBuilt = false;
function buildMapTable() {
  mapTab.innerHTML = ''; mapTab.append(el('tr', {}, el('td', {}, '이름'), el('td', {}, '입력최소'), el('td', {}, '입력최대'), el('td', {}, '출력최소'), el('td', {}, '출력최대')));
  for (const m of MAP) {
    const tr = el('tr', {}, el('td', { title: m.BlendShape }, m.BlendShape));
    for (const k of ['SourceValueMin', 'SourceValueMax', 'TargetValueMin', 'TargetValueMax']) { const n = el('input', { type: 'number', step: 0.05 }); n.value = m[k]; n.onchange = () => { if (isFinite(+n.value) && n.value !== '') { m[k] = +n.value; saveW(); } else n.value = m[k]; }; tr.append(el('td', {}, n)); }
    mapTab.append(tr);
  }
  mapBuilt = true;
}
mapDet.addEventListener('toggle', () => { if (mapDet.open && !mapBuilt) buildMapTable(); });
const mapReset = el('button', {}, '매핑 초기화'); mapReset.onclick = () => { MAP = WD.defaultMapping(); reindexMap(); saveW(); buildMapTable(); }; mapDet.append(mapReset);
SEC_EL.tracker.append(mapDet);
// 표정 편집
const exprDet = el('details', { id: 'exprSec' }, el('summary', {}, '표정 설정 ', el('small', {}, 'Expressions')));
exprDet.append(el('p', { class: 'hint' }, '같은 레이어(Layer) 표정끼리는 바뀔 때 페이드아웃되고, 다른 레이어는 겹쳐요. 기본 페이드 0.4초. 조건 예: mouthSmileLeft>=0.5 & mouthSmileRight>=0.5 (| 로 여러 묶음)'));
const exprList = el('div', { class: 'col' }); exprDet.append(exprList);
SEC_EL.char.querySelector('summary').after(exprDet);
function onW(key) {
  if (key === 'BodyRotationType' || !key) for (const r of SEC_EL.tracker.querySelectorAll('[data-key]')) r.hidden = (r.dataset.key === 'BodyRotationIntensity') ? !(W.BodyRotationType === 'Normal' || W.BodyRotationType === 'Inverted') : W.BodyRotationType !== 'Custom';
  if (key === 'preview' || !key) document.body.classList.toggle('preview', W.preview);
  if (key === 'MirroredTracking' || !key) document.body.classList.toggle('mirror', !W.MirroredTracking);
  if (key === 'FieldOfView' || !key) { camera.fov = W.FieldOfView; camera.updateProjectionMatrix(); frameCamera(); }
  if (key === 'light' || key === 'lightDir' || !key) applyLight();
  if (['Brightness', 'Contrast', 'Vibrance'].includes(key) || !key) canvas.style.filter = `brightness(${W.Brightness}) contrast(${W.Contrast}) saturate(${(1 + 0.15 * W.Vibrance).toFixed(3)})`;
  if (key === 'TransparentBackground' || key === 'ChromaKeyColor' || !key) applyBg();
  if (key === 'smooth' || key === 'beta' || !key) updFilter();
  if (key === 'SmoothingMode' || !key) { for (const k of ['smooth', 'beta']) { const r = SEC_EL.ours.querySelector(`[data-k="${k}"]`); if (r) r.hidden = W.SmoothingMode !== 'OneEuro'; } sb.reset(); bank.reset(); }
}
function refreshUI() { for (const k in ui) ui[k](W[k]); if (mapBuilt) buildMapTable(); onW(); }

// ---------- three.js ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: params.get('shot') === '1' });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(W.FieldOfView, 1, 0.05, 50); // Unity와 같이 세로 시야각
const dirLight = new THREE.DirectionalLight(0xffffff, Math.PI);
const ambLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(dirLight, ambLight, dirLight.target);
function applyLight() { const a = (W.lightDir || 0) * D2R; dirLight.position.set(Math.sin(a) * 2, 2.2, Math.cos(a) * 2); dirLight.intensity = Math.PI * W.light; ambLight.intensity = 0.6 * W.light; }
// OBS용 고정 해상도: ?res=1920x1080 → 그 픽셀 수로 렌더하고 화면에 맞춰 늘림
const FIXED = (params.get('res') || '').match(/^(\d{3,4})x(\d{3,4})$/);
if (FIXED) document.body.classList.add('fixedres');
function resize() { const r = $('stage').getBoundingClientRect(); const w = FIXED ? +FIXED[1] : Math.max(1, r.width), h = FIXED ? +FIXED[2] : Math.max(1, r.height); renderer.setPixelRatio(FIXED ? 1 : Math.min(2, window.devicePixelRatio || 1)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); frameCamera(); }
new ResizeObserver(resize).observe($('stage'));

// ---------- 카메라 구도 (우리 전용) ----------
const cam = { zoom: 1, camY: 0, camX: 0, camRot: 0 };
for (const id of Object.keys(cam)) {
  const e = $(id), out = e.nextElementSibling; if (id in PS) e.value = PS[id];
  const q = { zoom: 'zoom', camY: 'y', camX: 'x', camRot: 'rot' }[id]; if (params.get(q) !== null && !isNaN(+params.get(q))) e.value = +params.get(q);
  cam[id] = +e.value; out.textContent = e.value;
  e.addEventListener('input', () => { cam[id] = PS[id] = +e.value; out.textContent = e.value; savePS(); frameCamera(); });
}
let frame = params.get('frame') || PS.frame || 'bust';
let vrm = null, rig = null;
function frameCamera() {
  if (!rig) { camera.position.set(0, 1.3, 1.2); camera.lookAt(0, 1.3, 0); return; }
  const tan = Math.tan(camera.fov * D2R / 2), z = cam.zoom || 1;
  let ty, viewH;
  if (frame === 'full') { viewH = rig.top * 1.12; ty = rig.top / 2; } else { viewH = (rig.top - rig.neckY) * 2.4 + 0.1; ty = rig.neckY + (rig.top - rig.neckY) * 0.25; }
  const needW = frame === 'full' ? 0.6 : 0.62; const fitW = needW / (2 * tan * camera.aspect);
  const dist = Math.max(viewH / (2 * tan), fitW) / z;
  ty += (cam.camY || 0) * (frame === 'full' ? rig.top : 0.5);
  const a = (cam.camRot || 0) * D2R, cx = rig.centerX + (cam.camX || 0) * (frame === 'full' ? 1 : 0.5);
  camera.position.set(cx + Math.sin(a) * dist, ty, Math.cos(a) * dist); camera.lookAt(cx, ty, 0); dirLight.target.position.set(0, ty, 0);
}
for (const b of $('frameRow').querySelectorAll('button')) { b.classList.toggle('on', b.dataset.f === frame); b.onclick = () => { frame = PS.frame = b.dataset.f; savePS(); for (const x of $('frameRow').children) x.classList.toggle('on', x === b); frameCamera(); }; }
$('camReset').onclick = () => { for (const [id, v] of [['zoom', 1], ['camY', 0], ['camX', 0], ['camRot', 0]]) { $(id).value = v; $(id).dispatchEvent(new Event('input')); } };
canvas.addEventListener('wheel', e => { e.preventDefault(); const z = $('zoom'); z.value = clamp(+z.value * Math.exp(-e.deltaY * 0.001), +z.min, +z.max); z.dispatchEvent(new Event('input')); }, { passive: false });
{ const pts = new Map(); let d0 = 0, z0 = 1;
  canvas.addEventListener('pointerdown', e => { pts.set(e.pointerId, e); if (pts.size === 2) { const [a, b] = [...pts.values()]; d0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); z0 = cam.zoom; } });
  canvas.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, e); if (pts.size === 2 && d0) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); const z = $('zoom'); z.value = clamp(z0 * d / d0, +z.min, +z.max); z.dispatchEvent(new Event('input')); } });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) d0 = 0; }; canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
}

// ---------- 아바타 ----------
const loader = new GLTFLoader(); loader.register(p => new VRMLoaderPlugin(p));
const EXPRS = ['aa', 'ih', 'ou', 'ee', 'oh', 'blink', 'blinkLeft', 'blinkRight', 'happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral', 'lookUp', 'lookDown', 'lookLeft', 'lookRight'];
const engine = new WD.ExpressionEngine();
let EXPR_KEY = 'vv_expr_default';
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
  VRMUtils.rotateVRM0(v);
  v.scene.traverse(o => { if (o.isMesh) o.frustumCulled = false; });
  vrm = v; scene.add(vrm.scene);
  if (vrm.lookAt) { vrm.lookAt.target = null; vrm.lookAt.autoUpdate = false; } // 시선은 아래에서 직접 (Warudo: 눈 뼈 + VRM Look 표정)
  const rootQ = vrm.scene.quaternion.clone();
  const has = {}; for (const n of [...EXPRS, 'Brows up', 'Brows down']) has[n] = !!vrm.expressionManager?.getExpression(n);
  const names = (vrm.expressionManager?.expressions || []).map(e => e.expressionName);
  const arkitName = {}; const low = Object.fromEntries(names.map(n => [n.toLowerCase(), n])); for (const n of WD.ARKIT) if (low[n.toLowerCase()]) arkitName[n] = low[n.toLowerCase()];
  const det = WD.detectMapping(names);
  const hipsN = vrm.humanoid.getNormalizedBoneNode('hips');
  const overrides = {}; for (const e of vrm.expressionManager?.expressions || []) overrides[e.expressionName] = { blink: e.overrideBlink, mouth: e.overrideMouth, look: e.overrideLookAt };
  rig = { rootQ, rootQi: rootQ.clone().invert(), has, names, arkitName, det, overrides, vrm0: (vrm.meta || {}).metaVersion === '0', eyes: !!(vrm.humanoid.getNormalizedBoneNode('leftEye') && vrm.humanoid.getNormalizedBoneNode('rightEye')), lookType: vrm.lookAt?.applier?.constructor?.type || 'none', hipsPos: hipsN.position.clone() };
  vrm.humanoid.resetNormalizedPose(); vrm.update(0); vrm.scene.updateMatrixWorld(true);
  const wp = n => { const b = vrm.humanoid.getNormalizedBoneNode(n) || vrm.humanoid.getRawBoneNode(n); return b ? b.getWorldPosition(new THREE.Vector3()) : null; };
  const head = wp('head'), neck = wp('neck') || head, hips = wp('hips');
  const box = new THREE.Box3().setFromObject(vrm.scene);
  rig.headY = head.y; rig.neckY = neck.y; rig.height = box.max.y; rig.top = Math.max(box.max.y, head.y + 0.12); rig.hipsY = hips.y; rig.centerX = head.x; rig.torso = Math.max(0.2, head.y - hips.y);
  const meta = vrm.meta || {};
  const title = meta.name || meta.title || name || '이름 없음';
  $('avatarName').textContent = `아바타: ${title} (VRM ${meta.metaVersion === '0' ? '0.x' : '1.0'}) · 매핑 자동 감지: ${det.type} (ARKit ${det.hit}/52)`;
  // 표정: Warudo처럼 VRM 표정을 가져옴 (아바타별 저장)
  EXPR_KEY = 'vv_expr_' + title;
  const imported = WD.importVrmExpressions(names, { vrm0: rig.vrm0, overrides });
  const saved = VV.urlExpr || LS.get(EXPR_KEY, null);
  engine.st.clear(); engine.setList(saved ? mergeExpr(imported, saved) : imported);
  VV.loaded = true; VV.avatar = { title, version: meta.metaVersion, has, mapping: det, expressions: engine.list.map(e => e.Name), hotkeys: engine.list.map(e => e.Hotkey), lookAt: rig.lookType, eyeBones: rig.eyes, disable: engine.list.map(e => [e.Name, e.DisableEyeBlinkTracking, e.DisableMouthTracking]) };
  setupMouth();
  VV.avatar.mouth = { channels: rig.mouth.names, split: rig.mouth.split, tongue: rig.mouth.tongue, arkitMouth: Object.keys(rig.arkitName).filter(n => /^(mouth|jaw|tongue|cheek)/.test(n)).length };
  if (typeof src === 'string') LS.set('vv_last_src', src);
  buildExprButtons(); buildExprEditor(); frameCamera(); status(mode === 'demo' ? '데모 모드' : mode === 'track' ? `추적 중 (${tracker.delegate})` : '대기 중');
  return true;
}
// ---------- 입 채널 (우리 확장) ----------
// 입꼬리 표정(smile/frown)의 블렌드쉐이프를 아바타 왼쪽·오른쪽 절반으로 나눈 사본을 메모리에서만 만들어 한쪽 입꼬리를 표현 (원본 파일은 그대로)
function setupMouth() {
  const em = vrm.expressionManager; const ch = WD.findMouthChannels(rig.names);
  rig.mouth = { names: { smile: ch.smile, smileClosed: ch.smileClosed, frown: ch.frown }, tongue: ch.tongue, split: {}, parts: {} };
  for (const key of ['smile', 'smileClosed', 'frown']) {
    const ex = ch[key] && em.getExpression(ch[key]); if (!ex) continue;
    const parts = [];
    for (const bind of ex._binds || []) {
      if (bind.index === undefined || !bind.primitives) continue;
      for (const mesh of bind.primitives) {
        const g = mesh.geometry, mp = g.morphAttributes.position; if (!mp || !mp[bind.index]) continue;
        const pos = g.attributes.position, d = mp[bind.index]; let minX = 1e9, maxX = -1e9, sx = 0, n = 0;
        for (let i = 0; i < d.count; i++) if (Math.abs(d.getX(i)) + Math.abs(d.getY(i)) + Math.abs(d.getZ(i)) > 1e-6) { const x = pos.getX(i); minX = Math.min(minX, x); maxX = Math.max(maxX, x); sx += x; n++; }
        if (!n) continue;
        const mid = (minX + maxX) / 2, width = Math.max(1e-4, (maxX - minX) * 0.25);
        const add = side => { const arr = new Float32Array(d.count * 3); for (let i = 0; i < d.count; i++) { const w = WD.sideWeight(pos.getX(i), mid, width)[side]; arr[i * 3] = d.getX(i) * w; arr[i * 3 + 1] = d.getY(i) * w; arr[i * 3 + 2] = d.getZ(i) * w; } return new THREE.BufferAttribute(arr, 3); };
        const addN = side => { const nm = g.morphAttributes.normal?.[bind.index]; if (!nm) return null; const arr = new Float32Array(nm.count * 3); for (let i = 0; i < nm.count; i++) { const w = WD.sideWeight(pos.getX(i), mid, width)[side]; arr[i * 3] = nm.getX(i) * w; arr[i * 3 + 1] = nm.getY(i) * w; arr[i * 3 + 2] = nm.getZ(i) * w; } return new THREE.BufferAttribute(arr, 3); };
        const iL = mp.length; mp.push(add(0)); mp.push(add(1));
        if (g.morphAttributes.normal) { const nl = addN(0), nr = addN(1); if (nl && nr) g.morphAttributes.normal.push(nl, nr); else delete g.morphAttributes.normal; }
        mesh.morphTargetInfluences.push(0, 0);
        mesh.morphTargetDictionary[`${ch[key]}__L`] = iL; mesh.morphTargetDictionary[`${ch[key]}__R`] = iL + 1;
        parts.push({ mesh, iL, iR: iL + 1, w: bind.weight ?? 1 });
      }
    }
    if (parts.length) { rig.mouth.parts[key] = parts; rig.mouth.split[key] = parts.length; }
  }
}
function setSide(key, l, r) { for (const p of rig.mouth.parts[key] || []) { p.mesh.morphTargetInfluences[p.iL] = clamp01(l) * p.w; p.mesh.morphTargetInfluences[p.iR] = clamp01(r) * p.w; } }
// 가져온 표정 설정을 현재 아바타 표정에 이름으로 맞춤 (Joy ↔ happy 등)
function mergeExpr(base, incoming) {
  const out = base.map(e => ({ ...e }));
  for (const x of incoming) {
    const t = out.find(e => e.Name.toLowerCase() === String(x.Name).toLowerCase() || (e.vrm && e.vrm.toLowerCase() === String(x.Name).toLowerCase()));
    if (t) for (const k of ['Layer', 'IsBinary', 'TargetValue', 'EnterDuration', 'EnterDelay', 'ExitDuration', 'ExitDelay', 'DisableEyeBlinkTracking', 'DisableMouthTracking', 'DisableBrowTracking', 'TriggerConditions', 'Hotkey']) if (x[k] !== undefined) t[k] = structuredClone(x[k]);
  }
  return out;
}
const saveExpr = () => LS.set(EXPR_KEY, engine.list);
const idb = () => new Promise((res, rej) => { const r = indexedDB.open('vv_avatar', 1); r.onupgradeneeded = () => r.result.createObjectStore('f'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const idbGet = async () => { const db = await idb(); return new Promise(res => { const q = db.transaction('f').objectStore('f').get('vrm'); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); };
const idbPut = async v => { const db = await idb(); return new Promise(res => { const tx = db.transaction('f', 'readwrite'); v ? tx.objectStore('f').put(v, 'vrm') : tx.objectStore('f').delete('vrm'); tx.oncomplete = res; tx.onerror = res; }); };
async function loadFile(file) {
  if (!file) return;
  if (/\.json$/i.test(file.name)) return importSettingsFile(file);
  if (!/\.vrm$/i.test(file.name) && !/\.glb$/i.test(file.name)) { showErr('.vrm 파일만 불러올 수 있어요.'); return; }
  const buf = await file.arrayBuffer();
  if (await loadVRM(buf, file.name)) { try { await idbPut({ name: file.name, buf }); } catch {} }
}
$('vrmFile').onchange = e => loadFile(e.target.files[0]);
$('vrmDefault').onclick = async () => { await idbPut(null).catch(() => {}); LS.set('vv_last_src', null); loadVRM(DEFAULT_VRM, '기본'); };
if (params.get('default') !== '1') for (const a of LOCAL_AVATARS) fetch(a.path, { method: 'HEAD' }).then(r => { if (!r.ok) return; const b = el('button', { class: 'localav' }, a.label); b.onclick = async () => { await idbPut(null).catch(() => {}); loadVRM(a.path, a.label); }; $('vrmDefault').after(b); VV.localAvatars = (VV.localAvatars || []).concat(a.path); }).catch(() => {});
{ let dc = 0; const drop = $('drop');
  addEventListener('dragenter', e => { e.preventDefault(); dc++; drop.hidden = false; });
  addEventListener('dragleave', () => { if (--dc <= 0) { dc = 0; drop.hidden = true; } });
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => { e.preventDefault(); dc = 0; drop.hidden = true; loadFile(e.dataTransfer.files[0]); });
}

// ---------- 표정 버튼 / 편집 ----------
function buildExprButtons() {
  const box = $('expr'); box.innerHTML = '';
  const off = el('button', { title: 'Alt+Backspace' }, '모두 끄기'); off.onclick = () => engine.exitAll(now()); box.append(off);
  engine.list.forEach(e => { const b = el('button', { title: e.Hotkey || '' }, e.Name, e.Hotkey ? el('small', {}, ' ' + e.Hotkey.replace('Alt+', '')) : ''); b.dataset.e = e.Name; b.onclick = () => toggleExpr(e.Name); box.append(b); });
}
const now = () => performance.now() / 1000;
function toggleExpr(name) { engine.isActive(name) ? engine.exit(name, now()) : engine.enter(name, now()); }
function syncExprButtons() { for (const b of $('expr').children) if (b.dataset.e) b.classList.toggle('on', engine.isActive(b.dataset.e)); }
const condToText = tcs => (tcs || []).map(t => t.Conditions.map(c => `${c.BlendShape}${c.Condition === 'LessThanOrEqual' ? '<=' : '>='}${c.Value}`).join(' & ')).join(' | ');
function textToCond(s, old) {
  const out = [];
  for (const grp of s.split('|').map(x => x.trim()).filter(Boolean)) {
    const conds = []; for (const c of grp.split('&')) { const m = c.trim().match(/^([A-Za-z_0-9]+)\s*(>=|<=|>|<)\s*(-?[0-9.]+)$/); if (!m) return null; conds.push({ BlendShape: m[1], Condition: m[2][0] === '<' ? 'LessThanOrEqual' : 'GreaterThanOrEqual', Value: +m[3] }); }
    const prev = old?.[out.length] || {}; out.push({ Conditions: conds, TriggerWhenMet: prev.TriggerWhenMet || 'Enter', TriggerWhenMetDelay: prev.TriggerWhenMetDelay ?? 0, TriggerWhenNotMet: prev.TriggerWhenNotMet || 'Exit', TriggerWhenNotMetDelay: prev.TriggerWhenNotMetDelay ?? 2 });
  }
  return out;
}
function buildExprEditor() {
  exprList.innerHTML = '';
  if (!engine.list.length) exprList.append(el('p', { class: 'hint' }, '이 아바타에는 가져올 표정이 없어요.'));
  for (const e of engine.list) {
    const num = (k, step = 0.05) => { const n = el('input', { type: 'number', step }); n.value = e[k]; n.onchange = () => { if (isFinite(+n.value) && n.value !== '') { e[k] = +n.value; saveExpr(); } else n.value = e[k]; }; return n; };
    const chk = (k, label) => { const c = el('input', { type: 'checkbox' }); c.checked = !!e[k]; c.onchange = () => { e[k] = c.checked; saveExpr(); }; return el('label', {}, c, label); };
    const cond = el('input', { type: 'text', placeholder: '조건 없음 (예: mouthSmileLeft>=0.5 & mouthSmileRight>=0.5)' }); cond.value = condToText(e.TriggerConditions);
    cond.onchange = () => { const r = textToCond(cond.value, e.TriggerConditions); if (r) { e.TriggerConditions = r; cond.style.outline = ''; saveExpr(); engine.st.get(e.Name).trig = []; } else cond.style.outline = '2px solid #f55'; };
    exprList.append(el('div', { class: 'exprbox' },
      el('div', { class: 'r' }, el('b', {}, e.Name), el('small', {}, (e.vrm ? `VRM: ${e.vrm}` : '') + (e.Hotkey ? ` · ${e.Hotkey}` : '')), el('label', {}, 'Layer ', num('Layer', 1)), chk('IsBinary', 'Is Binary (페이드 없음)')),
      el('div', { class: 'r' }, el('label', {}, 'Enter Duration ', num('EnterDuration')), el('label', {}, 'Exit Duration ', num('ExitDuration')), el('label', {}, 'Enter Delay ', num('EnterDelay')), el('label', {}, 'Exit Delay ', num('ExitDelay'))),
      el('div', { class: 'r' }, chk('DisableEyeBlinkTracking', 'Disable Eye Blink Tracking'), chk('DisableMouthTracking', 'Disable Mouth Tracking'), chk('DisableBrowTracking', 'Disable Brow Tracking')),
      el('div', { class: 'r' }, el('span', {}, 'Trigger Conditions'), cond)));
  }
}

// ---------- 추적 상태 ----------
const bank = new FilterBank(); // One-Euro (우리 방식)
const sb = new WD.SmoothBank(); // Warudo Smooth 노드 (SmoothTime)
const swBS = new WD.Switch(0), swF = new WD.Switch(0); // real: Switch BlendShape List/Rotations (0.4s), Switch Float (2s) — InOutSine
function updFilter() { bank.set(lerp(6, 0.25, Math.pow(W.smooth, 0.8)), lerp(0.02, 3, W.beta * W.beta)); }
let mode = 'idle', faceSeen = -1e9, lastVideoTime = -1, autoCalibAt = 0;
let neutral = PS.calib2 ? { q: new THREE.Quaternion().fromArray(PS.calib2.q), t: new THREE.Vector3().fromArray(PS.calib2.t), gx: PS.calib2.gx || 0, gy: PS.calib2.gy || 0 } : null;
let lastRaw = null;
// 그룹: bone(머리 회전·눈 뼈, Smooth Rotations) / root(위치, Smooth Position) / bs(블렌드쉐이프, Smooth BlendShapes)
const GROUP = { hx: 'bone', hy: 'bone', hz: 'bone', gx: 'bone', gy: 'bone', px: 'root', py: 'root', pz: 'root', aa: 'mouth', ih: 'mouth', ou: 'mouth', ee: 'mouth', oh: 'mouth', sL: 'mouth', sR: 'mouth', so: 'mouth', fL: 'mouth', fR: 'mouth' };
const tgt = { hx: 0, hy: 0, hz: 0, px: 0, py: 0, pz: 0, eL: 0, eR: 0, gx: 0, gy: 0, aa: 0, ih: 0, ou: 0, ee: 0, oh: 0, sL: 0, sR: 0, so: 0, fL: 0, fR: 0, lu: 0, ld: 0, ll: 0, lr: 0, bu: 0, bd: 0, happy: 0, angry: 0, sad: 0, relaxed: 0, surprised: 0 };
const cur = { ...tgt };
let mapped = {}, mappedF = {}, vrmConv = {}, mouthOut = {}; // Warudo 매핑 후 ARKit 값 / VRM 변환 값
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _e = new THREE.Euler(), _qi = new THREE.Quaternion();
const avg = (bs, a, b) => ((bs[a] || 0) + (bs[b] || 0)) / 2;
const gazeOf = bs => [((bs.eyeLookOutLeft || 0) + (bs.eyeLookInRight || 0) - (bs.eyeLookInLeft || 0) - (bs.eyeLookOutRight || 0)) / 2, ((bs.eyeLookUpLeft || 0) + (bs.eyeLookUpRight || 0) - (bs.eyeLookDownLeft || 0) - (bs.eyeLookDownRight || 0)) / 2];
const warudoSmooth = () => W.SmoothingMode !== 'OneEuro';
function ingest(raw, tSec) {
  const F = (k, v, mc, b) => warudoSmooth() ? v : bank.run(k, v, tSec, mc, b); // Warudo 방식이면 부드럽게는 applyAvatar의 Smooth 노드에서
  // 1) 블렌드쉐이프: 트래커 처리 (좌우반전 → 개별 매핑 → 민감도 → 제한)
  mapped = WD.processBlendShapes(raw.bs, W, MAPI);
  for (const n of WD.ARKIT) mappedF[n] = F('b_' + n, mapped[n], n.startsWith('eyeBlink') ? 4 : 2.5, 2);
  const bs = mappedF;
  // 2) 머리 회전/이동: 보정(Calibrate) 기준 → 좌우반전 → Head Rotation Intensity·Offset / Head Movement Intensity
  if (raw.m) {
    _m.fromArray(raw.m); _m.decompose(_p, _q, _s);
    if (neutral) _q.premultiply(_qi.copy(neutral.q).invert());
    if (W.MirroredTracking) { _q.y = -_q.y; _q.z = -_q.z; }
    _e.setFromQuaternion(_q, 'YXZ');
    const I = W.HeadRotationIntensity, O = W.HeadRotationOffset;
    const hx = clamp(_e.x * R2D * I[0] + O[0], -90, 90), hy = clamp(_e.y * R2D * I[1] + O[1], -90, 90), hz = clamp(_e.z * R2D * I[2] + O[2], -90, 90);
    const t = [_p.x - (neutral ? neutral.t.x : 0), _p.y - (neutral ? neutral.t.y : 0), _p.z - (neutral ? neutral.t.z : 0)];
    if (W.MirroredTracking) t[0] = -t[0];
    const tm = WD.headTranslation(t, W);
    tgt.hx = F('hx', hx); tgt.hy = F('hy', hy); tgt.hz = F('hz', hz);
    tgt.px = F('px', tm[0], 0.7); tgt.py = F('py', tm[1], 0.7); tgt.pz = F('pz', tm[2], 0.7);
  }
  // 3) 시선 (+gx = 아바타 왼쪽, +gy = 위). 보정 시 시선도 보정(Calibrate Eye Movement)
  const [gx, gy] = gazeOf(bs);
  const c = W.CalibrateEyeMovement && neutral ? neutral : { gx: 0, gy: 0 };
  tgt.gx = gx - c.gx; tgt.gy = gy - c.gy;
  // 4) VRM 매핑: 실제 Warudo Blueprint의 변환 공식 그대로 (real)
  vrmConv = WD.vrmFromArkit(bs, W);
  tgt.eL = vrmConv.blinkLeft; tgt.eR = vrmConv.blinkRight;
  // 입: Warudo 공식(aa/ih/ou/oh) + 확장(ee·입꼬리 좌우·입 다물기). Warudo 모드면 Warudo 그래프와 같음 (ee 없음)
  mouthOut = WD.mouthExtended(bs, W);
  tgt.aa = mouthOut.aa; tgt.ih = mouthOut.ih; tgt.ou = mouthOut.ou; tgt.oh = mouthOut.oh; tgt.ee = mouthOut.ee; tgt.sL = mouthOut.smileL; tgt.sR = mouthOut.smileR; tgt.so = mouthOut.smileOpen; tgt.fL = mouthOut.frownL; tgt.fR = mouthOut.frownR;
  tgt.lu = vrmConv.LookUp; tgt.ld = vrmConv.LookDown; tgt.ll = vrmConv.LookLeft; tgt.lr = vrmConv.LookRight; tgt.bu = vrmConv['Brows up']; tgt.bd = vrmConv['Brows down'];
  // 5) 우리 전용: 표정 자동 인식
  const smile = avg(bs, 'mouthSmileLeft', 'mouthSmileRight'), jaw = bs.jawOpen;
  const e = { happy: 0, angry: 0, sad: 0, relaxed: 0, surprised: 0 };
  if (W.autoEmo) {
    const es = W.emoSens, browDown = avg(bs, 'browDownLeft', 'browDownRight'), browUp = bs.browInnerUp, frown = avg(bs, 'mouthFrownLeft', 'mouthFrownRight'), wideEye = avg(bs, 'eyeWideLeft', 'eyeWideRight'), cheek = avg(bs, 'cheekSquintLeft', 'cheekSquintRight');
    e.happy = smoothstep((smile + cheek * 0.3 - 0.38) / 0.35) * es;
    e.relaxed = smoothstep((smile - 0.12) / 0.22) * (1 - e.happy) * 0.55 * es;
    e.angry = smoothstep((browDown - 0.3) / 0.35) * (1 - e.happy) * es;
    e.sad = smoothstep((browUp * 0.7 + frown * 0.9 - 0.35) / 0.35) * (1 - e.happy) * (1 - e.angry) * es;
    e.surprised = smoothstep((browUp * 0.6 + wideEye * 0.9 + jaw * 0.25 - 0.55) / 0.35) * (1 - e.happy) * es;
  }
  for (const k in e) tgt[k] = bank.run('e_' + k, clamp01(e[k]), tSec, 0.8);
  lastRaw = { bs: raw.bs, m: raw.m };
  VV.raw = { jaw: +(raw.bs.jawOpen || 0).toFixed(3), blinkL: +(raw.bs.eyeBlinkLeft || 0).toFixed(3), blinkR: +(raw.bs.eyeBlinkRight || 0).toFixed(3), mappedBlinkL: +mapped.eyeBlinkLeft.toFixed(3), mappedBlinkR: +mapped.eyeBlinkRight.toFixed(3), hx: +tgt.hx.toFixed(2), hy: +tgt.hy.toFixed(2), hz: +tgt.hz.toFixed(2) };
}
function calibrate() { // Warudo Calibrate: 머리 회전·위치 기준(+시선). 블렌드쉐이프는 보정하지 않음
  if (!lastRaw || !lastRaw.m) { showErr('얼굴이 인식된 상태에서 눌러 주세요.'); return; }
  _m.fromArray(lastRaw.m); _m.decompose(_p, _q, _s);
  const [gx, gy] = gazeOf(WD.processBlendShapes(lastRaw.bs, W, MAPI));
  neutral = { q: _q.clone(), t: _p.clone(), gx, gy };
  PS.calib2 = { q: _q.toArray(), t: _p.toArray(), gx, gy }; savePS(); bank.reset(); sb.reset();
  showErr(''); status('정면 보정 완료'); VV.calibrated = true;
}
$('calib').onclick = calibrate;

// ---------- 데모 (카메라 없이) — 실제 추적과 같은 경로(ingest) ----------
function demoRaw(t) {
  const s = t / 1000;
  const yaw = Math.sin(s * 0.7) * 28 + Math.sin(s * 1.9) * 4, pitch = Math.sin(s * 0.53 + 1) * 14, roll = Math.sin(s * 0.41 + 2) * 12;
  _e.set(pitch * D2R, (W.MirroredTracking ? -yaw : yaw) * D2R, (W.MirroredTracking ? -roll : roll) * D2R, 'YXZ'); _q.setFromEuler(_e);
  if (neutral) _q.premultiply(neutral.q);
  _m.compose(new THREE.Vector3(Math.sin(s * 0.33) * 6 + (neutral ? neutral.t.x : 0), (neutral ? neutral.t.y : 0), (neutral ? neutral.t.z : -40)), _q, new THREE.Vector3(1, 1, 1));
  const ph = (s % 12);
  const blinkPh = (s % 3.7) < 0.16 ? 1 : 0, winkPh = ph > 9.5 && ph < 10.3 ? 1 : 0;
  const vowel = Math.floor(s * 2.2) % 6; const talk = ph < 6 ? Math.abs(Math.sin(s * 9)) : 0;
  const bs = { eyeBlinkLeft: Math.max(blinkPh, winkPh) * 0.85, eyeBlinkRight: blinkPh * 0.85,
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
    mode = 'track'; bank.reset(); sb.reset(); autoCalibAt = neutral ? 0 : performance.now() + 1500;
    status(`추적 중 (${tracker.delegate})`); $('start').textContent = '■ 카메라 끄기'; $('start').disabled = false; $('start').onclick = stopCamera;
  } catch (e) {
    console.error(e);
    showErr(e?.name === 'NotAllowedError' ? '카메라 권한이 거부됐어요. 브라우저 설정에서 허용해 주세요.' : ('카메라/모델을 시작하지 못했어요: ' + (e.message || e)));
    status('대기 중'); $('start').disabled = false;
  }
}
function stopCamera() { const s = video.srcObject; if (s) s.getTracks().forEach(t => t.stop()); video.srcObject = null; mode = 'idle'; status('대기 중'); $('start').textContent = '▶ 카메라 시작'; $('start').onclick = startCamera; }
$('start').onclick = startCamera;
function startDemo() { if (mode === 'track') stopCamera(); mode = 'demo'; bank.reset(); sb.reset(); status('데모 모드'); }
$('demo').onclick = () => mode === 'demo' ? (mode = 'idle', status('대기 중')) : startDemo();
$('micBtn').onclick = async () => { $('micBtn').disabled = true; showErr(''); if (await startMic()) { $('micBtn').textContent = '🎤 마이크 켜짐'; $('meter').hidden = false; } else { showErr(mic.err); $('micBtn').disabled = false; } };

// ---------- 뼈대 적용 ----------
const _qa = new THREE.Quaternion(), _ea = new THREE.Euler(), _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
function setBone(name, x, y, z, order = 'YXZ') {
  const b = vrm.humanoid.getNormalizedBoneNode(name); if (!b) return false;
  _ea.set(x * D2R, y * D2R, z * D2R, order); _qa.setFromEuler(_ea);
  b.quaternion.copy(rig.rootQi).multiply(_qa).multiply(rig.rootQ); return true;
}
let bounce = 0, excHi = false, excSince = 0, calmSince = 0;
// Generate Head & Eyes Motion (real: 노드 값 / 움직임 모양은 비공개라 inferred)
const rnd = (a, b) => a + Math.random() * (b - a);
const idleM = { nextBlink: 0, blinkT0: -1, nextLook: 0, look: { x: 0, y: 0 }, lookS: { x: 0, y: 0 }, nextHead: 0, head: { x: 0, y: 0 }, headS: { x: 0, y: 0 } };
function idleMotion(ts, dt) {
  const M = idleM, bi = W.IdleBlinkInterval, dur = 0.15 / Math.max(0.1, W.IdleBlinkSpeed);
  if (ts > M.nextBlink) { M.blinkT0 = ts; M.nextBlink = ts + rnd(bi[0], bi[1]); }
  const bp = (ts - M.blinkT0) / dur, blink = W.IdleAutoBlinking && bp >= 0 && bp <= 1 ? Math.sin(bp * Math.PI) : 0;
  const A = W.IdleMaxLookAngles; // Up, Down, Left, Right
  if (ts > M.nextLook) { M.nextLook = ts + rnd(0.6, 3); M.look = { x: rnd(-A[1], A[0]), y: rnd(-A[3], A[2]) }; } // 눈 작은 이동 간격은 inferred
  const kl = 1 - Math.exp(-dt / 0.05); M.lookS.x += (M.look.x - M.lookS.x) * kl; M.lookS.y += (M.look.y - M.lookS.y) * kl;
  const LI = W.IdleLookAroundInterval, MA = W.IdleMaxLookAroundAngle;
  if (ts > M.nextHead) { M.nextHead = ts + rnd(LI[0], LI[1]); M.head = { x: rnd(-MA, MA) * 0.5, y: rnd(-MA, MA) }; }
  const kh = 1 - Math.exp(-dt / 1.2); M.headS.x += (M.head.x - M.headS.x) * kh; M.headS.y += (M.head.y - M.headS.y) * kh;
  const eyes = W.IdleAutoEyeMovements ? { x: M.lookS.x * W.IdleLookWeight, y: M.lookS.y * W.IdleLookWeight } : { x: 0, y: 0 };
  const head = W.IdleAutoHeadMovements ? { x: M.headS.x + W.IdleHeadTilt[0], y: M.headS.y + W.IdleHeadTilt[1], z: W.IdleHeadTilt[2] } : { x: W.IdleHeadTilt[0], y: W.IdleHeadTilt[1], z: W.IdleHeadTilt[2] };
  return { blink, eyes, head };
}
const bodyHist = []; const bodyS = { x: 0, y: 0, z: 0 };
const look = { hy: 0, hp: 0, ey: 0, ep: 0 };
function cameraAngles() { // 머리에서 카메라까지 방향 (아바타 공간: +Z 정면, +X 아바타 왼쪽)
  const hb = vrm.humanoid.getNormalizedBoneNode('head'); hb.getWorldPosition(_v); _v2.copy(camera.position).sub(_v);
  return { yaw: Math.atan2(_v2.x, _v2.z) * R2D, pitch: -Math.atan2(_v2.y, Math.hypot(_v2.x, _v2.z)) * R2D }; // pitch +는 아래 (three-vrm/뼈 규칙)
}
function applyAvatar(t, dt) {
  const tracking = (mode === 'track' || mode === 'demo' || mode === 'fake') && t - faceSeen < 600; VV.tracking = tracking;
  const s = t / 1000, ts = t / 1000;
  // 추적 상태 Switch (real: IsTracked → 블렌드쉐이프·회전 0.4초, 대기동작/눈맞춤/위치 가중치 2초, InOutSine)
  swBS.set(tracking, ts); swF.set(tracking, ts);
  const wBS = swBS.update(ts, W.LostTransitionTime), wF = swF.update(ts, W.IdleTransitionTime);
  if (warudoSmooth()) { // Switch → Smooth 노드 순서 (real 연결 순서)
    for (const n in cur) { const g = GROUP[n]; const w = g === 'root' ? wF : wBS; const st = g === 'bone' ? W.BoneSmoothTime : g === 'root' ? W.RootSmoothTime : g === 'mouth' ? (W.MouthMode === 'Warudo' ? W.BlendShapeSmoothTime : W.MouthSmoothTime) : W.BlendShapeSmoothTime; cur[n] = sb.run(n, tgt[n] * w, st, dt); }
  } else {
    const k = 1 - Math.exp(-dt / 0.035), kb = 1 - Math.exp(-dt / 0.02), kRelax = 1 - Math.exp(-dt / 0.5);
    for (const n in cur) { if (tracking) cur[n] += (tgt[n] - cur[n]) * (n === 'eL' || n === 'eR' ? kb : k); else cur[n] += (0 - cur[n]) * kRelax; }
  }
  VV.sw = { bs: +wBS.toFixed(3), f: +wF.toFixed(3) };
  const idleW = 1 - wF; // real: Generate Head & Eyes Motion Weight = 1 − Switch Float
  const im = idleMotion(ts, dt);
  // 숨쉬기 대기(우리 근사) + Warudo Breathing/Swaying
  const idle = W.idleAnim ? 1 : 0;
  let breath = Math.sin(s * 2 * Math.PI / 3.8) * idle, sway = 0;
  if (W.BreathingEnabled) breath += Math.sin(s * 2 * Math.PI * W.BreathingRate) * (W.BreathingExertion / 0.1);
  if (W.SwayingEnabled) sway += Math.sin(s * 0.45 * 2) * (W.SwayingIntensity / 0.25);
  // 마이크 (우리 전용 신남)
  const e = mic.on ? micTick(t, W.micSens) : 0;
  VV.mic = mic.on ? { level: +mic.level.toFixed(3), score: +e.toFixed(3), bounce: +bounce.toFixed(3) } : null;
  if (mic.on) { $('meterBar').style.width = (e * 100).toFixed(0) + '%'; $('lvBar').style.width = (mic.level * 100).toFixed(0) + '%'; }
  if (e > 0.6) { calmSince = 0; if (!excSince) excSince = t; if (t - excSince > 700) excHi = true; } else { excSince = 0; if (e < 0.35) { if (!calmSince) calmSince = t; if (t - calmSince > 1200) excHi = false; } else calmSince = 0; }
  if (!mic.on) excHi = false;
  const bAmp = W.micBounce && mic.on ? smoothstep((e - 0.3) / 0.5) : 0; bounce += (bAmp - bounce) * (1 - Math.exp(-dt / 0.25));
  // --- 머리·몸 (Enable Head and Body Movements)
  const hm = W.EnableHeadAndBodyMovements ? 1 : 0;
  let head = { x: cur.hx * hm + im.head.x * idleW, y: cur.hy * hm + im.head.y * idleW, z: cur.hz * hm + im.head.z * idleW };
  // Look At (real: Character Look At Target 노드, 대상 Camera, Weight = Switch Float → 추적 중 1)
  const ca = cameraAngles();
  let lookHY = 0, lookHP = 0, lookEY = 0, lookEP = 0;
  if (W.LookAt && Math.hypot(ca.yaw, ca.pitch) <= W.MaximumLookAtAngle) {
    const w = W.LookAtNodeWeight * wF, mh = W.MaximalHeadRotation, me = W.MaximalEyeRotation;
    lookHY = clamp(ca.yaw * W.LookAtNodeHeadWeight * w, -mh[1], mh[1]); lookHP = clamp(ca.pitch * W.LookAtNodeHeadWeight * w, -mh[0], mh[0]);
    lookEY = clamp(ca.yaw * W.LookAtNodeEyesWeight * w, -me[0], me[0]); lookEP = clamp(ca.pitch * W.LookAtNodeEyesWeight * w, -me[1], me[1]);
  }
  look.hy += (lookHY - look.hy) * (1 - Math.exp(-dt * W.SmoothHeadTime)); look.hp += (lookHP - look.hp) * (1 - Math.exp(-dt * W.SmoothHeadTime));
  look.ey += (lookEY - look.ey) * (1 - Math.exp(-dt * W.SmoothEyesTime)); look.ep += (lookEP - look.ep) * (1 - Math.exp(-dt * W.SmoothEyesTime));
  head.y += look.hy; head.x += look.hp;
  // Look At IK (캐릭터 에셋, 기본 꺼짐): 몸 → 머리 → 눈 순서로 나머지를 나눔, Clamp Weight로 제한 (Final IK 방식 추정)
  let ikBody = { y: 0, x: 0 }, ikEye = { y: 0, x: 0 };
  if (W.LookAtEnabled) {
    const w = W.LookAtWeight, A = { y: ca.yaw - head.y, x: ca.pitch - head.x };
    for (const ax of ['y', 'x']) {
      const b = WD.clampLookAngle(A[ax], W.LookAtClampBodyWeight) * w * W.LookAtBodyWeight * 0.3;
      const h = WD.clampLookAngle(A[ax] - b, W.LookAtClampHeadWeight) * w * W.LookAtHeadWeight;
      const ey = WD.clampLookAngle(A[ax] - b - h, W.LookAtClampEyesWeight) * w * W.LookAtEyesWeight;
      ikBody[ax] = b; head[ax] += h; ikEye[ax] = ey;
    }
  }
  // Body Rotation Type + 지연/부드럽게
  bodyHist.push([ts, { ...head }]); while (bodyHist.length > 2 && ts - bodyHist[1][0] >= W.BodyRotationDelayDuration) bodyHist.shift();
  const delayed = W.BodyRotationDelayDuration > 0 ? bodyHist[0][1] : head;
  const dist = WD.distributeBody(delayed, W);
  const ks = W.BodyRotationSmoothingDuration > 0 ? 1 - Math.exp(-dt / W.BodyRotationSmoothingDuration) : 1;
  for (const ax of ['x', 'y', 'z']) bodyS[ax] += (dist.body[ax] - bodyS[ax]) * ks;
  const sum = W.BodyRotationHipsRotationIntensity + W.BodyRotationSpineRotationIntensity + W.BodyRotationChestRotationIntensity || 1;
  const part = k => ({ x: bodyS.x * k / sum, y: bodyS.y * k / sum, z: bodyS.z * k / sum });
  const hipsR = part(W.BodyRotationHipsRotationIntensity), spineR = part(W.BodyRotationSpineRotationIntensity), chestR = part(W.BodyRotationChestRotationIntensity);
  const comp = W.BodyRotationNeckCompensation;
  const hl = { x: head.x - comp * bodyS.x, y: head.y - comp * bodyS.y, z: head.z - comp * bodyS.z };
  // 머리 이동 → 몸 이동(Body Movement Intensity) + 나머지는 상체 기울기 (분배 inferred)
  const BMI = W.BodyMovementIntensity, px = cur.px * hm, pz = cur.pz * hm;
  const leanZ = -Math.atan2(px * (1 - BMI), rig.torso) * R2D, leanX = Math.atan2(pz * (1 - BMI), rig.torso) * R2D;
  setBone('hips', hipsR.x, hipsR.y, hipsR.z);
  setBone('spine', spineR.x + leanX * 0.6 + breath * 0.6 + ikBody.x * 0.5, spineR.y + ikBody.y * 0.5, spineR.z + leanZ * 0.6 + sway * 0.8);
  setBone('chest', chestR.x + leanX * 0.4 - breath * 1.2 + ikBody.x * 0.5, chestR.y + ikBody.y * 0.5, chestR.z + leanZ * 0.4);
  setBone('upperChest', 0, 0, 0);
  setBone('neck', hl.x * 0.4 - leanX * 0.5, hl.y * 0.4, hl.z * 0.4 - leanZ * 0.5);
  setBone('head', hl.x * 0.6 - leanX * 0.5, hl.y * 0.6, hl.z * 0.6 - leanZ * 0.5 - sway * 0.6);
  // 팔 (우리 전용: T포즈 → 내림)
  const ad = W.armDown, arm = ad + breath * 1.2;
  setBone('leftShoulder', 0, 0, -breath * 0.6); setBone('rightShoulder', 0, 0, breath * 0.6);
  setBone('leftUpperArm', 4, -6, -arm, 'XYZ'); setBone('rightUpperArm', 4, 6, arm, 'XYZ');
  setBone('leftLowerArm', 0, -18 * ad / 72, 0); setBone('rightLowerArm', 0, 18 * ad / 72, 0);
  setBone('leftHand', 0, -6, -6 * ad / 72); setBone('rightHand', 0, 6, 6 * ad / 72);
  for (const side of ['left', 'right']) { const sg = side === 'left' ? -1 : 1;
    for (const fn of ['Index', 'Middle', 'Ring', 'Little']) for (const seg of ['Proximal', 'Intermediate', 'Distal']) setBone(side + fn + seg, 0, 0, sg * (fn === 'Index' ? 12 : 18) * ad / 72);
    setBone(side + 'ThumbProximal', 0, sg * -10 * ad / 72, 0); }
  const hips = vrm.humanoid.getNormalizedBoneNode('hips');
  _v.set(px * BMI, 0, pz * BMI).applyQuaternion(rig.rootQi); // 세계 좌표 이동 → 루트 로컬
  hips.position.copy(rig.hipsPos).add(_v); hips.position.y += bounce * 0.025 * Math.abs(Math.sin(s * Math.PI * 2.4)) + breath * 0.002;
  VV.body = { hips: hipsR, spine: spineR, chest: chestR, headLocal: hl, look: { ...look }, cam: ca };
  // --- 표정 (Expressions: 레이어·페이드·트리거)
  const em = vrm.expressionManager; if (!em) return;
  const exprOut = engine.update(ts);
  const modelVals = {}; for (const ex of engine.list) if (ex.vrm) modelVals[ex.vrm] = exprOut[ex.Name];
  engine.triggers({ ...modelVals, ...(tracking ? mapped : {}) }, ts);
  syncExprButtons();
  let fBlink = 1, fMouth = 1, fBrow = 1;
  for (const ex of engine.list) { const w = exprOut[ex.Name] / (ex.TargetValue || 1); if (ex.DisableEyeBlinkTracking) fBlink = Math.min(fBlink, 1 - w); if (ex.DisableMouthTracking) fMouth = Math.min(fMouth, 1 - w); if (ex.DisableBrowTracking) fBrow = Math.min(fBrow, 1 - w); }
  const emo = { happy: cur.happy, angry: cur.angry, sad: cur.sad, relaxed: cur.relaxed, surprised: cur.surprised };
  if (excHi && W.micExpr) emo.happy = Math.max(emo.happy, 0.8);
  const vrmW = {}; for (const n in emo) vrmW[n] = emo[n];
  for (const ex of engine.list) if (ex.vrm) { const nm = em.getExpression(ex.vrm) ? ex.vrm : rig.names.find(x => x.toLowerCase() === ex.vrm.toLowerCase()); if (nm) vrmW[nm] = Math.max(vrmW[nm] || 0, exprOut[ex.Name]); }
  for (const n in vrmW) if (em.getExpression(n)) em.setValue(n, clamp01(vrmW[n]));
  // 눈 깜빡임 (+ 대기 동작 Auto Blinking, 가중치 = 1 − 추적)
  let eL = cur.eL, eR = cur.eR;
  if (idleW > 0 && im.blink > 0) { eL = lerp(eL, Math.max(eL, im.blink), idleW); eR = lerp(eR, Math.max(eR, im.blink), idleW); }
  eL *= fBlink; eR *= fBlink;
  const arkit = W.BlendShapeMappingType === 'ARKit' || (W.BlendShapeMappingType === 'Auto' && rig.det.type === 'ARKit');
  VV.mappingType = arkit ? 'ARKit' : 'VRM';
  // 립싱크 (Disabled / WhenTrackingLost / Always) — 실제 씬에는 립싱크 노드가 없음(= Disabled)
  const lv = mic.on ? mic.level : 0;
  const lipOn = lv > 0 && (W.LipSync === 'Always' || (W.LipSync === 'WhenTrackingLost' && !tracking));
  if (arkit) { // Perfect Sync: 매핑된 ARKit 값을 같은 이름 표정에 그대로 (그래프 미확인, inferred)
    for (const n of WD.ARKIT) { const mn = rig.arkitName[n]; if (!mn) continue; const isMouth = /^(mouth|jaw|tongue|cheekPuff)/.test(n) && W.MouthMode !== 'Warudo'; let v = tracking || wBS > 0 ? (warudoSmooth() ? sb.run('ak_' + n, mappedF[n] * wBS * (isMouth ? W.MouthGain : 1), isMouth ? W.MouthSmoothTime : W.BlendShapeSmoothTime, dt) : mappedF[n]) : 0;
      if (n === 'eyeBlinkLeft') v = eL; else if (n === 'eyeBlinkRight') v = eR; else if (n.startsWith('mouth') || n.startsWith('jaw') || n === 'tongueOut' || n === 'cheekPuff') v *= fMouth; else if (n.startsWith('brow')) v *= fBrow;
      if (n === 'jawOpen' && lipOn) v = Math.max(v, lv * 0.8);
      em.setValue(mn, clamp01(v)); }
  } else { // VRM: 실제 Warudo 그래프 (blinkLeft/Right, aa/ih/ou/oh, LookUp/Down/Left/Right, Brows up/down)
    if (rig.has.blinkLeft && rig.has.blinkRight) { em.setValue('blinkLeft', clamp01(eL)); em.setValue('blinkRight', clamp01(eR)); if (rig.has.blink) em.setValue('blink', 0); }
    else if (rig.has.blink) em.setValue('blink', clamp01((eL + eR) / 2)); // 우리 대체 (Warudo는 blinkLeft/Right만)
    let vis = { aa: cur.aa, ih: cur.ih, ou: cur.ou, ee: cur.ee, oh: cur.oh };
    if (lipOn) { const tot = vis.aa + vis.ih + vis.ou + vis.oh; if (lv > tot) { const wob = 0.5 + 0.5 * Math.sin(s * 13); vis.aa = Math.max(vis.aa, lv * (0.6 + 0.3 * wob)); vis.oh = Math.max(vis.oh, lv * 0.25 * (1 - wob)); } }
    for (const n in vis) if (rig.has[n]) em.setValue(n, clamp01(vis[n] * fMouth));
    // 입꼬리 좌우 (확장): 아바타 왼쪽 = 사용자 왼쪽 (Mirrored Tracking이면 트래커에서 이미 바뀜)
    const so = rig.mouth.parts.smileClosed ? (rig.mouth.parts.smile ? cur.so : 0) : 1;
    setSide('smile', cur.sL * fMouth * so, cur.sR * fMouth * so); setSide('smileClosed', cur.sL * fMouth * (1 - so), cur.sR * fMouth * (1 - so)); setSide('frown', cur.fL * fMouth, cur.fR * fMouth);
    VV.side = { so: +cur.so.toFixed(3), sL: +cur.sL.toFixed(3), sR: +cur.sR.toFixed(3), fL: +cur.fL.toFixed(3), fR: +cur.fR.toFixed(3) };
    if (rig.has['Brows up']) em.setValue('Brows up', clamp01(cur.bu * fBrow)); if (rig.has['Brows down']) em.setValue('Brows down', clamp01(cur.bd * fBrow));
    VV.vis = Object.fromEntries(Object.entries(vis).map(([k, v]) => [k, +v.toFixed(3)]));
  }
  // 시선: (1) 눈 뼈 (Use Bones For Eye Movement) — 각도 = 시선값 × Eye Movement Intensity × 유니티 휴머노이드 눈 기본 범위(좌우 20°, 위 15°/아래 10°, inferred)
  //       (2) VRM Look 표정 (ConvertToVRMEyeBlendShapes, real 켜짐) — 변환값 그대로
  const I = W.EyeMovementIntensity, C = W.EyeMovementHeadRotationCompensation;
  const gxv = cur.gx * I[0], gyv = cur.gy * I[1];
  const idleEY = im.eyes.y * idleW, idleEP = -im.eyes.x * idleW;
  let yaw = clamp(gxv * 20 - C[0] * cur.hy + look.ey + ikEye.y + idleEY, -30, 30), pitch = clamp(-gyv * (gyv > 0 ? 15 : 10) + C[1] * cur.hx + look.ep + ikEye.x + idleEP, -30, 30);
  if (W.UseBonesForEyeMovement) {
    if (rig.lookType === 'bone' && vrm.lookAt) vrm.lookAt.applier.applyYawPitch(yaw, pitch);
    else if (rig.eyes) { setBone('leftEye', pitch, yaw, 0); setBone('rightEye', pitch, yaw, 0); }
  }
  if (!arkit && W.ConvertToVRMEyeBlendShapes) {
    const dirs = { lookUp: cur.lu * I[1], lookDown: cur.ld * I[1], lookLeft: cur.ll * I[0], lookRight: cur.lr * I[0] };
    if (rig.lookType === 'expression' || !W.UseBonesForEyeMovement) { // 뼈가 없는 모델: Look At·대기 시선도 표정으로 (우리 보완)
      dirs.lookLeft += clamp01((look.ey + ikEye.y + idleEY) / 20); dirs.lookRight += clamp01(-(look.ey + ikEye.y + idleEY) / 20);
      dirs.lookUp += clamp01(-(look.ep + ikEye.x + idleEP) / 15); dirs.lookDown += clamp01((look.ep + ikEye.x + idleEP) / 10);
    }
    for (const n in dirs) if (rig.has[n]) em.setValue(n, clamp01(dirs[n]));
  }
  VV.gaze = { yaw: +yaw.toFixed(2), pitch: +pitch.toFixed(2), lu: +cur.lu.toFixed(3), ll: +cur.ll.toFixed(3), lr: +cur.lr.toFixed(3) };
  if (VV.forceExpr) for (const n in VV.forceExpr) if (em.getExpression(n)) em.setValue(n, VV.forceExpr[n]); // 테스트용
  VV.cur = Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, +(+v).toFixed(3)]));
  VV.expr = Object.fromEntries(Object.entries(exprOut).map(([k, v]) => [k, +v.toFixed(3)]));
}

// ---------- 메인 루프 ----------
let last = performance.now(), fpsN = 0, fpsT = last, tN = 0;
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.1, (t - last) / 1000); last = t;
  if (mode === 'track' && video.readyState >= 2 && video.currentTime !== lastVideoTime) {
    lastVideoTime = video.currentTime;
    try { const r = detect(video, t); if (r) { ingest(r, t / 1000); faceSeen = t; tN++; if (autoCalibAt && t > autoCalibAt) { autoCalibAt = 0; calibrate(); } } }
    catch (e) { console.error(e); VV.errors.push('detect: ' + e.message); }
    status(t - faceSeen < 600 ? `추적 중 (${tracker.delegate})` : '얼굴을 찾는 중…');
  } else if (mode === 'demo') { ingest(demoRaw(t), t / 1000); faceSeen = t; tN++; }
  else if (mode === 'fake') { ingest({ bs: VV.fakeBS || {}, m: VV.fakeM || null }, t / 1000); faceSeen = t; tN++; } // 테스트용 블렌드쉐이프 직접 입력
  if (vrm && rig) { applyAvatar(t, dt); vrm.update(dt); }
  renderer.render(scene, camera);
  VV.frames++; fpsN++;
  if (t - fpsT > 1000) { $('fps').textContent = 'FPS ' + Math.round(fpsN * 1000 / (t - fpsT)); $('tfps').textContent = '추적 ' + Math.round(tN * 1000 / (t - fpsT)); VV.fps = fpsN; VV.tfps = tN; fpsN = 0; tN = 0; fpsT = t; }
}

// ---------- 배경 / 클린 뷰 / OBS ----------
function applyBg() { const on = !!W.TransparentBackground; document.body.classList.toggle('transp', on); document.documentElement.classList.toggle('transp', on); document.body.style.backgroundColor = W.ChromaKeyColor; }
$('green').onclick = () => { W.TransparentBackground = false; W.ChromaKeyColor = '#00ff00'; saveW(); refreshUI(); };
const bgParam = params.get('bg');
if (bgParam === 'transparent' || params.get('transparent') === '1') W.TransparentBackground = true;
else if (bgParam) { W.TransparentBackground = false; W.ChromaKeyColor = '#' + bgParam.replace('#', '').slice(0, 6); }
const setClean = on => { document.body.classList.toggle('clean', on); requestAnimationFrame(resize); };
$('clean').onclick = () => setClean(true);
if (params.get('clean') === '1') setClean(true);
if (params.get('obs') === '1') { setClean(true); if (!bgParam) W.TransparentBackground = true; }
$('panelToggle').onclick = () => { document.body.classList.toggle('collapsed'); requestAnimationFrame(resize); };
function diffSettings() { const d = {}; for (const s of WD.SCHEMA) if (s.key !== 'TransparentBackground' && s.key !== 'ChromaKeyColor' && JSON.stringify(W[s.key]) !== JSON.stringify(WD.DEFAULTS[s.key])) d[s.key] = W[s.key]; return d; }
function diffMapping() { const def = WD.defaultMapping(); return MAP.filter((m, i) => JSON.stringify(m) !== JSON.stringify(def.find(x => x.BlendShape === m.BlendShape) || def[i])); }
function obsUrl() {
  const u = new URL(location.origin + location.pathname);
  u.searchParams.set('obs', '1'); u.searchParams.set('autostart', '1');
  if (frame !== 'bust') u.searchParams.set('frame', frame);
  if (cam.zoom !== 1) u.searchParams.set('zoom', cam.zoom); if (cam.camY) u.searchParams.set('y', cam.camY); if (cam.camX) u.searchParams.set('x', cam.camX); if (cam.camRot) u.searchParams.set('rot', cam.camRot);
  const bgSel = $('obsBg')?.value || (W.TransparentBackground ? 'transparent' : 'chroma');
  if (bgSel === 'chroma') u.searchParams.set('bg', W.ChromaKeyColor.replace('#', '')); else if (bgSel === 'green') u.searchParams.set('bg', '00ff00');
  const res = $('obsRes')?.value; if (res) u.searchParams.set('res', res);
  const last = LS.get('vv_last_src', null); if (last && last !== DEFAULT_VRM && location.hostname.match(/^(localhost|127\.)/)) u.searchParams.set('vrm', last); // 로컬 서버에서만 (Pages엔 개인 아바타가 없음)
  const j = { s: diffSettings() }; const dm = diffMapping(); if (dm.length) j.m = dm; if (LS.get(EXPR_KEY, null)) j.e = engine.list;
  if (Object.keys(j.s).length || j.m || j.e) u.searchParams.set('ws', b64e(JSON.stringify(j)));
  return u.toString();
}
$('obsOpen') && ($('obsOpen').onclick = () => window.open(obsUrl().replace('autostart=1', 'demo=1'), '_blank'));
$('obsCopy').onclick = async () => { const url = obsUrl(), msg = $('obsMsg'); msg.hidden = false; try { await navigator.clipboard.writeText(url); msg.textContent = '복사됨! OBS > 소스 추가 > 브라우저에 붙여넣기: ' + url; } catch { msg.textContent = '아래 주소를 길게 눌러 복사하세요: ' + url; } };
window.__obsUrl = obsUrl;

// ---------- 설정 내보내기 / 가져오기 ----------
function exportJSON() { return { format: 'vrm-vtuber-warudo', version: 4, exportedAt: new Date().toISOString(), settings: structuredClone(W), mapping: structuredClone(MAP), expressions: structuredClone(engine.list), camera: { frame, ...cam } }; }
$('exportBtn').onclick = () => { const b = new Blob([JSON.stringify(exportJSON(), null, 2)], { type: 'application/json' }); const a = el('a', { href: URL.createObjectURL(b), download: 'vrm-vtuber-settings.json' }); document.body.append(a); a.click(); a.remove(); };
function applyImport(json) {
  const r = WD.importWarudoJSON(json);
  Object.assign(W, r.settings);
  if (r.mapping) { const base = WD.defaultMapping(); for (const m of r.mapping) { const i = base.findIndex(x => x.BlendShape === m.BlendShape); if (i >= 0) base[i] = m; } MAP = base; reindexMap(); }
  if (r.expressions && vrm) { engine.st.clear(); engine.setList(mergeExpr(WD.importVrmExpressions(rig.names, { vrm0: rig.vrm0, overrides: rig.overrides }), r.expressions)); saveExpr(); buildExprButtons(); buildExprEditor(); }
  if (r.kind === 'ours' && json.camera) { if (json.camera.frame) frame = PS.frame = json.camera.frame; for (const id of Object.keys(cam)) if (json.camera[id] !== undefined) { $(id).value = json.camera[id]; $(id).dispatchEvent(new Event('input')); } savePS(); }
  saveW(); refreshUI();
  const kinds = { ours: '우리 설정 파일', scene: 'Warudo 씬 파일', loose: 'JSON (구조 미확인)', unknown: '알 수 없음' };
  const lines = [`형식: ${kinds[r.kind]}`];
  if (r.scene) lines.push(`씬: ${r.scene.name} (Warudo ${r.scene.appVersion})`);
  if (r.report?.totals?.inputs) { const T = r.report.totals; lines.push(`입력값 ${T.inputs}개 중 가져옴 ${T.matched} · 다른 노드에 연결 ${T.connected} · 웹에 해당 없음 ${T.notApplicable} · 모름/미구현 ${T.unknown}`);
    const unk = [...r.report.assets, ...r.report.nodes].filter(a => a.unknown?.length).map(a => `${a.name}: ${a.unknown.join(', ')}`); if (unk.length) lines.push('모름/미구현: ' + unk.join(' / ')); }
  lines.push(`가져온 값 ${r.found.length}개: ${r.found.join(', ') || '없음'}`);
  if (r.sources.length) lines.push('찾은 위치: ' + r.sources.join(', '));
  const missing = WD.SCHEMA.filter(s => s.src !== 'ours' && !(s.key in r.settings)).map(s => s.key);
  if (r.kind !== 'ours' && missing.length) lines.push(`못 찾은 값 (그대로 둠): ${missing.join(', ')}`);
  lines.push(...r.notes);
  const m = $('importMsg'); m.hidden = false; m.textContent = lines.join('\n'); VV.lastImport = r; return r;
}
async function importSettingsFile(file) { try { const j = JSON.parse(await file.text()); applyImport(j); $('fileSec').open = true; } catch (e) { showErr('JSON 파일을 읽지 못했어요: ' + (e.message || e)); } }
$('importFile').onchange = e => { importSettingsFile(e.target.files[0]); e.target.value = ''; };
$('resetW').onclick = () => { Object.assign(W, structuredClone(WD.DEFAULTS)); MAP = WD.defaultMapping(); reindexMap(); saveW(); refreshUI(); };
VV.applyImport = applyImport; VV.exportJSON = exportJSON; VV.engine = engine; VV.mapped = () => mapped; VV.vrmConv = () => vrmConv; VV.loadVRM = loadVRM; VV.getVRM = () => vrm; VV.mouthOut = () => mouthOut; VV.startFake = (bs = {}) => { if (mode === 'track') stopCamera(); VV.fakeBS = bs; mode = 'fake'; status('테스트 입력'); };

// 표정 단축키 (real: Warudo 온보딩 = Alt + 1…0 - = Q…P [ , Alt+Backspace 모두 끄기). 숫자·-·=·Backspace는 Alt 없이도 됨 (우리 편의)
const CODE_KEY = { Minus: '-', Equal: '=', BracketLeft: '[', BracketRight: ']', Semicolon: ';', Comma: ',', Period: '.', Backspace: 'Backspace' };
function keyLabel(e) { if (e.code?.startsWith('Digit')) return e.code.slice(5); if (e.code?.startsWith('Key')) return e.code.slice(3); return CODE_KEY[e.code] || (e.key?.length === 1 ? e.key.toUpperCase() : e.key); }
document.addEventListener('keydown', e => {
  if (e.target?.closest?.('input,textarea,select')) return;
  if (e.ctrlKey || e.metaKey) return;
  const k = keyLabel(e), combo = (e.altKey ? 'Alt+' : '') + (e.shiftKey ? '' : '') + k;
  if (k === 'Backspace') { e.preventDefault(); engine.exitAll(now()); return; }
  const ex = engine.list.find(x => x.Hotkey === combo) || (!e.altKey && /^[0-9=\-]$/.test(k) && engine.list.find(x => x.Hotkey === 'Alt+' + k));
  if (ex) { e.preventDefault(); toggleExpr(ex.Name); return; }
  if (!e.altKey && (k === 'H')) setClean(!document.body.classList.contains('clean'));
  if (e.key === 'Escape') setClean(false);
});
let lastTap = 0;
$('stage').addEventListener('pointerup', () => { const t = performance.now(); if (t - lastTap < 350 && document.body.classList.contains('clean')) setClean(false); lastTap = t; });
document.addEventListener('dblclick', () => setClean(false));

// ---------- 시작 ----------
refreshUI(); buildExprButtons(); resize(); requestAnimationFrame(loop);
(async () => {
  let ok = false;
  if (params.get('vrm')) ok = await loadVRM(params.get('vrm'), params.get('vrm'));
  if (!ok && params.get('default') !== '1') { try { const saved = await idbGet(); if (saved?.buf) ok = await loadVRM(saved.buf, saved.name); } catch {} }
  if (!ok && params.get('default') !== '1') { const last = LS.get('vv_last_src', null); if (last && await headOk(last)) ok = await loadVRM(last, last); }
  if (!ok && params.get('default') !== '1' && await headOk(LOCAL_AVATARS[0].path)) ok = await loadVRM(LOCAL_AVATARS[0].path, LOCAL_AVATARS[0].label); // 로컬에 내 아바타가 있으면 그게 기본
  if (!ok) await loadVRM(DEFAULT_VRM, '기본');
  if (params.get('fake') === '1') VV.startFake({}); else if (params.get('demo') === '1') startDemo(); else if (params.get('autostart') === '1') startCamera();
})();
