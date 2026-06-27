package com.familyhuddle.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;

import androidx.activity.EdgeToEdge;
import androidx.annotation.Nullable;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

import com.getcapacitor.BridgeActivity;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        registerPlugin(GoogleAuth.class);
        EdgeToEdge.enable(this);
        super.onCreate(savedInstanceState);

        // Light icons on system bars (dark icons over pale cream body bg).
        WindowInsetsControllerCompat controller =
            WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(true);
        controller.setAppearanceLightNavigationBars(true);

        // Forward system bar + cutout insets to the WebView as CSS custom
        // properties so the React app can use var(--safe-area-inset-*).
        final View root = findViewById(android.R.id.content);
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, windowInsets) -> {
            Insets bars = windowInsets.getInsets(
                WindowInsetsCompat.Type.systemBars()
                    | WindowInsetsCompat.Type.displayCutout());
            float density = getResources().getDisplayMetrics().density;
            int topDp = Math.round(bars.top / density);
            int bottomDp = Math.round(bars.bottom / density);
            int leftDp = Math.round(bars.left / density);
            int rightDp = Math.round(bars.right / density);

            WebView webView = getBridge() != null ? getBridge().getWebView() : null;
            if (webView != null) {
                final String js =
                    "(function(){var s=document.documentElement.style;" +
                    "s.setProperty('--safe-area-inset-top','" + topDp + "px');" +
                    "s.setProperty('--safe-area-inset-bottom','" + bottomDp + "px');" +
                    "s.setProperty('--safe-area-inset-left','" + leftDp + "px');" +
                    "s.setProperty('--safe-area-inset-right','" + rightDp + "px');" +
                    "})();";
                webView.post(() -> webView.evaluateJavascript(js, null));
            }
            return windowInsets;
        });
    }
}
