'use client'

import { useRouter } from 'next/navigation'

export default function Balcao() {
  const router = useRouter()

  return (
    <main style={page}>
      <header style={topo}>
        <button style={botaoVoltar} onClick={() => router.push('/feed')}>
          ‹
        </button>

        <div>
          <h1 style={titulo}>Vendas</h1>
          <p style={subtitulo}>Compre, venda e divulgue o seu corre</p>
        </div>
      </header>

      <section style={container}>
        <div style={cardDestaque}>
          <strong style={tituloCard}>🛒 Balcão BR</strong>
          <p style={textoCard}>
            Aqui vão aparecer produtos, serviços, anúncios locais,
            lojas, trabalhadores e oportunidades perto da galera.
          </p>

          <button style={botaoPrincipal}>
            Anunciar produto ou serviço
          </button>
        </div>

        <div style={grid}>
          <button style={categoriaCard}>
            <span style={icone}>🚗</span>
            <strong>Veículos</strong>
            <small>Carros, motos e peças</small>
          </button>

          <button style={categoriaCard}>
            <span style={icone}>🏠</span>
            <strong>Casa</strong>
            <small>Móveis e decoração</small>
          </button>

          <button style={categoriaCard}>
            <span style={icone}>📱</span>
            <strong>Eletrônicos</strong>
            <small>Celulares e acessórios</small>
          </button>

          <button style={categoriaCard}>
            <span style={icone}>🛠️</span>
            <strong>Serviços</strong>
            <small>Divulgue seu trabalho</small>
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
  zIndex: 10
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
  cursor: 'pointer'
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

const cardDestaque = {
  background: '#fff',
  borderRadius: 18,
  padding: 16,
  boxShadow: '0 3px 12px rgba(0,0,0,.09)',
  marginBottom: 14
}

const tituloCard = {
  color: '#008C3A',
  fontSize: 18,
  fontWeight: 900
}

const textoCard = {
  color: '#555',
  fontSize: 14,
  lineHeight: 1.45
}

const botaoPrincipal = {
  width: '100%',
  border: 'none',
  background: '#FFD700',
  color: '#006B2D',
  borderRadius: 999,
  padding: '12px 16px',
  fontSize: 15,
  fontWeight: 900,
  cursor: 'pointer'
}

const grid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, 1fr)',
  gap: 10
}

const categoriaCard = {
  border: 'none',
  background: '#fff',
  borderRadius: 16,
  padding: 14,
  minHeight: 120,
  boxShadow: '0 3px 12px rgba(0,0,0,.08)',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  cursor: 'pointer',
  color: '#222'
}

const icone = {
  fontSize: 30
}