'use client'

import { useState, useRef, useEffect } from 'react'

interface CameraModalProps {
  filtroAplicado: string;
  setFiltroAplicado: (filtro: string) => void;
  onClose: () => void;
  onTirarFoto: (file: File) => void;
  onAbrirGaleria: () => void;
}

export default function CameraModal({
  filtroAplicado,
  setFiltroAplicado,
  onClose,
  onTirarFoto,
  onAbrirGaleria
}: CameraModalProps) {
  const videoCameraRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

  const alternarCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }

  useEffect(() => {
    async function ligarCamera() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode },
          audio: false
        })
        streamRef.current = stream
        if (videoCameraRef.current) {
          videoCameraRef.current.srcObject = stream
        }
      } catch (err) {
        console.log('Erro ao ligar câmera:', err)
      }
    }

    ligarCamera()

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [facingMode])

  const tirarFoto = () => {
    if (!videoCameraRef.current) return
    const canvas = document.createElement('canvas')
    const video = videoCameraRef.current
    canvas.width = video.videoWidth || 720
    canvas.height = video.videoHeight || 1280
    const ctx = canvas.getContext('2d')
    if (ctx) {
      if (filtroAplicado !== 'none') {
        ctx.filter = filtroAplicado
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) return
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop())
        }
        const file = new File([blob], `corre-${Date.now()}.jpg`, { type: 'image/jpeg' })
        onTirarFoto(file)
      }, 'image/jpeg')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: '#000',
      zIndex: 99999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        zIndex: 10,
        background: 'linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)'
      }}>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: 15,
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Cancelar
        </button>
        <span style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>
          Apontar e Disparar
        </span>
        <div style={{ width: 60 }} />
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video
          ref={videoCameraRef}
          autoPlay
          playsInline
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: filtroAplicado }}
        />
      </div>

      <div style={{
        padding: '20px 16px 30px 16px',
        background: 'linear-gradient(to top, rgba(0,0,0,0.9), transparent)',
        display: 'flex',
        flexDirection: 'column',
        gap: 20
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 8px'
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <button
              onClick={() => setFiltroAplicado(filtroAplicado === 'hue-rotate(180deg) saturate(1.8)' ? 'none' : 'hue-rotate(180deg) saturate(1.8)')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', border: filtroAplicado.includes('hue-rotate') ? '2px solid #00F0FF' : '1px solid rgba(255,255,255,0.3)', boxShadow: filtroAplicado.includes('hue-rotate') ? '0 0 8px #00F0FF' : 'none', background: '#111' }} />
              <span style={{ fontSize: 9, marginTop: 4, fontWeight: '600', color: filtroAplicado.includes('hue-rotate') ? '#00F0FF' : '#aaa' }}>Filtro Futuro</span>
            </button>

            <button
              onClick={() => setFiltroAplicado(filtroAplicado === 'grayscale(1) contrast(1.3)' ? 'none' : 'grayscale(1) contrast(1.3)')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', border: filtroAplicado.includes('grayscale') ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)', background: '#333' }} />
              <span style={{ fontSize: 9, marginTop: 4, fontWeight: '600', color: filtroAplicado.includes('grayscale') ? '#fff' : '#aaa' }}>Filtro Urbano</span>
            </button>

            <button
              onClick={() => setFiltroAplicado(filtroAplicado === 'sepia(0.6) hue-rotate(80deg) saturate(1.4)' ? 'none' : 'sepia(0.6) hue-rotate(80deg) saturate(1.4)')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', border: filtroAplicado.includes('sepia') ? '2px solid #008C3A' : '1px solid rgba(255,255,255,0.3)', background: '#053' }} />
              <span style={{ fontSize: 9, marginTop: 4, fontWeight: '600', color: filtroAplicado.includes('sepia') ? '#008C3A' : '#aaa' }}>Filtro Bio</span>
            </button>
          </div>

          <button
            onClick={tirarFoto}
            style={{
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)',
              padding: '8px 16px',
              borderRadius: 20,
              color: '#fff',
              fontSize: 13,
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Aplicar
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          width: '100%',
          maxWidth: 320,
          margin: '0 auto'
        }}>
          <button
            onClick={onAbrirGaleria}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width: 50,
              height: 50,
              color: '#fff',
              cursor: 'pointer'
            }}
            title="Abrir Galeria"
          >
            <span style={{ fontSize: 20 }}>🖼️</span>
          </button>

          <button
            onClick={tirarFoto}
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              border: '4px solid #fff',
              background: 'rgba(255,255,255,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 0 15px rgba(255,255,255,0.4)'
            }}
          >
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fff' }} />
          </button>

          <button
            onClick={alternarCamera}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '50%',
              width: 50,
              height: 50,
              color: '#fff',
              cursor: 'pointer'
            }}
            title="Girar Câmera"
          >
            <span style={{ fontSize: 20 }}>🔄</span>
          </button>
        </div>
      </div>
    </div>
  )
}