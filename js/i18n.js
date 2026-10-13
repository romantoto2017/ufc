// Textos de la interfaz desde /lang/<idioma>.json
let dict = {};
let current = 'es';

export async function loadLang(lang) {
  const res = await fetch(`lang/${lang}.json`);
  dict = await res.json();
  current = lang;
  document.documentElement.lang = lang;
  applyI18n(document);
}

export function t(key, vars) {
  let s = dict[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return s;
}

export function lang() { return current; }

// Rellena elementos con data-i18n="clave" (texto) y data-i18n-aria="clave" (aria-label).
export function applyI18n(root) {
  root.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
}
