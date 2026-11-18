"""
Runs inside Blender (see scripts/animate-towers.py, which calls it):

    blender --background --factory-startup --python scripts/blender/tower_rig.py -- job.json

Each tower's painting goes on a finely divided plane, pinned at the base. Per frame the plane is bent and
squashed (the top sways, the body breathes; on a shot it ducks, punches up and settles), then rendered
straight down with an orthographic camera onto a transparent frame. The job file lists the paintings
(PNG) and where to put the frames; the frame layout (FRAME) is shared with the game through the packer.
"""
import json
import math
import os
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :]
job = json.load(open(argv[0], encoding="utf-8"))
FRAME = job["frame"]
PX = FRAME["px"]  # pixels per painting height
PAD_X = FRAME["padX"]  # frame width = painting width × padX + 2 × sideUnits
SIDE = FRAME["side"]  # extra width each side, in painting heights (room for the sway)
TOP = FRAME["top"]  # frame height = painting height × top (room for the stretch)
FOOT = FRAME["foot"]  # space under the painting's base, in painting heights
ANIM = job["anim"]
GRID = 28


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 48
    scene.cycles.use_denoising = False
    scene.cycles.max_bounces = 0
    scene.cycles.transparent_max_bounces = 8
    scene.cycles.filter_width = 1.1
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.render.resolution_percentage = 100
    return scene


def material(image_path):
    mat = bpy.data.materials.new("painting")
    mat.use_nodes = True
    nt = mat.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = bpy.data.images.load(image_path)
    tex.image.alpha_mode = "STRAIGHT"
    tex.interpolation = "Linear"
    tex.extension = "CLIP"
    emit = nt.nodes.new("ShaderNodeEmission")
    emit.inputs["Strength"].default_value = 1.0
    clear = nt.nodes.new("ShaderNodeBsdfTransparent")
    mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(tex.outputs["Color"], emit.inputs["Color"])
    nt.links.new(tex.outputs["Alpha"], mix.inputs["Fac"])
    nt.links.new(clear.outputs["BSDF"], mix.inputs[1])
    nt.links.new(emit.outputs["Emission"], mix.inputs[2])
    nt.links.new(mix.outputs["Shader"], out.inputs["Surface"])
    return mat, tex.image.size[0], tex.image.size[1]


def plane(aspect, mat):
    """A GRID × GRID plane, aspect wide and 1 tall, its base centred on the origin, UVs over the painting."""
    verts, faces, uvs = [], [], []
    for j in range(GRID + 1):
        for i in range(GRID + 1):
            verts.append(((i / GRID - 0.5) * aspect, j / GRID, 0.0))
    for j in range(GRID):
        for i in range(GRID):
            a = j * (GRID + 1) + i
            faces.append((a, a + 1, a + GRID + 2, a + GRID + 1))
    mesh = bpy.data.meshes.new("painting")
    mesh.from_pydata(verts, [], faces)
    uv = mesh.uv_layers.new(name="uv")
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            x, y, _ = verts[mesh.loops[li].vertex_index]
            uv.data[li].uv = (x / aspect + 0.5, y)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new("painting", mesh)
    bpy.context.scene.collection.objects.link(obj)
    return obj, verts


def deform(obj, rest, aspect, sy, sx, bend):
    """Base pinned: the height scales by sy, the width by sx more toward the top, and the top leans by bend."""
    for k, (x, y, _) in enumerate(rest):
        w = y**0.8
        obj.data.vertices[k].co = (x * (1 + (sx - 1) * w) + bend * y * y, y * sy, 0.0)
    obj.data.update()


def camera(aspect):
    scene = bpy.context.scene
    width = aspect * PAD_X + 2 * SIDE
    res_x = max(8, round(width * PX))
    res_y = round(TOP * PX)
    width = res_x / PX
    height = res_y / PX
    scene.render.resolution_x = res_x
    scene.render.resolution_y = res_y
    cam_data = bpy.data.cameras.new("cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = max(width, height)
    cam = bpy.data.objects.new("cam", cam_data)
    cam.location = (0.0, -FOOT + height / 2, 5.0)
    scene.collection.objects.link(cam)
    scene.camera = cam
    return res_x, res_y


def frames():
    """(name, sy, sx, bend) for the idle loop, then the shot."""
    idle = ANIM["idle"]
    out = []
    for f in range(idle["frames"]):
        p = 2 * math.pi * f / idle["frames"]
        breathe = math.sin(p)
        out.append((f"idle_{f:02d}", 1 + idle["breathe"] * breathe, 1 - idle["breathe"] * 0.6 * breathe, idle["sway"] * math.sin(p + 0.9)))
    for f, (sy, sx) in enumerate(ANIM["fire"]["keys"]):
        out.append((f"fire_{f:02d}", sy, sx, 0.0))
    return out


report = {}
for tower in job["towers"]:
    scene = reset()
    mat, w, h = material(tower["png"])
    aspect = w / h
    obj, rest = plane(aspect, mat)
    res_x, res_y = camera(aspect)
    os.makedirs(tower["dir"], exist_ok=True)
    for name, sy, sx, bend in frames():
        deform(obj, rest, aspect, sy, sx, bend)
        scene.render.filepath = os.path.join(tower["dir"], name + ".png")
        bpy.ops.render.render(write_still=True)
    report[tower["name"]] = {"w": res_x, "h": res_y, "aspect": aspect}
    print(f"TOWER {tower['name']} {res_x}x{res_y}", flush=True)

json.dump(report, open(os.path.join(job["out"], "rig-report.json"), "w"), indent=1)
