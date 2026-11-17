# v5 검증: 퍼펙트싱크(ARKit 52) 1:1 경로 — 직접 만든 시험 모델 3종(VRM1 표정 / VRM1 메시 이름 변형 / VRM0 그룹)
# + 52개 없는 아바타는 v4 입 따라하기로 폴백, 중립 보정·게인, 0 에러. 로컬 아바타 스크린샷은 screens/v5-local-*.png (git 제외)
import asyncio, json, os
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8642/'
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
MODELS = ['assets/test/ps52-vrm1-expr.vrm', 'assets/test/ps52-vrm1-mesh.vrm', 'assets/test/ps52-vrm0-groups.vrm']
LOCAL = 'assets-local/avatar.vrm'
FACE_JS = "(() => { let m = null; __vv.getVRM().scene.traverse(o => { if (o.isMesh && o.name.startsWith('Face') && o.morphTargetInfluences) m = o; }); return m ? Array.from(m.morphTargetInfluences).map(v => +v.toFixed(3)) : null })()"
SHOTS = {'neutral': {}, 'blink-left': {'eyeBlinkLeft': 1}, 'jaw-open': {'jawOpen': 0.8}, 'smile-left': {'mouthSmileLeft': 0.9},
         'pucker': {'mouthPucker': 0.9}, 'brow-inner-up': {'browInnerUp': 0.9}, 'look-left-cheekpuff': {'eyeLookOutLeft': 0.8, 'eyeLookInRight': 0.8, 'cheekPuff': 0.9}}
async def page(b, url, vp=(900, 900)):
    ctx = await b.new_context(viewport={'width': vp[0], 'height': vp[1]})
    pg = await ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
    await pg.goto(B + url); await pg.wait_for_function('window.__vv && __vv.loaded', timeout=180000)
    return ctx, pg, logs
async def sel(pg, v): await pg.evaluate(f"(() => {{ const s = document.getElementById('psMode'); s.value = '{v}'; s.dispatchEvent(new Event('change')); }})()")
async def main():
    res = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=ARGS)
        for mi, model in enumerate(MODELS):
            tag = os.path.basename(model)[:-4]
            ctx, pg, logs = await page(b, f'?vrm={model}&fake=1&clean=1&zoom=3.2&y=0.02')
            await pg.wait_for_timeout(800)
            r = {'ps': await pg.evaluate('({hit:__vv.avatar.ps.hit, expr:__vv.avatar.ps.expr, morph:__vv.avatar.ps.morph, missing:__vv.avatar.ps.missing, sample:Object.entries(__vv.avatar.ps.src).slice(0,6)})'), 'mapping': await pg.evaluate('__vv.mappingType')}
            order = await pg.evaluate('__vv.ARKIT')
            ok, bad = 0, []
            for i, n in enumerate(order):  # 해당 셰이프만 0.8 → 같은 순번(ARKit 순서로 만든) 블렌드쉐이프만 움직이는지
                await pg.evaluate(f"__vv.fakeBS = {{'{n}': 0.8}}"); await pg.wait_for_timeout(650)
                inf = await pg.evaluate(FACE_JS)
                others = max([v for j, v in enumerate(inf) if j != i] or [0])
                if inf[i] > 0.4 and others < 0.15: ok += 1
                else: bad.append([n, inf[i], round(others, 3)])
            r['one_to_one'] = {'ok': ok, 'bad': bad}
            if mi == 0:
                for nm, bs in SHOTS.items():
                    await pg.evaluate(f'__vv.fakeBS = {json.dumps(bs)}'); await pg.wait_for_timeout(800)
                    await pg.screenshot(path=f'screens/v5-ps52-{nm}.png', clip={'x': 100, 'y': 0, 'width': 700, 'height': 700})
                await pg.evaluate("__vv.fakeBS = {jawOpen: 0.3, mouthSmileLeft: 0.2}"); await pg.wait_for_timeout(700)
                before = await pg.evaluate('__vv.psOut.jawOpen')
                await pg.evaluate("document.getElementById('psNeutral').click()"); await pg.wait_for_timeout(3300)
                r['neutral'] = {'jaw_before': before, 'jaw_after': await pg.evaluate('__vv.psOut.jawOpen'), 'cal': await pg.evaluate('__vv.CAL().neutral'), 'saved': await pg.evaluate("JSON.parse(localStorage.getItem('vv_ps_cal')).neutral")}
                await pg.evaluate("__vv.fakeBS = {jawOpen: 0.8}"); await pg.wait_for_timeout(700)
                r['neutral']['jaw_0.8_after'] = await pg.evaluate('__vv.psOut.jawOpen')
                await pg.evaluate("document.getElementById('psNeutral').nextSibling.click()")
                await pg.evaluate("(() => { const x = document.querySelector('[data-ps=\"gain:mouthSmileLeft\"]'); x.value = 2; x.dispatchEvent(new Event('change')); })()")
                await pg.evaluate("__vv.fakeBS = {mouthSmileLeft: 0.3}"); await pg.wait_for_timeout(800)
                r['gain'] = {'smileL_gain2_in0.3': await pg.evaluate('__vv.psOut.mouthSmileLeft'), 'saved': await pg.evaluate("JSON.parse(localStorage.getItem('vv_ps_cal')).gain")}
                await pg.evaluate("localStorage.removeItem('vv_ps_cal')")
                await sel(pg, 'VRM'); await pg.wait_for_timeout(500); r['force_off'] = await pg.evaluate('__vv.mappingType')
                r['force_off_morphs_reset'] = max(await pg.evaluate(FACE_JS))
                await sel(pg, 'Auto')
            r['errors'] = await pg.evaluate('__vv.errors'); r['logs'] = logs
            res[tag] = r; await ctx.close()
        ctx, pg, logs = await page(b, f'?vrm={MODELS[0]}&demo=1', vp=(1280, 1000))
        await pg.evaluate("(() => { const d = document.getElementById('sec-ps'); d.open = true; d.scrollIntoView(); })()"); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='screens/v5-panel-perfectsync.png')
        res['ui'] = {'info': await pg.evaluate("document.getElementById('psInfo').textContent"), 'miss': await pg.evaluate("document.getElementById('psMiss').textContent"), 'rows': await pg.evaluate("document.querySelectorAll('#psTab tr[data-n]').length"), 'meterMoving': await pg.evaluate("[...document.querySelectorAll('#psTab .bo')].filter(x => parseFloat(x.style.width) > 0).length"), 'errors': await pg.evaluate('__vv.errors'), 'logs': logs}
        await ctx.close()
        ctx, pg, logs = await page(b, '?default=1&fake=1')
        await pg.evaluate("__vv.fakeBS = {jawOpen: 0.75}"); await pg.wait_for_timeout(900)
        res['fallback_default'] = {'hit': await pg.evaluate('__vv.avatar.ps.hit'), 'mapping': await pg.evaluate('__vv.mappingType'), 'aa': await pg.evaluate('__vv.vis.aa'), 'info': await pg.evaluate("document.getElementById('psInfo').textContent"), 'errors': await pg.evaluate('__vv.errors'), 'logs': logs}
        await ctx.close()
        if os.path.exists(LOCAL):
            ctx, pg, logs = await page(b, f'?vrm={LOCAL}&fake=1&clean=1&zoom=2.4&y=-0.1')
            await pg.evaluate("__vv.fakeBS = {jawOpen: 0.75}"); await pg.wait_for_timeout(1000)
            await pg.screenshot(path='screens/v5-local-avatar-fallback-a.png', clip={'x': 300, 'y': 120, 'width': 300, 'height': 260})
            res['fallback_local'] = {'hit': await pg.evaluate('__vv.avatar.ps.hit'), 'missing_n': await pg.evaluate('__vv.avatar.ps.missing.length'), 'mapping': await pg.evaluate('__vv.mappingType'), 'aa': await pg.evaluate('__vv.vis.aa'), 'errors': await pg.evaluate('__vv.errors'), 'logs': logs}
            await ctx.close()
        await b.close()
    json.dump(res, open('/tmp/v5-result.json', 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(res, ensure_ascii=False)[:8000])
asyncio.run(main())
