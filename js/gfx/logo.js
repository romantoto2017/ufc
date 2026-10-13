// Logos de organizaciones: se cargan desde assets/logos/. Si falta el PNG, se genera
// un logo provisional pixel art con el nombre.
const cache = new Map();

export function loadLogo(file) {
  if (cache.has(file)) return cache.get(file);
  const p = new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = 'assets/logos/' + file;
  });
  cache.set(file, p);
  return p;
}

export function placeholderLogo(name, { w = 160, h = 48, color = '#d20a0a' } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.className = 'pixel';
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = color; ctx.fillRect(0, 0, w, 3); ctx.fillRect(0, h - 3, w, 3); ctx.fillRect(0, 0, 3, h); ctx.fillRect(w - 3, 0, 3, h);
  ctx.fillStyle = '#fff';
  let size = 16;
  ctx.font = `${size}px "Press Start 2P", monospace`;
  while (ctx.measureText(name.toUpperCase()).width > w - 16 && size > 6) { size -= 2; ctx.font = `${size}px "Press Start 2P", monospace`; }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(name.toUpperCase(), w / 2, h / 2 + 1);
  return c;
}

// Devuelve un elemento (img o canvas) listo para el DOM.
export async function logoElement(promo, opts) {
  const img = promo.logo ? await loadLogo(promo.logo) : null;
  if (img) { const el = img.cloneNode(); el.alt = promo.nombre; el.className = 'logo-img'; return el; }
  const c = placeholderLogo(promo.nombre, opts);
  c.setAttribute('role', 'img'); c.setAttribute('aria-label', promo.nombre);
  return c;
}
