import asyncio, json, sys
from playwright.async_api import async_playwright
URL, VID, PREFIX = sys.argv[1], sys.argv[2], sys.argv[3]
SHOTS = [float(x) for x in sys.argv[4].split(',')]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/google-chrome', headless=True,
            args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--use-fake-ui-for-media-stream',
                  '--use-fake-device-for-media-stream', f'--use-file-for-fake-video-capture={VID}'])
        ctx = await b.new_context(viewport={'width': 1280, 'height': 720}, permissions=['camera', 'microphone'])
        pg = await ctx.new_page(); logs = []
        pg.on('console', lambda m: logs.append(f'{m.type}: {m.text}'))
        pg.on('pageerror', lambda e: logs.append(f'pageerror: {e}'))
        await pg.goto(URL); await pg.wait_for_function('window.__vv && __vv.loaded', timeout=30000)
        await pg.click('#start'); await pg.wait_for_function("__vv.status && __vv.status.startsWith('추적')", timeout=60000)
        t0 = await pg.evaluate('performance.now()'); i = 0; series = []
        for ts in SHOTS:
            while True:
                now = (await pg.evaluate('performance.now()') - t0) / 1000
                if now >= ts: break
                r = await pg.evaluate('JSON.stringify({t:performance.now(),tr:__vv.tracking,raw:__vv.raw,tf:__vv.tfps})'); series.append(r)
                await pg.wait_for_timeout(250)
            await pg.screenshot(path=f'{PREFIX}-{ts:g}s.png'); i += 1
            print(ts, await pg.evaluate('JSON.stringify({status:__vv.status,tracking:__vv.tracking,fps:__vv.fps,tfps:__vv.tfps,raw:__vv.raw,eL:__vv.cur&&__vv.cur.eL,eR:__vv.cur&&__vv.cur.eR,calib:__vv.calibrated,err:__vv.errors})'))
        print('\n'.join(logs[-15:]))
        await b.close()
asyncio.run(main())
