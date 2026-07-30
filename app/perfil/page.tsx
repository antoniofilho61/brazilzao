'use client'

import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'

type Usuario = {
  id: string
  auth_user_id: string | null
  nome: string | null
  username: string | null
  tipo_perfil: string | null
  bio: string | null
  foto_url: string | null
  capa_url: string | null
  cidade: string | null
  estado: string | null
  bairro: string | null
  email: string | null
  is_verificado: boolean | null
  is_pro: boolean | null
  saldo: number | null
  ativo: boolean | null
  cidade_natal: string | null
  cidade_atual: string | null
  data_nascimento: string | null
  seguidores_count: number | null
  seguindo_count: number | null
}

type PostPerfil = {
  id: string
  conteudo: any
  created_at: string
  visibilidade: string | null
}

type TransacaoCarteira = {
  id: string
  tipo: 'entrada' | 'saida'
  descricao: string
  valor: number
  data: string
  status: 'concluido' | 'pendente'
}

type Avaliacao = {
  id: string
  avaliador_nome: string
  nota: number
  comentario: string
  created_at: string
}

function ConteudoPerfil() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fotoRef = useRef<HTMLInputElement | null>(null)

  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [meuUsuarioId, setMeuUsuarioId] = useState<string | null>(null)
  const [postsPerfil, setPostsPerfil] = useState<PostPerfil[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [perfilEhMeu, setPerfilEhMeu] = useState(false)
  const [estouSeguindo, setEstouSeguindo] = useState(false)
  const [processandoSeguir, setProcessandoSeguir] = useState(false)

  const [nome, setNome] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [cidadeNatal, setCidadeNatal] = useState('')
  const [cidadeAtual, setCidadeAtual] = useState('')
  const [dataNascimento, setDataNascimento] = useState('')
  const [tipoPerfil, setTipoPerfil] = useState('pessoal')

  // === ESTADOS DO CHECKOUT ===
  const [modalCheckoutAberto, setModalCheckoutAberto] = useState(false)
  const [etapaCheckout, setEtapaCheckout] = useState<'detalhes' | 'pix' | 'sucesso'>('detalhes')
  const [produtoSelecionado, setProdutoSelecionado] = useState<'pro' | 'verificado' | null>(null)
  const chavePixDemo = "00020126360014BR.GOV.BCB.PIX0114+55619999999995204000053039865802BR5902BR60049.906208BRASILIA6304000063041A2B"

  // === ESTADOS DA CARTEIRA E EXTRATO ===
  const [modalSaqueAberto, setModalSaqueAberto] = useState(false)
  const [chavePixSaque, setChavePixSaque] = useState('')
  const [valorSaque, setValorSaque] = useState('')
  const [extratoCarteira, setExtratoCarteira] = useState<TransacaoCarteira[]>([])
  
  // PASSO 4: ESTADO DO COMPROVANTE DE SAQUE
  const [comprovanteSaque, setComprovanteSaque] = useState<{valor: number, chavePix: string, dataHora: string, txId: string} | null>(null)

  // === ESTADOS DE AVALIAÇÃO E REPUTAÇÃO (PASSO 1) ===
  const [modalAvaliacoesAberto, setModalAvaliacoesAberto] = useState(false)
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([])
  const [mediaNota, setMediaNota] = useState(5.0)
  const [novaNota, setNovaNota] = useState(5)
  const [novoComentario, setNovoComentario] = useState('')
  const [enviandoAvaliacao, setEnviandoAvaliacao] = useState(false)

  const carregarPostsPerfil = useCallback(async (usuarioId: string) => {
    const { data, error } = await supabase
      .from('feed_posts')
      .select('id, conteudo, created_at, visibilidade')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Erro ao carregar posts do perfil:', error)
      return
    }

    // FILTRO: Puxa apenas postagens sociais e oculta vendas, mensagens e saques da carteira
    const apenasPostsSociais = (data ?? []).filter((post: any) => {
      const tipo = post.conteudo?.tipoPost || post.conteudo?.tipo
      return tipo !== 'venda' && tipo !== 'mensagem_direta' && tipo !== 'saque_pix' && tipo !== 'avaliacao_vendedor' && post.conteudo?.preco === undefined
    })

    setPostsPerfil(apenasPostsSociais)
  }, [])

  const carregarAvaliacoes = useCallback(async (vendedorId: string) => {
    try {
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('usuario_id', vendedorId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        const listaAvaliacoes: Avaliacao[] = data
          .filter((p: any) => p.conteudo?.tipoPost === 'avaliacao_vendedor')
          .map((p: any) => ({
            id: p.id,
            avaliador_nome: p.conteudo.avaliador_nome || 'Comprador Anônimo',
            nota: p.conteudo.nota || 5,
            comentario: p.conteudo.comentario || '',
            created_at: p.created_at
          }))

        setAvaliacoes(listaAvaliacoes)

        if (listaAvaliacoes.length > 0) {
          const soma = listaAvaliacoes.reduce((acc, item) => acc + item.nota, 0)
          setMediaNota(Number((soma / listaAvaliacoes.length).toFixed(1)))
        } else {
          setMediaNota(5.0) // Nota Padrão
        }
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  const carregarExtratoCarteira = useCallback(async (usuarioId: string) => {
    try {
      const { data, error } = await supabase
        .from('feed_posts')
        .select('*')
        .eq('usuario_id', usuarioId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        const transacoes: TransacaoCarteira[] = []
        
        data.forEach((item: any) => {
          if (item.conteudo?.tipoPost === 'venda_realizada' || item.conteudo?.tipo === 'venda_realizada') {
            transacoes.push({
              id: item.id,
              tipo: 'entrada',
              descricao: `Venda: ${item.conteudo.titulo || 'Produto no Vendas BR'}`,
              valor: Number(item.conteudo.preco || item.conteudo.valor || 0),
              data: item.created_at,
              status: 'concluido'
            })
          }
          if (item.conteudo?.tipoPost === 'saque_pix') {
            transacoes.push({
              id: item.id,
              tipo: 'saida',
              descricao: `Saque PIX (${item.conteudo.chavePix})`,
              valor: Number(item.conteudo.valor || 0),
              data: item.created_at,
              status: 'concluido'
            })
          }
        })

        setExtratoCarteira(transacoes)
      }
    } catch (e) {
      console.error('Erro ao carregar extrato:', e)
    }
  }, [])

  const atualizarContadoresSeguidores = useCallback(async (perfilId: string) => {
    try {
      const { count: totalSeguidores } = await supabase
        .from('seguidores')
        .select('id', { count: 'exact', head: true })
        .eq('seguido_id', perfilId)

      const { count: totalSeguindo } = await supabase
        .from('seguidores')
        .select('id', { count: 'exact', head: true })
        .eq('seguidor_id', perfilId)

      setUsuario(prev => prev ? {
        ...prev,
        seguidores_count: totalSeguidores ?? 0,
        seguindo_count: totalSeguindo ?? 0
      } : null)
    } catch (e) {
      console.error(e)
    }
  }, [])

  const verificarSeSeguindo = useCallback(async (meuId: string, perfilId: string) => {
    try {
      const { data } = await supabase
        .from('seguidores')
        .select('id')
        .eq('seguidor_id', meuId)
        .eq('seguido_id', perfilId)
        .maybeSingle()

      setEstouSeguindo(!!data)
      await atualizarContadoresSeguidores(perfilId)
    } catch (e) {
      console.error(e)
    }
  }, [atualizarContadoresSeguidores])

  const carregarPerfil = useCallback(async () => {
    try {
      const { data: sessao } = await supabase.auth.getSession()
      if (!sessao.session?.user) {
        router.replace('/login')
        return
      }

      const authUserId = sessao.session.user.id
      setMeuUsuarioId(authUserId)

      const idPerfilUrl = searchParams.get('id') || searchParams.get('para')
      let consulta = supabase.from('profiles').select('*')

      if (idPerfilUrl && idPerfilUrl !== 'undefined' && idPerfilUrl !== 'null') {
        consulta = consulta.eq('id', idPerfilUrl)
      } else {
        consulta = consulta.eq('id', authUserId)
      }

      const { data, error } = await consulta.single()

      if (error || !data) {
        console.error('Erro ao carregar perfil:', error)
        alert('Perfil não encontrado.')
        router.push('/vendas')
        return
      }

      const ehMeuPerfil = data.id === authUserId
      setPerfilEhMeu(ehMeuPerfil)
      setUsuario(data)

      if (!ehMeuPerfil) {
        verificarSeSeguindo(authUserId, data.id)
      } else {
        await atualizarContadoresSeguidores(data.id)
        await carregarExtratoCarteira(data.id)
      }

      setNome(data.nome ?? '')
      setUsername(data.username ?? '')
      setBio(data.bio ?? '')
      setCidadeNatal(data.cidade_natal ?? data.cidade ?? '')
      setCidadeAtual(data.cidade_atual ?? data.cidade ?? '')
      setDataNascimento(data.data_nascimento ?? '')
      setTipoPerfil(data.tipo_perfil ?? 'pessoal')

      await carregarPostsPerfil(data.id)
      await carregarAvaliacoes(data.id)
    } catch (err) {
      console.error('Erro geral ao carregar perfil:', err)
    } finally {
      setCarregando(false)
    }
  }, [router, searchParams, carregarPostsPerfil, verificarSeSeguindo, atualizarContadoresSeguidores, carregarExtratoCarteira, carregarAvaliacoes])

  useEffect(() => {
    carregarPerfil()
  }, [carregarPerfil])

  const alternarSeguir = async () => {
    if (!meuUsuarioId || !usuario || processandoSeguir) return
    setProcessandoSeguir(true)

    try {
      if (estouSeguindo) {
        const { error } = await supabase
          .from('seguidores')
          .delete()
          .eq('seguidor_id', meuUsuarioId)
          .eq('seguido_id', usuario.id)

        if (!error) {
          setEstouSeguindo(false)
          await atualizarContadoresSeguidores(usuario.id)
        } else {
          alert('Erro ao deixar de seguir: ' + error.message)
        }
      } else {
        const { error } = await supabase
          .from('seguidores')
          .insert({
            seguidor_id: meuUsuarioId,
            seguido_id: usuario.id
          })

        if (!error) {
          setEstouSeguindo(true)
          await atualizarContadoresSeguidores(usuario.id)
        } else {
          alert('Erro ao seguir: ' + error.message)
        }
      }
    } catch (err) {
      console.error('Erro ao alternar seguir:', err)
    } finally {
      setProcessandoSeguir(false)
    }
  }

  const enviarMensagem = async () => {
    if (!meuUsuarioId || !usuario) return
    let idDaConversa = null

    const { data: conv1 } = await supabase.from('conversas').select('id').eq('usuario_1', meuUsuarioId).eq('usuario_2', usuario.id).maybeSingle()
    if (conv1?.id) { idDaConversa = conv1.id } else {
      const { data: conv2 } = await supabase.from('conversas').select('id').eq('usuario_1', usuario.id).eq('usuario_2', meuUsuarioId).maybeSingle()
      if (conv2?.id) { idDaConversa = conv2.id }
    }

    if (!idDaConversa) {
      const { data: novaConversa, error: erroConversa } = await supabase.from('conversas').insert({ usuario_1: meuUsuarioId, usuario_2: usuario.id, criado_em: new Date().toISOString() }).select('id').single()
      if (erroConversa) { alert('Erro ao criar conversa: ' + erroConversa.message); return }
      idDaConversa = novaConversa.id
    }

    const texto = prompt(`Enviar mensagem para ${usuario.nome}:`)
    if (!texto || !texto.trim()) return

    const { error } = await supabase.from('mensagens').insert({ conversa_id: idDaConversa, remetente_id: meuUsuarioId, destinatario_id: usuario.id, texto: texto.trim(), lida: false, criado_em: new Date().toISOString() })
    if (!error) { alert('Mensagem enviada com sucesso!') } else { alert('Erro ao enviar mensagem: ' + error.message) }
  }

  function limparUsername(texto: string) {
    return texto.toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9._]/g, '')
  }

  function calcularIdade(data: string | null) {
    if (!data) return 'Não informado'
    const nascimento = new Date(data)
    const hoje = new Date()
    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const mes = hoje.getMonth() - nascimento.getMonth()
    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) { idade-- }
    return `${idade} anos`
  }

  async function salvarPerfil() {
    if (!usuario) return
    if (!perfilEhMeu) { alert('Você não pode editar o perfil de outro usuário.'); return }
    if (!nome.trim()) { alert('Digite seu nome.'); return }
    if (!username.trim()) { alert('Digite seu nome de usuário.'); return }

    const usernameLimpo = limparUsername(username)
    setSalvando(true)

    try {
      const { data: usuarioExistente } = await supabase.from('profiles').select('id').eq('username', usernameLimpo).neq('id', usuario.id).maybeSingle()
      if (usuarioExistente) { setSalvando(false); alert('Esse nome de usuário já está em uso.'); return }

      const { data, error } = await supabase.from('profiles').update({
        nome: nome.trim(), username: usernameLimpo, bio: bio.trim(), cidade_natal: cidadeNatal.trim() || null, cidade: cidadeAtual.trim() || null, data_nascimento: dataNascimento || null, tipo_perfil: tipoPerfil,
      }).eq('id', usuario.id).select().single()

      if (error) { console.error('Erro ao salvar perfil:', error); alert('Erro ao salvar perfil.'); return }

      setUsuario(data)
      setEditando(false)
      alert('Perfil atualizado com sucesso!')
    } catch (err) { console.error(err) } finally { setSalvando(false) }
  }

  function cancelarEdicao() {
    if (usuario) {
      setNome(usuario.nome ?? '')
      setUsername(usuario.username ?? '')
      setBio(usuario.bio ?? '')
      setCidadeNatal(usuario.cidade_natal ?? '')
      setCidadeAtual(usuario.cidade_atual ?? usuario.cidade ?? '')
      setDataNascimento(usuario.data_nascimento ?? '')
      setTipoPerfil(usuario.tipo_perfil ?? 'pessoal')
    }
    setEditando(false)
  }

  async function enviarImagemPerfil(arquivo: File, tipo: 'foto' | 'capa') {
    if (!usuario) { alert('Usuário não carregado.'); return }
    if (!perfilEhMeu) { alert('Você não pode alterar imagem de outro usuário.'); return }
    if (arquivo.size > 5 * 1024 * 1024) { alert('O arquivo é muito grande! Escolha uma imagem de até 5MB.'); return }

    try {
      const extensao = arquivo.name.split('.').pop()
      const nomeArquivo = `${usuario.id}/${tipo}-${Date.now()}.${extensao}`

      const { error: erroUpload } = await supabase.storage.from('perfis').upload(nomeArquivo, arquivo, { cacheControl: '3600', upsert: true })
      if (erroUpload) { console.error('Erro no upload:', erroUpload); alert('Erro ao enviar imagem: ' + erroUpload.message); return }

      const { data: urlData } = supabase.storage.from('perfis').getPublicUrl(nomeArquivo)
      const novaUrl = urlData.publicUrl

      const campoAtualizar = tipo === 'foto' ? { foto_url: novaUrl } : { capa_url: novaUrl }

      const { data, error } = await supabase.from('profiles').update(campoAtualizar).eq('id', usuario.id).select().single()
      if (error) { console.error(`Erro ao salvar ${tipo}_url:`, error); alert(`Erro ao salvar ${tipo}: ` + error.message); return }

      setUsuario(data)
      alert(tipo === 'foto' ? 'Foto atualizada!' : 'Capa atualizada!')
    } catch (erro) { console.error('Erro geral imagem:', erro); alert('Erro ao atualizar imagem.') }
  }

  async function sairDaConta() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // === FUNÇÕES DE CHECKOUT E SAQUE ===
  const abrirCheckout = (produto: 'pro' | 'verificado') => {
    setProdutoSelecionado(produto)
    setEtapaCheckout('detalhes')
    setModalCheckoutAberto(true)
  }

  const simularPagamentoSucesso = async () => {
    if (usuario) {
      const atualizacao = produtoSelecionado === 'pro' ? { is_pro: true } : { is_verificado: true }
      await supabase.from('profiles').update(atualizacao).eq('id', usuario.id)
      setUsuario(prev => prev ? { ...prev, ...atualizacao } : null)
    }
    setEtapaCheckout('sucesso')
  }

  // PASSO 4: FUNÇÃO DE SAQUE COM COMPROVANTE VISUAL
  const handleSolicitarSaque = async () => {
    const saldoAtual = Number(usuario?.saldo || 0)

    if (saldoAtual <= 0) {
      return alert('Você não tem saldo suficiente para sacar no momento.')
    }
    if (!chavePixSaque.trim()) {
      return alert('Por favor, informe sua chave PIX.')
    }
    
    const valorNum = Number(valorSaque)
    if (!valorSaque || valorNum <= 0 || valorNum > saldoAtual) {
      return alert('Valor de saque inválido ou maior que o saldo disponível.')
    }

    try {
      // 1. Desconta o saldo do usuário no banco de dados
      const novoSaldo = saldoAtual - valorNum
      await supabase.from('profiles').update({ saldo: novoSaldo }).eq('id', usuario!.id)
      setUsuario(prev => prev ? { ...prev, saldo: novoSaldo } : null)

      // 2. Cria identificadores da transação (Protocolo e Data)
      const txId = `TX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`
      const dataHora = new Date().toLocaleString('pt-BR')

      // 3. Salva o registro de saída no Extrato (feed_posts)
      await supabase.from('feed_posts').insert({
        usuario_id: usuario!.id,
        conteudo: {
          tipoPost: 'saque_pix',
          chavePix: chavePixSaque.trim(),
          valor: valorNum,
          txId: txId,
          tempo: new Date().toISOString()
        }
      })

      // 4. Atualiza a lista do extrato visualmente
      await carregarExtratoCarteira(usuario!.id)
      
      // 5. Exibe o Comprovante na Tela e limpa os campos
      setComprovanteSaque({
        valor: valorNum,
        chavePix: chavePixSaque.trim(),
        dataHora: dataHora,
        txId: txId
      })
      setChavePixSaque('')
      setValorSaque('')
      
    } catch (err) {
      console.error(err)
      alert('Erro ao realizar saque.')
    }
  }

  // === ENVIAR NOVA AVALIAÇÃO ===
  const enviarAvaliacao = async () => {
    if (!usuario || !meuUsuarioId || !novoComentario.trim()) return
    setEnviandoAvaliacao(true)

    try {
      const { data: meuPerfil } = await supabase.from('profiles').select('nome').eq('id', meuUsuarioId).single()

      await supabase.from('feed_posts').insert({
        usuario_id: usuario.id,
        conteudo: {
          tipoPost: 'avaliacao_vendedor',
          nota: novaNota,
          comentario: novoComentario.trim(),
          avaliador_id: meuUsuarioId,
          avaliador_nome: meuPerfil?.nome || 'Comprador'
        }
      })

      alert('Avaliação enviada com sucesso!')
      setNovoComentario('')
      await carregarAvaliacoes(usuario.id)
    } catch (e) {
      alert('Erro ao enviar avaliação.')
    } finally {
      setEnviandoAvaliacao(false)
    }
  }

  if (carregando) {
    return (
      <main style={estilos.container}>
        <div style={estilos.carregandoBox}>Carregando perfil...</div>
      </main>
    )
  }

  if (!usuario) return null

  const inicial = usuario.nome?.charAt(0)?.toUpperCase() || 'B'
  const nomeTela = usuario.nome || 'Usuário BRAZILZÃO'
  const usernameTela = usuario.username || 'usuario'
  const capaPerfil = usuario.capa_url || ''
  const fotoPerfil = usuario.foto_url || ''

  return (
    <main style={estilos.container}>
      
      {/* HEADER VENDAS BR */}
      <header style={estilos.headerVendasBR}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={estilos.logoBR}>BR</div>
          <div style={{ display: 'flex', alignItems: 'center', fontSize: 22, fontWeight: '900', color: '#008C3A', letterSpacing: '-0.5px' }}>
            VEND<span style={{ fontSize: 18, margin: '0 -1px' }}>🍃</span>S BR
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {perfilEhMeu && (
            <button onClick={sairDaConta} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 'bold', cursor: 'pointer' }}>
              Sair
            </button>
          )}
        </div>
      </header>

      <section style={estilos.conteudoScroll}>
        <div style={estilos.cardPerfil}>
          <div
            style={{
              ...estilos.capa,
              backgroundImage: capaPerfil ? `url(${capaPerfil})` : 'linear-gradient(135deg, #008C3A, #32bc9b)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {perfilEhMeu && (
              <div style={estilos.botaoEditarCapa}>
                📷 Capa
                <input type="file" accept="image/*" style={estilos.inputCapaInvisivel} onChange={(e) => {
                  const arquivo = e.target.files?.[0]
                  if (arquivo) enviarImagemPerfil(arquivo, 'capa')
                }} />
              </div>
            )}
          </div>

          <div style={estilos.areaAvatar}>
            <div style={estilos.avatar}>
              {fotoPerfil ? (
                <img src={fotoPerfil} alt="Foto de perfil" style={estilos.fotoAvatar} />
              ) : (
                inicial
              )}
            </div>
            {perfilEhMeu && (
              <>
                <button style={estilos.botaoEditarFoto} onClick={() => fotoRef.current?.click()}>
                  ✏️ Mudar Foto
                </button>
                <input ref={fotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
                  const arquivo = e.target.files?.[0]
                  if (arquivo) enviarImagemPerfil(arquivo, 'foto')
                }} />
              </>
            )}
          </div>

          <div style={estilos.conteudoPerfilInfo}>
            {!editando ? (
              <>
                <h2 style={{ ...estilos.nomePerfil, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {nomeTela}
                  {usuario.is_verificado && <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Check%20mark%20button/3D/check_mark_button_3d.png" alt="Verificado" style={{ width: 22, height: 22 }} />}
                  {usuario.is_pro && <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Crown/3D/crown_3d.png" alt="PRO" style={{ width: 24, height: 24 }} />}
                </h2>
                <p style={estilos.usernamePerfil}>@{usernameTela}</p>

                {/* ======================================================= */}
                {/* BARRA DE REPUTAÇÃO E ESTRELAS DO VENDEDOR               */}
                {/* ======================================================= */}
                <div 
                  onClick={() => setModalAvaliacoesAberto(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fffbeb', border: '1px solid #fde68a', padding: '6px 12px', borderRadius: 20, cursor: 'pointer', margin: '6px 0 12px 0' }}
                >
                  <span style={{ fontSize: 14, color: '#b45309', fontWeight: '900' }}>⭐ {mediaNota}</span>
                  <span style={{ fontSize: 12, color: '#b45309' }}>({avaliacoes.length} avaliações)</span>
                  {avaliacoes.length >= 3 && mediaNota >= 4.5 && (
                    <span style={{ background: '#008C3A', color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 10, fontWeight: 'bold', marginLeft: 4 }}>Vendedor Confiável</span>
                  )}
                </div>

                <p style={estilos.bioStyle}>{usuario.bio || 'Trabalhador brasileiro no corre diário.'}</p>

                <div style={estilos.infoGrid}>
                  <div style={estilos.itemInfoPerfil}>
                    <strong style={estilos.numeroInfoPerfil}>{postsPerfil.length}</strong>
                    <span style={estilos.textoInfoPerfil}>Posts</span>
                  </div>
                  <div style={estilos.itemInfoPerfil}>
                    <strong style={estilos.numeroInfoPerfil}>{usuario.seguidores_count ?? 0}</strong>
                    <span style={estilos.textoInfoPerfil}>Seguidores</span>
                  </div>
                  <div style={estilos.itemInfoPerfil}>
                    <strong style={estilos.numeroInfoPerfil}>{usuario.seguindo_count ?? 0}</strong>
                    <span style={estilos.textoInfoPerfil}>Seguindo</span>
                  </div>
                </div>

                <div style={estilos.dadosPessoais}>
                  <h3 style={estilos.tituloDadosPessoais}>Detalhes</h3>
                  <div style={estilos.linhaDadoPessoal}>
                    <span style={estilos.iconeDado}>📍</span>
                    <div style={estilos.textoDadoPessoal}>
                      <strong style={estilos.rotuloDadoPessoal}>Cidade atual</strong>
                      <span>{usuario.cidade_atual || usuario.cidade || 'Não informado'}</span>
                    </div>
                  </div>
                  <div style={estilos.linhaDadoPessoal}>
                    <span style={estilos.iconeDado}>🎂</span>
                    <div style={estilos.textoDadoPessoal}>
                      <strong style={estilos.rotuloDadoPessoal}>Idade</strong>
                      <span>{calcularIdade(usuario.data_nascimento)}</span>
                    </div>
                  </div>
                </div>

                {perfilEhMeu ? (
                  <>
                    <button style={estilos.botaoEditar} onClick={() => setEditando(true)}>
                      ⚙️ Configurar Perfil
                    </button>

                    {/* ACESSO AO PAINEL ADMIN - VISÍVEL APENAS PARA O DONO OFICIAL */}
                    {usuario.username === 'brazilzao_oficial' && (
                      <div style={{ marginTop: 24, textAlign: 'left' }}>
                        <h3 style={estilos.tituloDadosPessoais}>Administração do App</h3>
                        <button 
                          onClick={() => router.push('/admin')} 
                          style={{ width: '100%', padding: '14px', borderRadius: 12, background: '#111', color: '#FFD700', fontWeight: '900', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, fontSize: 15, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                        >
                          <span style={{ fontSize: 20 }}>👑</span> Acessar Painel Admin
                        </button>
                      </div>
                    )}

                    {/* MINHA CARTEIRA COM EXTRATO DE TRANSMISSÕES */}
                    <div style={{ marginTop: 24, textAlign: 'left' }}>
                      <h3 style={estilos.tituloDadosPessoais}>Minha Carteira</h3>
                      <div style={estilos.cardCarteira}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: 13, color: '#65676b' }}>Saldo Liberado</span>
                            <strong style={{ fontSize: 26, color: '#008C3A', display: 'block', marginTop: 4 }}>
                              R$ {Number(usuario.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </strong>
                          </div>
                          <div style={estilos.icone3DBox}>
                            <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Money%20bag/3D/money_bag_3d.png" alt="Dinheiro" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                          </div>
                        </div>

                        <button style={estilos.btnSacar} onClick={() => setModalSaqueAberto(true)}>
                          💸 Solicitar Saque via PIX
                        </button>

                        {/* EXTRATO DETALHADO */}
                        <div style={{ marginTop: 18, borderTop: '1px dashed #e5e7eb', paddingTop: 14 }}>
                          <strong style={{ fontSize: 13, color: '#111', display: 'block', marginBottom: 10 }}>Extrato de Movimentações</strong>
                          {extratoCarteira.length === 0 ? (
                            <p style={{ fontSize: 12, color: '#888', fontStyle: 'italic', margin: 0 }}>Nenhuma movimentação financeira recente.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {extratoCarteira.map((item) => (
                                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8f9fa', padding: '10px 12px', borderRadius: 12, border: '1px solid #f0f2f5' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span style={{ fontSize: 16 }}>{item.tipo === 'entrada' ? '🟢' : '🔴'}</span>
                                    <div>
                                      <strong style={{ fontSize: 12, color: '#111', display: 'block' }}>{item.descricao}</strong>
                                      <span style={{ fontSize: 10, color: '#888' }}>{new Date(item.data).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                  </div>
                                  <strong style={{ fontSize: 13, color: item.tipo === 'entrada' ? '#008C3A' : '#ef4444' }}>
                                    {item.tipo === 'entrada' ? '+' : '-'} R$ {item.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                  </strong>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* AREA DE MONETIZAÇÃO - UPGRADES DA CONTA */}
                    <div style={{ marginTop: 24, textAlign: 'left' }}>
                      <h3 style={estilos.tituloDadosPessoais}>Upgrades da Conta</h3>

                      <div style={estilos.gridUpgrades}>
                        {/* CARD: LOJISTA PRO */}
                        <div style={{ ...estilos.cardUpgrade, borderColor: usuario.is_pro ? '#008C3A' : '#e5e5e5' }}>
                          <div style={estilos.icone3DBox}>
                            <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Crown/3D/crown_3d.png" alt="Coroa" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                          </div>
                          <strong style={{ fontSize: 14, color: '#111', marginTop: 10, display: 'block' }}>Lojista PRO</strong>
                          <p style={{ fontSize: 11, color: '#65676b', margin: '4px 0 14px 0', lineHeight: '1.4' }}>Anúncios ilimitados e destaque nas buscas.</p>
                          {usuario.is_pro ? (
                            <div style={estilos.badgeAtivo}>Plano Ativo</div>
                          ) : (
                            <button onClick={() => abrirCheckout('pro')} style={estilos.btnAssinar}>R$ 49,90 / mês</button>
                          )}
                        </div>

                        {/* CARD: SELO VERIFICADO */}
                        <div style={{ ...estilos.cardUpgrade, borderColor: usuario.is_verificado ? '#0A58CA' : '#e5e5e5' }}>
                          <div style={estilos.icone3DBox}>
                            <img src="https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Check%20mark%20button/3D/check_mark_button_3d.png" alt="Verificado" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                          </div>
                          <strong style={{ fontSize: 14, color: '#111', marginTop: 10, display: 'block' }}>Selo Verificado</strong>
                          <p style={{ fontSize: 11, color: '#65676b', margin: '4px 0 14px 0', lineHeight: '1.4' }}>Passe mais confiança aos compradores.</p>
                          {usuario.is_verificado ? (
                            <div style={{ ...estilos.badgeAtivo, background: '#eff6ff', color: '#0A58CA', border: '1px solid #0A58CA' }}>Selo Ativo</div>
                          ) : (
                            <button onClick={() => abrirCheckout('verificado')} style={{ ...estilos.btnAssinar, background: '#0A58CA' }}>R$ 9,90 / ano</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button
                      style={{ ...estilos.botao, marginTop: 0, background: estouSeguindo ? '#e4e6eb' : '#008C3A', color: estouSeguindo ? '#050505' : '#fff' }}
                      onClick={alternarSeguir}
                      disabled={processandoSeguir}
                    >
                      {estouSeguindo ? 'Seguindo' : 'Seguir'}
                    </button>
                    <button style={{ ...estilos.botaoMensagem, marginTop: 0 }} onClick={enviarMensagem}>
                      Enviar mensagem
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <h2 style={estilos.nomePerfil}>Editar perfil</h2>
                <input style={estilos.inputBorda} placeholder="Nome" value={nome} onChange={(e) => setNome(e.target.value)} />
                <input style={estilos.inputBorda} placeholder="Usuário" value={username} onChange={(e) => setUsername(limparUsername(e.target.value))} />
                <textarea style={estilos.textareaBorda} placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
                <input style={estilos.inputBorda} placeholder="Cidade que nasceu" value={cidadeNatal} onChange={(e) => setCidadeNatal(e.target.value)} />
                <input style={estilos.inputBorda} placeholder="Cidade atual" value={cidadeAtual} onChange={(e) => setCidadeAtual(e.target.value)} />
                <input style={estilos.inputBorda} type="date" value={dataNascimento} onChange={(e) => setDataNascimento(e.target.value)} />

                <select style={estilos.inputBorda} value={tipoPerfil} onChange={(e) => setTipoPerfil(e.target.value)}>
                  <option value="pessoal">Pessoal</option>
                  <option value="comercial">Comercial</option>
                  <option value="criador">Criador de conteúdo</option>
                  <option value="pagina">Página / Projeto</option>
                </select>

                <button style={estilos.botaoSalvarEdit} onClick={salvarPerfil} disabled={salvando}>
                  {salvando ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button style={estilos.botaoCancelar} onClick={cancelarEdicao}>Cancelar</button>
              </>
            )}
          </div>
        </div>

        {/* ÁREA DE POSTAGENS */}
        <section style={estilos.areaPosts}>
          <h2 style={estilos.tituloPosts}>Atividade</h2>
          {perfilEhMeu || estouSeguindo ? (
            <>
              {postsPerfil.length === 0 && (
                <p style={estilos.semPosts}>Ainda não tem postagens neste perfil.</p>
              )}
              {postsPerfil.map((post) => (
                <article key={post.id} style={estilos.postCard}>
                  <div style={estilos.postTopo}>
                    <div style={estilos.miniAvatar}>
                      {fotoPerfil ? <img src={fotoPerfil} alt="Foto" style={estilos.fotoAvatar} /> : inicial}
                    </div>
                    <div>
                      <strong style={{ color: '#111' }}>{nomeTela}</strong>
                      <p style={estilos.postVisibilidade}>
                        {post.visibilidade === 'seguidores' ? '🔒 seguidores' : '🌎 público'}
                      </p>
                    </div>
                  </div>
                  <p style={estilos.textoPost}>
                    {post.conteudo?.texto || post.conteudo?.titulo || 'Publicação sem texto.'}
                  </p>
                  {(post.conteudo?.midiaUrl || post.conteudo?.foto_url) && (
                    <img src={post.conteudo.midiaUrl || post.conteudo.foto_url} alt="Midia do post" style={estilos.midiaPost} />
                  )}
                </article>
              ))}
            </>
          ) : (
            <div style={estilos.cardPrivado}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
              <strong style={{ fontSize: 16, color: '#111', display: 'block', marginBottom: 6 }}>Esta conta é privada</strong>
              <p style={{ fontSize: 13, color: '#65676b', margin: 0, lineHeight: 1.4 }}>
                Siga <strong>@{usernameTela}</strong> para ver as publicações e itens à venda.
              </p>
            </div>
          )}
        </section>
      </section>

      {/* ======================================================= */}
      {/* MODAL DE SAQUE & COMPROVANTE (PASSO 4)                  */}
      {/* ======================================================= */}
      {modalSaqueAberto && (
        <div style={estilos.fundoModalFiltro} onClick={() => { if (!comprovanteSaque) setModalSaqueAberto(false) }}>
          <div style={estilos.caixaModalCheckout} onClick={(e) => e.stopPropagation()}>
            
            {comprovanteSaque ? (
              // TELA 2: COMPROVANTE DE SAQUE VISUAL
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ width: 64, height: 64, background: '#e6f4ea', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <span style={{ fontSize: 32 }}>✅</span>
                </div>
                <h2 style={{ fontSize: 22, fontWeight: '900', color: '#008C3A', margin: '0 0 8px 0' }}>Saque Solicitado!</h2>
                <p style={{ fontSize: 13, color: '#65676b', marginBottom: 20 }}>Sua transferência via PIX está em processamento.</p>
                
                <div style={{ background: '#f8f9fa', borderRadius: 12, border: '1px dashed #d1d5db', padding: 16, textAlign: 'left', marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: '#65676b' }}>Valor Sacado:</span>
                    <strong style={{ fontSize: 16, color: '#111' }}>R$ {comprovanteSaque.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: '#65676b' }}>Chave PIX:</span>
                    <strong style={{ fontSize: 13, color: '#111' }}>{comprovanteSaque.chavePix}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <span style={{ fontSize: 13, color: '#65676b' }}>Data/Hora:</span>
                    <strong style={{ fontSize: 13, color: '#111' }}>{comprovanteSaque.dataHora}</strong>
                  </div>
                  
                  <div style={{ borderTop: '1px solid #e5e7eb', margin: '12px 0' }} />
                  
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#65676b', marginBottom: 4 }}>Código de Autenticação</span>
                    <strong style={{ fontSize: 13, color: '#008C3A', letterSpacing: 1 }}>{comprovanteSaque.txId}</strong>
                  </div>
                </div>

                <button 
                  style={{ background: '#111', color: '#fff', width: '100%', border: 'none', padding: '14px', borderRadius: 12, fontWeight: '900', fontSize: 15, cursor: 'pointer' }} 
                  onClick={() => { setComprovanteSaque(null); setModalSaqueAberto(false) }}
                >
                  Entendi
                </button>
              </div>
            ) : (
              // TELA 1: FORMULÁRIO DE SAQUE (ATUAL)
              <>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <span style={{ fontSize: 40 }}>💰</span>
                  <h2 style={{ fontSize: 20, fontWeight: '900', color: '#111', margin: '10px 0 4px 0' }}>Sacar Saldo</h2>
                  <p style={{ fontSize: 13, color: '#65676b', margin: 0 }}>Transfira o dinheiro das suas vendas para a sua conta bancária via PIX.</p>
                </div>
                <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 12, border: '1px solid #e5e7eb', marginBottom: 20 }}>
                  <span style={{ color: '#65676b', fontSize: 13 }}>Saldo Liberado:</span>
                  <strong style={{ fontSize: 20, color: '#008C3A', display: 'block', marginTop: 2 }}>
                    R$ {Number(usuario?.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={estilos.labelSimples}>Sua Chave PIX</label>
                  <input type="text" placeholder="CPF, E-mail, Celular..." value={chavePixSaque} onChange={e => setChavePixSaque(e.target.value)} style={estilos.inputBorda} />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={estilos.labelSimples}>Valor do Saque (R$)</label>
                  <input type="number" placeholder="0,00" value={valorSaque} onChange={e => setValorSaque(e.target.value)} style={estilos.inputBorda} />
                </div>
                <button style={{ ...estilos.btnPixPagamento, background: '#111' }} onClick={handleSolicitarSaque}>Confirmar Saque</button>
                <button onClick={() => setModalSaqueAberto(false)} style={estilos.btnCancelarCheckout}>Cancelar</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL CHECKOUT PIX (UPGRADES) */}
      {modalCheckoutAberto && (
        <div style={estilos.fundoModalFiltro} onClick={() => setModalCheckoutAberto(false)}>
          <div style={estilos.caixaModalCheckout} onClick={(e) => e.stopPropagation()}>
            {etapaCheckout === 'detalhes' && (
              <>
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <img
                    src={produtoSelecionado === 'pro'
                      ? "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Crown/3D/crown_3d.png"
                      : "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Check%20mark%20button/3D/check_mark_button_3d.png"
                    }
                    alt="Produto" style={{ width: 64, height: 64, margin: '0 auto' }}
                  />
                  <h2 style={{ fontSize: 20, fontWeight: '900', color: '#111', margin: '10px 0 4px 0' }}>
                    {produtoSelecionado === 'pro' ? 'Assinar Lojista PRO' : 'Obter Selo Verificado'}
                  </h2>
                  <p style={{ fontSize: 13, color: '#65676b', margin: 0 }}>
                    {produtoSelecionado === 'pro' ? 'Desbloqueie todo o poder de vendas do aplicativo.' : 'Sua identidade confirmada no Vendas BR.'}
                  </p>
                </div>

                <div style={{ padding: 16, background: '#f8f9fa', borderRadius: 12, border: '1px dashed #d1d5db', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <strong style={{ color: '#111' }}>Total a pagar:</strong>
                  <strong style={{ fontSize: 22, color: produtoSelecionado === 'pro' ? '#008C3A' : '#0A58CA' }}>
                    {produtoSelecionado === 'pro' ? 'R$ 49,90' : 'R$ 9,90'}
                  </strong>
                </div>
                <button style={{ ...estilos.btnPixPagamento, background: produtoSelecionado === 'pro' ? '#008C3A' : '#0A58CA' }} onClick={() => setEtapaCheckout('pix')}>
                  <span style={{ fontSize: 18 }}>💠</span> Pagar com PIX
                </button>
                <button onClick={() => setModalCheckoutAberto(false)} style={estilos.btnCancelarCheckout}>Cancelar</button>
              </>
            )}

            {etapaCheckout === 'pix' && (
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: 20, fontWeight: '900', color: '#111', marginBottom: 10 }}>Pague com PIX</h2>
                <p style={{ fontSize: 14, color: '#65676b', marginBottom: 20 }}>
                  Escaneie o QR Code ou copie o código abaixo.
                </p>
                <div style={{ ...estilos.boxQrCodeFake, padding: 10 }}>
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(chavePixDemo)}`} alt="QR Code PIX" style={{ width: '100%', height: '100%', borderRadius: 8 }} />
                </div>
                <div style={{ marginTop: 20, textAlign: 'left' }}>
                  <label style={{ fontSize: 13, fontWeight: 'bold', color: '#111', display: 'block', marginBottom: 6 }}>PIX Copia e Cola:</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input type="text" value="00020126360014BR.GOV.BCB.PIX..." readOnly style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', background: '#f8f9fa' }} />
                    <button style={{ background: '#111', color: '#fff', border: 'none', padding: '0 16px', borderRadius: 12, fontWeight: 'bold', cursor: 'pointer' }} onClick={() => alert('Código PIX copiado com sucesso!')}>Copiar</button>
                  </div>
                </div>
                <div style={{ marginTop: 30, borderTop: '1px dashed #e5e7eb', paddingTop: 20 }}>
                   <button style={{ background: '#008C3A', color: '#fff', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 'bold', width: '100%', cursor: 'pointer' }} onClick={simularPagamentoSucesso}>
                     (Demo) Simular Pagamento Aprovado
                   </button>
                </div>
              </div>
            )}

            {etapaCheckout === 'sucesso' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <span style={{ fontSize: 60 }}>🎉</span>
                <h2 style={{ fontSize: 22, fontWeight: '900', color: '#008C3A', margin: '10px 0' }}>Upgrade Confirmado!</h2>
                <p style={{ fontSize: 14, color: '#65676b', marginBottom: 30 }}>
                  {produtoSelecionado === 'pro'
                    ? 'Parabéns! Sua conta agora é Lojista PRO. Aproveite os anúncios ilimitados.'
                    : 'Parabéns! O selo de verificação está ativo no seu perfil.'}
                </p>
                <button
                  style={{ background: '#008C3A', color: '#ffffff', border: 'none', padding: '14px', borderRadius: 12, fontWeight: '900', fontSize: 15, cursor: 'pointer', width: '100%' }}
                  onClick={() => setModalCheckoutAberto(false)}
                >
                  Voltar para o Perfil
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================= */}
      {/* MODAL DE AVALIAÇÕES (PASSO 1)                           */}
      {/* ======================================================= */}
      {modalAvaliacoesAberto && (
        <div style={estilos.fundoModalFiltro} onClick={() => setModalAvaliacoesAberto(false)}>
          <div style={estilos.caixaModalCheckout} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: '900', color: '#111', margin: 0 }}>Avaliações</h3>
              <span style={{ fontSize: 16, color: '#b45309', fontWeight: 'bold' }}>⭐ {mediaNota}</span>
            </div>
            
            {!perfilEhMeu && (
              <div style={{ background: '#f8f9fa', padding: 14, borderRadius: 14, marginBottom: 16, border: '1px solid #e5e7eb' }}>
                <strong style={{ fontSize: 13, display: 'block', marginBottom: 8, color: '#111' }}>Deixe sua avaliação:</strong>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <span key={num} onClick={() => setNovaNota(num)} style={{ fontSize: 26, cursor: 'pointer', filter: num <= novaNota ? 'none' : 'grayscale(100%) opacity(0.3)' }}>
                      ⭐
                    </span>
                  ))}
                </div>
                <textarea 
                  placeholder="Conte como foi sua experiência com este vendedor..." 
                  value={novoComentario} 
                  onChange={(e) => setNovoComentario(e.target.value)}
                  style={{ ...estilos.textareaBorda, height: 70 }}
                />
                <button onClick={enviarAvaliacao} disabled={enviandoAvaliacao} style={estilos.btnSacar}>
                  {enviandoAvaliacao ? 'Enviando...' : 'Enviar Avaliação'}
                </button>
              </div>
            )}

            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
              {avaliacoes.length === 0 ? (
                <p style={{ fontSize: 13, color: '#888', textAlign: 'center', padding: '20px 0' }}>Nenhuma avaliação recebida ainda.</p>
              ) : (
                avaliacoes.map((item) => (
                  <div key={item.id} style={{ background: '#fff', border: '1px solid #e5e7eb', padding: 12, borderRadius: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <strong style={{ fontSize: 13, color: '#111' }}>@{item.avaliador_nome}</strong>
                      <span style={{ fontSize: 12 }}>{'⭐'.repeat(item.nota)}</span>
                    </div>
                    <p style={{ fontSize: 13, color: '#444', margin: 0, lineHeight: 1.4 }}>{item.comentario}</p>
                    <span style={{ fontSize: 10, color: '#888', display: 'block', marginTop: 6 }}>
                      {new Date(item.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))
              )}
            </div>

            <button onClick={() => setModalAvaliacoesAberto(false)} style={estilos.btnCancelarCheckout}>Fechar</button>
          </div>
        </div>
      )}

      {/* MENU INFERIOR */}
      <footer style={estilos.menuInferiorNovo}>
        <button onClick={() => router.push('/vendas')} style={{ ...estilos.btnTabNova, color: '#65676b' }}>
          <span style={{ fontSize: 22 }}>🏠</span><span style={{ fontSize: 10, fontWeight: 'bold' }}>Início</span>
        </button>
        <button onClick={() => router.push('/vendas')} style={{ ...estilos.btnTabNova, color: '#65676b' }}>
          <span style={{ fontSize: 22 }}>🔍</span><span style={{ fontSize: 10, fontWeight: 'bold' }}>Explorar</span>
        </button>
        <button onClick={() => router.push('/vendas')} style={{ ...estilos.btnTabNova, color: '#65676b' }}>
          <span style={{ fontSize: 24 }}>📣</span><span style={{ fontSize: 10, fontWeight: 'bold' }}>Anunciar</span>
        </button>
        <button onClick={() => router.push('/vendas')} style={{ ...estilos.btnTabNova, color: '#65676b' }}>
          <span style={{ fontSize: 22 }}>💬</span><span style={{ fontSize: 10, fontWeight: 'bold' }}>Chat</span>
        </button>
        <button onClick={() => router.push('/perfil')} style={{ ...estilos.btnTabNova, color: '#008C3A' }}>
          <span style={{ fontSize: 22 }}>😎</span><span style={{ fontSize: 10, fontWeight: 'bold' }}>Perfil</span>
        </button>
      </footer>
    </main>
  )
}

export default function Perfil() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008C3A', fontWeight: 900, fontSize: 18 }}>Carregando perfil...</div>}>
      <ConteudoPerfil />
    </Suspense>
  )
}

const estilos = {
  container: { width: '100%', maxWidth: 500, margin: '0 auto', height: '100vh', background: '#f4f5f7', display: 'flex', flexDirection: 'column' as const, position: 'relative' as const, overflow: 'hidden' },
  carregandoBox: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008C3A', fontWeight: 900, fontSize: 18 },
  headerVendasBR: { padding: '14px 16px', background: '#ffffff', borderBottom: '1px solid #f0f2f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logoBR: { width: 34, height: 34, borderRadius: '50%', background: '#fff', border: '3px solid #008C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFD700', fontWeight: '900' as const, fontSize: 14, boxShadow: '0 0 0 1px #FFD700' },
  conteudoScroll: { flex: 1, overflowY: 'auto' as const, paddingBottom: 20 },
  cardPerfil: { background: '#fff', margin: '0 0 16px 0', borderBottom: '1px solid #e5e7eb' },
  capa: { height: 140, position: 'relative' as const },
  botaoEditarCapa: { position: 'absolute' as const, right: 12, bottom: 12, background: 'rgba(0,0,0,.65)', color: '#fff', borderRadius: 12, padding: '6px 12px', fontWeight: 'bold' as const, cursor: 'pointer', fontSize: 12, zIndex: 20, overflow: 'hidden', display: 'inline-block' },
  inputCapaInvisivel: { position: 'absolute' as const, inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' },
  areaAvatar: { position: 'relative' as const, textAlign: 'center' as const, marginTop: -40 },
  avatar: { width: 86, height: 86, borderRadius: '50%', background: '#FFD700', color: '#008C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 'bold', margin: '0 auto', border: '4px solid #fff', overflow: 'hidden' },
  botaoEditarFoto: { border: '1px solid #e5e7eb', background: '#fff', color: '#111', borderRadius: 12, padding: '4px 10px', fontWeight: 'bold' as const, cursor: 'pointer', marginTop: 8, fontSize: 11 },
  fotoAvatar: { width: '100%', height: '100%', objectFit: 'cover' as const },
  conteudoPerfilInfo: { padding: '16px 20px', textAlign: 'center' as const },
  nomePerfil: { margin: '0 0 2px', color: '#111', fontSize: 22, fontWeight: 900 },
  usernamePerfil: { margin: '0 0 8px', color: '#65676b', fontSize: 14, fontWeight: 'bold' as const },
  bioStyle: { color: '#444', lineHeight: 1.4, fontSize: 14 },
  infoGrid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, margin: '20px 0' },
  itemInfoPerfil: { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 2, background: '#f8f9fa', borderRadius: 14, padding: '10px 6px', border: '1px solid #e5e7eb' },
  numeroInfoPerfil: { fontSize: 16, fontWeight: 900, color: '#111', lineHeight: 1 },
  textoInfoPerfil: { fontSize: 11, fontWeight: 'bold' as const, color: '#65676b', lineHeight: 1.2 },
  dadosPessoais: { background: '#f8f9fa', border: '1px solid #e5e7eb', borderRadius: 14, padding: 14, textAlign: 'left' as const, marginBottom: 16 },
  tituloDadosPessoais: { margin: '0 0 10px', color: '#111', fontSize: 14, fontWeight: 'bold' as const },
  linhaDadoPessoal: { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  iconeDado: { fontSize: 16, lineHeight: 1.2 },
  textoDadoPessoal: { display: 'flex', flexDirection: 'column' as const, gap: 2, color: '#333', fontSize: 13 },
  rotuloDadoPessoal: { color: '#65676b', fontSize: 12 },
  botao: { width: '100%', padding: 12, border: 'none', borderRadius: 12, background: '#008C3A', color: '#fff', fontWeight: 'bold' as const, cursor: 'pointer', marginTop: 10, flex: 1, fontSize: 14 },
  botaoEditar: { width: '100%', padding: 12, border: '1px solid #d1d5db', borderRadius: 12, background: '#fff', color: '#111', fontWeight: 'bold' as const, cursor: 'pointer', marginTop: 10, fontSize: 14 },
  botaoSalvarEdit: { width: '100%', padding: 12, border: 'none', borderRadius: 12, background: '#008C3A', color: '#fff', fontWeight: 'bold' as const, cursor: 'pointer', marginTop: 10, fontSize: 14 },
  botaoCancelar: { width: '100%', padding: 12, border: 'none', borderRadius: 12, background: '#eee', color: '#111', fontWeight: 'bold' as const, cursor: 'pointer', marginTop: 10, fontSize: 14 },
  botaoMensagem: { width: '100%', padding: 12, border: 'none', borderRadius: 12, background: '#0A58CA', color: '#fff', fontWeight: 'bold' as const, cursor: 'pointer', marginTop: 10, flex: 1, fontSize: 14 },
  inputBorda: { width: '100%', padding: '12px 14px', marginBottom: 10, borderRadius: 12, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', background: '#fff', color: '#111' },
  labelSimples: { fontSize: 13, fontWeight: 'bold' as const, color: '#111', display: 'block', marginBottom: 6 },
  textareaBorda: { width: '100%', minHeight: 80, padding: '12px 14px', marginBottom: 10, borderRadius: 12, border: '1px solid #d1d5db', fontSize: 14, outline: 'none', resize: 'none' as const, background: '#fff', color: '#111' },
  areaPosts: { padding: '0 16px' },
  tituloPosts: { color: '#111', fontSize: 16, fontWeight: 900, margin: '0 0 12px' },
  semPosts: { background: '#fff', borderRadius: 14, padding: 16, color: '#65676b', textAlign: 'center' as const, border: '1px solid #e5e7eb', fontSize: 13 },
  postCard: { background: '#fff', borderRadius: 16, padding: 14, marginBottom: 14, border: '1px solid #e5e7eb' },
  postTopo: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 10 },
  miniAvatar: { width: 36, height: 36, borderRadius: '50%', background: '#FFD700', color: '#008C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, overflow: 'hidden' },
  postVisibilidade: { margin: 0, color: '#65676b', fontSize: 11, fontWeight: 'bold' as const },
  textoPost: { fontSize: 14, color: '#333', lineHeight: 1.4, whiteSpace: 'pre-wrap' as const },
  midiaPost: { width: '100%', maxHeight: 300, objectFit: 'cover' as const, borderRadius: 12, marginTop: 10, background: '#f0f2f5' },
  cardPrivado: { background: '#fff', borderRadius: 16, padding: '24px 20px', textAlign: 'center' as const, border: '1px solid #e5e7eb' },
  menuInferiorNovo: { height: 60, background: '#ffffff', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-around', alignItems: 'center', zIndex: 40 },
  btnTabNova: { background: 'none', border: 'none', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 2, cursor: 'pointer' },
  cardCarteira: { background: '#fff', borderRadius: '16px', border: '2px solid #e5e7eb', padding: '16px', display: 'flex', flexDirection: 'column' as const, boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  btnSacar: { marginTop: 14, background: '#111', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold' as const, fontSize: 13, cursor: 'pointer', width: '100%' },
  gridUpgrades: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  cardUpgrade: { background: '#fff', borderRadius: '16px', border: '2px solid', padding: '14px', display: 'flex', flexDirection: 'column' as const, boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  icone3DBox: { width: 50, height: 50, borderRadius: '14px', background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  btnAssinar: { marginTop: 'auto', background: '#008C3A', color: '#fff', border: 'none', padding: '10px', borderRadius: '10px', fontWeight: 'bold' as const, fontSize: 13, cursor: 'pointer', width: '100%' },
  badgeAtivo: { marginTop: 'auto', background: '#e6f4ea', color: '#008C3A', padding: '10px', borderRadius: '10px', fontWeight: '900' as const, fontSize: 13, textAlign: 'center' as const, border: '1px solid currentColor' },
  fundoModalFiltro: { position: 'fixed' as const, top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.65)', zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 16 },
  caixaModalCheckout: { width: '100%', maxWidth: 400, background: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' },
  btnPixPagamento: { color: '#fff', width: '100%', border: 'none', padding: '14px', borderRadius: 12, fontWeight: '900' as const, fontSize: 16, cursor: 'pointer', display: 'flex', justifyContent: 'center', gap: 10, alignItems: 'center' },
  btnCancelarCheckout: { background: 'none', border: 'none', color: '#888', fontSize: 13, width: '100%', marginTop: 14, cursor: 'pointer', fontWeight: 'bold' as const },
  boxQrCodeFake: { width: 160, height: 160, background: '#f8f9fa', border: '2px dashed #d1d5db', margin: '0 auto', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 50 }
}