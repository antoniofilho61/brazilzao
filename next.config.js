/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 👈 OBRIGATÓRIO para o Capacitor ler o novo código!
  images: {
    unoptimized: true, // Evita erro ao compilar imagens no build estático
  },
}

module.exports = nextConfig