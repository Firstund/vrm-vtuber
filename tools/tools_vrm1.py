import asyncio
from playwright.async_api import async_playwright
F='/workspace/vtuber-male-prototype/charakuru-firstund/diagnose/out/Firstund_charakuru_fix1.vrm'
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True, args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx = await b.new_context(viewport={'width':1280,'height':720}); pg = await ctx.new_page(); logs=[]
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}') if m.type in ('error','warning') else None)
        pg.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
        await pg.goto('http://127.0.0.1:8642/?demo=1'); await pg.wait_for_function('__vv.loaded', timeout=30000)
        await pg.evaluate('__vv.loaded=false')
        await pg.set_input_files('#vrmFile', F)
        await pg.wait_for_function('__vv.loaded', timeout=90000); await pg.wait_for_timeout(5000)
        print(await pg.evaluate('JSON.stringify({a:__vv.avatar,err:__vv.errors,fps:__vv.fps})'))
        await pg.screenshot(path='screens/vrm1-charakuru-demo.png')
        await pg.reload(); await pg.wait_for_function('__vv.loaded', timeout=90000); await pg.wait_for_timeout(3000)
        print('after reload:', await pg.evaluate('__vv.avatar.title'))
        await pg.keyboard.press('2'); await pg.wait_for_timeout(1500)
        await pg.screenshot(path='screens/vrm1-charakuru-happy.png')
        print(logs[-10:]); await b.close()
asyncio.run(main())
