package app.wildlens.field;

import android.app.ActivityManager;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.mediapipe.framework.image.BitmapImageBuilder;
import com.google.mediapipe.tasks.genai.llminference.GraphOptions;
import com.google.mediapipe.tasks.genai.llminference.LlmInference;
import com.google.mediapipe.tasks.genai.llminference.LlmInference.LlmInferenceOptions;
import com.google.mediapipe.tasks.genai.llminference.LlmInferenceSession;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * Taylor's native brain, run with MediaPipe LLM Inference.
 * Gemma 3n E2B (sees photos, ~3.1 GB, phones with about 8 GB RAM) or Gemma 3 1B (text only,
 * ~530 MB). Streamed to private storage, resumes, SHA-256 checked when given, works offline.
 */
@CapacitorPlugin(name = "WildLlm")
public class LlmPlugin extends Plugin {
    private LlmInference llm;
    private String loadedName = null;
    private boolean vision = false;
    private volatile boolean downloading = false, loading = false, busy = false;
    private volatile long dlDone = 0, dlTotal = 0;
    private volatile String lastError = null, phase = "";

    private File dir() { File d = new File(getContext().getFilesDir(), "models"); if (!d.exists()) d.mkdirs(); return d; }
    private File file(String name) { return new File(dir(), name); }
    private static String safe(String n, String def) { return (n == null || !n.matches("[A-Za-z0-9._-]+")) ? def : n; }
    private String nameOf(PluginCall call) { return safe(call.getString("name"), "gemma3-1b-it-int4.task"); }

    private long totalRam() {
        try { ActivityManager am = (ActivityManager) getContext().getSystemService(Context.ACTIVITY_SERVICE); ActivityManager.MemoryInfo mi = new ActivityManager.MemoryInfo(); am.getMemoryInfo(mi); return mi.totalMem; }
        catch (Throwable e) { return 0; }
    }

    private boolean bundled(String name) {
        try { String[] a = getContext().getAssets().list("models"); return a != null && java.util.Arrays.asList(a).contains(name); }
        catch (Exception e) { return false; }
    }

    private JSObject state(String name) {
        File f = file(name);
        JSObject o = new JSObject();
        o.put("name", name);
        o.put("downloaded", f.exists());
        o.put("bytes", f.exists() ? f.length() : 0);
        o.put("bundled", bundled(name));
        o.put("downloading", downloading);
        o.put("phase", phase);
        o.put("done", dlDone);
        o.put("total", dlTotal);
        o.put("loading", loading);
        o.put("loaded", llm != null && name.equals(loadedName));
        o.put("loadedName", loadedName);
        o.put("vision", vision);
        o.put("error", lastError);
        File part = new File(f.getPath() + ".part");
        o.put("partial", part.exists() ? part.length() : 0);
        o.put("freeBytes", getContext().getFilesDir().getUsableSpace());
        o.put("ram", totalRam());
        String[] others = dir().list();
        o.put("files", others == null ? "" : String.join(",", others));
        return o;
    }

    @PluginMethod
    public void status(PluginCall call) { call.resolve(state(nameOf(call))); }

    private static String sha256(File f) throws Exception {
        MessageDigest md = MessageDigest.getInstance("SHA-256");
        try (InputStream in = new FileInputStream(f)) { byte[] b = new byte[1 << 20]; int n; while ((n = in.read(b)) > 0) md.update(b, 0, n); }
        StringBuilder sb = new StringBuilder(); for (byte x : md.digest()) sb.append(String.format("%02x", x)); return sb.toString();
    }

    /** download({name, urls:[...], sha256?}) tries each mirror in turn, resuming partial files. */
    @PluginMethod
    public void download(PluginCall call) {
        final String name = nameOf(call);
        final String sha = call.getString("sha256");
        String[] list;
        try { list = call.getArray("urls").toList().toArray(new String[0]); }
        catch (Exception e) { String u = call.getString("url"); list = u == null ? new String[0] : new String[]{u}; }
        final String[] urls = list;
        if (urls.length == 0) { call.reject("url missing"); return; }
        if (file(name).exists()) { call.resolve(state(name)); return; }
        if (downloading) { call.resolve(state(name)); return; }
        downloading = true; lastError = null; phase = "download";
        call.resolve(state(name));
        new Thread(() -> {
            File f = file(name);
            File part = new File(f.getPath() + ".part");
            String err = null;
            for (String url : urls) {
                HttpURLConnection c = null;
                try {
                    long have = part.exists() ? part.length() : 0;
                    String u = url;
                    for (int hop = 0; hop < 8; hop++) {
                        c = (HttpURLConnection) new URL(u).openConnection();
                        c.setInstanceFollowRedirects(false);
                        c.setConnectTimeout(20000);
                        c.setReadTimeout(60000);
                        c.setRequestProperty("User-Agent", "Wildlens-Android");
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
                    if (dlTotal > 0 && getContext().getFilesDir().getUsableSpace() < (dlTotal - have) + 200_000_000L) throw new Exception("not enough space");
                    try (InputStream in = c.getInputStream(); FileOutputStream out = new FileOutputStream(part, have > 0)) {
                        byte[] buf = new byte[1 << 16];
                        int n; long lastPing = 0;
                        while ((n = in.read(buf)) > 0) {
                            out.write(buf, 0, n);
                            dlDone += n;
                            long now = System.currentTimeMillis();
                            if (now - lastPing > 700) { lastPing = now; notifyListeners("progress", state(name)); }
                        }
                    }
                    if (dlTotal > 0 && part.length() < dlTotal) throw new Exception("incomplete");
                    if (sha != null && !sha.isEmpty()) {
                        phase = "verify"; notifyListeners("progress", state(name));
                        String got = sha256(part);
                        if (!got.equalsIgnoreCase(sha)) { part.delete(); throw new Exception("checksum mismatch"); }
                    }
                    if (!part.renameTo(f)) throw new Exception("rename failed");
                    err = null;
                    break;
                } catch (Exception e) {
                    err = String.valueOf(e.getMessage());
                } finally {
                    if (c != null) c.disconnect();
                }
            }
            downloading = false; phase = "";
            lastError = err;
            notifyListeners("progress", state(name));
        }).start();
    }

    private void unpack(String name, File f) throws Exception {
        File tmp = new File(f.getPath() + ".unpack");
        try (InputStream in = getContext().getAssets().open("models/" + name); FileOutputStream out = new FileOutputStream(tmp)) {
            byte[] buf = new byte[1 << 20]; int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
        }
        if (!tmp.renameTo(f)) throw new Exception("unpack rename failed");
    }

    /** load({name, vision}) */
    @PluginMethod
    public void load(PluginCall call) {
        final String name = nameOf(call);
        final boolean wantVision = Boolean.TRUE.equals(call.getBoolean("vision", false));
        if (llm != null && name.equals(loadedName)) { call.resolve(state(name)); return; }
        File f = file(name);
        if (!f.exists() && !bundled(name)) { call.reject("not downloaded"); return; }
        if (loading) { call.reject("busy"); return; }
        loading = true; lastError = null;
        new Thread(() -> {
            try {
                if (!f.exists()) unpack(name, f);
                if (llm != null) { try { llm.close(); } catch (Throwable ignored) {} llm = null; loadedName = null; }
                LlmInferenceOptions.Builder b = LlmInferenceOptions.builder().setModelPath(f.getAbsolutePath()).setMaxTokens(2048);
                if (wantVision) b.setMaxNumImages(1);
                llm = LlmInference.createFromOptions(getContext(), b.build());
                loadedName = name; vision = wantVision;
                loading = false;
                call.resolve(state(name));
            } catch (Throwable e) {
                loading = false;
                lastError = String.valueOf(e.getMessage());
                call.reject("load failed: " + lastError);
            }
        }).start();
    }

    /** generate({prompt, image?: base64}) streams partial text as "token" events, resolves with the full text. */
    @PluginMethod
    public void generate(PluginCall call) {
        final String prompt = call.getString("prompt", "");
        final String img = call.getString("image");
        if (llm == null) { call.reject("not loaded"); return; }
        if (busy) { call.reject("busy"); return; }
        busy = true;
        new Thread(() -> {
            LlmInferenceSession s = null;
            try {
                LlmInferenceSession.LlmInferenceSessionOptions.Builder ob = LlmInferenceSession.LlmInferenceSessionOptions.builder().setTopK(40).setTemperature(0.6f);
                if (vision) ob.setGraphOptions(GraphOptions.builder().setEnableVisionModality(true).build());
                s = LlmInferenceSession.createFromOptions(llm, ob.build());
                s.addQueryChunk(prompt);
                if (img != null && vision) {
                    byte[] bytes = Base64.decode(img, Base64.DEFAULT);
                    Bitmap bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                    if (bmp != null) {
                        int w = bmp.getWidth(), h = bmp.getHeight(), m = Math.max(w, h);
                        if (m > 768) bmp = Bitmap.createScaledBitmap(bmp, w * 768 / m, h * 768 / m, true);
                        s.addImage(new BitmapImageBuilder(bmp).build());
                    }
                }
                final StringBuilder sb = new StringBuilder();
                final LlmInferenceSession ss = s;
                s.generateResponseAsync((partial, done) -> {
                    if (partial != null) sb.append(partial);
                    JSObject o = new JSObject();
                    o.put("text", sb.toString());
                    o.put("done", done);
                    notifyListeners("token", o);
                    if (done) {
                        busy = false;
                        try { ss.close(); } catch (Throwable ignored) {}
                        JSObject r = new JSObject();
                        r.put("text", sb.toString());
                        call.resolve(r);
                    }
                });
            } catch (Throwable e) {
                busy = false;
                try { if (s != null) s.close(); } catch (Throwable ignored) {}
                call.reject("generate failed: " + e.getMessage());
            }
        }).start();
    }

    /** remove({name}) deletes one model file (and unloads it if loaded). */
    @PluginMethod
    public void remove(PluginCall call) {
        String name = nameOf(call);
        if (name.equals(loadedName)) { try { llm.close(); } catch (Throwable ignored) {} llm = null; loadedName = null; }
        File f = file(name);
        f.delete();
        new File(f.getPath() + ".part").delete();
        call.resolve(state(name));
    }
}
