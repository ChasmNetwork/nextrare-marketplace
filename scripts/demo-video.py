# python3 scripts/demo-video.py [url]  → docs/video/demo.webm (+ .mp4 via ffmpeg)
# Records the real flow in a headless browser. A fake Phantom (Wallet Standard) is injected that signs with
# .keys/demo-video.json through scripts/sign-cli.cjs, so every step is a genuine devnet transaction.
import json, subprocess, sys, time, base64, pathlib, shutil
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = sys.argv[1] if len(sys.argv) > 1 else "https://nextrare-marketplace.vercel.app"
KEY = ROOT / ".keys/demo-video.json"
OUT = ROOT / "docs/video"
W, H = 1440, 900

pub = json.loads(subprocess.check_output(["node", "-e", f"""
const {{Keypair}}=require("@solana/web3.js");const k=Keypair.fromSecretKey(Uint8Array.from(require("{KEY}")));
console.log(JSON.stringify({{address:k.publicKey.toBase58(),bytes:[...k.publicKey.toBytes()]}}))"""], cwd=ROOT))

def sign(b64: str) -> str:
    return subprocess.run(["node", "scripts/sign-cli.cjs", str(KEY)], input=b64, capture_output=True, text=True, cwd=ROOT, check=True).stdout

ICON = "data:image/svg+xml;base64," + base64.b64encode(b'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#ab9ff2"/><circle cx="16" cy="16" r="7" fill="#fff"/></svg>').decode()

INIT = f"""
(() => {{
  try {{ localStorage.setItem('nr:ref', 'sim'); }} catch {{}}   // demo wallet lands in the simulated bucket, never counted as a user
  const b64 = (u8) => btoa(String.fromCharCode(...u8));
  const un64 = (s) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  const account = {{ address: {json.dumps(pub["address"])}, publicKey: new Uint8Array({json.dumps(pub["bytes"])}), chains: ['solana:devnet','solana:mainnet'], features: ['solana:signTransaction','solana:signMessage'], label: 'Demo' }};
  const listeners = {{}};
  const wallet = {{
    version: '1.0.0', name: 'Phantom', icon: {json.dumps(ICON)}, chains: ['solana:devnet','solana:mainnet'], accounts: [account],
    features: {{
      'standard:connect': {{ version: '1.0.0', connect: async () => ({{ accounts: [account] }}) }},
      'standard:disconnect': {{ version: '1.0.0', disconnect: async () => {{}} }},
      'standard:events': {{ version: '1.0.0', on: (e, l) => {{ (listeners[e] ||= []).push(l); return () => {{}}; }} }},
      'solana:signTransaction': {{ version: '1.0.0', supportedTransactionVersions: ['legacy', 0],
        signTransaction: async (...inputs) => Promise.all(inputs.map(async (i) => ({{ signedTransaction: un64(await window.__nrSign(b64(i.transaction))) }}))) }},
      'solana:signMessage': {{ version: '1.0.0', signMessage: async (...inputs) => inputs.map((i) => ({{ signedMessage: i.message, signature: new Uint8Array(64) }})) }},
    }},
  }};
  const reg = (api) => api.register(wallet);
  window.addEventListener('wallet-standard:app-ready', (e) => reg(e.detail));
  window.dispatchEvent(new CustomEvent('wallet-standard:register-wallet', {{ detail: reg }}));
  // visible cursor for the recording
  document.addEventListener('DOMContentLoaded', () => {{
    const c = document.createElement('div'); c.id = '__cur';
    c.style.cssText = 'position:fixed;z-index:99999;width:22px;height:22px;border-radius:50%;background:rgba(221,32,35,.85);border:2px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,.35);pointer-events:none;transform:translate(-50%,-50%);left:-100px;top:-100px;transition:transform .12s';
    document.body.appendChild(c);
    window.addEventListener('mousemove', (e) => {{ c.style.left = e.clientX + 'px'; c.style.top = e.clientY + 'px'; }});
    window.addEventListener('mousedown', () => c.style.transform = 'translate(-50%,-50%) scale(.7)');
    window.addEventListener('mouseup', () => c.style.transform = 'translate(-50%,-50%)');
  }});
}})();
"""

def main():
    shutil.rmtree(OUT, ignore_errors=True); OUT.mkdir(parents=True)
    with sync_playwright() as p:
        b = p.chromium.launch()
        ctx = b.new_context(viewport={"width": W, "height": H}, record_video_dir=str(OUT), record_video_size={"width": W, "height": H}, device_scale_factor=1)
        ctx.expose_function("__nrSign", sign)
        ctx.add_init_script(INIT)
        pg = ctx.new_page()
        log = lambda *a: print(f"[{time.strftime('%H:%M:%S')}]", *a, flush=True)

        def move_click(loc, pause=0.6):
            loc.scroll_into_view_if_needed(); time.sleep(0.4)
            bb = loc.bounding_box(); x, y = bb["x"] + bb["width"] / 2, bb["y"] + bb["height"] / 2
            pg.mouse.move(x, y, steps=28); time.sleep(pause); pg.mouse.down(); time.sleep(0.12); pg.mouse.up()
        def scroll_to(sel, pause=1.6):
            pg.evaluate(f"document.querySelector('{sel}').scrollIntoView({{behavior:'smooth',block:'start'}})"); time.sleep(pause)
        def hold(s): time.sleep(s)

        pg.goto(URL, wait_until="networkidle"); hold(2.5)
        pg.mouse.move(700, 300, steps=20); hold(1.0)

        log("connect"); move_click(pg.locator("#overview").get_by_role("button", name="Select Wallet")); hold(0.8)
        move_click(pg.get_by_role("button", name="Phantom")); pg.wait_for_selector("text=Get free cards", timeout=20000); hold(1.2)

        log("faucet"); move_click(pg.get_by_role("button", name="Get free cards"))
        pg.wait_for_selector("text=Minted", timeout=120000); log("minted"); hold(2.5)

        log("list"); scroll_to("#me", 2.0)
        inp = pg.locator("input.glass-input").first; inp.wait_for(timeout=30000)
        move_click(inp, 0.3); pg.keyboard.type("0.02", delay=90); hold(0.6)
        move_click(pg.get_by_role("button", name="List · 0.02")); pg.wait_for_selector("text=Delist", timeout=60000); log("listed"); hold(2.0)

        log("packs"); scroll_to("#packs", 1.8); move_click(pg.get_by_role("button", name="Budget Pack")); hold(1.5)
        rip = pg.get_by_role("button", name="Rip pack"); rip.wait_for(timeout=20000); move_click(rip)
        cash = pg.get_by_role("button", name="Cash out"); cash.wait_for(timeout=150000); log("revealed"); hold(3.5)
        move_click(cash); pg.wait_for_selector("text=Cashed out", timeout=60000); log("cashed out"); hold(3.0)

        log("earnings"); scroll_to("#me", 2.5); hold(2.0)
        log("traction"); pg.goto(URL + "/traction", wait_until="networkidle"); pg.mouse.move(600, 400, steps=15); hold(4.0)
        pg.evaluate("window.scrollTo({top:700,behavior:'smooth'})"); hold(3.0)
        path = pg.video.path(); ctx.close(); b.close()
    final = OUT / "demo.webm"; pathlib.Path(path).rename(final); print("video", final)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(final), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "20", "-movflags", "+faststart", str(OUT / "demo.mp4")], check=True)
    print("mp4", OUT / "demo.mp4")

main()
