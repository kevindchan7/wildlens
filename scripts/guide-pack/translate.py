"""Builds app/guides/<lang>.json from app/guides/en.json and the translations stored by the
server function wl-translate (public 'get'). Texts without a translation stay in English."""
import json, os, sys, urllib.request
here = os.path.dirname(__file__); root = os.path.join(here, '..', '..')
FN = 'https://lrrjcpnswzlkpwqrdyyk.supabase.co/functions/v1/wl-translate'
en = json.load(open(os.path.join(root, 'app', 'guides', 'en.json')))
for lang in sys.argv[1:] or ['it', 'es', 'fr']:
    req = urllib.request.Request(FN, json.dumps({'op': 'get', 'lang': lang}).encode(), {'Content-Type': 'application/json'})
    d = json.loads(urllib.request.urlopen(req, timeout=60).read()).get('dict') or {}
    T = lambda s: d.get(s, s)
    tx = lambda x: T(x) if isinstance(x, str) else [tx(y) for y in x]
    out = [{**g, 't': T(g['t']), 's': T(g['s']), 'k': g['k'] + ' ' + T(g['t']).lower() + ' ' + T(g['s']).lower(), 'b': [[k, tx(v)] for k, v in g['b']]} for g in en]
    json.dump(out, open(os.path.join(root, 'app', 'guides', f'{lang}.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
    print(lang, len(d), 'translated texts')
