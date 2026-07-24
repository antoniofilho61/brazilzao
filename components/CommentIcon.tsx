'use client'

export default function CommentIcon({
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
        d="M16 4C8.8 4 3 8.8 3 15C3 18.4 4.7 21.5 7.4 23.6L6 28L11.5 25.7C13 26.1 14.5 26.3 16 26.3C23.2 26.3 29 21.5 29 15C29 8.8 23.2 4 16 4Z"
        fill={ativo ? '#008C3A' : '#555'}
      />

      <circle cx="11" cy="15" r="1.8" fill="white"/>
      <circle cx="16" cy="15" r="1.8" fill="white"/>
      <circle cx="21" cy="15" r="1.8" fill="white"/>

    </svg>
  )
}