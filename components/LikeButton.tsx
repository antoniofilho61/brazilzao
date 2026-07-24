'use client'

import { useState } from 'react'

function PulseBrasil({ ativo }: { ativo: boolean }) {
  const cor = ativo ? '#08783F' : '#4D5A52'

  return (
    <svg width="27" height="27" viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="13" stroke={cor} strokeOpacity=".35" strokeWidth="2" />
      <path
        d="M4 17h5l3-7 5 14 3-7h8"
        stroke={cor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function LikeButton() {
  const [apoiado, setApoiado] = useState(false)

  return (
    <button
      type="button"
      onClick={() => setApoiado((atual) => !atual)}
      className={apoiado ? 'likeAnimando' : ''}
      style={{
        border: 'none',
        background: 'transparent',
        color: apoiado ? '#08783F' : '#4D5A52',
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
      <span style={{ display: 'inline-flex' }}>
        <PulseBrasil ativo={apoiado} />
      </span>
      {apoiado ? 'Apoiando' : 'Apoiar'}
    </button>
  )
}