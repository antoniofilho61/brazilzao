'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../utils/supabase/client'
import { VoiceRecorder } from 'capacitor-voice-recorder'
import { Capacitor } from '@capacitor/core'

type Usuario = {
  id: string
  nome: string | null
  username: string | null
  foto_url: string | null
}

type Conversa = {
  id: string
  usuario_1: string
  usuario_2: string
  criado_em: string
  atualizado_em: string
  outroUsuario?: Usuario | null
  ultimaMensagem?: string
}

type Mensagem = {
  id: string
  conversa_id: string
  remetente_id: string
  destinatario_id: string
  texto: string
  arquivo_url?: string
  lida: boolean
  criado_em: string
  reacoes?: Record<string, string>
}

export default function Mensagens() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [usuarioAtual, setUsuarioAtual] = useState<Usuario | null>(null)
  const [conversas, setConversas] = useState<Conversa[]>([])
  const [conversaAberta, setConversaAberta] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [telaConversaAberta, setTelaConversaAberta] = useState(false)
  const areaMensagensRef = useRef<HTMLDivElement | null>(null)
  const [novaMensagem, setNovaMensagem] = useState('')

  // PRESENÇA / STATUS "NA ATIVA"
  const [outroNaAtiva, setOutroNaAtiva] = useState(false)
  const [outroVistoUltimaVez, setOutroVistoUltimaVez] = useState<string | null>(null)

  // REFS E PREVIEW DE MÍDIA ANTES DE ENVIAR
  const inputMidiaRef = useRef<HTMLInputElement | null>(null)
  const inputDocumentoRef = useRef<HTMLInputElement | null>(null)
  const [menuAnexosAberto, setMenuAnexosAberto] = useState(false)
  
  const [midiaPendente, setMidiaPendente] = useState<{
    file: File
    urlPreview: string
    tipo: 'imagem' | 'video'
  } | null>(null)
  const [legendaMidia, setLegendaMidia] = useState('')
  const [progressoUpload, setProgressoUpload] = useState<number | null>(null)

  const [midiaExpandida, setMidiaExpandida] = useState<string | null>(null)
  const [mensagemParaReagir, setMensagemParaReagir] = useState<string | null>(null)

  // ESTADOS DO MICROFONE
  const [gravandoAudio, setGravandoAudio] = useState(false)
  const [tempoGravacao, setTempoGravacao] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const cancelarGravacaoRef = useRef(false)

  const [enviando, setEnviando] = useState(false)
  const [menuConversaAberto, setMenuConversaAberto] = useState<string | null>(null)

  useEffect(() => {
    iniciarMensagens()
  }, [])

  // CANAL DE MENSAGENS E PRESENÇA
  useEffect(() => {
    if (!conversaAberta?.id || !usuarioAtual?.id) return
    carregarMensagens(conversaAberta.id)

    setOutroNaAtiva(false)
    const outroUsuarioId = conversaAberta.outroUsuario?.id

    const canalMensagens = supabase
      .channel(`chat-presenca-${conversaAberta.id}`, {
        config: {
          presence: { key: usuarioAtual.id }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mensagens',
          filter: `conversa_id=eq.${conversaAberta.id}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const novaMensagem = payload.new as Mensagem
            setMensagens((mensagensAtuais) => {
              if (mensagensAtuais.find((m) => m.id === novaMensagem.id)) return mensagensAtuais
              return [...mensagensAtuais, novaMensagem]
            })

            if (usuarioAtual?.id && novaMensagem.destinatario_id === usuarioAtual.id) {
              const somDeNotificacao = new Audio('/mensagem.mp3')
              somDeNotificacao.play().catch((erro) => console.log('Som bloqueado', erro))
              supabase
                .from('mensagens')
                .update({ lida: true })
                .eq('id', novaMensagem.id)
                .then()
            }
          } else if (payload.eventType === 'UPDATE') {
            const mensagemAtualizada = payload.new as Mensagem
            setMensagens((atuais) =>
              atuais.map((m) => (m.id === mensagemAtualizada.id ? mensagemAtualizada : m))
            )
          }
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const estadoPresenca = canalMensagens.presenceState()
        if (outroUsuarioId && estadoPresenca[outroUsuarioId]) {
          setOutroNaAtiva(true)
          const infoOutro = estadoPresenca[outroUsuarioId][0] as any
          if (infoOutro?.online_at) {
            const horaFormatada = new Date(infoOutro.online_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })
            setOutroVistoUltimaVez(horaFormatada)
          }
        } else {
          setOutroNaAtiva(false)
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await canalMensagens.track({ online_at: new Date().toISOString() })
        }
      })

    return () => {
      supabase.removeChannel(canalMensagens)
    }
  }, [conversaAberta?.id, usuarioAtual?.id])

  useEffect(() => {
    if (!areaMensagensRef.current) return
    areaMensagensRef.current.scrollTop = areaMensagensRef.current.scrollHeight
  }, [mensagens.length])

  async function iniciarMensagens() {
    const { data: sessao } = await supabase.auth.getSession()
    if (!sessao.session?.user) {
      router.replace('/login')
      return
    }
    const authUserId = sessao.session.user.id
    let { data: usuario } = await supabase
      .from('profiles')
      .select('id, nome, username, foto_url')
      .eq('id', authUserId)
      .maybeSingle()

    if (!usuario) {
      const { data: usuarioPorAuth } = await supabase
        .from('profiles')
        .select('id, nome, username, foto_url')
        .eq('auth_user_id', authUserId)
        .maybeSingle()
      usuario = usuarioPorAuth
    }

    if (!usuario) {
      alert('Perfil não encontrado no sistema.')
      router.replace('/feed')
      return
    }

    setUsuarioAtual(usuario)
    const parametros = new URLSearchParams(window.location.search)
    const usuarioDestinoId = parametros.get('para') || parametros.get('id')
    if (usuarioDestinoId && usuarioDestinoId !== usuario.id) {
      await abrirOuCriarConversa(usuario.id, usuarioDestinoId)
      setTelaConversaAberta(true)
    }
    await carregarConversas(usuario.id)
    setCarregando(false)
  }

  async function carregarConversas(meuId: string) {
    const { data, error } = await supabase
      .from('conversas')
      .select('*')
      .or(`usuario_1.eq.${meuId},usuario_2.eq.${meuId}`)
      .order('criado_em', { ascending: false })

    if (error) return

    const conversasBase = data ?? []
    const idsOutrosUsuarios = conversasBase.map((conversa) =>
      conversa.usuario_1 === meuId ? conversa.usuario_2 : conversa.usuario_1
    )

    let usuariosMapa: Record<string, Usuario> = {}
    if (idsOutrosUsuarios.length > 0) {
      const { data: usuarios } = await supabase
        .from('profiles')
        .select('id, nome, username, foto_url')
        .in('id', idsOutrosUsuarios)
      usuariosMapa = (usuarios ?? []).reduce((mapa: Record<string, Usuario>, usuario) => {
        mapa[usuario.id] = usuario
        return mapa
      }, {})
    }

    const conversasComUsuarios = await Promise.all(
      conversasBase.map(async (conversa) => {
        const outroId = conversa.usuario_1 === meuId ? conversa.usuario_2 : conversa.usuario_1
        const { data: ultima } = await supabase
          .from('mensagens')
          .select('texto')
          .eq('conversa_id', conversa.id)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle()
        return {
          ...conversa,
          outroUsuario: usuariosMapa[outroId] ?? null,
          ultimaMensagem: ultima?.texto ?? 'Conversa iniciada'
        }
      })
    )
    setConversas(conversasComUsuarios)
  }

  async function abrirOuCriarConversa(meuId: string, outroUsuarioId: string) {
    const { data: conv1 } = await supabase
      .from('conversas')
      .select('*')
      .eq('usuario_1', meuId)
      .eq('usuario_2', outroUsuarioId)
      .maybeSingle()

    let conversaExistente = conv1
    if (!conversaExistente) {
      const { data: conv2 } = await supabase
        .from('conversas')
        .select('*')
        .eq('usuario_1', outroUsuarioId)
        .eq('usuario_2', meuId)
        .maybeSingle()
      conversaExistente = conv2
    }

    if (conversaExistente) {
      const conversaComUsuario = await montarConversaComUsuario(conversaExistente, meuId)
      setConversaAberta(conversaComUsuario)
      return conversaComUsuario
    }

    const { data: novaConversa, error } = await supabase
      .from('conversas')
      .insert({ usuario_1: meuId, usuario_2: outroUsuarioId })
      .select()
      .single()

    if (error || !novaConversa) return null

    const conversaComUsuario = await montarConversaComUsuario(novaConversa, meuId)
    setConversaAberta(conversaComUsuario)
    return conversaComUsuario
  }

  async function montarConversaComUsuario(conversa: Conversa, meuId: string) {
    const outroId = conversa.usuario_1 === meuId ? conversa.usuario_2 : conversa.usuario_1
    const { data: outroUsuario } = await supabase
      .from('profiles')
      .select('id, nome, username, foto_url')
      .eq('id', outroId)
      .single()
    return {
      ...conversa,
      outroUsuario: outroUsuario ?? null,
      ultimaMensagem: 'Conversa iniciada'
    }
  }

  async function carregarMensagens(conversaId: string) {
    const { data, error } = await supabase
      .from('mensagens')
      .select('*')
      .eq('conversa_id', conversaId)
      .order('criado_em', { ascending: true })

    if (error) return
    setMensagens(data ?? [])

    if (usuarioAtual?.id) {
      await supabase
        .from('mensagens')
        .update({ lida: true })
        .eq('conversa_id', conversaId)
        .eq('destinatario_id', usuarioAtual.id)
        .eq('lida', false)
    }
  }

  async function enviarMensagem() {
    if (!usuarioAtual || !conversaAberta) return
    const texto = novaMensagem.trim()
    if (!texto) return
    const destinatarioId =
      conversaAberta.usuario_1 === usuarioAtual.id
        ? conversaAberta.usuario_2
        : conversaAberta.usuario_1

    setEnviando(true)
    const { error } = await supabase.from('mensagens').insert({
      conversa_id: conversaAberta.id,
      remetente_id: usuarioAtual.id,
      destinatario_id: destinatarioId,
      texto,
      lida: false
    })

    if (error) {
      alert('Erro ao enviar mensagem: ' + error.message)
      setEnviando(false)
      return
    }

    setNovaMensagem('')
    await carregarMensagens(conversaAberta.id)
    await carregarConversas(usuarioAtual.id)
    setEnviando(false)
  }

  function abrirGaleria(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuAnexosAberto(false)
    inputMidiaRef.current?.click()
  }

  function abrirDocumentos(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuAnexosAberto(false)
    inputDocumentoRef.current?.click()
  }

  function enviarLink(e: React.MouseEvent) {
    e.stopPropagation()
    setMenuAnexosAberto(false)
    const url = prompt('Cole ou digite o link para enviar:')
    if (!url || !url.trim()) return

    let linkFormatado = url.trim()
    if (!linkFormatado.startsWith('http://') && !linkFormatado.startsWith('https://')) {
      linkFormatado = 'https://' + linkFormatado
    }

    setNovaMensagem(linkFormatado)
  }

  function selecionarMidiaParaPreview(evento: React.ChangeEvent<HTMLInputElement>) {
    const file = evento.target.files?.[0]
    if (!file) return

    const isVideo = file.type.startsWith('video/')
    const urlPreview = URL.createObjectURL(file)

    setMidiaPendente({
      file,
      urlPreview,
      tipo: isVideo ? 'video' : 'imagem'
    })
    setLegendaMidia('')
    setProgressoUpload(null)
  }

  async function confirmarEnvioMidia() {
    if (!midiaPendente || !usuarioAtual || !conversaAberta) return

    setProgressoUpload(10)
    const file = midiaPendente.file
    const extensao = file.name.split('.').pop()
    const nomeArquivo = `${Date.now()}-${Math.random().toString(36).substring(2)}.${extensao}`
    const caminho = `${conversaAberta.id}/${nomeArquivo}`

    const interval = setInterval(() => {
      setProgressoUpload((p) => (p && p < 90 ? p + 15 : p))
    }, 200)

    const { error: uploadError } = await supabase.storage.from('chat_midia').upload(caminho, file)
    clearInterval(interval)

    if (uploadError) {
      alert('Erro ao enviar mídia: ' + uploadError.message)
      setProgressoUpload(null)
      return
    }

    setProgressoUpload(100)
    const { data: publicUrlData } = supabase.storage.from('chat_midia').getPublicUrl(caminho)
    const urlMidia = publicUrlData.publicUrl
    const destinatarioId = conversaAberta.usuario_1 === usuarioAtual.id ? conversaAberta.usuario_2 : conversaAberta.usuario_1

    await supabase.from('mensagens').insert({
      conversa_id: conversaAberta.id,
      remetente_id: usuarioAtual.id,
      destinatario_id: destinatarioId,
      texto: legendaMidia.trim() || (midiaPendente.tipo === 'video' ? '📹 Vídeo' : '📸 Foto'),
      arquivo_url: urlMidia,
      lida: false
    })

    setMidiaPendente(null)
    setLegendaMidia('')
    setProgressoUpload(null)
    await carregarMensagens(conversaAberta.id)
  }

  async function enviarDocumento(evento: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    if (!arquivo || !usuarioAtual || !conversaAberta) return

    const nomeOriginal = arquivo.name
    const extensao = nomeOriginal.split('.').pop()
    const nomeArquivo = `doc-${Date.now()}.${extensao}`
    const caminho = `${conversaAberta.id}/${nomeArquivo}`

    const { error: uploadError } = await supabase.storage.from('chat_midia').upload(caminho, arquivo)
    if (uploadError) {
      alert('Erro ao enviar arquivo: ' + uploadError.message)
      return
    }

    const { data: publicUrlData } = supabase.storage.from('chat_midia').getPublicUrl(caminho)
    const urlDoc = publicUrlData.publicUrl
    const destinatarioId = conversaAberta.usuario_1 === usuarioAtual.id ? conversaAberta.usuario_2 : conversaAberta.usuario_1

    await supabase.from('mensagens').insert({
      conversa_id: conversaAberta.id,
      remetente_id: usuarioAtual.id,
      destinatario_id: destinatarioId,
      texto: `📄 Documento: ${nomeOriginal}`,
      arquivo_url: urlDoc,
      lida: false
    })
  }

  async function reagirMensagem(mensagemId: string, emoji: string) {
    if (!usuarioAtual) return
    const msg = mensagens.find((m) => m.id === mensagemId)
    if (!msg) return

    const reacoesAtuais = msg.reacoes || {}
    const reacaoExistente = reacoesAtuais[usuarioAtual.id]

    if (reacaoExistente === emoji) {
      delete reacoesAtuais[usuarioAtual.id]
    } else {
      reacoesAtuais[usuarioAtual.id] = emoji
    }

    await supabase
      .from('mensagens')
      .update({ reacoes: reacoesAtuais })
      .eq('id', mensagemId)

    setMensagemParaReagir(null)
  }

  async function iniciarGravacao() {
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await VoiceRecorder.hasAudioRecordingPermission()
        if (!status.value) {
          const permissao = await VoiceRecorder.requestAudioRecordingPermission()
          if (!permissao.value) {
            alert('O BRAZILZÃO precisa do microfone para gravar mensagens de áudio.')
            return
          }
        }
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []
      cancelarGravacaoRef.current = false

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop())
        if (cancelarGravacaoRef.current) {
          chunksRef.current = []
          return
        }
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' })
        await enviarAudioBlob(audioBlob)
      }

      mediaRecorder.start()
      setGravandoAudio(true)
      setTempoGravacao(0)

      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setTempoGravacao((prev) => prev + 1)
      }, 1000)
    } catch (err) {
      alert('Não foi possível acessar o microfone.')
      console.log(err)
    }
  }

  function finalizarEEnviarGravacao() {
    cancelarGravacaoRef.current = false
    if (mediaRecorderRef.current && gravandoAudio) {
      mediaRecorderRef.current.stop()
      setGravandoAudio(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  function cancelarEApagarGravacao() {
    cancelarGravacaoRef.current = true
    if (mediaRecorderRef.current && gravandoAudio) {
      mediaRecorderRef.current.stop()
      setGravandoAudio(false)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }

  function formatarTempoGravacao(segundos: number) {
    const min = Math.floor(segundos / 60)
    const seg = segundos % 60
    const minFormatado = min < 10 ? `0${min}` : `${min}`
    const segFormatado = seg < 10 ? `0${seg}` : `${seg}`
    return `${minFormatado}:${segFormatado}`
  }

  async function enviarAudioBlob(audioBlob: Blob) {
    if (!usuarioAtual || !conversaAberta) return
    const nomeArquivo = `audio-${Date.now()}-${Math.random().toString(36).substring(2)}.webm`
    const caminho = `${conversaAberta.id}/${nomeArquivo}`

    const { error: uploadError } = await supabase.storage.from('chat_midia').upload(caminho, audioBlob)
    if (uploadError) {
      alert('Erro ao enviar áudio: ' + uploadError.message)
      return
    }

    const { data: publicUrlData } = supabase.storage.from('chat_midia').getPublicUrl(caminho)
    const destinatarioId = conversaAberta.usuario_1 === usuarioAtual.id ? conversaAberta.usuario_2 : conversaAberta.usuario_1

    await supabase.from('mensagens').insert({
      conversa_id: conversaAberta.id,
      remetente_id: usuarioAtual.id,
      destinatario_id: destinatarioId,
      texto: '🎤 Mensagem de voz',
      arquivo_url: publicUrlData.publicUrl,
      lida: false
    })
  }

  async function apagarConversa(conversaId: string) {
    const confirmar = window.confirm('Tem certeza que deseja apagar essa conversa?')
    if (!confirmar) return

    const { error } = await supabase.from('conversas').delete().eq('id', conversaId)
    if (error) return

    setConversas((atuais) => atuais.filter((conversa) => conversa.id !== conversaId))
    if (conversaAberta?.id === conversaId) {
      setConversaAberta(null)
      setTelaConversaAberta(false)
      setMensagens([])
    }
    setMenuConversaAberto(null)
  }

  function formatarHora(data: string) {
    return new Date(data).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (carregando) {
    return (
      <main style={page}>
        <div style={carregandoBox}>Carregando Papo BR...</div>
      </main>
    )
  }

  return (
    <main style={page}>
      <style jsx global>{`
        @keyframes piscarPonto {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.3; transform: scale(0.85); }
        }
        @keyframes animarOnda {
          0%, 100% { height: 6px; }
          50% { height: 18px; }
        }
        .onda-barrina {
          width: 3px;
          background-color: #00a884;
          border-radius: 3px;
          animation: animarOnda 1s infinite ease-in-out;
        }
      `}</style>

      <header style={topo}>
        <button style={botaoVoltar} onClick={() => router.push('/feed')}>
          ←
        </button>
        <div>
          <h1 style={titulo}>Papo BR</h1>
          <p style={subtitulo}>Mensagens do BRAZILZÃO</p>
        </div>
      </header>

      <section style={container}>
        {!telaConversaAberta && (
          <aside style={listaConversas}>
            <strong style={tituloLista}>Conversas</strong>
            {conversas.length === 0 && (
              <p style={semConversas}>Nenhuma conversa ainda.</p>
            )}
            {conversas.map((conversa) => {
              const outro = conversa.outroUsuario
              return (
                <div key={conversa.id} style={conversaItemBox}>
                  <button
                    style={conversaItem}
                    onClick={() => {
                      setConversaAberta(conversa)
                      setTelaConversaAberta(true)
                      setMenuConversaAberto(null)
                    }}
                  >
                    <div style={avatarConversa}>
                      {outro?.foto_url ? (
                        <img src={outro.foto_url} alt={outro.nome ?? 'Perfil'} style={fotoAvatar} />
                      ) : (
                        outro?.nome?.charAt(0)?.toUpperCase() ?? 'B'
                      )}
                    </div>
                    <div style={dadosConversa}>
                      <strong>{outro?.nome ?? 'Usuário'}</strong>
                      <small>{conversa.ultimaMensagem}</small>
                    </div>
                    <span style={setaConversa}>›</span>
                  </button>
                  <button
                    style={botaoMenuConversa}
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuConversaAberto(menuConversaAberto === conversa.id ? null : conversa.id)
                    }}
                  >
                    ⋮
                  </button>
                  {menuConversaAberto === conversa.id && (
                    <div style={menuConversa}>
                      <button style={botaoApagarConversa} onClick={() => apagarConversa(conversa.id)}>
                        Apagar conversa
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </aside>
        )}

        {telaConversaAberta && conversaAberta && (
          <section style={janelaConversa}>
            {/* TOPO DA CONVERSA */}
            <div style={topoConversa}>
              <button
                style={botaoVoltarConversas}
                onClick={() => {
                  setTelaConversaAberta(false)
                  setConversaAberta(null)
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
              </button>
              <div style={avatarTopoConversa}>
                {conversaAberta.outroUsuario?.foto_url ? (
                  <img src={conversaAberta.outroUsuario.foto_url} alt="Perfil" style={fotoAvatar} />
                ) : (
                  conversaAberta.outroUsuario?.nome?.charAt(0)?.toUpperCase() ?? 'B'
                )}
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#e9edef', fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {conversaAberta.outroUsuario?.nome ?? 'Usuário'}
                </strong>

                {outroNaAtiva ? (
                  <p style={{ color: '#00a884', fontSize: 12, margin: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00a884', display: 'inline-block' }} />
                    Na Ativa {outroVistoUltimaVez ? `desde as ${outroVistoUltimaVez}` : ''}
                  </p>
                ) : outroVistoUltimaVez ? (
                  <p style={{ color: '#8696a0', fontSize: 12, margin: 0 }}>
                    Na Ativa às {outroVistoUltimaVez}
                  </p>
                ) : (
                  <p style={{ color: '#8696a0', fontSize: 12, margin: 0 }}>
                    @{conversaAberta.outroUsuario?.username ?? 'usuario'}
                  </p>
                )}
              </div>
            </div>

            {/* SUB-HEADER PINADO */}
            <div style={subHeaderProjeto}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: '#00a884', fontSize: 14 }}>📌</span>
                <span>Projeto: <strong>BRAZILZÃO</strong></span>
              </div>
              <span 
                style={{ color: '#00a884', cursor: 'pointer', fontWeight: 600 }}
                onClick={() => router.push(`/perfil?id=${conversaAberta.outroUsuario?.id}`)}
              >
                Ver Perfil &gt;
              </span>
            </div>

            {/* ÁREA DE MENSAGENS */}
            <div style={areaMensagens} ref={areaMensagensRef}>
              {mensagens.length === 0 && (
                <p style={semMensagens}>
                  Comece a conversa com {conversaAberta.outroUsuario?.nome}.
                </p>
              )}
              {mensagens.map((mensagem) => {
                const minha = mensagem.remetente_id === usuarioAtual?.id
                const ehLink = mensagem.texto.startsWith('http://') || mensagem.texto.startsWith('https://')
                const temReacoes = mensagem.reacoes && Object.keys(mensagem.reacoes).length > 0

                return (
                  <div key={mensagem.id} style={minha ? linhaMinhaMensagem : linhaOutraMensagem}>
                    {!minha && (
                      <div style={avatarMensagemRecebida}>
                        {conversaAberta.outroUsuario?.foto_url ? (
                          <img src={conversaAberta.outroUsuario.foto_url} alt="Perfil" style={fotoAvatar} />
                        ) : (
                          conversaAberta.outroUsuario?.nome?.charAt(0)?.toUpperCase() ?? 'B'
                        )}
                      </div>
                    )}
                    <div 
                      style={{
                        ...(minha ? minhaMensagem : outraMensagem),
                        position: 'relative'
                      }}
                      onClick={() => setMensagemParaReagir(mensagemParaReagir === mensagem.id ? null : mensagem.id)}
                    >
                      {/* MENU POP-UP DE REAÇÕES */}
                      {mensagemParaReagir === mensagem.id && (
                        <div style={barrinhaReacoesPopUp}>
                          {['❤️', '👍', '😂', '😮', '🔥'].map((emoji) => (
                            <button
                              key={emoji}
                              style={btnEmojiReacao}
                              onClick={(e) => {
                                e.stopPropagation()
                                reagirMensagem(mensagem.id, emoji)
                              }}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {mensagem.arquivo_url && (
                        mensagem.arquivo_url.includes('/audio-') || mensagem.arquivo_url.match(/\.(mp3|wav|m4a|webm)$/i) ? (
                          <audio 
                            src={mensagem.arquivo_url} 
                            controls 
                            style={{ width: '100%', maxWidth: 260, marginBottom: 8, height: 44, outline: 'none' }} 
                          />
                        ) : mensagem.arquivo_url.match(/\.(mp4|webm|ogg|mov|mkv)$/i) ? (
                          <video 
                            src={mensagem.arquivo_url} 
                            controls 
                            style={{ width: '100%', maxHeight: 250, borderRadius: 10, marginBottom: 8, border: minha ? '1px solid #004d3e' : '1px solid #202c33', backgroundColor: '#000' }} 
                          />
                        ) : mensagem.arquivo_url.includes('/doc-') ? (
                          <a 
                            href={mensagem.arquivo_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{ color: '#00a884', fontWeight: 'bold', textDecoration: 'underline', display: 'block', marginBottom: 6, wordBreak: 'break-all' }}
                          >
                            📄 Baixar / Abrir Documento
                          </a>
                        ) : (
                          <img 
                            src={mensagem.arquivo_url} 
                            alt="Mídia" 
                            onClick={(e) => {
                              e.stopPropagation()
                              setMidiaExpandida(mensagem.arquivo_url || null)
                            }}
                            style={{ width: '100%', maxHeight: 250, objectFit: 'cover', borderRadius: 10, marginBottom: 8, border: minha ? '1px solid #004d3e' : '1px solid #202c33', cursor: 'pointer' }} 
                          />
                        )
                      )}

                      {ehLink ? (
                        <a 
                          href={mensagem.texto} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ color: '#53bdeb', textDecoration: 'underline', wordBreak: 'break-all' }}
                        >
                          🔗 {mensagem.texto}
                        </a>
                      ) : (
                        <p style={{ margin: 0, paddingBottom: 6 }}>{mensagem.texto}</p>
                      )}

                      {temReacoes && (
                        <div style={boxReacoesFormatado}>
                          {Array.from(new Set(Object.values(mensagem.reacoes!))).map((em, idx) => (
                            <span key={idx}>{em}</span>
                          ))}
                        </div>
                      )}

                      <small style={horaMensagem}>
                        {formatarHora(mensagem.criado_em)}
                        {minha && <span style={{ color: '#53bdeb', marginLeft: 4, letterSpacing: -2 }}>✓✓</span>}
                      </small>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* INPUTS ESCONDIDOS */}
            <input 
              type="file" 
              accept="image/*,video/*" 
              ref={inputMidiaRef} 
              style={{ display: 'none' }} 
              onChange={selecionarMidiaParaPreview} 
            />
            <input 
              type="file" 
              accept="*/*" 
              ref={inputDocumentoRef} 
              style={{ display: 'none' }} 
              onChange={enviarDocumento} 
            />

            {/* CAIXA DE ENVIAR MENSAGEM */}
            <div style={caixaEnviar}>
              {!gravandoAudio && (
                <div style={{ position: 'relative' }}>
                  <button 
                    style={{...botaoIconeExtra, color: menuAnexosAberto ? '#00a884' : '#8696a0'}}
                    onClick={(e) => {
                      e.stopPropagation()
                      setMenuAnexosAberto(!menuAnexosAberto)
                    }}
                  >
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>
                  </button>

                  {menuAnexosAberto && (
                    <div style={menuAnexosPopUp}>
                      <button style={itemMenuAnexo} onClick={abrirGaleria}>
                        <span>🖼️</span> Fotos / Vídeos
                      </button>
                      <button style={itemMenuAnexo} onClick={abrirDocumentos}>
                        <span>📄</span> Documento / Arquivo
                      </button>
                      <button style={itemMenuAnexo} onClick={enviarLink}>
                        <span>🔗</span> Enviar Link
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div style={containerInputNovo}>
                {gravandoAudio ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#111b21', borderRadius: 24 }}>
                    <button 
                      onClick={cancelarEApagarGravacao}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}
                      title="Apagar áudio"
                    >
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', display: 'inline-block', animation: 'piscarPonto 1s infinite' }} />
                      <span style={{ color: '#e9edef', fontWeight: 'bold', fontSize: 15, fontFamily: 'monospace' }}>
                        {formatarTempoGravacao(tempoGravacao)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 20 }}>
                      <div className="onda-barrina" style={{ animationDelay: '0.1s' }} />
                      <div className="onda-barrina" style={{ animationDelay: '0.3s' }} />
                      <div className="onda-barrina" style={{ animationDelay: '0.2s' }} />
                      <div className="onda-barrina" style={{ animationDelay: '0.5s' }} />
                      <div className="onda-barrina" style={{ animationDelay: '0.4s' }} />
                      <div className="onda-barrina" style={{ animationDelay: '0.1s' }} />
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      placeholder="Digite sua mensagem..."
                      value={novaMensagem}
                      onChange={(e) => setNovaMensagem(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') enviarMensagem()
                      }}
                      style={inputMensagem}
                    />
                    <button 
                      style={{ background: 'none', border: 'none', color: '#8696a0', padding: '0 12px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }}
                      onClick={abrirGaleria}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                    </button>
                  </>
                )}
              </div>

              {gravandoAudio ? (
                <button style={botaoEnviarNovo} onClick={finalizarEEnviarGravacao} title="Enviar áudio">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              ) : novaMensagem.trim() === '' ? (
                <button style={botaoIconeExtra} onClick={iniciarGravacao} title="Gravar áudio">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                </button>
              ) : (
                <button style={botaoEnviarNovo} onClick={enviarMensagem} disabled={enviando}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              )}
            </div>
          </section>
        )}
      </section>

      {/* MODAL DE PREVIEW DA MÍDIA SELECIONADA */}
      {midiaPendente && (
        <div style={containerPreviewModal}>
          <div style={headerPreviewModal}>
            <button 
              style={btnApagarPreview} 
              onClick={() => {
                setMidiaPendente(null)
                setProgressoUpload(null)
              }}
            >
              🗑️ Cancelar
            </button>
            <span style={{ color: '#e9edef', fontWeight: 'bold' }}>
              {midiaPendente.tipo === 'video' ? 'Vídeo Selecionado' : 'Foto Selecionada'}
            </span>
          </div>

          <div style={boxConteudoPreview}>
            {midiaPendente.tipo === 'video' ? (
              <video src={midiaPendente.urlPreview} controls style={midiaPreviewMedia} />
            ) : (
              <img src={midiaPendente.urlPreview} alt="Preview" style={midiaPreviewMedia} />
            )}
          </div>

          {progressoUpload !== null && (
            <div style={boxBarraProgresso}>
              <div style={{ ...barraProgressoProgresso, width: `${progressoUpload}%` }} />
            </div>
          )}

          <div style={footerPreviewModal}>
            <input 
              placeholder="Adicione uma legenda..."
              value={legendaMidia}
              onChange={(e) => setLegendaMidia(e.target.value)}
              style={inputLegendaPreview}
            />
            <button 
              style={btnConfirmarEnvioPreview} 
              onClick={confirmarEnvioMidia}
              disabled={progressoUpload !== null}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* MIDIA EXPANDIDA TELA CHEIA */}
      {midiaExpandida && (
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.92)', zIndex: 99999,
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            backdropFilter: 'blur(5px)'
          }}
          onClick={() => setMidiaExpandida(null)}
        >
          <button 
            style={{
              position: 'absolute', top: 24, left: 24,
              background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
              width: 44, height: 44, borderRadius: '50%', fontSize: 24, cursor: 'pointer',
              display: 'flex', justifyContent: 'center', alignItems: 'center', transition: '0.2s'
            }}
            onClick={(e) => { e.stopPropagation(); setMidiaExpandida(null); }}
          >
            ✕
          </button>
          {midiaExpandida.match(/\.(mp4|webm|ogg|mov|mkv)$/i) ? (
            <video 
              src={midiaExpandida} 
              controls 
              autoPlay
              style={{ maxWidth: '98%', maxHeight: '90vh', borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} 
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img 
              src={midiaExpandida} 
              alt="Mídia em Tela Cheia" 
              style={{ maxWidth: '98%', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8, boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }} 
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </main>
  )
}

/* ESTILOS CSS-IN-JS */
const page = { minHeight: '100vh', background: '#f2f2f2', fontFamily: 'Arial, sans-serif' }
const carregandoBox = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008C3A', fontWeight: 900, fontSize: 18 }
const topo = { background: 'linear-gradient(180deg,#008C3A,#006B2D)', color: '#fff', padding: '14px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky' as const, top: 0, zIndex: 10, boxSizing: 'border-box' as const }
const botaoVoltar = { width: 42, height: 42, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.18)', color: '#fff', fontSize: 34, lineHeight: 1, cursor: 'pointer' }
const titulo = { margin: 0, color: '#FFD700', fontSize: 24, fontWeight: 900 }
const subtitulo = { margin: '2px 0 0', color: '#EAF7EC', fontSize: 12, fontWeight: 700 }
const container = { maxWidth: 900, margin: '0 auto', padding: 12, width: '100%', boxSizing: 'border-box' as const }
const listaConversas = { background: '#fff', borderRadius: 18, padding: 12, boxShadow: '0 3px 12px rgba(0,0,0,.09)', minHeight: 'calc(100vh - 115px)', width: '100%', boxSizing: 'border-box' as const }
const tituloLista = { display: 'block', color: '#008C3A', fontSize: 17, fontWeight: 900, marginBottom: 10 }
const semConversas = { color: '#777', fontSize: 13, textAlign: 'center' as const, marginTop: 30 }
const conversaItem = { width: '100%', border: '1px solid #eee', background: '#fff', borderRadius: 14, padding: 10, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' as const, marginBottom: 8 }
const avatarConversa = { width: 44, height: 44, borderRadius: '50%', background: '#FFD700', color: '#008C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, overflow: 'hidden', flexShrink: 0 }
const fotoAvatar = { width: '100%', height: '100%', objectFit: 'cover' as const }
const dadosConversa = { display: 'flex', flexDirection: 'column' as const, gap: 3, overflow: 'hidden' }
const setaConversa = { marginLeft: 'auto', color: '#008C3A', fontSize: 28, fontWeight: 900 }
const conversaItemBox = { position: 'relative' as const, marginBottom: 8 }
const botaoMenuConversa = { position: 'absolute' as const, right: 38, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'transparent', color: '#777', fontSize: 22, fontWeight: 900, cursor: 'pointer', padding: '4px 8px', zIndex: 3 }
const menuConversa = { position: 'absolute' as const, right: 8, top: 50, background: '#fff', borderRadius: 12, boxShadow: '0 6px 18px rgba(0,0,0,.22)', padding: 6, zIndex: 10, minWidth: 160 }
const botaoApagarConversa = { width: '100%', border: 'none', background: '#FFF1F1', color: '#C62828', borderRadius: 9, padding: '10px 12px', fontSize: 13, fontWeight: 900, cursor: 'pointer', textAlign: 'left' as const }

const janelaConversa = { background: '#0b141a', height: '100vh', width: '100%', position: 'fixed' as const, top: 0, left: 0, zIndex: 50, display: 'flex', flexDirection: 'column' as const, overflow: 'hidden' }
const topoConversa = { padding: '10px 16px', background: '#0b141a', display: 'flex', alignItems: 'center', gap: 14, borderBottom: '1px solid #202c33', paddingTop: 'max(10px, env(safe-area-inset-top))' }
const avatarTopoConversa = { width: 44, height: 44, borderRadius: '50%', background: '#111b21', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, overflow: 'hidden', border: '1px solid #00a884', flexShrink: 0 }
const botaoVoltarConversas = { width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#202c33', color: '#e9edef', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
const subHeaderProjeto = { background: '#0b141a', color: '#8696a0', fontSize: 11, padding: '10px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #202c33' }
const areaMensagens = { flex: 1, padding: '16px', overflowY: 'auto' as const, background: '#0b141a' }
const semMensagens = { color: '#8696a0', textAlign: 'center' as const, marginTop: 40, background: '#202c33', padding: '10px 16px', borderRadius: 20, width: 'fit-content', margin: '40px auto', fontSize: 14 }
const linhaMinhaMensagem = { display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }
const linhaOutraMensagem = { display: 'flex', justifyContent: 'flex-start', marginBottom: 16, alignItems: 'flex-end' }
const avatarMensagemRecebida = { width: 32, height: 32, borderRadius: '50%', background: '#FFD700', color: '#000', marginRight: 8, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, border: '1px solid #00a884' }
const minhaMensagem = { maxWidth: '75%', background: '#005c4b', color: '#e9edef', borderRadius: '14px 14px 4px 14px', padding: '8px 12px', fontSize: 15, lineHeight: 1.4, cursor: 'pointer' }
const outraMensagem = { maxWidth: '75%', background: '#202c33', color: '#e9edef', borderRadius: '14px 14px 14px 4px', padding: '8px 12px', fontSize: 15, lineHeight: 1.4, cursor: 'pointer' }
const horaMensagem = { fontSize: 11, color: '#8696a0', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4 }
const caixaEnviar = { padding: '12px', display: 'flex', gap: 10, background: '#0b141a', alignItems: 'center', paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }
const containerInputNovo = { flex: 1, display: 'flex', alignItems: 'center', background: '#202c33', borderRadius: 24, overflow: 'hidden' }
const inputMensagem = { flex: 1, minWidth: 0, border: 'none', background: 'transparent', color: '#e9edef', padding: '12px 16px', outline: 'none', fontSize: 15 }
const botaoIconeExtra = { background: 'transparent', border: 'none', color: '#8696a0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }
const botaoEnviarNovo = { width: 44, height: 44, borderRadius: '50%', background: '#00a884', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }

const menuAnexosPopUp = {
  position: 'absolute' as const,
  bottom: 50,
  left: 0,
  background: '#202c33',
  borderRadius: 16,
  padding: '8px 0',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
  display: 'flex',
  flexDirection: 'column' as const,
  zIndex: 100,
  minWidth: 200,
  border: '1px solid #111b21'
}

const itemMenuAnexo = {
  background: 'transparent',
  border: 'none',
  color: '#e9edef',
  padding: '12px 16px',
  textAlign: 'left' as const,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: 10
}

const containerPreviewModal = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  width: '100vw',
  height: '100vh',
  background: '#0b141a',
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column' as const
}

const headerPreviewModal = {
  padding: '16px',
  display: 'flex',
  justify: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid #202c33'
}

const btnApagarPreview = {
  background: '#ef4444',
  color: '#fff',
  border: 'none',
  padding: '8px 14px',
  borderRadius: 20,
  fontWeight: 'bold',
  cursor: 'pointer',
  fontSize: 13
}

const boxConteudoPreview = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justify: 'center',
  padding: '16px',
  overflow: 'hidden'
}

const midiaPreviewMedia = {
  maxWidth: '100%',
  maxHeight: '100%',
  borderRadius: 12,
  objectFit: 'contain' as const
}

const boxBarraProgresso = {
  height: 4,
  width: '100%',
  background: '#202c33'
}

const barraProgressoProgresso = {
  height: '100%',
  background: '#00a884',
  transition: 'width 0.2s'
}

const footerPreviewModal = {
  padding: '16px',
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  background: '#111b21'
}

const inputLegendaPreview = {
  flex: 1,
  background: '#202c33',
  border: 'none',
  color: '#e9edef',
  padding: '12px 16px',
  borderRadius: 24,
  outline: 'none',
  fontSize: 15
}

const btnConfirmarEnvioPreview = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  background: '#00a884',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justify: 'center',
  cursor: 'pointer'
}

const barrinhaReacoesPopUp = {
  position: 'absolute' as const,
  top: -42,
  left: 0,
  background: '#202c33',
  borderRadius: 20,
  padding: '4px 8px',
  display: 'flex',
  gap: 6,
  boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
  zIndex: 10
}

const btnEmojiReacao = {
  background: 'none',
  border: 'none',
  fontSize: 20,
  cursor: 'pointer',
  padding: '2px 4px'
}

const boxReacoesFormatado = {
  display: 'inline-flex',
  gap: 2,
  background: '#111b21',
  borderRadius: 10,
  padding: '2px 6px',
  fontSize: 12,
  marginTop: 4,
  border: '1px solid #202c33'
}