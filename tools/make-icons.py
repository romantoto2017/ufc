# Genera los iconos de la app (PWA, favicon y apple-touch-icon) con el logo de UFC sobre fondo oscuro.
# Uso: python3 tools/make-icons.py
from PIL import Image

LOGO = Image.open('assets/logos/ufc.png').convert('RGBA')
LOGO = LOGO.crop(LOGO.getbbox())
BG = (11, 13, 20, 255)


def make(size, width_frac):
    out = Image.new('RGBA', (size, size), BG)
    w = round(size * width_frac)
    h = round(LOGO.height * w / LOGO.width)
    logo = LOGO.resize((w, h), Image.LANCZOS)
    out.alpha_composite(logo, ((size - w) // 2, (size - h) // 2))
    return out


make(192, 0.84).save('assets/icons/icon-192.png')
make(512, 0.84).save('assets/icons/icon-512.png')
make(512, 0.62).save('assets/icons/icon-maskable-512.png')  # zona segura de los iconos adaptables
make(180, 0.84).save('assets/icons/apple-touch-icon.png')
make(64, 0.9).save('assets/icons/favicon-64.png')
make(32, 0.94).save('assets/icons/favicon-32.png')
