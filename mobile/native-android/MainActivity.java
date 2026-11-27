package app.wildlens.field;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Bundle;
import android.provider.OpenableColumns;

import com.getcapacitor.BridgeActivity;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

public class MainActivity extends BridgeActivity {
    /** A GPX file opened or shared from another app (WhatsApp, Files, Garmin Connect), waiting for the web app. */
    static volatile String sharedText = null, sharedName = null;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WildSensorsPlugin.class);
        registerPlugin(CampfirePlugin.class);
        registerPlugin(LlmPlugin.class);
        registerPlugin(VisionPlugin.class);
        registerPlugin(TrackPlugin.class);
        super.onCreate(savedInstanceState);
        take(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        if (take(intent)) {
            try { getBridge().triggerWindowJSEvent("wlgpx"); } catch (Exception ignored) {}
        }
    }

    private boolean take(Intent in) {
        if (in == null) return false;
        Uri u = null;
        try {
            if (Intent.ACTION_VIEW.equals(in.getAction())) u = in.getData();
            else if (Intent.ACTION_SEND.equals(in.getAction())) u = in.getParcelableExtra(Intent.EXTRA_STREAM);
        } catch (Exception ignored) {}
        if (u == null) return false;
        String name = "track.gpx";
        try (Cursor c = getContentResolver().query(u, null, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                int i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME);
                if (i >= 0 && c.getString(i) != null) name = c.getString(i);
            }
        } catch (Exception ignored) {}
        try (InputStream is = getContentResolver().openInputStream(u)) {
            if (is == null) return false;
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] b = new byte[65536];
            int n, tot = 0;
            while ((n = is.read(b)) > 0) { tot += n; if (tot > 15_000_000) return false; bo.write(b, 0, n); }
            sharedText = bo.toString("UTF-8");
            sharedName = name;
            in.setAction(Intent.ACTION_MAIN);
            return true;
        } catch (Exception e) { return false; }
    }
}
