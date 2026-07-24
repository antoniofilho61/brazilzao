'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'
import './login.css'

export default function Login() {
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [carregando, setCarregando] = useState(false)
  

  async function entrar() {
    if (!email.trim() || !senha.trim()) {
      alert('Digite seu e-mail e sua senha.')
      return
    }

    setCarregando(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha
    })

    setCarregando(false)

    if (error) {
      alert('E-mail ou senha incorretos.')
      return
    }

    if (!data.user) {
      alert('Não foi possível entrar. Tente novamente.')
      return
    }

    router.push('/feed')
  }

  return (
  <main className="loginPage">

    <div className="loginContainer">

      <div className="loginImagem">
        <img 
          src="/login-banner.png"
          alt="BRAZILZÃO"
          style={imagem}
        />
      </div>


      <div className="loginCard">

        <h1 className="logoLogin">
  BRAZILZÃO
</h1>

        <p className="seloLogin">
  REDE SOCIAL DO BRASILEIRO
</p>

        <p style={subtitulo}>
          Entre na sua conta
        </p>


        <input
          placeholder="E-mail"
          style={input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />


        <div style={caixaSenha}>

          <input
            placeholder="Senha"
            type={mostrarSenha ? 'text' : 'password'}
            style={inputSenha}
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />


          <button
            type="button"
            style={botaoOlhoSenha}
            onClick={() => setMostrarSenha(!mostrarSenha)}
          >
            {mostrarSenha ? '🙈' : '👁️'}
          </button>

        </div>


        <button
          style={botaoEntrar}
          onClick={entrar}
          disabled={carregando}
        >
          {carregando ? 'ENTRANDO...' : 'ENTRAR'}
        </button>


        <button
          style={botaoEsqueciSenha}
          onClick={() => router.push('/recuperar-senha')}
        >
          Esqueci minha senha
        </button>


        <button
          style={botaoCadastro}
          onClick={() => router.push('/cadastro')}
        >
          CRIAR CONTA
        </button>


        <p style={rodape}>
          Desenvolvido por Antonio José de Sousa Filho
        </p>

      </div>

    </div>

  </main>
)
}

const page = {
  minHeight:'100vh',
  width:'100%',
  display:'flex',
  background:'#fff'
}

const card = {
  background:'#fff',
  padding:35,
  width:'50%',
  height:'100vh',
  display:'flex',
  flexDirection:'column' as const,
  justifyContent:'center',
  textAlign:'center' as const,
  boxSizing:'border-box' as const
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
  marginBottom:12,
  borderRadius:10,
  border:'1px solid #ddd',
  boxSizing:'border-box' as const,
  outline:'none',
  fontSize:14
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

const botaoEsqueciSenha = {
  width:'100%',
  padding:10,
  marginTop:8,
  border:'none',
  background:'transparent',
  color:'#008C3A',
  fontWeight:'bold',
  cursor:'pointer'
}

const caixaSenha = {
  width:'100%',
  marginBottom:12,
  position:'relative' as const
}

const inputSenha = {
  width:'100%',
  padding:'13px 48px 13px 13px',
  borderRadius:10,
  border:'1px solid #ddd',
  boxSizing:'border-box' as const,
  outline:'none',
  fontSize:14
}

const botaoOlhoSenha = {
  position:'absolute' as const,
  right:10,
  top:'50%',
  transform:'translateY(-50%)',
  border:'none',
  background:'transparent',
  cursor:'pointer',
  fontSize:20,
  padding:4
}

const container = {
  width:'100%',
  minHeight:'100vh',
  display:'flex'
}


const imagemBox = {
  width:'50%',
  height:'100vh',
  position:'relative' as const
}


const imagem = {
  width:'100%',
  height:'100%',
  objectFit:'cover' as const
}


const rodape = {
  marginTop:25,
  fontSize:12,
  color:'#777'
}