"""Elige los peleadores de cada división: campeón + 15 rankeados + no rankeados con ficha."""
import json, re, unicodedata

UNRANKED_PER_DIV = 12


def norm(s):
    return re.sub(r'[^a-z]', '', unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower())


def score(f):
    w, l, d = (int(x) for x in f['record'].split('-')) if f.get('record') else (0, 0, 0)
    return (w / max(1, w + l)) * 10 + min(w, 25) * 0.15 + (1.5 if f.get('lastResult') == 'W' else 0)


def select(roster, rankings, extra=0):
    by_name = {norm(f['name']): (d, f) for d, fs in roster.items() for f in fs}
    chosen = {}
    used = set()
    for div, names in rankings['divisiones'].items():
        chosen[div] = []
        for r, n in enumerate(names):
            d0, f = by_name[norm(n)]
            key = norm(n)
            if key in used:  # mismo peleador rankeado en dos divisiones
                for c in chosen.values():
                    for x in c:
                        if norm(x['name']) == key:
                            x.setdefault('otherRanks', {})[div] = r
                continue
            used.add(key)
            chosen[div].append({**f, 'ranking': r})
    for div, fs in roster.items():
        pool = [f for f in fs if norm(f['name']) not in used and f.get('link') and f.get('record')]
        pool.sort(key=score, reverse=True)
        for f in pool[:UNRANKED_PER_DIV + extra]:
            used.add(norm(f['name']))
            chosen[div].append({**f, 'ranking': None})
    return chosen
