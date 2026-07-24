'use client'

import { useRouter } from 'next/navigation'

export default function Videos() {
  const router = useRouter()

  return (
    <main style={page}>
      <header style={topo}>
        <button style={botaoVoltar} onClick={() => router.push('/feed')}>
          ‹
        </button>

        <div>
          <h1 style={titulo}>Vídeos</h1>
          <p style={subtitulo}>Assista, publique e espalhe vídeos brasileiros</p>
        </div>
      </header>

      <section style={container}>
        <div style={cardDestaque}>
          <strong style={tituloCard}>▶ Vídeos BR</strong>
          <p style={textoCard}>
            Essa área vai reunir vídeos do feed, cortes rápidos,
            conteúdos populares e publicações em formato vertical.
          </p>

          <button style={botaoPrincipal}>
            Publicar vídeo
          </button>
        </div>

        <div style={videoFake}>
          <div style={play}>▶</div>
          <strong>Área de vídeos em construção</strong>
          <p>Logo aqui vão aparecer os vídeos publicados no BRAZILZÃO.</p>
        </div>

        <div style={videoFake}>
          <div style={play}>▶</div>
          <strong>Vídeos populares</strong>
          <p>Depois vamos puxar automaticamente os vídeos com mais reações.</p>
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
  color: '#1458C8',
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
  background: '#1458C8',
  color: '#fff',
  borderRadius: 999,
  padding: '12px 16px',
  fontSize: 15,
  fontWeight: 900,
  cursor: 'pointer'
}

const videoFake = {
  background: '#fff',
  borderRadius: 18,
  padding: 16,
  minHeight: 180,
  boxShadow: '0 3px 12px rgba(0,0,0,.09)',
  marginBottom: 14,
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center' as const,
  color: '#333'
}

const play = {
  width: 58,
  height: 58,
  borderRadius: '50%',
  background: '#1458C8',
  color: '#fff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 26,
  marginBottom: 12
}