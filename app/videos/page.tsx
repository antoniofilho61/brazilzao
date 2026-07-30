'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
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

  return dataPost.toLocaleDateString('pt-BR')
}

const REACOES_LISTA = [
  { emoji: '🤙', label: 'Salve' },
  { emoji: '❤️', label: 'Amei' },
  { emoji: '😂', label: 'Riso' },
  { emoji: '😲', label: 'Chocado' },
  { emoji: '😢', label: 'Triste' },
  { emoji: '🔥', label: 'Fogo' }
]

function IconeBrazilzao({ ativo, reacaoAtiva }: { ativo: boolean; reacaoAtiva?: string }) {
  if (ativo && reacaoAtiva && reacaoAtiva !== '🤙') {
    return <span style={{ marginRight: 6, fontSize: 18 }}>{reacaoAtiva}</span>
  }
  return (
    <svg 
      width="18" height="18" viewBox="0 0 24 24" 
      fill={ativo ? "#008C3A" : "none"} stroke={ativo ? "#008C3A" : "#FFFFFF"} 
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ marginRight: 6, transition: 'all 0.2s ease' }}
    >
      <path d="M18 14c1.5-1.5 3-3.5 3-5.5s-1.5-3-3-3-3 1.5-3 3v2" />
      <path d="M12 11.5V6a2 2 0 0 0-4 0v9.5" />
      <path d="M8 15V9a2 2 0 0 0-4 0v7a6 6 0 0 0 11.6 2.2l.4-1.2c.4-1.2.1-2.5-.8-3.3L12 11.5z" />
    </svg>
  )
}

function CardVideoItem({ post, idx, usuarioAtual, onUpdate, abrirComentarios, abrirEspalhar }: any) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [mostrarReacoes, setMostrarReacoes] = useState(false)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  const usuarioId = usuarioAtual?.id || 'anonimo'
  const reacaoAtual = post.reacoes?.[usuarioId]
  const jaReagiu = !!reacaoAtual
  const labelReacao = REACOES_LISTA.find(r => r.emoji === reacaoAtual)?.label || 'Gostar'
  const totalReacoes = Object.keys(post.reacoes || {}).length

  const calcularTotalComentarios = (comentarios: any[]) => {
    if (!comentarios || !Array.isArray(comentarios)) return 0
    return comentarios.reduce((total, c) => total + 1 + (Array.isArray(c.respostas) ? c.respostas.length : 0), 0)
  }

  const totalComentariosTotal = calcularTotalComentarios(post.comentarios)

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
      { threshold: 0.6 }
    )

    observer.observe(elVideo)
    return () => { if (elVideo) observer.unobserve(elVideo) }
  }, [post.midiaUrl])

  const alterarReacao = async (emoji: string) => {
    if (!usuarioAtual?.id) return alert('Crie uma conta ou entre para reagir!')
    const reacoes = { ...(post.reacoes || {}) }
    const reacaoAnterior = reacoes[usuarioId]
    const novoEmoji = reacaoAnterior === emoji ? null : emoji

    if (novoEmoji) reacoes[usuarioId] = novoEmoji
    else delete reacoes[usuarioId]

    setMostrarReacoes(false)
    onUpdate({ ...post, reacoes })
  }

  const darGosteiDireto = () => alterarReacao('🤙')

  return (
    <div style={estilos.cardVideoFullScreen}>
      <video
        ref={videoRef}
        src={post.midiaUrl}
        loop
        playsInline
        crossOrigin="anonymous"
        style={estilos.videoElement}
        onClick={() => {
          if (videoRef.current) {
            if (videoRef.current.paused) videoRef.current.play()
            else videoRef.current.pause()
          }
        }}
      />

      <div style={estilos.overlayBottom}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={estilos.avatarUser}>
            {post.autor?.foto_url ? (
              <img src={post.autor.foto_url} alt="" style={estilos.imgAvatar} />
            ) : (
              post.autor?.nome?.charAt(0).toUpperCase() || 'U'
            )}
          </div>
          <div>
            <strong style={{ color: '#fff', fontSize: 14 }}>{post.autor?.nome}</strong>
            <p style={{ color: '#ccc', fontSize: 11, margin: 0 }}>{formatarTempoRelativo(post.tempo)}</p>
          </div>
        </div>

        {post.texto && <p style={estilos.legendaTexto}>{post.texto}</p>}

        {/* BARRA DE ESTATÍSTICAS COM VISUALIZAÇÕES NO MEIO (FOTO 2) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#eee', fontSize: 12 }}>
          <span>🤙 {totalReacoes} reações</span>
          <span style={{ color: '#cbd5e1', fontWeight: '700', fontSize: 12 }}>
            👁️ {post.visualizacoes || post.views || post.viewsCount || 0} visualizações
          </span>
          <span>{totalComentariosTotal} comentários • {post.espalhadosCount || 0} espalhadas</span>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.2)' }} />

        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', position: 'relative' }}>
          <div 
            style={{ position: 'relative' }} 
            onMouseEnter={() => { hoverTimerRef.current = setTimeout(() => setMostrarReacoes(true), 400) }}
            onMouseLeave={() => { if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current); setMostrarReacoes(false) }}
          >
            <button 
              onClick={darGosteiDireto}
              style={{ ...estilos.btnAcaoOverlay, color: jaReagiu ? '#FFD700' : '#fff' }}
            >
              <IconeBrazilzao ativo={jaReagiu} reacaoAtiva={reacaoAtual} />
              {jaReagiu ? labelReacao : 'Gostar'}
            </button>

            {mostrarReacoes && (
              <div style={estilos.tooltipReacoes}>
                {REACOES_LISTA.map(({ emoji, label }) => (
                  <button key={emoji} onClick={() => alterarReacao(emoji)} style={estilos.btnEmoji} title={label}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => abrirComentarios(post)} style={{ ...estilos.btnAcaoOverlay, color: '#fff' }}>
            <span>💬</span> Comentar
          </button>

          <button onClick={() => abrirEspalhar(post)} style={{ ...estilos.btnAcaoOverlay, color: post.espalhado ? '#FFD700' : '#fff' }}>
            <span style={{ transform: 'scaleX(-1)', display: 'inline-block' }}>🔄</span> 
            {post.espalhado ? 'Espalhado!' : 'Espalhar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function VideosPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const postIdParam = searchParams.get('postId')

  const [usuarioAtual, setUsuarioAtual] = useState<any | null>(null)
  const [postsVideos, setPostsVideos] = useState<any[]>([])
  const [carregando, setCarregando] = useState(true)

  const [postComentarioAberto, setPostComentarioAberto] = useState<any | null>(null)
  const [novoComentario, setNovoComentario] = useState('')
  const [comentarioRespondendo, setComentarioRespondendo] = useState<any | null>(null)
  const [midiaComentarioFile, setMidiaComentarioFile] = useState<File | null>(null)
  const [midiaComentarioPreview, setMidiaComentarioPreview] = useState<string | null>(null)
  const [enviandoComentario, setEnviandoComentario] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const inputComentarioRef = useRef<HTMLInputElement | null>(null)
  const [postEspalharAberto, setPostEspalharAberto] = useState<any | null>(null)

  useEffect(() => {
    async function carregarUsuario() {
      const { data: sessao } = await supabase.auth.getSession()
      if (sessao?.session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', sessao.session.user.id).maybeSingle()
        setUsuarioAtual(data)
      }
    }
    carregarUsuario()
  }, [])

  const carregarVideos = async () => {
    setCarregando(true)
    try {
      const { data: postsBanco, error } = await supabase.from('feed_posts').select('*').order('created_at', { ascending: false })
      if (!error && postsBanco) {
        const apenasVideos = postsBanco
          .map((p: any) => ({
            ...p.conteudo,
            id: p.id,
            usuario_id: p.usuario_id,
            tempo: p.created_at || p.conteudo?.tempo,
            comentarios: p.conteudo?.comentarios || [],
            reacoes: p.conteudo?.reacoes || {},
            espalhadosCount: p.conteudo?.espalhadosCount || 0
          }))
          .filter((p: any) => p.midiaUrl && p.midiaUrl.match(/\.(mp4|webm|ogg|mov|mkv)($|\?)/i))

        if (postIdParam) {
          apenasVideos.sort((a, b) => (a.id === postIdParam ? -1 : b.id === postIdParam ? 1 : 0))
        }
        setPostsVideos(apenasVideos)
      }
    } catch (err) {
      console.error('Erro ao carregar vídeos:', err)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { carregarVideos() }, [postIdParam])

  const atualizarPostNoBanco = async (postAtualizado: any) => {
    if (!postAtualizado.id) return
    setPostsVideos(prev => prev.map(p => p.id === postAtualizado.id ? postAtualizado : p))
    if (postComentarioAberto?.id === postAtualizado.id) setPostComentarioAberto(postAtualizado)
    await supabase.from('feed_posts').update({ conteudo: postAtualizado }).eq('id', postAtualizado.id)
  }

  const handleMidiaComentario = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMidiaComentarioFile(file)
    setMidiaComentarioPreview(URL.createObjectURL(file))
  }

  const removerMidiaComentario = () => {
    setMidiaComentarioFile(null)
    setMidiaComentarioPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const enviarReacaoRapida = (emoji: string) => {
    if (!postComentarioAberto) return
    const usuarioId = usuarioAtual?.id || 'anonimo'
    const reacoes = { ...(postComentarioAberto.reacoes || {}) }
    reacoes[usuarioId] = emoji
    const postAtualizado = { ...postComentarioAberto, reacoes }
    atualizarPostNoBanco(postAtualizado)
  }

  const prepararResposta = (com: any, autorNomeOverride?: string) => {
    setComentarioRespondendo(com)
    setNovoComentario(`@${autorNomeOverride || com.autor?.nome || 'usuario'} `)
    setTimeout(() => {
      inputComentarioRef.current?.focus()
    }, 100)
  }

  const enviarComentario = async () => {
    if (!usuarioAtual?.id) return alert('Faça login para comentar!')
    if (!novoComentario.trim() && !midiaComentarioFile) return
    setEnviandoComentario(true)
    let urlMidiaComentario: string | null = null

    try {
      if (midiaComentarioFile) {
        const ext = midiaComentarioFile.name.split('.').pop()?.toLowerCase() || 'jpg'
        const nomeArquivo = `coment_${usuarioAtual.id}_${Date.now()}.${ext}`
        const { error: errorUpload } = await supabase.storage.from('posts_midia').upload(nomeArquivo, midiaComentarioFile)
        if (!errorUpload) {
          const { data } = supabase.storage.from('posts_midia').getPublicUrl(nomeArquivo)
          urlMidiaComentario = data.publicUrl
        }
      }

      const novoObj: any = {
        id: `coment-${Date.now()}`,
        texto: novoComentario.trim(),
        midiaUrl: urlMidiaComentario,
        criado_em: new Date().toISOString(),
        reacoes: {},
        respostas: [],
        autor: {
          id: usuarioAtual.id,
          nome: usuarioAtual.nome || 'Usuário',
          foto_url: usuarioAtual.foto_url || null
        }
      }

      let comentariosAtuais = [...(postComentarioAberto.comentarios || [])]
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

      const postAtualizado = { ...postComentarioAberto, comentarios: comentariosAtuais }
      await atualizarPostNoBanco(postAtualizado)
      setNovoComentario('')
      removerMidiaComentario()
      setComentarioRespondendo(null)
    } catch (e) {
      console.error(e)
    } finally {
      setEnviandoComentario(false)
    }
  }

  const alternarCurtirComentario = async (comentId: string, respostaPaiId?: string) => {
    if (!usuarioAtual?.id) return
    const idUser = usuarioAtual.id

    const comentariosAtualizados = (postComentarioAberto.comentarios || []).map((c: any) => {
      if (respostaPaiId && c.id === respostaPaiId) {
        const respostas = (c.respostas || []).map((r: any) => {
          if (r.id === comentId) {
            const reacoes = { ...(r.reacoes || {}) }
            if (reacoes[idUser]) delete reacoes[idUser]
            else reacoes[idUser] = '🤙'
            return { ...r, reacoes }
          }
          return r
        })
        return { ...c, respostas }
      } else if (c.id === comentId) {
        const reacoes = { ...(c.reacoes || {}) }
        if (reacoes[idUser]) delete reacoes[idUser]
        else reacoes[idUser] = '🤙'
        return { ...c, reacoes }
      }
      return c
    })

    atualizarPostNoBanco({ ...postComentarioAberto, comentarios: comentariosAtualizados })
  }

  const apagarComentario = (comentId: string, respostaPaiId?: string) => {
    if (!window.confirm('Deseja apagar este comentário?')) return
    let comentariosAtualizados = [...(postComentarioAberto.comentarios || [])]
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
    atualizarPostNoBanco({ ...postComentarioAberto, comentarios: comentariosAtualizados })
  }

  const executarEspalharFeed = async () => {
    if (!usuarioAtual?.id) return alert('Entre na sua conta!')
    const espalhadosCount = (postEspalharAberto.espalhadosCount || 0) + 1
    await atualizarPostNoBanco({ ...postEspalharAberto, espalhado: true, espalhadosCount })
    alert('Vídeo espalhado com sucesso!')
    setPostEspalharAberto(null)
  }

  return (
    <div style={estilos.container}>
      <nav style={estilos.navSuperior}>
        <button style={estilos.btnNavTopo} onClick={() => router.push('/feed')}>
          <span>🏠</span>Início
        </button>
        <button style={estilos.btnNavTopoAtivo} onClick={() => router.push('/videos')}>
          <span>🎬</span>Vídeos
        </button>
        <button style={estilos.btnNavTopo} onClick={() => router.push('/vendas')}>
          <span>🛍️</span>Vendas
        </button>
        <button style={estilos.btnNavTopo} onClick={() => router.push('/comunidades')}>
          <span>👥</span>Comunidades
        </button>
      </nav>

      <div style={estilos.feedVideosScroll}>
        {carregando ? (
          <div style={estilos.statusBox}>Carregando vídeos...</div>
        ) : postsVideos.length === 0 ? (
          <div style={estilos.statusBox}>Nenhum vídeo publicado ainda.</div>
        ) : (
          postsVideos.map((post, idx) => (
            <CardVideoItem
              key={post.id || idx}
              post={post}
              idx={idx}
              usuarioAtual={usuarioAtual}
              onUpdate={atualizarPostNoBanco}
              abrirComentarios={(p: any) => setPostComentarioAberto(p)}
              abrirEspalhar={(p: any) => setPostEspalharAberto(p)}
            />
          ))
        )}
      </div>

      {postComentarioAberto && (
        <div style={estilos.fundoModalComentario} onClick={() => { setPostComentarioAberto(null); setComentarioRespondendo(null); setNovoComentario(''); }}>
          <div style={estilos.caixaModalComentario} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: '10px 0 4px 0', display: 'flex', justifyContent: 'center' }}>
              <div style={estilos.pullerHeader} />
            </div>
            <div style={estilos.topoModalComentario}>
              <strong style={{ fontSize: 15, color: '#050505', fontWeight: '800' }}>
                Comentários ({postComentarioAberto.comentarios?.length || 0})
              </strong>
              <button onClick={() => { setPostComentarioAberto(null); setComentarioRespondendo(null); setNovoComentario(''); }} style={estilos.btnFecharModal}>✕</button>
            </div>

            <div style={estilos.areaRolavelComentarios}>
              {(!postComentarioAberto.comentarios || postComentarioAberto.comentarios.length === 0) ? (
                <p style={{ textAlign: 'center', color: '#65676b', padding: '30px 0', fontSize: 13 }}>
                  Nenhum comentário ainda. Seja o primeiro a comentar!
                </p>
              ) : (
                postComentarioAberto.comentarios.map((com: any) => {
                  const jaCurtiu = !!com.reacoes?.[usuarioAtual?.id]
                  const totalCurtidas = Object.keys(com.reacoes || {}).length
                  const ehMeu = com.autor?.id === usuarioAtual?.id

                  return (
                    <div key={com.id} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 12 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={estilos.avatarComentario}>
                          {com.autor?.foto_url ? <img src={com.autor.foto_url} alt="" style={estilos.imgAvatar} /> : com.autor?.nome?.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={estilos.boxTextoComentario}>
                            <strong style={{ fontSize: 13, color: '#008C3A', display: 'block', marginBottom: 2 }}>{com.autor?.nome}</strong>
                            {com.texto && <span style={{ fontSize: 13, color: '#111', whiteSpace: 'pre-wrap' }}>{com.texto}</span>}
                            {com.midiaUrl && (
                              <div style={{ marginTop: 6, borderRadius: 8, overflow: 'hidden', maxHeight: 150 }}>
                                <img src={com.midiaUrl} alt="" style={{ maxWidth: '100%', maxHeight: 150, objectFit: 'cover' }} />
                              </div>
                            )}
                          </div>
                          <div style={estilos.acoesComentarioRow}>
                            <button onClick={() => alternarCurtirComentario(com.id)} style={{ ...estilos.btnAcaoComent, color: jaCurtiu ? '#008C3A' : '#65676b', fontWeight: jaCurtiu ? '700' : '600' }}>
                              {jaCurtiu ? 'Curtido' : 'Curtir'} {totalCurtidas > 0 && `(${totalCurtidas})`}
                            </button>
                            <span>•</span>
                            <button onClick={() => prepararResposta(com)} style={estilos.btnAcaoComent}>Responder</button>
                            {ehMeu && (
                              <>
                                <span>•</span>
                                <button onClick={() => apagarComentario(com.id)} style={{ ...estilos.btnAcaoComent, color: '#ef4444' }}>Apagar</button>
                              </>
                            )}
                          </div>

                          {/* RESPOSTAS DO COMENTÁRIO */}
                          {com.respostas && com.respostas.length > 0 && (
                            <div style={{ marginTop: 8, paddingLeft: 10, borderLeft: '2px solid #008C3A33', display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {com.respostas.map((resp: any) => {
                                const jaCurtiuResp = !!resp.reacoes?.[usuarioAtual?.id]
                                const totalCurtidasResp = Object.keys(resp.reacoes || {}).length
                                return (
                                  <div key={resp.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <div style={{ ...estilos.avatarComentario, width: 24, height: 24, fontSize: 10 }}>
                                      {resp.autor?.foto_url ? <img src={resp.autor.foto_url} alt="" style={estilos.imgAvatar} /> : resp.autor?.nome?.charAt(0).toUpperCase()}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ ...estilos.boxTextoComentario, padding: '6px 10px' }}>
                                        <strong style={{ fontSize: 12, color: '#008C3A', display: 'block', marginBottom: 2 }}>{resp.autor?.nome}</strong>
                                        <span style={{ fontSize: 12, color: '#111', display: 'block' }}>{resp.texto}</span>
                                      </div>
                                      <div style={estilos.acoesComentarioRow}>
                                        <button onClick={() => alternarCurtirComentario(resp.id, com.id)} style={{ ...estilos.btnAcaoComent, color: jaCurtiuResp ? '#008C3A' : '#65676b', fontWeight: jaCurtiuResp ? '700' : '600' }}>
                                          {jaCurtiuResp ? 'Curtido' : 'Curtir'} {totalCurtidasResp > 0 && `(${totalCurtidasResp})`}
                                        </button>
                                        <span>•</span>
                                        <button onClick={() => prepararResposta(com, resp.autor?.nome)} style={estilos.btnAcaoComent}>Responder</button>
                                        {resp.autor?.id === usuarioAtual?.id && (
                                          <>
                                            <span>•</span>
                                            <button onClick={() => apagarComentario(resp.id, com.id)} style={{ ...estilos.btnAcaoComent, color: '#ef4444' }}>Apagar</button>
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
                })
              )}
            </div>

            {midiaComentarioPreview && (
              <div style={{ padding: '8px 16px', background: '#f8f9fa', borderTop: '1px solid #ddd', position: 'relative' }}>
                <button onClick={removerMidiaComentario} style={{ position: 'absolute', top: 10, left: 20, background: '#000', color: '#fff', border: 'none', borderRadius: '50%', width: 20, height: 20 }}>✕</button>
                <img src={midiaComentarioPreview} alt="" style={{ maxHeight: 80, borderRadius: 8 }} />
              </div>
            )}

            <div style={estilos.rodapeInputComentario}>
              {comentarioRespondendo && (
                <div style={estilos.tagRespondendo}>
                  <span>Respondendo a <strong style={{ color: '#008C3A' }}>@{comentarioRespondendo.autor?.nome}</strong></span>
                  <button onClick={() => { setComentarioRespondendo(null); setNovoComentario(''); }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                </div>
              )}

              <div style={estilos.barEmojisRapidos}>
                {REACOES_LISTA.map(({ emoji, label }) => (
                  <button key={emoji} onClick={() => enviarReacaoRapida(emoji)} style={estilos.btnEmojiRapido} title={label}>
                    {emoji}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button type="button" onClick={() => fileInputRef.current?.click()} style={estilos.btnAnexo}>📎</button>
                <input type="file" ref={fileInputRef} onChange={handleMidiaComentario} accept="image/*,video/*" style={{ display: 'none' }} />
                <input
                  ref={inputComentarioRef}
                  type="text"
                  placeholder={comentarioRespondendo ? `Responder a ${comentarioRespondendo.autor?.nome}...` : "Escreva um comentário..."}
                  value={novoComentario}
                  onChange={(e) => setNovoComentario(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && enviarComentario()}
                  style={estilos.inputTexto}
                />
                <button onClick={enviarComentario} disabled={enviandoComentario || (!novoComentario.trim() && !midiaComentarioFile)} style={estilos.btnEnviar3D}>
                  {enviandoComentario ? '...' : 'Enviar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {postEspalharAberto && (
        <div style={estilos.fundoModalComentario} onClick={() => setPostEspalharAberto(null)}>
          <div style={{ ...estilos.caixaModalComentario, maxHeight: 'auto', padding: 16 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <strong style={{ fontSize: 16, color: '#008C3A' }}>Espalhar Vídeo</strong>
              <button onClick={() => setPostEspalharAberto(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            </div>
            <button onClick={executarEspalharFeed} style={estilos.btnOpcaoEspalhar}>
              <span style={{ fontSize: 20 }}>🔄</span> Espalhar no meu feed
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// COMPONENTE PRINCIPAL EXPORTADO COM SUSPENSE
export default function VideosPage() {
  return (
    <Suspense fallback={<div style={{ color: '#fff', textAlign: 'center', paddingTop: '40vh', background: '#000', height: '100vh' }}>Carregando vídeos...</div>}>
      <VideosPageContent />
    </Suspense>
  )
}

const estilos = {
  container: {
    width: '100%',
    maxWidth: 500,
    margin: '0 auto',
    height: '100vh',
    background: '#000',
    display: 'flex',
    flexDirection: 'column' as const,
    position: 'relative' as const,
    overflow: 'hidden'
  },
  navSuperior: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    height: 54,
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 70%, rgba(0,0,0,0) 100%)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 30,
    backdropFilter: 'blur(4px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  btnNavTopoAtivo: { background: 'none', border: 'none', color: '#008C3A', fontSize: 10, fontWeight: 'bold' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', cursor: 'pointer', textShadow: '0 1px 2px rgba(0,0,0,0.8)' },
  btnNavTopo: { background: 'none', border: 'none', color: '#ffffff', fontSize: 10, fontWeight: '600' as const, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', cursor: 'pointer', opacity: 0.85, textShadow: '0 1px 2px rgba(0,0,0,0.8)' },
  feedVideosScroll: { flex: 1, overflowY: 'auto' as const, scrollSnapType: 'y mandatory' as const, WebkitOverflowScrolling: 'touch' as const },
  cardVideoFullScreen: { position: 'relative' as const, width: '100%', height: '100vh', scrollSnapAlign: 'start' as const, background: '#000', display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  videoElement: { width: '100%', height: '100%', objectFit: 'contain' as const, cursor: 'pointer' },
  overlayBottom: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0) 100%)', padding: '20px 16px 16px 16px', display: 'flex', flexDirection: 'column' as const, gap: 10, zIndex: 10 },
  avatarUser: { width: 36, height: 36, borderRadius: '50%', background: '#008C3A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' as const, border: '2px solid #FFD700', overflow: 'hidden' },
  imgAvatar: { width: '100%', height: '100%', objectFit: 'cover' as const },
  legendaTexto: { color: '#fff', fontSize: 13, margin: 0, lineHeight: '1.4' },
  btnAcaoOverlay: { background: 'none', border: 'none', fontSize: 13, fontWeight: 'bold' as const, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 },
  tooltipReacoes: { position: 'absolute' as const, bottom: '110%', left: 0, background: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', borderRadius: 30, padding: '6px 12px', display: 'flex', gap: 10, zIndex: 150 },
  btnEmoji: { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', padding: 0 },
  statusBox: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#888', fontSize: 14 },
  fundoModalComentario: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', backdropFilter: 'blur(6px)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'flex-end' },
  caixaModalComentario: { width: '100%', maxWidth: 500, maxHeight: '80vh', backgroundColor: '#ffffff', borderTopLeftRadius: 24, borderTopRightRadius: 24, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden', boxShadow: '0 -10px 30px rgba(0,0,0,0.3)' },
  pullerHeader: { width: 38, height: 4, background: '#CBD5E1', borderRadius: 2 },
  topoModalComentario: { padding: '8px 16px 12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  btnFecharModal: { background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 28, height: 28, fontSize: 14, color: '#64748B', cursor: 'pointer', fontWeight: 'bold' as const, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  areaRolavelComentarios: { flex: 1, overflowY: 'auto' as const, padding: '16px' },
  avatarComentario: { width: 32, height: 32, borderRadius: '50%', background: '#008C3A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 'bold' as const, overflow: 'hidden', flexShrink: 0 },
  boxTextoComentario: { background: '#F1F5F9', padding: '10px 14px', borderRadius: 16, display: 'inline-block', maxWidth: '100%' },
  acoesComentarioRow: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, marginLeft: 6, fontSize: 11, color: '#64748B' },
  btnAcaoComent: { background: 'none', border: 'none', padding: 0, fontSize: 11, fontWeight: '600' as const, cursor: 'pointer' },
  rodapeInputComentario: { padding: '10px 16px 14px 16px', borderTop: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' as const, gap: 8, background: '#ffffff' },
  tagRespondendo: { background: '#E6F4EA', color: '#008C3A', padding: '6px 12px', borderRadius: 12, fontSize: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  barEmojisRapidos: { display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '4px 0 6px 0', borderBottom: '1px solid #F1F5F9' },
  btnEmojiRapido: { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', transition: 'transform 0.1s ease' },
  btnAnexo: { background: '#F1F5F9', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  inputTexto: { flex: 1, padding: '10px 16px', borderRadius: 20, border: '1px solid #CBD5E1', outline: 'none', fontSize: 13, background: '#F8FAFC', color: '#0F172A' },
  btnEnviar3D: { background: 'linear-gradient(180deg, #00B04B 0%, #008C3A 100%)', color: '#ffffff', border: '1px solid #006B2D', padding: '9px 18px', borderRadius: 20, fontWeight: '800' as const, fontSize: 12, cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,140,58,0.3)' },
  btnOpcaoEspalhar: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: '1px solid #e4e6eb', background: '#fff', cursor: 'pointer', width: '100%', fontWeight: 'bold' as const }
}