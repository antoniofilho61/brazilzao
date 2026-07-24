'use client'
export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/utils/supabase/client'

export default function Cadastro() {
  const router = useRouter()
  const [form, setForm] = useState({
    nome: '', sobrenome: '', username: '', cidade: '', 
    estado: '', email: '', whatsapp: '', senha: '', confirmarSenha: ''
  })
  const [carregando, setCarregando] = useState(false)

  async function criarConta() {
    const { nome, sobrenome, username, cidade, estado, email, senha, confirmarSenha, whatsapp } = form

    if (!nome || !sobrenome || !username || !cidade || !estado || !email || !senha || !confirmarSenha) {
      alert('Preencha todos os campos.')
      return
    }

    if (senha.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    if (senha !== confirmarSenha) {
      alert('As senhas não conferem.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      alert('Por favor, insira um e-mail válido.')
      return
    }

    setCarregando(true)

    try {
      // 1. CRIA A CONTA NO SUPABASE AUTH PASSANDO A URL DE REDIRECIONAMENTO DO LINK
      const urlOrigem = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
      
      const { data: cadastroAuth, error: erroAuth } = await supabase.auth.signUp({
        email: email.trim(),
        password: senha,
        options: {
          emailRedirectTo: `${urlOrigem}/login`,
          data: {
            nome: `${nome.trim()} ${sobrenome.trim()}`,
            username: username.toLowerCase().trim()
          }
        }
      })

      if (erroAuth) throw erroAuth
      if (!cadastroAuth.user) throw new Error('Falha ao criar usuário')

      // 2. CRIA O PERFIL NA TABELA PROFILES
      const { error: erroTabela } = await supabase
        .from('profiles')
        .insert({
          id: cadastroAuth.user.id,
          usuario_id: cadastroAuth.user.id,
          nome: `${nome.trim()} ${sobrenome.trim()}`,
          username: username.toLowerCase().trim(),
          cidade: cidade.trim(),
          estado: estado.trim(),
          whatsapp: whatsapp.trim(),
          tipo_perfil: 'usuario',
          bio: '',
          foto_url: null,
          capa_url: null,
          dono: false,
          verificado: false
        })

      if (erroTabela) throw erroTabela

      alert('Conta criada com sucesso! Enviamos um e-mail de confirmação. Por favor, verifique sua caixa de entrada e a pasta de SPAM para ativar sua conta.')
      router.push('/login')
    } catch (err: any) {
      console.error(err)
      alert('Erro: ' + (err.message || 'Erro inesperado'))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main style={page}>
      <div style={card}>
        <h1 style={logo}>BRAZILZÃO</h1>
        <input placeholder="Nome" style={input} onChange={(e) => setForm({...form, nome: e.target.value})} />
        <input placeholder="Sobrenome" style={input} onChange={(e) => setForm({...form, sobrenome: e.target.value})} />
        <input placeholder="Usuário" style={input} onChange={(e) => setForm({...form, username: e.target.value})} />
        <input placeholder="Cidade" style={input} onChange={(e) => setForm({...form, cidade: e.target.value})} />
        <input placeholder="Estado" style={input} onChange={(e) => setForm({...form, estado: e.target.value})} />
        <input placeholder="E-mail" style={input} onChange={(e) => setForm({...form, email: e.target.value})} />
        <input placeholder="WhatsApp" style={input} onChange={(e) => setForm({...form, whatsapp: e.target.value})} />
        <input type="password" placeholder="Senha" style={input} onChange={(e) => setForm({...form, senha: e.target.value})} />
        <input type="password" placeholder="Confirmar Senha" style={input} onChange={(e) => setForm({...form, confirmarSenha: e.target.value})} />
        <button style={botaoCadastro} onClick={criarConta} disabled={carregando}>
          {carregando ? 'CRIANDO...' : 'CRIAR CONTA'}
        </button>
      </div>
    </main>
  )
}

const page = { minHeight:'100vh', background:'#008C3A', display:'flex', justifyContent:'center', alignItems:'center', padding:20 }
const card = { background:'#fff', padding:35, borderRadius:24, width:'100%', maxWidth:400 }
const logo = { color:'#008C3A', textAlign:'center' as const, marginBottom: 20 }
const input = { width:'100%', padding:10, marginBottom:10, border:'1px solid #ccc', borderRadius:8, boxSizing: 'border-box' as const }
const botaoCadastro = { width:'100%', padding:12, background:'#FFD700', border:'none', borderRadius:8, fontWeight:'bold', cursor:'pointer', marginTop: 10 }