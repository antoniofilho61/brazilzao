'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'

export default function Home() {
  const router = useRouter()
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    async function checarSessao() {
      const { data } = await supabase.auth.getSession()
      if (data.session) {
        router.push('/feed')
      } else {
        router.push('/login')
      }
      setCarregando(false)
    }
    checarSessao()
  }, [router])

  return (
    <div style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <p>Carregando BRAZILZÃO...</p>
    </div>
  )
}