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
  verificado: boolean | null
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

    setPostsPerfil(data ?? [])
  }, [])

  const atualizarContadoresSeguidores = useCallback(async (perfilId: string) => {
    try {
      // Quem SEGUE este perfil aberto na tela
      const { count: totalSeguidores } = await supabase
        .from('seguidores')
        .select('id', { count: 'exact', head: true })
        .eq('seguido_id', perfilId)

      // Quem este perfil aberto na tela ESTÁ SEGUINDO
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
        router.push('/feed')
        return
      }

      const ehMeuPerfil = data.id === authUserId

      setPerfilEhMeu(ehMeuPerfil)
      setUsuario(data)

      if (!ehMeuPerfil) {
        verificarSeSeguindo(authUserId, data.id)
      }

      setNome(data.nome ?? '')
      setUsername(data.username ?? '')
      setBio(data.bio ?? '')
      setCidadeNatal(data.cidade_natal ?? data.cidade ?? '')
      setCidadeAtual(data.cidade_atual ?? data.cidade ?? '')
      setDataNascimento(data.data_nascimento ?? '')
      setTipoPerfil(data.tipo_perfil ?? 'pessoal')

      await carregarPostsPerfil(data.id)
    } catch (err) {
      console.error('Erro geral ao carregar perfil:', err)
    } finally {
      setCarregando(false)
    }
  }, [router, searchParams, carregarPostsPerfil, verificarSeSeguindo])

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

    const { data: conv1 } = await supabase
      .from('conversas')
      .select('id')
      .eq('usuario_1', meuUsuarioId)
      .eq('usuario_2', usuario.id)
      .maybeSingle()

    if (conv1?.id) {
      idDaConversa = conv1.id
    } else {
      const { data: conv2 } = await supabase
        .from('conversas')
        .select('id')
        .eq('usuario_1', usuario.id)
        .eq('usuario_2', meuUsuarioId)
        .maybeSingle()

      if (conv2?.id) {
        idDaConversa = conv2.id
      }
    }

    if (!idDaConversa) {
      const { data: novaConversa, error: erroConversa } = await supabase
        .from('conversas')
        .insert({
          usuario_1: meuUsuarioId,
          usuario_2: usuario.id,
          criado_em: new Date().toISOString()
        })
        .select('id')
        .single()

      if (erroConversa) {
        alert('Erro ao criar conversa: ' + erroConversa.message)
        return
      }
      idDaConversa = novaConversa.id
    }

    const texto = prompt(`Enviar mensagem para ${usuario.nome}:`)
    if (!texto || !texto.trim()) return

    const { error } = await supabase.from('mensagens').insert({
      conversa_id: idDaConversa,
      remetente_id: meuUsuarioId,
      destinatario_id: usuario.id,
      texto: texto.trim(),
      lida: false,
      criado_em: new Date().toISOString()
    })

    if (!error) {
      alert('Mensagem enviada com sucesso!')
    } else {
      alert('Erro ao enviar mensagem: ' + error.message)
    }
  }

  function limparUsername(texto: string) {
    return texto
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9._]/g, '')
  }

  function calcularIdade(data: string | null) {
    if (!data) return 'Não informado'

    const nascimento = new Date(data)
    const hoje = new Date()

    let idade = hoje.getFullYear() - nascimento.getFullYear()
    const mes = hoje.getMonth() - nascimento.getMonth()

    if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) {
      idade--
    }

    return `${idade} anos`
  }

  async function salvarPerfil() {
    if (!usuario) return

    if (!perfilEhMeu) {
      alert('Você não pode editar o perfil de outro usuário.')
      return
    }

    if (!nome.trim()) {
      alert('Digite seu nome.')
      return
    }

    if (!username.trim()) {
      alert('Digite seu nome de usuário.')
      return
    }

    const usernameLimpo = limparUsername(username)
    setSalvando(true)

    try {
      const { data: usuarioExistente } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', usernameLimpo)
        .neq('id', usuario.id)
        .maybeSingle()

      if (usuarioExistente) {
        setSalvando(false)
        alert('Esse nome de usuário já está em uso.')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .update({
          nome: nome.trim(),
          username: usernameLimpo,
          bio: bio.trim(),
          cidade_natal: cidadeNatal.trim() || null,
          cidade: cidadeAtual.trim() || null,
          data_nascimento: dataNascimento || null,
          tipo_perfil: tipoPerfil,
        })
        .eq('id', usuario.id)
        .select()
        .single()

      if (error) {
        console.error('Erro ao salvar perfil:', error)
        alert('Erro ao salvar perfil.')
        return
      }

      setUsuario(data)
      setEditando(false)
      alert('Perfil atualizado com sucesso!')
    } catch (err) {
      console.error(err)
    } finally {
      setSalvando(false)
    }
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
    if (!usuario) {
      alert('Usuário não carregado.')
      return
    }

    if (!perfilEhMeu) {
      alert('Você não pode alterar imagem de outro usuário.')
      return
    }

    if (arquivo.size > 5 * 1024 * 1024) {
      alert('O arquivo é muito grande! Escolha uma imagem de até 5MB.')
      return
    }

    try {
      const extensao = arquivo.name.split('.').pop()
      const nomeArquivo = `${usuario.id}/${tipo}-${Date.now()}.${extensao}`

      const { error: erroUpload } = await supabase.storage
        .from('perfis')
        .upload(nomeArquivo, arquivo, {
          cacheControl: '3600',
          upsert: true,
        })

      if (erroUpload) {
        console.error('Erro no upload:', erroUpload)
        alert('Erro ao enviar imagem: ' + erroUpload.message)
        return
      }

      const { data: urlData } = supabase.storage
        .from('perfis')
        .getPublicUrl(nomeArquivo)

      const novaUrl = urlData.publicUrl
      const campoAtualizar = tipo === 'foto' ? { foto_url: novaUrl } : { capa_url: novaUrl }

      const { data, error } = await supabase
        .from('profiles')
        .update(campoAtualizar)
        .eq('id', usuario.id)
        .select()
        .single()

      if (error) {
        console.error(`Erro ao salvar ${tipo}_url:`, error)
        alert(`Erro ao salvar ${tipo}: ` + error.message)
        return
      }

      setUsuario(data)
      alert(tipo === 'foto' ? 'Foto atualizada!' : 'Capa atualizada!')
    } catch (erro) {
      console.error('Erro geral imagem:', erro)
      alert('Erro ao atualizar imagem.')
    }
  }

  async function sairDaConta() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (carregando) {
    return (
      <main style={page}>
        <div style={carregandoBox}>Carregando perfil...</div>
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
    <main style={page}>
      <section style={topo}>
        <h1 style={logo}>BRAZILZÃO</h1>
      </section>

      <section style={container}>
        <div style={cardPerfil}>
          <div
            style={{
              ...capa,
              backgroundImage: capaPerfil
                ? `url(${capaPerfil})`
                : 'linear-gradient(135deg,#008C3A,#FFD700)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
            }}
          >
            {perfilEhMeu && (
              <div style={botaoEditarCapa}>
                Editar capa
                <input
                  type="file"
                  accept="image/*"
                  style={inputCapaInvisivel}
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0]
                    if (!arquivo) return
                    enviarImagemPerfil(arquivo, 'capa')
                  }}
                />
              </div>
            )}
          </div>

          <div style={areaAvatar}>
            <div style={avatar}>
              {fotoPerfil ? (
                <img src={fotoPerfil} alt="Foto de perfil" style={fotoAvatar} />
              ) : (
                inicial
              )}
            </div>

            {perfilEhMeu && (
              <>
                <button style={botaoEditarFoto} onClick={() => fotoRef.current?.click()}>
                  Editar foto
                </button>

                <input
                  ref={fotoRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const arquivo = e.target.files?.[0]
                    if (arquivo) enviarImagemPerfil(arquivo, 'foto')
                  }}
                />
              </>
            )}
          </div>

          <div style={conteudoPerfil}>
            {!editando ? (
              <>
                <h2 style={nomePerfil}>{nomeTela}</h2>
                <p style={usernamePerfil}>@{usernameTela}</p>

                <p style={bioStyle}>
                  {usuario.bio || 'Trabalhador brasileiro no corre diário. 🚀'}
                </p>

                <div style={infoGrid}>
                  <div style={itemInfoPerfil}>
                    <strong style={numeroInfoPerfil}>{postsPerfil.length}</strong>
                    <span style={textoInfoPerfil}>Posts</span>
                  </div>

                  <div style={itemInfoPerfil}>
                    <strong style={numeroInfoPerfil}>{usuario.seguidores_count ?? 0}</strong>
                    <span style={textoInfoPerfil}>Seguidores</span>
                  </div>

                  <div style={itemInfoPerfil}>
                    <strong style={numeroInfoPerfil}>{usuario.seguindo_count ?? 0}</strong>
                    <span style={textoInfoPerfil}>Seguindo</span>
                  </div>
                </div>

                <div style={dadosPessoais}>
                  <h3 style={tituloDadosPessoais}>Dados pessoais</h3>

                  <div style={linhaDadoPessoal}>
                    <span style={iconeDado}>🏠</span>
                    <div style={textoDadoPessoal}>
                      <strong style={rotuloDadoPessoal}>Cidade que nasceu</strong>
                      <span>{usuario.cidade_natal || 'Não informado'}</span>
                    </div>
                  </div>

                  <div style={linhaDadoPessoal}>
                    <span style={iconeDado}>📍</span>
                    <div style={textoDadoPessoal}>
                      <strong style={rotuloDadoPessoal}>Cidade atual</strong>
                      <span>{usuario.cidade_atual || usuario.cidade || 'Não informado'}</span>
                    </div>
                  </div>

                  <div style={linhaDadoPessoal}>
                    <span style={iconeDado}>🎂</span>
                    <div style={textoDadoPessoal}>
                      <strong style={rotuloDadoPessoal}>Idade</strong>
                      <span>{calcularIdade(usuario.data_nascimento)}</span>
                    </div>
                  </div>
                </div>

                {perfilEhMeu ? (
                  <>
                    <button style={botaoEditar} onClick={() => setEditando(true)}>
                      Editar perfil
                    </button>
                    <button style={botaoSair} onClick={sairDaConta}>
                      Sair da conta
                    </button>
                  </>
                ) : (
                  <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                    <button
                      style={{
                        ...botao,
                        marginTop: 0,
                        background: estouSeguindo ? '#e4e6eb' : '#008C3A',
                        color: estouSeguindo ? '#050505' : '#fff'
                      }}
                      onClick={alternarSeguir}
                      disabled={processandoSeguir}
                    >
                      {estouSeguindo ? 'Seguindo' : 'Seguir'}
                    </button>

                    <button
                      style={{ ...botaoMensagem, marginTop: 0 }}
                      onClick={enviarMensagem}
                    >
                      Enviar mensagem
                    </button>
                  </div>
                )}

                <button style={{ ...botao, background: '#65676b', marginTop: 10 }} onClick={() => router.push('/feed')}>
                  Voltar para o Início
                </button>
              </>
            ) : (
              <>
                <h2 style={nomePerfil}>Editar perfil</h2>

                <input
                  style={input}
                  placeholder="Nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />

                <input
                  style={input}
                  placeholder="Usuário"
                  value={username}
                  onChange={(e) => setUsername(limparUsername(e.target.value))}
                />

                <textarea
                  style={textarea}
                  placeholder="Bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />

                <input
                  style={input}
                  placeholder="Cidade que nasceu"
                  value={cidadeNatal}
                  onChange={(e) => setCidadeNatal(e.target.value)}
                />

                <input
                  style={input}
                  placeholder="Cidade atual"
                  value={cidadeAtual}
                  onChange={(e) => setCidadeAtual(e.target.value)}
                />

                <input
                  style={input}
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />

                <select
                  style={input}
                  value={tipoPerfil}
                  onChange={(e) => setTipoPerfil(e.target.value)}
                >
                  <option value="pessoal">Pessoal</option>
                  <option value="comercial">Comercial</option>
                  <option value="criador">Criador de conteúdo</option>
                  <option value="pagina">Página / Projeto</option>
                </select>

                <button
                  style={botaoEditar}
                  onClick={salvarPerfil}
                  disabled={salvando}
                >
                  {salvando ? 'Salvando...' : 'Salvar alterações'}
                </button>

                <button style={botaoCancelar} onClick={cancelarEdicao}>
                  Cancelar
                </button>
              </>
            )}
          </div>
        </div>

        <section style={areaPosts}>
          <h2 style={tituloPosts}>Postagens do perfil</h2>

          {postsPerfil.length === 0 && (
            <p style={semPosts}>Ainda não tem postagens neste perfil.</p>
          )}

          {postsPerfil.map((post) => (
            <article key={post.id} style={postCard}>
              <div style={postTopo}>
                <div style={miniAvatar}>
                  {fotoPerfil ? (
                    <img src={fotoPerfil} alt="Foto" style={fotoAvatar} />
                  ) : (
                    inicial
                  )}
                </div>

                <div>
                  <strong>{nomeTela}</strong>
                  <p style={postVisibilidade}>
                    {post.visibilidade === 'seguidores'
                      ? '👥 Só seguidores'
                      : '🌍 Mundial'}
                  </p>
                </div>
              </div>

              <p style={textoPost}>
                {post.conteudo?.texto || 'Publicação sem texto.'}
              </p>

              {post.conteudo?.midiaUrl && post.conteudo?.tipoMidia === 'foto' && (
                <img
                  src={post.conteudo.midiaUrl}
                  alt="Foto do post"
                  style={midiaPost}
                />
              )}

              {post.conteudo?.midiaUrl && post.conteudo?.tipoMidia === 'video' && (
                <video
                  src={post.conteudo.midiaUrl}
                  controls
                  style={midiaPost}
                />
              )}
            </article>
          ))}
        </section>
      </section>
    </main>
  )
}

export default function Perfil() {
  return (
    <Suspense fallback={<div style={carregandoBox}>Carregando perfil...</div>}>
      <ConteudoPerfil />
    </Suspense>
  )
}

const page = { minHeight: '100vh', background: '#f2f2f2', fontFamily: 'Arial, sans-serif' }
const carregandoBox = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008C3A', fontWeight: 900, fontSize: 18 }
const topo = { height: 130, background: 'linear-gradient(180deg,#008C3A,#006B2D)', display: 'flex', alignItems: 'center', justifyContent: 'center' }
const logo = { color: '#FFD700', fontSize: 32, fontWeight: 900 }
const container = { maxWidth: 520, margin: '0 auto', padding: 12 }
const cardPerfil = { background: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 8px 25px rgba(0,0,0,.15)' }
const capa = { height: 170, position: 'relative' as const }
const botaoEditarCapa = { position: 'absolute' as const, right: 12, bottom: 12, background: 'rgba(0,0,0,.65)', color: '#fff', borderRadius: 999, padding: '9px 14px', fontWeight: 900, cursor: 'pointer', fontSize: 13, zIndex: 20, overflow: 'hidden', display: 'inline-block' }
const areaAvatar = { position: 'relative' as const, textAlign: 'center' as const, marginTop: -48 }
const avatar = { width: 96, height: 96, borderRadius: '50%', background: '#FFD700', color: '#008C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, fontWeight: 'bold', margin: '0 auto', border: '5px solid #fff', overflow: 'hidden' }
const botaoEditarFoto = { border: 'none', background: '#008C3A', color: '#fff', borderRadius: 999, padding: '7px 12px', fontWeight: 900, cursor: 'pointer', marginTop: 8 }
const fotoAvatar = { width: '100%', height: '100%', objectFit: 'cover' as const }
const conteudoPerfil = { padding: 20, textAlign: 'center' as const }
const nomePerfil = { margin: '0 0 4px', color: '#111', fontSize: 24, fontWeight: 900 }
const usernamePerfil = { margin: '0 0 8px', color: '#008C3A', fontWeight: 800 }
const bioStyle = { color: '#444', lineHeight: 1.5 }
const infoGrid = { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 15, margin: '22px 0' }
const dadosPessoais = { background: '#F4FFF6', border: '1px solid #D8F0DE', borderRadius: 16, padding: 16, textAlign: 'left' as const, fontSize: 14, color: '#333', marginBottom: 16 }
const botao = { width: '100%', padding: 13, border: 'none', borderRadius: 12, background: '#008C3A', color: '#fff', fontWeight: 'bold', cursor: 'pointer', marginTop: 10, flex: 1 }
const botaoEditar = { width: '100%', padding: 13, border: 'none', borderRadius: 12, background: '#FFD700', color: '#111', fontWeight: 'bold', cursor: 'pointer', marginTop: 10 }
const botaoCancelar = { width: '100%', padding: 13, border: 'none', borderRadius: 12, background: '#eee', color: '#111', fontWeight: 'bold', cursor: 'pointer', marginTop: 10 }
const botaoSair = { width: '100%', padding: 13, border: 'none', borderRadius: 12, background: '#f3f3f3', color: '#c62828', fontWeight: 'bold', cursor: 'pointer', marginTop: 10 }
const input = { width: '100%', padding: 13, marginBottom: 10, borderRadius: 10, border: '1px solid #ddd', boxSizing: 'border-box' as const, outline: 'none' }
const textarea = { width: '100%', minHeight: 90, padding: 13, marginBottom: 10, borderRadius: 10, border: '1px solid #ddd', boxSizing: 'border-box' as const, outline: 'none', resize: 'none' as const, fontFamily: 'inherit' }
const areaPosts = { marginTop: 18 }
const tituloPosts = { color: '#008C3A', fontSize: 20, fontWeight: 900, margin: '0 0 12px' }
const semPosts = { background: '#fff', borderRadius: 16, padding: 16, color: '#777', textAlign: 'center' as const }
const postCard = { background: '#fff', borderRadius: 18, padding: 14, marginBottom: 14, boxShadow: '0 3px 12px rgba(0,0,0,.09)', border: '1px solid #eef1ee' }
const postTopo = { display: 'flex', gap: 10, alignItems: 'center' }
const miniAvatar = { width: 42, height: 42, borderRadius: '50%', background: '#FFD700', color: '#008C3A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, overflow: 'hidden' }
const postVisibilidade = { margin: 0, color: '#008C3A', fontSize: 12, fontWeight: 800 }
const textoPost = { fontSize: 15, color: '#222', lineHeight: 1.45, whiteSpace: 'pre-wrap' as const }
const midiaPost = { width: '100%', maxHeight: 420, objectFit: 'cover' as const, borderRadius: 14, marginTop: 10, background: '#000' }
const tituloDadosPessoais = { margin: '0 0 12px', color: '#008C3A', fontSize: 16, fontWeight: 900 }
const linhaDadoPessoal = { display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }
const iconeDado = { fontSize: 18, lineHeight: 1.2 }
const textoDadoPessoal = { display: 'flex', flexDirection: 'column' as const, gap: 2, color: '#333', fontSize: 14 }
const rotuloDadoPessoal = { color: '#111', fontSize: 14 }
const inputCapaInvisivel = { position: 'absolute' as const, inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }
const itemInfoPerfil = { display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 5, background: '#F8F8F8', borderRadius: 14, padding: '12px 6px', border: '1px solid #eee' }
const numeroInfoPerfil = { fontSize: 18, fontWeight: 900, color: '#111', lineHeight: 1 }
const textoInfoPerfil = { fontSize: 12, fontWeight: 800, color: '#555', lineHeight: 1.2 }
const botaoMensagem = { width: '100%', padding: 13, border: 'none', borderRadius: 12, background: '#008C3A', color: '#fff', fontWeight: 'bold', cursor: 'pointer', marginTop: 10, flex: 1 }