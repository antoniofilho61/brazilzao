import './globals.css'
import BottomNav from '@/components/BottomNav'
import GlobalCallListener from '@/components/GlobalCallListener'

export const metadata = {
  title: 'Brazilzão',
  description: 'O corre conectado',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, padding: 0 }}>
        {/* ESCUTA GLOBAL DE CHAMADAS & REGISTRO PUSH FCM */}
        <GlobalCallListener />

        {/* Espaçamento no rodapé para o menu não cobrir o final da página */}
        <main style={{ paddingBottom: '80px' }}>
          {children}
        </main>

        {/* BARRA INFERIOR 3D */}
        <BottomNav />
      </body>
    </html>
  )
}