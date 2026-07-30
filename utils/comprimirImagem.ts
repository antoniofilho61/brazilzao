export async function comprimirImagem(arquivo: File, larguraMaxima = 1080, qualidade = 0.8): Promise<File> {
  // Se não for imagem (ex: vídeo), retorna o arquivo original
  if (!arquivo.type.startsWith('image/')) return arquivo

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(arquivo)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Redimensiona mantendo a proporção
        if (width > larguraMaxima) {
          height = Math.round((height * larguraMaxima) / width)
          width = larguraMaxima
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        // Converte para WebP compacto (leve e super rápido)
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const arquivoComprimido = new File(
                [blob],
                arquivo.name.replace(/\.[^/.]+$/, "") + ".webp",
                {
                  type: 'image/webp',
                  lastModified: Date.now(),
                }
              )
              resolve(arquivoComprimido)
            } else {
              resolve(arquivo)
            }
          },
          'image/webp',
          qualidade
        )
      }
      img.onerror = () => resolve(arquivo)
    }
  })
}