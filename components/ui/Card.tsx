'use client'

import React from 'react'
import { tokens } from '@/styles/designSystem'

interface CardProps {
  children: React.ReactNode
  padding?: keyof typeof tokens.spacing
  radius?: keyof typeof tokens.borderRadius
  style?: React.CSSProperties
}

export const Card = ({ 
  children, 
  padding = 'lg', 
  radius = 'md', 
  style 
}: CardProps) => {
  
  const cardStyle: React.CSSProperties = {
    backgroundColor: tokens.colors.neutral.branco,
    padding: tokens.spacing[padding],
    borderRadius: tokens.borderRadius[radius],
    boxShadow: tokens.shadows.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.md,
    border: `1px solid ${tokens.colors.neutral.cinzaClaro}`,
    ...style,
  }

  return <div style={cardStyle}>{children}</div>
}