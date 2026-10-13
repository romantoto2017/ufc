"""Genera data/fighters.json a partir de Wikipedia (roster + fichas) y del ranking verificado.

Uso: python3 tools/roster/build.py <carpeta_cache>
  La carpeta debe contener list.wiki (List of current UFC fighters, action=raw) y pages.json
  (fichas descargadas con fetch_all.py). Los atributos se calculan con js/ratings.js (Node).
"""
import datetime, hashlib, json, os, re, subprocess, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from parse_list import parse  # noqa: E402
from pick import select, norm  # noqa: E402
from caras import cara as manual_face  # noqa: E402

TODAY = datetime.date(2026, 10, 13)
DIV_KG = {'mosca': 56.7, 'gallo': 61.2, 'pluma': 65.8, 'ligero': 70.3, 'welter': 77.1, 'medio': 83.9, 'semipesado': 93.0, 'pesado': 120.2}

ISO3 = {
    'USA': 'US', 'BRA': 'BR', 'RUS': 'RU', 'MEX': 'MX', 'AUS': 'AU', 'ENG': 'ENG', 'SCO': 'SCO', 'WAL': 'WAL', 'NIR': 'NIR',
    'POL': 'PL', 'CAN': 'CA', 'CHN': 'CN', 'FRA': 'FR', 'GEO': 'GE', 'NZL': 'NZ', 'JPN': 'JP', 'NGR': 'NG', 'NGA': 'NG',
    'KOR': 'KR', 'ARG': 'AR', 'AZE': 'AZ', 'AUT': 'AT', 'MDA': 'MD', 'CRO': 'HR', 'HRV': 'HR', 'UZB': 'UZ', 'NED': 'NL',
    'NLD': 'NL', 'SRB': 'RS', 'JAM': 'JM', 'KAZ': 'KZ', 'ECU': 'EC', 'DEU': 'DE', 'GER': 'DE', 'PER': 'PE', 'MAR': 'MA',
    'ARM': 'AM', 'TJK': 'TJ', 'DOM': 'DO', 'BHR': 'BH', 'CUB': 'CU', 'CHE': 'CH', 'SUI': 'CH', 'CZE': 'CZ', 'LTU': 'LT',
    'TUR': 'TR', 'ITA': 'IT', 'UAE': 'AE', 'ARE': 'AE', 'ZAF': 'ZA', 'RSA': 'ZA', 'CMR': 'CM', 'ABW': 'AW', 'ISL': 'IS',
    'IRE': 'IE', 'IRL': 'IE', 'DNK': 'DK', 'DEN': 'DK', 'NOR': 'NO', 'ESP': 'ES', 'CHL': 'CL', 'CHI': 'CL', 'KGZ': 'KG',
    'UKR': 'UA', 'SVK': 'SK', 'IND': 'IN', 'MNE': 'ME', 'UGA': 'UG', 'BEL': 'BE', 'IRQ': 'IQ', 'AGO': 'AO', 'ANG': 'AO',
    'MMR': 'MM', 'POR': 'PT', 'PRT': 'PT', 'SWE': 'SE', 'FIN': 'FI', 'PHI': 'PH', 'PHL': 'PH', 'THA': 'TH', 'COL': 'CO',
    'VEN': 'VE', 'URU': 'UY', 'URY': 'UY', 'PAR': 'PY', 'PRY': 'PY', 'BOL': 'BO', 'PAN': 'PA', 'CRC': 'CR', 'HAI': 'HT',
    'GHA': 'GH', 'COD': 'CD', 'SEN': 'SN', 'EGY': 'EG', 'TUN': 'TN', 'ALG': 'DZ', 'IRN': 'IR', 'AFG': 'AF', 'KSA': 'SA',
    'JOR': 'JO', 'LBN': 'LB', 'ISR': 'IL', 'GRE': 'GR', 'GRC': 'GR', 'ROU': 'RO', 'BUL': 'BG', 'BGR': 'BG', 'HUN': 'HU',
    'SVN': 'SI', 'SLO': 'SI', 'BIH': 'BA', 'MKD': 'MK', 'ALB': 'AL', 'LAT': 'LV', 'LVA': 'LV', 'EST': 'EE', 'BLR': 'BY',
    'MGL': 'MN', 'MNG': 'MN', 'TPE': 'TW', 'TWN': 'TW', 'SGP': 'SG', 'INA': 'ID', 'IDN': 'ID', 'MAS': 'MY', 'MYS': 'MY',
    'VIE': 'VN', 'VNM': 'VN', 'TKM': 'TM', 'GUY': 'GY', 'SUR': 'SR', 'TTO': 'TT', 'PUR': 'PR', 'PRI': 'PR', 'NAM': 'NA',
}

STYLE_KEYS = [
    ('lucha_libre', ['wrestling', 'sambo', 'greco', 'freestyle', 'grappling']),
    ('bjj', ['jiu-jitsu', 'jiu jitsu', 'bjj', 'judo']),
    ('muay_thai', ['muay thai', 'lethwei']),
    ('kickboxing', ['kickboxing', 'karate', 'taekwondo', 'sanda', 'sanshou', 'kyokushin', 'savate', 'kung fu', 'wushu']),
    ('boxeo', ['boxing']),
]


def clean(v):
    v = re.sub(r'<ref[^>]*/>', '', v)
    v = re.sub(r'<ref.*?</ref>', '', v, flags=re.S)
    v = re.sub(r'\[\[(?:[^|\]]*\|)?([^\]]*)\]\]', r'\1', v)
    v = re.sub(r'<[^>]+>', ' ', v)
    return v.strip()


def infobox(text):
    out = {}
    start = text.find('{{Infobox')
    for m in re.finditer(r'^\|[ \t]*([a-z_\-]+)[ \t]*=[ \t]*(.*)$', text[max(0, start):max(0, start) + 60000], re.M):
        out.setdefault(m.group(1), m.group(2))
    rb = re.search(r'\{\{MMArecordbox(.*?)\}\}', text, re.S)
    if rb:
        for m in re.finditer(r'\|\s*([a-z\-]+)\s*=\s*(\d*)', rb.group(1)):
            out['rb_' + m.group(1)] = int(m.group(2)) if m.group(2) else 0
    return out


def reach_cm(v):
    v = clean(v or '')
    v = v.replace('½', '+1/2')
    m = re.search(r'convert\|(\d+(?:\.\d+)?)\|in', v) or re.search(r'(\d+(?:\.\d+)?)(?:\s*\+?\s*(\d)/(\d))?\s*(?:in\b|inches|")', v)
    if m:
        inches = float(m.group(1)) + (int(m.group(2)) / int(m.group(3)) if m.lastindex and m.lastindex >= 3 and m.group(2) else 0)
        return round(inches * 2.54) if inches > 40 else None
    m = re.search(r'convert\|(\d+(?:\.\d+)?)\|cm', v) or re.search(r'(\d{3})\s*cm', v)
    return round(float(m.group(1))) if m else None


def stance(v):
    v = clean(v or '').lower()
    if 'southpaw' in v: return 'zurda'
    if 'switch' in v: return 'switch'
    if 'orthodox' in v: return 'ortodoxa'
    return None


def style_of(v, methods):
    v = clean(v or '').lower()
    found = [(v.find(k), s) for s, keys in STYLE_KEYS for k in keys if k in v]
    found.sort()
    styles = [s for _, s in found]
    w = max(1, sum(methods.values()))
    sub_rate, ko_rate = methods['sub'] / w, methods['ko'] / w
    if styles:
        if 'bjj' in styles and sub_rate >= 0.4:
            return 'bjj', False
        return styles[0], False
    # Sin dato: se infiere del perfil de victorias (se marca para verificar)
    if sub_rate >= 0.45: return 'bjj', True
    if ko_rate >= 0.55: return 'kickboxing', True
    return 'lucha_libre' if methods['dec'] / w >= 0.45 else 'muay_thai', True


def streak_from(text):
    t = text[text.find('MMA record start'):] if 'MMA record start' in text else ''
    res = re.findall(r'^\|\s*(?:\{\{[^}]*\}\}\s*)?(Win|Loss|Draw|NC)\s*$', t, re.M | re.I)
    if not res:
        return None
    first = res[0].lower()
    if first not in ('win', 'loss'):
        return 0
    n = 0
    for r in res:
        if r.lower() != first:
            break
        n += 1
    return n if first == 'win' else -n


def age_of(dob):
    if not dob: return None
    y, m, d = map(int, dob.split('-'))
    return TODAY.year - y - ((TODAY.month, TODAY.day) < (m, d))


def slug(name):
    s = unicodedata.normalize('NFKD', name).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


# ---------- caras aproximadas (deterministas por id) ----------
SKIN_BY_REGION = {
    'africa': [4, 5, 5, 3], 'latam': [1, 2, 2, 3, 3, 4], 'europa': [0, 1, 1, 1, 2], 'caucaso': [1, 2, 2],
    'asia_este': [0, 1, 1, 2], 'asia_central': [1, 2, 2, 3], 'oceania': [1, 1, 2, 3, 4], 'norteamerica': [0, 1, 1, 2, 3, 4, 5],
}
REGION = {}
for c in 'BR AR MX PE EC CO CL UY PY VE BO DO CU JM PR PA CR AW'.split(): REGION[c] = 'latam'
for c in 'NG CM UG AO ZA GH SN CD'.split(): REGION[c] = 'africa'
for c in 'GE AM AZ RU TR IQ IR'.split(): REGION[c] = 'caucaso'
for c in 'JP KR CN TW MN'.split(): REGION[c] = 'asia_este'
for c in 'KZ UZ TJ KG TM MM IN TH PH ID VN'.split(): REGION[c] = 'asia_central'
for c in 'AU NZ'.split(): REGION[c] = 'oceania'
for c in 'US CA'.split(): REGION[c] = 'norteamerica'


def face_for(fid, country):
    h = hashlib.sha256(fid.encode()).digest()
    pick = lambda arr, i: arr[h[i] % len(arr)]
    region = REGION.get(country, 'europa')
    skin = pick(SKIN_BY_REGION[region], 0)
    dark = skin >= 3 or region in ('asia_este', 'caucaso', 'asia_central', 'latam')
    return {
        'piel': skin,
        'pelo': pick(['rapado', 'corto', 'fade', 'corto', 'medio', 'calvo', 'rizado' if skin >= 3 else 'corto', 'mohicano' if h[9] % 7 == 0 else 'fade'], 1),
        'colorPelo': pick(['negro', 'negro', 'castano'] if dark else ['castano', 'castano_claro', 'rubio', 'negro', 'pelirrojo' if h[8] % 5 == 0 else 'castano'], 2),
        'barba': pick(['ninguna', 'sombra', 'corta', 'completa', 'candado', 'bigote', 'ninguna'], 3),
        'cejas': pick(['finas', 'normales', 'normales', 'gruesas'], 4),
        'cabeza': pick(['redonda', 'cuadrada', 'ovalada', 'ancha'], 5),
        'aproximada': True,
    }


def main(cache):
    roster = parse(open(os.path.join(cache, 'list.wiki')).read())
    ranks = json.load(open(os.path.join(HERE, 'rankings.json')))
    overrides = json.load(open(os.path.join(HERE, 'overrides.json')))
    pages = json.load(open(os.path.join(cache, 'pages.json')))
    chosen = select(roster, ranks, extra=3)
    p4p = {norm(n) for n in ranks['p4p']}
    out = []
    for div, fs in chosen.items():
        unranked = 0
        for f in fs:
            text = pages.get(f.get('link') or '', None) or ''
            if f['ranking'] is None:
                if not text or unranked >= 12:
                    continue
                unranked += 1
            ib = infobox(text) if text else {}
            methods = {'ko': ib.get('rb_ko-wins', 0), 'sub': ib.get('rb_sub-wins', 0), 'dec': ib.get('rb_dec-wins', 0)}
            to_verify = []
            style, inferred = style_of((ib.get('style') or '') + ' ' + (ib.get('rank') or ''), methods)
            if inferred: to_verify.append('estilo')
            reach = reach_cm(ib.get('reach'))
            if not reach:
                reach = round((f['height'] or 178) * 1.02)
                to_verify.append('alcance')
            st = stance(ib.get('stance'))
            if not st:
                st = 'ortodoxa'; to_verify.append('postura')
            streak = streak_from(text) if text else None
            if streak is None:
                streak = 1 if f.get('lastResult') == 'W' else -1 if f.get('lastResult') == 'L' else 0
                to_verify.append('racha')
            if not sum(methods.values()):
                to_verify.append('metodosVictoria')
            fid = slug(f['name'])
            country = ISO3.get(f.get('iso3') or '', None)
            if not country:
                country = 'US'; to_verify.append('pais')
            wins = int(f['record'].split('-')[0])
            w = max(1, wins)
            ko_l = ib.get('rb_ko-losses', 0)
            losses = int(f['record'].split('-')[1])
            ajustes = {
                'golpeo': round((methods['ko'] / w - 0.4) * 18),
                'sumisiones': round((methods['sub'] / w - 0.25) * 30),
                'grappling': round((methods['sub'] / w - 0.25) * 8),
                'menton': round((0.12 - ko_l / max(1, wins + losses)) * 40),
            }
            entry = {
                'id': fid, 'nombre': f['name'], 'apodo': f['nick'] or None, 'pais': country,
                'edad': age_of(f['dob']), 'fechaNacimiento': f['dob'], 'division': div, 'peso': DIV_KG[div],
                'altura': f['height'], 'alcance': reach, 'postura': st, 'estilo': style, 'record': f['record'],
                'metodosVictoria': methods, 'racha': streak, 'ranking': f['ranking'],
                'elite': f['ranking'] == 0 or norm(f['name']) in p4p,
                'fuente': 'calculado', 'ajustesPerfil': ajustes, 'atributos': None, 'cara': manual_face(fid) or face_for(fid, country),
                'verificar': bool(to_verify),
            }
            if to_verify: entry['camposVerificar'] = to_verify
            if f.get('otherRanks'):
                entry['otrasDivisiones'] = f['otherRanks']
            if f.get('link'):
                entry['fuentes'] = ['https://en.wikipedia.org/wiki/' + f['link'].replace(' ', '_')]
            ov = overrides.get(fid)
            if ov:
                entry.update(ov)
                if 'estilo' in ov and 'camposVerificar' in entry:
                    entry['camposVerificar'] = [c for c in entry['camposVerificar'] if c != 'estilo']
                    if not entry['camposVerificar']:
                        del entry['camposVerificar']; entry['verificar'] = False
            out.append(entry)
        # Al menos 2 de 5 estrellas por división: si falta, se suma el #1
        div_f = [e for e in out if e['division'] == div]
        if sum(1 for e in div_f if e['elite']) < 2:
            for e in div_f:
                if e['ranking'] == 1: e['elite'] = True
    db = json.load(open(os.path.join(ROOT, 'data', 'fighters.json')))
    db['_nota'] = ('Generado con tools/roster/build.py desde Wikipedia (roster "List of current UFC fighters", fichas individuales '
                   'y Meta Rankings del 2026-10-03; P4P de medios del 2026-10-06). 5 estrellas = campeón o top 15 P4P '
                   '(mínimo 2 por división). Las caras son aproximadas. Peso en kg; altura y alcance en cm.')
    db['actualizado'] = '2026-10-13'
    db['peleadores'] = out
    path = os.path.join(ROOT, 'data', 'fighters.json')
    json.dump(db, open(path, 'w'), ensure_ascii=False, indent=1)
    # Atributos con la misma fórmula del juego
    subprocess.run(['node', os.path.join(ROOT, 'tools', 'derive-attributes.mjs'), '--force', '--quiet'], check=True)
    print('peleadores:', len(out), {d: sum(1 for e in out if e['division'] == d) for d in DIV_KG})
    print('con datos a verificar:', sum(1 for e in out if e['verificar']))


if __name__ == '__main__':
    main(sys.argv[1])
