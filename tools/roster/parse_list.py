"""Parsea las tablas por división de 'List of current UFC fighters' (wikitext crudo)."""
import re

SECTIONS = {'pesado': 'Heavyweights', 'semipesado': 'Light heavyweights', 'medio': 'Middleweights',
            'welter': 'Welterweights', 'ligero': 'Lightweights', 'pluma': 'Featherweights',
            'gallo': 'Bantamweights', 'mosca': 'Flyweights'}


def parse_record(txt):
    txt = re.sub(r'\{\{ntsh\|[^}]*\}\}', '', txt).replace('–', '-').strip()
    m = re.match(r'(\d+)-(\d+)(?:-(\d+))?', txt)
    if not m:
        return None
    return f"{m.group(1)}-{m.group(2)}-{m.group(3) or 0}"


def parse(wikitext):
    heads = [(m.start(), m.group(1).strip()) for m in re.finditer(r'^===([^=]+)===', wikitext, re.M)]
    out = {}
    for div, label in SECTIONS.items():
        idx = next(k for k, (_, h) in enumerate(heads) if h.startswith(label + ' ('))
        body = wikitext[heads[idx][0]:heads[idx + 1][0]]
        fighters = []
        for row in body.split('\n|-')[1:]:
            cells = [c.strip() for c in row.split('\n|')[1:]]
            if len(cells) < 9 or 'age nts' not in cells[2]:
                continue
            iso = re.search(r'icon\|([A-Z]{3})', cells[0])
            nm = re.search(r'\{\{sortname\|([^|}]*)\|([^|}]*)(?:\|([^|}]*))?', cells[1])
            dob = re.search(r'age nts\|(\d+)\|(\d+)\|(\d+)', cells[2])
            ht = re.search(r'ft=(\d+)\|in=(\d+(?:\.\d+)?)', cells[3])
            nick = re.sub(r"\{\{sort\|[^|]*\|([^}]*)\}\}", r"\1", cells[4]).replace("''", '').strip()
            if nick.startswith(('{{', '<', '|')):
                nick = ''
            last = cells[5]
            res = None
            for key, val in (('Win', 'W'), ('Loss', 'L'), ('Draw', 'D'), ('No Contest', 'NC')):
                if f"'''{key}'''" in last:
                    res = val
            if nm:
                name = (nm.group(1).strip() + ' ' + nm.group(2).strip()).strip()
                link = nm.group(3)
                has_page = True
            else:
                raw = re.sub(r"'''''.*", '', cells[1])
                wl = re.search(r'\[\[([^|\]]+)(?:\|([^\]]+))?\]\]', raw)
                if wl:
                    link, name, has_page = wl.group(1), (wl.group(2) or wl.group(1)), True
                else:
                    name, link, has_page = raw.strip(" '*"), None, False
                name = re.sub(r'\s*\(.*?\)$', '', name).strip()
            fighters.append(dict(
                iso3=iso.group(1) if iso else None, name=name, link=(link or name).strip() if has_page else None,
                dob='%s-%02d-%02d' % (dob.group(1), int(dob.group(2)), int(dob.group(3))) if dob else None,
                height=round((int(ht.group(1)) * 12 + float(ht.group(2))) * 2.54) if ht else None,
                nick=nick, record=parse_record(cells[-1]), lastResult=res))
        out[div] = fighters
    return out
