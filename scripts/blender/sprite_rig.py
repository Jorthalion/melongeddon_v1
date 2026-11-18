"""
Runs inside Blender (scripts/animate-sprites.py calls it):

    blender --background --factory-startup --python scripts/blender/sprite_rig.py -- job.json

Each painting goes on a finely divided plane, pinned at its base. For every frame the job lists, the plane
is bent and squashed (height ×sy, width ×sx more toward the top, the top leaning by `bend`, the whole thing
lifted by `lift`; all in painting heights) and rendered straight down with an orthographic camera onto a
transparent frame. The frame layout (`frame`) is shared with the game through the generated data file.
"""
import json
import os
import sys

import bpy

argv = sys.argv[sys.argv.index("--") + 1 :]
job = json.load(open(argv[0], encoding="utf-8"))
FRAME = job["frame"]
PX = FRAME["px"]  # pixels per painting height
PAD_X = FRAME["padX"]  # frame width = painting width × padX + 2 × side
SIDE = FRAME["side"]  # extra width each side, in painting heights (room for a lean)
TOP = FRAME["top"]  # frame height in painting heights (room for a stretch or a hop)
FOOT = FRAME["foot"]  # space under the painting's base, in painting heights
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
    """The painting as an unlit surface: its own colours, see-through where it is."""
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
    verts, faces = [], []
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


def deform(obj, rest, sy, sx, bend, lift):
    """Base pinned (unless lifted): height ×sy, width ×sx more toward the top, the top leaning by bend."""
    for k, (x, y, _) in enumerate(rest):
        w = y**0.8
        obj.data.vertices[k].co = (x * (1 + (sx - 1) * w) + bend * y * y, y * sy + lift, 0.0)
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


report = {}
for sprite in job["sprites"]:
    scene = reset()
    mat, w, h = material(sprite["png"])
    aspect = w / h
    obj, rest = plane(aspect, mat)
    res_x, res_y = camera(aspect)
    os.makedirs(sprite["dir"], exist_ok=True)
    for name, sy, sx, bend, lift in job["frames"]:
        deform(obj, rest, sy, sx, bend, lift)
        scene.render.filepath = os.path.join(sprite["dir"], name + ".png")
        bpy.ops.render.render(write_still=True)
    report[sprite["name"]] = {"w": res_x, "h": res_y}
    print(f"SPRITE {sprite['name']} {res_x}x{res_y}", flush=True)

json.dump(report, open(os.path.join(job["out"], "rig-report.json"), "w"), indent=1)
