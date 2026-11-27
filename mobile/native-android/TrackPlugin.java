package app.wildlens.field;

import android.Manifest;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;

import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;

/** Route recording with the screen off (TrackService) and sharing GPX files to other apps. */
@CapacitorPlugin(name = "WildTrack")
public class TrackPlugin extends Plugin {

    @PluginMethod
    public void start(PluginCall call) {
        Context c = getContext();
        if (ContextCompat.checkSelfPermission(c, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) { call.reject("permission"); return; }
        try {
            Intent i = new Intent(c, TrackService.class);
            i.putExtra("text", call.getString("text", "Recording your route"));
            ContextCompat.startForegroundService(c, i);
            call.resolve(new JSObject().put("ok", true));
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getContext().stopService(new Intent(getContext(), TrackService.class));
        call.resolve();
    }

    @PluginMethod
    public void read(PluginCall call) {
        int from = call.getInt("from", 0), n = 0;
        JSArray pts = new JSArray();
        File f = TrackService.file(getContext());
        if (f.exists()) {
            try (BufferedReader r = new BufferedReader(new FileReader(f))) {
                String line;
                while ((line = r.readLine()) != null) {
                    if (n++ < from) continue;
                    String[] p = line.split(",", -1);
                    if (p.length < 5) continue;
                    try {
                        JSArray a = new JSArray();
                        a.put(Double.parseDouble(p[0])); a.put(Double.parseDouble(p[1]));
                        a.put(p[2].isEmpty() ? JSONObject.NULL : Double.parseDouble(p[2]));
                        a.put(Long.parseLong(p[3])); a.put(Double.parseDouble(p[4]));
                        pts.put(a);
                    } catch (Exception ignored) {}
                }
            } catch (Exception ignored) {}
        }
        JSObject o = new JSObject();
        o.put("points", pts); o.put("total", n); o.put("running", TrackService.running);
        call.resolve(o);
    }

    /** The GPX file another app opened with Wildlens, if any (given once). */
    @PluginMethod
    public void takeShared(PluginCall call) {
        JSObject o = new JSObject();
        if (MainActivity.sharedText != null) { o.put("text", MainActivity.sharedText); o.put("name", MainActivity.sharedName); }
        MainActivity.sharedText = null; MainActivity.sharedName = null;
        call.resolve(o);
    }

    /** Safety alarm: the recorder also sends the position to the family page while the token is set. */
    @PluginMethod
    public void setTrip(PluginCall call) {
        getContext().getSharedPreferences("wltrip", Context.MODE_PRIVATE).edit().putString("token", call.getString("token", "")).apply();
        call.resolve();
    }

    @PluginMethod
    public void tripStatus(PluginCall call) {
        JSObject o = new JSObject();
        o.put("last", getContext().getSharedPreferences("wltrip", Context.MODE_PRIVATE).getLong("last", 0));
        o.put("running", TrackService.running);
        call.resolve(o);
    }

    @PluginMethod
    public void clear(PluginCall call) {
        try { TrackService.file(getContext()).delete(); } catch (Exception ignored) {}
        call.resolve();
    }

    @PluginMethod
    public void share(PluginCall call) {
        String name = call.getString("name", "wildlens.gpx"), text = call.getString("text", "");
        try {
            Context c = getContext();
            File f = new File(c.getCacheDir(), name.replaceAll("[^A-Za-z0-9._-]", "_"));
            try (FileWriter w = new FileWriter(f, false)) { w.write(text); }
            Uri u = FileProvider.getUriForFile(c, c.getPackageName() + ".fileprovider", f);
            Intent s = new Intent(Intent.ACTION_SEND);
            s.setType("application/gpx+xml");
            s.putExtra(Intent.EXTRA_STREAM, u);
            s.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            Intent ch = Intent.createChooser(s, name);
            ch.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            getActivity().startActivity(ch);
            call.resolve();
        } catch (Exception e) { call.reject(String.valueOf(e.getMessage())); }
    }
}
