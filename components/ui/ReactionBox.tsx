'use client'

import React, { useState, useEffect, useRef } from 'react'
import { tokens } from '@/styles/designSystem'

interface ReactionBoxProps {
  onSelect: (emoji: string) => void
  onClose: () => void
}

// Usando o padrão de emojis clássicos do seu sistema para não quebrar o banco
const reactions = [
  { label: 'Curtir', emoji: '👍' },
  { label: 'Amei', emoji: '❤️' },
  { label: 'Rachei', emoji: '😂' },
  { label: 'Caramba', emoji: '😮' },
  { label: 'Poxa', emoji: '😢' },
  { label: 'Indignado', emoji: '😡' }
]

export const ReactionBox = ({ onSelect, onClose }: ReactionBoxProps) => {
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null)
  const hoveredLabelRef = useRef<string | null>(null)

  // Sincroniza o estado com uma referência para o evento global ler o valor mais recente
  useEffect(() => {
    hoveredLabelRef.current = hoveredLabel
  }, [hoveredLabel])

  useEffect(() => {
    // Detecta o arrastar do dedo no celular de forma global
    const handleGlobalTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0]
      const element = document.elementFromPoint(touch.clientX, touch.clientY)
      
      if (element) {
        const target = element.closest('[data-reaction]')
        if (target) {
          const label = target.getAttribute('data-reaction')
          setHoveredLabel(label)
        } else {
          setHoveredLabel(null)
        }
      }
    }

    // Detecta quando o usuário levanta o dedo (no celular ou mouse)
    const handleGlobalRelease = () => {
      const currentLabel = hoveredLabelRef.current
      if (currentLabel) {
        const reaction = reactions.find((r) => r.label === currentLabel)
        if (reaction) {
          onSelect(reaction.emoji)
        }
      }
      setHoveredLabel(null)
      onClose()
    }

    window.addEventListener('touchmove', handleGlobalTouchMove, { passive: true })
    window.addEventListener('touchend', handleGlobalRelease)
    window.addEventListener('mouseup', handleGlobalRelease)

    return () => {
      window.removeEventListener('touchmove', handleGlobalTouchMove)
      window.removeEventListener('touchend', handleGlobalRelease)
      window.removeEventListener('mouseup', handleGlobalRelease)
    }
  }, [onSelect, onClose])

  return (
    <div
      onMouseLeave={onClose}
      style={{
        position: 'absolute',
        bottom: '100%',
        left: '12px',
        backgroundColor: tokens.colors.neutral.branco,
        padding: '6px',
        borderRadius: '30px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 999,
        animation: 'reactionPop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
        transformOrigin: 'bottom left'
      }}
    >
      <style>{`
        @keyframes reactionPop {
          0% { transform: scale(0) translateY(10px); opacity: 0; }
          100% { transform: scale(1) translateY(-4px); opacity: 1; }
        }
        .reaction-item {
          transition: transform 0.15s cubic-bezier(0.2, 0, 0.2, 1);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          font-size: 30px;
          user-select: none;
        }
        @media (hover: hover) {
          .reaction-item:hover {
            transform: scale(1.35) translateY(-6px);
          }
        }
      `}</style>

      {reactions.map((item) => {
        const isHovered = hoveredLabel === item.label
        return (
          <div
            key={item.label}
            data-reaction={item.label}
            onMouseEnter={() => setHoveredLabel(item.label)}
            onMouseLeave={() => setHoveredLabel(null)}
            onClick={() => {
              onSelect(item.emoji)
              onClose()
            }}
            className="reaction-item"
            style={{
              transform: isHovered ? 'scale(1.35) translateY(-6px)' : undefined
            }}
          >
            <span style={{ pointerEvents: 'none' }}>{item.emoji}</span>
          </div>
        )
      })}
    </div>
  )
}