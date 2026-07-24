'use client'

import React, { useState } from 'react'
import { tokens } from '@/styles/designSystem'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'icon' | 'feedAction'
  fullWidth?: boolean
  active?: boolean
  children: React.ReactNode
}

export const Button = ({ 
  variant = 'primary', 
  fullWidth = false, 
  active = false, 
  children, 
  style, 
  ...props 
}: ButtonProps) => {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: tokens.colors.brand.verdeBrasil,
          color: tokens.colors.neutral.branco,
          border: 'none',
          fontWeight: tokens.fonts.weights.semibold,
        }
      case 'secondary':
        return {
          backgroundColor: tokens.colors.neutral.cinzaClaro,
          color: tokens.colors.neutral.grafite,
          border: 'none',
          fontWeight: tokens.fonts.weights.medium,
        }
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          color: tokens.colors.neutral.grafite,
          border: `1px solid ${tokens.colors.neutral.cinzaBorda}`,
          fontWeight: tokens.fonts.weights.medium,
        }
      case 'icon':
        return {
          backgroundColor: 'transparent',
          color: tokens.colors.brand.verdeBrasil,
          border: 'none',
          fontWeight: tokens.fonts.weights.bold,
          padding: tokens.spacing.sm,
        }
      case 'feedAction':
        return {
          backgroundColor: isPressed 
            ? '#E4E6EB' 
            : isHovered 
            ? '#F2F3F5' 
            : active 
            ? '#E6F6EC' 
            : 'transparent',
          color: active ? tokens.colors.brand.verdeBrasil : tokens.colors.neutral.grafite,
          border: 'none',
          fontWeight: tokens.fonts.weights.medium,
          padding: '8px 12px',
          borderRadius: '8px',
          flex: 1,
        }
      default:
        return {}
    }
  }

  const baseStyle: React.CSSProperties = {
    fontFamily: tokens.fonts.family,
    fontSize: tokens.fonts.sizes.body,
    padding: `${tokens.spacing.sm} ${tokens.spacing.xl}`,
    borderRadius: tokens.borderRadius.pill,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    width: fullWidth ? '100%' : 'auto',
    transition: tokens.animations.fast,
    userSelect: 'none',
    transform: isPressed ? 'scale(0.96)' : 'scale(1)',
    ...getVariantStyles(),
    ...style,
  }

  return (
    <button 
      style={baseStyle} 
      {...props}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setIsPressed(false)
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {children}
    </button>
  )
}