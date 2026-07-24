'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'

export default function ComunidadeContent() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  const [comunidade, setComunidade] = useState<any>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function carregar() {
      if (!id) return
      const { data } = await supabase.from('comunidades').select('*').eq('id', id).single()
      setComunidade(data)
      setCarregando(false)
    }
    carregar()
  }, [id])

  if (carregando) return <div style={{ padding: 20 }}>Carregando comunidade...</div>
  if (!comunidade) return <div style={{ padding: 20 }}>Comunidade não encontrada.</div>

  return (
    <div style={{ padding: 20 }}>
      <h1>{comunidade.nome}</h1>
      <p>{comunidade.cidade} - {comunidade.estado}</p>
    </div>
  )
}