// Utilidades de interfaz compartidas.
import { t } from '../i18n.js';
import { audio } from '../audio.js';

const history = [];

export function show(id, { push = true } = {}) {
  const cur = document.querySelector('.screen:not([hidden])');
  if (cur && cur.id === id) return;
  if (cur && push) history.push(cur.id);
  document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== id; });
  const target = document.getElementById(id);
  target.dispatchEvent(new CustomEvent('screen:show'));
  const focusable = target.querySelector('button:not([disabled])');
  if (focusable && !target.classList.contains('screen-fight')) focusable.focus({ preventScroll: true });
}

export function back() {
  const prev = history.pop();
  if (prev) { audio.play('uiBack'); show(prev, { push: false }); }
}

export function resetHistory(to = []) { history.length = 0; history.push(...to); }

export function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v === true) e.setAttribute(k, '');
    else if (v !== false && v != null) e.setAttribute(k, v);
  }
  for (const c of children.flat()) if (c != null) e.append(c);
  return e;
}

// Estrellas pixel (llenas, medias, vacías) en SVG.
const STAR = 'M3 0h2v2h3v2H6v1h1v3H5V7H3v1H1V5h1V4H0V2h3z';
export function starsEl(value) {
  const wrap = el('span', { class: 'stars', role: 'img', 'aria-label': `${value} / 5` });
  for (let i = 0; i < 5; i++) {
    const fill = value >= i + 1 ? 1 : value >= i + 0.5 ? 0.5 : 0;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 8 8'); svg.setAttribute('aria-hidden', 'true');
    const id = 'h' + Math.random().toString(36).slice(2, 8);
    svg.innerHTML = `<defs><clipPath id="${id}"><rect x="0" y="0" width="${fill * 8}" height="8"/></clipPath></defs>
      <path d="${STAR}" fill="#3a3f55"/><path d="${STAR}" fill="currentColor" clip-path="url(#${id})"/>`;
    wrap.append(svg);
  }
  return wrap;
}

export function rankLabel(f) {
  if (f.ranking === 0) return el('span', { class: 'rank-badge champ', text: t('champion') });
  if (f.ranking == null) return el('span', { class: 'rank-badge', text: t('unranked') });
  return el('span', { class: 'rank-badge', text: t('ranked', { n: f.ranking }) });
}

export function streakText(r) {
  if (!r) return t('streak_none');
  return r > 0 ? t('streak_w', { n: r }) : t('streak_l', { n: -r });
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.ceil(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}

export function segmented(container, options, value, onChange) {
  container.innerHTML = '';
  container.setAttribute('role', 'radiogroup');
  for (const o of options) {
    const b = el('button', { type: 'button', role: 'radio', 'aria-checked': String(o.value === value), text: o.label });
    b.addEventListener('click', () => {
      container.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', 'false'));
      b.setAttribute('aria-checked', 'true');
      audio.play('ui');
      onChange(o.value);
    });
    container.append(b);
  }
}
