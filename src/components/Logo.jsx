import { WalletCards } from 'lucide-react'
export function Logo({ compact = false }) {
  return <div className="flex items-center gap-3">
    <span className="grid size-10 place-items-center rounded-xl bg-primary-600 text-white shadow-lg shadow-blue-200"><WalletCards size={20}/></span>
    {!compact && <div><div className="text-[17px] font-extrabold tracking-tight text-ink">Khata<span className="text-primary-600">Flow</span></div><div className="text-[10px] font-medium uppercase tracking-[.16em] text-slate-400">Udhar, sorted</div></div>}
  </div>
}
