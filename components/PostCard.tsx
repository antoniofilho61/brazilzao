'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'

const REACOES_LISTA = [
  { emoji: '🤙', label: 'Salve' },
  { emoji: '❤️', label: 'Amei' },
  { emoji: '😂', label: 'Riso' },
  { emoji: '😮', label: 'Chocado' },
  { emoji: '😢', label: 'Triste' },
  { emoji: '🔥', label: 'Fogo' }
]

function IconeBrazilzao({ ativo, reacaoAtiva }: { ativo: boolean; reacaoAtiva?: string }) {
  if (ativo && reacaoAtiva && reacaoAtiva !== '🤙') {
    return <span style={{ marginRight: 6, fontSize: 18 }}>{reacaoAtiva}</span>
  }
  return (
    <svg 
      width="20" height="20" viewBox="0 0 24 24" 
      fill={ativo ? "#008C3A" : "none"} stroke={ativo ? "#008C3A" : "#65676b"} 
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ marginRight: 6, transition: 'all 0.2s ease' }}
    >
      <path d="M18 14c1.5-1.5 3-3.5 3-5.5s-1.5-3-3-3-3 1.5-3 3v2" />
      <path d="M12 11.5V6a2 2 0 0 0-4 0v9.5" />
      <path d="M8 15V9a2 2 0 0 0-4 0v7a6 6 0 0 0 11.6 2.2l.4-1.2c.4-1.2.1-2.5-.8-3.3L12 11.5z" />
    </svg>
  )
}

interface PostCardProps {
  item: any;
  index: number;
  usuarioAtual: any;
  onReagir: any;
  onGosteiDireto: any;
  onEspalhar: any;
  onComentar: any;
}

export function PostCard({ 
  item, 
  index, 
  usuarioAtual, 
  onReagir, 
  onGosteiDireto, 
  onEspalhar, 
  onComentar 
}: PostCardProps) {
  const router = useRouter()
  const [mostrarReacoes, setMostrarReacoes] = useState(false)
  const [comentarioAberto, setComentarioAberto] = useState(false)
  const [novoComentario, setNovoComentario] = useState('')
  const [emojiAtivoNoToque, setEmojiAtivoNoToque] = useState<string | null>(null)
  
  // ESTADO PARA TELA CHEIA DA MÍDIA
  const [midiaExpandida, setMidiaExpandida] = useState<string | null>(null)

  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)
  const touchTimerRef = useRef<NodeJS.Timeout | null>(null)
  const emojiRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const usuarioId = usuarioAtual?.id || 'anonimo'
  const reacaoAtual = item.reacoes?.[usuarioId]
  const jaReagiu = !!reacaoAtual
  const labelReacao = REACOES_LISTA.find(r => r.emoji === reacaoAtual)?.label || 'Gostar'

  // Hover Computador
  const handleMouseEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => setMostrarReacoes(true), 400)
  }

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    hoverTimerRef.current = setTimeout(() => setMostrarReacoes(false), 600)
  }

  // Touch Celular
  const handleTouchStart = () => {
    touchTimerRef.current = setTimeout(() => {
      setMostrarReacoes(true)
      if (navigator.vibrate) navigator.vibrate(40)
    }, 350)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!mostrarReacoes) return
    const touch = e.touches[0]
    const target = document.elementFromPoint(touch.clientX, touch.clientY)

    let encontrado = null
    REACOES_LISTA.forEach(({ emoji }) => {
      const el = emojiRefs.current[emoji]
      if (el && (el === target || el.contains(target))) {
        encontrado = emoji
      }
    })
    setEmojiAtivoNoToque(encontrado)
  }

  const handleTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current)
    if (mostrarReacoes) {
      if (emojiAtivoNoToque) {
        onReagir(index, emojiAtivoNoToque)
      }
      setMostrarReacoes(false)
      setEmojiAtivoNoToque(null)
    }
  }

  return (
    <Card style={cardPostReal}>
      {/* TOPO DO POST */}
      <div style={postTopo}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href={`/perfil/${item.autor?.id}`} style={{ textDecoration: 'none' }}>
            <div style={{ ...avatarReal, cursor: 'pointer' }}>
              {item.autor?.foto_url ? (
                <img src={item.autor.foto_url} alt="" style={fotoPerfilImg} />
              ) : (
                item.autor?.nome?.charAt(0).toUpperCase() || 'U'
              )}
            </div>
          </Link>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Link href={`/perfil/${item.autor?.id}`} style={{ textDecoration: 'none' }}>
                <strong style={{ ...nomeAutorReal, cursor: 'pointer', color: '#008C3A' }}>
                  {item.autor?.nome}
                </strong>
              </Link>
              {item.tipoConta && <span style={badgeTipoConta}>{item.tipoConta}</span>}
            </div>
            <p style={metaReal}>{item.localizacao} • {item.tempo}</p>
          </div>
        </div>
        <span style={{ color: '#9ca3af', fontSize: 18, cursor: 'pointer' }}>•••</span>
      </div>
      
      {/* TEXTO DO POST */}
      {item.texto && (
        <div style={textoPostReal}>
          <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{item.texto}</p>
        </div>
      )}

      {/* MÍDIA LARGURA TOTAL E SUPORTE A TELA CHEIA */}
{item.midiaUrl && (
  <>
    <div 
      style={{ ...containerMidiaReal, cursor: 'pointer' }}
      onClick={() => setMidiaExpandida(item.midiaUrl)}
    >
      {item.midiaUrl.match(/\.(mp4|webm|ogg|mov|mkv)$/i) ? (
        <video 
          src={item.midiaUrl} 
          controls 
          style={midiaElementoReal} 
        />
      ) : (
        <img 
          src={item.midiaUrl} 
          alt="Foto do Post" 
          style={midiaElementoReal} 
        />
      )}
    </div>

    {/* MODAL DE TELA CHEIA (TEM QUE FICAR AQUI DENTRO) */}
    {midiaExpandida && (
      <div 
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.92)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backdropFilter: 'blur(5px)'
        }}
        onClick={() => setMidiaExpandida(null)}
      >
        <button 
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            color: '#fff',
            width: 40,
            height: 40,
            borderRadius: '50%',
            fontSize: 20,
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100000
          }}
          onClick={(e) => {
            e.stopPropagation()
            setMidiaExpandida(null)
          }}
        >
          ✕
        </button>

        {midiaExpandida.match(/\.(mp4|webm|ogg|mov|mkv)$/i) ? (
          <video 
            src={midiaExpandida} 
            controls 
            autoPlay 
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} 
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <img 
            src={midiaExpandida} 
            alt="Mídia Expandida" 
            style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain' }} 
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    )}
  </>
)}

      {/* CONTADORES */}
      <div style={containerContadoresReal}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {(() => {
            const contagem: Record<string, number> = {}
            Object.values(item.reacoes || {}).forEach((emoji: any) => { contagem[emoji] = (contagem[emoji] || 0) + 1 })
            const ordenados = Object.entries(contagem).sort((a, b) => b[1] - a[1]).slice(0, 3)

            if (ordenados.length === 0) {
              return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 22 }}>
                  <span style={{ fontSize: 16, opacity: 0.4 }}>🤙</span>
                  <span style={{ fontSize: 11, color: '#65676b', marginTop: 1 }}>0</span>
                </div>
              )
            }
            return ordenados.map(([emoji, total]) => (
              <div key={emoji} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 22 }}>
                <span style={{ fontSize: 16 }}>{emoji}</span>
                <span style={{ fontSize: 11, fontWeight: '700', color: '#008C3A', marginTop: 1 }}>{total}</span>
              </div>
            ))
          })()}
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span>{item.comentarios?.length || 0} comentários</span>
          <span>•</span>
          <span style={{ color: item.espalhado ? '#008C3A' : '#65676b' }}>{item.espalhadosCount || 0} espalhadas</span>
        </div>
      </div>

      <div style={divisorLinhaReal} />

      {/* BOTÕES DE AÇÃO */}
      <div style={{ display: 'flex', position: 'relative' }}>
        <div style={{ flex: 1, position: 'relative' }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <button 
            style={{ ...btnAcaoPostReal, color: jaReagiu ? '#008C3A' : '#65676b', fontWeight: jaReagiu ? '700' : '600' }} 
            onClick={() => onGosteiDireto(index)}
            onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}
          >
            <IconeBrazilzao ativo={jaReagiu} reacaoAtiva={reacaoAtual} /> 
            {jaReagiu ? labelReacao : 'Gostar'}
          </button>
          
          {mostrarReacoes && (
            <div style={tooltipReacoes} onMouseEnter={() => hoverTimerRef.current && clearTimeout(hoverTimerRef.current)} onMouseLeave={handleMouseLeave}>
              {REACOES_LISTA.map(({ emoji, label }) => {
                const estaAtivoNoDedo = emojiAtivoNoToque === emoji
                return (
                  <button 
                    key={emoji} ref={(el) => { emojiRefs.current[emoji] = el }}
                    onClick={() => { onReagir(index, emoji); setMostrarReacoes(false); }}
                    style={{
                      ...btnEmoji,
                      transform: estaAtivoNoDedo ? 'scale(1.45) translateY(-8px)' : 'scale(1)',
                      transition: 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                    }}
                    title={label}
                  >
                    {emoji}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <button style={btnAcaoPostReal} onClick={() => setComentarioAberto(!comentarioAberto)}>
          <span style={{ marginRight: 6 }}>💬</span> Comentar
        </button>

        <button style={{ ...btnAcaoPostReal, color: item.espalhado ? '#008C3A' : '#65676b', fontWeight: item.espalhado ? '700' : '600' }} onClick={() => onEspalhar(index)}>
          <span style={{ marginRight: 6, transform: 'scaleX(-1)', display: 'inline-block' }}>🔁</span> 
          {item.espalhado ? 'Espalhado!' : 'Espalhar'}
        </button>
      </div>

      {/* ÁREA DE COMENTÁRIOS */}
      {comentarioAberto && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f2f2f2' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              type="text" placeholder="Escreva um comentário..." value={novoComentario}
              onChange={(e) => setNovoComentario(e.target.value)} style={inputComentario}
            />
            <button onClick={() => { onComentar(index, novoComentario); setNovoComentario(''); }} style={btnEnviarComentarioReal}>
              Enviar
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {item.comentarios?.map((com: any, cIdx: number) => (
              <div key={com.id || cIdx} style={boxComentarioCard}>
                <strong style={{ fontSize: 12, color: '#050505' }}>{com.autor?.nome || 'Usuário'}: </strong>
                <span style={{ fontSize: 13, color: '#333' }}>{com.texto}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

// Estilos encapsulados para o PostCard
const cardPostReal = { 
  background: '#fff', 
  marginBottom: 14, 
  padding: 16, 
  borderRadius: 16, 
  position: 'relative' as const, 
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)' 
}
const postTopo = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, padding: '0 16px' }
const avatarReal = { width: 38, height: 38, borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' as const, color: '#4b5563', fontSize: 15, overflow: 'hidden' }
const fotoPerfilImg = { width: '100%', height: '100%', objectFit: 'cover' as const }
const nomeAutorReal = { color: '#050505', fontSize: 14, fontWeight: '700' as const }
const badgeTipoConta = { fontSize: 10, background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: 4, fontWeight: '600' as const }
const metaReal = { margin: '2px 0 0 0', fontSize: 11, color: '#65676b' }

// Texto do Post (agora sem duplicar)
const textoPostReal = { color: '#050505', lineHeight: '1.4', fontSize: 14, marginBottom: 10, padding: '0 16px' }

// Container da mídia alargado
const containerMidiaReal = { 
  width: '100%', 
  background: '#000', 
  maxHeight: 450, 
  display: 'flex', 
  justifyContent: 'center', 
  alignItems: 'center', 
  marginBottom: 12,
  overflow: 'hidden'
}
const midiaElementoReal = { width: '100%', maxHeight: 450, objectFit: 'cover' as const, display: 'block' }

const containerContadoresReal = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#65676b', padding: '0 16px 10px 16px', minHeight: 46 }
const divisorLinhaReal = { borderTop: '1px solid #f0f2f5', marginBottom: 2 }
const btnAcaoPostReal = { flex: 1, background: 'none', border: 'none', padding: '8px 0', borderRadius: 6, fontSize: 13, fontWeight: '600' as const, color: '#65676b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', touchAction: 'none' as const }
const tooltipReacoes = { position: 'absolute' as const, bottom: '105%', left: 10, background: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', borderRadius: 30, padding: '6px 12px', display: 'flex', gap: 12, zIndex: 150 }
const btnEmoji = { background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', padding: 0, transformOrigin: 'bottom center', transition: 'transform 0.15s ease-out' }
const inputComentario = { flex: 1, padding: '6px 12px', borderRadius: 20, border: 'none', background: '#f0f2f5', outline: 'none', fontSize: 13, color: '#050505' }
const btnEnviarComentarioReal = { background: '#008C3A', color: '#fff', border: 'none', borderRadius: 20, padding: '0 12px', fontSize: 12, fontWeight: 'bold' as const, cursor: 'pointer' }
const boxComentarioCard = { background: '#f0f2f5', padding: '6px 12px', borderRadius: 12, fontSize: 13 }