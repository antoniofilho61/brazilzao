'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'

export function useNotificacoesRealtime(
  userId: string | undefined | null,
  onNovaNotificacao: () => void
) {
  const callbackRef = useRef(onNovaNotificacao)

  useEffect(() => {
    callbackRef.current = onNovaNotificacao
  }, [onNovaNotificacao])

  useEffect(() => {
    if (!userId) return

    const nomeCanal = `notificacoes-${userId}`

    const canalExistente = supabase.getChannels().find((c) => c.topic === `realtime:${nomeCanal}`)
    if (canalExistente) {
      supabase.removeChannel(canalExistente)
    }

    const canal = supabase
      .channel(nomeCanal)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `usuario_id=eq.${userId}`
        },
        () => {
          if (callbackRef.current) {
            callbackRef.current()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canal)
    }
  }, [userId])
}