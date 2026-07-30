'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/utils/supabase/client'

// CATEGORIAS ATUALIZADAS COM ÍCONES 3D REAIS
const CATEGORIAS_ICONES = [
  { id: 'Veículos', label: 'Carros', imagem: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Automobile/3D/automobile_3d.png' },
  { id: 'Imóveis', label: 'Imóveis', imagem: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/House/3D/house_3d.png' },
  { id: 'Eletrônicos', label: 'Eletrônicos', imagem: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Laptop/3D/laptop_3d.png' },
  { id: 'Empregos', label: 'Empregos', imagem: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Briefcase/3D/briefcase_3d.png' },
  { id: 'Serviços & Corres', label: 'Serviços', imagem: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Toolbox/3D/toolbox_3d.png' },
  { id: 'Moda & Acessórios', label: 'Moda', imagem: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/T-shirt/3D/t-shirt_3d.png' },
  { id: 'Outros', label: 'Outros', imagem: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Package/3D/package_3d.png' }
]

function VendasPageContent() {
  const router = useRouter()
  
  const [usuarioAtual, setUsuarioAtual] = useState<any | null>(null)
  const [anuncios, setAnuncios] = useState<any[]>([])
  const [todasMensagens, setTodasMensagens] = useState<any[]>([])
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0)
  const [mensagensNaoLidasCount, setMensagensNaoLidasCount] = useState(0)
  const [carregando, setCarregando] = useState(true)

  const [telaAtiva, setTelaAtiva] = useState<'feed' | 'categorias' | 'explorar' | 'anunciar' | 'meus' | 'salvos' | 'mensagens'>('feed')

  const [conversaAtiva, setConversaAtiva] = useState<any | null>(null)
  const [novaRespostaChat, setNovaRespostaChat] = useState('')
  const [enviandoResposta, setEnviandoResposta] = useState(false)

  // ESTADOS E REFS DO BOTÃO + (ANEXOS NO CHAT DE VENDAS)
  const [menuAnexosAberto, setMenuAnexosAberto] = useState(false)
  const [midiaAnexoChat, setMidiaAnexoChat] = useState<File | null>(null)
  const [midiaAnexoPreview, setMidiaAnexoPreview] = useState<string | null>(null)

  const inputMidiaChatRef = useRef<HTMLInputElement | null>(null)
  const inputAudioChatRef = useRef<HTMLInputElement | null>(null)

  // FILTROS AVANÇADOS E LOCALIZAÇÃO
  const [categoriaSelecionada, setCategoriaSelecionada] = useState('Todas')
  const [buscaTexto, setBuscaTexto] = useState('')
  const [precoMin, setPrecoMin] = useState('')
  const [precoMax, setPrecoMax] = useState('')
  const [ordenacao, setOrdenacao] = useState('recentes')
  
  const [cidadeUsuario, setCidadeUsuario] = useState('Brasília')
  const [estadoUsuario, setEstadoUsuario] = useState('DF')
  const [bairroUsuario, setBairroUsuario] = useState('')
  const [escopoLocalizacao, setEscopoLocalizacao] = useState<'cidade' | 'estado' | 'brasil'>('cidade')
  const [modalFiltroAberto, setModalFiltroAberto] = useState(false)

  // ESTADOS DO CHECKOUT DE ANÚNCIOS
  const [modalCheckoutAberto, setModalCheckoutAberto] = useState(false)
  const [etapaCheckout, setEtapaCheckout] = useState<'planos' | 'pix' | 'sucesso'>('planos')
  const [planoSelecionado, setPlanoSelecionado] = useState(1)
  const [motivoCheckout, setMotivoCheckout] = useState<'turbinar' | 'premium' | 'limite'>('turbinar')
  const [qtdPacotes, setQtdPacotes] = useState(1)
  const chavePixDemo = "00020126360014BR.GOV.BCB.PIX0114+55619999999995204000053039865802BR5902BR60049.906208BRASILIA6304000063041A2B"

  // ESTADOS DA COMPRA DE PRODUTOS
  const [modalCompraAberto, setModalCompraAberto] = useState(false)
  const [etapaCompra, setEtapaCompra] = useState<'resumo' | 'pix' | 'sucesso'>('resumo')

  const [favoritos, setFavoritos] = useState<string[]>([])
  const [anuncioDetalhes, setAnuncioDetalhes] = useState<any | null>(null)
  const [fotoIndexAtiva, setFotoIndexAtiva] = useState(0)
  const [msgAppPersonalizada, setMsgAppPersonalizada] = useState('Opa! Esse item ainda tá disponível, parceiro?')
  const [enviandoChatApp, setEnviandoChatApp] = useState(false)

  // PASSO 3: ESTADOS DE DENÚNCIA
  const [modalDenunciaAberto, setModalDenunciaAberto] = useState(false)
  const [motivoDenuncia, setMotivoDenuncia] = useState('')
  const [comentarioDenuncia, setComentarioDenuncia] = useState('')
  const [enviandoDenuncia, setEnviandoDenuncia] = useState(false)

  const touchStartX = useRef<number | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // ESTADOS DO FORMULÁRIO DE ANÚNCIO E EDIÇÃO
  const [idEditando, setIdEditando] = useState<string | null>(null)
  const [novoTitulo, setNovoTitulo] = useState('')
  const [novoPreco, setNovoPreco] = useState('')
  const [novaCategoria, setNovaCategoria] = useState('')
  const [novaDescricao, setNovaDescricao] = useState('')
  const [novoWhatsapp, setNovoWhatsapp] = useState('')
  const [novaCidade, setNovaCidade] = useState('')
  const [novoEstado, setNovoEstado] = useState('')
  const [novoBairro, setNovoBairro] = useState('')
  const [rotuloDestaque, setRotuloDestaque] = useState('Oportunidade!')
  const [midiaFiles, setMidiaFiles] = useState<File[]>([])
  const [midiaPreviews, setMidiaPreviews] = useState<string[]>([])
  const [salvandoAnuncio, setSalvandoAnuncio] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // COMPARTILHAMENTO OPCIONAL NAS COMUNIDADES LOCAIS
  const [comunidadesDisponiveis, setComunidadesDisponiveis] = useState<any[]>([])
  const [comunidadesSelecionadas, setComunidadesSelecionadas] = useState<string[]>([])

  const meusAnuncios = anuncios.filter((a) => a.usuario_id === usuarioAtual?.id || a.autor?.id === usuarioAtual?.id)

  // DESBLOQUEIA ÁUDIO
  useEffect(() => {
    const desbloquearAudio = () => {
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

    window.addEventListener('click', desbloquearAudio, { once: true })
    window.addEventListener('touchstart', desbloquearAudio, { once: true })

    return () => {
      window.removeEventListener('click', desbloquearAudio)
      window.removeEventListener('touchstart', desbloquearAudio)
    }
  }, [])

  const tocarSomNotificacao = () => {
    try {
      const audio = new Audio('/notificacao.mp3')
      audio.volume = 1.0
      const playPromise = audio.play()

      if (playPromise !== undefined) {
        playPromise.catch(() => dispararBeepSintetizado())
      }
    } catch (e) {
      dispararBeepSintetizado()
    }
  }

  const dispararBeepSintetizado = () => {
    try {
      const ctx = audioCtxRef.current || new (window.AudioContext || (window as any).webkitAudioContext)()
      if (ctx.state === 'suspended') ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(587.33, ctx.currentTime)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08)

      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.3)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      osc.stop(ctx.currentTime + 0.3)
    } catch (err) {}
  }

  useEffect(() => {
    async function carregarUsuario() {
      const { data: sessao } = await supabase.auth.getSession()
      if (sessao?.session?.user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', sessao.session.user.id).maybeSingle()
        setUsuarioAtual(data)
        if (data?.telefone) setNovoWhatsapp(data.telefone)
        if (data?.cidade) { setCidadeUsuario(data.cidade); setNovaCidade(data.cidade); }
        if (data?.estado) { setEstadoUsuario(data.estado); setNovoEstado(data.estado); }
        if (data?.bairro) { setBairroUsuario(data.bairro); setNovoBairro(data.bairro); }

        carregarComunidades(data?.cidade || 'Brasília')

        if (data?.favoritos_vendas) {
          setFavoritos(data.favoritos_vendas)
        }
      }
    }
    carregarUsuario()
  }, [])

  const carregarComunidades = async (cidade: string) => {
    try {
      const { data } = await supabase
        .from('comunidades')
        .select('*')
        .limit(10)
      
      if (data && data.length > 0) {
        setComunidadesDisponiveis(data)
      } else {
        setComunidadesDisponiveis([
          { id: 'com_1', nome: `Feira Livre - ${cidade}`, membros: 1420 },
          { id: 'com_2', nome: `Classificados da Região (${cidade})`, membros: 2890 },
          { id: 'com_3', nome: `Desapega & Trocas Locais`, membros: 950 }
        ])
      }
    } catch (e) {
      setComunidadesDisponiveis([
        { id: 'com_1', nome: `Feira Livre - ${cidade}`, membros: 1420 },
        { id: 'com_2', nome: `Classificados da Região (${cidade})`, membros: 2890 },
        { id: 'com_3', nome: `Desapega & Trocas Locais`, membros: 950 }
      ])
    }
  }

  const carregarAnuncios = async () => {
    setCarregando(true)
    try {
      const { data: postsBanco, error } = await supabase.from('feed_posts').select('*').order('created_at', { ascending: false })
      if (!error && postsBanco) {
        const apenasVendas = postsBanco.map((p: any) => ({ ...p.conteudo, id: p.id, usuario_id: p.usuario_id, created_at: p.created_at })).filter((p: any) => p.tipoPost === 'venda' || p.preco !== undefined)
        setAnuncios(apenasVendas)
      }
    } catch (err) { console.error(err) } finally { setCarregando(false) }
  }

  const carregarMensagens = async () => {
    if (!usuarioAtual?.id) return
    try {
      const { data, error } = await supabase.from('feed_posts').select('*').order('created_at', { ascending: true })
      if (!error && data) {
        const msgs = data.map((p: any) => ({ ...p.conteudo, id: p.id, usuario_id: p.usuario_id, created_at: p.created_at })).filter((p: any) => (p.tipoPost === 'mensagem_direta' || p.tipoPost === 'papo_br_mensagem') && (p.usuario_id === usuarioAtual.id || p.destinatario_id === usuarioAtual.id))
        setTodasMensagens(msgs)

        const naoLidasChat = msgs.filter(m => m.destinatario_id === usuarioAtual.id && (m.lida === false || m.lida === undefined)).length
        setMensagensNaoLidasCount(naoLidasChat)
      }
    } catch (e) { console.error(e) }
  }

  const carregarContadorNotificacoes = async () => {
    if (!usuarioAtual?.id) return
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('usuario_id', usuarioAtual.id)
        .eq('lida', false)

      if (!error) {
        setNotificacoesNaoLidas(count || 0)
      }
    } catch (e) { console.error(e) }
  }

  const marcarMensagensComoLidas = async () => {
    if (!usuarioAtual?.id) return
    setMensagensNaoLidasCount(0)

    try {
      const msgsParaAtualizar = todasMensagens.filter(m => m.destinatario_id === usuarioAtual.id && !m.lida)
      for (const msg of msgsParaAtualizar) {
        const conteudoAtualizado = { ...msg, lida: true }
        await supabase.from('feed_posts').update({ conteudo: conteudoAtualizado }).eq('id', msg.id)
      }
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    if (!usuarioAtual?.id) return

    const canalRealtime = supabase
      .channel('vendas_realtime_global')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'feed_posts' }, (payload) => {
        carregarMensagens()
        if (payload.new?.conteudo?.destinatario_id === usuarioAtual.id) {
          tocarSomNotificacao()
        }
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `usuario_id=eq.${usuarioAtual.id}` }, () => {
        carregarContadorNotificacoes()
        tocarSomNotificacao()
      })
      .subscribe()

    return () => { supabase.removeChannel(canalRealtime) }
  }, [usuarioAtual?.id]) 

  const atualizarFeedVendas = () => {
    setTelaAtiva('feed')
    setCategoriaSelecionada('Todas')
    setBuscaTexto('')
    setPrecoMin('')
    setPrecoMax('')
    setOrdenacao('recentes')
    setEscopoLocalizacao('cidade')
    carregarAnuncios()
  }

  useEffect(() => { carregarAnuncios() }, [])
  
  useEffect(() => { 
    if (usuarioAtual?.id) { carregarMensagens(); carregarContadorNotificacoes(); }
  }, [usuarioAtual, telaAtiva])

  const toggleFavorito = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!usuarioAtual?.id) return alert('Faça login para salvar anúncios!')

    let novaLista = []
    if (favoritos.includes(id)) {
      novaLista = favoritos.filter(f => f !== id)
    } else {
      novaLista = [...favoritos, id]
    }
    
    setFavoritos(novaLista)

    try {
      await supabase.from('profiles').update({ favoritos_vendas: novaLista }).eq('id', usuarioAtual.id)
    } catch (err) { console.error('Erro ao salvar favorito') }
  }

  const toggleComunidadeSelecionada = (comId: string) => {
    setComunidadesSelecionadas(prev => 
      prev.includes(comId) ? prev.filter(id => id !== comId) : [...prev, comId]
    )
  }

  const handleMidiasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    if (midiaFiles.length + files.length > 10) return alert('Máximo de 10 fotos!')
    const novosFiles = [...midiaFiles, ...files].slice(0, 10)
    setMidiaFiles(novosFiles)
    setMidiaPreviews(novosFiles.map(f => URL.createObjectURL(f)))
  }

  const removerFoto = (index: number) => {
    setMidiaFiles(prev => prev.filter((_, i) => i !== index))
    setMidiaPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const converterParaBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = () => resolve(reader.result as string); reader.onerror = (error) => reject(error)
    })
  }

  const abrirEdicaoAnuncio = (item: any) => {
    setIdEditando(item.id)
    setNovoTitulo(item.titulo || '')
    setNovoPreco(item.preco ? item.preco.toString() : '')
    setNovaCategoria(item.categoria || '')
    setNovaCidade(item.cidade || '')
    setNovoEstado(item.estado || '')
    setNovoBairro(item.bairro || '')
    setNovaDescricao(item.descricao || '')
    setMidiaPreviews(item.fotos || (item.foto_url ? [item.foto_url] : []))
    setAnuncioDetalhes(null)
    setTelaAtiva('anunciar')
  }

  const cancelarEdicao = () => {
    setIdEditando(null)
    setNovoTitulo('')
    setNovoPreco('')
    setNovaCategoria('')
    setNovaDescricao('')
    setMidiaFiles([])
    setMidiaPreviews([])
    setComunidadesSelecionadas([])
    setTelaAtiva('feed')
  }

  const tentarPublicar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuarioAtual?.id) return alert('Entre na sua conta para anunciar!')

    if (idEditando) {
      executarPublicacao()
      return
    }

    if (!usuarioAtual.is_pro) {
      if (novaCategoria === 'Veículos' || novaCategoria === 'Imóveis') {
        setMotivoCheckout('premium')
        setPlanoSelecionado(3) 
        setEtapaCheckout('planos')
        setModalCheckoutAberto(true)
        return
      }

      const limiteAtual = usuarioAtual.limite_anuncios ?? 3;
      if (meusAnuncios.length >= limiteAtual) {
        setMotivoCheckout('limite')
        setPlanoSelecionado(4) 
        setQtdPacotes(1)
        setEtapaCheckout('planos')
        setModalCheckoutAberto(true)
        return
      }
    }

    executarPublicacao()
  }

  const executarPublicacao = async () => {
    setSalvandoAnuncio(true)
    const urlsFotos: string[] = []
    try {
      if (midiaFiles.length > 0) {
        for (let i = 0; i < midiaFiles.length; i++) {
          const file = midiaFiles[i]
          const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg'
          const nomeArquivo = `venda_${usuarioAtual.id}_${Date.now()}_${i}.${ext}`
          const { error: errUp } = await supabase.storage.from('posts_midia').upload(nomeArquivo, file, { contentType: file.type || 'image/jpeg', upsert: true })
          if (!errUp) { urlsFotos.push(supabase.storage.from('posts_midia').getPublicUrl(nomeArquivo).data.publicUrl) } 
          else { urlsFotos.push(await converterParaBase64(file)) }
        }
      }

      const conteudoAtualizado = {
        tipoPost: 'venda', 
        titulo: novoTitulo.trim(), 
        preco: parseFloat(novoPreco.replace(',', '.')) || 0,
        categoria: novaCategoria || 'Outros', 
        descricao: novaDescricao.trim(), 
        whatsapp: novoWhatsapp.replace(/\D/g, ''),
        rotulo: rotuloDestaque || 'Oportunidade!', 
        midiaUrl: urlsFotos[0] || midiaPreviews[0] || null, 
        foto_url: urlsFotos[0] || midiaPreviews[0] || null, 
        fotos: urlsFotos.length > 0 ? urlsFotos : midiaPreviews,
        cidade: novaCidade || cidadeUsuario || 'Sua Região', 
        estado: novoEstado || estadoUsuario || 'DF',
        bairro: novoBairro.trim() || null,
        tempo: new Date().toISOString(), 
        autor: { id: usuarioAtual.id, nome: usuarioAtual.nome || 'Vendedor', foto_url: usuarioAtual.foto_url || null }
      }

      if (idEditando) {
        const { error } = await supabase.from('feed_posts').update({ conteudo: conteudoAtualizado }).eq('id', idEditando)
        if (error) throw error
        alert('Anúncio atualizado com sucesso!')
        setIdEditando(null)
      } else {
        const { data, error } = await supabase.from('feed_posts').insert({ usuario_id: usuarioAtual.id, conteudo: conteudoAtualizado }).select().single()
        if (error) throw error

        if (comunidadesSelecionadas.length > 0) {
          for (const comId of comunidadesSelecionadas) {
            await supabase.from('feed_posts').insert({
              usuario_id: usuarioAtual.id,
              comunidade_id: comId,
              conteudo: {
                tipoPost: 'post_comunidade',
                texto: `🛍️ Anúncio no Vendas BR: ${novoTitulo.trim()} - R$ ${novoPreco}\n${novaDescricao.trim()}`,
                midiaUrl: urlsFotos[0] || midiaPreviews[0] || null,
                tempo: new Date().toISOString(),
                autor: { id: usuarioAtual.id, nome: usuarioAtual.nome || 'Vendedor', foto_url: usuarioAtual.foto_url || null }
              }
            })
          }
        }

        alert(comunidadesSelecionadas.length > 0 
          ? `Anúncio publicado no Vendas BR e espalhado em ${comunidadesSelecionadas.length} comunidades locais!` 
          : 'Anúncio publicado com sucesso!'
        )
      }

      carregarAnuncios()
      setTelaAtiva('feed')
      setNovoTitulo(''); setNovoPreco(''); setNovaDescricao(''); setMidiaFiles([]); setMidiaPreviews([]); setComunidadesSelecionadas([])

    } catch (err) { console.error(err); alert('Erro ao salvar anúncio.') } finally { setSalvandoAnuncio(false) }
  }

  const apagarMeuAnuncio = async (idPost: string) => {
    const confirmacao = window.confirm("Tem certeza que deseja apagar este anúncio permanentemente?")
    if (!confirmacao) return
    try {
      const { error } = await supabase.from('feed_posts').delete().eq('id', idPost)
      if (error) throw error
      setAnuncios(anuncios.filter(a => a.id !== idPost))
      setAnuncioDetalhes(null)
      alert('Anúncio apagado com sucesso! Sua vaga foi liberada.')
    } catch (err) { alert('Erro ao apagar.') }
  }

  const simularCompraSucesso = async () => {
    if (!usuarioAtual?.id || !anuncioDetalhes) return;
    const destinatarioId = anuncioDetalhes.autor?.id || anuncioDetalhes.usuario_id
    const canalId = `chat_${[usuarioAtual.id, destinatarioId].sort().join('_')}_${anuncioDetalhes.id}`

    const msgSistema = {
      tipoPost: 'mensagem_direta', canal_id: canalId, destinatario_id: destinatarioId, destinatario_nome: anuncioDetalhes.autor?.nome || 'Vendedor',
      anuncio_id: anuncioDetalhes.id, titulo_anuncio: anuncioDetalhes.titulo,
      texto: `💳 PAGAMENTO CONFIRMADO: O comprador realizou o pagamento de R$ ${Number(anuncioDetalhes.preco || 0).toLocaleString('pt-BR')} via App. O dinheiro está retido de forma segura pelo Vendas BR. Podem combinar a entrega!`,
      lida: false,
      tempo: new Date().toISOString(), autor: { id: 'sistema', nome: 'Vendas BR (Sistema)', foto_url: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Robot/3D/robot_3d.png' }
    }
    await supabase.from('feed_posts').insert({ usuario_id: usuarioAtual.id, conteudo: msgSistema })

    await supabase.from('notifications').insert({
      usuario_id: destinatarioId,
      remetente_id: usuarioAtual.id,
      tipo: 'venda_realizada',
      mensagem: `💰 Venda Realizada! Pagamento retido de R$ ${Number(anuncioDetalhes.preco || 0).toLocaleString('pt-BR')} para o item: ${anuncioDetalhes.titulo}`,
      link: '/vendas',
      lida: false
    })

    tocarSomNotificacao()
    setEtapaCompra('sucesso')
  }

  const enviarMensagemNoApp = async () => {
    if (!usuarioAtual?.id) return alert('Faça login para enviar mensagens no app!')
    if (!msgAppPersonalizada.trim() || !anuncioDetalhes) return
    setEnviandoChatApp(true)
    try {
      const destinatarioId = anuncioDetalhes.autor?.id || anuncioDetalhes.usuario_id
      const canalId = `chat_${[usuarioAtual.id, destinatarioId].sort().join('_')}_${anuncioDetalhes.id}`
      
      const novaMsgConteudo = { 
        tipoPost: 'mensagem_direta', 
        canal_id: canalId, 
        destinatario_id: destinatarioId, 
        destinatario_nome: anuncioDetalhes.autor?.nome || 'Vendedor', 
        anuncio_id: anuncioDetalhes.id, 
        titulo_anuncio: anuncioDetalhes.titulo, 
        texto: msgAppPersonalizada.trim(), 
        lida: false,
        tempo: new Date().toISOString(), 
        autor: { id: usuarioAtual.id, nome: usuarioAtual.nome || 'Usuário', foto_url: usuarioAtual.foto_url || null } 
      }
      
      await supabase.from('feed_posts').insert({ usuario_id: usuarioAtual.id, conteudo: novaMsgConteudo })

      await supabase.from('notifications').insert({
        usuario_id: destinatarioId,
        remetente_id: usuarioAtual.id,
        tipo: 'mensagem_vendas',
        mensagem: `💬 Nova mensagem de @${usuarioAtual.nome || 'alguém'} sobre: ${anuncioDetalhes.titulo}`,
        link: '/vendas',
        lida: false
      })

      tocarSomNotificacao()
      alert('Mensagem enviada no Papo BR!')
      setAnuncioDetalhes(null); setConversaAtiva({ canal_id: canalId, titulo_anuncio: anuncioDetalhes.titulo, outroUsuarioNome: anuncioDetalhes.autor?.nome || 'Vendedor', outroUsuarioId: destinatarioId })
      setTelaAtiva('mensagens'); await carregarMensagens()
    } catch (e) { console.error(e) } finally { setEnviandoChatApp(false) }
  }

  const enviarRespostaChat = async () => {
    if (!usuarioAtual?.id || !conversaAtiva || (!novaRespostaChat.trim() && !midiaAnexoChat)) return
    setEnviandoResposta(true)
    try {
      let urlMidiaUpload: string | null = null

      if (midiaAnexoChat) {
        const ext = midiaAnexoChat.name.split('.').pop()?.toLowerCase() || 'jpg'
        const nomeArquivo = `vendas_chat_${usuarioAtual.id}_${Date.now()}.${ext}`
        const { error: errUp } = await supabase.storage.from('posts_midia').upload(nomeArquivo, midiaAnexoChat, { upsert: true })
        if (!errUp) {
          urlMidiaUpload = supabase.storage.from('posts_midia').getPublicUrl(nomeArquivo).data.publicUrl
        }
      }

      const novaMsgConteudo = { 
        tipoPost: 'mensagem_direta', 
        canal_id: conversaAtiva.canal_id, 
        destinatario_id: conversaAtiva.outroUsuarioId, 
        destinatario_nome: conversaAtiva.outroUsuarioNome, 
        titulo_anuncio: conversaAtiva.titulo_anuncio, 
        texto: novaRespostaChat.trim(), 
        midiaUrl: urlMidiaUpload,
        lida: false,
        tempo: new Date().toISOString(), 
        autor: { id: usuarioAtual.id, nome: usuarioAtual.nome || 'Usuário', foto_url: usuarioAtual.foto_url || null } 
      }
      
      await supabase.from('feed_posts').insert({ usuario_id: usuarioAtual.id, conteudo: novaMsgConteudo })

      await supabase.from('notifications').insert({
        usuario_id: conversaAtiva.outroUsuarioId,
        remetente_id: usuarioAtual.id,
        tipo: 'mensagem_vendas',
        mensagem: `💬 Nova resposta de @${usuarioAtual.nome || 'usuário'} no chat: ${conversaAtiva.titulo_anuncio}`,
        link: '/vendas',
        lida: false
      })

      tocarSomNotificacao()
      setNovaRespostaChat('')
      setMidiaAnexoChat(null)
      setMidiaAnexoPreview(null)
      setMenuAnexosAberto(false)
      await carregarMensagens()
    } finally { setEnviandoResposta(false) }
  }

  // PASSO 3: FUNÇÃO DE DENUNCIAR ANÚNCIO
  const enviarDenuncia = async () => {
    if (!usuarioAtual?.id) return alert('Você precisa estar logado para denunciar.')
    if (!motivoDenuncia) return alert('Por favor, selecione um motivo.')

    setEnviandoDenuncia(true)
    try {
      await supabase.from('feed_posts').insert({
        usuario_id: usuarioAtual.id, // O usuário logado que fez a denúncia
        conteudo: {
          tipoPost: 'denuncia_venda',
          anuncio_id: anuncioDetalhes.id,
          anuncio_titulo: anuncioDetalhes.titulo,
          vendedor_id: anuncioDetalhes.usuario_id || anuncioDetalhes.autor?.id,
          motivo: motivoDenuncia,
          comentario: comentarioDenuncia.trim(),
          tempo: new Date().toISOString()
        }
      })
      alert('Sua denúncia foi enviada e será analisada por nossa equipe. Obrigado!')
      setModalDenunciaAberto(false)
      setMotivoDenuncia('')
      setComentarioDenuncia('')
    } catch (e) {
      alert('Erro ao enviar denúncia.')
    } finally {
      setEnviandoDenuncia(false)
    }
  }

  const conversasAgrupadas = () => {
    const mapa: { [key: string]: any } = {}

    todasMensagens.forEach((msg) => {
      const ehMeu = msg.usuario_id === usuarioAtual?.id
      const outroId = ehMeu ? msg.destinatario_id : msg.usuario_id
      const outroNome = ehMeu ? (msg.destinatario_nome || 'Vendedor') : (msg.autor?.nome || 'Comprador')
      const outroAvatar = ehMeu ? null : (msg.autor?.foto_url || msg.autor?.avatar || null)
      const canalId = msg.canal_id || `chat_${[msg.usuario_id, msg.destinatario_id].sort().join('_')}_${msg.anuncio_id || 'geral'}`

      const dataMsg = msg.tempo || msg.created_at || new Date().toISOString()

      if (!mapa[canalId] || new Date(dataMsg) > new Date(mapa[canalId].hora)) {
        mapa[canalId] = {
          canal_id: canalId,
          titulo_anuncio: msg.titulo_anuncio || 'Item do Vendas BR',
          outroUsuarioNome: outroNome,
          outroUsuarioId: outroId,
          outroUsuarioAvatar: outroAvatar,
          anuncio_id: msg.anuncio_id,
          ultimaMsg: msg.midiaUrl ? '🖼️ [Mídia / Áudio]' : msg.texto,
          hora: dataMsg,
          naoLida: !msg.lida && msg.destinatario_id === usuarioAtual?.id
        }
      }
    })

    return Object.values(mapa).sort((a: any, b: any) => new Date(b.hora).getTime() - new Date(a.hora).getTime())
  }

  const anunciosFiltrados = anuncios.filter((a) => {
    const combinaCat = categoriaSelecionada === 'Todas' || a.categoria === categoriaSelecionada
    const combinaBusca = a.titulo?.toLowerCase().includes(buscaTexto.toLowerCase()) || a.descricao?.toLowerCase().includes(buscaTexto.toLowerCase())
    const preco = Number(a.preco) || 0
    const min = precoMin ? Number(precoMin) : 0
    const max = precoMax ? Number(precoMax) : Infinity
    const combinaPreco = preco >= min && preco <= max

    let combinaLocalizacao = true
    if (escopoLocalizacao === 'cidade') {
      const cidadeAnuncio = (a.cidade || '').toLowerCase().trim()
      const minhaCidade = (cidadeUsuario || '').toLowerCase().trim()
      combinaLocalizacao = cidadeAnuncio === minhaCidade || !cidadeAnuncio
    } else if (escopoLocalizacao === 'estado') {
      const estadoAnuncio = (a.estado || '').toLowerCase().trim()
      const meuEstado = (estadoUsuario || '').toLowerCase().trim()
      combinaLocalizacao = estadoAnuncio === meuEstado || !estadoAnuncio
    }

    return combinaCat && combinaBusca && combinaPreco && combinaLocalizacao
  }).sort((a, b) => {
    if (ordenacao === 'menor_preco') return (Number(a.preco) || 0) - (Number(b.preco) || 0)
    if (ordenacao === 'maior_preco') return (Number(b.preco) || 0) - (Number(a.preco) || 0)
    return new Date(b.created_at || b.tempo).getTime() - new Date(a.created_at || a.tempo).getTime()
  })

  const anunciosSalvos = anuncios.filter((a) => favoritos.includes(a.id))

  const abrirCheckoutTurbinar = () => { 
    setMotivoCheckout('turbinar'); setPlanoSelecionado(1); setEtapaCheckout('planos'); setModalCheckoutAberto(true); 
  }

  const navItems = [
    { id: 'feed', label: 'Início', icone: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/House/3D/house_3d.png' },
    { id: 'salvos', label: 'Salvos', icone: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Heart%20suit/3D/heart_suit_3d.png' },
    { id: 'anunciar', label: 'Anunciar', icone: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Megaphone/3D/megaphone_3d.png' },
    { id: 'mensagens', label: 'Chat', icone: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Speech%20balloon/3D/speech_balloon_3d.png', badge: mensagensNaoLidasCount },
    { id: 'meus', label: 'Meus Itens', icone: 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Package/3D/package_3d.png' }
  ]

  return (
    <div style={estilos.container}>
      
      {/* HEADER SEM A SETA DUPLICADA DE VOLTAR */}
      <header style={estilos.headerVendasBR}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...estilos.logoBR, cursor: 'pointer' }} onClick={atualizarFeedVendas}>BR</div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 22, fontWeight: '900', color: '#008C3A', letterSpacing: '-0.5px', cursor: 'pointer' }} onClick={atualizarFeedVendas}>
            VEND<span style={{ fontSize: 18, margin: '0 -1px' }}>🌱</span>S BR
          </div>
        </div>
        
        {/* BOTÃO DO SININHO DE NOTIFICAÇÃO COM CONTADOR */}
        <button 
           onClick={() => router.push('/notificacoes')} 
           style={{ position: 'relative', background: '#f0f2f5', border: 'none', width: 38, height: 38, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, cursor: 'pointer' }}
        >
          🔔
          {notificacoesNaoLidas > 0 && (
            <span style={estilos.badgeNotificacaoHeader}>{notificacoesNaoLidas}</span>
          )}
        </button>
      </header>

      <div style={estilos.conteudoScroll}>

        {/* ================= TELA FEED (INÍCIO) ================= */}
        {telaAtiva === 'feed' && (
          <div style={{ padding: '14px' }}>
            <div style={estilos.boxBusca} onClick={() => setTelaAtiva('explorar')}>
              <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Magnifying%20glass%20tilted%20left/3D/magnifying_glass_tilted_left_3d.png" alt="Buscar" style={{ width: 22, height: 22 }} />
              <input type="text" placeholder="O que você tá procurando, parceiro?" readOnly style={estilos.inputBusca} />
              <button style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }} onClick={(e) => { e.stopPropagation(); setModalFiltroAberto(true); }}>
                <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Gear/3D/gear_3d.png" alt="Filtro" style={{ width: 24, height: 24 }} />
              </button>
            </div>

            {/* SELETOR DE ESCOPO DE LOCALIZAÇÃO */}
            <div style={estilos.barralocalizacaoPills}>
              <button 
                onClick={() => setEscopoLocalizacao('cidade')}
                style={{
                  ...estilos.btnPillLocal,
                  background: escopoLocalizacao === 'cidade' ? '#008C3A' : '#f0f2f5',
                  color: escopoLocalizacao === 'cidade' ? '#fff' : '#555',
                  fontWeight: escopoLocalizacao === 'cidade' ? '800' : '600'
                }}
              >
                📍 {cidadeUsuario}
              </button>

              <button 
                onClick={() => setEscopoLocalizacao('estado')}
                style={{
                  ...estilos.btnPillLocal,
                  background: escopoLocalizacao === 'estado' ? '#008C3A' : '#f0f2f5',
                  color: escopoLocalizacao === 'estado' ? '#fff' : '#555',
                  fontWeight: escopoLocalizacao === 'estado' ? '800' : '600'
                }}
              >
                🗺️ Estado ({estadoUsuario})
              </button>

              <button 
                onClick={() => setEscopoLocalizacao('brasil')}
                style={{
                  ...estilos.btnPillLocal,
                  background: escopoLocalizacao === 'brasil' ? '#008C3A' : '#f0f2f5',
                  color: escopoLocalizacao === 'brasil' ? '#fff' : '#555',
                  fontWeight: escopoLocalizacao === 'brasil' ? '800' : '600'
                }}
              >
                🇧🇷 Todo o Brasil
              </button>
            </div>

            <div style={estilos.carrosselCategorias}>
              {CATEGORIAS_ICONES.map((cat) => {
                const isSelecionada = categoriaSelecionada === cat.id
                return (
                  <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }} onClick={() => setCategoriaSelecionada(cat.id)}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: isSelecionada ? '2px solid #008C3A' : '1px solid #f0f2f5', boxShadow: isSelecionada ? '0 0px 0px rgba(0,0,0,0)' : '0 4px 0px #d1d5db, 0 8px 15px rgba(0,0,0,0.05)', transform: isSelecionada ? 'translateY(4px)' : 'translateY(0px)', transition: 'all 0.15s ease-out' }}>
                      <img src={cat.imagem} alt={cat.label} style={{ width: 36, height: 36, objectFit: 'contain', filter: isSelecionada ? 'none' : 'drop-shadow(0 3px 3px rgba(0,0,0,0.15))', transition: 'all 0.15s' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: isSelecionada ? '800' : '600', color: isSelecionada ? '#008C3A' : '#65676b' }}>{cat.label}</span>
                  </div>
                )
              })}
            </div>

            <h2 style={{ fontSize: 18, fontWeight: '800', color: '#111', margin: '14px 0 12px 0' }}>Achados do Dia</h2>
            {carregando ? ( 
              <div style={estilos.statusBox}>Carregando achados...</div> 
            ) : anunciosFiltrados.length === 0 ? ( 
              <div style={estilos.statusBox}>
                <span style={{ fontSize: 32, display: 'block', marginBottom: 8 }}>📍</span>
                <strong>Nenhum anúncio encontrado em {escopoLocalizacao === 'cidade' ? cidadeUsuario : escopoLocalizacao === 'estado' ? estadoUsuario : 'Todo o Brasil'}.</strong>
                <p style={{ fontSize: 13, color: '#65676b', marginTop: 6 }}>
                  {escopoLocalizacao === 'cidade' && 'Que tal ver os anúncios do Estado ou de todo o Brasil?'}
                </p>
                {escopoLocalizacao !== 'brasil' && (
                  <button style={estilos.btnVerdeGenerico} onClick={() => setEscopoLocalizacao('brasil')}>
                    Ver Anúncios do Brasil Todo
                  </button>
                )}
              </div> 
            ) : (
              <div style={estilos.gridAchados}>
                {anunciosFiltrados.map((item, index) => {
                  const valorFormatado = Number(item.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
                  const isFreteGratis = item.rotulo?.toLowerCase().includes('grátis')
                  return (
                    <div key={item.id} style={{ display: 'contents' }}>
                      {index === 0 && (
                        <div style={estilos.bannerPatrocinado} onClick={abrirCheckoutTurbinar}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}><span style={estilos.tagPatrocinado}>⭐ Destaque VIP</span><span style={{ fontSize: 20 }}>🚀</span></div>
                          <strong style={{ fontSize: 16, color: '#fff', marginTop: 10, display: 'block' }}>Quer vender mais rápido?</strong>
                          <p style={{ fontSize: 13, color: '#e6e6e6', margin: '4px 0 14px 0' }}>Anúncios turbinados aparecem nesta área para milhares de pessoas em {cidadeUsuario}.</p>
                          <button style={estilos.btnSaibaMaisDestaque}>Turbinar meu anúncio</button>
                        </div>
                      )}
                      <div style={estilos.cardAchado} onClick={() => { setAnuncioDetalhes(item); setFotoIndexAtiva(0); }}>
                        <div style={estilos.boxImagemAchado}>
                          {(item.foto_url || item.midiaUrl) ? ( <img src={item.foto_url || item.midiaUrl} alt={item.titulo} style={estilos.imgCard} /> ) : ( <div style={estilos.semFotoCard}>Sem Foto</div> )}
                          <button style={estilos.btnCoracao} onClick={(e) => toggleFavorito(e, item.id)}>
                            {favoritos.includes(item.id) ? '❤️' : '🤍'}
                          </button>
                          <div style={estilos.overlayPrecoImagem}>R$ {valorFormatado}</div>
                        </div>
                        <div style={estilos.rodapeCardAchado}>
                          <span style={estilos.textoLocalizacao}>
                            {item.bairro ? `${item.bairro}, ` : ''}{item.cidade || cidadeUsuario} - {item.estado || estadoUsuario}
                          </span>
                          <span style={{ ...estilos.tagRotulo, color: isFreteGratis ? '#008C3A' : '#65676b', background: isFreteGratis ? '#e6f4ea' : 'transparent' }}>{item.rotulo || 'Oportunidade!'}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TELA EXPLORAR ================= */}
        {telaAtiva === 'explorar' && (
          <div style={{ padding: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 16 }}>Explorar 🔍</h2>
            <div style={{ ...estilos.boxBusca, marginBottom: 16 }}>
              <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Magnifying%20glass%20tilted%20left/3D/magnifying_glass_tilted_left_3d.png" alt="Buscar" style={{ width: 22, height: 22 }} />
              <input type="text" placeholder="Buscar carros, celulares..." value={buscaTexto} onChange={(e) => setBuscaTexto(e.target.value)} style={estilos.inputBusca} autoFocus />
            </div>
            
            <div style={estilos.carrosselCategorias}>
              {CATEGORIAS_ICONES.map((cat) => {
                const isSelecionada = categoriaSelecionada === cat.id
                return (
                  <div key={cat.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', flexShrink: 0 }} onClick={() => setCategoriaSelecionada(cat.id)}>
                    <div style={{ width: 64, height: 64, borderRadius: 20, background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', border: isSelecionada ? '2px solid #008C3A' : '1px solid #f0f2f5', boxShadow: isSelecionada ? '0 0px 0px rgba(0,0,0,0)' : '0 4px 0px #d1d5db, 0 8px 15px rgba(0,0,0,0.05)' }}>
                      <img src={cat.imagem} alt={cat.label} style={{ width: 36, height: 36, objectFit: 'contain' }} />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: isSelecionada ? '800' : '600', color: isSelecionada ? '#008C3A' : '#65676b' }}>{cat.label}</span>
                  </div>
                )
              })}
            </div>
            
            <div style={{ background: '#f8f9fa', padding: 14, borderRadius: 14, border: '1px solid #e5e7eb', marginBottom: 20 }}>
              <strong style={{ fontSize: 13, color: '#111', display: 'block', marginBottom: 10 }}>Filtros Avançados</strong>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                <div>
                  <span style={{ fontSize: 11, color: '#65676b', display: 'block', marginBottom: 4 }}>Preço Mín (R$)</span>
                  <input type="number" placeholder="0" value={precoMin} onChange={(e) => setPrecoMin(e.target.value)} style={{ ...estilos.inputBorda, padding: '8px 12px' }} />
                </div>
                <div>
                  <span style={{ fontSize: 11, color: '#65676b', display: 'block', marginBottom: 4 }}>Preço Máx (R$)</span>
                  <input type="number" placeholder="Milhões..." value={precoMax} onChange={(e) => setPrecoMax(e.target.value)} style={{ ...estilos.inputBorda, padding: '8px 12px' }} />
                </div>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#65676b', display: 'block', marginBottom: 4 }}>Ordenar por</span>
                <select value={ordenacao} onChange={(e) => setOrdenacao(e.target.value)} style={{ ...estilos.inputBorda, padding: '8px 12px' }}>
                  <option value="recentes">Mais Recentes</option>
                  <option value="menor_preco">Menor Preço</option>
                  <option value="maior_preco">Maior Preço</option>
                </select>
              </div>
            </div>

            {(buscaTexto || precoMin || precoMax || categoriaSelecionada !== 'Todas') && (
               <>
                 <strong style={{ fontSize: 14, color: '#111', display: 'block', marginBottom: 10 }}>Resultados ({anunciosFiltrados.length})</strong>
                 {anunciosFiltrados.length === 0 ? (
                   <p style={{ color: '#65676b', fontSize: 13, textAlign: 'center', marginTop: 20 }}>Nada encontrado com esses filtros.</p>
                 ) : (
                   <div style={estilos.gridAchados}>
                     {anunciosFiltrados.map((item) => (
                        <div key={item.id} style={estilos.cardAchado} onClick={() => { setAnuncioDetalhes(item); setFotoIndexAtiva(0); }}>
                          <div style={estilos.boxImagemAchado}>
                            {(item.foto_url || item.midiaUrl) ? ( <img src={item.foto_url || item.midiaUrl} alt={item.titulo} style={estilos.imgCard} /> ) : ( <div style={estilos.semFotoCard}>Sem Foto</div> )}
                            <div style={estilos.overlayPrecoImagem}>R$ {Number(item.preco || 0).toLocaleString('pt-BR')}</div>
                          </div>
                          <div style={estilos.rodapeCardAchado}>
                            <span style={estilos.textoLocalizacao}>{item.bairro ? `${item.bairro}, ` : ''}{item.cidade || cidadeUsuario}</span>
                            <span style={{ ...estilos.tagRotulo, color: '#65676b' }}>{item.rotulo || 'Oportunidade!'}</span>
                          </div>
                        </div>
                     ))}
                   </div>
                 )}
               </>
            )}
          </div>
        )}

        {/* ================= TELA ANUNCIAR / EDITAR ================= */}
        {telaAtiva === 'anunciar' && (
           <div style={{ padding: 16 }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
               <h3 style={{ fontSize: 16, color: '#111', fontWeight: '800', margin: 0 }}>
                 {idEditando ? '✏️ Editar Anúncio' : 'Criar Anúncio'}
               </h3>
               {idEditando && (
                 <button onClick={cancelarEdicao} style={{ background: '#eee', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 'bold', cursor: 'pointer' }}>
                   Cancelar Edição
                 </button>
               )}
             </div>
             
             {!idEditando && !usuarioAtual?.is_pro && meusAnuncios.length >= (usuarioAtual?.limite_anuncios ?? 3) && (
               <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', padding: 12, borderRadius: 12, marginBottom: 16 }}>
                 <strong style={{ fontSize: 13, color: '#b45309', display: 'block' }}>⚠️ Limite Grátis Atingido</strong>
                 <span style={{ fontSize: 12, color: '#b45309' }}>Você usou suas {usuarioAtual?.limite_anuncios ?? 3} vagas. Escolha um plano para anunciar.</span>
               </div>
             )}

             <form onSubmit={tentarPublicar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
               <div>
                 <label style={estilos.labelSimples}>Título</label>
                 <input type="text" value={novoTitulo} onChange={e => setNovoTitulo(e.target.value)} style={estilos.inputBorda} required />
               </div>
               <div>
                 <label style={estilos.labelSimples}>Adicionar Fotos ({midiaPreviews.length}/10)</label>
                 <div onClick={() => fileInputRef.current?.click()} style={estilos.boxUploadMultiplo}>+ Adicionar/Alterar Fotos</div>
                 <input type="file" ref={fileInputRef} onChange={handleMidiasChange} accept="image/*" multiple style={{ display: 'none' }} />
                 <div style={estilos.gridPreviews}>
                   {midiaPreviews.map((src, i) => (
                     <div key={i} style={estilos.itemPreviewFoto}>
                       <img src={src} style={estilos.imgPreviewItem} alt="" />
                       <button type="button" onClick={() => removerFoto(i)} style={estilos.btnRemoverFoto}>✕</button>
                     </div>
                   ))}
                 </div>
               </div>
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                 <div>
                   <label style={estilos.labelSimples}>Preço</label>
                   <input type="text" placeholder="R$ 0,00" value={novoPreco} onChange={e => setNovoPreco(e.target.value)} style={estilos.inputBorda} required />
                 </div>
                 <div>
                   <label style={estilos.labelSimples}>Categoria</label>
                   <select value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} style={estilos.inputBorda} required>
                     <option value="">Selecione</option>
                     {CATEGORIAS_ICONES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                   </select>
                 </div>
               </div>

               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                 <div>
                   <label style={estilos.labelSimples}>Cidade</label>
                   <input type="text" placeholder="Ex: Brasília" value={novaCidade} onChange={e => setNovaCidade(e.target.value)} style={estilos.inputBorda} required />
                 </div>
                 <div>
                   <label style={estilos.labelSimples}>Estado (UF)</label>
                   <input type="text" placeholder="DF" maxLength={2} value={novoEstado} onChange={e => setNovoEstado(e.target.value.toUpperCase())} style={estilos.inputBorda} required />
                 </div>
                 <div>
                   <label style={estilos.labelSimples}>Bairro (Opções)</label>
                   <input type="text" placeholder="Ex: Ceilândia" value={novoBairro} onChange={e => setNovoBairro(e.target.value)} style={estilos.inputBorda} />
                 </div>
               </div>

               <div>
                 <label style={estilos.labelSimples}>Descrição</label>
                 <textarea value={novaDescricao} onChange={e => setNovaDescricao(e.target.value)} style={{ ...estilos.inputBorda, height: 80 }} />
               </div>

               {/* SEÇÃO OPCIONAL: ESPALHAR NAS COMUNIDADES LOCAIS */}
               {!idEditando && comunidadesDisponiveis.length > 0 && (
                 <div style={{ background: '#f8f9fa', padding: 14, borderRadius: 14, border: '1px solid #e5e7eb', marginTop: 4 }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                     <strong style={{ fontSize: 13, color: '#111' }}>📢 Espalhar nas Comunidades Locais</strong>
                     <span style={{ fontSize: 10, background: '#e6f4ea', color: '#008C3A', padding: '2px 8px', borderRadius: 8, fontWeight: 'bold' }}>OPCIONAL</span>
                   </div>
                   <p style={{ fontSize: 11, color: '#65676b', margin: '0 0 10px 0', lineHeight: 1.3 }}>
                     Marque onde você quer publicar esse anúncio ao mesmo tempo:
                   </p>

                   <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                     {comunidadesDisponiveis.map((com) => {
                       const selecionada = comunidadesSelecionadas.includes(com.id)
                       return (
                         <div 
                           key={com.id} 
                           onClick={() => toggleComunidadeSelecionada(com.id)}
                           style={{ 
                             display: 'flex', 
                             alignItems: 'center', 
                             gap: 10, 
                             padding: '10px 12px', 
                             borderRadius: 12, 
                             background: selecionada ? '#e6f4ea' : '#fff',
                             border: selecionada ? '1px solid #008C3A' : '1px solid #d1d5db',
                             cursor: 'pointer',
                             transition: 'all 0.15s ease'
                           }}
                         >
                           <input 
                             type="checkbox" 
                             checked={selecionada} 
                             onChange={() => {}} 
                             style={{ accentColor: '#008C3A', width: 16, height: 16, cursor: 'pointer' }} 
                           />
                           <div style={{ flex: 1 }}>
                             <strong style={{ fontSize: 13, color: '#111', display: 'block' }}>{com.nome}</strong>
                             <span style={{ fontSize: 10, color: '#65676b' }}>👥 {com.membros} membros da região</span>
                           </div>
                         </div>
                       )
                     })}
                   </div>
                 </div>
               )}

               <button type="submit" disabled={salvandoAnuncio} style={estilos.btnAvancarPrevia}>
                 {salvandoAnuncio ? 'Salvando...' : idEditando ? 'Salvar Alterações' : 'Publicar Anúncio'}
               </button>
             </form>
           </div>
        )}

        {/* ================= TELA DE SALVOS (FAVORITOS) ================= */}
        {telaAtiva === 'salvos' && (
          <div style={{ padding: 16 }}>
            <h2 style={{ fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 16 }}>Meus Favoritos ❤️</h2>
            
            {favoritos.length === 0 ? (
              <div style={estilos.statusBox}>
                <span style={{ fontSize: 40, display: 'block', marginBottom: 10 }}>🤍</span>
                <strong style={{ color: '#111', display: 'block' }}>Nenhum item salvo ainda.</strong>
                <p style={{ fontSize: 13, color: '#65676b', marginTop: 6 }}>Navegue pelo feed e clique no coração para guardar os itens que você gostou.</p>
                <button style={estilos.btnVerdeGenerico} onClick={() => setTelaAtiva('feed')}>Explorar Vendas</button>
              </div>
            ) : (
              <div style={estilos.gridAchados}>
                {anunciosSalvos.map((item) => {
                  const valorFormatado = Number(item.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })
                  const isFreteGratis = item.rotulo?.toLowerCase().includes('grátis')
                  return (
                    <div key={item.id} style={estilos.cardAchado} onClick={() => { setAnuncioDetalhes(item); setFotoIndexAtiva(0); }}>
                      <div style={estilos.boxImagemAchado}>
                        {(item.foto_url || item.midiaUrl) ? ( <img src={item.foto_url || item.midiaUrl} alt={item.titulo} style={estilos.imgCard} /> ) : ( <div style={estilos.semFotoCard}>Sem Foto</div> )}
                        <button style={estilos.btnCoracao} onClick={(e) => toggleFavorito(e, item.id)}>❤️</button>
                        <div style={estilos.overlayPrecoImagem}>R$ {valorFormatado}</div>
                      </div>
                      <div style={estilos.rodapeCardAchado}>
                        <span style={estilos.textoLocalizacao}>
                          {item.bairro ? `${item.bairro}, ` : ''}{item.cidade || cidadeUsuario}
                        </span>
                        <span style={{ ...estilos.tagRotulo, color: isFreteGratis ? '#008C3A' : '#65676b', background: isFreteGratis ? '#e6f4ea' : 'transparent' }}>{item.rotulo || 'Oportunidade!'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= TELA MENSAGENS & CHAT PROFISSIONAL ================= */}
        {telaAtiva === 'mensagens' && (
          <div style={{ padding: '12px 14px', minHeight: '100%', display: 'flex', flexDirection: 'column' }}>
            {conversaAtiva ? (
              /* --- CONVERSA ABERTA --- */
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
                
                {/* CABEÇALHO DO CHAT */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button onClick={() => setConversaAtiva(null)} style={{ background: '#f1f5f9', border: 'none', width: 34, height: 34, borderRadius: '50%', fontSize: 16, cursor: 'pointer', color: '#008C3A', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      ←
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #00B04B 0%, #008C3A 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 15, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                        {conversaAtiva.outroUsuarioAvatar ? (
                          <img src={conversaAtiva.outroUsuarioAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          conversaAtiva.outroUsuarioNome?.charAt(0).toUpperCase() || 'U'
                        )}
                      </div>
                      <div>
                        <strong style={{ fontSize: 14, color: '#0f172a', display: 'block', lineHeight: 1.2 }}>
                          @{conversaAtiva.outroUsuarioNome}
                        </strong>
                        <span style={{ fontSize: 11, color: '#008C3A', fontWeight: '600', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00B04B', display: 'inline-block' }} />
                          Negociando no Vendas BR
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BANNER FIXO DO PRODUTO NEGOCIADO */}
                <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                    <span style={{ fontSize: 16 }}>🛍️</span>
                    <div style={{ overflow: 'hidden' }}>
                      <span style={{ fontSize: 10, color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' }}>Produto da negociação</span>
                      <strong style={{ fontSize: 13, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
                        {conversaAtiva.titulo_anuncio}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* HISTÓRICO DE MENSAGENS */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10, background: '#f1f5f9' }}>
                  {todasMensagens.filter(m => m.canal_id === conversaAtiva.canal_id).map((msg) => {
                    const souEu = msg.usuario_id === usuarioAtual?.id
                    const ehSistema = msg.autor?.id === 'sistema' || msg.tipoPost === 'sistema'

                    if (ehSistema) {
                      return (
                        <div key={msg.id} style={{ background: '#fef3c7', border: '1px solid #fcd34d', color: '#78350f', padding: '10px 14px', borderRadius: 14, fontSize: 12, textAlign: 'center', margin: '8px 0', lineHeight: 1.4, fontWeight: '500', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                          {msg.texto}
                        </div>
                      )
                    }

                    return (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: souEu ? 'flex-end' : 'flex-start',
                          maxWidth: '82%',
                          background: souEu ? 'linear-gradient(135deg, #00B04B 0%, #008C3A 100%)' : '#ffffff',
                          color: souEu ? '#ffffff' : '#0f172a',
                          padding: '10px 14px',
                          borderRadius: souEu ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                          border: souEu ? 'none' : '1px solid #e2e8f0',
                        }}
                      >
                        {msg.midiaUrl && (
                          <div style={{ marginBottom: 6 }}>
                            {msg.midiaUrl.match(/\.(mp3|wav|m4a|webm)($|\?)/i) ? (
                              <audio src={msg.midiaUrl} controls style={{ width: '100%', maxWidth: 220, height: 36 }} />
                            ) : msg.midiaUrl.match(/\.(mp4|webm|ogg|mov|mkv)($|\?)/i) ? (
                              <video src={msg.midiaUrl} controls style={{ width: '100%', maxHeight: 200, borderRadius: 10, objectFit: 'cover' }} />
                            ) : (
                              <img src={msg.midiaUrl} alt="Anexo" style={{ width: '100%', maxHeight: 200, borderRadius: 10, objectFit: 'cover' }} />
                            )}
                          </div>
                        )}
                        {msg.texto && (
                          <span style={{ fontSize: 13.5, lineHeight: '1.4', display: 'block', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {msg.texto}
                          </span>
                        )}
                        <span style={{ fontSize: 10, color: souEu ? 'rgba(255,255,255,0.85)' : '#94a3b8', display: 'block', textAlign: 'right', marginTop: 4, fontWeight: '500' }}>
                          {msg.tempo ? new Date(msg.tempo).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* RESPOSTAS RÁPIDAS (PILLS / CHIPS) */}
                <div style={{ display: 'flex', gap: 6, padding: '8px 12px 0 12px', overflowX: 'auto', background: '#fff', scrollbarWidth: 'none' }}>
                  {['Tá disponível?', 'Faz por menos?', 'Aceita troca?', 'Onde posso retirar?'].map((sugestao) => (
                    <button
                      key={sugestao}
                      onClick={() => setNovaRespostaChat(sugestao)}
                      style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', padding: '5px 12px', borderRadius: 16, fontSize: 11, fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}
                    >
                      {sugestao}
                    </button>
                  ))}
                </div>

                {/* PREVIEW DE MÍDIA ANEXADA (FOTO / VÍDEO / ÁUDIO) */}
                {midiaAnexoChat && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {midiaAnexoChat.type.startsWith('image/') && midiaAnexoPreview ? (
                        <img src={midiaAnexoPreview} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : midiaAnexoChat.type.startsWith('video/') && midiaAnexoPreview ? (
                        <video src={midiaAnexoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : midiaAnexoChat.type.startsWith('audio/') ? (
                        <span style={{ fontSize: 22 }}>🎤</span>
                      ) : (
                        <span style={{ fontSize: 22 }}>📁</span>
                      )}
                    </div>

                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <strong style={{ fontSize: 12, color: '#1e293b', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {midiaAnexoChat.name}
                      </strong>
                      <span style={{ fontSize: 11, color: '#008C3A', fontWeight: 'bold' }}>
                        {midiaAnexoChat.type.startsWith('image/') ? '🖼️ Foto pronta para envio' :
                         midiaAnexoChat.type.startsWith('video/') ? '🎥 Vídeo pronto para envio' :
                         midiaAnexoChat.type.startsWith('audio/') ? '🎤 Áudio pronto para envio' :
                         '📎 Arquivo pronto'}
                      </span>
                    </div>

                    <button 
                      onClick={() => { setMidiaAnexoChat(null); setMidiaAnexoPreview(null); }} 
                      style={{ background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* INPUTS ESCONDIDOS DE FOTO/VÍDEO E ÁUDIO */}
                <input
                  type="file"
                  ref={inputMidiaChatRef}
                  accept="image/*,video/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setMidiaAnexoChat(file)
                      setMidiaAnexoPreview(URL.createObjectURL(file))
                    }
                    setMenuAnexosAberto(false)
                  }}
                />
                <input
                  type="file"
                  ref={inputAudioChatRef}
                  accept="audio/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      setMidiaAnexoChat(file)
                      setMidiaAnexoPreview(URL.createObjectURL(file))
                    }
                    setMenuAnexosAberto(false)
                  }}
                />

                {/* CAMPO DE ENTRADA DE TEXTO COM BOTÃO + */}
                <div style={{ position: 'relative', display: 'flex', gap: 8, padding: 12, background: '#ffffff', alignItems: 'center' }}>
                  
                  {/* POPUP DE OPÇÕES DO BOTÃO + */}
                  {menuAnexosAberto && (
                    <div style={{
                      position: 'absolute',
                      bottom: '100%',
                      left: 12,
                      background: '#ffffff',
                      borderRadius: 16,
                      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                      border: '1px solid #e2e8f0',
                      padding: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      zIndex: 100,
                      minWidth: 160
                    }}>
                      <button
                        type="button"
                        onClick={() => inputMidiaChatRef.current?.click()}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: '10px 12px', fontSize: 13, fontWeight: '600', color: '#1e293b', cursor: 'pointer', borderRadius: 10 }}
                      >
                        🖼️ Foto / Vídeo
                      </button>
                      <button
                        type="button"
                        onClick={() => inputAudioChatRef.current?.click()}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: '10px 12px', fontSize: 13, fontWeight: '600', color: '#1e293b', cursor: 'pointer', borderRadius: 10 }}
                      >
                        🎤 Áudio / Som
                      </button>
                    </div>
                  )}

                  {/* BOTÃO + */}
                  <button
                    type="button"
                    onClick={() => setMenuAnexosAberto(!menuAnexosAberto)}
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: '50%',
                      background: menuAnexosAberto ? '#008C3A' : '#f1f5f9',
                      color: menuAnexosAberto ? '#ffffff' : '#008C3A',
                      border: '1px solid #cbd5e1',
                      fontSize: 22,
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease',
                      flexShrink: 0
                    }}
                  >
                    +
                  </button>

                  {/* CAMPO DE DIGITAÇÃO */}
                  <input 
                    type="text" 
                    placeholder="Escreva uma mensagem..." 
                    value={novaRespostaChat} 
                    onChange={e => setNovaRespostaChat(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && enviarRespostaChat()} 
                    style={estilos.inputBorda} 
                  />

                  {/* BOTÃO ENVIAR */}
                  <button 
                    onClick={enviarRespostaChat} 
                    disabled={enviandoResposta || (!novaRespostaChat.trim() && !midiaAnexoChat)} 
                    style={{ 
                      background: enviandoResposta || (!novaRespostaChat.trim() && !midiaAnexoChat) ? '#cbd5e1' : '#008C3A', 
                      color: '#fff', 
                      border: 'none', 
                      borderRadius: '50%', 
                      width: 38, 
                      height: 38, 
                      minWidth: 38, 
                      fontWeight: 'bold', 
                      fontSize: 15, 
                      cursor: 'pointer', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      flexShrink: 0 
                    }}
                  >
                    ➤
                  </button>
                </div>

              </div>
            ) : (
              /* --- LISTA DE CHATS E NEGOCIAÇÕES --- */
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontSize: 18, color: '#0f172a', fontWeight: '900', margin: 0 }}>Chats Vendas BR</h3>
                    <span style={{ fontSize: 12, color: '#64748b' }}>Suas negociações ativas no app</span>
                  </div>
                  <span style={{ background: '#e6f4ea', color: '#008C3A', fontSize: 11, fontWeight: '800', padding: '4px 10px', borderRadius: 12 }}>
                    {conversasAgrupadas().length} conversas
                  </span>
                </div>

                {conversasAgrupadas().length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px 20px', background: '#fff', borderRadius: 20, border: '1px solid #e2e8f0' }}>
                    <span style={{ fontSize: 44, display: 'block', marginBottom: 10 }}>💬</span>
                    <strong style={{ fontSize: 15, color: '#1e293b', display: 'block' }}>Nenhuma conversa por aqui</strong>
                    <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                      Quando você chamar um vendedor ou responder um comprador, os chats aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {conversasAgrupadas().map((chat: any) => {
                      const horaFormatada = chat.hora
                        ? new Date(chat.hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                        : ''

                      return (
                        <div
                          key={chat.canal_id}
                          onClick={() => setConversaAtiva(chat)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            padding: '12px 14px',
                            background: '#ffffff',
                            borderRadius: 16,
                            border: chat.naoLida ? '1.5px solid #008C3A' : '1px solid #e2e8f0',
                            boxShadow: chat.naoLida ? '0 4px 12px rgba(0, 140, 58, 0.12)' : '0 2px 6px rgba(0,0,0,0.03)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* AVATAR DO USUÁRIO */}
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #00B04B 0%, #008C3A 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 18, overflow: 'hidden', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
                              {chat.outroUsuarioAvatar ? (
                                <img src={chat.outroUsuarioAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                chat.outroUsuarioNome.charAt(0).toUpperCase()
                              )}
                            </div>
                            <span style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: '50%', background: '#00B04B', border: '2px solid #fff' }} />
                          </div>

                          {/* INFORMAÇÕES DO CHAT */}
                          <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                              <strong style={{ fontSize: 14, color: '#0f172a' }}>
                                @{chat.outroUsuarioNome}
                              </strong>
                              <span style={{ fontSize: 10, color: chat.naoLida ? '#008C3A' : '#94a3b8', fontWeight: chat.naoLida ? 'bold' : 'normal' }}>
                                {horaFormatada}
                              </span>
                            </div>

                            {/* TAG DO PRODUTO */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, margin: '2px 0' }}>
                              <span style={{ fontSize: 11, background: '#f1f5f9', color: '#008C3A', fontWeight: '700', padding: '1px 6px', borderRadius: 6, display: 'inline-block', maxWidth: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                🛍️ {chat.titulo_anuncio}
                              </span>
                            </div>

                            {/* ÚLTIMA MENSAGEM */}
                            <p style={{ fontSize: 12, color: chat.naoLida ? '#0f172a' : '#64748b', fontWeight: chat.naoLida ? '700' : '400', margin: '3px 0 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {chat.ultimaMsg}
                            </p>
                          </div>

                          {/* INDICADOR DE NÃO LIDA */}
                          {chat.naoLida && (
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#008C3A', flexShrink: 0 }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TELA MEUS ANÚNCIOS ================= */}
        {telaAtiva === 'meus' && (
          <div style={{ padding: 16 }}>
            <h3 style={{ fontSize: 16, marginBottom: 12, color: '#111' }}>Seus Classificados Ativos</h3>
            {meusAnuncios.length === 0 ? (
              <div style={estilos.statusBox}><p>Você ainda não tem anúncios cadastrados.</p><button style={estilos.btnVerdeGenerico} onClick={() => setTelaAtiva('anunciar')}>Anunciar Agora</button></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {meusAnuncios.map((item) => (
                  <div key={item.id} style={{ display: 'flex', flexDirection: 'column', background: '#fff', padding: 12, borderRadius: 14, border: '1px solid #e4e6eb' }}>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden', background: '#eee' }}>
                        <img src={item.foto_url || item.midiaUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: 14, color: '#111', display: 'block' }}>{item.titulo}</strong>
                        <span style={{ fontSize: 13, color: '#008C3A', fontWeight: 'bold' }}>R$ {Number(item.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                    <div style={{ borderTop: '1px dashed #e5e7eb', marginTop: 12, paddingTop: 10, display: 'flex', gap: 8 }}>
                      <button style={{ ...estilos.btnTurbinarAnuncio, flex: 2 }} onClick={abrirCheckoutTurbinar}>🚀 Turbinar</button>
                      <button style={{ flex: 1, background: '#f0f2f5', border: 'none', borderRadius: 10, fontWeight: 'bold', fontSize: 12, cursor: 'pointer' }} onClick={() => abrirEdicaoAnuncio(item)}>✏️ Editar</button>
                      <button style={{ flex: 1, background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: 10, fontWeight: 'bold', fontSize: 12, cursor: 'pointer' }} onClick={() => apagarMeuAnuncio(item.id)}>🗑️ Apagar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ================= MODAL DE CHECKOUT: COMPRAR ITEM PELO APP ================= */}
      {modalCompraAberto && anuncioDetalhes && (
        <div style={estilos.fundoModalFiltro} onClick={() => setModalCompraAberto(false)}>
          <div style={estilos.caixaModalCheckout} onClick={(e) => e.stopPropagation()}>
            {etapaCompra === 'resumo' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 40 }}>🔒</span>
                  <h2 style={{ fontSize: 20, fontWeight: '900', color: '#111', margin: '10px 0 4px 0' }}>Pagamento Seguro</h2>
                  <p style={{ fontSize: 13, color: '#65676b', margin: 0 }}>O dinheiro só é liberado ao vendedor após você receber o produto.</p>
                </div>
                
                <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 20 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: '#eee' }}>
                       <img src={anuncioDetalhes.foto_url || anuncioDetalhes.midiaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                    <div>
                      <strong style={{ fontSize: 14, color: '#111', display: 'block' }}>{anuncioDetalhes.titulo}</strong>
                      <span style={{ fontSize: 12, color: '#65676b' }}>Vendido por @{anuncioDetalhes.autor?.nome}</span>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                    <span style={{ color: '#65676b' }}>Valor do Produto</span>
                    <strong style={{ color: '#111' }}>R$ {Number(anuncioDetalhes.preco || 0).toLocaleString('pt-BR')}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, fontSize: 14, borderBottom: '1px dashed #d1d5db', paddingBottom: 12 }}>
                    <span style={{ color: '#008C3A' }}>Proteção Vendas BR</span>
                    <strong style={{ color: '#008C3A' }}>Grátis</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18 }}>
                    <strong style={{ color: '#111' }}>Total a pagar</strong>
                    <strong style={{ color: '#111' }}>R$ {Number(anuncioDetalhes.preco || 0).toLocaleString('pt-BR')}</strong>
                  </div>
                </div>

                <button style={estilos.btnPixPagamento} onClick={() => setEtapaCompra('pix')}><span style={{ fontSize: 18 }}>💠</span> Gerar PIX Copia e Cola</button>
                <button onClick={() => setModalCompraAberto(false)} style={estilos.btnCancelarCheckout}>Cancelar</button>
              </>
            )}

            {etapaCompra === 'pix' && (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 10 }}>Pague com PIX</h2>
                <p style={{ fontSize: 14, color: '#65676b', marginBottom: 20 }}>Escaneie o QR Code ou copie o código abaixo.</p>

                <div style={{ ...estilos.boxQrCodeFake, padding: 10 }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(chavePixDemo)}`} alt="QR Code" style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                </div>

                <div style={{ marginTop: 20, textAlign: 'left' }}>
                  <label style={estilos.labelSimples}>PIX Copia e Cola:</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value="00020126360014BR.GOV.BCB.PIX..." readOnly style={estilos.inputBorda} />
                    <button style={{ ...estilos.btnEnviarAppDirect, padding: '0 16px' }} onClick={() => alert('Código copiado!')}>Copiar</button>
                  </div>
                </div>

                <div style={{ marginTop: 30, borderTop: '1px dashed #e5e7eb', paddingTop: 20 }}>
                   <button style={{ ...estilos.btnVerdeGenerico, width: '100%', marginTop: 0 }} onClick={simularCompraSucesso}>
                     (Demo) Simular Pagamento Aprovado
                   </button>
                </div>
              </div>
            )}

            {etapaCompra === 'sucesso' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <span style={{ fontSize: 60 }}>🎉</span>
                <h2 style={{ fontSize: 22, fontWeight: '900', color: '#008C3A', margin: '10px 0' }}>Pagamento Aprovado!</h2>
                <p style={{ fontSize: 14, color: '#65676b', marginBottom: 30 }}>Seu dinheiro está protegido. Uma mensagem automática foi enviada ao vendedor informando a compra.</p>
                <button 
                  style={estilos.btnAvancarPrevia} 
                  onClick={() => { 
                    setModalCompraAberto(false); 
                    setAnuncioDetalhes(null);
                    marcarMensagensComoLidas();
                    setTelaAtiva('mensagens'); 
                  }}
                >
                  Ir para o Chat do Vendedor
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL DE CHECKOUT: MONETIZAÇÃO E UPSELL ================= */}
      {modalCheckoutAberto && (
        <div style={estilos.fundoModalFiltro} onClick={() => setModalCheckoutAberto(false)}>
          <div style={estilos.caixaModalCheckout} onClick={(e) => e.stopPropagation()}>
            {etapaCheckout === 'planos' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 40 }}>
                    {motivoCheckout === 'turbinar' ? '🚀' : motivoCheckout === 'premium' ? '💎' : '⚠️'}
                  </span>
                  <h2 style={{ fontSize: 20, fontWeight: '900', color: '#111', margin: '10px 0 4px 0' }}>
                    {motivoCheckout === 'turbinar' ? 'Turbine seu Anúncio' : motivoCheckout === 'premium' ? 'Categoria Premium' : 'Limite Atingido'}
                  </h2>
                  <p style={{ fontSize: 13, color: '#65676b', margin: 0 }}>
                    {motivoCheckout === 'turbinar' 
                      ? `Apareça no topo para milhares de pessoas em ${cidadeUsuario}.` 
                      : motivoCheckout === 'premium' 
                        ? 'Veículos e Imóveis requerem uma taxa de ativação.'
                        : 'Você usou todas as suas vagas grátis. Escolha um plano abaixo para continuar anunciando muito!'}
                  </p>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {motivoCheckout === 'turbinar' && (
                    <>
                      <div onClick={() => setPlanoSelecionado(1)} style={{ ...estilos.cardPlano, borderColor: planoSelecionado === 1 ? '#008C3A' : '#e5e7eb', background: planoSelecionado === 1 ? '#e6f4ea' : '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: planoSelecionado === 1 ? '#008C3A' : '#111' }}>⭐ 7 Dias VIP</strong>
                          <strong style={{ fontSize: 18 }}>R$ 9,90</strong>
                        </div>
                      </div>
                      <div onClick={() => setPlanoSelecionado(2)} style={{ ...estilos.cardPlano, borderColor: planoSelecionado === 2 ? '#0A58CA' : '#e5e7eb', background: planoSelecionado === 2 ? '#eff6ff' : '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ color: planoSelecionado === 2 ? '#0A58CA' : '#111', display: 'block' }}>🔥 15 Dias VIP</strong>
                            <span style={{ fontSize: 10, background: '#FFD700', color: '#000', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>MAIS VENDIDO</span>
                          </div>
                          <strong style={{ fontSize: 18 }}>R$ 14,90</strong>
                        </div>
                      </div>
                    </>
                  )}

                  {motivoCheckout === 'premium' && (
                    <div onClick={() => setPlanoSelecionado(3)} style={{ ...estilos.cardPlano, borderColor: '#008C3A', background: '#e6f4ea' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#008C3A' }}>💎 Taxa Única de Ativação</strong>
                        <strong style={{ fontSize: 18 }}>R$ 19,90</strong>
                      </div>
                    </div>
                  )}

                  {motivoCheckout === 'limite' && (
                    <>
                      <div onClick={() => setPlanoSelecionado(4)} style={{ ...estilos.cardPlano, borderColor: planoSelecionado === 4 ? '#008C3A' : '#e5e7eb', background: planoSelecionado === 4 ? '#e6f4ea' : '#fff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ color: planoSelecionado === 4 ? '#008C3A' : '#111', display: 'block' }}>➕ Pacote Avulso</strong>
                            <span style={{ fontSize: 12, color: '#65676b' }}>Libera +{qtdPacotes * 3} vagas</span>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            {planoSelecionado === 4 && (
                              <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8, overflow: 'hidden' }} onClick={(e) => e.stopPropagation()}>
                                <button style={{ padding: '6px 12px', background: '#f8f9fa', border: 'none', cursor: 'pointer', fontSize: 16 }} onClick={() => setQtdPacotes(p => Math.max(1, p - 1))}>-</button>
                                <span style={{ padding: '0 10px', fontSize: 14, fontWeight: 'bold' }}>{qtdPacotes}</span>
                                <button style={{ padding: '6px 12px', background: '#f8f9fa', border: 'none', cursor: 'pointer', fontSize: 16 }} onClick={() => setQtdPacotes(p => p + 1)}>+</button>
                              </div>
                            )}
                            <strong style={{ fontSize: 16 }}>R$ {(qtdPacotes * 9.90).toFixed(2).replace('.', ',')}</strong>
                          </div>
                        </div>
                      </div>

                      <div onClick={() => setPlanoSelecionado(5)} style={{ ...estilos.cardPlano, borderColor: planoSelecionado === 5 ? '#0A58CA' : '#e5e7eb', background: planoSelecionado === 5 ? '#eff6ff' : '#fff', marginTop: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <strong style={{ color: planoSelecionado === 5 ? '#0A58CA' : '#111', display: 'block' }}>👑 Lojista PRO</strong>
                            <span style={{ fontSize: 12, color: '#65676b' }}>Anúncios Ilimitados</span>
                          </div>
                          <strong style={{ fontSize: 16 }}>R$ 49,90 / mês</strong>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button style={estilos.btnPixPagamento} onClick={() => setEtapaCheckout('pix')}><span style={{ fontSize: 18 }}>💠</span> Gerar PIX</button>
                <button onClick={() => setModalCheckoutAberto(false)} style={estilos.btnCancelarCheckout}>Cancelar</button>
              </>
            )}

            {etapaCheckout === 'pix' && (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 10 }}>Pague com PIX</h2>
                <p style={{ fontSize: 14, color: '#65676b', marginBottom: 20 }}>
                  Escaneie o QR Code ou copie o código abaixo. <br/>Valor: <strong>
                    {planoSelecionado === 1 ? 'R$ 9,90' : planoSelecionado === 2 ? 'R$ 14,90' : planoSelecionado === 3 ? 'R$ 19,90' : planoSelecionado === 4 ? `R$ ${(qtdPacotes * 9.90).toFixed(2).replace('.', ',')}` : 'R$ 49,90'}
                  </strong>
                </p>

                <div style={{ ...estilos.boxQrCodeFake, padding: 10 }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(chavePixDemo)}`} alt="QR Code PIX" style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                </div>

                <div style={{ marginTop: 20, textAlign: 'left' }}>
                  <label style={estilos.labelSimples}>PIX Copia e Cola:</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value="00020126360014BR.GOV.BCB.PIX..." readOnly style={estilos.inputBorda} />
                    <button style={{ ...estilos.btnEnviarAppDirect, padding: '0 16px' }} onClick={() => alert('Código PIX copiado com sucesso!')}>Copiar</button>
                  </div>
                </div>

                <div style={{ marginTop: 30, borderTop: '1px dashed #e5e7eb', paddingTop: 20 }}>
                   <button style={{ ...estilos.btnVerdeGenerico, width: '100%', marginTop: 0 }} onClick={async () => {
                     if (motivoCheckout === 'limite') {
                        if (planoSelecionado === 5) {
                           await supabase.from('profiles').update({ is_pro: true }).eq('id', usuarioAtual.id);
                           setUsuarioAtual({...usuarioAtual, is_pro: true});
                        } else if (planoSelecionado === 4) {
                           const novoLimite = (usuarioAtual.limite_anuncios ?? 3) + (qtdPacotes * 3);
                           await supabase.from('profiles').update({ limite_anuncios: novoLimite }).eq('id', usuarioAtual.id);
                           setUsuarioAtual({...usuarioAtual, limite_anuncios: novoLimite});
                        }
                     }
                     setEtapaCheckout('sucesso');
                   }}>
                     (Demo) Simular Pagamento Aprovado
                   </button>
                </div>
              </div>
            )}

            {etapaCheckout === 'sucesso' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <span style={{ fontSize: 60 }}>🎉</span>
                <h2 style={{ fontSize: 22, fontWeight: '900', color: '#008C3A', margin: '10px 0' }}>Pagamento Confirmado!</h2>
                <p style={{ fontSize: 14, color: '#65676b', marginBottom: 30 }}>
                  {motivoCheckout === 'turbinar' 
                    ? 'Seu anúncio foi turbinado e já está aparecendo no destaque VIP.'
                    : motivoCheckout === 'limite' && planoSelecionado === 4 
                      ? `Você ganhou +${qtdPacotes * 3} vagas! Seu anúncio está liberado para publicação.`
                      : motivoCheckout === 'limite' && planoSelecionado === 5
                        ? `Você virou Lojista PRO! Seus anúncios agora são ilimitados.`
                        : 'Sua taxa foi paga e seu anúncio está liberado para publicação!'}
                </p>
                <button 
                  style={estilos.btnAvancarPrevia} 
                  onClick={() => { 
                    setModalCheckoutAberto(false); 
                    setEtapaCheckout('planos');
                    if (motivoCheckout === 'turbinar') {
                      setTelaAtiva('feed'); 
                    } else {
                      executarPublicacao();
                    }
                  }}
                >
                  {motivoCheckout === 'turbinar' ? 'Voltar para o Início' : 'Publicar Anúncio Agora'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL DETALHES DO PRODUTO */}
      {anuncioDetalhes && (
        <div style={estilos.fundoModalDetalhes}>
          <div style={estilos.caixaModalDetalhes}>
            <button style={estilos.btnVoltarDetalhes} onClick={() => setAnuncioDetalhes(null)}>✕</button>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              <div style={estilos.boxGaleriaGrande} onTouchStart={e => touchStartX.current = e.touches[0].clientX} onTouchEnd={(e) => {
                const diff = (touchStartX.current || 0) - e.changedTouches[0].clientX
                const total = anuncioDetalhes.fotos?.length || 1
                if (diff > 40 && fotoIndexAtiva < total - 1) setFotoIndexAtiva(f => f + 1)
                else if (diff < -40 && fotoIndexAtiva > 0) setFotoIndexAtiva(f => f - 1)
                touchStartX.current = null
              }}>
                <img src={(anuncioDetalhes.fotos && anuncioDetalhes.fotos[fotoIndexAtiva]) || anuncioDetalhes.foto_url || anuncioDetalhes.midiaUrl} alt="" style={estilos.imgGaleriaGrande} />
                {anuncioDetalhes.fotos?.length > 1 && (
                  <div style={estilos.indicadoresFotos}>
                    {anuncioDetalhes.fotos.map((_: any, idx: number) => (
                      <span key={idx} style={{ width: fotoIndexAtiva === idx ? 10 : 6, height: fotoIndexAtiva === idx ? 10 : 6, borderRadius: '50%', background: fotoIndexAtiva === idx ? '#008C3A' : '#ffffff88' }} />
                    ))}
                  </div>
                )}
              </div>
              <div style={{ padding: 16 }}>
                <h1 style={{ fontSize: 22, fontWeight: '900', color: '#111', margin: 0 }}>{anuncioDetalhes.titulo}</h1>
                <strong style={{ fontSize: 24, color: '#008C3A', fontWeight: '900', display: 'block', margin: '8px 0 4px 0' }}>
                  R$ {Number(anuncioDetalhes.preco || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                </strong>

                {/* REPUTAÇÃO DO VENDEDOR NO ANÚNCIO */}
                <div 
                  onClick={() => router.push(`/perfil?id=${anuncioDetalhes.autor?.id || anuncioDetalhes.usuario_id}`)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fffbeb', border: '1px solid #fde68a', padding: '4px 10px', borderRadius: 16, cursor: 'pointer', marginBottom: 10 }}
                >
                  <span style={{ fontSize: 12, color: '#b45309', fontWeight: 'bold' }}>⭐ 4.9 (Vendedor Avaliado)</span>
                  <span style={{ fontSize: 11, color: '#008C3A', textDecoration: 'underline' }}>Ver perfil</span>
                </div>

                <span style={{ fontSize: 13, color: '#65676b', display: 'block' }}>
                  📍 {anuncioDetalhes.bairro ? `${anuncioDetalhes.bairro}, ` : ''}{anuncioDetalhes.cidade || cidadeUsuario} - {anuncioDetalhes.estado || estadoUsuario}
                </span>
              </div>
              
              <div style={estilos.boxEnvioContato}>
                
                {/* GERENCIADOR SE FOR O DONO */}
                {usuarioAtual?.id && (anuncioDetalhes.usuario_id === usuarioAtual.id || anuncioDetalhes.autor?.id === usuarioAtual.id) ? (
                  <div style={{ padding: '10px 0' }}>
                    <strong style={{ fontSize: 15, color: '#111', display: 'block', marginBottom: 12, textAlign: 'center' }}>Gerenciar Anúncio</strong>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <button style={{ ...estilos.btnTurbinarAnuncio, marginTop: 0 }} onClick={() => { setAnuncioDetalhes(null); abrirCheckoutTurbinar(); }}>
                        🚀 Turbinar Anúncio
                      </button>
                      
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button style={{ flex: 1, background: '#f0f2f5', color: '#111', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer', fontSize: 14 }} onClick={() => abrirEdicaoAnuncio(anuncioDetalhes)}>
                          ✏️ Editar
                        </button>
                        <button style={{ flex: 1, background: '#fee2e2', color: '#ef4444', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer', fontSize: 14 }} onClick={() => apagarMeuAnuncio(anuncioDetalhes.id)}>
                          🗑️ Apagar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <button 
                      onClick={() => {
                        if (!usuarioAtual?.id) return alert('Faça login para comprar!')
                        setEtapaCompra('resumo')
                        setModalCompraAberto(true)
                      }} 
                      style={{ ...estilos.btnWhatsAppGrande, background: '#111', marginBottom: 16 }}
                    >
                      💳 Comprar pelo App (Pagamento Seguro)
                    </button>

                    <strong style={{ fontSize: 13, color: '#111', display: 'block', marginBottom: 8 }}>💬 Falar com Vendedor</strong>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input type="text" value={msgAppPersonalizada} onChange={e => setMsgAppPersonalizada(e.target.value)} style={estilos.inputBorda} />
                      <button onClick={enviarMensagemNoApp} disabled={enviandoChatApp} style={estilos.btnEnviarAppDirect}>Enviar</button>
                    </div>
                    <div style={{ borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />
                    <button onClick={() => {
                      const num = anuncioDetalhes.whatsapp?.replace(/\D/g, '')
                      window.open(`https://api.whatsapp.com/send?phone=55${num}&text=${encodeURIComponent('Opa! Vi seu anúncio: '+anuncioDetalhes.titulo)}`, '_blank')
                    }} style={estilos.btnWhatsAppGrande}>🟢 WhatsApp</button>
                  </>
                )}

              </div>
              <div style={{ padding: 16 }}>
                <strong style={{ fontSize: 15, display: 'block', marginBottom: 6 }}>Descrição</strong>
                <p style={{ fontSize: 14, color: '#333', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{anuncioDetalhes.descricao}</p>
              </div>

              {/* MAPA E BOTÃO DE DENÚNCIA (PASSO 3) */}
              {(!usuarioAtual?.id || (anuncioDetalhes.usuario_id !== usuarioAtual?.id && anuncioDetalhes.autor?.id !== usuarioAtual?.id)) && (
                <div style={{ padding: '0 16px 24px 16px' }}>
                  <strong style={{ fontSize: 15, display: 'block', marginBottom: 8, color: '#111' }}>📍 Região do Vendedor</strong>
                  <div style={{ width: '100%', height: 180, borderRadius: 12, overflow: 'hidden', border: '1px solid #e5e7eb', background: '#f0f2f5' }}>
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(
                        (anuncioDetalhes.bairro ? anuncioDetalhes.bairro + ', ' : '') + 
                        (anuncioDetalhes.cidade || 'Brasília') + ' - ' + 
                        (anuncioDetalhes.estado || 'DF')
                      )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                      allowFullScreen
                    ></iframe>
                  </div>
                  <p style={{ fontSize: 12, color: '#65676b', marginTop: 8 }}>
                    Localização: {anuncioDetalhes.bairro ? `${anuncioDetalhes.bairro}, ` : ''}{anuncioDetalhes.cidade || 'Brasília'} - {anuncioDetalhes.estado || 'DF'}.
                  </p>

                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
                    <button 
                      onClick={() => setModalDenunciaAberto(true)} 
                      style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: 13, fontWeight: 'bold', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      🚩 Denunciar este anúncio
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL DE DENÚNCIA (PASSO 3) ================= */}
      {modalDenunciaAberto && (
        <div style={estilos.fundoModalFiltro} onClick={() => setModalDenunciaAberto(false)}>
          <div style={estilos.caixaModalCheckout} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 40 }}>🚩</span>
              <h2 style={{ fontSize: 18, fontWeight: '900', color: '#111', margin: '10px 0 4px 0' }}>Denunciar Anúncio</h2>
              <p style={{ fontSize: 13, color: '#65676b', margin: 0 }}>O que há de errado com este item?</p>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {['Suspeita de Golpe', 'Produto Falso/Proibido', 'Fotos Inadequadas', 'Preço Falso / Abusivo', 'Outros'].map((motivo) => (
                <label key={motivo} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: motivoDenuncia === motivo ? '#fee2e2' : '#f8f9fa', border: motivoDenuncia === motivo ? '1px solid #ef4444' : '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="motivo_denuncia" 
                    value={motivo} 
                    checked={motivoDenuncia === motivo} 
                    onChange={() => setMotivoDenuncia(motivo)} 
                    style={{ accentColor: '#ef4444' }} 
                  />
                  <span style={{ fontSize: 14, color: motivoDenuncia === motivo ? '#ef4444' : '#111', fontWeight: motivoDenuncia === motivo ? 'bold' : 'normal' }}>{motivo}</span>
                </label>
              ))}
            </div>

            <textarea 
              placeholder="Detalhes adicionais (opcional)..." 
              value={comentarioDenuncia} 
              onChange={e => setComentarioDenuncia(e.target.value)} 
              style={{ width: '100%', height: 60, padding: 10, borderRadius: 8, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', resize: 'none', marginBottom: 16 }} 
            />

            <button 
              onClick={enviarDenuncia} 
              disabled={enviandoDenuncia || !motivoDenuncia} 
              style={{ background: '#ef4444', color: '#fff', width: '100%', border: 'none', padding: '12px', borderRadius: 10, fontWeight: 'bold', fontSize: 14, cursor: 'pointer' }}
            >
              {enviandoDenuncia ? 'Enviando...' : 'Enviar Denúncia'}
            </button>
            <button onClick={() => setModalDenunciaAberto(false)} style={estilos.btnCancelarCheckout}>Cancelar</button>
          </div>
        </div>
      )}

      {/* MENU INFERIOR DE NAVEGAÇÃO */}
      <footer style={estilos.menuInferiorNovo}>
        {navItems.map((item) => {
          const isSelecionada = telaAtiva === item.id;
          return (
            <button 
              key={item.id}
              onClick={() => {
                if (item.id === 'perfil') {
                  router.push('/perfil');
                } else if (item.id === 'feed' && telaAtiva === 'feed') {
                  atualizarFeedVendas(); 
                } else {
                  if (item.id === 'mensagens') {
                    marcarMensagensComoLidas()
                  }
                  setTelaAtiva(item.id as any);
                }
              }} 
              style={estilos.btnTabNova}
            >
              <div style={{ 
                position: 'relative',
                width: 48, 
                height: 48, 
                borderRadius: 16, 
                background: '#ffffff',
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                border: isSelecionada ? '2px solid #008C3A' : '1px solid #f0f2f5',
                boxShadow: isSelecionada 
                  ? '0 0px 0px rgba(0,0,0,0)' 
                  : '0 4px 0px #d1d5db, 0 6px 10px rgba(0,0,0,0.05)', 
                transform: isSelecionada ? 'translateY(4px)' : 'translateY(0px)',
                transition: 'all 0.15s ease-out'
              }}>
                <img 
                  src={item.icone} 
                  alt={item.label} 
                  style={{ 
                    width: 26, 
                    height: 26, 
                    objectFit: 'contain', 
                    filter: isSelecionada ? 'none' : 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))',
                    transition: 'all 0.15s'
                  }} 
                />
                {item.badge && item.badge > 0 ? (
                  <span style={estilos.badgeBolinhaFooter}>{item.badge}</span>
                ) : null}
              </div>
              <span style={{ fontSize: 11, fontWeight: isSelecionada ? '900' : '600', color: isSelecionada ? '#008C3A' : '#65676b', marginTop: 4 }}>
                {item.label}
              </span>
            </button>
          )
        })}
      </footer>

    </div>
  )
}

export default function VendasPage() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', paddingTop: 100 }}>Carregando Vendas BR...</div>}>
      <VendasPageContent />
    </Suspense>
  )
}

const estilos = {
  container: { 
    width: '100%', 
    maxWidth: 500, 
    margin: '0 auto', 
    height: '100vh', 
    background: '#ffffff', 
    display: 'flex', 
    flexDirection: 'column' as const, 
    position: 'relative' as const, 
    overflow: 'hidden',
    paddingTop: '50px'
  },
  headerVendasBR: { padding: '14px 16px', background: '#ffffff', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoBR: { width: 34, height: 34, borderRadius: '50%', background: '#fff', border: '3px solid #008C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFD700', fontWeight: '900' as const, fontSize: 14, boxShadow: '0 0 0 1px #FFD700' },
  badgeNotificacaoHeader: { position: 'absolute' as const, top: -2, right: -2, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 'bold' as const, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' },
  badgeBolinhaFooter: { position: 'absolute' as const, top: -4, right: -4, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 'bold' as const, width: 18, height: 18, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' },
  conteudoScroll: { flex: 1, overflowY: 'auto' as const, paddingBottom: 10, background: '#ffffff' },
  boxBusca: { display: 'flex', alignItems: 'center', gap: 10, background: '#f4f5f7', padding: '12px 16px', borderRadius: 24, border: '1px solid #e5e7eb' },
  inputBusca: { border: 'none', background: 'none', outline: 'none', width: '100%', fontSize: 14, color: '#111' },
  barralocalizacaoPills: { display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto' as const, scrollbarWidth: 'none' as const, msOverflowStyle: 'none' as const },
  btnPillLocal: { border: 'none', padding: '8px 14px', borderRadius: 20, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' as const, transition: 'all 0.15s ease' },
  carrosselCategorias: { display: 'flex', gap: 16, overflowX: 'auto' as const, padding: '16px 14px', margin: '0 -14px', msOverflowStyle: 'none' as const, scrollbarWidth: 'none' as const, WebkitOverflowScrolling: 'touch' as const },
  gridAchados: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  cardAchado: { display: 'flex', flexDirection: 'column' as const, background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb', overflow: 'hidden', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  boxImagemAchado: { position: 'relative' as const, width: '100%', height: 160, background: '#f0f2f5' },
  imgCard: { width: '100%', height: '100%', objectFit: 'cover' as const },
  semFotoCard: { width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888', fontSize: 12 },
  btnCoracao: { position: 'absolute' as const, top: 8, right: 8, background: '#fff', border: 'none', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, boxShadow: '0 2px 4px rgba(0,0,0,0.1)', cursor: 'pointer' },
  overlayPrecoImagem: { position: 'absolute' as const, bottom: 8, left: 8, color: '#fff', fontSize: 16, fontWeight: '900' as const, textShadow: '0 2px 4px rgba(0,0,0,0.8)' },
  rodapeCardAchado: { padding: '10px', display: 'flex', flexDirection: 'column' as const, gap: 4 },
  textoLocalizacao: { fontSize: 12, color: '#111', fontWeight: '600' as const, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' },
  tagRotulo: { fontSize: 11, fontWeight: 'bold' as const, display: 'inline-block', width: 'fit-content', padding: '2px 6px', borderRadius: 6 },
  bannerPatrocinado: { gridColumn: 'span 2', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', borderRadius: 16, padding: '16px', margin: '4px 0', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59,130,246,0.3)', position: 'relative' as const, overflow: 'hidden' },
  tagPatrocinado: { background: '#FFD700', color: '#000', fontSize: 10, fontWeight: '900' as const, padding: '4px 8px', borderRadius: 8, textTransform: 'uppercase' as const },
  btnSaibaMaisDestaque: { background: '#fff', color: '#1e3a8a', border: 'none', padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 'bold' as const, width: 'fit-content' },
  btnTurbinarAnuncio: { width: '100%', background: '#fff', border: '2px solid #FFD700', color: '#b45309', padding: '10px', borderRadius: 12, fontWeight: 'bold' as const, fontSize: 13, cursor: 'pointer' },
  labelSimples: { fontSize: 13, fontWeight: 'bold' as const, color: '#111', display: 'block', marginBottom: 6 },
  inputBorda: { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', background: '#f8f9fa' },
  boxUploadMultiplo: { width: '100%', padding: 14, background: '#e6f4ea', border: '1px dashed #008C3A', borderRadius: 12, color: '#008C3A', fontWeight: 'bold' as const, textAlign: 'center' as const, cursor: 'pointer' },
  gridPreviews: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 10 },
  itemPreviewFoto: { position: 'relative' as const, height: 60, borderRadius: 8, overflow: 'hidden' },
  imgPreviewItem: { width: '100%', height: 100, objectFit: 'cover' as const },
  btnRemoverFoto: { position: 'absolute' as const, top: 2, right: 2, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 18, height: 18, fontSize: 10, cursor: 'pointer' },
  btnAvancarPrevia: { background: '#008C3A', color: '#ffffff', border: 'none', padding: '14px', borderRadius: 12, fontWeight: '900' as const, fontSize: 15, cursor: 'pointer', marginTop: 10, width: '100%' },
  btnVerdeGenerico: { background: '#008C3A', color: '#fff', border: 'none', padding: '10px 18px', borderRadius: 16, fontWeight: 'bold' as const, marginTop: 12, cursor: 'pointer', fontSize: 13 },
  fundoModalFiltro: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.65)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 },
  caixaModalCheckout: { width: '100%', maxWidth: 400, background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' },
  cardPlano: { padding: '14px 16px', borderRadius: 14, border: '2px solid', cursor: 'pointer', transition: 'all 0.2s' },
  btnPixPagamento: { background: '#32bc9b', color: '#fff', width: '100%', border: 'none', padding: '14px', borderRadius: 12, fontWeight: '900' as const, fontSize: 16, marginTop: 20, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center' },
  btnCancelarCheckout: { background: 'none', border: 'none', color: '#888', fontSize: 13, width: '100%', marginTop: 14, cursor: 'pointer', fontWeight: 'bold' as const },
  boxQrCodeFake: { width: 160, height: 160, background: '#f8f9fa', border: '2px dashed #d1d5db', margin: '0 auto', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50 },
  fundoModalDetalhes: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: '#ffffff', zIndex: 99999, display: 'flex', justifyContent: 'center' },
  caixaModalDetalhes: { width: '100%', maxWidth: 500, height: '100vh', display: 'flex', flexDirection: 'column' as const, background: '#ffffff' },
  topoModalDetalhes: { position: 'absolute' as const, top: 10, left: 10, zIndex: 50 },
  btnVoltarDetalhes: { background: 'rgba(0, 0, 0, 0.6)', color: '#fff', border: 'none', width: 36, height: 36, borderRadius: '50%', fontSize: 18, fontWeight: 'bold' as const, cursor: 'pointer' },
  boxGaleriaGrande: { width: '100%', height: 360, background: '#000', position: 'relative' as const },
  imgGaleriaGrande: { width: '100%', height: '100%', objectFit: 'cover' as const },
  indicadoresFotos: { position: 'absolute' as const, bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 },
  boxEnvioContato: { margin: '0 16px', padding: 16, borderRadius: 16, background: '#f8f9fa', border: '1px solid #e5e7eb' },
  btnEnviarAppDirect: { background: '#008C3A', color: '#fff', border: 'none', padding: '0 16px', borderRadius: 12, fontWeight: 'bold' as const, cursor: 'pointer' },
  btnWhatsAppGrande: { width: '100%', background: '#25D366', color: '#ffffff', border: 'none', padding: '14px', borderRadius: 12, fontWeight: '900' as const, fontSize: 14, cursor: 'pointer' },
  // 🟢 COMO DEVE FICAR (Corrigido)
menuInferiorNovo: { 
  height: 65, 
  background: '#ffffff', 
  borderTop: '1px solid #e5e7eb', 
  display: 'flex', 
  justifyContent: 'space-around', 
  alignItems: 'center', 
  zIndex: 40, 
  paddingBottom: 4 
},
  btnTabNova: { background: 'none', border: 'none', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 0, cursor: 'pointer', padding: 0 },
  statusBox: { textAlign: 'center' as const, padding: '40px 20px', color: '#65676b', fontSize: 14 }
}