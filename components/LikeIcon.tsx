'use client'

export default function LikeIcon({
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
        d="M9 14V28H5C3.9 28 3 27.1 3 26V16C3 14.9 3.9 14 5 14H9ZM11 14L17 3C17.5 2.1 18.6 1.7 19.5 2.2C20.4 2.7 20.8 3.8 20.3 4.7L18 10H27C28.1 10 29 10.9 29 12C29 12.2 29 12.4 28.9 12.6L26 25C25.7 26.7 24.2 28 22.5 28H11V14Z"
        fill={ativo ? '#008C3A' : '#555'}
      />
    </svg>
  )
}