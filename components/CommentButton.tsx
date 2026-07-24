'use client'

import { useState } from 'react'

function ConversarIcon() {
  return (
    <svg width="25" height="25" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M7 8.5C7 5.5 9.5 4 12.5 4h8C23.5 4 25 6.5 25 9.5v6c0 3-2.5 5.5-5.5 5.5h-5L9 26v-5.7C7.8 19.3 7 17.6 7 15.5v-7Z"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 12h8M12 16h5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export default function CommentButton() {
  const [animando, setAnimando] = useState(false)

  function conversar() {
    setAnimando(true)
    setTimeout(() => setAnimando(false), 350)
  }

  return (
    <button
      type="button"
      onClick={conversar}
      className={animando ? 'commentAnimando' : ''}
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
      <span style={{ display: 'inline-flex' }}><ConversarIcon /></span>
      Conversar
    </button>
  )
}