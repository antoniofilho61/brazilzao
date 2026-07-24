'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'

type Notificacao = {
  id: string
  tipo: string
  mensagem: string
  link: string | null
  lida: boolean
  created_at: string
  remetente?: {
    id: string
    nome: string | null
    foto_url: string | null
  } | null
}

export default function Notificacoes() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [naoLidasCount, setNaoLidasCount] = useState(0)

  function tocarSom() {
    try {
      const som = new Audio('/notificacao.mp3')
      som.play().catch((e) => console.log('Áudio bloqueado pelo navegador:', e.message))
    } catch (error) {}
  }

  useEffect(() => {
    carregarNotificacoes()

    let canal: any = null

    async function inicializarRealtime() {
      const { data: sessao } = await supabase.auth.getSession()
      const userId = sessao.session?.user?.id
      if (!userId) return

      // Inscreve no canal garantindo que os eventos foram definidos ANTES da conexão ser finalizada
      canal = supabase
        .channel(`notificacoes-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `usuario_id=eq.${userId}`
          },
          () => {
            tocarSom()
            carregarNotificacoes()
          }
        )

      // Registra o subscribe de forma limpa
      await canal.subscribe()
    }

    inicializarRealtime()

    return () => {
      if (canal) {
        supabase.removeChannel(canal)
      }
    }
  }, [])

  async function carregarNotificacoes() {
    try {
      const { data: sessao } = await supabase.auth.getSession()
      if (!sessao.session?.user) {
        router.replace('/login')
        return
      }

      const meuId = sessao.session.user.id

      // 1. Limpa notificações antigas (+7 dias)
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - 7)

      await supabase
        .from('notifications')
        .delete()
        .eq('usuario_id', meuId)
        .lt('created_at', dataLimite.toISOString())

      // 2. Busca até 15 recentes
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('usuario_id', meuId)
        .order('created_at', { ascending: false })
        .limit(15)

      if (error) throw error

      const listaBase = data ?? []
      const countNaoLidas = listaBase.filter((n) => !n.lida).length
      setNaoLidasCount(countNaoLidas)

      if (countNaoLidas > 0) {
        tocarSom()
      }

      // 3. Busca fotos dos remetentes
      const remetentesIds = Array.from(new Set(listaBase.map((n) => n.remetente_id).filter(Boolean)))
      let mapaRemetentes: Record<string, any> = {}

      if (remetentesIds.length > 0) {
        const { data: remetentes } = await supabase
          .from('profiles')
          .select('id, nome, foto_url')
          .in('id', remetentesIds)

        mapaRemetentes = (remetentes ?? []).reduce((acc: any, item) => {
          acc[item.id] = item
          return acc
        }, {})
      }

      const formatadas = listaBase.map((item) => ({
        ...item,
        remetente: item.remetente_id ? mapaRemetentes[item.remetente_id] : null
      }))

      setNotificacoes(formatadas)

      // 4. Marca como lidas no banco
      if (countNaoLidas > 0) {
        await supabase
          .from('notifications')
          .update({ lida: true })
          .eq('usuario_id', meuId)
          .eq('lida', false)
      }
    } catch (err) {
      console.error('Erro ao carregar notificações:', err)
    } finally {
      setCarregando(false)
    }
  }

  function formatarTempo(dataIso: string) {
    const data = new Date(dataIso)
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (carregando) {
    return (
      <main style={page}>
        <div style={carregandoBox}>Carregando notificações...</div>
      </main>
    )
  }

  return (
    <main style={page}>
      <header style={topo}>
        <button style={botaoVoltar} onClick={() => router.push('/feed')}>
          ←
        </button>
        <h1 style={tituloHeader}>Notificações ({naoLidasCount})</h1>
      </header>

      <section style={container}>
        {notificacoes.length === 0 ? (
          <div style={boxVazio}>
            <span style={{ fontSize: 48 }}>🔔</span>
            <p style={{ marginTop: 12, color: '#666' }}>
              Você não tem nenhuma notificação
            </p>
          </div>
        ) : (
          <div style={lista}>
            {notificacoes.map((item) => (
              <div
                key={item.id}
                style={{
                  ...cardNotificacao,
                  background: item.lida ? '#fff' : '#EAF7EC'
                }}
                onClick={() => router.push(item.link || '/feed')}
              >
                <div
                  style={avatar}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (item.remetente?.id) {
                      router.push(`/perfil?id=${item.remetente.id}`)
                    }
                  }}
                >
                  {item.remetente?.foto_url ? (
                    <img src={item.remetente.foto_url} alt="" style={fotoAvatar} />
                  ) : (
                    item.remetente?.nome?.charAt(0).toUpperCase() || '👤'
                  )}
                </div>

                <div style={conteudoTextual}>
                  <p style={textoMensagem}>{item.mensagem}</p>
                  <span style={tempo}>{formatarTempo(item.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

// Estilos inline
const page = { minHeight: '100vh', background: '#f2f2f2', fontFamily: 'Arial, sans-serif' }
const carregandoBox = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008C3A', fontWeight: 900 }
const topo = { background: '#008C3A', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }
const botaoVoltar = { background: 'none', border: 'none', color: '#fff', fontSize: 20, cursor: 'pointer', fontWeight: 900 }
const tituloHeader = { margin: 0, fontSize: 18, fontWeight: 900 }
const container = { maxWidth: 500, margin: '0 auto', padding: 12 }
const boxVazio = { background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center' as const, marginTop: 20 }
const lista = { display: 'flex', flexDirection: 'column' as const, gap: 8 }
const cardNotificacao = { display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, cursor: 'pointer', border: '1px solid #e2e8f0' }
const avatar = { width: 40, height: 40, borderRadius: '50%', background: '#FFD700', color: '#008C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, overflow: 'hidden', flexShrink: 0 }
const fotoAvatar = { width: '100%', height: '100%', objectFit: 'cover' as const }
const conteudoTextual = { display: 'flex', flexDirection: 'column' as const, gap: 2 }
const textoMensagem = { margin: 0, fontSize: 14, color: '#111', lineHeight: 1.3 }
const tempo = { fontSize: 11, color: '#777' }