# v3 검증: 실제 Warudo 씬 자료 반영 확인 (기본 아바타 + 로컬 전용 아바타가 있으면 그것도)
# 로컬 전용 아바타 스크린샷은 screens/v3-local-*.png (git 제외)
import asyncio, json, os, sys
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8642/'
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
SCENE = os.environ.get('WARUDO_SCENE', '../vrm-vtuber-ref/warudo-data/Avatar_MediaPipe_Reference.json')
LOCAL = 'assets-local/avatar.vrm'
async def page(b, url, vp=(1280, 720), mobile=False):
    ctx = await b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
    pg = await ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
    await pg.goto(B + url); await pg.wait_for_function('window.__vv && __vv.loaded', timeout=60000)
    return ctx, pg, logs
async def expr_test(pg, shot):
    r = {}
    await pg.keyboard.press('Alt+1'); await pg.wait_for_timeout(200); r['alt1_0.2s'] = await pg.evaluate('__vv.expr'); await pg.wait_for_timeout(400); r['alt1_0.6s'] = await pg.evaluate('__vv.expr')
    await pg.keyboard.press('Alt+2'); await pg.wait_for_timeout(600); r['alt2'] = await pg.evaluate('__vv.expr')
    if shot: await pg.screenshot(path=shot)
    await pg.keyboard.press('Alt+Backspace'); await pg.wait_for_timeout(600); r['off'] = await pg.evaluate('__vv.expr')
    return {k: {n: x for n, x in v.items() if x} for k, v in r.items()}
async def lost_test(pg):
    # 데모 끄기 = 추적 끊김 → Switch 전환 (0.4초 / 2초, InOutSine)
    await pg.evaluate("document.getElementById('demo').click()"); out = []
    for i in range(12):
        out.append(await pg.evaluate('[Math.round(performance.now()), __vv.tracking, __vv.sw.bs, __vv.sw.f, __vv.cur.aa, __vv.cur.hy]')); await pg.wait_for_timeout(250)
    await pg.evaluate("document.getElementById('demo').click()")
    t0 = out[0][0]; return [[round((o[0] - t0) / 1000, 2)] + o[1:] for o in out]
async def main():
    res = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=ARGS)
        ctx, pg, logs = await page(b, '?demo=1&default=1'); await pg.wait_for_timeout(5000)
        await pg.screenshot(path='screens/v3-demo-default.png')
        res['default'] = await pg.evaluate('({fps:__vv.fps,err:__vv.errors,mapping:__vv.mappingType,avatar:__vv.avatar,vis:__vv.vis,conv:__vv.vrmConv(),localAvatars:__vv.localAvatars||[]})')
        res['default_expr'] = await expr_test(pg, 'screens/v3-expr-hotkey.png')
        res['default_lost'] = await lost_test(pg)
        if os.path.exists(SCENE):
            scene = json.load(open(SCENE, encoding='utf-8-sig'))
            r = await pg.evaluate("s => { const r = __vv.applyImport(s); return { kind: r.kind, found: r.found.length, totals: r.report.totals, unknown: [...r.report.assets, ...r.report.nodes].filter(a => a.unknown && a.unknown.length).map(a => [a.name, a.unknown]), hotkeys: (r.hotkeys||[]).length, exprs: (r.expressions||[]).length } }", scene)
            res['real_scene_import'] = r
            await pg.evaluate("document.getElementById('fileSec').open=true; document.getElementById('importMsg').scrollIntoView()"); await pg.wait_for_timeout(300)
            await pg.screenshot(path='screens/v3-import-real-scene.png')
            res['after_import_W_diff_from_defaults'] = await pg.evaluate("Object.keys(__vv.W).filter(k => JSON.stringify(__vv.W[k]) !== JSON.stringify(__vv.WD.DEFAULTS[k]))")
            await pg.evaluate("document.getElementById('resetW').click()")
        await pg.evaluate("for (const id of ['sec-bp','sec-look']) document.getElementById(id).open=true; document.getElementById('sec-bp').scrollIntoView()"); await pg.wait_for_timeout(400)
        await pg.screenshot(path='screens/v3-panel-blueprint.png')
        res['default_errors_end'] = await pg.evaluate('__vv.errors'); res['default_logs'] = logs; await ctx.close()
        ctx, pg, logs = await page(b, '?demo=1&default=1', (412, 915), True); await pg.wait_for_timeout(3500)
        await pg.screenshot(path='screens/v3-mobile-portrait.png'); res['mobile'] = {'err': await pg.evaluate('__vv.errors'), 'logs': logs}; await ctx.close()
        if os.path.exists(LOCAL):
            ctx, pg, logs = await page(b, f'?demo=1&vrm={LOCAL}'); await pg.wait_for_timeout(6000)
            await pg.screenshot(path='screens/v3-local-avatar-demo.png')
            res['local'] = await pg.evaluate('({fps:__vv.fps,err:__vv.errors,mapping:__vv.mappingType,avatar:__vv.avatar,vis:__vv.vis,gaze:__vv.gaze,localAvatars:__vv.localAvatars||[]})')
            res['local_expr'] = await expr_test(pg, 'screens/v3-local-avatar-angry.png')
            res['local_lost'] = await lost_test(pg)
            await pg.evaluate("document.getElementById('demo').click()"); await pg.wait_for_timeout(4000)
            await pg.screenshot(path='screens/v3-local-avatar-idle.png')
            res['local_errors_end'] = await pg.evaluate('__vv.errors'); res['local_logs'] = logs; await ctx.close()
        await b.close()
    print(json.dumps(res, ensure_ascii=False, indent=1))
asyncio.run(main())
