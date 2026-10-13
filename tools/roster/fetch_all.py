import json, sys
sys.path.insert(0, '.')
from parse_list import parse
from pick import select
from fetch_pages import fetch
W = sys.argv[1]
roster = parse(open(W + '/list.wiki').read())
ranks = json.load(open('rankings.json'))
chosen = select(roster, ranks, extra=3)
titles = [f['link'] for fs in chosen.values() for f in fs if f.get('link')]
print('titulos', len(titles), flush=True)
c = fetch(titles, W)
print('OK', sum(1 for t in titles if c.get(t)), 'sin pagina', [t for t in titles if not c.get(t)], flush=True)
