package com.brazilzao.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.ValueCallback;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private ValueCallback<Uri[]> filePathCallback;
    private final static int FILECHOOSER_RESULTCODE = 1;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        if (this.bridge != null && this.bridge.getWebView() != null) {
            this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
                // 1. Libera as permissões de áudio e mídia nativas
                @Override
                public void onPermissionRequest(final PermissionRequest request) {
                    runOnUiThread(() -> request.grant(request.getResources()));
                }

                // 2. Libera a abertura da Galeria e de Arquivos
                @Override
                public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallbackListener, FileChooserParams fileChooserParams) {
                    if (filePathCallback != null) {
                        filePathCallback.onReceiveValue(null);
                    }
                    filePathCallback = filePathCallbackListener;

                    Intent intent = fileChooserParams.createIntent();
                    try {
                        startActivityForResult(intent, FILECHOOSER_RESULTCODE);
                    } catch (Exception e) {
                        filePathCallback = null;
                        return false;
                    }
                    return true;
                }
            });
        }
    }

    // 3. Recebe o arquivo/foto selecionado e devolve para a página web
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (filePathCallback == null) return;
            filePathCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data));
            filePathCallback = null;
        }
    }
}