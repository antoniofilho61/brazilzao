'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../utils/supabase/client'
import { useRouter } from 'next/navigation'

export default function EscutaChamadasGlobal() {
  const router = useRouter()
  const [chamada, setChamada] = useState<any>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    async function escutar() {
      const { data } = await supabase.auth.getSession()
      const userId = data.session?.user?.id
      if (!userId) return

      // Canal Pessoal Ativo em TODAS as Telas do App
      const canal = supabase
        .channel(`chamadas-pessoal-${userId}`)
        .on('broadcast', { event: 'solicitar_chamada' }, (payload) => {
          setChamada(payload.payload)
          tocarSom()
        })
        .subscribe()

      return () => {
        supabase.removeChannel(canal)
      }
    }
    escutar()
  }, [])

  function tocarSom() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([1000, 800, 1000, 800])
    }
    // Tocador simples
    intervalRef.current = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([1000, 800])
      }
    }, 2500)
  }

  function pararSom() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(0)
  }

  if (!chamada) return null

  return (
    <div style={overlayStyle}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <p style={{ color: '#00a884', fontWeight: 'bold' }}>
          RECEBENDO CHAMADA DE {chamada.tipo.toUpperCase()}
        </p>
        <h2 style={{ fontSize: 26, margin: '10px 0' }}>@{chamada.remetente?.username || chamada.remetente?.nome}</h2>
        <div style={{ display: 'flex', gap: 30, justifyContent: 'center', marginTop: 30 }}>
          <button
            onClick={() => {
              pararSom()
              setChamada(null)
            }}
            style={{ width: 64, height: 64, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 24 }}
          >
            ❌
          </button>
          <button
            onClick={() => {
              pararSom()
              const conversaId = chamada.conversaId
              setChamada(null)
              router.push(`/mensagens?para=${chamada.remetente.id}&atender=true`)
            }}
            style={{ width: 64, height: 64, borderRadius: '50%', background: '#22c55e', border: 'none', color: '#fff', fontSize: 24 }}
          >
            📞
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayStyle = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: '#111b21',
  zIndex: 999999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}