// Wildlens online brain: looks at a photo (or answers a question) with Google Gemini.
// The API key lives only on the server (secret GEMINI_API_KEY or the Vault). Limit: 60 requests per device per day.
// Each model gets a time limit, so a slow or overloaded Google model never blocks the user: the next one is tried.
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const J = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } });
const LANGS: Record<string, string> = { it: 'Italian', en: 'English', es: 'Spanish', fr: 'French', de: 'German' };
const URL_ = Deno.env.get('SUPABASE_URL')!, SRK = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const rpc = (fn: string, body: unknown) => fetch(`${URL_}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: SRK, Authorization: `Bearer ${SRK}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
let cachedKey: string | null = null;
async function getKey() {
  const env = Deno.env.get('GEMINI_API_KEY');
  if (env) return env;
  if (cachedKey) return cachedKey;
  try { const r = await rpc('wl_gemini_key', {}); if (r.ok) { const k = await r.json(); if (typeof k === 'string' && k) cachedKey = k; } } catch (_) {}
  return cachedKey;
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
  if (req.method !== 'POST') return J({ error: 'method' }, 405);
  const key = await getKey();
  if (!key) return J({ error: 'not_configured' }, 503);
  let body: any;
  try { body = await req.json(); } catch { return J({ error: 'bad_json' }, 400); }
  const device = String(body.device || '').slice(0, 80);
  const lang = LANGS[body.lang] || 'English';
  const image = typeof body.image === 'string' ? body.image : '';
  const question = typeof body.question === 'string' ? body.question.slice(0, 2000) : '';
  if (!image && !question) return J({ error: 'empty' }, 400);
  if (image.length > 6_000_000) return J({ error: 'too_big' }, 413);
  try { const r = await rpc('wl_ai_take', { p_device: device, p_max: 60 }); if (r.ok && (await r.json()) === false) return J({ error: 'limit' }, 429); } catch (_) {}

  const models = (Deno.env.get('GEMINI_MODEL') || 'gemini-flash-lite-latest,gemini-2.5-flash-lite,gemini-flash-latest,gemini-2.0-flash').split(',');
  const hint = typeof body.hint === 'string' && body.hint ? ` An on-device classifier suggested "${body.hint.slice(0, 200)}" (it can be wrong; trust the photo).` : '';
  const scanPrompt = `You are Taylor, an expert field guide and teacher: botanist, mycologist, zoologist, geologist, chemist, materials expert and survival instructor.${hint}
Identify exactly what the photo shows: a species when possible, otherwise the object, material, product, rock, food or structure. Then explain its essence like a great encyclopedia written for a curious hiker: what it really is, what it is made of (chemical compounds, active substances, nutrients or materials), its properties, how it forms or is made, how to recognize it, and all its uses. Be concrete and specific, no generic filler. Write everything in ${lang}.
Reply ONLY with JSON:
{"name":"common name","scientific":"scientific name, or type/material","category":"Flora, Fungi, Fauna, Minerals, Water, Materials, Structures, Body or Other","confidence":"high, medium or low","description":"3-4 sentences: what it is",
"essence":"2-3 sentences: its true nature, what makes it what it is",
"composition":["main compounds, active substances, nutrients or materials, each with a short note"],
"properties":["physical, chemical, nutritional or medicinal properties"],
"how_made":"how it grows, forms or is manufactured",
"recognize":["key features to recognize it"],
"edible":"yes, cooked, no, toxic or unknown","edible_note":"which parts and how",
"uses_kitchen":["culinary uses, if any"],"medicinal":["traditional medicinal uses"],"toxic":"toxic parts and effects, or empty",
"uses_practical":["survival and outdoor uses"],"uses_other":["crafts, industry, home, building uses"],"fire":"use for fire, or empty",
"lookalikes":["dangerous look-alikes and how to tell them apart"],"ecology":"its role in nature or environmental impact","history":"history and culture in 1-2 sentences","related":["related species or things"],
"barcode":"digits of a product barcode if one is clearly readable in the photo, else empty","origin":"where it lives or comes from","season":"when to find it, or empty","dangers":["safety warnings"],"safety":"safe, caution or danger","usefulness":0-100,"curiosity":"one surprising fact"}
Use empty strings or empty lists for fields that do not apply. Safety rules: never say a wild mushroom is safe to eat without an expert check; if confidence is not high, set edible to unknown; mention protected species.`;
  const parts: any[] = image ? [{ text: scanPrompt }, { inline_data: { mime_type: body.mime || 'image/jpeg', data: image } }] : [{ text: `You are Taylor, a friendly expert field guide, naturalist, chemist and survival instructor. Answer in ${lang}, clearly and practically, in at most 10 short sentences; when asked about a thing, explain its essence: what it is, what it is made of and its uses. For emergencies, always say to call 112. Never say a wild mushroom or plant is safe to eat without an expert.\n\nQuestion: ${question}` }];
  const cfg: any = image ? { responseMimeType: 'application/json', temperature: 0.3 } : { temperature: 0.5 };
  let last: any = null; const t0 = Date.now();
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (Date.now() - t0 > 45000) break;
      try {
        const ac = new AbortController(); const to = setTimeout(() => ac.abort(), image ? 22000 : 15000);
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model.trim()}:generateContent`, { signal: ac.signal, method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: cfg }) }).finally(() => clearTimeout(to));
        const j = await r.json();
        if (!r.ok) {
          last = { error: 'upstream', model, status: r.status, detail: j?.error?.message?.slice(0, 200) };
          if (r.status === 503 || r.status === 500) { if (attempt === 0) { await sleep(800); continue; } break; }
          if (r.status === 404 || r.status === 429 || r.status === 400) break;
          return J(last, 502);
        }
        const text = (j.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('');
        if (!text) { last = { error: 'empty', model }; break; }
        if (!image) return J({ text, model, ms: Date.now() - t0 });
        try { return J({ result: JSON.parse(text.replace(/^```json|```$/g, '').trim()), model, ms: Date.now() - t0 }); } catch { last = { error: 'parse', model }; break; }
      } catch (e) { last = { error: String(e).toLowerCase().includes('abort') ? 'timeout' : 'network', model, detail: String(e).slice(0, 200) }; break; }
    }
  }
  return J(last || { error: 'unknown' }, 502);
});
