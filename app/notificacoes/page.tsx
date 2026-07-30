'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { useNotificacoesRealtime } from './useNotificacoesRealtime'

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
  const [meuUserId, setMeuUserId] = useState<string | null>(null)

  function tocarSom() {
    try {
      const som = new Audio('/notificacao.mp3')
      som.play().catch((e) => console.log('Áudio bloqueado pelo navegador:', e.message))
    } catch (error) {}
  }

  const carregarNotificacoes = useCallback(async () => {
    try {
      const { data: sessao } = await supabase.auth.getSession()
      if (!sessao.session?.user) {
        router.replace('/login')
        return
      }

      const meuId = sessao.session.user.id
      setMeuUserId(meuId)

      // 1. Limpa notificações antigas (+7 dias)
      const dataLimite = new Date()
      dataLimite.setDate(dataLimite.getDate() - 7)
      await supabase
        .from('notifications')
        .delete()
        .eq('usuario_id', meuId)
        .lt('created_at', dataLimite.toISOString())

      // 2. Busca até 20 mais recentes
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('usuario_id', meuId)
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      const listaBase = data ?? []
      const countNaoLidas = listaBase.filter((n) => !n.lida).length
      setNaoLidasCount(countNaoLidas)

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

      // 4. Marca como lidas no banco de dados
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
  }, [router])

  useEffect(() => {
    carregarNotificacoes()
  }, [carregarNotificacoes])

  // Usando o Hook Isolado para Notificações Realtime
  useNotificacoesRealtime(meuUserId, () => {
    tocarSom()
    carregarNotificacoes()
  })

  function formatarTempo(dataIso: string) {
    const data = new Date(dataIso)
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const obterIconeNotificacao = (tipo?: string) => {
    if (!tipo) return '🔔'
    if (tipo.includes('venda') || tipo.includes('pagamento')) return '💰'
    if (tipo.includes('mensagem') || tipo.includes('chat')) return '💬'
    if (tipo.includes('seguidor')) return '👤'
    return '🔔'
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
      <header style={headerVendasBR}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={botaoVoltar} onClick={() => router.back()}>
            ←
          </button>
          <div style={logoBR}>BR</div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 20, fontWeight: '900', color: '#008C3A', letterSpacing: '-0.5px' }}>
            NOTIFICAÇÕ<span style={{ fontSize: 16, margin: '0 -1px' }}>🍃</span>S {naoLidasCount > 0 && `(${naoLidasCount})`}
          </div>
        </div>
      </header>

      <section style={container}>
        {notificacoes.length === 0 ? (
          <div style={boxVazio}>
            <span style={{ fontSize: 48 }}>🔕</span>
            <strong style={{ fontSize: 16, color: '#111', display: 'block', marginTop: 10 }}>Nenhuma notificação por aqui</strong>
            <p style={{ marginTop: 6, color: '#666', fontSize: 13, lineHeight: '1.4' }}>
              Avisos sobre vendas, mensagens e atividades da sua conta aparecerão aqui.
            </p>
          </div>
        ) : (
          <div style={lista}>
            {notificacoes.map((item) => (
              <div
                key={item.id}
                style={{
                  ...cardNotificacao,
                  background: item.lida ? '#ffffff' : '#f0fdf4',
                  borderColor: item.lida ? '#e5e7eb' : '#bbf7d0'
                }}
                onClick={() => router.push(item.link || '/vendas')}
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
                    <span>{obterIconeNotificacao(item.tipo)}</span>
                  )}
                </div>
                <div style={conteudoTextual}>
                  <p style={{ ...textoMensagem, fontWeight: item.lida ? '500' : '800' }}>{item.mensagem}</p>
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

// ESTILOS INLINE ATUALIZADOS
const page = { minHeight: '100vh', background: '#f4f5f7', fontFamily: 'Arial, sans-serif', maxWidth: 500, margin: '0 auto' }
const carregandoBox = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008C3A', fontWeight: 900 }
const headerVendasBR = { padding: '14px 16px', background: '#ffffff', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const logoBR = { width: 34, height: 34, borderRadius: '50%', background: '#fff', border: '3px solid #008C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFD700', fontWeight: '900' as const, fontSize: 14, boxShadow: '0 0 0 1px #FFD700' }
const botaoVoltar = { background: 'none', border: 'none', color: '#111', fontSize: 24, cursor: 'pointer', fontWeight: 900, paddingRight: 4 }
const container = { padding: 14 }
const boxVazio = { background: '#fff', borderRadius: 16, padding: 32, textAlign: 'center' as const, marginTop: 20, border: '1px solid #e5e7eb' }
const lista = { display: 'flex', flexDirection: 'column' as const, gap: 10 }
const cardNotificacao = { display: 'flex', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, cursor: 'pointer', border: '1px solid' }
const avatar = { width: 44, height: 44, borderRadius: '50%', background: '#e6f4ea', color: '#008C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, overflow: 'hidden', flexShrink: 0, fontSize: 20 }
const fotoAvatar = { width: '100%', height: '100%', objectFit: 'cover' as const }
const conteudoTextual = { display: 'flex', flexDirection: 'column' as const, gap: 4, flex: 1 }
const textoMensagem = { margin: 0, fontSize: 13, color: '#111', lineHeight: 1.4 }
const tempo = { fontSize: 11, color: '#888' }