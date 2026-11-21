"""
Tower and enemy animations, made with Blender.

    npm run animate                      # everything
    npm run animate -- towers            # one group (towers, enemies, pops or builds)
    npm run animate -- trebuchet melon   # just these
    set BLENDER=C:\\path\\to\\blender.exe   # if Blender isn't found on its own

Blender (scripts/blender/sprite_rig.py) bends each painting on a plane pinned at its base and renders the
frames listed here: for towers an idle loop (a slow sway and breath) and a shot (duck, punch up, settle);
for enemies a walk (a hop that squashes on landing and stretches in the air, leaning forward) and a flinch
when hit; for a fruit's pop a squash flat, then a swell outward as it fades; for a tower's build a rise
from flat with an overshoot (played backwards when it's sold). Each sprite's frames are packed into one
strip in public/sprites/anim/, and the group's layout is written to src/game/<group>Anims.ts (see "ts"
below), which the game reads. A frame's optional sixth number is its opacity, applied after the render.
Needs Python with Pillow, and Blender 4+.
"""
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPRITES = os.path.join(ROOT, "public", "sprites")


def tower_frames():
    """(name, height ×, width ×, lean, lift): 16 idle frames, then the shot."""
    out = []
    for f in range(16):
        p = 2 * math.pi * f / 16
        out.append((f"idle_{f:02d}", 1 + 0.028 * math.sin(p), 1 - 0.028 * 0.6 * math.sin(p), 0.032 * math.sin(p + 0.9), 0.0))
    for f, (sy, sx) in enumerate([(0.88, 1.09), (1.1, 0.94), (1.04, 0.98), (0.98, 1.015), (1.01, 0.995), (1, 1)]):
        out.append((f"fire_{f:02d}", sy, sx, 0.0, 0.0))
    return out


WALK_LEAN = 0.035


def enemy_frames():
    """12 walk frames (a hop: up and stretched, then down and squashed, leaning the way it walks), then the flinch."""
    out = []
    for f in range(12):
        p = 2 * math.pi * f / 12
        c = math.sin(p)
        out.append((f"walk_{f:02d}", 1 + 0.06 * c, 1 - 0.045 * c, WALK_LEAN + 0.012 * math.cos(p), 0.07 * max(0.0, c)))
    # Knocked back (squashed, leaning away), springs up, settles into its walking lean.
    for f, (sy, sx, lean) in enumerate([(0.9, 1.07, -0.07), (0.94, 1.04, -0.05), (1.03, 0.98, -0.015), (0.99, 1.01, 0.01), (1, 1, WALK_LEAN)]):
        out.append((f"hit_{f:02d}", sy, sx, lean, 0.0))
    return out


def pop_frames():
    """6 frames: squashed flat by the hit, then swelling up and out as it fades (the juice burst is drawn by the game)."""
    poses = [(0.74, 1.2, 0.0, 1.0), (0.58, 1.36, 0.0, 1.0), (1.12, 1.42, 0.02, 0.92), (1.3, 1.6, 0.05, 0.62), (1.42, 1.75, 0.07, 0.34), (1.5, 1.85, 0.08, 0.12)]
    return [(f"pop_{f:02d}", sy, sx, 0.0, lift, a) for f, (sy, sx, lift, a) in enumerate(poses)]


def build_frames():
    """7 frames: rising from flat and wide, overshooting tall, settling. Fades in over the first three."""
    poses = [(0.12, 1.3, 0.3), (0.4, 1.18, 0.65), (0.78, 1.06, 0.95), (1.1, 0.93, 1.0), (1.05, 0.97, 1.0), (0.97, 1.02, 1.0), (1.0, 1.0, 1.0)]
    return [(f"build_{f:02d}", sy, sx, 0.0, 0.0, a) for f, (sy, sx, a) in enumerate(poses)]


# Tower kind -> its painting. Turning cannons recoil in code instead; the Brass Telescope's tube turns on its own.
TOWER_PAINTINGS = {
    "still": "still.webp", "bell": "bell.webp", "hive": "hive.webp", "lantern": "lamp.webp", "compost": "compost.webp",
    "catalogue": "sig-catalogue.webp", "cauldron": "sig-cauldron.webp", "trebuchet": "sig-trebuchet.webp",
    "scales": "sig-scales.webp", "desk": "sig-desk.webp", "press": "heavy-press.webp", "organ": "heavy-organ.webp",
    "flask": "sig-flask.webp", "copycat": "sig-copycat.webp", "stomp": "sig-stomp.webp", "honey": "sig-honey.webp",
    "mimic": "sig-mimic.webp", "lectern": "sig-lectern.webp", "quackliber": "sig-quackliber.webp",
    "geese": "sig-geese.webp", "pamphlet": "sig-pamphlet.webp", "driver": "sig-driver.webp",
    "lionblade": "sig-lionblade.webp", "gourdgate": "sig-dragongate.webp", "bombard": "sig-roost-egg.webp",
    "boomerang": "trick-boomerang.webp", "orrery": "trick-orrery.webp", "plane": "trick-plane.webp",
    "quill": "trick-quill.webp", "globe": "trick-globe.webp",
}
# Enemy look -> its painting (the fruit drawn by code have no painting to animate yet).
ENEMY_PAINTINGS = {
    "melon": "melon.webp", "corn": "corn.webp", "pumpkin": "pumpkin.webp", "karl": "karl.webp",
    "pit": "enemy-pit.webp", "gall": "enemy-gall.webp", "borrower": "enemy-borrower.webp",
    # The Siege's geese and cats.
    "honker": "enemy-honker.webp", "gosling": "enemy-gosling.webp", "matriarch": "enemy-matriarch.webp",
    "whiskers": "enemy-whiskers.webp", "boxcat": "enemy-boxcat.webp", "para": "enemy-para.webp",
    "tank": "enemy-tank.webp", "general": "enemy-general.webp",
}


GROUPS = {
    "towers": {
        "sprites": TOWER_PAINTINGS,
        "strip": "{name}.webp",
        # The painting is px tall in each frame, its base foot × px up from the frame's bottom, centred; the frame is
        # top painting-heights tall and (width × padX + 2 × side) wide.
        "frame": {"px": 112, "padX": 1.12, "side": 0.06, "top": 1.2, "foot": 0.03},
        "frames": tower_frames,
        "ts": "towerAnims.ts",
        "header": "TOWER",
        "anim": lambda: "{ idle: 16, idleFps: 8, fire: 6, fireFps: 22 }",
        "animDoc": "Idle loop and shot: frame counts and speeds (frames a second). The shot's frames follow the idle ones in the strip.",
    },
    "enemies": {
        "sprites": ENEMY_PAINTINGS,
        "strip": "enemy-{name}.webp",
        "frame": {"px": 112, "padX": 1.14, "side": 0.08, "top": 1.24, "foot": 0.03},
        "frames": enemy_frames,
        "ts": "enemyAnims.ts",
        "header": "ENEMY",
        "anim": lambda: "{ walk: 12, walkFps: 10, hit: 5, hitFps: 24 }",
        "animDoc": "Walk loop and flinch: frame counts and speeds (frames a second). The flinch's frames follow the walk's in the strip.",
    },
    "pops": {
        # A fruit's pop when it's killed: a strip of its own, with room for the swell.
        "sprites": ENEMY_PAINTINGS,
        "strip": "pop-{name}.webp",
        "frame": {"px": 112, "padX": 1.9, "side": 0.06, "top": 1.66, "foot": 0.03},
        "frames": pop_frames,
        "ts": "popAnims.ts",
        "header": "POP",
        "anim": lambda: "{ pop: 6, popFps: 24 }",
        "animDoc": "A fruit's pop: frame count and speed (frames a second).",
    },
    "builds": {
        # A tower rising when it's built (and sinking, the frames backwards, when it's sold).
        "sprites": TOWER_PAINTINGS,
        "strip": "build-{name}.webp",
        "frame": {"px": 112, "padX": 1.32, "side": 0.06, "top": 1.2, "foot": 0.03},
        "frames": build_frames,
        "ts": "buildAnims.ts",
        "header": "BUILD",
        "anim": lambda: "{ build: 7, buildFps: 22, poses: %s }" % json.dumps([[f[1], f[2], f[5]] for f in build_frames()]),
        "animDoc": "A tower's build: frame count and speed (frames a second), played backwards when it's sold; poses are each frame's [height ×, width ×, opacity] for towers drawn without a strip.",
    },
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


def run_group(key, names):
    group = GROUPS[key]
    work = tempfile.mkdtemp(prefix=f"anim-{key}-")
    sprites = []
    for name in names:
        png = os.path.join(work, name + ".png")
        Image.open(os.path.join(SPRITES, group["sprites"][name])).convert("RGBA").save(png)
        sprites.append({"name": name, "png": png, "dir": os.path.join(work, name)})
    frames = group["frames"]()
    job = os.path.join(work, "job.json")
    rig_frames = [list(f[:5]) for f in frames]  # opacity (a sixth number) is applied below, not in Blender
    json.dump({"frame": group["frame"], "frames": rig_frames, "sprites": sprites, "out": work}, open(job, "w"))
    rig = os.path.join(ROOT, "scripts", "blender", "sprite_rig.py")
    print(f"Blender: {len(sprites)} {key} in {work}", flush=True)
    subprocess.run([blender_exe(), "--background", "--factory-startup", "--python-exit-code", "1", "--python", rig, "--", job], check=True)
    report = json.load(open(os.path.join(work, "rig-report.json")))

    out_dir = os.path.join(SPRITES, "anim")
    os.makedirs(out_dir, exist_ok=True)
    ts_path = os.path.join(ROOT, "src", "game", group["ts"])
    meta = read_meta(ts_path)
    for s in sprites:
        r = report[s["name"]]
        sheet = Image.new("RGBA", (r["w"] * len(frames), r["h"]), (0, 0, 0, 0))
        for i, (fname, *rest) in enumerate(frames):
            img = Image.open(os.path.join(s["dir"], fname + ".png")).convert("RGBA")
            if len(rest) > 4 and rest[4] < 1:
                img.putalpha(img.getchannel("A").point(lambda v, a=rest[4]: round(v * a)))
            sheet.paste(img, (i * r["w"], 0))
        dest = os.path.join(out_dir, group["strip"].format(name=s["name"]))
        sheet.save(dest, "WEBP", quality=78, method=6)
        meta[s["name"]] = {"w": r["w"], "h": r["h"]}
        print(f"  {s['name']}: {len(frames)} frames of {r['w']}x{r['h']}, {os.path.getsize(dest) // 1024} KB")
    write_meta(ts_path, group, meta)
    shutil.rmtree(work, ignore_errors=True)


def read_meta(path):
    """The frame sizes already written (so a partial run keeps the others)."""
    if not os.path.exists(path):
        return {}
    src = open(path, encoding="utf-8").read()
    return json.loads(src[src.index("/*SHEETS*/") + len("/*SHEETS*/") : src.index("/*END*/")])


def write_meta(path, group, meta):
    h = group["header"]
    f = group["frame"]
    sheets = json.dumps({k: meta[k] for k in sorted(meta)}, separators=(",", ":"))
    strip = group["strip"].format(name="<name>")
    open(path, "w", encoding="utf-8", newline="\n").write(f"""// Generated by scripts/animate-sprites.py (Blender). Don't edit by hand: change the script and rerun it.

/** How each strip is laid out: the painting is `px` tall in a frame, its base `foot` × px above the frame's bottom, centred. */
export const {h}_FRAME = {{ px: {f["px"]}, foot: {f["foot"]} }};
/** {group["animDoc"]} */
export const {h}_ANIM = {group["anim"]()};
/** Name -> its strip's frame size (px). Strips are public/sprites/anim/{strip}. */
export const {h}_SHEETS: Record<string, {{ w: number; h: number }}> = /*SHEETS*/{sheets}/*END*/;
""")


def main():
    args = sys.argv[1:]
    picked = {k: [] for k in GROUPS}
    for a in args:
        if a in GROUPS:
            picked[a] = list(GROUPS[a]["sprites"])
            continue
        owners = [k for k in GROUPS if a in GROUPS[k]["sprites"]]
        if not owners:
            sys.exit(f"unknown sprite or group: {a}")
        for k in owners:
            picked[k].append(a)
    if not args:
        picked = {k: list(GROUPS[k]["sprites"]) for k in GROUPS}
    for key, names in picked.items():
        if names:
            run_group(key, names)


if __name__ == "__main__":
    main()
