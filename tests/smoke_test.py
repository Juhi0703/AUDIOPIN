"""End-to-end smoke test for both pages, in a headless browser.

Starts a local web server on the repository, then checks that:
  - all five sounds load from assets/sounds
  - index.html: steps 1, 3, 4 and 5 work, every layout builds its chart, CSV export works
  - lock.html: earphone check, PIN setup (common PINs refused, only a hash stored),
    unlock with key codes, lockout after 3 wrong PINs that survives a reload,
    and the service worker caches every file it lists
  - no JavaScript errors and no missing files

Run from the repository root:
    pip install playwright && python -m playwright install chromium
    python tests/smoke_test.py
Set CHROME_PATH to use an installed Chrome instead of Playwright's Chromium.
"""
import asyncio, functools, http.server, os, re, sys, threading
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=ROOT)
handler.log_message = lambda *a: None
server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=server.serve_forever, daemon=True).start()
BASE = f"http://127.0.0.1:{server.server_address[1]}/"
async def waitk(pg, i):
    # Wait until the i-th digit's sound has played and the ring accepts a tap.
    for _ in range(100):
        if await pg.evaluate(f"window._k.length>{i} && !!keyAnswer"): return
        await pg.wait_for_timeout(100)
    raise Exception("timeout waiting for key")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path=os.environ.get("CHROME_PATH") or None, args=["--autoplay-policy=no-user-gesture-required","--no-sandbox"])
        ok = True
        def check(cond, msg):
            nonlocal ok; print(("PASS " if cond else "FAIL ") + msg); ok &= bool(cond)
        # ---------- index.html ----------
        pg = await b.new_page(); errs=[]; fails=[]
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type=="error" and errs.append(m.text+" @ "+str(m.location.get("url"))))
        pg.on("response", lambda r: r.status>=400 and fails.append(r.url))
        await pg.goto(BASE+"index.html"); await pg.wait_for_load_state("networkidle")
        await pg.click("#quizPlay"); await pg.wait_for_timeout(800)
        check(await pg.is_hidden("#warn"), "index: all 5 sounds load from assets/sounds (no warning)")
        src = await pg.evaluate("VOICE_NAMES.map(n=>voiceSource[n]).join(',')")
        check(src=="file,file,file,file,file", f"index: voiceSource = {src}")
        t = await pg.evaluate("quizTarget"); await pg.click(f"#quizBtns button:text-is('{t}')")
        check((await pg.text_content("#logCount"))=="1", "index: step1 quiz logged")
        rows = await pg.evaluate("document.querySelectorAll('#chartB .v').length")
        check(rows==12, f"index: cardinal chart has 12 cells ({rows})")
        await pg.evaluate("window._k=[]; const _p=playKey; playKey=k=>{_k.push(k); _p(k)}")
        await pg.evaluate("$('numPin').value='2705'")
        await pg.click("#goKey")
        for i in range(4):
            await waitk(pg,i)
            k = await pg.evaluate("_k[_k.length-1]")
            d = int("2705"[i]); await pg.click(f"#ring button:text-is('{(d+k)%10}')")
        await pg.wait_for_timeout(300)
        st = await pg.text_content("#status")
        check("Access granted" in st, "index: step5 key-code login with correct taps -> "+st)
        await pg.click("#goBase")
        for c in "2705": await pg.click(f"#keypad button:text-is('{c}')")
        check("Access granted" in await pg.text_content("#status"), "index: step4 normal PIN")
        await pg.click("#goEnroll"); await pg.click("#example"); await pg.click("#goLogin")
        await pg.wait_for_timeout(500)
        check("Position 1" in await pg.text_content("#status"), "index: step3 starts")
        for lay in ["lateral","wide","trio","pair"]:
            await pg.select_option("#layout", lay)
        check(await pg.evaluate("document.querySelectorAll('#chartA .v').length")==10, "index: pair layout chart 10 cells")
        csv = await pg.evaluate("toCsv()")
        check(csv.splitlines()[0].startswith("time,participant,layout"), "index: CSV export header")
        check(not errs, f"index: no JS errors {errs}"); check(not fails, f"index: no 404s {fails}")
        # ---------- lock.html ----------
        ctxb = await b.new_context(); pg = await ctxb.new_page(); errs=[]; fails=[]
        pg.on("pageerror", lambda e: errs.append(str(e)))
        pg.on("console", lambda m: m.type=="error" and errs.append(m.text+" @ "+str(m.location.get("url"))))
        pg.on("response", lambda r: r.status>=400 and fails.append(r.url))
        await pg.goto(BASE+"lock.html"); await pg.wait_for_load_state("networkidle")
        check(await pg.is_visible("#setup"), "lock: first run shows setup")
        for i in range(3):
            await pg.click("#checkPlay")
            for _ in range(50):
                side = await pg.evaluate("checkSide")
                if side: break
                await pg.wait_for_timeout(100)
            await pg.click("#checkLeft" if side=="left" else "#checkRight")
        check(await pg.is_visible("#pinPanel"), "lock: earphone check passes after 3 correct")
        for c in "1234": await pg.click(f"#setupPad button:text-is('{c}')")
        await pg.wait_for_timeout(300)
        check("Too easy" in await pg.text_content("#setupMsg"), "lock: common PIN refused")
        for _ in range(2):
            for c in "2705": await pg.click(f"#setupPad button:text-is('{c}')")
            await pg.wait_for_timeout(300)
        await pg.wait_for_selector("#lock:not([hidden])", timeout=10000)
        stored = await pg.evaluate("localStorage.getItem(STORE)")
        check("2705" not in stored and "verifier" in stored, "lock: only hash stored, not the PIN")
        await pg.evaluate("window._k=[]; const _p=playKey; playKey=k=>{_k.push(k); _p(k)}")
        async def enter(pin):
            await pg.evaluate("_k.length=0"); await pg.click("#unlockBtn")
            for i in range(4):
                await waitk(pg,i)
                k = await pg.evaluate("_k[_k.length-1]")
                await pg.click(f"#ring button:text-is('{(int(pin[i])+k)%10}')")
        await enter("2705"); await pg.wait_for_selector("#home:not([hidden])", timeout=10000)
        check(True, "lock: correct PIN unlocks -> "+await pg.text_content("#homeInfo"))
        check(await pg.is_hidden("#warn"), "lock: sounds loaded (no warning)")
        await pg.select_option("#layoutSel","cardinal")
        check(await pg.evaluate("document.querySelectorAll('#chart .v').length")==12, "lock: layout switch rebuilds chart")
        await pg.click("#lockBtn")
        for n in range(3):
            await enter("1111"); await pg.wait_for_selector("#lock:not([hidden])"); await pg.wait_for_timeout(200)
        check("Too many attempts" in await pg.text_content("#lockMsg") and await pg.is_disabled("#unlockBtn"), "lock: 3 wrong PINs -> lockout")
        await pg.reload(); await pg.wait_for_timeout(1500)
        check(await pg.is_disabled("#unlockBtn"), "lock: lockout survives reload")
        cached = await pg.evaluate("caches.open('audiopin-lock-v3').then(c=>c.keys()).then(k=>k.map(r=>r.url.replace(location.origin+'/','')))")
        need = await pg.evaluate("fetch('sw.js').then(r=>r.text())")
        files=[f[2:] for f in re.findall(r"'(\./[^']+)'", need)]
        missing=[f for f in files if f not in cached]
        check(not missing, f"lock: service worker cached all {len(files)} files (missing {missing})")
        check(not errs, f"lock: no JS errors {errs}"); check(not fails, f"lock: no 404s {fails}")
        await b.close(); print("ALL PASS" if ok else "SOME FAILED"); sys.exit(0 if ok else 1)
asyncio.run(main())
