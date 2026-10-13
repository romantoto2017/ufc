"""Descarga el wikitext de las fichas de peleadores (API de Wikipedia, tandas de 50)."""
import json, os, sys, time, urllib.error, urllib.parse, urllib.request

API = 'https://en.wikipedia.org/w/api.php'


def fetch(titles, cache_dir):
    os.makedirs(cache_dir, exist_ok=True)
    cache_file = os.path.join(cache_dir, 'pages.json')
    cache = json.load(open(cache_file)) if os.path.exists(cache_file) else {}
    todo = [t for t in dict.fromkeys(titles) if t and t not in cache]
    for i in range(0, len(todo), 20):
        batch = todo[i:i + 20]
        q = urllib.parse.urlencode({'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
                                    'format': 'json', 'formatversion': 2, 'redirects': 1, 'titles': '|'.join(batch)})
        req = urllib.request.Request(API + '?' + q, headers={'User-Agent': 'pixel-mma-roster/1.0 (uso personal)'})
        for attempt in range(6):
            try:
                data = json.load(urllib.request.urlopen(req, timeout=60))['query']
                break
            except urllib.error.HTTPError as e:
                if e.code != 429 or attempt == 5:
                    raise
                wait = int(e.headers.get('Retry-After') or 0) or 5 * 2 ** attempt
                print(f'429: espero {wait}s', file=sys.stderr)
                time.sleep(wait)
        redir = {r['from']: r['to'] for r in data.get('redirects', [])}
        norm = {n['from']: n['to'] for n in data.get('normalized', [])}
        pages = {p['title']: p.get('revisions', [{}])[0].get('slots', {}).get('main', {}).get('content') for p in data['pages']}
        for t in batch:
            k = norm.get(t, t); k = redir.get(k, k)
            cache[t] = pages.get(k)
        json.dump(cache, open(cache_file, 'w'))
        print(f'{min(i + 20, len(todo))}/{len(todo)}', file=sys.stderr)
        time.sleep(2)
    return cache
