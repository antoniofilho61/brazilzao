'use client'
import { useState } from 'react'
import { supabase } from '@/utils/supabase/client'

interface CorreEditorModalProps {
  midiaCorreTemp: File;
  usuarioAtual: any;
  onClose: () => void;
  onSuccess: (correRecemCriado: any) => void;
}

export default function CorreEditorModal({
  midiaCorreTemp,
  usuarioAtual,
  onClose,
  onSuccess
}: CorreEditorModalProps) {
  // Estados do Editor
  const [brilho, setBrilho] = useState(100)
  const [contraste, setContraste] = useState(100)
  const [saturacao, setSaturacao] = useState(100)
  const [rotacao, setRotacao] = useState(0)
  const [abaEdicaoAtiva, setAbaEdicaoAtiva] = useState<'nenhuma' | 'ajustes'>('nenhuma')
  const [adesivoSelecionado, setAdesivoSelecionado] = useState<string | null>(null)
  
  // Estados da Música
  const [modalMusicaAberto, setModalMusicaAberto] = useState(false)
  const [buscaMusica, setBuscaMusica] = useState('')
  const [resultadosMusica, setResultadosMusica] = useState<any[]>([])
  const [carregandoMusica, setCarregandoMusica] = useState(false)
  const [musicaSelecionada, setMusicaSelecionada] = useState<any | null>(null)
  const [audioPreview, setAudioPreview] = useState<HTMLAudioElement | null>(null)
  
  // Estados da Legenda e Marcações
  const [legendaCorre, setLegendaCorre] = useState('')
  const [sugestoesAmigos, setSugestoesAmigos] = useState<any[]>([])
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false)
  const [usuariosMarcadosIds, setUsuariosMarcadosIds] = useState<string[]>([])
  
  const [publicando, setPublicando] = useState(false)

  const resetarEdicoesFoto = () => {
    setBrilho(100)
    setContraste(100)
    setSaturacao(100)
    setRotacao(0)
    setAbaEdicaoAtiva('nenhuma')
  }

  const fecharTudo = () => {
    if (audioPreview) audioPreview.pause()
    resetarEdicoesFoto()
    onClose()
  }

  const buscarMusicas = async (termo: string) => {
    setBuscaMusica(termo)
    if (termo.trim().length < 2) {
      setResultadosMusica([])
      return
    }
    setCarregandoMusica(true)
    try {
      const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(termo)}&media=music&entity=song&limit=15&country=BR`)
      const data = await res.json()
      if (data && data.results) {
        const musicasFormatadas = data.results.map((track: any) => ({
          id: track.trackId,
          title: track.trackName,
          artist: { name: track.artistName },
          album: { cover_small: track.artworkUrl60, cover_medium: track.artworkUrl100 },
          preview: track.previewUrl
        }))
        setResultadosMusica(musicasFormatadas)
      } else {
        setResultadosMusica([])
      }
    } catch (err) {
      console.log('Erro ao buscar músicas:', err)
      setResultadosMusica([])
    } finally {
      setCarregandoMusica(false)
    }
  }

  const tocarPreview = (previewUrl: string) => {
    if (audioPreview) audioPreview.pause()
    const novoAudio = new Audio(previewUrl)
    novoAudio.play()
    setAudioPreview(novoAudio)
  }

  const handleLegendaChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const texto = e.target.value
    setLegendaCorre(texto)
    const ultimaPalavra = texto.split(' ').pop() || ''
    if (ultimaPalavra.startsWith('@')) {
      const termoBusca = ultimaPalavra.replace('@', '').trim()
      setMostrarSugestoes(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, nome, foto_url')
        .ilike('nome', `%${termoBusca}%`)
        .limit(5)
      if (data) setSugestoesAmigos(data)
    } else {
      setMostrarSugestoes(false)
    }
  }

  const selecionarAmigoMarcado = (amigo: { id: string; nome: string; foto_url?: string }) => {
    const palavras = legendaCorre.split(' ')
    palavras.pop()
    const novoTexto = [...palavras, `@${amigo.nome} `].join(' ')
    setLegendaCorre(novoTexto)
    setMostrarSugestoes(false)
    if (!usuariosMarcadosIds.includes(amigo.id)) {
      setUsuariosMarcadosIds((prev) => [...prev, amigo.id])
    }
  }

  const publicarCorreDefinitivo = async () => {
    if (!midiaCorreTemp || !usuarioAtual?.id) return
    setPublicando(true)
    const extensao = midiaCorreTemp.name.split('.').pop()?.toLowerCase() || 'file'
    const nomeArquivo = `corres/${Date.now()}.${extensao}`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('posts')
      .upload(`${usuarioAtual.id}/${nomeArquivo}`, midiaCorreTemp)
    
    if (uploadError) {
      alert('Erro ao enviar seu Corre: ' + uploadError.message)
      setPublicando(false)
      return
    }
    const urlPublica = supabase.storage.from('posts').getPublicUrl(uploadData.path).data.publicUrl
    
    const novoSubItem = {
      id: `corre-sub-${Date.now()}`,
      imagemBg: urlPublica,
      criadoEm: new Date().toISOString(),
      legenda: legendaCorre,
      adesivo: adesivoSelecionado,
      musica: musicaSelecionada ? { ...musicaSelecionada } : null
    }
    
    const { data: postCriado, error: dbError } = await supabase.from('feed_posts').insert({
      usuario_id: usuarioAtual.id,
      visibilidade: 'corre_rapidim',
      conteudo: {
        tipo: 'corre_rapidim',
        nome: usuarioAtual.nome || 'Corre',
        avatar: usuarioAtual.foto_url || '',
        imagemBg: urlPublica,
        legenda: legendaCorre,
        adesivo: adesivoSelecionado,
        musica: musicaSelecionada ? { ...musicaSelecionada } : null,
        criadoEm: new Date().toISOString()
      }
    }).select().single()

    if (dbError) {
      console.log('Aviso ao persistir no banco:', dbError.message)
    } else if (postCriado && usuariosMarcadosIds.length > 0) {
      for (const amigoId of usuariosMarcadosIds) {
        if (amigoId !== usuarioAtual.id) {
          await supabase.from('notifications').insert({
            usuario_id: amigoId,
            remetente_id: usuarioAtual.id,
            tipo: 'marcacao_corre',
            mensagem: `${usuarioAtual.nome || 'Alguém'} marcou você em um Corre Rapidim!`,
            link: `/feed`,
            lida: false
          })
        }
      }
    }

    const correRecemCriado = {
      id: postCriado?.id || `corre-grupo-${Date.now()}`,
      usuarioId: usuarioAtual.id,
      nome: usuarioAtual.nome || 'Seu Corre',
      avatar: usuarioAtual.foto_url || '',
      imagemBg: urlPublica,
      isUser: true,
      criadoEm: new Date().toISOString(),
      itens: [novoSubItem]
    }
    
    setPublicando(false)
    if (audioPreview) audioPreview.pause()
    onSuccess(correRecemCriado)
  }

  return (
    <>
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#0a0a0a', zIndex: 999999, display: 'flex',
        flexDirection: 'column', justifyContent: 'space-between', padding: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <button onClick={fecharTudo} style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', border: 'none', color: '#fff', padding: '10px 18px', borderRadius: 30, fontWeight: 'bold', fontSize: 13, cursor: 'pointer' }}>
            ✕ Cancelar
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setAbaEdicaoAtiva(abaEdicaoAtiva === 'nenhuma' ? 'ajustes' : 'nenhuma')} style={{ background: abaEdicaoAtiva !== 'nenhuma' ? '#FFD700' : 'rgba(255,255,255,0.15)', color: abaEdicaoAtiva !== 'nenhuma' ? '#000' : '#fff', backdropFilter: 'blur(10px)', border: abaEdicaoAtiva !== 'nenhuma' ? 'none' : '1px solid rgba(255,255,255,0.2)', padding: '10px 18px', borderRadius: 30, fontWeight: 'bold', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>✏️</span> Editar
            </button>
            <button onClick={() => setModalMusicaAberto(true)} style={{ background: musicaSelecionada ? '#FFD700' : 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)', color: musicaSelecionada ? '#000' : '#fff', border: musicaSelecionada ? 'none' : '1px solid rgba(255,255,255,0.2)', padding: '10px 18px', borderRadius: 30, fontWeight: 'bold', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: musicaSelecionada ? '0 0 15px rgba(255, 215, 0, 0.4)' : 'none' }}>
              🎵 {musicaSelecionada ? `Trilha: ${musicaSelecionada.titulo}` : 'Trilha do Corre'}
            </button>
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '14px 0' }}>
          {midiaCorreTemp.type.startsWith('video/') ? (
            <video src={URL.createObjectURL(midiaCorreTemp)} autoPlay loop muted playsInline style={{ maxWidth: '100%', maxHeight: '55vh', borderRadius: 24, objectFit: 'contain', boxShadow: '0 8px 24px rgba(0,0,0,0.8)' }} />
          ) : (
            <img src={URL.createObjectURL(midiaCorreTemp)} alt="Prévia" style={{ maxWidth: '100%', maxHeight: '55vh', borderRadius: 24, objectFit: 'contain', boxShadow: '0 8px 24px rgba(0,0,0,0.8)', transform: `rotate(${rotacao}deg)`, filter: `brightness(${brilho}%) contrast(${contraste}%) saturate(${saturacao}%)`, transition: 'transform 0.2s ease, filter 0.1s ease' }} />
          )}

          {abaEdicaoAtiva !== 'nenhuma' && !midiaCorreTemp?.type?.startsWith('video/') && (
            <div style={{ position: 'absolute', bottom: 10, left: 10, right: 10, background: 'rgba(20, 20, 20, 0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 215, 0, 0.4)', borderRadius: 20, padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10, zIndex: 30 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 'bold', color: '#FFD700' }}>☀️ Ajustes da Foto</span>
                <button onClick={() => setRotacao((prev) => (prev + 90) % 360)} style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff', padding: '4px 10px', fontSize: 12, fontWeight: 'bold', cursor: 'pointer' }}>🔄 Girar ({rotacao}°)</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: '#aaa', width: 65 }}>Brilho</span>
                  <input type="range" min="50" max="150" value={brilho} onChange={(e) => setBrilho(Number(e.target.value))} style={{ flex: 1, accentColor: '#FFD700' }} />
                  <span style={{ fontSize: 10, color: '#888', width: 30 }}>{brilho}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: '#aaa', width: 65 }}>Contraste</span>
                  <input type="range" min="50" max="150" value={contraste} onChange={(e) => setContraste(Number(e.target.value))} style={{ flex: 1, accentColor: '#FFD700' }} />
                  <span style={{ fontSize: 10, color: '#888', width: 30 }}>{contraste}%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 11, color: '#aaa', width: 65 }}>Saturação</span>
                  <input type="range" min="0" max="200" value={saturacao} onChange={(e) => setSaturacao(Number(e.target.value))} style={{ flex: 1, accentColor: '#FFD700' }} />
                  <span style={{ fontSize: 10, color: '#888', width: 30 }}>{saturacao}%</span>
                </div>
              </div>
            </div>
          )}

          {adesivoSelecionado && (
            <div style={{ position: 'absolute', top: 16, left: 16, background: '#FFD700', color: '#000', padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: '800', boxShadow: '0 4px 12px rgba(0,0,0,0.5)', zIndex: 20 }}>
              {adesivoSelecionado}
            </div>
          )}

          {musicaSelecionada && (
            <div style={{ position: 'absolute', bottom: 24, left: 16, right: 16, background: 'rgba(18, 18, 18, 0.75)', backdropFilter: 'blur(16px)', padding: '10px 14px', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 40, height: 40 }}>
                  <img src={musicaSelecionada.capa || '/logo-br.jpg'} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #FFD700', animation: 'spin 8s linear infinite' }} />
                </div>
                <div>
                  <p style={{ margin: 0, color: '#fff', fontSize: 13, fontWeight: 'bold' }}>{musicaSelecionada.titulo}</p>
                  <p style={{ margin: 0, color: '#FFD700', fontSize: 11 }}>{musicaSelecionada.artista}</p>
                </div>
              </div>
              <button onClick={() => { setMusicaSelecionada(null); if(audioPreview) audioPreview.pause(); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#aaa', width: 28, height: 28, borderRadius: '50%', fontSize: 12, cursor: 'pointer' }}>✕</button>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, zIndex: 100, position: 'relative' }}>
          {mostrarSugestoes && sugestoesAmigos.length > 0 && (
            <div style={{ position: 'absolute', bottom: '100%', left: 0, right: 0, background: '#1c1c1e', border: '1px solid rgba(255, 215, 0, 0.4)', borderRadius: 16, padding: '6px', marginBottom: 8, maxHeight: 180, overflowY: 'auto', boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.7)', zIndex: 999 }}>
              {sugestoesAmigos.map((amigo) => (
                <div key={amigo.id} onClick={() => selecionarAmigoMarcado(amigo)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#008C3A', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold' }}>
                    {amigo.foto_url ? <img src={amigo.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : amigo.nome?.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>@{amigo.nome}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '6px 0', scrollbarWidth: 'none', zIndex: 10 }}>
            {['🛠️ No Trampo', '💸 Paguei o Boleto', '☕ Maciota', '🥩 Resenha', '🚌 No Busão', '🔥 Na Atividade'].map((tag) => (
              <button key={tag} type="button" onClick={() => setAdesivoSelecionado(adesivoSelecionado === tag ? null : tag)} style={{ background: adesivoSelecionado === tag ? '#FFD700' : 'rgba(255,255,255,0.18)', color: adesivoSelecionado === tag ? '#000' : '#ffffff', border: adesivoSelecionado === tag ? '1px solid #FFD700' : '1px solid rgba(255,255,255,0.3)', padding: '6px 14px', borderRadius: 20, fontSize: 12, fontWeight: 'bold', cursor: 'pointer', whiteSpace: 'nowrap', backdropFilter: 'blur(8px)' }}>{tag}</button>
            ))}
          </div>

          <input type="text" placeholder="Manda a visão ou marca a turma com @..." value={legendaCorre} onChange={handleLegendaChange} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 16, padding: '14px 18px', color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          
          <button onClick={publicarCorreDefinitivo} disabled={publicando} style={{ width: '100%', background: 'linear-gradient(135deg, #008C3A 0%, #00662a 100%)', color: '#fff', border: '1px solid #FFD700', padding: '16px', borderRadius: 18, fontSize: 16, fontWeight: 'bold', cursor: publicando ? 'not-allowed' : 'pointer', boxShadow: '0 4px 20px rgba(0, 140, 58, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: publicando ? 0.7 : 1 }}>
            {publicando ? 'Publicando...' : '🚀 Publicar no Corre (24h)'}
          </button>
        </div>
      </div>

      {modalMusicaAberto && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(8px)', zIndex: 9999999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#141414', border: '1px solid rgba(255,255,255,0.15)', width: '100%', maxWidth: 420, borderRadius: 24, padding: 20, color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontWeight: 'bold', fontSize: 18 }}>🎵 Trilha do Corre</h3>
              <button onClick={() => { if (audioPreview) audioPreview.pause(); setModalMusicaAberto(false) }} style={{ background: 'none', border: 'none', color: '#888', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <input type="text" placeholder="Digite a música ou artista..." value={buscaMusica} onChange={(e) => buscarMusicas(e.target.value)} style={{ width: '100%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 14, padding: '12px 16px', color: '#fff', marginBottom: 16, outline: 'none' }} />
            <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {carregandoMusica && <p style={{ color: '#888', textAlign: 'center', padding: '16px 0' }}>Buscando faixas...</p>}
              {!carregandoMusica && resultadosMusica.length === 0 && buscaMusica.length > 1 && <p style={{ color: '#888', textAlign: 'center', padding: '16px 0' }}>Nenhuma música encontrada.</p>}
              {resultadosMusica.map((track) => (
                <div key={track.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.05)', padding: '10px 12px', borderRadius: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={track.album.cover_small} alt={track.title} style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover' }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: 13, color: '#fff' }}>{track.title}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#888' }}>{track.artist.name}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => tocarPreview(track.preview)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', width: 34, height: 34, borderRadius: '50%', cursor: 'pointer' }}>▶️</button>
                    <button onClick={() => { if (audioPreview) audioPreview.pause(); setMusicaSelecionada({ titulo: track.title, artista: track.artist.name, capa: track.album.cover_medium, previewUrl: track.preview }); setModalMusicaAberto(false) }} style={{ background: '#FFD700', border: 'none', color: '#000', fontWeight: 'bold', fontSize: 12, padding: '0 14px', borderRadius: 10, cursor: 'pointer' }}>Usar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}