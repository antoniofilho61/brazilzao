'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// --- ÍCONES SVG VETORIAIS 3D COMPACTOS ---
function IconeInicio3D({ ativo, isVideos }: { ativo: boolean; isVideos: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>
      <defs>
        <linearGradient id="telhadoGrad" x1="16" y1="2" x2="16" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ativo ? '#FFF59D' : '#00B04B'} />
          <stop offset="100%" stopColor={ativo ? '#FFD700' : '#006B2D'} />
        </linearGradient>
        <linearGradient id="paredeGrad" x1="16" y1="12" x2="16" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ativo ? '#FFFFFF' : (isVideos ? '#334155' : '#E2E8F0')} />
          <stop offset="100%" stopColor={ativo ? '#E0E0E0' : (isVideos ? '#1E293B' : '#CBD5E1')} />
        </linearGradient>
      </defs>
      <ellipse cx="16" cy="29" rx="10" ry="2" fill="rgba(0,0,0,0.15)" />
      <rect x="7" y="13" width="18" height="15" rx="3" fill="url(#paredeGrad)" stroke={ativo ? '#006B2D' : (isVideos ? '#475569' : '#94A3B8')} strokeWidth="1" />
      <rect x="13" y="19" width="6" height="9" rx="1.5" fill={ativo ? '#008C3A' : (isVideos ? '#94A3B8' : '#475569')} />
      <path d="M16 3L3.5 13.5C2.8 14.4 3.4 15.5 4.5 15.5H27.5C28.6 15.5 29.2 14.4 28.5 13.5L16 3Z" fill="url(#telhadoGrad)" />
    </svg>
  )
}

function IconeVideos3D({ ativo, isVideos }: { ativo: boolean; isVideos: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>
      <defs>
        <linearGradient id="videoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ativo ? '#FFD700' : '#2563EB'} />
          <stop offset="100%" stopColor={ativo ? '#FF9800' : '#1D4ED8'} />
        </linearGradient>
      </defs>
      <ellipse cx="16" cy="28" rx="11" ry="2" fill="rgba(0,0,0,0.15)" />
      <rect x="4" y="10" width="24" height="17" rx="4" fill="url(#videoGrad)" stroke={ativo ? '#B45309' : '#1E40AF'} strokeWidth="1" />
      <polygon points="13,14 22,18.5 13,23" fill="#FFFFFF" />
      <path d="M4 8C4 6.3 5.3 5 7 5H25C26.7 5 28 6.3 28 8V11H4V8Z" fill="#1E293B" />
      <path d="M8 5L12 11H15L11 5H8ZM17 5L21 11H24L20 5H17Z" fill="#FFFFFF" opacity="0.9" />
    </svg>
  )
}

function IconeVendas3D({ ativo, isVideos }: { ativo: boolean; isVideos: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>
      <defs>
        <linearGradient id="sacolaGrad" x1="16" y1="8" x2="16" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ativo ? '#FFF59D' : '#9333EA'} />
          <stop offset="100%" stopColor={ativo ? '#FFD700' : '#6B21A8'} />
        </linearGradient>
      </defs>
      <ellipse cx="16" cy="28.5" rx="10" ry="2" fill="rgba(0,0,0,0.15)" />
      <path d="M11 11V7C11 4.8 12.8 3 15 3H17C19.2 3 21 4.8 21 7V11" stroke={ativo ? '#FFFFFF' : '#581C87'} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M5 11C5 9.9 5.9 9 7 9H25C26.1 9 27 9.9 27 11L28.5 25.5C28.7 26.9 27.6 28 26.2 28H5.8C4.4 28 3.3 26.9 3.5 25.5L5 11Z" fill="url(#sacolaGrad)" />
      <circle cx="16" cy="19" r="3" fill={ativo ? '#008C3A' : '#FFFFFF'} opacity="0.9" />
    </svg>
  )
}

function IconeComunidades3D({ ativo, isVideos }: { ativo: boolean; isVideos: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 32 32" fill="none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}>
      <defs>
        <linearGradient id="p1Grad" x1="16" y1="4" x2="16" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ativo ? '#FFFFFF' : '#00B04B'} />
          <stop offset="100%" stopColor={ativo ? '#E2E8F0' : '#006B2D'} />
        </linearGradient>
        <linearGradient id="p2Grad" x1="8" y1="8" x2="8" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={ativo ? '#FFD700' : (isVideos ? '#94A3B8' : '#64748B')} />
          <stop offset="100%" stopColor={ativo ? '#B45309' : (isVideos ? '#475569' : '#334155')} />
        </linearGradient>
      </defs>
      <ellipse cx="16" cy="28.5" rx="12" ry="2" fill="rgba(0,0,0,0.15)" />
      <circle cx="8" cy="11" r="3.5" fill="url(#p2Grad)" />
      <path d="M2 24C2 20.1 5 17 8.8 17H9.2C10.5 17 11.7 17.4 12.7 18.2C10.4 19.8 9 22.3 9 25V26H2V24Z" fill="url(#p2Grad)" opacity="0.85" />
      <circle cx="24" cy="11" r="3.5" fill="url(#p2Grad)" />
      <path d="M30 24C30 20.1 27 17 23.2 17H22.8C21.5 17 20.3 17.4 19.3 18.2C21.6 19.8 23 22.3 23 25V26H30V24Z" fill="url(#p2Grad)" opacity="0.85" />
      <circle cx="16" cy="9" r="4.5" fill="url(#p1Grad)" stroke={ativo ? '#006B2D' : '#1E293B'} strokeWidth="1" />
      <path d="M16 15.5C11.6 15.5 8 18.8 8 23V27H24V23C24 18.8 20.4 15.5 16 15.5Z" fill="url(#p1Grad)" stroke={ativo ? '#006B2D' : '#1E293B'} strokeWidth="1" />
    </svg>
  )
}

export default function BottomNav() {
  const pathname = usePathname()

  // LISTA DE ROTAS ONDE O MENU NÃO DEVE APARECER
  const rotasOcultas = ['/login', '/cadastro', '/entrar', '/recuperar-senha', '/']
  const escondeMenu = rotasOcultas.some(
    (rota) => pathname === rota || (rota !== '/' && pathname?.startsWith(rota))
  )

  // Se estiver na tela de login/entrar/cadastro, esconde o menu completamente
  if (escondeMenu) {
    return null
  }

  // Sobe para o TOPO tanto no /videos quanto no /vendas!
  const isTopPage = pathname?.startsWith('/videos') || pathname?.startsWith('/vendas') || false

  const menuItems = [
    { label: 'Início', href: '/feed', IconComponent: IconeInicio3D },
    { label: 'Vídeos', href: '/videos', IconComponent: IconeVideos3D },
    { label: 'Vendas', href: '/vendas', IconComponent: IconeVendas3D },
    { label: 'Comunidades', href: '/comunidades', IconComponent: IconeComunidades3D },
  ]

  return (
    <nav style={isTopPage ? estilos.containerTopVideos : estilos.containerBottom}>
      <div style={estilos.wrapper}>
        {menuItems.map((item) => {
          const ativo =
            pathname === item.href ||
            (item.href === '/feed' && (pathname === '/feed'))
          const Icone = item.IconComponent
          let btnStyle = estilos.btn3DInativo
          if (ativo) {
            btnStyle = estilos.btn3DAtivo
          } else if (isTopPage) {
            btnStyle = estilos.btn3DInativoDark
          }
          return (
            <Link key={item.href} href={item.href} style={btnStyle}>
              <div style={estilos.containerIcone}>
                <Icone ativo={ativo} isVideos={isTopPage} />
              </div>
              <span
                style={
                  ativo
                    ? estilos.labelAtivo
                    : isTopPage
                    ? estilos.labelInativoDark
                    : estilos.labelInativo
                }
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

// --- ESTILOS ENCAPSULADOS ---
const estilos = {
  containerBottom: {
    position: 'fixed' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderTop: '1px solid #e2e8f0',
    padding: '4px 8px 6px 8px',
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
  },
  containerTopVideos: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(10, 10, 12, 0.92)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
    padding: '6px 8px 6px 8px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
    display: 'flex',
    justifyContent: 'center',
  },
  wrapper: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    maxWidth: 480,
    gap: 6,
  },
  btn3DInativo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 2px 3px 2px',
    borderRadius: 10,
    textDecoration: 'none',
    background: 'linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)',
    border: '1px solid #CBD5E1',
    boxShadow: '0 2px 0 #94A3B8, 0 2px 4px rgba(0,0,0,0.05)',
    transition: 'all 0.1s ease',
    cursor: 'pointer',
  },
  btn3DInativoDark: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 2px 3px 2px',
    borderRadius: 10,
    textDecoration: 'none',
    background: 'linear-gradient(180deg, #262930 0%, #17191D 100%)',
    border: '1px solid #374151',
    boxShadow: '0 2px 0 #0F172A, 0 2px 4px rgba(0,0,0,0.4)',
    transition: 'all 0.1s ease',
    cursor: 'pointer',
  },
  btn3DAtivo: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '4px 2px 3px 2px',
    borderRadius: 10,
    textDecoration: 'none',
    background: 'linear-gradient(180deg, #00B04B 0%, #008C3A 100%)',
    border: '1px solid #006B2D',
    boxShadow: '0 2.5px 0 #005223, 0 4px 8px rgba(0, 140, 58, 0.35)',
    transform: 'translateY(-1px)',
    transition: 'all 0.1s ease',
    cursor: 'pointer',
  },
  containerIcone: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
    marginBottom: 1,
  },
  labelInativo: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#64748B',
  },
  labelInativoDark: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#94A3B8',
  },
  labelAtivo: {
    fontSize: 10,
    fontWeight: '800' as const,
    color: '#FFFFFF',
    textShadow: '0 1px 1px rgba(0,0,0,0.3)',
  },
}