'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import { Card } from '@/components/ui/Card'

function formatarDataPost(dataString?: string) {
  if (!dataString) return 'Agora'
  
  const dataPost = new Date(dataString)
  if (isNaN(dataPost.getTime())) return 'Agora'

  const hora = dataPost.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const data = dataPost.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  return `${hora} - ${data}`
}

type Comentario = {
  id?: string
  texto: string
  autor?: AutorPost | null
  reacoes?: Record<string, string>
  respostas?: Comentario[]
}

type Post = {
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

type Usuario = {
  id: string
  nome: string
  tipo_perfil: string | null
  foto_url?: string | null
  cidade?: string | null
  estado?: string | null
}

type AutorPost = {
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
  const [novoPost, setNovoPost] = useState('')
  const [usuarioAtual, setUsuarioAtual] = useState<Usuario | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0)
  const [mensagensNaoLidas, setMensagensNaoLidas] = useState(0)
  const [midiaArquivo, setMidiaArquivo] = useState<File | null>(null)
  const [legendaCorre, setLegendaCorre] = useState('')
  const [sugestoesAmigos, setSugestoesAmigos] = useState<any[]>([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [usuariosMarcadosIds, setUsuariosMarcadosIds] = useState<string[]>([])
  const [comentarioTextoCorre, setComentarioTextoCorre] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const correFileInputRef = useRef<HTMLInputElement>(null)
  const correCameraInputRef = useRef<HTMLInputElement>(null)

  const [puxando, setPuxando] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  const startY = useRef(0)
  const pullDistance = useRef(0)

  const [modalEscolhaCorre, setModalEscolhaCorre] = useState(false)
  const [midiaCorreTemp, setMidiaCorreTemp] = useState<File | null>(null)
  const [adesivoSelecionado, setAdesivoSelecionado] = useState<string | null>(null)

  const [modalMusicaAberto, setModalMusicaAberto] = useState(false)
  const [buscaMusica, setBuscaMusica] = useState('')
  const [resultadosMusica, setResultadosMusica] = useState<any[]>([])
  const [carregandoMusica, setCarregandoMusica] = useState(false)
  const [musicaSelecionada, setMusicaSelecionada] = useState<any | null>(null)
  const [audioPreview, setAudioPreview] = useState<HTMLAudioElement | null>(null)

  const [corresVistosMap, setCorresVistosMap] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const salvos = localStorage.getItem('brazilzao_corres_vistos_v2')
      return salvos ? JSON.parse(salvos) : {}
    }
    return {}
  })

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

  const [listaCorres, setListaCorres] = useState<any[]>([])
  
  const buscarMusicas = async (termo: string) => {
    setBuscaMusica(termo)
    if (termo.trim().length < 2) {
      setResultadosMusica([])
      return
    }

    setCarregandoMusica(true)
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(termo)}&media=music&entity=song&limit=15&country=BR`)
      const data = await res.json()
      
      if (data && data.results) {
        const musicasFormatadas = data.results.map((track: any) => ({
          id: track.trackId,
          title: track.trackName,
          artist: { name: track.artistName },
          album: { cover_small: track.artworkUrl60, cover_medium: track.artworkUrl100 },
          preview: track.previewUrl
        }))
        setResultadosMusica(musicasFormatadas)
      } else {
        setResultadosMusica([])
      }
    } catch (err) {
      console.log('Erro ao buscar músicas:', err)
      setResultadosMusica([])
    } finally {
      setCarregandoMusica(false)
    }
  }

  const tocarPreview = (previewUrl: string) => {
    if (audioPreview) {
      audioPreview.pause()
    }
    const novoAudio = new Audio(previewUrl)
    novoAudio.play()
    setAudioPreview(novoAudio)
  }
  const [cameraAberta, setCameraAberta] = useState(false)
  const videoCameraRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

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

  useEffect(() => {
    itemIndexRef.current = itemIndexAtivo
  }, [itemIndexAtivo])

  const meuid = usuarioAtual?.id || ''

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
          if (reacaoSalva) {
            mapaReacoes[it.id] = reacaoSalva
          }
        }
      })

      setComentariosCorreMap(prev => ({ ...prev, ...mapaComents }))
      setReacoesPorPost(prev => ({ ...prev, ...mapaReacoes }))
      setViewsCorreMap(prev => ({ ...prev, ...mapaViews }))

      const itemAtualInic = itens[0]
      const idPost = itemAtualInic?.id
      const donoId = correAberto.usuarioId || correAberto.id

      if (idPost && meuid && meuid !== donoId) {
        const registrarViewNoBanco = async () => {
          try {
            const { data: postBanco } = await supabase
              .from('feed_posts')
              .select('conteudo')
              .eq('id', idPost)
              .maybeSingle()

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

              await supabase
                .from('feed_posts')
                .update({
                  conteudo: {
                    ...conteudoAtual,
                    views: novaListaViews
                  }
                })
                .eq('id', idPost)

              setViewsCorreMap(prev => ({
                ...prev,
                [idPost]: novaListaViews
              }))
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
    const itensAtuais = correAberto?.itens && correAberto.itens.length > 0
      ? correAberto.itens
      : [correAberto]
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

    const listaItens = correAberto.itens && correAberto.itens.length > 0
      ? correAberto.itens
      : [{ id: correAberto.id, imagemBg: correAberto.imagemBg, musica: correAberto.musica }]

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

          const indexUsuarioAtual = listaCorres.findIndex(
            c => (c.usuarioId || c.id || c.nome) === chaveUnica
          )

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
      } else {
        setProgressoCorre(porcentagem)
      }
    }, 50)

    return () => {
      if (timerCorreRef.current) clearInterval(timerCorreRef.current)
    }
  }, [correAberto, itemIndexAtivo, listaCorres])

  const abrirCameraAoVivo = async () => {
    setModalEscolhaCorre(false)

    try {
      const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera')

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera
      })

      if (photo.webPath) {
        const response = await fetch(photo.webPath)
        const blob = await response.blob()
        const file = new File([blob], `corre-${Date.now()}.jpg`, { type: 'image/jpeg' })

        prepararMidiaCorre(file)
      }
    } catch (err) {
      console.log('Câmera nativa cancelada ou indisponível.', err)
    }
  }

  const fecharCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
    }
    setCameraAberta(false)
  }

  const tirarFoto = () => {
    if (!videoCameraRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoCameraRef.current.videoWidth
    canvas.height = videoCameraRef.current.videoHeight
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.drawImage(videoCameraRef.current, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) return
        fecharCamera()
        const file = new File([blob], `corre-${Date.now()}.jpg`, { type: 'image/jpeg' })
        prepararMidiaCorre(file)
      }, 'image/jpeg')
    }
  }

  function tocarSomNotificacao() {
    try {
      const som = new Audio('/notificacao.mp3')
      som.play().catch((e) => console.log('Áudio bloqueado pelo navegador:', e.message))
    } catch (error) {}
  }

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
            setTimeout(() => {
              elComentario.style.backgroundColor = '#f0f2f5'
            }, 2500)
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
            setTimeout(() => {
              elemento.style.boxShadow = 'none'
            }, 2000)
          }
        }, 500)
      }
    }
  }, [posts])

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
      if (diff > 70) {
        setPuxando(true)
      }
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

  useEffect(() => {
  async function iniciarSistema() {
    const { data } = await supabase.auth.getSession()
    if (!data?.session?.user) return router.replace('/login')
    
    await carregarUsuarioAtual(data.session.user.id)
    setVerificandoLogin(false)
  }
  iniciarSistema()
}, [router])

// Re-carrega os posts e Corres assim que o usuarioAtual for definido no celular
useEffect(() => {
  if (usuarioAtual?.id) {
    carregarPosts()
  }
}, [usuarioAtual?.id])

  useEffect(() => {
    if (!usuarioAtual?.id) return

    async function carregarContadorNotificacoes() {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', usuarioAtual?.id)
        .eq('lida', false)
      if (count !== null) setNotificacoesNaoLidas(count)
    }

    async function carregarMensagensNaoLidas() {
      const { count } = await supabase
        .from('mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', usuarioAtual?.id)
        .eq('lida', false)

      setMensagensNaoLidas(count ?? 0)
    }

    carregarContadorNotificacoes()
    carregarMensagensNaoLidas()

    const canalNotif = supabase
      .channel('notificacoes-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `usuario_id=eq.${usuarioAtual.id}`
        },
        () => {
          setNotificacoesNaoLidas((prev) => prev + 1)
          tocarSomNotificacao()
        }
      )
      .subscribe()

    const canalMensagens = supabase
      .channel('realtime-mensagens-feed')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `destinatario_id=eq.${usuarioAtual.id}`
        },
        () => {
          setMensagensNaoLidas((prev) => prev + 1)
          tocarSomNotificacao()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(canalNotif)
      supabase.removeChannel(canalMensagens)
    }
  }, [usuarioAtual?.id])

  async function carregarUsuarioAtual(id: string) {
    let { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!data) {
      const { data: usuarioPorAuth } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', id)
        .maybeSingle()
      data = usuarioPorAuth
    }
    if (data) setUsuarioAtual(data)
  }

  async function carregarPosts() {
    const { data } = await supabase.from('feed_posts').select('*').order('created_at', { ascending: false })
    
    if (data) {
      const postsNormais = data.filter((p: any) => p.visibilidade !== 'corre_rapidim')
      setPosts(postsNormais.map((p: any) => ({
        ...p.conteudo,
        id: p.id,
        usuario_id: p.usuario_id,
        tempo: p.created_at || p.conteudo?.tempo,
        comentarios: p.conteudo?.comentarios || [],
        reacoes: p.conteudo?.reacoes || {},
        espalhadosCount: p.conteudo?.espalhadosCount || 0
      })))
// 2. Separa os Corres Rapidim
const postsCorres = data.filter((p: any) => p.visibilidade === 'corre_rapidim' || p.conteudo?.tipo === 'corre_rapidim')

if (postsCorres.length > 0) {
  const idsUsuarios = Array.from(new Set(postsCorres.map((p: any) => p.usuario_id)))
  const { data: perfisData } = await supabase
    .from('profiles')
    .select('id, nome, foto_url')
    .in('id', idsUsuarios)

  const perfisMap: Record<string, any> = {}
  if (perfisData) {
    perfisData.forEach((perfil: any) => {
      perfisMap[perfil.id] = perfil
    })
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
        isUser: usuarioAtual?.id === donoId || usuarioAtual?.nome === perfilAutor.nome,
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
    }
  }

  async function publicarPost() {
    if (!novoPost.trim() && !midiaArquivo) return
    let midiaUrl = null
    if (midiaArquivo) {
      const extensao = midiaArquivo.name.split('.').pop()?.toLowerCase() || 'file'
      const nomeComExtensao = `${Date.now()}.${extensao}`

      const { data: uploadData } = await supabase.storage.from('posts').upload(`${usuarioAtual?.id}/${nomeComExtensao}`, midiaArquivo)
      if (uploadData) midiaUrl = supabase.storage.from('posts').getPublicUrl(uploadData.path).data.publicUrl
    }
    const autor: AutorPost = {
      id: usuarioAtual?.id || '',
      nome: usuarioAtual?.nome || 'Usuário',
      username: usuarioAtual?.nome?.toLowerCase().replace(/\s+/g, '') || 'user',
      avatar: usuarioAtual?.nome?.charAt(0).toUpperCase() || 'U',
      foto_url: usuarioAtual?.foto_url || null
    }
    const postPronto: Post = {
      texto: novoPost.trim(),
      midiaUrl,
      autor,
      reacoes: {},
      comentarios: [],
      visibilidade: 'mundial',
      localizacao: usuarioAtual?.cidade && usuarioAtual?.estado 
        ? `${usuarioAtual.cidade}, ${usuarioAtual.estado}` 
        : 'Brasil',
      tipoConta: 'Usuário',
      tempo: new Date().toISOString(),
      espalhado: false,
      espalhadosCount: 0
    }
    const { data } = await supabase.from('feed_posts').insert({ conteudo: postPronto, usuario_id: usuarioAtual?.id, visibilidade: 'mundial' }).select().single()
    if (data) setPosts([{ ...postPronto, id: data.id, usuario_id: data.usuario_id }, ...posts])
    setNovoPost('')
    setMidiaArquivo(null)
  }

  const atualizarPostNoBanco = async (postAtualizado: Post) => {
    if (postAtualizado.id) {
      await supabase.from('feed_posts').update({ conteudo: postAtualizado }).eq('id', postAtualizado.id)
    }
  }

  if (verificandoLogin) return <div style={estilos.carregando}>Carregando...</div>

  const prepararMidiaCorre = (file: File) => {
    setMidiaCorreTemp(file)
  }

  const publicarCorreDefinitivo = async () => {
    if (!midiaCorreTemp || !usuarioAtual?.id) return

    const extensao = midiaCorreTemp.name.split('.').pop()?.toLowerCase() || 'file'
    const nomeArquivo = `corres/${Date.now()}.${extensao}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('posts')
      .upload(`${usuarioAtual.id}/${nomeArquivo}`, midiaCorreTemp)

    if (uploadError) {
      alert('Erro ao enviar seu Corre: ' + uploadError.message)
      return
    }

    const urlPublica = supabase.storage.from('posts').getPublicUrl(uploadData.path).data.publicUrl

    const novoSubItem = {
      id: `corre-sub-${Date.now()}`,
      imagemBg: urlPublica,
      criadoEm: new Date().toISOString(),
      legenda: legendaCorre,
      adesivo: adesivoSelecionado,
      musica: musicaSelecionada ? { ...musicaSelecionada } : null
    }

    const { data: postCriado, error: dbError } = await supabase.from('feed_posts').insert({
      usuario_id: usuarioAtual.id,
      visibilidade: 'corre_rapidim',
      conteudo: {
        tipo: 'corre_rapidim',
        nome: usuarioAtual.nome || 'Corre',
        avatar: usuarioAtual.foto_url || '',
        imagemBg: urlPublica,
        legenda: legendaCorre,
        adesivo: adesivoSelecionado,
        musica: musicaSelecionada ? { ...musicaSelecionada } : null,
        criadoEm: new Date().toISOString()
      }
    }).select().single()

    if (dbError) {
      console.log('Aviso ao persistir no banco:', dbError.message)
    } else if (postCriado && usuariosMarcadosIds.length > 0) {
      for (const amigoId of usuariosMarcadosIds) {
        if (amigoId !== usuarioAtual.id) {
          await supabase.from('notifications').insert({
            usuario_id: amigoId,
            remetente_id: usuarioAtual.id,
            tipo: 'marcacao_corre',
            mensagem: `${usuarioAtual.nome || 'Alguém'} marcou você em um Corre Rapidim!`,
            link: `/feed`,
            lida: false
          })
        }
      }
    }

    // Recarrega todos os posts para garantir sincronia do Corre
    await carregarPosts()

    const correRecemCriado = {
      id: postCriado?.id || `corre-grupo-${Date.now()}`,
      usuarioId: usuarioAtual.id,
      nome: usuarioAtual.nome || 'Seu Corre',
      avatar: usuarioAtual.foto_url || '',
      imagemBg: urlPublica,
      isUser: true,
      criadoEm: new Date().toISOString(),
      itens: [novoSubItem]
    }

    setMidiaCorreTemp(null)
    setMusicaSelecionada(null)
    setLegendaCorre('')
    setAdesivoSelecionado(null)
    setUsuariosMarcadosIds([])

    // Força o celular a reconhecer que há mídia novinha no topo
if (usuarioAtual?.id) {
  setCorresVistosMap((prev) => {
    const copia = { ...prev }
    delete copia[usuarioAtual.id]
    delete copia[usuarioAtual.nome]
    return copia
  })
}

setItemIndexAtivo(0)
setCorreAberto(correRecemCriado)
}

  const handleLegendaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const texto = e.target.value
    setLegendaCorre(texto)

    const ultimaPalavra = texto.split(' ').pop() || ''
    if (ultimaPalavra.startsWith('@')) {
      const termoBusca = ultimaPalavra.replace('@', '').trim()
      setMostrarSugestoes(true)

      const { data } = await supabase
        .from('profiles')
        .select('id, nome, foto_url')
        .ilike('nome', `%${termoBusca}%`)
        .limit(5)

      if (data) setSugestoesAmigos(data)
    } else {
      setMostrarSugestoes(false)
    }
  }

  const selecionarAmigoMarcado = (amigo: { id: string; nome: string }) => {
    const palavras = legendaCorre.split(' ')
    palavras.pop()
    const novoTexto = [...palavras, `@${amigo.nome} `].join(' ')
    
    setLegendaCorre(novoTexto)
    setMostrarSugestoes(false)

    if (!usuariosMarcadosIds.includes(amigo.id)) {
      setUsuariosMarcadosIds((prev) => [...prev, amigo.id])
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

    const donoId = correAberto.usuarioId || correAberto.id
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
      <header style={estilos.headerVerde}>
        <div style={estilos.topoRow}>
          <div style={estilos.logoCol}>
            <img src="/logo-br.jpg" alt="BR" style={estilos.logoImg} />
            <div style={estilos.logoTexto}>
              <span style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>BRAZILZÃO</span>
              <span style={{ fontSize: 11, color: '#d1fae5' }}>o corre conectado</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => router.push('/mensagens')}>
              <span style={{ fontSize: 20 }}>💬</span>
              {mensagensNaoLidas > 0 && (
                <span style={estilos.badgeNotif}>
                  {mensagensNaoLidas > 99 ? '99+' : mensagensNaoLidas}
                </span>
              )}
            </div>

            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => router.push('/notificacoes')}>
              <span style={{ fontSize: 20 }}>🔔</span>
              {notificacoesNaoLidas > 0 && <span style={estilos.badgeNotif}>{notificacoesNaoLidas}</span>}
            </div>

            <div style={estilos.avatarTopo} onClick={() => router.push(`/perfil?id=${usuarioAtual?.id}`)}>
              {usuarioAtual?.foto_url ? <img src={usuarioAtual.foto_url} alt="" style={estilos.imgFull} /> : usuarioAtual?.nome?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
        <div style={estilos.buscaRow}>
          <span>🔍</span>
          <input type="text" placeholder="Buscar no Brazilzão..." style={estilos.buscaInput} />
          <span style={{ color: '#fff', fontSize: 18, cursor: 'pointer', marginLeft: 'auto' }}>⚙️</span>
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

        {/* CABEÇALHO DO CORRE RAPIDIM CENTRALIZADO */}
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
            onClick={() => setModalEscolhaCorre(true)}
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
   
        <section style={{ padding: '16px 16px 12px 16px' }}>
          <Card style={{ padding: 14, borderRadius: 16, background: '#fff', border: 'none' }}>
            <textarea
              value={novoPost}
              onChange={(e) => setNovoPost(e.target.value)}
              placeholder="O que quer compartilhar hoje?"
              style={{ width: '100%', border: 'none', outline: 'none', resize: 'none', fontSize: 14 }}
            />
            <input 
              type="file" 
              accept="image/*,video/*" 
              ref={fileInputRef} 
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) setMidiaArquivo(file)
              }} 
              style={{ display: 'none' }} 
            />
            {midiaArquivo && (
              <div style={{ position: 'relative', marginTop: 8 }}>
                {midiaArquivo.type.startsWith('video/') ? (
                  <video 
                    src={URL.createObjectURL(midiaArquivo)} 
                    controls 
                    style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} 
                  />
                ) : (
                  <img 
                    src={URL.createObjectURL(midiaArquivo)} 
                    alt="Preview" 
                    style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8 }} 
                  />
                )}
                <button 
                  onClick={() => setMidiaArquivo(null)}
                  style={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 24,
                    height: 24,
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}
                >
                  ✕
                </button>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }} title="Adicionar Foto ou Vídeo">
                📷🎥
              </button>
              <button onClick={publicarPost} style={estilos.btnPublicar}>Publicar</button>
            </div>
          </Card>
        </section>

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
                👁️ Visualizações do Corre
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
              ⚡ Criar Corre Rapidim
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
              📷 Tirar Foto Agora
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
              🖼️ Galeria do Celular
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
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#0a0a0a',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '16px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
            <button 
              onClick={() => {
                setMidiaCorreTemp(null)
                setMusicaSelecionada(null)
              }} 
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                border: 'none',
                color: '#fff',
                padding: '10px 18px',
                borderRadius: 30,
                fontWeight: 'bold',
                fontSize: 13,
                cursor: 'pointer'
              }}
            >
              ✕ Cancelar
            </button>

            <button 
              onClick={() => setModalMusicaAberto(true)}
              style={{
                background: musicaSelecionada ? '#FFD700' : 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
                color: musicaSelecionada ? '#000' : '#fff',
                border: musicaSelecionada ? 'none' : '1px solid rgba(255,255,255,0.2)',
                padding: '10px 18px',
                borderRadius: 30,
                fontWeight: 'bold',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: musicaSelecionada ? '0 0 15px rgba(255, 215, 0, 0.4)' : 'none'
              }}
            >
              🎵 {musicaSelecionada ? `Trilha: ${musicaSelecionada.titulo}` : 'Trilha do Corre'}
            </button>
          </div>

          <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '14px 0' }}>
            {midiaCorreTemp.type.startsWith('video/') ? (
              <video 
                src={URL.createObjectURL(midiaCorreTemp)} 
                autoPlay 
                loop 
                muted 
                playsInline 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '62vh', 
                  borderRadius: 24, 
                  objectFit: 'contain',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)'
                }} 
              />
            ) : (
              <img 
                src={URL.createObjectURL(midiaCorreTemp)} 
                alt="Prévia" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '62vh', 
                  borderRadius: 24, 
                  objectFit: 'contain',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)'
                }} 
              />
            )}

            {adesivoSelecionado && (
              <div style={{
                position: 'absolute',
                top: 16,
                left: 16,
                background: '#FFD700',
                color: '#000',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: '800',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                zIndex: 20
              }}>
                {adesivoSelecionado}
              </div>
            )}

            {musicaSelecionada && (
              <div style={{
                position: 'absolute',
                bottom: 24,
                left: 16,
                right: 16,
                background: 'rgba(18, 18, 18, 0.75)',
                backdropFilter: 'blur(16px)',
                padding: '10px 14px',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                border: '1px solid rgba(255,255,255,0.15)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ position: 'relative', width: 40, height: 40 }}>
                    <img 
                      src={musicaSelecionada.capa || '/logo-br.jpg'} 
                      alt="" 
                      style={{ 
                        width: 40, 
                        height: 40, 
                        borderRadius: '50%', 
                        objectFit: 'cover',
                        border: '2px solid #FFD700',
                        animation: 'spin 8s linear infinite'
                      }} 
                    />
                  </div>
                  <div>
                    <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{musicaSelecionada.titulo}</p>
                    <p style={{ margin: 0, color: '#FFD700', fontSize: 11 }}>{musicaSelecionada.artista}</p>
                  </div>
                </div>

                <button 
                  onClick={() => setMusicaSelecionada(null)}
                  style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#aaa', width: 28, height: 28, borderRadius: '50%', fontSize: 12, cursor: 'pointer' }}
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, zIndex: 100, position: 'relative' }}>
            {mostrarSugestoes && sugestoesAmigos.length > 0 && (
              <div style={{
                position: 'absolute',
                bottom: '100%',
                left: 0,
                right: 0,
                background: '#1c1c1e',
                border: '1px solid rgba(255, 215, 0, 0.4)',
                borderRadius: 16,
                padding: '6px',
                marginBottom: 8,
                maxHeight: 180,
                overflowY: 'auto',
                boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.7)',
                zIndex: 999
              }}>
                {sugestoesAmigos.map((amigo) => (
                  <div
                    key={amigo.id}
                    onClick={() => selecionarAmigoMarcado(amigo)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      borderRadius: 12,
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 215, 0, 0.15)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#008C3A', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                      {amigo.foto_url ? (
                        <img src={amigo.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        amigo.nome?.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>@{amigo.nome}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '6px 0', scrollbarWidth: 'none', zIndex: 10 }}>
              {['🛠️ No Trampo', '💸 Paguei o Boleto', '☕ Maciota', '🥩 Resenha', '🚌 No Busão', '🔥 Na Atividade'].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setAdesivoSelecionado(adesivoSelecionado === tag ? null : tag)}
                  style={{
                    background: adesivoSelecionado === tag ? '#FFD700' : 'rgba(255,255,255,0.18)',
                    color: adesivoSelecionado === tag ? '#000' : '#ffffff',
                    border: adesivoSelecionado === tag ? '1px solid #FFD700' : '1px solid rgba(255,255,255,0.3)',
                    padding: '6px 14px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>

            <input 
              type="text" 
              placeholder="Manda a visão ou marca a turma com @..."
              value={legendaCorre}
              onChange={handleLegendaChange}
              style={{
                width: '100%',
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 16,
                padding: '14px 18px',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />

            <button 
              onClick={publicarCorreDefinitivo}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #008C3A 0%, #00662a 100%)',
                color: '#fff',
                border: '1px solid #FFD700',
                padding: '16px',
                borderRadius: 18,
                fontSize: 16,
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(0, 140, 58, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              🚀 Publicar no Corre (24h)
            </button>
          </div>
        </div>
      )}

      {modalMusicaAberto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.88)',
          backdropFilter: 'blur(8px)',
          zIndex: 9999999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.15)', width: '100%', maxWidth: 420, borderRadius: 24, padding: 20, color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 'bold', fontSize: 18 }}>🎵 Trilha do Corre</h3>
              <button 
                onClick={() => {
                  if (audioPreview) audioPreview.pause()
                  setModalMusicaAberto(false)
                }}
                style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <input 
              type="text"
              placeholder="Digite a música ou artista..."
              value={buscaMusica}
              onChange={(e) => buscarMusicas(e.target.value)}
              style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 16px', color: '#fff', marginBottom: 16, outline: 'none' }}
            />

            <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {carregandoMusica && <p style={{ color: '#888', textAlign: 'center', padding: '16px 0' }}>Buscando faixas...</p>}
              
              {!carregandoMusica && resultadosMusica.length === 0 && buscaMusica.length > 1 && (
                <p style={{ color: '#888', textAlign: 'center', padding: '16px 0' }}>Nenhuma música encontrada.</p>
              )}

              {resultadosMusica.map((track) => (
                <div 
                  key={track.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px 12px', borderRadius: 14 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={track.album.cover_small} alt={track.title} style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover' }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: 13, color: '#fff' }}>{track.title}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#888' }}>{track.artist.name}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 6 }}>
                    <button 
                      onClick={() => tocarPreview(track.preview)}
                      style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer' }}
                    >
                      ▶️
                    </button>
                    <button 
                      onClick={() => {
                        if (audioPreview) audioPreview.pause()
                        setMusicaSelecionada({
                          titulo: track.title,
                          artista: track.artist.name,
                          capa: track.album.cover_medium,
                          previewUrl: track.preview
                        })
                        setModalMusicaAberto(false)
                      }}
                      style={{ background: '#FFD700', border: 'none', color: '#000', fontWeight: 'bold', fontSize: 12, padding: '0 14px', borderRadius: 10, cursor: 'pointer' }}
                    >
                      Usar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {cameraAberta && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: '#000',
          zIndex: 999999,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: 480, height: '80vh', overflow: 'hidden', borderRadius: 16 }}>
            <video
              ref={videoCameraRef}
              autoPlay
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />

            <button
              onClick={fecharCamera}
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                background: 'rgba(0,0,0,0.5)',
                border: 'none',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 'bold',
                cursor: 'pointer',
                zIndex: 10
              }}
            >
              Cancelar
            </button>

            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 10, zIndex: 10 }}>
              <button onClick={() => correFileInputRef.current?.click()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: 12, padding: '6px 10px', color: '#fff', cursor: 'pointer' }}>
                <span style={{ fontSize: 18 }}>🖼️</span>
                <span style={{ fontSize: 10 }}>Galeria</span>
              </button>
              <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(0,0,0,0.6)', border: '1px solid #00F0FF', boxShadow: '0 0 8px #00F0FF', borderRadius: 12, padding: '6px 10px', color: '#fff', cursor: 'pointer' }}>
                <span style={{ fontSize: 18 }}>🤖</span>
                <span style={{ fontSize: 10 }}>IA Foto</span>
              </button>
            </div>

            <button
              onClick={tirarFoto}
              style={{
                position: 'absolute',
                bottom: 80,
                right: 20,
                width: 56,
                height: 56,
                borderRadius: '50%',
                backgroundColor: '#fff',
                border: '4px solid #ccc',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
                zIndex: 10
              }}
            >
              📷
            </button>

            <div style={{ position: 'absolute', bottom: 12, left: 12, right: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)', padding: '8px 12px', borderRadius: 24, zIndex: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #00F0FF', boxShadow: '0 0 6px #00F0FF', background: '#111' }} />
                  <span style={{ fontSize: 9, marginTop: 2 }}>Filtro Futuro</span>
                </button>
                <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #fff', background: '#333' }} />
                  <span style={{ fontSize: 9, marginTop: 2 }}>Filtro Urbano</span>
                </button>
                <button style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #fff', background: '#053' }} />
                  <span style={{ fontSize: 9, marginTop: 2 }}>Filtro Bio</span>
                </button>
              </div>

              <button onClick={tirarFoto} style={{ background: '#333', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 20, fontWeight: 'bold', fontSize: 12, cursor: 'pointer' }}>
                Aplicar
              </button>
            </div>
          </div>
        </div>
      )}

      <nav style={estilos.navInferior}>
        <button style={estilos.btnNavAtivo} onClick={() => router.push('/feed')}><span>🏠</span>Início</button>
        <button style={estilos.btnNav} onClick={() => router.push('/videos')}><span>▶️</span>Vídeos</button>
        <button style={estilos.btnNav} onClick={() => router.push('/vendas')}><span>🛍️</span>Vendas</button>
        <button style={estilos.btnNav} onClick={() => router.push('/comunidades')}><span>👥</span>Comunidades</button>
      </nav>
      </div>
    </div>
  )
}

function PostCard({ post, usuarioAtual, onUpdate, onDelete, onEspalhar }: { post: Post; usuarioAtual: Usuario | null; onUpdate: (p: Post) => void; onDelete?: (id: string) => void; onEspalhar?: (p: Post) => void }) {
  const router = useRouter()
  const [midiaExpandida, setMidiaExpandida] = useState<string | null>(null)
  const [mostrarReacoes, setMostrarReacoes] = useState(false)
  const [comentarioAberto, setComentarioAberto] = useState(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      return params.get('comentarioId') ? true : false
    }
    return false
  })
  const [novoComentario, setNovoComentario] = useState('')
  const [emojiAtivoNoToque, setEmojiAtivoNoToque] = useState<string | null>(null)
  const [mostrarMenuOpcoes, setMostrarMenuOpcoes] = useState(false)
  const [mostrarMenuEspalhar, setMostrarMenuEspalhar] = useState(false)
  const [modalMensagem, setModalMensagem] = useState(false)
  const [amigosParaEnviar, setAmigosParaEnviar] = useState<Usuario[]>([])
  const [enviandoPara, setEnviandoPara] = useState<string | null>(null)
  const [respondendoId, setRespondendoId] = useState<string | null>(null)
  const [textoResposta, setTextoResposta] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [textoExpandido, setTextoExpandido] = useState(false)
  const [textoEditado, setTextoEditado] = useState(post.texto || '')
  const [fotoRealAutor, setFotoRealAutor] = useState<string | null>(post.autor?.foto_url || null)

  useEffect(() => {
    async function buscarDadosAutor() {
      if (post.usuario_id) {
        const { data } = await supabase
          .from('profiles')
          .select('foto_url, cidade, estado')
          .eq('id', post.usuario_id)
          .maybeSingle()

        if (data) {
          if (data.foto_url) setFotoRealAutor(data.foto_url)
          if (data.cidade && data.estado) {
            post.localizacao = `${data.cidade}, ${data.estado}`
          }
        }
      }
    }
    buscarDadosAutor()
  }, [post.usuario_id, post.autor?.foto_url])

  useEffect(() => {
    const meuId = usuarioAtual?.id
    if (modalMensagem && meuId) {
      async function carregarUsuariosParaEnviar() {
        const { data } = await supabase
          .from('profiles')
          .select('id, nome, foto_url, tipo_perfil')
          .neq('id', meuId)
          .limit(20)
        
        if (data) setAmigosParaEnviar(data)
      }
      carregarUsuariosParaEnviar()
    }
  }, [modalMensagem, usuarioAtual?.id])

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const hoverTimer = useRef<NodeJS.Timeout | null>(null)
  const touchTimer = useRef<NodeJS.Timeout | null>(null)
  const emojiRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  useEffect(() => {
    const elementoVideo = videoRef.current
    if (!elementoVideo) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            elementoVideo.play().then(() => {
              if (!elementoVideo.dataset.viewContada) {
                elementoVideo.dataset.viewContada = 'true'
                const novasViews = (post.viewsCount || 0) + 1
                onUpdate({ ...post, viewsCount: novasViews })
              }
            }).catch(() => {
              elementoVideo.muted = true
              elementoVideo.play().catch(() => {})
            })
          } else {
            elementoVideo.pause()
          }
        })
      },
      { threshold: 0.6 }
    )

    observer.observe(elementoVideo)

    return () => {
      if (elementoVideo) observer.unobserve(elementoVideo)
    }
  }, [post.midiaUrl])

  const usuarioId = usuarioAtual?.id || 'anonimo'
  const ehMeuPost = usuarioAtual?.id && post.usuario_id && usuarioAtual.id === post.usuario_id
  const reacaoAtual = post.reacoes?.[usuarioId]
  const jaReagiu = !!reacaoAtual
  const labelReacao = REACOES_LISTA.find(r => r.emoji === reacaoAtual)?.label || 'Gostar'
  const isVideoUrl = (url?: string | null) => {
    if (!url) return false
    return url.match(/\.(mp4|webm|ogg|mov|mkv)($|\?)/i) || url.includes('video')
  }

  const alterarReacao = async (emoji: string) => {
    const reacoes = { ...post.reacoes }
    const jaReagiuStatus = reacoes[usuarioId] === emoji
    if (jaReagiuStatus) {
      delete reacoes[usuarioId]
    } else {
      reacoes[usuarioId] = emoji
    }
    setMostrarReacoes(false)
    onUpdate({ ...post, reacoes })
    const donoDoPostId = post.usuario_id || post.autor?.id
    if (!jaReagiuStatus && donoDoPostId && usuarioAtual?.id && donoDoPostId !== usuarioAtual.id) {
      const { error } = await supabase.from('notifications').insert({
        usuario_id: donoDoPostId,
        remetente_id: usuarioAtual.id,
        tipo: 'curtida',
        mensagem: `${usuarioAtual.nome || 'Alguém'} reagiu com ${emoji} no seu post.`,
        link: `/feed?postId=${post.id}`,
        lida: false
      })
      if (error) {
        alert('Erro ao salvar notificação: ' + error.message)
      }
    }
  }

  const darGosteiDireto = () => {
    alterarReacao('🤙')
  }

  const espalharNoFeed = async () => {
    setMostrarMenuEspalhar(false)
    if (!usuarioAtual) return
    const confirmar = window.confirm('Deseja espalhar esta publicação no seu feed?')
    if (!confirmar) return

    const espalhadosCount = (post.espalhadosCount || 0) + 1
    onUpdate({ ...post, espalhado: true, espalhadosCount })

    const novoPostEspalhado: Post = {
      texto: post.texto,
      autor: post.autor,
      midiaUrl: post.midiaUrl,
      reacoes: {},
      comentarios: [],
      visibilidade: post.visibilidade,
      localizacao: post.localizacao,
      tipoConta: post.tipoConta,
      tempo: 'Agora',
      espalhado: false,
      espalhadosCount: 0,
      espalhadoPor: usuarioAtual.nome
    }

    const { data } = await supabase
      .from('feed_posts')
      .insert({ conteudo: novoPostEspalhado, usuario_id: usuarioAtual.id, visibilidade: 'mundial' })
      .select()
      .single()

    if (data && onEspalhar) {
      onEspalhar({ ...novoPostEspalhado, id: data.id, usuario_id: data.usuario_id })
      
      const donoDoPostId = post.usuario_id || post.autor?.id
      if (donoDoPostId && donoDoPostId !== usuarioAtual.id) {
        const { error } = await supabase.from('notifications').insert({
          usuario_id: donoDoPostId,
          remetente_id: usuarioAtual.id,
          tipo: 'espalhado',
          mensagem: `${usuarioAtual.nome || 'Alguém'} espalhou a sua publicação.`,
          link: `/feed?postId=${post.id}`,
          lida: false
        })
        if (error) {
          console.error('Erro ao salvar notificação de espalhado:', error.message)
        }
      }
      alert('Publicação espalhada com sucesso no feed!')
    }
  }

  const linkCompartilhamento = `${typeof window !== 'undefined' ? window.location.origin : ''}/feed?postId=${post.id}`

  const espalharWhatsApp = () => {
    setMostrarMenuEspalhar(false)
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(linkCompartilhamento)}`, '_blank')
  }

  const espalharFacebook = () => {
    setMostrarMenuEspalhar(false)
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(linkCompartilhamento)}`, '_blank')
  }

  const espalharInterno = (destino: string) => {
    setMostrarMenuEspalhar(false)
    if (destino === 'Mensagens') {
      setModalMensagem(true)
    } else {
      alert(`Publicação espalhada no(a) ${destino} com sucesso!`)
    }
  }

  const enviarMensagemParaUsuario = async (amigoId: string) => {
    if (!usuarioAtual?.id) return
    setEnviandoPara(amigoId)
    const textoMsg = `Dá uma olhada nisso no Brazilzão:\n\n${linkCompartilhamento}`

    let idDaConversa = null
    const { data: conversaExistente } = await supabase
      .from('conversas')
      .select('id')
      .or(`and(usuario_1.eq.${usuarioAtual.id},usuario_2.eq.${amigoId}),and(usuario_1.eq.${amigoId},usuario_2.eq.${usuarioAtual.id})`)
      .limit(1)
      .maybeSingle()

    if (conversaExistente?.id) {
      idDaConversa = conversaExistente.id
    } else {
      const { data: novaConversa, error: erroConversa } = await supabase
        .from('conversas')
        .insert({
          usuario_1: usuarioAtual.id,
          usuario_2: amigoId,
          criado_em: new Date().toISOString()
        })
        .select('id')
        .single()

      if (erroConversa) {
        alert(`Erro ao criar a conversa: ${erroConversa.message}`)
        setEnviandoPara(null)
        return
      }
      idDaConversa = novaConversa.id
    }

    const { error } = await supabase.from('mensagens').insert({
      conversa_id: idDaConversa,
      remetente_id: usuarioAtual.id,
      destinatario_id: amigoId,
      texto: textoMsg,
      lida: false,
      criado_em: new Date().toISOString()
    })

    setEnviandoPara(null)
    if (!error) {
      alert('Mensagem enviada com sucesso!')
      setModalMensagem(false)
    } else {
      alert(`Erro ao enviar: ${error.message}`)
    }
  }

  const comentar = async () => {
    if (!novoComentario.trim()) return
    const textoComent = novoComentario.trim()
    
    const novo: Comentario = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      texto: textoComent,
      autor: {
        id: usuarioAtual?.id || '',
        nome: usuarioAtual?.nome || 'Usuário',
        avatar: usuarioAtual?.nome?.charAt(0).toUpperCase() || 'U',
        foto_url: usuarioAtual?.foto_url || null
      },
      reacoes: {},
      respostas: []
    }
    
    setNovoComentario('')
    onUpdate({ ...post, comentarios: [...(post.comentarios || []), novo] })

    const donoDoPostId = post.usuario_id || post.autor?.id
    if (donoDoPostId && usuarioAtual?.id && donoDoPostId !== usuarioAtual.id) {
      const { error } = await supabase.from('notifications').insert({
        usuario_id: donoDoPostId,
        remetente_id: usuarioAtual.id,
        tipo: 'comentario',
        mensagem: `${usuarioAtual.nome || 'Alguém'} comentou no seu post: "${textoComent.length > 30 ? textoComent.slice(0, 30) + '...' : textoComent}"`,
        link: `/feed?postId=${post.id}&comentarioId=${novo.id}`,
        lida: false
      })
      if (error) {
        console.error('Erro ao salvar notificação de comentário:', error.message)
      }
    }
  }

  const reagirComentario = async (comentarioId: string) => {
    if (!post.comentarios) return
    const userId = usuarioAtual?.id || 'anonimo'
    let comentAutorId: string | undefined

    const novosComentarios = post.comentarios.map(com => {
      if (com.id === comentarioId) {
        comentAutorId = com.autor?.id
        const reacoes = { ...(com.reacoes || {}) }
        if (reacoes[userId]) {
          delete reacoes[userId]
        } else {
          reacoes[userId] = '❤️'
        }
        return { ...com, reacoes }
      }
      return com
    })

    onUpdate({ ...post, comentarios: novosComentarios })

    if (comentAutorId && usuarioAtual?.id && comentAutorId !== usuarioAtual.id) {
      const { error } = await supabase.from('notifications').insert({
        usuario_id: comentAutorId,
        remetente_id: usuarioAtual.id,
        tipo: 'curtida_comentario',
        mensagem: `${usuarioAtual.nome || 'Alguém'} curtiu o seu comentário.`,
        link: `/feed?postId=${post.id}&comentarioId=${comentarioId}`,
        lida: false
      })
      if (error) {
        console.error('Erro ao salvar notificação de curtida no comentário:', error.message)
      }
    }
  }

  const enviarResposta = (comentarioId: string) => {
    if (!textoResposta.trim()) return
    if (!post.comentarios) return
    const novaResp: Comentario = {
      id: `resp-${Date.now()}`,
      texto: textoResposta.trim(),
      autor: {
        id: usuarioAtual?.id || '',
        nome: usuarioAtual?.nome || 'Usuário',
        avatar: usuarioAtual?.nome?.charAt(0).toUpperCase() || 'U',
        foto_url: usuarioAtual?.foto_url || null
      },
      reacoes: {}
    }
    const novosComentarios = post.comentarios.map(com => {
      if (com.id === comentarioId) {
        return { ...com, respostas: [...(com.respostas || []), novaResp] }
      }
      return com
    })
    setTextoResposta('')
    setRespondendoId(null)
    onUpdate({ ...post, comentarios: novosComentarios })
  }

  const reagirResposta = (comentarioId: string, respostaId: string) => {
    if (!post.comentarios) return
    const userId = usuarioAtual?.id || 'anonimo'
    const novosComentarios = post.comentarios.map(com => {
      if (com.id === comentarioId && com.respostas) {
        const novasRespostas = com.respostas.map(resp => {
          if (resp.id === respostaId) {
            const reacoes = { ...(resp.reacoes || {}) }
            if (reacoes[userId]) delete reacoes[userId]
            else reacoes[userId] = '❤️'
            return { ...resp, reacoes }
          }
          return resp
        })
        return { ...com, respostas: novasRespostas }
      }
      return com
    })
    onUpdate({ ...post, comentarios: novosComentarios })
  }

  const excluirPostagem = async () => {
    if (!post.id) return
    const confirmar = window.confirm('Deseja realmente excluir este post?')
    if (!confirmar) return
    await supabase.from('feed_posts').delete().eq('id', post.id)
    if (onDelete && post.id) {
      onDelete(post.id)
    } else {
      window.location.reload()
    }
  }

  const salvarEdicao = async () => {
    if (!post.id) return
    const { error } = await supabase
      .from('feed_posts')
      .update({ texto: textoEditado })
      .eq('id', post.id)
    if (error) {
      alert(`Erro ao atualizar: ${error.message}`)
      return
    }
    onUpdate({ ...post, texto: textoEditado })
    setIsEditing(false)
  }

  const onMouseEnter = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setMostrarReacoes(true), 400)
  }

  const onMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => setMostrarReacoes(false), 600)
  }

  const onTouchStart = () => {
    touchTimer.current = setTimeout(() => {
      setMostrarReacoes(true)
      if (navigator.vibrate) navigator.vibrate(40)
    }, 350)
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!mostrarReacoes) return
    if (e.cancelable) e.preventDefault()

    const touch = e.touches[0]
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    let detectado = null
    REACOES_LISTA.forEach(({ emoji }) => {
      const el = emojiRefs.current[emoji]
      if (el && (el === target || el.contains(target))) {
        detectado = emoji
      }
    })
    setEmojiAtivoNoToque(detectado)
  }

  const onTouchEnd = () => {
    if (touchTimer.current) clearTimeout(touchTimer.current)
    if (mostrarReacoes) {
      if (emojiAtivoNoToque) {
        alterarReacao(emojiAtivoNoToque)
      } else {
        setMostrarReacoes(false)
      }
      setEmojiAtivoNoToque(null)
    }
  }

  return (
    <div id={`post-${post.id}`} style={estilos.postCard}>
      {post.espalhadoPor && (
        <div style={{ fontSize: 12, color: '#65676b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6, fontWeight: '600' }}>
          <span style={{ transform: 'scaleX(-1)', display: 'inline-block', color: '#008C3A' }}>🔁</span>
          {post.espalhadoPor} espalhou
        </div>
      )}
      <div style={{ ...estilos.postHeader, padding: '0 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div 
            style={{ ...estilos.postAvatar, cursor: 'pointer' }} 
            onClick={() => router.push(`/perfil?id=${post.usuario_id}`)}
          >
            {fotoRealAutor ? (
              <img src={fotoRealAutor} alt="Foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              post.autor?.nome?.[0]?.toUpperCase() || 'B'
            )}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <strong 
                style={{ fontSize: 14, color: '#050505', fontWeight: '700', cursor: 'pointer' }}
                onClick={() => router.push(`/perfil?id=${post.usuario_id}`)}
              >
                {post.autor?.nome || 'Usuário'}
              </strong>
              {post.tipoConta && <span style={estilos.badgeTipoConta}>{post.tipoConta}</span>}
            </div>
            <p style={{ fontSize: 11, color: '#65676b', margin: '2px 0 0 0' }}>
              {post.localizacao} • {formatarDataPost(post.tempo)}
            </p>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <span 
            style={{ color: '#9ca3af', cursor: 'pointer', padding: '4px 8px', fontSize: 16, fontWeight: 'bold' }}
            onClick={() => setMostrarMenuOpcoes(!mostrarMenuOpcoes)}
          >
            •••
          </span>
          {mostrarMenuOpcoes && (
            <div style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              background: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: 8,
              padding: '6px 0',
              zIndex: 50,
              minWidth: 200,
              border: '1px solid #e4e6eb'
            }}>
              {post.midiaUrl && (
                <button 
                  onClick={() => {
                    window.open(post.midiaUrl!, '_blank')
                    setMostrarMenuOpcoes(false)
                  }}
                  style={{ width: '100%', background: 'none', border: 'none', padding: '10px 16px', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  📷 Salvar foto/vídeo
                </button>
              )}
              <button 
                onClick={() => {
                  const linkPost = `${window.location.origin}/feed?postId=${post.id}`
                  navigator.clipboard.writeText(linkPost)
                  alert('Link da publicação copiado!')
                  setMostrarMenuOpcoes(false)
                }}
                style={{ width: '100%', background: 'none', border: 'none', padding: '10px 16px', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                🔗 Copiar link do post
              </button>
              {ehMeuPost ? (
                <>
                  <button 
                    onClick={() => {
                      setIsEditing(true)
                      setMostrarMenuOpcoes(false)
                    }}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '10px 16px', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    ✏️ Editar post
                  </button>
                  <button 
                    onClick={() => {
                      alert('Post fixado no topo do perfil!')
                      setMostrarMenuOpcoes(false)
                    }}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '10px 16px', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    📌 Fixar no topo do perfil
                  </button>
                  <button 
                    onClick={() => {
                      setMostrarMenuOpcoes(false)
                      excluirPostagem()
                    }}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '10px 16px', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#e11d48', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    🗑️ Excluir post
                  </button>
                </>
              ) : (
                <button 
                  onClick={() => {
                    alert('Post denunciado com sucesso.')
                    setMostrarMenuOpcoes(false)
                  }}
                  style={{ width: '100%', background: 'none', border: 'none', padding: '10px 16px', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#e11d48', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  🚩 Denunciar post
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      {isEditing ? (
        <div style={{ marginBottom: 12 }}>
          <textarea 
            value={textoEditado} 
            onChange={e => setTextoEditado(e.target.value)} 
            style={{ ...estilos.inputComentario, width: '100%', minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} 
          />
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button 
              onClick={() => {
                setTextoEditado(post.texto || '')
                setIsEditing(false)
              }} 
              style={{ ...estilos.btnEnviar, background: '#e4e6eb', color: '#050505' }}
            >
              Cancelar
            </button>
            <button onClick={salvarEdicao} style={estilos.btnEnviar}>
              Salvar
            </button>
          </div>
        </div>
      ) : (
        <>
          {post.texto && (
            <div style={{ padding: '0 14px', marginBottom: 12 }}>
              {(() => {
                const limite = 180
                const ehTextoLongo = post.texto.length > limite
                const textoExibido = (!textoExpandido && ehTextoLongo) 
                  ? post.texto.slice(0, limite) + '...' 
                  : post.texto

                return (
                  <p style={{ fontSize: 14, color: '#050505', whiteSpace: 'pre-wrap', margin: 0, wordBreak: 'break-word' }}>
                    {textoExibido.split(' ').map((part, i) => 
                      part.startsWith('http') ? (
                        <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: '#008C3A', textDecoration: 'underline' }}>
                          {part}{' '}
                        </a>
                      ) : (
                        part + ' '
                      )
                    )}

                    {ehTextoLongo && (
                      <button
                        onClick={() => setTextoExpandido(!textoExpandido)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#008C3A',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: 13,
                          paddingLeft: 6,
                          display: 'inline-block'
                        }}
                      >
                        {textoExpandido ? 'Ver menos' : 'VER MAIS'}
                      </button>
                    )}
                  </p>
                )
              })()}
            </div>
          )}

          {post.midiaUrl && (
            <>
              <div 
                style={{ 
                  width: '100%', 
                  background: '#000', 
                  cursor: 'pointer',
                  marginTop: '10px',
                  marginBottom: '12px'
                }}
                onClick={() => setMidiaExpandida(post.midiaUrl || null)}
              >
                {isVideoUrl(post.midiaUrl) ? (
                  <video 
                    ref={videoRef}
                    src={post.midiaUrl} 
                    controls 
                    playsInline
                    style={{ width: '100%', maxHeight: '480px', objectFit: 'contain', display: 'block' }} 
                  />
                ) : (
                  <img 
                    src={post.midiaUrl} 
                    alt="Mídia do Post" 
                    style={{ width: '100%', maxHeight: '480px', objectFit: 'cover', display: 'block' }} 
                  />
                )}
              </div>

              {midiaExpandida && (
                <div 
                  style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0,0,0,0.92)',
                    zIndex: 99999,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backdropFilter: 'blur(5px)'
                  }}
                  onClick={() => setMidiaExpandida(null)}
                >
                  <button 
                    style={{
                      position: 'absolute',
                      top: 20,
                      right: 20,
                      background: 'rgba(255,255,255,0.2)',
                      border: 'none',
                      color: '#fff',
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      fontSize: 20,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      zIndex: 100000
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      setMidiaExpandida(null)
                    }}
                  >
                    ✕
                  </button>

                  {midiaExpandida.match(/\.(mp4|webm|ogg|mov|mkv)$/i) ? (
                    <video 
                      src={midiaExpandida} 
                      controls 
                      autoPlay 
                      style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} 
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <img 
                      src={midiaExpandida} 
                      alt="Mídia Expandida" 
                      style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} 
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
      <div style={{ ...estilos.contadoresRow, padding: '0 14px 10px 14px' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {(() => {
            const contagem: Record<string, number> = {}
            Object.values(post.reacoes || {}).forEach((emoji) => {
              contagem[emoji] = (contagem[emoji] || 0) + 1
            })
            const ordenados = Object.entries(contagem)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3)

            if (ordenados.length === 0) {
              return (
                <div style={estilos.contadorPilha}>
                  <span style={{ fontSize: 16, opacity: 0.4 }}>👍</span>
                  <span style={estilos.contadorNumero}>0</span>
                </div>
              )
            }

            return ordenados.map(([emoji, total]) => (
              <div key={emoji} style={estilos.contadorPilha}>
                <span style={{ fontSize: 16 }}>{emoji}</span>
                <span style={{ ...estilos.contadorNumero, color: '#008C3A', fontWeight: '700' }}>
                  {total}
                </span>
              </div>
            ))
          })()}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          {isVideoUrl(post.midiaUrl) && (
            <span style={{ fontWeight: '600', color: '#008C3A', fontSize: 12, marginTop: -8, marginBottom: 2 }}>
              👁️ {post.viewsCount || 0} visualizações
            </span>
          )}
          <div style={{ display: 'flex', gap: 8, color: '#65676b', alignItems: 'center' }}>
            <span>{post.comentarios ? post.comentarios.length : 0} comentários</span>
            <span>•</span>
            <span style={{ color: post.espalhado ? '#008C3A' : '#65676b' }}>
              {post.espalhadosCount || 0} espalhados
            </span>
          </div>
        </div>
      </div>
      <div style={{ height: 1, background: '#e4e6eb', marginBottom: 4 }} />
      <div style={{ display: 'flex', position: 'relative' }}>
        <div style={{ flex: 1, position: 'relative' }} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
          <button 
            style={{ ...estilos.btnAcao, color: jaReagiu ? '#008C3A' : '#65676b', fontWeight: jaReagiu ? '700' : '600' }}
            onClick={darGosteiDireto}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {jaReagiu && reacaoAtual !== '🤙' ? (
              <span style={{ marginRight: 6, fontSize: 18 }}>{reacaoAtual}</span>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill={jaReagiu ? "#008C3A" : "none"} stroke={jaReagiu ? "#008C3A" : "#65676b"} strokeWidth="2" style={{ marginRight: 6 }}>
                <path d="M18 14c1.5-1.5 3-3.5 3-5.5s-1.5-3-3-3-3 1.5-3 3v2" /><path d="M12 11.5V6a2 2 0 0 0-4 0v9.5" /><path d="M8 15V9a2 2 0 0 0-4 0v7a6 6 0 0 0 11.6 2.2l.4-1.2c.4-1.2.1-2.5-.8-3.3L12 11.5z" />
              </svg>
            )}
            {jaReagiu ? labelReacao : 'Gostar'}
          </button>
          {mostrarReacoes && (
            <div style={estilos.popoverReacoes} onMouseEnter={() => { if (hoverTimer.current) clearTimeout(hoverTimer.current) }} onMouseLeave={onMouseLeave}>
              {REACOES_LISTA.map(({ emoji, label }) => (
                <button
                  key={emoji}
                  ref={el => { emojiRefs.current[emoji] = el }}
                  onClick={() => alterarReacao(emoji)}
                  style={{
                    ...estilos.btnEmoji,
                    transform: emojiAtivoNoToque === emoji ? 'scale(1.4) translateY(-6px)' : 'scale(1)'
                  }}
                  title={label}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
        <button style={estilos.btnAcao} onClick={() => setComentarioAberto(!comentarioAberto)}>💬 Comentar</button>
        
        <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
          <button style={{ ...estilos.btnAcao, color: post.espalhado ? '#008C3A' : '#65676b', width: '100%' }} onClick={() => setMostrarMenuEspalhar(!mostrarMenuEspalhar)}>
            <span style={{ marginRight: 6, transform: 'scaleX(-1)', display: 'inline-block' }}>🔁</span>
            {post.espalhado ? 'Espalhado' : 'Espalhar'}
          </button>
          {mostrarMenuEspalhar && (
            <div style={{
              position: 'absolute',
              bottom: '100%',
              right: 0,
              background: '#fff',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              borderRadius: 8,
              padding: '6px 0',
              zIndex: 100,
              minWidth: 220,
              border: '1px solid #e4e6eb',
              marginBottom: 8
            }}>
              <button onClick={espalharNoFeed} style={{ width: '100%', background: 'none', border: 'none', padding: '10px 16px', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', gap: 8 }}>
                🔁 Espalhar no Meu Feed
              </button>
              <button onClick={() => espalharInterno('Mensagens')} style={{ width: '100%', background: 'none', border: 'none', padding: '10px 16px', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', gap: 8 }}>
                💬 Enviar por Mensagem
              </button>
              <button onClick={() => espalharInterno('Corre Rapidim')} style={{ width: '100%', background: 'none', border: 'none', padding: '10px 16px', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚡ Adicionar ao Corre Rapidim
              </button>
              <button onClick={() => espalharInterno('Comunidades')} style={{ width: '100%', background: 'none', border: 'none', padding: '10px 16px', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#050505', display: 'flex', alignItems: 'center', gap: 8 }}>
                👥 Espalhar nas Comunidades
              </button>
              <button onClick={espalharWhatsApp} style={{ width: '100%', background: 'none', border: 'none', padding: '10px 16px', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#25D366', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #e4e6eb', marginTop: 4 }}>
                📲 Espalhar no WhatsApp
              </button>
              <button onClick={espalharFacebook} style={{ width: '100%', background: 'none', border: 'none', padding: '10px 16px', textAlign: 'left', fontSize: 13, cursor: 'pointer', color: '#1877F2', display: 'flex', alignItems: 'center', gap: 8 }}>
                🌐 Espalhar no Facebook
              </button>
            </div>
          )}
        </div>
      </div>
      {comentarioAberto && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f2f2f2' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input type="text" placeholder="Escreva um comentário..." value={novoComentario} onChange={e => setNovoComentario(e.target.value)} style={estilos.inputComentario} />
            <button onClick={comentar} style={estilos.btnEnviar}>Enviar</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {post.comentarios?.map((com, cIdx) => {
              const userId = usuarioAtual?.id || 'anonimo'
              const curtiuComentario = !!com.reacoes?.[userId]
              const totalReacoes = Object.keys(com.reacoes || {}).length
              return (
                <div key={com.id || cIdx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div id={`comentario-${com.id}`} style={{ display: 'flex', gap: 8, background: '#f0f2f5', padding: '10px 12px', borderRadius: 14, position: 'relative' }}>
                    {com.autor?.foto_url ? (
                      <img src={com.autor.foto_url} alt="" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#008C3A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 'bold', flexShrink: 0 }}>
                        {com.autor?.nome?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <strong style={{ fontSize: 13, color: '#050505' }}>{com.autor?.nome}</strong>
                      <p style={{ fontSize: 14, color: '#333', margin: '2px 0 0 0', wordBreak: 'break-word' }}>{com.texto}</p>
                    </div>
                    {totalReacoes > 0 && (
                      <div style={{ position: 'absolute', bottom: -10, right: 12, background: '#fff', borderRadius: 12, padding: '2px 6px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.15)', color: '#65676b', fontWeight: 'bold' }}>
                        ❤️ {totalReacoes}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 16, paddingLeft: 46, fontSize: 12, color: '#65676b', fontWeight: 'bold', marginTop: 4 }}>
                    <span style={{ cursor: 'pointer', color: curtiuComentario ? '#e11d48' : '#65676b' }} onClick={() => com.id && reagirComentario(com.id)}>
                      {curtiuComentario ? 'Descurtir' : 'Curtir'}
                    </span>
                    <span style={{ cursor: 'pointer' }} onClick={() => setRespondendoId(respondendoId === com.id ? null : (com.id || null))}>
                      Responder
                    </span>
                  </div>
                  {respondendoId === com.id && (
                    <div style={{ display: 'flex', gap: 8, paddingLeft: 46, marginTop: 8 }}>
                      <input type="text" placeholder="Escreva uma resposta..." value={textoResposta} onChange={e => setTextoResposta(e.target.value)} style={{ flex: 1, padding: '8px 12px', borderRadius: 20, border: '1px solid #ccd0d5', outline: 'none', fontSize: 13, background: '#f0f2f5' }} />
                      <button onClick={() => com.id && enviarResposta(com.id)} style={{ background: '#008C3A', color: '#fff', border: 'none', padding: '6px 14px', borderRadius: 20, fontWeight: 'bold', cursor: 'pointer', fontSize: 13 }}>Enviar</button>
                    </div>
                  )}
                  {com.respostas && com.respostas.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingLeft: 46, marginTop: 8 }}>
                      {com.respostas.map((resp, rIdx) => {
                        const curtiuResp = !!resp.reacoes?.[userId]
                        const totalReacoesResp = Object.keys(resp.reacoes || {}).length
                        return (
                          <div key={resp.id || rIdx} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <div style={{ display: 'flex', gap: 8, background: '#f0f2f5', padding: '8px 10px', borderRadius: 12, position: 'relative' }}>
                              {resp.autor?.foto_url ? (
                                <img src={resp.autor.foto_url} alt="" style={{ width: 22, height: 22, borderRadius: '50%', objectFit: 'cover' }} />
                              ) : (
                                <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#008C3A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold', flexShrink: 0 }}>
                                  {resp.autor?.nome?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div style={{ flex: 1 }}>
                                <strong style={{ fontSize: 12, color: '#050505' }}>{resp.autor?.nome}</strong>
                                <p style={{ fontSize: 13, color: '#333', margin: '0', wordBreak: 'break-word' }}>{resp.texto}</p>
                              </div>
                              {totalReacoesResp > 0 && (
                                <div style={{ position: 'absolute', bottom: -8, right: 10, background: '#fff', borderRadius: 12, padding: '2px 6px', fontSize: 10, display: 'flex', alignItems: 'center', gap: 4, boxShadow: '0 1px 3px rgba(0,0,0,0.15)', color: '#65676b', fontWeight: 'bold' }}>
                                  ❤️ {totalReacoesResp}
                                </div>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 12, paddingLeft: 38, fontSize: 11, color: '#65676b', fontWeight: 'bold' }}>
                              <span style={{ cursor: 'pointer', color: curtiuResp ? '#e11d48' : '#65676b' }} onClick={() => com.id && resp.id && reagirResposta(com.id, resp.id)}>
                                {curtiuResp ? 'Descurtir' : 'Curtir'}
                              </span>
                              <span style={{ cursor: 'pointer' }} onClick={() => {
                                setRespondendoId(com.id || null)
                                setTextoResposta(`@${resp.autor?.nome} `)
                              }}>
                                Responder
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
      {modalMensagem && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 20, borderRadius: 16, width: '90%', maxWidth: 400, maxHeight: '80vh', overflowY: 'auto', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#050505' }}>Enviar para...</h3>
              <button onClick={() => setModalMensagem(false)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#65676b' }}>&times;</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {amigosParaEnviar.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#65676b', fontSize: 14 }}>Nenhum usuário encontrado.</p>
              ) : (
                amigosParaEnviar.map(amigo => (
                  <div key={amigo.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f4f6f8', padding: '10px 12px', borderRadius: 12 }}>
                    <div 
                      style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                      onClick={() => {
                        const idDestino = post.usuario_id || post.autor?.id
                        if (idDestino) {
                          router.push(`/perfil?id=${idDestino}`)
                        }
                      }}
                    >
                      {amigo.foto_url ? (
                        <img src={amigo.foto_url} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#008C3A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                          {amigo.nome?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                      <div>
                        <strong style={{ fontSize: 14, color: '#050505', display: 'block' }}>{amigo.nome}</strong>
                      </div>
                    </div>
                    <button 
                      onClick={() => enviarMensagemParaUsuario(amigo.id)}
                      disabled={enviandoPara === amigo.id}
                      style={{ background: enviandoPara === amigo.id ? '#9ca3af' : '#008C3A', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 20, fontSize: 12, fontWeight: 'bold', cursor: enviandoPara === amigo.id ? 'not-allowed' : 'pointer' }}
                    >
                      {enviandoPara === amigo.id ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const estilos = {
  container: { 
    width: '100%', 
    maxWidth: 500, 
    margin: '0 auto', 
    height: '100vh', 
    background: '#f4f6f8', 
    fontFamily: 'system-ui, sans-serif', 
    position: 'relative' as const, 
    display: 'flex', 
    flexDirection: 'column' as const, 
    overflow: 'hidden' 
  },
  scrollContainer: { 
    flex: 1, 
    overflowY: 'auto' as const, 
    overflowX: 'hidden' as const, 
    width: '100%', 
    WebkitOverflowScrolling: 'touch' as const 
  },
  carregando: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#008C3A', fontWeight: 'bold' as const },
  headerVerde: { background: '#008C3A', padding: '14px 16px 16px 16px', display: 'flex', flexDirection: 'column' as const, gap: 12, zIndex: 10, width: '100%', boxSizing: 'border-box' as const },
  topoRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoCol: { display: 'flex', alignItems: 'center', gap: 8, height: 40 },
  logoImg: { height: '100%', width: 'auto', objectFit: 'contain' as const, mixBlendMode: 'screen' as const },
  logoTexto: { display: 'flex', flexDirection: 'column' as const },
  badgeNotif: { 
    position: 'absolute' as const, 
    top: -6, 
    right: -6, 
    background: '#FFD700', 
    color: '#008C3A', 
    borderRadius: '999px', 
    padding: '1px 5px', 
    fontSize: 10, 
    fontWeight: 'bold' as const, 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    minWidth: 16,
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
  },
  avatarTopo: { width: 36, height: 36, borderRadius: '50%', background: '#fff', color: '#008C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' as const, cursor: 'pointer', overflow: 'hidden' },
  imgFull: { width: '100%', height: '100%', objectFit: 'cover' as const },
  buscaRow: { display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)', padding: '8px 12px', borderRadius: 10, gap: 8, boxSizing: 'border-box' as const },
  buscaInput: { background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 14, width: '75%' },
  storiesWrapper: { 
    padding: '16px 0 0 16px', 
    width: '100%', 
    overflowX: 'hidden' as const, 
    boxSizing: 'border-box' as const 
  },
  storiesTrack: { 
    display: 'flex', 
    gap: 10, 
    overflowX: 'auto' as const, 
    paddingBottom: 4, 
    scrollbarWidth: 'none' as const, 
    width: '100%', 
    WebkitOverflowScrolling: 'touch' as const 
  },
  storyCard: { width: 95, height: 145, borderRadius: 12, backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative' as const, flexShrink: 0, display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between', padding: 8, overflow: 'hidden' },
  storyOverlay: { position: 'absolute' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.6) 100%)', zIndex: 1 },
  storyAvatarManga: { width: 28, height: 28, borderRadius: '50%', border: '2px solid #008C3A', position: 'relative' as const, zIndex: 2, overflow: 'hidden', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  storyNome: { position: 'relative' as const, zIndex: 2, color: '#fff', fontSize: 11, fontWeight: '600' as const, textShadow: '0 1px 3px rgba(0,0,0,0.8)' },
  btnPublicar: { background: '#008C3A', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 20, fontWeight: 'bold' as const, fontSize: 13, cursor: 'pointer' },
  postCard: { 
    background: '#fff', 
    borderRadius: 16, 
    padding: '14px 0', 
    marginBottom: 14, 
    border: 'none', 
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)', 
    boxSizing: 'border-box' as const, 
    overflow: 'hidden' as const 
  },
  postHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  postAvatar: { width: 40, height: 40, borderRadius: '50%', background: '#008C3A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' as const, overflow: 'hidden' },
  badgeTipoConta: { fontSize: 10, fontWeight: '700' as const, color: '#008C3A', background: '#e6f4ea', padding: '2px 6px', borderRadius: 4 },
  contadoresRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#65676b', paddingBottom: 10, minHeight: 46 },
  contadorPilha: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', minWidth: 22 },
  contadorNumero: { fontSize: 11, marginTop: 1 },
  btnAcao: { 
    flex: 1, 
    background: 'none', 
    border: 'none', 
    padding: '8px 0', 
    fontSize: 13, 
    color: '#65676b', 
    fontWeight: '600' as const, 
    cursor: 'pointer', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    borderRadius: 6, 
    userSelect: 'none' as const, 
    WebkitUserSelect: 'none' as const, 
    WebkitTouchCallout: 'none' as const,
    touchAction: 'none' as const
  },
  popoverReacoes: { position: 'absolute' as const, bottom: '105%', left: 0, background: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', borderRadius: 30, padding: '4px 8px', display: 'flex', gap: 4, zIndex: 100, border: '1px solid #e4e6eb', userSelect: 'none' as const, WebkitUserSelect: 'none' as const, WebkitTouchCallout: 'none' as const },
  btnEmoji: { background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', padding: '4px', transition: 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)' },
  inputComentario: { flex: 1, background: '#f0f2f5', border: 'none', borderRadius: 20, padding: '8px 14px', outline: 'none', fontSize: 13 },
  btnEnviar: { background: '#008C3A', color: '#fff', border: 'none', borderRadius: 20, padding: '0 16px', fontWeight: 'bold' as const, fontSize: 12, cursor: 'pointer' },
  boxComentario: { background: '#f0f2f5', borderRadius: 14, padding: '8px 12px', alignSelf: 'flex-start', display: 'flex', gap: 8, maxWidth: '90%' },
  avatarComentarioPadrao: { width: 24, height: 24, borderRadius: '50%', background: '#008C3A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold' as const },
  navInferior: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, height: 60, background: '#fff', borderTop: '1px solid #e4e6eb', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 10, width: '100%', boxSizing: 'border-box' as const },
  btnNavAtivo: { background: 'none', border: 'none', color: '#008C3A', fontSize: 10, fontWeight: 'bold' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', cursor: 'pointer' },
  btnNav: { background: 'none', border: 'none', color: '#65676b', fontSize: 10, fontWeight: '600' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', cursor: 'pointer' }
}