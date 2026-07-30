'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// DADOS FALSOS APENAS PARA O PROTÓTIPO
const MOCK_SAQUES = [
  { id: 1, usuario: 'Marcos Silva', chavePix: '123.456.789-00', valor: 150.00, status: 'pendente', data: '27/07/2026' },
  { id: 2, usuario: 'Ana Souza', chavePix: 'ana@email.com', valor: 85.50, status: 'pendente', data: '27/07/2026' },
]

const MOCK_DENUNCIAS = [
  { id: 1, anuncio: 'iPhone 13 Pro Max - R$ 500', motivo: 'Suspeita de Golpe', autor: 'João', data: '27/07/2026' },
]

// ÍCONES 3D DA MICROSOFT FLUENT UI
const ICONES = {
  resumo: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Bar%20chart/3D/bar_chart_3d.png",
  financeiro: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Money%20with%20wings/3D/money_with_wings_3d.png",
  moderacao: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Triangular%20flag/3D/triangular_flag_3d.png",
  usuarios: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Busts%20in%20silhouette/3D/busts_in_silhouette_3d.png",
  anuncios: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Package/3D/package_3d.png",
  pro: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Crown/3D/crown_3d.png",
  lucro: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Money-mouth%20face/3D/money-mouth_face_3d.png",
  check: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Check%20mark%20button/3D/check_mark_button_3d.png",
  cross: "https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Cross%20mark/3D/cross_mark_3d.png",
}

export default function AdminPanelPrototipo() {
  const router = useRouter()
  const [abaAtiva, setAbaAtiva] = useState<'resumo' | 'financeiro' | 'moderacao'>('resumo')

  return (
    <div style={estilos.container}>
      {/* HEADER ADMIN */}
      <header style={estilos.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={estilos.logoBR}>BR</div>
          <div style={{ fontSize: 22, fontWeight: '900', color: '#111', letterSpacing: '-0.5px' }}>
            Painel <span style={{ color: '#008C3A' }}>Admin</span>
          </div>
        </div>
        <button onClick={() => router.push('/perfil')} style={estilos.btnSair3D}>
          Voltar ao App
        </button>
      </header>

      {/* MENU DE NAVEGAÇÃO DO ADMIN (TABS) */}
      <div style={estilos.navBar}>
        <button onClick={() => setAbaAtiva('resumo')} style={abaAtiva === 'resumo' ? estilos.navBtnAtivo : estilos.navBtnInativo}>
          <img src={ICONES.resumo} alt="Resumo" style={estilos.iconeTab} />
          <span>Resumo</span>
        </button>
        <button onClick={() => setAbaAtiva('financeiro')} style={abaAtiva === 'financeiro' ? estilos.navBtnAtivo : estilos.navBtnInativo}>
          <img src={ICONES.financeiro} alt="Financeiro" style={estilos.iconeTab} />
          <span>Financeiro</span>
        </button>
        <button onClick={() => setAbaAtiva('moderacao')} style={abaAtiva === 'moderacao' ? estilos.navBtnAtivo : estilos.navBtnInativo}>
          <img src={ICONES.moderacao} alt="Moderação" style={estilos.iconeTab} />
          <span>Moderação</span>
        </button>
      </div>

      <div style={estilos.conteudo}>
        
        {/* ABA: RESUMO */}
        {abaAtiva === 'resumo' && (
          <div>
            <h2 style={estilos.tituloSessao}>Visão Geral</h2>
            <div style={estilos.gridCards}>
              
              <div style={estilos.cardStat}>
                <div style={estilos.boxIconeStat}><img src={ICONES.usuarios} alt="Usuários" style={estilos.iconeStat} /></div>
                <span style={estilos.statLabel}>Usuários Ativos</span>
                <strong style={estilos.statValor}>1.248</strong>
              </div>
              
              <div style={estilos.cardStat}>
                <div style={estilos.boxIconeStat}><img src={ICONES.anuncios} alt="Anúncios" style={estilos.iconeStat} /></div>
                <span style={estilos.statLabel}>Anúncios Ativos</span>
                <strong style={estilos.statValor}>4.590</strong>
              </div>
              
              <div style={estilos.cardStat}>
                <div style={estilos.boxIconeStat}><img src={ICONES.pro} alt="PRO" style={estilos.iconeStat} /></div>
                <span style={estilos.statLabel}>Lojistas PRO</span>
                <strong style={estilos.statValor}>112</strong>
              </div>
              
              <div style={{ ...estilos.cardStat, border: '2px solid #008C3A', background: '#e6f4ea' }}>
                <div style={{ ...estilos.boxIconeStat, background: '#fff' }}><img src={ICONES.lucro} alt="Lucro" style={estilos.iconeStat} /></div>
                <span style={{ ...estilos.statLabel, color: '#008C3A' }}>Lucro do Mês</span>
                <strong style={{ ...estilos.statValor, color: '#008C3A' }}>R$ 8.450,00</strong>
              </div>

            </div>
          </div>
        )}

        {/* ABA: FINANCEIRO (SAQUES) */}
        {abaAtiva === 'financeiro' && (
          <div>
            <h2 style={estilos.tituloSessao}>Solicitações de Saque</h2>
            <p style={{ fontSize: 14, color: '#65676b', marginBottom: 20 }}>Faça o PIX pelo seu banco e marque como pago aqui.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {MOCK_SAQUES.map((saque) => (
                <div key={saque.id} style={estilos.cardItem3D}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong style={{ fontSize: 17, color: '#111', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <img src={ICONES.financeiro} style={{ width: 20, height: 20 }} alt="" /> {saque.usuario}
                      </strong>
                      <span style={{ display: 'block', fontSize: 14, color: '#65676b', margin: '6px 0' }}>Chave: <strong style={{ color: '#111' }}>{saque.chavePix}</strong></span>
                      <span style={{ fontSize: 12, color: '#888' }}>{saque.data}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <strong style={{ fontSize: 20, color: '#ef4444', display: 'block' }}>- R$ {saque.valor.toFixed(2)}</strong>
                      <span style={estilos.badgePendente}>Pendente</span>
                    </div>
                  </div>
                  
                  <div style={{ borderTop: '1px dashed #d1d5db', marginTop: 14, paddingTop: 14, display: 'flex', gap: 10 }}>
                    <button style={estilos.btnAprovar3D}>
                      <img src={ICONES.check} alt="Pago" style={{ width: 18, height: 18 }} /> Marcar Pago
                    </button>
                    <button style={estilos.btnRejeitar3D}>
                       Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ABA: MODERAÇÃO (DENÚNCIAS) */}
        {abaAtiva === 'moderacao' && (
          <div>
            <h2 style={estilos.tituloSessao}>Denúncias Pendentes</h2>
            <p style={{ fontSize: 14, color: '#65676b', marginBottom: 20 }}>Analise os itens reportados pela comunidade.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {MOCK_DENUNCIAS.map((denuncia) => (
                <div key={denuncia.id} style={estilos.cardItem3D}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 44, height: 44, background: '#fee2e2', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <img src={ICONES.moderacao} alt="Flag" style={{ width: 28, height: 28 }} />
                    </div>
                    <div>
                      <strong style={{ fontSize: 14, color: '#ef4444', textTransform: 'uppercase', letterSpacing: 0.5 }}>{denuncia.motivo}</strong>
                      <span style={{ display: 'block', fontSize: 16, color: '#111', margin: '4px 0', fontWeight: '900' }}>{denuncia.anuncio}</span>
                      <span style={{ fontSize: 13, color: '#65676b' }}>Por @{denuncia.autor} em {denuncia.data}</span>
                    </div>
                  </div>
                  
                  <div style={{ borderTop: '1px dashed #d1d5db', marginTop: 14, paddingTop: 14, display: 'flex', gap: 10 }}>
                    <button style={estilos.btnNeutro3D}>👀 Ver Anúncio</button>
                    <button style={estilos.btnRejeitar3D}>
                      <img src={ICONES.cross} alt="X" style={{ width: 16, height: 16 }} /> Apagar Anúncio
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

const estilos = {
  container: { width: '100%', maxWidth: 500, margin: '0 auto', height: '100vh', background: '#f4f5f7', display: 'flex', flexDirection: 'column' as const },
  header: { padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' },
  logoBR: { width: 36, height: 36, borderRadius: '10px', background: '#111', color: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '900' as const, fontSize: 16, boxShadow: '0 4px 0 #000' },
  btnSair3D: { background: '#f8f9fa', border: '1px solid #d1d5db', padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: '900' as const, cursor: 'pointer', color: '#111', boxShadow: '0 3px 0 #d1d5db', transform: 'translateY(-2px)', transition: 'all 0.1s' },
  navBar: { display: 'flex', background: '#fff', borderBottom: '1px solid #e5e7eb', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' },
  navBtnAtivo: { flex: 1, padding: '14px 0', background: '#f0fdf4', border: 'none', borderBottom: '3px solid #008C3A', color: '#008C3A', fontWeight: '900' as const, fontSize: 13, cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4, transition: 'all 0.2s' },
  navBtnInativo: { flex: 1, padding: '14px 0', background: 'none', border: 'none', borderBottom: '3px solid transparent', color: '#65676b', fontWeight: 'bold' as const, fontSize: 13, cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4, transition: 'all 0.2s' },
  iconeTab: { width: 24, height: 24, objectFit: 'contain' as const, filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.1))' },
  conteudo: { padding: '20px', flex: 1, overflowY: 'auto' as const },
  tituloSessao: { fontSize: 20, fontWeight: '900' as const, color: '#111', margin: '0 0 16px 0' },
  gridCards: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 },
  cardStat: { background: '#fff', padding: '18px', borderRadius: 20, border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-start', boxShadow: '0 4px 6px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.05)' },
  boxIconeStat: { width: 46, height: 46, borderRadius: 14, background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  iconeStat: { width: 28, height: 28, objectFit: 'contain' as const, filter: 'drop-shadow(0 3px 3px rgba(0,0,0,0.15))' },
  statLabel: { fontSize: 13, color: '#65676b', marginTop: 12, fontWeight: 'bold' as const },
  statValor: { fontSize: 24, fontWeight: '900' as const, color: '#111', marginTop: 4, letterSpacing: '-0.5px' },
  
  cardItem3D: { background: '#fff', padding: '18px', borderRadius: 20, border: '1px solid #e5e7eb', boxShadow: '0 6px 12px rgba(0,0,0,0.04), 0 2px 4px rgba(0,0,0,0.02)' },
  badgePendente: { display: 'inline-block', background: '#fef3c7', color: '#b91c1c', padding: '4px 8px', borderRadius: 8, fontSize: 11, fontWeight: 'bold' as const, marginTop: 4, border: '1px solid #fca5a5' },
  
  // Botões com efeito 3D
  btnAprovar3D: { flex: 1, background: '#008C3A', color: '#fff', border: 'none', padding: '12px', borderRadius: 12, fontWeight: '900' as const, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, boxShadow: '0 4px 0 #00662a', transform: 'translateY(-2px)' },
  btnRejeitar3D: { flex: 1, background: '#ef4444', color: '#fff', border: 'none', padding: '12px', borderRadius: 12, fontWeight: '900' as const, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, boxShadow: '0 4px 0 #b91c1c', transform: 'translateY(-2px)' },
  btnNeutro3D: { flex: 1, background: '#f0f2f5', color: '#111', border: '1px solid #d1d5db', padding: '12px', borderRadius: 12, fontWeight: '900' as const, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 14, boxShadow: '0 4px 0 #d1d5db', transform: 'translateY(-2px)' },
}