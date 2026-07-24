'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'

export default function RecuperarSenha() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(false)

  async function enviarRecuperacao() {
    if (!email.trim()) {
      alert('Digite seu e-mail.')
      return
    }

    setCarregando(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
  redirectTo: 'http://192.168.15.5:3000/nova-senha'
})

    setCarregando(false)

    if (error) {
      alert('Erro ao enviar recuperação: ' + error.message)
      return
    }

    alert('Enviamos um link para seu e-mail. Abra o link para criar uma nova senha.')
    router.push('/login')
  }

  return (
    <main style={page}>
      <div style={card}>
        <h1 style={logo}>BRAZILZÃO</h1>

        <p style={selo}>RECUPERAR SENHA</p>

        <p style={subtitulo}>
          Digite seu e-mail para receber o link de recuperação.
        </p>

        <input
          placeholder="Seu e-mail"
          style={input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <button
          style={botaoCadastro}
          onClick={enviarRecuperacao}
          disabled={carregando}
        >
          {carregando ? 'ENVIANDO...' : 'ENVIAR LINK'}
        </button>

        <button
          style={botaoEntrar}
          onClick={() => router.push('/login')}
        >
          VOLTAR PARA LOGIN
        </button>
      </div>
    </main>
  )
}

const page = {
  minHeight:'100vh',
  background:'linear-gradient(180deg,#008C3A,#006B2D)',
  display:'flex',
  justifyContent:'center',
  alignItems:'center',
  padding:20
}

const card = {
  background:'#fff',
  padding:35,
  borderRadius:24,
  width:'100%',
  maxWidth:430,
  textAlign:'center' as const,
  boxShadow:'0 20px 40px rgba(0,0,0,.25)',
  margin:'20px auto'
}

const logo = {
  color:'#008C3A',
  fontSize:36,
  marginBottom:4,
  fontWeight:900,
  letterSpacing:1
}

const selo = {
  color:'#FFD700',
  fontWeight:'bold',
  fontSize:14,
  letterSpacing:1,
  marginBottom:14
}

const subtitulo = {
  marginBottom:22,
  color:'#333',
  fontWeight:600
}

const input = {
  width:'100%',
  padding:13,
  marginBottom:10,
  borderRadius:10,
  border:'1px solid #ddd',
  boxSizing:'border-box' as const,
  outline:'none',
  fontSize:14
}

const botaoCadastro = {
  width:'100%',
  padding:13,
  marginTop:10,
  border:'none',
  borderRadius:10,
  background:'#FFD700',
  color:'#111',
  fontWeight:'bold',
  cursor:'pointer',
  boxShadow:'0 4px 10px rgba(0,0,0,.2)'
}

const botaoEntrar = {
  width:'100%',
  padding:13,
  marginTop:10,
  border:'none',
  borderRadius:10,
  background:'#008C3A',
  color:'#fff',
  fontWeight:'bold',
  cursor:'pointer',
  boxShadow:'0 4px 10px rgba(0,0,0,.2)'
}