"""Builds app/guides/en.json from the English source files g*.py."""
import json, glob, importlib.util, os
ICONS = {'water','fire','shelter','nav','aid','plants','signals','weather','body','build','combo'}
here = os.path.dirname(__file__)
out = []
for f in sorted(glob.glob(os.path.join(here, 'g*.py'))):
    spec = importlib.util.spec_from_file_location('m', f); m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    for gid, ic, c, t, s, k, blocks in m.G:
        out.append({'id': 'x-' + gid, 'ic': ic if ic in ICONS else 'aid', 'c': c, 't': t, 's': s, 'k': k, 'b': [[a, b] for a, b in blocks]})
ids = [g['id'] for g in out]; assert len(ids) == len(set(ids)), 'duplicate ids'
os.makedirs(os.path.join(here, '..', '..', 'app', 'guides'), exist_ok=True)
json.dump(out, open(os.path.join(here, '..', '..', 'app', 'guides', 'en.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'guides')
