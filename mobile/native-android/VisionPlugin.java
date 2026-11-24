package app.wildlens.field;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import com.google.mediapipe.framework.image.BitmapImageBuilder;
import com.google.mediapipe.framework.image.MPImage;
import com.google.mediapipe.tasks.components.containers.Category;
import com.google.mediapipe.tasks.core.BaseOptions;
import com.google.mediapipe.tasks.vision.imageclassifier.ImageClassifier;
import com.google.mediapipe.tasks.vision.imageclassifier.ImageClassifierResult;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Photo recognition built into the app (no download): small TFLite classifiers run with
 * MediaPipe. "general" = everyday objects and animals, plus optional plants, birds and insects
 * specialists (iNaturalist-trained AIY models) when they were bundled at build time.
 */
@CapacitorPlugin(name = "WildVision")
public class VisionPlugin extends Plugin {
    private final Map<String, ImageClassifier> cls = new HashMap<>();
    private static final List<String> NAMES = Arrays.asList("general", "plants", "birds", "insects");

    private boolean has(String n) {
        try { String[] a = getContext().getAssets().list("models"); return a != null && Arrays.asList(a).contains(n + ".tflite"); }
        catch (Exception e) { return false; }
    }

    private ImageClassifier get(String n) {
        ImageClassifier c = cls.get(n);
        if (c != null) return c;
        ImageClassifier.ImageClassifierOptions o = ImageClassifier.ImageClassifierOptions.builder()
                .setBaseOptions(BaseOptions.builder().setModelAssetPath("models/" + n + ".tflite").build())
                .setMaxResults(5)
                .build();
        c = ImageClassifier.createFromOptions(getContext(), o);
        cls.put(n, c);
        return c;
    }

    @PluginMethod
    public void models(PluginCall call) {
        JSArray a = new JSArray();
        for (String n : NAMES) if (has(n)) a.put(n);
        JSObject r = new JSObject();
        r.put("models", a);
        call.resolve(r);
    }

    /** classify({image: base64 jpeg/png (no prefix)}) → {results:{general:[{label,score}],plants:[...],...}} */
    @PluginMethod
    public void classify(PluginCall call) {
        final String b64 = call.getString("image");
        if (b64 == null) { call.reject("image missing"); return; }
        new Thread(() -> {
            try {
                byte[] bytes = Base64.decode(b64, Base64.DEFAULT);
                Bitmap bmp = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
                if (bmp == null) throw new Exception("bad image");
                MPImage img = new BitmapImageBuilder(bmp).build();
                JSObject res = new JSObject();
                for (String n : NAMES) {
                    if (!has(n)) continue;
                    try {
                        ImageClassifierResult r = get(n).classify(img);
                        JSArray arr = new JSArray();
                        if (!r.classificationResult().classifications().isEmpty()) {
                            for (Category c : r.classificationResult().classifications().get(0).categories()) {
                                JSObject o = new JSObject();
                                String dn = c.displayName();
                                o.put("label", c.categoryName());
                                o.put("name", dn != null && !dn.isEmpty() ? dn : c.categoryName());
                                o.put("score", c.score());
                                arr.put(o);
                            }
                        }
                        res.put(n, arr);
                    } catch (Throwable e) {
                        res.put(n + "Error", String.valueOf(e.getMessage()));
                    }
                }
                JSObject out = new JSObject();
                out.put("results", res);
                call.resolve(out);
            } catch (Throwable e) {
                call.reject("classify failed: " + e.getMessage());
            }
        }).start();
    }
}
