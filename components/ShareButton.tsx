'use client'

import { useState } from 'react'

function EspalharIcon() {
  return (
    <svg width="25" height="25" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="7" cy="16" r="3.5" stroke="currentColor" strokeWidth="2.3" />
      <circle cx="24.5" cy="7.5" r="3.5" stroke="currentColor" strokeWidth="2.3" />
      <circle cx="24.5" cy="24.5" r="3.5" stroke="currentColor" strokeWidth="2.3" />
      <path d="m10 14.5 11-5M10 17.5l11 5" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
    </svg>
  )
}

export default function ShareButton() {
  const [animando, setAnimando] = useState(false)

  function espalhar() {
    setAnimando(true)
    setTimeout(() => setAnimando(false), 350)
  }

  return (
    <button
      type="button"
      onClick={espalhar}
      className={animando ? 'shareAnimando' : ''}
      style={{
        border: 'none',
        background: 'transparent',
        color: '#4D5A52',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px',
        borderRadius: 12,
        fontSize: 14,
        fontWeight: 800,
      }}
    >
      <span style={{ display: 'inline-flex' }}><EspalharIcon /></span>
      Espalhar
    </button>
  )
}