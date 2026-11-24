package app.wildlens.field;

import android.Manifest;
import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** Wildlens: barometer (TYPE_PRESSURE) and step counter (TYPE_STEP_COUNTER). */
@CapacitorPlugin(name = "WildSensors", permissions = {
    @Permission(alias = "activity", strings = { Manifest.permission.ACTIVITY_RECOGNITION })
})
public class WildSensorsPlugin extends Plugin implements SensorEventListener {
    private SensorManager sm;
    private Sensor pressure, steps;

    @Override
    public void load() {
        sm = (SensorManager) getContext().getSystemService(Context.SENSOR_SERVICE);
        if (sm != null) {
            pressure = sm.getDefaultSensor(Sensor.TYPE_PRESSURE);
            steps = sm.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
        }
    }

    @PluginMethod
    public void available(PluginCall call) {
        JSObject r = new JSObject();
        r.put("pressure", pressure != null);
        r.put("steps", steps != null);
        call.resolve(r);
    }

    @PluginMethod
    public void startPressure(PluginCall call) {
        if (pressure == null) { call.reject("no pressure sensor"); return; }
        sm.registerListener(this, pressure, SensorManager.SENSOR_DELAY_NORMAL);
        call.resolve();
    }

    @PluginMethod
    public void stopPressure(PluginCall call) {
        if (pressure != null) sm.unregisterListener(this, pressure);
        call.resolve();
    }

    @PluginMethod
    public void startSteps(PluginCall call) {
        if (steps == null) { call.reject("no step sensor"); return; }
        if (Build.VERSION.SDK_INT >= 29 && getPermissionState("activity") != PermissionState.GRANTED) {
            requestPermissionForAlias("activity", call, "stepsPermission");
            return;
        }
        sm.registerListener(this, steps, SensorManager.SENSOR_DELAY_UI);
        call.resolve();
    }

    @PermissionCallback
    private void stepsPermission(PluginCall call) {
        if (getPermissionState("activity") == PermissionState.GRANTED) {
            sm.registerListener(this, steps, SensorManager.SENSOR_DELAY_UI);
            call.resolve();
        } else {
            call.reject("permission denied");
        }
    }

    @PluginMethod
    public void stopSteps(PluginCall call) {
        if (steps != null) sm.unregisterListener(this, steps);
        call.resolve();
    }

    @Override
    public void onSensorChanged(SensorEvent e) {
        JSObject o = new JSObject();
        if (e.sensor.getType() == Sensor.TYPE_PRESSURE) {
            o.put("hPa", e.values[0]);
            notifyListeners("pressure", o);
        } else if (e.sensor.getType() == Sensor.TYPE_STEP_COUNTER) {
            o.put("total", e.values[0]);
            notifyListeners("steps", o);
        }
    }

    @Override
    public void onAccuracyChanged(Sensor s, int accuracy) {}

    @Override
    protected void handleOnDestroy() {
        if (sm != null) sm.unregisterListener(this);
    }
}
