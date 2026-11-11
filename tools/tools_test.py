import asyncio, json, sys
from playwright.async_api import async_playwright
URL = sys.argv[1]; OUT = sys.argv[2]; WAIT = float(sys.argv[3]) if len(sys.argv) > 3 else 6
EXTRA = sys.argv[4:]  # chrome args
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
            args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] + EXTRA)
        ctx = await b.new_context(viewport={'width': 1280, 'height': 720}, permissions=['camera', 'microphone'])
        pg = await ctx.new_page(); logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
        await pg.goto(URL); await pg.wait_for_timeout(WAIT * 1000)
        st = await pg.evaluate('JSON.stringify({loaded:__vv.loaded,status:__vv.status,fps:__vv.fps,tfps:__vv.tfps,tracking:__vv.tracking,avatar:__vv.avatar,errors:__vv.errors,raw:__vv.raw,cur:__vv.cur,calibrated:__vv.calibrated})')
        await pg.screenshot(path=OUT)
        print(st); print('\n'.join(logs))
        await b.close()
asyncio.run(main())
