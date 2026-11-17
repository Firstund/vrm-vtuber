# v4 검증: 입 따라하기(가짜 블렌드쉐이프 입력) + OBS 고정 해상도 + 오류 확인
# 로컬 전용 아바타(assets-local/avatar.vrm) 스크린샷은 screens/v4-local-*.png (git 제외)
import asyncio, json, os
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8642/'
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
LOCAL = 'assets-local/avatar.vrm'
S = lambda l, r=None: {'mouthSmileLeft': l, 'mouthSmileRight': l if r is None else r}
SHAPES = {  # 사람 입 모양을 흉내 낸 ARKit 값 (MediaPipe가 내는 이름)
  'closed': {'mouthClose': 0.45, 'jawOpen': 0.12, 'mouthPressLeft': 0.4, 'mouthPressRight': 0.4},
  'a': {'jawOpen': 0.75},
  'i': {'jawOpen': 0.3, **S(0.45), 'mouthStretchLeft': 0.25, 'mouthStretchRight': 0.25},
  'u': {'jawOpen': 0.1, 'mouthPucker': 0.9, 'mouthFunnel': 0.15},
  'e': {'jawOpen': 0.4, 'mouthStretchLeft': 0.5, 'mouthStretchRight': 0.5},
  'o': {'jawOpen': 0.45, 'mouthFunnel': 0.35, 'mouthLowerDownLeft': 0.2, 'mouthLowerDownRight': 0.2},
  'smile-left': {**S(0.85, 0.0)},
  'smile-right': {**S(0.0, 0.85)},
  'smile-both-open': {'jawOpen': 0.35, **S(0.8)},
  'frown': {'mouthFrownLeft': 0.6, 'mouthFrownRight': 0.6},
}
async def page(b, url, vp=(900, 900)):
    ctx = await b.new_context(viewport={'width': vp[0], 'height': vp[1]})
    pg = await ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
    await pg.goto(B + url); await pg.wait_for_function('window.__vv && __vv.loaded', timeout=180000)
    return ctx, pg, logs
async def mouth_run(pg, prefix, clip):
    out = {}
    for n, bs in SHAPES.items():
        await pg.evaluate(f'__vv.fakeBS = {json.dumps(bs)}'); await pg.wait_for_timeout(900)
        out[n] = await pg.evaluate('({vis:Object.fromEntries(["aa","ih","ou","ee","oh"].map(k=>[k,+(__vv.vis[k]||0).toFixed(2)])),side:__vv.side})')
        await pg.screenshot(path=f'{prefix}-{n}.png', clip=clip)
    # 반응 속도: 닫힘 → 아 로 바꾼 뒤 aa가 목표의 90%에 닿는 시간
    await pg.evaluate("__vv.fakeBS={}"); await pg.wait_for_timeout(800)
    t = await pg.evaluate("""new Promise(r=>{const t0=performance.now(); __vv.fakeBS={jawOpen:0.75}; const f=()=>{ if((__vv.vis.aa||0)>=0.9*0.9) r(Math.round(performance.now()-t0)); else if(performance.now()-t0>3000) r(-1); else requestAnimationFrame(f)}; f();})""")
    out['response_ms_to_90pct'] = t
    return out
async def main():
    res = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=ARGS)
        # 1) 기본 아바타 (공개 스크린샷)
        ctx, pg, logs = await page(b, '?default=1&fake=1&clean=1&zoom=2.4&y=-0.08')
        await pg.wait_for_timeout(1500)
        res['default'] = {'avatar_mouth': await pg.evaluate('__vv.avatar.mouth'), 'mouth': await mouth_run(pg, 'screens/v4-default-mouth', {'x': 250, 'y': 100, 'width': 400, 'height': 400}), 'errors': await pg.evaluate('__vv.errors'), 'logs': logs}
        await ctx.close()
        # 2) OBS 모드 + 고정 해상도
        ctx, pg, logs = await page(b, '?default=1&obs=1&demo=1&res=1280x720', vp=(1000, 700))
        await pg.wait_for_timeout(2500); await pg.screenshot(path='screens/v4-obs-1280x720-transparent.png', omit_background=True)
        res['obs'] = await pg.evaluate('({canvas:[document.getElementById("c").width,document.getElementById("c").height], fixed:document.body.classList.contains("fixedres"), clean:document.body.classList.contains("clean"), panelVisible:getComputedStyle(document.getElementById("panel")).display!=="none", errors:__vv.errors})')
        res['obs']['logs'] = logs; await ctx.close()
        ctx, pg, logs = await page(b, '?default=1')
        await pg.evaluate("document.getElementById('obsRes').value='1080x1920'; document.getElementById('obsBg').value='green'")
        res['obs_url'] = await pg.evaluate('__obsUrl()'); await ctx.close()
        # 3) 로컬 전용 아바타 (있으면)
        if os.path.exists(LOCAL):
            ctx, pg, logs = await page(b, f'?vrm={LOCAL}&fake=1&clean=1&zoom=2.4&y=-0.1')
            await pg.wait_for_timeout(1500)
            res['local'] = {'avatar': await pg.evaluate('({mouth:__vv.avatar.mouth, n:__vv.avatar.expressions.length, hotkeys:__vv.avatar.hotkeys.length, lookAt:__vv.avatar.lookAt})'),
                            'mouth': await mouth_run(pg, 'screens/v4-local-avatar-mouth', {'x': 300, 'y': 120, 'width': 300, 'height': 260}), 'errors': await pg.evaluate('__vv.errors'), 'logs': logs}
            await ctx.close()
        await b.close()
    json.dump(res, open('/tmp/v4-result.json', 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(res, ensure_ascii=False)[:6000])
asyncio.run(main())
