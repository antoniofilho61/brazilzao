'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { supabase } from '@/utils/supabase/client'

export function formatarTempoRelativo(dataString?: string) {
  if (!dataString) return 'Agora'
  const dataPost = new Date(dataString)
  if (isNaN(dataPost.getTime())) return dataString

  const agora = new Date()
  const diferencaEmSegundos = Math.floor((agora.getTime() - dataPost.getTime()) / 1000)

  if (diferencaEmSegundos < 60) return 'Agora mesmo'
  const minutos = Math.floor(diferencaEmSegundos / 60)
  if (minutos < 60) return `Há ${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return `Há ${horas} h`
  const dias = Math.floor(horas / 24)
  if (dias < 7) return `Há ${dias} d`

  const horaFormatada = dataPost.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const dataFormatada = dataPost.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  return `${dataFormatada} às ${horaFormatada}`
}

const REACOES_LISTA = [
  { emoji: '🤙', label: 'Salve' },
  { emoji: '❤️', label: 'Amei' },
  { emoji: '😂', label: 'Riso' },
  { emoji: '😲', label: 'Chocado' },
  { emoji: '😢', label: 'Triste' },
  { emoji: '🔥', label: 'Fogo' }
]

function IconeBrazilzao({ ativo, reacaoAtiva, corTexto }: { ativo: boolean; reacaoAtiva?: string; corTexto?: string }) {
  if (ativo && reacaoAtiva && reacaoAtiva !== '🤙') {
    return <span style={{ marginRight: 6, fontSize: 18 }}>{reacaoAtiva}</span>
  }
  const corIcone = ativo ? "#008C3A" : (corTexto || "#65676b")
  return (
    <svg 
      width="20" height="20" viewBox="0 0 24 24" 
      fill={ativo ? "#008C3A" : "none"} stroke={corIcone} 
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ marginRight: 6, transition: 'all 0.2s ease' }}
    >
      <path d="M18 14c1.5-1.5 3-3.5 3-5.5s-1.5-3-3-3-3 1.5-3 3v2" />
      <path d="M12 11.5V6a2 2 0 0 0-4 0v9.5" />
      <path d="M8 15V9a2 2 0 0 0-4 0v7a6 6 0 0 0 11.6 2.2l.4-1.2c.4-1.2.1-2.5-.8-3.3L12 11.5z" />
    </svg>
  )
}

export interface PostCardProps {
  post: any;
  usuarioAtual: any;
  onUpdate: (updated: any) => void;
  onDelete?: (id: string) => void;
  onEspalhar?: (novoPostEspalhado: any) => void;
}

export function PostCard({ 
  post, 
  usuarioAtual, 
  onUpdate, 
  onDelete, 
  onEspalhar 
}: PostCardProps) {
  const router = useRouter()
  const [mostrarReacoes, setMostrarReacoes] = useState(false)
  const [comentarioAberto, setComentarioAberto] = useState(false)
  const [menuEspalharAberto, setMenuEspalharAberto] = useState(false)
  const [menuOpcoesAberto, setMenuOpcoesAberto] = useState(false)

  // ESTADO DO VÍDEO
  const [videoTocando, setVideoTocando] = useState(false)
  const jaContouViewRef = useRef(false)

  // ESTADO PARA NAVEGAÇÃO DE MÍDIA FULLSCREEN
  const [fotoModalIndex, setFotoModalIndex] = useState<number | null>(null)
  
  // GESTO NO CELULAR (SWIPE LEFT / RIGHT)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const [touchEndX, setTouchEndX] = useState<number | null>(null)

  // DENÚNCIA DO POST
  const [modalDenunciaAberto, setModalDenunciaAberto] = useState(false)
  const [motivoDenuncia, setMotivoDenuncia] = useState('')
  const [comentarioDenuncia, setComentarioDenuncia] = useState('')
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false)

  const [textoExpandido, setTextoExpandido] = useState(false)
  const [enviandoParaAmigo, setEnviandoParaAmigo] = useState(false)
  const [amigosLista, setAmigosLista] = useState<any[]>([])
  const [amigoSelecionado, setAmigoSelecionado] = useState<any | null>(null)
  const [mensagemParaAmigo, setMensagemParaAmigo] = useState('')
  const [carregandoAmigos, setCarregandoAmigos] = useState(false)

  const [novoComentario, setNovoComentario] = useState('')
  const [midiaComentarioFile, setMidiaComentarioFile] = useState<File | null>(null)
  const [midiaComentarioPreview, setMidiaComentarioPreview] = useState<string | null>(null)
  const [enviandoComentario, setEnviandoComentario] = useState(false)
  const [comentarioRespondendo, setComentarioRespondendo] = useState<any | null>(null)

  const [emojiAtivoNoToque, setEmojiAtivoNoToque] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const fileInputComentarioRef = useRef<HTMLInputElement | null>(null)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const emojiRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const inputComentRef = useRef<HTMLInputElement | null>(null)

  const usuarioId = usuarioAtual?.id || 'anonimo'
  const reacaoAtual = post.reacoes?.[usuarioId]
  const jaReagiu = !!reacaoAtual
  const labelReacao = REACOES_LISTA.find(r => r.emoji === reacaoAtual)?.label || 'Gostar'

  const ehDonoDoPost = post.usuario_id === usuarioAtual?.id || post.autor?.id === usuarioAtual?.id
  const ehAdmin = usuarioAtual?.username === 'brazilzao_oficial'

  // EXTRAÇÃO MULTI-FORMATO DE MÍDIAS DO POST
  const listaMidias: string[] = (() => {
    const c = post?.conteudo || {}
    const arr = post?.midiaUrls || c?.midiaUrls || post?.midia_urls || c?.midia_urls

    if (Array.isArray(arr) && arr.length > 0) {
      return arr.filter((item: any) => typeof item === 'string' && item.trim().length > 0)
    }

    if (typeof arr === 'string' && arr.startsWith('[')) {
      try {
        const parsed = JSON.parse(arr)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch (e) {}
    }

    const unica = post?.midiaUrl || c?.midiaUrl || post?.midia_url || c?.midia_url
    return unica ? [unica] : []
  })()

  // VERIFICA SE É UM POST DE VÍDEO
  const ehVideoPost = listaMidias.some(url => typeof url === 'string' && url.match(/\.(mp4|webm|ogg|mov|mkv)($|\?)/i))

  // REGISTRAR VISUALIZAÇÃO NO VÍDEO (AO TOCAR/CLICAR)
  const registrarVisualizacao = async () => {
    if (jaContouViewRef.current) return
    jaContouViewRef.current = true

    const viewsAtuais = Number(post.visualizacoes || post.views || post.conteudo?.visualizacoes || 0)
    const novasViews = viewsAtuais + 1

    const postAtualizado = {
      ...post,
      visualizacoes: novasViews,
      conteudo: {
        ...(post.conteudo || {}),
        visualizacoes: novasViews
      }
    }

    onUpdate(postAtualizado)

    try {
      if (post.id) {
        await supabase
          .from('feed_posts')
          .update({ conteudo: postAtualizado.conteudo })
          .eq('id', post.id)
      }
    } catch (err) {
      console.error('Erro ao registrar visualização:', err)
    }
  }

  // NAVEGAÇÃO ENTRE FOTOS/VÍDEOS
  const fotoAnterior = () => {
    if (fotoModalIndex === null) return
    setFotoModalIndex(fotoModalIndex > 0 ? fotoModalIndex - 1 : listaMidias.length - 1)
  }

  const fotoProxima = () => {
    if (fotoModalIndex === null) return
    setFotoModalIndex(fotoModalIndex < listaMidias.length - 1 ? fotoModalIndex + 1 : 0)
  }

  // LÓGICA DE SWIPE NO CELULAR
  const minSwipeDistance = 45

  const handleTouchStartModal = (e: React.TouchEvent) => {
    setTouchEndX(null)
    setTouchStartX(e.targetTouches[0].clientX)
  }

  const handleTouchMoveModal = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX)
  }

  const handleTouchEndModal = () => {
    if (!touchStartX || !touchEndX) return
    const distance = touchStartX - touchEndX
    if (distance > minSwipeDistance) fotoProxima()
    else if (distance < -minSwipeDistance) fotoAnterior()
  }

  // FUNÇÕES DE ESPALHAR E COMPARTILHAR
  const executarEspalharFeed = async () => {
    if (!usuarioAtual?.id) return
    const espalhadosCount = (post.espalhadosCount || 0) + 1
    onUpdate({ ...post, espalhado: true, espalhadosCount })

    if (onEspalhar) {
      const postEspalhado = {
        ...post,
        id: `espalhado-${Date.now()}`,
        espalhadoPor: usuarioAtual.nome || 'Alguém',
        espalhado: false,
        espalhadosCount: 0,
        tempo: 'Agora'
      }
      onEspalhar(postEspalhado)
    }

    const donoDoPostId = post.usuario_id || post.autor?.id
    if (donoDoPostId && donoDoPostId !== usuarioAtual?.id) {
      await supabase.from('notifications').insert({
        usuario_id: donoDoPostId,
        remetente_id: usuarioAtual.id,
        tipo: 'espalhar_post',
        mensagem: `${usuarioAtual.nome || 'Alguém'} espalhou o seu post!`,
        link: `/feed?postId=${post.id}`,
        lida: false
      })
    }
    setMenuEspalharAberto(false)
  }

  const compartilharWhatsApp = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const urlPost = `${baseUrl}/feed?postId=${post.id}`
    const autorNome = post.autor?.nome || 'Usuário'
    const textoPublicacao = post.texto || ''
    const midiaAnexo = post.midiaUrl ? `\n🖼️ Mídia do Corre: ${post.midiaUrl}` : ''

    const textoBase = `📲 *Confira essa publicação no Brazilzão!*\n\n👤 *${autorNome}*: "${textoPublicacao}"${midiaAnexo}\n\n👉 *Acesse e comente:*\n${urlPost}`

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textoBase)}`, '_blank')
    setMenuEspalharAberto(false)
  }

  const compartilharFacebook = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    const urlPost = `${baseUrl}/feed?postId=${post.id}`
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(post.midiaUrl || urlPost)}`, '_blank')
    setMenuEspalharAberto(false)
  }

  // Autoplay silencioso no feed
  useEffect(() => {
    const elVideo = videoRef.current
    if (!elVideo) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            elVideo.play().catch(() => {
              elVideo.muted = true
              elVideo.play().catch(() => {})
            })
          } else {
            elVideo.pause()
          }
        })
      },
      { threshold: 0.5 }
    )

    observer.observe(elVideo)
    return () => { if (elVideo) observer.unobserve(elVideo) }
  }, [post.midiaUrl])

  const calcularTotalComentarios = (comentarios: any[]) => {
    if (!comentarios || !Array.isArray(comentarios)) return 0
    return comentarios.reduce((total, c) => {
      const respostasCount = Array.isArray(c.respostas) ? c.respostas.length : 0
      return total + 1 + respostasCount
    }, 0)
  }

  const totalComentariosTotal = calcularTotalComentarios(post.comentarios)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const postId = params.get('postId')
      const comentId = params.get('comentarioId')
      if (postId === post.id && comentId) {
        setComentarioAberto(true)
      }
    }
  }, [post.id])

  const handleMidiaComentarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMidiaComentarioFile(file)
    setMidiaComentarioPreview(URL.createObjectURL(file))
  }

  const removerMidiaComentario = () => {
    setMidiaComentarioFile(null)
    setMidiaComentarioPreview(null)
    if (fileInputComentarioRef.current) fileInputComentarioRef.current.value = ''
  }

  const carregarAmigos = async () => {
    if (!usuarioAtual?.id) return
    setCarregandoAmigos(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nome, foto_url')
        .neq('id', usuarioAtual.id)
        .limit(20)

      if (!error && data) setAmigosLista(data)
    } catch (err) {
      console.error('Erro ao buscar amigos:', err)
    } finally {
      setCarregandoAmigos(false)
    }
  }

  const abrirMandarAmigo = () => {
    setEnviandoParaAmigo(true)
    carregarAmigos()
  }

  const enviarPostParaAmigo = async () => {
    if (!amigoSelecionado) return alert('Selecione um amigo para enviar!')

    try {
      const urlPost = `/feed?postId=${post.id}`
      const textoMsg = mensagemParaAmigo.trim() 
        ? `💬 "${mensagemParaAmigo.trim()}"\n\n📌 Veja a publicação compartilhada:`
        : `📌 ${usuarioAtual.nome || 'Alguém'} compartilhou uma publicação com você:`

      await supabase.from('notifications').insert({
        usuario_id: amigoSelecionado.id,
        remetente_id: usuarioAtual.id,
        tipo: 'mensagem_post',
        mensagem: `${usuarioAtual.nome || 'Alguém'} te mandou uma publicação!`,
        link: urlPost,
        lida: false
      })

      await supabase.from('messages').insert({
        sender_id: usuarioAtual.id,
        receiver_id: amigoSelecionado.id,
        content: `${textoMsg} ${urlPost}`
      }).select()

      alert(`Publicação enviada com sucesso para @${amigoSelecionado.nome}!`)
      setMenuEspalharAberto(false)
      setEnviandoParaAmigo(false)
      setAmigoSelecionado(null)
      setMensagemParaAmigo('')
    } catch (e) {
      alert(`Publicação enviada para @${amigoSelecionado.nome}!`)
      setMenuEspalharAberto(false)
      setEnviandoParaAmigo(false)
      setAmigoSelecionado(null)
      setMensagemParaAmigo('')
    }
  }

  const apagarPost = async () => {
    if (!post.id) return
    if (!window.confirm("Tem certeza que deseja apagar esta publicação?")) return

    try {
      const { error } = await supabase.from('feed_posts').delete().eq('id', post.id)
      if (error) throw error
      alert("Publicação apagada com sucesso!")
      setMenuOpcoesAberto(false)
      if (onDelete) onDelete(post.id)
      else window.location.reload()
    } catch (err: any) {
      alert("Erro ao apagar publicação: " + err.message)
    }
  }

  const enviarDenunciaPost = async () => {
    if (!usuarioAtual?.id) return alert('Você precisa estar logado para denunciar.')
    if (!motivoDenuncia) return alert('Por favor, selecione um motivo.')

    setEnviandoDenuncia(true)
    try {
      await supabase.from('feed_posts').insert({
        usuario_id: usuarioAtual.id,
        conteudo: {
          tipoPost: 'denuncia_post',
          post_id: post.id,
          post_texto: post.texto || 'Mídia / Post sem texto',
          autor_id: post.usuario_id || post.autor?.id,
          autor_nome: post.autor?.nome || 'Usuário',
          motivo: motivoDenuncia,
          comentario: comentarioDenuncia.trim(),
          tempo: new Date().toISOString()
        }
      })
      alert('Sua denúncia foi enviada e será analisada pela moderação. Obrigado!')
      setModalDenunciaAberto(false)
      setMotivoDenuncia('')
      setComentarioDenuncia('')
      setMenuOpcoesAberto(false)
    } catch (e: any) {
      alert('Erro ao enviar denúncia: ' + e.message)
    } finally {
      setEnviandoDenuncia(false)
    }
  }

  const alterarReacao = async (emoji: string) => {
    if (!usuarioAtual?.id) return alert('Crie uma conta ou entre para reagir aos posts no Brazilzão!')

    const reacoes = { ...(post.reacoes || {}) }
    const reacaoAnterior = reacoes[usuarioId]
    const novoEmoji = reacaoAnterior === emoji ? null : emoji

    if (novoEmoji) reacoes[usuarioId] = novoEmoji
    else delete reacoes[usuarioId]

    setMostrarReacoes(false)
    onUpdate({ ...post, reacoes })

    const donoDoPostId = post.usuario_id || post.autor?.id
    if (novoEmoji && donoDoPostId && donoDoPostId !== usuarioAtual?.id) {
      await supabase.from('notifications').insert({
        usuario_id: donoDoPostId,
        remetente_id: usuarioAtual.id,
        tipo: 'reacao_post',
        mensagem: `${usuarioAtual.nome || 'Alguém'} reagiu com ${emoji} no seu post!`,
        link: `/feed?postId=${post.id}`,
        lida: false
      })
    }
  }

  const darGosteiDireto = () => { alterarReacao('🤙') }

  const prepararResposta = (com: any, autorNomeOverride?: string) => {
    setComentarioRespondendo(com)
    setNovoComentario(`@${autorNomeOverride || com.autor?.nome || 'usuario'} `)
    setTimeout(() => { inputComentRef.current?.focus() }, 100)
  }

  const enviarComentario = async () => {
    if (!usuarioAtual?.id) return alert('Crie uma conta ou entre para comentar no Brazilzão!')
    if (!novoComentario.trim() && !midiaComentarioFile) return

    setEnviandoComentario(true)
    let urlMidiaComentario: string | null = null

    try {
      if (midiaComentarioFile) {
        const ext = midiaComentarioFile.name.split('.').pop()?.toLowerCase() || 'jpg'
        const nomeLimpo = midiaComentarioFile.name.replace(/[^a-zA-Z0-9]/g, '_')
        const nomeArquivo = `coment_${usuarioAtual.id}_${Date.now()}_${nomeLimpo}.${ext}`

        const { error: errorUpload } = await supabase.storage
          .from('posts_midia')
          .upload(nomeArquivo, midiaComentarioFile, {
            upsert: true,
            cacheControl: '31536000',
            contentType: midiaComentarioFile.type || 'application/octet-stream'
          })

        if (!errorUpload) {
          const { data } = supabase.storage.from('posts_midia').getPublicUrl(nomeArquivo)
          urlMidiaComentario = data.publicUrl
        }
      }

      const textoComent = novoComentario.trim()
      const idNovoComent = `coment-${Date.now()}`

      const novoObj: any = {
        id: idNovoComent,
        texto: textoComent,
        midiaUrl: urlMidiaComentario,
        criado_em: new Date().toISOString(),
        reacoes: {},
        respostas: [],
        autor: {
          id: usuarioAtual?.id,
          nome: usuarioAtual?.nome || 'Usuário',
          foto_url: usuarioAtual?.foto_url || null
        }
      }

      let comentariosAtuais = [...(post.comentarios || [])]

      if (comentarioRespondendo) {
        comentariosAtuais = comentariosAtuais.map((c: any) => {
          if (c.id === comentarioRespondendo.id) {
            return { ...c, respostas: [...(c.respostas || []), novoObj] }
          }
          return c
        })
      } else {
        comentariosAtuais.push(novoObj)
      }

      onUpdate({ ...post, comentarios: comentariosAtuais })
      setNovoComentario('')
      removerMidiaComentario()
      setComentarioRespondendo(null)
    } catch (err) {
      console.error('Erro ao enviar comentário:', err)
      alert('Erro ao enviar comentário com mídia. Tente novamente!')
    } finally {
      setEnviandoComentario(false)
    }
  }

  const alternarCurtirComentario = async (comentId: string, respostaPaiId?: string) => {
    if (!usuarioAtual?.id) return
    const idUser = usuarioAtual.id
    let donoDoComentarioId: string | null = null
    let foiCurtido = false

    const comentariosAtualizados = (post.comentarios || []).map((c: any) => {
      if (respostaPaiId && c.id === respostaPaiId) {
        const respostasAtualizadas = (c.respostas || []).map((r: any) => {
          if (r.id === comentId) {
            donoDoComentarioId = r.autor?.id
            const reacoes = { ...(r.reacoes || {}) }
            if (reacoes[idUser]) { delete reacoes[idUser]; foiCurtido = false } 
            else { reacoes[idUser] = '🤙'; foiCurtido = true }
            return { ...r, reacoes }
          }
          return r
        })
        return { ...c, respostas: respostasAtualizadas }
      } else if (c.id === comentId) {
        donoDoComentarioId = c.autor?.id
        const reacoes = { ...(c.reacoes || {}) }
        if (reacoes[idUser]) { delete reacoes[idUser]; foiCurtido = false } 
        else { reacoes[idUser] = '🤙'; foiCurtido = true }
        return { ...c, reacoes }
      }
      return c
    })

    onUpdate({ ...post, comentarios: comentariosAtualizados })

    if (foiCurtido && donoDoComentarioId && donoDoComentarioId !== usuarioAtual.id) {
      await supabase.from('notifications').insert({
        usuario_id: donoDoComentarioId,
        remetente_id: usuarioAtual.id,
        tipo: 'curtida_comentario',
        mensagem: `${usuarioAtual.nome || 'Alguém'} curtiu o seu comentário!`,
        link: `/feed?postId=${post.id}&comentarioId=${comentId}`,
        lida: false
      })
    }
  }

  const apagarComentario = (comentId: string, respostaPaiId?: string) => {
    if (!window.confirm('Deseja apagar este comentário?')) return

    let comentariosAtualizados = [...(post.comentarios || [])]
    if (respostaPaiId) {
      comentariosAtualizados = comentariosAtualizados.map((c: any) => {
        if (c.id === respostaPaiId) {
          return { ...c, respostas: (c.respostas || []).filter((r: any) => r.id !== comentId) }
        }
        return c
      })
    } else {
      comentariosAtualizados = comentariosAtualizados.filter((c: any) => c.id !== comentId)
    }
    onUpdate({ ...post, comentarios: comentariosAtualizados })
  }

  const copiarLinkPost = () => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    navigator.clipboard.writeText(`${baseUrl}/feed?postId=${post.id}`)
    alert('Link copiado com sucesso!')
    setMenuEspalharAberto(false)
    setMenuOpcoesAberto(false)
  }

  const handleMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => setMostrarReacoes(true), 400)
  }

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => setMostrarReacoes(false), 600)
  }

  const handleTouchStart = () => {
    touchTimerRef.current = setTimeout(() => {
      setMostrarReacoes(true)
      try {
        if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(40)
      } catch (e) {}
    }, 350)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!mostrarReacoes) return
    const touch = e.touches[0]
    const target = document.elementFromPoint(touch.clientX, touch.clientY)
    let encontrado = null

    REACOES_LISTA.forEach(({ emoji }) => {
      const el = emojiRefs.current[emoji]
      if (el && (el === target || el.contains(target))) encontrado = emoji
    })
    setEmojiAtivoNoToque(encontrado)
  }

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    if (mostrarReacoes) {
      if (emojiAtivoNoToque) alterarReacao(emojiAtivoNoToque)
      else setMostrarReacoes(false)
      setEmojiAtivoNoToque(null)
    }
  }

  const textoCompleto = post.texto || ''
  const limiteCaracteres = 180
  const ehTextoLongo = textoCompleto.length > limiteCaracteres
  const textoExibido = (ehTextoLongo && !textoExpandido) ? textoCompleto.slice(0, limiteCaracteres) + '...' : textoCompleto

  return (
    <div id={`post-${post.id}`}>
      <Card style={cardPostReal}>
        {/* TOPO ESPALHADO */}
        {post.espalhadoPor ? (
          <div style={badgeEspalhadoTopoDestaque}>
            <span style={{ fontSize: 16 }}>🔄</span>
            <span style={{ fontSize: 13, color: '#050505' }}>
              <strong style={{ color: '#008C3A', fontSize: 15, fontWeight: '800' }}>{post.espalhadoPor}</strong> espalhou a publicação de <strong style={{ color: '#65676b', fontWeight: '700' }}>@{post.autor?.username || post.autor?.nome?.toLowerCase().replace(/\s+/g, '') || 'usuario'}</strong>
            </span>
          </div>
        ) : null}

        {/* TOPO DO POST */}
        <div style={postTopo}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href={`/perfil?id=${post.autor?.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ ...avatarReal, cursor: 'pointer' }}>
                {post.autor?.foto_url ? (
                  <img src={post.autor.foto_url} alt="" style={fotoPerfilImg} loading="lazy" decoding="async" />
                ) : (
                  post.autor?.nome?.charAt(0).toUpperCase() || 'U'
                )}
              </div>
            </Link>
            <div>
              <Link href={`/perfil?id=${post.autor?.id}`} style={{ textDecoration: 'none' }}>
                <strong style={{ ...nomeAutorReal, cursor: 'pointer', color: post.espalhadoPor ? '#65676b' : '#008C3A' }}>
                  {post.espalhadoPor ? `@${post.autor?.username || post.autor?.nome?.toLowerCase().replace(/\s+/g, '')}` : post.autor?.nome}
                </strong>
              </Link>
              <p style={metaReal}>{post.localizacao ? `${post.localizacao} • ` : ''}{formatarTempoRelativo(post.tempo)}</p>
            </div>
          </div>

          {/* TRÊS PONTINHOS */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => setMenuOpcoesAberto(!menuOpcoesAberto)} 
              style={{ background: 'none', border: 'none', color: '#65676b', fontSize: 20, cursor: 'pointer', padding: '4px 8px', borderRadius: '50%', fontWeight: 'bold' }}
            >
              •••
            </button>

            {menuOpcoesAberto && (
              <>
                <div onClick={() => setMenuOpcoesAberto(false)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 190, background: 'transparent' }} />
                <div style={{ position: 'absolute', top: '100%', right: 0, background: '#ffffff', borderRadius: 14, boxShadow: '0 6px 20px rgba(0,0,0,0.15)', border: '1px solid #e5e7eb', zIndex: 200, minWidth: 190, overflow: 'hidden', padding: '6px 0' }}>
                  <button onClick={copiarLinkPost} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, fontWeight: '600', color: '#111', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>🔗 Copiar Link</button>
                  <button onClick={() => { alert('Publicação salva!'); setMenuOpcoesAberto(false); }} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, fontWeight: '600', color: '#111', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #f0f2f5' }}>📌 Salvar Publicação</button>
                  {!ehDonoDoPost && !ehAdmin && (
                    <button onClick={() => { setMenuOpcoesAberto(false); setModalDenunciaAberto(true); }} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, fontWeight: '600', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #f0f2f5' }}>🚩 Denunciar Post</button>
                  )}
                  {(ehDonoDoPost || ehAdmin) && (
                    <button onClick={apagarPost} style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', textAlign: 'left', fontSize: 13, fontWeight: '600', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #f0f2f5' }}>🗑️ Apagar Publicação</button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* TEXTO DO POST */}
        {textoCompleto && (
          <div style={textoPostReal}>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {textoExibido}
              {ehTextoLongo && (
                <button onClick={() => setTextoExpandido(!textoExpandido)} style={btnVerMais}>
                  {textoExpandido ? ' Ver menos' : ' Ver mais...'}
                </button>
              )}
            </p>
          </div>
        )}

        {/* MÍDIA / GALERIA DO POST */}
        {listaMidias.length > 0 && (
          <>
            {listaMidias.length === 1 ? (
              /* CASO 1: APENAS 1 MÍDIA NO POST */
              <div 
                style={{ ...containerMidiaReal, cursor: 'pointer', position: 'relative' }}
                onClick={() => {
                  const url = listaMidias[0]
                  const ehVideoItem = url.match(/\.(mp4|webm|ogg|mov|mkv)($|\?)/i)
                  if (ehVideoItem) {
                    registrarVisualizacao()
                    router.push(`/videos?postId=${post.id}`)
                  } else {
                    setFotoModalIndex(0)
                  }
                }}
              >
                {listaMidias[0].match(/\.(mp4|webm|ogg|mov|mkv)($|\?)/i) ? (
                  <>
                    <video 
                      ref={videoRef} 
                      src={listaMidias[0]} 
                      loop 
                      muted 
                      playsInline 
                      preload="metadata" 
                      style={midiaElementoReal}
                      onPlay={() => {
                        setVideoTocando(true)
                        registrarVisualizacao()
                      }}
                      onPause={() => setVideoTocando(false)}
                      onEnded={() => setVideoTocando(false)}
                    />
                    {/* O ÍCONE DE PLAY SÓ APARECE QUANDO O VÍDEO NÃO ESTIVER RODANDO */}
                    {!videoTocando && <div style={iconePlayOverlay}>▶</div>}
                  </>
                ) : (
                  <img 
                    src={listaMidias[0]} 
                    alt="Mídia" 
                    loading="lazy" 
                    decoding="async" 
                    style={midiaElementoReal} 
                  />
                )}
              </div>
            ) : (
              /* CASO 2: GRADE DE 2 A 5 FOTOS/VÍDEOS COMBINADOS */
              <div 
                style={{
                  display: 'grid',
                  gridTemplateColumns: listaMidias.length === 2 ? '1fr 1fr' : 'repeat(2, 1fr)',
                  gap: 4,
                  marginBottom: 12,
                  borderRadius: 14,
                  overflow: 'hidden',
                  background: '#1e293b'
                }}
              >
                {listaMidias.map((url, idx) => {
                  const ehVideoItem = url.match(/\.(mp4|webm|ogg|mov|mkv)($|\?)/i)
                  const ehDestaque = (listaMidias.length === 3 || listaMidias.length === 5) && idx === 0

                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        if (ehVideoItem) registrarVisualizacao()
                        setFotoModalIndex(idx)
                      }}
                      style={{
                        position: 'relative',
                        gridColumn: ehDestaque ? 'span 2' : 'span 1',
                        height: ehDestaque ? 220 : 160,
                        cursor: 'pointer',
                        background: '#0f172a'
                      }}
                    >
                      {ehVideoItem ? (
                        <>
                          <video src={url} preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          <div style={iconePlayOverlay}>▶</div>
                        </>
                      ) : (
                        <img 
                          src={url} 
                          alt={`Mídia ${idx + 1}`} 
                          loading="lazy" 
                          decoding="async" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* MODAL / CARROSSEL FULLSCREEN */}
        {fotoModalIndex !== null && listaMidias[fotoModalIndex] && (
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(0,0,0,0.96)',
              zIndex: 999999,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              backdropFilter: 'blur(10px)',
              touchAction: 'pan-y'
            }}
            onClick={() => setFotoModalIndex(null)}
            onTouchStart={handleTouchStartModal}
            onTouchMove={handleTouchMoveModal}
            onTouchEnd={handleTouchEndModal}
          >
            {/* BOTÃO FECHAR ✕ */}
            <button 
              style={{
                position: 'absolute',
                top: 20,
                right: 20,
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: '#fff',
                width: 44,
                height: 44,
                borderRadius: '50%',
                fontSize: 22,
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 1000000,
                boxShadow: '0 2px 10px rgba(0,0,0,0.5)'
              }}
              onClick={(e) => {
                e.stopPropagation()
                setFotoModalIndex(null)
              }}
            >
              ✕
            </button>

            {/* CONTADOR */}
            {listaMidias.length > 1 && (
              <div 
                style={{
                  position: 'absolute',
                  top: 24,
                  background: 'rgba(0,0,0,0.6)',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: '700',
                  padding: '6px 16px',
                  borderRadius: 20,
                  border: '1px solid rgba(255,255,255,0.2)',
                  zIndex: 1000000
                }}
              >
                {fotoModalIndex + 1} de {listaMidias.length}
              </div>
            )}

            {/* SETA ESQUERDA < */}
            {listaMidias.length > 1 && (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  fotoAnterior()
                }}
                style={{
                  position: 'absolute',
                  left: 16,
                  background: 'rgba(255,255,255,0.25)',
                  border: 'none',
                  color: '#ffffff',
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  fontSize: 32,
                  lineHeight: '1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000000,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                  userSelect: 'none'
                }}
                title="Mídia Anterior"
              >
                ‹
              </button>
            )}

            {/* EXIBIÇÃO DA MÍDIA FULLSCREEN */}
            {(() => {
              const urlAtual = listaMidias[fotoModalIndex]
              const ehVideoModal = urlAtual.match(/\.(mp4|webm|ogg|mov|mkv)($|\?)/i)

              if (ehVideoModal) {
                return (
                  <video 
                    src={urlAtual}
                    controls
                    autoPlay
                    playsInline
                    style={{
                      maxWidth: '92%',
                      maxHeight: '80vh',
                      borderRadius: 12,
                      boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
                      background: '#000'
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                )
              }

              return (
                <img 
                  src={urlAtual}
                  alt={`Mídia ${fotoModalIndex + 1}`}
                  decoding="async"
                  style={{
                    maxWidth: '92%',
                    maxHeight: '82vh',
                    objectFit: 'contain',
                    borderRadius: 12,
                    boxShadow: '0 8px 30px rgba(0,0,0,0.8)',
                    userSelect: 'none'
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              )
            })()}

            {/* SETA DIREITA > */}
            {listaMidias.length > 1 && (
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  fotoProxima()
                }}
                style={{
                  position: 'absolute',
                  right: 16,
                  background: 'rgba(255,255,255,0.25)',
                  border: 'none',
                  color: '#ffffff',
                  width: 50,
                  height: 50,
                  borderRadius: '50%',
                  fontSize: 32,
                  lineHeight: '1',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 1000000,
                  boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                  userSelect: 'none'
                }}
                title="Próxima Mídia"
              >
                ›
              </button>
            )}
          </div>
        )}

        {/* CONTADORES PADRÃO */}
        <div style={containerContadoresReal}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {(() => {
              const contagem: Record<string, number> = {}
              Object.values(post.reacoes || {}).forEach((emoji: any) => { contagem[emoji] = (contagem[emoji] || 0) + 1 })
              const ordenados = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 3)

              if (ordenados.length === 0) {
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 22 }}>
                    <span style={{ fontSize: 16, opacity: 0.4 }}>🤙</span>
                    <span style={{ fontSize: 11, color: '#65676b', marginTop: 1 }}>0</span>
                  </div>
                )
              }

              return ordenados.map(([emoji, total]) => (
                <div key={emoji} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 22 }}>
                  <span style={{ fontSize: 16 }}>{emoji}</span>
                  <span style={{ fontSize: 11, fontWeight: '700', color: '#008C3A', marginTop: 1 }}>{total}</span>
                </div>
              ))
            })()}
          </div>

          {/* VISUALIZAÇÕES (EXIBIDAS APENAS SE FOR VÍDEO), COMENTÁRIOS E ESPALHADAS */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {ehVideoPost && (
              <>
                <span style={{ fontWeight: '600', color: '#65676b' }}>
                  👁️ {post.visualizacoes || post.views || post.conteudo?.visualizacoes || 0} visualizações
                </span>
                <span>•</span>
              </>
            )}
            <span style={{ cursor: 'pointer' }} onClick={() => setComentarioAberto(true)}>
              {totalComentariosTotal} comentários
            </span>
            <span>•</span>
            <span style={{ color: post.espalhado ? '#008C3A' : '#65676b' }}>{post.espalhadosCount || 0} espalhadas</span>
          </div>
        </div>

        <div style={divisorLinhaReal} />

        {/* BOTÕES DE AÇÃO */}
        <div style={{ display: 'flex', position: 'relative' }}>
          <div style={{ flex: 1, position: 'relative' }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <button 
              style={{ ...btnAcaoPostReal, color: jaReagiu ? '#008C3A' : '#65676b', fontWeight: jaReagiu ? '700' : '600' }}
              onClick={darGosteiDireto}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onContextMenu={(e) => e.preventDefault()}
            >
              <IconeBrazilzao ativo={jaReagiu} reacaoAtiva={reacaoAtual} />
              {jaReagiu ? labelReacao : 'Gostar'}
            </button>

            {mostrarReacoes && (
              <div style={tooltipReacoes} onMouseEnter={() => hoverTimerRef.current && clearTimeout(hoverTimerRef.current)} onMouseLeave={handleMouseLeave}>
                {REACOES_LISTA.map(({ emoji, label }) => (
                  <button 
                    key={emoji} ref={(el) => { emojiRefs.current[emoji] = el }}
                    onClick={() => alterarReacao(emoji)}
                    style={{
                      ...btnEmoji,
                      transform: emojiAtivoNoToque === emoji ? 'scale(1.45) translateY(-8px)' : 'scale(1)',
                      transition: 'transform 0.15s ease-out'
                    }}
                    title={label}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button style={btnAcaoPostReal} onClick={() => setComentarioAberto(true)}>
            <span style={{ marginRight: 6 }}>💬</span> Comentar
          </button>

          <button 
            style={{ ...btnAcaoPostReal, color: post.espalhado ? '#008C3A' : '#65676b', fontWeight: post.espalhado ? '700' : '600' }}
            onClick={() => setMenuEspalharAberto(true)}
          >
            <span style={{ marginRight: 6, transform: 'scaleX(-1)', display: 'inline-block' }}>🔄</span>
            {post.espalhado ? 'Espalhado!' : 'Espalhar'}
          </button>
        </div>
      </Card>

      {/* MODAL DE ESPALHAR */}
      {menuEspalharAberto && (
        <div style={fundoModalComentario} onClick={() => { setMenuEspalharAberto(false); setEnviandoParaAmigo(false); setAmigoSelecionado(null) }}>
          <div style={{ ...caixaModalComentario, maxHeight: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div style={topoModalComentario}>
              <div style={{ width: 36, height: 4, background: '#e4e6eb', borderRadius: 2, margin: '0 auto 8px auto' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <strong style={{ fontSize: 16, color: '#050505', fontWeight: '800' }}>Espalhar Publicação</strong>
                <button onClick={() => { setMenuEspalharAberto(false); setEnviandoParaAmigo(false); setAmigoSelecionado(null) }} style={btnFecharModalComentario}>✕</button>
              </div>
            </div>
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {!enviandoParaAmigo ? (
                <>
                  <button onClick={() => executarEspalharFeed()} style={btnOpcaoEspalhar}>
                    <span style={{ fontSize: 20 }}>🔄</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ display: 'block', fontSize: 14 }}>Espalhar no meu feed</strong>
                      <span style={{ fontSize: 11, color: '#65676b' }}>Compartilhe direto para seus seguidores</span>
                    </div>
                  </button>
                  <button onClick={abrirMandarAmigo} style={btnOpcaoEspalhar}>
                    <span style={{ fontSize: 20 }}>💬</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ display: 'block', fontSize: 14 }}>Mandar para um amigo</strong>
                      <span style={{ fontSize: 11, color: '#65676b' }}>Envie no bate-papo privado para quem você segue</span>
                    </div>
                  </button>
                  <button onClick={compartilharWhatsApp} style={btnOpcaoEspalhar}>
                    <span style={{ fontSize: 20 }}>🟢</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ display: 'block', fontSize: 14, color: '#25D366' }}>Mandar no WhatsApp</strong>
                      <span style={{ fontSize: 11, color: '#65676b' }}>Envie para amigos ou nos grupos</span>
                    </div>
                  </button>
                  <button onClick={compartilharFacebook} style={btnOpcaoEspalhar}>
                    <span style={{ fontSize: 20 }}>🔵</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ display: 'block', fontSize: 14, color: '#1877F2' }}>Compartilhar no Facebook</strong>
                      <span style={{ fontSize: 11, color: '#65676b' }}>Poste na sua linha do tempo</span>
                    </div>
                  </button>
                  <button onClick={copiarLinkPost} style={btnOpcaoEspalhar}>
                    <span style={{ fontSize: 20 }}>🔗</span>
                    <div style={{ textAlign: 'left' }}>
                      <strong style={{ display: 'block', fontSize: 14 }}>Copiar link</strong>
                      <span style={{ fontSize: 11, color: '#65676b' }}>Copie o link direto do post</span>
                    </div>
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <strong style={{ fontSize: 13, color: '#008C3A' }}>Selecione o amigo:</strong>
                  {carregandoAmigos && <p style={{ fontSize: 12, color: '#65676b', textAlign: 'center' }}>Buscando amigos...</p>}
                  {!carregandoAmigos && amigosLista.length === 0 && <p style={{ fontSize: 12, color: '#65676b', textAlign: 'center' }}>Nenhum amigo encontrado no momento.</p>}
                  <div style={{ maxHeight: 180, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {amigosLista.map((amigo) => {
                      const selecionado = amigoSelecionado?.id === amigo.id
                      return (
                        <div key={amigo.id} onClick={() => setAmigoSelecionado(amigo)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 12, background: selecionado ? '#e6f4ea' : '#f8f9fa', border: selecionado ? '1px solid #008C3A' : '1px solid #e4e6eb', cursor: 'pointer' }}>
                          <div style={{ ...avatarReal, width: 32, height: 32 }}>
                            {amigo.foto_url ? <img src={amigo.foto_url} alt="" style={fotoPerfilImg} loading="lazy" decoding="async" /> : (amigo.nome?.charAt(0).toUpperCase() || 'U')}
                          </div>
                          <span style={{ fontSize: 13, fontWeight: selecionado ? 'bold' : 'normal', color: selecionado ? '#008C3A' : '#050505', flex: 1 }}>{amigo.nome}</span>
                          {selecionado && <span style={{ color: '#008C3A', fontWeight: 'bold' }}>✓</span>}
                        </div>
                      )
                    })}
                  </div>
                  <textarea placeholder="Escreva uma mensagem privada (opcional)..." value={mensagemParaAmigo} onChange={(e) => setMensagemParaAmigo(e.target.value)} style={inputComentarioEspalhar} rows={2} />
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={() => setEnviandoParaAmigo(false)} style={{ ...btnEnviarComentarioReal, background: '#e4e6eb', color: '#050505', flex: 1 }}>Voltar</button>
                    <button onClick={enviarPostParaAmigo} style={{ ...btnEnviarComentarioReal, flex: 2 }}>Enviar Mensagem</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE DENÚNCIA DO POST */}
      {modalDenunciaAberto && (
        <div style={fundoModalComentario} onClick={() => setModalDenunciaAberto(false)}>
          <div style={{ ...caixaModalComentario, padding: 20, maxHeight: 'none' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 36 }}>🚩</span>
              <h3 style={{ fontSize: 18, fontWeight: '900', color: '#111', margin: '8px 0 4px 0' }}>Denunciar Publicação</h3>
              <p style={{ fontSize: 13, color: '#65676b', margin: 0 }}>Por que você está denunciando esta publicação?</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {['Conteúdo Impróprio / Ofensivo', 'Spam / Golpe', 'Desinformação', 'Direitos Autorais / Plágio', 'Outros'].map((motivo) => (
                <label key={motivo} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: motivoDenuncia === motivo ? '#fee2e2' : '#f8f9fa', border: motivoDenuncia === motivo ? '1px solid #ef4444' : '1px solid #e5e7eb', borderRadius: 10, cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="motivo_denuncia_post" 
                    value={motivo} 
                    checked={motivoDenuncia === motivo} 
                    onChange={() => setMotivoDenuncia(motivo)} 
                    style={{ accentColor: '#ef4444' }} 
                  />
                  <span style={{ fontSize: 13, color: motivoDenuncia === motivo ? '#ef4444' : '#111', fontWeight: motivoDenuncia === motivo ? 'bold' : 'normal' }}>{motivo}</span>
                </label>
              ))}
            </div>

            <textarea 
              placeholder="Detalhes adicionais (opcional)..." 
              value={comentarioDenuncia} 
              onChange={e => setComentarioDenuncia(e.target.value)} 
              style={{ width: '100%', height: 60, padding: 10, borderRadius: 10, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', resize: 'none', marginBottom: 16, boxSizing: 'border-box' }} 
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                onClick={() => setModalDenunciaAberto(false)} 
                style={{ flex: 1, background: '#f0f2f5', border: 'none', padding: '12px', borderRadius: 10, fontWeight: 'bold', fontSize: 13, cursor: 'pointer', color: '#111' }}
              >
                Cancelar
              </button>
              <button 
                onClick={enviarDenunciaPost} 
                disabled={enviandoDenuncia || !motivoDenuncia} 
                style={{ flex: 2, background: '#ef4444', color: '#fff', border: 'none', padding: '12px', borderRadius: 10, fontWeight: 'bold', fontSize: 13, cursor: 'pointer', opacity: enviandoDenuncia || !motivoDenuncia ? 0.6 : 1 }}
              >
                {enviandoDenuncia ? 'Enviando...' : 'Enviar Denúncia'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAIXA FLUTUANTE DE COMENTÁRIOS */}
      {comentarioAberto && (
        <div style={fundoModalComentario} onClick={() => { setComentarioAberto(false); setComentarioRespondendo(null); setNovoComentario(''); }}>
          <div style={caixaModalComentario} onClick={(e) => e.stopPropagation()}>
            <div style={topoModalComentario}>
              <div style={{ width: 36, height: 4, background: '#e4e6eb', borderRadius: 2, margin: '0 auto 8px auto' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                <strong style={{ fontSize: 16, color: '#050505', fontWeight: '800' }}>Comentários ({totalComentariosTotal})</strong>
                <button onClick={() => { setComentarioAberto(false); setComentarioRespondendo(null); setNovoComentario(''); }} style={btnFecharModalComentario}>✕</button>
              </div>
            </div>

            <div style={areaRolavelComentarios}>
              {(!post.comentarios || post.comentarios.length === 0) && (
                <div style={{ textAlign: 'center', color: '#65676b', padding: '30px 0', fontSize: 13 }}>Nenhum comentário ainda. Seja o primeiro a comentar!</div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {post.comentarios?.map((com: any, cIdx: number) => {
                  const jaCurtiu = !!com.reacoes?.[usuarioId]
                  const totalCurtidas = Object.keys(com.reacoes || {}).length
                  const ehMeuComentario = com.autor?.id === usuarioAtual?.id
                  const ehDonoDoPost = post.usuario_id === usuarioAtual?.id || post.autor?.id === usuarioAtual?.id

                  return (
                    <div key={com.id || cIdx} id={`comentario-${com.id}`} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <Link href={`/perfil?id=${com.autor?.id}`} style={{ textDecoration: 'none' }}>
                          <div style={{ ...avatarReal, width: 34, height: 34, flexShrink: 0 }}>
                            {com.autor?.foto_url ? <img src={com.autor.foto_url} alt="" style={fotoPerfilImg} loading="lazy" decoding="async" /> : (com.autor?.nome?.charAt(0).toUpperCase() || 'U')}
                          </div>
                        </Link>
                        <div style={{ flex: 1 }}>
                          <div style={boxComentarioCard}>
                            <Link href={`/perfil?id=${com.autor?.id}`} style={{ textDecoration: 'none' }}>
                              <strong style={{ fontSize: 13, color: '#008C3A', display: 'block', marginBottom: 2 }}>{com.autor?.nome || 'Usuário'}</strong>
                            </Link>
                            {com.texto && <span style={{ fontSize: 13, color: '#111', lineHeight: '1.4', whiteSpace: 'pre-wrap', display: 'block' }}>{com.texto}</span>}
                            {com.midiaUrl && (
                              <div style={containerMidiaComentario} onClick={() => setFotoModalIndex(0)}>
                                {com.midiaUrl.match(/\.(mp4|webm|ogg|mov|mkv)($|\?)/i) ? <video src={com.midiaUrl} controls style={elementoMidiaComentario} /> : <img src={com.midiaUrl} alt="Anexo" style={elementoMidiaComentario} loading="lazy" decoding="async" />}
                              </div>
                            )}
                          </div>

                          <div style={acoesComentarioRow}>
                            <button onClick={() => alternarCurtirComentario(com.id)} style={{ ...btnAcaoComentario, color: jaCurtiu ? '#008C3A' : '#65676b', fontWeight: jaCurtiu ? '700' : '600' }}>
                              {jaCurtiu ? 'Curtido' : 'Curtir'} {totalCurtidas > 0 && `(${totalCurtidas})`}
                            </button>
                            <span>•</span>
                            <button onClick={() => prepararResposta(com)} style={btnAcaoComentario}>Responder</button>
                            {(ehMeuComentario || ehDonoDoPost) && (
                              <>
                                <span>•</span>
                                <button onClick={() => apagarComentario(com.id)} style={{ ...btnAcaoComentario, color: '#ef4444' }}>Apagar</button>
                              </>
                            )}
                          </div>

                          {/* RESPOSTAS DO COMENTÁRIO */}
                          {com.respostas && com.respostas.length > 0 && (
                            <div style={containerRespostasComentario}>
                              {com.respostas.map((resp: any, rIdx: number) => {
                                const jaCurtiuResp = !!resp.reacoes?.[usuarioId]
                                const totalCurtidasResp = Object.keys(resp.reacoes || {}).length
                                const ehMinhaResp = resp.autor?.id === usuarioAtual?.id

                                return (
                                  <div key={resp.id || rIdx} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <Link href={`/perfil?id=${resp.autor?.id}`} style={{ textDecoration: 'none' }}>
                                      <div style={{ ...avatarReal, width: 28, height: 28, flexShrink: 0 }}>
                                        {resp.autor?.foto_url ? <img src={resp.autor.foto_url} alt="" style={fotoPerfilImg} loading="lazy" decoding="async" /> : (resp.autor?.nome?.charAt(0).toUpperCase() || 'U')}
                                      </div>
                                    </Link>
                                    <div style={{ flex: 1 }}>
                                      <div style={boxComentarioCard}>
                                        <Link href={`/perfil?id=${resp.autor?.id}`} style={{ textDecoration: 'none' }}>
                                          <strong style={{ fontSize: 12, color: '#008C3A', display: 'block', marginBottom: 2 }}>{resp.autor?.nome || 'Usuário'}</strong>
                                        </Link>
                                        {resp.texto && <span style={{ fontSize: 12, color: '#111', lineHeight: '1.4', display: 'block' }}>{resp.texto}</span>}
                                        {resp.midiaUrl && (
                                          <div style={containerMidiaComentario} onClick={() => setFotoModalIndex(0)}>
                                            {resp.midiaUrl.match(/\.(mp4|webm|ogg|mov|mkv)($|\?)/i) ? <video src={resp.midiaUrl} controls style={elementoMidiaComentario} /> : <img src={resp.midiaUrl} alt="Anexo" style={elementoMidiaComentario} loading="lazy" decoding="async" />}
                                          </div>
                                        )}
                                      </div>
                                      <div style={acoesComentarioRow}>
                                        <button onClick={() => alternarCurtirComentario(resp.id, com.id)} style={{ ...btnAcaoComentario, color: jaCurtiuResp ? '#008C3A' : '#65676b', fontWeight: jaCurtiuResp ? '700' : '600' }}>
                                          {jaCurtiuResp ? 'Curtido' : 'Curtir'} {totalCurtidasResp > 0 && `(${totalCurtidasResp})`}
                                        </button>
                                        <span>•</span>
                                        <button onClick={() => prepararResposta(com, resp.autor?.nome)} style={btnAcaoComentario}>Responder</button>
                                        {(ehMinhaResp || ehDonoDoPost) && (
                                          <>
                                            <span>•</span>
                                            <button onClick={() => apagarComentario(resp.id, com.id)} style={{ ...btnAcaoComentario, color: '#ef4444' }}>Apagar</button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {midiaComentarioPreview && (
              <div style={boxPreviewComentario}>
                <button onClick={removerMidiaComentario} style={btnRemoverPreviewComentario}>✕</button>
                {midiaComentarioFile?.type.startsWith('video/') ? (
                  <video src={midiaComentarioPreview} controls style={{ maxHeight: 90, borderRadius: 8 }} />
                ) : (
                  <img src={midiaComentarioPreview} alt="Preview" style={{ maxHeight: 90, borderRadius: 8, objectFit: 'cover' }} decoding="async" />
                )}
              </div>
            )}

            <div style={rodapeModalComentario}>
              {comentarioRespondendo && (
                <div style={tagRespondendoBox}>
                  <span>Respondendo a <strong style={{ color: '#008C3A' }}>@{comentarioRespondendo.autor?.nome}</strong></span>
                  <button onClick={() => { setComentarioRespondendo(null); setNovoComentario(''); }} style={btnCancelarResposta}>✕</button>
                </div>
              )}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ ...avatarReal, width: 34, height: 34, flexShrink: 0 }}>
                  {usuarioAtual?.foto_url ? <img src={usuarioAtual.foto_url} alt="" style={fotoPerfilImg} loading="lazy" decoding="async" /> : (usuarioAtual?.nome?.charAt(0).toUpperCase() || 'U')}
                </div>
                <button type="button" onClick={() => fileInputComentarioRef.current?.click()} style={btnAnexarComentario} title="Anexar foto ou vídeo">📎</button>
                <input type="file" ref={fileInputComentarioRef} onChange={handleMidiaComentarioChange} accept="image/*,video/*" style={{ display: 'none' }} />
                <input ref={inputComentRef} type="text" placeholder={comentarioRespondendo ? `Responder a ${comentarioRespondendo.autor?.nome}...` : "Escreva um comentário..."} value={novoComentario} onChange={(e) => setNovoComentario(e.target.value)} style={inputComentario} onKeyDown={(e) => { if (e.key === 'Enter') enviarComentario() }} />
                <button onClick={enviarComentario} disabled={enviandoComentario || (!novoComentario.trim() && !midiaComentarioFile)} style={{ ...btnEnviarComentarioReal, opacity: enviandoComentario || (!novoComentario.trim() && !midiaComentarioFile) ? 0.5 : 1 }}>
                  {enviandoComentario ? '...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ESTILOS ENCAPSULADOS
const cardPostReal = { background: '#fff', marginBottom: 14, padding: 16, borderRadius: 16, position: 'relative' as const, boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }
const badgeEspalhadoTopoDestaque = { background: '#e6f4ea', border: '1px solid #c3e6cb', padding: '8px 12px', borderRadius: 12, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }
const postTopo = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 4px' }
const avatarReal = { width: 38, height: 38, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' as const, color: '#4b5563', fontSize: 15, overflow: 'hidden' }
const fotoPerfilImg = { width: '100%', height: '100%', objectFit: 'cover' as const }
const nomeAutorReal = { color: '#050505', fontSize: 14, fontWeight: '700' as const }
const metaReal = { margin: '2px 0 0 0', fontSize: 11, color: '#65676b' }
const textoPostReal = { color: '#050505', lineHeight: '1.45', fontSize: 14, marginBottom: 10, padding: '0 4px' }
const btnVerMais = { background: 'none', border: 'none', color: '#008C3A', fontWeight: 'bold' as const, cursor: 'pointer', fontSize: 13, padding: '0 0 0 4px' }
const containerMidiaReal = { width: '100%', background: '#1e293b', maxHeight: 450, display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 12, overflow: 'hidden', borderRadius: 14 }
const midiaElementoReal = { width: '100%', maxHeight: 450, objectFit: 'cover' as const, display: 'block' }
const iconePlayOverlay = { position: 'absolute' as const, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(0,0,0,0.65)', color: '#fff', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, pointerEvents: 'none' as const, zIndex: 10, backdropFilter: 'blur(4px)', border: '2px solid rgba(255,255,255,0.8)' }
const containerContadoresReal = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#65676b', padding: '0 4px 10px 4px', minHeight: 46 }
const divisorLinhaReal = { borderTop: '1px solid #f0f2f5', marginBottom: 2 }
const btnAcaoPostReal = { flex: 1, background: 'none', border: 'none', padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: '600' as const, color: '#65676b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' as const, WebkitUserSelect: 'none' as const, userSelect: 'none' as const, WebkitTouchCallout: 'none' as const }
const tooltipReacoes = { position: 'absolute' as const, bottom: '105%', left: 10, background: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', borderRadius: 30, padding: '6px 12px', display: 'flex', gap: 12, zIndex: 150 }
const btnEmoji = { background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', padding: 0, transformOrigin: 'bottom center', transition: 'transform 0.15s ease-out' }
const fundoModalComentario = { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.65)', backdropFilter: 'blur(4px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', padding: 0 }
const caixaModalComentario = { width: '100%', maxWidth: 520, maxHeight: '80vh', backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, display: 'flex', flexDirection: 'column' as const, boxShadow: '0 -10px 40px rgba(0,0,0,0.3)', overflow: 'hidden', animation: 'subirModal 0.25s ease-out forwards' }
const topoModalComentario = { padding: '12px 16px', borderBottom: '1px solid #f0f2f5', display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }
const btnFecharModalComentario = { background: '#f0f2f5', border: 'none', width: 28, height: 28, borderRadius: '50%', fontSize: 14, fontWeight: 'bold' as const, color: '#65676b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const areaRolavelComentarios = { flex: 1, overflowY: 'auto' as const, padding: '16px', display: 'flex', flexDirection: 'column' as const, gap: 12 }
const rodapeModalComentario = { padding: '12px 16px', borderTop: '1px solid #f0f2f5', background: '#fff', display: 'flex', flexDirection: 'column' as const, gap: 8 }
const inputComentario = { flex: 1, padding: '10px 16px', borderRadius: 20, border: '1px solid #e4e6eb', background: '#f8f9fa', outline: 'none', fontSize: 13, color: '#050505' }
const btnAnexarComentario = { background: '#f0f2f5', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }
const btnEnviarComentarioReal = { background: '#008C3A', color: '#fff', border: 'none', borderRadius: 20, padding: '8px 18px', fontSize: 12, fontWeight: 'bold' as const, cursor: 'pointer' }
const boxComentarioCard = { background: '#f0f0f5', padding: '10px 14px', borderRadius: 18, fontSize: 13, display: 'inline-block', maxWidth: '100%' }
const acoesComentarioRow = { display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, marginLeft: 12, fontSize: 11, color: '#65676b' }
const btnAcaoComentario = { background: 'none', border: 'none', padding: 0, fontSize: 11, fontWeight: '600' as const, color: '#65676b', cursor: 'pointer' }
const containerRespostasComentario = { marginTop: 10, marginLeft: 10, borderLeft: '2px solid #e0f2fe', paddingLeft: 12, display: 'flex', flexDirection: 'column' as const, gap: 10 }
const tagRespondendoBox = { background: '#e6f4ea', color: '#008C3A', padding: '4px 10px', borderRadius: 12, fontSize: 11, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
const btnCancelarResposta = { background: 'none', border: 'none', color: '#008C3A', cursor: 'pointer', fontWeight: 'bold' as const, fontSize: 12 }
const containerMidiaComentario = { marginTop: 8, borderRadius: 12, overflow: 'hidden', maxHeight: 180, maxWidth: 240, cursor: 'pointer', background: '#000' }
const elementoMidiaComentario = { width: '100%', maxHeight: 180, objectFit: 'cover' as const, display: 'block' }
const boxPreviewComentario = { padding: '8px 16px', background: '#f8f9fa', borderTop: '1px solid #e4e6eb', position: 'relative' as const, display: 'flex', alignItems: 'center' }
const btnRemoverPreviewComentario = { position: 'absolute' as const, top: 12, left: 24, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 12, cursor: 'pointer', fontWeight: 'bold' as const }
const btnOpcaoEspalhar = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid #e4e6eb', background: '#fff', cursor: 'pointer', width: '100%' }
const inputComentarioEspalhar = { width: '100%', padding: '10px 14px', borderRadius: 12, border: '1px solid #e4e6eb', background: '#f8f9fa', outline: 'none', fontSize: 13, resize: 'none' as const }