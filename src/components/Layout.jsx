import { BarChart3, BookOpenText, ChevronDown, Download, HelpCircle, LayoutDashboard, LogOut, Menu, Search, Settings, Users, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import { Logo } from './Logo.jsx'
import { useAuth } from '../state/AuthContext.jsx'
import { initials } from '../lib/format.js'

const nav = [
  [LayoutDashboard,'Dashboard','/'], [Users,'People','/people'], [BookOpenText,'Transactions','/transactions'], [BarChart3,'Reports','/reports'],
]
function SideContent({ close }) {
  const { user, logout } = useAuth()
  return <div className="flex h-full flex-col">
    <div className="px-6 py-7"><Logo /></div>
    <nav className="mt-3 flex-1 space-y-1 px-3">
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Workspace</p>
      {nav.map(([Icon,label,to]) => <NavLink key={to} to={to} onClick={close} className={({isActive}) => `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-500 hover:bg-slate-50 hover:text-ink'}`}><Icon size={19}/>{label}</NavLink>)}
      <p className="mb-3 mt-8 px-3 text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">Account</p>
      <button className="nav-button"><Settings size={19}/>Settings</button><button className="nav-button"><HelpCircle size={19}/>Help & support</button>
    </nav>
    <div className="m-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-center gap-3"><span className="avatar">{initials(user?.name)}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-ink">{user?.name}</p><p className="truncate text-xs text-slate-400">{user?.email}</p></div><button onClick={logout} title="Sign out" className="text-slate-400 hover:text-red-500"><LogOut size={18}/></button></div>
    </div>
  </div>
}
export function Layout({ children }) {
  const [open,setOpen] = useState(false)
  const { user } = useAuth()
  return <div className="min-h-screen bg-canvas text-ink">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] border-r border-slate-100 bg-white lg:block"><SideContent/></aside>
    {open && <div className="fixed inset-0 z-50 lg:hidden"><button aria-label="Close menu" onClick={()=>setOpen(false)} className="absolute inset-0 bg-slate-950/30 backdrop-blur-sm"/><aside className="relative h-full w-[280px] bg-white shadow-2xl"><button onClick={()=>setOpen(false)} className="absolute right-4 top-5 rounded-lg p-2 text-slate-400"><X/></button><SideContent close={()=>setOpen(false)}/></aside></div>}
    <main className="lg:pl-[248px]">
      <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-slate-100/90 bg-white/90 px-4 backdrop-blur-xl sm:px-7 lg:px-9">
        <button onClick={()=>setOpen(true)} className="rounded-xl border border-slate-200 p-2.5 lg:hidden"><Menu size={20}/></button>
        <div className="relative hidden w-full max-w-sm md:block"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/><input className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary-500 focus:bg-white" placeholder="Search people or transactions…"/></div>
        <div className="ml-auto flex items-center gap-3"><div className="hidden text-right sm:block"><p className="text-sm font-bold">{user?.name}</p><p className="text-xs text-slate-400">Owner</p></div><span className="avatar">{initials(user?.name)}</span><ChevronDown size={15} className="text-slate-400"/></div>
      </header>
      <div className="mx-auto max-w-[1500px] p-4 pb-24 sm:p-7 lg:p-9">{children}</div>
    </main>
    <nav className="fixed inset-x-3 bottom-3 z-30 flex justify-around rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur lg:hidden">{nav.map(([Icon,label,to]) => <NavLink key={to} to={to} className={({isActive})=>`flex min-w-16 flex-col items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-bold ${isActive?'bg-primary-50 text-primary-600':'text-slate-400'}`}><Icon size={18}/>{label}</NavLink>)}</nav>
  </div>
}
