package app.wildlens.field;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WildSensorsPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
