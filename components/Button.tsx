import React from 'react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'feedAction'
  children: React.ReactNode
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, ...props }) => {
  const baseStyle: React.CSSProperties = {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    fontSize: '14px',
    fontWeight: 600,
    padding: '10px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background 0.2s ease'
  }

  const variants: Record<string, React.CSSProperties> = {
    primary: {
      background: '#008C3A',
      color: '#fff'
    },
    secondary: {
      background: '#F4F7F4',
      color: '#008C3A'
    },
    feedAction: {
      background: 'transparent',
      color: '#65676B',
      padding: '6px 12px',
      borderRadius: '4px'
    }
  }

  const estiloFinal = { ...baseStyle, ...variants[variant] }

  return (
    <button style={estiloFinal} {...props}>
      {children}
    </button>
  )
}