import ComunidadeContent from './ComunidadeContent'

// Esta função satisfaz a exigência do Next.js export estático!
export async function generateStaticParams() {
  return [{ id: '1' }]
}

export default function Page() {
  return <ComunidadeContent />
}