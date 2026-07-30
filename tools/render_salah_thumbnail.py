import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


def look_at(camera, target):
    camera.rotation_euler = (Vector(target) - camera.location).to_track_quat("-Z", "Y").to_euler()


def main():
    args = sys.argv[sys.argv.index("--") + 1 :]
    source = Path(args[0]).resolve()
    output = Path(args[1]).resolve()
    frame = int(args[2]) if len(args) > 2 else 1
    output.parent.mkdir(parents=True, exist_ok=True)

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = True
    scene.render.filepath = str(output)
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.look = "AgX - Medium High Contrast"
    scene.render.fps = 24
    scene.frame_set(frame)

    bpy.context.view_layer.update()

    meshes = [obj for obj in scene.objects if obj.type == "MESH"]
    corners = []
    for obj in meshes:
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    minimum = Vector((min(v.x for v in corners), min(v.y for v in corners), min(v.z for v in corners)))
    maximum = Vector((max(v.x for v in corners), max(v.y for v in corners), max(v.z for v in corners)))
    center = (minimum + maximum) * 0.5

    world = bpy.data.worlds.new("Warm catalogue world") if scene.world is None else scene.world
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.96, 0.91, 0.84, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.5

    bpy.ops.object.light_add(type="AREA", location=(3.2, -4.0, 5.2))
    key = bpy.context.object
    key.data.energy = 700
    key.data.shape = "DISK"
    key.data.size = 4.0
    key.data.color = (1.0, 0.78, 0.58)
    look_at(key, center)

    bpy.ops.object.light_add(type="AREA", location=(-3.0, -1.5, 3.0))
    fill = bpy.context.object
    fill.data.energy = 420
    fill.data.size = 4.0
    fill.data.color = (0.72, 0.85, 1.0)
    look_at(fill, center)

    bpy.ops.object.light_add(type="AREA", location=(0.8, 3.0, 4.5))
    rim = bpy.context.object
    rim.data.energy = 500
    rim.data.size = 3.0
    rim.data.color = (1.0, 0.88, 0.68)
    look_at(rim, center)

    camera_data = bpy.data.cameras.new("Catalogue camera")
    camera = bpy.data.objects.new("Catalogue camera", camera_data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 2.15
    focus = Vector((center.x, center.y, maximum.z * 0.5))
    camera.location = focus + Vector((2.7, -5.4, 0.65))
    look_at(camera, focus)

    scene.render.filepath = str(output)
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    main()
