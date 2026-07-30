'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../utils/supabase/client'
import { VoiceRecorder } from 'capacitor-voice-recorder'
import { Capacitor } from '@capacitor/core'
import { RealtimeChannel } from '@supabase/supabase-js'

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
  tituloAnuncio?: string | null
  ehVendas?: boolean
  naoLida?: boolean
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

// SERVIDORES STUN (GOOGLE) + TURN (METERED.CA)
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    {
      urls: 'turn:global.relay.metered.ca:80',
      username: 'ff721accd1047958fdc21ebd',
      credential: 'D0R3KForJtEYr0XC'
    },
    {
      urls: 'turn:global.relay.metered.ca:443',
      username: 'ff721accd1047958fdc21ebd',
      credential: 'D0R3KForJtEYr0XC'
    },
    {
      urls: 'turn:global.relay.metered.ca:443?transport=tcp',
      username: 'ff721accd1047958fdc21ebd',
      credential: 'D0R3KForJtEYr0XC'
    }
  ]
}

const AUDIO_CONSTRAINTS = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true
}

// 1. Gera faixa de vídeo preta sintética caso o computador não tenha webcam
function criarTrackVideoPreta(width = 640, height = 480): MediaStreamTrack {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)
  }
  const stream = canvas.captureStream(1)
  return stream.getVideoTracks()[0]
}

async function obterStreamComFallback(tipo: 'audio' | 'video', modoCamera: string): Promise<MediaStream> {
  const stream = new MediaStream()

  // Captura do Microfone
  try {
    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: AUDIO_CONSTRAINTS })
    audioStream.getAudioTracks().forEach((track) => stream.addTrack(track))
  } catch (e) {
    console.warn('⚠️ Nenhum microfone encontrado. Ligação continuará sem áudio local.')
  }

  // Captura da Câmera (Com suporte flexível para PC)
  if (tipo === 'video') {
    try {
      // Tenta abrir a câmera de forma resiliente
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: true
      })
      videoStream.getVideoTracks().forEach((track) => stream.addTrack(track))
    } catch (e) {
      console.warn('⚠️ Nenhuma câmera encontrada. Ativando tela preta sintética sem travar a chamada.')
      const trackPreta = criarTrackVideoPreta()
      stream.addTrack(trackPreta)
    }
  }

  return stream
}

export default function Mensagens() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)
  const [usuarioAtual, setUsuarioAtual] = useState<Usuario | null>(null)

  // ABAS & CONVERSAS
  const [abaAtiva, setAbaAtiva] = useState<'batepapo' | 'vendas'>('batepapo')
  const [conversasBatePapo, setConversasBatePapo] = useState<Conversa[]>([])
  const [conversaAberta, setConversaAberta] = useState<Conversa | null>(null)
  const [mensagens, setMensagens] = useState<Mensagem[]>([])
  const [telaConversaAberta, setTelaConversaAberta] = useState(false)
  const areaMensagensRef = useRef<HTMLDivElement | null>(null)
  const [novaMensagem, setNovaMensagem] = useState('')
  const [menuAnexosAberto, setMenuAnexosAberto] = useState(false)
  const [mensagemOpcoesId, setMensagemOpcoesId] = useState<string | null>(null)
  const [mensagemEditando, setMensagemEditando] = useState<Mensagem | null>(null) 
  const [mensagemReacaoId, setMensagemReacaoId] = useState<string | null>(null)
  const ultimoToqueRef = useRef<{ id: string, time: number }>({ id: '', time: 0 })
const [contatoOnline, setContatoOnline] = useState(false)

  // MODAL ADICIONAR POR ID
  const [modalAdicionarIDAberto, setModalAdicionarIDAberto] = useState(false)
  const [idParaAdicionar, setIdParaAdicionar] = useState('')
  const [sugestoesPerfis, setSugestoesPerfis] = useState<Usuario[]>([])
  const [buscandoID, setBuscandoID] = useState(false)

  // WEBRTC & SINALIZA
  const localStreamRef = useRef<MediaStream | null>(null)
  const remoteStreamRef = useRef<MediaStream | null>(null)
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const canalSalaRef = useRef<RealtimeChannel | null>(null)
  const videoLocalRef = useRef<HTMLVideoElement | null>(null)
  const videoRemotoRef = useRef<HTMLVideoElement | null>(null)
  const audioRemotoRef = useRef<HTMLAudioElement | null>(null)
  const [modoCamera, setModoCamera] = useState<'user' | 'environment'>('user')
  const [inverterTelas, setInverterTelas] = useState(false)

  // AUDIO CONTEXT
  const audioCtxRef = useRef<AudioContext | null>(null)
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // ESTADO DA CHAMADA
  const [emChamada, setEmChamada] = useState<{
    tipo: 'audio' | 'video'
    status: 'chamando' | 'conectado'
    microfoneMutado: boolean
    videoAtivo: boolean
  } | null>(null)

  const [chamadaRecebida, setChamadaRecebida] = useState<{
    remetente: Usuario
    tipo: 'audio' | 'video'
    conversaId: string
  } | null>(null)

  const [tempoChamada, setTempoChamada] = useState(0)
  const timerChamadaRef = useRef<NodeJS.Timeout | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    iniciarMensagens()
    return () => {
      encerrarChamadaLocal()
    }
  }, [])

  async function registrarPushNotifications(meuId: string) {
    if (!Capacitor.isNativePlatform()) return
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      let permStatus = await PushNotifications.checkPermissions()
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions()
      }
      if (permStatus.receive === 'granted') {
        // CRIA O CANAL DE CHAMADAS DE ALTA PRIORIDADE NO ANDROID
        await PushNotifications.createChannel({
          id: 'chamadas_channel',
          name: 'Chamadas de Voz e Vídeo',
          description: 'Notificações de chamadas do Papo BR',
          importance: 5, // 5 = MÁXIMA PRIORIDADE (Acorda a tela)
          sound: 'ringtone', // Som de toque de chamada telefônica do Android
          vibration: true,
          visibility: 1
        })

        await PushNotifications.register()
      }
      PushNotifications.addListener('registration', async (token) => {
        if (token.value && meuId) {
          await supabase
            .from('profiles')
            .update({ fcm_token: token.value })
            .eq('id', meuId)
        }
      })
    } catch (e) {}
  }

  // BUSCA SUGESTÕES AO VIVO
  useEffect(() => {
    const termo = idParaAdicionar.trim().replace('@', '')
    if (termo.length < 2) {
      setSugestoesPerfis([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const ehUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(termo)
        let query = supabase.from('profiles').select('id, nome, username, foto_url')
        if (ehUUID) {
          query = query.or(`username.ilike.%${termo}%,id.eq.${termo}`)
        } else {
          query = query.or(`username.ilike.%${termo}%,nome.ilike.%${termo}%`)
        }
        const { data } = await query.limit(5)
        if (data) {
          setSugestoesPerfis(data.filter((u) => u.id !== usuarioAtual?.id))
        }
      } catch (e) {}
    }, 250)
    return () => clearTimeout(timer)
  }, [idParaAdicionar, usuarioAtual?.id])

  // ESCUTA GLOBAL DE CHAMADAS
  useEffect(() => {
    if (!usuarioAtual?.id) return
    const canalPessoal = supabase
      .channel(`chamadas-pessoal-${usuarioAtual.id}`)
      .on('broadcast', { event: 'solicitar_chamada' }, (payload) => {
        const { remetente, tipo, conversaId } = payload.payload
        setChamadaRecebida({ remetente, tipo, conversaId })
        tocarSomRecebendo()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(canalPessoal)
    }
  }, [usuarioAtual?.id])

// RASTREADOR DE PRESENÇA (ONLINE/OFFLINE)
  useEffect(() => {
    if (!conversaAberta || !usuarioAtual) return

    const canalPresenca = supabase.channel(`presenca-${conversaAberta.id}`)

    canalPresenca
      .on('presence', { event: 'sync' }, () => {
        const estado = canalPresenca.presenceState()
        // Pega os IDs de todos que estão online nessa conversa agora
        const idsOnline = Object.values(estado).flatMap((p: any) => p.map((u: any) => u.user_id))
        
        // Se o ID do seu amigo estiver na lista, ele está online!
        setContatoOnline(idsOnline.includes(conversaAberta.outroUsuario?.id))
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Avisa o servidor que VOCÊ entrou na conversa
          await canalPresenca.track({ user_id: usuarioAtual.id })
        }
      })

    return () => {
      supabase.removeChannel(canalPresenca) // Sai do canal ao fechar a conversa
      setContatoOnline(false)
    }
  }, [conversaAberta, usuarioAtual])

  async function conectarSalaSinalizacao(salaId: string) {
    if (canalSalaRef.current) {
      await supabase.removeChannel(canalSalaRef.current)
      canalSalaRef.current = null
    }
    const canal = supabase.channel(`sala-chamada-${salaId}`)
    canal
      .on('broadcast', { event: 'resposta_chamada' }, async (payload) => {
        const { aceito } = payload.payload
        pararSom()
        if (aceito) {
          setEmChamada((prev) => (prev ? { ...prev, status: 'conectado' } : null))
          iniciarWebRTCOffer()
        } else {
          alert('O contato recusou a chamada.')
          await encerrarChamadaLocal()
        }
      })
      .on('broadcast', { event: 'webrtc_offer' }, async (payload) => {
        const { offer } = payload.payload
        setEmChamada((prev) => (prev ? { ...prev, status: 'conectado' } : null))
        handleWebRTCOffer(offer)
      })
      .on('broadcast', { event: 'webrtc_answer' }, async (payload) => {
        const { answer } = payload.payload
        setEmChamada((prev) => (prev ? { ...prev, status: 'conectado' } : null))
        handleWebRTCAnswer(answer)
      })
      .on('broadcast', { event: 'webrtc_candidate' }, async (payload) => {
        const { candidate } = payload.payload
        handleWebRTCCandidate(candidate)
      })
      .on('broadcast', { event: 'encerrar_chamada' }, async () => {
        await encerrarChamadaLocal()
      })
      .subscribe()

    canalSalaRef.current = canal
  }

  function enviarSinalNaSala(event: string, payload: any) {
    if (canalSalaRef.current) {
      canalSalaRef.current.send({ type: 'broadcast', event, payload })
    }
  }

  function criarPeerConnection() {
    if (peerConnectionRef.current) return peerConnectionRef.current
    const pc = new RTCPeerConnection(ICE_SERVERS)
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current!)
      })
    }
    pc.ontrack = (e) => {
      if (!remoteStreamRef.current) {
        remoteStreamRef.current = new MediaStream()
      }
      e.streams[0].getTracks().forEach((track) => {
        remoteStreamRef.current?.addTrack(track)
      })
      conectarStreamRemotoNoVideo()
    }
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        enviarSinalNaSala('webrtc_candidate', { candidate: e.candidate })
      }
    }
    peerConnectionRef.current = pc
    return pc
  }

  function conectarStreamRemotoNoVideo() {
    if (videoRemotoRef.current && remoteStreamRef.current) {
      videoRemotoRef.current.srcObject = remoteStreamRef.current
      videoRemotoRef.current.play().catch(() => {})
    }
    if (audioRemotoRef.current && remoteStreamRef.current) {
      audioRemotoRef.current.srcObject = remoteStreamRef.current
      audioRemotoRef.current.play().catch(() => {})
    }
  }

  async function iniciarWebRTCOffer() {
    const pc = criarPeerConnection()
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    enviarSinalNaSala('webrtc_offer', { offer })
  }

  async function handleWebRTCOffer(offer: RTCSessionDescriptionInit) {
    const pc = criarPeerConnection()
    await pc.setRemoteDescription(new RTCSessionDescription(offer))
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    enviarSinalNaSala('webrtc_answer', { answer })
  }

  async function handleWebRTCAnswer(answer: RTCSessionDescriptionInit) {
    if (peerConnectionRef.current) {
      await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(answer))
    }
  }

  async function handleWebRTCCandidate(candidate: RTCIceCandidateInit) {
    if (peerConnectionRef.current) {
      try {
        await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (e) {}
    }
  }

  const iniciarAudioContext = () => {
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

  function tocarSomChamando() {
    try {
      pararSom()
      iniciarAudioContext()
      const ctx = audioCtxRef.current
      if (!ctx) return
      const tocarTu = () => {
        if (!ctx || ctx.state === 'closed') return
        try {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'sine'
          osc.frequency.setValueAtTime(440, ctx.currentTime)
          gain.gain.setValueAtTime(0.15, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start()
          osc.stop(ctx.currentTime + 1.2)
        } catch (e) {}
      }
      tocarTu()
      ringtoneIntervalRef.current = setInterval(tocarTu, 3000)
    } catch (e) {}
  }

  function tocarSomRecebendo() {
    try {
      pararSom()
      iniciarAudioContext()
      const ctx = audioCtxRef.current
      if (!ctx) return
      const tocarTrim = () => {
        if (!ctx || ctx.state === 'closed') return
        try {
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.type = 'triangle'
          osc.frequency.setValueAtTime(800, ctx.currentTime)
          gain.gain.setValueAtTime(0.2, ctx.currentTime)
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8)
          osc.connect(gain)
          gain.connect(ctx.destination)
          osc.start()
          osc.stop(ctx.currentTime + 0.8)
        } catch (e) {}
      }
      tocarTrim()
      ringtoneIntervalRef.current = setInterval(tocarTrim, 1500)
    } catch (e) {}
  }

  function pararSom() {
    if (ringtoneIntervalRef.current) {
      clearInterval(ringtoneIntervalRef.current)
      ringtoneIntervalRef.current = null
    }
  }

  useEffect(() => {
    if (emChamada?.status === 'chamando') {
      tocarSomChamando()
    } else {
      pararSom()
    }
    if (emChamada?.status === 'conectado') {
      timerChamadaRef.current = setInterval(() => {
        setTempoChamada((prev) => prev + 1)
      }, 1000)
    } else {
      if (timerChamadaRef.current) clearInterval(timerChamadaRef.current)
      setTempoChamada(0)
    }
    return () => {
      if (timerChamadaRef.current) clearInterval(timerChamadaRef.current)
    }
  }, [emChamada?.status])

  useEffect(() => {
    if (videoLocalRef.current && localStreamRef.current) {
      videoLocalRef.current.srcObject = localStreamRef.current
      videoLocalRef.current.play().catch(() => {})
    }
  }, [emChamada?.tipo, emChamada?.status, inverterTelas])

  useEffect(() => {
    if (emChamada?.status === 'conectado') {
      conectarStreamRemotoNoVideo()
    }
  }, [emChamada?.status])

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
      alert('Perfil não encontrado.')
      router.replace('/feed')
      return
    }

    setUsuarioAtual(usuario)
    await registrarPushNotifications(usuario.id)

    const parametros = new URLSearchParams(window.location.search)
    const usuarioDestinoId = parametros.get('para') || parametros.get('id')
    if (usuarioDestinoId && usuarioDestinoId !== usuario.id) {
      await abrirOuCriarConversa(usuario.id, usuarioDestinoId)
      setTelaConversaAberta(true)
    }

    await carregarConversas(usuario.id)
    setCarregando(false)
  }

  // BUSCA APENAS CONTATOS ONDE AMBOS ADICIONARAM O ID MÚTUO
  async function carregarConversas(meuId: string) {
    const { data: meusAdicionados } = await supabase
      .from('contatos_autorizados')
      .select('contato_id')
      .eq('usuario_id', meuId)

    const { data: meAdicionaram } = await supabase
      .from('contatos_autorizados')
      .select('usuario_id')
      .eq('contato_id', meuId)

    const meusIdsSet = new Set((meusAdicionados || []).map((item) => item.contato_id))
    const meAdicionaramSet = new Set((meAdicionaram || []).map((item) => item.usuario_id))

    const idsMutuos = [...meusIdsSet].filter((id) => meAdicionaramSet.has(id))

    if (idsMutuos.length === 0) {
      setConversasBatePapo([])
      return
    }

    const { data: perfis } = await supabase
      .from('profiles')
      .select('id, nome, username, foto_url')
      .in('id', idsMutuos)

    const usuariosMapa: Record<string, Usuario> = (perfis ?? []).reduce(
      (mapa: Record<string, Usuario>, u) => {
        mapa[u.id] = u
        return mapa
      },
      {}
    )

    const conversasMontadas = await Promise.all(
      idsMutuos.map(async (outroId) => {
        let { data: conv } = await supabase
          .from('conversas')
          .select('*')
          .or(`and(usuario_1.eq.${meuId},usuario_2.eq.${outroId}),and(usuario_1.eq.${outroId},usuario_2.eq.${meuId})`)
          .maybeSingle()

        if (!conv) {
          const { data: novaConv } = await supabase
            .from('conversas')
            .insert({ usuario_1: meuId, usuario_2: outroId })
            .select()
            .single()
          conv = novaConv
        }

        const { data: ultima } = conv
          ? await supabase
              .from('mensagens')
              .select('texto, lida, destinatario_id')
              .eq('conversa_id', conv.id)
              .order('criado_em', { ascending: false })
              .limit(1)
              .maybeSingle()
          : { data: null }

        return {
          id: conv?.id || `conv-${outroId}`,
          usuario_1: meuId,
          usuario_2: outroId,
          criado_em: conv?.criado_em || new Date().toISOString(),
          atualizado_em: conv?.atualizado_em || new Date().toISOString(),
          outroUsuario: usuariosMapa[outroId] ?? null,
          ultimaMensagem: ultima?.texto ?? 'ID Mútuo Liberado!',
          naoLida: !ultima?.lida && ultima?.destinatario_id === meuId,
          ehVendas: false
        }
      })
    )

    setConversasBatePapo(conversasMontadas)
  }

  // REGISTRA O ID E VALIDA SE AMBOS SE ADICIONARAM
  async function adicionarContatoPorID(perfilDireto?: Usuario) {
    let perfilParaAdicionar = perfilDireto
    if (!perfilParaAdicionar) {
      const termo = idParaAdicionar.trim().replace('@', '')
      if (!termo) return alert('Digite o ID ou @username do seu amigo.')
      setBuscandoID(true)
      try {
        const ehUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(termo)
        let consulta = supabase.from('profiles').select('id, nome, username, foto_url')
        if (ehUUID) {
          consulta = consulta.or(`username.ilike.${termo},id.eq.${termo}`)
        } else {
          consulta = consulta.ilike('username', termo)
        }
        const { data: perfilEncontrado, error } = await consulta.maybeSingle()
        if (error || !perfilEncontrado) {
          alert('Nenhum usuário encontrado com esse @username ou ID.')
          setBuscandoID(false)
          return
        }
        perfilParaAdicionar = perfilEncontrado
      } catch (e: any) {
        alert(`Erro ao buscar ID: ${e?.message || e}`)
        setBuscandoID(false)
        return
      }
    }

    if (perfilParaAdicionar.id === usuarioAtual?.id) {
      alert('Você não pode adicionar seu próprio ID.')
      setBuscandoID(false)
      return
    }

    try {
      const { error: errUpsert } = await supabase.from('contatos_autorizados').upsert(
        { usuario_id: usuarioAtual!.id, contato_id: perfilParaAdicionar.id },
        { onConflict: 'usuario_id,contato_id' }
      )

      if (errUpsert) {
        alert(`❌ Erro no Supabase: ${errUpsert.message}`)
        setBuscandoID(false)
        return
      }

      const { data: eleMeAdicionou } = await supabase
        .from('contatos_autorizados')
        .select('id')
        .eq('usuario_id', perfilParaAdicionar.id)
        .eq('contato_id', usuarioAtual!.id)
        .maybeSingle()

      if (eleMeAdicionou) {
        alert(`🎉 ID MÚTUO CONFIRMADO!\n\nVocê e @${perfilParaAdicionar.username || perfilParaAdicionar.nome} agora estão liberados para chamadas.`)
      } else {
        alert(`📌 ID registrado!\n\nPara o contato aparecer na lista, peça para @${perfilParaAdicionar.username || perfilParaAdicionar.nome} adicionar seu ID (@${usuarioAtual?.username || usuarioAtual?.nome}) no app dele.`)
      }

      await carregarConversas(usuarioAtual!.id)
      setModalAdicionarIDAberto(false)
      setIdParaAdicionar('')
      setSugestoesPerfis([])
    } catch (e: any) {
      alert(`Erro inesperado: ${e?.message || e}`)
    } finally {
      setBuscandoID(false)
    }
  }

  async function abrirOuCriarConversa(meuId: string, outroUsuarioId: string) {
    const { data: conv1 } = await supabase.from('conversas').select('*').eq('usuario_1', meuId).eq('usuario_2', outroUsuarioId).maybeSingle()
    let conversaExistente = conv1
    if (!conversaExistente) {
      const { data: conv2 } = await supabase.from('conversas').select('*').eq('usuario_1', outroUsuarioId).eq('usuario_2', meuId).maybeSingle()
      conversaExistente = conv2
    }
    if (conversaExistente) {
      const montada = await montarConversaComUsuario(conversaExistente, meuId)
      setConversaAberta(montada)
      return montada
    }
    const { data: nova, error } = await supabase.from('conversas').insert({ usuario_1: meuId, usuario_2: outroUsuarioId }).select().single()
    if (error || !nova) return null
    const montada = await montarConversaComUsuario(nova, meuId)
    setConversaAberta(montada)
    return montada
  }

  async function montarConversaComUsuario(conversa: Conversa, meuId: string) {
    const outroId = conversa.usuario_1 === meuId ? conversa.usuario_2 : conversa.usuario_1
    const { data: outro } = await supabase.from('profiles').select('id, nome, username, foto_url').eq('id', outroId).single()
    return { ...conversa, outroUsuario: outro ?? null, ultimaMensagem: 'Conversa iniciada' }
  }

  async function carregarMensagens(conversaId: string) {
    const { data, error } = await supabase.from('mensagens').select('*').eq('conversa_id', conversaId).order('criado_em', { ascending: true })
    if (error) return
    setMensagens(data ?? [])
    if (usuarioAtual?.id) {
      await supabase.from('mensagens').update({ lida: true }).eq('conversa_id', conversaId).eq('destinatario_id', usuarioAtual.id).eq('lida', false)
    }
  }

async function reagirMensagem(mensagemId: string, emoji: string) {
    setMensagemReacaoId(null) // Fecha o menu flutuante

    const msg = mensagens.find(m => m.id === mensagemId)
    if (!msg || !usuarioAtual) return

    const novasReacoes = { ...(msg.reacoes || {}) }

    // Se clicar no mesmo emoji, ele remove (efeito toggle)
    if (novasReacoes[usuarioAtual.id] === emoji) {
      delete novasReacoes[usuarioAtual.id]
    } else {
      novasReacoes[usuarioAtual.id] = emoji
    }

    // Atualiza a tela instantaneamente antes mesmo do banco responder
    setMensagens(prev => prev.map(m => m.id === mensagemId ? { ...m, reacoes: novasReacoes } : m))

    // Salva no Supabase
    await supabase.from('mensagens').update({ reacoes: novasReacoes }).eq('id', mensagemId)
  }

  async function apagarMensagem(id: string) {
    setMensagemOpcoesId(null) // Fecha o menu 3D
    const confirmacao = window.confirm('Tem certeza que deseja apagar esta mensagem?')
    if (!confirmacao) return

    // Deleta do Banco de Dados Supabase
    const { error } = await supabase.from('mensagens').delete().eq('id', id)
    
    if (!error) {
      // Remove da tela instantaneamente
      setMensagens((prev) => prev.filter((msg) => msg.id !== id))
    } else {
      alert('Erro ao apagar a mensagem.')
    }
  }

  function iniciarEdicao(mensagem: Mensagem) {
    setMensagemOpcoesId(null) // Fecha o menu 3D
    setMensagemEditando(mensagem) // Ativa o modo edição
    setNovaMensagem(mensagem.texto) // Joga o texto na caixa de envio
  }

  async function enviarMensagem() {
    if (!usuarioAtual || !conversaAberta) return
    const texto = novaMensagem.trim()
    if (!texto) return

    setEnviando(true)

    if (mensagemEditando) {
      // --- MODO EDIÇÃO ---
      const { error } = await supabase
        .from('mensagens')
        .update({ texto: texto })
        .eq('id', mensagemEditando.id)

      if (!error) {
        setNovaMensagem('')
        setMensagemEditando(null)
        await carregarMensagens(conversaAberta.id) // Recarrega a conversa
      } else {
        alert('Erro ao editar a mensagem.')
      }
    } else {
      // --- MODO NOVO ENVIO ---
      const destinatarioId = conversaAberta.usuario_1 === usuarioAtual.id ? conversaAberta.usuario_2 : conversaAberta.usuario_1
      
      const { error } = await supabase.from('mensagens').insert({
        conversa_id: conversaAberta.id,
        remetente_id: usuarioAtual.id,
        destinatario_id: destinatarioId,
        texto,
        lida: false
      })

      if (!error) {
        setNovaMensagem('')
        await carregarMensagens(conversaAberta.id)
      }
    }
    setEnviando(false)
  }

  async function iniciarChamada(tipo: 'audio' | 'video') {
    if (!conversaAberta || !conversaAberta.outroUsuario?.id || !usuarioAtual) return
    const destinatario = conversaAberta.outroUsuario
    await encerrarChamadaLocal()

    try {
      iniciarAudioContext()

      if (Capacitor.isNativePlatform()) {
        try { await VoiceRecorder.requestAudioRecordingPermission() } catch (pErr) {}
        if (tipo === 'video') {
          try {
            const { Camera } = await import('@capacitor/camera')
            await Camera.requestPermissions({ permissions: ['camera'] })
          } catch (cErr) {}
        }
      }

      const stream = await obterStreamComFallback(tipo, modoCamera)
      localStreamRef.current = stream

      setEmChamada({
        tipo,
        status: 'chamando',
        microfoneMutado: false,
        videoAtivo: tipo === 'video'
      })

      await conectarSalaSinalizacao(conversaAberta.id)

      // 1. Sinaliza em tempo real
      const canalNotif = supabase.channel(`chamadas-pessoal-${destinatario.id}`)
      canalNotif.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          canalNotif.send({
            type: 'broadcast',
            event: 'solicitar_chamada',
            payload: { remetente: usuarioAtual, tipo, conversaId: conversaAberta.id }
          })
        }
      })

      // 2. Gravando notificação interna
      await supabase.from('notifications').insert({
        usuario_id: destinatario.id,
        remetente_id: usuarioAtual.id,
        tipo: 'chamada_recebida',
        mensagem: `📞 @${usuarioAtual.username || usuarioAtual.nome} está te ligando no Papo BR...`,
        link: `/mensagens?para=${usuarioAtual.id}`,
        lida: false
      })

      // 3. Disparo de Push para o Firebase (URL Inteligente)
      const { data: perfilDestino } = await supabase
        .from('profiles')
        .select('fcm_token')
        .eq('id', destinatario.id)
        .maybeSingle()

      if (perfilDestino?.fcm_token) {
        // Se for aplicativo no celular (APK) usa o domínio Vercel. No navegador usa caminho relativo.
        const URL_SERVIDOR = Capacitor.isNativePlatform()
          ? 'https://papo-br-brazilzao.vercel.app'
          : ''

        fetch(`${URL_SERVIDOR}/api/notificacao-chamada`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: perfilDestino.fcm_token,
            remetenteNome: usuarioAtual.username || usuarioAtual.nome,
            tipo: tipo,
            conversaId: conversaAberta.id
          })
        }).catch((err) => console.error('Erro ao disparar push no Firebase:', err))
      }
    } catch (err: any) {
      alert('Não foi possível iniciar a chamada.')
    }
  }

  async function aceitarChamada() {
    if (!chamadaRecebida || !usuarioAtual) return
    pararSom()

    try {
      iniciarAudioContext()

      if (Capacitor.isNativePlatform()) {
        try { await VoiceRecorder.requestAudioRecordingPermission() } catch (pErr) {}
        if (chamadaRecebida.tipo === 'video') {
          try {
            const { Camera } = await import('@capacitor/camera')
            await Camera.requestPermissions({ permissions: ['camera'] })
          } catch (cErr) {}
        }
      }

      const stream = await obterStreamComFallback(chamadaRecebida.tipo, modoCamera)
      localStreamRef.current = stream

      setEmChamada({
        tipo: chamadaRecebida.tipo,
        status: 'conectado',
        microfoneMutado: false,
        videoAtivo: chamadaRecebida.tipo === 'video'
      })

      await conectarSalaSinalizacao(chamadaRecebida.conversaId)
      setTimeout(() => {
        enviarSinalNaSala('resposta_chamada', { aceito: true })
      }, 300)

      setChamadaRecebida(null)
    } catch (err) {
      alert('Erro ao aceitar chamada.')
      recusarChamada()
    }
  }

  function recusarChamada() {
    pararSom()
    if (chamadaRecebida) {
      conectarSalaSinalizacao(chamadaRecebida.conversaId)
      setTimeout(() => {
        enviarSinalNaSala('resposta_chamada', { aceito: false })
      }, 200)
    }
    setChamadaRecebida(null)
  }

  async function inverterCamera() {
    if (!localStreamRef.current || emChamada?.tipo !== 'video') return
    const novoModo = modoCamera === 'user' ? 'environment' : 'user'
    setModoCamera(novoModo)
    try {
      localStreamRef.current.getVideoTracks().forEach((track) => track.stop())
      const streamNovo = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: novoModo }
      })
      const videoTrackNovo = streamNovo.getVideoTracks()[0]
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      const streamCombinado = new MediaStream([videoTrackNovo, audioTrack])
      localStreamRef.current = streamCombinado
      if (videoLocalRef.current) {
        videoLocalRef.current.srcObject = streamCombinado
      }
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current.getSenders().find((s) => s.track?.kind === 'video')
        if (sender) sender.replaceTrack(videoTrackNovo)
      }
    } catch (err) {}
  }

  function alternarMicrofone() {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        setEmChamada((prev) => (prev ? { ...prev, microfoneMutado: !audioTrack.enabled } : null))
      }
    }
  }

  async function encerrarChamadaLocal() {
    pararSom()
    if (timerChamadaRef.current) {
      clearInterval(timerChamadaRef.current)
      timerChamadaRef.current = null
    }
    setTempoChamada(0)
    if (peerConnectionRef.current) {
      peerConnectionRef.current.ontrack = null
      peerConnectionRef.current.onicecandidate = null
      peerConnectionRef.current.close()
      peerConnectionRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => track.stop())
      remoteStreamRef.current = null
    }
    if (videoLocalRef.current) videoLocalRef.current.srcObject = null
    if (videoRemotoRef.current) videoRemotoRef.current.srcObject = null
    if (audioRemotoRef.current) audioRemotoRef.current.srcObject = null
    if (canalSalaRef.current) {
      const tempCanal = canalSalaRef.current
      canalSalaRef.current = null
      await supabase.removeChannel(tempCanal)
    }
    setEmChamada(null)
    setChamadaRecebida(null)
  }

  async function encerrarChamada() {
    enviarSinalNaSala('encerrar_chamada', {})
    await encerrarChamadaLocal()
  }

  function formatarTempo(segundos: number) {
    const m = Math.floor(segundos / 60)
    const s = segundos % 60
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
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
      <audio ref={audioRemotoRef} autoPlay playsInline style={{ display: 'none' }} />
      <style>{`
        @keyframes balancarChama {
          0% { transform: rotate(0deg) scale(1); }
          15% { transform: rotate(14deg) scale(1.08); }
          30% { transform: rotate(-14deg) scale(1.08); }
          45% { transform: rotate(10deg) scale(1.05); }
          60% { transform: rotate(-10deg) scale(1.05); }
          75% { transform: rotate(5deg) scale(1.02); }
          100% { transform: rotate(0deg) scale(1); }
        }
        .iconeBalancando {
          animation: balancarChama 0.75s infinite ease-in-out;
        }

        /* NOVOS ESTILOS: MENU FUTURISTA */
        .menu-anexos-container {
          position: relative;
          display: flex;
          align-items: center;
        }
        .btn-mais-flutuante {
          background: #202c33;
          border: none;
          border-radius: 50%;
          width: 42px;
          height: 42px;
          color: #8696a0;
          font-size: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          z-index: 10;
          flex-shrink: 0;
          margin-right: 8px;
        }
        .btn-mais-flutuante.aberto {
          transform: rotate(45deg);
          background: #ff4d4d;
          color: #fff;
          box-shadow: 0 4px 15px rgba(255, 77, 77, 0.4);
        }
        .menu-opcoes-glass {
          position: absolute;
          bottom: 55px;
          left: 0;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 14px;
          background: rgba(32, 44, 51, 0.65);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          opacity: 0;
          transform: translateY(20px) scale(0.8);
          pointer-events: none;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform-origin: bottom left;
        }
        .menu-opcoes-glass.aberto {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: all;
        }
        .icone-opcao {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(0,0,0,0.4);
          transition: transform 0.2s ease;
        }
        .icone-opcao:hover { transform: scale(1.15); }
        .icone-camera { background: linear-gradient(135deg, #FF9A9E 0%, #FECFEF 100%); }
        .icone-galeria { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }
        .icone-arquivo { background: linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%); }
        .icone-pix { background: linear-gradient(135deg, #f6d365 0%, #fda085 100%); }

/* NOVOS ESTILOS: HORA E TICKS DE LEITURA */
        .msg-rodape {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: rgba(255, 255, 255, 0.65);
          margin-top: 2px;
          margin-bottom: -4px;
        }
        .tick-amarelo {
          color: #FFD700;
          font-size: 13px;
          letter-spacing: -2px; /* Junta os dois checks */
          margin-right: 2px;
        }
        .tick-verde-neon {
          color: #00ff88;
          font-size: 13px;
          letter-spacing: -2px; /* Junta os dois checks */
          margin-right: 2px;
          text-shadow: 0 0 6px rgba(0, 255, 136, 0.8); /* O brilho futurista */
        }

/* NOVOS ESTILOS: MENU DE AÇÕES DA MENSAGEM */
        .menu-mensagem-flutuante {
          position: absolute;
          top: -45px;
          right: 0;
          display: flex;
          gap: 8px;
          background: rgba(17, 27, 33, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          padding: 6px 12px;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          box-shadow: 0 4px 15px rgba(0,0,0,0.5);
          z-index: 100;
          animation: popIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.5) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .btn-acao-msg {
          background: transparent;
          border: none;
          color: #fff;
          font-size: 13px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          border-radius: 12px;
          transition: background 0.2s;
        }
        .btn-acao-msg:hover { background: rgba(255, 255, 255, 0.1); }
        .btn-acao-msg.apagar { color: #ff4d4d; }

/* ESTILOS: ÍCONES 3D DO MENU DE MENSAGEM */
        .icone-3d {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 26px;
          height: 26px;
          border-radius: 50%;
          margin-right: 6px;
          font-size: 13px;
          /* O segredo do 3D: Luz no topo esquerdo, Sombra no fundo direito, Sombra projetada */
          box-shadow: 
            inset 2px 2px 4px rgba(255, 255, 255, 0.5), 
            inset -2px -2px 4px rgba(0, 0, 0, 0.4), 
            2px 3px 5px rgba(0, 0, 0, 0.5);
          text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
        }
        .icone-3d.editar {
          background: linear-gradient(135deg, #FFD700 0%, #D4AF37 100%);
        }
        .icone-3d.apagar {
          background: linear-gradient(135deg, #ff6b6b 0%, #cc0000 100%);
        }

/* ESTILOS: REAÇÕES 3D FLUTUANTES */
        .barra-reacoes-glass {
          position: absolute;
          top: -50px;
          display: flex;
          gap: 12px;
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(15px);
          -webkit-backdrop-filter: blur(15px);
          padding: 8px 16px;
          border-radius: 30px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 10px 25px rgba(0,0,0,0.5);
          z-index: 150;
          animation: popUpReacoes 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
        @keyframes popUpReacoes {
          0% { opacity: 0; transform: scale(0.5) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .emoji-reacao-btn {
          font-size: 26px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: transform 0.2s ease;
          filter: drop-shadow(0 4px 6px rgba(0,0,0,0.4)); /* Dá o efeito 3D no emoji */
        }
        .emoji-reacao-btn:hover {
          transform: scale(1.4) translateY(-5px);
        }
        .badge-reacao {
          position: absolute;
          bottom: -12px;
          right: 20px;
          background: #202c33;
          border: 1.5px solid #00a884;
          border-radius: 12px;
          padding: 2px 6px;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.5);
          animation: popIn 0.3s ease;
          z-index: 5;
        }

/* ESTILOS: STATUS ONLINE NEON */
        .avatar-online-ring {
          box-shadow: 0 0 0 2px #111b21, 0 0 0 4px #00ff88, 0 0 10px rgba(0, 255, 136, 0.6);
          animation: pulsarNeon 2s infinite alternate;
        }
        @keyframes pulsarNeon {
          from { box-shadow: 0 0 0 2px #111b21, 0 0 0 3px #00ff88, 0 0 8px rgba(0, 255, 136, 0.3); }
          to { box-shadow: 0 0 0 2px #111b21, 0 0 0 4px #00ff88, 0 0 15px rgba(0, 255, 136, 0.8); }
        }
        .status-texto-online {
          color: #00ff88 !important;
          text-shadow: 0 0 6px rgba(0, 255, 136, 0.5);
        }

.chat-wallpaper-custom {
          background-color: #0b141a;
          position: relative;
        }

        /* Camada de textura com o papel de parede escuro */
        .chat-wallpaper-custom::before {
          content: "";
          position: fixed; /* O "fixed" faz a imagem travar e cobrir a tela toda */
          top: 0; 
          left: 0; 
          width: 100vw;
          height: 100vh;
          background-image: url('/fundo-escuro.png'); 
          background-repeat: repeat; 
          background-size: 250px; 
          opacity: 0.15; 
          pointer-events: none;
          z-index: 0;
        }

      `}</style>

      {/* HEADER SUPERIOR */}
      <header style={topo}>
        <button style={botaoVoltar} onClick={() => router.push('/feed')} title="Voltar">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={titulo}>Papo BR</h1>
          <p style={subtitulo}>Meu ID: <strong style={{ color: '#FFD700' }}>@{usuarioAtual?.username || usuarioAtual?.nome}</strong></p>
        </div>
        <button
          onClick={() => {
            setModalAdicionarIDAberto(true)
            setSugestoesPerfis([])
          }}
          style={{ background: '#FFD700', color: '#000', border: 'none', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          Adicionar ID
        </button>
      </header>

      <section style={container}>
        {!telaConversaAberta && (
          <aside style={listaConversas}>
            <div style={containerAbasSuperiores}>
              <button onClick={() => setAbaAtiva('batepapo')} style={abaAtiva === 'batepapo' ? btnAbaAtiva : btnAbaInativa}>
                <span>Contatos Autorizados</span>
              </button>
            </div>
            {conversasBatePapo.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#65676b' }}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 10 }}>🔒</span>
                <p style={{ margin: 0, fontWeight: 'bold' }}>Nenhum contato com ID liberado.</p>
                <p style={{ fontSize: 12, marginTop: 4 }}>Clique em "Adicionar ID" acima para autorizar amigos para chamadas.</p>
              </div>
            )}
            {conversasBatePapo.map((conversa) => {
              const outro = conversa.outroUsuario
              return (
                <div key={conversa.id} style={conversaItemBox}>
                  <button
                    style={conversaItem}
                    onClick={() => {
                      setConversaAberta(conversa)
                      setTelaConversaAberta(true)
                      carregarMensagens(conversa.id)
                    }}
                  >
                    <div style={avatarConversa}>
                      {outro?.foto_url ? (
                        <img src={outro.foto_url} alt="" style={fotoAvatar} />
                      ) : (
                        outro?.nome?.charAt(0)?.toUpperCase() ?? 'B'
                      )}
                    </div>
                    <div style={dadosConversa}>
                      <strong style={{ color: '#008C3A' }}>@{outro?.username || outro?.nome}</strong>
                      <small style={{ color: '#16a34a', fontWeight: 'bold' }}>🟢 ID Autorizado para Chamadas</small>
                    </div>
                  </button>
                </div>
              )
            })}
          </aside>
        )}

        {/* TELA DE CONVERSA ABERTA */}
        {telaConversaAberta && conversaAberta && (
          <section style={janelaConversa}>
            <div style={topoConversa}>
              <button
                style={botaoVoltarConversas}
                onClick={async () => {
                  await encerrarChamadaLocal()
                  setTelaConversaAberta(false)
                  setConversaAberta(null)
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e9edef" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
              </button>
              {/* FOTO COM O ANEL NEON (Se estiver online) */}
              <div style={avatarTopoConversa} className={contatoOnline ? 'avatar-online-ring' : ''}>
                {conversaAberta.outroUsuario?.foto_url ? (
                  <img src={conversaAberta.outroUsuario.foto_url} alt="" style={{...fotoAvatar, borderRadius: '50%'}} />
                ) : (
                  conversaAberta.outroUsuario?.nome?.charAt(0)?.toUpperCase() ?? 'B'
                )}
              </div>
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <strong style={{ color: '#e9edef', fontSize: 15, display: 'block' }}>
                  @{conversaAberta.outroUsuario?.username || conversaAberta.outroUsuario?.nome}
                </strong>
                
                {/* TEXTO DE STATUS MÁGICO COM HORA */}
                {(() => {
                  // Busca a última mensagem enviada por essa pessoa na conversa
                  const ultimaDele = [...mensagens].reverse().find(m => m.remetente_id === conversaAberta.outroUsuario?.id);
                  const textoVisto = ultimaDele 
                    ? `Visto por último às ${new Date(ultimaDele.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : 'Visto por último recentemente';

                  return (
                    <p 
                      style={{ color: '#8696a0', fontSize: 12, margin: 0, fontWeight: 'bold', transition: 'color 0.3s' }}
                      className={contatoOnline ? 'status-texto-online' : ''}
                    >
                      {contatoOnline ? 'Ativo Agora' : textoVisto}
                    </p>
                  )
                })()}
              </div>
              {/* BOTOES DE CHAMADA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button
                  type="button"
                  onClick={() => iniciarChamada('video')}
                  style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#2a3942', border: '1.5px solid #374151', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Chamada de Video"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e9edef" strokeWidth="2"><path d="M23 7l-7 5 7 5V7z" /><rect x="1" y="5" width="15" height="14" rx="3" ry="3" /></svg>
                </button>
                <button
                  type="button"
                  onClick={() => iniciarChamada('audio')}
                  style={{ width: 42, height: 42, borderRadius: '50%', backgroundColor: '#ff4d4d', border: '2.5px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  title="Chamada de Audio"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="#000" stroke="#000" strokeWidth="1"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                </button>
              </div>
            </div>

            {/* AREA DE MENSAGENS COM PAPEL DE PAREDE */}
            <div 
              style={areaMensagens} 
              className="chat-wallpaper-custom"
              ref={areaMensagensRef}
              onClick={() => { setMensagemOpcoesId(null); setMensagemReacaoId(null); }}
            >
              {mensagens.map((mensagem) => {
                const minha = mensagem.remetente_id === usuarioAtual?.id
                const horaFormatada = new Date(mensagem.criado_em).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

                return (
                  <div key={mensagem.id} style={minha ? linhaMinhaMensagem : linhaOutraMensagem}>
                    <div 
                      style={{
                        ...(minha ? minhaMensagem : outraMensagem),
                        position: 'relative',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        const agora = Date.now();
                        const tempoPassado = agora - ultimoToqueRef.current.time;
                        const mesmaMensagem = ultimoToqueRef.current.id === mensagem.id;

                        if (mesmaMensagem && tempoPassado < 400) {
                          // === DUPLO TOQUE (CELULAR E PC) ===
                          setMensagemOpcoesId(null);
                          setMensagemReacaoId(mensagemReacaoId === mensagem.id ? null : mensagem.id);
                          ultimoToqueRef.current = { id: '', time: 0 }; // Reseta a memória
                        } else {
                          // === TOQUE SIMPLES ===
                          ultimoToqueRef.current = { id: mensagem.id, time: agora }; // Salva a hora deste toque
                          
                          setMensagemReacaoId(null); // Esconde reações
                          if (minha) {
                            setMensagemOpcoesId(mensagemOpcoesId === mensagem.id ? null : mensagem.id);
                          }
                        }
                      }}
                    >
                      {/* BARRA DE REAÇÕES FLUTUANTE */}
                      {mensagemReacaoId === mensagem.id && (
                        <div 
                          className="barra-reacoes-glass"
                          style={{
                            left: minha ? 'auto' : '0',
                            right: minha ? '0' : 'auto'
                          }}
                        >
                          {['👍', '❤️', '😂', '😮', '🔥'].map(emoji => (
                            <button key={emoji} className="emoji-reacao-btn" onClick={(e) => { e.stopPropagation(); reagirMensagem(mensagem.id, emoji); }}>
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* O MENU FLUTUANTE 3D (Editar/Apagar) */}
                      {mensagemOpcoesId === mensagem.id && (
                        <div className="menu-mensagem-flutuante">
                          <button className="btn-acao-msg" onClick={(e) => { e.stopPropagation(); iniciarEdicao(mensagem); }}>
                            <span className="icone-3d editar">✏️</span> Editar
                          </button>
                          <button className="btn-acao-msg apagar" onClick={(e) => { e.stopPropagation(); apagarMensagem(mensagem.id); }}>
                            <span className="icone-3d apagar">🗑️</span> Apagar
                          </button>
                        </div>
                      )}

                      <p style={{ margin: 0, paddingBottom: 2 }}>{mensagem.texto}</p>
                      
                      <div className="msg-rodape">
                        <span>{horaFormatada}</span>
                        {minha && (
                          <span className={mensagem.lida ? 'tick-verde-neon' : 'tick-amarelo'}>
                            ✓✓
                          </span>
                        )}
                      </div>

                      {/* SELO DE REACAO (O EMOJI GRUDADO NA MENSAGEM) */}
                      {mensagem.reacoes && Object.keys(mensagem.reacoes).length > 0 && (
                        <div className="badge-reacao">
                          {Object.values(mensagem.reacoes).filter((v, i, a) => a.indexOf(v) === i).join(' ')}
                          {Object.keys(mensagem.reacoes).length > 1 && (
                            <span style={{ color: '#00a884', fontWeight: 'bold' }}>
                              {Object.keys(mensagem.reacoes).length}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* INDICADOR DE EDICAO */}
            {mensagemEditando && (
              <div style={{ background: '#202c33', padding: '10px 16px', borderLeft: '4px solid #00a884', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ overflow: 'hidden' }}>
                  <small style={{ color: '#00a884', fontWeight: 'bold', display: 'block', marginBottom: 2 }}>✏️ Editando mensagem...</small>
                  <span style={{ color: '#8696a0', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                    {mensagemEditando.texto}
                  </span>
                </div>
                <button 
                  onClick={() => { setMensagemEditando(null); setNovaMensagem(''); }} 
                  style={{ background: 'transparent', border: 'none', color: '#8696a0', fontSize: 24, cursor: 'pointer' }}
                  title="Cancelar edicao"
                >
                  ×
                </button>
              </div>
            )}

            {/* CAIXA DE ENVIO */}
            <div style={caixaEnviar}>
              {/* NOVO MENU DE ANEXOS */}
              <div className="menu-anexos-container">
                <div className={`menu-opcoes-glass ${menuAnexosAberto ? 'aberto' : ''}`}>
                  <div className="icone-opcao icone-camera" title="Camera">📷</div>
                  <div className="icone-opcao icone-galeria" title="Galeria">🖼️</div>
                  <div className="icone-opcao icone-arquivo" title="Documento">📄</div>
                  <div className="icone-opcao icone-pix" title="Pix">💸</div>
                </div>
                
                <button 
                  className={`btn-mais-flutuante ${menuAnexosAberto ? 'aberto' : ''}`}
                  onClick={() => setMenuAnexosAberto(!menuAnexosAberto)}
                  title="Anexar"
                >
                  +
                </button>
              </div>

              <input
                placeholder="Escreva uma mensagem..."
                value={novaMensagem}
                onChange={(e) => setNovaMensagem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviarMensagem()}
                style={inputMensagem}
              />
              <button onClick={enviarMensagem} disabled={enviando || !novaMensagem.trim()} style={botaoEnviarNovo}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
              </button>
            </div>
          </section>
        )}
      </section>

      {/* MODAL ADICIONAR POR ID */}
      {modalAdicionarIDAberto && (
        <div style={modalOverlayID} onClick={() => setModalAdicionarIDAberto(false)}>
          <div style={caixaModalID} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: 18, color: '#008C3A' }}>🔑 Liberação por ID Privado</h3>
            <p style={{ fontSize: 13, color: '#65676b', marginBottom: 16 }}>
              Digite o <strong>@username</strong> ou o <strong>ID do Perfil</strong> do seu amigo para autorizar ligações de vídeo e áudio sem precisar de número de telefone:
            </p>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Ex: @joaosilva ou ID do usuário"
                value={idParaAdicionar}
                onChange={(e) => setIdParaAdicionar(e.target.value)}
                style={inputModalID}
              />
              {sugestoesPerfis.length > 0 && (
                <div style={caixaFlutuanteSugestoes}>
                  {sugestoesPerfis.map((perfil) => (
                    <div
                      key={perfil.id}
                      style={itemSugestao}
                      onClick={() => adicionarContatoPorID(perfil)}
                    >
                      <div style={avatarSugestao}>
                        {perfil.foto_url ? (
                          <img src={perfil.foto_url} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          perfil.nome?.charAt(0)?.toUpperCase() ?? 'U'
                        )}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <strong style={{ fontSize: 13, color: '#008C3A', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          @{perfil.username || perfil.nome}
                        </strong>
                        <small style={{ fontSize: 11, color: '#65676b', display: 'block' }}>
                          {perfil.nome ?? 'Perfil do Brazilzao'}</small>
                      </div>
                      <span style={{ fontSize: 11, background: '#e6f4ea', color: '#008C3A', padding: '2px 8px', borderRadius: 10, fontWeight: 'bold' }}>
                        Autorizar
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setModalAdicionarIDAberto(false)} style={{ flex: 1, padding: 12, borderRadius: 10, border: 'none', background: '#e4e6eb', fontWeight: 'bold', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={() => adicionarContatoPorID()} disabled={buscandoID} style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#008C3A', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                {buscandoID ? 'Verificando...' : 'Autorizar Contato'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OVERLAY RECEBENDO CHAMADA */}
      {chamadaRecebida && (
        <div style={modalChamadaOverlay}>
          <div style={{ textAlign: 'center', color: '#fff', zIndex: 2, marginTop: 40 }}>
            <span style={{ fontSize: 13, color: '#00a884', fontWeight: 'bold', textTransform: 'uppercase' }}>
              Recebendo Chamada de {chamadaRecebida.tipo === 'video' ? 'Vídeo' : 'Áudio'}
            </span>
            <div style={avatarChamadaBox} className="iconeBalancando">
              {chamadaRecebida.remetente.foto_url ? (
                <img src={chamadaRecebida.remetente.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 40, color: '#fff' }}>
                  {chamadaRecebida.remetente.nome?.charAt(0).toUpperCase() || 'U'}
                </span>
              )}
            </div>
            <h2 style={{ fontSize: 24, margin: '10px 0 4px 0', fontWeight: 'bold' }}>
              @{chamadaRecebida.remetente.username || chamadaRecebida.remetente.nome}
            </h2>
            <p style={{ fontSize: 14, color: '#FFD700', margin: 0, fontWeight: 'bold' }}>
              ID Autorizado chamando você
            </p>
          </div>
          <div style={{ display: 'flex', gap: 30, zIndex: 2 }}>
            <button onClick={recusarChamada} style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#ef4444', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>📞</button>
            <button onClick={aceitarChamada} style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#22c55e', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer' }}>📞</button>
          </div>
        </div>
      )}

      {/* OVERLAY EM CHAMADA */}
      {emChamada && (
        <div style={modalChamadaOverlay}>
          {emChamada.tipo === 'video' && (
            <>
              <video
                ref={videoRemotoRef}
                autoPlay
                playsInline
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100vw',
                  height: '100vh',
                  zIndex: 1,
                  objectFit: 'cover',
                  backgroundColor: '#000',
                  pointerEvents: 'none'
                }}
              />
              <video
                ref={videoLocalRef}
                autoPlay
                playsInline
                muted
                onClick={() => setInverterTelas(!inverterTelas)}
                style={{
                  position: 'absolute',
                  top: 24,
                  right: 20,
                  width: 110,
                  height: 160,
                  borderRadius: 16,
                  objectFit: 'cover',
                  border: '2px solid #00a884',
                  zIndex: 10,
                  cursor: 'pointer',
                  display: emChamada.videoAtivo ? 'block' : 'none'
                }}
              />
            </>
          )}

          <div style={{ textAlign: 'center', color: '#fff', zIndex: 2, marginTop: 30 }}>
            <span style={{ fontSize: 13, color: '#00a884', fontWeight: 'bold', textTransform: 'uppercase', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              {emChamada.tipo === 'video' ? 'Chamada de Vídeo' : 'Chamada de Áudio'}
            </span>
            {(emChamada.tipo === 'audio' || emChamada.status === 'chamando') && (
              <>
                <div style={avatarChamadaBox} className={emChamada.status === 'chamando' ? 'iconeBalancando' : ''}>
                  {conversaAberta?.outroUsuario?.foto_url ? (
                    <img src={conversaAberta.outroUsuario.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 40, color: '#fff' }}>
                      {conversaAberta?.outroUsuario?.nome?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: 22, margin: '10px 0 4px 0', fontWeight: 'bold', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
                  @{conversaAberta?.outroUsuario?.username || conversaAberta?.outroUsuario?.nome}
                </h2>
              </>
            )}
            <p style={{ fontSize: 14, color: emChamada.status === 'chamando' ? '#FFD700' : '#8696a0', margin: 0, fontWeight: emChamada.status === 'chamando' ? 'bold' : 'normal', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
              {emChamada.status === 'chamando' ? 'Chamando via ID Privado...' : formatarTempo(tempoChamada)}
            </p>
          </div>

          <div style={controlesChamadaBar}>
            <button onClick={alternarMicrofone} style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: emChamada.microfoneMutado ? '#ef4444' : '#2a3942', border: '1.5px solid #374151', cursor: 'pointer' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /></svg>
            </button>
            {emChamada.tipo === 'video' && (
              <button onClick={inverterCamera} style={{ width: 52, height: 52, borderRadius: '50%', backgroundColor: '#2a3942', border: '1.5px solid #374151', cursor: 'pointer' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M20 10c0-4.4-3.6-8-8-8s-8 3.6-8 8h3l-4 4-4-4h3c0-5.5 4.5-10 10-10s10 4.5 10 10h-2z" /><path d="M4 14c0 4.4 3.6 8 8 8s8-3.6 8-8h-3l4-4 4 4h-3c0 5.5-4.5 10-10 10s-10-4.5-10-10h2z" /></svg>
              </button>
            )}
            <button onClick={encerrarChamada} style={{ width: 62, height: 62, borderRadius: '50%', backgroundColor: '#ff4d4d', border: '2.5px solid #000', cursor: 'pointer' }}>
              <svg width="24" height="22" viewBox="0 0 24 24" fill="#000" stroke="#000" strokeWidth="1"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" transform="rotate(135 12 12)" /></svg>
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

/* ESTILOS CSS-IN-JS */
const page = { minHeight: '100vh', background: '#f2f2f2', fontFamily: 'Arial, sans-serif' }
const carregandoBox = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008C3A', fontWeight: 900, fontSize: 18 }
const topo = { background: 'linear-gradient(180deg,#008C3A,#006B2D)', color: '#fff', padding: '14px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky' as const, top: 0, zIndex: 10 }
const botaoVoltar = { width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,.18)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const titulo = { margin: 0, color: '#FFD700', fontSize: 22, fontWeight: 900 }
const subtitulo = { margin: '2px 0 0', color: '#EAF7EC', fontSize: 12 }
const container = { maxWidth: 900, margin: '0 auto', padding: '12px 12px 80px 12px', width: '100%' }
const listaConversas = { background: '#fff', borderRadius: 18, padding: 12, minHeight: 'calc(100vh - 115px)' }
const containerAbasSuperiores = { display: 'flex', gap: 8, marginBottom: 14, background: '#f0f2f5', padding: 4, borderRadius: 12 }
const btnAbaAtiva = { flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: '#008C3A', color: '#fff', fontWeight: 'bold' as const, fontSize: 13, cursor: 'pointer' }
const btnAbaInativa = { flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: 'transparent', color: '#555', fontWeight: '600' as const, fontSize: 13, cursor: 'pointer' }
const conversaItemBox = { position: 'relative' as const, marginBottom: 8 }
const conversaItem = { width: '100%', border: '1px solid #eee', background: '#fff', borderRadius: 14, padding: 10, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', textAlign: 'left' as const }
const avatarConversa = { width: 44, height: 44, borderRadius: '50%', background: '#008C3A', color: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, flexShrink: 0 }
const fotoAvatar = { width: '100%', height: '100%', objectFit: 'cover' as const }
const dadosConversa = { display: 'flex', flexDirection: 'column' as const, gap: 2, overflow: 'hidden' }
const janelaConversa = { background: '#0b141a', height: '100vh', width: '100%', position: 'fixed' as const, top: 0, left: 0, zIndex: 100000, display: 'flex', flexDirection: 'column' as const }
const topoConversa = { padding: '10px 16px', background: '#111b21', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid #222d34' }
const avatarTopoConversa = { width: 40, height: 40, borderRadius: '50%', background: '#008C3A', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' as const, overflow: 'hidden', flexShrink: 0 }
const botaoVoltarConversas = { width: 34, height: 34, borderRadius: '50%', border: 'none', background: '#202c33', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }
const areaMensagens = { flex: 1, padding: '16px', overflowY: 'auto' as const, background: '#0b141a' }
const linhaMinhaMensagem = { display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }
const linhaOutraMensagem = { display: 'flex', justifyContent: 'flex-start', marginBottom: 12 }
const minhaMensagem = { maxWidth: '75%', background: '#005c4b', color: '#fff', borderRadius: '14px 14px 4px 14px', padding: '8px 12px', fontSize: 14 }
const outraMensagem = { maxWidth: '75%', background: '#202c33', color: '#fff', borderRadius: '14px 14px 14px 4px', padding: '8px 12px', fontSize: 14 }
const caixaEnviar = { padding: '12px', display: 'flex', gap: 10, background: '#111b21', alignItems: 'center' }
const inputMensagem = { flex: 1, border: 'none', background: '#222d34', color: '#fff', padding: '12px 16px', borderRadius: 24, outline: 'none', fontSize: 14 }
const botaoEnviarNovo = { width: 42, height: 42, borderRadius: '50%', background: '#00a884', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const modalOverlayID = { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 150000, padding: 20 }
const caixaModalID = { background: '#fff', padding: 20, borderRadius: 20, width: '100%', maxWidth: 420, boxShadow: '0 10px 30px rgba(0,0,0,0.3)' }
const inputModalID = { width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid #ccc', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }
const caixaFlutuanteSugestoes = { position: 'absolute' as const, top: '100%', left: 0, right: 0, background: '#fff', borderRadius: 14, boxShadow: '0 10px 28px rgba(0,0,0,0.3)', border: '1px solid #e4e6eb', marginTop: 6, zIndex: 1000, overflow: 'hidden' as const, maxHeight: 230 }
const itemSugestao = { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f0f2f5' }
const avatarSugestao = { width: 36, height: 36, borderRadius: '50%', background: '#008C3A', color: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' as const, flexShrink: 0 }
const modalChamadaOverlay = { position: 'fixed' as const, top: 0, left: 0, width: '100vw', height: '100vh', background: '#111b21', zIndex: 200000, display: 'flex', flexDirection: 'column' as const, justifyContent: 'space-between', alignItems: 'center', padding: '50px 20px' }
const avatarChamadaBox = { width: 110, height: 110, borderRadius: '50%', background: '#008C3A', margin: '20px auto', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(0, 168, 132, 0.4)' }
const controlesChamadaBar = { display: 'flex', alignItems: 'center', gap: 20, zIndex: 20 }