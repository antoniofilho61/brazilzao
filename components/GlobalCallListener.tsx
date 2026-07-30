'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../utils/supabase/client'
import { Capacitor } from '@capacitor/core'

export default function GlobalCallListener() {
  const router = useRouter()

  useEffect(() => {
    iniciarEscutaGlobal()
  }, [])

  async function iniciarEscutaGlobal() {
    const { data: sessao } = await supabase.auth.getSession()
    const user = sessao.session?.user
    if (!user) return

    if (Capacitor.isNativePlatform()) {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')

        // 1. CRIA O CANAL DE ALTA PRIORIDADE PRIMEIRO
        await PushNotifications.createChannel({
          id: 'chamadas_channel',
          name: 'Chamadas de Voz e Vídeo',
          description: 'Notificações de chamadas recebidas',
          importance: 5, // Prioridade Máxima
          visibility: 1, // Visível na tela bloqueada
          sound: 'default',
          vibration: true
        })

        // 2. REGISTRA OS OUVINTES PRIMEIRO (OBRIGATÓRIO ESTAR ANTES DO REGISTER)
        PushNotifications.addListener('registration', async (token) => {
          if (token.value) {
            console.log('Token FCM capturado com sucesso:', token.value)
            await supabase
              .from('profiles')
              .update({ fcm_token: token.value })
              .eq('id', user.id)
          }
        })

        PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
          const data = notification.notification.data
          if (data?.conversaId || data?.link) {
            router.push(data.link || `/mensagens?para=${data.conversaId}`)
          }
        })

        // 3. SOLICITA PERMISSÃO E DISPARA O REGISTRO SÓ AGORA
        let permStatus = await PushNotifications.checkPermissions()
        if (permStatus.receive === 'prompt') {
          permStatus = await PushNotifications.requestPermissions()
        }

        if (permStatus.receive === 'granted') {
          await PushNotifications.register()
        }

      } catch (e) {
        console.error('Erro ao configurar Push Notifications:', e)
      }
    }

    // 4. ESCUTA TEMPO REAL QUANDO O APP ESTIVER ABERTO
    const canalPessoal = supabase
      .channel(`chamadas-pessoal-global-${user.id}`)
      .on('broadcast', { event: 'solicitar_chamada' }, (payload) => {
        const { remetente } = payload.payload
        router.push(`/mensagens?para=${remetente.id}`)
      })
      .subscribe()
  }

  return null
}