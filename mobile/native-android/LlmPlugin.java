package app.wildlens.field;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.mediapipe.tasks.genai.llminference.LlmInference;
import com.google.mediapipe.tasks.genai.llminference.LlmInference.LlmInferenceOptions;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Taylor's native brain: a small LLM (Gemma 3 1B, int4) run with MediaPipe LLM Inference.
 * The model file is streamed straight to the app's private storage (no RAM limit like in the
 * browser), survives app updates and works with no internet once downloaded.
 */
@CapacitorPlugin(name = "WildLlm")
public class LlmPlugin extends Plugin {
    private static final String NAME = "gemma3-1b-it-int4.task";
    private LlmInference llm;
    private volatile boolean downloading = false, loading = false, busy = false;
    private volatile long dlDone = 0, dlTotal = 0;
    private volatile String lastError = null;

    private File modelFile() {
        File d = new File(getContext().getFilesDir(), "models");
        if (!d.exists()) d.mkdirs();
        return new File(d, NAME);
    }

    private JSObject state() {
        File f = modelFile();
        JSObject o = new JSObject();
        o.put("downloaded", f.exists());
        o.put("bytes", f.exists() ? f.length() : 0);
        o.put("downloading", downloading);
        o.put("done", dlDone);
        o.put("total", dlTotal);
        o.put("loading", loading);
        o.put("loaded", llm != null);
        o.put("error", lastError);
        File part = new File(f.getPath() + ".part");
        o.put("partial", part.exists() ? part.length() : 0);
        o.put("freeBytes", getContext().getFilesDir().getUsableSpace());
        return o;
    }

    @PluginMethod
    public void status(PluginCall call) { call.resolve(state()); }

    /** download({url}) streams the file to private storage; resumes a partial download. */
    @PluginMethod
    public void download(PluginCall call) {
        final String url = call.getString("url");
        if (url == null) { call.reject("url missing"); return; }
        if (modelFile().exists()) { call.resolve(state()); return; }
        if (downloading) { call.resolve(state()); return; }
        downloading = true; lastError = null;
        call.resolve(state());
        new Thread(() -> {
            File f = modelFile();
            File part = new File(f.getPath() + ".part");
            HttpURLConnection c = null;
            try {
                long have = part.exists() ? part.length() : 0;
                String u = url;
                for (int hop = 0; hop < 6; hop++) {
                    c = (HttpURLConnection) new URL(u).openConnection();
                    c.setInstanceFollowRedirects(false);
                    c.setConnectTimeout(20000);
                    c.setReadTimeout(60000);
                    if (have > 0) c.setRequestProperty("Range", "bytes=" + have + "-");
                    int code = c.getResponseCode();
                    if (code >= 300 && code < 400) { u = new URL(new URL(u), c.getHeaderField("Location")).toString(); c.disconnect(); continue; }
                    break;
                }
                int code = c.getResponseCode();
                if (code != 200 && code != 206) throw new Exception("HTTP " + code);
                if (code == 200) have = 0;
                long len = c.getContentLengthLong();
                dlTotal = len > 0 ? have + len : 0;
                dlDone = have;
                try (InputStream in = c.getInputStream(); FileOutputStream out = new FileOutputStream(part, have > 0)) {
                    byte[] buf = new byte[1 << 16];
                    int n; long lastPing = 0;
                    while ((n = in.read(buf)) > 0) {
                        out.write(buf, 0, n);
                        dlDone += n;
                        long now = System.currentTimeMillis();
                        if (now - lastPing > 500) { lastPing = now; notifyListeners("progress", state()); }
                    }
                }
                if (dlTotal > 0 && part.length() < dlTotal) throw new Exception("incomplete");
                if (!part.renameTo(f)) throw new Exception("rename failed");
                downloading = false;
                notifyListeners("progress", state());
            } catch (Exception e) {
                downloading = false;
                lastError = String.valueOf(e.getMessage());
                notifyListeners("progress", state());
            } finally {
                if (c != null) c.disconnect();
            }
        }).start();
    }

    @PluginMethod
    public void load(PluginCall call) {
        if (llm != null) { call.resolve(state()); return; }
        File f = modelFile();
        if (!f.exists()) { call.reject("not downloaded"); return; }
        loading = true; lastError = null;
        new Thread(() -> {
            try {
                LlmInferenceOptions opts = LlmInferenceOptions.builder()
                        .setModelPath(f.getAbsolutePath())
                        .setMaxTokens(1024)
                        .build();
                llm = LlmInference.createFromOptions(getContext(), opts);
                loading = false;
                call.resolve(state());
            } catch (Throwable e) {
                loading = false;
                lastError = String.valueOf(e.getMessage());
                call.reject("load failed: " + lastError);
            }
        }).start();
    }

    /** generate({prompt}) streams partial text as "token" events, resolves with the full text. */
    @PluginMethod
    public void generate(PluginCall call) {
        final String prompt = call.getString("prompt", "");
        if (llm == null) { call.reject("not loaded"); return; }
        if (busy) { call.reject("busy"); return; }
        busy = true;
        final StringBuilder sb = new StringBuilder();
        try {
            llm.generateResponseAsync(prompt, (partial, done) -> {
                if (partial != null) sb.append(partial);
                JSObject o = new JSObject();
                o.put("text", sb.toString());
                o.put("done", done);
                notifyListeners("token", o);
                if (done) {
                    busy = false;
                    JSObject r = new JSObject();
                    r.put("text", sb.toString());
                    call.resolve(r);
                }
            });
        } catch (Throwable e) {
            busy = false;
            call.reject("generate failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        try { if (llm != null) { llm.close(); llm = null; } } catch (Throwable ignored) {}
        File f = modelFile();
        f.delete();
        new File(f.getPath() + ".part").delete();
        call.resolve(state());
    }
}
