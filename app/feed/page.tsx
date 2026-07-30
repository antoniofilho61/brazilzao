'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { Card } from '@/components/ui/Card'
import CorreEditorModal from '@/components/CorreEditorModal'
import CriarPostArea from '@/components/CriarPostArea'
import { PostCard } from '@/components/PostCard'
import CameraModal from '@/components/CameraModal'
import { useNotificacoesRealtime } from '../notificacoes/useNotificacoesRealtime'

export function formatarDataPost(dataString?: string) {
  if (!dataString) return 'Agora'
  const dataPost = new Date(dataString)
  if (isNaN(dataPost.getTime())) return 'Agora'
  const hora = dataPost.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const data = dataPost.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${hora} - ${data}`
}

export type Comentario = {
  id?: string
  texto: string
  autor?: AutorPost | null
  reacoes?: Record<string, string>
  respostas?: Comentario[]
}

export type Post = {
  id?: string
  usuario_id?: string | null
  texto: string
  autor: AutorPost | null
  midiaUrl?: string | null
  reacoes?: Record<string, string>
  comentarios: Comentario[]
  visibilidade?: string
  localizacao?: string
  tipoConta?: string
  tempo?: string
  espalhado?: boolean
  espalhadosCount?: number
  espalhadoPor?: string | null
  viewsCount?: number
}

export type Usuario = {
  id: string
  nome: string
  tipo_perfil: string | null
  foto_url?: string | null
  cidade?: string | null
  estado?: string | null
}

export type AutorPost = {
  id: string
  nome: string
  username?: string
  avatar: string
  foto_url?: string | null
}

const REACOES_LISTA = [
  { emoji: '🤙', label: 'Salve' },
  { emoji: '❤️', label: 'Amei' },
  { emoji: '😂', label: 'Riso' },
  { emoji: '😮', label: 'Chocado' },
  { emoji: '😢', label: 'Triste' },
  { emoji: '🔥', label: 'Fogo' }
]

export default function Feed() {
  const router = useRouter()
  const [verificandoLogin, setVerificandoLogin] = useState(true)
  const [usuarioAtual, setUsuarioAtual] = useState<Usuario | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0)
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0)
  const [comentarioTextoCorre, setComentarioTextoCorre] = useState('')
  const correFileInputRef = useRef<HTMLInputElement>(null)
  const correCameraInputRef = useRef<HTMLInputElement>(null)
  const [puxando, setPuxando] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  const startY = useRef(0)
  const pullDistance = useRef(0)

  // Estados da Câmera e Modais
  const [cameraAberta, setCameraAberta] = useState(false)
  const [filtroAplicado, setFiltroAplicado] = useState<string>('none')
  const [modalEscolhaCorre, setModalEscolhaCorre] = useState(false)
  const [midiaCorreTemp, setMidiaCorreTemp] = useState<File | null>(null)
  const [corresVistosMap, setCorresVistosMap] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const salvos = localStorage.getItem('brazilzao_corres_vistos_v2')
      return salvos ? JSON.parse(salvos) : {}
    }
    return {}
  })

  const [listaCorres, setListaCorres] = useState<any[]>([])
  const [correAberto, setCorreAberto] = useState<any | null>(null)
  const [reacoesPorPost, setReacoesPorPost] = useState<{ [postId: string]: string }>({})
  const [comentariosCorreMap, setComentariosCorreMap] = useState<{ [postId: string]: Array<{ id: string; nome: string; avatar?: string; texto: string }> }>({})
  const [modalViewsAberto, setModalViewsAberto] = useState(false)
  const [viewsCorreMap, setViewsCorreMap] = useState<{ [postId: string]: Array<{ id: string; nome: string; avatar?: string; vistoEm: string }> }>({})
  const [itemIndexAtivo, setItemIndexAtivo] = useState(0)
  const [progressoCorre, setProgressoCorre] = useState(0)
  const timerCorreRef = useRef<NodeJS.Timeout | null>(null)
  const audioCorreRef = useRef<HTMLAudioElement | null>(null)
  const itemIndexRef = useRef(0)
  const meuid = usuarioAtual?.id || ''

  // FUNÇÃO PARA ROLAR PARA O INÍCIO DO FEED
  const scrollToTopo = () => {
    const scrollContainer = document.getElementById('scroll-feed')
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // INTERCEPTAR O BOTÃO VOLTAR DO CELULAR
  useEffect(() => {
    window.history.pushState({ page: 'feed' }, '')

    const handlePopState = () => {
      if (correAberto || cameraAberta || modalViewsAberto || modalEscolhaCorre) {
        setCorreAberto(null)
        setCameraAberta(false)
        setModalViewsAberto(false)
        setModalEscolhaCorre(false)
        window.history.pushState({ page: 'feed' }, '')
        return
      }

      const scrollContainer = document.getElementById('scroll-feed')
      const posScroll = scrollContainer ? scrollContainer.scrollTop : window.scrollY

      if (posScroll > 100) {
        scrollToTopo()
        window.history.pushState({ page: 'feed' }, '')
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [correAberto, cameraAberta, modalViewsAberto, modalEscolhaCorre])

  function tocarSomNotificacao() {
    try {
      const som = new Audio('/notificacao.mp3')
      som.play().catch((e) => console.log('Áudio bloqueado pelo navegador:', e.message))
    } catch (error) {}
  }

  useNotificacoesRealtime(usuarioAtual?.id, () => {
    setNotificacoesNaoLidas((prev) => prev + 1)
    tocarSomNotificacao()
  })

  const prepararMidiaCorre = (file: File) => {
    setMidiaCorreTemp(file)
  }

  const marcarComoVisto = (chave: string, dataMidia?: string) => {
    if (!chave) return
    const timestampVisto = dataMidia || new Date().toISOString()
    setCorresVistosMap((prev) => {
      const novoMapa = { ...prev, [chave]: timestampVisto }
      if (typeof window !== 'undefined') {
        localStorage.setItem('brazilzao_corres_vistos_v2', JSON.stringify(novoMapa))
      }
      return novoMapa
    })
  }

  const abrirCameraAoVivo = () => {
    setModalEscolhaCorre(false)
    setCameraAberta(true)
  }

  const recarregarFeed = async () => {
    setAtualizando(true)
    await carregarPosts()
    setTimeout(() => {
      setAtualizando(false)
      setPuxando(false)
      pullDistance.current = 0
    }, 600)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    const scrollContainer = document.getElementById('scroll-feed')
    if (scrollContainer && scrollContainer.scrollTop === 0) {
      startY.current = e.touches[0].clientY
    } else {
      startY.current = 0
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (startY.current === 0 || atualizando) return
    const currentY = e.touches[0].clientY
    const diff = currentY - startY.current
    if (diff > 0) {
      pullDistance.current = diff
      if (diff > 70) setPuxando(true)
    }
  }

  const handleTouchEnd = () => {
    if (pullDistance.current > 70 && !atualizando) {
      recarregarFeed()
    } else {
      setPuxando(false)
      pullDistance.current = 0
    }
  }

  const enviarComentarioCorre = async (idPostAtual: string) => {
    if (!comentarioTextoCorre.trim()) return
    const textoComentario = comentarioTextoCorre.trim()
    setComentarioTextoCorre('')
    const novoComent = {
      id: `coment-${Date.now()}`,
      nome: usuarioAtual?.nome || 'Você',
      avatar: usuarioAtual?.foto_url || '',
      texto: textoComentario,
      criadoEm: new Date().toISOString()
    }
    setComentariosCorreMap(prev => ({
      ...prev,
      [idPostAtual]: [...(prev[idPostAtual] || []), novoComent]
    }))
    if (idPostAtual) {
      try {
        const { data: postBanco } = await supabase
          .from('feed_posts')
          .select('conteudo')
          .eq('id', idPostAtual)
          .maybeSingle()
        const conteudoAtual = postBanco?.conteudo || {}
        const comentariosBanco = conteudoAtual.comentarios || []
        await supabase
          .from('feed_posts')
          .update({
            conteudo: {
              ...conteudoAtual,
              comentarios: [...comentariosBanco, novoComent]
            }
          })
          .eq('id', idPostAtual)
      } catch (err) {
        console.log('Erro ao salvar comentário:', err)
      }
    }
    const donoId = correAberto?.usuarioId || correAberto?.id
    if (donoId && usuarioAtual?.id && donoId !== usuarioAtual.id) {
      await supabase.from('notifications').insert({
        usuario_id: donoId,
        remetente_id: usuarioAtual.id,
        tipo: 'comentario_corre',
        mensagem: `${usuarioAtual.nome || 'Alguém'} comentou no seu Corre: "${textoComentario}"`,
        link: '/mensagens',
        lida: false
      })
    }
  }

  const atualizarPostNoBanco = async (postAtualizado: Post) => {
    if (!postAtualizado.id) return
    try {
      const { error } = await supabase
        .from('feed_posts')
        .update({ conteudo: postAtualizado })
        .eq('id', postAtualizado.id)
      if (error) console.log('Erro ao salvar no banco:', error.message)
    } catch (err) {
      console.log('Erro ao atualizar post:', err)
    }
  }

  async function carregarUsuarioAtual(id: string) {
    let { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle()
    if (!data) {
      const { data: usuarioPorAuth } = await supabase.from('profiles').select('*').eq('auth_user_id', id).maybeSingle()
      data = usuarioPorAuth
    }
    if (data) setUsuarioAtual(data)
  }

  async function carregarPosts() {
    const { data: sessao } = await supabase.auth.getSession()
    const meuId = sessao.session?.user?.id || usuarioAtual?.id || ''
    
    try {
      const { data: postsCorres } = await supabase
        .from('feed_posts')
        .select('*')
        .or('visibilidade.eq.corre_rapidim')
        .order('created_at', { ascending: false })

      if (postsCorres && postsCorres.length > 0) {
        const idsUsuarios = Array.from(new Set(postsCorres.map((p: any) => p.usuario_id)))
        const { data: perfisData } = await supabase.from('profiles').select('id, nome, foto_url').in('id', idsUsuarios)
        const perfisMap: Record<string, any> = {}
        if (perfisData) {
          perfisData.forEach((perfil: any) => { perfisMap[perfil.id] = perfil })
        }
        const corresAgrupadosDoBanco: Record<string, any> = {}
        const ordenados = [...postsCorres].reverse()
        ordenados.forEach((p: any) => {
          const donoId = p.usuario_id
          const perfilAutor = perfisMap[donoId] || {}
          const dataCriacao = p.created_at || p.conteudo?.criadoEm || new Date().toISOString()
          const item = {
            id: p.id,
            imagemBg: p.conteudo?.imagemBg,
            musica: p.conteudo?.musica,
            legenda: p.conteudo?.legenda,
            comentarios: p.conteudo?.comentarios || [],
            reacoes: p.conteudo?.reacoes || {},
            views: p.conteudo?.views || [],
            criadoEm: dataCriacao
          }
          if (!corresAgrupadosDoBanco[donoId]) {
            corresAgrupadosDoBanco[donoId] = {
              id: `grupo-${donoId}`,
              usuarioId: donoId,
              nome: perfilAutor.nome || p.conteudo?.nome || 'Corre',
              avatar: perfilAutor.foto_url || p.conteudo?.avatar || '',
              imagemBg: p.conteudo?.imagemBg,
              isUser: meuId === donoId || usuarioAtual?.nome === perfilAutor.nome,
              criadoEm: dataCriacao,
              itens: [item]
            }
          } else {
            corresAgrupadosDoBanco[donoId].itens.push(item)
            corresAgrupadosDoBanco[donoId].imagemBg = p.conteudo?.imagemBg
            corresAgrupadosDoBanco[donoId].criadoEm = dataCriacao
          }
        })
        setListaCorres(Object.values(corresAgrupadosDoBanco))
      }
    } catch (err) {
      console.error('Erro ao carregar Corres:', err)
    }

    try {
      let idsSeguidos: string[] = [meuId]
      if (meuId) {
        const { data: seguindoData } = await supabase
          .from('seguidores')
          .select('seguido_id')
          .eq('seguidor_id', meuId)
        if (seguindoData) {
          seguindoData.forEach(item => idsSeguidos.push(item.seguido_id))
        }
      }

      const { data: postsBanco } = await supabase
        .from('feed_posts')
        .select('*')
        .neq('visibilidade', 'corre_rapidim')
        .order('created_at', { ascending: false })

      if (postsBanco) {
  const postsFiltrados = postsBanco.filter((p: any) => {
    // 🚫 IGNORA MENSAGENS PRIVADAS E CHATS DE VENDAS NO FEED PÚBLICO
    const tipo = p.conteudo?.tipoPost
    if (
      tipo === 'mensagem_direta' || 
      tipo === 'papo_br_mensagem' || 
      tipo === 'mensagem_vendas' || 
      tipo === 'denuncia_venda'
    ) {
      return false
    }

    const vis = p.visibilidade
    const autorId = p.usuario_id
    if (!vis || vis === 'mundial') return true
    if (vis === 'seguidores') {
      return idsSeguidos.includes(autorId)
    }
    return true
  })

        setPosts(postsFiltrados.map((p: any) => ({
          ...p.conteudo,
          id: p.id,
          usuario_id: p.usuario_id,
          tempo: p.created_at || p.conteudo?.tempo,
          comentarios: p.conteudo?.comentarios || [],
          reacoes: p.conteudo?.reacoes || {},
          espalhadosCount: p.conteudo?.espalhadosCount || 0,
          localizacao: p.conteudo?.localizacao || ''
        })))
      }
    } catch (err) {
      console.error('Erro ao carregar Feed:', err)
    }
  }

  useEffect(() => {
    itemIndexRef.current = itemIndexAtivo
  }, [itemIndexAtivo])

  useEffect(() => {
    if (correAberto) {
      setItemIndexAtivo(0)
      itemIndexRef.current = 0
      setProgressoCorre(0)
      const mapaComents: Record<string, any[]> = {}
      const mapaReacoes: Record<string, string> = {}
      const mapaViews: Record<string, any[]> = {}
      const itens = correAberto.itens || [correAberto]
      itens.forEach((it: any) => {
        if (it.id) {
          if (it.comentarios) mapaComents[it.id] = it.comentarios
          if (it.views) mapaViews[it.id] = it.views
          const reacaoSalva = it.reacoes?.[meuid] || correAberto.reacoes?.[meuid]
          if (reacaoSalva) mapaReacoes[it.id] = reacaoSalva
        }
      })
      setComentariosCorreMap(prev => ({ ...prev, ...mapaComents }))
      setReacoesPorPost(prev => ({ ...prev, ...mapaReacoes }))
      setViewsCorreMap(prev => ({ ...prev, ...mapaViews }))
      const idPost = itens[0]?.id
      const donoId = correAberto.usuarioId || correAberto.id
      if (idPost && meuid && meuid !== donoId) {
        const registrarViewNoBanco = async () => {
          try {
            const { data: postBanco } = await supabase.from('feed_posts').select('conteudo').eq('id', idPost).maybeSingle()
            const conteudoAtual = postBanco?.conteudo || {}
            const viewsBanco: any[] = conteudoAtual.views || []
            const jaViu = viewsBanco.some((v: any) => v.id === meuid)
            if (!jaViu && usuarioAtual) {
              const novaView = {
                id: usuarioAtual.id,
                nome: usuarioAtual.nome || 'Usuário',
                avatar: usuarioAtual.foto_url || '',
                vistoEm: new Date().toISOString()
              }
              const novaListaViews = [...viewsBanco, novaView]
              await supabase.from('feed_posts').update({ conteudo: { ...conteudoAtual, views: novaListaViews } }).eq('id', idPost)
              setViewsCorreMap(prev => ({ ...prev, [idPost]: novaListaViews }))
            }
          } catch (err) {
            console.log('Erro ao registrar visualização:', err)
          }
        }
        registrarViewNoBanco()
      }
    }
  }, [correAberto, meuid])

  useEffect(() => {
    const itensAtuais = correAberto?.itens && correAberto.itens.length > 0 ? correAberto.itens : [correAberto]
    const itemAtivo = itensAtuais?.[itemIndexAtivo]
    if (audioCorreRef.current) {
      if (itemAtivo?.musica?.previewUrl) {
        audioCorreRef.current.currentTime = 0
        audioCorreRef.current.play().catch(() => {})
      } else {
        audioCorreRef.current.pause()
        audioCorreRef.current.currentTime = 0
      }
    }
  }, [itemIndexAtivo, correAberto])

  useEffect(() => {
    if (!correAberto) {
      setProgressoCorre(0)
      if (timerCorreRef.current) clearInterval(timerCorreRef.current)
      if (audioCorreRef.current) audioCorreRef.current.pause()
      return
    }
    const listaItens = correAberto.itens && correAberto.itens.length > 0 ? correAberto.itens : [{ id: correAberto.id, imagemBg: correAberto.imagemBg, musica: correAberto.musica }]
    const idxAtual = itemIndexRef.current
    const itemAtual = listaItens[idxAtual] || listaItens[0]
    const ehVideo = itemAtual?.imagemBg?.match(/\.(mp4|webm|ogg|mov|mkv)($|\?)/i) || itemAtual?.imagemBg?.includes('video')
    const tempoTotalMs = ehVideo ? 30000 : 15000

    const inicioTempo = Date.now()
    setProgressoCorre(0)
    if (timerCorreRef.current) clearInterval(timerCorreRef.current)
    timerCorreRef.current = setInterval(() => {
      const tempoDecorrido = Date.now() - inicioTempo
      const porcentagem = (tempoDecorrido / tempoTotalMs) * 100
      if (porcentagem >= 100) {
        clearInterval(timerCorreRef.current!)
        if (itemIndexRef.current < listaItens.length - 1) {
          setItemIndexAtivo(itemIndexRef.current + 1)
        } else {
          const chaveUnica = correAberto.usuarioId || correAberto.nome || correAberto.id
          const ultimaMidia = listaItens[listaItens.length - 1]
          marcarComoVisto(chaveUnica, ultimaMidia?.criadoEm)
          const indexUsuarioAtual = listaCorres.findIndex(c => (c.usuarioId || c.id || c.nome) === chaveUnica)
          if (indexUsuarioAtual !== -1 && indexUsuarioAtual < listaCorres.length - 1) {
            const proximoUsuario = listaCorres[indexUsuarioAtual + 1]
            const proximaLista = proximoUsuario.itens && proximoUsuario.itens.length > 0
              ? proximoUsuario.itens
              : [{ id: proximoUsuario.id, imagemBg: proximoUsuario.imagemBg, musica: proximoUsuario.musica }]
            setItemIndexAtivo(0)
            setCorreAberto({ ...proximoUsuario, itens: proximaLista })
          } else {
            if (audioCorreRef.current) audioCorreRef.current.pause()
            setCorreAberto(null)
          }
        }
      } else {
        setProgressoCorre(porcentagem)
      }
    }, 50)
    return () => { if (timerCorreRef.current) clearInterval(timerCorreRef.current) }
  }, [correAberto, itemIndexAtivo, listaCorres])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const postIdUrl = params.get('postId')
    const comentarioIdUrl = params.get('comentarioId')
    if (posts.length > 0) {
      if (comentarioIdUrl) {
        setTimeout(() => {
          const elComentario = document.getElementById(`comentario-${comentarioIdUrl}`)
          if (elComentario) {
            elComentario.scrollIntoView({ behavior: 'smooth', block: 'center' })
            elComentario.style.transition = 'background-color 0.4s ease'
            elComentario.style.backgroundColor = '#d1fae5'
            setTimeout(() => { elComentario.style.backgroundColor = '#f0f2f5' }, 2500)
          } else if (postIdUrl) {
            const elPost = document.getElementById(`post-${postIdUrl}`)
            if (elPost) elPost.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }, 600)
      } else if (postIdUrl) {
        setTimeout(() => {
          const elemento = document.getElementById(`post-${postIdUrl}`)
          if (elemento) {
            elemento.scrollIntoView({ behavior: 'smooth', block: 'center' })
            elemento.style.transition = 'box-shadow 0.4s ease'
            elemento.style.boxShadow = '0 0 0 3px #008C3A'
            setTimeout(() => { elemento.style.boxShadow = 'none' }, 2000)
          }
        }, 500)
      }
    }
  }, [posts])

  useEffect(() => {
    async function iniciarSistema() {
      const { data } = await supabase.auth.getSession()
      if (!data?.session?.user) return router.replace('/login')
      await carregarUsuarioAtual(data.session.user.id)
      setVerificandoLogin(false)
    }
    iniciarSistema()
  }, [router])

  useEffect(() => {
    if (usuarioAtual?.id) carregarPosts()
  }, [usuarioAtual?.id])

  useEffect(() => {
    if (!usuarioAtual?.id) return
    async function carregarContadores() {
      const { count: notifCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', usuarioAtual?.id)
        .eq('lida', false)
      if (notifCount !== null) setNotificacoesNaoLidas(notifCount)
      const { count: msgCount } = await supabase
        .from('mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', usuarioAtual?.id)
        .eq('lida', false)
      setMensagensNaoLidas(msgCount ?? 0)
    }
    carregarContadores()

    const nomeCanalNotif = `notificacoes-feed-${usuarioAtual.id}`
    const canalNotifExistente = supabase.getChannels().find(c => c.topic === `realtime:${nomeCanalNotif}`)
    if (canalNotifExistente) supabase.removeChannel(canalNotifExistente)
    const canalNotif = supabase
      .channel(nomeCanalNotif)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `usuario_id=eq.${usuarioAtual.id}`
      }, () => {
        setNotificacoesNaoLidas((prev) => prev + 1)
        tocarSomNotificacao()
      })
      .subscribe()

    const nomeCanalMsg = `realtime-mensagens-feed-${usuarioAtual.id}`
    const canalMsgExistente = supabase.getChannels().find(c => c.topic === `realtime:${nomeCanalMsg}`)
    if (canalMsgExistente) supabase.removeChannel(canalMsgExistente)
    const canalMensagens = supabase
      .channel(nomeCanalMsg)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensagens',
        filter: `destinatario_id=eq.${usuarioAtual.id}`
      }, () => {
        setMensagensNaoLidas((prev) => prev + 1)
        tocarSomNotificacao()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canalNotif)
      supabase.removeChannel(canalMensagens)
    }
  }, [usuarioAtual?.id])

  return (
    <div style={estilos.container}>
      <style jsx global>{`
        @keyframes girarBordaCorre {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes subirSuave {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .corre-circulo-container {
          position: relative;
          width: 72px;
          height: 72px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin: 4px 0;
        }
        .corre-borda-animada::before {
          content: '';
          position: absolute;
          inset: -3px;
          border-radius: 50%;
          background: conic-gradient(#008C3A, #FFD700, #008C3A, #FFD700, #008C3A);
          animation: girarBordaCorre 2.5s linear infinite;
          z-index: 1;
        }
        .corre-borda-estatica::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background: #888888;
          z-index: 1;
        }
        .corre-foto-inner {
          position: relative;
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 3px solid #fff;
          overflow: hidden;
          background: #008C3A;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .carrossel-reacoes-scroll::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* HEADER SUPERIOR COM ÍCONES 3D VETORIAIS */}
      <header style={estilos.headerVerde}>
        <div style={estilos.topoRow}>
          <div style={estilos.logoCol}>
            <img src="/logo-br.jpg" alt="BR" style={estilos.logoImg} />
            <div style={estilos.logoTexto}>
              <span style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>BRAZILZÃO</span>
              <span style={{ fontSize: 11, color: '#d1fae5' }}>o corre conectado</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* 1. MENSAGENS / CHAT 3D */}
            <div 
              style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
              onClick={() => router.push('/mensagens')}
            >
              <svg width="34" height="34" viewBox="0 0 40 40" fill="none" style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))' }}>
                <defs>
                  <linearGradient id="gradChat3D" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="#E2E8F0" />
                  </linearGradient>
                </defs>
                <rect x="4" y="6" width="32" height="24" rx="10" fill="url(#gradChat3D)" />
                <path d="M10 30 L6 36 L18 30 Z" fill="url(#gradChat3D)" />
                <circle cx="13" cy="18" r="2.2" fill="#94A3B8" />
                <circle cx="20" cy="18" r="2.2" fill="#94A3B8" />
                <circle cx="27" cy="18" r="2.2" fill="#94A3B8" />
              </svg>
              {mensagensNaoLidas > 0 && (
                <span style={estilos.badgeNotif3D}>
                  {mensagensNaoLidas > 99 ? '99+' : mensagensNaoLidas}
                </span>
              )}
            </div>

            {/* 2. NOTIFICAÇÕES 3D */}
            <div 
              style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center' }} 
              onClick={() => router.push('/notificacoes')}
            >
              <svg width="34" height="34" viewBox="0 0 40 40" fill="none" style={{ filter: 'drop-shadow(0 3px 5px rgba(0,0,0,0.25))' }}>
                <defs>
                  <linearGradient id="gradSino3D" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFE066" />
                    <stop offset="50%" stopColor="#FFC700" />
                    <stop offset="100%" stopColor="#D99B00" />
                  </linearGradient>
                </defs>
                <path d="M20 5 C14 5 10 11 10 19 L8 25 C7 27 8.5 28.5 10.5 28.5 L29.5 28.5 C31.5 28.5 33 27 32 25 L30 19 C30 11 26 5 20 5 Z" fill="url(#gradSino3D)" />
                <path d="M16 29 C16 32 17.8 34 20 34 C22.2 34 24 32 24 29 Z" fill="#B37B00" />
              </svg>
              {notificacoesNaoLidas > 0 && (
                <span style={estilos.badgeNotif3D}>
                  {notificacoesNaoLidas}
                </span>
              )}
            </div>

            {/* 3. FOTO REAL DO PERFIL */}
            <div style={estilos.containerFotoPerfilBR} onClick={() => router.push(`/perfil?id=${usuarioAtual?.id}`)}>
              {usuarioAtual?.foto_url ? (
                <img src={usuarioAtual.foto_url} alt="" style={estilos.imgFull} />
              ) : (
                <div style={estilos.avatarFallback}>
                  {usuarioAtual?.nome?.charAt(0).toUpperCase() || 'U'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* BARRA DE BUSCA COM BOTÃO 3D */}
        <div style={estilos.buscaRow}>
          <input 
            type="text" 
            placeholder="Buscar no Brazilzão..." 
            style={estilos.buscaInput} 
          />
          <button 
            type="button"
            style={estilos.btnBusca3D}
            onClick={() => {}}
            title="Pesquisar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}>
              <defs>
                <linearGradient id="gradLupa3D" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor="#E2E8F0" />
                </linearGradient>
              </defs>
              <circle cx="11" cy="11" r="7" stroke="url(#gradLupa3D)" strokeWidth="3.2" />
              <path d="M16 16 L21 21" stroke="url(#gradLupa3D)" strokeWidth="3.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </header>

      <div
        id="scroll-feed"
        style={estilos.scrollContainer}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {(puxando || atualizando) && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 0',
            background: '#e6f4ea',
            color: '#008C3A',
            fontWeight: 'bold',
            fontSize: 13,
            gap: 8,
            transition: 'all 0.3s ease'
          }}>
            <span style={{ fontSize: 16, animation: atualizando ? 'spin 1s linear infinite' : 'none' }}>
              {atualizando ? '🔄' : '⬇️'}
            </span>
            {atualizando ? 'Atualizando o Brazilzão...' : 'Solte para atualizar'}
          </div>
        )}

        <div style={{ width: '100%', marginTop: 14, marginBottom: 12, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img
            src="/corre-rapidim.png"
            alt="Corre Rapidim"
            style={{
              height: 48,
              width: 'auto',
              objectFit: 'contain',
              display: 'block'
            }}
          />
        </div>

        <div style={estilos.storiesTrack}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              flexShrink: 0
            }}
            onClick={() => setCameraAberta(true)}
          >
            <input
              type="file"
              accept="image/*,video/*"
              ref={correFileInputRef}
              onChange={(e) => {
                setModalEscolhaCorre(false)
                const file = e.target.files?.[0]
                if (file) prepararMidiaCorre(file)
              }}
              style={{ display: 'none' }}
            />
            <input
              type="file"
              accept="image/*,video/*"
              capture="environment"
              ref={correCameraInputRef}
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) prepararMidiaCorre(file)
              }}
              style={{ display: 'none' }}
            />
            <div style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#e6f4ea',
              border: '2px dashed #008C3A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: '#008C3A',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 'bold'
              }}>
                +
              </div>
            </div>
            <span style={{ fontSize: 11, fontWeight: '700', color: '#008C3A', textAlign: 'center' }}>
              Seu Corre
            </span>
          </div>

          {(() => {
            const corresAgrupados: Record<string, any> = {}
            listaCorres.forEach((story: any) => {
              const dataPost = story.criadoEm ? new Date(story.criadoEm).getTime() : Date.now()
              const agora = Date.now()
              const horasDiferenca = (agora - dataPost) / (1000 * 60 * 60)
              if (isNaN(horasDiferenca) || horasDiferenca < 24) {
                const chave = story.usuarioId || story.nome || story.id
                if (!corresAgrupados[chave]) {
                  corresAgrupados[chave] = {
                    ...story,
                    itens: story.itens || [{ id: story.id, imagemBg: story.imagemBg, musica: story.musica }]
                  }
                } else {
                  if (!corresAgrupados[chave].itens) corresAgrupados[chave].itens = []
                  corresAgrupados[chave].itens.push({
                    id: story.id,
                    imagemBg: story.imagemBg,
                    musica: story.musica
                  })
                }
              }
            })
            const listaOrdenada = Object.values(corresAgrupados).sort((a: any, b: any) => {
              const chaveA = a.usuarioId || a.nome || a.id
              const chaveB = b.usuarioId || b.nome || b.id
              if (a.isUser || a.usuarioId === meuid) return -1
              if (b.isUser || b.usuarioId === meuid) return 1
              const ultA = a.itens?.[a.itens.length - 1]?.criadoEm || a.criadoEm
              const ultB = b.itens?.[b.itens.length - 1]?.criadoEm || b.criadoEm
              const vistoA = corresVistosMap[chaveA] && new Date(corresVistosMap[chaveA]).getTime() >= new Date(ultA).getTime() ? 1 : 0
              const vistoB = corresVistosMap[chaveB] && new Date(corresVistosMap[chaveB]).getTime() >= new Date(ultB).getTime() ? 1 : 0
              if (vistoA !== vistoB) return vistoA - vistoB
              return new Date(ultB).getTime() - new Date(ultA).getTime()
            })
            return listaOrdenada.map((story: any) => {
              const chaveUnica = story.usuarioId || story.nome || story.id
              const dataUltimoItem = story.itens?.[story.itens.length - 1]?.criadoEm || story.criadoEm
              const dataVisto = corresVistosMap[chaveUnica]
              const jaVisto = dataVisto && new Date(dataVisto).getTime() >= new Date(dataUltimoItem).getTime()
              return (
                <div
                  key={story.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    cursor: 'pointer',
                    flexShrink: 0
                  }}
                  onClick={() => {
                    const listaDeItens = story.itens && story.itens.length > 0
                      ? story.itens
                      : [{ id: story.id, imagemBg: story.imagemBg, musica: story.musica }]
                    const estruturaStory = {
                      ...story,
                      itens: listaDeItens
                    }
                    setItemIndexAtivo(0)
                    setCorreAberto(estruturaStory)
                  }}
                >
                  <div className={`corre-circulo-container ${jaVisto ? 'corre-borda-estatica' : 'corre-borda-animada'}`}>
                    <div className="corre-foto-inner">
                      {story.isUser && usuarioAtual?.foto_url ? (
                        <img src={usuarioAtual.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : story.avatar ? (
                        <img src={story.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 18, fontWeight: 'bold', color: '#fff' }}>
                          {story.nome?.charAt(0).toUpperCase() || 'U'}
                        </span>
                      )}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: jaVisto ? '#888' : '#050505',
                    maxWidth: 72,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    textAlign: 'center'
                  }}>
                    {story.isUser ? 'Seu Corre' : story.nome}
                  </span>
                </div>
              )
            })
          })()}
        </div>

        <CriarPostArea
          usuarioAtual={usuarioAtual}
          onPostCreated={(novoPost) => setPosts([novoPost, ...posts])}
        />

        <main style={{ padding: '0 4px 100px 4px' }}>
          {posts.map((post, idx) => (
            <PostCard
              key={post.id || idx}
              post={post}
              usuarioAtual={usuarioAtual}
              onUpdate={(updated) => {
                const novos = [...posts]
                novos[idx] = updated
                setPosts(novos)
                atualizarPostNoBanco(updated)
              }}
              onEspalhar={(novoPostEspalhado) => {
                setPosts([novoPostEspalhado, ...posts])
              }}
            />
          ))}
        </main>

        {/* ESTRUTURA DO CORRE ABERTO */}
        {correAberto && (() => {
          const itensAtuais = correAberto.itens && correAberto.itens.length > 0
            ? correAberto.itens
            : [{ id: correAberto.id, imagemBg: correAberto.imagemBg, musica: correAberto.musica }]
          const itemAtual = itensAtuais[itemIndexAtivo] || itensAtuais[0]
          const musicaAtual = itemAtual?.musica || correAberto.musica
          const legendaAtual = itemAtual?.legenda || correAberto.legenda
          const idPostAtual = itemAtual?.id || correAberto?.id || `post-${itemIndexAtivo}`
          const avancarMidia = () => {
            if (itemIndexAtivo < itensAtuais.length - 1) {
              setItemIndexAtivo((prev) => prev + 1)
            } else {
              const chaveUnica = correAberto.usuarioId || correAberto.nome || correAberto.id
              const ultimaMidia = itensAtuais[itensAtuais.length - 1]
              marcarComoVisto(chaveUnica, ultimaMidia?.criadoEm)
              const indexUsuarioAtual = listaCorres.findIndex(c => (c.usuarioId || c.id || c.nome) === chaveUnica)
              if (indexUsuarioAtual !== -1 && indexUsuarioAtual < listaCorres.length - 1) {
                const proximoUsuario = listaCorres[indexUsuarioAtual + 1]
                const proximaLista = proximoUsuario.itens && proximoUsuario.itens.length > 0
                  ? proximoUsuario.itens
                  : [{ id: proximoUsuario.id, imagemBg: proximoUsuario.imagemBg, musica: proximoUsuario.musica }]
                setItemIndexAtivo(0)
                setCorreAberto({
                  ...proximoUsuario,
                  itens: proximaLista
                })
              } else {
                if (audioCorreRef.current) audioCorreRef.current.pause()
                setCorreAberto(null)
              }
            }
          }
          const voltarMidia = () => {
            if (itemIndexAtivo > 0) {
              setItemIndexAtivo((prev) => prev - 1)
            } else {
              const indexUsuarioAtual = listaCorres.findIndex(c => (c.usuarioId || c.nome) === (correAberto.usuarioId || correAberto.nome))
              if (indexUsuarioAtual > 0) {
                const usuarioAnterior = listaCorres[indexUsuarioAtual - 1]
                const listaAnterior = usuarioAnterior.itens && usuarioAnterior.itens.length > 0
                  ? usuarioAnterior.itens
                  : [{ id: usuarioAnterior.id, imagemBg: usuarioAnterior.imagemBg, musica: usuarioAnterior.musica }]
                setItemIndexAtivo(listaAnterior.length - 1)
                setCorreAberto({
                  ...usuarioAnterior,
                  itens: listaAnterior
                })
              }
            }
          }
          return (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#000',
              zIndex: 99999,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              alignItems: 'center',
              touchAction: 'none'
            }}>
              {musicaAtual?.previewUrl ? (
                <audio
                  ref={audioCorreRef}
                  key={`audio-${itemAtual?.id || itemIndexAtivo}`}
                  src={musicaAtual.previewUrl}
                  autoPlay
                  loop
                />
              ) : null}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                padding: '12px 16px',
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.85), rgba(0,0,0,0))',
                zIndex: 100000,
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
                pointerEvents: 'none'
              }}>
                <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                  {itensAtuais.map((it: any, index: number) => (
                    <div
                      key={it.id || index}
                      style={{
                        flex: 1,
                        height: 3,
                        backgroundColor: 'rgba(255,255,255,0.3)',
                        borderRadius: 2,
                        overflow: 'hidden'
                      }}
                    >
                      <div style={{
                        height: '100%',
                        width: index < itemIndexAtivo ? '100%' : index === itemIndexAtivo ? `${progressoCorre}%` : '0%',
                        backgroundColor: '#FFD700',
                        transition: index === itemIndexAtivo ? 'width 0.1s linear' : 'none'
                      }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pointerEvents: 'auto' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      border: '2px solid #FFD700',
                      overflow: 'hidden',
                      background: '#008C3A',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: 14
                    }}>
                      {correAberto.avatar ? (
                        <img src={correAberto.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        correAberto.nome?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <div>
                      <strong style={{ color: '#fff', fontSize: 14, textShadow: '0 1px 2px rgba(0,0,0,0.8)', display: 'block' }}>
                        {correAberto.nome}
                      </strong>
                      {musicaAtual && (
                        <span style={{ color: '#FFD700', fontSize: 11, fontWeight: 'bold' }}>
                          🎵 {musicaAtual.titulo} • {musicaAtual.artista}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (audioCorreRef.current) audioCorreRef.current.pause()
                      setCorreAberto(null)
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#fff',
                      fontSize: 24,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      padding: '8px'
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                <div
                  onClick={(e) => { e.stopPropagation(); voltarMidia() }}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 70,
                    bottom: 0,
                    width: '40%',
                    zIndex: 99998,
                    WebkitTapHighlightColor: 'transparent'
                  }}
                />
                <div
                  onClick={(e) => { e.stopPropagation(); avancarMidia() }}
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 70,
                    bottom: 0,
                    width: '40%',
                    zIndex: 99998,
                    WebkitTapHighlightColor: 'transparent'
                  }}
                />
                {itemAtual?.imagemBg?.match(/\.(mp4|webm|ogg|mov|mkv)($|\?)/i) ? (
                  <video
                    key={itemAtual.imagemBg}
                    src={itemAtual.imagemBg}
                    autoPlay
                    playsInline
                    onEnded={avancarMidia}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                ) : (
                  <img
                    key={itemAtual.imagemBg}
                    src={itemAtual.imagemBg}
                    alt="Corre"
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  />
                )}
              </div>
              {(itemAtual?.adesivo || correAberto?.adesivo) && (
                <div style={{
                  position: 'absolute',
                  top: 105,
                  left: 16,
                  background: '#FFD700',
                  color: '#000',
                  padding: '5px 12px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: '800',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                  zIndex: 100000
                }}>
                  {itemAtual?.adesivo || correAberto?.adesivo}
                </div>
              )}
              {(correAberto.isUser || correAberto.usuarioId === meuid) && (() => {
                const listaViews = viewsCorreMap[idPostAtual] || itemAtual?.views || []
                const totalViews = listaViews.length
                return (
                  <button
                    onClick={() => setModalViewsAberto(true)}
                    style={{
                      position: 'absolute',
                      top: 105,
                      right: 16,
                      background: 'rgba(0, 0, 0, 0.65)',
                      backdropFilter: 'blur(10px)',
                      color: '#fff',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      padding: '6px 14px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      boxShadow: '0 4px 10px rgba(0,0,0,0.4)',
                      zIndex: 100000,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    👁️ {totalViews} {totalViews === 1 ? 'visualização' : 'visualizações'}
                  </button>
                )
              })()}
              {legendaAtual && (
                <div style={{
                  position: 'absolute',
                  bottom: 74,
                  left: 12,
                  right: 12,
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(12px)',
                  padding: '10px 14px',
                  borderRadius: 16,
                  zIndex: 100000,
                  border: '1px solid rgba(255, 255, 255, 0.15)'
                }}>
                  <p style={{
                    color: '#fff',
                    fontSize: 13,
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontWeight: '500'
                  }}>
                    {legendaAtual.split(/(@[^\s]+)/g).map((part: string, idx: number) =>
                      part.startsWith('@') ? (
                        <span key={idx} style={{ color: '#FFD700', fontWeight: 'bold' }}>
                          {part}
                        </span>
                      ) : (
                        part
                      )
                    )}
                  </p>
                </div>
              )}
              {(() => {
                const listaComentarios = comentariosCorreMap[idPostAtual] || []
                const ultimosComentarios = listaComentarios.slice(-2)
                if (ultimosComentarios.length === 0) return null
                return (
                  <div style={{
                    position: 'absolute',
                    bottom: legendaAtual ? 132 : 72,
                    left: 12,
                    maxWidth: 260,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 6,
                    zIndex: 100000,
                    pointerEvents: 'none'
                  }}>
                    {ultimosComentarios.map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          background: 'rgba(0, 0, 0, 0.55)',
                          backdropFilter: 'blur(8px)',
                          padding: '6px 12px',
                          borderRadius: 20,
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          animation: 'subirSuave 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                        }}
                      >
                        <div style={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: '#008C3A',
                          color: '#fff',
                          fontSize: 10,
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden',
                          flexShrink: 0
                        }}>
                          {c.avatar ? (
                            <img src={c.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            c.nome?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <span style={{ color: '#FFD700', fontSize: 11, fontWeight: 'bold', display: 'block', lineHeight: 1 }}>
                            {c.nome}
                          </span>
                          <span style={{ color: '#fff', fontSize: 12, fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                            {c.texto}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
              <div style={{
                position: 'absolute',
                bottom: 12,
                left: 0,
                right: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '0 12px',
                zIndex: 100001
              }}>
                <div
                  className="carrossel-reacoes-scroll"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    maxWidth: '130px',
                    overflowX: 'auto',
                    scrollBehavior: 'smooth',
                    whiteSpace: 'nowrap',
                    paddingRight: 4,
                    scrollbarWidth: 'none'
                  }}
                >
                  {REACOES_LISTA.map(({ emoji, label }) => {
                    const reacaoDoPostAtual = reacoesPorPost[idPostAtual]
                    const estaAtivo = reacaoDoPostAtual === emoji
                    return (
                      <button
                        key={emoji}
                        title={label}
                        onClick={async () => {
                          const novoEmoji = estaAtivo ? null : emoji
                          setReacoesPorPost(prev => {
                            const copia = { ...prev }
                            if (novoEmoji) {
                              copia[idPostAtual] = novoEmoji
                            } else {
                              delete copia[idPostAtual]
                            }
                            return copia
                          })
                          if (idPostAtual) {
                            try {
                              const { data: postBanco } = await supabase
                                .from('feed_posts')
                                .select('conteudo')
                                .eq('id', idPostAtual)
                                .maybeSingle()
                              const conteudoAtual = postBanco?.conteudo || {}
                              const reacoesBanco = conteudoAtual.reacoes || {}
                              if (novoEmoji) {
                                reacoesBanco[usuarioAtual?.id || 'anonimo'] = novoEmoji
                              } else {
                                delete reacoesBanco[usuarioAtual?.id || 'anonimo']
                              }
                              await supabase
                                .from('feed_posts')
                                .update({
                                  conteudo: {
                                    ...conteudoAtual,
                                    reacoes: reacoesBanco
                                  }
                                })
                                .eq('id', idPostAtual)
                            } catch (err) {
                              console.log('Erro ao salvar reação no banco:', err)
                            }
                          }
                          if (novoEmoji) {
                            const donoId = correAberto.usuarioId || correAberto.id
                            if (donoId && usuarioAtual?.id && donoId !== usuarioAtual.id) {
                              await supabase.from('notifications').insert({
                                usuario_id: donoId,
                                remetente_id: usuarioAtual.id,
                                tipo: 'reacao_corre',
                                mensagem: `${usuarioAtual.nome || 'Alguém'} reagiu com ${emoji} no seu Corre Rapidim!`,
                                link: '/feed',
                                lida: false
                              })
                            }
                          }
                        }}
                        style={{
                          background: estaAtivo ? '#008C3A' : 'rgba(0, 0, 0, 0.65)',
                          backdropFilter: 'blur(10px)',
                          border: estaAtivo ? '2px solid #FFD700' : '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '50%',
                          width: 38,
                          height: 38,
                          minWidth: 38,
                          fontSize: 17,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          transition: 'all 0.2s ease',
                          transform: estaAtivo ? 'scale(1.1)' : 'scale(1)'
                        }}
                      >
                        {emoji}
                      </button>
                    )
                  })}
                </div>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  borderRadius: 25,
                  padding: '4px 8px 4px 14px'
                }}>
                  <input
                    type="text"
                    placeholder="Comentar..."
                    value={comentarioTextoCorre}
                    onChange={(e) => setComentarioTextoCorre(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        enviarComentarioCorre(idPostAtual)
                      }
                    }}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      color: '#fff',
                      fontSize: 14
                    }}
                  />
                  {comentarioTextoCorre.trim() && (
                    <button
                      onClick={() => enviarComentarioCorre(idPostAtual)}
                      style={{
                        background: '#008C3A',
                        border: 'none',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        minWidth: 32,
                        color: '#fff',
                        fontWeight: 900,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        marginLeft: 6
                      }}
                    >
                      ➔
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })()}

        {modalViewsAberto && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.8)',
              backdropFilter: 'blur(8px)',
              zIndex: 9999999,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center'
            }}
            onClick={() => setModalViewsAberto(false)}
          >
            <div
              style={{
                background: '#141414',
                width: '100%',
                maxWidth: 500,
                maxHeight: '65vh',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                borderTop: '2px solid #008C3A',
                color: '#fff'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ width: 40, height: 4, background: '#333', borderRadius: 2, margin: '0 auto' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 'bold' }}>
                  Visualizações do Corre
                </h3>
                <button
                  onClick={() => setModalViewsAberto(false)}
                  style={{ background: 'none', border: 'none', color: '#888', fontSize: 18, cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(() => {
                  const itensAtuais = correAberto?.itens || [correAberto]
                  const itemAtual = itensAtuais[itemIndexAtivo] || itensAtuais[0]
                  const idPostAtual = itemAtual?.id || correAberto?.id
                  const listaViews = viewsCorreMap[idPostAtual] || itemAtual?.views || []
                  if (listaViews.length === 0) {
                    return (
                      <p style={{ color: '#888', textAlign: 'center', padding: '30px 0', fontSize: 13 }}>
                        Nenhuma visualização registrada ainda.
                      </p>
                    )
                  }
                  return listaViews.map((espectador: any, idx: number) => (
                    <div
                      key={espectador.id || idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '10px 14px',
                        borderRadius: 14
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: '#008C3A',
                          color: '#fff',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}>
                          {espectador.avatar ? (
                            <img src={espectador.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            espectador.nome?.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <strong style={{ fontSize: 14, color: '#fff', display: 'block' }}>
                            {espectador.nome}
                          </strong>
                          <span style={{ fontSize: 11, color: '#888' }}>
                            Assistiu ao seu Corre
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          </div>
        )}

        {modalEscolhaCorre && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(6px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center'
            }}
            onClick={() => setModalEscolhaCorre(false)}
          >
            <div
              style={{
                background: '#121212',
                width: '100%',
                maxWidth: 500,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: '24px 20px 32px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                borderTop: '2px solid #008C3A'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ width: 40, height: 4, background: '#333', borderRadius: 2, margin: '0 auto 8px auto' }} />
              <h3 style={{ margin: 0, fontSize: 17, color: '#fff', textAlign: 'center', fontWeight: 'bold' }}>
                Criar Corre Rapidim
              </h3>
              <button
                onClick={abrirCameraAoVivo}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  background: '#008C3A',
                  color: '#fff',
                  border: 'none',
                  padding: '16px',
                  borderRadius: 16,
                  fontSize: 15,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Tirar Foto Agora
              </button>
              <button
                onClick={() => {
                  setModalEscolhaCorre(false)
                  correFileInputRef.current?.click()
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  background: 'rgba(255,255,255,0.08)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '16px',
                  borderRadius: 16,
                  fontSize: 15,
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                Galeria do Celular
              </button>
              <button
                onClick={() => setModalEscolhaCorre(false)}
                style={{ background: 'none', border: 'none', color: '#888', padding: '10px', fontSize: 14, cursor: 'pointer', marginTop: 4 }}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {midiaCorreTemp && (
          <CorreEditorModal
            midiaCorreTemp={midiaCorreTemp}
            usuarioAtual={usuarioAtual}
            onClose={() => setMidiaCorreTemp(null)}
            onSuccess={async (correRecemCriado) => {
              await carregarPosts();
              if (usuarioAtual?.id) {
                setCorresVistosMap((prev) => {
                  const copia = { ...prev };
                  delete copia[usuarioAtual.id];
                  delete copia[usuarioAtual.nome];
                  return copia;
                });
              }
              setMidiaCorreTemp(null);
              setItemIndexAtivo(0);
              setCorreAberto(correRecemCriado);
            }}
          />
        )}

        {cameraAberta && (
          <CameraModal
            filtroAplicado={filtroAplicado}
            setFiltroAplicado={setFiltroAplicado}
            onClose={() => setCameraAberta(false)}
            onTirarFoto={(file) => {
              setCameraAberta(false)
              prepararMidiaCorre(file)
            }}
            onAbrirGaleria={() => {
              setCameraAberta(false)
              correFileInputRef.current?.click()
            }}
          />
        )}
      </div>
    </div>
  )
}

const estilos = {
  container: { width: '100%', maxWidth: 500, margin: '0 auto', height: '100vh', background: '#f4f6f8', fontFamily: 'system-ui, sans-serif', position: 'relative' as const, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' },
  scrollContainer: { flex: 1, overflowY: 'auto' as const, overflowX: 'hidden' as const, width: '100%', WebkitOverflowScrolling: 'touch' as const },
  carregando: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#008C3A', fontWeight: 'bold' as const },
  headerVerde: { background: '#008C3A', padding: '14px 16px 16px 16px', display: 'flex', flexDirection: 'column' as const, gap: 12, zIndex: 10, width: '100%', boxSizing: 'border-box' as const },
  topoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoCol: { display: 'flex', alignItems: 'center', gap: 8, height: 40 },
  logoImg: { height: '100%', width: 'auto', objectFit: 'contain' as const, mixBlendMode: 'screen' as const },
  logoTexto: { display: 'flex', flexDirection: 'column' as const },

  icone3D: { width: 34, height: 34, objectFit: 'contain' as const, filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.2))' },
  badgeNotif3D: { 
    position: 'absolute' as const, 
    top: -3, 
    right: -3, 
    background: '#FFD700', 
    color: '#008C3A', 
    borderRadius: '50%', 
    minWidth: 17, 
    height: 17, 
    fontSize: 10, 
    fontWeight: '900' as const, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    border: '1.5px solid #008C3A', 
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
    padding: '0 3px'
  },
  containerFotoPerfilBR: { 
    width: 36, 
    height: 36, 
    borderRadius: '50%', 
    padding: 2, 
    background: 'linear-gradient(135deg, #FFD700 0%, #008C3A 100%)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    cursor: 'pointer', 
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)' 
  },
  avatarFallback: { width: '100%', height: '100%', borderRadius: '50%', background: '#008C3A', color: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' as const, fontSize: 15 },
  imgFull: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' as const },

  buscaRow: { 
    display: 'flex', 
    alignItems: 'center', 
    background: 'rgba(0,0,0,0.2)', 
    padding: '4px 6px 4px 14px', 
    borderRadius: 20, 
    gap: 8, 
    boxSizing: 'border-box' as const,
    border: '1px solid rgba(255,255,255,0.18)',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
  },
  buscaInput: { 
    background: 'transparent', 
    border: 'none', 
    outline: 'none', 
    color: '#fff', 
    fontSize: 14, 
    fontWeight: '500' as const,
    flex: 1 
  },
  btnBusca3D: {
    background: 'linear-gradient(135deg, #00B04B 0%, #006B2D 100%)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '50%',
    width: 34,
    height: 34,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    boxShadow: '0 3px 6px rgba(0,0,0,0.3), inset 0 1px 1px rgba(255,255,255,0.4)',
    transition: 'transform 0.1s ease',
    padding: 0
  },
  storiesWrapper: { padding: '16px 0 0 16px', width: '100%', overflowX: 'hidden' as const, boxSizing: 'border-box' as const },
  storiesTrack: { 
    display: 'flex', 
    gap: 12, 
    overflowX: 'auto' as const, 
    paddingTop: 8, 
    paddingBottom: 8, 
    paddingLeft: 8,
    scrollbarWidth: 'none' as const, 
    width: '100%', 
    WebkitOverflowScrolling: 'touch' as const 
  },
  storyCard: { width: 95, height: 145, borderRadius: 12, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' as const, flexShrink: 0, display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between', padding: 8, overflow: 'hidden' },
  storyOverlay: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)', zIndex: 1 },
  storyAvatarManga: { width: 28, height: 28, borderRadius: '50%', border: '2px solid #008C3A', position: 'relative' as const, zIndex: 2, overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  storyNome: { position: 'relative' as const, zIndex: 2, color: '#fff', fontSize: 11, fontWeight: '600' as const, textShadow: '0 1px 3px rgba(0,0,0,0.8)' },
  btnPublicar: { background: '#008C3A', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 20, fontWeight: 'bold' as const, fontSize: 13, cursor: 'pointer' },
  postCard: { background: '#fff', borderRadius: 16, padding: '14px 0', marginBottom: 14, border: 'none', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', boxSizing: 'border-box' as const, overflow: 'hidden' as const },
  postHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  postAvatar: { width: 40, height: 40, borderRadius: '50%', background: '#008C3A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' as const, overflow: 'hidden' },
  badgeTipoConta: { fontSize: 10, fontWeight: '700' as const, color: '#008C3A', background: '#e6f4ea', padding: '2px 6px', borderRadius: 4 },
  contadoresRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#65676b', paddingBottom: 10, minHeight: 46 },
  contadorPilha: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', minWidth: 22 },
  contadorNumero: { fontSize: 11, marginTop: 1 },
  btnAcao: { flex: 1, background: 'none', border: 'none', padding: '8px 0', fontSize: 13, color: '#65676b', fontWeight: '600' as const, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 6, userSelect: 'none' as const, WebkitUserSelect: 'none' as const, WebkitTouchCallout: 'none' as const, touchAction: 'none' as const },
  popoverReacoes: { position: 'absolute' as const, bottom: '105%', left: 0, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: 30, padding: '4px 8px', display: 'flex', gap: 4, zIndex: 100, border: '1px solid #e4e6eb', userSelect: 'none' as const, WebkitUserSelect: 'none' as const, WebkitTouchCallout: 'none' as const },
  btnEmoji: { background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', padding: '4px', transition: 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)' },
  inputComentario: { flex: 1, background: '#f0f2f5', border: 'none', borderRadius: 20, padding: '8px 14px', outline: 'none', fontSize: 13 },
  btnEnviar: { background: '#008C3A', color: '#fff', border: 'none', borderRadius: 20, padding: '0 16px', fontWeight: 'bold' as const, fontSize: 12, cursor: 'pointer' },
  boxComentario: { background: '#f0f2f5', borderRadius: 14, padding: '8px 12px', alignSelf: 'flex-start', display: 'flex', gap: 8, maxWidth: '90%' },
  avatarComentarioPadrao: { width: 24, height: 24, borderRadius: '50%', background: '#008C3A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold' as const },
  
}