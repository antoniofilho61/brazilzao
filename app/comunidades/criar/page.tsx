'use client'

import { useState } from 'react'
import { supabase } from '@/utils/supabase/client'

export default function CriarComunidade() {
  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [cidade, setCidade] = useState('')
  const [estado, setEstado] = useState('')
  const [categoria, setCategoria] = useState('Cidade/Bairro')
  const [privacidade, setPrivacidade] = useState('publica')
  const [salvando, setSalvando] = useState(false)

  async function criarComunidade() {
    const nomeLimpo = nome.trim()
    const descricaoLimpa = descricao.trim()
    const cidadeLimpa = cidade.trim()
    const estadoLimpo = estado.trim().toUpperCase()

    if (!nomeLimpo) {
      alert('Digite o nome da comunidade.')
      return
    }

    if (!descricaoLimpa) {
      alert('Digite uma descrição para a comunidade.')
      return
    }

    if (!cidadeLimpa) {
      alert('Digite a cidade ou região da comunidade.')
      return
    }

    if (!estadoLimpo) {
      alert('Digite o estado/UF. Ex: PI, DF, GO.')
      return
    }

    setSalvando(true)

    const { data: sessaoData, error: erroSessao } = await supabase.auth.getSession()

    if (erroSessao) {
      console.log('Erro ao buscar sessão:', erroSessao)
      alert('Erro ao verificar login.')
      setSalvando(false)
      return
    }

    const authUser = sessaoData.session?.user

    if (!authUser) {
      alert('Faça login para criar uma comunidade.')
      window.location.href = '/login'
      return
    }

    const { data: usuarioData, error: erroUsuario } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', authUser.id)
      .single()

    if (erroUsuario || !usuarioData) {
      console.log('Erro ao buscar usuário:', erroUsuario)
      alert('Usuário não encontrado.')
      setSalvando(false)
      return
    }

    const { data: comunidadeCriada, error } = await supabase
      .from('comunidades')
      .insert({
        dono_id: usuarioData.id,
        nome: nomeLimpo,
        descricao: descricaoLimpa,
        cidade: cidadeLimpa,
        estado: estadoLimpo,
        categoria,
        privacidade,
        membros_count: 1
      })
      .select('id')
      .single()

    setSalvando(false)

    if (error || !comunidadeCriada) {
      console.log('Erro ao criar comunidade:', error)
      alert(`Erro ao criar comunidade: ${error?.message ?? 'sem mensagem'}`)
      return
    }

    window.location.href = `/comunidades/${comunidadeCriada.id}`
  }

  return (
    <main style={page}>
      <header style={topo}>
        <a
  href="/comunidades"
  style={botaoVoltar}
>
  ‹
</a>

        <div>
          <h1 style={titulo}>Criar comunidade</h1>
          <p style={subtitulo}>Monte sua praça digital no BRAZILZÃO</p>
        </div>
      </header>

      <section style={container}>
        <div style={cardIntro}>
          <strong style={tituloCard}>🏘️ Nova comunidade</strong>

          <p style={textoCard}>
            Crie um espaço para cidade, bairro, vendas, futebol, memes,
            notícias, eventos ou qualquer corre que junte a galera.
          </p>
        </div>

        <div style={formulario}>
          <label style={label}>
            Nome da comunidade
            <input
              placeholder="Ex: Luzilândia-PI"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              style={input}
            />
          </label>

          <label style={label}>
            Descrição
            <textarea
              placeholder="Explique o objetivo da comunidade..."
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              style={textarea}
            />
          </label>

          <label style={label}>
            Cidade ou região
            <input
              placeholder="Ex: Luzilândia, Ceilândia, Águas Lindas..."
              value={cidade}
              onChange={(e) => setCidade(e.target.value)}
              style={input}
            />
          </label>

          <label style={label}>
            Estado / UF
            <input
              placeholder="Ex: PI, DF, GO, SP..."
              value={estado}
              onChange={(e) => setEstado(e.target.value.toUpperCase())}
              style={input}
              maxLength={2}
            />
          </label>

          <label style={label}>
            Categoria
            <select
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              style={select}
            >
              <option value="Cidade/Bairro">📍 Cidade/Bairro</option>
              <option value="Vendas e Serviços">🛒 Vendas e Serviços</option>
              <option value="Futebol">⚽ Futebol</option>
              <option value="Humor/Memes">😂 Humor/Memes</option>
              <option value="Notícias">📰 Notícias</option>
              <option value="Música e Cultura">🎵 Música e Cultura</option>
              <option value="Profissões/O Corre">🛠️ Profissões/O Corre</option>
              <option value="Eventos/Rolês">🎉 Eventos/Rolês</option>
              <option value="Games/Tecnologia">🎮 Games/Tecnologia</option>
              <option value="Geral">🇧🇷 Geral</option>
            </select>
          </label>

          <label style={label}>
            Privacidade
            <select
              value={privacidade}
              onChange={(e) => setPrivacidade(e.target.value)}
              style={select}
            >
              <option value="publica">🌍 Pública</option>
              <option value="privada">🔒 Privada</option>
            </select>
          </label>

          <div style={previewBox}>
            <div style={previewCapa}>
              <span style={previewIcone}>🏘️</span>
            </div>

            <div style={previewConteudo}>
              <strong>{nome || 'Nome da comunidade'}</strong>

              <p>
                {descricao || 'A descrição da comunidade vai aparecer aqui.'}
              </p>

              <small>
                {cidade || 'Brasil'}
                {estado ? `-${estado}` : ''} • {categoria}
              </small>
            </div>
          </div>

          <button
            type="button"
            style={salvando ? botaoCriando : botaoCriar}
            onClick={criarComunidade}
            disabled={salvando}
          >
            {salvando ? 'Criando comunidade...' : 'Criar comunidade'}
          </button>
        </div>
      </section>
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
  padding: 14,
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  position: 'sticky' as const,
  top: 0,
  zIndex: 10,
  boxShadow: '0 3px 12px rgba(0,0,0,.18)'
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
  textDecoration: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const titulo = {
  margin: 0,
  color: '#FFD700',
  fontSize: 24,
  fontWeight: 900
}

const subtitulo = {
  margin: '2px 0 0',
  color: '#EAF7EC',
  fontSize: 12,
  fontWeight: 700
}

const container = {
  maxWidth: 520,
  margin: '0 auto',
  padding: 12
}

const cardIntro = {
  background: '#fff',
  borderRadius: 20,
  padding: 16,
  boxShadow: '0 3px 12px rgba(0,0,0,.09)',
  marginBottom: 12,
  border: '1px solid #E8F2EA'
}

const tituloCard = {
  color: '#008C3A',
  fontSize: 18,
  fontWeight: 900
}

const textoCard = {
  color: '#555',
  fontSize: 14,
  lineHeight: 1.45,
  margin: '8px 0 0'
}

const formulario = {
  background: '#fff',
  borderRadius: 20,
  padding: 16,
  boxShadow: '0 3px 12px rgba(0,0,0,.09)',
  display: 'grid',
  gap: 12
}

const label = {
  display: 'grid',
  gap: 6,
  color: '#008C3A',
  fontSize: 13,
  fontWeight: 900
}

const input = {
  width: '100%',
  height: 46,
  border: '1px solid #DDEBE1',
  borderRadius: 14,
  padding: '0 12px',
  outline: 'none',
  fontSize: 14,
  color: '#222',
  background: '#F8FBF8',
  boxSizing: 'border-box' as const
}

const textarea = {
  width: '100%',
  minHeight: 96,
  border: '1px solid #DDEBE1',
  borderRadius: 14,
  padding: 12,
  outline: 'none',
  resize: 'none' as const,
  fontSize: 14,
  color: '#222',
  background: '#F8FBF8',
  fontFamily: 'inherit',
  boxSizing: 'border-box' as const
}

const select = {
  width: '100%',
  height: 46,
  border: '1px solid #DDEBE1',
  borderRadius: 14,
  padding: '0 12px',
  outline: 'none',
  fontSize: 14,
  color: '#222',
  background: '#F8FBF8',
  boxSizing: 'border-box' as const
}

const previewBox = {
  border: '1px solid #E4EFE6',
  borderRadius: 18,
  overflow: 'hidden',
  background: '#fff'
}

const previewCapa = {
  height: 92,
  background: 'linear-gradient(135deg,#008C3A,#FFD700)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const previewIcone = {
  width: 56,
  height: 56,
  borderRadius: '50%',
  background: 'rgba(255,255,255,.9)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 28,
  boxShadow: '0 3px 8px rgba(0,0,0,.18)'
}

const previewConteudo = {
  padding: 12,
  display: 'grid',
  gap: 5,
  color: '#333'
}

const botaoCriar = {
  width: '100%',
  border: 'none',
  background: '#008C3A',
  color: '#fff',
  borderRadius: 999,
  padding: '13px 16px',
  fontSize: 15,
  fontWeight: 900,
  cursor: 'pointer',
  boxShadow: '0 3px 8px rgba(0,140,58,.25)'
}

const botaoCriando = {
  ...botaoCriar,
  opacity: .65,
  cursor: 'not-allowed'
}