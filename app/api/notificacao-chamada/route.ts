import { NextResponse } from 'next/server'
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getMessaging } from 'firebase-admin/messaging'

const privateKey = `-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDHb0qrvpHfb5WH\nzNOePwQuxRVCX+k2CXdsTIscrEye4OYin0B67cOPucdkSyq9SN2B4MFnjSiqgYhU\nXVmKoDMgsf3hJAPEo92WBIpDSXjLcgj1v/PnH9y9mRQVKCWR9Sh1MY1tVi0cluqb\nU0ZTjYyRncrLWRitmEcLtbZcF4j3qOLL2Q+zWYDFkwVWxK2ID02WtzUzV2VcOO7R\n7Yw2gYQQH0FsNh8f0ZjziA7FUdWJeXT446WI6S3Vs7QFLpTVaBW4xBFKavuesGS0\nEMzqLYvei0pNFT/7L9d4IAcmBJlf+kHb5FsVYk/AJcmJDdokuIWJOmOCwx6bwt/Y\nbiRgaaajAgMBAAECggEAAUIhAPtnVTcRhPVUYnu4TYk9zJjpUkd2Au9qs0gdBaWa\nnh5OHFhysu3zpZzZzK7wgtjFr58S4hyGHS4nmfnPyMWGugxtn6h/BerKaolEo1f5\nWX+YDN3FGUclesqxjf2zfyXMZCO2jicfnNJGL9HFUMfjlyvdPX8n95lyaJtXaGSc\nB1aHJC+dl1c8Z74UK8flhALwq9zWCevI4LMcApQb6L3Wgm8XMEIKI1D6mbz1FG87\nKnKe/l/I0FcNmR8TQ71Ke55J/YacYB4u0abX2l4QTgMhMP6BjFSz68yRQ5T63hGC\nByuaksv8eyAvyXRDAQU1JX7XL2fA29LEFfgVXlppgQKBgQD8TNv/j0r7Fi9CwRsm\nnV+rhanENQzxb1L6IN+LvENfcOQiqn6GQdXbzfDwEYKoqLAUqzA+LmM8uoWmyh7p\niV1Qilfa0SJxwINALxlv1E22ERoSuxp9GDkKBFDin636fld0vr1bh/z0kHWDjOfa\n/8I4GerlnEcL8HYnPgp4BRCcgQKBgQDKW/lcd8lSBFBqYB6XaPETHDlI36P5fjAQ\nQGKwfx8yBnfyUoacrO7NVTBmYlxxqmwjhT4enJhmCjyjkLMu+LzvVi/IYz4TKujF\nR5MQzhwXYXLyxdy1XgK4F5HP7KY0/AZq4BbAJ9Nii9TayuZBNskBKL2Up678VXn4\n2DHvkafBIwKBgQCKJNtgtujrSl5eQrXHEuxLUkh+Mj4ABGB+rHk6Xb7WB04i3Q+i\nG3IphD2kdTIBfzvKVWF46pVTrx13EbyTSq9ZZiZsnY4qkqpK/n8DCE/0nLCWCPSc\nAiNZJLvVGnF8cqkYN0gfUfpjPqXZfdGFy/xgE3DWgBc2pldLbWD2Dm/mAQKBgQDB\nhnxQJm7udRnC4fHfs4j6Ub+nJdpXvIqSwEChsrFO0kjcAniiVfB7hsEm6WKngeix\nf7gM5o4I6Dld5AC5J0DpU2+XIPI4uoyqPu0y4SqUYang68FL4oCPNltIknXRrkUk\n6PJZCr1qPXhvViQmshJBfYjxJfx/be+cQIZhKtdYKQKBgQC+/WQdHZwjQDX5MnO8\noOXTfX/KHVleu4p3kDMGheUi+TvnZfFJ58MhVZV8z7QASBp36JBt37jpqhoQypKO\nGgY5HTQjvMeTBH6BAxaNYuYr506HOLyOuBy8ZZzEfQx0XbyfASmWk5PKuWS36rZW\nkldTcbuM0AUO39fFdPp91TQ2Vg==\n-----END PRIVATE KEY-----\n`

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: "brazilzao-7e4af",
      clientEmail: "firebase-adminsdk-fbsvc@brazilzao-7e4af.iam.gserviceaccount.com",
      privateKey: privateKey.replace(/\\n/g, '\n')
    })
  })
}

// RESPOSTA PARA VERIFICAÇÃO PREFLIGHT DO NAVEGADOR E CELULAR (CORS)
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(req: Request) {
  try {
    const { token, remetenteNome, tipo, conversaId } = await req.json()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token FCM ausente' },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      )
    }

    const message = {
      token: token,
      notification: {
        title: `📞 Chamada de ${tipo === 'video' ? 'Vídeo' : 'Áudio'} Recebida!`,
        body: `@${remetenteNome} está te ligando no Papo BR...`
      },
      data: {
        conversaId: String(conversaId || ''),
        tipo: String(tipo || ''),
        link: `/mensagens?para=${conversaId}`
      },
      android: {
        priority: 'high' as const,
        notification: {
          sound: 'ringtone', // Mudado de 'default' para 'ringtone'
          priority: 'max' as const,
          channelId: 'chamadas_channel',
          visibility: 'public' as const,
          defaultSound: false,
          defaultVibrateTimings: true
        }
      }
    }

    await getMessaging().send(message)

    return NextResponse.json(
      { success: true },
      {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    )
  } catch (error: any) {
    console.error('Erro ao enviar Push FCM:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }
    )
  }
}