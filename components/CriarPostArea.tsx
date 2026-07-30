'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/utils/supabase/client'

interface CriarPostAreaProps {
  usuarioAtual: any
  onPostCreated: (novoPost: any) => void
}

// FUNÇÃO AUXILIAR: COMPRIME FOTOS GRANDES PARA WEBP LEVE (~150KB) ANTES DE ENVIAR
async function comprimirImagem(arquivo: File, larguraMaxima = 1080, qualidade = 0.8): Promise<File> {
  // Se for vídeo, ignora a compressão e retorna o original
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

        // Redimensiona proporcionalmente se a imagem for gigante (4K, 8K, etc.)
        if (width > larguraMaxima) {
          height = Math.round((height * larguraMaxima) / width)
          width = larguraMaxima
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        // Converte para WebP compacto mantendo alta qualidade visual
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const arquivoComprimido = new File(
                [blob],
                arquivo.name.replace(/\.[^/.]+$/, '') + '.webp',
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

export default function CriarPostArea({ usuarioAtual, onPostCreated }: CriarPostAreaProps) {
  const [texto, setTexto] = useState('')
  const [visibilidade, setVisibilidade] = useState('mundial')
  const [midiaFiles, setMidiaFiles] = useState<File[]>([])
  const [publicando, setPublicando] = useState(false)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Seleção, compressão automática e acúmulo de arquivos (máximo 5)
  const handleMidiaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const novos = e.target.files ? Array.from(e.target.files) : []
    if (novos.length === 0) return

    // Comprime cada foto em tempo real antes de colocar na fila
    const fotosProcessadas = await Promise.all(
      novos.map((file) => comprimirImagem(file))
    )

    setMidiaFiles((prev) => {
      const combinados = [...prev, ...fotosProcessadas]
      if (combinados.length > 5) {
        alert('Você pode selecionar no máximo 5 fotos/vídeos por publicação.')
      }
      return combinados.slice(0, 5)
    })

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const removerMidia = (indexParaRemover: number) => {
    setMidiaFiles((prev) => prev.filter((_, idx) => idx !== indexParaRemover))
  }

  const handlePublicar = async () => {
    if (!usuarioAtual?.id) return alert('Você precisa estar logado para publicar!')
    if (!texto.trim() && midiaFiles.length === 0) return alert('Escreva algo ou selecione ao menos uma foto!')

    setPublicando(true)
    const urlsMidiaFinal: string[] = []

    try {
      // Upload de todos os arquivos (agora super leves em .webp)
      for (let i = 0; i < midiaFiles.length; i++) {
        const file = midiaFiles[i]
        const ext = file.name.split('.').pop()?.toLowerCase() || 'webp'
        const nomeArquivo = `${usuarioAtual.id}_${Date.now()}_${i}_${Math.random().toString(36).substring(7)}.${ext}`

        let urlPublica: string | null = null

        const { error: errorUpload } = await supabase.storage
          .from('posts_midia')
          .upload(nomeArquivo, file, { 
            upsert: true, 
            cacheControl: '31536000', // Cache longo no navegador
            contentType: file.type || 'image/webp' 
          })

        if (!errorUpload) {
          const { data } = supabase.storage.from('posts_midia').getPublicUrl(nomeArquivo)
          urlPublica = data.publicUrl
        } else {
          const fallback = await supabase.storage
            .from('perfis')
            .upload(nomeArquivo, file, { 
              upsert: true, 
              cacheControl: '31536000', 
              contentType: file.type || 'image/webp' 
            })
          if (!fallback.error) {
            const { data } = supabase.storage.from('perfis').getPublicUrl(nomeArquivo)
            urlPublica = data.publicUrl
          }
        }

        if (urlPublica) urlsMidiaFinal.push(urlPublica)
      }

      const autorObj = {
        id: usuarioAtual.id,
        nome: usuarioAtual.nome || 'Usuário',
        foto_url: usuarioAtual.foto_url || null
      }

      const conteudoPost = {
        texto: texto.trim(),
        midiaUrl: urlsMidiaFinal[0] || null,
        midiaUrls: urlsMidiaFinal,
        autor: autorObj,
        tempo: new Date().toISOString(),
        reacoes: {},
        comentarios: [],
        espalhadosCount: 0
      }

      const { data: postInserido, error: errorBanco } = await supabase
        .from('feed_posts')
        .insert({
          usuario_id: usuarioAtual.id,
          visibilidade: visibilidade,
          conteudo: conteudoPost
        })
        .select()
        .single()

      if (errorBanco) throw errorBanco

      const novoPostCompleto = {
        ...conteudoPost,
        midiaUrl: urlsMidiaFinal[0] || null,
        midiaUrls: urlsMidiaFinal,
        id: postInserido.id,
        usuario_id: usuarioAtual.id,
        visibilidade: visibilidade
      }

      onPostCreated(novoPostCompleto)

      setTexto('')
      setMidiaFiles([])
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err: any) {
      console.error('Erro ao publicar:', err)
      alert('Ocorreu um erro ao publicar. Tente novamente!')
    } finally {
      setPublicando(false)
    }
  }

  return (
    <div style={estilos.cardCriarPost}>
      {/* ÁREA SUPERIOR: AVATAR E INPUT */}
      <div style={estilos.rowTopo}>
        <div style={estilos.avatarUser}>
          {usuarioAtual?.foto_url ? (
            <img src={usuarioAtual.foto_url} alt="" style={estilos.imgAvatar} />
          ) : (
            usuarioAtual?.nome?.charAt(0).toUpperCase() || 'B'
          )}
        </div>

        <textarea
          placeholder={`No que você está pensando, ${usuarioAtual?.nome?.split(' ')[0] || 'brasilzao'}?`}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          style={estilos.textareaPost}
          rows={2}
        />
      </div>

      {/* MINIATURAS DAS FOTOS SELECIONADAS */}
      {midiaFiles.length > 0 && (
        <div style={estilos.containerPreviewsGrid}>
          {midiaFiles.map((file, index) => {
            const previewUrl = URL.createObjectURL(file)
            return (
              <div key={index} style={estilos.boxPreviewItem}>
                <button type="button" onClick={() => removerMidia(index)} style={estilos.btnFecharPreview}>✕</button>
                {file.type.startsWith('video/') ? (
                  <video src={previewUrl} style={estilos.elementPreview} />
                ) : (
                  <img src={previewUrl} alt={`Foto ${index + 1}`} style={estilos.elementPreview} />
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* BOTÕES DE AÇÃO */}
      <div style={estilos.rowBotoesAcao}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={midiaFiles.length > 0 ? estilos.btnMidia3DAtivo : estilos.btnMidia3D}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="5" fill="#008C3A" />
              <circle cx="8.5" cy="8.5" r="1.5" fill="#FFD700" />
              <path d="M21 15L16 10L5 21" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>{midiaFiles.length > 0 ? `${midiaFiles.length}/5 Fotos` : 'Fotos / Vídeos'}</span>
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleMidiaChange}
            accept="image/*,video/*"
            multiple
            style={{ display: 'none' }}
          />

          <span style={estilos.labelVer}>Ver:</span>

          <div style={estilos.containerSelect3D}>
            <span style={{ fontSize: 14 }}>🌐</span>
            <select
              value={visibilidade}
              onChange={(e) => setVisibilidade(e.target.value)}
              style={estilos.selectVisibilidade3D}
            >
              <option value="mundial">Mundial (Todos)</option>
              <option value="seguidores">Apenas Seguidores</option>
            </select>
            <span style={estilos.setaSelect}>▾</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePublicar}
          disabled={publicando || (!texto.trim() && midiaFiles.length === 0)}
          style={{
            ...estilos.btnPublicar3D,
            opacity: publicando || (!texto.trim() && midiaFiles.length === 0) ? 0.5 : 1,
            cursor: publicando || (!texto.trim() && midiaFiles.length === 0) ? 'not-allowed' : 'pointer'
          }}
        >
          {publicando ? 'Publicando...' : 'Publicar'}
        </button>
      </div>
    </div>
  )
}

const estilos = {
  cardCriarPost: { background: '#ffffff', borderRadius: 18, padding: '14px 16px', marginBottom: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', border: '1px solid #e8ecef', display: 'flex', flexDirection: 'column' as const, gap: 12 },
  rowTopo: { display: 'flex', alignItems: 'center', gap: 10 },
  avatarUser: { width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #FFD700 0%, #008C3A 100%)', padding: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.15)', flexShrink: 0 },
  imgAvatar: { width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' as const },
  textareaPost: { flex: 1, border: 'none', outline: 'none', background: '#f4f6f8', borderRadius: 16, padding: '10px 14px', fontSize: 13, color: '#050505', resize: 'none' as const, fontFamily: 'inherit' },
  containerPreviewsGrid: { display: 'flex', gap: 8, overflowX: 'auto' as const, paddingBottom: 6 },
  boxPreviewItem: { position: 'relative' as const, borderRadius: 12, overflow: 'hidden', width: 80, height: 80, flexShrink: 0, background: '#000' },
  elementPreview: { width: '100%', height: '100%', objectFit: 'cover' as const },
  btnFecharPreview: { position: 'absolute' as const, top: 4, right: 4, background: 'rgba(0,0,0,0.7)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontWeight: 'bold' as const, zIndex: 2, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  rowBotoesAcao: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingTop: 4, borderTop: '1px solid #f0f2f5' },
  btnMidia3D: { display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%)', border: '1px solid #CBD5E1', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: '700' as const, color: '#008C3A', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,0,0,0.08)' },
  btnMidia3DAtivo: { display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(180deg, #E6F4EA 0%, #C3E6CB 100%)', border: '1px solid #008C3A', borderRadius: 20, padding: '6px 14px', fontSize: 12, fontWeight: '800' as const, color: '#008C3A', cursor: 'pointer', boxShadow: '0 2px 5px rgba(0,140,58,0.2)' },
  labelVer: { fontSize: 12, fontWeight: '600' as const, color: '#65676b', marginLeft: 2 },
  containerSelect3D: { position: 'relative' as const, display: 'flex', alignItems: 'center', gap: 6, background: 'linear-gradient(180deg, #FFFFFF 0%, #F1F5F9 100%)', border: '1px solid #CBD5E1', borderRadius: 20, padding: '5px 12px', boxShadow: '0 2px 5px rgba(0,0,0,0.08)' },
  selectVisibilidade3D: { background: 'transparent', border: 'none', outline: 'none', fontSize: 12, fontWeight: '700' as const, color: '#1E293B', cursor: 'pointer', paddingRight: 14, appearance: 'none' as const },
  setaSelect: { position: 'absolute' as const, right: 10, fontSize: 10, color: '#64748B', pointerEvents: 'none' as const },
  btnPublicar3D: { background: 'linear-gradient(180deg, #00B04B 0%, #008C3A 100%)', color: '#FFFFFF', border: '1px solid #006B2D', borderRadius: 20, padding: '7px 20px', fontSize: 13, fontWeight: '800' as const, boxShadow: '0 3px 6px rgba(0,140,58,0.3)' }
}