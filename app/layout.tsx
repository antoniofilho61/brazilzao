import './globals.css' // ou seus imports de estilo

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

// ⚠️ O Next.js EXIGE essa palavra "export default" na função do RootLayout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}