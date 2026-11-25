// Downloads one real photo per species of the Library from Wikipedia / Wikimedia Commons,
// with author and licence, into app/img/sp/<id>.jpg and app/img/sp/credits.json.
import fs from 'fs';
const html = fs.readFileSync('app/index.html', 'utf8');
const i = html.indexOf('const SP=[');
let d = 0, j = i + 9;
for (; j < html.length; j++) {
  const c = html[j];
  if (c === '"' || c === "'" || c === '`') { const q = c; j++; while (html[j] !== q) { if (html[j] === '\\') j++; j++; } continue; }
  if (c === '[') d++; else if (c === ']') { d--; if (!d) break; }
}
const SP = eval(html.slice(i + 9, j + 1));
const dir = 'app/img/sp';
fs.mkdirSync(dir, { recursive: true });
const credits = fs.existsSync(dir + '/credits.json') ? JSON.parse(fs.readFileSync(dir + '/credits.json', 'utf8')) : {};
const UA = { 'User-Agent': 'WildlensApp/1.0 (https://github.com/kevindchan7/wildlens)' };
const strip = (s) => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
let ok = 0, miss = [];
for (const s of SP) {
  const file = `${dir}/${s.id}.jpg`;
  if (fs.existsSync(file) && credits[s.id]) { ok++; continue; }
  try {
    let sum = null;
    for (const q of [s.sc, s.n]) {
      if (!q) continue;
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(q.replace(/ /g, '_'))}`, { headers: UA });
      if (r.ok) { const js = await r.json(); if (js.thumbnail) { sum = js; break; } }
    }
    if (!sum) { miss.push(s.id); continue; }
    const src = sum.thumbnail.source.replace(/\/\d+px-/, '/400px-');
    const img = await fetch(src, { headers: UA });
    if (!img.ok) { miss.push(s.id); continue; }
    fs.writeFileSync(file, Buffer.from(await img.arrayBuffer()));
    const fname = decodeURIComponent((sum.originalimage || sum.thumbnail).source.split('/').pop());
    let artist = '', lic = '';
    try {
      const m = await (await fetch(`https://commons.wikimedia.org/w/api.php?action=query&titles=File:${encodeURIComponent(fname)}&prop=imageinfo&iiprop=extmetadata&format=json`, { headers: UA })).json();
      const p = Object.values(m.query.pages)[0];
      const e = p.imageinfo && p.imageinfo[0].extmetadata || {};
      artist = strip(e.Artist && e.Artist.value); lic = strip(e.LicenseShortName && e.LicenseShortName.value);
    } catch (e) {}
    credits[s.id] = { file: fname, artist: artist.slice(0, 120), license: lic, page: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(fname)}` };
    ok++;
    await new Promise((r) => setTimeout(r, 250));
  } catch (e) { miss.push(s.id); }
}
fs.writeFileSync(dir + '/credits.json', JSON.stringify(credits, null, 1));
console.log('photos', ok, 'of', SP.length, 'missing', miss.join(' '));
