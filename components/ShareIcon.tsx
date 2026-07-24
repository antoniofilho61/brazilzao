'use client'

export default function ShareIcon({
  ativo = false
}: {
  ativo?: boolean
}) {

  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 32 32"
      fill="none"
    >

      <path
        d="M24 3L8 16L14 18L16 28L24 3Z"
        fill={ativo ? '#008C3A' : '#555'}
      />

    </svg>
  )
}