// Wildlens — protegge il codice pubblicato: comprime e rende illeggibile il JavaScript
// (nomi interni accorciati, commenti tolti) e compatta l'HTML. L'originale resta solo nel repo.
// Uso: node scripts/proteggi.mjs <cartella-pubblicata>
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { minify } from 'terser';

const dir = process.argv[2];
if (!dir) { console.error('cartella mancante'); process.exit(1); }
const BANNER = '/*! Wildlens © 2026 ART& CREATION LLC. All rights reserved. Unauthorized copying, modification or redistribution is prohibited. */';
// funzioni chiamate da altri file (accesso.js, voce.js): non vanno rinominate
const reserved = ['setTheme', 'applyLang', 'openIntro', 'openTay', 'closeTay', 'show', 'openTool', 'tr', 'TSPRITE', 'WLVoice', 'WL_AFTER_GATE', 'WL_ACCESS', 'NATIVE'];
const opts = { compress: { passes: 2, drop_console: false }, mangle: { reserved }, format: { comments: false, preamble: BANNER } };

const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (f.startsWith('.')) continue; statSync(p).isDirectory() ? walk(p) : files.push(p); } })(dir);

let n = 0;
for (const f of files) {
  const ext = extname(f);
  if (ext === '.js') {
    const r = await minify(readFileSync(f, 'utf8'), opts);
    writeFileSync(f, r.code); n++;
  } else if (ext === '.html') {
    let h = readFileSync(f, 'utf8');
    const parts = [];
    let last = 0;
    const re = /<script>([\s\S]*?)<\/script>/g;
    let m;
    while ((m = re.exec(h))) {
      parts.push(h.slice(last, m.index));
      const r = await minify(m[1], { ...opts, format: { comments: false } });
      parts.push('<script>' + r.code + '</script>');
      last = re.lastIndex;
    }
    parts.push(h.slice(last));
    h = parts.join('');
    // HTML: via commenti e spazi tra i tag
    h = h.replace(/<!--(?!\[if)[\s\S]*?-->/g, '').replace(/>\s*\n\s*</g, '><');
    h = h.replace(/<head>/, '<head><!-- Wildlens © 2026 ART& CREATION LLC. All rights reserved. -->');
    writeFileSync(f, h); n++;
  }
}
console.log('protetti', n, 'file');
