# Genera los iconos PWA (pixel art 32x32 escalado sin suavizado).
from PIL import Image
G = [
"................................",
"................................",
"................................",
"..........#########.............",
"........##RRRRRRRRR##...........",
".......#RRRRRRRRRRRRR#..........",
"......#RRRRRRRRRRRRRRR#.........",
"......#RRRrRRRrRRRrRRR#.........",
".....#RRRRrRRRrRRRrRRRR#........",
".....#RRRRrRRRrRRRrRRRR#........",
".....#RRRRRRRRRRRRRRRRR#........",
".....#RRRRRRRRRRRRRRRRRR#.......",
"....##RRRRRRRRRRRRRRRRRR#.......",
"...#RRR#RRRRRRRRRRRRRRRR#.......",
"...#RRRR#RRRRRRRRRRRRRRR#.......",
"...#RRRRR##RRRRRRRRRRRRR#.......",
"....#RRRRRR#RRRRRRRRRRRR#.......",
".....#RRRRRRRRRRRRRRRRR#........",
"......#RRRRRRRRRRRRRRRR#........",
".......#RRRRRRRRRRRRRR#.........",
"........#WWWWWWWWWWWW#..........",
"........#WWWWWWWWWWWW#..........",
"........#KKKKKKKKKKKK#..........",
"........#KKKKKKKKKKKK#..........",
"........#KKKKKKKKKKKK#..........",
".........############...........",
"................................",
"................................",
"................................",
"................................",
"................................",
"................................",
]
C = {'#': (10,10,14,255), 'R': (210,10,10,255), 'r': (140,6,6,255), 'W': (255,255,255,255), 'K': (40,40,48,255), '.': None}
def make(size, pad):
    bg = Image.new('RGBA', (32, 32), (11,13,20,255))
    for y,row in enumerate(G):
        for x,ch in enumerate(row):
            c = C[ch]
            if c: bg.putpixel((x+4,y+2) if x+4<32 else (x,y), c)
    img = bg.resize((size - 2*pad, size - 2*pad), Image.NEAREST)
    out = Image.new('RGBA', (size, size), (11,13,20,255)); out.paste(img, (pad, pad)); return out
make(192, 0).save('assets/icons/icon-192.png')
make(512, 0).save('assets/icons/icon-512.png')
make(512, 64).save('assets/icons/icon-maskable-512.png')
