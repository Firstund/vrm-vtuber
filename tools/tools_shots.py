import asyncio, json
from playwright.async_api import async_playwright
B='http://127.0.0.1:8642/'
ARGS=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']
async def shot(b, url, out, vp=(1280,720), keys=(), wait=5, mobile=False, extra=None):
    ctx = await b.new_context(viewport={'width':vp[0],'height':vp[1]}, device_scale_factor=2 if mobile else 1, is_mobile=mobile, has_touch=mobile)
    pg = await ctx.new_page(); logs=[]
    pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error','warning') else None)
    pg.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
    await pg.goto(B+url); await pg.wait_for_function('window.__vv && __vv.loaded', timeout=30000)
    for k in keys: await pg.keyboard.press(k); await pg.wait_for_timeout(300)
    if extra: await extra(pg)
    await pg.wait_for_timeout(wait*1000)
    await pg.screenshot(path='screens/'+out, omit_background=('obs=1' in url))
    st = await pg.evaluate('JSON.stringify({fps:__vv.fps,errors:__vv.errors,expr:__vv.exprOverride,tracking:__vv.tracking})')
    print(out, st, logs); await ctx.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=ARGS)
        await shot(b,'?demo=1','demo-bust.png')
        await shot(b,'?demo=1&frame=full','demo-full.png')
        await shot(b,'?demo=1&clean=1&bg=00ff00','demo-clean-chroma.png')
        await shot(b,'?demo=1&obs=1','demo-obs-transparent.png')
        await shot(b,'?default=1','idle-expr2-happy.png',keys=['2'],wait=3)
        await shot(b,'?default=1','idle-expr3-angry.png',keys=['3'],wait=3)
        await shot(b,'?default=1','idle-expr4-sad.png',keys=['4'],wait=3)
        await shot(b,'?default=1','idle-expr5-relaxed.png',keys=['5'],wait=3)
        await shot(b,'?demo=1','mobile-portrait.png',vp=(412,915),mobile=True)
        await shot(b,'?demo=1','mobile-landscape.png',vp=(915,412),mobile=True)
        await b.close()
asyncio.run(main())
