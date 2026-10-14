import { useState } from 'react'
import { ArrowRight, BadgeIndianRupee, CheckCircle2, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react'
import { Logo } from '../components/Logo.jsx'
import { Button, ErrorMessage, Field } from '../components/UI.jsx'
import { useAuth } from '../state/AuthContext.jsx'

export function AuthPage() {
  const [mode,setMode] = useState('login'); const [show,setShow] = useState(false); const [busy,setBusy] = useState(false); const [error,setError] = useState('')
  const { login, register } = useAuth()
  const submit = async (e) => { e.preventDefault(); setBusy(true); setError(''); const data=Object.fromEntries(new FormData(e.currentTarget)); try { mode==='login' ? await login(data) : await register(data) } catch(err){setError(err.message)} finally{setBusy(false)} }
  return <main className="grid min-h-screen bg-white lg:grid-cols-[1.08fr_.92fr]">
    <section className="relative hidden overflow-hidden bg-[#0d2254] p-14 text-white lg:flex lg:flex-col">
      <div className="absolute -right-32 -top-32 size-[430px] rounded-full bg-blue-500/30 blur-3xl"/><div className="absolute -bottom-24 left-10 size-[350px] rounded-full bg-cyan-400/20 blur-3xl"/>
      <div className="relative"><Logo/><span className="mt-24 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold"><Sparkles size={14}/>Made for modern Indian businesses</span><h1 className="mt-7 max-w-xl text-5xl font-black leading-[1.08] tracking-tight">Every rupee.<br/>Every person.<br/><span className="text-blue-300">Perfectly clear.</span></h1><p className="mt-6 max-w-lg text-lg leading-relaxed text-blue-100/70">A clean, tamper-resistant udhar ledger that helps you track credit, collect payments, and keep customer relationships strong.</p></div>
      <div className="relative mt-auto grid grid-cols-3 gap-4">{[['₹','Paise-perfect'],['↗','Live balances'],['✓','Audit-ready']].map(([a,b])=><div key={b} className="rounded-2xl border border-white/10 bg-white/[.07] p-4"><span className="text-xl font-black text-blue-300">{a}</span><p className="mt-2 text-xs font-semibold text-blue-100/70">{b}</p></div>)}</div>
    </section>
    <section className="flex items-center justify-center px-5 py-12"><div className="w-full max-w-[420px]">
      <div className="mb-10 lg:hidden"><Logo/></div><p className="text-sm font-bold text-primary-600">{mode==='login'?'WELCOME BACK':'CREATE YOUR KHATA'}</p><h2 className="mt-2 text-3xl font-black tracking-tight text-ink">{mode==='login'?'Sign in to KhataFlow':'Start tracking today'}</h2><p className="mt-2 text-sm text-slate-500">{mode==='login'?'Your ledger is waiting for you.':'Secure setup takes less than a minute.'}</p>
      <form onSubmit={submit} className="mt-8 space-y-4"><ErrorMessage message={error}/>{mode==='register'&&<Field label="Your name"><input name="name" required minLength="2" className="input" placeholder="e.g. Aarav Sharma"/></Field>}<Field label="Email address"><input name="email" type="email" required className="input" placeholder="you@business.com"/></Field><Field label="Password"><div className="relative"><input name="password" type={show?'text':'password'} required minLength={mode==='register'?8:1} className="input pr-11" placeholder="••••••••"/><button type="button" onClick={()=>setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></Field><Button loading={busy} className="mt-2 w-full py-3">{mode==='login'?'Sign in securely':'Create account'}<ArrowRight size={17}/></Button></form>
      <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200"/>or<span className="h-px flex-1 bg-slate-200"/></div><button onClick={()=>setMode(mode==='login'?'register':'login')} className="w-full rounded-xl border border-slate-200 py-3 text-sm font-bold text-ink hover:bg-slate-50">{mode==='login'?'Create a new account':'I already have an account'}</button>
      {mode==='login'&&<div className="mt-5 rounded-xl bg-blue-50 p-3 text-center text-xs text-blue-700"><b>Demo:</b> demo@khataflow.in &nbsp;·&nbsp; Demo@1234</div>}
      <div className="mt-8 flex items-center justify-center gap-5 text-[11px] font-semibold text-slate-400"><span className="flex items-center gap-1"><ShieldCheck size={14}/>Encrypted access</span><span className="flex items-center gap-1"><CheckCircle2 size={14}/>Audit-safe ledger</span></div>
    </div></section>
  </main>
}
