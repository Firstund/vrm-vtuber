# v2 검증: 데모/모바일/OBS 스크린샷, 설정 내보내기·가져오기, 표정 레이어·트리거, Body Rotation Type 비교, 콘솔 오류
import asyncio, json
from playwright.async_api import async_playwright
B = 'http://127.0.0.1:8642/'
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
async def page(b, url, vp=(1280, 720), mobile=False):
    ctx = await b.new_context(viewport={'width': vp[0], 'height': vp[1]}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
    pg = await ctx.new_page(); logs = []
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error', 'warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
    await pg.goto(B + url); await pg.wait_for_function('window.__vv && __vv.loaded', timeout=30000)
    return ctx, pg, logs
async def main():
    res = {}
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=ARGS)
        # 1) 데모 기본값
        ctx, pg, logs = await page(b, '?demo=1'); await pg.wait_for_timeout(5000)
        await pg.screenshot(path='screens/v2-demo-defaults.png')
        res['demo'] = await pg.evaluate('({fps:__vv.fps,err:__vv.errors,mapping:__vv.mappingType,expr:__vv.avatar.expressions})'); res['demo_logs'] = logs
        # 2) Body Rotation Type 비교 (같은 데모 시점의 spine 회전)
        out = {}
        for t in ['None', 'Normal', 'Inverted', 'Custom']:
            await pg.evaluate(f"__vv.W.BodyRotationType='{t}'"); await pg.wait_for_timeout(200)
            out[t] = await pg.evaluate('({head:__vv.cur&&[__vv.cur.hx,__vv.cur.hy,__vv.cur.hz],spine:__vv.body.spine})')
        res['bodyRot'] = out
        await pg.evaluate("__vv.W.BodyRotationType='Inverted'")
        # 3) 표정: 키 2(Joy) → 0.2초/0.5초 값, 키 3(Angry, 같은 layer) → Joy 페이드아웃
        await pg.keyboard.press('2'); await pg.wait_for_timeout(200); a = await pg.evaluate('__vv.expr'); await pg.wait_for_timeout(400); b2 = await pg.evaluate('__vv.expr')
        await pg.keyboard.press('3'); await pg.wait_for_timeout(600); c = await pg.evaluate('__vv.expr')
        await pg.screenshot(path='screens/v2-expr-angry-layer0.png')
        await pg.keyboard.press('1'); await pg.wait_for_timeout(600); d = await pg.evaluate('__vv.expr')
        res['expr'] = {'joy_0.2s': a, 'joy_0.6s': b2, 'after_angry': c, 'after_off': d}
        # 4) 트리거 조건 (데모는 6~8.5초 구간에 웃음 0.85) → Joy 자동
        await pg.evaluate("(()=>{const e=__vv.engine.list.find(x=>x.Name==='Joy'); e.TriggerConditions=[{Conditions:[{BlendShape:'mouthSmileLeft',Condition:'GreaterThanOrEqual',Value:0.5},{BlendShape:'mouthSmileRight',Condition:'GreaterThanOrEqual',Value:0.5}],TriggerWhenMet:'Enter',TriggerWhenMetDelay:0,TriggerWhenNotMet:'Exit',TriggerWhenNotMetDelay:2}]; __vv.engine.st.get('Joy').trig=[];})()")
        seen = []
        for i in range(30):
            await pg.wait_for_timeout(500); seen.append(await pg.evaluate("[Math.round(performance.now()/100)/10, +(__vv.mapped().mouthSmileLeft||0).toFixed(2), __vv.expr.Joy]"))
        res['trigger'] = seen
        # 5) 내보내기 → 값 바꾸기 → 가져오기 왕복
        exp = await pg.evaluate('__vv.exportJSON()')
        await pg.evaluate("__vv.W.BlendShapeSensitivity=2.5")
        rr = await pg.evaluate(f"__vv.applyImport({json.dumps(exp)}).found.length")
        res['roundtrip'] = {'found': rr, 'sens_after': await pg.evaluate('__vv.W.BlendShapeSensitivity')}
        # 6) Warudo 형식 가짜 씬 가져오기 → 보고서 스크린샷
        scene = {'name': 'Sample', 'assets': [{'typeId': 'x', 'name': 'MediaPipe Tracker', 'dataInputs': {'MirroredTracking': {'value': 'false'}, 'BlendShapeSensitivity': {'value': '1.3'}, 'BodyRotationType': {'value': '2'}}}, {'typeId': 'y', 'name': 'Camera', 'dataInputs': {'FieldOfView': {'value': '35'}, 'ControlMode': {'value': '0'}}}]}
        r = await pg.evaluate(f"(()=>{{const r=__vv.applyImport({json.dumps(scene)}); return {{kind:r.kind,found:r.found}}}})()")
        res['sceneImport'] = r
        await pg.evaluate("document.getElementById('fileSec').open=true; document.getElementById('importMsg').scrollIntoView()"); await pg.wait_for_timeout(300)
        await pg.screenshot(path='screens/v2-import-report.png')
        await pg.evaluate("document.getElementById('resetW').click()")
        res['errors_end'] = await pg.evaluate('__vv.errors'); res['logs_end'] = logs; await ctx.close()
        # 7) 기타 화면
        for url, out, vp, mob in [('?demo=1&frame=full', 'v2-demo-full.png', (1280, 720), False), ('?demo=1&obs=1', 'v2-obs-transparent.png', (1280, 720), False),
                                  ('?demo=1', 'v2-mobile-portrait.png', (412, 915), True), ('?demo=1', 'v2-mobile-landscape.png', (915, 412), True)]:
            ctx, pg, logs = await page(b, url, vp, mob); await pg.wait_for_timeout(3500)
            await pg.screenshot(path='screens/' + out, omit_background=('obs=1' in url)); res[out] = {'err': await pg.evaluate('__vv.errors'), 'logs': logs}; await ctx.close()
        # 8) 모바일 설정 패널 (Body Rotation, Look At 열기)
        ctx, pg, logs = await page(b, '?demo=1', (412, 915), True)
        await pg.evaluate("for (const id of ['sec-bp','sec-look']) document.getElementById(id).open=true; document.getElementById('sec-tracker').querySelector('[data-key]').scrollIntoView()"); await pg.wait_for_timeout(800)
        await pg.screenshot(path='screens/v2-mobile-panel.png'); await ctx.close()
        await b.close()
    print(json.dumps(res, ensure_ascii=False, indent=1))
asyncio.run(main())
