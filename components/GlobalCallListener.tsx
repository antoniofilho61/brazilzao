'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'

export default function GlobalCallListener() {
  const router = useRouter()
  const [chamadaRecebida, setChamadaRecebida] = useState<any>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    let canal: any = null
    let appListener: any = null

    async function escutarChamadasGlobais() {
      const { data: sessao } = await supabase.auth.getSession()
      const meuId = sessao.session?.user?.id
      if (!meuId) return

      canal = supabase
        .channel(`chamadas-pessoal-${meuId}`)
        .on('broadcast', { event: 'solicitar_chamada' }, (payload) => {
          const { remetente, tipo, conversaId } = payload.payload
          setChamadaRecebida({ remetente, tipo, conversaId })
          tocarSomEVibracao()
        })
        .subscribe()
    }

    async function configurarDeepLink() {
      // Importa dinamicamente para não travar o servidor do Next.js
      if (typeof window !== 'undefined') {
        const { App } = await import('@capacitor/app')
        appListener = await App.addListener('appUrlOpen', (event) => {
          if (event.url.includes('brazilzao://chamada')) {
            const url = new URL(event.url)
            const conversaIdUrl = url.searchParams.get('conversaId')
            const nomeUrl = url.searchParams.get('nome')
            const tipoUrl = url.searchParams.get('tipo')

            if (conversaIdUrl) {
              setChamadaRecebida({
                remetente: { id: conversaIdUrl, nome: nomeUrl },
                tipo: tipoUrl,
                conversaId: conversaIdUrl
              })
              tocarSomEVibracao()
            }
          }
        })
      }
    }

    escutarChamadasGlobais()
    configurarDeepLink()

    return () => {
      if (canal) supabase.removeChannel(canal)
      if (appListener) appListener.remove() // Limpa o evento ao sair
      pararSomEVibracao()
    }
  }, [])

  function iniciarAudioContext() {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
        if (AudioCtx) audioCtxRef.current = new AudioCtx()
      }
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume()
      }
    } catch (e) {}
  }

  function tocarSomEVibracao() {
    pararSomEVibracao()
    iniciarAudioContext()

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([1000, 800, 1000, 800, 1000, 800, 1000, 800])
    }

    const ctx = audioCtxRef.current
    const tocarCampainha = () => {
      if (!ctx || ctx.state === 'closed') return
      try {
        const agora = ctx.currentTime
        const osc1 = ctx.createOscillator()
        const osc2 = ctx.createOscillator()
        const gain = ctx.createGain()

        osc1.type = 'sine'
        osc2.type = 'sine'
        osc1.frequency.setValueAtTime(440, agora)
        osc2.frequency.setValueAtTime(480, agora)

        gain.gain.setValueAtTime(0, agora)
        gain.gain.linearRampToValueAtTime(0.3, agora + 0.1)
        gain.gain.setValueAtTime(0.3, agora + 1.8)
        gain.gain.linearRampToValueAtTime(0, agora + 2.0)

        osc1.connect(gain)
        osc2.connect(gain)
        gain.connect(ctx.destination)

        osc1.start(agora)
        osc2.start(agora)
        osc1.stop(agora + 2.0)
        osc2.stop(agora + 2.0)
      } catch (e) {}
    }

    tocarCampainha()
    ringtoneIntervalRef.current = setInterval(tocarCampainha, 3000)
  }

  function pararSomEVibracao() {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current)
      ringtoneIntervalRef.current = null
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0)
    }
  }

  function aceitarChamada() {
    pararSomEVibracao()
    const target = `/mensagens?para=${chamadaRecebida.remetente.id}&atender=true`
    setChamadaRecebida(null)
    router.push(target)
  }

  function recusarChamada() {
    pararSomEVibracao()
    setChamadaRecebida(null)
  }

  if (!chamadaRecebida) return null

  return (
    <div style={overlayFull}>
      <div style={{ textAlign: 'center', color: '#fff', padding: 20 }}>
        <span style={{ fontSize: 13, color: '#00a884', fontWeight: 'bold', textTransform: 'uppercase' }}>
          📞 Chamada de {chamadaRecebida.tipo === 'video' ? 'Vídeo' : 'Áudio'} Recebida
        </span>

        <div style={avatarBox}>
          {chamadaRecebida.remetente?.foto_url ? (
            <img src={chamadaRecebida.remetente.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontSize: 44, color: '#fff' }}>
              {chamadaRecebida.remetente?.nome?.charAt(0).toUpperCase() || 'U'}
            </span>
          )}
        </div>

        <h2 style={{ fontSize: 26, margin: '12px 0 4px 0', fontWeight: 'bold' }}>
          @{chamadaRecebida.remetente?.username || chamadaRecebida.remetente?.nome}
        </h2>
        <p style={{ fontSize: 14, color: '#FFD700', margin: 0, fontWeight: 'bold' }}>
          Papo BR - Conexão Direta
        </p>

        <div style={{ display: 'flex', gap: 40, justifyContent: 'center', marginTop: 40 }}>
          <button onClick={recusarChamada} style={{ width: 68, height: 68, borderRadius: '50%', backgroundColor: '#ef4444', border: 'none', color: '#fff', fontSize: 26, cursor: 'pointer', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}>
            ❌
          </button>
          <button onClick={aceitarChamada} style={{ width: 68, height: 68, borderRadius: '50%', backgroundColor: '#22c55e', border: 'none', color: '#fff', fontSize: 26, cursor: 'pointer', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.4)' }}>
            📞
          </button>
        </div>
      </div>
    </div>
  )
}

const overlayFull = {
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

const avatarBox = {
  width: 120,
  height: 120,
  borderRadius: '50%',
  background: '#008C3A',
  margin: '24px auto',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 0 35px rgba(0, 168, 132, 0.4)'
}