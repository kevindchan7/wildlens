/* Wildlens AI worker: runs the photo brain (CLIP) and smart search away from the screen,
   so buttons keep working while a model loads or thinks. */
const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4/dist/transformers.min.js';
let T = null;
const P = {};
async function lib() { if (!T) T = await import(LIB); return T; }
self.onmessage = async (e) => {
  const { id, op, task, model, opts, args } = e.data;
  try {
    if (op === 'load') {
      if (!P[model]) {
        const t = await lib();
        P[model] = await t.pipeline(task, model, Object.assign({}, opts || {}, {
          progress_callback: (x) => { try { self.postMessage({ id, progress: { status: x.status, file: x.file, loaded: x.loaded, total: x.total, progress: x.progress } }); } catch (err) {} }
        }));
      }
      self.postMessage({ id, ok: true });
      return;
    }
    if (op === 'run') {
      const p = P[model];
      if (!p) throw new Error('model not loaded');
      const a = (args || []).map((v) => (v instanceof Blob ? URL.createObjectURL(v) : v));
      let r;
      try { r = await p(...a); } finally { a.forEach((v, i) => { if (args[i] instanceof Blob) URL.revokeObjectURL(v); }); }
      if (r && r.data && r.dims) r = { data: r.data, dims: r.dims };
      self.postMessage({ id, ok: true, result: r });
    }
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
