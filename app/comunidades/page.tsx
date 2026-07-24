'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'

type Comunidade = {
  id: string
  nome: string
  cidade: string | null
  estado: string | null
  categoria: string | null
  descricao: string | null
  capa_url?: string | null
  membros_count: number | null
  criado_em: string
}

type PostComunidade = {
  id: string
  comunidade_id: string
  usuario_id: string
  autor_nome: string
  autor_username: string | null
  texto: string
  imagem_url?: string | null
  midia_url?: string | null
  tipo_midia?: 'foto' | 'video' | null
  criado_em: string
  expira_em: string | null
  reacoes?: Record<string, string>
  mostrarReacoes?: boolean
  compartilharAberto?: boolean
  compartilhamentos?: number
  comunidade?: Comunidade | null
}

type UsuarioAtualComunidade = {
  id: string
  nome: string
  username: string | null
  foto_url?: string | null
}

type AutorPostComunidade = {
  id: string
  nome: string
  username: string | null
  foto_url?: string | null
}

type ComentarioComunidadeFeed = {
  id: string
  post_id: string
  comunidade_id: string
  usuario_id: string
  autor_nome: string
  autor_username: string | null
  texto: string
  criado_em: string
}

type RespostaComentarioComunidadeFeed = {
  id: string
  comentario_id: string
  post_id: string
  comunidade_id: string
  usuario_id: string
  autor_nome: string
  autor_username: string | null
  texto: string
  criado_em: string
}

export default function Comunidades() {
  const router = useRouter()

  const [comunidades, setComunidades] = useState<Comunidade[]>([])
  const [postsComunidades, setPostsComunidades] = useState<PostComunidade[]>([])
  const [busca, setBusca] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [usuarioAtual, setUsuarioAtual] = useState<UsuarioAtualComunidade | null>(null)
  const [comentariosPosts, setComentariosPosts] = useState<Record<string, ComentarioComunidadeFeed[]>>({})
  const [comentarioAberto, setComentarioAberto] = useState<Record<string, boolean>>({})
  const [novoComentario, setNovoComentario] = useState<Record<string, string>>({})
  const [salvandoComentario, setSalvandoComentario] = useState<Record<string, boolean>>({})
  const [respostasComentarios, setRespostasComentarios] = useState<Record<string, RespostaComentarioComunidadeFeed[]>>({})
  const [respostaAberta, setRespostaAberta] = useState<Record<string, boolean>>({})
  const [novaResposta, setNovaResposta] = useState<Record<string, string>>({})
  const [salvandoResposta, setSalvandoResposta] = useState<Record<string, boolean>>({})
  const [autoresPosts, setAutoresPosts] = useState<Record<string, AutorPostComunidade>>({})
const [midiaTelaCheia, setMidiaTelaCheia] = useState<{
  url: string
  tipo: 'foto' | 'video'
} | null>(null)

  const tempoSegurar = useRef<ReturnType<typeof setTimeout> | null>(null)
  const segurou = useRef(false)

  useEffect(() => {
    carregarTelaComunidades()
  }, [])

  async function carregarTelaComunidades() {
    setCarregando(true)

    const { data: comunidadesData, error: comunidadesError } = await supabase
      .from('comunidades')
      .select('*')
      .order('criado_em', { ascending: false })

    if (comunidadesError) {
      console.log('Erro ao carregar comunidades:', comunidadesError)
      alert('Erro ao carregar comunidades.')
      setCarregando(false)
      return
    }

    const listaComunidades = (comunidadesData ?? []) as Comunidade[]
    setComunidades(listaComunidades)

const { data: sessaoData } = await supabase.auth.getSession()

if (sessaoData.session?.user) {
  const { data: usuarioData, error: usuarioError } = await supabase
    .from('profiles')
    .select('id, nome, username, foto_url')
    .eq('auth_user_id', sessaoData.session.user.id)
    .single()

  if (usuarioError) {
    console.log('Erro ao carregar usuário logado:', usuarioError)
  } else {
    setUsuarioAtual(usuarioData)
  }
}

    const agora = new Date().toISOString()

    const { data: postsData, error: postsError } = await supabase
      .from('posts_comunidades')
      .select('*')
      .gte('expira_em', agora)
      .order('criado_em', { ascending: false })
      .limit(80)

    if (postsError) {
      console.log('Erro ao carregar posts das comunidades:', postsError)
      setPostsComunidades([])
      setCarregando(false)
      return
    }

    const postsComComunidade = (postsData ?? []).map((post) => {
      const comunidade = listaComunidades.find(
        (item) => item.id === post.comunidade_id
      )

      return {
  ...post,
  reacoes: post.reacoes ?? {},
  mostrarReacoes: false,
  compartilharAberto: false,
  compartilhamentos: post.compartilhamentos ?? 0,
  comunidade: comunidade ?? null
}
    }) as PostComunidade[]

    setPostsComunidades(postsComComunidade)
await carregarAutoresDosPosts(postsComComunidade)
await carregarComentariosDosPosts(postsComComunidade)
setCarregando(false)
  }

  const textoBusca = busca.toLowerCase().trim()

  const postsFiltrados = postsComunidades.filter((post) => {
    if (!textoBusca) return true

    return (
      post.texto?.toLowerCase().includes(textoBusca) ||
      post.autor_nome?.toLowerCase().includes(textoBusca) ||
      post.autor_username?.toLowerCase().includes(textoBusca) ||
      post.comunidade?.nome?.toLowerCase().includes(textoBusca) ||
      post.comunidade?.cidade?.toLowerCase().includes(textoBusca) ||
      post.comunidade?.estado?.toLowerCase().includes(textoBusca) ||
      post.comunidade?.categoria?.toLowerCase().includes(textoBusca)
    )
  })

  const comunidadesFiltradas = comunidades.filter((comunidade) => {
    if (!textoBusca) return true

    return (
      comunidade.nome?.toLowerCase().includes(textoBusca) ||
      comunidade.cidade?.toLowerCase().includes(textoBusca) ||
      comunidade.estado?.toLowerCase().includes(textoBusca) ||
      comunidade.categoria?.toLowerCase().includes(textoBusca) ||
      comunidade.descricao?.toLowerCase().includes(textoBusca)
    )
  })

  function abrirComunidade(comunidadeId?: string | null) {
    if (!comunidadeId) return

    router.push(`/comunidades/${comunidadeId}`)
  }

  function formatarDataHora(data: string) {
  return new Date(data).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function carregarAutoresDosPosts(listaPosts: PostComunidade[]) {
  const idsAutores = Array.from(
    new Set(
      listaPosts
        .map((post) => post.usuario_id)
        .filter(Boolean)
    )
  )

  if (idsAutores.length === 0) {
    setAutoresPosts({})
    return
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, nome, username, foto_url')
    .in('id', idsAutores)

  if (error) {
    console.log('Erro ao carregar autores dos posts:', error)
    return
  }

  const autoresMapeados: Record<string, AutorPostComunidade> = {}

  ;(data ?? []).forEach((autor) => {
    autoresMapeados[autor.id] = autor
  })

  setAutoresPosts(autoresMapeados)
}

function pegarMinhaReacao(post: PostComunidade) {
  if (!usuarioAtual?.id) return null

  return post.reacoes?.[usuarioAtual.id] ?? null
}

function contarReacoesPost(post: PostComunidade) {
  return Object.keys(post.reacoes ?? {}).length
}

function pegarTopReacoesPost(post: PostComunidade) {
  const reacoes = Object.values(post.reacoes ?? {})

  const contagem = reacoes.reduce((grupo: Record<string, number>, emoji) => {
    grupo[emoji] = (grupo[emoji] ?? 0) + 1
    return grupo
  }, {})

  return Object.entries(contagem)
    .map(([emoji, total]) => ({
      emoji,
      total
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)
}

async function salvarReacoesPostComunidade(postAtualizado: PostComunidade) {
  const { error } = await supabase
    .from('posts_comunidades')
    .update({
      reacoes: postAtualizado.reacoes ?? {},
      compartilhamentos: postAtualizado.compartilhamentos ?? 0
    })
    .eq('id', postAtualizado.id)

  if (error) {
    console.log('Erro ao salvar interação do post:', error)
  }
}

async function curtirPostComunidade(postId: string) {
  if (!usuarioAtual?.id) {
    alert('Faça login para reagir.')
    return
  }

  const postAtual = postsComunidades.find((post) => post.id === postId)

  if (!postAtual) return

  const reacoesAtualizadas = { ...(postAtual.reacoes ?? {}) }

  if (reacoesAtualizadas[usuarioAtual.id]) {
    delete reacoesAtualizadas[usuarioAtual.id]
  } else {
    reacoesAtualizadas[usuarioAtual.id] = '👍'
  }

  const postAtualizado: PostComunidade = {
    ...postAtual,
    reacoes: reacoesAtualizadas,
    mostrarReacoes: false
  }

  setPostsComunidades((atuais) =>
    atuais.map((post) =>
      post.id === postId ? postAtualizado : post
    )
  )

  await salvarReacoesPostComunidade(postAtualizado)
}

function abrirReacoesPostComunidade(postId: string) {
  setPostsComunidades((atuais) =>
    atuais.map((post) => ({
      ...post,
      mostrarReacoes: post.id === postId ? true : false
    }))
  )
}

async function trocarReacaoPostComunidade(postId: string, novaReacao: string) {
  if (!usuarioAtual?.id) {
    alert('Faça login para reagir.')
    return
  }

  const postAtual = postsComunidades.find((post) => post.id === postId)

  if (!postAtual) return

  const reacoesAtualizadas = { ...(postAtual.reacoes ?? {}) }

  reacoesAtualizadas[usuarioAtual.id] = novaReacao

  const postAtualizado: PostComunidade = {
    ...postAtual,
    reacoes: reacoesAtualizadas,
    mostrarReacoes: false
  }

  setPostsComunidades((atuais) =>
    atuais.map((post) =>
      post.id === postId ? postAtualizado : post
    )
  )

  await salvarReacoesPostComunidade(postAtualizado)
}

function iniciarSegurarPostComunidade(postId: string) {
  segurou.current = false

  if (tempoSegurar.current) {
    clearTimeout(tempoSegurar.current)
  }

  tempoSegurar.current = setTimeout(() => {
    segurou.current = true
    abrirReacoesPostComunidade(postId)
  }, 600)
}

function pararSegurarPostComunidade() {
  if (tempoSegurar.current) {
    clearTimeout(tempoSegurar.current)
    tempoSegurar.current = null
  }
}

function clicarCurtirPostComunidade(postId: string) {
  if (segurou.current) {
    segurou.current = false
    return
  }

  curtirPostComunidade(postId)
}

async function carregarComentariosDosPosts(listaPosts: PostComunidade[]) {
  const idsPosts = listaPosts.map((post) => post.id)

  if (idsPosts.length === 0) {
    setComentariosPosts({})
    setRespostasComentarios({})
    return
  }

  const { data, error } = await supabase
    .from('comentarios_posts_comunidades')
    .select('*')
    .in('post_id', idsPosts)
    .order('criado_em', { ascending: true })

  if (error) {
    console.log('Erro ao carregar comentários:', error)
    return
  }

  const comentarios = (data ?? []) as ComentarioComunidadeFeed[]
  const agrupados: Record<string, ComentarioComunidadeFeed[]> = {}

  comentarios.forEach((comentario) => {
    if (!agrupados[comentario.post_id]) {
      agrupados[comentario.post_id] = []
    }

    agrupados[comentario.post_id].push(comentario)
  })

  setComentariosPosts(agrupados)

  const idsComentarios = comentarios.map((comentario) => comentario.id)

  if (idsComentarios.length > 0) {
    const { data: respostasData, error: respostasError } = await supabase
      .from('respostas_comentarios_comunidades')
      .select('*')
      .in('comentario_id', idsComentarios)
      .order('criado_em', { ascending: true })

    if (respostasError) {
      console.log('Erro ao carregar respostas:', respostasError)
    } else {
      const respostas = (respostasData ?? []) as RespostaComentarioComunidadeFeed[]
      const respostasAgrupadas: Record<string, RespostaComentarioComunidadeFeed[]> = {}

      respostas.forEach((resposta) => {
        if (!respostasAgrupadas[resposta.comentario_id]) {
          respostasAgrupadas[resposta.comentario_id] = []
        }

        respostasAgrupadas[resposta.comentario_id].push(resposta)
      })

      setRespostasComentarios(respostasAgrupadas)
    }
  } else {
    setRespostasComentarios({})
  }

  const idsAutoresComentarios = Array.from(
    new Set(
      [
        ...comentarios.map((comentario) => comentario.usuario_id),
        ...Object.values(respostasComentarios)
          .flat()
          .map((resposta) => resposta.usuario_id)
      ].filter(Boolean)
    )
  )

  if (idsAutoresComentarios.length > 0) {
    const { data: autoresComentariosData, error: autoresComentariosError } = await supabase
      .from('profiles')
      .select('id, nome, username, foto_url')
      .in('id', idsAutoresComentarios)

    if (autoresComentariosError) {
      console.log('Erro ao carregar autores dos comentários:', autoresComentariosError)
      return
    }

    const autoresComentariosMapeados: Record<string, AutorPostComunidade> = {}

    ;(autoresComentariosData ?? []).forEach((autor) => {
      autoresComentariosMapeados[autor.id] = autor
    })

    setAutoresPosts((atual) => ({
      ...atual,
      ...autoresComentariosMapeados
    }))
  }
}

function abrirComentariosPostComunidade(postId: string) {
  setComentarioAberto((atual) => ({
    ...atual,
    [postId]: !atual[postId]
  }))
}

function mudarComentarioPostComunidade(postId: string, texto: string) {
  setNovoComentario((atual) => ({
    ...atual,
    [postId]: texto
  }))
}

async function enviarComentarioPostComunidade(post: PostComunidade) {
  if (!usuarioAtual) {
    alert('Faça login para comentar.')
    return
  }

  const texto = (novoComentario[post.id] ?? '').trim()

  if (!texto) {
    alert('Digite um comentário.')
    return
  }

  setSalvandoComentario((atual) => ({
    ...atual,
    [post.id]: true
  }))

  const { data, error } = await supabase
    .from('comentarios_posts_comunidades')
    .insert({
      post_id: post.id,
      comunidade_id: post.comunidade_id,
      usuario_id: usuarioAtual.id,
      autor_nome: usuarioAtual.nome,
      autor_username: usuarioAtual.username,
      texto
    })
    .select()
    .single()

  setSalvandoComentario((atual) => ({
    ...atual,
    [post.id]: false
  }))

  if (error) {
    console.log('Erro ao comentar:', error)
    alert(`Erro ao comentar: ${error.message}`)
    return
  }

  setComentariosPosts((atual) => ({
    ...atual,
    [post.id]: [...(atual[post.id] ?? []), data]
  }))

  setNovoComentario((atual) => ({
    ...atual,
    [post.id]: ''
  }))
}

function abrirCompartilharPostComunidade(postId: string) {
  setPostsComunidades((atuais) =>
    atuais.map((post) => ({
      ...post,
      compartilharAberto: post.id === postId ? !post.compartilharAberto : false
    }))
  )
}

async function copiarLinkPostComunidade(post: PostComunidade) {
  const link = `${window.location.origin}/comunidades/${post.comunidade_id}`

  try {
    await navigator.clipboard.writeText(link)
    alert('Link copiado!')
  } catch (error) {
    console.log('Erro ao copiar link:', error)
    window.prompt('Copie o link manualmente:', link)
  }

  abrirCompartilharPostComunidade(post.id)
}

async function compartilharWhatsAppComunidade(post: PostComunidade) {
  const link = `${window.location.origin}/comunidades/${post.comunidade_id}`

  const textoPost = post.texto?.trim()
    ? post.texto.trim()
    : 'Publicação de comunidade no BRAZILZÃO'

  const mensagem = `Olha esse post de comunidade no BRAZILZÃO 🇧🇷\n\n${textoPost}\n\nAcesse aqui:\n${link}`

  window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, '_blank')

  abrirCompartilharPostComunidade(post.id)
}

async function espalharPostComunidadeNoFeed(post: PostComunidade) {
  if (!usuarioAtual) {
    alert('Faça login para espalhar.')
    return
  }

  const textoDaPessoa = window.prompt(
    'Escreva algo para espalhar essa publicação:',
    ''
  )

  if (textoDaPessoa === null) return

  const novoPostFeed = {
    texto: textoDaPessoa.trim(),
    autor: {
      id: usuarioAtual.id,
      nome: usuarioAtual.nome,
      username: usuarioAtual.username ?? '',
      avatar: usuarioAtual.nome?.charAt(0) ?? 'U',
      foto_url: usuarioAtual.foto_url || null
    },
    compartilhadoDe: {
  autor: {
    id: post.comunidade_id,
    nome: post.comunidade?.nome ?? 'Comunidade',
    username: 'comunidade',
    avatar: '🏘️',
    foto_url: post.comunidade?.capa_url || null
  },
  texto: `${post.autor_nome}: ${post.texto}`,
  midiaUrl: post.midia_url || null,
  tipoMidia: post.tipo_midia || null
},
    midiaUrl: null,
    tipoMidia: null,
    reacao: null,
    reacoes: {},
    mostrarReacoes: false,
    comentarios: [],
    comentarioAberto: false,
    novoComentario: '',
    menuAberto: false,
    compartilharAberto: false,
    compartilhamentos: 0,
    visibilidade: 'mundial'
  }

  const { error } = await supabase
    .from('feed_posts')
    .insert({
      conteudo: novoPostFeed,
      usuario_id: usuarioAtual.id,
      visibilidade: 'mundial'
    })

  if (error) {
    console.log('Erro ao espalhar no feed:', error)
    alert('Erro ao espalhar publicação.')
    return
  }

  const postAtualizado: PostComunidade = {
    ...post,
    compartilhamentos: (post.compartilhamentos ?? 0) + 1,
    compartilharAberto: false
  }

  setPostsComunidades((atuais) =>
    atuais.map((item) =>
      item.id === post.id ? postAtualizado : item
    )
  )

  await salvarReacoesPostComunidade(postAtualizado)

  alert('Publicação espalhada no Feed!')
}

function abrirRespostaComentario(comentarioId: string) {
  setRespostaAberta((atual) => ({
    ...atual,
    [comentarioId]: !atual[comentarioId]
  }))
}

function mudarRespostaComentario(comentarioId: string, texto: string) {
  setNovaResposta((atual) => ({
    ...atual,
    [comentarioId]: texto
  }))
}

async function enviarRespostaComentario(post: PostComunidade, comentario: ComentarioComunidadeFeed) {
  if (!usuarioAtual) {
    alert('Faça login para responder.')
    return
  }

  const texto = (novaResposta[comentario.id] ?? '').trim()

  if (!texto) {
    alert('Digite uma resposta.')
    return
  }

  setSalvandoResposta((atual) => ({
    ...atual,
    [comentario.id]: true
  }))

  const { data, error } = await supabase
    .from('respostas_comentarios_comunidades')
    .insert({
      comentario_id: comentario.id,
      post_id: post.id,
      comunidade_id: post.comunidade_id,
      usuario_id: usuarioAtual.id,
      autor_nome: usuarioAtual.nome,
      autor_username: usuarioAtual.username,
      texto
    })
    .select()
    .single()

  setSalvandoResposta((atual) => ({
    ...atual,
    [comentario.id]: false
  }))

  if (error) {
    console.log('Erro ao responder comentário:', error)
    alert(`Erro ao responder: ${error.message}`)
    return
  }

  setRespostasComentarios((atual) => ({
    ...atual,
    [comentario.id]: [...(atual[comentario.id] ?? []), data]
  }))

  setAutoresPosts((atual) => ({
    ...atual,
    [usuarioAtual.id]: {
      id: usuarioAtual.id,
      nome: usuarioAtual.nome,
      username: usuarioAtual.username,
      foto_url: usuarioAtual.foto_url || null
    }
  }))

  setNovaResposta((atual) => ({
    ...atual,
    [comentario.id]: ''
  }))

  setRespostaAberta((atual) => ({
    ...atual,
    [comentario.id]: false
  }))
}

function abrirMidiaTelaCheia(url?: string | null, tipo?: 'foto' | 'video' | null) {
  if (!url || !tipo) return

  setMidiaTelaCheia({
    url,
    tipo
  })
}

function fecharMidiaTelaCheia() {
  setMidiaTelaCheia(null)
}

  return (
    <main style={page}>
      <header style={topo}>
        <div style={topoInterno}>
          <button
            type="button"
            style={botaoVoltar}
            onClick={() => router.push('/feed')}
          >
            ‹
          </button>

          <div style={marcaArea}>
            <img
              src="/logo-br.png"
              alt="BRAZILZÃO"
              style={logo}
            />

            <div>
              <h1 style={titulo}>Comunidade</h1>
              <p style={subtitulo}>A praça do povo brasileiro</p>
            </div>
          </div>
        </div>
      </header>

      <section style={container}>
        <div style={painelPrincipal}>
          <div>
            <strong style={tituloPainel}>Comunidades BRAZILZÃO</strong>

            <p style={textoPainel}>
              Veja posts de todas as comunidades, encontre cidades, assuntos,
              vendas, serviços e resenhas do Brasil inteiro.
            </p>
          </div>

          <button
            type="button"
            style={botaoCriar}
            onClick={() => router.push('/comunidades/criar')}
          >
            + Criar comunidades
          </button>
        </div>

        <div style={barraPesquisa}>
          <span style={iconePesquisa}>🔎</span>

          <input
            placeholder="Pesquisar comunidades, posts, cidades..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={inputPesquisa}
          />
        </div>

        {carregando && (
          <div style={cardVazio}>
            Carregando comunidades...
          </div>
        )}

        {!carregando && (
          <>
            <div style={linhaTituloFeed}>
              <div>
                <strong style={tituloFeed}>Posts de todas as comunidades</strong>

                <p style={subtituloFeed}>
                  Clique no nome da comunidade para entrar nela.
                </p>
              </div>

              <span style={contadorFeed}>
                {postsFiltrados.length}
              </span>
            </div>

            {postsFiltrados.length === 0 && (
              <div style={cardVazio}>
                <strong>Nenhum post encontrado</strong>

                <p>
                  Quando alguém publicar dentro de uma comunidade, os posts
                  aparecem aqui.
                </p>
              </div>
            )}

            {postsFiltrados.map((post) => (
  <article key={post.id} style={cardPostComunidade}>
    <div style={cabecalhoPost}>
      <button
  type="button"
  style={avatarComunidadeCardPost}
  onClick={() => abrirComunidade(post.comunidade_id)}
>
  {post.comunidade?.capa_url ? (
    <img
      src={post.comunidade.capa_url}
      alt={post.comunidade?.nome ?? 'Comunidade'}
      style={fotoCapaBolinhaComunidade}
    />
  ) : (
    '🏘️'
  )}
</button>

      <div style={areaNomeComunidade}>
        <button
          type="button"
          style={nomeComunidadePost}
          onClick={() => abrirComunidade(post.comunidade_id)}
        >
          {post.comunidade?.nome ?? 'Comunidade'}
        </button>

        <span style={dataPostCardComunidade}>
  Publicado em {formatarDataHora(post.criado_em)}
</span>
      </div>
    </div>

    <div style={linhaAutor}>
  <button
    type="button"
    style={avatarAutorBotaoCardPost}
    onClick={() => router.push(`/perfil?id=${post.usuario_id}`)}
  >
    {autoresPosts[post.usuario_id]?.foto_url ? (
      <img
        src={autoresPosts[post.usuario_id].foto_url || ''}
        alt={post.autor_nome}
        style={fotoAvatarAutorCardPost}
      />
    ) : (
      post.autor_nome?.charAt(0)?.toUpperCase() ?? 'U'
    )}
  </button>

  <div>
    <button
      type="button"
      style={nomeAutorClicavelCardPost}
      onClick={() => router.push(`/perfil?id=${post.usuario_id}`)}
    >
      {post.autor_nome}
    </button>

    {post.autor_username && (
      <p style={usernameAutor}>
        @{post.autor_username}
      </p>
    )}
  </div>
</div>

    <p style={textoDoPost}>
      {post.texto}
    </p>

    {post.midia_url && post.tipo_midia === 'foto' && (
  <button
    type="button"
    style={botaoMidiaPostComunidade}
    onClick={() => abrirMidiaTelaCheia(post.midia_url, 'foto')}
  >
    <div style={caixaFotoPost}>
      <img
        src={post.midia_url}
        alt="Foto da publicação"
        style={fotoPost}
      />
    </div>
  </button>
)}

{post.midia_url && post.tipo_midia === 'video' && (
  <button
    type="button"
    style={botaoMidiaPostComunidade}
    onClick={() => abrirMidiaTelaCheia(post.midia_url, 'video')}
  >
    <div style={caixaFotoPost}>
      <video
        src={post.midia_url}
        muted
        playsInline
        style={videoPostComunidadeFeed}
      />

      <span style={seloAbrirVideoComunidade}>
        ▶ Abrir vídeo
      </span>
    </div>
  </button>
)}

   <div style={linhaReacoesResumo}>
  <div style={rankingReacoesComunidade}>
    {pegarTopReacoesPost(post).length > 0 ? (
      pegarTopReacoesPost(post).map((reacao) => (
        <div key={reacao.emoji} style={itemRankingReacaoComunidade}>
          <span style={emojiRankingReacaoComunidade}>{reacao.emoji}</span>
          <small style={numeroRankingReacaoComunidade}>{reacao.total}</small>
        </div>
      ))
    ) : (
      <span style={textoReacoesResumo}>0 reações</span>
    )}
  </div>

  <span style={textoReacoesResumo}>
    {(comentariosPosts[post.id] ?? []).length} {(comentariosPosts[post.id] ?? []).length === 1 ? 'comentário' : 'comentários'} • {post.compartilhamentos ?? 0} {(post.compartilhamentos ?? 0) === 1 ? 'espalhada' : 'espalhadas'}
  </span>
</div>

{post.mostrarReacoes && (
  <div style={reacoesFlutuanteComunidade}>
    {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
      <button
        key={emoji}
        type="button"
        onClick={() => trocarReacaoPostComunidade(post.id, emoji)}
        style={botaoReacaoComunidade}
      >
        {emoji}
      </button>
    ))}
  </div>
)}

<div style={botoesPost}>
  <button
    type="button"
    style={pegarMinhaReacao(post) ? botaoPostAtivoComunidade : botaoPost}
    onClick={() => clicarCurtirPostComunidade(post.id)}
    onMouseDown={() => iniciarSegurarPostComunidade(post.id)}
    onMouseUp={pararSegurarPostComunidade}
    onMouseLeave={pararSegurarPostComunidade}
    onTouchStart={() => iniciarSegurarPostComunidade(post.id)}
    onTouchEnd={pararSegurarPostComunidade}
    onContextMenu={(e) => e.preventDefault()}
  >
    {pegarMinhaReacao(post) ? `${pegarMinhaReacao(post)} Reagiu` : '👍 Curtir'}
  </button>

  <button
    type="button"
    style={botaoPost}
    onClick={() => abrirComentariosPostComunidade(post.id)}
  >
    💬 Comentar
  </button>

  <button
    type="button"
    style={botaoPost}
    onClick={() => abrirCompartilharPostComunidade(post.id)}
  >
    🔄 Espalhar
  </button>
</div>

{comentarioAberto[post.id] && (
  <div style={fundoModalComunidade}>
    <div style={abaComentariosComunidade}>
      <div style={topoModalComunidade}>
        <strong>Comentários</strong>

        <button
          type="button"
          style={botaoFecharModalComunidade}
          onClick={() => abrirComentariosPostComunidade(post.id)}
        >
          ×
        </button>
      </div>

      <div style={areaComentariosComunidade}>
        {(comentariosPosts[post.id] ?? []).length === 0 && (
          <p style={semComentariosComunidade}>
            Ainda não tem comentários.
          </p>
        )}

        {(comentariosPosts[post.id] ?? []).map((comentario) => (
  <div key={comentario.id} style={comentarioItemComunidade}>
    <div style={topoComentarioComunidadeFeed}>
      <button
        type="button"
        style={avatarComentarioComunidadeFeed}
        onClick={() => router.push(`/perfil?id=${comentario.usuario_id}`)}
      >
        {autoresPosts[comentario.usuario_id]?.foto_url ? (
          <img
            src={autoresPosts[comentario.usuario_id].foto_url || ''}
            alt={comentario.autor_nome}
            style={fotoAvatarComentarioComunidadeFeed}
          />
        ) : (
          comentario.autor_nome?.charAt(0)?.toUpperCase() ?? 'U'
        )}
      </button>

      <div>
        <button
          type="button"
          style={nomeComentarioClicavelComunidadeFeed}
          onClick={() => router.push(`/perfil?id=${comentario.usuario_id}`)}
        >
          {comentario.autor_nome}
        </button>

        <p style={dataComentarioComunidadeFeed}>
          {new Date(comentario.criado_em).toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>

        {comentario.autor_username && (
          <p style={usernameComentarioComunidade}>
            @{comentario.autor_username}
          </p>
        )}
      </div>
    </div>

    <p style={textoComentarioComunidade}>
      {comentario.texto}
    </p>

    <button
      type="button"
      style={botaoResponderComentarioFeed}
      onClick={() => abrirRespostaComentario(comentario.id)}
    >
      ↩️ Responder
    </button>

    {(respostasComentarios[comentario.id] ?? []).length > 0 && (
      <div style={listaRespostasComentarioFeed}>
        {(respostasComentarios[comentario.id] ?? []).map((resposta) => (
          <div key={resposta.id} style={respostaComentarioFeedItem}>
            <div style={topoComentarioComunidadeFeed}>
              <button
                type="button"
                style={avatarRespostaComunidadeFeed}
                onClick={() => router.push(`/perfil?id=${resposta.usuario_id}`)}
              >
                {autoresPosts[resposta.usuario_id]?.foto_url ? (
                  <img
                    src={autoresPosts[resposta.usuario_id].foto_url || ''}
                    alt={resposta.autor_nome}
                    style={fotoAvatarComentarioComunidadeFeed}
                  />
                ) : (
                  resposta.autor_nome?.charAt(0)?.toUpperCase() ?? 'U'
                )}
              </button>

              <div>
                <button
                  type="button"
                  style={nomeComentarioClicavelComunidadeFeed}
                  onClick={() => router.push(`/perfil?id=${resposta.usuario_id}`)}
                >
                  {resposta.autor_nome}
                </button>

                <p style={dataComentarioComunidadeFeed}>
                  {new Date(resposta.criado_em).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>

                {resposta.autor_username && (
                  <p style={usernameComentarioComunidade}>
                    @{resposta.autor_username}
                  </p>
                )}
              </div>
            </div>

            <p style={textoComentarioComunidade}>
              {resposta.texto}
            </p>

            <button
              type="button"
              style={botaoResponderComentarioFeed}
              onClick={() => {
                setRespostaAberta((atual) => ({
                  ...atual,
                  [comentario.id]: true
                }))

                setNovaResposta((atual) => ({
                  ...atual,
                  [comentario.id]: `@${resposta.autor_username || resposta.autor_nome} `
                }))
              }}
            >
              ↩️ Responder
            </button>
          </div>
        ))}
      </div>
    )}

    {respostaAberta[comentario.id] && (
      <div style={formRespostaComentarioFeed}>
        <input
          placeholder="Responder comentário..."
          value={novaResposta[comentario.id] ?? ''}
          onChange={(e) => mudarRespostaComentario(comentario.id, e.target.value)}
          style={inputComentarioComunidade}
        />

        <button
          type="button"
          style={botaoEnviarComentarioComunidade}
          onClick={() => enviarRespostaComentario(post, comentario)}
          disabled={salvandoResposta[comentario.id]}
        >
          {salvandoResposta[comentario.id] ? '...' : 'Enviar'}
        </button>
      </div>
    )}
  </div>
))}
      </div>

      <div style={caixaComentarioModalComunidade}>
        <input
          placeholder="Escreva um comentário..."
          value={novoComentario[post.id] ?? ''}
          onChange={(e) => mudarComentarioPostComunidade(post.id, e.target.value)}
          style={inputComentarioComunidade}
        />

        <button
          type="button"
          style={botaoEnviarComentarioComunidade}
          onClick={() => enviarComentarioPostComunidade(post)}
          disabled={salvandoComentario[post.id]}
        >
          {salvandoComentario[post.id] ? '...' : 'Enviar'}
        </button>
      </div>
    </div>
  </div>
)}

{post.compartilharAberto && (
  <div style={fundoModalComunidade}>
    <div style={abaCompartilharComunidade}>
      <div style={topoModalComunidade}>
        <strong>Espalhar publicação</strong>

        <button
          type="button"
          style={botaoFecharModalComunidade}
          onClick={() => abrirCompartilharPostComunidade(post.id)}
        >
          ×
        </button>
      </div>

      <div style={opcoesCompartilharComunidade}>
        <button
          type="button"
          style={opcaoCompartilharComunidade}
          onClick={() => espalharPostComunidadeNoFeed(post)}
        >
          📣 Espalhar no Feed
        </button>

        <button
          type="button"
          style={opcaoCompartilharComunidade}
          onClick={() => copiarLinkPostComunidade(post)}
        >
          🔗 Copiar link
        </button>

        <button
          type="button"
          style={opcaoCompartilharComunidade}
          onClick={() => compartilharWhatsAppComunidade(post)}
        >
          🟢 Enviar no WhatsApp
        </button>
      </div>
    </div>
  </div>
)}
  </article>
))}

            {comunidades.length > 0 && (
  <>
    <div style={linhaTituloFeed}>
      <div>
        <strong style={tituloFeed}>Comunidades criadas</strong>

        <p style={subtituloFeed}>
          Entre em uma comunidade ou veja o que a galera está publicando.
        </p>
      </div>

      <span style={contadorFeed}>
        {comunidadesFiltradas.length}
      </span>
    </div>

    {comunidadesFiltradas.length === 0 && (
      <div style={cardVazio}>
        <strong>Nenhuma comunidade encontrada</strong>

        <p>
          Tente pesquisar pelo nome, cidade, estado ou categoria.
        </p>
      </div>
    )}

    {comunidadesFiltradas.map((comunidade) => (
      <button
        key={comunidade.id}
        type="button"
        style={comunidadeCard}
        onClick={() => abrirComunidade(comunidade.id)}
      >
        <div
  style={{
    ...capaMiniComunidade,
    backgroundImage: comunidade.capa_url
      ? `linear-gradient(rgba(0,0,0,.12), rgba(0,0,0,.12)), url(${comunidade.capa_url})`
      : 'linear-gradient(135deg,#008C3A,#FFD700)',
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }}
>
  {!comunidade.capa_url && '🏘️'}
</div>

        <div style={conteudoComunidadeCard}>
          <strong style={nomeCardComunidade}>
            {comunidade.nome}
          </strong>

          <p style={localCardComunidade}>
            📍 {comunidade.cidade || 'Brasil'}
            {comunidade.estado ? `-${comunidade.estado}` : ''}
          </p>

          <p style={descricaoCardComunidade}>
            {comunidade.descricao || 'Comunidade do BRAZILZÃO'}
          </p>

          <div style={rodapeComunidadeCard}>
            <span>{comunidade.categoria || 'Geral'}</span>
            <strong>Entrar ›</strong>
          </div>
        </div>
      </button>
    ))}
  </>
)}

            {postsComunidades.length === 0 && comunidades.length === 0 && (
              <div style={cardVazio}>
                <strong>Nenhuma comunidade criada ainda</strong>

                <p>
                  Crie a primeira comunidade e comece a juntar a galera.
                </p>

                <button
                  type="button"
                  style={botaoCriarVazio}
                  onClick={() => router.push('/comunidades/criar')}
                >
                  Criar primeira comunidade
                </button>
              </div>
            )}
          </>
        )}
      </section>
          {midiaTelaCheia && (
        <div style={fundoMidiaTelaCheia} onClick={fecharMidiaTelaCheia}>
          <button
            type="button"
            style={botaoFecharMidiaTelaCheia}
            onClick={fecharMidiaTelaCheia}
          >
            ×
          </button>

          <div
            style={caixaMidiaTelaCheia}
            onClick={(e) => e.stopPropagation()}
          >
            {midiaTelaCheia.tipo === 'foto' && (
              <img
                src={midiaTelaCheia.url}
                alt="Mídia em tela cheia"
                style={imagemTelaCheia}
              />
            )}

            {midiaTelaCheia.tipo === 'video' && (
              <video
                src={midiaTelaCheia.url}
                controls
                autoPlay
                style={videoTelaCheia}
              />
            )}
          </div>
        </div>
      )}
    </main>
  )
}

const page = {
  minHeight: '100vh',
  background: '#f2f2f2',
  fontFamily: 'Arial, sans-serif'
}

const topo = {
  background: 'linear-gradient(180deg,#008C3A,#006B2D)',
  color: '#fff',
  padding: '12px 14px',
  position: 'sticky' as const,
  top: 0,
  zIndex: 20,
  boxShadow: '0 3px 12px rgba(0,0,0,.18)'
}

const topoInterno = {
  maxWidth: 520,
  margin: '0 auto',
  display: 'flex',
  alignItems: 'center',
  gap: 12
}

const botaoVoltar = {
  width: 42,
  height: 42,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,.18)',
  color: '#fff',
  fontSize: 34,
  lineHeight: 1,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0
}

const marcaArea = {
  display: 'flex',
  alignItems: 'center',
  gap: 10
}

const logo = {
  width: 62,
  height: 'auto',
  display: 'block',
  objectFit: 'contain' as const
}

const titulo = {
  margin: 0,
  color: '#FFD700',
  fontSize: 23,
  fontWeight: 950,
  lineHeight: 1
}

const subtitulo = {
  margin: '3px 0 0',
  color: '#EAF7EC',
  fontSize: 12,
  fontWeight: 700
}

const container = {
  maxWidth: 520,
  margin: '0 auto',
  padding: 12
}

const painelPrincipal = {
  background: '#fff',
  borderRadius: 20,
  padding: 16,
  boxShadow: '0 3px 12px rgba(0,0,0,.09)',
  marginBottom: 12,
  display: 'grid',
  gap: 12,
  border: '1px solid #E8F2EA'
}

const tituloPainel = {
  color: '#008C3A',
  fontSize: 18,
  fontWeight: 950
}

const textoPainel = {
  color: '#555',
  fontSize: 14,
  lineHeight: 1.45,
  margin: '7px 0 0'
}

const botaoCriar = {
  width: '100%',
  border: 'none',
  background: '#FFD700',
  color: '#064d24',
  borderRadius: 999,
  padding: '13px 16px',
  fontSize: 15,
  fontWeight: 950,
  cursor: 'pointer',
  boxShadow: '0 3px 8px rgba(0,0,0,.12)'
}

const barraPesquisa = {
  background: '#fff',
  borderRadius: 18,
  height: 50,
  padding: '0 14px',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  boxShadow: '0 3px 12px rgba(0,0,0,.08)',
  marginBottom: 14
}

const iconePesquisa = {
  fontSize: 18
}

const inputPesquisa = {
  flex: 1,
  border: 'none',
  outline: 'none',
  background: 'transparent',
  fontSize: 14,
  color: '#222'
}

const linhaTituloFeed = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  margin: '4px 2px 10px',
  gap: 10
}

const tituloFeed = {
  color: '#008C3A',
  fontSize: 16,
  fontWeight: 950
}

const subtituloFeed = {
  margin: '3px 0 0',
  color: '#777',
  fontSize: 12
}

const contadorFeed = {
  minWidth: 34,
  height: 34,
  borderRadius: '50%',
  background: '#008C3A',
  color: '#fff',
  fontSize: 13,
  fontWeight: 950,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const cardVazio = {
  background: '#fff',
  borderRadius: 18,
  padding: 18,
  boxShadow: '0 3px 12px rgba(0,0,0,.08)',
  textAlign: 'center' as const,
  color: '#555',
  marginBottom: 12
}

const postCard = {
  background: '#fff',
  borderRadius: 18,
  padding: 14,
  boxShadow: '0 3px 12px rgba(0,0,0,.09)',
  marginBottom: 14,
  border: '1px solid #eef1ee'
}

const topoPost = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 12
}

const avatarComunidade = {
  width: 44,
  height: 44,
  borderRadius: '50%',
  border: '2px solid #FFD700',
  background: 'linear-gradient(135deg,#008C3A,#FFD700)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: 22,
  flexShrink: 0
}

const infoPost = {
  flex: 1,
  minWidth: 0
}

const nomeComunidade = {
  border: 'none',
  background: 'transparent',
  color: '#008C3A',
  fontSize: 15,
  fontWeight: 950,
  cursor: 'pointer',
  padding: 0,
  textAlign: 'left' as const,
  display: 'block'
}

const metaComunidade = {
  margin: '3px 0 0',
  color: '#666',
  fontSize: 12,
  fontWeight: 700
}

const dataPost = {
  color: '#888',
  fontSize: 11,
  fontWeight: 700,
  flexShrink: 0
}

const autorLinha = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#F8FBF8',
  borderRadius: 14,
  padding: 9,
  marginBottom: 10
}

const avatarAutor = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  background: '#FFD700',
  color: '#008C3A',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 950,
  flexShrink: 0
}

const autorNome = {
  color: '#222',
  fontSize: 13,
  fontWeight: 900
}

const autorUsername = {
  margin: '2px 0 0',
  color: '#777',
  fontSize: 11
}

const textoPost = {
  color: '#222',
  fontSize: 15,
  lineHeight: 1.45,
  whiteSpace: 'pre-wrap' as const,
  margin: '0 0 12px'
}

const acoesPost = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 8,
  borderTop: '1px solid #eee',
  paddingTop: 10
}

const botaoAcao = {
  border: 'none',
  background: '#008C3A',
  color: '#fff',
  borderRadius: 999,
  padding: '10px 12px',
  fontSize: 12,
  fontWeight: 950,
  cursor: 'pointer'
}

const botaoAcaoSecundario = {
  border: 'none',
  background: '#F4F7F4',
  color: '#008C3A',
  borderRadius: 999,
  padding: '10px 12px',
  fontSize: 12,
  fontWeight: 950,
  cursor: 'pointer'
}

const comunidadeCard = {
  width: '100%',
  border: 'none',
  background: '#fff',
  borderRadius: 18,
  overflow: 'hidden',
  boxShadow: '0 3px 12px rgba(0,0,0,.09)',
  marginBottom: 14,
  padding: 0,
  cursor: 'pointer',
  textAlign: 'left' as const,
  color: '#222'
}

const capaMiniComunidade = {
  height: 88,
  background: 'linear-gradient(135deg,#008C3A,#FFD700)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 38
}

const conteudoComunidadeCard = {
  padding: 13
}

const nomeCardComunidade = {
  color: '#008C3A',
  fontSize: 16,
  fontWeight: 950
}

const localCardComunidade = {
  margin: '5px 0',
  color: '#008C3A',
  fontSize: 12,
  fontWeight: 800
}

const descricaoCardComunidade = {
  margin: '7px 0',
  color: '#555',
  fontSize: 13,
  lineHeight: 1.35
}

const rodapeComunidadeCard = {
  borderTop: '1px solid #eee',
  paddingTop: 9,
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  color: '#008C3A',
  fontSize: 12,
  fontWeight: 900
}

const botaoCriarVazio = {
  border: 'none',
  background: '#008C3A',
  color: '#fff',
  borderRadius: 999,
  padding: '11px 15px',
  fontSize: 13,
  fontWeight: 950,
  cursor: 'pointer',
  marginTop: 8
}

const cardPostComunidade = {
  background: '#fff',
  borderRadius: 18,
  padding: 12,
  boxShadow: '0 3px 12px rgba(0,0,0,.09)',
  marginBottom: 14,
  border: '1px solid #eef1ee'
}

const cabecalhoPost = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  marginBottom: 10
}

const avatarComunidadeCardPost = {
  width: 42,
  height: 42,
  borderRadius: '50%',
  border: '2px solid #FFD700',
  background: 'linear-gradient(135deg,#008C3A,#FFD700)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  fontSize: 21,
  flexShrink: 0
}

const areaNomeComunidade = {
  flex: 1,
  display: 'grid',
  gap: 2
}

const nomeComunidadePost = {
  border: 'none',
  background: 'transparent',
  color: '#008C3A',
  fontSize: 15,
  fontWeight: 950,
  cursor: 'pointer',
  padding: 0,
  textAlign: 'left' as const
}

const dataPostCardComunidade = {
  color: '#888',
  fontSize: 11,
  fontWeight: 700
}

const linhaAutor = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  background: '#F8FBF8',
  borderRadius: 14,
  padding: 9,
  marginBottom: 10
}

const avatarAutorCardPost = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  background: '#FFD700',
  color: '#008C3A',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 950,
  flexShrink: 0
}

const nomeAutor = {
  color: '#222',
  fontSize: 13,
  fontWeight: 900
}

const usernameAutor = {
  margin: '2px 0 0',
  color: '#777',
  fontSize: 11
}

const textoDoPost = {
  color: '#222',
  fontSize: 15,
  lineHeight: 1.45,
  whiteSpace: 'pre-wrap' as const,
  margin: '0 0 10px'
}

const caixaFotoPost = {
  width: '100%',
  borderRadius: 16,
  overflow: 'hidden',
  background: '#f1f1f1',
  marginTop: 8,
  marginBottom: 10,
  border: '1px solid #eee'
}

const fotoPost = {
  width: '100%',
  maxHeight: 420,
  objectFit: 'cover' as const,
  display: 'block'
}

const linhaReacoesResumo = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  color: '#777',
  fontSize: 12,
  padding: '4px 2px 9px',
  borderBottom: '1px solid #eee'
}

const emojisReacoes = {
  fontSize: 14
}

const textoReacoesResumo = {
  fontSize: 11,
  color: '#777'
}

const botoesPost = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 6,
  paddingTop: 8
}

const botaoPost = {
  border: 'none',
  background: '#F4F7F4',
  color: '#008C3A',
  borderRadius: 999,
  padding: '9px 5px',
  fontSize: 12,
  fontWeight: 950,
  cursor: 'pointer'
}

const botaoPostAtivoComunidade = {
  border: 'none',
  background: '#EAF7EC',
  color: '#008C3A',
  borderRadius: 999,
  padding: '9px 5px',
  fontSize: 12,
  fontWeight: 950,
  cursor: 'pointer',
  boxShadow: 'inset 0 0 0 1px rgba(0,140,58,.18)'
}

const reacoesFlutuanteComunidade = {
  display: 'flex',
  gap: 8,
  background: '#fff',
  padding: 8,
  borderRadius: 30,
  boxShadow: '0 4px 12px rgba(0,0,0,.25)',
  marginTop: 8,
  marginBottom: 8,
  width: 'fit-content'
}

const botaoReacaoComunidade = {
  border: 'none',
  background: '#f0f0f0',
  padding: 8,
  borderRadius: 10,
  cursor: 'pointer',
  fontSize: 18
}

const rankingReacoesComunidade = {
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  minHeight: 28
}

const itemRankingReacaoComunidade = {
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 0,
  minWidth: 24
}

const emojiRankingReacaoComunidade = {
  fontSize: 18,
  lineHeight: 1
}

const numeroRankingReacaoComunidade = {
  fontSize: 10,
  color: '#333',
  fontWeight: 900,
  lineHeight: 1,
  marginTop: 2
}

const fundoModalComunidade = {
  position: 'fixed' as const,
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(0,0,0,.35)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 9999,
  padding: 16
}

const abaComentariosComunidade = {
  background: '#fff',
  width: '100%',
  maxWidth: 420,
  maxHeight: '75vh',
  borderRadius: 18,
  boxShadow: '0 10px 30px rgba(0,0,0,.35)',
  display: 'flex',
  flexDirection: 'column' as const,
  overflow: 'hidden'
}

const topoModalComunidade = {
  padding: '14px 16px',
  borderBottom: '1px solid #eee',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center'
}

const botaoFecharModalComunidade = {
  border: 'none',
  background: '#eee',
  width: 32,
  height: 32,
  borderRadius: '50%',
  cursor: 'pointer',
  fontSize: 22,
  fontWeight: 900
}

const areaComentariosComunidade = {
  padding: 12,
  overflowY: 'auto' as const,
  flex: 1
}

const semComentariosComunidade = {
  textAlign: 'center' as const,
  color: '#777',
  fontSize: 13
}

const comentarioItemComunidade = {
  background: '#f1f1f1',
  borderRadius: 12,
  padding: '8px 10px',
  marginBottom: 8,
  fontSize: 12
}

const usernameComentarioComunidade = {
  color: '#777',
  fontSize: 11,
  marginLeft: 5
}

const textoComentarioComunidade = {
  margin: '5px 0 0',
  color: '#333',
  lineHeight: 1.4
}

const caixaComentarioModalComunidade = {
  display: 'flex',
  gap: 8,
  padding: 12,
  borderTop: '1px solid #eee',
  background: '#fff'
}

const inputComentarioComunidade = {
  flex: 1,
  border: '1px solid #ddd',
  borderRadius: 999,
  padding: '10px 12px',
  outline: 'none',
  fontSize: 13,
  background: '#f8f8f8'
}

const botaoEnviarComentarioComunidade = {
  border: 'none',
  background: '#008C3A',
  color: '#fff',
  borderRadius: 999,
  padding: '10px 14px',
  fontWeight: 900,
  cursor: 'pointer',
  fontSize: 13
}

const abaCompartilharComunidade = {
  background: '#fff',
  width: '100%',
  maxWidth: 360,
  borderRadius: 18,
  boxShadow: '0 10px 30px rgba(0,0,0,.35)',
  overflow: 'hidden'
}

const opcoesCompartilharComunidade = {
  display: 'grid',
  gap: 8,
  padding: 12
}

const opcaoCompartilharComunidade = {
  border: '1px solid #e5e5e5',
  background: '#f8f8f8',
  borderRadius: 14,
  padding: '12px 14px',
  textAlign: 'left' as const,
  fontWeight: 900,
  cursor: 'pointer',
  color: '#222'
}

const videoPostComunidadeFeed = {
  width: '100%',
  maxHeight: 420,
  borderRadius: 16,
  display: 'block',
  background: '#000'
}

const avatarAutorBotaoCardPost = {
  width: 34,
  height: 34,
  borderRadius: '50%',
  border: 'none',
  background: '#FFD700',
  color: '#008C3A',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 950,
  flexShrink: 0,
  overflow: 'hidden',
  cursor: 'pointer',
  padding: 0
}

const fotoAvatarAutorCardPost = {
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  borderRadius: '50%',
  display: 'block'
}

const nomeAutorClicavelCardPost = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  margin: 0,
  color: '#222',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  textAlign: 'left' as const
}

const fotoCapaBolinhaComunidade = {
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  borderRadius: '50%',
  display: 'block'
}

const topoComentarioComunidadeFeed = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 6
}

const avatarComentarioComunidadeFeed = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  border: 'none',
  background: '#FFD700',
  color: '#008C3A',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 950,
  flexShrink: 0,
  overflow: 'hidden',
  cursor: 'pointer',
  padding: 0
}

const fotoAvatarComentarioComunidadeFeed = {
  width: '100%',
  height: '100%',
  objectFit: 'cover' as const,
  borderRadius: '50%',
  display: 'block'
}

const nomeComentarioClicavelComunidadeFeed = {
  border: 'none',
  background: 'transparent',
  padding: 0,
  margin: 0,
  color: '#111',
  fontSize: 12,
  fontWeight: 900,
  cursor: 'pointer',
  textAlign: 'left' as const
}

const dataComentarioComunidadeFeed = {
  margin: '2px 0 0',
  color: '#777',
  fontSize: 10,
  fontWeight: 700
}

const botaoResponderComentarioFeed = {
  border: 'none',
  background: 'transparent',
  color: '#008C3A',
  fontSize: 12,
  fontWeight: 900,
  cursor: 'pointer',
  padding: 0,
  marginTop: 6
}

const listaRespostasComentarioFeed = {
  marginTop: 8,
  marginLeft: 18,
  borderLeft: '2px solid #DDEBDD',
  paddingLeft: 10,
  display: 'grid',
  gap: 7
}

const respostaComentarioFeedItem = {
  background: '#fff',
  borderRadius: 12,
  padding: '8px 10px',
  fontSize: 12,
  border: '1px solid #eee'
}

const avatarRespostaComunidadeFeed = {
  width: 28,
  height: 28,
  borderRadius: '50%',
  border: 'none',
  background: '#FFD700',
  color: '#008C3A',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 950,
  flexShrink: 0,
  overflow: 'hidden',
  cursor: 'pointer',
  padding: 0
}

const formRespostaComentarioFeed = {
  display: 'flex',
  gap: 8,
  marginTop: 8,
  marginLeft: 18
}

const botaoMidiaPostComunidade = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  padding: 0,
  margin: 0,
  cursor: 'pointer',
  position: 'relative' as const,
  display: 'block',
  textAlign: 'left' as const
}

const seloAbrirVideoComunidade = {
  position: 'absolute' as const,
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'rgba(0,0,0,.65)',
  color: '#fff',
  borderRadius: 999,
  padding: '9px 14px',
  fontSize: 13,
  fontWeight: 950,
  pointerEvents: 'none' as const
}

const fundoMidiaTelaCheia = {
  position: 'fixed' as const,
  inset: 0,
  background: 'rgba(0,0,0,.92)',
  zIndex: 99999,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 12
}

const botaoFecharMidiaTelaCheia = {
  position: 'fixed' as const,
  top: 14,
  right: 14,
  width: 42,
  height: 42,
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,.18)',
  color: '#fff',
  fontSize: 32,
  fontWeight: 900,
  cursor: 'pointer',
  zIndex: 100000,
  lineHeight: 1
}

const caixaMidiaTelaCheia = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const imagemTelaCheia = {
  maxWidth: '100%',
  maxHeight: '92vh',
  objectFit: 'contain' as const,
  borderRadius: 12
}

const videoTelaCheia = {
  maxWidth: '100%',
  maxHeight: '92vh',
  borderRadius: 12,
  background: '#000'
}