package app.wildlens.field;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.Inet4Address;
import java.net.InetAddress;
import java.net.NetworkInterface;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Wildlens Campfire: the phone becomes a tiny web server on the local Wi-Fi or hotspot.
 * Friends scan a QR code and open the camp board in any browser: no app, no internet.
 */
@CapacitorPlugin(name = "Campfire")
public class CampfirePlugin extends Plugin {
    private static final int PORT = 7700;
    private static final int MAX_POSTS = 300;
    private ServerSocket server;
    private ExecutorService pool;
    private volatile boolean running = false;
    private String campName = "Campfire";
    private final JSONArray posts = new JSONArray();
    private final JSONArray tasks = new JSONArray();
    private final JSONObject members = new JSONObject();
    private long seq = 0;

    @PluginMethod
    public void start(PluginCall call) {
        campName = clip(call.getString("name", "Campfire"), 40);
        if (!running) {
            try {
                server = new ServerSocket(PORT);
                server.setReuseAddress(true);
                pool = Executors.newFixedThreadPool(6);
                running = true;
                new Thread(this::acceptLoop, "campfire").start();
            } catch (Exception e) {
                call.reject("Could not start the camp: " + e.getMessage());
                return;
            }
        }
        call.resolve(info());
    }

    @PluginMethod
    public void stop(PluginCall call) {
        running = false;
        try { if (server != null) server.close(); } catch (Exception ignored) {}
        if (pool != null) pool.shutdownNow();
        synchronized (this) {
            while (posts.length() > 0) posts.remove(0);
            while (tasks.length() > 0) tasks.remove(0);
            java.util.Iterator<String> it = members.keys();
            java.util.List<String> ks = new java.util.ArrayList<>();
            while (it.hasNext()) ks.add(it.next());
            for (String k : ks) members.remove(k);
        }
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) { call.resolve(info()); }

    @PluginMethod
    public void state(PluginCall call) {
        try { call.resolve(JSObject.fromJSONObject(stateJson())); } catch (Exception e) { call.reject(e.getMessage()); }
    }

    /** The host (inside the app) posts to the board. */
    @PluginMethod
    public void post(PluginCall call) {
        try {
            JSONObject o = addPost(call.getData());
            call.resolve(JSObject.fromJSONObject(o));
        } catch (Exception e) { call.reject(e.getMessage()); }
    }

    @PluginMethod
    public void task(PluginCall call) {
        try { handleTask(call.getData()); call.resolve(); } catch (Exception e) { call.reject(e.getMessage()); }
    }

    private JSObject info() {
        JSObject r = new JSObject();
        String ip = localIp();
        r.put("running", running);
        r.put("ip", ip);
        r.put("port", PORT);
        r.put("url", ip == null ? null : "http://" + ip + ":" + PORT + "/");
        r.put("name", campName);
        return r;
    }

    private void acceptLoop() {
        while (running) {
            try {
                Socket s = server.accept();
                pool.execute(() -> handle(s));
            } catch (Exception e) {
                if (!running) break;
            }
        }
    }

    private void handle(Socket s) {
        try {
            s.setSoTimeout(8000);
            InputStream in = s.getInputStream();
            BufferedReader r = new BufferedReader(new InputStreamReader(in, StandardCharsets.UTF_8));
            String line = r.readLine();
            if (line == null) { s.close(); return; }
            String[] p = line.split(" ");
            String method = p[0], path = p.length > 1 ? p[1] : "/";
            int len = 0;
            String h;
            while ((h = r.readLine()) != null && !h.isEmpty()) {
                if (h.toLowerCase().startsWith("content-length:")) len = Math.min(Integer.parseInt(h.substring(15).trim()), 20000);
            }
            char[] buf = new char[len];
            int got = 0;
            while (got < len) { int n = r.read(buf, got, len - got); if (n < 0) break; got += n; }
            String body = new String(buf, 0, got);
            String q = "";
            int qi = path.indexOf('?');
            if (qi >= 0) { q = path.substring(qi + 1); path = path.substring(0, qi); }

            OutputStream out = s.getOutputStream();
            if (method.equals("OPTIONS")) { send(out, 204, "text/plain", new byte[0]); }
            else if (path.equals("/") || path.equals("/index.html")) { send(out, 200, "text/html; charset=utf-8", asset("public/campfire.html")); }
            else if (path.equals("/api/state")) { send(out, 200, "application/json", stateJson().toString().getBytes(StandardCharsets.UTF_8)); }
            else if (path.equals("/api/post") && method.equals("POST")) { JSONObject o = addPost(new JSONObject(body)); send(out, 200, "application/json", o.toString().getBytes(StandardCharsets.UTF_8)); }
            else if (path.equals("/api/join") && method.equals("POST")) { join(new JSONObject(body)); send(out, 200, "application/json", "{}".getBytes()); }
            else if (path.equals("/api/task") && method.equals("POST")) { handleTask(new JSONObject(body)); send(out, 200, "application/json", "{}".getBytes()); }
            else if (path.equals("/icon.svg")) { send(out, 200, "image/svg+xml", asset("public/icon.svg")); }
            else { send(out, 404, "text/plain", "Not found".getBytes()); }
            s.close();
        } catch (Exception e) {
            try { s.close(); } catch (Exception ignored) {}
        }
    }

    private synchronized void join(JSONObject o) throws Exception {
        String id = clip(o.optString("id", ""), 40);
        if (id.isEmpty()) return;
        JSONObject m = new JSONObject();
        m.put("id", id);
        m.put("name", clip(o.optString("name", "?"), 30));
        m.put("emoji", clip(o.optString("emoji", "🧭"), 8));
        m.put("seen", System.currentTimeMillis());
        boolean isNew = !members.has(id);
        members.put(id, m);
        if (isNew) notifyListeners("join", JSObject.fromJSONObject(m));
    }

    private synchronized JSONObject addPost(JSONObject o) throws Exception {
        String text = clip(o.optString("text", "").trim(), 500);
        if (text.isEmpty()) throw new Exception("empty");
        JSONObject p = new JSONObject();
        p.put("n", ++seq);
        p.put("t", System.currentTimeMillis());
        p.put("from", clip(o.optString("name", "?"), 30));
        p.put("emoji", clip(o.optString("emoji", "🧭"), 8));
        p.put("id", clip(o.optString("id", ""), 40));
        p.put("text", text);
        p.put("urgent", o.optBoolean("urgent", false));
        if (o.has("lat") && o.has("lon")) { p.put("lat", o.optDouble("lat")); p.put("lon", o.optDouble("lon")); }
        posts.put(p);
        while (posts.length() > MAX_POSTS) posts.remove(0);
        if (!p.optString("id").isEmpty()) join(o);
        notifyListeners("post", JSObject.fromJSONObject(p));
        return p;
    }

    private synchronized void handleTask(JSONObject o) throws Exception {
        if (o.has("text")) {
            String t = clip(o.optString("text").trim(), 200);
            if (t.isEmpty()) return;
            JSONObject k = new JSONObject();
            k.put("k", ++seq); k.put("text", t); k.put("done", false); k.put("by", clip(o.optString("name", ""), 30));
            tasks.put(k);
        } else if (o.has("toggle")) {
            long id = o.optLong("toggle");
            for (int i = 0; i < tasks.length(); i++) {
                JSONObject k = tasks.getJSONObject(i);
                if (k.optLong("k") == id) k.put("done", !k.optBoolean("done"));
            }
        }
        notifyListeners("tasks", new JSObject());
    }

    private synchronized JSONObject stateJson() throws Exception {
        JSONObject r = new JSONObject();
        r.put("name", campName);
        r.put("posts", new JSONArray(posts.toString()));
        r.put("tasks", new JSONArray(tasks.toString()));
        JSONArray ms = new JSONArray();
        java.util.Iterator<String> it = members.keys();
        while (it.hasNext()) ms.put(members.getJSONObject(it.next()));
        r.put("members", ms);
        r.put("now", System.currentTimeMillis());
        return r;
    }

    private byte[] asset(String name) throws Exception {
        try (InputStream is = getContext().getAssets().open(name)) {
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] b = new byte[8192]; int n;
            while ((n = is.read(b)) > 0) bo.write(b, 0, n);
            return bo.toByteArray();
        }
    }

    private void send(OutputStream out, int code, String type, byte[] body) throws Exception {
        String status = code == 200 ? "OK" : code == 204 ? "No Content" : "Not Found";
        String head = "HTTP/1.1 " + code + " " + status + "\r\nContent-Type: " + type + "\r\nContent-Length: " + body.length
            + "\r\nCache-Control: no-store\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Headers: Content-Type\r\nConnection: close\r\n\r\n";
        out.write(head.getBytes(StandardCharsets.UTF_8));
        out.write(body);
        out.flush();
    }

    private static String clip(String s, int n) { if (s == null) return ""; return s.length() > n ? s.substring(0, n) : s; }

    /** Best local IPv4: hotspot or Wi-Fi interface first. */
    private static String localIp() {
        String fallback = null;
        try {
            for (NetworkInterface ni : Collections.list(NetworkInterface.getNetworkInterfaces())) {
                if (!ni.isUp() || ni.isLoopback()) continue;
                String n = ni.getName().toLowerCase();
                for (InetAddress a : Collections.list(ni.getInetAddresses())) {
                    if (!(a instanceof Inet4Address) || !a.isSiteLocalAddress()) continue;
                    String ip = a.getHostAddress();
                    if (n.startsWith("wlan") || n.startsWith("ap") || n.startsWith("swlan") || n.contains("softap")) return ip;
                    if (fallback == null && !n.startsWith("rmnet") && !n.startsWith("ccmni")) fallback = ip;
                }
            }
        } catch (Exception ignored) {}
        return fallback;
    }
}
