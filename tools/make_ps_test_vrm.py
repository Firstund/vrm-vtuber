# 퍼펙트싱크(ARKit 52) 시험용 VRM을 직접 만듦 (CC0, 개인 아바타 아님). 얼굴만 단순 도형.
#   python3 tools/make_ps_test_vrm.py  → assets/test/ps52-*.vrm
# 1) ps52-vrm1-expr.vrm : VRM 1.0, ARKit 이름 그대로인 custom 표정 52개 (메시 셰이프 이름은 k00…)
# 2) ps52-vrm1-mesh.vrm : VRM 1.0, 표정 없이 메시 블렌드쉐이프 이름만 (변형 이름: blendShape1.eyeBlink_L, MOUTH_SMILE_R 등)
# 3) ps52-vrm0-groups.vrm : VRM 0.x, blendShapeGroups 52개 (변형 이름: EyeBlink_L 등)
import json, math, struct, os
ARKIT = ["eyeBlinkLeft","eyeBlinkRight","eyeLookDownLeft","eyeLookDownRight","eyeLookInLeft","eyeLookInRight","eyeLookOutLeft","eyeLookOutRight","eyeLookUpLeft","eyeLookUpRight","eyeSquintLeft","eyeSquintRight","eyeWideLeft","eyeWideRight","jawLeft","jawRight","jawForward","jawOpen","mouthLeft","mouthRight","mouthSmileLeft","mouthSmileRight","mouthFrownLeft","mouthFrownRight","mouthDimpleLeft","mouthDimpleRight","mouthStretchLeft","mouthStretchRight","mouthPressLeft","mouthPressRight","mouthLowerDownLeft","mouthLowerDownRight","mouthUpperUpLeft","mouthUpperUpRight","mouthClose","mouthFunnel","mouthPucker","mouthRollLower","mouthRollUpper","mouthShrugLower","mouthShrugUpper","browDownLeft","browDownRight","browOuterUpLeft","browOuterUpRight","browInnerUp","cheekSquintLeft","cheekSquintRight","cheekPuff","noseSneerLeft","noseSneerRight","tongueOut"]
HEAD_Y = 1.45; R = 0.1; HC = (0.0, HEAD_Y + 0.09, 0.0)  # 머리 중심 (VRM1: +Z 정면, 아바타 왼쪽 = +X)
V, C, I, TAG = [], [], [], []  # 위치, 색, 삼각형, 꼭짓점 정보(부위, 좌우, 로컬 좌표)
def add_v(p, c, tag): V.append(list(p)); C.append(c); TAG.append(tag); return len(V) - 1
SKIN, DARK, RED, BROW, PINK, NOSE, WHITE = (1.0, .85, .75, 1), (.1, .1, .15, 1), (.8, .2, .25, 1), (.3, .2, .15, 1), (1, .5, .6, 1), (.95, .75, .65, 1), (1, 1, 1, 1)
# 얼굴 구
NU, NV = 24, 16; base = len(V)
for j in range(NV + 1):
    th = math.pi * j / NV
    for i in range(NU):
        ph = 2 * math.pi * i / NU; x, y, z = R * math.sin(th) * math.sin(ph), R * math.cos(th), R * math.sin(th) * math.cos(ph)
        add_v((HC[0] + x, HC[1] + y, HC[2] + z), SKIN, ('skin', 1 if x > 0 else -1, x, y, z))
for j in range(NV):
    for i in range(NU):
        a, b, c, d = base + j * NU + i, base + j * NU + (i + 1) % NU, base + (j + 1) * NU + i, base + (j + 1) * NU + (i + 1) % NU
        I.extend([a, c, b, b, c, d])
def front(x, y, lift=0.004):  # 구 표면 위 정면 점
    z = math.sqrt(max(0, R * R - x * x - y * y)) + lift; return (HC[0] + x, HC[1] + y, HC[2] + z)
def disc(part, side, cx, cy, rx, ry, color, n=20, lift=0.004):
    c0 = add_v(front(cx, cy, lift), color, (part, side, 0, 0, 0)); rim = []
    for k in range(n):
        a = 2 * math.pi * k / n; lx, ly = math.cos(a) * rx, math.sin(a) * ry
        rim.append(add_v(front(cx + lx, cy + ly, lift), color, (part, side, lx, ly, a)))
    for k in range(n): I.extend([c0, rim[k], rim[(k + 1) % n]])
for sd in (1, -1):
    disc('eyewhite', sd, 0.036 * sd, 0.02, 0.02, 0.012, WHITE, lift=0.003)
    disc('eye', sd, 0.036 * sd, 0.02, 0.009, 0.009, DARK, lift=0.0045)
    # 눈꺼풀(피부색, 깜빡이면 내려와 눈을 덮음): 처음엔 위로 접혀 있음
    disc('lid', sd, 0.036 * sd, 0.036, 0.022, 0.003, SKIN, lift=0.0055)
    # 눈썹
    b0 = len(V)
    for k, (lx, ly) in enumerate([(-0.017, 0), (0.017, 0), (0.017, 0.004), (-0.017, 0.004)]):
        add_v(front(0.036 * sd + lx, 0.048 + ly, 0.005), BROW, ('brow', sd, lx * sd, ly, 0))  # lx*sd>0 = 바깥쪽
    I.extend([b0, b0 + 1, b0 + 2, b0, b0 + 2, b0 + 3])
disc('mouthin', 0, 0, -0.045, 0.022, 0.004, DARK, n=24, lift=0.003)
disc('mouth', 0, 0, -0.045, 0.024, 0.006, RED, n=24, lift=0.0035)
disc('tongue', 0, 0, -0.05, 0.01, 0.006, PINK, n=12, lift=-0.004)
disc('nose', 0, 0, -0.012, 0.007, 0.005, NOSE, n=10, lift=0.008)
for sd in (1, -1): disc('cheek', sd, 0.055 * sd, -0.025, 0.014, 0.009, (1, .6, .6, 1), n=12, lift=0.0035)
def S(v, k): return v * k
def delta(name, t, p):
    part, sd, lx, ly, a = t; dx = dy = dz = 0.0
    side = 1 if name.endswith('Left') else -1 if name.endswith('Right') else 0
    def on(s): return side == 0 or s == side
    if part in ('mouth', 'mouthin'):
        cor = abs(math.cos(a)) if lx or ly else 0; lower = ly < 0; upper = ly > 0
        xs = 1 if lx > 0 else -1 if lx < 0 else 0
        if name == 'jawOpen': dy = -0.03 * (-math.sin(a)) if lower else 0; dy += -0.006 if (lx == 0 and ly == 0) else 0
        elif name in ('jawLeft', 'jawRight'): dx = 0.008 * side * (1 if lower else 0.3)
        elif name == 'jawForward': dz = 0.006 if lower else 0
        elif name in ('mouthLeft', 'mouthRight'): dx = 0.012 * side
        elif name.startswith('mouthSmile') and xs == side: dy, dx = 0.012 * cor, 0.004 * cor * side
        elif name.startswith('mouthFrown') and xs == side: dy = -0.01 * cor
        elif name.startswith('mouthDimple') and xs == side: dx = 0.006 * cor * side
        elif name.startswith('mouthStretch') and xs == side: dx, dy = 0.01 * cor * side, -0.002 * cor
        elif name.startswith('mouthPress') and xs == side: dy = -ly * 0.7
        elif name.startswith('mouthLowerDown') and xs == side and lower: dy = -0.012 * (-math.sin(a))
        elif name.startswith('mouthUpperUp') and xs == side and upper: dy = 0.008 * math.sin(a)
        elif name == 'mouthClose': dy = -ly * 0.8
        elif name == 'mouthFunnel': dx, dy, dz = -lx * 0.35, ly * 2.0, 0.006
        elif name == 'mouthPucker': dx, dy, dz = -lx * 0.55, ly * 0.5, 0.012
        elif name == 'mouthRollLower' and lower: dy, dz = 0.004, -0.003
        elif name == 'mouthRollUpper' and upper: dy, dz = -0.004, -0.003
        elif name == 'mouthShrugLower' and lower: dy = 0.005
        elif name == 'mouthShrugUpper' and upper: dy = 0.005
    elif part == 'tongue':
        if name == 'tongueOut': dy, dz = -0.012, 0.03
        elif name == 'jawOpen': dy = -0.012
    elif part in ('eye', 'eyewhite') and on(sd):
        if part == 'eye':
            inward = -sd  # 코 쪽 방향
            if name.startswith('eyeLookIn'): dx = 0.006 * inward
            elif name.startswith('eyeLookOut'): dx = -0.006 * inward
            elif name.startswith('eyeLookUp'): dy = 0.004
            elif name.startswith('eyeLookDown'): dy = -0.004
        if name.startswith('eyeWide'): dy = ly * 0.5
        elif name.startswith('eyeSquint'): dy = -ly * 0.45
    elif part == 'lid' and on(sd):
        if name.startswith('eyeBlink'): dy, dz = (-0.03 if ly <= 0 else -0.003), 0.02   # 아래 테두리가 내려와 눈을 덮음 (앞으로 나와 구 표면 위에)
        elif name.startswith('eyeSquint'): dy, dz = (-0.012 if ly <= 0 else 0), 0.016
        elif name.startswith('eyeWide'): dy = 0.004
    elif part == 'brow' and on(sd):
        if name.startswith('browDown'): dy = -0.007
        elif name.startswith('browOuterUp') and lx > 0: dy = 0.008
    elif part == 'brow' and name == 'browInnerUp' and lx < 0: dy = 0.008
    elif part == 'cheek':
        if name == 'cheekPuff': dx, dz = 0.008 * sd, 0.006
        elif name.startswith('cheekSquint') and on(sd): dy = 0.006
    elif part == 'skin':
        x, y, z = lx, ly, a  # 구 로컬
        if name == 'cheekPuff' and z > 0.03 and -0.06 < y < 0 and abs(x) > 0.03: k = 0.012; dx, dz = k * (1 if x > 0 else -1), k * 0.5
        elif name == 'jawOpen' and y < -0.05 and z > 0: dy = -0.012 * min(1, (-y - 0.05) / 0.04)
    elif part == 'nose' and name.startswith('noseSneer') and (side == 0 or (lx * side) >= 0): dy = 0.004
    return (dx, dy, dz)
TARGETS = [[delta(n, t, V[i]) for i, t in enumerate(TAG)] for n in ARKIT]
# 몸통(단순 상자, 블렌드쉐이프 없음)
BV, BI = [], []
def box(cx, cy, cz, sx, sy, sz):
    b = len(BV)
    for dx in (-1, 1):
        for dy in (-1, 1):
            for dz in (-1, 1): BV.append([cx + dx * sx, cy + dy * sy, cz + dz * sz])
    for f in [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]:
        a, b2, c, d = [b + k for k in f]; BI.extend([a, b2, c, a, c, d])
box(0, 1.15, 0, 0.16, 0.22, 0.09); box(0, HEAD_Y - 0.02, 0, 0.035, 0.05, 0.035)
box(0.27, 1.3, 0, 0.12, 0.035, 0.035); box(-0.27, 1.3, 0, 0.12, 0.035, 0.035)
box(0.08, 0.5, 0, 0.05, 0.42, 0.05); box(-0.08, 0.5, 0, 0.05, 0.42, 0.05)

def build(variant):
    flip = variant == 'vrm0'  # VRM0: 정면 -Z, 아바타 왼쪽 -X (three-vrm이 180° 돌림)
    fx = (lambda p: [-p[0], p[1], -p[2]]) if flip else (lambda p: list(p))
    blob = bytearray(); views, accs = [], []
    def put(data, fmt, count, comp, typ, target=None, minmax=False):
        nonlocal blob
        while len(blob) % 4: blob.append(0)
        off = len(blob); raw = struct.pack('<' + fmt * (len(data) // len(fmt) if False else 1), *[]) if False else b''
        flat = [x for row in data for x in (row if isinstance(row, (list, tuple)) else [row])]
        raw = struct.pack('<%d%s' % (len(flat), fmt), *flat); blob += raw
        v = {'buffer': 0, 'byteOffset': off, 'byteLength': len(raw)}
        if target: v['target'] = target
        views.append(v); a = {'bufferView': len(views) - 1, 'componentType': comp, 'count': count, 'type': typ}
        if minmax:
            cols = list(zip(*data)); a['min'] = [min(c) for c in cols]; a['max'] = [max(c) for c in cols]
        accs.append(a); return len(accs) - 1
    pos = put([fx(p) for p in V], 'f', len(V), 5126, 'VEC3', 34962, True)
    col = put(C, 'f', len(C), 5126, 'VEC4', 34962)
    idx = put(I, 'H', len(I), 5123, 'SCALAR', 34963)
    tg = [{'POSITION': put([fx(d) for d in T], 'f', len(T), 5126, 'VEC3', 34962, True)} for T in TARGETS]
    bpos = put([fx(p) for p in BV], 'f', len(BV), 5126, 'VEC3', 34962, True); bidx = put(BI, 'H', len(BI), 5123, 'SCALAR', 34963)
    if variant == 'mesh':  # 변형 이름 섞기
        def vname(i, n):
            k = i % 5
            if k == 0: return 'blendShape1.' + n.replace('Left', '_L').replace('Right', '_R')
            if k == 1: return n[0].upper() + n[1:]
            if k == 2: return '_'.join(w.lower() for w in __import__('re').findall('[A-Z]?[a-z]+', n)).replace('_left', '_l').replace('_right', '_r').upper()
            if k == 3: return 'BS_' + n
            return n.replace('Left', 'L').replace('Right', 'R')
        tnames = [vname(i, n) for i, n in enumerate(ARKIT)]
    else: tnames = ['k%02d' % i for i in range(len(ARKIT))]
    mats = [{'name': 'face', 'pbrMetallicRoughness': {'baseColorFactor': [1, 1, 1, 1], 'metallicFactor': 0, 'roughnessFactor': 1}, 'extensions': {'KHR_materials_unlit': {}}},
            {'name': 'body', 'pbrMetallicRoughness': {'baseColorFactor': [.35, .45, .75, 1], 'metallicFactor': 0, 'roughnessFactor': .8}}]
    meshes = [{'name': 'Face', 'primitives': [{'attributes': {'POSITION': pos, 'COLOR_0': col}, 'indices': idx, 'material': 0, 'targets': tg}], 'weights': [0] * len(ARKIT), 'extras': {'targetNames': tnames}},
              {'name': 'Body', 'primitives': [{'attributes': {'POSITION': bpos}, 'indices': bidx, 'material': 1}]}]
    s = -1 if flip else 1
    bones = [('hips', None, (0, 0.92, 0)), ('spine', 'hips', (0, 0.1, 0)), ('chest', 'spine', (0, 0.15, 0)), ('neck', 'chest', (0, 0.25, 0)), ('head', 'neck', (0, 0.08, 0)),
             ('leftUpperArm', 'chest', (0.17, 0.2, 0)), ('leftLowerArm', 'leftUpperArm', (0.12, 0, 0)), ('leftHand', 'leftLowerArm', (0.12, 0, 0)),
             ('rightUpperArm', 'chest', (-0.17, 0.2, 0)), ('rightLowerArm', 'rightUpperArm', (-0.12, 0, 0)), ('rightHand', 'rightLowerArm', (-0.12, 0, 0)),
             ('leftUpperLeg', 'hips', (0.08, -0.05, 0)), ('leftLowerLeg', 'leftUpperLeg', (0, -0.4, 0)), ('leftFoot', 'leftLowerLeg', (0, -0.4, 0)),
             ('rightUpperLeg', 'hips', (-0.08, -0.05, 0)), ('rightLowerLeg', 'rightUpperLeg', (0, -0.4, 0)), ('rightFoot', 'rightLowerLeg', (0, -0.4, 0))]
    nodes = [{'name': 'Root', 'children': []}, {'name': 'Face', 'mesh': 0}, {'name': 'Body', 'mesh': 1}]
    nodes[0]['children'] += [2]; bi = {}
    for name, parent, t in bones:
        bi[name] = len(nodes); nodes.append({'name': name, 'translation': [t[0] * s, t[1], t[2] * s]})
        (nodes[0] if parent is None else nodes[bi[parent]]).setdefault('children', []).append(bi[name])
    hw = [0, 0, 0]; n_ = 'head'; chain = {b: (p, t) for b, p, t in bones}
    while n_: p, t = chain[n_]; hw = [hw[0] + t[0] * s, hw[1] + t[1], hw[2] + t[2] * s]; n_ = p
    nodes[1]['translation'] = [-hw[0], -hw[1], -hw[2]]; nodes[bi['head']].setdefault('children', []).append(1)  # 얼굴은 머리 뼈를 따라 움직임
    g = {'asset': {'version': '2.0', 'generator': 'vrm-vtuber make_ps_test_vrm.py'}, 'scene': 0, 'scenes': [{'nodes': [0]}], 'nodes': nodes, 'meshes': meshes, 'materials': mats,
         'accessors': accs, 'bufferViews': views, 'buffers': [{'byteLength': 0}], 'extensionsUsed': ['KHR_materials_unlit']}
    if variant == 'vrm0':
        g['extensionsUsed'].append('VRM')
        gname = lambda n: n[0].upper() + n[1:].replace('Left', '_L').replace('Right', '_R')
        groups = [{'name': gname(n), 'presetName': 'unknown', 'binds': [{'mesh': 0, 'index': i, 'weight': 100}], 'materialValues': [], 'isBinary': False} for i, n in enumerate(ARKIT)]
        groups += [{'name': 'Neutral', 'presetName': 'neutral', 'binds': [], 'materialValues': [], 'isBinary': False}]
        g['extensions'] = {'VRM': {'exporterVersion': 'make_ps_test_vrm', 'specVersion': '0.0',
            'meta': {'title': 'PS52 test (VRM0)', 'version': '1', 'author': 'vrm-vtuber', 'allowedUserName': 'Everyone', 'violentUssageName': 'Allow', 'sexualUssageName': 'Allow', 'commercialUssageName': 'Allow', 'licenseName': 'CC0'},
            'humanoid': {'humanBones': [{'bone': b, 'node': n, 'useDefaultValues': True} for b, n in bi.items()]},
            'blendShapeMaster': {'blendShapeGroups': groups}, 'firstPerson': {'firstPersonBone': bi['head'], 'meshAnnotations': [], 'lookAtTypeName': 'BlendShape', **{k: {'curve': [0, 0, 0, 1, 1, 1, 1, 0], 'xRange': 90, 'yRange': 10 if 'Horizontal' in k else 1} for k in ['lookAtHorizontalInner', 'lookAtHorizontalOuter', 'lookAtVerticalDown', 'lookAtVerticalUp']}},
            'secondaryAnimation': {'boneGroups': [], 'colliderGroups': []}, 'materialProperties': []}}
    else:
        g['extensionsUsed'].append('VRMC_vrm')
        custom = {} if variant == 'mesh' else {n: {'morphTargetBinds': [{'node': 1, 'index': i, 'weight': 1.0}], 'isBinary': False, 'overrideBlink': 'none', 'overrideLookAt': 'none', 'overrideMouth': 'none'} for i, n in enumerate(ARKIT)}
        g['extensions'] = {'VRMC_vrm': {'specVersion': '1.0', 'meta': {'name': 'PS52 test (' + variant + ')', 'version': '1', 'authors': ['vrm-vtuber'], 'licenseUrl': 'https://vrm.dev/licenses/1.0/', 'avatarPermission': 'everyone', 'commercialUsage': 'corporation', 'allowRedistribution': True, 'modification': 'allowModificationRedistribution', 'creditNotation': 'unnecessary'},
            'humanoid': {'humanBones': {b: {'node': n} for b, n in bi.items()}}, 'expressions': {'preset': {}, 'custom': custom}, 'lookAt': {'type': 'expression'}}}
    while len(blob) % 4: blob.append(0)
    g['buffers'][0]['byteLength'] = len(blob)
    js = json.dumps(g, separators=(',', ':')).encode(); js += b' ' * ((4 - len(js) % 4) % 4)
    return struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)) + struct.pack('<II', len(js), 0x4E4F534A) + js + struct.pack('<II', len(blob), 0x004E4942) + bytes(blob)
os.makedirs('assets/test', exist_ok=True)
for v, fn in [('expr', 'ps52-vrm1-expr.vrm'), ('mesh', 'ps52-vrm1-mesh.vrm'), ('vrm0', 'ps52-vrm0-groups.vrm')]:
    open('assets/test/' + fn, 'wb').write(build(v)); print(fn, os.path.getsize('assets/test/' + fn))
