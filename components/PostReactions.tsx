'use client'

import { useRef, useState } from 'react'

const reacoes = [
  { id: 'apoiar', valor: '⌁', nome: 'Apoiar', cor: '#08783F' },
  { id: 'amei', valor: '💛', nome: 'Amei', cor: '#E3A900' },
  { id: 'rachei', valor: '😄', nome: 'Rachei', cor: '#D77B00' },
  { id: 'caramba', valor: '😮', nome: 'Caramba', cor: '#1769AA' },
  { id: 'poxa', valor: '🥹', nome: 'Poxa', cor: '#5870A8' },
  { id: 'indignado', valor: '😤', nome: 'Indignado', cor: '#B54535' },
]

function PulseBrasil({ ativo }: { ativo: boolean }) {
  return (
    <svg width={ativo ? 34 : 25} height={ativo ? 34 : 25} viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="13" stroke={ativo ? '#fff' : '#08783F'} strokeOpacity=".38" strokeWidth="2" />
      <path
        d="M4 17h5l3-7 5 14 3-7h8"
        stroke={ativo ? '#fff' : '#08783F'}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function PostReactions({
  onEscolher,
}: {
  onEscolher: (reacao: string) => void
}) {
  const [ativa, setAtiva] = useState<string | null>(null)
  const segurando = useRef(false)

  function escolher(reacao: string) {
    onEscolher(reacao)
    setAtiva(null)
    segurando.current = false
  }

  function pegarReacaoNaPosicao(x: number, y: number) {
    const elemento = document.elementFromPoint(x, y)
    const botao = elemento?.closest('button[data-reacao]')
    const valor = botao?.getAttribute('data-reacao')

    if (valor) setAtiva(valor)
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 6,
        padding: 8,
        borderRadius: 20,
        background: '#fff',
        boxShadow: '0 12px 30px rgba(24,33,28,.18)',
      }}
      onMouseMove={(event) => pegarReacaoNaPosicao(event.clientX, event.clientY)}
      onMouseLeave={() => !segurando.current && setAtiva(null)}
      onTouchMove={(event) => {
        if (!segurando.current) return
        event.preventDefault()
        const toque = event.touches[0]
        pegarReacaoNaPosicao(toque.clientX, toque.clientY)
      }}
      onTouchEnd={() => {
        if (ativa) escolher(ativa)
      }}
    >
      {reacoes.map((reacao) => {
        const selecionada = ativa === reacao.valor

        return (
          <button
            key={reacao.id}
            type="button"
            data-reacao={reacao.valor}
            aria-label={reacao.nome}
            onClick={() => escolher(reacao.valor)}
            onTouchStart={() => {
              segurando.current = true
              setAtiva(reacao.valor)
            }}
            style={{
              width: 44,
              height: 44,
              border: 'none',
              borderRadius: 14,
              background: selecionada ? reacao.cor : '#F2F5F2',
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              transform: selecionada ? 'translateY(-14px) scale(1.18)' : 'scale(1)',
              transition: 'transform .16s ease, background .16s ease',
              boxShadow: selecionada ? '0 8px 18px rgba(24,33,28,.2)' : 'none',
            }}
          >
            {reacao.id === 'apoiar' ? (
              <PulseBrasil ativo={selecionada} />
            ) : (
              <span style={{ fontSize: selecionada ? 28 : 23 }}>{reacao.valor}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}