"""Normaliza logos de organizaciones: PNG real, fondo transparente (si el fondo es liso),
recortado al contenido y con ancho máximo de 600 px.
Uso: python3 tools/prepare-logos.py <carpeta_entrada> <carpeta_salida>"""
import os, sys
from collections import deque
from PIL import Image

def flood_transparent(im, tol=38):
    im = im.convert('RGBA')
    w, h = im.size
    px = im.load()
    seen = bytearray(w * h)
    q = deque()
    for x, y in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        q.append((x, y))
    ref = [px[x, y] for x, y in q]
    def close(c):
        # Color del fondo, o gris claro neutro (cuadriculado de "transparencia" pegado en la imagen)
        neutral_light = min(c[:3]) > 180 and max(c[:3]) - min(c[:3]) < 18
        return neutral_light and any(min(r[:3]) > 180 for r in ref) or any(abs(c[0] - r[0]) + abs(c[1] - r[1]) + abs(c[2] - r[2]) <= tol for r in ref)
    while q:
        x, y = q.popleft()
        i = y * w + x
        if seen[i]: continue
        seen[i] = 1
        c = px[x, y]
        if c[3] == 0 or close(c):
            px[x, y] = (c[0], c[1], c[2], 0)
            for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                if 0 <= nx < w and 0 <= ny < h and not seen[ny * w + nx]:
                    q.append((nx, ny))
    return im

def luminance_of_content(im):
    px = [p for p in (im.get_flattened_data() if hasattr(im, 'get_flattened_data') else im.getdata()) if p[3] > 128]
    if not px: return 0
    return sum(0.2126 * r + 0.7152 * g + 0.0722 * b for r, g, b, a in px) / len(px)

def process(src, dst):
    im = Image.open(src)
    rgba = im.convert('RGBA')
    corners = [rgba.getpixel(p) for p in [(0, 0), (rgba.width - 1, 0), (0, rgba.height - 1), (rgba.width - 1, rgba.height - 1)]]
    opaque_bg = all(c[3] > 200 for c in corners)
    out = flood_transparent(rgba) if opaque_bg else rgba
    # Logos oscuros: se pasan a su versión clara (los grises/negros neutros a blanco), como las
    # versiones oficiales sobre fondo oscuro. Los colores de marca se conservan.
    data = [p for p in (out.get_flattened_data() if hasattr(out, 'get_flattened_data') else out.getdata()) if p[3] > 128]
    neutral = sum(1 for r, g, b, a in data if max(r, g, b) - min(r, g, b) < 40) / max(1, len(data))
    if luminance_of_content(out) < 110 and neutral > 0.7:
        px = out.load()
        for y in range(out.height):
            for x in range(out.width):
                r, g, b, a = px[x, y]
                if a and max(r, g, b) - min(r, g, b) < 40 and (r + g + b) / 3 < 140:
                    v = 255 - int((r + g + b) / 3 * 0.25)
                    px[x, y] = (v, v, v, a)
    bbox = out.getbbox()
    if bbox: out = out.crop(bbox)
    if out.width > 600:
        out = out.resize((600, round(out.height * 600 / out.width)), Image.LANCZOS)
    out.save(dst, 'PNG', optimize=True)
    return opaque_bg, out.size

if __name__ == '__main__':
    src_dir, dst_dir = sys.argv[1], sys.argv[2]
    os.makedirs(dst_dir, exist_ok=True)
    for f in sorted(os.listdir(src_dir)):
        name = os.path.splitext(f)[0] + '.png'
        print(f, '->', name, process(os.path.join(src_dir, f), os.path.join(dst_dir, name)))
