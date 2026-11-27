package app.wildlens.field;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;

import java.io.File;
import java.io.FileWriter;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

/**
 * Records the route with the phone GPS like a GPS watch: it keeps going with the screen off
 * and with no internet. Each point is appended to a small file on the phone; the app reads it.
 */
public class TrackService extends Service implements LocationListener {
    static volatile boolean running = false;
    private static final String CH = "wl_track";
    private LocationManager lm;
    private long lastPost = 0;
    static final String FN = "https://lrrjcpnswzlkpwqrdyyk.supabase.co/functions/v1/wl-trip";

    static File file(Context c) { return new File(c.getFilesDir(), "wl-track.csv"); }

    @Override public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String text = intent != null && intent.getStringExtra("text") != null ? intent.getStringExtra("text") : "Recording your route";
        try {
            NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
            if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CH) == null)
                nm.createNotificationChannel(new NotificationChannel(CH, "Route recording", NotificationManager.IMPORTANCE_LOW));
            Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
            PendingIntent pi = PendingIntent.getActivity(this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
            Notification no = new NotificationCompat.Builder(this, CH).setContentTitle("Wildlens").setContentText(text)
                    .setSmallIcon(getApplicationInfo().icon).setOngoing(true).setOnlyAlertOnce(true).setContentIntent(pi).build();
            if (Build.VERSION.SDK_INT >= 29) startForeground(4711, no, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
            else startForeground(4711, no);
        } catch (Exception e) { stopSelf(); return START_NOT_STICKY; }
        if (!running) {
            try {
                lm = (LocationManager) getSystemService(LOCATION_SERVICE);
                lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2000, 3f, this, Looper.getMainLooper());
                running = true;
            } catch (Exception e) { stopSelf(); return START_NOT_STICKY; }
        }
        return START_STICKY;
    }

    @Override
    public void onLocationChanged(Location l) {
        if (l.hasAccuracy() && l.getAccuracy() > 50) return;
        String alt = l.hasAltitude() ? String.format(Locale.US, "%.1f", l.getAltitude()) : "";
        String line = String.format(Locale.US, "%.7f,%.7f,%s,%d,%.1f\n", l.getLatitude(), l.getLongitude(), alt, System.currentTimeMillis(), l.hasAccuracy() ? l.getAccuracy() : 0f);
        try (FileWriter w = new FileWriter(file(this), true)) { w.write(line); } catch (Exception ignored) {}
        // safety alarm on: send the position to the family page, also with the screen off (only fresh fixes, every 4 minutes)
        final String token = getSharedPreferences("wltrip", MODE_PRIVATE).getString("token", "");
        long now = System.currentTimeMillis();
        if (token.isEmpty() || now - lastPost < 240000) return;
        lastPost = now;
        final String body = String.format(Locale.US, "{\"op\":\"ping\",\"token\":\"%s\",\"lat\":%.6f,\"lon\":%.6f,\"acc\":%.1f,\"t\":%d}", token.replaceAll("[^A-Za-z0-9_-]", ""), l.getLatitude(), l.getLongitude(), l.hasAccuracy() ? l.getAccuracy() : 0f, now);
        new Thread(() -> {
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(FN).openConnection();
                c.setConnectTimeout(10000); c.setReadTimeout(15000); c.setRequestMethod("POST"); c.setDoOutput(true);
                c.setRequestProperty("Content-Type", "application/json");
                try (OutputStream o = c.getOutputStream()) { o.write(body.getBytes(StandardCharsets.UTF_8)); }
                int code = c.getResponseCode();
                if (code == 200) getSharedPreferences("wltrip", MODE_PRIVATE).edit().putLong("last", System.currentTimeMillis()).apply();
                c.disconnect();
            } catch (Exception e) { lastPost = 0; }
        }).start();
    }

    @Override public void onStatusChanged(String p, int s, Bundle b) {}
    @Override public void onProviderEnabled(String p) {}
    @Override public void onProviderDisabled(String p) {}

    @Override
    public void onDestroy() {
        running = false;
        try { if (lm != null) lm.removeUpdates(this); } catch (Exception ignored) {}
        super.onDestroy();
    }
}
