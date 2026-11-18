"""
Tower animations, made with Blender.

    npm run animate                      # every tower below
    npm run animate -- trebuchet still   # just these
    set BLENDER=C:\\path\\to\\blender.exe   # if Blender isn't found on its own

Blender (scripts/blender/tower_rig.py) bends each painting on a pinned plane and renders an idle loop
(a slow sway and breath) and a shot (duck, punch up, settle). This script feeds it the paintings, packs
each tower's frames into one strip, public/sprites/anim/<kind>.webp (idle frames, then shot frames),
and writes src/game/towerAnims.ts, which the game reads. Needs Python with Pillow, and Blender 4+.
"""
import json
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = os.path.join(ROOT, "public", "sprites")

# Tower kind -> its painting. Turning cannons (base and barrel) recoil in code instead; the Brass
# Telescope's tube turns on its own, so it stays still too.
TOWERS = {
    "still": "still.webp",
    "bell": "bell.webp",
    "hive": "hive.webp",
    "lantern": "lamp.webp",
    "compost": "compost.webp",
    "catalogue": "sig-catalogue.webp",
    "cauldron": "sig-cauldron.webp",
    "trebuchet": "sig-trebuchet.webp",
    "scales": "sig-scales.webp",
    "desk": "sig-desk.webp",
    "press": "heavy-press.webp",
    "organ": "heavy-organ.webp",
    "flask": "sig-flask.webp",
    "copycat": "sig-copycat.webp",
    "stomp": "sig-stomp.webp",
    "honey": "sig-honey.webp",
    "mimic": "sig-mimic.webp",
    "lectern": "sig-lectern.webp",
    "quackliber": "sig-quackliber.webp",
    "geese": "sig-geese.webp",
    "pamphlet": "sig-pamphlet.webp",
    "driver": "sig-driver.webp",
    "lionblade": "sig-lionblade.webp",
    "gourdgate": "sig-gourdgate.webp",
    "bombard": "sig-bombard.webp",
    "boomerang": "trick-boomerang.webp",
    "orrery": "trick-orrery.webp",
    "plane": "trick-plane.webp",
    "quill": "trick-quill.webp",
    "globe": "trick-globe.webp",
}

# Shared with the game (towerAnims.ts): the painting is PX tall in each frame, its base FOOT up from the
# frame's bottom and centred; the frame is TOP painting-heights tall and (width × PAD_X + 2 × SIDE) wide.
FRAME = {"px": 112, "padX": 1.12, "side": 0.06, "top": 1.2, "foot": 0.03}
ANIM = {
    "idle": {"frames": 16, "fps": 8, "breathe": 0.028, "sway": 0.032},
    # (height ×, width ×) per frame: duck, punch up, settle.
    "fire": {"fps": 22, "keys": [[0.88, 1.09], [1.1, 0.94], [1.04, 0.98], [0.98, 1.015], [1.01, 0.995], [1, 1]]},
}


def blender_exe():
    if os.environ.get("BLENDER"):
        return os.environ["BLENDER"]
    found = shutil.which("blender") or shutil.which("blender-launcher")
    if found:
        return found
    alias = os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "WindowsApps", "blender-launcher.exe")
    if os.path.exists(alias):
        return alias
    sys.exit("Blender not found: set BLENDER to blender.exe")


def main():
    only = sys.argv[1:]
    unknown = [k for k in only if k not in TOWERS]
    if unknown:
        sys.exit(f"unknown tower kind(s): {', '.join(unknown)}")
    kinds = only or list(TOWERS)
    work = tempfile.mkdtemp(prefix="tower-anim-")
    towers = []
    for kind in kinds:
        png = os.path.join(work, kind + ".png")
        Image.open(os.path.join(SPRITES, TOWERS[kind])).convert("RGBA").save(png)
        towers.append({"name": kind, "png": png, "dir": os.path.join(work, kind)})
    job = os.path.join(work, "job.json")
    json.dump({"frame": FRAME, "anim": ANIM, "towers": towers, "out": work}, open(job, "w"))
    rig = os.path.join(ROOT, "scripts", "blender", "tower_rig.py")
    print(f"Blender: {len(towers)} tower(s) in {work}", flush=True)
    subprocess.run([blender_exe(), "--background", "--factory-startup", "--python-exit-code", "1", "--python", rig, "--", job], check=True)
    report = json.load(open(os.path.join(work, "rig-report.json")))

    out_dir = os.path.join(SPRITES, "anim")
    os.makedirs(out_dir, exist_ok=True)
    meta_path = os.path.join(ROOT, "src", "game", "towerAnims.ts")
    meta = read_meta(meta_path)
    idle_n = ANIM["idle"]["frames"]
    fire_n = len(ANIM["fire"]["keys"])
    for t in towers:
        r = report[t["name"]]
        names = [f"idle_{i:02d}" for i in range(idle_n)] + [f"fire_{i:02d}" for i in range(fire_n)]
        sheet = Image.new("RGBA", (r["w"] * len(names), r["h"]), (0, 0, 0, 0))
        for i, n in enumerate(names):
            sheet.paste(Image.open(os.path.join(t["dir"], n + ".png")).convert("RGBA"), (i * r["w"], 0))
        dest = os.path.join(out_dir, t["name"] + ".webp")
        sheet.save(dest, "WEBP", quality=78, method=6)
        meta[t["name"]] = {"w": r["w"], "h": r["h"]}
        print(f"  {t['name']}: {len(names)} frames of {r['w']}x{r['h']}, {os.path.getsize(dest) // 1024} KB")
    write_meta(meta_path, meta, idle_n, fire_n)
    shutil.rmtree(work, ignore_errors=True)


def read_meta(path):
    """The frame sizes already written (so a partial run keeps the others)."""
    if not os.path.exists(path):
        return {}
    src = open(path, encoding="utf-8").read()
    start = src.index("/*SHEETS*/") + len("/*SHEETS*/")
    end = src.index("/*END*/")
    return json.loads(src[start:end])


def write_meta(path, meta, idle_n, fire_n):
    sheets = json.dumps({k: meta[k] for k in sorted(meta)}, separators=(",", ":"))
    open(path, "w", encoding="utf-8", newline="\n").write(f"""// Generated by scripts/animate-towers.py (Blender). Don't edit by hand: change the script and rerun it.

/** How each strip is laid out: the painting is `px` tall in a frame, its base `foot` × px above the frame's bottom, centred. */
export const TOWER_FRAME = {{ px: {FRAME["px"]}, foot: {FRAME["foot"]} }};
/** Idle loop and shot: frame counts and speeds (frames a second). The shot's frames follow the idle ones in the strip. */
export const TOWER_ANIM = {{ idle: {idle_n}, idleFps: {ANIM["idle"]["fps"]}, fire: {fire_n}, fireFps: {ANIM["fire"]["fps"]} }};
/** Tower kind -> its strip's frame size (px). Strips are public/sprites/anim/<kind>.webp. */
export const TOWER_SHEETS: Record<string, {{ w: number; h: number }}> = /*SHEETS*/{sheets}/*END*/;
""")


if __name__ == "__main__":
    main()
