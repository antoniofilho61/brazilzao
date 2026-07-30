package com.brazilzao.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        super.onMessageReceived(remoteMessage);

        if (remoteMessage.getData().size() > 0) {
            String ehChamada = remoteMessage.getData().get("ehChamada");
            if ("true".equals(ehChamada)) {
                String remetenteNome = remoteMessage.getData().get("remetenteNome");
                String conversaId = remoteMessage.getData().get("conversaId");
                String tipo = remoteMessage.getData().get("tipo");
                dispararChamadaTelaCheia(remetenteNome, conversaId, tipo);
            }
        }
    }

    private void dispararChamadaTelaCheia(String remetenteNome, String conversaId, String tipo) {
        NotificationManager notificationManager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        String channelId = "chamadas_nativas_channel";

        Uri ringtoneUri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                    .build();

            NotificationChannel channel = new NotificationChannel(
                    channelId, "Chamadas de Entrada", NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("Acende a tela em chamadas recebidas");
            channel.setSound(ringtoneUri, audioAttributes);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 1000, 500, 1000, 500, 1000});
            if (notificationManager != null) notificationManager.createNotificationChannel(channel);
        }

        // DEEP LINK: Força o React a ler os dados da chamada!
        String uriString = "brazilzao://chamada?conversaId=" + conversaId + "&nome=" + remetenteNome + "&tipo=" + tipo;
        Intent fullScreenIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(uriString));
        fullScreenIntent.setPackage(getPackageName());
        fullScreenIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);

        // Tentativa agressiva de acender a tela por cima de tudo
        try {
            startActivity(fullScreenIntent);
        } catch (Exception e) {}

        PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(
                this, 0, fullScreenIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(android.R.drawable.stat_sys_phone_call)
                .setContentTitle("📞 Chamada Recebida!")
                .setContentText("@" + remetenteNome + " está te ligando...")
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_CALL)
                .setSound(ringtoneUri)
                .setVibrate(new long[]{0, 1000, 500, 1000, 500, 1000})
                .setAutoCancel(true)
                .setContentIntent(fullScreenPendingIntent)
                .setFullScreenIntent(fullScreenPendingIntent, true);

        if (notificationManager != null) {
            notificationManager.notify((int) System.currentTimeMillis(), builder.build());
        }
    }
}